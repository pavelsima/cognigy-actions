# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json yarn.lock ./
COPY demo-app/package.json ./demo-app/
COPY cxone-chat/package.json ./cxone-chat/
COPY backend/package.json ./backend/

# Install all dependencies
RUN yarn install --frozen-lockfile

# Copy source files
COPY demo-app/ ./demo-app/
COPY cxone-chat/ ./cxone-chat/
COPY backend/ ./backend/

# Build all packages
# cxone-chat build includes webchat build internally
ENV BACKEND_URL=""
RUN yarn build:cxone-chat
RUN yarn build:demo

# Production stage
FROM node:22-slim AS production

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files for production install
COPY package.json yarn.lock ./
COPY backend/package.json ./backend/

# Install only production dependencies
RUN yarn install --frozen-lockfile --production

# Copy built assets from builder
COPY --from=builder /app/demo-app/dist ./demo-app/dist
COPY --from=builder /app/cxone-chat/dist ./cxone-chat/dist
COPY --from=builder /app/backend/server.production.js ./backend/

# Create data directory for SQLite
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/conversations.db
ENV PORT=8080

EXPOSE 8080

CMD ["node", "backend/server.production.js"]
