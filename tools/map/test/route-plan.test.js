const test = require("node:test");
const assert = require("node:assert/strict");
const RoutePlan = require("../route-plan");

const systems = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
  { id: 3, name: "Charlie" },
  { id: 4, name: "Delta" },
];

function resolveSystem(value) {
  const byName = new Map(systems.map((system) => [system.name.toLowerCase(), system]));
  const byId = new Map(systems.map((system) => [String(system.id), system]));
  return byId.get(String(value).trim()) || byName.get(String(value).trim().toLowerCase()) || null;
}

test("resolveSystems preserves order, removes duplicates, and tracks misses", () => {
  const resolved = RoutePlan.resolveSystems("Alpha\n2\nalpha\nUnknown\n4", resolveSystem);

  assert.deepEqual(
    resolved.systems.map((system) => system.id),
    [1, 2, 4],
  );
  assert.deepEqual(resolved.unresolved, ["Unknown"]);
});

test("buildRoutePlan creates ordered legs and collapses adjacent duplicate stops", () => {
  const plan = RoutePlan.buildRoutePlan(systems[0], systems[3], [systems[0], systems[1], systems[1], systems[2]]);

  assert.deepEqual(
    plan.legs.map((leg) => [leg.origin.id, leg.destination.id]),
    [
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  );
  assert.equal(plan.waypointCount, 2);
});

test("mergeRouteSegments stitches leg paths and records stop checkpoints", () => {
  const merged = RoutePlan.mergeRouteSegments([
    {
      path: [systems[0], systems[1], systems[2]],
      edges: [{ distance: 10, gate: false }, { distance: 15, gate: false }],
      cost: 30,
      fuelBestCost: 28,
    },
    {
      path: [systems[2], systems[3]],
      edges: [{ distance: 8, gate: true, kind: "smart", count: 1 }],
      cost: 5,
      fuelBestCost: 4,
    },
  ]);

  assert.deepEqual(
    merged.path.map((system) => system.id),
    [1, 2, 3, 4],
  );
  assert.equal(merged.edges.length, 3);
  assert.equal(merged.cost, 35);
  assert.equal(merged.fuelBestCost, 32);
  assert.deepEqual(
    merged.checkpoints.map((point) => [point.pathIndex, point.type, point.systemId]),
    [
      [0, "origin", 1],
      [2, "via", 3],
      [3, "destination", 4],
    ],
  );
});

test("normalizeSystemsText writes one formatted stop per line", () => {
  const text = RoutePlan.normalizeSystemsText([systems[1], systems[3]], (system) => system.name);

  assert.equal(text, "Bravo\nDelta");
});
