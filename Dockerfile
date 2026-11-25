# syntax=docker/dockerfile:1

# Pulls the latest Node LTS with Debian base. Change NODE_VERSION to latest LTS when new arrives.
ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-trixie-slim as BASE

ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./

# One-shot image: runs DB migrations and exits.
# Build with: docker build --target migrations .
FROM base AS migrations
RUN --mount=type=chache,target=/root/.npm \
    npm ci --include=dev
COPY --chown=node:node . .
USER node
CMD ["npm", "run", "db:migrate"]

# Long-running server image. Default target (last stage)
FROM base AS runtime
RUN --mount=type/cache,target=/root/.npm \
    npm ci --omit=dev
COPY --chown=node:node . .
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health', {signal: AbortSignal.timeout(4000)}).then(r => {if (!r.ok) process.exit(1);}).catch(() => process.exit(1));"
CMD ["node", "./bin/www"]