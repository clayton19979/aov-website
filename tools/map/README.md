# Frontier GPS

A local EVE Frontier map and route planner. It loads the live Stillness solar-system catalog from:

`https://world-api-stillness.live.tech.evefrontier.com/v2/solarsystems`

## Run

From this folder:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Open:

`http://127.0.0.1:5173`

Route links support the same core shape as common Frontier planners:

`?system1=30001573&system2=30013956&jumpDistance=120&optimize=fuel&avoid=30001844,30002270`

Multi-stop routes also support:

`?system1=30001573&via=30001844,30003190&system2=30013956&jumpDistance=120&optimize=jumps`

Use the `Via systems` field to force ordered intermediate stops. Duplicate entries are ignored, the route is calculated leg-by-leg, and share links preserve the selected stop order.

## Avoid Systems

Use the `Avoid systems` field to exclude hostile or undesirable stops by name or system ID. Separate entries with commas or new lines. The planner ignores duplicates, keeps the selected origin and destination routable even if they appear in the avoid list, and includes the normalized `avoid` IDs in share links.

## Online Gates

The official docs describe Gates as paired travel structures that may be open or controlled by extension logic. Frontier GPS automatically reads `data/gates.json` when a route is calculated. Users do not need to paste gate data.

```json
[
  { "fromSystemId": 30001573, "destinationSystemId": 30013956, "status": "online", "name": "Home pipe" }
]
```

Only online links are used; rows marked `online: false`, `active: false`, `enabled: false`, or with a non-online status are ignored. Supported aliases include `from`, `to`, `sourceSystemId`, `destinationSystemId`, `system1`, and `system2`. Gates are treated as bidirectional links.

## Public Smart Gates

Frontier GPS also checks live Stillness Smart Gate assemblies on Sui when gate routing is enabled. A Smart Gate is used only when both paired gates are online, linked, have no extension access logic, and have public Location Registry entries that reveal their solar systems. Extension-restricted gates and gates without public locations are reported in the gate status text but are not used for routing.

## Discovered Gate Cache

When Frontier GPS discovers live `gateLinks` from the World API while calculating a route, it now keeps those links in a local browser cache for 24 hours. That means repeat route calculations can start with a richer gate graph immediately, and temporary World API errors no longer suppress retries for the rest of the session.
