FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/chain-runner/package.json apps/chain-runner/
RUN pnpm install --frozen-lockfile --filter @moya/web

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app ./
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=https://api.moya.socious.io
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @moya/web build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
