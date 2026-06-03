export const DEFAULT_OWNER =
  "0x2738102e7ea6d6149029b146d45b5dcdd6c5923e33fae636a41a2551a8166b34";

export const SUI_GRAPHQL_ENDPOINT = "https://graphql.testnet.sui.io/graphql";
export const EVE_TENANT = "stillness";
export const EVE_WORLD_PACKAGE_ID =
  "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c";
export const EVE_DATAHUB_HOST = "world-api-stillness.live.tech.evefrontier.com";

const CHARACTER_PLAYER_PROFILE_TYPE = `${EVE_WORLD_PACKAGE_ID}::character::PlayerProfile`;

export type Severity = "critical" | "warning" | "info" | "stable";

export type ObjectKind =
  | "Assembly"
  | "Network Node"
  | "Storage Unit"
  | "Smart Gate"
  | "Character"
  | "Unknown";

export type ChainStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";

export type RawObjectJson = {
  id?: string;
  key?: {
    item_id?: string;
    tenant?: string;
  };
  owner_cap_id?: string;
  type_id?: string;
  status?: {
    status?: {
      "@variant"?: string;
    };
  };
  location?: {
    location_hash?: string;
    structure_id?: string;
  };
  metadata?: {
    assembly_id?: string;
    name?: string;
    description?: string;
    url?: string;
  };
  energy_source_id?: string;
  linked_gate_id?: string;
  tribe_id?: number;
  character_address?: string;
  inventory_keys?: string[];
  extension?: string | null;
  connected_assembly_ids?: string[];
  fuel?: {
    max_capacity?: string;
    burn_rate_in_ms?: string;
    type_id?: string;
    unit_volume?: string;
    quantity?: string;
    is_burning?: boolean;
    previous_cycle_elapsed_time?: string;
    burn_start_time?: string;
    last_updated?: string;
  };
  energy_source?: {
    max_energy_production?: string;
    current_energy_production?: string;
    total_reserved_energy?: string;
  };
};

export type ChainObject = {
  id: string;
  typeRepr: string;
  kind: ObjectKind;
  json: RawObjectJson;
  inventories: InventorySnapshot[];
};

export type InventoryItem = {
  key: string;
  tenant: string;
  typeId: string;
  itemId: string;
  name: string;
  volume: number;
  quantity: number;
};

export type InventorySnapshot = {
  id: string;
  key: string;
  maxCapacity: number;
  usedCapacity: number;
  items: InventoryItem[];
};

export type InventorySummary = {
  typeId: string;
  itemId: string;
  name: string;
  tenant: string;
  totalQuantity: number;
  totalVolume: number;
  storageUnits: number;
  inventories: number;
};

export type CharacterSnapshot = {
  id: string;
  itemId: string;
  tenant: string;
  tribeId: number | null;
  address: string;
  name: string;
};

export type BaseSnapshot = {
  ownerAddress: string;
  generatedAt: string;
  network: "testnet";
  tenant: string;
  character: CharacterSnapshot | null;
  objects: ChainObject[];
  errors: string[];
};

export type RealWarning = {
  id: string;
  severity: Severity;
  title: string;
  source: string;
  detail: string;
};

export type SnapshotExport = {
  version: 1;
  exportedAt: string;
  snapshot: BaseSnapshot;
};

export type SnapshotFreshness = {
  hours: number | null;
  severity: Severity;
  label: string;
};

const GET_CHARACTER_AND_OWNED_OBJECTS = `
query GetCharacterAndOwnedObjects($owner: SuiAddress!, $characterPlayerProfileType: String!) {
  address(address: $owner) {
    objects(last: 1, filter: { type: $characterPlayerProfileType }) {
      nodes {
        contents {
          extract(path: "character_id") {
            asAddress {
              asObject {
                asMoveObject {
                  contents {
                    type { repr }
                    json
                  }
                }
              }
              objects {
                nodes {
                  contents {
                    extract(path: "authorized_object_id") {
                      asAddress {
                        asObject {
                          asMoveObject {
                            contents {
                              type { repr }
                              json
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

const GET_OBJECT_WITH_DYNAMIC_FIELDS = `
query GetObjectWithDynamicFields($objectId: SuiAddress!) {
  object(address: $objectId) {
    address
    asMoveObject {
      contents {
        type { repr }
        json
      }
      dynamicFields {
        nodes {
          contents {
            json
          }
          name {
            json
          }
        }
      }
    }
  }
}`;

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type OwnedNode = {
  contents?: {
    extract?: {
      asAddress?: {
        asObject?: {
          asMoveObject?: {
            contents?: {
              type?: { repr?: string };
              json?: RawObjectJson;
            };
          };
        };
      };
    };
  };
};

type CharacterQueryResponse = {
  address?: {
    objects?: {
      nodes?: Array<{
        contents?: {
          extract?: {
            asAddress?: {
              asObject?: {
                asMoveObject?: {
                  contents?: {
                    type?: { repr?: string };
                    json?: RawObjectJson;
                  };
                };
              };
              objects?: {
                nodes?: OwnedNode[];
              };
            };
          };
        };
      }>;
    };
  };
};

type DynamicFieldsResponse = {
  object?: {
    address?: string;
    asMoveObject?: {
      contents?: {
        type?: { repr?: string };
        json?: RawObjectJson;
      };
      dynamicFields?: {
        nodes?: Array<{
          contents?: {
            json?: {
              id?: string;
              name?: string;
              value?: {
                max_capacity?: string;
                used_capacity?: string;
                items?: {
                  contents?: Array<{
                    key?: string;
                    value?: {
                      tenant?: string;
                      type_id?: string;
                      item_id?: string;
                      volume?: string;
                      quantity?: number;
                    };
                  }>;
                };
              };
            };
          };
          name?: {
            json?: string;
          };
        }>;
      };
    };
  };
};

type DatahubTypeInfo = {
  id?: number;
  name?: string;
};

const typeNameCache = new Map<string, string>();
const SNAPSHOT_EXPORT_VERSION = 1;

async function executeGraphQLQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<GraphQLResponse<T>> {
  const response = await fetch(SUI_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Sui GraphQL returned HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchBaseSnapshot(ownerAddress: string): Promise<BaseSnapshot> {
  const response = await executeGraphQLQuery<CharacterQueryResponse>(GET_CHARACTER_AND_OWNED_OBJECTS, {
    owner: ownerAddress,
    characterPlayerProfileType: CHARACTER_PLAYER_PROFILE_TYPE,
  });

  const root = response.data?.address?.objects?.nodes?.[0]?.contents?.extract?.asAddress;
  const characterJson = root?.asObject?.asMoveObject?.contents?.json;
  const ownedNodes = root?.objects?.nodes ?? [];
  const errors = response.errors?.map((error) => error.message) ?? [];

  const baseObjects = ownedNodes
    .map((node): ChainObject | null => {
      const contents = node.contents?.extract?.asAddress?.asObject?.asMoveObject?.contents;
      const json = contents?.json;
      const typeRepr = contents?.type?.repr ?? "";
      if (!json?.id || !typeRepr || getObjectKind(typeRepr) === "Character") {
        return null;
      }

      return {
        id: json.id,
        typeRepr,
        kind: getObjectKind(typeRepr),
        json,
        inventories: [],
      };
    })
    .filter((object): object is ChainObject => object !== null);

  const objects = await Promise.all(
    baseObjects.map(async (object) => {
      if (object.kind !== "Storage Unit") {
        return object;
      }

      try {
        const dynamic = await executeGraphQLQuery<DynamicFieldsResponse>(GET_OBJECT_WITH_DYNAMIC_FIELDS, {
          objectId: object.id,
        });
        const inventories = extractInventories(dynamic.data);
        await hydrateInventoryItemNames(inventories);
        return {
          ...object,
          inventories,
        };
      } catch {
        return object;
      }
    }),
  );

  return {
    ownerAddress,
    generatedAt: new Date().toISOString(),
    network: "testnet",
    tenant: EVE_TENANT,
    character: characterJson ? parseCharacter(characterJson, ownerAddress) : null,
    objects,
    errors,
  };
}

export function getObjectKind(typeRepr: string): ObjectKind {
  if (typeRepr.includes("::network_node::NetworkNode")) return "Network Node";
  if (typeRepr.includes("::storage_unit::StorageUnit")) return "Storage Unit";
  if (typeRepr.includes("::gate::Gate")) return "Smart Gate";
  if (typeRepr.includes("::assembly::Assembly")) return "Assembly";
  if (typeRepr.includes("::character::Character")) return "Character";
  return "Unknown";
}

export function getStatus(object: ChainObject): ChainStatus {
  const status = object.json.status?.status?.["@variant"];
  if (status === "ONLINE" || status === "OFFLINE") {
    return status;
  }

  return "UNKNOWN";
}

export function getDisplayName(object: ChainObject): string {
  const name = object.json.metadata?.name?.trim();
  if (name) {
    return name;
  }

  const itemId = object.json.key?.item_id;
  return itemId ? `${object.kind} ${itemId}` : object.kind;
}

export function getKpis(snapshot: BaseSnapshot) {
  const smartObjects = snapshot.objects.filter((object) => object.kind !== "Unknown");
  const onlineObjects = smartObjects.filter((object) => getStatus(object) === "ONLINE").length;
  const offlineObjects = smartObjects.filter((object) => getStatus(object) === "OFFLINE").length;
  const networkNodes = smartObjects.filter((object) => object.kind === "Network Node");
  const storageUnits = smartObjects.filter((object) => object.kind === "Storage Unit");
  const gates = smartObjects.filter((object) => object.kind === "Smart Gate");
  const totalFuel = networkNodes.reduce((total, node) => total + toNumber(node.json.fuel?.quantity), 0);
  const storage = storageUnits.flatMap((unit) => unit.inventories);
  const totalUsedCapacity = storage.reduce((total, inventory) => total + inventory.usedCapacity, 0);
  const totalMaxCapacity = storage.reduce((total, inventory) => total + inventory.maxCapacity, 0);

  return {
    smartObjects: smartObjects.length,
    onlineObjects,
    offlineObjects,
    networkNodes: networkNodes.length,
    storageUnits: storageUnits.length,
    gates: gates.length,
    totalFuel,
    totalUsedCapacity,
    totalMaxCapacity,
  };
}

export function buildRealWarnings(snapshot: BaseSnapshot): RealWarning[] {
  const warnings: RealWarning[] = [];
  const objectsById = new Map(snapshot.objects.map((object) => [object.id, object]));

  snapshot.errors.forEach((error, index) => {
    warnings.push({
      id: `snapshot-error-${index}`,
      severity: "warning",
      title: "Snapshot returned GraphQL warnings",
      source: "Sui GraphQL",
      detail: error,
    });
  });

  snapshot.objects.forEach((object) => {
    const status = getStatus(object);
    if (object.kind === "Network Node") {
      const fuelQuantity = toNumber(object.json.fuel?.quantity);
      const maxFuel = toNumber(object.json.fuel?.max_capacity);
      const fuelHoursRemaining = getFuelHoursRemaining(object);

      if (fuelQuantity === 0) {
        warnings.push({
          id: `${object.id}-fuel-empty`,
          severity: "critical",
          title: "Network node fuel is empty",
          source: getDisplayName(object),
          detail: `Fuel quantity is 0 of ${formatNumber(maxFuel)} on-chain.`,
        });
      }

      if (fuelQuantity > 0 && fuelHoursRemaining !== null) {
        if (fuelHoursRemaining <= 24) {
          warnings.push({
            id: `${object.id}-fuel-critical`,
            severity: "critical",
            title: "Network node fuel is critically low",
            source: getDisplayName(object),
            detail: `${formatDuration(fuelHoursRemaining)} of burn time remains at the current on-chain rate.`,
          });
        } else if (fuelHoursRemaining <= 72) {
          warnings.push({
            id: `${object.id}-fuel-low`,
            severity: "warning",
            title: "Network node fuel is running low",
            source: getDisplayName(object),
            detail: `${formatDuration(fuelHoursRemaining)} of burn time remains at the current on-chain rate.`,
          });
        }
      }

      if (status === "OFFLINE") {
        warnings.push({
          id: `${object.id}-offline`,
          severity: "critical",
          title: "Network node is offline",
          source: getDisplayName(object),
          detail: `${object.json.connected_assembly_ids?.length ?? 0} connected assembly IDs are recorded on-chain.`,
        });
      }
    }

    if (object.kind !== "Network Node" && status === "OFFLINE") {
      const parent = object.json.energy_source_id ? objectsById.get(object.json.energy_source_id) : undefined;
      warnings.push({
        id: `${object.id}-offline`,
        severity: "warning",
        title: `${object.kind} is offline`,
        source: getDisplayName(object),
        detail: parent ? `Linked energy source: ${getDisplayName(parent)}.` : "No linked energy source was resolved in owned objects.",
      });
    }

    object.inventories.forEach((inventory) => {
      if (inventory.maxCapacity <= 0) return;
      const pressure = inventory.usedCapacity / inventory.maxCapacity;
      if (pressure >= 0.9) {
        warnings.push({
          id: `${object.id}-${inventory.key}-capacity`,
          severity: pressure >= 1 ? "critical" : "warning",
          title: "Storage capacity is high",
          source: getDisplayName(object),
          detail: `${formatNumber(inventory.usedCapacity)} of ${formatNumber(inventory.maxCapacity)} capacity is used.`,
        });
      }
    });
  });

  return warnings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

export function summarizeInventory(snapshot: BaseSnapshot): InventorySummary[] {
  const totals = new Map<string, InventorySummary>();

  snapshot.objects
    .filter((object) => object.kind === "Storage Unit")
    .forEach((object) => {
      const touchedItemKeys = new Set<string>();

      object.inventories.forEach((inventory) => {
        inventory.items.forEach((item) => {
          const key = `${item.typeId}::${item.itemId || item.key}`;
          const existing = totals.get(key);

          if (existing) {
            existing.totalQuantity += item.quantity;
            existing.totalVolume += item.volume;
            existing.inventories += 1;
            if (!touchedItemKeys.has(key)) {
              existing.storageUnits += 1;
            }
          } else {
            totals.set(key, {
              typeId: item.typeId,
              itemId: item.itemId,
              name: item.name || `Unknown type ${item.typeId}`,
              tenant: item.tenant,
              totalQuantity: item.quantity,
              totalVolume: item.volume,
              storageUnits: 1,
              inventories: 1,
            });
          }

          touchedItemKeys.add(key);
        });
      });
    });

  return Array.from(totals.values()).sort((a, b) => {
    if (b.totalVolume !== a.totalVolume) return b.totalVolume - a.totalVolume;
    if (b.totalQuantity !== a.totalQuantity) return b.totalQuantity - a.totalQuantity;
    return a.name.localeCompare(b.name);
  });
}

export function getFuelEta(object: ChainObject): string {
  const fuelHoursRemaining = getFuelHoursRemaining(object);
  if (fuelHoursRemaining === null) {
    const fuel = object.json.fuel;
    if (!fuel) return "Unavailable";
    if (!fuel.is_burning) return "Not burning";
    return "Unavailable";
  }

  return formatDuration(fuelHoursRemaining);
}

export function getFuelHoursRemaining(object: ChainObject): number | null {
  const fuel = object.json.fuel;
  if (!fuel) return null;
  if (!fuel.is_burning) return null;
  const quantity = toNumber(fuel.quantity);
  const burnMs = toNumber(fuel.burn_rate_in_ms);
  if (quantity <= 0) return 0;
  if (burnMs <= 0) return null;
  return (quantity * burnMs) / 3_600_000;
}

export function getSnapshotFreshness(snapshot: BaseSnapshot, now = Date.now()): SnapshotFreshness {
  const generatedAt = Date.parse(snapshot.generatedAt);
  if (!Number.isFinite(generatedAt)) {
    return {
      hours: null,
      severity: "critical",
      label: "Snapshot timestamp invalid",
    };
  }

  const hours = Math.max(0, (now - generatedAt) / 3_600_000);
  if (hours < 1) {
    return { hours, severity: "stable", label: "Fresh snapshot" };
  }
  if (hours < 6) {
    return { hours, severity: "info", label: `Snapshot is ${formatDuration(hours)} old` };
  }
  if (hours < 24) {
    return { hours, severity: "warning", label: `Snapshot is ${formatDuration(hours)} old` };
  }
  return { hours, severity: "critical", label: `Snapshot is ${formatDuration(hours)} old` };
}

export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours)) return "Unavailable";
  if (hours <= 0) return "Now";
  const wholeHours = Math.floor(hours);
  const roundedMinutes = Math.round((hours - wholeHours) * 60);
  const carryHours = roundedMinutes === 60 ? 1 : 0;
  const minutes = roundedMinutes === 60 ? 0 : roundedMinutes;
  const normalizedHours = wholeHours + carryHours;
  if (normalizedHours === 0) return `${Math.max(minutes, 1)}m`;
  if (minutes === 0) return `${normalizedHours}h`;
  return `${normalizedHours}h ${minutes}m`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function shortAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function serializeSnapshot(snapshot: BaseSnapshot): string {
  const payload: SnapshotExport = {
    version: SNAPSHOT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    snapshot,
  };

  return JSON.stringify(payload, null, 2);
}

export function parseSnapshotPayload(payload: unknown): BaseSnapshot {
  const snapshotSource =
    isRecord(payload) && "snapshot" in payload && isRecord(payload.snapshot) ? payload.snapshot : payload;

  if (!isRecord(snapshotSource)) {
    throw new Error("Snapshot payload is not a JSON object.");
  }

  const ownerAddress = readString(snapshotSource.ownerAddress);
  const generatedAt = readString(snapshotSource.generatedAt);
  const network = readString(snapshotSource.network);
  const tenant = readString(snapshotSource.tenant);

  if (!ownerAddress || !generatedAt || !network || !tenant) {
    throw new Error("Snapshot payload is missing required top-level fields.");
  }

  if (network !== "testnet") {
    throw new Error(`Unsupported snapshot network "${network}".`);
  }

  return {
    ownerAddress,
    generatedAt,
    network,
    tenant,
    character: parseCharacterSnapshot(snapshotSource.character),
    objects: readArray(snapshotSource.objects).map(parseChainObject),
    errors: readStringArray(snapshotSource.errors),
  };
}

function parseCharacter(json: RawObjectJson, ownerAddress: string): CharacterSnapshot {
  return {
    id: json.id ?? "",
    itemId: json.key?.item_id ?? "",
    tenant: json.key?.tenant ?? EVE_TENANT,
    tribeId: typeof json.tribe_id === "number" ? json.tribe_id : null,
    address: json.character_address ?? ownerAddress,
    name: json.metadata?.name?.trim() || "Unnamed Character",
  } as CharacterSnapshot;
}

function parseCharacterSnapshot(value: unknown): CharacterSnapshot | null {
  if (value == null) return null;
  if (!isRecord(value)) {
    throw new Error("Snapshot character payload is invalid.");
  }

  return {
    id: readString(value.id),
    itemId: readString(value.itemId),
    tenant: readString(value.tenant) || EVE_TENANT,
    tribeId: typeof value.tribeId === "number" && Number.isFinite(value.tribeId) ? value.tribeId : null,
    address: readString(value.address),
    name: readString(value.name) || "Unnamed Character",
  };
}

function parseChainObject(value: unknown): ChainObject {
  if (!isRecord(value)) {
    throw new Error("Snapshot object payload is invalid.");
  }

  return {
    id: readString(value.id),
    typeRepr: readString(value.typeRepr),
    kind: parseObjectKind(value.kind),
    json: isRecord(value.json) ? (value.json as RawObjectJson) : {},
    inventories: readArray(value.inventories).map(parseInventorySnapshot),
  };
}

function parseInventorySnapshot(value: unknown): InventorySnapshot {
  if (!isRecord(value)) {
    throw new Error("Snapshot inventory payload is invalid.");
  }

  return {
    id: readString(value.id),
    key: readString(value.key),
    maxCapacity: readNumber(value.maxCapacity),
    usedCapacity: readNumber(value.usedCapacity),
    items: readArray(value.items).map(parseInventoryItem),
  };
}

function parseInventoryItem(value: unknown): InventoryItem {
  if (!isRecord(value)) {
    throw new Error("Snapshot inventory item payload is invalid.");
  }

  return {
    key: readString(value.key),
    tenant: readString(value.tenant),
    typeId: readString(value.typeId),
    itemId: readString(value.itemId),
    name: readString(value.name),
    volume: readNumber(value.volume),
    quantity: readNumber(value.quantity),
  };
}

function parseObjectKind(value: unknown): ObjectKind {
  switch (value) {
    case "Assembly":
    case "Network Node":
    case "Storage Unit":
    case "Smart Gate":
    case "Character":
      return value;
    default:
      return "Unknown";
  }
}

function extractInventories(data: DynamicFieldsResponse | undefined): InventorySnapshot[] {
  const nodes = data?.object?.asMoveObject?.dynamicFields?.nodes ?? [];
  return nodes
    .map((node): InventorySnapshot | null => {
      const json = node.contents?.json;
      const value = json?.value;
      if (!json?.id || !value) return null;

      return {
        id: json.id,
        key: node.name?.json ?? json.name ?? "",
        maxCapacity: toNumber(value.max_capacity),
        usedCapacity: toNumber(value.used_capacity),
        items:
          value.items?.contents?.map((item) => ({
            key: item.key ?? "",
            tenant: item.value?.tenant ?? "",
            typeId: item.value?.type_id ?? "",
            itemId: item.value?.item_id ?? "",
            name: "",
            volume: toNumber(item.value?.volume),
            quantity: item.value?.quantity ?? 0,
          })) ?? [],
      };
    })
    .filter((inventory): inventory is InventorySnapshot => inventory !== null);
}

async function hydrateInventoryItemNames(inventories: InventorySnapshot[]): Promise<void> {
  const uniqueTypeIds = Array.from(
    new Set(inventories.flatMap((inventory) => inventory.items.map((item) => item.typeId)).filter(Boolean)),
  );

  await Promise.all(uniqueTypeIds.map((typeId) => getTypeName(typeId)));

  inventories.forEach((inventory) => {
    inventory.items = inventory.items.map((item) => ({
      ...item,
      name: typeNameCache.get(item.typeId) ?? `Unknown type ${item.typeId}`,
    }));
  });
}

async function getTypeName(typeId: string): Promise<string> {
  const cached = typeNameCache.get(typeId);
  if (cached) return cached;

  try {
    const response = await fetch(`https://${EVE_DATAHUB_HOST}/v2/types/${typeId}`);
    if (!response.ok) {
      throw new Error(`Datahub returned HTTP ${response.status}`);
    }
    const data = (await response.json()) as DatahubTypeInfo;
    const name = data.name?.trim() || `Unknown type ${typeId}`;
    typeNameCache.set(typeId, name);
    return name;
  } catch {
    const fallback = `Unknown type ${typeId}`;
    typeNameCache.set(typeId, fallback);
    return fallback;
  }
}

function toNumber(value: string | number | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown): string[] {
  return readArray(value).filter((entry): entry is string => typeof entry === "string");
}

function readNumber(value: unknown): number {
  return typeof value === "number" ? (Number.isFinite(value) ? value : 0) : toNumber(typeof value === "string" ? value : undefined);
}

function severityRank(severity: Severity): number {
  const ranks: Record<Severity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    stable: 3,
  };
  return ranks[severity];
}
