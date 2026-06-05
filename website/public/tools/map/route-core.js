(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RouteCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function firstNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) return number;
    }
    return null;
  }

  function readGateRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.gates)) return payload.gates;
    if (Array.isArray(payload?.links)) return payload.links;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }

  function isGateOnline(row) {
    if (row.online === false || row.isOnline === false || row.active === false || row.enabled === false) return false;
    const status = String(row.status || row.state || row.lifecycle || "").toLowerCase();
    if (status && !["online", "active", "enabled", "linked"].includes(status)) return false;
    if (row.sourceOnline === false || row.destinationOnline === false || row.fromOnline === false || row.toOnline === false) return false;
    return true;
  }

  function normalizeGateRows(payload) {
    return readGateRows(payload)
      .map((row) => {
        const from = firstNumber(
          row.from,
          row.fromSystem,
          row.fromSystemId,
          row.source,
          row.sourceSystem,
          row.sourceSystemId,
          row.origin,
          row.originSystemId,
          row.system1,
          row.system1Id,
          row.solarSystemId,
          row.sourceSolarSystemId,
          row.source?.solarSystemId,
          row.source?.systemId,
        );
        const to = firstNumber(
          row.to,
          row.toSystem,
          row.toSystemId,
          row.destination,
          row.destinationSystem,
          row.destinationSystemId,
          row.target,
          row.targetSystemId,
          row.system2,
          row.system2Id,
          row.destinationSolarSystemId,
          row.destination?.solarSystemId,
          row.destination?.systemId,
        );
        return {
          from,
          to,
          name: row.name || row.label || row.routeName || "Online Gate",
          kind: row.kind || row.type || "smart",
          count: Number(row.count || row.gateCount || row.gates || 1),
          online: isGateOnline(row),
        };
      })
      .filter((gate) => gate.from && gate.to && gate.from !== gate.to);
  }

  function makeSpatialIndex(systems, cellSize) {
    const buckets = new Map();
    const key = (x, y, z) => `${x},${y},${z}`;
    for (const system of systems) {
      const ix = Math.floor(system.x / cellSize);
      const iy = Math.floor(system.y / cellSize);
      const iz = Math.floor(system.z / cellSize);
      const k = key(ix, iy, iz);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(system);
    }
    return { buckets, key, cellSize };
  }

  function nearbySystems(system, index, range) {
    const { buckets, key, cellSize } = index;
    const ix = Math.floor(system.x / cellSize);
    const iy = Math.floor(system.y / cellSize);
    const iz = Math.floor(system.z / cellSize);
    const out = [];
    for (let x = ix - 1; x <= ix + 1; x++) {
      for (let y = iy - 1; y <= iy + 1; y++) {
        for (let z = iz - 1; z <= iz + 1; z++) {
          const bucket = buckets.get(key(x, y, z));
          if (!bucket) continue;
          bucket.forEach((candidate) => {
            if (candidate.id !== system.id) {
              const d = distance(system, candidate);
              if (d <= range) out.push({ system: candidate, distance: d, gate: false });
            }
          });
        }
      }
    }
    return out;
  }

  function buildGateAdjacency(systemsById, gates) {
    const adjacency = new Map();
    const add = (fromId, toId, gate) => {
      const from = systemsById.get(fromId);
      const to = systemsById.get(toId);
      if (!from || !to || gate.online === false) return;
      if (!adjacency.has(fromId)) adjacency.set(fromId, []);
      adjacency.get(fromId).push({
        system: to,
        distance: distance(from, to),
        gate: true,
        kind: gate.kind,
        count: gate.count,
        name: gate.name,
      });
    };

    gates.forEach((gate) => {
      add(gate.from, gate.to, gate);
      add(gate.to, gate.from, gate);
    });
    return adjacency;
  }

  function edgeCost(edge, mode, range) {
    if (edge.gate) return mode === "jumps" ? 0.001 : 0.1 * (edge.count || 1);
    const jumpRatio = edge.distance / range;
    if (mode === "jumps") return 1 + edge.distance / range / 1000;
    return jumpRatio + jumpRatio * jumpRatio + 0.5;
  }

  function createPriorityQueue() {
    const heap = [];
    const swap = (a, b) => {
      [heap[a], heap[b]] = [heap[b], heap[a]];
    };
    return {
      get length() {
        return heap.length;
      },
      push(item) {
        heap.push(item);
        let index = heap.length - 1;
        while (index > 0) {
          const parent = Math.floor((index - 1) / 2);
          if (heap[parent].score <= heap[index].score) break;
          swap(parent, index);
          index = parent;
        }
      },
      pop() {
        if (heap.length <= 1) return heap.pop();
        const top = heap[0];
        heap[0] = heap.pop();
        let index = 0;
        while (true) {
          const left = index * 2 + 1;
          const right = left + 1;
          let smallest = index;
          if (left < heap.length && heap[left].score < heap[smallest].score) smallest = left;
          if (right < heap.length && heap[right].score < heap[smallest].score) smallest = right;
          if (smallest === index) break;
          swap(index, smallest);
          index = smallest;
        }
        return top;
      },
    };
  }

  function findRoute({ systems, systemsById, gateAdjacency, origin, destination, range, mode = "fuel", useGates = true, spatialIndex }) {
    const index = spatialIndex || makeSpatialIndex(systems, range);
    const open = createPriorityQueue();
    open.push({ id: origin.id, score: 0 });
    const cameFrom = new Map();
    const edgeFrom = new Map();
    const cost = new Map([[origin.id, 0]]);
    const visited = new Set();
    let guard = 0;

    while (open.length && guard++ < 220000) {
      const current = systemsById.get(open.pop().id);
      if (!current || visited.has(current.id)) continue;
      if (current.id === destination.id) break;
      visited.add(current.id);

      const gates = useGates ? gateAdjacency.get(current.id) || [] : [];
      const neighbors = nearbySystems(current, index, range).concat(gates);
      for (const edge of neighbors) {
        const next = edge.system;
        if (visited.has(next.id)) continue;
        const nextCost = cost.get(current.id) + edgeCost(edge, mode, range);
        if (nextCost < (cost.get(next.id) ?? Infinity)) {
          cost.set(next.id, nextCost);
          cameFrom.set(next.id, current.id);
          edgeFrom.set(next.id, edge);
          const heuristic = mode === "fuel" || (useGates && gateAdjacency.size) ? 0 : distance(next, destination) / range;
          open.push({ id: next.id, score: nextCost + heuristic });
        }
      }
    }

    if (!cameFrom.has(destination.id) && origin.id !== destination.id) return null;

    const path = [destination];
    const edges = [];
    let cursor = destination.id;
    while (cursor !== origin.id) {
      const edge = edgeFrom.get(cursor);
      edges.unshift(edge);
      cursor = cameFrom.get(cursor);
      path.unshift(systemsById.get(cursor));
    }
    return { path, edges, cost: cost.get(destination.id) ?? 0 };
  }

  function routeJumpDistance(result) {
    return result.edges.filter((edge) => !edge.gate).reduce((sum, edge) => sum + edge.distance, 0);
  }

  function routeFuelCost(result, range = 120) {
    return result.edges.reduce((sum, edge) => sum + edgeCost(edge, "fuel", range), 0);
  }

  function fuelScore(result, fuelBest) {
    if (!result || !fuelBest) return null;
    const selectedFuel = result.cost ?? routeFuelCost(result);
    const bestFuel = fuelBest.cost ?? routeFuelCost(fuelBest);
    if (selectedFuel <= 0.001 && bestFuel <= 0.001) return 100;
    return Math.max(1, Math.min(100, Math.round((bestFuel / Math.max(selectedFuel, 0.001)) * 100)));
  }

  function stitchRoutes(routes) {
    const validRoutes = (routes || []).filter((route) => Array.isArray(route?.path) && route.path.length);
    if (!validRoutes.length) return null;

    const path = [];
    const edges = [];
    let cost = 0;

    validRoutes.forEach((route, index) => {
      path.push(...(index ? route.path.slice(1) : route.path));
      edges.push(...(route.edges || []));
      cost += Number(route.cost || 0);
    });

    return { path, edges, cost };
  }

  return {
    buildGateAdjacency,
    distance,
    edgeCost,
    findRoute,
    firstNumber,
    fuelScore,
    isGateOnline,
    stitchRoutes,
    makeSpatialIndex,
    nearbySystems,
    normalizeGateRows,
    readGateRows,
    routeFuelCost,
    routeJumpDistance,
  };
});
