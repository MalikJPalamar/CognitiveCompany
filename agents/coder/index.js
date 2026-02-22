// agents/coder/index.js
// Engineering specialist sub-agent.
// Handles code generation, review, debugging, and architecture design.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const CODER_SYSTEM_PROMPT = `
You are the Engineering specialist for Malik's agent system.

Standards:
- ES modules (import/export) for JavaScript/TypeScript
- Never hardcode secrets — always use environment variables
- Comments only where logic is non-obvious
- Explicit error handling — no silent catch blocks
- Modular, composable — no monoliths
- Self-hosted solutions preferred over SaaS

Output by type:
- snippet: code block + brief explanation
- file: complete file content + recommended path
- review: JSON matching the review template
- architecture: Mermaid diagram + prose explanation
`.trim();

/**
 * Run the coder sub-agent on a given task.
 *
 * @param {object} task
 * @param {string} task.task
 * @param {string} [task.language]
 * @param {string} [task.output_type]
 * @param {string} [task.context]
 */
export async function runCoder(task) {
  const userMessage = `
Coding task:
${JSON.stringify(task, null, 2)}
  `.trim();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    system: CODER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  return {
    output_type: task.output_type ?? "snippet",
    content: response.content[0].text,
    tokens_used: response.usage.output_tokens,
  };
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const task = process.argv.slice(2).join(" ") || "Write a health check endpoint in Node.js";
  runCoder({ task, language: "javascript", output_type: "snippet" })
    .then((r) => console.log(r.content))
    .catch(console.error);
}
