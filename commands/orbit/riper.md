---
description: Orbit /orbit:riper - structured RIPER analysis with executable recovery-loop decisions
allowed-tools: all
---

Load `CLAUDE.md` and `INSTRUCTIONS.md` for control-plane context.
Load `skills/riper.md` and `skills/reflection.md`.
When execution fails, run the repo-local recovery path so Orbit records the error, updates `.orbit/state/last_error.json`, and emits a deterministic retry-or-halt decision.
Use `node bin/riper.js` for repo-local runtime rendering and `node bin/recovery-loop.js` for direct recovery-loop handling when needed.
