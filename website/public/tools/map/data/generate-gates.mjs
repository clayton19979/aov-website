#!/usr/bin/env node
// Regenerates gates.json — the complete EVE Frontier NPC stargate ("game gate")
// network used by the Void Map.
//
// Why this exists: the World API has no bulk gates endpoint. Gate links are only
// exposed on the per-system detail endpoint (/v2/solarsystems/{id} -> gateLinks[]),
// so the full network can only be assembled by walking every solar system and
// collecting its links, deduping each A<->B pair into one undirected edge.
//
// The NPC stargate topology is static universe data and changes rarely, so we
// ship the result as a checked-in static file instead of making ~24k requests
// from every visitor's browser on page load.
//
// Usage:  node public/tools/map/data/generate-gates.mjs
// (Requires Node 18+ for global fetch. Run after a game/universe update to refresh.)

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const API = "https://world-api-stillness.live.pub.evefrontier.com/v2";
const PAGE_SIZE = 1000;
const CONCURRENCY = 16;
const OUT = fileURLToPath(new URL("./gates.json", import.meta.url));

async function getJson(path, { tries = 6 } = {}) {
  let last;
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: { Accept: "application/json", "User-Agent": "aov-map-gate-generator/1.0" },
      });
      if (res.ok) return res.json();
      // 400/404 = genuinely no such system / bad id -> treat as "no gates"
      if (res.status === 400 || res.status === 404) return null;
      last = `HTTP ${res.status}`;
    } catch (err) {
      last = String(err);
    }
    await new Promise((r) => setTimeout(r, Math.min(2000, 250 * 2 ** t)));
  }
  throw new Error(`failed ${path}: ${last}`);
}

async function fetchAllSystemIds() {
  const ids = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const page = await getJson(`/solarsystems?limit=${PAGE_SIZE}&offset=${offset}`);
    const rows = page.data || [];
    total = page.metadata?.total ?? rows.length;
    for (const s of rows) ids.push(s.id);
    offset += rows.length;
    if (!rows.length) break;
  }
  return ids;
}

async function runPool(items, worker) {
  let cursor = 0;
  const failed = [];
  async function pump() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        await worker(items[i]);
      } catch {
        failed.push(items[i]);
      }
      if (cursor % 500 === 0) process.stderr.write(`  ${cursor}/${items.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, pump));
  return failed;
}

function collectLinks(edges, sid, detail) {
  for (const link of detail?.gateLinks || []) {
    const dest = link.destination?.id;
    if (!dest || dest === sid) continue;
    const [a, b] = sid < dest ? [sid, dest] : [dest, sid];
    const key = `${a}:${b}`;
    if (!edges.has(key)) edges.set(key, { from: a, to: b, name: link.name || "Stargate" });
  }
}

async function main() {
  const ids = await fetchAllSystemIds();
  process.stderr.write(`system ids: ${ids.length}\n`);

  const edges = new Map();
  let failed = await runPool(ids, async (sid) => {
    collectLinks(edges, sid, await getJson(`/solarsystems/${sid}`));
  });

  // Retry hard failures until clear (network blips shouldn't drop real gates).
  for (let round = 0; failed.length && round < 8; round++) {
    process.stderr.write(`retry round ${round + 1}: ${failed.length} systems\n`);
    const retry = failed;
    failed = [];
    for (const sid of retry) {
      try {
        collectLinks(edges, sid, await getJson(`/solarsystems/${sid}`, { tries: 8 }));
      } catch {
        failed.push(sid);
      }
    }
  }
  if (failed.length) {
    process.stderr.write(`WARNING: ${failed.length} systems unresolved: ${failed.slice(0, 10)}\n`);
  }

  const rows = [...edges.values()]
    .sort((x, y) => x.from - y.from || x.to - y.to)
    .map((e) => ({
      fromSystemId: e.from,
      destinationSystemId: e.to,
      status: "online",
      kind: "game",
      count: 1,
      name: e.name,
    }));

  await writeFile(OUT, JSON.stringify(rows, null, 2) + "\n");
  process.stderr.write(`wrote ${OUT}: ${rows.length} undirected game-gate edges\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
