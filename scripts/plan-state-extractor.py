#!/usr/bin/env python3
"""plan-state-extractor.py -- plan continuity / delta for the planner (D-319).

READ-ONLY. Emits ``<ISSUE>.plan-state.json`` so be/fe-planner judges over data
instead of re-reading the issue + prior plan + code each round. Reuses the
shared ``issue_state`` foundation (checklist consolidation) -- no duplication.

What it computes (deterministic):
    - checklist state (DONE/PARTIAL/MISSING/BLOCKED) via issue_state.consolidate;
    - prior plan phases (parsed from plan-<ISSUE>.md) + a best-effort state;
    - delta: done / partial / notStarted item texts + inconsistencies
      (e.g. "checked but file MISSING");
    - dependencies extracted from the issue's Dependencies section.

What stays with the agent:
    - ``suggestedPlanType`` (CONTINUACAO|INCREMENTAL|REPLANEJAMENTO|REVIEW) is a
      HINT flagged ``needsAgentConfirm`` -- the planner decides.

R3: argparse subcommand, root walk-up, atomic write, OK:/error:, exit 0/1/2.
Exit 2 == issue has no parseable checklist.

Usage:
    python scripts/plan-state-extractor.py extract --issue LEAD-FE-007 --report
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


_PLAN_TYPES = ("CONTINUACAO", "INCREMENTAL", "REPLANEJAMENTO", "REVIEW")
_FASE = re.compile(r"\bfase-(\d+)\b", re.IGNORECASE)
_DONE_MARK = re.compile(r"(✅|\bDONE\b|conclu[ií]d)", re.IGNORECASE)
_HEADING = re.compile(r"^#{1,6}\s+(.*\S)\s*$")
_ISSUE_ID = re.compile(r"\b([A-Z]{2,6}-(?:FE-|INT-|BE-)?\d{2,4})\b")
_DEP_HEADING = re.compile(r"depend[eê]nc", re.IGNORECASE)
_DEP_NOTE = re.compile(r"(endpoint|/api/|PENDING|stub|BE dependency|backend)", re.IGNORECASE)
_PRIORITY_HEADING = re.compile(r"^#{2,4}\s+Priorid[ae]de\s+(\d+)\b", re.IGNORECASE)
_ISSUES_COBERTAS = re.compile(r"Issues?\s+cobert[ao]s?\s*:?\*{0,2}\s*(.+)$", re.IGNORECASE)
_STATUS_FIELD = re.compile(r"\*\*Status:\*\*\s*(.+)$", re.IGNORECASE)
_TABLE_P_ID = re.compile(r"^P\d+(?:-[\w.]+)?$", re.IGNORECASE)
_ISSUE_RANGE_CELL = re.compile(
    r"\b([A-Z]{2,10}(?:-[A-Z]{2,10})?)-(\d{2,4})(?:\s*(?:\.\.|a)\s*(\d{2,4}))?\b")


# ── Plan parsing ─────────────────────────────────────────────────────────────

def _module_from_issue(issue: str) -> str:
    """Best-effort module-code extraction from an issue id (D-319 / ARCH-013).

    Covers the id shapes seen in the repo: `<MOD>-NNN` (COMM-001),
    `INT-<MOD>-NNN` (INT-ASST-001), `<MOD>-FE-NNN` / `<MOD>-BE-NNN`
    (LEAD-FE-007). ARCH-NNN and other module-less ids fall through to the
    id itself, which simply won't resolve to a plan file (expected: ARCH
    issues never use a plan-<MODULO>.md).
    """
    parts = issue.split("-")
    if len(parts) >= 3 and parts[0].upper() == "INT":
        return parts[1].upper()
    if len(parts) >= 3 and parts[1].upper() in ("FE", "BE"):
        return parts[0].upper()
    return parts[0].upper()


def resolve_plan_file(issue: str, layer: str, explicit: str | None,
                       root: Path) -> tuple[Path | None, str]:
    """Resolve the plan file for an issue. Returns (path, kind).

    ``kind`` is ``"module"`` for the real convention -- one consolidated
    ``plan-<MODULO>.md`` per module, written by every be/fe-planner -- or
    ``"issue"`` for a legacy/explicit per-issue ``plan-<ISSUE>.md`` (kept as
    fallback; no such file exists in the repo today, but nothing should
    break if one ever does).
    """
    if explicit:
        p = Path(explicit)
        return (p, "issue") if p.is_file() else (None, "issue")
    plan_dir = root / LAYER_PROFILES[layer]["plan_dir"]
    module = _module_from_issue(issue)
    module_plan = plan_dir / f"plan-{module}.md"
    if module_plan.is_file():
        return module_plan, "module"
    issue_plan = plan_dir / f"plan-{issue}.md"
    if issue_plan.is_file():
        return issue_plan, "issue"
    return None, "module"


def parse_plan_phases(text: str) -> list[dict]:
    """Extract `fase-N` phases + a best-effort state from a legacy plan-<ISSUE>.md."""
    phases: dict[str, str] = {}
    for line in text.splitlines():
        for m in _FASE.finditer(line):
            pid = f"fase-{int(m.group(1))}"
            state = "DONE" if _DONE_MARK.search(line) else phases.get(pid, "UNKNOWN")
            phases[pid] = state
    return [{"id": pid, "state": phases[pid]}
            for pid in sorted(phases, key=lambda s: int(s.split("-")[1]))]


def _expand_issue_cell(cell: str) -> list[str]:
    """Expand a markdown table 'Issues' cell into concrete issue ids.

    Handles plain ids (`WRKS-024`), comma lists, and ranges written either
    as `WRKS-001..005` or `WRKS-001 a WRKS-005`.
    """
    ids: list[str] = []
    for m in _ISSUE_RANGE_CELL.finditer(cell):
        prefix, lo_s, hi_s = m.group(1), m.group(2), m.group(3)
        if hi_s:
            width = len(lo_s)
            lo, hi = int(lo_s), int(hi_s)
            ids.extend(f"{prefix}-{str(n).zfill(width)}" for n in range(lo, hi + 1))
        else:
            ids.append(f"{prefix}-{lo_s}")
    return ids


def _table_priority_issue_map(text: str) -> dict[str, list[str]]:
    """Best-effort fallback for older plans where per-priority sections don't
    carry a `**Issues cobertas:**` line but the plan's summary table
    ("| P | ... | Issues |") does -- e.g. plan-WRKS.md's 'Ordem das
    prioridades' table with ranges like `WRKS-001..005`.
    """
    mapping: dict[str, list[str]] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip().strip("*").strip() for c in line.strip("|").split("|")]
        if len(cells) < 2 or not _TABLE_P_ID.match(cells[0]):
            continue
        ids = _expand_issue_cell(cells[-1])
        if ids:
            mapping[cells[0].upper()] = ids
    return mapping


def parse_module_plan_phases(text: str, issue: str) -> list[dict]:
    """Extract the `### Prioridade N` section(s) that cover `issue` in a
    consolidated plan-<MODULO>.md (be-planner.md / fe-planner.md convention).

    A priority section declares its coverage via a `**Issues cobertas:**`
    line (comma-separated issue ids) and its own `**Status:**` line
    (pendente | em andamento | concluido | done). Only priorities whose
    coverage line names `issue` are returned -- an issue not on the active
    priority must not inherit another priority's phase.
    """
    phases: list[dict] = []
    current: dict | None = None
    for raw in text.splitlines():
        line = raw.strip()
        m = _PRIORITY_HEADING.match(line)
        if m:
            if current is not None:
                phases.append(current)
            current = {"id": f"P{int(m.group(1))}", "state": "UNKNOWN",
                       "issues": [], "matches": False}
            continue
        if current is None:
            continue
        mi = _ISSUES_COBERTAS.search(line)
        if mi:
            ids = [s.strip().rstrip(".") for s in mi.group(1).split(",")]
            current["issues"] = [s for s in ids if s]
            current["matches"] = issue in current["issues"]
            continue
        ms = _STATUS_FIELD.search(line)
        if ms:
            status_text = ms.group(1).strip().lower()
            if _DONE_MARK.search(status_text) or "concluid" in status_text or "concluíd" in status_text:
                current["state"] = "DONE"
            elif "andamento" in status_text or "progress" in status_text:
                current["state"] = "IN_PROGRESS"
            elif "pendente" in status_text:
                current["state"] = "PENDING"
            elif "bloque" in status_text:
                current["state"] = "BLOCKED"
    if current is not None:
        phases.append(current)

    matched = [p for p in phases if p["matches"]]
    if not matched:
        # Fallback for plans where the priority section itself has no
        # explicit `Issues cobertas` line (legacy format) -- consult the
        # plan's summary table instead.
        table = _table_priority_issue_map(text)
        for p in phases:
            table_ids = table.get(p["id"].upper(), [])
            if issue in table_ids:
                p["matches"] = True
                matched.append(p)

    return [{"id": p["id"], "state": p["state"]} for p in matched]


def extract_dependencies(text: str) -> dict:
    """Pull issue ids + notes from the issue's Dependencies/Dependencias section."""
    lines = text.splitlines()
    section: list[str] = []
    in_dep = False
    for line in lines:
        h = _HEADING.match(line)
        if h:
            in_dep = bool(_DEP_HEADING.search(h.group(1)))
            continue
        if in_dep and line.strip():
            section.append(line.strip())
    body = "\n".join(section)
    issues = sorted(set(_ISSUE_ID.findall(body)))
    notes = [ln for ln in section if _DEP_NOTE.search(ln)]
    return {"issues": issues, "notes": notes}


# ── Delta + suggestion ───────────────────────────────────────────────────────

def build_delta(checklist: dict) -> dict:
    done, partial, not_started, inconsist = [], [], [], []
    for it in checklist["items"]:
        st = it["state"]
        if st == "DONE":
            done.append(it["text"])
        elif st == "PARTIAL":
            partial.append(it["text"])
        elif st in ("MISSING", "BLOCKED"):
            not_started.append(it["text"])
        if "marcado mas arquivo ausente" in it["evidence"]:
            inconsist.append(f"checklist marcado mas arquivo ausente: {it['text']}")
    return {"done": done, "partial": partial, "notStarted": not_started,
            "inconsistencies": inconsist}


def suggest_plan_type(checklist: dict, delta: dict, prior_plan_exists: bool) -> str:
    total = checklist["total"]
    if delta["inconsistencies"]:
        return "REPLANEJAMENTO"
    if total and checklist["missing"] == 0 and checklist["partial"] == 0 and checklist["blocked"] == 0:
        return "REVIEW"
    if prior_plan_exists and checklist["done"] > 0:
        return "CONTINUACAO"
    return "INCREMENTAL"


# ── Subcommand ───────────────────────────────────────────────────────────────

def cmd_extract(args) -> int:
    root = find_root(args.root)
    layer, issue_file = resolve_issue(args.issue, args.layer, args.issue_file, root)
    if issue_file is None:
        print(f"error: issue nao encontrada: {args.issue} (layer={layer or 'auto'})", file=sys.stderr)
        return 1

    text = issue_file.read_text(encoding="utf-8", errors="replace")
    items = parse_checklist(text)
    if not items:
        print(f"error: issue sem checklist parseavel: {issue_file}", file=sys.stderr)
        return 2

    checklist = consolidate(items, root, extra_roots_for_issue(args.issue, layer, root))
    public_checklist = {k: v for k, v in checklist.items() if not k.startswith("_") and k != "items"}

    plan_file, plan_kind = resolve_plan_file(args.issue, layer, args.plan_file, root)
    if plan_file is None:
        phases = []
    else:
        plan_text = plan_file.read_text(encoding="utf-8", errors="replace")
        phases = (parse_module_plan_phases(plan_text, args.issue) if plan_kind == "module"
                  else parse_plan_phases(plan_text))
    # For a module plan, "exists" means this issue is actually covered by a
    # priority in it -- a module plan that doesn't mention the issue yet is
    # not a plan for this issue (the planner still needs to add it).
    covers_issue = bool(phases) if plan_kind == "module" else plan_file is not None
    prior = {"exists": plan_file is not None and covers_issue,
             "file": str(plan_file.relative_to(root)) if plan_file else None,
             "kind": plan_kind,
             "phases": phases}

    delta = build_delta(checklist)
    deps = extract_dependencies(text)
    suggested = suggest_plan_type(checklist, delta, prior["exists"])

    out = {
        "issue": args.issue,
        "layer": layer,
        "computedAt": _dt.datetime.now().isoformat(timespec="seconds"),
        "checklist": public_checklist,
        "priorPlan": prior,
        "delta": delta,
        "dependencies": deps,
        "suggestedPlanType": suggested,
        "needsAgentConfirm": True,
    }

    out_path = Path(args.output) if args.output else issue_file.with_name(f"{issue_file.stem}.plan-state.json")
    atomic_write(out_path, json.dumps(out, indent=2, ensure_ascii=False) + "\n")

    if args.report:
        print(f"\nIssue: {args.issue} (layer={layer})")
        print(f"Checklist: {public_checklist['done']} done / {public_checklist['partial']} partial / "
              f"{public_checklist['missing']} missing / {public_checklist['blocked']} blocked")
        print(f"Prior plan: {'sim' if prior['exists'] else 'nao'} ({len(phases)} fase(s))")
        print(f"Inconsistencias: {len(delta['inconsistencies'])}")
        print(f"Sugestao (needsAgentConfirm): {suggested}\n")

    print(f"OK: plan-state -- {out_path.name} [suggest={suggested}]")
    return 0


def main() -> None:
    force_utf8_stdio()
    parser = argparse.ArgumentParser(
        prog="plan-state-extractor",
        description="Plan continuity / delta for the planner (D-319). Read-only.",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    ex = sub.add_parser("extract", help="emit <ISSUE>.plan-state.json")
    ex.add_argument("--issue", required=True, metavar="ISSUE_ID")
    ex.add_argument("--layer", choices=sorted(LAYER_PROFILES), help="default: autodetect")
    ex.add_argument("--issue-file", metavar="PATH")
    ex.add_argument("--plan-file", metavar="PATH")
    ex.add_argument("--root", metavar="PATH")
    ex.add_argument("--output", metavar="PATH")
    ex.add_argument("--report", action="store_true")
    ex.set_defaults(func=cmd_extract)

    args = parser.parse_args()
    sys.exit(args.func(args))


if __name__ == "__main__":
    main()
