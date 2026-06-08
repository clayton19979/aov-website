const test = require("node:test");
const assert = require("node:assert/strict");
const GateCache = require("./gate-cache.js");

test("GateCache round-trips normalized gate networks", () => {
  const storage = new Map();
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
    removeItem(key) {
      storage.delete(key);
    },
  };

  const written = GateCache.write(localStorage, "gates", {
    sourceLabel: "cached route links",
    gates: [
      { from: "300001", to: 300002, kind: "smart", count: "2", online: true, name: "Public Smart Gate" },
      { from: 0, to: 300003 },
    ],
    smartGateStats: {
      total: "7",
      onlineLinked: 6,
      openLinked: 5,
      restricted: 1,
      publicLocated: "4",
      routedLinks: 2,
    },
  });

  assert.equal(written, true);
  const cached = GateCache.read(localStorage, "gates", 60_000);
  assert.equal(typeof cached.savedAt, "number");
  assert.deepEqual(cached, {
    savedAt: cached.savedAt,
    sourceLabel: "cached route links",
    gates: [
      {
        from: 300001,
        to: 300002,
        kind: "smart",
        count: 2,
        online: true,
        name: "Public Smart Gate",
      },
    ],
    smartGateStats: {
      total: 7,
      onlineLinked: 6,
      openLinked: 5,
      restricted: 1,
      publicLocated: 4,
      routedLinks: 2,
    },
  });
});

test("GateCache drops expired or malformed cache entries", () => {
  const storage = new Map();
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
  };

  localStorage.setItem("expired", JSON.stringify({
    version: GateCache.CACHE_VERSION,
    savedAt: Date.now() - 120_000,
    gates: [{ from: 300001, to: 300002 }],
  }));
  localStorage.setItem("broken", "{");

  assert.equal(GateCache.read(localStorage, "expired", 60_000), null);
  assert.equal(GateCache.read(localStorage, "broken", 60_000), null);
});
