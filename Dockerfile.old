FROM node:22-bookworm-slim AS base

ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./

FROM base AS migrations
RUN npm ci --include=dev && npm cache clean --force
COPY --chown=node:node . .
USER node
CMD ["npm", "run", "db:migrate"]

FROM base AS runtime
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node . .
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health', {signal: AbortSignal.timeout(4000)}).then(r => {if (!r.ok) process.exit(1);}).catch(() => process.exit(1));"
CMD ["node", "./bin/www"]
