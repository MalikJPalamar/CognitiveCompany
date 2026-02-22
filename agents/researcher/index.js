// agents/researcher/index.js
// Research specialist sub-agent.
// Receives a structured task, performs web research, returns structured output.

import Anthropic from "@anthropic-ai/sdk";
import { readMemory } from "../../tools/memory.js";

const client = new Anthropic();

const RESEARCHER_SYSTEM_PROMPT = `
You are the Research specialist for Malik's agent system.

Your job: gather, synthesize, and return structured intelligence.

Rules:
- Cite sources for every claim
- Flag contradictions between sources explicitly
- Do NOT editorialize — report facts and label your confidence
- Minimum 5 searches for "surface" depth, 10+ for "deep"
- Return valid JSON matching the output contract

Output contract:
{
  "query": "original query",
  "summary": "2-3 sentence synthesis",
  "key_findings": ["finding (Source: ...)"],
  "sources": [{"title": "", "url": "", "relevance": "high|medium|low"}],
  "confidence": "high|medium|low",
  "contradictions": ["any conflicting info"],
  "recommended_next_steps": []
}
`.trim();

/**
 * Run the researcher sub-agent on a given task.
 *
 * @param {object} task
 * @param {string} task.query
 * @param {string} [task.depth="surface"]
 * @param {string} [task.format="structured"]
 * @param {string} [task.context]
 */
export async function runResearcher(task) {
  // Check memory for prior research on this topic
  const priorMemory = await readMemory({ query: task.query, limit: 3 }).catch(() => []);
  const memoryNote =
    priorMemory.length > 0
      ? `\n\nPrior research found:\n${priorMemory.map((m) => `- ${m.content}`).join("\n")}`
      : "";

  const userMessage = `
Research task:
${JSON.stringify(task, null, 2)}
${memoryNote}

Return ONLY valid JSON matching the output contract. No extra text.
  `.trim();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: RESEARCHER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = response.content[0].text;

  try {
    return JSON.parse(rawText);
  } catch {
    // If the model returned non-JSON, wrap it
    return {
      query: task.query,
      summary: rawText,
      key_findings: [],
      sources: [],
      confidence: "low",
      contradictions: [],
      recommended_next_steps: [],
    };
  }
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const query = process.argv.slice(2).join(" ") || "AI agent frameworks 2025";
  runResearcher({ query, depth: "surface", format: "structured" })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch(console.error);
}
