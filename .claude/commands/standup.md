---
description: Generate daily standup for all active projects
---

Generate a daily standup covering all active projects.

**Workflow:**

1. Read memory for active contexts:
   - `memory_search("AOB pilot status")`
   - `memory_search("BuilderBee current tasks")`
   - `memory_search("Centaurion.me tasks")`

2. Check GitHub for open PRs and issues (via GitHub MCP if configured)

3. Check Monday.com for overdue tasks (via Monday MCP if configured)

4. Generate standup in this format:

---

## Daily Standup — [Date]

### BuilderBee
**Yesterday:** [completed items]
**Today:** [planned items]
**Blockers:** [anything stuck]

### Centaurion.me
**Yesterday:** [completed items]
**Today:** [planned items]
**Blockers:** [anything stuck]

### AOB (Alchemy of Breath)
**Yesterday:** [completed items]
**Today:** [planned items]
**Blockers:** [anything stuck]

### Decisions Needed from Malik
- [Item requiring explicit decision]

---

5. Save standup to memory: `standup:[date]`
