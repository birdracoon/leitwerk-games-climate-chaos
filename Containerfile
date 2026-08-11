FROM docker.io/library/node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder

ARG NEXT_PUBLIC_STORAGE_MODE=local
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_STORAGE_MODE=${NEXT_PUBLIC_STORAGE_MODE}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY . .
RUN npm run build

FROM docker.io/library/node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=512
ENV HOSTNAME=0.0.0.0
ENV PORT=4300


WORKDIR /app
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 4300

CMD ["node", "server.js"]
