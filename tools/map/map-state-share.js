(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MapStateShare = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const DEFAULTS = {
    jumpDistance: 120,
    optimize: "fuel",
    useGates: true,
    showGameGates: true,
    showSmartGateLinks: true,
    avoidKills: false,
    showJumpRange: false,
    showKills: false,
    killWindow: 24,
    showKillLabels: false,
    showAssemblies: false,
    assembliesOnlineOnly: false,
    showPlayerBases: false,
  };

  const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
  const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

  function normalizeRouteId(value) {
    if (value === null || value === undefined) return "";
    const match = String(value).match(/\d+/);
    return match ? match[0] : "";
  }

  function normalizeOptionalText(value) {
    return String(value ?? "").trim();
  }

  function readBoolean(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    return fallback;
  }

  function readPositiveInteger(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return fallback;
    return Math.round(number);
  }

  function readOptimizeMode(value) {
    return value === "jumps" ? "jumps" : DEFAULTS.optimize;
  }

  function setBoolIfChanged(params, key, value, defaultValue) {
    if (value !== defaultValue) params.set(key, value ? "1" : "0");
  }

  function buildShareUrl(routeState, baseUrl) {
    const origin = normalizeRouteId(routeState?.origin);
    const destination = normalizeRouteId(routeState?.destination);
    if (!origin || !destination) return "";

    const params = new URLSearchParams();
    params.set("system1", origin);
    params.set("system2", destination);

    const via = normalizeRouteId(routeState?.via);
    if (via) params.set("via", via);

    const jumpDistance = readPositiveInteger(routeState?.jumpDistance, DEFAULTS.jumpDistance);
    params.set("jumpDistance", String(jumpDistance));

    const optimize = readOptimizeMode(routeState?.optimize);
    params.set("optimize", optimize);

    const useGates = readBoolean(routeState?.useGates, DEFAULTS.useGates);
    params.set("useGates", useGates ? "1" : "0");

    setBoolIfChanged(params, "showGameGates", readBoolean(routeState?.showGameGates, DEFAULTS.showGameGates), DEFAULTS.showGameGates);
    setBoolIfChanged(params, "showSmartGateLinks", readBoolean(routeState?.showSmartGateLinks, DEFAULTS.showSmartGateLinks), DEFAULTS.showSmartGateLinks);
    setBoolIfChanged(params, "avoidKills", readBoolean(routeState?.avoidKills, DEFAULTS.avoidKills), DEFAULTS.avoidKills);
    setBoolIfChanged(params, "showJumpRange", readBoolean(routeState?.showJumpRange, DEFAULTS.showJumpRange), DEFAULTS.showJumpRange);

    const showKills = readBoolean(routeState?.showKills, DEFAULTS.showKills) || readBoolean(routeState?.avoidKills, DEFAULTS.avoidKills);
    setBoolIfChanged(params, "showKills", showKills, DEFAULTS.showKills);

    const killWindow = readPositiveInteger(routeState?.killWindow, DEFAULTS.killWindow);
    if (showKills && killWindow !== DEFAULTS.killWindow) params.set("killWindow", String(killWindow));

    setBoolIfChanged(params, "showKillLabels", readBoolean(routeState?.showKillLabels, DEFAULTS.showKillLabels), DEFAULTS.showKillLabels);
    setBoolIfChanged(params, "showAssemblies", readBoolean(routeState?.showAssemblies, DEFAULTS.showAssemblies), DEFAULTS.showAssemblies);
    setBoolIfChanged(params, "assembliesOnlineOnly", readBoolean(routeState?.assembliesOnlineOnly, DEFAULTS.assembliesOnlineOnly), DEFAULTS.assembliesOnlineOnly);
    setBoolIfChanged(params, "showPlayerBases", readBoolean(routeState?.showPlayerBases, DEFAULTS.showPlayerBases), DEFAULTS.showPlayerBases);

    const url = new URL(baseUrl);
    url.search = params.toString();
    return url.toString();
  }

  function parseShareState(urlOrHref) {
    const url = new URL(urlOrHref);
    const params = url.searchParams;
    const avoidKills = readBoolean(params.get("avoidKills"), DEFAULTS.avoidKills);
    const showKills = readBoolean(params.get("showKills"), DEFAULTS.showKills) || avoidKills;

    return {
      origin: normalizeRouteId(params.get("system1")),
      destination: normalizeRouteId(params.get("system2")),
      via: normalizeRouteId(params.get("via")),
      jumpDistance: readPositiveInteger(params.get("jumpDistance"), DEFAULTS.jumpDistance),
      optimize: readOptimizeMode(params.get("optimize")),
      useGates: readBoolean(params.get("useGates"), DEFAULTS.useGates),
      showGameGates: readBoolean(params.get("showGameGates"), DEFAULTS.showGameGates),
      showSmartGateLinks: readBoolean(params.get("showSmartGateLinks"), DEFAULTS.showSmartGateLinks),
      avoidKills,
      showJumpRange: readBoolean(params.get("showJumpRange"), DEFAULTS.showJumpRange),
      showKills,
      killWindow: readPositiveInteger(params.get("killWindow"), DEFAULTS.killWindow),
      showKillLabels: readBoolean(params.get("showKillLabels"), DEFAULTS.showKillLabels),
      showAssemblies: readBoolean(params.get("showAssemblies"), DEFAULTS.showAssemblies),
      assembliesOnlineOnly: readBoolean(params.get("assembliesOnlineOnly"), DEFAULTS.assembliesOnlineOnly),
      showPlayerBases: readBoolean(params.get("showPlayerBases"), DEFAULTS.showPlayerBases),
      rawQuery: normalizeOptionalText(url.search),
    };
  }

  return {
    DEFAULTS,
    buildShareUrl,
    normalizeRouteId,
    parseShareState,
    readBoolean,
    readPositiveInteger,
    readOptimizeMode,
  };
});