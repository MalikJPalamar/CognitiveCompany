# CognitiveCompany — Agentic AI System

**Operator:** Malik Palamar · BuilderBee / Centaurion.me / AOB
**Stack:** Claude Code · Sub-Agents · Graphiti Memory · MCP · Trigger.dev · Docker · Hostinger VPS

---

## What This Is

A self-hosted, sovereign AI agent system. One orchestrator, five specialist sub-agents, persistent episodic memory, durable workflow execution, and a hardened VPS deployment pipeline. No vendor lock-in. Your data, your infrastructure.

**The mental model:** This is a city. The orchestrator is the dispatcher. Sub-agents are specialist workers. Graphiti/Neo4j is city hall (long-term memory). MCP servers are the phone lines. The VPS is sovereign territory.

```
User Request
     │
     ▼
┌────────────────┐
│  ORCHESTRATOR  │  claude-opus-4-6  — plans, routes, synthesizes
└───────┬────────┘
        │
   ┌────┼──────────────────────────┐
   ▼    ▼           ▼       ▼      ▼
[researcher] [coder] [writer] [marketer] [pm]
      claude-sonnet-4-6 (all sub-agents)
        │
        ▼
┌────────────────────────────────────┐
│  MEMORY LAYER                      │
│  Graphiti (episodic) + Neo4j       │
│  ChromaDB (vector/semantic)        │
└────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────┐
│  WORKFLOWS                         │
│  Trigger.dev (durable execution)   │
│  Postgres + Redis                  │
└────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────┐
│  HTTP API  (agents/api/server.js)  │
│  nginx → SSL → VPS                 │
└────────────────────────────────────┘
```

---

## Codebase Index

### Root

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Agent constitution — identity, principles, memory protocol, sub-agent rules. Claude Code reads this at startup. |
| `.env.example` | All environment variables required to run the system. Copy to `.env` and fill in. |
| `.gitignore` | Excludes `.env`, `node_modules`, build artifacts, Docker data. |
| `package.json` | Node.js dependencies: `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `@trigger.dev/sdk`, `express`. |
| `Dockerfile` | Container build for the agent API. Node 20 Alpine. Exposes port 3000. |
| `docker-compose.yml` | Local dev stack: Neo4j + Graphiti + ChromaDB. |
| `docker-compose.prod.yml` | Production VPS stack: adds Postgres, Redis, Trigger.dev webapp, agent-api. All bound to `127.0.0.1` (no public exposure). |
| `trigger.config.ts` | Trigger.dev project config — points to `workflows/` directory. |
| `tsconfig.json` | TypeScript config for workflow files. |

---

### `agents/`

#### `agents/orchestrator/`

| File | Purpose |
|------|---------|
| `index.js` | Main entry point. Reads memory → builds system prompt → runs Claude claude-opus-4-6 in a tool-use loop → delegates to sub-agents → writes results to memory. Max 20 turns, 5s memory timeout guard. |
| `system-prompt.js` | Builds the orchestrator's system prompt by injecting retrieved memories and session context. |
| `CLAUDE.md` | Orchestrator's own identity card — role, available tools, delegation rules. |

**Key behavior:** The orchestrator runs a tool-use loop. Each iteration it either calls a sub-agent tool (`delegate_to_researcher`, `delegate_to_coder`, etc.) or calls `write_memory`. Loop exits when Claude returns `end_turn` or after 20 turns.

---

#### `agents/researcher/`

| File | Purpose |
|------|---------|
| `index.js` | Accepts `{ query, depth, sessionId }`. Runs `claude-sonnet-4-6` with web search and memory tools. Returns `{ summary, keyFindings, sources, confidence, recommendedNextSteps }`. Writes output to `/tmp/agent-outputs/[sessionId]/researcher.json`. |
| `CLAUDE.md` | Researcher identity: cite sources, flag contradictions, no editorializing, structured JSON output contract. |

---

#### `agents/coder/`

| File | Purpose |
|------|---------|
| `index.js` | Accepts `{ task, language, outputType, sessionId }`. Runs `claude-sonnet-4-6` with code-focused tools. Returns `{ code, explanation, language, outputType }`. Writes to `/tmp/agent-outputs/[sessionId]/coder.json`. |
| `CLAUDE.md` | Coder identity: no hallucinated APIs, test-first thinking, document all functions, security-conscious. |

---

#### `agents/writer/`

| File | Purpose |
|------|---------|
| `index.js` | Accepts `{ task, format, tone, sessionId }`. Runs `claude-sonnet-4-6` for content generation. Returns `{ content, format, wordCount, tone }`. Writes to `/tmp/agent-outputs/[sessionId]/writer.json`. |
| `CLAUDE.md` | Writer identity: match operator voice (Malik), lead with bottom line, use metaphors, no filler. |

---

#### `agents/marketer/`

| File | Purpose |
|------|---------|
| `index.js` | Accepts `{ niche, campaign, objective, sessionId }`. Runs `claude-sonnet-4-6` for ad/content pipeline generation. Returns `{ angles, hooks, campaigns, metadata }`. Writes to `/tmp/agent-outputs/[sessionId]/marketer.json`. |
| `CLAUDE.md` | Marketer identity: Cody Schneider programmatic method, direct response principles, structured campaign output. |

---

#### `agents/pm/`

| File | Purpose |
|------|---------|
| `index.js` | Accepts `{ projects, request, sessionId }`. Runs `claude-sonnet-4-6` for standups, task tracking, and project briefs. Returns `{ standup, tasks, blockers, decisions }`. Writes to `/tmp/agent-outputs/[sessionId]/pm.json`. |
| `CLAUDE.md` | PM identity: surface blockers first, prefer async communication, track across AOB + BuilderBee + Centaurion. |

---

#### `agents/api/`

| File | Purpose |
|------|---------|
| `server.js` | Express HTTP server (port 3000). Three endpoints: `GET /health` (no auth), `POST /orchestrate` (auth), `POST /agent/:name` (auth). Auth via `X-Api-Key` header against `AGENT_API_KEY` env var. Dev mode if key not set. |

**Endpoints:**

```
GET  /health              → { status: "ok", uptime, timestamp }
POST /orchestrate         → runs full orchestrator, returns { result }
POST /agent/:name         → runs named sub-agent directly, returns { agent, result }
                            :name ∈ [researcher, coder, writer, marketer, pm]
```

---

### `mcp-servers/`

#### `mcp-servers/memory/`

| File | Purpose |
|------|---------|
| `index.js` | MCP server that exposes Graphiti to Claude Code as two tools: `memory_write` and `memory_search`. Runs as a stdio process. Claude Code spawns it on startup via `.claude/settings.json`. |

---

### `tools/`

| File | Purpose |
|------|---------|
| `memory.js` | Low-level Graphiti HTTP client. `writeMemory({ key, content, entity })` → posts episode to Graphiti. `readMemory({ query, limit, entity })` → searches and returns formatted results. Used by both the MCP server and the orchestrator directly. |

---

### `workflows/`

Trigger.dev v3 TypeScript workflows. Each is a durable, resumable pipeline.

| File | Purpose |
|------|---------|
| `marketing-pipeline.ts` | 3-phase pipeline: research niche → generate 20 ad angles with hooks/bodies/CTAs → cluster into campaign themes → save to memory. Parallel execution for content variants. |
| `coding-sprint.ts` | Scoped development workflow: spec → architecture → implementation → tests → PR description. Delegates to coder sub-agent. |
| `pm-daily-standup.ts` | Pulls context from Monday.com + GitHub + memory → generates formatted standup for all three business domains → posts to configured channel. |

---

### `scripts/`

| File | Purpose |
|------|---------|
| `provision-vps.sh` | **Run once** on a fresh Hostinger VPS. 8 phases: system update, packages, Docker, Node.js 20, Nginx + Certbot, app directory, UFW firewall, fail2ban. |
| `deploy.sh` | **Run from local machine** to deploy to VPS. Phase 0: validate env vars. Phase 1: rsync (excludes `.env`, `node_modules`, `.git`). Phase 2: SSH remote `npm install` + `docker compose pull` + rolling restart. Phase 3: health check via HTTPS. |
| `configure-nginx.sh` | Writes the nginx site config using `$DOMAIN` from `.env`, symlinks to `sites-enabled`, tests config, reloads nginx. Run once after first deploy. |
| `validate-env.sh` | Checks all required env vars are present in a `.env` file. Called by `deploy.sh` before syncing. Exits non-zero if anything is missing. |
| `backup.sh` | Daily backup of Neo4j (graph dump) and Postgres (pg_dump). Compresses to dated tarball. Retains 7 days. Designed for cron: `0 2 * * *`. |

---

### `.claude/`

| File | Purpose |
|------|---------|
| `settings.json` | MCP server configuration for Claude Code. Registers: `memory` (custom Graphiti bridge), `brave-search`, `filesystem`, `github`, `playwright`, `notion`. Also sets tool permissions. |
| `commands/research.md` | `/research <topic>` — triggers research protocol: memory lookup → web search → structured intel brief → save to memory. |
| `commands/standup.md` | `/standup` — pulls Monday.com + GitHub + memory → generates daily standup across all three domains. |
| `commands/programmatic-ad.md` | `/programmatic-ad <niche>` — triggers Cody Schneider ad pipeline: research → 20 angles → campaign clusters → JSON output. |
| `commands/project-brief.md` | `/project-brief <initiative>` — generates structured project brief: problem → approach → requirements → risks → timeline. |

---

### `nginx/`

| File | Purpose |
|------|---------|
| `agent-system.conf` | Nginx config template. Two server blocks: `trigger.DOMAIN` (→ 127.0.0.1:3040) and `api.DOMAIN` (→ 127.0.0.1:3050). SSL/TLS 1.2+, WebSocket upgrade for Trigger.dev, 300s read timeout. Health endpoint unauthenticated. |

---

### `docs/`

| File | Purpose |
|------|---------|
| `CRD.md` | Customer Requirements Document. 7 functional requirements (FR-01–07), 6 non-functional requirements (NFR-01–06), 10 acceptance criteria (AC-01–10). Source of truth for what the system must do. |
| `PRD.mdx` | Persistent Requirement Document v1.0.0. 11 features (F-01–11), KPI dashboard (8 metrics), 4-phase deployment checklist, 6 open risks. Git history is the version log. Tag format: `prd-v1.x.y`. |

---

## Installation

### Prerequisites

```bash
node --version    # 20.x+ required
docker --version  # Docker 24+ with Compose plugin
npm install -g @anthropic-ai/claude-code
```

### Local Setup

```bash
# 1. Clone
git clone https://github.com/MalikJPalamar/CognitiveCompany.git
cd CognitiveCompany

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — fill in every required value (see .env.example for descriptions)

# 4. Start local services (Neo4j + Graphiti + ChromaDB)
docker compose up -d

# 5. Wait for services to be healthy (~30s)
docker compose ps

# 6. Test memory layer
node -e "
  import('./tools/memory.js').then(m =>
    m.writeMemory({ key: 'test:init', content: 'System online', entity: 'system' })
      .then(r => console.log('Memory OK:', r))
      .catch(e => console.error('Memory FAIL:', e))
  )
"

# 7. Start Claude Code in this workspace
claude
```

### Verify MCP Servers

Inside Claude Code:
```
# These should work without errors:
/memory_search "test"
/research "test query"
```

---

## VPS Deployment — Step by Step

### Step 1 — Provision the VPS (once)

```bash
# From your LOCAL machine — SSH into fresh Hostinger VPS and run provisioner
ssh root@YOUR_VPS_IP 'bash -s' < scripts/provision-vps.sh

# Log out and back in for docker group membership to take effect
ssh malik@YOUR_VPS_IP
exit
```

What `provision-vps.sh` does:
1. `apt update && apt upgrade`
2. Installs: curl, wget, git, unzip, htop, ufw, fail2ban
3. Installs Docker + docker-compose-plugin
4. Installs Node.js 20 (via NodeSource)
5. Installs nginx + certbot
6. Creates `/opt/agent-system`, owned by deploy user
7. Configures UFW: allow 22/80/443
8. Enables fail2ban

---

### Step 2 — Configure `.env`

Fill in every value in `.env`. Required fields:

```bash
ANTHROPIC_API_KEY=sk-ant-...
GRAPHITI_URL=http://localhost:8000
NEO4J_PASSWORD=<strong-password>
CHROMA_HOST=localhost
CHROMA_PORT=8001
NOTION_TOKEN=secret_...
MONDAY_API_KEY=...
GITHUB_TOKEN=ghp_...
BRAVE_SEARCH_API_KEY=BSA...
TRIGGER_SECRET_KEY=<32-char-random>
TRIGGER_MAGIC_LINK_SECRET=<32-char-random>
TRIGGER_ENCRYPTION_KEY=<32-char-random>
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://trigger:<POSTGRES_PASSWORD>@localhost:5432/trigger_dev
VPS_HOST=<your-vps-ip>
VPS_USER=malik
AGENT_API_KEY=<api-key-for-http-auth>
DOMAIN=yourdomain.com
```

Copy `.env` to VPS:
```bash
scp .env malik@YOUR_VPS_IP:/opt/agent-system/.env
```

---

### Step 3 — First Deploy

```bash
# From LOCAL machine
VPS_HOST=YOUR_VPS_IP bash scripts/deploy.sh
```

What `deploy.sh` does:
1. Runs `validate-env.sh` — exits if any required var is missing
2. `rsync` all files to `/opt/agent-system/` on VPS (skips `.env`, `node_modules`, `.git`)
3. SSH remote: `npm install --production`
4. SSH remote: `docker compose -f docker-compose.prod.yml pull`
5. SSH remote: starts core services first (neo4j, graphiti, chroma, postgres, redis) — waits 10s
6. SSH remote: starts app services (trigger-webapp, agent-api)
7. Health check: `GET https://api.DOMAIN/health`

---

### Step 4 — Configure Nginx + SSL

```bash
# On the VPS
ssh malik@YOUR_VPS_IP

# Configure nginx (reads DOMAIN from /opt/agent-system/.env)
bash /opt/agent-system/scripts/configure-nginx.sh

# Issue SSL certificates
sudo certbot --nginx \
  -d api.yourdomain.com \
  -d trigger.yourdomain.com \
  --agree-tos --non-interactive \
  -m your@email.com

# Verify SSL auto-renewal
sudo certbot renew --dry-run
```

---

### Step 5 — Deploy Trigger.dev Workflows

```bash
# From LOCAL machine — deploy TypeScript workflows to your self-hosted Trigger.dev
TRIGGER_API_URL=https://trigger.yourdomain.com \
  npx trigger.dev@latest deploy
```

---

### Step 6 — Set Up Backup Cron

```bash
# On the VPS
crontab -e

# Add this line:
0 2 * * * /opt/agent-system/scripts/backup.sh >> /var/log/agent-backup.log 2>&1
```

---

### Step 7 — Verify Everything

```bash
# Health check (no auth required)
curl https://api.yourdomain.com/health

# Orchestrate test (auth required)
curl -X POST https://api.yourdomain.com/orchestrate \
  -H "X-Api-Key: YOUR_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"request": "What are my active projects?"}'

# Sub-agent direct call
curl -X POST https://api.yourdomain.com/agent/researcher \
  -H "X-Api-Key: YOUR_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"request": {"query": "Hostinger VPS performance benchmarks", "depth": "surface"}}'

# Trigger.dev UI
open https://trigger.yourdomain.com
```

---

## Using Claude Code (Local)

Start Claude Code from the project root:

```bash
claude
```

Available slash commands:

| Command | What it does |
|---------|-------------|
| `/research <topic>` | Deep research → structured intel brief → saved to memory |
| `/standup` | Pulls Monday + GitHub + memory → daily standup across all domains |
| `/programmatic-ad <niche>` | Cody Schneider ad pipeline → 20 angles → campaign clusters → JSON |
| `/project-brief <initiative>` | Structured brief: problem, approach, requirements, risks |

---

## Redeployment (After Changes)

```bash
# Local code change → push to VPS
VPS_HOST=YOUR_VPS_IP bash scripts/deploy.sh

# Workflow change → redeploy to Trigger.dev
npx trigger.dev@latest deploy
```

---

## Architecture Decisions

| Component | Choice | Reason |
|-----------|--------|--------|
| Orchestrator model | claude-opus-4-6 | Highest reasoning capability for planning and synthesis |
| Sub-agent model | claude-sonnet-4-6 | Fast, capable, cost-effective for specialized tasks |
| Memory | Graphiti + Neo4j | Temporal graph — knows *when* facts changed, not just *what* |
| Vector search | ChromaDB | Self-hosted semantic search, no cloud dependency |
| Workflow engine | Trigger.dev (self-hosted) | Durable execution — workflows survive crashes and resume |
| Container orchestration | Docker Compose | Single VPS, no Kubernetes complexity |
| Reverse proxy | Nginx | SSL termination, WebSocket support, battle-tested |
| Auth | X-Api-Key (app-level) | Simple, auditable, no OAuth complexity for internal API |
| Deployment | rsync + SSH | Stateless code sync + persistent Docker volumes = clean deploys |
| Backup | Daily dumps + 7-day rotation | Simple, verifiable, no managed backup service needed |

---

## Post-Deploy Hardening (Recommended)

| Item | How |
|------|-----|
| Rate limiting | Add `limit_req_zone` to nginx config for `/orchestrate` endpoint |
| Uptime monitoring | Add `https://api.yourdomain.com/health` to Uptime Kuma (self-hosted) |
| Backup verification | Monthly: `tar -xzf` a backup and do a test restore to staging |
| Log aggregation | `docker compose logs -f agent-api` or add Loki + Grafana stack |
| Secrets rotation | Rotate `AGENT_API_KEY`, `TRIGGER_SECRET_KEY`, `POSTGRES_PASSWORD` quarterly |

---

## Project Documentation

- [`docs/CRD.md`](docs/CRD.md) — Customer Requirements Document (FR-01–07, NFR-01–06, AC-01–10)
- [`docs/PRD.mdx`](docs/PRD.mdx) — Persistent Requirement Document v1.0.0 (features, KPIs, risks, deployment checklist)
- [`CLAUDE.md`](CLAUDE.md) — Agent constitution (identity, memory protocol, communication style)

---

## File Count

41 files · 3,632 lines of implementation

```
agents/          8 JS files  — orchestrator + 5 sub-agents + API server
mcp-servers/     1 JS file   — Graphiti MCP bridge
tools/           1 JS file   — memory read/write client
workflows/       3 TS files  — marketing, coding sprint, PM standup
scripts/         5 SH files  — provision, deploy, configure-nginx, validate-env, backup
nginx/           1 conf file — reverse proxy + SSL config
docker-compose   2 YML files — local dev + production
docs/            2 MD files  — CRD + PRD
.claude/         5 files     — settings + 4 slash commands
```

---

*Living document. Update `CLAUDE.md` as capabilities grow. Architecture is modular — add sub-agents, MCP servers, and workflows without touching existing ones.*
