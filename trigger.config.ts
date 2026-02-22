// trigger.config.ts — Trigger.dev v3 project configuration
// Docs: https://trigger.dev/docs/config/config-file

import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "cognitive-company-agents",   // Replace with your Trigger.dev project ref
  runtime: "node",
  dirs: ["./workflows"],                  // Where to find task definitions
  maxDuration: 1800,                      // Global default: 30 min (tasks can override)
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    extensions: [],
  },
});
