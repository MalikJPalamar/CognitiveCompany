# Dockerfile — Agent API server
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json ./
RUN npm install --production

# Copy application code
COPY agents/ ./agents/
COPY tools/ ./tools/
COPY mcp-servers/ ./mcp-servers/

# Health check endpoint (agent-api must expose /health)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "agents/orchestrator/index.js"]
