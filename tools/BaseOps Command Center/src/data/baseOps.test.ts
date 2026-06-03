import { describe, expect, it } from "vitest";
import { BaseSnapshot, ChainObject, buildRealWarnings, getKpis, getStatus, parseSnapshotPayload, serializeSnapshot } from "./baseOps";

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

const snapshot: BaseSnapshot = {
  ownerAddress: "0xwallet",
  generatedAt: new Date(0).toISOString(),
  network: "testnet",
  tenant: "stillness",
  character: null,
  objects: [node, assembly, storage],
  errors: [],
};

describe("real chain snapshot helpers", () => {
  it("reads object status from on-chain status variants", () => {
    expect(getStatus(node)).toBe("OFFLINE");
    expect(getStatus(storage)).toBe("ONLINE");
  });

  it("builds KPIs only from provided chain objects", () => {
    expect(getKpis(snapshot)).toMatchObject({
      smartObjects: 3,
      onlineObjects: 1,
      offlineObjects: 2,
      totalFuel: 0,
      totalUsedCapacity: 95,
      totalMaxCapacity: 100,
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

  it("serializes and parses exported snapshots", () => {
    const exported = serializeSnapshot(snapshot);
    const parsed = parseSnapshotPayload(JSON.parse(exported));

    expect(parsed).toEqual(snapshot);
  });

  it("parses raw snapshot objects without an export envelope", () => {
    const parsed = parseSnapshotPayload(snapshot);

    expect(parsed.character).toBeNull();
    expect(parsed.objects).toHaveLength(3);
    expect(parsed.objects[2].inventories[0].items[0].name).toBe("Common Ore");
  });

  it("rejects malformed snapshot payloads", () => {
    expect(() => parseSnapshotPayload({ hello: "world" })).toThrow("missing required top-level fields");
  });
});
