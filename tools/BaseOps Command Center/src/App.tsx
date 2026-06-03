import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  Database,
  DoorOpen,
  Fuel,
  Gauge,
  Link2,
  Power,
  RefreshCw,
  Server,
  ShieldAlert,
  Unplug,
  Wallet,
} from "lucide-react";
import { useConnection } from "@evefrontier/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  BaseSnapshot,
  ChainObject,
  DEFAULT_OWNER,
  ChainStatus,
  InventorySnapshot,
  RealWarning,
  Severity,
  buildRealWarnings,
  filterInventorySummary,
  filterObjects,
  filterWarnings,
  fetchBaseSnapshot,
  formatNumber,
  getDisplayName,
  getFuelEta,
  getKpis,
  getSnapshotFreshness,
  getStatus,
  parseSnapshotPayload,
  serializeSnapshot,
  shortAddress,
  summarizeInventory,
} from "./data/baseOps";
import { loadStoredSnapshot, normalizeOwnerAddress, storeSnapshot } from "./data/snapshotStore";

const severityLabel: Record<Severity, string> = {
  critical: "Critical",
  warning: "Watch",
  info: "Info",
  stable: "Stable",
};

type SnapshotSource = "live" | "cached" | "imported";
type WarningScope = Severity | "all";
type ObjectScope = ChainStatus | "all";
type KindScope = ChainObject["kind"] | "all";

function App() {
  const { isConnected, walletAddress, hasEveVault, handleConnect, handleDisconnect } = useConnection();
  const [ownerInput, setOwnerInput] = useState(DEFAULT_OWNER);
  const [committedOwner, setCommittedOwner] = useState(DEFAULT_OWNER);
  const [importedSnapshot, setImportedSnapshot] = useState<BaseSnapshot | null>(null);
  const [cachedSnapshot, setCachedSnapshot] = useState<BaseSnapshot | null>(() => loadStoredSnapshotForOwner(DEFAULT_OWNER));
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const [opsQuery, setOpsQuery] = useState("");
  const [warningScope, setWarningScope] = useState<WarningScope>("all");
  const [statusScope, setStatusScope] = useState<ObjectScope>("all");
  const [kindScope, setKindScope] = useState<KindScope>("all");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const activeOwner = walletAddress || committedOwner || DEFAULT_OWNER;
  const normalizedOwnerInput = normalizeOwnerAddress(ownerInput);
  const manualOwnerDisabled = Boolean(walletAddress);

  const snapshotQuery = useQuery({
    queryKey: ["baseops", activeOwner],
    queryFn: () => fetchBaseSnapshot(activeOwner),
    refetchOnWindowFocus: false,
  });

  const liveSnapshot = snapshotQuery.data;
  useEffect(() => {
    if (walletAddress) {
      setOwnerInput(walletAddress);
    }
  }, [walletAddress]);

  useEffect(() => {
    setCachedSnapshot(loadStoredSnapshotForOwner(activeOwner));
  }, [activeOwner]);

  useEffect(() => {
    if (!liveSnapshot) return;
    setCachedSnapshot(liveSnapshot);
    storeSnapshotForOwner(liveSnapshot);
  }, [liveSnapshot]);

  const snapshot = importedSnapshot ?? liveSnapshot ?? cachedSnapshot;
  const snapshotSource: SnapshotSource | null = importedSnapshot
    ? "imported"
    : liveSnapshot
      ? "live"
      : cachedSnapshot
        ? "cached"
        : null;
  const kpis = snapshot ? getKpis(snapshot) : null;
  const warnings = snapshot ? buildRealWarnings(snapshot) : [];
  const objects = snapshot?.objects ?? [];
  const filteredWarnings = filterWarnings(warnings, { severity: warningScope, query: opsQuery });
  const filteredObjects = filterObjects(objects, {
    query: opsQuery,
    status: statusScope,
    kind: kindScope,
  });
  const inventorySummary = snapshot ? summarizeInventory(snapshot) : [];
  const filteredInventorySummary = filterInventorySummary(inventorySummary, opsQuery);
  const snapshotFreshness = snapshot ? getSnapshotFreshness(snapshot) : null;
  const networkNodes = filteredObjects.filter((object) => object.kind === "Network Node");
  const storageUnits = filteredObjects.filter((object) => object.kind === "Storage Unit");
  const gates = filteredObjects.filter((object) => object.kind === "Smart Gate");
  const assemblies = filteredObjects.filter((object) => object.kind === "Assembly");
  const hasActiveFilters = Boolean(opsQuery.trim()) || warningScope !== "all" || statusScope !== "all" || kindScope !== "all";
  const storageUsedPercent =
    kpis && kpis.totalMaxCapacity > 0 ? `${Math.round((kpis.totalUsedCapacity / kpis.totalMaxCapacity) * 100)}%` : "Unavailable";

  function handleApplyOwner() {
    if (manualOwnerDisabled) return;
    if (!normalizedOwnerInput) {
      setSnapshotMessage("Enter a valid 0x-prefixed owner address before applying it.");
      return;
    }
    setCommittedOwner(normalizedOwnerInput);
    setOwnerInput(normalizedOwnerInput);
    setSnapshotMessage(`Tracking owner ${shortAddress(normalizedOwnerInput)}.`);
  }

  function handleExportSnapshot() {
    if (!snapshot) return;
    const blob = new Blob([serializeSnapshot(snapshot)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `baseops-snapshot-${snapshot.ownerAddress.slice(0, 10)}-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSnapshotMessage(`Exported ${snapshotSource ?? "snapshot"} JSON.`);
  }

  async function handleImportSnapshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseSnapshotPayload(JSON.parse(text));
      setImportedSnapshot(parsed);
      setSnapshotMessage(`Imported snapshot for ${shortAddress(parsed.ownerAddress)}.`);
    } catch (error) {
      setSnapshotMessage(error instanceof Error ? error.message : "Snapshot import failed.");
    }
  }

  function handleReturnToLive() {
    setImportedSnapshot(null);
    setSnapshotMessage(liveSnapshot ? "Returned to live chain view." : "Showing the last cached live snapshot.");
  }

  function clearOpsFilters() {
    setOpsQuery("");
    setWarningScope("all");
    setStatusScope("all");
    setKindScope("all");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">◈</div>
          <div>
            <p className="eyebrow">Architects of the Void</p>
            <h1>BaseOps Command Center</h1>
          </div>
        </div>

        <div className="ops-controls" aria-label="Base operation controls">
          <label className="address-control">
            <span>Owner</span>
            <input
              value={ownerInput}
              onChange={(event) => setOwnerInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleApplyOwner();
                }
              }}
              placeholder="Owner wallet address"
              spellCheck={false}
              disabled={manualOwnerDisabled}
            />
          </label>
          <button className="action-button" type="button" onClick={handleApplyOwner} disabled={manualOwnerDisabled}>
            Apply Owner
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => snapshotQuery.refetch()}
            title="Refresh the current live snapshot"
            aria-label="Refresh the current live snapshot"
          >
            <RefreshCw size={18} aria-hidden="true" />
          </button>
          <button
            className="wallet-button"
            type="button"
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={!hasEveVault && !isConnected}
            title={hasEveVault || isConnected ? "Toggle EVE Vault connection" : "EVE Vault not detected"}
          >
            <Wallet size={17} aria-hidden="true" />
            <span>{isConnected ? "Disconnect" : "Connect"}</span>
          </button>
          <button className="action-button" type="button" onClick={() => importInputRef.current?.click()}>
            Import Snapshot
          </button>
          <button className="action-button" type="button" onClick={handleExportSnapshot} disabled={!snapshot}>
            Export Snapshot
          </button>
          {importedSnapshot ? (
            <button className="action-button" type="button" onClick={handleReturnToLive}>
              Return To Live
            </button>
          ) : null}
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden-file-input"
            onChange={handleImportSnapshot}
          />
        </div>
      </header>

      <section className="status-band" aria-label="Connection state">
        <StatusPill
          severity={isConnected ? "stable" : "warning"}
          label={isConnected ? `EVE Vault ${shortAddress(walletAddress ?? "")}` : "EVE Vault not connected"}
        />
        <StatusPill severity="info" label="Live Sui testnet / Stillness" />
        {snapshotSource ? (
          <StatusPill
            severity={snapshotSource === "live" ? "stable" : snapshotFreshness?.severity ?? "info"}
            label={snapshotSource === "live" ? "Viewing live snapshot" : snapshotSource === "imported" ? "Viewing imported snapshot" : "Viewing cached snapshot"}
          />
        ) : null}
        {snapshotFreshness ? <StatusPill severity={snapshotFreshness.severity} label={snapshotFreshness.label} /> : null}
        <span className="timestamp">
          {snapshot?.generatedAt
            ? `Updated ${new Date(snapshot.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Waiting for chain data"}
        </span>
      </section>

      <section className="filter-band" aria-label="Operational filters">
        <label className="filter-control filter-search">
          <span>Ops search</span>
          <input
            value={opsQuery}
            onChange={(event) => setOpsQuery(event.target.value)}
            placeholder="Search names, IDs, item types, warnings"
            spellCheck={false}
          />
        </label>
        <label className="filter-control">
          <span>Warning severity</span>
          <select value={warningScope} onChange={(event) => setWarningScope(event.target.value as WarningScope)}>
            <option value="all">All severities</option>
            <option value="critical">Critical only</option>
            <option value="warning">Warnings only</option>
            <option value="info">Info only</option>
            <option value="stable">Stable only</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Object status</span>
          <select value={statusScope} onChange={(event) => setStatusScope(event.target.value as ObjectScope)}>
            <option value="all">All statuses</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Object kind</span>
          <select value={kindScope} onChange={(event) => setKindScope(event.target.value as KindScope)}>
            <option value="all">All kinds</option>
            <option value="Network Node">Network Nodes</option>
            <option value="Storage Unit">Storage Units</option>
            <option value="Smart Gate">Smart Gates</option>
            <option value="Assembly">Assemblies</option>
            <option value="Unknown">Unknown</option>
          </select>
        </label>
        <button className="action-button" type="button" onClick={clearOpsFilters} disabled={!hasActiveFilters}>
          Clear Filters
        </button>
      </section>

      <section className="status-band filter-summary" aria-label="Filter results">
        <StatusPill severity={hasActiveFilters ? "info" : "stable"} label={hasActiveFilters ? "Filtered operational view" : "Showing full snapshot"} />
        <StatusPill severity="info" label={`${filteredObjects.length}/${objects.length} objects`} />
        <StatusPill severity={filteredWarnings.length ? "warning" : "stable"} label={`${filteredWarnings.length}/${warnings.length} warnings`} />
        <StatusPill severity="info" label={`${filteredInventorySummary.length}/${inventorySummary.length} inventory totals`} />
      </section>

      {snapshotMessage ? <Notice title="Snapshot status" detail={snapshotMessage} severity="info" /> : null}

      {!manualOwnerDisabled && ownerInput.trim() && !normalizedOwnerInput ? (
        <Notice
          title="Owner address is not valid yet"
          detail="Manual owner lookups require a 0x-prefixed hexadecimal wallet address."
          severity="warning"
        />
      ) : null}

      {snapshotSource === "cached" && !snapshotQuery.isLoading ? (
        <Notice
          title="Showing cached live data"
          detail="The last successful live snapshot is loaded from this browser until the chain request succeeds again."
          severity="info"
        />
      ) : null}

      {snapshotSource === "imported" ? (
        <Notice
          title="Showing imported snapshot"
          detail="This view is pinned to the imported JSON until you return to the live chain stream."
          severity="warning"
        />
      ) : null}

      {snapshotFreshness && snapshotFreshness.severity !== "stable" ? (
        <Notice
          title="Snapshot freshness"
          detail={snapshotFreshness.label}
          severity={snapshotFreshness.severity}
        />
      ) : null}

      {snapshotQuery.isError ? (
        <Notice
          title="Could not load chain data"
          detail={snapshotQuery.error instanceof Error ? snapshotQuery.error.message : "The Sui GraphQL request failed."}
          severity="critical"
        />
      ) : null}

      {snapshotQuery.isLoading && !snapshot ? (
        <Notice title="Loading real wallet data" detail="Fetching the character and owned smart assemblies from Sui GraphQL." severity="info" />
      ) : null}

      {snapshot ? (
        <>
          <section className="character-band" aria-label="Resolved character">
            <div>
              <p className="eyebrow">Character</p>
              <h2>{snapshot.character?.name ?? "No character found"}</h2>
            </div>
            <InfoCell label="Tenant" value={snapshot.character?.tenant ?? snapshot.tenant} />
            <InfoCell label="Tribe" value={snapshot.character?.tribeId ? String(snapshot.character.tribeId) : "Unavailable"} />
            <InfoCell label="Character item" value={snapshot.character?.itemId || "Unavailable"} />
            <InfoCell label="Character ID" value={snapshot.character?.id ? shortAddress(snapshot.character.id) : "Unavailable"} />
          </section>

          <section className="kpi-grid" aria-label="Base KPIs">
            <KpiCard icon={<Server />} label="Owned smart objects" value={String(kpis?.smartObjects ?? 0)} tone="info" />
            <KpiCard icon={<Power />} label="Online" value={String(kpis?.onlineObjects ?? 0)} tone="stable" />
            <KpiCard icon={<Unplug />} label="Offline" value={String(kpis?.offlineObjects ?? 0)} tone="warning" />
            <KpiCard icon={<Fuel />} label="Fuel quantity" value={formatNumber(kpis?.totalFuel ?? 0)} tone={(kpis?.totalFuel ?? 0) === 0 ? "critical" : "stable"} />
            <KpiCard icon={<Boxes />} label="Storage used" value={storageUsedPercent} tone="info" />
            <KpiCard icon={<DoorOpen />} label="Owned gates" value={String(kpis?.gates ?? 0)} tone={kpis?.gates ? "stable" : "info"} />
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-column">
              <Panel title="Network Nodes" icon={<Fuel size={18} aria-hidden="true" />}>
                {networkNodes.length ? (
                  <div className="node-grid">
                    {networkNodes.map((node) => (
                      <NetworkNodeCard key={node.id} node={node} objects={objects} />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No owned Network Nodes returned for this wallet." />
                )}
              </Panel>

              <Panel title="Owned Assemblies" icon={<Link2 size={18} aria-hidden="true" />}>
                <ObjectTable objects={[...networkNodes, ...storageUnits, ...gates, ...assemblies]} />
              </Panel>

              <Panel title="Storage Inventory" icon={<Boxes size={18} aria-hidden="true" />}>
                {storageUnits.length ? <StorageView storageUnits={storageUnits} /> : <EmptyState text="No owned Storage Units returned for this wallet." />}
              </Panel>

              <Panel title="Inventory Totals" icon={<Database size={18} aria-hidden="true" />}>
                {filteredInventorySummary.length ? <InventorySummaryTable items={filteredInventorySummary} /> : <EmptyState text="No storage inventory rows match the current filters." />}
              </Panel>
            </div>

            <div className="dashboard-column">
              <Panel title="Real Warnings" icon={<ShieldAlert size={18} aria-hidden="true" />}>
                <WarningsList warnings={filteredWarnings} emptyText="No live warnings match the current filters." />
              </Panel>

              <Panel title="Gate Control" icon={<DoorOpen size={18} aria-hidden="true" />}>
                {gates.length ? <ObjectTable objects={gates} compact /> : <EmptyState text="No owned Smart Gates returned for this wallet." />}
              </Panel>

              <Panel title="Chain Facts" icon={<Database size={18} aria-hidden="true" />}>
                <div className="facts-list">
                  <Fact label="Network" value={snapshot.network} />
                  <Fact label="Tenant" value={snapshot.tenant} />
                  <Fact label="GraphQL source" value="Sui GraphQL" />
                  <Fact label="Raw owned objects" value={String(snapshot.objects.length)} />
                  <Fact label="Storage units" value={String(kpis?.storageUnits ?? 0)} />
                  <Fact label="Network nodes" value={String(kpis?.networkNodes ?? 0)} />
                  {snapshot.errors.map((error) => (
                    <Fact key={error} label="GraphQL warning" value={error} />
                  ))}
                </div>
              </Panel>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function NetworkNodeCard({ node, objects }: { node: ChainObject; objects: ChainObject[] }) {
  const fuel = node.json.fuel;
  const energy = node.json.energy_source;
  const connectedIds = node.json.connected_assembly_ids ?? [];
  const ownedConnected = connectedIds
    .map((id) => objects.find((object) => object.id === id))
    .filter((object): object is ChainObject => Boolean(object));
  const quantity = Number(fuel?.quantity ?? 0);
  const capacity = Number(fuel?.max_capacity ?? 0);
  const fuelRatio = capacity > 0 ? quantity / capacity : 0;

  return (
    <article className="node-card">
      <div className="node-topline">
        <div>
          <h3>{getDisplayName(node)}</h3>
          <p>{shortAddress(node.id)}</p>
        </div>
        <StatusPill severity={getStatus(node) === "ONLINE" ? "stable" : "critical"} label={getStatus(node).toLowerCase()} />
      </div>
      <div className="fuel-readout">
        <Fuel size={20} aria-hidden="true" />
        <strong>{formatNumber(quantity)}</strong>
        <span>{capacity ? `of ${formatNumber(capacity)}` : "capacity unavailable"}</span>
      </div>
      <Meter value={fuelRatio} tone={quantity === 0 ? "critical" : "stable"} />
      <div className="node-metrics">
        <span>
          <Clock3 size={15} aria-hidden="true" />
          ETA {getFuelEta(node)}
        </span>
        <span>
          <Gauge size={15} aria-hidden="true" />
          {formatNumber(Number(energy?.current_energy_production ?? 0))}/{formatNumber(Number(energy?.max_energy_production ?? 0))} energy
        </span>
        <span>
          <Link2 size={15} aria-hidden="true" />
          {ownedConnected.length}/{connectedIds.length} connected owned
        </span>
      </div>
    </article>
  );
}

function ObjectTable({ objects, compact = false }: { objects: ChainObject[]; compact?: boolean }) {
  if (!objects.length) {
    return <EmptyState text="No objects returned." />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            {!compact ? <th>Kind</th> : null}
            <th>Type ID</th>
            <th>Item ID</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {objects.map((object) => (
            <tr key={object.id}>
              <td title={object.id}>{getDisplayName(object)}</td>
              {!compact ? <td>{object.kind}</td> : null}
              <td>{object.json.type_id ?? "Unavailable"}</td>
              <td>{object.json.key?.item_id ?? "Unavailable"}</td>
              <td>
                <StatusPill severity={getStatus(object) === "ONLINE" ? "stable" : getStatus(object) === "OFFLINE" ? "warning" : "info"} label={getStatus(object).toLowerCase()} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StorageView({ storageUnits }: { storageUnits: ChainObject[] }) {
  return (
    <div className="storage-stack">
      {storageUnits.map((unit) => (
        <article className="storage-unit" key={unit.id}>
          <div className="storage-heading">
            <div>
              <h3>{getDisplayName(unit)}</h3>
              <p>{shortAddress(unit.id)}</p>
            </div>
            <StatusPill severity={getStatus(unit) === "ONLINE" ? "stable" : "warning"} label={getStatus(unit).toLowerCase()} />
          </div>
          {unit.inventories.length ? (
            unit.inventories.map((inventory) => <InventoryBlock key={inventory.id} inventory={inventory} />)
          ) : (
            <EmptyState text="No inventory dynamic fields returned." />
          )}
        </article>
      ))}
    </div>
  );
}

function InventoryBlock({ inventory }: { inventory: InventorySnapshot }) {
  const pressure = inventory.maxCapacity > 0 ? inventory.usedCapacity / inventory.maxCapacity : 0;
  return (
    <div className="inventory-block">
      <div className="storage-heading">
        <div>
          <p>Inventory {shortAddress(inventory.key)}</p>
          <h3>
            {formatNumber(inventory.usedCapacity)} / {formatNumber(inventory.maxCapacity)}
          </h3>
        </div>
        <strong>{inventory.maxCapacity ? `${Math.round(pressure * 100)}%` : "Unavailable"}</strong>
      </div>
      <Meter value={pressure} tone={pressure >= 0.9 ? "warning" : "stable"} />
      {inventory.items.length ? (
        <div className="inventory-list">
          {inventory.items.map((item) => (
            <div className="inventory-row" key={`${inventory.id}-${item.key}-${item.itemId}`}>
              <span>{item.name}</span>
              <span>{item.tenant}</span>
              <strong>
                {formatNumber(item.quantity)} qty / {formatNumber(item.volume)} volume
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-inline">No item rows in this inventory.</p>
      )}
    </div>
  );
}

function InventorySummaryTable({
  items,
}: {
  items: Array<ReturnType<typeof summarizeInventory>[number]>;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Total qty</th>
            <th>Total volume</th>
            <th>Storage units</th>
            <th>Inventories</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.typeId}-${item.itemId || item.name}`}>
              <td>
                <div className="summary-name">
                  <strong>{item.name}</strong>
                  <span>{item.typeId}</span>
                </div>
              </td>
              <td>{formatNumber(item.totalQuantity)}</td>
              <td>{formatNumber(item.totalVolume)}</td>
              <td>{formatNumber(item.storageUnits)}</td>
              <td>{formatNumber(item.inventories)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WarningsList({ warnings, emptyText = "No live warnings from the returned chain state." }: { warnings: RealWarning[]; emptyText?: string }) {
  if (warnings.length === 0) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="warning-list">
      {warnings.map((warning, index) => (
        <article className={`warning-row tone-${warning.severity}`} key={warning.id}>
          <div className="rank">{index + 1}</div>
          <div>
            <div className="warning-title">
              <h3>{warning.title}</h3>
              <span>{severityLabel[warning.severity]}</span>
            </div>
            <p>{warning.source}</p>
            <small>{warning.detail}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: Severity;
}) {
  return (
    <article className={`kpi-card tone-${tone}`}>
      <div className="kpi-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Notice({ title, detail, severity = "warning" }: { title: string; detail: string; severity?: Severity }) {
  return (
    <section className={`notice tone-${severity}`}>
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
    </section>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function Meter({ value, tone }: { value: number; tone: Severity }) {
  return (
    <div className="meter" aria-hidden="true">
      <span className={`tone-${tone}`} style={{ width: `${Math.max(3, Math.min(value, 1) * 100)}%` }} />
    </div>
  );
}

function StatusPill({ severity, label }: { severity: Severity; label: string }) {
  const icon =
    severity === "stable" ? (
      <CheckCircle2 size={13} aria-hidden="true" />
    ) : severity === "critical" ? (
      <AlertTriangle size={13} aria-hidden="true" />
    ) : (
      <Activity size={13} aria-hidden="true" />
    );

  return (
    <span className={`status-pill tone-${severity}`} title={severityLabel[severity]}>
      {icon}
      {label}
    </span>
  );
}

export default App;

function loadStoredSnapshotForOwner(ownerAddress: string): BaseSnapshot | null {
  if (typeof window === "undefined") return null;

  return loadStoredSnapshot((key) => readSnapshotFromStorage(window.localStorage, key), ownerAddress);
}

function storeSnapshotForOwner(snapshot: BaseSnapshot) {
  if (typeof window === "undefined") return;

  storeSnapshot((key, nextSnapshot) => writeSnapshotToStorage(window.localStorage, key, nextSnapshot), snapshot);
}

function readSnapshotFromStorage(storage: Storage, key: string): BaseSnapshot | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return parseSnapshotPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeSnapshotToStorage(storage: Storage, key: string, snapshot: BaseSnapshot) {
  try {
    storage.setItem(key, serializeSnapshot(snapshot));
  } catch {
    // Ignore storage failures and keep the live snapshot in memory only.
  }
}
