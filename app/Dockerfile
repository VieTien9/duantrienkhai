# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

# Stage 2: Hardened Runtime Image
FROM node:20-alpine

# Cài đặt curl hoặc dumb-init (nếu cần cho healthcheck/process signal)
RUN apk add --no-cache curl

WORKDIR /usr/src/app

# Copy production node_modules and code
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node public ./public

# Chuyển sang user non-root 'node' (Hardening requirement)
USER node

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "server.js"]
