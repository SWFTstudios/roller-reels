# Roller Reels — Claude Code Rules

## Branch Policy

- **NEVER push directly to `main`.**
- **NEVER make edits on the `main` branch.**
- **NEVER merge any branch into `main` without explicit approval from the user.**
- `main` is production-only. All work happens on feature branches.
- Always develop on the designated feature branch for the current task.
- When work is complete, push to the feature branch and create a **draft PR** — do not merge it.

## Git Workflow

1. Create or checkout a feature branch before making any changes.
2. Commit and push to that feature branch.
3. Open a draft PR for user review.
4. Wait for explicit user approval before merging into `main`.
