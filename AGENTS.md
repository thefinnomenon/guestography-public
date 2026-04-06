# AGENTS.md

This repository is being refit for agent-first maintenance. Treat this file as the table of contents, not the full manual.

## Mission

Guestography is a Next.js and Firebase application for creating and managing event photo collection flows. The repository has been dormant, so every agent task should favor:

- low-risk, incremental changes
- improved documentation and testability
- preserving current behavior unless the task explicitly changes product behavior

## Start Here

Read these files before making non-trivial changes:

1. [`README.md`](./README.md): local bootstrapping and high-level project context
2. [`docs/README.md`](./docs/README.md): repository knowledge map
3. [`docs/architecture.md`](./docs/architecture.md): current system boundaries and major modules
4. [`docs/development.md`](./docs/development.md): expected local workflows and validation commands
5. [`docs/automation.md`](./docs/automation.md): issue-to-PR harness rules and CI automation

If the task is larger than a small bug fix or docs edit, create or update an execution plan under [`docs/exec-plans/`](./docs/exec-plans/).

## Repo Map

- `pages/`: Next.js pages and API routes
- `components/`: reusable UI components
- `lib/`: shared integrations such as Firebase, email, analytics, and QR generation
- `utils/`: client and shared helpers
- `emails/`: React email templates
- `functions/`: Firebase Functions codebase and emulator scripts
- `docs/`: versioned system of record for architecture, product intent, plans, and automation rules

## Working Rules

- Prefer targeted fixes over broad rewrites.
- Keep the docs in sync with behavior when changing architecture, workflows, or product assumptions.
- Avoid introducing new infrastructure unless it is necessary for reliability or automation.
- Call out unknowns explicitly in PR descriptions instead of guessing.
- When reviving abandoned areas, leave a short note in the relevant doc or execution plan so future agents do not have to rediscover context.

## Validation

Use the lightest validation that proves the change:

- `yarn lint` for the Next.js app
- `npm --prefix functions run lint`
- `npm --prefix functions run build`
- `node scripts/ci/validate-harness-docs.cjs`

If validation cannot run because dependencies or credentials are missing, state that clearly in the final summary and PR body.
