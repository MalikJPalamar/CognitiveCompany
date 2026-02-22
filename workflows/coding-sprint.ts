// workflows/coding-sprint.ts
// Trigger.dev workflow for a structured AI-assisted coding sprint.
// Orchestrates: requirements → architecture → implementation → review.

import { task, logger } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export const codingSprintTask = task({
  id: "coding-sprint",
  maxDuration: 1800,
  run: async (payload: {
    feature: string;
    codebase_context: string;
    language: string;
    userId: string;
  }) => {
    logger.info("Coding sprint started", { feature: payload.feature });

    // Phase 1: Architecture design
    const architectureResponse = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: "You are a senior software architect. Return structured JSON.",
      messages: [
        {
          role: "user",
          content: `Design the architecture for: ${payload.feature}

Codebase context: ${payload.codebase_context}

Return JSON:
{
  "components": [{"name": "", "responsibility": "", "file_path": ""}],
  "data_flow": "description of how data moves",
  "interfaces": [{"from": "", "to": "", "contract": ""}],
  "risks": [{"risk": "", "mitigation": ""}],
  "implementation_order": ["component-1", "component-2"]
}`,
        },
      ],
    });

    let architecture: Record<string, unknown>;
    try {
      architecture = JSON.parse(architectureResponse.content[0].text);
    } catch {
      architecture = { raw: architectureResponse.content[0].text };
    }

    logger.info("Architecture phase complete");

    // Phase 2: Implementation (per component, in order)
    const implementations: Array<{ component: string; code: string }> = [];
    const components = (architecture.implementation_order as string[]) ?? [];

    for (const componentName of components) {
      const implResponse = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8096,
        system: `You are a senior ${payload.language} engineer. Write clean, modular code.
No secrets hardcoded. Comments only where non-obvious. ES modules for JS/TS.`,
        messages: [
          {
            role: "user",
            content: `Implement the "${componentName}" component.

Feature: ${payload.feature}
Language: ${payload.language}
Architecture: ${JSON.stringify(architecture, null, 2)}

Return the complete file content with the file path as the first line comment.`,
          },
        ],
      });

      implementations.push({
        component: componentName,
        code: implResponse.content[0].text,
      });

      logger.info(`Implemented: ${componentName}`);
    }

    // Phase 3: Code review
    const reviewResponse = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: "You are a senior code reviewer. Return structured JSON.",
      messages: [
        {
          role: "user",
          content: `Review this implementation:
${implementations.map((i) => `### ${i.component}\n${i.code}`).join("\n\n")}

Return JSON:
{
  "verdict": "approve|request_changes",
  "issues": [{"severity": "critical|major|minor", "component": "", "description": ""}],
  "strengths": [],
  "suggestions": []
}`,
        },
      ],
    });

    let review: Record<string, unknown>;
    try {
      review = JSON.parse(reviewResponse.content[0].text);
    } catch {
      review = { raw: reviewResponse.content[0].text };
    }

    logger.info("Sprint complete", { verdict: review.verdict });

    return {
      feature: payload.feature,
      architecture,
      implementations,
      review,
      files_generated: implementations.length,
    };
  },
});
