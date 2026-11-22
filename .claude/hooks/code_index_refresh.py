#!/usr/bin/env python3
"""code_index_refresh.py - PostToolUse hook: keeps the code-index fresh, incrementally.

Registered in `.claude/settings.json` with matcher `Edit|Write`. When the edited
file is a `.java` under `backend/services/`, it re-parses ONLY that file (~1.3 ms)
and updates its entry in the service index. A full rebuild costs ~2.6 s and only
makes sense when the index does not exist yet -- with 94% of the repo .java files touched in 45 days
and commits of 200-400 files, a rebuild per edit would be pure waste.

Best-effort and ALWAYS exit 0: a hook that fails must never block an edit.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_SCRIPTS))


def _edited_paths(payload: dict) -> list[str]:
    """Paths the tool touched. Edit/Write use `file_path`."""
    ti = payload.get("tool_input") or {}
    out = []
    for key in ("file_path", "path", "notebook_path"):
        v = ti.get(key)
        if isinstance(v, str) and v:
            out.append(v)
    for e in (ti.get("edits") or []):
        v = (e or {}).get("file_path")
        if isinstance(v, str) and v:
            out.append(v)
    return out


def main() -> None:
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except Exception:
        sys.exit(0)

    if payload.get("tool_name") not in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
        sys.exit(0)

    java = [p for p in _edited_paths(payload)
            if p.endswith(".java") and "backend" in p.replace("\\", "/")]
    if not java:
        sys.exit(0)

    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "code_index", _SCRIPTS / "code-index.py")
        ci = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ci)  # type: ignore[union-attr]

        from be_spec_drift_lib.java_ast import (  # noqa: E402
            JavaFacts, _extract_type_facts, _extract_type_facts_via_regex)
        import javalang  # noqa: E402
        from dataclasses import asdict  # noqa: E402
    except Exception:
        sys.exit(0)

    touched_services = set()
    for raw_path in java:
        path = Path(raw_path)
        if not path.is_file():
            continue
        # backend/services/<svc>/src/main/java/...
        parts = path.resolve().parts
        try:
            svc = parts[parts.index("services") + 1]
        except (ValueError, IndexError):
            continue
        service_root = ci.SERVICES_DIR / svc
        if not service_root.is_dir():
            continue

        idx = ci.load_index(service_root)
        if idx is None:
            # No index yet: do a full build once and carry on.
            ci._write(service_root, ci.build_service(service_root))
            touched_services.add(svc)
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue
        facts = JavaFacts()
        try:
            _extract_type_facts(javalang.parse.parse(text), str(path), facts)
        except Exception:
            _extract_type_facts_via_regex(text, str(path), facts)

        key = str(path).replace("\\", "/")
        idx["types"] = [t for t in idx["types"] if t["file"] != key]
        for t in facts.types:
            d = asdict(t)
            d["file"] = key
            idx["types"].append(d)
        # The stamp reflects the current state of the service: if something else changed outside
        # this file, it keeps diverging and the query declares itself stale.
        idx["stamp"] = ci._stamp(service_root)
        idx["partial_types"] = sum(1 for t in idx["types"] if t.get("partial"))
        ci._write(service_root, idx)
        touched_services.add(svc)

    if touched_services:
        print(f"code-index atualizado: {', '.join(sorted(touched_services))}",
              file=sys.stderr)
    sys.exit(0)


if __name__ == "__main__":
    main()
