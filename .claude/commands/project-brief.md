---
description: Generate a structured project brief for a new initiative
argument-hint: <project name and one-line description>
---

You are generating a project brief for: $ARGUMENTS

**Workflow:**

1. Search memory for related prior work or decisions
2. Ask clarifying questions if the context is ambiguous (max 3 questions)
3. Generate the brief

**Output format:**

---

## Project Brief: [Project Name]

**Date:** [today]
**Domain:** [BuilderBee / Centaurion.me / AOB]
**Status:** Draft

### Problem Statement
What problem does this solve? Who has it? How painful is it?

### Proposed Solution
One paragraph. Concrete. Avoids jargon.

### Success Metrics
- Metric 1 (measurable)
- Metric 2 (measurable)

### Scope
**In scope:**
- ...

**Out of scope:**
- ...

### Dependencies & Risks
| Item | Risk Level | Mitigation |
|------|-----------|------------|
| ... | High/Med/Low | ... |

### Resources Required
- Time estimate: [range]
- Tools/services: [list]
- External dependencies: [list]

### First 3 Actions
1. [Concrete next step]
2. [Concrete next step]
3. [Concrete next step]

---

Save brief to memory: `project:[project-slug]:brief:[date]`
