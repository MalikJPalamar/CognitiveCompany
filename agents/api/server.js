// agents/api/server.js
// HTTP API server wrapping the orchestrator.
// This is what the Dockerfile runs — exposes port 3000.
//
// Endpoints:
//   GET  /health               — liveness probe (no auth)
//   POST /orchestrate          — run the orchestrator (requires X-Api-Key header)
//   POST /agent/:name          — run a specific sub-agent directly (requires X-Api-Key header)

import http from "node:http";
import { runOrchestrator } from "../orchestrator/index.js";
import { runResearcher } from "../researcher/index.js";
import { runCoder } from "../coder/index.js";
import { runWriter } from "../writer/index.js";
import { runMarketer } from "../marketer/index.js";
import { runPM } from "../pm/index.js";

const PORT = Number(process.env.PORT ?? 3000);
const API_KEY = process.env.AGENT_API_KEY;

const AGENT_RUNNERS = {
  researcher: runResearcher,
  coder: runCoder,
  writer: runWriter,
  marketer: runMarketer,
  pm: runPM,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function send(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function isAuthorized(req) {
  if (!API_KEY) return true; // No key configured — open (dev mode)
  return req.headers["x-api-key"] === API_KEY;
}

// ── Request handler ───────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method.toUpperCase();

  // Health check — always public
  if (method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  // Auth gate for all other routes
  if (!isAuthorized(req)) {
    return send(res, 401, { error: "Unauthorized — X-Api-Key header required" });
  }

  // POST /orchestrate — run the full orchestrator
  if (method === "POST" && url.pathname === "/orchestrate") {
    try {
      const body = await parseBody(req);
      if (!body.request) {
        return send(res, 400, { error: "Body must include { request: string }" });
      }
      const result = await runOrchestrator(body.request, body.context ?? {});
      return send(res, 200, { result });
    } catch (err) {
      console.error("[/orchestrate]", err);
      return send(res, 500, { error: err.message });
    }
  }

  // POST /agent/:name — run a specific sub-agent
  const agentMatch = url.pathname.match(/^\/agent\/([a-z]+)$/);
  if (method === "POST" && agentMatch) {
    const agentName = agentMatch[1];
    const runner = AGENT_RUNNERS[agentName];
    if (!runner) {
      return send(res, 404, {
        error: `Unknown agent: ${agentName}`,
        available: Object.keys(AGENT_RUNNERS),
      });
    }
    try {
      const body = await parseBody(req);
      const result = await runner(body);
      return send(res, 200, { agent: agentName, result });
    } catch (err) {
      console.error(`[/agent/${agentName}]`, err);
      return send(res, 500, { error: err.message });
    }
  }

  return send(res, 404, { error: `No route: ${method} ${url.pathname}` });
}

// ── Server bootstrap ──────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("[unhandled]", err);
    if (!res.headersSent) send(res, 500, { error: "Internal server error" });
  });
});

server.listen(PORT, () => {
  console.log(`[agent-api] listening on port ${PORT}`);
  console.log(`[agent-api] auth: ${API_KEY ? "enabled" : "DISABLED (dev mode)"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => {
    console.log("[agent-api] shutdown complete");
    process.exit(0);
  });
});
