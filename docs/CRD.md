# Customer Requirements Document (CRD)
## Agentic Engineering Workspace — BuilderBee / Centaurion.me / AOB

**Customer:** Malik (operator / fractional CEO)
**Document type:** CRD — stable, operator-perspective requirements
**Status:** Approved
**Last reviewed:** 2026-02-22
**Linked PRD:** [docs/PRD.md](./PRD.md)

> The CRD captures *what* Malik needs. The PRD captures *how* the system delivers it.
> The CRD does not version — it is the source of truth for operator intent.
> When CRD requirements change, a new PRD version is triggered.

---

## 1. Operator Profile

| Attribute | Value |
|-----------|-------|
| Name | Malik |
| Role | Systems engineer, fractional CEO |
| Domains | BuilderBee, Centaurion.me, AOB |
| Thinking style | First-principles, systems thinking, visual metaphors |
| Communication preference | Bottom line first, no filler, Mermaid over prose |
| Technical level | Expert (builds the tools he uses) |

---

## 2. Business Domains & Contexts

### 2.1 BuilderBee
- **Type:** B2B SaaS / consulting
- **Audience:** Technical buyers, SMB operators
- **Core offering:** AI automation tools and implementation consulting
- **Stage:** Early-stage, building client base

### 2.2 Centaurion.me
- **Type:** B2B consulting / thought leadership
- **Audience:** Founders, executives, fractional leaders
- **Core offering:** Human-AI augmentation strategy and execution
- **Stage:** Active consulting, growing authority

### 2.3 AOB (Alchemy of Breath)
- **Type:** B2C / B2B training organization
- **Audience:** Wellness practitioners, corporate wellness buyers
- **Core offering:** Breathwork training, certification, retreats
- **Stage:** Pilot phase, scaling delivery

---

## 3. Core Problems to Solve

| # | Problem | Pain Level | Domain |
|---|---------|-----------|--------|
| CR-01 | Context is lost between working sessions — decisions, research, and insights must be re-explained | Critical | All |
| CR-02 | Repetitive cognitive tasks (research, standup, copywriting) consume time better spent on strategy | High | All |
| CR-03 | Three active domains with different cadences and stakeholders create coordination overhead | High | All |
| CR-04 | No single place to delegate and track AI-assisted work without losing quality control | High | All |
| CR-05 | SaaS tool dependence creates vendor lock-in risk and data sovereignty concerns | Medium | All |
| CR-06 | Marketing content pipeline for lead generation is manual and inconsistent | High | BuilderBee / Centaurion |
| CR-07 | Project management is fragmented across Monday.com, GitHub, and Notion without synthesis | Medium | All |

---

## 4. Requirements

### 4.1 Functional Requirements

#### FR-01: Persistent Cross-Session Memory
- The system MUST retain context, decisions, insights, and entity relationships across sessions
- Memory MUST be searchable by natural language query
- Memory MUST be timestamped and attributable to a source (agent / workflow / session)
- Memory MUST survive service restarts

#### FR-02: Multi-Domain Task Delegation
- Malik MUST be able to delegate tasks in natural language
- The system MUST route tasks to the appropriate specialist without Malik specifying which agent
- Sub-agents MUST produce structured, verifiable output
- Malik MUST be able to inspect what any sub-agent did and why

#### FR-03: Programmatic Content Pipeline
- The system MUST generate ad content pipelines using the Cody Schneider method (20 angles → 5 themes)
- Output MUST be structured JSON suitable for ad platform upload
- Pipelines MUST be saved to memory for future reference and iteration

#### FR-04: Daily Operational Awareness
- The system MUST generate a daily standup covering all three domains
- Standup MUST surface blockers and decisions required from Malik
- Standup MUST be triggerable on demand and on schedule (weekday mornings)

#### FR-05: Code Generation & Review
- The system MUST generate production-ready code in JavaScript, TypeScript, and Python
- Generated code MUST follow the engineering standards (ES modules, no secrets, explicit error handling)
- The system MUST be able to review existing code and return structured verdicts

#### FR-06: Project Brief Generation
- The system MUST generate structured project briefs on demand
- Briefs MUST include scope, metrics, risks, dependencies, and first three actions

#### FR-07: Workflow Durability
- Long-running workflows (>5 minutes) MUST be durable — if interrupted, they resume from last checkpoint
- Workflows MUST be triggerable via API endpoint as well as on schedule

### 4.2 Non-Functional Requirements

#### NFR-01: Data Sovereignty
- All persistent data MUST be self-hosted (graph DB, vector DB, workflow state)
- No proprietary SaaS shall be the single point of failure for Malik's institutional knowledge
- The system MUST be deployable on a VPS Malik controls

#### NFR-02: Vendor Portability
- Agent logic MUST NOT be locked to a single AI provider
- Model references MUST be configurable via environment variables, not hardcoded
- Infrastructure MUST be runnable with Docker Compose, not a proprietary cloud platform

#### NFR-03: Security Baseline
- API keys and secrets MUST never appear in committed code or logs
- All external API endpoints MUST require authentication (X-Api-Key header minimum)
- Production services MUST run behind HTTPS with valid certificates

#### NFR-04: Modularity
- Each sub-agent MUST be independently runnable for testing without the orchestrator
- Adding a new sub-agent MUST NOT require modifying existing agents
- MCP servers MUST be independently deployable

#### NFR-05: Observability
- All agent delegations MUST be logged with agent name, task, and token usage
- Workflow runs MUST have status visible in a UI (Trigger.dev dashboard)
- Health endpoints MUST be available for all services

#### NFR-06: Response Quality
- Orchestrator MUST use the most capable available model (currently claude-opus-4-6)
- Sub-agents MUST use the most capable sub-task model (currently claude-sonnet-4-6)
- Model selection MUST be documented and justified in system prompt files

---

## 5. Acceptance Criteria

| ID | Criterion | How to verify |
|----|-----------|---------------|
| AC-01 | Memory written in session 1 is retrievable in session 2 | Write memory, kill Claude Code, restart, search memory |
| AC-02 | `/research <topic>` produces a structured intelligence brief | Run command, verify JSON output format |
| AC-03 | `/standup` covers all three domains without manual input | Run command, verify BuilderBee + Centaurion + AOB sections |
| AC-04 | `/programmatic-ad <niche>` produces ≥20 ad angles in valid JSON | Run command, count angles, validate JSON |
| AC-05 | Sub-agents can be run independently | `node agents/researcher/index.js "test query"` returns valid output |
| AC-06 | Marketing pipeline Trigger.dev workflow completes without error | Trigger workflow, verify success in Trigger.dev UI |
| AC-07 | Agent API `/health` returns 200 | `curl http://localhost:3000/health` |
| AC-08 | No secrets in git history | `git log -S "sk-ant" --all` returns empty |
| AC-09 | `docker compose up -d` starts all services without error | Run command, all containers healthy |
| AC-10 | New sub-agent can be added without modifying orchestrator | Add new agent file + tool definition only |

---

## 6. Constraints

| Constraint | Rationale |
|-----------|-----------|
| Node.js 20+ runtime | Malik's preferred stack; LTS, stable |
| Docker Compose for infrastructure | No Kubernetes complexity for single-operator setup |
| Hostinger VPS as primary deployment | Cost-effective, Malik controls the hardware |
| CLAUDE.md as agent constitution | Claude Code reads this at startup — it is the lowest-level control point |
| No deletion of files without explicit confirmation | Safety constraint — Malik's data is irreplaceable |

---

## 7. Out of Scope (for this CRD)

- Multi-user / multi-tenant support (this is a single-operator system)
- Mobile app or consumer-facing UI
- Real-time collaboration features
- Automated deployment pipelines (CI/CD) — deploy.sh is sufficient for now
- Fine-tuned models (using API-based inference only)

---

*This document does not version. Changes to these requirements trigger a new PRD version with KPI impact analysis.*
