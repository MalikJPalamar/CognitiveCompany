# CognitiveCompany
# Agentic Engineering Playbook

### Claude Code · Sub-Agents · Memory · MCP · VPS Deployment

*Malik — BuilderBee / Centaurion.me / AOB*

-----

## 0. The Mental Model First (First Principles)

Before touching a single file, understand what you’re actually building.

**The City Metaphor**

Think of your agent system as a city:

|City Layer                      |Agent Equivalent                                                                   |
|--------------------------------|-----------------------------------------------------------------------------------|
|**City charter / law**          |`CLAUDE.md` — the agent’s constitution. What it is, what it can do, what it cannot.|
|**Citizens**                    |Sub-agents — specialized workers with narrow jobs                                  |
|**Highways between districts**  |MCP servers — standardized pipes connecting capabilities                           |
|**City hall (long-term memory)**|Graphiti / mem0 — persistent knowledge that survives sessions                      |
|**Short-term working memory**   |The context window — what the agent can “see” right now                            |
|**Post office**                 |APIs — how agents talk to the outside world                                        |
|**Zoning laws**                 |Tool permissions — which agent can touch which system                              |
|**City dispatcher**             |Claude Code orchestrator — routes tasks to the right worker                        |

A single context window is like a desk. You can only put so much on it. Long-term memory is the filing cabinet in the next room. MCP servers are the phone lines to other departments. Sub-agents are colleagues you can delegate to.

**The Core Loop of Any Agent**

```
PERCEIVE → THINK → ACT → OBSERVE → UPDATE MEMORY → REPEAT
```

Everything you build is just an elaboration of this loop.

-----

## 1. Environment Setup

### 1.1 Prerequisites

```bash
# Node.js 20+ (LTS)
node --version   # should be 20.x+

# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Verify
claude --version

# Docker (for local MCP servers and services)
# Install Docker Desktop or:
curl -fsSL https://get.docker.com | sh
```

### 1.2 Project Root Structure

Think of this as your “city blueprint” — everything has a known address.

```
~/agent-workspace/
├── CLAUDE.md                    # ← The constitution (most important file)
├── .claude/
│   ├── settings.json            # Claude Code settings
│   └── commands/                # Custom slash commands
│       ├── research.md
│       ├── draft-post.md
│       └── project-brief.md
├── agents/
│   ├── orchestrator/            # The dispatcher
│   ├── researcher/              # Deep research sub-agent
│   ├── writer/                  # Content/copy sub-agent
│   ├── coder/                   # Engineering sub-agent
│   ├── pm/                      # Project management sub-agent
│   └── marketer/                # Marketing automation sub-agent
├── mcp-servers/
│   ├── memory/                  # Graphiti / mem0 bridge
│   ├── browser/                 # Playwright web automation
│   ├── notion/                  # Notion MCP
│   └── monday/                  # Monday.com MCP
├── memory/
│   ├── graphiti/                # Long-term episodic memory
│   └── chroma/                  # Vector store for semantic search
├── workflows/                   # Trigger.dev / workflow definitions
│   ├── marketing-pipeline.ts
│   ├── coding-sprint.ts
│   └── pm-daily-standup.ts
├── tools/                       # Custom tool implementations
│   └── web-search.ts
├── .env                         # API keys (NEVER commit)
├── .env.example                 # Template to share
├── docker-compose.yml           # Local services
└── package.json
```

### 1.3 Environment Variables (`.env`)

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Memory
MEM0_API_KEY=...                 # If using managed mem0
GRAPHITI_URL=http://localhost:8000

# Vector DB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# External Services
NOTION_TOKEN=...
MONDAY_API_KEY=...
GITHUB_TOKEN=...
BRAVE_SEARCH_API_KEY=...        # For web search MCP

# Deployment
VPS_HOST=your-vps-ip
VPS_USER=malik
TRIGGER_DEV_API_KEY=...
```

-----

## 2. The CLAUDE.md File — Agent Constitution

This is the single most important file. Claude Code reads this at startup and treats it as law. Think of it as your agent’s “operating system personality.”

**Key insight:** `CLAUDE.md` files are hierarchical. A root one sets global rules. Sub-agent folders can each have their own `CLAUDE.md` that inherits from the parent but specializes behavior.

### 2.1 Root `CLAUDE.md`

```markdown
# Agent Workspace — Malik / BuilderBee / Centaurion.me

## Identity & Context
You are an agentic system operating across three domains:
1. **BuilderBee** — AI automation tools and consulting
2. **Centaurion.me** — Human-AI augmentation consulting  
3. **AOB (Alchemy of Breath)** — Breathwork training organization

Your operator is Malik, systems engineer and fractional CEO. 
Malik thinks in systems, uses first-principles reasoning, and prefers 
visual metaphors for complex ideas.

## Core Principles
- Always prefer modular, composable solutions over monolithic ones
- Avoid vendor lock-in: design for portability
- When uncertain, surface the uncertainty rather than guess
- Preserve data sovereignty: default to self-hosted solutions

## Capabilities Available
- Web search (Brave MCP)
- Long-term memory read/write (Graphiti MCP)
- File system operations (read/write in workspace only)
- Browser automation (Playwright MCP)
- Notion read/write (Notion MCP)
- Monday.com read/write (Monday MCP)
- GitHub (GitHub MCP)
- Code execution (Node.js, Python)

## Sub-Agent Protocol
When delegating to sub-agents:
1. Provide full context in the Task tool — sub-agents have no memory of the parent conversation
2. Specify the expected output format explicitly
3. Sub-agents MUST write their outputs to `/tmp/agent-outputs/[task-id]/`
4. Always verify sub-agent output before proceeding

## Memory Protocol
- READ memory at the start of any session involving a known person or project
- WRITE memory after any meaningful decision, insight, or completed milestone
- Memory keys follow the pattern: `[entity]:[type]:[timestamp]`
  - Example: `malik:preference:communication-2025`
  - Example: `aob:decision:crm-selection-2025-02`

## Constraints
- Never commit secrets or API keys to any file
- Never delete files without explicit confirmation
- Always summarize what you're about to do before multi-step operations
- When working with production systems, add a [PRODUCTION] warning

## Communication Style
- Lead with the bottom line, then the reasoning
- Use metaphors and visual framing when explaining complex concepts
- Prefer diagrams (Mermaid) over prose for system architecture
- Be direct: Malik values precision over politeness
```

### 2.2 Sub-Agent `CLAUDE.md` Example (`agents/researcher/CLAUDE.md`)

```markdown
# Researcher Sub-Agent

## Role
You are the Research specialist. Your only job is to gather, synthesize, 
and return structured intelligence on a given topic.

## Input Contract
You will receive a JSON task object:
{
  "query": "what to research",
  "depth": "surface|deep",
  "format": "brief|detailed|structured",
  "output_path": "/tmp/agent-outputs/[task-id]/research.json"
}

## Output Contract
Always write results to the specified output_path as JSON:
{
  "query": "original query",
  "summary": "2-3 sentence synthesis",
  "key_findings": ["finding 1", "finding 2"],
  "sources": [{"title": "", "url": "", "relevance": "high|medium|low"}],
  "confidence": "high|medium|low",
  "recommended_next_steps": []
}

## Tools Available
- web_search: Use for current information
- memory_read: Check if we've researched this before
- fetch_url: Deep-read specific pages

## Behavior Rules
- Cite sources for every claim
- Flag contradictions between sources
- Do NOT editorialize — report facts
```

-----

## 3. Agent Architecture — The Orchestrator Pattern

### 3.1 The Mental Model

Think of this like a consulting firm:

- **Orchestrator** = Managing Partner (routes work, synthesizes results)
- **Sub-agents** = Specialist consultants (focused, expert, stateless per session)
- **MCP servers** = The firm’s tools and databases
- **Memory layer** = The firm’s institutional knowledge base

```
User Request
     │
     ▼
┌─────────────┐
│ ORCHESTRATOR │  ← Reads memory, plans, delegates
└──────┬──────┘
       │
  ┌────┼─────────────────┐
  │    │                 │
  ▼    ▼                 ▼
[Researcher] [Coder]  [Marketer]  ← Sub-agents (Task tool)
  │    │                 │
  └────┴─────────────────┘
       │ Results
       ▼
┌─────────────┐
│ ORCHESTRATOR │  ← Synthesizes, writes to memory, responds
└─────────────┘
```

### 3.2 Orchestrator Entry Point (`agents/orchestrator/index.js`)

```javascript
// agents/orchestrator/index.js
// The "city dispatcher" — routes tasks to specialist agents

import Anthropic from "@anthropic-ai/sdk";
import { readMemory, writeMemory } from "../tools/memory.js";
import { getSystemPrompt } from "./system-prompt.js";

const client = new Anthropic();

export async function runOrchestrator(userRequest, sessionContext = {}) {
  // Step 1: Load relevant memory
  const memories = await readMemory({
    query: userRequest,
    limit: 10,
  });

  // Step 2: Build context-rich system prompt
  const systemPrompt = getSystemPrompt({
    memories,
    sessionContext,
  });

  // Step 3: Run orchestrator with tools (sub-agents + direct tools)
  const response = await client.messages.create({
    model: "claude-opus-4-6",          // Orchestrator uses the best model
    max_tokens: 8096,
    system: systemPrompt,
    tools: [
      {
        name: "delegate_to_researcher",
        description: "Delegate research tasks to the research specialist",
        input_schema: {
          type: "object",
          properties: {
            query: { type: "string", description: "What to research" },
            depth: { type: "string", enum: ["surface", "deep"] },
          },
          required: ["query"],
        },
      },
      {
        name: "delegate_to_coder",
        description: "Delegate coding tasks to the engineering specialist",
        input_schema: {
          type: "object",
          properties: {
            task: { type: "string" },
            language: { type: "string" },
            output_type: { type: "string", enum: ["file", "snippet", "review"] },
          },
          required: ["task"],
        },
      },
      {
        name: "write_memory",
        description: "Save important insights to long-term memory",
        input_schema: {
          type: "object",
          properties: {
            key: { type: "string" },
            content: { type: "string" },
            entity: { type: "string", description: "Who/what this is about" },
          },
          required: ["key", "content"],
        },
      },
    ],
    messages: [{ role: "user", content: userRequest }],
  });

  // Step 4: Process tool calls (run sub-agents)
  return await processToolCalls(response, client);
}
```

-----

## 4. Memory Architecture

### 4.1 The Three Layers of Memory

Think of memory like your own cognitive architecture:

|Layer              |Duration       |What it holds                       |Implementation          |
|-------------------|---------------|------------------------------------|------------------------|
|**Working memory** |Current session|Active conversation context         |Claude context window   |
|**Episodic memory**|Months/years   |“What happened, when, with who”     |Graphiti (graph-based)  |
|**Semantic memory**|Permanent      |Facts, preferences, domain knowledge|ChromaDB (vector search)|

### 4.2 Graphiti Setup (Episodic Memory)

Graphiti stores knowledge as a temporal graph — meaning it knows *when* things happened and how facts evolved over time. Perfect for your exo-cortex vision.

```yaml
# docker-compose.yml
version: "3.9"
services:
  neo4j:
    image: neo4j:5.15
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/your-password
      NEO4J_PLUGINS: '["apoc"]'
    volumes:
      - neo4j_data:/data

  graphiti:
    image: zepai/graphiti:latest
    ports:
      - "8000:8000"
    environment:
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASSWORD: your-password
      OPENAI_API_KEY: ${OPENAI_API_KEY}    # Graphiti uses this for embeddings
      # Or: ANTHROPIC_API_KEY for Claude embeddings
    depends_on:
      - neo4j

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  neo4j_data:
  chroma_data:
```

### 4.3 Memory Tool Implementation (`tools/memory.js`)

```javascript
// tools/memory.js — Your agent's filing cabinet interface

const GRAPHITI_URL = process.env.GRAPHITI_URL || "http://localhost:8000";

export async function writeMemory({ key, content, entity, metadata = {} }) {
  const episode = {
    name: key,
    episode_body: content,
    reference_time: new Date().toISOString(),
    source_description: `Agent session — ${entity || "general"}`,
    metadata,
  };

  const response = await fetch(`${GRAPHITI_URL}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(episode),
  });

  return response.json();
}

export async function readMemory({ query, limit = 5, entity = null }) {
  const params = new URLSearchParams({
    query,
    num_results: limit,
    ...(entity && { center_node_uuid: entity }),
  });

  const response = await fetch(`${GRAPHITI_URL}/search?${params}`);
  const data = await response.json();

  // Return formatted for injection into system prompt
  return data.results?.map((r) => ({
    content: r.fact,
    relevance: r.score,
    timestamp: r.created_at,
  }));
}

// Inject memories into system prompt
export function formatMemoriesForPrompt(memories = []) {
  if (!memories.length) return "";

  return `
## Relevant Memory (from previous sessions)
${memories.map((m) => `- [${m.timestamp?.slice(0, 10)}] ${m.content}`).join("\n")}
  `.trim();
}
```

-----

## 5. MCP Server Configuration

MCP servers are the “phone lines” between your agent and capabilities. Configure them in Claude Code’s settings.

### 5.1 Claude Code MCP Config (`.claude/settings.json`)

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["./mcp-servers/memory/index.js"],
      "env": {
        "GRAPHITI_URL": "http://localhost:8000"
      }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_SEARCH_API_KEY}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/home/malik/agent-workspace"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_API_TOKEN": "${NOTION_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  },
  "permissions": {
    "allow": [
      "mcp__memory__*",
      "mcp__filesystem__read_file",
      "mcp__filesystem__write_file",
      "mcp__brave-search__*",
      "mcp__github__*",
      "mcp__playwright__*"
    ]
  }
}
```

### 5.2 Custom Memory MCP Server (`mcp-servers/memory/index.js`)

```javascript
// mcp-servers/memory/index.js
// Exposes Graphiti to Claude Code as an MCP tool

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { writeMemory, readMemory } from "../../tools/memory.js";

const server = new Server(
  { name: "memory", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "memory_write",
      description: "Save information to long-term memory (Graphiti)",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "Unique identifier for this memory" },
          content: { type: "string", description: "The information to remember" },
          entity: { type: "string", description: "Who or what this is about" },
        },
        required: ["key", "content"],
      },
    },
    {
      name: "memory_search",
      description: "Search long-term memory for relevant information",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number", default: 5 },
        },
        required: ["query"],
      },
    },
  ],
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "memory_write") {
    const result = await writeMemory(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  if (name === "memory_search") {
    const results = await readMemory(args);
    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

-----

## 6. Custom Slash Commands

These are reusable prompts you invoke with `/command-name` inside Claude Code.

### 6.1 Research Command (`.claude/commands/research.md`)

```markdown
---
description: Deep research on any topic, output structured intelligence brief
argument-hint: <topic to research>
---

You are activating the Research Agent protocol.

**Topic:** $ARGUMENTS

Execute the following research workflow:

1. Search long-term memory for any prior research on this topic
2. Conduct web searches (minimum 5 queries from different angles)
3. Synthesize findings into a structured intelligence brief
4. Save key insights to memory with key: `research:[topic-slug]:[date]`

**Output format:**
## Intelligence Brief: [Topic]
**Date:** [today]
**Confidence:** [high/medium/low]

### Executive Summary (3 sentences max)

### Key Findings
- Finding 1 (Source: ...)
- Finding 2 (Source: ...)

### Implications for [BuilderBee/Centaurion/AOB]

### Recommended Actions

### Sources
```

### 6.2 Marketing Pipeline Command (`.claude/commands/programmatic-ad.md`)

```markdown
---
description: Generate a programmatic ad content pipeline (Cody Schneider method)
argument-hint: <niche or product>
---

You are activating the Programmatic Ad Pipeline for: $ARGUMENTS

Follow this sequence:

1. Research the niche: pain points, language, competitors
2. Generate 20 content angles (problems, solutions, objections)
3. For each angle, create:
   - Hook (first 3 seconds)
   - Body (problem → agitate → solve)
   - CTA
4. Cluster into 5 campaign themes
5. Output as structured JSON ready for ad platform upload

Save the campaign brief to memory: `marketing:ad-campaign:[niche]:[date]`
```

### 6.3 Daily Standup Command (`.claude/commands/standup.md`)

```markdown
---
description: Generate daily standup for all active projects
---

Review context and generate a daily standup covering:

1. Read memory for: AOB pilot, BuilderBee tasks, Centaurion.me tasks
2. Check any open GitHub issues (via GitHub MCP)
3. Check Monday.com for overdue tasks
4. Generate standup in format:

## Daily Standup — [Date]

**Yesterday:** [completed items]
**Today:** [planned items]  
**Blockers:** [anything stuck]
**Decisions needed:** [items requiring Malik's input]

Save standup to memory: `standup:[date]`
```

-----

## 7. Workflow Orchestration — Trigger.dev vs Alternatives

### 7.1 The Honest Comparison

|Tool           |Best For                                          |Trade-offs                          |
|---------------|--------------------------------------------------|------------------------------------|
|**Trigger.dev**|Event-driven workflows, great DX, self-hostable   |Requires Node.js, newer ecosystem   |
|**n8n**        |Visual no-code workflows, huge integration library|Heavier, less code-native           |
|**Temporal**   |Complex long-running workflows, enterprise-grade  |Steep learning curve                |
|**BullMQ**     |Simple queue-based jobs, Redis-backed             |No built-in UI, you build everything|

**Recommendation for your stack:** Use **Trigger.dev v3** (self-hostable) for complex workflows + **BullMQ** for simple background jobs. Trigger.dev speaks native TypeScript/JavaScript and has first-class durable execution — meaning if a 30-minute AI workflow crashes, it resumes from where it stopped.

### 7.2 Trigger.dev Workflow Example (`workflows/marketing-pipeline.ts`)

```typescript
// workflows/marketing-pipeline.ts
import { task, wait } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Sub-task: Research phase
export const researchTask = task({
  id: "research-niche",
  maxDuration: 300, // 5 minutes
  run: async (payload: { niche: string; sessionId: string }) => {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: "You are a market research specialist...",
      messages: [
        {
          role: "user",
          content: `Research the ${payload.niche} market. Return JSON with: pain_points, language_patterns, competitors, content_angles`,
        },
      ],
    });

    return JSON.parse(response.content[0].text);
  },
});

// Sub-task: Content generation
export const contentGenerationTask = task({
  id: "generate-ad-content",
  maxDuration: 600,
  run: async (payload: { research: object; niche: string }) => {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8096,
      system: "You are a direct response copywriter...",
      messages: [
        {
          role: "user",
          content: `Based on this research: ${JSON.stringify(payload.research)}\n\nGenerate 20 ad variations for ${payload.niche}`,
        },
      ],
    });

    return response.content[0].text;
  },
});

// Orchestrator task
export const marketingPipelineTask = task({
  id: "marketing-pipeline",
  run: async (payload: { niche: string; userId: string }) => {
    console.log(`Starting marketing pipeline for: ${payload.niche}`);

    // Phase 1: Research (runs sub-task, waits for result)
    const research = await researchTask.triggerAndWait({
      niche: payload.niche,
      sessionId: crypto.randomUUID(),
    });

    // Phase 2: Content generation (parallel)
    const [adContent, seoContent] = await Promise.all([
      contentGenerationTask.triggerAndWait({
        research: research.output,
        niche: payload.niche,
      }),
      // Add more parallel tasks here
    ]);

    // Phase 3: Save to memory
    await saveToMemoryTask.triggerAndWait({
      key: `marketing:pipeline:${payload.niche}:${Date.now()}`,
      content: JSON.stringify({ research: research.output, adContent }),
    });

    return {
      success: true,
      niche: payload.niche,
      contentPieces: 20,
    };
  },
});
```

-----

## 8. VPS Deployment (Hostinger) — Data Sovereignty Setup

### 8.1 VPS Architecture Overview

```
Hostinger VPS (your sovereign infrastructure)
├── nginx (reverse proxy + SSL)
├── Docker Compose
│   ├── neo4j (graph database — Graphiti backend)
│   ├── chroma (vector database)
│   ├── graphiti (memory service)
│   ├── trigger-dev (workflow orchestrator)
│   ├── postgres (Trigger.dev database)
│   └── redis (queues + caching)
└── Caddy OR nginx (with Let's Encrypt SSL)
```

### 8.2 VPS Provisioning Script

```bash
#!/bin/bash
# scripts/provision-vps.sh
# Run once on fresh Hostinger VPS

set -e

echo "=== Provisioning Agent Infrastructure ==="

# 1. System updates
apt-get update && apt-get upgrade -y

# 2. Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
usermod -aG docker $USER

# 3. Docker Compose v2
apt-get install docker-compose-plugin -y

# 4. Nginx
apt-get install nginx certbot python3-certbot-nginx -y

# 5. Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install nodejs -y

# 6. Create app directory
mkdir -p /opt/agent-system
chown -R $USER:$USER /opt/agent-system

# 7. Firewall
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw --force enable

echo "=== Provisioning complete ==="
```

### 8.3 Production Docker Compose (`docker-compose.prod.yml`)

```yaml
version: "3.9"

networks:
  agent-net:
    driver: bridge

volumes:
  neo4j_data:
  chroma_data:
  postgres_data:
  redis_data:

services:
  # === Memory Layer ===
  neo4j:
    image: neo4j:5.15
    restart: always
    networks: [agent-net]
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
      NEO4J_dbms_memory_heap_initial__size: 512m
      NEO4J_dbms_memory_heap_max__size: 2g
    volumes:
      - neo4j_data:/data
    # NOT exposed externally — only internal network

  graphiti:
    image: zepai/graphiti:latest
    restart: always
    networks: [agent-net]
    ports:
      - "127.0.0.1:8000:8000"    # Localhost only
    environment:
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASSWORD: ${NEO4J_PASSWORD}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      - neo4j

  chroma:
    image: chromadb/chroma:latest
    restart: always
    networks: [agent-net]
    ports:
      - "127.0.0.1:8001:8000"
    volumes:
      - chroma_data:/chroma/chroma

  # === Orchestration Layer ===
  postgres:
    image: postgres:16
    restart: always
    networks: [agent-net]
    environment:
      POSTGRES_USER: trigger
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: trigger_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    networks: [agent-net]
    volumes:
      - redis_data:/data

  trigger-webapp:
    image: ghcr.io/triggerdotdev/trigger.dev:latest
    restart: always
    networks: [agent-net]
    ports:
      - "127.0.0.1:3040:3000"
    environment:
      DATABASE_URL: postgresql://trigger:${POSTGRES_PASSWORD}@postgres:5432/trigger_dev
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${TRIGGER_SECRET_KEY}
      MAGIC_LINK_SECRET: ${TRIGGER_MAGIC_LINK_SECRET}
      ENCRYPTION_KEY: ${TRIGGER_ENCRYPTION_KEY}
      APP_ORIGIN: https://trigger.yourdomain.com
      LOGIN_ORIGIN: https://trigger.yourdomain.com
      NODE_ENV: production
    depends_on:
      - postgres
      - redis

  # === Agent API ===
  agent-api:
    build: .
    restart: always
    networks: [agent-net]
    ports:
      - "127.0.0.1:3050:3000"
    environment:
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      GRAPHITI_URL: http://graphiti:8000
      CHROMA_HOST: chroma
      CHROMA_PORT: 8000
      NODE_ENV: production
    volumes:
      - ./agents:/app/agents:ro
      - ./tools:/app/tools:ro
```

### 8.4 Nginx Configuration (`/etc/nginx/sites-available/agent-system`)

```nginx
# Trigger.dev UI
server {
    listen 443 ssl;
    server_name trigger.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:3040;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Agent API
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # API key authentication at nginx level
    location / {
        if ($http_x_api_key != "${AGENT_API_KEY}") {
            return 401;
        }
        proxy_pass http://127.0.0.1:3050;
        proxy_set_header Host $host;
    }
}
```

### 8.5 Deployment Script (`scripts/deploy.sh`)

```bash
#!/bin/bash
# scripts/deploy.sh — run from local machine to deploy to VPS

set -e

VPS_HOST=${VPS_HOST:-"your-vps-ip"}
VPS_USER=${VPS_USER:-"malik"}
APP_DIR="/opt/agent-system"

echo "=== Deploying to $VPS_HOST ==="

# 1. Sync files (exclude secrets)
rsync -avz --exclude='.env' --exclude='node_modules' --exclude='.git' \
  ./ ${VPS_USER}@${VPS_HOST}:${APP_DIR}/

# 2. SSH and deploy
ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
  cd /opt/agent-system
  
  # Pull new images
  docker compose -f docker-compose.prod.yml pull
  
  # Rolling restart (zero downtime)
  docker compose -f docker-compose.prod.yml up -d --no-deps agent-api trigger-webapp
  
  # Health check
  sleep 5
  curl -f http://localhost:3050/health || echo "Warning: API health check failed"
  
  echo "Deployment complete"
EOF
```

-----

## 9. Complete File Checklist

Use this as your implementation progress tracker:

```
Phase 1 — Foundation (Days 1-2)
  [ ] Hostinger VPS provisioned (provision-vps.sh)
  [ ] Docker + Compose installed
  [ ] .env file configured with all keys
  [ ] docker-compose.prod.yml deployed
  [ ] neo4j + graphiti running and reachable
  [ ] SSL certificates issued (certbot)

Phase 2 — Claude Code Setup (Days 2-3)  
  [ ] Root CLAUDE.md written
  [ ] .claude/settings.json with MCP servers
  [ ] Memory MCP server running
  [ ] Brave Search MCP configured
  [ ] GitHub MCP configured
  [ ] Claude Code successfully using memory (test: /memory_search "malik")

Phase 3 — Agent Architecture (Days 3-5)
  [ ] Orchestrator agent written
  [ ] Researcher sub-agent written + CLAUDE.md
  [ ] Coder sub-agent written + CLAUDE.md
  [ ] Marketer sub-agent written + CLAUDE.md
  [ ] PM sub-agent written + CLAUDE.md
  [ ] Tool delegation tested end-to-end

Phase 4 — Custom Commands (Days 4-5)
  [ ] /research command working
  [ ] /standup command working
  [ ] /programmatic-ad command working
  [ ] All commands verified against memory MCP

Phase 5 — Workflow Orchestration (Days 5-7)
  [ ] Trigger.dev self-hosted and accessible
  [ ] marketing-pipeline.ts deployed
  [ ] First workflow run successfully
  [ ] Workflow triggerable via API endpoint

Phase 6 — Hardening (Days 7-10)
  [ ] Nginx + SSL fully configured
  [ ] API key auth on all public endpoints
  [ ] Log aggregation setup (optional: Loki)
  [ ] Backup cron for neo4j + postgres
  [ ] Monitoring (optional: Uptime Kuma)
```

-----

## 10. Quick Start Commands

```bash
# Clone and bootstrap
git clone [your-repo] agent-workspace
cd agent-workspace
cp .env.example .env
# → Fill in .env

# Start local dev environment
docker compose up -d

# Install dependencies
npm install

# Test memory is working
node -e "import('./tools/memory.js').then(m => m.writeMemory({key: 'test', content: 'hello world'}))"

# Start Claude Code in this workspace
claude

# Try your first agent command
# (Inside Claude Code)
# /research "best JavaScript frameworks for agent tools in 2025"
```

-----

*This playbook is a living document. Update CLAUDE.md as your agent’s capabilities grow. The architecture is designed to be modular — you can add new sub-agents, MCP servers, and workflows without touching existing ones.*

**Version 1.0 — February 2025**
