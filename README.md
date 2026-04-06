# Guestography

Guestography is a dormant Next.js and Firebase event-media application that has been refit with a lightweight agent harness so repository work can start from GitHub issues and end in pull requests.

## Stack

- Next.js 13 with the `pages/` router
- Firebase Functions for backend and scheduled or background logic
- Firebase, Stripe, AWS media services, Mixpanel, Sentry, Resend, and Twilio integrations

## Local Development

Install dependencies:

```bash
yarn install --frozen-lockfile
npm install --prefix functions
```

Run the app:

```bash
yarn dev
```

Run validations:

```bash
yarn lint
npm --prefix functions run lint
npm --prefix functions run build
yarn harness:check
```

## Agent Harness

This repository now follows the harness-engineering pattern in a pragmatic form for an existing codebase:

- [`AGENTS.md`](./AGENTS.md) is the agent entrypoint
- [`.github/workflows/sync-harness-labels.yml`](./.github/workflows/sync-harness-labels.yml) keeps the harness labels in sync
- [`docs/`](./docs/README.md) is the versioned system of record
- [`.github/workflows/agent-triage.yml`](./.github/workflows/agent-triage.yml) classifies issues as ready, needs context, or needs a plan
- [`.github/workflows/agent-issue.yml`](./.github/workflows/agent-issue.yml) turns triage-approved issues into agent work
- [`.github/workflows/doc-gardener.yml`](./.github/workflows/doc-gardener.yml) performs scheduled documentation maintenance

To trigger automated work:

1. Create an issue, preferably using the `Agent task` template.
2. Add the `agent` label.
3. If triage asks follow-up questions, reply in the same issue thread.
4. Review the PR that the workflow opens or updates after triage applies `ready-for-agent`.

## GitHub Setup

Required repository secret for the current OpenAI-backed implementation:

- `OPENAI_API_KEY`

Optional repository variables:

- `AGENT_MODEL`
- `AGENT_EFFORT`
- `AGENT_ALLOW_USERS`

## Repository Docs

- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/development.md`](./docs/development.md)
- [`docs/product.md`](./docs/product.md)
- [`docs/automation.md`](./docs/automation.md)
- [`docs/exec-plans/README.md`](./docs/exec-plans/README.md)
