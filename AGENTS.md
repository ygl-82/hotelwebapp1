<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

# AGENT GUARDRAILS & OPERATIONAL BOUNDARIES

## 1. GIT & VERSION CONTROL PROTOCOLS (STRICT ENFORCEMENT)
- **ABSOLUTE PROHIBITION ON DIRECT PUSHES:** Never run `git push origin main`, `git push origin master`, or execute force pushes (`git push --force`) under any circumstances.
- **BRANCH HYGIENE:** 
  - Always verify current branch before editing: run `git status` and `git branch --show-current`.
  - All work must be conducted exclusively on dedicated feature branches (e.g., `feature/<name>` or `fix/<name>`).
  - If currently on `main` or `master`, create and switch to a new branch first: `git checkout -b <branch-name>`.
- **EXPLICIT CONFIRMATION REQUIRED:** Never mark terminal commands involving `git push`, `git checkout`, `git reset`, or `git rebase` as auto-run/safe. Always pause and ask for explicit user confirmation before executing any remote repository changes.

## 2. WORKSPACE CONTAINMENT & SCOPE
- **WORKSPACE ISOLATION:** Only read, create, or modify files located strictly within the active root project directory. Never traverse up directory paths (`../`) or inspect/modify repos or folders outside this workspace.
- **TARGETED EDITS ONLY:** Only modify files explicitly related to the current task. Do not refactor unrelated modules, dependencies, configuration files, or build scripts without explicit permission.
- **ATOMIC COMMITS:** Make incremental, reversible changes. Do not bundle sweeping refactors into single actions.

## 3. SECRETS & DEPLOYMENT SAFETY
- **ENVIRONMENT VARIABLES:** Never read, echo, display, log, or commit `.env`, `.env.local`, or any files containing private keys or credentials.
- **NO DIRECT DEPLOYS:** Do not run deployment commands (e.g., `vercel --prod`, `npm run deploy`) without explicit manual review and consent.
- **FAILURE BEHAVIOR:** If a command or build fails, halt immediately. Do not attempt speculative, wide-reaching workarounds without detailing the root cause to the user first.
<!-- END:nextjs-agent-rules -->
