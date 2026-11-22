#!/usr/bin/env python3
"""pole-position-split.py — deterministic parallel-execution split for a plan (D-359, D-360).

READ-ONLY over the plan. Given a planner output (`plan-<MOD>.md` for backend, or
`plan-<ISSUE>.md` for frontend) and a terminal count N, it partitions the plan's
work units (backend priorities `### Prioridade N`, or frontend phases `### fase-N`)
into N streams with **disjoint file ownership**, then emits:

  - `<MOD>.pole-position.json` — the machine partition (streams, owned files,
    coalesced units, conflicts, warnings);
  - `plan-<MOD>-pole-position.md` — the human/agent artifact: per-stream worktree,
    branch, owned units + files, and a kick-off prompt. The planner agent enriches
    the narrative; this script decides the *files and the split* (R0: the LLM never
    decides which files go where).

Why a script (R0 / "the LLM does not decide files"): overlapping file targets between
work units are a correctness hazard for parallel execution. Two terminals editing
the same file race. This script builds a conflict graph (units sharing a target
file are connected), collapses each connected component into one indivisible unit,
and bin-packs the components across N streams so **no file is owned by two
streams**. If two units must share a file they land in the same stream — never
split.

R3: argparse subcommand, root walk-up, atomic write, OK:/error:, exit 0/1/2.
Exit 2 == plan has no parseable work units (nothing to split).

Usage:
    python scripts/pole-position-split.py split --plan docs/architecture/backend/plans/plan-LEAD.md --terminals 3
    python scripts/pole-position-split.py split --plan docs/.../plan-CAD-FE-007.md --terminals 2 --report
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path

try:
    from cli_utils import force_utf8_stdio
except ImportError:  # pragma: no cover - cli_utils always ships alongside
    def force_utf8_stdio() -> None:
        pass


# ── Plan parsing ──────────────────────────────────────────────────────────────

# A work unit is a priority (backend) or a phase (frontend). Both are `### ...`.
_UNIT_RE = re.compile(
    r"^###\s+(Prioridade\s+\d+|fase-(?:UI-)?\d+|Fase\s+\d+)\b[^\n]*$",
    re.IGNORECASE | re.MULTILINE,
)

# File targets: backtick-wrapped paths, or bare paths with a slash + extension.
_BACKTICK_PATH_RE = re.compile(r"`([^`\n]+?\.[A-Za-z0-9]{1,6})`")
_BARE_PATH_RE = re.compile(r"(?<![`\w])((?:[\w.@-]+/)+[\w.-]+\.[A-Za-z0-9]{1,6})")

# Lines that are commands/examples, not ownership — skip their paths.
_NOISE_PREFIXES = ("python ", "npx ", "npm ", "./gradlew", "git ", "$ ")

# Unit status line. Both spellings exist in real plans: `Status: pendente` and
# `**Status:** pendente`.
_STATUS_RE = re.compile(r"^\s*\*{0,2}Status:?\*{0,2}\s*:?\s*([A-Za-zÀ-ÿ-]+)", re.MULTILINE)

# Spellings that mean "this unit is finished".
_DONE_STATUSES = ("conclu", "done", "encerrad", "implementad", "feito")


def _unit_id(heading: str) -> str:
    """'Prioridade 2 -- Foo' → 'P2'; 'fase-UI-1: bar' → 'fase-UI-1'."""
    m = re.match(r"Prioridade\s+P?(\d+[A-Za-z]*(?:-[A-Za-z0-9]+)?)", heading, re.IGNORECASE)
    if m:
        return f"P{m.group(1)}"
    m = re.match(r"(fase-(?:UI-)?\d+)", heading, re.IGNORECASE)
    if m:
        return m.group(1)
    m = re.match(r"Fase\s+(\d+)", heading, re.IGNORECASE)
    if m:
        return f"fase-{m.group(1)}"
    return heading.strip()[:24]


def _extract_paths(body: str) -> set[str]:
    """Collect candidate file paths from a unit body, skipping command lines."""
    paths: set[str] = set()
    for line in body.splitlines():
        stripped = line.strip().lstrip("-*0123456789. ")
        if stripped.startswith(_NOISE_PREFIXES):
            continue
        for m in _BACKTICK_PATH_RE.finditer(line):
            paths.add(m.group(1).strip())
        # Strip backtick-quoted spans before bare matching so a bare regex
        # doesn't re-capture a suffix of an already-captured backtick path
        # (e.g. `backend/services/x.java` would also yield `services/x.java`).
        line = re.sub(r"`[^`]*`", " ", line)
        # Bare paths are lower-confidence; backtick paths dominate.
        for m in _BARE_PATH_RE.finditer(line):
            cand = m.group(1).strip()
            # Drop obvious URLs / package coordinates without a dir-ish shape.
            if "://" in cand or cand.count("/") == 0:
                continue
            paths.add(cand)
    # Normalize separators.
    return {p.replace("\\", "/") for p in paths}


def parse_units(plan_text: str) -> list[dict]:
    """Return [{id, heading, status, files:set}] for each `### Prioridade/fase` block."""
    matches = list(_UNIT_RE.finditer(plan_text))
    units: list[dict] = []
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(plan_text)
        body = plan_text[start:end]
        heading = m.group(0).lstrip("# ").strip()
        units.append({
            "id": _unit_id(heading),
            "heading": heading,
            "status": _unit_status(body),
            "files": _extract_paths(body),
        })
    return units


# ── Partition (conflict graph + bin-pack) ──────────────────────────────────────

def _components(units: list[dict]) -> list[list[int]]:
    """Connected components over 'units share ≥1 file' (union-find)."""
    parent = list(range(len(units)))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        parent[find(a)] = find(b)

    owner: dict[str, int] = {}
    conflicts: dict[str, list[str]] = {}
    for idx, u in enumerate(units):
        for f in u["files"]:
            if f in owner:
                union(idx, owner[f])
                conflicts.setdefault(f, [units[owner[f]]["id"]]).append(u["id"])
            else:
                owner[f] = idx
    groups: dict[int, list[int]] = {}
    for idx in range(len(units)):
        groups.setdefault(find(idx), []).append(idx)
    # Stash conflicts on the function via attribute-free return: caller recomputes.
    _components.last_conflicts = {f: sorted(set(v)) for f, v in conflicts.items()}  # type: ignore[attr-defined]
    return list(groups.values())


def partition(units: list[dict], n_terminals: int) -> dict:
    """Bin-pack file-disjoint components into N streams (largest-first)."""
    comps = _components(units)
    conflicts = getattr(_components, "last_conflicts", {})

    # Build component records.
    comp_recs = []
    for members in comps:
        u_ids = [units[i]["id"] for i in members]
        files: set[str] = set()
        for i in members:
            files |= units[i]["files"]
        comp_recs.append({"units": u_ids, "files": sorted(files), "weight": len(members)})
    # Largest component first → balance.
    comp_recs.sort(key=lambda c: (-c["weight"], c["units"]))

    effective = min(n_terminals, len(comp_recs)) or 1
    streams: list[dict] = [
        {"terminal": t + 1, "units": [], "files": [], "weight": 0}
        for t in range(effective)
    ]
    for c in comp_recs:
        # Assign to the currently-lightest stream (greedy bin-pack).
        target = min(streams, key=lambda s: s["weight"])
        target["units"].extend(c["units"])
        target["files"].extend(c["files"])
        target["weight"] += c["weight"]
    for s in streams:
        s["units"].sort()
        s["files"].sort()

    warnings: list[str] = []
    if n_terminals > len(comp_recs):
        warnings.append(
            f"requested {n_terminals} terminals but only {len(comp_recs)} "
            f"file-disjoint group(s) exist — using {effective}. More terminals "
            f"would idle or force file conflicts.")
    if conflicts:
        warnings.append(
            f"{len(conflicts)} file(s) are targeted by >1 unit; those units were "
            f"coalesced into the same stream to keep ownership disjoint.")
    if any(not u["files"] for u in units):
        warnings.append(
            "some units declare no file targets — their split is by unit only "
            "(ownership not verifiable). Add 'Alvos de alteração' paths to the plan.")

    return {
        "terminals_requested": n_terminals,
        "terminals_effective": effective,
        "streams": streams,
        "conflicts": conflicts,
        "warnings": warnings,
    }


# ── Rendering the human artifact ────────────────────────────────────────────────

def render_md(module: str, layer: str, plan_path: str, part: dict) -> str:
    base = module.lower()
    L: list[str] = []
    L.append(f"# Pole Position split — {module} ({layer})")
    L.append("")
    L.append(f"> Gerado por `pole-position-split.py` a partir de `{plan_path}`.")
    L.append(f"> Terminais: {part['terminals_effective']} "
             f"(pedidos: {part['terminals_requested']}). Ownership de arquivo disjunto.")
    L.append("> O planner enriquece a narrativa; o split (arquivos por terminal) é determinístico.")
    L.append("")
    if part["warnings"]:
        L.append("## ⚠️ Avisos")
        L.append("")
        for w in part["warnings"]:
            L.append(f"- {w}")
        L.append("")
    L.append("## Setup de worktrees (humano, uma vez)")
    L.append("")
    L.append("```bash")
    for s in part["streams"]:
        t = s["terminal"]
        L.append(f"git worktree add ../{base}-t{t} -b stream/{base}-t{t}")
    L.append("```")
    L.append("")
    L.append("## Streams")
    L.append("")
    L.append("| Terminal | Branch | Unidades | Arquivos (owned) |")
    L.append("|---|---|---|---|")
    for s in part["streams"]:
        t = s["terminal"]
        units = ", ".join(s["units"]) or "—"
        nfiles = len(s["files"])
        L.append(f"| t{t} | `stream/{base}-t{t}` | {units} | {nfiles} |")
    L.append("")
    for s in part["streams"]:
        t = s["terminal"]
        L.append(f"### Terminal t{t} — `stream/{base}-t{t}`")
        L.append("")
        L.append(f"**Unidades:** {', '.join(s['units']) or '—'}")
        L.append("")
        L.append("**Arquivos sob sua responsabilidade (não tocar fora desta lista):**")
        L.append("")
        if s["files"]:
            for f in s["files"]:
                L.append(f"- `{f}`")
        else:
            L.append("- _(nenhum path declarado no plano — split por unidade)_")
        L.append("")
        L.append("**Prompt de kick-off:**")
        L.append("")
        L.append("```")
        L.append(f"Você implementa o terminal t{t} do split pole-position de {module}.")
        L.append(f"Branch: stream/{base}-t{t}. Nunca trocar de branch.")
        L.append(f"Plano-fonte: {plan_path}")
        L.append(f"Suas unidades: {', '.join(s['units']) or '—'}.")
        L.append("Toque SOMENTE os arquivos listados acima. Se precisar de um arquivo")
        L.append("de outro terminal, pare e sinalize — não edite fora do seu ownership.")
        L.append("Siga o plano para suas unidades; rode os testes locais antes de marcar pronto.")
        L.append("```")
        L.append("")
    L.append("## Ordem de merge")
    L.append("")
    L.append("Merge em `dev` na ordem dos terminais (t1, t2, ...). Cada um é file-disjunto, "
             "então a ordem é livre; conflitos de merge não devem ocorrer por design. "
             "Resolva dependências de unidade (ex.: P2 depende de P1) sincronizando via `dev` "
             "antes do gate do terminal dependente.")
    L.append("")
    return "\n".join(L) + "\n"


# ── I/O helpers ─────────────────────────────────────────────────────────────────

def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def _infer_module(plan_path: Path) -> str:
    """plan-LEAD.md → LEAD; plan-CAD-FE-007.md → CAD-FE-007."""
    stem = plan_path.stem
    return re.sub(r"^plan-", "", stem, flags=re.IGNORECASE) or stem


def _infer_layer(plan_path: Path) -> str:
    p = str(plan_path).replace("\\", "/").lower()
    if "/frontend/" in p or "-fe-" in p:
        return "fe"
    return "be"


# ── CLI ───────────────────────────────────────────────────────────────────────

def _unit_status(body: str) -> str:
    """'pendente' / 'concluida' / 'unknown' -- lowercased first word after Status:."""
    m = _STATUS_RE.search(body)
    return m.group(1).strip().lower() if m else "unknown"


def _is_done(status: str) -> bool:
    return status.startswith(_DONE_STATUSES)


def cmd_validate(args: argparse.Namespace) -> int:
    """Gate: every pending unit must declare at least one file target.

    The implementer's reading budget (be-implement.md / fe-implement.md) is spent
    locating targets the plan failed to name, and blocks when it runs out. This
    gate moves that cost back to the planner, where it belongs: a priority that
    names no file is a plan the implementer cannot execute without exploring.

    The check is "declares >= 1 file path", not "has a heading called X" -- three
    competing labels for the same field exist (`**Alvos de alteracao:**` from
    doc-scaffold.py, `#### Alvos de alteracao (...)` from be-planner.md, plus
    variants), and _extract_paths has always ignored the label anyway.
    """
    plan_path = Path(args.plan)
    if not plan_path.is_file():
        print(f"error: plan not found: {plan_path}", file=sys.stderr)
        return 1

    text = plan_path.read_text(encoding="utf-8", errors="replace")
    units = parse_units(text)
    if not units:
        print("error: no work units found (expected '### Prioridade N' or "
              "'### fase-N' headings). Nothing to validate.", file=sys.stderr)
        return 2

    # Everything that is not explicitly finished still lies ahead -- including
    # units with no Status: line at all, which would otherwise pass vacuously
    # (plan-WRKS-P10.md has five such units).
    checked = [u for u in units if args.all or not _is_done(u["status"])]
    missing = [u for u in checked if not u["files"]]

    module = args.module or _infer_module(plan_path)
    scope = "todas as unidades" if args.all else "unidades nao concluidas"
    if args.report or missing:
        print(f"=== pole-position validate -- {module} ({scope}) ===")
        print(f"unidades: {len(units)} | verificadas: {len(checked)} | "
              f"sem alvos: {len(missing)}")

    if not missing:
        print(f"OK: {module} -- {len(checked)} {scope} declaram alvos de alteracao")
        return 0

    print(f"error: {len(missing)} unidade(s) sem nenhum caminho de arquivo declarado "
          f"-- o implementador nao consegue executa-las sem explorar o modulo:",
          file=sys.stderr)
    for u in missing:
        print(f"  - {plan_path.name} {u['id']} ({u['heading'][:60]})", file=sys.stderr)
    print("Adicione os caminhos completos dos arquivos a criar/editar em cada "
          "unidade acima (secao 'Alvos de alteracao').", file=sys.stderr)
    return 2


def cmd_split(args: argparse.Namespace) -> int:
    plan_path = Path(args.plan)
    if not plan_path.is_file():
        print(f"error: plan not found: {plan_path}", file=sys.stderr)
        return 1
    if args.terminals < 1:
        print("error: --terminals must be >= 1", file=sys.stderr)
        return 1

    module = args.module or _infer_module(plan_path)
    layer = args.layer or _infer_layer(plan_path)
    text = plan_path.read_text(encoding="utf-8", errors="replace")
    units = parse_units(text)
    if not units:
        print("error: no work units found (expected '### Prioridade N' or "
              "'### fase-N' headings). Nothing to split.", file=sys.stderr)
        return 2

    part = partition(units, args.terminals)
    part["module"] = module
    part["layer"] = layer
    part["plan"] = str(plan_path)
    part["units"] = [{"id": u["id"], "heading": u["heading"],
                      "files": sorted(u["files"])} for u in units]

    json_path = plan_path.parent / f"{module}.pole-position.json"
    md_path = plan_path.parent / f"plan-{module}-pole-position.md"
    _atomic_write(json_path, json.dumps(part, indent=2, ensure_ascii=False) + "\n")
    _atomic_write(md_path, render_md(module, layer, str(plan_path), part))

    if args.report:
        print(f"=== pole-position split — {module} ({layer}) ===")
        print(f"units: {len(units)} | terminals: {part['terminals_effective']}"
              f"/{part['terminals_requested']}")
        for s in part["streams"]:
            print(f"  t{s['terminal']}: units={s['units'] or '—'} "
                  f"files={len(s['files'])}")
        for w in part["warnings"]:
            print(f"  ! {w}")
    print(f"OK: split {module} into {part['terminals_effective']} terminal(s) "
          f"→ {md_path.name}, {json_path.name}")
    return 0


def _main(argv: list[str] | None = None) -> int:
    force_utf8_stdio()
    parser = argparse.ArgumentParser(
        description="Deterministic pole-position split of a planner output (D-359).")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("split", help="Partition a plan into N file-disjoint streams")
    p.add_argument("--plan", required=True, help="Path to plan-<MOD>.md")
    p.add_argument("--terminals", type=int, required=True, help="Number of terminals/agents")
    p.add_argument("--module", help="Module/issue id (default: inferred from plan filename)")
    p.add_argument("--layer", choices=["be", "fe"], help="Pipeline layer (default: inferred)")
    p.add_argument("--report", action="store_true", help="Print a summary to stdout")
    p.set_defaults(func=cmd_split)

    v = sub.add_parser(
        "validate",
        help="Gate: every pending unit must declare >= 1 file target (exit 2 if not)")
    v.add_argument("--plan", required=True, help="Path to plan-<MOD>.md")
    v.add_argument("--all", action="store_true",
                   help="also check units already concluded (default: pending only)")
    v.add_argument("--module", help="Module/issue id (default: inferred from filename)")
    v.add_argument("--report", action="store_true", help="Print a summary even when clean")
    v.set_defaults(func=cmd_validate)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(_main())
