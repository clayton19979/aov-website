<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# EVE Frontier — always consult the official docs

This site's tools (Void Map, BaseOps Command Center, and anything querying game
state) integrate with **EVE Frontier**. Before building or fixing any
EVE-Frontier feature, consult the official docs: **https://docs.evefrontier.com/**
(machine-readable index at https://docs.evefrontier.com/llms.txt). Use it to
confirm current API hosts, endpoints, Sui/Move contract details, and data
shapes — they change, and assumptions from memory go stale.

Known integration facts (verify against the docs if anything looks off):
- **World API (indexer, REST):** `https://world-api-stillness.live.pub.evefrontier.com/v2`
  — solar systems, type metadata (`/v2/types/{type_id}`), etc. (The old
  `world-api-stillness.live.tech.evefrontier.com` host is dead — NXDOMAIN.)
- **Smart assemblies, kills, fuel, ownership:** read from the **Sui chain**, not
  REST — via Sui GraphQL (`https://graphql.testnet.sui.io/graphql`), JSON-RPC
  (`https://fullnode.testnet.sui.io`), and Move event queries (`suix_queryEvents`).
- **Wallet:** Slush (`*.slush.app`) + Sui dApp Kit / MVR (`*.mystenlabs.com`).
- Any new external host a tool calls must be added to the CSP `connect-src`
  (and `frame-src` where embedded) in `next.config.ts`, or the browser blocks it.
