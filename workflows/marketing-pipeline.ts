// workflows/marketing-pipeline.ts
// Trigger.dev v3 workflow for the programmatic ad content pipeline.
// Durable execution: if this crashes mid-run, it resumes from last checkpoint.
//
// Deploy: npx trigger.dev@latest deploy
// Trigger: POST /api/trigger with { niche: "...", userId: "..." }

import { task, logger } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ─── Sub-task: Market Research ───────────────────────────────────────────────

export const researchNicheTask = task({
  id: "research-niche",
  maxDuration: 300, // 5 minutes
  run: async (payload: { niche: string; sessionId: string }) => {
    logger.info("Starting niche research", { niche: payload.niche });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `You are a market research specialist. Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Research the "${payload.niche}" market.

Return JSON:
{
  "niche": "...",
  "core_pain_points": ["..."],
  "language_patterns": ["exact phrases the audience uses"],
  "competitors": [{"name": "", "positioning": "", "weakness": ""}],
  "content_angles": [
    {"angle": "", "emotion": "fear|desire|curiosity|urgency", "awareness_level": "unaware|problem|solution|product|most_aware"}
  ],
  "buyer_objections": ["..."],
  "ideal_customer_profile": "..."
}`,
        },
      ],
    });

    const rawText = response.content[0].text;
    logger.info("Research complete", { tokens: response.usage.output_tokens });

    try {
      return JSON.parse(rawText);
    } catch {
      return { niche: payload.niche, raw: rawText };
    }
  },
});

// ─── Sub-task: Ad Content Generation ─────────────────────────────────────────

export const generateAdContentTask = task({
  id: "generate-ad-content",
  maxDuration: 600, // 10 minutes
  run: async (payload: { research: Record<string, unknown>; niche: string }) => {
    logger.info("Generating ad content", { niche: payload.niche });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8096,
      system: `You are a direct response copywriter (Ogilvy + Eugene Schwartz level).
Return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Based on this market research:
${JSON.stringify(payload.research, null, 2)}

Generate 20 ad variations for "${payload.niche}" using the Cody Schneider programmatic method.

Return JSON:
{
  "niche": "...",
  "campaign_themes": [
    {
      "theme_name": "...",
      "target_emotion": "...",
      "awareness_level": "...",
      "angles": [
        {
          "id": "angle-01",
          "hook": "first 3 seconds — pattern interrupt",
          "body": "problem → agitate → solve (2-3 sentences)",
          "cta": "one clear action",
          "platform_fit": ["meta", "tiktok", "youtube"],
          "format_fit": ["video", "image", "carousel"]
        }
      ]
    }
  ],
  "recommended_test_order": ["angle-01", "angle-02"],
  "kpi_targets": {
    "cpm": "...",
    "ctr": "...",
    "cpa": "..."
  }
}`,
        },
      ],
    });

    logger.info("Content generation complete", { tokens: response.usage.output_tokens });

    try {
      return JSON.parse(response.content[0].text);
    } catch {
      return { raw: response.content[0].text };
    }
  },
});

// ─── Sub-task: Save to Memory ─────────────────────────────────────────────────

export const saveToMemoryTask = task({
  id: "save-pipeline-to-memory",
  maxDuration: 60,
  run: async (payload: { key: string; content: string }) => {
    const graphitiUrl = process.env.GRAPHITI_URL ?? "http://localhost:8000";

    const response = await fetch(`${graphitiUrl}/episodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.key,
        episode_body: payload.content,
        reference_time: new Date().toISOString(),
        source_description: "marketing-pipeline workflow",
      }),
    });

    return { success: response.ok, key: payload.key };
  },
});

// ─── Orchestrator Task ────────────────────────────────────────────────────────

export const marketingPipelineTask = task({
  id: "marketing-pipeline",
  maxDuration: 1800, // 30 minutes total budget
  run: async (payload: { niche: string; userId: string }) => {
    logger.info("Marketing pipeline started", payload);

    // Phase 1: Research
    const researchResult = await researchNicheTask.triggerAndWait({
      niche: payload.niche,
      sessionId: crypto.randomUUID(),
    });

    if (!researchResult.ok) {
      throw new Error(`Research phase failed: ${JSON.stringify(researchResult)}`);
    }

    logger.info("Research phase complete");

    // Phase 2: Content generation
    const contentResult = await generateAdContentTask.triggerAndWait({
      research: researchResult.output,
      niche: payload.niche,
    });

    if (!contentResult.ok) {
      throw new Error(`Content generation failed`);
    }

    logger.info("Content phase complete");

    // Phase 3: Persist to memory
    const memoryKey = `marketing:ad-campaign:${payload.niche.replace(/\s+/g, "-")}:${new Date().toISOString().slice(0, 7)}`;

    await saveToMemoryTask.triggerAndWait({
      key: memoryKey,
      content: JSON.stringify({
        research: researchResult.output,
        campaign: contentResult.output,
        generated_at: new Date().toISOString(),
      }),
    });

    logger.info("Pipeline complete", { memoryKey });

    return {
      success: true,
      niche: payload.niche,
      memory_key: memoryKey,
      themes_generated: (contentResult.output as { campaign_themes?: unknown[] })?.campaign_themes?.length ?? 0,
      angles_generated: 20,
    };
  },
});
