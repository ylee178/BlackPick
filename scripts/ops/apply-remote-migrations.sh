#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[1/6] Repairing remote history for migrations already present in production..."
supabase migration repair 001 002 003 005 20260406 --status applied --linked --yes

echo "[2/6] Applying preferred_language migration..."
supabase db query --linked --file supabase/migrations/004_preferred_language.sql
supabase migration repair 004 --status applied --linked --yes

echo "[3/6] Applying admin lockdown migration..."
supabase db query --linked --file supabase/migrations/202604090001_admin_lockdown.sql
supabase migration repair 202604090001 --status applied --linked --yes

echo "[4/6] Applying translation/profile integrity migration..."
supabase db query --linked --file supabase/migrations/202604090002_profile_integrity.sql
supabase migration repair 202604090002 --status applied --linked --yes

echo "[5/6] Verifying remote schema markers..."
node scripts/ops/verify-remote-schema.mjs

echo "[6/6] Done. Optionally bootstrap an admin:"
echo "  node scripts/ops/bootstrap-admin.mjs you@example.com"
