// agents/pm/index.js
// Project Management specialist sub-agent.
// Generates standups, prioritization matrices, and project status reports.

import Anthropic from "@anthropic-ai/sdk";
import { readMemory } from "../../tools/memory.js";

const client = new Anthropic();

const PM_SYSTEM_PROMPT = `
You are the Project Management specialist for Malik's agent system.

Active projects:
- BuilderBee: AI automation tools and consulting
- Centaurion.me: Human-AI augmentation consulting
- AOB (Alchemy of Breath): Breathwork training organization

PM principles:
- Eisenhower matrix: Urgent+Important → Do Now
- Surface the 1 most critical decision needed today
- Blockers get escalated — never buried
- Lead with bottom line, then details

Return structured JSON matching the appropriate output contract.
`.trim();

/**
 * Run the PM sub-agent on a given task.
 *
 * @param {object} task
 * @param {string} task.task  - "standup"|"prioritize"|"plan"|"status"|"retrospective"
 * @param {string} [task.project]
 * @param {string} [task.context]
 */
export async function runPM(task) {
  // Load project memory for context
  const projectMemory = await readMemory({
    query: `${task.project ?? "all projects"} status tasks`,
    limit: 5,
  }).catch(() => []);

  const memoryContext =
    projectMemory.length > 0
      ? `\nRecent memory:\n${projectMemory.map((m) => `- ${m.content}`).join("\n")}`
      : "";

  const userMessage = `
PM task:
${JSON.stringify(task, null, 2)}
${memoryContext}

Return ONLY valid JSON. No extra text.
  `.trim();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: PM_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = response.content[0].text;

  try {
    return JSON.parse(rawText);
  } catch {
    return { raw_output: rawText };
  }
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runPM({ task: "standup", project: "all" })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch(console.error);
}
