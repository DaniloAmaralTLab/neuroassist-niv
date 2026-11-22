#!/usr/bin/env python3
"""validator-score.py -- deterministic maturity score + checklist state (D-317).

Computes the OBJECTIVE part of the maturity rubric (30/30/20/10/10) and
consolidates the issue checklist (DONE/PARTIAL/MISSING/BLOCKED), emitting a
compact ``<ISSUE>.state.json`` that the be/fe-validator agent reads instead of
re-deriving everything. Pairs with ``<ISSUE>.contract.json`` (D-315).

Issue resolution + checklist consolidation live in the shared ``issue_state``
module (D-319); file presence / stub detection in ``code_inventory``.

The line that does not cross (D-315/D-317):
    - script computes the OBJECTIVE portions (structure / tests+lint / e2e) +
      a PROVISIONAL functionality score (presence+stub heuristic) flagged
      ``needsAgentConfirm``;
    - the agent confirms functionality and judges the 10 soft points.

Confirmed design (2026-06-05):
    1. read-only on the issue by default; ``--write-back`` is opt-in (atomic);
    2. RECEIVES gate verdicts -- does NOT run the toolchain;
    3. functionality 30 is provisional with ``needsAgentConfirm``.

R3: argparse subcommands, root walk-up, atomic write, OK:/error:, exit 0/1/2.
A low/empty score is DATA, not an error. Exit 2 == no parseable checklist.

Usage:
    python scripts/validator-score.py score --issue LEAD-FE-001 \\
        --lint pass --test pass --build pass --e2e skip
    python scripts/validator-score.py score --issue CAD-001 --layer be --gates gates.json
    python scripts/validator-score.py checklist --issue LEAD-FE-001
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import re
import sys
from pathlib import Path

try:
    from cli_utils import force_utf8_stdio
    from issue_state import (
        LAYER_PROFILES,
        atomic_write,
        consolidate,
        extra_roots_for_issue,
        find_root,
        parse_checklist,
        resolve_issue,
    )
except ImportError:  # pragma: no cover
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from cli_utils import force_utf8_stdio
    from issue_state import (
        LAYER_PROFILES,
        atomic_write,
        consolidate,
        extra_roots_for_issue,
        find_root,
        parse_checklist,
        resolve_issue,
    )


# ── Rubric (published in the validator command -- changing weights is a decision) ──

WEIGHTS = {"structure": 30, "functionality": 30, "tests_lint": 20, "e2e": 10, "soft": 10}
_BUILD_FACTOR = {"pass": 1.0, "warn": 0.7, "skip": 0.5, "fail": 0.0, "unknown": 0.0}
_BANDS = [(80, "Maduro"), (60, "Consistente"), (40, "Parcial"), (0, "Inicial")]

# Map a layer's raw gate names onto the canonical rubric slots (uniform scoring).
_GATE_ALIAS = {
    "build": "build", "compileJava": "build",
    "lint": "lint", "architectureCheck": "lint",
    "test": "test",
    "e2e": "e2e", "integrationTest": "e2e",
}
_VERDICTS = {"pass", "fail", "warn", "skip", "unknown"}


# ── Scoring ────────────────────────────────────────────────────────────────────

def normalize_gates(raw: dict, layer: str) -> dict:
    canon = {"build": "unknown", "lint": "unknown", "test": "unknown", "e2e": "unknown"}
    for key, verdict in raw.items():
        slot = _GATE_ALIAS.get(key, key)
        if slot in canon and verdict:
            canon[slot] = verdict
    return canon


def band_for(score: int) -> str:
    for floor, name in _BANDS:
        if score >= floor:
            return name
    return "Inicial"


def status_tag(checklist: dict, structure: int) -> str:
    total = checklist["total"]
    ratio = (checklist["done"] / total) if total else 0.0
    if ratio > 0.7:
        return "NEAR-CLOSED"
    if checklist["done"] > 0 or structure > 0:
        return "REDUCED"
    return "INTACT"


# ── Agent-confirmation persistence (ARCH-003 buraco 4) ────────────────────────

# Version stamp: any stored fingerprint without `"_v": _FP_VERSION` is treated
# as non-equivalent and triggers a fresh recompute (safe default).
_FP_VERSION = 2

# Matches every markdown checklist line: `- [X] ...` or `  - [ ] ...`
_ITEM_STATE_RE = re.compile(r"^\s*-\s*\[([^\]]*)\]", re.MULTILINE)


def _extract_item_states(text: str) -> list[str]:
    """Return the raw checkbox marker for every checklist line, in order.

    Captures composition changes: if item A flips DONE→MISSING and item B
    flips MISSING→DONE, the counts stay identical but the list changes.
    Non-checklist text is ignored, so formatting edits do not invalidate.
    """
    return [m.group(1).strip().lower() or " " for m in _ITEM_STATE_RE.finditer(text)]


def _make_fingerprint(checklist: dict, gates: dict, issue_text: str | None = None) -> dict:
    """Full (v2) fingerprint: counts + item-order states + ALL raw gate verdicts.

    ``gates`` must be the *raw* dict from ``collect_gates()`` -- before
    ``normalize_gates()`` discards non-canonical keys such as ``stub``.
    When ``issue_text`` is supplied, per-item checkbox markers are included so
    that composition changes (item A↔B swap) invalidate the confirmation even
    when aggregate counts are unchanged.
    """
    fp: dict = {
        "_v":         _FP_VERSION,
        "cl_done":    checklist.get("done",    0),
        "cl_partial": checklist.get("partial", 0),
        "cl_missing": checklist.get("missing", 0),
        "cl_blocked": checklist.get("blocked", 0),
        "cl_total":   checklist.get("total",   0),
        "gates":      {k: str(v) for k, v in sorted(gates.items())},
    }
    if issue_text is not None:
        fp["item_states"] = _extract_item_states(issue_text)
    return fp


_CANONICAL_GATES = frozenset({"build", "lint", "test", "e2e"})


def _make_fingerprint_legacy(checklist: dict, gates: dict) -> dict:
    """Coarse fingerprint for comparing against pre-v2 stored state (no ``_v``).

    Used *only* in the legacy backfill path where the existing state.json has
    no ``agentConfirmed`` block and therefore no item-level states or raw-gate
    data to compare against.  The absence of ``_v`` ensures this fingerprint
    can never accidentally match a v2 fingerprint.

    **Gates are filtered to canonical keys only** before comparison so that
    extra keys written by agents (``stub``, ``arch-conformance``, …) in the
    stored ``gates`` field do not permanently block the match.  Divergence on
    a canonical key (stored ``test: pass``, current ``test: fail``) still
    produces a different fingerprint and correctly invalidates.  Only unknown
    extra keys are tolerated.
    """
    return {
        "cl_done":    checklist.get("done",    0),
        "cl_partial": checklist.get("partial", 0),
        "cl_missing": checklist.get("missing", 0),
        "cl_blocked": checklist.get("blocked", 0),
        "cl_total":   checklist.get("total",   0),
        "gates":      {k: str(v) for k, v in sorted(gates.items())
                       if k in _CANONICAL_GATES},
    }


def _try_load_state(path: Path) -> dict | None:
    """Load an existing state.json; return None on any read/parse error."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def compute_score(checklist: dict, gates: dict) -> dict:
    total = checklist["total"]
    done = checklist["done"]

    bf = _BUILD_FACTOR.get(gates.get("build", "unknown"), 0.0)
    cited = checklist["_filesCited"]
    pf = (checklist["_filesExisting"] / cited) if cited else bf
    structure = round(WEIGHTS["structure"] * (0.5 * bf + 0.5 * pf))

    functionality = round(WEIGHTS["functionality"] * (done / total)) if total else 0

    test = gates.get("test", "unknown")
    lint = gates.get("lint", "unknown")
    if test == "pass" and lint in ("pass", "warn", "skip"):
        tests_lint = WEIGHTS["tests_lint"]
    elif test == "pass" and lint == "fail":
        tests_lint = 12
    else:
        tests_lint = 0

    e2e = WEIGHTS["e2e"] if gates.get("e2e") == "pass" else 0

    total_prov = structure + functionality + tests_lint + e2e
    return {
        "total": total_prov,
        "provisional": True,
        "range": [total_prov, total_prov + WEIGHTS["soft"]],
        "breakdown": {
            "structure": {"max": WEIGHTS["structure"], "value": structure, "basis": "deterministic"},
            "functionality": {"max": WEIGHTS["functionality"], "value": functionality,
                              "basis": "heuristic", "needsAgentConfirm": True},
            "tests_lint": {"max": WEIGHTS["tests_lint"], "value": tests_lint, "basis": "deterministic"},
            "e2e": {"max": WEIGHTS["e2e"], "value": e2e, "basis": "deterministic"},
            "soft": {"max": WEIGHTS["soft"], "value": None, "basis": "agent", "needsAgentConfirm": True},
        },
        "band": band_for(total_prov),
        "statusTag": status_tag(checklist, structure),
    }


# ── Gate inputs (received -- never runs the toolchain) ─────────────────────────

_LOG_FAIL = re.compile(r"\b(fail(ed|ure)?|error|exception|BUILD FAILED)\b", re.IGNORECASE)
_LOG_PASS = re.compile(r"\b(pass(ed)?|BUILD SUCCESSFUL|success|0 errors?)\b", re.IGNORECASE)


def verdict_from_log(path: str) -> str:
    try:
        tail = Path(path).read_text(encoding="utf-8", errors="replace")[-4000:]
    except (OSError, UnicodeError):
        return "unknown"
    if _LOG_FAIL.search(tail):
        return "fail"
    if _LOG_PASS.search(tail):
        return "pass"
    return "unknown"


def collect_gates(args) -> dict:
    raw: dict[str, str] = {}
    if args.gates:
        try:
            data = json.loads(Path(args.gates).read_text(encoding="utf-8"))
            raw.update({k: str(v).lower() for k, v in data.items()})
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            print(f"error: --gates ilegivel: {exc}", file=sys.stderr)
            raise SystemExit(1) from exc
    for slot in ("lint", "test", "build", "e2e"):
        if (flag := getattr(args, slot, None)):
            raw[slot] = flag
        log = getattr(args, f"{slot}_log", None)
        if log and slot not in raw:
            raw[slot] = verdict_from_log(log)
    return raw


def carry_forward_failures(raw: dict, prior_sources: list[tuple[str, dict]]) -> tuple[dict, list[dict]]:
    """A gate already recorded as ``fail`` cannot be downgraded to ``unknown``/absent.

    ``unknown`` means "never ran"; a known ``fail`` only goes away with a new
    run that says otherwise (``pass``, ``warn``, ``skip``, ``deferred``).
    Signal ``validator:baseline:prose-contradicts-junit-xml``: state.json recorded
    ``e2e=unknown`` with ``fail`` in gates.json.
    """
    out = dict(raw)
    carried: list[dict] = []
    for source, prior in prior_sources:
        for gate, verdict in prior.items():
            if str(verdict).lower() != "fail":
                continue
            if out.get(gate, "unknown") == "unknown":
                out[gate] = "fail"
                carried.append({"gate": gate, "from": source})
    return out, carried


def _prior_gate_sources(args, root: Path, existing: dict | None) -> list[tuple[str, dict]]:
    sources: list[tuple[str, dict]] = []
    if existing:
        prior = existing.get("gates_raw") or existing.get("gates") or {}
        if isinstance(prior, dict):
            sources.append(("state.json anterior", prior))
    module = args.issue.split("-", 1)[0]
    module_gates = root / "tmp" / module / "gates.json"
    given = Path(args.gates).resolve() if args.gates else None
    if module_gates.is_file() and module_gates.resolve() != given:
        try:
            data = json.loads(module_gates.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                sources.append((f"tmp/{module}/gates.json", data))
        except (OSError, UnicodeError, json.JSONDecodeError):
            pass
    return sources


# ── Write-back (opt-in, atomic) ──────────────────────────────────────────────

_STATUS_BLOCK = re.compile(
    r"^\*\*Status:\*\*.*\n\*\*Maturidade:\*\*.*\n\*\*Done/Total:\*\*.*\n",
    re.MULTILINE,
)


def render_status_block(score: dict, checklist: dict, today: str) -> str:
    return (
        f"**Status:** {score['statusTag']} -- pos-validacao {today}\n"
        f"**Maturidade:** {score['total']} -- {score['band']}\n"
        f"**Done/Total:** {checklist['done']}/{checklist['total']} itens\n"
    )


def write_back(issue_file: Path, block: str) -> None:
    text = issue_file.read_text(encoding="utf-8")
    if _STATUS_BLOCK.search(text):
        new = _STATUS_BLOCK.sub(block, text, count=1)
    else:
        lines = text.splitlines(keepends=True)
        idx = next((i for i, ln in enumerate(lines) if ln.startswith("#")), -1)
        lines.insert(idx + 1 if idx >= 0 else 0, "\n" + block)
        new = "".join(lines)
    atomic_write(issue_file, new)


# ── Subcommands ──────────────────────────────────────────────────────────────

def _load_issue(args) -> tuple[str, Path, Path, str]:
    root = find_root(args.root)
    layer, issue_file = resolve_issue(args.issue, args.layer, args.issue_file, root)
    if issue_file is None:
        print(f"error: issue nao encontrada: {args.issue} (layer={layer or 'auto'})", file=sys.stderr)
        raise SystemExit(1)
    text = issue_file.read_text(encoding="utf-8", errors="replace")
    return layer, root, issue_file, text


def _emit(args, payload: dict, issue_file: Path, *, default_suffix: str) -> Path:
    out_path = Path(args.output) if args.output else issue_file.with_name(
        f"{issue_file.stem}.{default_suffix}.json")
    atomic_write(out_path, json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    return out_path


def cmd_checklist(args) -> int:
    layer, root, issue_file, text = _load_issue(args)
    items = parse_checklist(text)
    if not items:
        print(f"error: issue sem checklist parseavel: {issue_file}", file=sys.stderr)
        return 2
    checklist = consolidate(items, root, extra_roots_for_issue(args.issue, layer, root))
    public = {k: v for k, v in checklist.items() if not k.startswith("_")}
    _emit(args, {"issue": args.issue, "layer": layer, "checklist": public},
          issue_file, default_suffix="checklist")
    print(f"OK: checklist {public['done']}/{public['total']} -- {issue_file.stem}.checklist.json")
    return 0


def _restore_confirmed(score: dict, confirmed: dict) -> tuple[dict, list]:
    """Overwrite provisional slots in *score* with values from *confirmed*.

    Returns (updated_score, empty_agent_todo).  The deterministic slots
    (structure, tests_lint, e2e) keep their freshly-computed values; only the
    agent-owned slots (functionality, soft) are restored.  The total is then
    recalculated from all components so it is always consistent.
    """
    bd = {k: dict(v) for k, v in score["breakdown"].items()}

    func_val = (confirmed.get("functionality") or {}).get("value")
    soft_val = (confirmed.get("soft") or {}).get("value")

    if func_val is not None:
        bd["functionality"]["value"] = func_val
        bd["functionality"]["needsAgentConfirm"] = False
    if soft_val is not None:
        bd["soft"]["value"] = soft_val
        bd["soft"]["needsAgentConfirm"] = False

    total = sum((bd[k].get("value") or 0)
                for k in ("structure", "functionality", "tests_lint", "e2e", "soft"))

    updated = dict(score)
    updated["breakdown"] = bd
    updated["total"] = total
    updated["range"] = [total, total]
    updated["provisional"] = False
    updated["statusTag"] = confirmed.get("statusTag") or score["statusTag"]
    updated["band"] = band_for(total)
    return updated, []


def cmd_score(args) -> int:
    layer, root, issue_file, text = _load_issue(args)
    items = parse_checklist(text)
    if not items:
        print(f"error: issue sem checklist parseavel: {issue_file}", file=sys.stderr)
        return 2

    checklist = consolidate(items, root, extra_roots_for_issue(args.issue, layer, root))
    # Keep raw gates separate: used for fingerprinting (all keys including stub).
    # normalize_gates produces the 4-key canonical dict for scoring only.
    # -- Preserve agent confirmations between recomputes (ARCH-003 buraco 4) --
    # Compute the output path early so we can read any existing state.
    out_path_early = (Path(args.output) if args.output
                      else issue_file.with_name(f"{issue_file.stem}.state.json"))
    existing = _try_load_state(out_path_early)

    raw_gates, carried = carry_forward_failures(
        collect_gates(args), _prior_gate_sources(args, root, existing))
    for c in carried:
        print(f"warn: gate {c['gate']}=fail mantido ({c['from']}); "
              f"'unknown' so vale para gate que nunca rodou", file=sys.stderr)
    gates = normalize_gates(raw_gates, layer)
    score = compute_score(checklist, gates)

    today = _dt.date.today().isoformat()
    now = _dt.datetime.now().isoformat(timespec="seconds")
    public_checklist = {k: v for k, v in checklist.items() if not k.startswith("_")}

    # Full v2 fingerprint: item checkbox states (order-sensitive) + ALL raw gates.
    current_fp = _make_fingerprint(public_checklist, raw_gates, text)

    confirmed_block: dict | None = None   # will be written to "agentConfirmed"
    confirmed_source: str | None = None   # for --report and OK line

    if existing:
        stored_ac = existing.get("agentConfirmed")
        if stored_ac:
            stored_fp = stored_ac.get("fingerprint", {})
            # Only accept a fingerprint that is v2 AND byte-for-byte identical.
            # Any old/missing _v means the format changed -> invalidate (safe default).
            if stored_fp.get("_v") == _FP_VERSION and stored_fp == current_fp:
                confirmed_block = stored_ac
                confirmed_source = "agentConfirmed"
        elif existing.get("score", {}).get("provisional") is False:
            # Legacy backfill path: agent wrote provisional:false directly with no
            # agentConfirmed block.  We can only compare aggregate counts + stored
            # (normalized) gates because item-level states are not stored separately.
            # Use _make_fingerprint_legacy on BOTH sides so the comparison is apples
            # to apples.  A v2 current_fp can never collide with a legacy fp because
            # legacy fp has no "_v" key.
            legacy_stored = _make_fingerprint_legacy(
                existing.get("checklist", {}),
                existing.get("gates", {}),
            )
            legacy_current = _make_fingerprint_legacy(public_checklist, gates)
            if legacy_stored == legacy_current:
                # Coarse match: backfill agentConfirmed from stored data.
                # The backfilled block gets the full v2 fingerprint so future
                # recomputes use the stricter comparison.
                ex_score = existing.get("score", {})
                ex_bd    = ex_score.get("breakdown", {})
                confirmed_block = {
                    "confirmedAt": existing.get("computedAt", now),
                    "fingerprint":    current_fp,          # v2, for next recompute
                    "functionality": {"value": ex_bd.get("functionality", {}).get("value")},
                    "soft":          {"value": ex_bd.get("soft", {}).get("value")},
                    "total":     ex_score.get("total"),
                    "statusTag": ex_score.get("statusTag"),
                    "band":      ex_score.get("band"),
                }
                confirmed_source = "legacy-provisional:false"

    agent_todo: list[str]
    if confirmed_block:
        score, agent_todo = _restore_confirmed(score, confirmed_block)
        # Always stamp the current v2 fingerprint on the block we persist.
        confirmed_block = {**confirmed_block, "fingerprint": current_fp}
    else:
        fv = score["breakdown"]["functionality"]["value"]
        agent_todo = [
            f"Confirmar functionality {fv}/{WEIGHTS['functionality']} -- a funcionalidade alvo funciona?",
            f"Avaliar soft 0-{WEIGHTS['soft']} -- a11y + observability + multi-tenancy enforcement",
        ]

    out: dict = {
        "issue": args.issue,
        "layer": layer,
        "computedAt": now,
        "checklist": public_checklist,
        "gates": gates,          # normalized (scoring + backward compat readers)
        "gates_raw": raw_gates,  # all gates before normalization (for fingerprinting)
        "score": score,
        "agentTodo": agent_todo,
    }
    if confirmed_block:
        out["agentConfirmed"] = confirmed_block
    if carried:
        out["gatesCarried"] = carried

    out_path = _emit(args, out, issue_file, default_suffix="state")

    if args.write_back:
        write_back(issue_file, render_status_block(score, checklist, today))
        print(f"OK: status block atualizado em {issue_file.name} (--write-back)")
    if args.report:
        _print_report(out, confirmed_source=confirmed_source)

    confirmed_tag = f" [confirmado:{confirmed_source}]" if confirmed_source else ""
    print(f"OK: score {score['total']} ({score['band']}) -- {out_path.name} "
          f"[Done/Total {checklist['done']}/{checklist['total']}]{confirmed_tag}")
    return 0


def cmd_confirm(args) -> int:
    """Write an agentConfirmed block into an existing state.json.

    Called by the validator-agent after it has confirmed functionality and
    evaluated the soft points.  Computes a v2 fingerprint from the current
    issue text (for item-order states) + the raw gates stored in the file (all
    gates, including stub) so the next recompute can detect any change.

    Usage:
        python scripts/validator-score.py confirm --issue INTG-058 \\
            --functionality 28 --soft 8 [--status-tag OK] [--rationale "..."]
    """
    layer, root, issue_file, text = _load_issue(args)
    state_path = (Path(args.output) if args.output
                  else issue_file.with_name(f"{issue_file.stem}.state.json"))

    existing = _try_load_state(state_path)
    if not existing:
        print(f"error: state.json nao encontrado ou ilegivel: {state_path}",
              file=sys.stderr)
        return 1

    stored_checklist = existing.get("checklist", {})
    # Prefer gates_raw (written by the new cmd_score); fall back to normalized
    # gates for state.jsons written by older versions.
    stored_gates = existing.get("gates_raw") or existing.get("gates", {})
    fp = _make_fingerprint(stored_checklist, stored_gates, text)
    now = _dt.datetime.now().isoformat(timespec="seconds")

    # Update the breakdown slots.
    score = dict(existing.get("score", {}))
    bd    = {k: dict(v) for k, v in score.get("breakdown", {}).items()}

    func_val = args.functionality
    soft_val = args.soft

    if func_val is not None and "functionality" in bd:
        bd["functionality"]["value"] = func_val
        bd["functionality"]["needsAgentConfirm"] = False
    if soft_val is not None and "soft" in bd:
        bd["soft"]["value"] = soft_val
        bd["soft"]["needsAgentConfirm"] = False

    total = sum((bd.get(k, {}).get("value") or 0)
                for k in ("structure", "functionality", "tests_lint", "e2e", "soft"))

    status = args.status_tag or ("OK" if total >= 80 else "NEAR-CLOSED")

    score["breakdown"] = bd
    score["total"]     = total
    score["range"]     = [total, total]
    score["provisional"] = False
    score["band"]      = band_for(total)
    score["statusTag"] = status

    confirmed_block: dict = {
        "confirmedAt": now,
        "fingerprint":    fp,
        "functionality": {"value": func_val},
        "soft":          {"value": soft_val},
        "total":     total,
        "statusTag": status,
        "band":      score["band"],
    }
    if args.rationale:
        confirmed_block["rationale"] = args.rationale

    out = {
        **existing,
        "computedAt":   now,
        "score":        score,
        "agentTodo":    [],
        "agentConfirmed": confirmed_block,
    }
    atomic_write(state_path, json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"OK: confirmacao gravada -- score {total} ({score['band']}) "
          f"provisional:false -> {state_path.name}")
    return 0


def _print_report(out: dict, *, confirmed_source: str | None = None) -> None:
    s, c = out["score"], out["checklist"]
    confirmed_ac = out.get("agentConfirmed")
    if confirmed_source:
        score_label = f"Score confirmado [{confirmed_source}]"
    else:
        score_label = "Score provisorio"
    print(f"\nIssue: {out['issue']}  (layer={out['layer']})")
    print(f"Gates: {out['gates']}")
    print(f"Checklist: {c['done']} done / {c['partial']} partial / "
          f"{c['missing']} missing / {c['blocked']} blocked  (total {c['total']})")
    print(f"\n{score_label}: {s['total']}  range {s['range']}  -> {s['band']} / {s['statusTag']}")
    for name, b in s["breakdown"].items():
        flag = " (agente)" if b.get("needsAgentConfirm") else ""
        print(f"  {name:<14} {b['value']!s:>4} / {b['max']:<3} [{b['basis']}]{flag}")
    if confirmed_ac:
        print(f"  [confirmado em {confirmed_ac.get('confirmedAt', '?')}]")
    print()


# ── Main ─────────────────────────────────────────────────────────────────────

def _add_common(p: argparse.ArgumentParser) -> None:
    p.add_argument("--issue", required=True, metavar="ISSUE_ID")
    p.add_argument("--layer", choices=sorted(LAYER_PROFILES), help="default: autodetect")
    p.add_argument("--issue-file", metavar="PATH", help="override issue file resolution")
    p.add_argument("--root", metavar="PATH", help="project root (default: walk up from cwd)")
    p.add_argument("--output", metavar="PATH", help="output JSON path (default: <issue>.<kind>.json)")
    p.add_argument("--report", action="store_true", help="print breakdown to stdout")


def main() -> None:
    force_utf8_stdio()
    parser = argparse.ArgumentParser(
        prog="validator-score",
        description="Deterministic maturity score + checklist state (D-317).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sc = sub.add_parser("score", help="compute score + emit <ISSUE>.state.json")
    _add_common(sc)
    for slot in ("lint", "test", "build", "e2e"):
        sc.add_argument(f"--{slot}", choices=sorted(_VERDICTS), help=f"{slot} gate verdict")
        sc.add_argument(f"--{slot}-log", metavar="PATH", help=f"parse {slot} verdict from log tail")
    sc.add_argument("--gates", metavar="PATH", help="JSON file of gate verdicts")
    sc.add_argument("--write-back", action="store_true",
                    help="(opt-in) update the status block in the issue, atomically")
    sc.set_defaults(func=cmd_score)

    cn = sub.add_parser("confirm",
                        help="write agentConfirmed block into existing state.json")
    _add_common(cn)
    cn.add_argument("--functionality", type=int, metavar="N",
                    help="confirmed functionality score (0-30)")
    cn.add_argument("--soft", type=int, metavar="N",
                    help="confirmed soft score (0-10)")
    cn.add_argument("--status-tag", metavar="TAG",
                    help="statusTag to record (default: OK if total>=80 else NEAR-CLOSED)")
    cn.add_argument("--rationale", metavar="TEXT",
                    help="optional free-text rationale for the confirmation")
    cn.set_defaults(func=cmd_confirm)

    cl = sub.add_parser("checklist", help="consolidate checklist only -> JSON")
    _add_common(cl)
    cl.set_defaults(func=cmd_checklist)

    args = parser.parse_args()
    sys.exit(args.func(args))


if __name__ == "__main__":
    main()
