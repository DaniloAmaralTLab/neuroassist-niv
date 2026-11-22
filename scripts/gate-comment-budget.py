#!/usr/bin/env python3
"""gate-comment-budget.py — comment policy gate (D-580).

Code is self-explanatory: the *what* and the *how* live in the code. The *why*
(decision, invariant, pitfall) lives in the retrievable layer — `D-NNN` in the
consolidation doc, ADR, `api-contract.md` — and appears in code at most as a
one-line pointer. This gate enforces that deterministically, because the
same rule placed in a prompt degrades in two phases.

Four rules (D-580):

        densidade    (density) comment > 35% of the file's non-blank lines.
                                  The cap is 35%, not 10%: the measurement that originated D-580 shows
                                  that ~87% of the prose carries signal that cannot be derived from the code
                                  ("validates that it belongs to the context tenant"). 10% would cut
                                  signal and fail the entire repository.
        reafirmacao  (restatement) bare `// Arrange` / `// Act` / `// Assert` / `// Given|When|Then`
                                  and section banners (`// ---- helpers ----`). Zero signal.
        todo-nu      (bare TODO) TODO/FIXME/XXX/HACK without a trace. Traceable = `TODO[TAG]`,
                                  a `D-NNN`, or a reference to an issue/plan/doc. Without this there is no
                                  way to tell scaffold debt from somebody's note — in
                                  candeeiro-so, 1484 `// TODO: implement step` were passing as
                                  finished code.
        eco (WARN)   (echo) comment whose only information is already on the next line.
                                  Heuristic, so it warns and does not fail (`--strict` promotes).

Default scope = **the diff**, not the tree. D-580 is forward-looking: it does not require
retroactive remediation of existing sites. In diff mode, density only
applies to new files (the author of a new line is not responsible for inherited
density); the remaining rules apply to added lines.

Usage:
        gate-comment-budget.py check                       # worktree diff
        gate-comment-budget.py check --base origin/main    # diff against a ref
        gate-comment-budget.py check --all                 # entire tree
        gate-comment-budget.py report --all --json         # density per bucket
    gate-comment-budget.py check --all --output report.md

Exit codes (R3): 0 no violations | 1 usage error | 2 violations found.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    from cli_utils import force_utf8_stdio
except ImportError:  # the gate must run even standalone (R3: stdlib-only)
    def force_utf8_stdio() -> None:
        for stream in (sys.stdout, sys.stderr):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
            except (AttributeError, ValueError):
                pass


MAX_DENSITY = 0.35
MIN_LINES = 30  # below this, density is statistical noise

# Comment syntax per extension. "line-block" = `//` + `/* */`.
LANGS = {
    ".java": "line-block", ".kt": "line-block", ".kts": "line-block",
    ".ts": "line-block", ".tsx": "line-block", ".js": "line-block",
    ".jsx": "line-block", ".mts": "line-block", ".cts": "line-block",
    ".scss": "block", ".css": "block",
    ".py": "hash",
    ".html": "html",
}

EXCLUDE_DIRS = {
    "node_modules", "build", "dist", ".git", ".gradle", ".nx", ".angular",
    "coverage", "playwright-report", "test-results", "out", "bin", "tmp",
    "__pycache__", ".venv", "venv", "target", "design-reference",
}

# `design-reference/` is left out: it is the prototype cloned from BA, not code that
# this pipeline writes.

# A traceable TODO points at something: a tag, a decision, an issue, a doc.
TRACEABLE = re.compile(
    r"""(?xi)
    TODO\[[^\]]+\] | FIXME\[[^\]]+\]      # TODO[SCAFFOLD], FIXME[PAY-012]
    | \bD-\d{3}\b                          # decision pointer
    | \bissue\b | \bplan-\S+                # see issue X / plan-PAY-001.md
    | \b\d{2}[a-z]?-[a-z][a-z-]+\b          # see 02b-be-logic
    | \S+\.(?:md|puml|ya?ml)\b              # see api-contract.md
    """
)
# Anchored at the START of the comment: `// TODO: x` is an annotation, but
# `# skeleton has TODO` is prose ABOUT annotations. Without the anchor, a sentence that
# mentioned the word failed the build.
TODO_MARK = re.compile(r"^\s*[-*]?\s*(TODO|FIXME|XXX|HACK)\b")

_LEAD = r"^\s*(?://+|/\*+|\*+/?|#+|<!--)\s*"
# `// Arrange`, `// Act:`, `// Given` — a bare label, without the fact that justifies it.
BARE_LABEL = re.compile(
    _LEAD + r"(arrange|act|assert|given|when|then|setup|teardown)\s*[:.\-]?\s*(\*/|-->)?\s*$",
    re.IGNORECASE,
)
# `// ---- helpers ----`, `// ===== GETTERS =====`, `// ***`
SECTION_BANNER = re.compile(_LEAD + r"[=\-~*#_]{3,}")
SECTION_BANNER_WRAPPED = re.compile(_LEAD + r"[=\-~*#_]{2,}[^=\-~*#_]*[=\-~*#_]{2,}\s*$")

WORD = re.compile(r"[A-Za-z]{3,}")
CAMEL_SPLIT = re.compile(r"(?<!^)(?=[A-Z])")
STOPWORDS = {
    "the", "and", "for", "from", "with", "that", "this", "into", "com", "para",
    "dos", "das", "que", "por", "uma", "este", "esta", "esse", "não", "nao",
}


@dataclass
class Violation:
    file: str
    line: int
    rule: str
    detail: str
    severity: str = "FAIL"


@dataclass
class FileStats:
    code: int = 0
    comment: int = 0
    blank: int = 0
    comments: list[tuple[int, str]] = field(default_factory=list)

    @property
    def density(self) -> float:
        total = self.code + self.comment
        return self.comment / total if total else 0.0


def _scan_python(text: str) -> FileStats | None:
    """Python comments via the tokenizer, not by line prefix.

    Several scripts embed Markdown templates in triple-quoted strings, and a heading
    (`### Priorities`) starts with `#` just as a comment does. Counted as
    a comment, they inflated the density and triggered rules over text that is not
    even code -- `doc-scaffold.py` failed for two `{TODO}` that are
    markers of a generated plan. The tokenizer can tell them apart; a prefix cannot.

    Returns None if the file does not tokenize (broken syntax), so the caller
    falls back to the prefix scanner instead of losing the file.
    """
    import io
    import tokenize

    st = FileStats()
    comment_lines: set[int] = set()
    try:
        for tok in tokenize.generate_tokens(io.StringIO(text).readline):
            if tok.type == tokenize.COMMENT:
                comment_lines.add(tok.start[0])
                st.comments.append((tok.start[0], tok.line.strip()))
    except (tokenize.TokenError, IndentationError, SyntaxError):
        return None

    for no, raw in enumerate(text.splitlines(), start=1):
        if not raw.strip():
            st.blank += 1
        elif no in comment_lines:
            st.comment += 1
        else:
            st.code += 1
    return st


def scan(text: str, kind: str) -> FileStats:
    """Count lines and return (number, text) of each comment line."""
    if kind == "hash":
        tokenized = _scan_python(text)
        if tokenized is not None:
            return tokenized
    st = FileStats()
    in_block = False
    closer = "*/"
    for no, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if in_block:
            st.comment += 1
            st.comments.append((no, line))
            if closer in line:
                in_block = False
            continue
        if not line:
            st.blank += 1
            continue
        opener = None
        if kind in ("line-block", "block") and line.startswith("/*"):
            opener, closer = "/*", "*/"
        elif kind == "html" and line.startswith("<!--"):
            opener, closer = "<!--", "-->"
        if opener:
            st.comment += 1
            st.comments.append((no, line))
            if closer not in line[len(opener):]:
                in_block = True
            continue
        if (kind == "line-block" and line.startswith("//")) or \
           (kind == "hash" and line.startswith("#")):
            st.comment += 1
            st.comments.append((no, line))
            continue
        st.code += 1
    return st


def strip_marker(s: str) -> str:
    return re.sub(r"^\s*(?://+|/\*+|\*+/?|#+|<!--|-->)\s*", "", s).replace("*/", "").strip()


def _next_code_line(lines: list[str], idx: int, comment_lines: set[int]) -> str:
    """First line of CODE after `idx` (1-based line number).

    Skips blanks AND comments. Without skipping comments, a block of prose
    accused itself: the "next line" of a comment is almost always
    another comment, and two consecutive lines of rationale share vocabulary.
    That was a false positive on exactly what D-580 wants to preserve --
    the non-derivable why.
    """
    for j in range(idx, min(idx + 10, len(lines))):
        if not lines[j].strip():
            continue
        if (j + 1) in comment_lines:
            continue
        return lines[j]
    return ""


def check_file(path: Path, rel: str, added: set[int] | None,
               apply_density: bool, max_density: float) -> tuple[FileStats | None, list[Violation]]:
    kind = LANGS.get(path.suffix.lower())
    if not kind:
        return None, []
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return None, [Violation(rel, 0, "io", str(exc))]

    st = scan(text, kind)
    if st.code + st.comment == 0:
        return st, []

    lines = text.splitlines()
    comment_lines = {no for no, _ in st.comments}
    out: list[Violation] = []

    if apply_density and st.code + st.comment >= MIN_LINES and st.density > max_density:
        out.append(Violation(
            rel, 1, "densidade",
            f"{st.density:.0%} de comentario (teto {max_density:.0%}; "
            f"{st.comment} coment. / {st.code} codigo) — mova o porque para o RAG",
        ))

    for no, raw in st.comments:
        if added is not None and no not in added:
            continue
        body = strip_marker(raw)
        if not body:
            continue

        if TODO_MARK.search(body) and not TRACEABLE.search(body):
            out.append(Violation(
                rel, no, "todo-nu",
                f"{body[:60]!r} — sem rastreio; use TODO[TAG], D-NNN ou 'see issue X'",
            ))
            continue

        if BARE_LABEL.match(raw):
            out.append(Violation(
                rel, no, "reafirmacao", f"{body[:60]!r} — rotulo nu, o codigo ja diz"))
            continue

        if SECTION_BANNER.match(raw) or SECTION_BANNER_WRAPPED.match(raw):
            out.append(Violation(
                rel, no, "reafirmacao", f"{body[:60]!r} — banner de seccao"))
            continue

        nxt = _next_code_line(lines, no, comment_lines)
        # `<pre>`, `</p>`: Javadoc markup is not prose, it cannot echo anything.
        prose = re.sub(r"</?[a-z][a-z0-9]*\s*/?>", " ", body, flags=re.IGNORECASE)
        if nxt and WORD.search(prose):
            c = {w.lower() for w in WORD.findall(prose)} - STOPWORDS
            n = {w.lower() for w in WORD.findall(CAMEL_SPLIT.sub(" ", nxt))}
            # `c & n` required: without a word in common there is no echo to prove.
            # Without it, a comment that reduces to ONE content word
            # always passed -- the tolerance of 1 divergence swallowed the
            # whole comparison and flagged prose unrelated to the code.
            if c and (c & n) and len(c - n) <= max(1, len(c) // 4):
                out.append(Violation(
                    rel, no, "eco", f"{body[:60]!r} — repete a linha seguinte", "WARN"))
    return st, out



def _git(root: Path, *args: str) -> str:
    try:
        res = subprocess.run(["git", "-C", str(root), *args],
                             capture_output=True, text=True, check=True)
    except (OSError, subprocess.CalledProcessError) as exc:
        raise RuntimeError(f"git {' '.join(args)}: {exc}") from exc
    return res.stdout


_HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")


def changed_files(root: Path, base: str | None) -> dict[str, tuple[set[int], bool]]:
    """rel -> (added lines, is_new_file). base=None -> worktree vs HEAD."""
    rng = [base] if base else []
    names = _git(root, "diff", "--name-status", "--diff-filter=ACMR", *rng)
    new_files: set[str] = set()
    wanted: set[str] = set()
    for line in names.splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        status, rel = parts[0], parts[-1]
        if Path(rel).suffix.lower() not in LANGS:
            continue
        wanted.add(rel)
        if status.startswith("A"):
            new_files.add(rel)

    # untracked counts as a new file
    for rel in _git(root, "ls-files", "--others", "--exclude-standard").splitlines():
        if rel and Path(rel).suffix.lower() in LANGS:
            wanted.add(rel)
            new_files.add(rel)

    out: dict[str, tuple[set[int], bool]] = {r: (set(), r in new_files) for r in wanted}
    if wanted:
        diff = _git(root, "diff", "-U0", *rng, "--", *sorted(wanted))
        cur, ln = None, 0
        for line in diff.splitlines():
            if line.startswith("+++ b/"):
                cur, ln = line[6:], 0
            elif line.startswith("@@"):
                m = _HUNK.match(line)
                if m:
                    ln = int(m.group(1))
            elif line.startswith("+") and not line.startswith("+++") and cur in out:
                out[cur][0].add(ln)
                ln += 1
    for rel in new_files:
        p = root / rel
        if p.is_file():
            try:
                n = len(p.read_text(encoding="utf-8", errors="replace").splitlines())
                out[rel] = (set(range(1, n + 1)), True)
            except OSError:
                pass
    return out


def walk(root: Path) -> list[str]:
    rels: list[str] = []
    for path in root.rglob("*"):
        if not path.is_file() or EXCLUDE_DIRS & set(path.parts):
            continue
        if path.suffix.lower() in LANGS:
            rels.append(str(path.relative_to(root)).replace("\\", "/"))
    return rels



def bucket_of(rel: str) -> str:
    p = "/" + rel.replace("\\", "/")
    if "/backend/" in p or p.startswith("/backend"):
        return "backend-test" if "/src/test/" in p else "backend-main"
    if "/frontend/" in p or p.startswith("/frontend"):
        if re.search(r"\.(spec|test)\.[tj]sx?$", p):
            return "frontend-spec"
        return "frontend-src"
    if "/scripts/" in p or p.startswith("/scripts"):
        return "scripts"
    return "other"



_ICON = {"FAIL": "[FAIL]", "WARN": "[WARN]", "OK": "[ OK ]"}


def render_violations(vs: list[Violation]) -> str:
    if not vs:
        return "Nenhuma violacao.\n"
    lines = ["| Sev | Regra | Local | Detalhe |", "|---|---|---|---|"]
    for v in vs:
        lines.append(f"| {_ICON[v.severity]} | {v.rule} | `{v.file}:{v.line}` | {v.detail} |")
    return "\n".join(lines) + "\n"


def render_report(stats: dict[str, FileStats]) -> str:
    agg: dict[str, dict[str, int]] = defaultdict(lambda: {"files": 0, "code": 0, "comment": 0})
    for rel, st in stats.items():
        b = agg[bucket_of(rel)]
        b["files"] += 1
        b["code"] += st.code
        b["comment"] += st.comment
    lines = ["| Balde | Ficheiros | Codigo | Comentario | Densidade |", "|---|---:|---:|---:|---:|"]
    tc = tk = 0
    for name, b in sorted(agg.items(), key=lambda kv: -(kv[1]["comment"] / max(1, kv[1]["comment"] + kv[1]["code"]))):
        total = b["comment"] + b["code"]
        tc += b["comment"]
        tk += total
        lines.append(f"| {name} | {b['files']} | {b['code']:,} | {b['comment']:,} | "
                     f"{b['comment'] / max(1, total):.1%} |")
    lines.append(f"| **total** | {sum(v['files'] for v in agg.values())} | | {tc:,} | "
                 f"{tc / max(1, tk):.1%} |")
    return "\n".join(lines) + "\n"



def run(args: argparse.Namespace) -> tuple[list[Violation], dict[str, FileStats], int]:
    root = args.path.resolve()
    if not root.is_dir():
        print(f"error: {root} nao e um diretorio", file=sys.stderr)
        return [], {}, 1

    if args.all:
        targets = {rel: (None, True) for rel in walk(root)}
    else:
        try:
            targets = {rel: (added, is_new)
                       for rel, (added, is_new) in changed_files(root, args.base).items()}
        except RuntimeError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return [], {}, 1
        if not targets:
            return [], {}, 0

    violations: list[Violation] = []
    stats: dict[str, FileStats] = {}
    for rel, (added, is_new) in sorted(targets.items()):
        p = root / rel
        if not p.is_file() or EXCLUDE_DIRS & set(Path(rel).parts):
            continue
        st, vs = check_file(p, rel, added, apply_density=is_new, max_density=args.max_density)
        if st is not None:
            stats[rel] = st
        violations.extend(vs)

    if args.strict:
        for v in violations:
            v.severity = "FAIL"
    fails = [v for v in violations if v.severity == "FAIL"]
    return violations, stats, (2 if fails else 0)


def main(argv: list[str] | None = None) -> int:
    force_utf8_stdio()
    ap = argparse.ArgumentParser(description="Gate da politica de comentario (D-580)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, helptxt in (("check", "reprova violacoes"), ("report", "so densidade por balde")):
        sp = sub.add_parser(name, help=helptxt)
        sp.add_argument("--path", type=Path, default=Path(os.environ.get("PROJECT_ROOT", ".")),
                        help="raiz do projeto (default: PROJECT_ROOT ou cwd)")
        sp.add_argument("--all", action="store_true", help="arvore inteira em vez do diff")
        sp.add_argument("--base", default=None, help="ref git de comparacao (ex.: origin/main)")
        sp.add_argument("--max-density", type=float, default=MAX_DENSITY)
        sp.add_argument("--strict", action="store_true", help="promove WARN (eco) a FAIL")
        sp.add_argument("--json", action="store_true")
        sp.add_argument("--output", type=Path, default=None, help="grava fragmento markdown")
    args = ap.parse_args(argv)

    violations, stats, code = run(args)
    if code == 1:
        return 1
    if args.cmd == "report":
        code = 0

    by_rule: dict[str, int] = defaultdict(int)
    for v in violations:
        by_rule[v.rule] += 1

    if args.json:
        print(json.dumps({
            "gate": "comment-budget",
            "decision": "D-580",
            "scope": "all" if args.all else f"diff:{args.base or 'worktree'}",
            "exit": code,
            "files_scanned": len(stats),
            "max_density": args.max_density,
            "by_rule": dict(by_rule),
            "violations": [v.__dict__ for v in violations],
        }, ensure_ascii=False, indent=2))
        return code

    scope = "arvore inteira" if args.all else f"diff ({args.base or 'worktree'})"
    body = f"# Gate comment-budget (D-580) — {scope}\n\n"
    if args.cmd == "report" or args.all:
        body += render_report(stats) + "\n"
    if args.cmd == "check":
        body += render_violations(violations)
        if violations:
            body += "\n" + ", ".join(f"{k}: {n}" for k, n in sorted(by_rule.items())) + "\n"
        body += f"\n**Veredito:** {'REPROVADO' if code else 'aprovado'} " \
                f"({len(stats)} ficheiros, exit {code}).\n"
    print(body)
    if args.output:
        args.output.write_text(body, encoding="utf-8")
    return code


if __name__ == "__main__":
    sys.exit(main())
