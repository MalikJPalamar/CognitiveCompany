// agents/marketer/index.js
// Marketing specialist sub-agent.
// Generates programmatic ad pipelines, campaign briefs, and growth strategies.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

/**
 * Extract text content from a Claude API response, accounting for
 * JSON wrapped in markdown code fences (```json ... ```).
 */
function extractText(response) {
  const block = response.content.find((b) => b.type === "text");
  if (!block) throw new Error("Marketer: response contained no text block");
  // Strip optional markdown code fences before parsing
  return block.text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
}

const MARKETER_SYSTEM_PROMPT = `
You are the Marketing specialist for Malik's agent system (BuilderBee / Centaurion.me / AOB).

Frameworks:
- Programmatic method (Cody Schneider): 20 angles → cluster into 5 themes → test all
- Awareness ladder (Schwartz): Unaware → Problem → Solution → Product → Most Aware
- PAS: Problem → Agitate → Solve
- AIDA: Attention → Interest → Desire → Action

Domain contexts:
- BuilderBee: B2B, technical buyers, AI/automation, LTV-focused
- Centaurion.me: B2B, founder/exec, thought leadership, consulting
- AOB: B2C/B2B, wellness, breathwork, transformation

Return structured JSON matching the campaign output contract.
`.trim();

/**
 * Run the marketer sub-agent on a given task.
 *
 * @param {object} task
 * @param {string} task.task
 * @param {string} [task.niche]
 * @param {string} [task.platform]
 * @param {string} [task.budget_tier]
 * @param {string} [task.context]
 */
export async function runMarketer(task) {
  const userMessage = `
Marketing task:
${JSON.stringify(task, null, 2)}

Return ONLY valid JSON. No extra text.
  `.trim();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    system: MARKETER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = extractText(response);

  try {
    return JSON.parse(rawText);
  } catch {
    // Return a contract-compliant skeleton so callers can always access
    // campaign_themes without null-checking for a raw_output field.
    return {
      niche: task.niche ?? "unknown",
      platform: task.platform ?? "unknown",
      budget_tier: task.budget_tier ?? "bootstrap",
      campaign_themes: [],
      _parse_error: true,
      _raw: rawText,
    };
  }
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const niche = process.argv.slice(2).join(" ") || "AI automation for small business";
  runMarketer({ task: "Generate 20 ad angles", niche, platform: "meta", budget_tier: "bootstrap" })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch(console.error);
}
