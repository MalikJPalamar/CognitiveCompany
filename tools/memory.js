// tools/memory.js — Agent's filing cabinet interface
// Wraps Graphiti (episodic memory) for read/write operations.
// All agent code should import from here, not call Graphiti directly.

const GRAPHITI_URL = process.env.GRAPHITI_URL || "http://localhost:8000";

/**
 * Write an episode (memory entry) to Graphiti.
 *
 * @param {object} params
 * @param {string} params.key        - Unique identifier, e.g. "aob:decision:crm-2025-02"
 * @param {string} params.content    - The information to store
 * @param {string} [params.entity]   - Who/what this is about (for graph linking)
 * @param {object} [params.metadata] - Arbitrary extra fields
 */
export async function writeMemory({ key, content, entity, metadata = {} }) {
  const episode = {
    name: key,
    episode_body: content,
    reference_time: new Date().toISOString(),
    source_description: `Agent session — ${entity || "general"}`,
    metadata,
  };

  const response = await fetch(`${GRAPHITI_URL}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(episode),
  });

  if (!response.ok) {
    throw new Error(`Graphiti write failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search Graphiti for memories relevant to a query.
 *
 * @param {object} params
 * @param {string} params.query   - Natural language search query
 * @param {number} [params.limit] - Max results to return (default 5)
 * @param {string} [params.entity]- Center search on a specific entity UUID
 * @returns {Array<{content: string, relevance: number, timestamp: string}>}
 */
export async function readMemory({ query, limit = 5, entity = null }) {
  const params = new URLSearchParams({
    query,
    num_results: String(limit),
    ...(entity && { center_node_uuid: entity }),
  });

  const response = await fetch(`${GRAPHITI_URL}/search?${params}`);

  if (!response.ok) {
    throw new Error(`Graphiti search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return (data.results ?? []).map((r) => ({
    content: r.fact,
    relevance: r.score,
    timestamp: r.created_at,
  }));
}

/**
 * Format memories for injection into a system prompt.
 * Returns an empty string if there are no memories.
 *
 * @param {Array} memories - Output of readMemory()
 * @returns {string}
 */
export function formatMemoriesForPrompt(memories = []) {
  if (!memories.length) return "";

  const lines = memories
    .map((m) => `- [${String(m.timestamp ?? "").slice(0, 10)}] ${m.content}`)
    .join("\n");

  return `## Relevant Memory (from previous sessions)\n${lines}`;
}
