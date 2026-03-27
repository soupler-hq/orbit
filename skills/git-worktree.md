# Skill: Git Worktree — Parallel Development
> Run multiple tasks simultaneously without branch conflicts

## ACTIVATION
- Wave execution with 2+ parallel tasks on the same repo.
- Running a long test/build while working on another task.
- Reviewing a PR while continuing feature development.
- `/orbit:build` with parallel subagents that write to the same repo.

## CORE PRINCIPLES
1. **Task Isolation**: Each parallel task happens in its own directory with its own branch.
2. **Zero-Stash Workflow**: Never stash changes; just switch directories to change context.
3. **Shared Source of Truth**: All worktrees share the same `.git` history and object store.
4. **Cleanliness**: Prune stale worktrees immediately after merge to keep the workspace manageable.

## PATTERNS

### Worktree-Per-Task
1. **Create**: `git worktree add .worktrees/{task} -b {branch}`
2. **Execute**: `cd .worktrees/{task} && <do work>`
3. **Integrate**: Commit, push, and merge from the main worktree.
4. **Cleanup**: `git worktree remove .worktrees/{task}`

### Orbit Wave Execution
Pre-allocate worktrees for every task in a parallel wave. This allows the Orchestrator to dispatch multiple subagents that write to the same repository without checkout conflicts.

## CHECKLISTS

### Worktree Health
- [ ] No more than 8 active worktrees (performance check)
- [ ] All worktrees have unique branch assignments
- [ ] `.worktrees/` is present in `.gitignore`
- [ ] `git worktree prune` run after every significant merge wave
- [ ] Corrupted refs checked via `git worktree repair`

## ANTI-PATTERNS
- **Branch Double-Booking**: Attempting to check out the same branch in two different worktrees.
- **Lingering Worktrees**: Leaving directories for completed tasks, causing index bloat.
- **Committing Config**: Accidents committing worktree metadata (prevented by .gitignore).
- **Nested Repos**: Mistaking worktrees for submodules or clones.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
