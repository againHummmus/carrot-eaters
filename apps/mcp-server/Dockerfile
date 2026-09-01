# Build context is the monorepo root (Railway: set Dockerfile Path to
# apps/mcp-server/Dockerfile but keep Root Directory as the repo root).
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/mcp-server/package.json apps/mcp-server/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/mcp-server apps/mcp-server
RUN npm run build -w packages/shared && npm run build -w apps/mcp-server

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/mcp-server/package.json ./apps/mcp-server/package.json
COPY --from=build /app/apps/mcp-server/dist ./apps/mcp-server/dist
EXPOSE 8080
CMD ["node", "apps/mcp-server/dist/index.js"]
