# Morning Briefing Task Prompt

Read these files in order:
1. `memory/decisions.md`
2. `memory/people.md`
3. `memory/preferences.md`
4. `memory/user.md`
5. `todos/active.md`

Then:
- Summarize what I was last working on.
- Generate exactly 3 priorities for today based on `todos/active.md` and memory context.
- Execute `node .claude/scripts/send-morning-briefing.js` to send the briefing as a Slack DM using `SLACK_WEBHOOK_URL` from `.env`.
- If sending fails, report the error and stop.

Schedule:
- Run daily at 8:00 AM local time.

