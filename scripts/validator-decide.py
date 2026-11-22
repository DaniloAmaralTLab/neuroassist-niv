#!/usr/bin/env python3
"""validator-decide.py - deterministic next-action engine for the exec loop (D-367, Fase 1).

The PLANNER / IMPLEMENTADOR / VALIDACAO / ENCERRAR decision is a state machine
the validator re-derives from prose every round, and the autopilot DUPLICATES in
its B2 step. Its inputs are already machine-readable JSON: `<ISSUE>.state.json`
(validator-score, D-317: checklist + score) and `<ISSUE>.plan-state.json`
(plan-state-extractor, D-319: prior plan + delta). This script reads them and
emits the decision so the agent CONFIRMS instead of recomputing (R5/D-315:
`needsAgentConfirm: true`).

Decision rule (deterministic):
    checklist 100% DONE  AND  score >= 80          -> ENCERRAR
    no current plan                                -> PLANNER
    plan exists, work remaining (undone/notStarted)-> IMPLEMENTADOR
    plan exists, all implemented but score < 80    -> VALIDACAO

B6 targeted-fix routing (D-554):
    b6-fix --failure-report <path>  -> TARGETED_FIX | FULL_CYCLE
    TARGETED_FIX when:
      - failure_type != "compilation" (compilation always requires re-plan), AND
      - source == "manual" with a non-empty root_cause (the orchestrator/user
        already diagnosed it -- that IS the targeted fix), OR
      - source == "b6" with a root_cause derived from the XMLs and 1-3 distinct
        cause families, context-load cascades excluded (ARCH-017), OR
      - failure_type in ("single_test", "multiple_tests") and len(failing_tests) <= 3
    Safe default: FULL_CYCLE.

Two ways to produce b6-failure.json:
    source="b6"     -- be-validator Mode 4, automatic, lenient validation (warns).
                       With --from-test-results it also derives root_cause
                       (`<Exception>: <message> @ <File.java:line>`, dominant
                       family) and `causes` (every family, largest first).
    source="manual" -- orchestrator or human diagnosed the failure outside the
                       formal B6 flow (e.g. ran ./gradlew by hand). Strict
                       validation: --root-cause required, failing_tests must be
                       FQCN#method, failing_files must be existing files.

Usage:
    validator-decide.py decide --issue LEAD-FE-001
    validator-decide.py decide --issue CAD-001 --layer be --report
    validator-decide.py decide --issue X --state s.json --plan-state p.json
    validator-decide.py b6-fix --failure-report tmp/pipeline-cycle/PAY/b6-failure.json
    validator-decide.py write-b6-failure --module PAY --tmp-dir tmp/pipeline-cycle \
        --failure-type single_test --failing-tests com.example.PayTest#testPay \
        --error-summary "AssertionError at line 42"
    validator-decide.py write-b6-failure --module SALE --tmp-dir tmp/pipeline-cycle \
        --source manual --failure-type single_test \
        --failing-tests com.example.SaleIT#shouldPay \
        --failing-files backend/services/sale-service/src/test/java/.../SaleIT.java \
        --root-cause "SaleIT.java:88 builds the entity with .version(0L), so isNew() \
is false and JPA merges instead of persisting"

Exit codes (R3): 0 success | 1 user error (state.json missing) | 2 invalid
b6-failure payload rejected (strict mode, --source manual). A decision is never
an error; the score/checklist drive the action, not the exit code.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

from cli_utils import force_utf8_stdio
from issue_state import find_root, resolve_issue

ENCERRAR, PLANNER, IMPLEMENTADOR, VALIDACAO = "ENCERRAR", "PLANNER", "IMPLEMENTADOR", "VALIDACAO"
SCORE_DONE_THRESHOLD = 80

# B6 targeted-fix verdicts (D-554)
TARGETED_FIX = "TARGETED_FIX"
FULL_CYCLE = "FULL_CYCLE"

# b6-failure.json provenance (report.md rec. #1): "b6" = be-validator Mode 4,
# "manual" = orchestrator/human diagnosed outside the formal B6 flow.
SOURCE_B6 = "b6"
SOURCE_MANUAL = "manual"

# A usable failing_tests entry addresses ONE test method: FQCN#method.
# Globs ("com.example.*") are useless to a --fix run restricted to that list.
_FQCN_METHOD_RE = re.compile(r"^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*#[A-Za-z_$][\w$]*")

# error_summary cap: 2000 for the B6 lane (room for the per-cause decomposition,
# ARCH-017), larger for the manual lane, where the summary is the only carrier of a
# hand-made diagnosis. The full decomposition lives in `causes`, never truncated.
_ERROR_SUMMARY_CAP = {SOURCE_B6: 2000, SOURCE_MANUAL: 4000}


def encerrar_blockers(state: dict) -> list[str]:
    """Return a list of human-readable reasons why ENCERRAR cannot be emitted.

    Checks the provisoriedade fields that the basic checklist+score gate ignores.
    Tolerant to missing fields (old state files without statusTag/agentTodo).
    Empty list means ENCERRAR is cleared.
    """
    blockers: list[str] = []

    score_block = state.get("score") or {}

    if score_block.get("provisional") is True:
        blockers.append("score.provisional=true -- score nao foi confirmado pelo agente")

    status_tag = score_block.get("statusTag") or ""
    if status_tag in ("REDUCED", "NEAR-CLOSED"):
        blockers.append(
            f"score.statusTag={status_tag!r} -- score ainda nao consolidado "
            f"(slots de agente pendentes); nao e veredito final, independente do valor"
        )

    agent_todo = state.get("agentTodo") or []
    if agent_todo:
        items_str = "; ".join(str(item) for item in agent_todo)
        blockers.append(f"agentTodo nao vazio ({len(agent_todo)} item(ns)): {items_str}")

    breakdown = (score_block.get("breakdown") or {})
    confirm_slots = [
        slot for slot, data in breakdown.items()
        if isinstance(data, dict) and data.get("needsAgentConfirm") is True
    ]
    if confirm_slots:
        blockers.append(
            f"breakdown slot(s) com needsAgentConfirm=true: {', '.join(confirm_slots)}"
        )

    checklist = state.get("checklist") or {}
    total = int(checklist.get("total", 0) or 0)
    done = int(checklist.get("done", 0) or 0)
    if total > 0 and done < total:
        blockers.append(f"checklist incompleto: {done}/{total} DONE")

    gates_raw = state.get("gates_raw") or {}
    if str(gates_raw.get("stub", "")).lower() == "fail":
        blockers.append(
            "gates_raw.stub='fail' -- stub(s) presentes; nunca ENCERRAR com stub "
            "gate falhando (regra do projeto)"
        )

    return blockers


def decide(state: dict, plan_state: dict | None) -> dict:
    """Pure decision over state.json (+ optional plan-state.json)."""
    checklist = state.get("checklist", {})
    total = int(checklist.get("total", 0) or 0)
    done = int(checklist.get("done", 0) or 0)
    score = int((state.get("score") or {}).get("total", 0) or 0)

    plan = (plan_state or {}).get("priorPlan", {}) if plan_state else {}
    plan_exists = bool(plan.get("exists", False))
    delta = (plan_state or {}).get("delta", {}) if plan_state else {}
    not_started = list(delta.get("notStarted", []) or [])

    extra: dict = {}

    if total > 0 and done == total and score >= SCORE_DONE_THRESHOLD:
        blockers = encerrar_blockers(state)
        if blockers:
            action = VALIDACAO
            reason = (
                f"checklist {done}/{total} e score {score} satisfazem o limiar, mas ENCERRAR "
                f"bloqueado por {len(blockers)} criterio(s) de provisoriedade -- "
                f"agente deve confirmar item a item e recalcular score nao-provisional"
            )
            extra["encerrarBlockers"] = blockers
        else:
            action, reason = ENCERRAR, (
                f"checklist {done}/{total} DONE e score {score} >= {SCORE_DONE_THRESHOLD}"
            )
    elif not plan_exists:
        action, reason = PLANNER, "sem plano vigente para esta issue"
    elif done < total or not_started:
        remaining = (total - done) if total else len(not_started)
        action, reason = IMPLEMENTADOR, (
            f"plano vigente com trabalho nao concluido ({remaining} item(ns) pendente(s))"
        )
    else:
        action, reason = VALIDACAO, (
            f"tudo implementado mas score {score} < {SCORE_DONE_THRESHOLD}; validar para fechar"
        )

    result = {
        "nextAction": action,
        "reason": reason,
        "needsAgentConfirm": True,
        "inputs": {
            "done": done, "total": total, "score": score,
            "planExists": plan_exists, "notStarted": len(not_started),
        },
    }
    result.update(extra)
    return result


def _sidecar(issue_file: Path, suffix: str) -> Path:
    return issue_file.with_name(f"{issue_file.stem}.{suffix}.json")


def _load_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return None


# ---------------------------------------------------------------------------
# JUnit XML derivation (ARCH-011)
#
# Until ARCH-011, every content field of b6-failure.json was free text typed by
# the validator-agent, and nothing here ever read build/test-results. In CAMP
# (2026-09-17) that produced a report naming four test methods that do not
# exist (`SecurityConfigIT#test1..#test4`) against 30 real failures across three
# classes, which routed the cycle to FULL_CYCLE replanning while the actual
# defect -- one line in TenantIdentifierResolver -- went untouched.
#
# gates.json was correct that same run: `gates-run.py` executes the toolchain and
# derives its verdicts from exit codes. This is the same move, one level down --
# derive the failure report from the XMLs Gradle just wrote instead of asking an
# agent to transcribe them.
# ---------------------------------------------------------------------------

#: Gradle writes one XML per test class under build/test-results/<task>/.
_JUNIT_XML_GLOB = "TEST-*.xml"


#: A stack frame `at [loader//][module@ver/]pkg.Class.method(File.java:42)` -- Java 9+
#: prefixes the frame with the class loader (`app//`) and module; group 1 =
#: FQCN.method, group 2 = File.java:42.
_FRAME_RE = re.compile(
    r"^\s*at\s+(?:\S*/)?([\w$.<>]+)\(([\w$]+\.(?:java|kt):\d+)\)", re.MULTILINE)
#: Lines that end the header of a trace section: a frame or the `... N more` elision.
_TRACE_BODY_RE = re.compile(r"^\s*(?:at\s|\.\.\.\s+\d+\s+more)")
#: Leading `fully.qualified.Exception: message` of a trace line or `Caused by:` link.
_EXCEPTION_RE = re.compile(r"^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)(?::\s*(.*))?$")
_CAUSE_MESSAGE_CAP = 200
#: Run-specific noise that must not split one cause into many families: identity
#: hashes (`Config@7ed86bcf`), UUIDs and plain numbers.
_KEY_NOISE_RE = re.compile(
    r"@[0-9a-f]{4,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+")
#: Spring's test context cache refusing to retry a context that already failed to
#: load. It is a CONSEQUENCE of that first failure, never a cause of its own: in INTL
#: one `Ambiguous mapping` produced 21 of these.
_CONTEXT_CASCADE_RE = re.compile(r"ApplicationContext failure threshold \(\d+\) exceeded")
#: Up to this many distinct cause families still routes TARGETED_FIX for a derived
#: (source=b6) report -- the "1-3" rule of be-implement.md, counted in causes rather
#: than tests: 37 tests failing for one reason are one fix, not 37 (ARCH-017).
MAX_TARGETED_CAUSES = 3


def _first_service_frame(text: str, package_prefix: str) -> str:
    """`File.java:line` of the first frame inside the service package, else "".

    Searched in the deepest `Caused by:` section first -- that is where the origin
    is -- then in the whole trace.
    """
    if not text or not package_prefix:
        return ""
    sections = re.split(r"^\s*Caused by:", text, flags=re.MULTILINE)
    for chunk in (sections[-1], text):
        for fqcn, location in _FRAME_RE.findall(chunk):
            if fqcn.startswith(package_prefix):
                return location
    return ""


def _deepest_cause_header(text: str) -> str:
    """Header of the deepest trace section, its lines joined by single spaces.

    The deepest `Caused by:` link is the real origin: in CAMP the surface error was
    a ParameterResolutionException, while the line that mattered -- `TenantContext
    not set -- RULE-07 violation` -- sat at the bottom of the chain. The whole
    header is kept because assertion libraries break the message across lines
    (`AssertionFailedError: ` / `expected: 201` / ` but was: 404`).
    """
    sections = re.split(r"^\s*Caused by:\s*", text, flags=re.MULTILINE)
    header: list[str] = []
    for line in sections[-1].strip().splitlines():
        if _TRACE_BODY_RE.match(line):
            break
        if line.strip():
            header.append(line.strip())
    return " ".join(header)


def _failure_cause(detail: str, text: str, package_prefix: str) -> dict:
    """Reduce one <failure>/<error> to {exception, message, location}.

    `detail` is the deepest-cause header (`_deepest_cause_header`). The exception
    is kept as its simple name; the message is capped.
    """
    m = _EXCEPTION_RE.match(detail.strip())
    if m and "." in m.group(1):
        exception = m.group(1).rsplit(".", 1)[-1]
        message = (m.group(2) or "").strip()
    else:
        exception, message = "", detail.strip()
    cascade = bool(_CONTEXT_CASCADE_RE.search(message))
    if cascade:
        message = message.split(" for [", 1)[0]
    return {
        "exception": exception,
        "message": message[:_CAUSE_MESSAGE_CAP],
        "location": _first_service_frame(text, package_prefix),
        "cascade": cascade,
    }


def _family_key(cause: dict) -> tuple:
    """Same exception at the same service frame; without a frame, the same message
    once run-specific noise is masked."""
    where = cause["location"] or _KEY_NOISE_RE.sub("#", cause["message"])
    return (cause["exception"], where)


def root_causes(causes: list[dict]) -> list[dict]:
    """Families that are causes of their own -- cascades excluded, unless nothing else
    was recorded (then the cascade is all there is to report)."""
    real = [c for c in causes if not c.get("cascade")]
    return real or causes


def format_cause(cause: dict) -> str:
    """One-line `<Exception>: <message> @ <File.java:line>` (parts omitted when absent)."""
    head = ": ".join(p for p in (cause.get("exception"), cause.get("message")) if p)
    return f"{head} @ {cause['location']}" if cause.get("location") else head


def parse_junit_results(dirs: list[Path], package_prefix: str = "") -> dict:
    """Parse JUnit XML reports into the facts a b6-failure payload needs.

    Returns {failing_tests, all_tests, failure_count, error_summary, causes,
    root_cause, files_read}. `causes` groups the failures by family -- same
    exception at the same service frame (or with the same message when no frame in
    `package_prefix` exists) -- largest first; `root_cause` is the dominant family
    as one line (ARCH-017).
    Unreadable or malformed XML is skipped rather than fatal: a partial reading is
    still a better basis than prose, and `files_read` lets the caller tell an empty
    result ("nothing failed") from an absent one ("nothing was read").
    """
    failing: list[str] = []
    all_tests: list[str] = []
    families: dict[tuple, dict] = {}
    files_read = 0

    for directory in dirs:
        if not directory.is_dir():
            continue
        for xml_path in sorted(directory.rglob(_JUNIT_XML_GLOB)):
            try:
                root = ET.parse(xml_path).getroot()
            except (ET.ParseError, OSError):
                continue
            files_read += 1
            for case in root.iter("testcase"):
                classname = (case.get("classname") or "").strip()
                name = (case.get("name") or "").strip()
                if not classname or not name:
                    continue
                # Cucumber scenario names carry spaces/parens; keep them whole so
                # the entry still points at exactly one testcase.
                ident = f"{classname}#{name}"
                all_tests.append(ident)
                problems = list(case.iter("failure")) + list(case.iter("error"))
                if not problems:
                    continue
                failing.append(ident)
                # One family per test: a test with both <failure> and <error> is
                # still one failing test, attributed to its first problem.
                problem = problems[0]
                text = problem.text or ""
                detail = (_deepest_cause_header(text)
                          or " ".join((problem.get("message") or "").split()))
                if not detail:
                    continue
                cause = _failure_cause(detail, text, package_prefix)
                key = _family_key(cause)
                family = families.setdefault(key, {**cause, "count": 0, "tests": []})
                family["count"] += 1
                family["tests"].append(ident)

    # Largest real cause first, cascades last: --fix needs the decomposition, not
    # the statistical mode -- and never a cascade reported as the root cause.
    causes = sorted(families.values(), key=lambda f: (f["cascade"], -f["count"]))
    summary, root_cause = "", ""
    if causes:
        real = root_causes(causes)
        root_cause = format_cause(real[0])
        parts = "; ".join(
            f"[{c['count']}x{', context cascade' if c['cascade'] else ''}] {format_cause(c)}"
            for c in causes)
        noun = "cause" if len(real) == 1 else "causes"
        summary = f"{len(failing)} failing test(s), {len(real)} {noun}: {parts}"

    return {
        "failing_tests": failing,
        "all_tests": all_tests,
        "failure_count": len(failing),
        "error_summary": summary,
        "causes": causes,
        "root_cause": root_cause,
        "files_read": files_read,
    }


def derive_failure_type(failure_count: int, files_read: int) -> str:
    """Classify a B6 failure from counts alone.

    `compilation` when a B6 failed but no test failure was recorded: javac failing
    means Gradle never ran the tests, so there is nothing to target -- and
    compilation routes to FULL_CYCLE, the safe default, either way.
    """
    if files_read == 0 or failure_count == 0:
        return "compilation"
    if failure_count == 1:
        return "single_test"
    return "multiple_tests"


def resolve_test_results_dirs(module: str, root: Path) -> list[Path]:
    """Locate build/test-results/* for a module's backend service.

    Maps module prefix -> backendService via project-context.json modules.registry,
    the same registry pipeline-guard.py resolves against.
    """
    context_path = root / "project-context.json"
    registry = []
    if context_path.exists():
        context = _load_json(context_path) or {}
        registry = (context.get("modules") or {}).get("registry") or []

    service = ""
    for entry in registry:
        if not isinstance(entry, dict):
            continue
        if str(entry.get("prefix", "")).upper() == module.upper():
            service = entry.get("backendService") or ""
            break
    if not service:
        service = f"{module.lower()}-service"

    base = root / "backend" / "services" / service / "build" / "test-results"
    if not base.is_dir():
        return []
    return [d for d in sorted(base.iterdir()) if d.is_dir()]


def service_package_prefix(module: str, root: Path) -> str:
    """`<packageBase>.<module>.` -- the package whose frames locate a cause.

    packageBase comes from project-context.json (stack.backend.packageBase); the
    module segment is the lowercased prefix. Without a declared packageBase there is
    no service package to anchor on: "" disables the frame lookup and causes are
    grouped by message alone.
    """
    context = _load_json(root / "project-context.json") or {}
    base = ((context.get("stack") or {}).get("backend") or {}).get("packageBase")
    return f"{base}.{module.lower()}." if base else ""


# ---------------------------------------------------------------------------
# B6 targeted-fix lane (D-554)
# ---------------------------------------------------------------------------

def decide_b6_fix(failure_data: dict) -> str:
    """Evaluate b6-failure.json and return TARGETED_FIX or FULL_CYCLE.

    compilation always requires a re-plan. Otherwise TARGETED_FIX when either:
      - source == "manual" and root_cause is non-empty -- the orchestrator/user
        already did the diagnosis, which is exactly what --fix consumes; or
      - source == "b6" with a root_cause derived from the XMLs and at most
        MAX_TARGETED_CAUSES distinct cause families (ARCH-017): the number of
        causes measures the work, the number of tests only the symptom; or
      - failure_type is single_test/multiple_tests with <= 3 failing tests,
        matching the "1-3 testes falhando" rule documented in be-implement.md.
    Safe default: FULL_CYCLE. Files written before `source`/`causes` existed
    simply lack them and fall through to the failure_type rule.
    """
    failure_type = failure_data.get("failure_type", "unknown")
    failing_tests = failure_data.get("failing_tests", []) or []
    source = failure_data.get("source", SOURCE_B6)
    root_cause = (failure_data.get("root_cause") or "").strip()
    causes = root_causes(failure_data.get("causes") or [])

    if failure_type == "compilation":
        return FULL_CYCLE
    if source == SOURCE_MANUAL and root_cause:
        return TARGETED_FIX
    if source == SOURCE_B6 and root_cause and 0 < len(causes) <= MAX_TARGETED_CAUSES:
        return TARGETED_FIX
    if failure_type in ("single_test", "multiple_tests") and len(failing_tests) <= 3:
        return TARGETED_FIX
    return FULL_CYCLE


def validate_b6_failure(
    payload: dict, junit: dict | None = None, skip_test_format: bool = False
) -> list[str]:
    """Return a list of human-readable problems with a b6-failure payload.

    These are the properties a `--fix` run actually depends on: it may only
    touch failing_tests/failing_files, so a glob or a directory in those lists
    makes the restriction meaningless (observed in tmp/pipeline-cycle/INTG).

    When `junit` carries a reading of build/test-results (files_read > 0), every
    failing_tests entry is additionally checked to exist and to have actually
    failed there, and the count is reconciled against the XMLs (ARCH-011). These
    checks are skipped when no XML was read -- absent reports must not turn into
    phantom problems.
    """
    problems: list[str] = []
    failing_tests = payload.get("failing_tests") or []
    failing_files = payload.get("failing_files") or []
    source = payload.get("source", SOURCE_B6)

    if not failing_tests and not failing_files:
        problems.append("failing_tests and failing_files are both empty -- "
                        "--fix would have no scope to work within")

    # Derived entries come straight from <testcase classname=/name=> and may carry
    # a Cucumber scenario name (spaces, quotes, parens) that the FQCN#method shape
    # rightly rejects for hand-typed input.
    if not skip_test_format:
        for test in failing_tests:
            if not _FQCN_METHOD_RE.match(str(test)):
                problems.append(f"failing_tests entry {test!r} is not FQCN#method "
                                "(a glob or bare class cannot scope a targeted fix)")

    for file in failing_files:
        path = Path(file)
        if not path.exists():
            problems.append(f"failing_files entry {file!r} does not exist")
        elif path.is_dir():
            problems.append(f"failing_files entry {file!r} is a directory, not a file")

    if source == SOURCE_MANUAL:
        if not (payload.get("root_cause") or "").strip():
            problems.append("--root-cause is required with --source manual: the "
                            "manual lane exists to carry a diagnosis the "
                            "implementer must not redo")
        if payload.get("failure_type") == "unknown":
            problems.append("--failure-type unknown is not allowed with --source "
                            "manual: classify the failure you diagnosed")

    # --- ARCH-011: reconcile the claim against the XMLs Gradle actually wrote ---
    if junit and junit.get("files_read"):
        known = set(junit.get("all_tests") or [])
        actually_failed = set(junit.get("failing_tests") or [])
        for test in failing_tests:
            entry = str(test)
            if entry not in known:
                problems.append(
                    f"failing_tests entry {entry!r} does not exist in "
                    f"build/test-results ({junit['files_read']} XML file(s) read) -- "
                    "a fabricated test name sends --fix at nothing"
                )
            elif entry not in actually_failed:
                problems.append(
                    f"failing_tests entry {entry!r} exists but did NOT fail in "
                    "build/test-results -- it cannot be the target of this fix"
                )

        reported, actual = len(failing_tests), junit["failure_count"]
        if reported != actual:
            problems.append(
                f"failing_tests count mismatch: report claims {reported}, "
                f"build/test-results shows {actual} failing test(s) -- "
                "derive the list with --from-test-results instead of typing it"
            )

    return problems


def build_b6_failure(
    module: str,
    tmp_dir: str,
    failure_type: str,
    failing_tests: list[str],
    failing_files: list[str],
    error_summary: str,
    source: str = SOURCE_B6,
    root_cause: str = "",
    causes: list[dict] | None = None,
) -> dict:
    """Build the b6-failure payload (no I/O beyond reading handoff.json).

    cycle_id is read from {tmp_dir}/{module}/handoff.json if available,
    defaulting to "unknown".
    """
    handoff_path = Path(tmp_dir) / module / "handoff.json"
    cycle_id = "unknown"
    if handoff_path.exists():
        handoff = _load_json(handoff_path) or {}
        cycle_id = handoff.get("cycle_id", "unknown")

    cap = _ERROR_SUMMARY_CAP.get(source, 500)
    return {
        "cycle_id": cycle_id,
        "module": module,
        "source": source,
        "failure_type": failure_type,
        "failing_tests": failing_tests,
        "failing_files": failing_files,
        "root_cause": root_cause,
        "causes": causes or [],
        "error_summary": error_summary[:cap],
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def write_b6_failure(
    module: str,
    tmp_dir: str,
    failure_type: str,
    failing_tests: list[str],
    failing_files: list[str],
    error_summary: str,
    source: str = SOURCE_B6,
    root_cause: str = "",
    causes: list[dict] | None = None,
) -> Path:
    """Write b6-failure.json atomically to {tmp_dir}/{module}/b6-failure.json."""
    payload = build_b6_failure(
        module=module,
        tmp_dir=tmp_dir,
        failure_type=failure_type,
        failing_tests=failing_tests,
        failing_files=failing_files,
        error_summary=error_summary,
        source=source,
        root_cause=root_cause,
        causes=causes,
    )

    out_dir = Path(tmp_dir) / module
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "b6-failure.json"
    tmp_path = out_path.with_suffix(".tmp")
    tmp_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    tmp_path.replace(out_path)
    return out_path


def cmd_b6_fix(args: argparse.Namespace) -> int:
    """Subcommand: evaluate b6-failure.json and print TARGETED_FIX or FULL_CYCLE."""
    if not args.failure_report:
        print(FULL_CYCLE)
        print(f"OK: {FULL_CYCLE} -- no --failure-report given, safe default", file=sys.stderr)
        return 0

    failure_path = Path(args.failure_report)
    if not failure_path.exists():
        print(FULL_CYCLE)
        print(
            f"OK: {FULL_CYCLE} -- failure-report not found at {failure_path}, safe default",
            file=sys.stderr,
        )
        return 0

    failure_data = _load_json(failure_path)
    if failure_data is None:
        print(FULL_CYCLE)
        print(
            f"OK: {FULL_CYCLE} -- failure-report unreadable at {failure_path}, safe default",
            file=sys.stderr,
        )
        return 0

    verdict = decide_b6_fix(failure_data)
    print(verdict)
    print(
        f"OK: {verdict} -- failure_type={failure_data.get('failure_type')!r} "
        f"failing_tests={len(failure_data.get('failing_tests', []))}",
        file=sys.stderr,
    )
    return 0


def cmd_write_b6_failure(args: argparse.Namespace) -> int:
    """Subcommand: write b6-failure.json atomically.

    Two lanes, both anchored to build/test-results when it can be read (ARCH-011):
      --from-test-results  derives failing_tests/failure_type/error_summary from
                           the XMLs and IGNORES the typed values outright;
      otherwise            the typed values are checked against those XMLs and a
                           fabricated or miscounted list is rejected (exit 2).
    --source manual stays strict about carrying a real diagnosis (root_cause).
    """
    root = find_root(getattr(args, "root", None))

    dirs = [Path(d) for d in (args.from_test_results or [])]
    derived_lane = bool(dirs)
    if not dirs:
        # No explicit dir: still try to locate the service's reports, so the
        # typed payload can be reconciled rather than trusted.
        dirs = resolve_test_results_dirs(args.module, root)

    junit = parse_junit_results(dirs, service_package_prefix(args.module, root))

    failure_type = args.failure_type
    failing_tests = list(args.failing_tests or [])
    error_summary = args.error_summary or ""
    root_cause = args.root_cause or ""
    causes: list[dict] = []

    if derived_lane:
        if not junit["files_read"]:
            print(f"error: --from-test-results found no readable JUnit XML in: "
                  f"{', '.join(str(d) for d in dirs)}", file=sys.stderr)
            return 2
        failing_tests = junit["failing_tests"]
        failure_type = derive_failure_type(junit["failure_count"], junit["files_read"])
        error_summary = junit["error_summary"]
        causes = junit["causes"]
        # A typed --root-cause is a human diagnosis and wins over the derived one.
        root_cause = root_cause or junit["root_cause"]
        if args.failure_type and args.failure_type != failure_type:
            print(f"note: --failure-type {args.failure_type!r} overridden by "
                  f"{failure_type!r} derived from {junit['files_read']} XML file(s)",
                  file=sys.stderr)
    elif not failure_type:
        print("error: --failure-type is required without --from-test-results",
              file=sys.stderr)
        return 2

    payload = build_b6_failure(
        module=args.module,
        tmp_dir=args.tmp_dir,
        failure_type=failure_type,
        failing_tests=failing_tests,
        failing_files=args.failing_files or [],
        error_summary=error_summary,
        source=args.source,
        root_cause=root_cause,
        causes=causes,
    )

    # Derived payloads are reconciled by construction, so the XML cross-check and
    # the FQCN shape rule do not apply to them -- but failing_files still comes
    # from the caller and is still checked.
    problems = validate_b6_failure(
        payload,
        junit=None if derived_lane else junit,
        skip_test_format=derived_lane,
    )
    strict = args.source == SOURCE_MANUAL or bool(junit["files_read"])
    if problems and strict:
        reason = ("--source manual is strict" if args.source == SOURCE_MANUAL
                  else f"checked against {junit['files_read']} JUnit XML file(s)")
        print(f"error: refusing to write b6-failure.json for {args.module} "
              f"({reason}):", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        print("hint: pass --from-test-results <build/test-results dir> to derive "
              "the failure list instead of typing it", file=sys.stderr)
        return 2
    for problem in problems:
        print(f"WARN: {problem}", file=sys.stderr)

    out_path = write_b6_failure(
        module=args.module,
        tmp_dir=args.tmp_dir,
        failure_type=failure_type,
        failing_tests=failing_tests,
        failing_files=args.failing_files or [],
        error_summary=error_summary,
        source=args.source,
        root_cause=root_cause,
        causes=causes,
    )
    verdict = decide_b6_fix(payload)
    origin = (f"derived from {junit['files_read']} XML file(s)" if derived_lane
              else f"typed, reconciled against {junit['files_read']} XML file(s)"
              if junit["files_read"] else "typed, no XML available to reconcile")
    print(f"OK: b6-failure.json written to {out_path} "
          f"(source={args.source}, {origin}, "
          f"failure_type={failure_type}, failing_tests={len(failing_tests)}, "
          f"causes={len(root_causes(causes))}, routes to {verdict})")
    return 0


def cmd_decide(args: argparse.Namespace) -> int:
    root = find_root(args.root)
    layer, issue_file = resolve_issue(args.issue, args.layer, args.issue_file, root)

    # Resolve sidecars: explicit flags win, else next to the issue file.
    if args.state:
        state_path = Path(args.state)
    elif issue_file is not None:
        state_path = _sidecar(issue_file, "state")
    else:
        print(f"error: issue {args.issue!r} not found and --state not given", file=sys.stderr)
        return 1

    state = _load_json(state_path)
    if state is None:
        print(f"error: state.json not found/readable: {state_path} "
              f"(run validator-score.py score first)", file=sys.stderr)
        return 1

    if args.plan_state:
        plan_path = Path(args.plan_state)
    elif issue_file is not None:
        plan_path = _sidecar(issue_file, "plan-state")
    else:
        plan_path = None
    plan_state = _load_json(plan_path) if plan_path else None

    result = decide(state, plan_state)
    result = {"issue": args.issue, "layer": layer, **result}

    out = json.dumps(result, indent=2, ensure_ascii=False)
    if args.output:
        Path(args.output).write_text(out + "\n", encoding="utf-8")
    if args.report or not args.output:
        print(out)
    print(f"OK: {result['nextAction']} -- {result['reason']}", file=sys.stderr)
    return 0


def cmd_accept_verdict(args: argparse.Namespace) -> int:
    """Subcommand: deterministically accept or refuse a validator-agent verdict.

    Non-ENCERRAR verdicts are always accepted (exit 0).
    ENCERRAR is accepted only when encerrar_blockers() returns an empty list;
    otherwise it is refused with exit 2 so the orchestrator cannot silently proceed.
    """
    verdict = args.verdict.upper()

    if verdict != ENCERRAR:
        print(f"OK: {verdict} aceito (nao e ENCERRAR -- sem restricoes)")
        return 0

    # Resolve state the same way cmd_decide does.
    root = find_root(args.root)
    layer, issue_file = resolve_issue(args.issue, args.layer, args.issue_file, root)

    if args.state:
        state_path = Path(args.state)
    elif issue_file is not None:
        state_path = _sidecar(issue_file, "state")
    else:
        print(f"error: issue {args.issue!r} not found and --state not given", file=sys.stderr)
        return 1

    state = _load_json(state_path)
    if state is None:
        print(f"error: state.json not found/readable: {state_path} "
              f"(run validator-score.py score first)", file=sys.stderr)
        return 1

    blockers = encerrar_blockers(state)
    if not blockers:
        print("OK: ENCERRAR aceito")
        return 0

    # Refused -- exit 2 so the orchestrator cannot accidentally ignore it.
    print(f"RECUSADO: ENCERRAR bloqueado por {len(blockers)} criterio(s):", file=sys.stderr)
    for blocker in blockers:
        print(f"  - {blocker}", file=sys.stderr)
    agent_todo = state.get("agentTodo") or []
    if agent_todo:
        print("agentTodo em aberto:", file=sys.stderr)
        for item in agent_todo:
            print(f"  * {item}", file=sys.stderr)
    print("Devolver ao validator-agent para confirmar item a item e recalcular "
          "score nao-provisional antes de emitir ENCERRAR.", file=sys.stderr)
    return 2


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="validator-decide.py", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    # --- existing: decide ---
    pd = sub.add_parser("decide", help="emit next action from state.json (+ plan-state.json)")
    pd.add_argument("--issue", required=True, metavar="ISSUE_ID")
    pd.add_argument("--layer", choices=["fe", "be"], help="default: autodetect")
    pd.add_argument("--issue-file", metavar="PATH", help="override issue file resolution")
    pd.add_argument("--state", metavar="PATH", help="override <ISSUE>.state.json path")
    pd.add_argument("--plan-state", metavar="PATH", help="override <ISSUE>.plan-state.json path")
    pd.add_argument("--root", metavar="PATH", help="project root (default: walk up from cwd)")
    pd.add_argument("--output", metavar="PATH", help="write decision JSON (default: stdout)")
    pd.add_argument("--report", action="store_true", help="also print decision JSON to stdout")
    pd.set_defaults(func=cmd_decide)

    # --- ARCH-003: accept-verdict ---
    pav = sub.add_parser(
        "accept-verdict",
        help="accept or refuse a validator-agent verdict; refuses ENCERRAR when "
             "score is provisional or agentTodo is non-empty (ARCH-003)",
    )
    pav.add_argument("--issue", required=True, metavar="ISSUE_ID")
    pav.add_argument("--layer", choices=["fe", "be"], help="default: autodetect")
    pav.add_argument("--issue-file", metavar="PATH", help="override issue file resolution")
    pav.add_argument("--state", metavar="PATH", help="override <ISSUE>.state.json path")
    pav.add_argument("--root", metavar="PATH", help="project root (default: walk up from cwd)")
    pav.add_argument("--report", action="store_true",
                     help="print blocker list as JSON to stdout (in addition to stderr)")
    pav.add_argument(
        "--verdict",
        required=True,
        metavar="VERDICT",
        help="verdict proposed by the validator-agent (e.g. ENCERRAR, PLANNER)",
    )
    pav.set_defaults(func=cmd_accept_verdict)

    # --- D-554: b6-fix ---
    pb6 = sub.add_parser(
        "b6-fix",
        help="evaluate b6-failure.json and print TARGETED_FIX or FULL_CYCLE (D-554)",
    )
    pb6.add_argument(
        "--failure-report",
        metavar="PATH",
        help="path to b6-failure.json written by the B6 step",
    )
    pb6.set_defaults(func=cmd_b6_fix)

    # --- D-554: write-b6-failure ---
    pwb6 = sub.add_parser(
        "write-b6-failure",
        help="write b6-failure.json atomically (called by the B6 step on failure, D-554)",
    )
    pwb6.add_argument("--module", required=True, metavar="MODULE",
                      help="module id (e.g. PAY)")
    pwb6.add_argument(
        "--source",
        choices=[SOURCE_B6, SOURCE_MANUAL],
        default=SOURCE_B6,
        help="who diagnosed the failure: 'b6' (be-validator Mode 4) or 'manual' "
             "(orchestrator/human outside the formal B6 flow; --root-cause "
             "required). Both lanes are reconciled against build/test-results "
             "whenever it can be read (ARCH-011)",
    )
    pwb6.add_argument("--tmp-dir", required=True, metavar="PATH",
                      help="base tmp directory; file is written to <tmp-dir>/<module>/b6-failure.json")
    pwb6.add_argument(
        "--from-test-results",
        action="append",
        default=[],
        metavar="DIR",
        help="derive failing_tests/failure_type/error_summary/root_cause/causes from the JUnit XML "
             "under DIR (e.g. backend/services/<svc>/build/test-results/integrationTest); "
             "repeat for several dirs. Typed values are ignored when this is given. "
             "PREFERRED over typing the list by hand (ARCH-011)",
    )
    pwb6.add_argument("--root", default=None, metavar="PATH",
                      help="project root (default: walk up from cwd); used to "
                           "locate build/test-results for reconciliation")
    pwb6.add_argument(
        "--failure-type",
        choices=["single_test", "multiple_tests", "compilation", "unknown"],
        help="classification of the B6 failure; required only WITHOUT "
             "--from-test-results, which derives it from the XML counts",
    )
    pwb6.add_argument(
        "--failing-tests",
        action="append",
        default=[],
        metavar="TEST",
        help="failing test (FQCN#method); repeat for each test",
    )
    pwb6.add_argument(
        "--failing-files",
        action="append",
        default=[],
        metavar="FILE",
        help="path to a file the fix may touch (test or source); must exist and "
             "be a file, not a directory; repeat for each file",
    )
    pwb6.add_argument("--error-summary", default="", metavar="TEXT",
                      help="first lines of the test error output (truncated to "
                           "500 chars for --source b6, 4000 for --source manual)")
    pwb6.add_argument(
        "--root-cause",
        default="",
        metavar="TEXT",
        help="required with --source manual: the confirmed root cause, naming "
             "file + line, so the implementer applies it instead of re-diagnosing. "
             "With --from-test-results it overrides the derived one",
    )
    pwb6.set_defaults(func=cmd_write_b6_failure)

    return p


def main(argv: list[str] | None = None) -> int:
    force_utf8_stdio()
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
