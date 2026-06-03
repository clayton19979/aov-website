import { describe, expect, it } from "vitest";
import {
  BaseSnapshot,
  ChainObject,
  buildRealWarnings,
  filterInventorySummary,
  filterObjects,
  filterWarnings,
  formatDuration,
  getFuelEta,
  getKpis,
  getSnapshotFreshness,
  getStatus,
  parseSnapshotPayload,
  serializeSnapshot,
  summarizeInventory,
} from "./baseOps";
import { loadStoredSnapshot, normalizeOwnerAddress, snapshotCacheKey, storeSnapshot } from "./snapshotStore";

const node: ChainObject = {
  id: "0xnode",
  typeRepr: "0xpkg::network_node::NetworkNode",
  kind: "Network Node",
  inventories: [],
  json: {
    id: "0xnode",
    type_id: "88092",
    status: { status: { "@variant": "OFFLINE" } },
    metadata: { name: "Real Node" },
    fuel: {
      quantity: "0",
      max_capacity: "100000",
      burn_rate_in_ms: "3600000",
      is_burning: false,
    },
    energy_source: {
      current_energy_production: "0",
      max_energy_production: "1000",
      total_reserved_energy: "0",
    },
    connected_assembly_ids: ["0xassembly"],
  },
};

const assembly: ChainObject = {
  id: "0xassembly",
  typeRepr: "0xpkg::assembly::Assembly",
  kind: "Assembly",
  inventories: [],
  json: {
    id: "0xassembly",
    type_id: "88070",
    status: { status: { "@variant": "OFFLINE" } },
    metadata: { name: "Real Assembly" },
    energy_source_id: "0xnode",
  },
};

const storage: ChainObject = {
  id: "0xstorage",
  typeRepr: "0xpkg::storage_unit::StorageUnit",
  kind: "Storage Unit",
  json: {
    id: "0xstorage",
    type_id: "88082",
    status: { status: { "@variant": "ONLINE" } },
    metadata: { name: "Real Storage" },
  },
  inventories: [
    {
      id: "0xinventory",
      key: "0xkey",
      maxCapacity: 100,
      usedCapacity: 95,
      items: [{ key: "77800", tenant: "stillness", typeId: "77800", itemId: "0", name: "Common Ore", volume: 100, quantity: 1 }],
    },
  ],
};

const storageTwo: ChainObject = {
  id: "0xstorage2",
  typeRepr: "0xpkg::storage_unit::StorageUnit",
  kind: "Storage Unit",
  json: {
    id: "0xstorage2",
    type_id: "88082",
    status: { status: { "@variant": "ONLINE" } },
    metadata: { name: "Real Storage 2" },
  },
  inventories: [
    {
      id: "0xinventory2",
      key: "0xkey2",
      maxCapacity: 120,
      usedCapacity: 40,
      items: [
        { key: "77800", tenant: "stillness", typeId: "77800", itemId: "0", name: "Common Ore", volume: 25, quantity: 4 },
        { key: "88001", tenant: "stillness", typeId: "88001", itemId: "7", name: "Fuel Block", volume: 15, quantity: 2 },
      ],
    },
  ],
};

const snapshot: BaseSnapshot = {
  ownerAddress: "0xabc123",
  generatedAt: new Date(0).toISOString(),
  network: "testnet",
  tenant: "stillness",
  character: null,
  objects: [node, assembly, storage, storageTwo],
  errors: ["GraphQL partial data warning"],
};

describe("real chain snapshot helpers", () => {
  it("reads object status from on-chain status variants", () => {
    expect(getStatus(node)).toBe("OFFLINE");
    expect(getStatus(storage)).toBe("ONLINE");
  });

  it("builds KPIs only from provided chain objects", () => {
    expect(getKpis(snapshot)).toMatchObject({
      smartObjects: 4,
      onlineObjects: 2,
      offlineObjects: 2,
      totalFuel: 0,
      totalUsedCapacity: 135,
      totalMaxCapacity: 220,
    });
  });

  it("flags empty fuel and offline network nodes using real fields", () => {
    const warnings = buildRealWarnings(snapshot);

    expect(warnings.some((warning) => warning.id === "0xnode-fuel-empty")).toBe(true);
    expect(warnings.some((warning) => warning.id === "0xnode-offline")).toBe(true);
  });

  it("flags offline linked assemblies and high storage pressure", () => {
    const warnings = buildRealWarnings(snapshot);

    expect(warnings.some((warning) => warning.id === "0xassembly-offline")).toBe(true);
    expect(warnings.some((warning) => warning.id === "0xstorage-0xkey-capacity")).toBe(true);
  });

  it("includes GraphQL warnings in the operational warning list", () => {
    const warnings = buildRealWarnings(snapshot);

    expect(warnings.some((warning) => warning.id === "snapshot-error-0")).toBe(true);
  });

  it("serializes and parses exported snapshots", () => {
    const exported = serializeSnapshot(snapshot);
    const parsed = parseSnapshotPayload(JSON.parse(exported));

    expect(parsed).toEqual(snapshot);
  });

  it("parses raw snapshot objects without an export envelope", () => {
    const parsed = parseSnapshotPayload(snapshot);

    expect(parsed.character).toBeNull();
    expect(parsed.objects).toHaveLength(4);
    expect(parsed.objects[2].inventories[0].items[0].name).toBe("Common Ore");
  });

  it("summarizes inventory totals across storage units", () => {
    const summary = summarizeInventory(snapshot);

    expect(summary).toEqual([
      {
        typeId: "77800",
        itemId: "0",
        name: "Common Ore",
        tenant: "stillness",
        totalQuantity: 5,
        totalVolume: 125,
        storageUnits: 2,
        inventories: 2,
      },
      {
        typeId: "88001",
        itemId: "7",
        name: "Fuel Block",
        tenant: "stillness",
        totalQuantity: 2,
        totalVolume: 15,
        storageUnits: 1,
        inventories: 1,
      },
    ]);
  });

  it("filters warnings by severity and query text", () => {
    const warnings = buildRealWarnings(snapshot);
    const filtered = filterWarnings(warnings, { severity: "critical", query: "fuel" });

    expect(filtered.map((warning) => warning.id)).toEqual(["0xnode-fuel-empty"]);
  });

  it("filters objects by status, kind, and related inventory text", () => {
    expect(
      filterObjects(snapshot.objects, {
        status: "ONLINE",
        kind: "Storage Unit",
        query: "fuel block",
      }).map((object) => object.id),
    ).toEqual(["0xstorage2"]);
  });

  it("filters inventory summary rows by item metadata", () => {
    const summary = summarizeInventory(snapshot);

    expect(filterInventorySummary(summary, "fuel block").map((item) => item.typeId)).toEqual(["88001"]);
    expect(filterInventorySummary(summary, "").length).toBe(summary.length);
  });

  it("rejects malformed snapshot payloads", () => {
    expect(() => parseSnapshotPayload({ hello: "world" })).toThrow("missing required top-level fields");
  });

  it("warns when a burning network node is nearing fuel exhaustion", () => {
    const lowFuelNode: ChainObject = {
      ...node,
      id: "0xnode-low-fuel",
      json: {
        ...node.json,
        id: "0xnode-low-fuel",
        fuel: {
          quantity: "12",
          max_capacity: "100000",
          burn_rate_in_ms: "3600000",
          is_burning: true,
        },
        status: { status: { "@variant": "ONLINE" } },
      },
    };
    const lowFuelSnapshot: BaseSnapshot = {
      ...snapshot,
      objects: [lowFuelNode],
      errors: [],
    };

    const warnings = buildRealWarnings(lowFuelSnapshot);

    expect(warnings.some((warning) => warning.id === "0xnode-low-fuel-fuel-critical")).toBe(true);
    expect(getFuelEta(lowFuelNode)).toBe("12h");
  });

  it("classifies snapshot freshness by age", () => {
    const freshSnapshot = {
      ...snapshot,
      generatedAt: new Date("2026-06-03T10:30:00.000Z").toISOString(),
    };

    expect(getSnapshotFreshness(freshSnapshot, Date.parse("2026-06-03T11:00:00.000Z"))).toMatchObject({
      severity: "stable",
      label: "Fresh snapshot",
    });

    const stale = getSnapshotFreshness(snapshot, Date.parse("2026-06-03T12:00:00.000Z"));
    expect(stale.severity).toBe("critical");
    expect(stale.label).toContain("Snapshot is");
    expect(stale.label).toContain("old");
  });

  it("normalizes duration formatting when minutes round up to an hour", () => {
    expect(formatDuration(1.999)).toBe("2h");
    expect(formatDuration(1 / 120)).toBe("1m");
  });
});

describe("snapshot owner and cache helpers", () => {
  it("normalizes valid owner addresses and rejects invalid ones", () => {
    expect(normalizeOwnerAddress(" 0xABC123 ")).toBe("0xabc123");
    expect(normalizeOwnerAddress("wallet")).toBeNull();
    expect(normalizeOwnerAddress("0x-not-hex")).toBeNull();
  });

  it("stores snapshots under an owner-specific cache key", () => {
    const writes: Array<{ key: string; owner: string }> = [];

    storeSnapshot((key, nextSnapshot) => {
      writes.push({ key, owner: nextSnapshot.ownerAddress });
    }, snapshot);

    expect(writes).toEqual([{ key: snapshotCacheKey(snapshot.ownerAddress), owner: snapshot.ownerAddress }]);
  });

  it("loads only the cached snapshot for the requested owner", () => {
    const storage = new Map<string, BaseSnapshot>([
      [snapshotCacheKey(snapshot.ownerAddress), snapshot],
      [
        snapshotCacheKey("0xdef456"),
        {
          ...snapshot,
          ownerAddress: "0xdef456",
        },
      ],
    ]);

    const loaded = loadStoredSnapshot((key) => storage.get(key) ?? null, snapshot.ownerAddress);

    expect(loaded?.ownerAddress).toBe(snapshot.ownerAddress);
  });

  it("falls back to the legacy cache entry only when the owner matches", () => {
    const legacyKey = "baseops-command-center:last-snapshot";
    const storage = new Map<string, BaseSnapshot>([[legacyKey, snapshot]]);

    expect(loadStoredSnapshot((key) => storage.get(key) ?? null, snapshot.ownerAddress)?.ownerAddress).toBe(snapshot.ownerAddress);
    expect(loadStoredSnapshot((key) => storage.get(key) ?? null, "0x789abc")).toBeNull();
  });
});
