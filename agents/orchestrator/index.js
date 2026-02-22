// agents/orchestrator/index.js
// The "city dispatcher" — routes tasks to specialist sub-agents.
// Entry point for the agent system.

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { readMemory, writeMemory } from "../../tools/memory.js";
import { getSystemPrompt } from "./system-prompt.js";

const client = new Anthropic();

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
        result = await writeMemory(input);
        result = { success: true, key: input.key };
      } else {
        // Sub-agent delegation — in a full implementation these would
        // spawn actual sub-agent processes using the Task tool or spawn().
        // Here we return a structured placeholder that shows the pattern.
        result = await delegateToSubAgent(name, input);
      }
    } catch (err) {
      result = { error: err.message };
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

  return {
    agent: agentName,
    output: response.content[0].text,
    tokens_used: response.usage.output_tokens,
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
  // Step 1: Load relevant memory
  const memories = await readMemory({
    query: userRequest,
    limit: 10,
  }).catch(() => []); // Gracefully degrade if memory service is down

  // Step 2: Build context-rich system prompt
  const systemPrompt = getSystemPrompt({ memories, sessionContext });

  // Step 3: Agentic loop
  const messages = [{ role: "user", content: userRequest }];

  while (true) {
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
      // Final text response
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "";
    }

    if (response.stop_reason === "tool_use") {
      const toolResults = await processToolCalls(response, messages);
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop reason
    break;
  }
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const request = process.argv.slice(2).join(" ") || "What are my active projects?";
  console.log(`\nOrchestrator request: ${request}\n`);
  runOrchestrator(request)
    .then((result) => console.log("\nResponse:\n", result))
    .catch(console.error);
}
