@AGENTS.md

## Session Context
*Last updated: 2026-06-04*

### Active Work
- BaseOps Command Center (`public/tools/baseops/`) — active iteration on the compiled bundle (no source, edits go directly to `index-DweJuYm4.js` + `index-COoFLs4k.css`)
- All BaseOps changes ship directly to `master` (no PR branch needed unless user specifies)

### Key Decisions
- D1 fuel burn rate for Network Nodes is **10/hr** — hardcoded constant, chain `burn_rate_in_ms` is unreliable and ignored
- ETA format: `Xd Yh` for ≥24h, `Xh Ym` for <24h (minutes dropped when days shown)
- Assembly type names resolved via datahub API (`/v2/types/{type_id}`) — same mechanism as inventory items, cached in `xc` Map
- Vercel MCP has no delete-deployment tool — orphaned preview deployments must be removed via `vercel rm <url>` CLI or Vercel dashboard

### Key Code Locations (compiled bundle)
- `V0(typeRepr)` — maps Sui Move type string → kind label (Network Node / Storage Unit / Smart Gate / Assembly)
- `Br(obj)` — display name: uses `json.metadata.name`, falls back to `kind + item_id`
- `iL(obj)` — ETA calc: `fuel.quantity / 10` → hours
- `oL(hours)` — formats hours into `Xd Yh` / `Xh Ym` / `Xm`
- `hL({inventory})` — Storage Unit inventory block; has search state via `oe.useState`
- `fL({node, objects})` — Network Node card; shows fuel, ETA, energy, "10 D1/hr" metric
- `lL(typeId)` — datahub fetch for type name, cached in `xc`
- `cL(inventories)` — resolves inventory item type names (calls `lL`)
- Assembly type resolution runs in data fetch pipeline just before `return {ownerAddress:e,...}`

### Recent Changes (this session)
- Added inventory item search to Storage Unit panels
- Added "10 D1/hr" burn rate metric to Network Node cards
- Fixed ETA calculation + extended formatter to days
- Removed Chain Facts panel
- Removed Owner address input + character band (wallet captured on login)
- Assembly `kind` now resolves to specific type name (Smart Assembler, Smart Berth, etc.) via datahub

### Setup State
- Vercel CLI not installed — install with `npm i -g vercel` to use `vercel rm` for cleaning orphaned preview deployments
- 6 orphaned Vercel previews still showing (branches deleted, deployments persist): `tools-baseops-net-dc66e2`, `visual-not-found-2aeb53`, `visual-topbar-bra-c4947e`, `visual-restore-st-6ea440`, `visual-operations-f4563d`, `visual-scroll-pro-b50a1f`

### Next Steps
- Verify assembly type name resolution works with real wallet data (needs live testnet connection)
- Clean orphaned Vercel previews: `npm i -g vercel && vercel login` then `vercel rm <url> --safe -y` for each
- Consider surfacing `type_id` resolved name in the Network Node "connected owned" count breakdown
