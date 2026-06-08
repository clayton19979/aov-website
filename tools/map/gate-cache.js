(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GateCache = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const CACHE_VERSION = 1;

  function sanitizeGate(gate) {
    if (!gate || !Number.isFinite(Number(gate.from)) || !Number.isFinite(Number(gate.to))) return null;
    const from = Number(gate.from);
    const to = Number(gate.to);
    if (!from || !to || from === to) return null;
    return {
      from,
      to,
      name: gate.name || "Stargate",
      kind: gate.kind || "game",
      count: Math.max(1, Number(gate.count || 1)),
      online: gate.online !== false,
    };
  }

  function sanitizeSmartGateStats(stats) {
    if (!stats || typeof stats !== "object") return null;
    const read = (value) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? number : 0;
    };
    return {
      total: read(stats.total),
      onlineLinked: read(stats.onlineLinked),
      openLinked: read(stats.openLinked),
      restricted: read(stats.restricted),
      publicLocated: read(stats.publicLocated),
      routedLinks: read(stats.routedLinks),
    };
  }

  function read(storage, key, ttlMs) {
    try {
      const raw = storage?.getItem?.(key);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || cached.version !== CACHE_VERSION || !Number.isFinite(cached.savedAt)) return null;
      if (Number.isFinite(ttlMs) && ttlMs > 0 && Date.now() - cached.savedAt > ttlMs) return null;
      const gates = Array.isArray(cached.gates) ? cached.gates.map(sanitizeGate).filter(Boolean) : [];
      if (!gates.length) return null;
      return {
        savedAt: cached.savedAt,
        sourceLabel: typeof cached.sourceLabel === "string" ? cached.sourceLabel : "",
        gates,
        smartGateStats: sanitizeSmartGateStats(cached.smartGateStats),
      };
    } catch {
      return null;
    }
  }

  function write(storage, key, payload) {
    try {
      const gates = Array.isArray(payload?.gates) ? payload.gates.map(sanitizeGate).filter(Boolean) : [];
      if (!gates.length) return false;
      const record = {
        version: CACHE_VERSION,
        savedAt: Number.isFinite(payload?.savedAt) ? payload.savedAt : Date.now(),
        sourceLabel: typeof payload?.sourceLabel === "string" ? payload.sourceLabel : "",
        gates,
        smartGateStats: sanitizeSmartGateStats(payload?.smartGateStats),
      };
      storage?.setItem?.(key, JSON.stringify(record));
      return true;
    } catch {
      return false;
    }
  }

  function clear(storage, key) {
    try {
      storage?.removeItem?.(key);
      return true;
    } catch {
      return false;
    }
  }

  return {
    CACHE_VERSION,
    clear,
    read,
    sanitizeGate,
    sanitizeSmartGateStats,
    write,
  };
});