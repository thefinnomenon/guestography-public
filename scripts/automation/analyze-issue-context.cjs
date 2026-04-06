#!/usr/bin/env node

const fs = require("fs");

const eventPath = process.argv[2];

if (!eventPath) {
  console.error("Usage: node scripts/automation/analyze-issue-context.cjs <event-json-path>");
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const issue = event.issue;

if (!issue) {
  console.error("GitHub event payload does not contain an issue.");
  process.exit(1);
}

const comments = Array.isArray(event.comments) ? event.comments : [];
const title = (issue.title || "").trim();
const body = (issue.body || "").trim();
const labels = Array.isArray(issue.labels)
  ? issue.labels.map((label) => (typeof label === "string" ? label : label.name)).filter(Boolean)
  : [];

const maintainerComments = comments.filter((comment) => {
  const association = comment.author_association || "";
  return ["OWNER", "MEMBER", "COLLABORATOR"].includes(association);
});

const conversationText = [body]
  .concat(maintainerComments.map((comment) => comment.body || ""))
  .join("\n\n")
  .toLowerCase();

const hasTemplateHeading = (heading) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\n)#+\\s*${escaped}\\s*$`, "im");
  return pattern.test(body);
};

const hasChecklistItem = /\-\s\[[ xX]\]\s+/.test(body);
const hasAcceptanceHeading = hasTemplateHeading("Acceptance criteria");
const hasScopeHeading = hasTemplateHeading("In scope");
const hasSummaryHeading = hasTemplateHeading("Summary");
const hasValidationHeading = hasTemplateHeading("Validation");
const hasOutOfScopeHeading = hasTemplateHeading("Out of scope");

const summaryLength = body.replace(/\s+/g, " ").trim().length;
const hasMeaningfulBody = summaryLength >= 120;

const scopeSignals = [
  "pages/",
  "components/",
  "functions/",
  "api",
  "checkout",
  "upload",
  "email",
  "firebase",
  "stripe",
  "sentry",
];

const mentionedScopeSignals = scopeSignals.filter((signal) =>
  conversationText.includes(signal.toLowerCase())
);

const planSignals = [
  "migrate",
  "migration",
  "rewrite",
  "overhaul",
  "re-architecture",
  "rearchitecture",
  "framework upgrade",
  "upgrade next",
  "upgrade firebase",
  "replace",
  "refactor entire",
  "monorepo",
  "ci/cd",
  "infrastructure",
];

const planSignalHits = planSignals.filter((signal) =>
  conversationText.includes(signal)
);

const missing = [];

if (!hasMeaningfulBody || !hasSummaryHeading) {
  missing.push("a concise summary of the desired outcome");
}

if (!hasScopeHeading && mentionedScopeSignals.length === 0) {
  missing.push("clear scope for which files, flows, or integrations should change");
}

if (!hasAcceptanceHeading && !hasChecklistItem) {
  missing.push("acceptance criteria that define when the issue is done");
}

if (!hasOutOfScopeHeading) {
  missing.push("at least one explicit non-goal or constraint");
}

const validationMissing = !hasValidationHeading && !conversationText.includes("lint");

if (validationMissing) {
  missing.push("validation expectations or commands to run");
}

const needsPlan =
  planSignalHits.length > 0 ||
  mentionedScopeSignals.length >= 4 ||
  (/upgrade/i.test(title) && /next|firebase|typescript|stripe/i.test(conversationText));

let status = "ready-for-agent";

if (needsPlan) {
  status = "needs-plan";
} else if (missing.length > 0) {
  status = "needs-context";
}

const questions = [];

if (missing.includes("a concise summary of the desired outcome")) {
  questions.push("What exact user-visible or engineering outcome do you want from this issue?");
}

if (missing.includes("clear scope for which files, flows, or integrations should change")) {
  questions.push("Which areas are in scope for this change, for example `pages/`, `pages/api/`, `functions/`, uploads, checkout, or email?");
}

if (missing.includes("acceptance criteria that define when the issue is done")) {
  questions.push("What concrete checks should be true when this issue is complete?");
}

if (missing.includes("at least one explicit non-goal or constraint")) {
  questions.push("What should not change as part of this issue?");
}

if (missing.includes("validation expectations or commands to run")) {
  questions.push("Which validation should the agent run, such as `yarn lint` or `npm --prefix functions run build`?");
}

const rationale =
  status === "needs-plan"
    ? `The issue looks too broad for a single direct implementation pass because it includes plan-level signals: ${planSignalHits.join(", ") || "cross-cutting scope"}.`
    : status === "needs-context"
      ? `The issue is not safely executable yet because it is missing ${missing.join(", ")}.`
      : "The issue has enough context, scope, and acceptance detail for implementation.";

const result = {
  issueNumber: issue.number,
  title,
  labels,
  status,
  missing,
  questions,
  rationale,
  mentionedScopeSignals,
  planSignalHits,
  maintainerCommentCount: maintainerComments.length,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
