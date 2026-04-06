#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const eventPath = process.argv[2];

if (!eventPath) {
  console.error("Usage: node scripts/automation/prepare-agent-prompt.cjs <event-json-path>");
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const issue = event.issue || event;

if (!issue) {
  console.error("GitHub event payload does not contain an issue.");
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY || "<owner>/<repo>";
const issueNumber = issue.number;
const issueTitle = issue.title || "";
const issueBody = (issue.body || "").trim();
const triggerComment =
  event.comment && typeof event.comment.body === "string"
    ? event.comment.body.trim()
    : "";

const docsToRead = [
  "AGENTS.md",
  "docs/README.md",
  "docs/architecture.md",
  "docs/development.md",
  "docs/product.md",
  "docs/automation.md",
];

const prompt = `You are working in the GitHub repository ${repo}.

Implement GitHub issue #${issueNumber}: ${issueTitle}

Issue body:
---
${issueBody || "(no issue body provided)"}
---

${triggerComment ? `Trigger comment:\n---\n${triggerComment}\n---\n` : ""}

Repository harness rules:
- Read these repository files before making non-trivial changes:
${docsToRead.map((doc) => `  - ${doc}`).join("\n")}
- Favor small, reviewable changes over broad rewrites.
- If the issue is ambiguous, narrow scope conservatively and explain the tradeoff in the PR body.
- Update repository docs when behavior, workflows, or architecture assumptions change.
- Create or update an execution plan in docs/exec-plans/ if the work is too large for one straightforward pass.

Implementation requirements:
- Make the smallest change set that fully addresses the issue.
- Run the most relevant validation you can with the installed dependencies.
- Leave the repository in a state that can be committed directly.
- Do not push, open a PR, or modify git remotes yourself. The workflow will handle that.

PR requirements:
- Ensure the resulting branch is ready for a pull request.
- Include enough code and docs context that a reviewer can understand the change from the diff and PR body.
`;

process.stdout.write(prompt);
