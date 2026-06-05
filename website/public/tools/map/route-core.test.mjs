import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const RouteCore = require("./route-core.js");

test("stitchRoutes merges legs without duplicating the waypoint", () => {
  const alpha = { id: 1, name: "Alpha" };
  const beta = { id: 2, name: "Beta" };
  const gamma = { id: 3, name: "Gamma" };
  const delta = { id: 4, name: "Delta" };

  const route = RouteCore.stitchRoutes([
    {
      path: [alpha, beta, gamma],
      edges: [
        { system: beta, distance: 10, gate: false },
        { system: gamma, distance: 12, gate: true, kind: "smart", count: 1 },
      ],
      cost: 4,
    },
    {
      path: [gamma, delta],
      edges: [{ system: delta, distance: 8, gate: false }],
      cost: 3,
    },
  ]);

  assert.deepEqual(route.path.map((system) => system.id), [1, 2, 3, 4]);
  assert.equal(route.edges.length, 3);
  assert.equal(route.cost, 7);
});

test("stitchRoutes ignores empty legs and returns null when nothing is usable", () => {
  assert.equal(RouteCore.stitchRoutes([]), null);
  assert.equal(RouteCore.stitchRoutes([null, { path: [], edges: [], cost: 0 }]), null);
});
