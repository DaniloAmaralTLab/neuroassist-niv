---
name: pipeline-status
description: Current module state via ES — latest events, score, gates. No LLM.
disable-model-invocation: true
tools: Bash
---

# Pipeline Status

```bash
python scripts/pipeline-context.py module-state --module $1
```

Usage: `/pipeline-status <MODULE>`
