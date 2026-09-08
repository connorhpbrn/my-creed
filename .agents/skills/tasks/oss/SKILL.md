---
name: oss
description: Keep Creed's public repository clean, coherent, portable, and free of private or temporary residue. Apply automatically after substantive code, configuration, dependency, documentation, or repository-structure changes, and when the user invokes /oss or asks for an open-source hygiene audit.
---

# Open-source hygiene

Leave a repository that a new contributor can clone, inspect, run, and trust without private context.

## Protect the public tree

- Inspect the intended diff and `git status`, including untracked files, before finishing.
- Keep one-off plans, audits, generated reports, screenshots, copied repositories, and scratch output in the ignored root `disposable/` directory.
- Ignore local tool state, caches, worktrees, environment files, editor metadata, and generated output at the narrowest useful path. Confirm new rules with `git check-ignore`.
- Remove accidentally tracked local artifacts from Git while preserving the user's local copy when it is still useful.
- Never commit secrets, personal data, machine-specific paths, private notes, deployment credentials, or internal-only instructions.

## Keep implementation clean

- Prefer the existing architecture, naming, primitives, and dependency direction over local exceptions.
- Reuse a suitable existing abstraction before adding another. Extract a new abstraction only when it removes real duplication or enforces a meaningful boundary.
- Avoid speculative helpers, placeholder files, abandoned approaches, dead code, debug output, unexplained flags, and stale TODOs.
- Add dependencies only when their concrete value outweighs maintenance, supply-chain, bundle, and portability costs.
- Keep public interfaces small. Do not expose internals merely to make one implementation convenient.
- Preserve deliberate compatibility paths and product invariants. Cleanliness is not permission to delete code whose purpose has not been established.

## Write for contributors

- Make names and structure explain ordinary behavior without comments.
- Apply the `comment` skill when source comments change. Keep only comments that explain durable, non-obvious intent, constraints, security boundaries, or surprising tradeoffs.
- Keep user-facing documentation accurate when setup, configuration, public APIs, or contributor workflows change. Do not create documentation for self-evident implementation details.
- Avoid references that require access to a private repository, local conversation, personal account, or untracked file.

## Audit before handoff

1. Review tracked, staged, unstaged, untracked, and ignored files relevant to the task.
2. Remove task residue and confirm every new file has a durable owner and discoverable location.
3. Check the final diff for unrelated churn, duplicate patterns, private data, machine paths, temporary logging, unnecessary comments, and accidental binaries.
4. Run `git diff --check` plus the task's normal lint, type, test, and build checks.
5. Report any intentionally retained irregularity that a public contributor would otherwise mistake for debris.

When invoked specifically as `/oss`, remain read-only unless the user also asks for cleanup. Report concrete findings by impact and file path; do not manufacture stylistic issues.
