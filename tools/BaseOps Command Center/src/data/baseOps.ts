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

  snapshot.objects.forEach((object) => {
    const status = getStatus(object);
    if (object.kind === "Network Node") {
      const fuelQuantity = toNumber(object.json.fuel?.quantity);
      const maxFuel = toNumber(object.json.fuel?.max_capacity);

      if (fuelQuantity === 0) {
        warnings.push({
          id: `${object.id}-fuel-empty`,
          severity: "critical",
          title: "Network node fuel is empty",
          source: getDisplayName(object),
          detail: `Fuel quantity is 0 of ${formatNumber(maxFuel)} on-chain.`,
        });
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

export function getFuelEta(object: ChainObject): string {
  const fuel = object.json.fuel;
  if (!fuel) return "Unavailable";
  if (!fuel.is_burning) return "Not burning";
  const quantity = toNumber(fuel.quantity);
  const burnMs = toNumber(fuel.burn_rate_in_ms);
  if (quantity <= 0) return "Now";
  if (burnMs <= 0) return "Unavailable";
  return formatDuration((quantity * burnMs) / 3_600_000);
}

export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours)) return "Unavailable";
  if (hours <= 0) return "Now";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours === 0) return `${minutes}m`;
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function shortAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
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

function severityRank(severity: Severity): number {
  const ranks: Record<Severity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    stable: 3,
  };
  return ranks[severity];
}
