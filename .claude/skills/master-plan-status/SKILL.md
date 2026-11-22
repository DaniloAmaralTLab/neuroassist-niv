---
name: master-plan-status
description: BE+FE master plan progress table. No LLM.
disable-model-invocation: true
tools: Bash
---

# Master Plan Status

```bash
cat docs/architecture/backend/plans/architecture-master-plan.md 2>/dev/null || echo "(no BE master plan)"
echo
cat docs/architecture/frontend/plans/architecture-master-plan.md 2>/dev/null || echo "(no FE master plan)"
```

Usage: `/master-plan-status`
