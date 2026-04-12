import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PROD_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEV_URL = process.env.DEV_SUPABASE_URL;
const DEV_SERVICE_ROLE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

if (!PROD_URL || !PROD_SERVICE_ROLE_KEY) {
  throw new Error("Missing production Supabase env vars.");
}

if (!DEV_URL || !DEV_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing dev Supabase env vars. Set DEV_SUPABASE_URL and DEV_SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const prod = createClient(PROD_URL, PROD_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const dev = createClient(DEV_URL, DEV_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fetchAll(client, table, orderBy) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    let query = client.from(table).select("*").range(from, from + pageSize - 1);

    if (orderBy) {
      query = query.order(orderBy, { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch ${table}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

async function insertInChunks(table, rows, chunkSize = 500) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await dev.from(table).insert(chunk);

    if (error) {
      throw new Error(`Failed to insert ${table}: ${error.message}`);
    }
  }
}

async function main() {
  const [fighters, events, fights] = await Promise.all([
    fetchAll(prod, "fighters", "created_at"),
    fetchAll(prod, "events", "date"),
    fetchAll(prod, "fights", "start_time"),
  ]);

  await insertInChunks("fighters", fighters);
  await insertInChunks("events", events);
  await insertInChunks("fights", fights);

  const [devEvents, devFights, devFighters] = await Promise.all([
    dev.from("events").select("*", { count: "exact", head: true }),
    dev.from("fights").select("*", { count: "exact", head: true }),
    dev.from("fighters").select("*", { count: "exact", head: true }),
  ]);

  console.log(
    JSON.stringify(
      {
        copied: {
          fighters: fighters.length,
          events: events.length,
          fights: fights.length,
        },
        devCounts: {
          fighters: devFighters.count ?? 0,
          events: devEvents.count ?? 0,
          fights: devFights.count ?? 0,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
