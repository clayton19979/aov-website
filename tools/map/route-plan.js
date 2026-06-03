(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RoutePlan = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function splitEntries(value) {
    return String(value || "")
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function resolveSystems(value, resolveSystem) {
    const systems = [];
    const unresolved = [];
    const seen = new Set();

    splitEntries(value).forEach((entry) => {
      const system = resolveSystem(entry);
      if (!system) {
        unresolved.push(entry);
        return;
      }
      if (seen.has(system.id)) return;
      seen.add(system.id);
      systems.push(system);
    });

    return { systems, unresolved };
  }

  function normalizeSystemsText(systems, formatSystem) {
    return systems.map((system) => formatSystem(system)).join("\n");
  }

  function collapseAdjacentStops(stops) {
    return stops.filter((system, index) => index === 0 || system.id !== stops[index - 1].id);
  }

  function buildRoutePlan(origin, destination, waypoints) {
    const stops = collapseAdjacentStops([origin].concat(Array.isArray(waypoints) ? waypoints : [], [destination]).filter(Boolean));
    const legs = [];

    for (let index = 0; index < stops.length - 1; index++) {
      legs.push({
        origin: stops[index],
        destination: stops[index + 1],
        legIndex: index,
      });
    }

    return {
      stops,
      legs,
      waypointCount: Math.max(0, stops.length - 2),
    };
  }

  function mergeRouteSegments(segments) {
    if (!Array.isArray(segments) || !segments.length) return null;

    const path = [];
    const edges = [];
    const checkpoints = [];
    let cost = 0;
    let fuelBestCost = 0;

    segments.forEach((segment, index) => {
      if (!segment?.path?.length) return;
      const offset = path.length;
      if (index === 0) {
        path.push(...segment.path);
        checkpoints.push({ pathIndex: 0, systemId: segment.path[0].id, type: "origin", order: 0 });
      } else {
        path.push(...segment.path.slice(1));
      }

      edges.push(...(segment.edges || []));
      cost += Number(segment.cost) || 0;
      fuelBestCost += Number(segment.fuelBestCost ?? segment.cost) || 0;

      checkpoints.push({
        pathIndex: offset + segment.path.length - 1 - (index === 0 ? 0 : 1),
        systemId: segment.path[segment.path.length - 1].id,
        type: index === segments.length - 1 ? "destination" : "via",
        order: index === segments.length - 1 ? segments.length - 1 : index + 1,
      });
    });

    return {
      path,
      edges,
      checkpoints,
      cost,
      fuelBestCost,
    };
  }

  return {
    buildRoutePlan,
    mergeRouteSegments,
    normalizeSystemsText,
    resolveSystems,
    splitEntries,
  };
});
