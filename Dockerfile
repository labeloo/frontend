# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN corepack enable
WORKDIR /app

# ---- dependencies -----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# ---- build ------------------------------------------------------------------
FROM deps AS build
# These are baked into the bundle, not read at runtime: 21 files reference
# `import.meta.env.NUXT_PUBLIC_API_URL`, which Vite replaces with a literal at
# build time. Changing them therefore requires a rebuild, not a restart.
ARG NUXT_PUBLIC_API_URL=http://localhost:8787
ARG NUXT_PUBLIC_SAM2_URL=http://localhost:8000
ENV NUXT_PUBLIC_API_URL=$NUXT_PUBLIC_API_URL \
    NUXT_PUBLIC_SAM2_URL=$NUXT_PUBLIC_SAM2_URL \
    NODE_ENV=production

COPY . .
RUN pnpm build

# ---- runtime ----------------------------------------------------------------
# Nitro's output is self-contained, so the runtime image carries no node_modules.
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/.output ./.output

USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://127.0.0.1:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
