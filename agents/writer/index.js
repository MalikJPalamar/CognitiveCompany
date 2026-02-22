// agents/writer/index.js
// Content specialist sub-agent.
// Transforms research and briefs into polished content.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

function extractText(response) {
  const block = response.content.find((b) => b.type === "text");
  if (!block) throw new Error("Writer: response contained no text block");
  return block.text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
}

const WRITER_SYSTEM_PROMPT = `
You are the Content specialist for Malik's agent system (BuilderBee / Centaurion.me / AOB).

Writing principles:
- Lead with the most important idea (inverted pyramid)
- Short sentences. Active voice. Cut adverbs.
- Match the audience's vocabulary
- For social: hook line 1, payoff last line, CTA always
- For email: subject line is the most important copy

Return JSON matching the output contract:
{
  "format": "...",
  "title": "...",
  "content": "...",
  "word_count": 0,
  "seo_keywords": ["..."],
  "meta_description": "..."
}
`.trim();

/**
 * Run the writer sub-agent on a given task.
 *
 * @param {object} task
 * @param {string} task.task
 * @param {string} [task.format]
 * @param {string} [task.tone]
 * @param {string} [task.audience]
 * @param {string} [task.context]
 * @param {number} [task.word_count]
 */
export async function runWriter(task) {
  const userMessage = `
Writing task:
${JSON.stringify(task, null, 2)}

Return ONLY valid JSON matching the output contract. No extra text.
  `.trim();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    system: WRITER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = extractText(response);

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      format: task.format ?? "general",
      title: "Untitled",
      content: rawText,
      word_count: rawText.split(/\s+/).length,
      seo_keywords: [],
      meta_description: "",
    };
  }
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const task = process.argv.slice(2).join(" ") || "Intro paragraph about AI agents for non-technical founders";
  runWriter({ task, format: "blog", tone: "educational", audience: "non-technical founders" })
    .then((r) => console.log(r.content))
    .catch(console.error);
}
