// mcp-servers/memory/index.js
// Custom MCP server that exposes Graphiti to Claude Code as memory tools.
// Run with: node mcp-servers/memory/index.js
// Configured in .claude/settings.json under mcpServers.memory

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Requires @modelcontextprotocol/sdk@^1.0.0
// Both schemas are exported from the package's types.js entry point.
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { writeMemory, readMemory } from "../../tools/memory.js";

const server = new Server(
  { name: "memory", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "memory_write",
      description:
        "Save information to long-term memory (Graphiti graph database). Use after decisions, insights, or completed milestones.",
      inputSchema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              "Unique identifier in format [entity]:[type]:[YYYY-MM]. Example: aob:decision:crm-2025-02",
          },
          content: {
            type: "string",
            description: "The information to remember",
          },
          entity: {
            type: "string",
            description:
              "Who or what this is about: malik, builderbee, centaurion, aob, or a person/project name",
          },
        },
        required: ["key", "content"],
      },
    },
    {
      name: "memory_search",
      description:
        "Search long-term memory (Graphiti) for information relevant to a query. Use at the start of sessions involving known people or projects.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language search query",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default: 5)",
            default: 5,
          },
        },
        required: ["query"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "memory_write") {
    try {
      const result = await writeMemory({
        key: args.key,
        content: args.content,
        entity: args.entity,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, key: args.key, result }),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: err.message }),
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "memory_search") {
    try {
      const results = await readMemory({
        query: args.query,
        limit: args.limit ?? 5,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query: args.query,
              count: results.length,
              results,
            }),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: err.message }),
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// Start server on stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
