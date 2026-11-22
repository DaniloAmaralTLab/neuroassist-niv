#!/usr/bin/env python3
"""stack_resolution.py - resolve the backend language for stack-aware gates (D-569).

Shared by `arch-conformance.py` and `gates-run.py`. Both used to be hardwired to
Java (`*.java` scan / `./gradlew` invocation), which meant a FastAPI or NestJS
service produced a silent false green. They now dispatch per `backend_language`.

Resolution order (first hit wins):

  1. explicit `--stack` flag
  2. `project-context.json` -- shallow merge per tier (D-550):
     `modules[].stack.backend.language` overrides `stack.backend.language`
  3. filesystem markers (a bare fixture dir with no project-context.json)
  4. give up -> `UnresolvedStack`, so the caller can fail loudly

Never guess silently: a gate that cannot tell which stack it is checking must
say so instead of passing.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CONTEXT_FILENAME = "project-context.json"

SUPPORTED_LANGUAGES = ("java", "python", "node")

# Filesystem markers used only when no project-context.json is reachable.
_MARKERS: dict[str, tuple[str, ...]] = {
    "java": ("build.gradle", "build.gradle.kts", "settings.gradle",
             "settings.gradle.kts", "pom.xml"),
    "python": ("pyproject.toml", "alembic.ini", "uv.lock"),
    "node": ("package.json", "pnpm-workspace.yaml", "nest-cli.json"),
}

_EXTENSIONS: dict[str, tuple[str, ...]] = {
    "java": (".java",),
    "python": (".py",),
    "node": (".ts",),
}


class UnresolvedStack(Exception):
    """Raised when the backend language cannot be determined."""


def find_context_file(start: Path) -> Path | None:
    """Walk up from `start` looking for project-context.json."""
    cur = start.resolve()
    for p in [cur, *cur.parents]:
        candidate = p / CONTEXT_FILENAME
        if candidate.is_file():
            return candidate
    return None


def _module_entry(ctx: dict[str, Any], module: str | None) -> dict[str, Any]:
    if not module:
        return {}
    registry = (ctx.get("modules") or {}).get("registry") or []
    want = module.upper()
    for entry in registry:
        if (entry.get("prefix") or "").upper() == want:
            return entry
        if str(entry.get("backendService") or "").lower() == module.lower():
            return entry
    return {}


def backend_stack(ctx: dict[str, Any], module_entry: dict[str, Any]) -> dict[str, Any]:
    """Shallow merge per tier (D-550): module stack.backend overrides the global tier."""
    merged = dict((ctx.get("stack") or {}).get("backend") or {})
    merged.update((module_entry.get("stack") or {}).get("backend") or {})
    return merged


def language_from_context(context_file: Path, module: str | None = None) -> str | None:
    try:
        ctx = json.loads(context_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    backend = backend_stack(ctx, _module_entry(ctx, module))
    language = backend.get("language")
    return str(language).lower() if language else None


def _count_sources(root: Path, suffixes: tuple[str, ...], limit: int = 1) -> int:
    seen = 0
    for p in root.rglob("*"):
        if p.is_file() and p.name.endswith(suffixes):
            seen += 1
            if seen >= limit:
                break
    return seen


def language_from_markers(root: Path) -> str | None:
    """Detect the stack from build markers / source files. Ambiguity -> None."""
    hits: list[str] = []
    for lang, markers in _MARKERS.items():
        if any((root / m).is_file() for m in markers):
            hits.append(lang)
    if len(hits) == 1:
        return hits[0]
    if hits:
        return None
    # No build marker: fall back to source extensions (bare fixture dirs).
    ext_hits = [lang for lang, sfx in _EXTENSIONS.items() if _count_sources(root, sfx)]
    return ext_hits[0] if len(ext_hits) == 1 else None


def resolve_backend_language(root: Path,
                             override: str | None = None,
                             module: str | None = None) -> tuple[str, str]:
    """Return (language, source) or raise UnresolvedStack.

    `source` is one of "flag", "project-context.json", "markers" -- useful for
    reporting so the operator can see how the gate decided.
    """
    if override:
        return override.lower(), "flag"

    context_file = find_context_file(root)
    if context_file is not None:
        language = language_from_context(context_file, module)
        if language:
            return language, str(context_file)

    language = language_from_markers(root)
    if language:
        return language, "markers"

    raise UnresolvedStack(
        f"cannot resolve backend_language for {root}: no --stack flag, no "
        f"{CONTEXT_FILENAME} with stack.backend.language, and filesystem markers "
        f"are absent or ambiguous"
    )

# ── Frontend (D-586) ─────────────────────────────────────────────────────────
# D-570 gave the backend per-stack resolution and left the frontend with an implicit
# `angular`. The result was the FE gate scanning `*.component.ts` in a
# Next.js project, finding zero files and approving six empty rules.

SUPPORTED_FRAMEWORKS = ("angular", "react")

_FE_MARKERS: dict[str, tuple[str, ...]] = {
    "angular": ("angular.json", "nx.json"),
    "react": ("next.config.ts", "next.config.js", "components.json"),
}


def frontend_stack(ctx: dict[str, Any], module_entry: dict[str, Any]) -> dict[str, Any]:
    """Shallow merge per tier (D-550): module stack.frontend over the global one."""
    merged = dict((ctx.get("stack") or {}).get("frontend") or {})
    merged.update((module_entry.get("stack") or {}).get("frontend") or {})
    return merged


def framework_from_context(context_file: Path, module: str | None = None) -> str | None:
    try:
        ctx = json.loads(context_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    fw = frontend_stack(ctx, _module_entry(ctx, module)).get("framework")
    return fw.lower() if isinstance(fw, str) and fw else None


def framework_from_markers(root: Path) -> str | None:
    """A framework only counts when its markers appear alone."""
    hits = [fw for fw, names in _FE_MARKERS.items()
            if any((root / n).is_file() or any(root.rglob(n)) for n in names)]
    return hits[0] if len(hits) == 1 else None


def resolve_frontend_framework(root: Path,
                               override: str | None = None,
                               module: str | None = None) -> tuple[str, str]:
    """(framework, source) or UnresolvedStack. Never guesses."""
    if override:
        return override.lower(), "flag"

    context_file = find_context_file(root)
    if context_file is not None:
        framework = framework_from_context(context_file, module)
        if framework:
            return framework, str(context_file)

    framework = framework_from_markers(root)
    if framework:
        return framework, "markers"

    raise UnresolvedStack(
        f"cannot resolve frontend framework for {root}: no --framework flag, no "
        f"{CONTEXT_FILENAME} with stack.frontend.framework, and filesystem markers "
        f"are absent or ambiguous"
    )


# ── Database labelling (D-599) ────────────────────────────────────────────────
#
# `PostgreSQL 15+` was written as a literal in five templates while
# `project-context.json` declared something else — the same defect D-593 fixed in
# `CLAUDE.md.j2`, spread across the service-spec layer. The label lives here
# because BOTH context builders need it: `new-project.py::build_jinja_context`
# (P1/P2) and `render.py::load_context_vars` (every later render). Those two are
# copies of each other that drift — D-593 added vars to one and not the other —
# so anything they must agree on belongs in a module they both import.

DATABASE_DISPLAY_NAMES = {
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "mariadb": "MariaDB",
    "mongodb": "MongoDB",
    "sqlserver": "SQL Server",
    "oracle": "Oracle",
    "sqlite": "SQLite",
}

DEFAULT_DATABASE_ENGINE = "postgresql"
DEFAULT_DATABASE_VERSION = "15+"


def database_display_name(engine: str | None) -> str:
    """`postgresql` -> `PostgreSQL`. Unknown engines keep their own casing
    rather than being capitalized into something wrong (`MySQL` -> `Mysql`)."""
    key = (engine or DEFAULT_DATABASE_ENGINE).strip().lower()
    return DATABASE_DISPLAY_NAMES.get(key, (engine or "").strip() or "PostgreSQL")


def database_label(database: dict[str, Any] | None) -> str:
    """Human-facing `<Engine> <version>` for prose, from `stack.database`.

    One string instead of an engine/version pair repeated per template: the
    five hardcoded sites were prose, and prose wants a label.
    """
    db = database or {}
    engine = db.get("engine") or DEFAULT_DATABASE_ENGINE
    version = str(db.get("version") or DEFAULT_DATABASE_VERSION).strip()
    name = database_display_name(engine)
    return f"{name} {version}".strip()


# ── Tenancy vocabulary (D-602) ───────────────────────────────────────────────
# The project names its tenant (multiTenancy.term): "empresa" for cordele,
# "tenant" by default. Every other artifact already honours it — X-Empresa-Id on
# the wire, EmpresaContext/RULE-07 in the service, empresa_id in the data-model —
# but the NestJS templates hardcoded `tenantId`. The Prisma model is generated
# from the project's own data-model, so it said `empresaId` while the repository
# and mapper generated beside it said `tenantId`: two generators of the SAME
# scaffold disagreeing, and the output did not compile. Derive both spellings
# here, in the one module both Jinja context builders already import (D-599).

DEFAULT_TENANCY_TERM = "tenant"


def tenant_field_name(term: str | None) -> str:
    """Ubiquitous tenant term -> TypeScript/Java property (`empresa` -> `empresaId`).

    A multi-word term collapses to lowerCamelCase (`business unit` ->
    `businessUnitId`) so the result is always a legal identifier.
    """
    raw = (term or DEFAULT_TENANCY_TERM).strip() or DEFAULT_TENANCY_TERM
    parts = [p for p in raw.replace("-", " ").replace("_", " ").split() if p]
    if not parts:
        parts = [DEFAULT_TENANCY_TERM]
    head, *rest = parts
    camel = head.lower() + "".join(p[:1].upper() + p[1:].lower() for p in rest)
    return f"{camel}Id"


def tenant_column_name(term: str | None) -> str:
    """Ubiquitous tenant term -> snake_case SQL column (`empresa` -> `empresa_id`)."""
    raw = (term or DEFAULT_TENANCY_TERM).strip() or DEFAULT_TENANCY_TERM
    parts = [p.lower() for p in raw.replace("-", " ").replace("_", " ").split() if p]
    if not parts:
        parts = [DEFAULT_TENANCY_TERM]
    return "_".join([*parts, "id"])

def tenant_slug(term: str | None) -> str:
    """Ubiquitous tenant term -> snake_case identifier, without the `_id` suffix.

    D-605: needed wherever the term names something that is not the column —
    a parameter, a function (`get_current_<slug>`), a schema prefix. Deriving it
    inline as `{{ multi_tenancy_term }}` produces an invalid identifier the
    moment the term has a space or a hyphen.
    """
    column = tenant_column_name(term)
    return column[:-3] if column.endswith("_id") else column


def tenant_class(term: str | None) -> str:
    """Ubiquitous tenant term -> PascalCase, for class names (`EmpresaContext`)."""
    return "".join(part[:1].upper() + part[1:]
                   for part in tenant_slug(term).split("_") if part)
