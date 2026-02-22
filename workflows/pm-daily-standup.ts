// workflows/pm-daily-standup.ts
// Trigger.dev workflow for automated daily standup generation.
// Can be triggered on a cron schedule or manually.

import { task, schedules, logger } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const GRAPHITI_URL = process.env.GRAPHITI_URL ?? "http://localhost:8000";

async function searchMemory(query: string, limit = 5): Promise<Array<{ content: string; timestamp: string }>> {
  const params = new URLSearchParams({ query, num_results: String(limit) });
  const response = await fetch(`${GRAPHITI_URL}/search?${params}`);
  if (!response.ok) return [];
  const data = (await response.json()) as { results?: Array<{ fact: string; created_at: string }> };
  return (data.results ?? []).map((r) => ({ content: r.fact, timestamp: r.created_at }));
}

async function writeMemory(key: string, content: string): Promise<void> {
  await fetch(`${GRAPHITI_URL}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: key,
      episode_body: content,
      reference_time: new Date().toISOString(),
      source_description: "pm-daily-standup workflow",
    }),
  });
}

export const dailyStandupTask = task({
  id: "pm-daily-standup",
  maxDuration: 300,
  run: async (payload: { userId?: string } = {}) => {
    const today = new Date().toISOString().slice(0, 10);
    logger.info("Generating daily standup", { date: today });

    // Pull recent memory for all three domains
    const [aobMemory, builderbeeMemory, centaurionMemory] = await Promise.all([
      searchMemory("AOB Alchemy of Breath tasks status"),
      searchMemory("BuilderBee tasks status progress"),
      searchMemory("Centaurion tasks status progress"),
    ]);

    const memoryContext = [
      aobMemory.length > 0
        ? `AOB Memory:\n${aobMemory.map((m) => `- ${m.content}`).join("\n")}`
        : "AOB: No recent memory found.",
      builderbeeMemory.length > 0
        ? `BuilderBee Memory:\n${builderbeeMemory.map((m) => `- ${m.content}`).join("\n")}`
        : "BuilderBee: No recent memory found.",
      centaurionMemory.length > 0
        ? `Centaurion Memory:\n${centaurionMemory.map((m) => `- ${m.content}`).join("\n")}`
        : "Centaurion: No recent memory found.",
    ].join("\n\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `You are the PM agent for Malik's three companies: BuilderBee, Centaurion.me, and AOB.
Generate a concise daily standup. Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Generate daily standup for ${today}.

Context from memory:
${memoryContext}

Return JSON:
{
  "date": "${today}",
  "projects": {
    "builderbee": {
      "yesterday": ["completed item"],
      "today": ["planned item"],
      "blockers": ["blocker if any"]
    },
    "centaurion": {
      "yesterday": [],
      "today": [],
      "blockers": []
    },
    "aob": {
      "yesterday": [],
      "today": [],
      "blockers": []
    }
  },
  "decisions_needed": ["item requiring Malik's explicit decision"],
  "overdue_items": ["item that is overdue"],
  "top_priority_today": "the single most important thing"
}`,
        },
      ],
    });

    let standup: Record<string, unknown>;
    try {
      standup = JSON.parse(response.content[0].text);
    } catch {
      standup = { date: today, raw: response.content[0].text };
    }

    // Save standup to memory
    await writeMemory(
      `standup:${today}`,
      JSON.stringify(standup)
    );

    logger.info("Standup generated and saved", { date: today });
    return standup;
  },
});

// Scheduled version — runs every weekday at 8am UTC
export const scheduledDailyStandup = schedules.task({
  id: "scheduled-daily-standup",
  cron: "0 8 * * 1-5",   // Mon–Fri 08:00 UTC
  maxDuration: 300,
  run: async () => {
    return dailyStandupTask.triggerAndWait({});
  },
});
