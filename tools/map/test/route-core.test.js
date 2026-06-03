const test = require("node:test");
const assert = require("node:assert/strict");
const RouteCore = require("../route-core");

const systems = [
  { id: 1, name: "A", x: 0, y: 0, z: 0 },
  { id: 2, name: "B", x: 10, y: 0, z: 0 },
  { id: 3, name: "C", x: 20, y: 0, z: 0 },
  { id: 4, name: "D", x: 100, y: 0, z: 0 },
];

function routeContext(gates = []) {
  const systemsById = new Map(systems.map((system) => [system.id, system]));
  return {
    systems,
    systemsById,
    gateAdjacency: RouteCore.buildGateAdjacency(systemsById, gates),
    spatialIndex: RouteCore.makeSpatialIndex(systems, 11),
  };
}

test("normalizes supported gate aliases and filters offline rows", () => {
  const gates = RouteCore.normalizeGateRows([
    { sourceSystemId: 1, destination: { systemId: 2 }, status: "online", type: "game" },
    { system1: 2, system2: 3, active: false },
    { from: 3, to: 4, status: "disabled" },
  ]);

  assert.equal(gates.length, 3);
  assert.equal(gates[0].from, 1);
  assert.equal(gates[0].to, 2);
  assert.equal(gates[0].online, true);
  assert.equal(gates[1].online, false);
  assert.equal(gates[2].online, false);
});

test("gate adjacency is bidirectional and ignores offline gates", () => {
  const { systemsById } = routeContext();
  const adjacency = RouteCore.buildGateAdjacency(systemsById, [
    { from: 1, to: 4, kind: "game", count: 1, online: true },
    { from: 2, to: 4, kind: "game", count: 1, online: false },
  ]);

  assert.equal(adjacency.get(1)[0].system.id, 4);
  assert.equal(adjacency.get(4)[0].system.id, 1);
  assert.equal(adjacency.has(2), false);
});

test("gate keys are stable across direction and include kind", () => {
  assert.equal(RouteCore.gateKey({ from: 1, to: 4, kind: "game" }), "1:4:game");
  assert.equal(RouteCore.gateKey({ from: 4, to: 1, kind: "game" }), "1:4:game");
  assert.equal(RouteCore.gateKey({ from: 4, to: 1, kind: "smart" }), "1:4:smart");
  assert.equal(RouteCore.gateKey({ from: 4, to: 4, kind: "smart" }), null);
});

test("route search uses gates when enabled", () => {
  const context = routeContext([{ from: 1, to: 4, kind: "game", count: 1, online: true }]);
  const result = RouteCore.findRoute({
    ...context,
    origin: systems[0],
    destination: systems[3],
    range: 11,
    mode: "fuel",
    useGates: true,
  });

  assert.deepEqual(result.path.map((system) => system.id), [1, 4]);
  assert.equal(result.edges[0].gate, true);
});

test("route search falls back to jump links when gates are disabled", () => {
  const context = routeContext([{ from: 1, to: 4, kind: "game", count: 1, online: true }]);
  const result = RouteCore.findRoute({
    ...context,
    origin: systems[0],
    destination: systems[2],
    range: 11,
    mode: "jumps",
    useGates: false,
  });

  assert.deepEqual(result.path.map((system) => system.id), [1, 2, 3]);
  assert.equal(result.edges.every((edge) => !edge.gate), true);
});

test("fuel score compares the selected route to the fuel-best route", () => {
  const fuelBest = { edges: [{ distance: 10, gate: false }] };
  const selected = { edges: [{ distance: 20, gate: false }] };

  assert.equal(RouteCore.fuelScore(selected, fuelBest), 85);
});

test("fuel score treats all-gate routes as fully efficient", () => {
  const allGate = { edges: [{ distance: 100, gate: true }] };

  assert.equal(RouteCore.fuelScore(allGate, allGate), 100);
});

test("fuel mode does not add extra ship jumps for tiny savings", () => {
  const routeSystems = [
    { id: 10, name: "Start", x: 0, y: 0, z: 0 },
    { id: 11, name: "Mid", x: 55, y: 0, z: 0 },
    { id: 12, name: "End", x: 110, y: 0, z: 0 },
  ];
  const systemsById = new Map(routeSystems.map((system) => [system.id, system]));
  const context = {
    systems: routeSystems,
    systemsById,
    gateAdjacency: new Map(),
    spatialIndex: RouteCore.makeSpatialIndex(routeSystems, 120),
  };

  const fuelResult = RouteCore.findRoute({
    ...context,
    origin: routeSystems[0],
    destination: routeSystems[2],
    range: 120,
    mode: "fuel",
    useGates: false,
  });
  const jumpResult = RouteCore.findRoute({
    ...context,
    origin: routeSystems[0],
    destination: routeSystems[2],
    range: 120,
    mode: "jumps",
    useGates: false,
  });

  assert.deepEqual(fuelResult.path.map((system) => system.id), [10, 12]);
  assert.deepEqual(jumpResult.path.map((system) => system.id), [10, 12]);
});

test("fuel mode treats gates as much cheaper than long ship jumps", () => {
  const routeSystems = [
    { id: 20, name: "Start", x: 0, y: 0, z: 0 },
    { id: 21, name: "Gate Exit", x: 100, y: 0, z: 0 },
    { id: 22, name: "End", x: 120, y: 0, z: 0 },
  ];
  const systemsById = new Map(routeSystems.map((system) => [system.id, system]));
  const gates = [{ from: 20, to: 21, kind: "smart", count: 1, online: true }];
  const context = {
    systems: routeSystems,
    systemsById,
    gateAdjacency: RouteCore.buildGateAdjacency(systemsById, gates),
    spatialIndex: RouteCore.makeSpatialIndex(routeSystems, 120),
  };

  const result = RouteCore.findRoute({
    ...context,
    origin: routeSystems[0],
    destination: routeSystems[2],
    range: 120,
    mode: "fuel",
    useGates: true,
  });

  assert.deepEqual(result.path.map((system) => system.id), [20, 21, 22]);
  assert.equal(result.edges[0].gate, true);
});
