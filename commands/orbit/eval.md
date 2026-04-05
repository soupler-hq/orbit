---
description: Orbit /orbit:eval - evaluate routing, workflow compliance, and portability
allowed-tools: all
---

Load `CLAUDE.md` and `INSTRUCTIONS.md` for control-plane context.
Load `docs/quality/evaluation-framework.md` and `docs/quality/eval-dataset.md` for the evaluation rubric and sample cases.
Run `bash bin/eval.sh` or the equivalent runtime adapter eval flow.
Report pass/fail results, drift findings, and any follow-up work required.
Confirm the generated artifacts:
- `.orbit/reports/eval/EVAL-REPORT.md` by default
- `.orbit/reports/eval/eval-report.json` by default
- or the equivalent files under `--output-dir <path>` when an override is supplied
