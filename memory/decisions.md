# Decisions Memory

Last Updated: 2026-04-22T06:48:16.694Z

## Decision Log

- 2026-04-22: Establish a persistent memory system under `/memory` and maintain it every session end via Claude Code hooks.
- 2026-04-22: Use a daily 8:00 AM briefing workflow that reads memory and `/todos/active.md`, then sends a Slack DM through `SLACK_WEBHOOK_URL`.
- 2026-04-22: Treat this repository as the primary long-lived project context and keep documentation + execution context in sync.
- 2026-04-22: Old `linkedeyewebproject` is the reference backend; new React app must move to Python backend with equivalent capabilities.
- 2026-04-22: Node backend is deprecated for this project direction; Python backend is the primary implementation path.
- 2026-04-22: Immediate execution style for migration is folder-first scaffolding, then endpoint/domain parity in controlled phases.
