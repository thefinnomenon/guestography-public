#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

const requiredFiles = [
  "AGENTS.md",
  "docs/README.md",
  "docs/architecture.md",
  "docs/development.md",
  "docs/product.md",
  "docs/automation.md",
  "docs/exec-plans/README.md",
  "docs/exec-plans/templates/task-plan-template.md",
  "docs/exec-plans/tech-debt-tracker.md",
  ".github/workflows/harness-validate.yml",
  ".github/workflows/sync-harness-labels.yml",
  ".github/workflows/agent-triage.yml",
  ".github/workflows/agent-issue.yml",
  ".github/workflows/doc-gardener.yml",
];

const markdownFiles = [
  "AGENTS.md",
  "README.md",
  "docs/README.md",
  "docs/architecture.md",
  "docs/development.md",
  "docs/product.md",
  "docs/automation.md",
  "docs/exec-plans/README.md",
];

const missing = requiredFiles.filter((relativePath) => {
  return !fs.existsSync(path.join(repoRoot, relativePath));
});

if (missing.length > 0) {
  console.error("Missing required harness files:");
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const brokenLinks = [];
const markdownLinkPattern = /\[[^\]]+\]\((\.{1,2}\/[^)]+)\)/g;

for (const relativePath of markdownFiles) {
  const absolutePath = path.join(repoRoot, relativePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  for (const match of content.matchAll(markdownLinkPattern)) {
    const target = match[1];
    const resolved = path.resolve(path.dirname(absolutePath), target);
    if (!fs.existsSync(resolved)) {
      brokenLinks.push(`${relativePath} -> ${target}`);
    }
  }
}

if (brokenLinks.length > 0) {
  console.error("Broken local markdown links:");
  for (const link of brokenLinks) {
    console.error(`- ${link}`);
  }
  process.exit(1);
}

console.log("Harness docs look structurally valid.");
