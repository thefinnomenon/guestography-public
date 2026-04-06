# Automation

This repository uses a lightweight harness-engineering model adapted to an existing codebase.

## Goals

- turn GitHub issues into agent-executable work items
- keep repository knowledge local and versioned
- let an agent produce implementation branches and pull requests with minimal manual copy-paste
- preserve human review and merge control

## Trigger Model

The issue flow has two stages:

- label sync in [`sync-harness-labels.yml`](../.github/workflows/sync-harness-labels.yml)
- triage in [`agent-triage.yml`](../.github/workflows/agent-triage.yml)
- implementation in [`agent-issue.yml`](../.github/workflows/agent-issue.yml)

Triage runs when:

- an issue with the `agent` label is opened, edited, reopened, or newly labeled
- a maintainer replies on an issue that is labeled `agent` or `needs-context`

Triage applies one of these state labels:

- `ready-for-agent`: enough context exists, so implementation can start
- `needs-context`: the harness comments with the missing questions and waits for replies
- `needs-plan`: the task is too broad or risky for a single coding pass

Implementation runs when:

- triage dispatches the implementation workflow after classifying the issue as `ready-for-agent`
- the workflow is manually dispatched for a specific issue

The implementation workflow:

1. checks out the repository
2. prepares an agent prompt from the issue plus repo docs
3. installs dependencies needed before sandboxed agent execution
4. runs `openai/codex-action`
5. creates or updates a pull request with any resulting changes
6. comments back on the issue with the PR link or a no-op result

The triage workflow:

1. fetches the full issue thread
2. analyzes whether the issue is executable now
3. updates the triage state label
4. posts or updates a single triage comment in the issue thread
5. dispatches the implementation workflow when an issue becomes `ready-for-agent`
6. re-runs automatically when maintainers reply with more context

## Required GitHub Secrets And Variables

Required secret for the current OpenAI-backed implementation:

- `OPENAI_API_KEY`: API key used by `openai/codex-action`

Optional repository variables:

- `AGENT_MODEL`: explicit model override for the current agent backend
- `AGENT_EFFORT`: reasoning effort override such as `medium` or `high`
- `AGENT_ALLOW_USERS`: comma-separated GitHub usernames allowed to trigger comment-based runs in addition to users with repo write access

## Branch And PR Conventions

- automation branches are named `agent/issue-<number>-<slug>`
- automated PRs should include `Closes #<issue>`
- PR bodies should note validation status and any remaining unknowns

## Label Model

- `agent`: opt-in label meaning the issue should participate in the agent harness
- `ready-for-agent`: triage has approved the issue for implementation
- `needs-context`: triage is waiting for more information in the issue thread
- `needs-plan`: the issue should be broken down or turned into an execution plan first

These labels are maintained by [`sync-harness-labels.yml`](../.github/workflows/sync-harness-labels.yml).

## Scope Rules For Agents

- small and medium issues are good candidates
- tasks requiring secrets not present in GitHub Actions should still be implemented, but the PR must say what could not be validated
- broad migrations should be broken into execution plans first
- if an issue is ambiguous, the agent should tighten scope in the PR body instead of inventing a large product change
- clarification should happen in the issue thread so the context remains durable and visible to future agents

## Doc Gardening

The scheduled workflow [`doc-gardener.yml`](../.github/workflows/doc-gardener.yml) is intended to keep the harness docs from drifting. It can open a small PR when repository docs no longer match the code layout or workflow reality.
