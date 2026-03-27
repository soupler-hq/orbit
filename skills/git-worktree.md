# Skill: Git Worktree — Parallel Development
> Run multiple tasks simultaneously without branch conflicts

## When to Activate
- Wave execution with 2+ parallel tasks on the same repo
- Running a long test/build while working on another task
- Reviewing a PR while continuing feature development
- `/orbit:build` with parallel subagents that write to the same repo

## What is a Git Worktree?

A git worktree is a separate working directory linked to the same git repository. Each worktree has its own branch, its own working tree, but shares the object database and history.

```
repo/
├── .git/          ← shared object store, history
├── src/           ← main worktree (current branch: main)
└── .worktrees/
    ├── feature-auth/   ← worktree 1 (branch: feature/auth)
    └── feature-ui/     ← worktree 2 (branch: feature/ui)
```

Both worktrees compile, test, and run independently. No stashing. No checkout conflicts.

---

## Setup: Worktree-Per-Task Pattern

### Create a worktree for a parallel task:
```bash
# Create worktree with a new branch
git worktree add .worktrees/task-auth -b feature/auth

# Or from an existing branch
git worktree add .worktrees/task-ui feature/ui

# List active worktrees
git worktree list
```

### Work in the worktree:
```bash
cd .worktrees/task-auth
# Normal git workflow — commit, push, etc.
# Each worktree is independent
```

### Clean up after merge:
```bash
# From the main worktree
git worktree remove .worktrees/task-auth
git branch -d feature/auth
```

---

## Orbit Wave Execution with Worktrees

For `/orbit:build` with parallel tasks, use one worktree per wave task:

```bash
# Wave 1: Set up parallel worktrees
git worktree add .worktrees/wave1-task-a -b orbit/w1-task-a
git worktree add .worktrees/wave1-task-b -b orbit/w1-task-b
git worktree add .worktrees/wave1-task-c -b orbit/w1-task-c

# Subagent A works in .worktrees/wave1-task-a
# Subagent B works in .worktrees/wave1-task-b
# Subagent C works in .worktrees/wave1-task-c

# Wave 2: After Wave 1 completes, merge all branches
git merge orbit/w1-task-a orbit/w1-task-b orbit/w1-task-c

# Clean up
git worktree remove .worktrees/wave1-task-a
git worktree remove .worktrees/wave1-task-b
git worktree remove .worktrees/wave1-task-c
```

---

## Common Worktree Patterns

### Pattern 1: Hotfix while feature in progress
```bash
# Currently on feature/big-refactor
# Production bug reported

git worktree add .worktrees/hotfix -b hotfix/critical-bug main
cd .worktrees/hotfix
# Fix bug, test, commit
git push origin hotfix/critical-bug
# Create PR from this branch
cd ..
# Continue feature work in main directory uninterrupted
```

### Pattern 2: PR review without interrupting work
```bash
git worktree add .worktrees/review-pr-123 origin/feature/pr-123
cd .worktrees/review-pr-123
# Review code, run tests
# Add review comments
git worktree remove .worktrees/review-pr-123
```

### Pattern 3: Run tests while coding
```bash
git worktree add .worktrees/test-run feature/current
cd .worktrees/test-run && npm test --watch &
# Main directory continues development
# Tests run in parallel on the current branch
```

---

## Worktree Directory Convention

Use `.worktrees/` directory (add to `.gitignore`):
```
# .gitignore
.worktrees/
```

Naming: `.worktrees/{purpose}-{branch-suffix}`
```
.worktrees/wave1-auth
.worktrees/wave2-payment
.worktrees/hotfix-login
.worktrees/review-pr-123
.worktrees/test-e2e
```

---

## Rules
- Each worktree should have ONE purpose — don't reuse for different tasks
- Always clean up worktrees after merge: `git worktree prune`
- Never have more than 6-8 active worktrees (performance degrades)
- Worktrees share the index — don't have the same branch checked out in two worktrees
- Add `.worktrees/` to `.gitignore` to prevent accidentally committing worktree configs
- For Orbit parallel waves, pre-create all wave worktrees before dispatching subagents

---

## Troubleshooting
```bash
# Worktree corrupted or branch locked
git worktree prune     # Clean up stale worktree refs
git worktree repair    # Fix broken worktree references

# "fatal: '{branch}' is already checked out"
git worktree list      # Find which worktree has it
git worktree remove .worktrees/conflicting  # Remove it

# List all worktrees with their branches
git worktree list --porcelain
```
