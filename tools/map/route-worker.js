importScripts("./route-core.js");

let systems = [];
let systemsById = new Map();
let gates = [];
let gateAdjacency = new Map();
let spatialIndexes = new Map();

function edgeForMessage(edge) {
  return {
    to: edge.system.id,
    distance: edge.distance,
    gate: edge.gate,
    kind: edge.kind,
    count: edge.count,
    name: edge.name,
  };
}

function resultForMessage(result, fuelBest) {
  if (!result) return null;
  return {
    pathIds: result.path.map((system) => system.id),
    edges: result.edges.map(edgeForMessage),
    cost: result.cost,
    fuelBestCost: fuelBest?.cost ?? result.cost,
    fuelScore: RouteCore.fuelScore(result, fuelBest),
  };
}

self.addEventListener("message", (event) => {
  const message = event.data;

  if (message.type === "setData") {
    systems = message.systems || systems;
    gates = message.gates || gates;
    systemsById = new Map(systems.map((system) => [system.id, system]));
    gateAdjacency = RouteCore.buildGateAdjacency(systemsById, gates);
    spatialIndexes = new Map();
    self.postMessage({ type: "dataReady", requestId: message.requestId });
    return;
  }

  if (message.type !== "route") return;

  try {
    const range = Number(message.range || 120);
    const mode = message.mode || "fuel";
    const origin = systemsById.get(message.originId);
    const destination = systemsById.get(message.destinationId);
    const blockedSystemIds = Array.isArray(message.blockedSystemIds) ? message.blockedSystemIds : [];
    if (!origin || !destination) {
      self.postMessage({ type: "route", requestId: message.requestId, result: null });
      return;
    }

    if (!spatialIndexes.has(range)) {
      spatialIndexes.set(range, RouteCore.makeSpatialIndex(systems, range));
    }
    const spatialIndex = spatialIndexes.get(range);
    const base = {
      systems,
      systemsById,
      gateAdjacency,
      origin,
      destination,
      range,
      useGates: message.useGates,
      spatialIndex,
      blockedSystemIds,
    };
    const result = RouteCore.findRoute({ ...base, mode });
    const fuelBest = mode === "fuel" ? result : RouteCore.findRoute({ ...base, mode: "fuel" });
    self.postMessage({ type: "route", requestId: message.requestId, result: resultForMessage(result, fuelBest) });
  } catch (error) {
    self.postMessage({ type: "route", requestId: message.requestId, error: error.message || String(error) });
  }
});
