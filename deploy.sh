#!/usr/bin/env bash
# Build and deploy the Labeloo frontend Worker.
#
# The API address is baked into the client at BUILD time. Deploying without it
# leaves the browser calling http://localhost:8787, and every sign-in fails with
# "email and password do not match" even though the credentials are correct.
# This script sets it so that mistake cannot happen from a plain `wrangler deploy`.
set -euo pipefail
cd "$(dirname "$0")"

export NUXT_PUBLIC_API_URL="${NUXT_PUBLIC_API_URL:-https://labeloo-api.ahmetcanisik5458675.workers.dev}"
export NUXT_PUBLIC_CONTACT_EMAIL="${NUXT_PUBLIC_CONTACT_EMAIL:-contact@labeloo.app}"

echo "[deploy] API   = $NUXT_PUBLIC_API_URL"
echo "[deploy] email = $NUXT_PUBLIC_CONTACT_EMAIL"

NITRO_PRESET=cloudflare_module npx nuxi build
npx wrangler deploy
