const test = require("node:test");
const assert = require("node:assert/strict");
const MapStateShare = require("./map-state-share.js");

test("MapStateShare builds a share URL with route and overlay state", () => {
  const url = MapStateShare.buildShareUrl({
    origin: "30000123",
    destination: 30000456,
    via: "Waypoint 30000789",
    jumpDistance: 180,
    optimize: "jumps",
    useGates: false,
    showGameGates: false,
    showSmartGateLinks: true,
    avoidKills: true,
    showJumpRange: true,
    showKills: false,
    killWindow: 6,
    showKillLabels: true,
    showAssemblies: true,
    assembliesOnlineOnly: true,
    showPlayerBases: true,
  }, "https://example.com/tools/map/index.html?stale=1");

  const params = new URL(url).searchParams;
  assert.equal(params.get("system1"), "30000123");
  assert.equal(params.get("system2"), "30000456");
  assert.equal(params.get("via"), "30000789");
  assert.equal(params.get("jumpDistance"), "180");
  assert.equal(params.get("optimize"), "jumps");
  assert.equal(params.get("useGates"), "0");
  assert.equal(params.get("showGameGates"), "0");
  assert.equal(params.get("showSmartGateLinks"), null);
  assert.equal(params.get("avoidKills"), "1");
  assert.equal(params.get("showJumpRange"), "1");
  assert.equal(params.get("showKills"), "1");
  assert.equal(params.get("killWindow"), "6");
  assert.equal(params.get("showKillLabels"), "1");
  assert.equal(params.get("showAssemblies"), "1");
  assert.equal(params.get("assembliesOnlineOnly"), "1");
  assert.equal(params.get("showPlayerBases"), "1");
  assert.equal(params.get("stale"), null);
});

test("MapStateShare parses share URLs and falls back to defaults", () => {
  const parsed = MapStateShare.parseShareState("https://example.com/tools/map/index.html?system1=30000123&system2=30000456&via=30000789&jumpDistance=oops&optimize=bad&useGates=no&showGameGates=off&showSmartGateLinks=0&avoidKills=1&showJumpRange=yes&killWindow=7&showKillLabels=true&showAssemblies=1&assembliesOnlineOnly=1&showPlayerBases=1");

  assert.deepEqual(parsed, {
    origin: "30000123",
    destination: "30000456",
    via: "30000789",
    jumpDistance: 120,
    optimize: "fuel",
    useGates: false,
    showGameGates: false,
    showSmartGateLinks: false,
    avoidKills: true,
    showJumpRange: true,
    showKills: true,
    killWindow: 7,
    showKillLabels: true,
    showAssemblies: true,
    assembliesOnlineOnly: true,
    showPlayerBases: true,
    rawQuery: "?system1=30000123&system2=30000456&via=30000789&jumpDistance=oops&optimize=bad&useGates=no&showGameGates=off&showSmartGateLinks=0&avoidKills=1&showJumpRange=yes&killWindow=7&showKillLabels=true&showAssemblies=1&assembliesOnlineOnly=1&showPlayerBases=1",
  });
});

test("MapStateShare returns defaults for empty or incomplete route state", () => {
  const parsed = MapStateShare.parseShareState("https://example.com/tools/map/index.html");
  assert.equal(MapStateShare.buildShareUrl({ destination: "30000456" }, "https://example.com/tools/map/index.html"), "");
  assert.equal(parsed.origin, "");
  assert.equal(parsed.destination, "");
  assert.equal(parsed.via, "");
  assert.equal(parsed.jumpDistance, MapStateShare.DEFAULTS.jumpDistance);
  assert.equal(parsed.optimize, MapStateShare.DEFAULTS.optimize);
  assert.equal(parsed.useGates, MapStateShare.DEFAULTS.useGates);
  assert.equal(parsed.showKills, MapStateShare.DEFAULTS.showKills);
  assert.equal(parsed.rawQuery, "");
});