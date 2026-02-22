// agents/orchestrator/index.js
// The "city dispatcher" — routes tasks to specialist sub-agents.
// Entry point for the agent system.

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { readMemory, writeMemory } from "../../tools/memory.js";
import { getSystemPrompt } from "./system-prompt.js";

const client = new Anthropic();
const MEMORY_TIMEOUT_MS = 5000; // readMemory gets 5 s before we proceed without it
const MAX_LOOP_TURNS = 20;       // safety ceiling on the agentic loop

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Tool definitions for the orchestrator.
 * Each tool represents a sub-agent the orchestrator can delegate to.
 */
const ORCHESTRATOR_TOOLS = [
  {
    name: "delegate_to_researcher",
    description:
      "Delegate research tasks to the research specialist. Use for: market research, competitive analysis, fact-finding, technical overviews.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to research" },
        depth: {
          type: "string",
          enum: ["surface", "deep"],
          description: "surface = quick overview, deep = comprehensive analysis",
        },
        format: {
          type: "string",
          enum: ["brief", "detailed", "structured"],
          description: "Output format",
        },
        context: {
          type: "string",
          description: "Background context to give the researcher",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "delegate_to_coder",
    description:
      "Delegate coding tasks to the engineering specialist. Use for: code generation, debugging, architecture design, code review.",
    input_schema: {
      type: "object",
      properties: {
        task: { type: "string", description: "The coding task description" },
        language: { type: "string", description: "Programming language" },
        output_type: {
          type: "string",
          enum: ["file", "snippet", "review", "architecture"],
        },
        context: { type: "string", description: "Existing code or context" },
      },
      required: ["task"],
    },
  },
  {
    name: "delegate_to_writer",
    description:
      "Delegate writing tasks to the content specialist. Use for: blog posts, copy, documentation, emails, social content.",
    input_schema: {
      type: "object",
      properties: {
        task: { type: "string", description: "What to write" },
        format: {
          type: "string",
          description: "Output format: blog, email, social, doc, etc.",
        },
        tone: {
          type: "string",
          description: "Tone: professional, casual, technical, persuasive",
        },
        audience: { type: "string", description: "Target audience" },
        context: { type: "string", description: "Background/brief" },
      },
      required: ["task"],
    },
  },
  {
    name: "delegate_to_marketer",
    description:
      "Delegate marketing tasks to the marketing specialist. Use for: ad campaigns, content pipelines, growth strategies, campaign briefs.",
    input_schema: {
      type: "object",
      properties: {
        task: { type: "string", description: "The marketing task" },
        niche: { type: "string", description: "Niche or product" },
        platform: {
          type: "string",
          description: "Target platform: meta, tiktok, google, email, etc.",
        },
        budget_tier: {
          type: "string",
          enum: ["bootstrap", "growth", "scale"],
        },
      },
      required: ["task"],
    },
  },
  {
    name: "delegate_to_pm",
    description:
      "Delegate project management tasks to the PM specialist. Use for: standups, task prioritization, project planning, sprint management.",
    input_schema: {
      type: "object",
      properties: {
        task: { type: "string", description: "The PM task" },
        project: { type: "string", description: "Project name" },
        context: { type: "string", description: "Current project state" },
      },
      required: ["task"],
    },
  },
  {
    name: "write_memory",
    description:
      "Save important insights, decisions, or milestones to long-term memory (Graphiti).",
    input_schema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Memory key in format [entity]:[type]:[YYYY-MM]. Example: aob:decision:crm-2025-02",
        },
        content: { type: "string", description: "The information to remember" },
        entity: {
          type: "string",
          description:
            "Who or what this is about: malik, builderbee, centaurion, aob, or a person/project name",
        },
      },
      required: ["key", "content"],
    },
  },
];

/**
 * Process tool calls from the orchestrator's response.
 * Routes each tool call to the appropriate handler.
 */
async function processToolCalls(response, messages) {
  const toolResults = [];

  for (const block of response.content) {
    if (block.type !== "tool_use") continue;

    const { name, input, id } = block;
    let result;

    try {
      if (name === "write_memory") {
        await writeMemory(input);
        result = { success: true, key: input.key };
      } else {
        result = await delegateToSubAgent(name, input);
      }
    } catch (err) {
      console.error(`[orchestrator] tool "${name}" failed:`, err.message);
      result = { error: err.message, tool: name };
    }

    toolResults.push({
      type: "tool_result",
      tool_use_id: id,
      content: JSON.stringify(result),
    });
  }

  return toolResults;
}

/**
 * Delegate a task to a specialist sub-agent.
 * In production this spawns a Claude process with the sub-agent's CLAUDE.md.
 */
async function delegateToSubAgent(toolName, input) {
  const agentMap = {
    delegate_to_researcher: "researcher",
    delegate_to_coder: "coder",
    delegate_to_writer: "writer",
    delegate_to_marketer: "marketer",
    delegate_to_pm: "pm",
  };

  const agentName = agentMap[toolName];
  if (!agentName) throw new Error(`Unknown tool: ${toolName}`);

  // Build a focused prompt for the sub-agent (also creates output dir)
  const subAgentPrompt = await buildSubAgentPrompt(agentName, input);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are the ${agentName} specialist. Complete the task concisely and return structured output.`,
    messages: [{ role: "user", content: subAgentPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error(`${agentName} returned no text content`);

  const output = textBlock.text;
  const taskId = JSON.parse(subAgentPrompt).task_id;
  const outputPath = path.join("/tmp/agent-outputs", taskId, "result.json");

  // Persist output to disk so it can be verified and audited
  await fs.writeFile(
    outputPath,
    JSON.stringify({ agent: agentName, output, timestamp: new Date().toISOString() }, null, 2)
  );

  console.error(`[orchestrator] ${agentName} complete — ${response.usage.output_tokens} tokens → ${outputPath}`);

  return {
    agent: agentName,
    output,
    tokens_used: response.usage.output_tokens,
    output_path: outputPath,
  };
}

async function buildSubAgentPrompt(agentName, input) {
  const taskId = `${agentName}-${Date.now()}`;
  const outputDir = path.join("/tmp/agent-outputs", taskId);
  const outputPath = path.join(outputDir, "result.json");

  // Guarantee the output directory exists before sub-agent runs
  await fs.mkdir(outputDir, { recursive: true });

  return JSON.stringify({
    task_id: taskId,
    output_path: outputPath,
    ...input,
  });
}

/**
 * Main orchestrator loop.
 *
 * @param {string} userRequest   - The user's request
 * @param {object} sessionContext - Optional extra context
 */
export async function runOrchestrator(userRequest, sessionContext = {}) {
  // Step 1: Load relevant memory — bounded by timeout so a slow/down Graphiti
  // doesn't stall the orchestrator indefinitely.
  const memories = await withTimeout(
    readMemory({ query: userRequest, limit: 10 }),
    MEMORY_TIMEOUT_MS,
    "readMemory"
  ).catch((err) => {
    console.error("[orchestrator] memory read failed (proceeding without):", err.message);
    return [];
  });

  // Step 2: Build context-rich system prompt
  const systemPrompt = getSystemPrompt({ memories, sessionContext });

  // Step 3: Agentic loop (capped at MAX_LOOP_TURNS to prevent runaway spending)
  const messages = [{ role: "user", content: userRequest }];
  let turns = 0;

  while (turns < MAX_LOOP_TURNS) {
    turns++;
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8096,
      system: systemPrompt,
      tools: ORCHESTRATOR_TOOLS,
      messages,
    });

    // Push assistant turn to messages
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "";
    }

    if (response.stop_reason === "tool_use") {
      const toolResults = await processToolCalls(response, messages);
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop reason — surface it rather than silently returning undefined
    throw new Error(`Orchestrator stopped with unexpected reason: ${response.stop_reason}`);
  }

  throw new Error(`Orchestrator exceeded MAX_LOOP_TURNS (${MAX_LOOP_TURNS}) — possible infinite loop`);
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const request = process.argv.slice(2).join(" ") || "What are my active projects?";
  console.log(`\nOrchestrator request: ${request}\n`);
  runOrchestrator(request)
    .then((result) => console.log("\nResponse:\n", result))
    .catch(console.error);
}
