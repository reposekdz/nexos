# Multi-stage build for Nexos Backend
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++

# Dependencies stage
FROM base AS dependencies
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build 2>/dev/null || echo "No build script"

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
RUN apk add --no-cache tini curl
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app ./

ENV NODE_ENV=production
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
