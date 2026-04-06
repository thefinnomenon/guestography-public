# Execution Plans

Use an execution plan for work that is too large or risky for a single straightforward issue implementation.

## When To Create One

- multi-step refactors
- infrastructure changes
- framework upgrades
- work spanning app, functions, and deployment behavior
- any task where the agent will need to make intermediate decisions and record them

## Layout

- `active/`: plans currently in progress
- `completed/`: plans that landed
- `templates/task-plan-template.md`: starting point
- `tech-debt-tracker.md`: backlog of structural cleanup items

Execution plans should be concise and updated as the work progresses.
