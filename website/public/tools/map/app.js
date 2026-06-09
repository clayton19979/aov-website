const API_BASE = "https://world-api-stillness.live.tech.evefrontier.com/v2";
const GATE_NETWORK_URL = "./data/gates.json";
const SUI_GRAPHQL_URL = "https://graphql.testnet.sui.io/graphql";
const SUI_RPC_URL = "https://fullnode.testnet.sui.io:443";
const EVE_WORLD_PACKAGE_ID = "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c";
const SYSTEM_CACHE_KEY = "frontier-gps.systems.v1";
const SYSTEM_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const LY_METERS = 9_460_730_472_580_800;
const PAGE_SIZE = 1000;

const fallbackSystems = [
  { id: 30001573, name: "Pioneer Relay", regionId: 1001, constellationId: 2001, location: { x: 0, y: 0, z: 0 } },
  { id: 30001844, name: "Harbor Nine", regionId: 1001, constellationId: 2001, location: { x: 45 * LY_METERS, y: 6 * LY_METERS, z: 18 * LY_METERS } },
  { id: 30002270, name: "Glass Anchor", regionId: 1001, constellationId: 2002, location: { x: 102 * LY_METERS, y: -12 * LY_METERS, z: 39 * LY_METERS } },
  { id: 30003190, name: "Lumen Drift", regionId: 1002, constellationId: 2003, location: { x: 171 * LY_METERS, y: 15 * LY_METERS, z: 74 * LY_METERS } },
  { id: 30004711, name: "Iron Basilica", regionId: 1002, constellationId: 2003, location: { x: 250 * LY_METERS, y: 0, z: 111 * LY_METERS } },
  { id: 30006240, name: "Kestrel Deep", regionId: 1003, constellationId: 2004, location: { x: 328 * LY_METERS, y: -20 * LY_METERS, z: 153 * LY_METERS } },
  { id: 30008312, name: "Oort Market", regionId: 1003, constellationId: 2005, location: { x: 396 * LY_METERS, y: 18 * LY_METERS, z: 210 * LY_METERS } },
  { id: 30013956, name: "Far Meridian", regionId: 1004, constellationId: 2006, location: { x: 482 * LY_METERS, y: -6 * LY_METERS, z: 260 * LY_METERS } },
];

const state = {
  systems: [],
  systemsById: new Map(),
  systemsByName: new Map(),
  bounds: null,
  route: [],
  routeEdges: [],
  routeSegments: [],
  gates: [],
  gateAdjacency: new Map(),
  gatesLoaded: false,
  gatesLoading: null,
  smartGatesLoaded: false,
  smartGatesLoading: null,
  smartGateStats: null,
  gateSystemsFetched: new Set(),
  gateKeys: new Set(),
  spatialIndexes: new Map(),
  selected: null,
  hovered: null,
  activeRouteIndex: -1,
  camera: { x: 0, y: 0, zoom: 1, rotX: 0, rotY: 0 },
  dragging: false,
  dragStart: null,
  dragMode: 'rotate',
  routeToken: 0,
  workerReady: false,
  overlayKills: [],
  overlayKillsLoaded: false,
  overlayKillsLoading: null,
  overlayKillsTimeWindow: 24,
  overlayAssemblies: [],
  overlayAssembliesLoaded: false,
  overlayAssembliesLoading: null,
  overlayPlayerBases: [],
  showKills: false,
  showAssemblies: false,
  showPlayerBases: false,
  showGameGates: true,
  showSmartGateLinks: true,
  avoidKills: false,
  overlayAssembliesOnlineOnly: false,
  overlayAsmTypeFilter: new Set(["Smart Gate", "Network Node", "Storage Unit", "Assembly", "Turret"]),
  showJumpRange: false,
  showKillLabels: false,
  showKillShipsOnly: false,
  showSystemLabels: false,
  // New features
  showHotPanel: false,
  showContested: false,
  showOfflinePanel: false,
  killTimeOffset: 0,       // hours to shift the kill window back from "now"
  showKillHeatmap: false,
  showAssemblyLabels: false,
  avoidContested: false,
  showRegionStats: false,
  // v4 features
  showReachability: false,
  reachabilityMaxHops: 1,
  showTerritory: false,
  showHubPanel: false,
  // v5 features
  showBattles: false,
  showRegionShading: false,
  walletFilterAddress: "",
};

const els = {
  canvas: document.getElementById("stars"),
  status: document.getElementById("dataStatus"),
  form: document.getElementById("routeForm"),
  origin: document.getElementById("origin"),
  destination: document.getElementById("destination"),
  via: document.getElementById("via"),
  originSuggestions: document.getElementById("originSuggestions"),
  destinationSuggestions: document.getElementById("destinationSuggestions"),
  viaSuggestions: document.getElementById("viaSuggestions"),
  jumpRange: document.getElementById("jumpRange"),
  useGates: document.getElementById("useGates"),
  metrics: document.getElementById("metrics"),
  steps: document.getElementById("routeSteps"),
  card: document.getElementById("systemCard"),
  gateStatus: document.getElementById("gateStatus"),
  calculateButton: document.querySelector(".primary"),
  fitRoute: document.getElementById("fitRoute"),
  resetView: document.getElementById("resetView"),
  copyRoute: document.getElementById("copyRoute"),
  shareRoute: document.getElementById("shareRoute"),
  shareLink: document.getElementById("shareLink"),
  setOrigin: document.getElementById("setOrigin"),
  setDestination: document.getElementById("setDestination"),
  setVia: document.getElementById("setVia"),
  centerSystem: document.getElementById("centerSystem"),
  rangePresets: document.querySelectorAll(".range-presets button"),
  killsToggle: document.getElementById("killsToggle"),
  assembliesToggle: document.getElementById("assembliesToggle"),
  playerBasesToggle: document.getElementById("playerBasesToggle"),
  killTimePanel: document.getElementById("killTimePanel"),
  overlayStatus: document.getElementById("overlayStatus"),
  refreshOverlays: document.getElementById("refreshOverlays"),
  timePresets: document.querySelectorAll(".time-preset"),
  legendKill: document.getElementById("legendKill"),
  legendAssembly: document.getElementById("legendAssembly"),
  legendBase: document.getElementById("legendBase"),
  showGameGatesToggle: document.getElementById("showGameGates"),
  showSmartGateLinksToggle: document.getElementById("showSmartGateLinks"),
  avoidKillsToggle: document.getElementById("avoidKills"),
  assembliesOnlineOnlyToggle: document.getElementById("assembliesOnlineOnly"),
  showJumpRangeToggle: document.getElementById("showJumpRange"),
  showKillLabelsToggle: document.getElementById("showKillLabels"),
  killShipsOnlyToggle: document.getElementById("killShipsOnly"),
  showSystemLabelsToggle: document.getElementById("showSystemLabels"),
  asmTypePanel: document.getElementById("asmTypePanel"),
  asmTypeChecks: document.querySelectorAll(".asm-type-check"),
  // New feature elements
  showHotPanelToggle: document.getElementById("showHotPanel"),
  showContestedToggle: document.getElementById("showContested"),
  showOfflinePanelToggle: document.getElementById("showOfflinePanelToggle"),
  timeOffsetRow: document.getElementById("timeOffsetRow"),
  killTimeOffsetSlider: document.getElementById("killTimeOffset"),
  killOffsetLabel: document.getElementById("killOffsetLabel"),
  hotPanel: document.getElementById("hotPanel"),
  hotList: document.getElementById("hotList"),
  hotPanelWindowLabel: document.getElementById("hotPanelWindowLabel"),
  contestedPanel: document.getElementById("contestedPanel"),
  contestedList: document.getElementById("contestedList"),
  offlinePanel: document.getElementById("offlinePanel"),
  offlineList: document.getElementById("offlineList"),
  offlinePanelClose: document.getElementById("offlinePanelClose"),
  showKillHeatmapToggle: document.getElementById("showKillHeatmap"),
  showAssemblyLabelsToggle: document.getElementById("showAssemblyLabels"),
  avoidContestedToggle: document.getElementById("avoidContested"),
  showRegionStatsToggle: document.getElementById("showRegionStats"),
  regionStatsPanel: document.getElementById("regionStatsPanel"),
  regionStatsList: document.getElementById("regionStatsList"),
  regionStatsPanelLabel: document.getElementById("regionStatsPanelLabel"),
  // v4 elements
  reachabilityToggle: document.getElementById("reachabilityToggle"),
  reachabilityPanel: document.getElementById("reachabilityPanel"),
  reachabilityHopBtns: document.querySelectorAll(".reach-hop-btn"),
  territoryToggle: document.getElementById("territoryToggle"),
  hubPanelToggle: document.getElementById("showHubPanel"),
  hubPanel: document.getElementById("hubPanel"),
  hubList: document.getElementById("hubList"),
  // v5 elements
  battlesToggle: document.getElementById("battlesToggle"),
  battlesPanel: document.getElementById("battlesPanel"),
  battlesList: document.getElementById("battlesList"),
  regionShadingToggle: document.getElementById("regionShadingToggle"),
  walletFilterRow: document.getElementById("walletFilterRow"),
  walletFilterInput: document.getElementById("walletFilterInput"),
  walletFilterClear: document.getElementById("walletFilterClear"),
};

const ctx = els.canvas.getContext("2d");
let cachedRect = null;
let rafPending = false;

function scheduleDraw() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    draw();
  });
}

let routeInputTimer = null;
let workerRequestId = 0;
const workerRequests = new Map();
const routeWorker = typeof Worker === "undefined" ? null : new Worker("./route-worker.js");

if (routeWorker) {
  routeWorker.addEventListener("message", (event) => {
    const message = event.data;
    const pending = workerRequests.get(message.requestId);
    if (!pending) return;
    workerRequests.delete(message.requestId);
    if (message.error) pending.reject(new Error(message.error));
    else pending.resolve(message);
  });
}

function setStatus(text) {
  els.status.textContent = text;
}

function setCalculating(isCalculating) {
  els.calculateButton.classList.toggle("is-busy", isCalculating);
  els.calculateButton.textContent = isCalculating ? "Calculating..." : "Calculate";
  els.calculateButton.disabled = isCalculating;
}

function updateRouteActions() {
  const hasRoute = state.route.length > 1;
  els.copyRoute.disabled = !hasRoute;
  els.shareRoute.disabled = !hasRoute;
  els.shareLink.disabled = !hasRoute;
  els.fitRoute.disabled = !state.systems.length;
}

function updateSystemActions() {
  const hasSelection = Boolean(state.selected);
  els.setOrigin.disabled = !hasSelection;
  els.setDestination.disabled = !hasSelection;
  els.setVia.disabled = !hasSelection;
  els.centerSystem.disabled = !hasSelection;
}

function workerMessage(message) {
  if (!routeWorker) return Promise.reject(new Error("Route worker unavailable"));
  const requestId = ++workerRequestId;
  return new Promise((resolve, reject) => {
    workerRequests.set(requestId, { resolve, reject });
    routeWorker.postMessage({ ...message, requestId });
  });
}

async function syncRouteWorker() {
  if (!routeWorker || !state.systems.length) return;
  await workerMessage({ type: "setData", systems: state.systems, gates: state.gates });
  state.workerReady = true;
}

function readCachedSystems() {
  try {
    const cached = JSON.parse(localStorage.getItem(SYSTEM_CACHE_KEY) || "null");
    if (!cached?.savedAt || !Array.isArray(cached.systems)) return null;
    if (Date.now() - cached.savedAt > SYSTEM_CACHE_TTL_MS) return null;
    return cached.systems;
  } catch {
    return null;
  }
}

function writeCachedSystems(systems) {
  try {
    localStorage.setItem(SYSTEM_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), systems }));
  } catch {
    // Cache writes are best-effort; route planning should still work if storage is unavailable.
  }
}

function normalizeSystem(raw) {
  return {
    id: Number(raw.id),
    name: raw.name || String(raw.id),
    regionId: raw.regionId,
    constellationId: raw.constellationId,
    x: Number(raw.location?.x ?? raw.x) / LY_METERS,
    y: Number(raw.location?.y ?? raw.y) / LY_METERS,
    z: Number(raw.location?.z ?? raw.z) / LY_METERS,
  };
}

async function fetchAllSystems() {
  const cached = readCachedSystems();
  if (cached?.length) {
    setStatus(`Using cached ${cached.length.toLocaleString()} systems`);
    return cached;
  }

  let offset = 0;
  let total = Infinity;
  const systems = [];

  while (offset < total) {
    const res = await fetch(`${API_BASE}/solarsystems?limit=${PAGE_SIZE}&offset=${offset}`);
    if (!res.ok) throw new Error(`World API returned ${res.status}`);
    const payload = await res.json();
    const rows = Array.isArray(payload) ? payload : payload.data;
    total = payload.metadata?.total ?? rows.length;
    systems.push(...rows.map(normalizeSystem));
    offset += rows.length;
    setStatus(`Loading ${systems.length.toLocaleString()} / ${total.toLocaleString()} systems`);
    if (!rows.length) break;
  }

  writeCachedSystems(systems);
  return systems;
}

function indexSystems(systems) {
  state.systems = systems;
  state.systemsById = new Map(systems.map((system) => [system.id, system]));
  state.systemsByName = new Map(systems.map((system) => [system.name.toLowerCase(), system]));
  state.spatialIndexes = new Map();
  state.gateAdjacency = new Map();
  state.bounds = systems.reduce(
    (acc, s) => ({
      minX: Math.min(acc.minX, s.x),
      maxX: Math.max(acc.maxX, s.x),
      minZ: Math.min(acc.minZ, s.z),
      maxZ: Math.max(acc.maxZ, s.z),
      minY: Math.min(acc.minY, s.y),
      maxY: Math.max(acc.maxY, s.y),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, minY: Infinity, maxY: -Infinity },
  );

  syncRouteWorker().catch(() => {
    state.workerReady = false;
  });
}

// ── Background: ambient star field ────────────────────────────────────────
// Pre-generated once on resize; these are decorative background stars, not
// game systems.

let bgStars = [];

function generateBgStars(rect) {
  bgStars = [];
  let seed = 0xdeadbeef;
  const rng = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) / 0xffffffff);
  };
  const count = Math.floor((rect.width * rect.height) / 2800);
  for (let i = 0; i < count; i++) {
    const roll = rng();
    bgStars.push({
      x: rng() * rect.width,
      y: rng() * rect.height,
      // ~5 % bright, ~20 % medium, rest tiny
      r: roll < 0.05 ? rng() * 1.0 + 0.8
        : roll < 0.25 ? rng() * 0.4 + 0.4
        : rng() * 0.3 + 0.15,
      a: rng() * 0.45 + 0.12,
      // subtle colour tint: mostly white-blue, rare warm
      warm: rng() < 0.08,
    });
  }
}

function drawBackground(rect) {
  // Deep-space void gradient
  const bg = ctx.createLinearGradient(0, 0, rect.width * 0.6, rect.height);
  bg.addColorStop(0,   '#03060f');
  bg.addColorStop(0.5, '#020408');
  bg.addColorStop(1,   '#040712');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, rect.width, rect.height);

  // Nebula layer — overlapping soft clouds
  const nebulae = [
    { cx: 0.22, cy: 0.28, r: 0.52, c0: 'rgba(12,28,78,0.22)',  c1: 'rgba(6,14,40,0.06)' },
    { cx: 0.68, cy: 0.58, r: 0.42, c0: 'rgba(38,8,62,0.18)',   c1: 'rgba(20,4,32,0.04)' },
    { cx: 0.48, cy: 0.82, r: 0.35, c0: 'rgba(6,28,58,0.15)',   c1: 'rgba(3,14,30,0.03)' },
    { cx: 0.82, cy: 0.14, r: 0.30, c0: 'rgba(22,6,46,0.14)',   c1: 'rgba(11,3,24,0.03)' },
    { cx: 0.10, cy: 0.72, r: 0.28, c0: 'rgba(4,20,52,0.12)',   c1: 'rgba(2,10,28,0.02)' },
    // Faint galactic-arm hint across the middle
    { cx: 0.50, cy: 0.45, r: 0.75, c0: 'rgba(8,18,44,0.09)',   c1: 'rgba(0,0,0,0)' },
  ];
  for (const n of nebulae) {
    const cx = n.cx * rect.width;
    const cy = n.cy * rect.height;
    const r  = n.r  * Math.min(rect.width, rect.height);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0,   n.c0);
    grd.addColorStop(0.5, n.c1);
    grd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBgStars(rect) {
  if (!bgStars.length) return;
  ctx.save();
  for (const s of bgStars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = s.warm ? '#ffe8c8' : '#ddeeff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    // Tiny cross-spike on the brightest bg stars
    if (s.r > 1.4) {
      ctx.globalAlpha = s.a * 0.5;
      ctx.strokeStyle = s.warm ? '#ffe8c8' : '#ddeeff';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 2.5, s.y); ctx.lineTo(s.x + s.r * 2.5, s.y);
      ctx.moveTo(s.x, s.y - s.r * 2.5); ctx.lineTo(s.x, s.y + s.r * 2.5);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function resizeCanvas() {
  cachedRect = els.canvas.getBoundingClientRect();
  const rect = cachedRect;
  const scale = window.devicePixelRatio || 1;
  els.canvas.width = Math.max(1, Math.floor(rect.width * scale));
  els.canvas.height = Math.max(1, Math.floor(rect.height * scale));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  generateBgStars(rect);
  draw();
}

function applyRotation(x, y, z) {
  const { rotX, rotY } = state.camera;
  if (rotX === 0 && rotY === 0) return { x, y, z };
  const b = state.bounds;
  if (!b) return { x, y, z };
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const lx = x - cx, ly = y - cy, lz = z - cz;
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const rx = lx * cosY + lz * sinY;
  const rz1 = -lx * sinY + lz * cosY;
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const ry = ly * cosX - rz1 * sinX;
  const rz = ly * sinX + rz1 * cosX;
  return { x: rx + cx, y: ry + cy, z: rz + cz };
}

function project(system) {
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const b = state.bounds;
  if (!b) return { x: 0, y: 0 };
  const rot = applyRotation(system.x, system.y, system.z);
  const width = Math.max(1, b.maxX - b.minX);
  const height = Math.max(1, b.maxZ - b.minZ);
  const base = Math.min(rect.width / width, rect.height / height) * 0.84;
  const px = (rot.x - (b.minX + width / 2)) * base * state.camera.zoom + rect.width / 2 + state.camera.x;
  const py = (rot.z - (b.minZ + height / 2)) * base * state.camera.zoom + rect.height / 2 + state.camera.y;
  return { x: px, y: py };
}

// Star spectral colours across 10 depth buckets (blue-white near, warm-dim far)
const STAR_PALETTE = [
  [70,  100, 180, 0.22],  // far — deep navy
  [85,  120, 195, 0.27],
  [105, 145, 210, 0.32],
  [130, 165, 215, 0.38],
  [155, 185, 220, 0.44],
  [175, 200, 228, 0.50],
  [195, 210, 235, 0.56],
  [215, 222, 240, 0.62],
  [230, 232, 248, 0.70],
  [240, 240, 255, 0.80],  // near — bright blue-white
];

function draw() {
  const rect = els.canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  // ── Background ───────────────────────────────────────
  drawBackground(rect);
  drawBgStars(rect);

  if (!state.systems.length) return;

  // ── Game systems (stars) ─────────────────────────────
  const z = state.camera.zoom;
  const n = state.systems.length;
  const visibleStep = n > 10000 ? (z < 0.4 ? 5 : z < 0.7 ? 3 : z < 1.1 ? 2 : 1) : 1;

  const depthRange = Math.max(1, state.bounds.maxY - state.bounds.minY);
  const minY = state.bounds.minY;
  const BUCKETS = STAR_PALETTE.length;

  // Three size tiers: tiny (most), medium, bright (rare glow)
  // Bucket layout: [tinyX, tinyY, ...] per palette bucket
  const tinyBuckets   = Array.from({ length: BUCKETS }, () => []);
  const medBuckets    = Array.from({ length: BUCKETS }, () => []);
  const glowBuckets   = Array.from({ length: BUCKETS }, () => []);

  for (let i = 0; i < n; i += visibleStep) {
    const system = state.systems[i];
    const p = project(system);
    if (p.x < -4 || p.y < -4 || p.x > rect.width + 4 || p.y > rect.height + 4) continue;
    const bucket = Math.min(BUCKETS - 1, Math.floor(((system.y - minY) / depthRange) * BUCKETS));
    // Deterministic size tier from system id
    const tier = (system.id * 2654435761) >>> 0;
    if ((tier % 100) < 3) {
      glowBuckets[bucket].push(p.x, p.y);
    } else if ((tier % 100) < 18) {
      medBuckets[bucket].push(p.x, p.y);
    } else {
      tinyBuckets[bucket].push(p.x, p.y);
    }
  }

  const tinyR = z > 1.4 ? 0.9  : 0.5;
  const medR  = z > 1.4 ? 1.5  : 0.95;
  const glowR = z > 1.4 ? 2.2  : 1.4;

  // Tiny stars
  for (let b = 0; b < BUCKETS; b++) {
    const pts = tinyBuckets[b];
    if (!pts.length) continue;
    const [r, g, bl, a] = STAR_PALETTE[b];
    ctx.fillStyle = `rgba(${r},${g},${bl},${a})`;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      ctx.moveTo(pts[i] + tinyR, pts[i + 1]);
      ctx.arc(pts[i], pts[i + 1], tinyR, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // Medium stars
  for (let b = 0; b < BUCKETS; b++) {
    const pts = medBuckets[b];
    if (!pts.length) continue;
    const [r, g, bl, a] = STAR_PALETTE[b];
    ctx.fillStyle = `rgba(${r},${g},${bl},${Math.min(1, a + 0.15)})`;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      ctx.moveTo(pts[i] + medR, pts[i + 1]);
      ctx.arc(pts[i], pts[i + 1], medR, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // Bright / glow stars — drawn individually with radial gradient
  for (let b = 0; b < BUCKETS; b++) {
    const pts = glowBuckets[b];
    if (!pts.length) continue;
    const [r, g, bl] = STAR_PALETTE[b];
    for (let i = 0; i < pts.length; i += 2) {
      const sx = pts[i], sy = pts[i + 1];
      // Outer halo
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR * 3);
      grd.addColorStop(0,   `rgba(${r},${g},${bl},0.6)`);
      grd.addColorStop(0.3, `rgba(${r},${g},${bl},0.15)`);
      grd.addColorStop(1,   `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, glowR * 3, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = `rgba(${Math.min(255,r+30)},${Math.min(255,g+20)},255,0.95)`;
      ctx.beginPath();
      ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
      ctx.fill();
      // Cross diffraction spike (only at mid-high zoom to avoid clutter)
      if (z > 0.6) {
        ctx.save();
        ctx.strokeStyle = `rgba(${r},${g},${bl},0.25)`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(sx - glowR * 5, sy); ctx.lineTo(sx + glowR * 5, sy);
        ctx.moveTo(sx, sy - glowR * 5); ctx.lineTo(sx, sy + glowR * 5);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── Region shading (drawn before stars for best layering) ────────────────
  if (state.showRegionShading) drawRegionShading();

  // ── Gate links ───────────────────────────────────────
  drawGateLinks();
  if (state.showReachability) drawReachabilityOverlay();
  if (state.showTerritory && state.overlayAssembliesLoaded) drawTerritoryOverlay();
  if (state.showJumpRange) drawJumpRangeCircle();
  if (state.showKills && state.showKillHeatmap) drawKillHeatmap();
  if (state.showKills) drawKillOverlay();
  if (state.showKills && state.showContested && state.overlayKillsLoaded) drawContestedOverlay();
  if (state.showKills && state.showKillLabels) drawKillLabels();
  if (state.showBattles && state.overlayKillsLoaded) drawBattleOverlay();
  if (state.showAssemblies) drawAssemblyOverlay();
  if (state.showAssemblies && state.showAssemblyLabels) drawAssemblyLabels();
  if (state.showPlayerBases) drawPlayerBaseOverlay();
  if (state.walletFilterAddress && state.overlayAssembliesLoaded) drawWalletHighlight();
  if (state.showSystemLabels) drawSystemLabels();
  drawRoute();

  if (state.selected) drawSystemMarker(state.selected, "#61d5c7", 7);
  if (state.hovered && state.hovered !== state.selected) drawSystemMarker(state.hovered, "#f1b84b", 5);
  if (state.hovered) drawHoverTooltip();
}

function drawSystemMarker(system, color, size) {
  const p = project(system);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGateLinks() {
  if (!state.gates.length) return;
  const showGame  = state.showGameGates;
  const showSmart = state.showSmartGateLinks;
  if (!showGame && !showSmart) return;

  ctx.save();
  const z = state.camera.zoom;

  // Separate passes so we can use different styles without repeated save/restore
  if (showGame) {
    // Game gates — warm amber, solid, slightly thicker at high zoom
    ctx.strokeStyle = `rgba(220, 130, 60, ${Math.min(0.55, 0.18 + z * 0.14)})`;
    ctx.lineWidth = z > 1.5 ? 1.2 : 0.8;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (const gate of state.gates) {
      if (gate.kind !== "game") continue;
      const from = state.systemsById.get(gate.from);
      const to   = state.systemsById.get(gate.to);
      if (!from || !to) continue;
      const a = project(from);
      const b = project(to);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // Highlight system dots at gate endpoints when zoomed in
    if (z > 1.8) {
      const seen = new Set();
      ctx.fillStyle = "rgba(220, 130, 60, 0.55)";
      ctx.beginPath();
      for (const gate of state.gates) {
        if (gate.kind !== "game") continue;
        for (const id of [gate.from, gate.to]) {
          if (seen.has(id)) continue;
          seen.add(id);
          const sys = state.systemsById.get(id);
          if (!sys) continue;
          const p = project(sys);
          ctx.moveTo(p.x + 2, p.y);
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }
  }

  if (showSmart) {
    // Smart gates — cyan, dashed
    ctx.strokeStyle = `rgba(0, 190, 220, ${Math.min(0.65, 0.22 + z * 0.16)})`;
    ctx.lineWidth = z > 1.5 ? 1.4 : 0.9;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    for (const gate of state.gates) {
      if (gate.kind !== "smart") continue;
      const from = state.systemsById.get(gate.from);
      const to   = state.systemsById.get(gate.to);
      if (!from || !to) continue;
      const a = project(from);
      const b = project(to);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Glow dots at smart gate endpoints
    if (z > 0.9) {
      const seen = new Set();
      for (const gate of state.gates) {
        if (gate.kind !== "smart") continue;
        for (const id of [gate.from, gate.to]) {
          if (seen.has(id)) continue;
          seen.add(id);
          const sys = state.systemsById.get(id);
          if (!sys) continue;
          const p = project(sys);
          const r = z > 1.5 ? 4 : 2.5;
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.5);
          grd.addColorStop(0,   "rgba(0,200,230,0.45)");
          grd.addColorStop(1,   "rgba(0,200,230,0)");
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(0,220,255,0.90)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, z > 1.5 ? 1.8 : 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
}

function drawRoute() {
  if (state.route.length < 2) return;
  ctx.save();
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  for (let i = 0; i < state.route.length - 1; i++) {
    const a = project(state.route[i]);
    const b = project(state.route[i + 1]);
    ctx.strokeStyle = state.routeEdges[i]?.gate ? (state.routeEdges[i]?.kind === "game" ? "#ff6d7a" : "#f1b84b") : "#61d5c7";
    ctx.lineWidth = state.activeRouteIndex === i || state.activeRouteIndex === i + 1 ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  state.route.forEach((system, index) => {
    const color = index === state.activeRouteIndex ? "#f1b84b" : index === 0 || index === state.route.length - 1 ? "#ffffff" : "#61d5c7";
    drawSystemMarker(system, color, index === state.activeRouteIndex ? 7 : 4);
  });
  ctx.restore();
}

function parseSystem(value) {
  const idMatch = String(value).match(/\d{6,}/);
  if (idMatch && state.systemsById.has(Number(idMatch[0]))) return state.systemsById.get(Number(idMatch[0]));
  return state.systemsByName.get(String(value).trim().toLowerCase());
}

function formatSystem(system) {
  return system ? system.name : "";
}

function searchSystems(query, limit = 12) {
  const raw = String(query || "").trim().toLowerCase();
  if (!raw) return [];
  const matches = [];
  for (const system of state.systems) {
    const name = system.name.toLowerCase();
    const id = String(system.id);
    if (name === raw || id === raw || name.startsWith(raw) || name.includes(raw) || id.includes(raw)) {
      matches.push(system);
      if (matches.length >= limit * 3) break;
    }
  }
  return matches
    .sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      const aExact = an === raw || String(a.id) === raw ? 0 : 1;
      const bExact = bn === raw || String(b.id) === raw ? 0 : 1;
      const aStarts = an.startsWith(raw) ? 0 : 1;
      const bStarts = bn.startsWith(raw) ? 0 : 1;
      return aExact - bExact || aStarts - bStarts || an.localeCompare(bn);
    })
    .slice(0, limit);
}

function hideSuggestions(container) {
  container.classList.remove("open");
  container.innerHTML = "";
}

function renderSuggestions(input, container, activeIndex = -1) {
  const matches = searchSystems(input.value);
  container.innerHTML = "";
  if (!matches.length) {
    hideSuggestions(container);
    return matches;
  }
  matches.forEach((system) => {
    const index = container.children.length;
    const button = document.createElement("button");
    button.type = "button";
    button.role = "option";
    button.id = `${container.id}-option-${index}`;
    button.classList.toggle("active", index === activeIndex);
    button.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
    button.innerHTML = `<strong>${escapeHtml(system.name)}</strong><span>${system.id} - R${system.regionId}</span>`;
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      input.value = formatSystem(system);
      hideSuggestions(container);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    container.append(button);
  });
  container.classList.add("open");
  if (activeIndex >= 0) input.setAttribute("aria-activedescendant", `${container.id}-option-${activeIndex}`);
  else input.removeAttribute("aria-activedescendant");
  return matches;
}

function setupSystemSearch(input, container) {
  let activeIndex = -1;
  let matches = [];
  const selectMatch = (system) => {
    input.value = formatSystem(system);
    hideSuggestions(container);
    input.removeAttribute("aria-activedescendant");
    activeIndex = -1;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const refresh = () => {
    matches = renderSuggestions(input, container, activeIndex);
    if (activeIndex >= matches.length) activeIndex = matches.length - 1;
  };
  input.addEventListener("input", () => {
    activeIndex = -1;
    refresh();
  });
  input.addEventListener("focus", refresh);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideSuggestions(container);
      activeIndex = -1;
      input.removeAttribute("aria-activedescendant");
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      matches = matches.length ? matches : searchSystems(input.value);
      if (!matches.length) return;
      activeIndex = event.key === "ArrowDown"
        ? Math.min(matches.length - 1, activeIndex + 1)
        : Math.max(0, activeIndex - 1);
      renderSuggestions(input, container, activeIndex);
      return;
    }
    if (event.key !== "Enter") return;
    if (activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      selectMatch(matches[activeIndex]);
      return;
    }
    if (parseSystem(input.value)) return;
    const first = searchSystems(input.value, 1)[0];
    if (!first) return;
    event.preventDefault();
    selectMatch(first);
  });
  input.addEventListener("blur", () => {
    setTimeout(() => hideSuggestions(container), 120);
  });
}

function resolveRouteFieldsToNames() {
  const origin = parseSystem(els.origin.value);
  const destination = parseSystem(els.destination.value);
  const via = parseSystem(els.via.value);
  if (origin) els.origin.value = formatSystem(origin);
  if (destination) els.destination.value = formatSystem(destination);
  if (via) els.via.value = formatSystem(via);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderRouteState(title, detail, tone = "", chip = "Idle") {
  state.route = [];
  state.routeEdges = [];
  state.routeSegments = [];
  state.activeRouteIndex = -1;
  els.steps.innerHTML = `<li><span class="step-index ${tone}">${tone === "danger" ? "!" : "-"}</span><div><strong class="${tone}">${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div><span class="route-chip">${escapeHtml(chip)}</span></li>`;
  els.metrics.innerHTML = `<div><span>Systems</span><strong>--</strong></div><div><span>Jump distance</span><strong>--</strong></div><div><span>Fuel efficiency score</span><strong>--</strong></div>`;
  updateRouteActions();
  draw();
}

function routeChip(edge, index, routeLength, isWaypoint) {
  if (!index) return `<span class="route-chip">Start</span>`;
  if (isWaypoint) return `<span class="route-chip smart">Via</span>`;
  if (index === routeLength - 1) return `<span class="route-chip">End</span>`;
  if (edge?.gate && edge.kind === "game") return `<span class="route-chip game">Game ${edge.count || 1}</span>`;
  if (edge?.gate) return `<span class="route-chip smart">Smart</span>`;
  return `<span class="route-chip jump">Jump</span>`;
}

function renderRoute(result) {
  state.route = result?.path ?? [];
  state.routeEdges = result?.edges ?? [];
  state.routeSegments = result?.segments ?? [];
  state.activeRouteIndex = -1;
  els.steps.innerHTML = "";

  if (!result) {
    renderRouteState("No route found", "Increase jump range or enable Smart Gates.", "danger", "Check");
    return;
  }

  const via = parseSystem(els.via.value);
  const routeLength = result.path.length;
  let totalDistance = 0;
  let gateCount = 0;
  let jumpCount = 0;
  let hotSystems = 0;
  const { start: killStart, end: killEnd } = killWindowBounds();

  result.path.forEach((system, index) => {
    const edge = result.edges[index - 1];
    if (edge) {
      if (edge.gate) gateCount += edge.count || 1;
      else {
        totalDistance += edge.distance;
        jumpCount++;
      }
    }
    const isWaypoint = Boolean(via) && index > 0 && index < routeLength - 1 && system.id === via.id;

    const killCount = state.overlayKillsLoaded
      ? state.overlayKills.filter((k) => k.systemId === system.id && k.timestamp >= killStart && k.timestamp <= killEnd).length
      : 0;
    if (killCount > 0) hotSystems++;

    const li = document.createElement("li");
    const safeName = escapeHtml(system.name);
    const detail = isWaypoint
      ? " - waypoint"
      : edge?.gate
        ? ` - ${edge.kind === "game" ? "Game Gate" : "Smart Gate"}`
        : edge
          ? ` - ${edge.distance.toFixed(1)} LY`
          : " - depart";
    const killBadge = killCount > 0 ? `<span class="kill-badge">${killCount}⚠</span>` : "";
    li.innerHTML = `
      <span class="step-index">${index + 1}</span>
      <div>
        <strong>${safeName}${killBadge}</strong>
        <small>Region ${system.regionId}${detail}</small>
      </div>
      ${routeChip(edge, index, routeLength, isWaypoint)}
    `;
    li.dataset.systemId = String(system.id);
    if (killCount > 0) li.classList.add("hot-system");
    li.addEventListener("mouseenter", () => {
      state.activeRouteIndex = index;
      draw();
    });
    li.addEventListener("mouseleave", () => {
      state.activeRouteIndex = -1;
      draw();
    });
    li.addEventListener("click", () => {
      selectSystem(system);
      centerOnSystem(system);
    });
    els.steps.append(li);
  });

  const legCount = Math.max(1, state.routeSegments.length || 1);
  const dangerCell = hotSystems > 0
    ? `<div class="metric-danger"><span>Hot systems</span><strong>${hotSystems}</strong></div>`
    : "";
  els.metrics.innerHTML = `
    <div><span>Systems</span><strong>${result.path.length}</strong></div>
    <div><span>Jump distance</span><strong>${totalDistance.toFixed(1)} LY</strong></div>
    <div><span>Fuel score</span><strong>${result.fuelScore ?? 100}/100</strong></div>
    ${dangerCell}
  `;
  setStatus(`${result.path.length} systems - ${jumpCount} jumps - ${gateCount} gates - ${legCount} leg${legCount === 1 ? "" : "s"} - ${totalDistance.toFixed(1)} jump LY`);
  updateRouteActions();
  updateSelectedRouteStep();
  draw();
}

function updateSelectedRouteStep() {
  els.steps.querySelectorAll("li").forEach((item) => {
    item.classList.toggle("active", Boolean(state.selected) && item.dataset.systemId === String(state.selected.id));
  });
}

function selectSystem(system) {
  state.selected = system;
  const safeName = escapeHtml(system.name);

  const stats = [];
  if (state.overlayKillsLoaded) {
    const { start: ks, end: ke } = killWindowBounds();
    const kills = state.overlayKills.filter((k) => k.systemId === system.id && k.timestamp >= ks && k.timestamp <= ke);
    const n = kills.length;
    if (n > 0) {
      const windowLabel = state.killTimeOffset > 0
        ? `${state.killTimeOffset}h–${state.killTimeOffset + state.overlayKillsTimeWindow}h ago`
        : `/ ${state.overlayKillsTimeWindow}h`;
      stats.push(`<span class="sys-stat sys-stat--danger">${n} kill${n > 1 ? "s" : ""} ${windowLabel}</span>`);
    }
    const score = computeDangerScore(system.id);
    if (score >= 10) stats.push(`<span class="sys-stat sys-stat--danger" title="Danger score: recency-weighted kill density">Danger ${score}/100</span>`);
  }
  if (state.overlayAssembliesLoaded) {
    const asms = state.overlayAssemblies.filter((a) => a.systemId === system.id);
    if (asms.length) {
      const online = asms.filter((a) => a.online).length;
      stats.push(`<span class="sys-stat sys-stat--assembly">${online}/${asms.length} assembl${asms.length > 1 ? "ies" : "y"}</span>`);
    }
  }
  const base = state.overlayPlayerBases.find((b) => b.systemId === system.id);
  if (base) stats.push(`<span class="sys-stat sys-stat--base">Player Base · ${base.assemblyCount} asm</span>`);

  const statsHtml = stats.length ? `<div class="sys-stats">${stats.join("")}</div>` : "";
  const timelineHtml = state.overlayKillsLoaded && state.overlayKills.some((k) => k.systemId === system.id)
    ? renderKillTimelineHtml(system.id)
    : "";
  els.card.querySelector("div:first-child").innerHTML = `<span>Region ${system.regionId} - Constellation ${system.constellationId}</span><strong>${safeName}</strong><span>${system.x.toFixed(1)}, ${system.y.toFixed(1)}, ${system.z.toFixed(1)} LY</span>${statsHtml}${timelineHtml}`;
  updateSystemActions();
  updateSelectedRouteStep();
  draw();
}

function centerOnSystem(system) {
  if (!system) return;
  const rect = els.canvas.getBoundingClientRect();
  const p = project(system);
  state.camera.x += rect.width / 2 - p.x;
  state.camera.y += rect.height / 2 - p.y;
  draw();
}

function setSelectedRouteField(field) {
  if (!state.selected) return;
  field.value = formatSystem(state.selected);
  if (parseSystem(els.origin.value) && parseSystem(els.destination.value)) calculate();
}

function nearestSystem(screenX, screenY) {
  let best = null;
  let bestDist = 14;
  const step = state.systems.length > 10000 && state.camera.zoom < 1 ? 2 : 1;
  for (let i = 0; i < state.systems.length; i += step) {
    const p = project(state.systems[i]);
    const d = Math.hypot(p.x - screenX, p.y - screenY);
    if (d < bestDist) {
      best = state.systems[i];
      bestDist = d;
    }
  }
  return best;
}

function fitSystems(systems = state.route.length ? state.route : state.systems) {
  if (!systems.length) return;
  const rect = els.canvas.getBoundingClientRect();
  const xs = systems.map((s) => projectWithZoomOne(s).x);
  const ys = systems.map((s) => projectWithZoomOne(s).y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const zx = (rect.width * 0.72) / Math.max(20, maxX - minX);
  const zy = (rect.height * 0.72) / Math.max(20, maxY - minY);
  state.camera.zoom = Math.max(0.25, Math.min(8, Math.min(zx, zy)));
  state.camera.x = rect.width / 2 - ((minX + maxX) / 2 - rect.width / 2) * state.camera.zoom - rect.width / 2;
  state.camera.y = rect.height / 2 - ((minY + maxY) / 2 - rect.height / 2) * state.camera.zoom - rect.height / 2;
  draw();
}

function projectWithZoomOne(system) {
  const zoom = state.camera.zoom;
  const x = state.camera.x;
  const y = state.camera.y;
  state.camera.zoom = 1;
  state.camera.x = 0;
  state.camera.y = 0;
  const p = project(system);
  state.camera.zoom = zoom;
  state.camera.x = x;
  state.camera.y = y;
  return p;
}

function updateGateStatus() {
  const online = state.gates.filter((gate) => gate.online !== false).length;
  const offline = state.gates.length - online;
  const smart = state.smartGateStats;
  const smartText = smart
    ? ` Public Smart Gates: ${smart.routedLinks} routed links from ${smart.publicLocated} located gates; ${smart.restricted} restricted skipped.`
    : "";
  els.gateStatus.textContent = online
    ? `${online} connected star-system gate links loaded${offline ? `, ${offline} offline ignored.` : "."}${smartText}`
    : `Connected star-system gates load automatically.${smartText}`;
}

function updateRangePresets() {
  const current = String(Number(els.jumpRange.value || 0));
  els.rangePresets.forEach((button) => {
    button.classList.toggle("active", button.dataset.range === current);
  });
}

function firstNumber(...values) {
  return RouteCore.firstNumber(...values);
}

function readGateRows(payload) {
  return RouteCore.readGateRows(payload);
}

function isGateOnline(row) {
  return RouteCore.isGateOnline(row);
}

function normalizeGateRows(payload) {
  return RouteCore.normalizeGateRows(payload);
}

async function suiGraphql(query, variables = {}) {
  const res = await fetch(SUI_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Sui GraphQL returned ${res.status}`);
  const payload = await res.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message || "Sui GraphQL error");
  return payload.data;
}

async function suiRpc(method, params) {
  const res = await fetch(SUI_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Sui RPC returned ${res.status}`);
  const payload = await res.json();
  if (payload.error) throw new Error(payload.error.message || "Sui RPC error");
  return payload.result;
}

function gateStatusVariant(gate) {
  return String(gate?.status?.status?.["@variant"] || gate?.status?.["@variant"] || gate?.status || "").toUpperCase();
}

function isOpenSmartGate(gate) {
  return gateStatusVariant(gate) === "ONLINE" && Boolean(gate.linked_gate_id) && !gate.extension;
}

async function fetchSmartGateObjects() {
  const query = `
    query SmartGates($type: String!, $after: String) {
      objects(filter: { type: $type }, first: 50, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          address
          asMoveObject { contents { json } }
        }
      }
    }
  `;
  const type = `${EVE_WORLD_PACKAGE_ID}::gate::Gate`;
  const gates = [];
  let after = null;
  do {
    const data = await suiGraphql(query, { type, after });
    const page = data.objects;
    gates.push(...page.nodes.map((node) => node.asMoveObject?.contents?.json).filter(Boolean));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return gates;
}

async function fetchLocationTableId() {
  const query = `
    query LocationRegistry($type: String!) {
      objects(filter: { type: $type }, first: 1) {
        nodes { asMoveObject { contents { json } } }
      }
    }
  `;
  const type = `${EVE_WORLD_PACKAGE_ID}::location::LocationRegistry`;
  const data = await suiGraphql(query, { type });
  return data.objects.nodes[0]?.asMoveObject?.contents?.json?.locations?.id || null;
}

async function fetchLocatedGateSystems(gateIds) {
  const tableId = await fetchLocationTableId();
  if (!tableId || !gateIds.size) return new Map();

  const fieldByGateId = new Map();
  let cursor = null;
  do {
    const page = await suiRpc("suix_getDynamicFields", [tableId, cursor, 100]);
    for (const field of page.data || []) {
      const gateId = field.name?.value;
      if (gateIds.has(gateId)) fieldByGateId.set(gateId, field.objectId);
    }
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor && fieldByGateId.size < gateIds.size);

  const located = new Map();
  const objectIds = Array.from(fieldByGateId.values());
  for (let i = 0; i < objectIds.length; i += 50) {
    const objects = await suiRpc("sui_multiGetObjects", [objectIds.slice(i, i + 50), { showContent: true }]);
    for (const object of objects || []) {
      const fields = object.data?.content?.fields;
      const gateId = fields?.name;
      const systemId = Number(fields?.value?.fields?.solarsystem);
      if (gateId && Number.isFinite(systemId)) located.set(gateId, systemId);
    }
  }
  return located;
}

async function fetchPublicSmartGateLinks() {
  const gates = await fetchSmartGateObjects();
  const byId = new Map(gates.map((gate) => [gate.id, gate]));
  const linkedOnline = gates.filter((gate) => gateStatusVariant(gate) === "ONLINE" && gate.linked_gate_id);
  const openLinked = linkedOnline.filter((gate) => !gate.extension);
  const located = await fetchLocatedGateSystems(new Set(openLinked.map((gate) => gate.id)));
  const links = [];
  const seen = new Set();

  for (const gate of openLinked) {
    const linkedGate = byId.get(gate.linked_gate_id);
    if (!linkedGate || !isOpenSmartGate(linkedGate)) continue;
    const from = located.get(gate.id);
    const to = located.get(linkedGate.id);
    if (!from || !to || from === to) continue;
    const key = [gate.id, linkedGate.id].sort().join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      from,
      to,
      kind: "smart",
      count: 1,
      online: true,
      name: gate.metadata?.name || linkedGate.metadata?.name || "Public Smart Gate",
    });
  }

  state.smartGateStats = {
    total: gates.length,
    onlineLinked: linkedOnline.length,
    openLinked: openLinked.length,
    restricted: linkedOnline.length - openLinked.length,
    publicLocated: located.size,
    routedLinks: links.length,
  };
  return links;
}

function storeGates(gates, sourceLabel) {
  state.gates = [];
  state.gateKeys = new Set();
  state.gateAdjacency = new Map();
  mergeGates(gates);
  updateGateStatus();
  if (sourceLabel) setStatus(sourceLabel);
  draw();
}

function addGateNeighbor(fromId, toId, gate) {
  const from = state.systemsById.get(fromId);
  const to = state.systemsById.get(toId);
  if (!from || !to || gate.online === false) return;
  if (!state.gateAdjacency.has(fromId)) state.gateAdjacency.set(fromId, []);
  state.gateAdjacency.get(fromId).push({
    system: to,
    distance: RouteCore.distance(from, to),
    gate: true,
    kind: gate.kind,
    count: gate.count,
    name: gate.name,
  });
}

function mergeGates(gates) {
  let added = 0;
  gates.forEach((gate) => {
    if (!gate.from || !gate.to || gate.from === gate.to) return;
    const a = Math.min(gate.from, gate.to);
    const b = Math.max(gate.from, gate.to);
    const key = `${a}:${b}:${gate.kind || "game"}`;
    if (state.gateKeys.has(key)) return;
    state.gateKeys.add(key);
    const normalizedGate = {
      from: gate.from,
      to: gate.to,
      name: gate.name || "Stargate",
      kind: gate.kind || "game",
      count: Number(gate.count || 1),
      online: gate.online !== false,
    };
    state.gates.push(normalizedGate);
    addGateNeighbor(normalizedGate.from, normalizedGate.to, normalizedGate);
    addGateNeighbor(normalizedGate.to, normalizedGate.from, normalizedGate);
    added++;
  });
  if (added) updateGateStatus();
  if (added) {
    syncRouteWorker().catch(() => {
      state.workerReady = false;
    });
  }
  return added;
}

async function fetchSystemGateLinks(system) {
  if (!system || state.gateSystemsFetched.has(system.id)) return 0;
  state.gateSystemsFetched.add(system.id);
  try {
    const res = await fetch(`${API_BASE}/solarsystems/${system.id}`);
    if (!res.ok) return 0;
    const detail = await res.json();
    const gates = (detail.gateLinks || []).map((link) => ({
      from: detail.id,
      to: link.destination?.id,
      name: link.name || "Stargate",
      kind: "game",
      count: 1,
      online: true,
    }));
    return mergeGates(gates);
  } catch {
    return 0;
  }
}

async function discoverGateLinksForRoute(route) {
  if (!route?.path?.length || !els.useGates.checked) return 0;
  const systemsToFetch = route.path.filter((system) => !state.gateSystemsFetched.has(system.id));
  let added = 0;
  for (let i = 0; i < systemsToFetch.length; i += 8) {
    const batch = systemsToFetch.slice(i, i + 8);
    const counts = await Promise.all(batch.map(fetchSystemGateLinks));
    added += counts.reduce((sum, count) => sum + count, 0);
    if (added) setStatus(`Discovered ${state.gates.length} gate links`);
  }
  return added;
}

async function ensureGateNetwork() {
  if (state.gatesLoaded) return;
  if (state.gatesLoading) return state.gatesLoading;
  state.gatesLoading = (async () => {
    try {
      const res = await fetch(GATE_NETWORK_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Gate network returned ${res.status}`);
      const gates = normalizeGateRows(await res.json());
      storeGates(gates, `${gates.filter((gate) => gate.online !== false).length} online gates loaded`);
    } catch {
      state.gates = [];
      state.gateAdjacency = new Map();
      updateGateStatus();
    }

    try {
      const smartGates = await fetchPublicSmartGateLinks();
      const added = mergeGates(smartGates);
      const stats = state.smartGateStats;
      if (stats) {
        stats.routedLinks = added;
        updateGateStatus();
        const routed = `${added} public Smart Gate link${added === 1 ? "" : "s"}`;
        const located = `${stats.publicLocated} located gate${stats.publicLocated === 1 ? "" : "s"}`;
        const restricted = stats.restricted ? `, ${stats.restricted} restricted skipped` : "";
        setStatus(`${routed} loaded (${located}${restricted})`);
      }
    } catch {
      state.smartGateStats = null;
    } finally {
      state.gatesLoaded = true;
      state.gatesLoading = null;
    }
  })();
  return state.gatesLoading;
}

function systemLink(system) {
  return `<a href="showinfo:5//${system.id}">${escapeHtml(system.name)}</a>`;
}

function routeClipboardText() {
  if (!state.route.length) return "";
  const start = state.route[0];
  const end = state.route[state.route.length - 1];
  const parts = [systemLink(start)];

  for (let i = 1; i < state.route.length; i++) {
    const edge = state.routeEdges[i - 1];
    const token = edge?.gate ? (edge.kind === "game" ? ` (${edge.count || 1})-> ` : " []-> ") : ` ${Math.round(edge?.distance ?? 0)}-> `;
    parts.push(token, systemLink(state.route[i]));
  }

  return [
    `${start.name} -> ${end.name}`,
    "Gate: (x)-> SmartGate: []-> Jump: ly->",
    parts.join(""),
  ].join("\n");
}

async function copyRouteToClipboard() {
  const text = routeClipboardText();
  if (!text) {
    setStatus("Calculate a route first");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.left = "-9999px";
    document.body.append(scratch);
    scratch.select();
    document.execCommand("copy");
    scratch.remove();
  }
  setStatus("In-game route copied");
}

function routeShareUrl() {
  const origin = parseSystem(els.origin.value);
  const destination = parseSystem(els.destination.value);
  const via = parseSystem(els.via.value);
  if (!origin || !destination) return "";
  const params = new URLSearchParams();
  params.set("system1", String(origin.id));
  params.set("system2", String(destination.id));
  if (via) params.set("via", String(via.id));
  params.set("jumpDistance", String(Number(els.jumpRange.value || 120)));
  params.set("optimize", new FormData(els.form).get("optimize") || "fuel");
  params.set("useGates", els.useGates.checked ? "1" : "0");
  // Overlay state
  if (state.showKills) params.set("ov_k", "1");
  if (state.overlayKillsTimeWindow !== 24) params.set("ov_kh", String(state.overlayKillsTimeWindow));
  if (state.showKillLabels) params.set("ov_kl", "1");
  if (state.showKillShipsOnly) params.set("ov_ks", "1");
  if (state.showAssemblies) params.set("ov_a", "1");
  if (state.overlayAssembliesOnlineOnly) params.set("ov_ao", "1");
  if (state.showPlayerBases) params.set("ov_b", "1");
  const url = new URL(location.href);
  url.search = params.toString();
  return url.toString();
}

async function copyShareLinkToClipboard() {
  const text = routeShareUrl();
  if (!text) {
    setStatus("Choose a valid origin and destination");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.left = "-9999px";
    document.body.append(scratch);
    scratch.select();
    document.execCommand("copy");
    scratch.remove();
  }
  setStatus("Share link copied");
}

function loadUrlParams() {
  const params = new URLSearchParams(location.search);
  const origin = params.get("system1");
  const destination = params.get("system2");
  const via = params.get("via");
  const jump = params.get("jumpDistance");
  const optimize = params.get("optimize");
  const useGates = params.get("useGates");
  if (origin) els.origin.value = origin;
  if (destination) els.destination.value = destination;
  if (via) els.via.value = via;
  if (jump) els.jumpRange.value = jump;
  if (["fuel", "jumps"].includes(optimize)) {
    document.querySelector(`[name="optimize"][value="${optimize}"]`).checked = true;
  }
  if (["0", "false", "off", "no"].includes(String(useGates).toLowerCase())) {
    els.useGates.checked = false;
  }
  // Overlay state
  if (params.get("ov_k") === "1") {
    els.killsToggle.checked = true;
    state.showKills = true;
    els.killTimePanel.style.display = "";
  }
  if (params.has("ov_kh")) {
    const h = Number(params.get("ov_kh"));
    if (h > 0) {
      state.overlayKillsTimeWindow = h;
      updateTimePresets();
    }
  }
  if (params.get("ov_kl") === "1") {
    els.showKillLabelsToggle && (els.showKillLabelsToggle.checked = true);
    state.showKillLabels = true;
  }
  if (params.get("ov_ks") === "1") {
    els.killShipsOnlyToggle && (els.killShipsOnlyToggle.checked = true);
    state.showKillShipsOnly = true;
  }
  if (params.get("ov_a") === "1") {
    els.assembliesToggle.checked = true;
    state.showAssemblies = true;
    els.asmTypePanel && (els.asmTypePanel.style.display = "");
  }
  if (params.get("ov_ao") === "1") {
    els.assembliesOnlineOnlyToggle && (els.assembliesOnlineOnlyToggle.checked = true);
    state.overlayAssembliesOnlineOnly = true;
  }
  if (params.get("ov_b") === "1") {
    els.playerBasesToggle.checked = true;
    state.showPlayerBases = true;
  }
  updateOverlayLegend();
}

function resolveWaypoint() {
  const raw = String(els.via.value || "").trim();
  if (!raw) return { system: null, valid: true };
  const system = parseSystem(raw);
  return { system, valid: Boolean(system) };
}

async function calculateLegRoute(origin, destination, mode, range, token) {
  let result = await calculateRoute(origin, destination, mode, range);
  for (let pass = 0; pass < 4 && result; pass++) {
    const added = await discoverGateLinksForRoute(result);
    if (token !== state.routeToken) return undefined;
    if (!added) break;
    result = await calculateRoute(origin, destination, mode, range);
  }
  if (!result) return null;
  const fuelBest = mode === "fuel" ? result : await calculateRoute(origin, destination, "fuel", range);
  if (token !== state.routeToken) return undefined;
  if (fuelBest) result.fuelScore = RouteCore.fuelScore(result, fuelBest);
  return { result, fuelBest };
}

async function calculateJourney(origin, destination, waypoint, mode, range, token) {
  const stops = waypoint ? [origin, waypoint, destination] : [origin, destination];
  const segments = [];
  const fuelSegments = [];

  for (let index = 0; index < stops.length - 1; index++) {
    const leg = await calculateLegRoute(stops[index], stops[index + 1], mode, range, token);
    if (leg === undefined) return undefined;
    if (!leg) return null;
    segments.push({
      origin: stops[index],
      destination: stops[index + 1],
      path: leg.result.path,
      edges: leg.result.edges,
      cost: leg.result.cost,
    });
    fuelSegments.push(leg.fuelBest || leg.result);
  }

  const stitched = RouteCore.stitchRoutes(segments);
  if (!stitched) return null;
  const fuelBest = RouteCore.stitchRoutes(fuelSegments);
  if (fuelBest) stitched.fuelScore = RouteCore.fuelScore(stitched, fuelBest);
  stitched.segments = segments.map((segment) => ({
    origin: segment.origin,
    destination: segment.destination,
  }));
  return stitched;
}

function hydrateWorkerRouteResult(result) {
  if (!result) return null;
  return {
    path: result.pathIds.map((id) => state.systemsById.get(id)).filter(Boolean),
    edges: result.edges || [],
    cost: result.cost,
    fuelScore: result.fuelScore ?? 100,
  };
}

function getAvoidSystemIds() {
  const ids = new Set();
  if (state.overlayKillsLoaded) {
    const { start: ks, end: ke } = killWindowBounds();
    if (state.avoidKills) {
      for (const kill of state.overlayKills) {
        if (kill.timestamp >= ks && kill.timestamp <= ke) ids.add(kill.systemId);
      }
    }
    if (state.avoidContested) {
      const contested = buildContestedMap(3);
      for (const id of contested.keys()) ids.add(id);
    }
  }
  return ids;
}

function findRouteInMain(origin, destination, mode, range) {
  const avoidIds = getAvoidSystemIds();
  avoidIds.delete(origin.id);
  avoidIds.delete(destination.id);

  let systems = state.systems;
  let systemsById = state.systemsById;
  let gateAdjacency;
  let spatialIndex;

  if (avoidIds.size > 0) {
    systems = state.systems.filter((s) => !avoidIds.has(s.id));
    systemsById = new Map(systems.map((s) => [s.id, s]));
    gateAdjacency = RouteCore.buildGateAdjacency(systemsById, state.gates);
    spatialIndex = RouteCore.makeSpatialIndex(systems, range);
  } else {
    gateAdjacency = RouteCore.buildGateAdjacency(systemsById, state.gates);
    if (!state.spatialIndexes.has(range)) {
      state.spatialIndexes.set(range, RouteCore.makeSpatialIndex(state.systems, range));
    }
    spatialIndex = state.spatialIndexes.get(range);
  }

  const base = {
    systems,
    systemsById,
    gateAdjacency,
    origin,
    destination,
    range,
    useGates: els.useGates.checked,
    spatialIndex,
  };
  const result = RouteCore.findRoute({ ...base, mode });
  const fuelBest = mode === "fuel" ? result : RouteCore.findRoute({ ...base, mode: "fuel" });
  if (result && fuelBest) result.fuelScore = RouteCore.fuelScore(result, fuelBest);
  return result;
}

async function calculateRoute(origin, destination, mode, range) {
  if (routeWorker) {
    await syncRouteWorker();
    const avoidIds = getAvoidSystemIds();
    avoidIds.delete(origin.id);
    avoidIds.delete(destination.id);
    const message = await workerMessage({
      type: "route",
      originId: origin.id,
      destinationId: destination.id,
      range,
      mode,
      useGates: els.useGates.checked,
      avoidSystemIds: [...avoidIds],
    });
    return hydrateWorkerRouteResult(message.result);
  }
  return findRouteInMain(origin, destination, mode, range);
}

async function calculate() {
  const token = ++state.routeToken;
  setCalculating(true);
  await ensureGateNetwork();
  if (token !== state.routeToken) {
    setCalculating(false);
    return;
  }
  const origin = parseSystem(els.origin.value);
  const destination = parseSystem(els.destination.value);
  const waypoint = resolveWaypoint();
  if (!origin || !destination) {
    renderRouteState("Pick an origin and destination", "Use search or click stars on the map.", "", "Pick");
    setStatus("Choose a valid origin and destination");
    setCalculating(false);
    return;
  }
  if (!waypoint.valid) {
    renderRouteState("Waypoint not found", "Choose a valid via system or clear the field.", "danger", "Via");
    setStatus("Choose a valid waypoint system");
    setCalculating(false);
    return;
  }
  resolveRouteFieldsToNames();
  selectSystem(origin);
  setStatus("Calculating route");
  renderRouteState(
    waypoint.system ? "Calculating multi-leg route" : "Calculating route",
    waypoint.system ? "Checking both route legs and available gates." : "Checking jump range and available gates.",
    "",
    "Wait",
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  if (token !== state.routeToken) {
    setCalculating(false);
    return;
  }
  const mode = new FormData(els.form).get("optimize") || "fuel";
  const range = Number(els.jumpRange.value || 120);
  try {
    const result = await calculateJourney(origin, destination, waypoint.system, mode, range, token);
    if (token !== state.routeToken || result === undefined) return;
    renderRoute(result);
    if (result) fitSystems(result.path);
  } finally {
    if (token === state.routeToken) setCalculating(false);
  }
}

function bindEvents() {
  window.addEventListener("resize", resizeCanvas);
  setupSystemSearch(els.origin, els.originSuggestions);
  setupSystemSearch(els.destination, els.destinationSuggestions);
  setupSystemSearch(els.via, els.viaSuggestions);
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculate();
  });
  const scheduleRouteUpdate = () => {
    clearTimeout(routeInputTimer);
    routeInputTimer = setTimeout(() => {
      if (parseSystem(els.origin.value) && parseSystem(els.destination.value)) calculate();
    }, 250);
  };
  [els.origin, els.destination, els.via, els.jumpRange].forEach((field) => {
    field.addEventListener("input", scheduleRouteUpdate);
    field.addEventListener("change", scheduleRouteUpdate);
  });
  els.jumpRange.addEventListener("input", () => { updateRangePresets(); if (state.showJumpRange) scheduleDraw(); });
  els.jumpRange.addEventListener("change", updateRangePresets);
  els.rangePresets.forEach((button) => {
    button.addEventListener("click", () => {
      els.jumpRange.value = button.dataset.range;
      updateRangePresets();
      els.jumpRange.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
  els.useGates.addEventListener("change", () => {
    if (parseSystem(els.origin.value) && parseSystem(els.destination.value)) calculate();
  });
  els.showGameGatesToggle?.addEventListener("change", () => {
    state.showGameGates = els.showGameGatesToggle.checked;
    draw();
  });
  els.showSmartGateLinksToggle?.addEventListener("change", () => {
    state.showSmartGateLinks = els.showSmartGateLinksToggle.checked;
    draw();
  });
  els.avoidKillsToggle?.addEventListener("change", async () => {
    state.avoidKills = els.avoidKillsToggle.checked;
    if (state.avoidKills && !state.overlayKillsLoaded) {
      await ensureKillFeed();
    }
    if (parseSystem(els.origin.value) && parseSystem(els.destination.value)) calculate();
  });
  els.assembliesOnlineOnlyToggle?.addEventListener("change", () => {
    state.overlayAssembliesOnlineOnly = els.assembliesOnlineOnlyToggle.checked;
    draw();
  });
  els.showJumpRangeToggle?.addEventListener("change", () => {
    state.showJumpRange = els.showJumpRangeToggle.checked;
    draw();
  });
  els.showKillLabelsToggle?.addEventListener("change", () => {
    state.showKillLabels = els.showKillLabelsToggle.checked;
    draw();
  });
  els.killShipsOnlyToggle?.addEventListener("change", () => {
    state.showKillShipsOnly = els.killShipsOnlyToggle.checked;
    draw();
  });
  els.showSystemLabelsToggle?.addEventListener("change", () => {
    state.showSystemLabels = els.showSystemLabelsToggle.checked;
    draw();
  });
  document.querySelectorAll('input[name="optimize"]').forEach((field) => {
    field.addEventListener("change", () => {
      if (parseSystem(els.origin.value) && parseSystem(els.destination.value)) calculate();
    });
  });
  document.getElementById("swapRoute").addEventListener("click", () => {
    [els.origin.value, els.destination.value] = [els.destination.value, els.origin.value];
    resolveRouteFieldsToNames();
    calculate();
  });
  document.getElementById("zoomIn").addEventListener("click", () => {
    state.camera.zoom *= 1.25;
    draw();
  });
  document.getElementById("zoomOut").addEventListener("click", () => {
    state.camera.zoom /= 1.25;
    draw();
  });
  document.getElementById("fitRoute").addEventListener("click", () => fitSystems());
  els.resetView.addEventListener("click", () => {
    state.camera.rotX = 0;
    state.camera.rotY = 0;
    draw();
  });
  els.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  els.copyRoute.addEventListener("click", copyRouteToClipboard);
  els.shareRoute.addEventListener("click", copyShareLinkToClipboard);
  els.shareLink.addEventListener("click", copyShareLinkToClipboard);
  els.setOrigin.addEventListener("click", () => setSelectedRouteField(els.origin));
  els.setDestination.addEventListener("click", () => setSelectedRouteField(els.destination));
  els.setVia.addEventListener("click", () => setSelectedRouteField(els.via));
  els.centerSystem.addEventListener("click", () => centerOnSystem(state.selected));

  els.canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.dragMode = (event.button === 2 || event.shiftKey) ? 'pan' : 'rotate';
    state.dragStart = { x: event.clientX, y: event.clientY, cameraX: state.camera.x, cameraY: state.camera.y, rotX: state.camera.rotX, rotY: state.camera.rotY };
    if (event.button === 2) event.preventDefault();
  });
  window.addEventListener("pointerup", () => {
    state.dragging = false;
  });
  window.addEventListener("pointermove", (event) => {
    const rect = cachedRect || els.canvas.getBoundingClientRect();
    if (state.dragging && state.dragStart) {
      const dx = event.clientX - state.dragStart.x;
      const dy = event.clientY - state.dragStart.y;
      if (state.dragMode === 'pan') {
        state.camera.x = state.dragStart.cameraX + dx;
        state.camera.y = state.dragStart.cameraY + dy;
      } else {
        state.camera.rotY = state.dragStart.rotY + (dx / rect.width) * Math.PI * 2;
        state.camera.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.dragStart.rotX + (dy / rect.height) * Math.PI));
      }
      scheduleDraw();
      return;
    }
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    state.hovered = nearestSystem(event.clientX - rect.left, event.clientY - rect.top);
    scheduleDraw();
  });
  els.canvas.addEventListener("click", (event) => {
    const rect = els.canvas.getBoundingClientRect();
    const system = nearestSystem(event.clientX - rect.left, event.clientY - rect.top);
    if (!system) return;
    selectSystem(system);
  });
  els.canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.camera.zoom *= event.deltaY < 0 ? 1.12 : 0.89;
    state.camera.zoom = Math.max(0.18, Math.min(12, state.camera.zoom));
    draw();
  }, { passive: false });
  els.canvas.addEventListener("keydown", (event) => {
    const pan = 32;
    if (event.key === "ArrowLeft") state.camera.x += pan;
    else if (event.key === "ArrowRight") state.camera.x -= pan;
    else if (event.key === "ArrowUp") state.camera.y += pan;
    else if (event.key === "ArrowDown") state.camera.y -= pan;
    else if (event.key === "+" || event.key === "=") state.camera.zoom = Math.min(12, state.camera.zoom * 1.12);
    else if (event.key === "-" || event.key === "_") state.camera.zoom = Math.max(0.18, state.camera.zoom * 0.89);
    else if (event.key.toLowerCase() === "f") fitSystems();
    else if (event.key.toLowerCase() === "q") state.camera.rotY -= 0.05;
    else if (event.key.toLowerCase() === "e") state.camera.rotY += 0.05;
    else return;
    event.preventDefault();
    draw();
  });
}

// ── Overlay: Kill Feed ─────────────────────────────────────────────────────

async function fetchKillFeed() {
  // Killmails are on-chain Sui events — query via suix_queryEvents
  const eventType = `${EVE_WORLD_PACKAGE_ID}::killmail::KillmailCreatedEvent`;
  const kills = [];
  let cursor = null;
  let pages = 0;
  const MAX_PAGES = 20; // up to ~2 000 events
  do {
    const data = await suiRpc("suix_queryEvents", [
      { MoveEventType: eventType },
      cursor,
      100,
      true, // descending — newest first
    ]);
    for (const event of data.data || []) {
      const p = event.parsedJson;
      const systemId = Number(p.solar_system_id?.item_id ?? 0);
      const timestamp = Number(event.timestampMs ?? 0);
      if (!systemId || !timestamp) continue;
      kills.push({
        systemId,
        timestamp,
        lossType: p.loss_type?.variant ?? "",
        killerId: p.killer_id?.item_id ?? "",
        victimId: p.victim_id?.item_id ?? "",
      });
    }
    cursor = data.nextCursor ?? null;
    pages++;
  } while (cursor && pages < MAX_PAGES);
  return { kills, source: "sui-events" };
}

function killWindowBounds() {
  const now = Date.now();
  const offsetMs = state.killTimeOffset * 3_600_000;
  const end = now - offsetMs;
  const start = end - state.overlayKillsTimeWindow * 3_600_000;
  return { start, end };
}

function buildKillSystemMap() {
  const { start, end } = killWindowBounds();
  const map = new Map();
  for (const kill of state.overlayKills) {
    if (kill.timestamp < start || kill.timestamp > end) continue;
    if (!map.has(kill.systemId)) map.set(kill.systemId, []);
    map.get(kill.systemId).push(kill);
  }
  return map;
}

function isShipKill(kill) {
  const t = String(kill.lossType ?? "").toLowerCase();
  // Heuristic: non-ship types include "turret", "assembly", "structure", "networknode", "storageunit"
  if (!t || t === "ship" || t === "capsule" || t === "shuttle") return true;
  if (t.includes("turret") || t.includes("assembly") || t.includes("structure")
      || t.includes("node") || t.includes("storage") || t.includes("gate")) return false;
  return true; // default to ship if type is unknown
}

function drawKillOverlay() {
  const killsBySystem = buildKillSystemMap();
  if (!killsBySystem.size) return;
  const now = Date.now();
  const windowMs = state.overlayKillsTimeWindow * 3_600_000;
  ctx.save();
  for (const [systemId, kills] of killsBySystem) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    const rect = cachedRect || els.canvas.getBoundingClientRect();
    if (p.x < -20 || p.y < -20 || p.x > rect.width + 20 || p.y > rect.height + 20) continue;

    const shipKills = kills.filter(isShipKill);
    const structKills = kills.filter((k) => !isShipKill(k));

    // Apply ships-only filter
    const visible = state.showKillShipsOnly ? shipKills : kills;
    if (!visible.length) continue;

    const count = visible.length;
    const radius = Math.min(12, 4 + Math.log2(count + 1) * 2);
    const mostRecent = Math.max(...visible.map((k) => k.timestamp));
    const age = Math.min(1, (now - mostRecent) / windowMs);
    const freshness = 1 - age;

    // Structure kills layer (purple, behind ship kills)
    if (!state.showKillShipsOnly && structKills.length > 0) {
      const sc = structKills.length;
      const sr = Math.min(10, 3 + Math.log2(sc + 1) * 1.8);
      const sRecent = Math.max(...structKills.map((k) => k.timestamp));
      const sFresh = 1 - Math.min(1, (now - sRecent) / windowMs);
      const sAlpha = 0.35 + sFresh * 0.30;
      const sGrd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sr * 3);
      sGrd.addColorStop(0, `rgba(160, 100, 255, ${sAlpha * 0.6})`);
      sGrd.addColorStop(1, `rgba(160, 100, 255, 0)`);
      ctx.fillStyle = sGrd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sr * 3, 0, Math.PI * 2);
      ctx.fill();
      // Small offset square marker to distinguish from ship kills
      ctx.fillStyle = `rgba(180, 120, 255, ${sAlpha + 0.1})`;
      ctx.fillRect(p.x - sr * 0.7, p.y - sr * 0.7, sr * 1.4, sr * 1.4);
    }

    // Ship kills (red circles, current behavior)
    const r = Math.round(180 + freshness * 75);
    const g = Math.round(40 + freshness * 20);
    const coreAlpha = 0.55 + freshness * 0.35;
    const glowAlpha = 0.20 + freshness * 0.20;
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.5);
    grd.addColorStop(0, `rgba(${r}, ${g}, 50, ${glowAlpha})`);
    grd.addColorStop(1, `rgba(${r}, ${g}, 50, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${r}, ${g}, 50, ${coreAlpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (count > 1 && state.camera.zoom > 0.5) {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = `bold ${Math.max(8, Math.min(11, radius + 1))}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(count > 99 ? "99+" : String(count), p.x, p.y);
    }
  }
  ctx.restore();
}

async function ensureKillFeed() {
  if (state.overlayKillsLoaded) return;
  if (state.overlayKillsLoading) return state.overlayKillsLoading;
  state.overlayKillsLoading = (async () => {
    setOverlayStatus("Loading kill feed...");
    try {
      const { kills } = await fetchKillFeed();
      state.overlayKills = kills;
      if (kills.length) {
        setOverlayStatus(`${kills.length} kills loaded (last ${state.overlayKillsTimeWindow}h shown)`);
      } else {
        setOverlayStatus("No kills found on-chain");
      }
    } catch (err) {
      state.overlayKills = [];
      setOverlayStatus(`Kill feed error: ${err.message ?? err}`);
    } finally {
      state.overlayKillsLoaded = true;
      state.overlayKillsLoading = null;
      updateHotPanel();
      updateContestedPanel();
      updateBattlesPanel();
      draw();
    }
  })();
  return state.overlayKillsLoading;
}

// ── Overlay: Smart Assemblies ──────────────────────────────────────────────

// Correct module paths from world-contracts source
// (github.com/evefrontier/world-contracts/tree/main/contracts/world/sources)
const ASSEMBLY_TYPE_DEFS = [
  { fragment: "gate::Gate",                label: "Smart Gate",  color: "#00e5ff" },
  { fragment: "network_node::NetworkNode", label: "Network Node", color: "#00b4d8" },
  { fragment: "storage_unit::StorageUnit", label: "Storage Unit", color: "#61d5c7" },
  { fragment: "assembly::Assembly",         label: "Assembly",    color: "#9b8dff" },
  { fragment: "turret::Turret",            label: "Turret",      color: "#ff9f40" },
];

async function fetchAssembliesOfType(typeFragment) {
  const query = `
    query Assemblies($type: String!, $after: String) {
      objects(filter: { type: $type }, first: 50, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          address
          asMoveObject { contents { json } }
        }
      }
    }
  `;
  const type = `${EVE_WORLD_PACKAGE_ID}::${typeFragment}`;
  const items = [];
  let after = null;
  let pages = 0;
  do {
    const data = await suiGraphql(query, { type, after });
    const page = data.objects;
    items.push(...page.nodes.map((n) => ({ id: n.address, ...n.asMoveObject?.contents?.json })).filter((n) => n.id));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    pages++;
    if (pages > 20) break; // safety cap
  } while (after);
  return items;
}

async function fetchAssemblyOverlay() {
  const allItems = [];
  for (const typeDef of ASSEMBLY_TYPE_DEFS) {
    try {
      const items = await fetchAssembliesOfType(typeDef.fragment);
      for (const item of items) {
        allItems.push({ ...item, _typeLabel: typeDef.label, _typeColor: typeDef.color });
      }
    } catch {
      // type might not exist; continue
    }
  }
  // Locate assemblies via LocationRegistry
  const ids = new Set(allItems.map((a) => a.id).filter(Boolean));
  const located = await fetchLocatedGateSystems(ids).catch(() => new Map());

  return allItems
    .map((a) => {
      const systemId = located.get(a.id) ?? Number(a.solar_system_id ?? a.solarsystem ?? 0);
      const online = String(a?.status?.status?.["@variant"] ?? a?.status?.["@variant"] ?? a?.status ?? "").toUpperCase() === "ONLINE";
      // NetworkNode exposes connected_assembly_ids — use for player-base detection
      const connectedCount = Array.isArray(a.connected_assembly_ids) ? a.connected_assembly_ids.length : 0;
      // Extract owner address — try multiple common Sui Move field names
      const ownerId = a.owner_id?.account_address ?? a.owner_id?.item_id ?? a.owner?.account_address ?? a.owner_address ?? null;
      return {
        id: a.id,
        systemId,
        label: a._typeLabel,
        color: a._typeColor,
        online,
        name: a.metadata?.name || a._typeLabel,
        connectedCount,
        ownerId,
      };
    })
    .filter((a) => a.systemId);
}

function drawAssemblyOverlay() {
  if (!state.overlayAssemblies.length) return;
  ctx.save();
  // Group by system, respecting the online-only and type filters
  const bySystem = new Map();
  for (const asm of state.overlayAssemblies) {
    if (state.overlayAssembliesOnlineOnly && !asm.online) continue;
    if (!state.overlayAsmTypeFilter.has(asm.label)) continue;
    if (!bySystem.has(asm.systemId)) bySystem.set(asm.systemId, []);
    bySystem.get(asm.systemId).push(asm);
  }
  for (const [systemId, assemblies] of bySystem) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    const rect = cachedRect || els.canvas.getBoundingClientRect();
    if (p.x < -20 || p.y < -20 || p.x > rect.width + 20 || p.y > rect.height + 20) continue;
    const onlineCount = assemblies.filter((a) => a.online).length;
    const anyOnline = onlineCount > 0;
    const radius = 5 + Math.min(4, Math.log2(assemblies.length + 1));
    // Use dominant type color
    const colors = assemblies.filter((a) => a.online).map((a) => a.color);
    const dominantColor = colors[0] ?? assemblies[0]?.color ?? "#00b4d8";
    ctx.strokeStyle = anyOnline ? dominantColor : "rgba(100,120,140,0.4)";
    ctx.lineWidth = anyOnline ? 1.5 : 1;
    ctx.beginPath();
    // Diamond shape for assemblies
    ctx.moveTo(p.x, p.y - radius);
    ctx.lineTo(p.x + radius, p.y);
    ctx.lineTo(p.x, p.y + radius);
    ctx.lineTo(p.x - radius, p.y);
    ctx.closePath();
    ctx.stroke();
    if (anyOnline) {
      ctx.fillStyle = dominantColor.replace(")", ", 0.20)").replace("rgb", "rgba").replace("#", "rgba(").replace("rgba(", "rgba(0,180,216,0.12)");
      // Simpler fill
      ctx.fillStyle = `${dominantColor}22`;
      ctx.fill();
    }
    if (assemblies.length > 1 && state.camera.zoom > 0.6) {
      ctx.fillStyle = anyOnline ? dominantColor : "rgba(150,170,190,0.7)";
      ctx.font = `bold ${Math.max(7, Math.min(10, radius))}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(assemblies.length), p.x, p.y);
    }
  }
  ctx.restore();
}

async function ensureAssemblyOverlay() {
  if (state.overlayAssembliesLoaded) return;
  if (state.overlayAssembliesLoading) return state.overlayAssembliesLoading;
  state.overlayAssembliesLoading = (async () => {
    setOverlayStatus("Loading smart assemblies...");
    try {
      const assemblies = await fetchAssemblyOverlay();
      state.overlayAssemblies = assemblies;
      state.overlayPlayerBases = derivePlayerBases(assemblies);
      if (assemblies.length) {
        setOverlayStatus(`${assemblies.length} assemblies loaded, ${state.overlayPlayerBases.length} potential bases`);
      } else {
        setOverlayStatus("No assembly data found");
      }
    } catch (err) {
      state.overlayAssemblies = [];
      state.overlayPlayerBases = [];
      setOverlayStatus("Assembly data unavailable");
    } finally {
      state.overlayAssembliesLoaded = true;
      state.overlayAssembliesLoading = null;
      updateOfflinePanel();
      updateHubPanel();
      draw();
    }
  })();
  return state.overlayAssembliesLoading;
}

// ── Overlay: Player Bases ──────────────────────────────────────────────────

function derivePlayerBases(assemblies) {
  const bySystem = new Map();
  for (const asm of assemblies) {
    if (!bySystem.has(asm.systemId)) bySystem.set(asm.systemId, []);
    bySystem.get(asm.systemId).push(asm);
  }
  const bases = [];
  for (const [systemId, list] of bySystem) {
    // Criteria A: 4+ smart assemblies in the same system
    const qualifyByCount = list.length >= 4;
    // Criteria B: any NetworkNode with 4+ connected assemblies
    const maxConnected = Math.max(0, ...list.map((a) => a.connectedCount || 0));
    const qualifyByNode = maxConnected >= 4;
    if (qualifyByCount || qualifyByNode) {
      bases.push({
        systemId,
        assemblyCount: list.length,
        onlineCount: list.filter((a) => a.online).length,
        maxConnected,
        types: [...new Set(list.map((a) => a.label))],
      });
    }
  }
  return bases;
}

function drawPlayerBaseOverlay() {
  if (!state.overlayPlayerBases.length) return;
  ctx.save();
  for (const base of state.overlayPlayerBases) {
    const system = state.systemsById.get(base.systemId);
    if (!system) continue;
    const p = project(system);
    const rect = cachedRect || els.canvas.getBoundingClientRect();
    if (p.x < -30 || p.y < -30 || p.x > rect.width + 30 || p.y > rect.height + 30) continue;
    const r = 10 + Math.min(6, base.assemblyCount);
    const active = base.onlineCount > 0;
    // Outer ring
    ctx.strokeStyle = active ? "rgba(241, 184, 75, 0.80)" : "rgba(241, 184, 75, 0.25)";
    ctx.lineWidth = active ? 2 : 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    // Inner fill
    ctx.setLineDash([]);
    if (active) {
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grd.addColorStop(0, "rgba(241, 184, 75, 0.18)");
      grd.addColorStop(1, "rgba(241, 184, 75, 0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Base label at higher zoom
    if (state.camera.zoom > 1.2) {
      ctx.fillStyle = active ? "rgba(241, 184, 75, 0.90)" : "rgba(241, 184, 75, 0.40)";
      ctx.font = "bold 8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const label = base.maxConnected >= 4
        ? `node+${base.maxConnected}`
        : `${base.assemblyCount} asm`;
      ctx.fillText(label, p.x, p.y + r + 3);
    }
  }
  ctx.restore();
}

// ── System name labels ─────────────────────────────────────────────────────

function drawSystemLabels() {
  const z = state.camera.zoom;
  if (z < 2.2) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  // At moderate zoom show only bright (rare) stars; at high zoom show medium too; at very high show all
  const maxTierShown = z >= 5 ? 2 : z >= 3.5 ? 1 : 0;
  const fontSize = Math.max(7, Math.min(10, z * 2.8));
  ctx.save();
  ctx.font = `${fontSize}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (const system of state.systems) {
    const p = project(system);
    if (p.x < -80 || p.y < -80 || p.x > rect.width + 80 || p.y > rect.height + 80) continue;
    const tier = (system.id * 2654435761) >>> 0;
    const tierNum = (tier % 100) < 3 ? 0 : (tier % 100) < 18 ? 1 : 2;
    if (tierNum > maxTierShown) continue;
    const yOff = tierNum === 0 ? 8 : tierNum === 1 ? 5 : 4;
    // Shadow for readability
    ctx.fillStyle = "rgba(2,8,12,0.75)";
    ctx.fillText(system.name, p.x + 0.5, p.y - yOff - 0.5);
    ctx.fillStyle = "rgba(200,220,240,0.70)";
    ctx.fillText(system.name, p.x, p.y - yOff - 1);
  }
  ctx.restore();
}

// ── Hover tooltip ─────────────────────────────────────────────────────────

function drawHoverTooltip() {
  if (!state.hovered) return;
  const system = state.hovered;
  const p = project(system);
  const rect = cachedRect || els.canvas.getBoundingClientRect();

  const lines = [];
  lines.push({ text: system.name, color: "rgba(255,255,255,0.95)", bold: true });
  lines.push({ text: `Region ${system.regionId}`, color: "rgba(255,255,255,0.42)", bold: false });

  if (state.overlayKillsLoaded && state.showKills) {
    const { start: ks, end: ke } = killWindowBounds();
    const inWindow = state.overlayKills.filter((k) => k.systemId === system.id && k.timestamp >= ks && k.timestamp <= ke);
    const n = inWindow.length;
    if (n > 0) {
      const shipN = inWindow.filter(isShipKill).length;
      const structN = n - shipN;
      const winLabel = state.killTimeOffset > 0
        ? `${state.killTimeOffset}h–${state.killTimeOffset + state.overlayKillsTimeWindow}h ago`
        : `/${state.overlayKillsTimeWindow}h`;
      const label = structN > 0 && !state.showKillShipsOnly
        ? `${n} kill${n > 1 ? "s" : ""} (${shipN}⚔ ${structN}🏗) ${winLabel}`
        : `${n} kill${n > 1 ? "s" : ""} ${winLabel}`;
      lines.push({ text: label, color: "rgba(255,100,100,0.95)", bold: true });
      // Danger score
      const score = computeDangerScore(system.id);
      if (score >= 10) {
        const scoreColor = score >= 70 ? "rgba(255,60,60,0.95)" : score >= 40 ? "rgba(255,140,40,0.95)" : "rgba(255,200,60,0.85)";
        lines.push({ text: `Danger ${score}/100`, color: scoreColor, bold: false });
      }
      // Contested indicator
      if (state.showContested) {
        const hours = countContestHours(system.id);
        if (hours >= 3) lines.push({ text: `Contested · ${hours}h active`, color: "rgba(0,220,255,0.90)", bold: false });
      }
    }
  }

  if (state.overlayAssembliesLoaded && (state.showAssemblies || state.showPlayerBases)) {
    const asms = state.overlayAssemblies.filter((a) => a.systemId === system.id);
    const visible = state.overlayAssembliesOnlineOnly ? asms.filter((a) => a.online) : asms;
    if (visible.length) {
      const online = visible.filter((a) => a.online).length;
      const label = state.overlayAssembliesOnlineOnly
        ? `${online} online assembl${online !== 1 ? "ies" : "y"}`
        : `${online}/${visible.length} assembl${visible.length !== 1 ? "ies" : "y"}`;
      lines.push({ text: label, color: "rgba(0,180,216,0.90)", bold: false });
    }
  }

  const base = state.overlayPlayerBases.find((b) => b.systemId === system.id);
  if (base && state.showPlayerBases) {
    lines.push({ text: `Player Base · ${base.assemblyCount} asm`, color: "rgba(241,184,75,0.95)", bold: true });
  }

  const pad = 9;
  const lh = 15;
  ctx.save();
  ctx.font = "10px ui-monospace, monospace";
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l.text).width));
  const W = maxW + pad * 2;
  const H = lines.length * lh + pad * 2 - 2;

  let tx = p.x + 14;
  let ty = p.y - H / 2;
  if (tx + W > rect.width - 10) tx = p.x - W - 14;
  if (ty < 10) ty = 10;
  if (ty + H > rect.height - 10) ty = rect.height - H - 10;

  ctx.fillStyle = "rgba(2, 8, 12, 0.92)";
  ctx.strokeStyle = "rgba(0, 180, 216, 0.30)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(tx, ty, W, H);
  ctx.fill();
  ctx.stroke();

  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  lines.forEach((line, i) => {
    ctx.font = line.bold ? "bold 10px ui-monospace, monospace" : "10px ui-monospace, monospace";
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, tx + pad, ty + pad + i * lh);
  });
  ctx.restore();
}

// ── Jump range circle ──────────────────────────────────────────────────────

function drawJumpRangeCircle() {
  const origin = parseSystem(els.origin.value);
  if (!origin) return;
  const range = Number(els.jumpRange.value || 120);
  const SEGS = 72;
  ctx.save();
  ctx.strokeStyle = "rgba(97, 213, 199, 0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  for (let i = 0; i <= SEGS; i++) {
    const a = (i / SEGS) * Math.PI * 2;
    const pt = { x: origin.x + Math.cos(a) * range, y: origin.y, z: origin.z + Math.sin(a) * range };
    const pp = project(pt);
    i === 0 ? ctx.moveTo(pp.x, pp.y) : ctx.lineTo(pp.x, pp.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ── Kill labels ────────────────────────────────────────────────────────────

function drawKillLabels() {
  const killsBySystem = buildKillSystemMap();
  if (!killsBySystem.size) return;
  const THRESHOLD = 3;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (const [systemId, kills] of killsBySystem) {
    if (kills.length < THRESHOLD) continue;
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -50 || p.y < -50 || p.x > rect.width + 50 || p.y > rect.height + 50) continue;
    const radius = Math.min(12, 4 + Math.log2(kills.length + 1) * 2);
    ctx.font = "bold 9px ui-monospace, monospace";
    // Shadow for readability
    ctx.fillStyle = "rgba(2,8,12,0.70)";
    ctx.fillText(system.name, p.x + 1, p.y - radius - 1);
    ctx.fillStyle = "rgba(255, 130, 130, 0.92)";
    ctx.fillText(system.name, p.x, p.y - radius - 2);
  }
  ctx.restore();
}

// ── New feature: Danger score ──────────────────────────────────────────────

function computeDangerScore(systemId) {
  if (!state.overlayKillsLoaded) return 0;
  const now = Date.now();
  const windowMs = state.overlayKillsTimeWindow * 3_600_000;
  const { start: ks, end: ke } = killWindowBounds();
  const kills = state.overlayKills.filter((k) => k.systemId === systemId && k.timestamp >= ks && k.timestamp <= ke);
  if (!kills.length) return 0;
  // Recency-weighted: kills closer to the end of the window score higher
  let weightedSum = 0;
  for (const k of kills) {
    const age = (ke - k.timestamp) / windowMs; // 0 = newest, 1 = oldest in window
    weightedSum += 1 - age * 0.7; // older kills count less
  }
  // Base score: up to 60 from kills
  const killScore = Math.min(60, weightedSum * 12);
  // Player base bonus: if there's a base here, raises stakes (+20)
  const baseBonus = state.overlayPlayerBases.some((b) => b.systemId === systemId) ? 20 : 0;
  // Volume bonus: extra points for high kill count (+20 max)
  const volumeBonus = Math.min(20, kills.length * 2);
  return Math.round(Math.min(100, killScore + baseBonus + volumeBonus));
}

// ── New feature: Contested systems ────────────────────────────────────────

function countContestHours(systemId) {
  const { start: ks, end: ke } = killWindowBounds();
  const hourBuckets = new Set();
  for (const k of state.overlayKills) {
    if (k.systemId !== systemId || k.timestamp < ks || k.timestamp > ke) continue;
    hourBuckets.add(Math.floor(k.timestamp / 3_600_000));
  }
  return hourBuckets.size;
}

function buildContestedMap(minHours = 3) {
  if (!state.overlayKillsLoaded) return new Map();
  const { start: ks, end: ke } = killWindowBounds();
  const systemHours = new Map(); // systemId → Set<hourBucket>
  for (const k of state.overlayKills) {
    if (k.timestamp < ks || k.timestamp > ke) continue;
    const hour = Math.floor(k.timestamp / 3_600_000);
    if (!systemHours.has(k.systemId)) systemHours.set(k.systemId, new Set());
    systemHours.get(k.systemId).add(hour);
  }
  const result = new Map();
  for (const [id, hours] of systemHours) {
    if (hours.size >= minHours) result.set(id, hours.size);
  }
  return result;
}

function drawContestedOverlay() {
  if (!state.showContested || !state.overlayKillsLoaded) return;
  const contested = buildContestedMap(3);
  if (!contested.size) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  ctx.save();
  const t = (Date.now() / 1800) % (Math.PI * 2); // slow pulse
  for (const [systemId, hourCount] of contested) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -30 || p.y < -30 || p.x > rect.width + 30 || p.y > rect.height + 30) continue;
    const r = 9 + Math.min(5, hourCount - 3);
    const pulse = 0.55 + Math.sin(t + systemId * 0.001) * 0.25;
    ctx.strokeStyle = `rgba(0, 225, 255, ${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (state.camera.zoom > 1.0 && hourCount >= 5) {
      ctx.fillStyle = `rgba(0, 220, 255, ${pulse * 0.8})`;
      ctx.font = "bold 8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${hourCount}h`, p.x, p.y + r + 2);
    }
  }
  ctx.restore();
}

function updateContestedPanel() {
  if (!els.contestedPanel || !els.contestedList) return;
  if (!state.showContested || !state.overlayKillsLoaded) {
    els.contestedPanel.style.display = "none";
    return;
  }
  const contested = buildContestedMap(3);
  if (!contested.size) {
    els.contestedPanel.style.display = "none";
    return;
  }
  els.contestedPanel.style.display = "";
  const sorted = [...contested.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const killMap = buildKillSystemMap();
  els.contestedList.innerHTML = sorted.map(([systemId, hours]) => {
    const sys = state.systemsById.get(systemId);
    const name = sys?.name ?? `#${systemId}`;
    const kills = killMap.get(systemId)?.length ?? 0;
    return `<li class="danger-item" data-system-id="${systemId}" style="cursor:pointer">
      <span class="danger-rank" style="color:rgba(0,220,255,0.9)">${hours}h</span>
      <span class="danger-name">${name}</span>
      <span class="danger-count" style="color:rgba(255,120,120,0.85)">${kills}⚠</span>
    </li>`;
  }).join("");
  els.contestedList.querySelectorAll("li[data-system-id]").forEach((li) => {
    li.addEventListener("click", () => {
      const sys = state.systemsById.get(Number(li.dataset.systemId));
      if (sys) { selectSystem(sys); centerOnSystem(sys); }
    });
  });
}

// ── New feature: Hot systems panel ────────────────────────────────────────

function updateHotPanel() {
  if (!els.hotPanel || !els.hotList) return;
  if (!state.showHotPanel || !state.overlayKillsLoaded) {
    els.hotPanel.style.display = "none";
    return;
  }
  const killMap = buildKillSystemMap();
  if (!killMap.size) {
    els.hotPanel.style.display = "none";
    return;
  }
  els.hotPanel.style.display = "";
  if (els.hotPanelWindowLabel) {
    const wLabel = state.killTimeOffset > 0
      ? `(${state.killTimeOffset}h–${state.killTimeOffset + state.overlayKillsTimeWindow}h ago)`
      : `(last ${state.overlayKillsTimeWindow}h)`;
    els.hotPanelWindowLabel.textContent = wLabel;
  }
  const sorted = [...killMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15);
  els.hotList.innerHTML = sorted.map(([systemId, kills], idx) => {
    const sys = state.systemsById.get(systemId);
    const name = sys?.name ?? `#${systemId}`;
    const score = computeDangerScore(systemId);
    const scoreColor = score >= 70 ? "#ff4444" : score >= 40 ? "#ff9040" : "#ffcc44";
    const shipN = kills.filter(isShipKill).length;
    const structN = kills.length - shipN;
    const detail = structN > 0 ? `${shipN}⚔ ${structN}🏗` : `${kills.length}⚠`;
    const trend = getKillTrend(systemId);
    const trendColor = trend === "↑" ? "rgba(255,80,80,0.9)" : trend === "↓" ? "rgba(80,200,120,0.85)" : "rgba(180,180,180,0.6)";
    return `<li class="danger-item" data-system-id="${systemId}" style="cursor:pointer">
      <span class="danger-rank">${idx + 1}</span>
      <span class="danger-name">${name}</span>
      <span class="danger-count">${detail}</span>
      <span style="color:${trendColor};font-size:10px;flex-shrink:0">${trend}</span>
      <span style="color:${scoreColor};font-size:9px;margin-left:2px">${score}</span>
    </li>`;
  }).join("");
  els.hotList.querySelectorAll("li[data-system-id]").forEach((li) => {
    li.addEventListener("click", () => {
      const sys = state.systemsById.get(Number(li.dataset.systemId));
      if (sys) { selectSystem(sys); centerOnSystem(sys); }
    });
  });
}

// ── New feature: Offline assemblies panel ─────────────────────────────────

function buildOfflineAssemblyMap() {
  const map = new Map(); // systemId → offline assembly list
  for (const asm of state.overlayAssemblies) {
    if (asm.online) continue;
    if (!map.has(asm.systemId)) map.set(asm.systemId, []);
    map.get(asm.systemId).push(asm);
  }
  return map;
}

function updateOfflinePanel() {
  if (!els.offlinePanel || !els.offlineList) return;
  if (!state.showOfflinePanel || !state.overlayAssembliesLoaded) {
    els.offlinePanel.style.display = "none";
    return;
  }
  const offlineMap = buildOfflineAssemblyMap();
  if (!offlineMap.size) {
    els.offlinePanel.style.display = "none";
    setOverlayStatus("No offline assemblies found");
    return;
  }
  els.offlinePanel.style.display = "";
  const sorted = [...offlineMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);
  els.offlineList.innerHTML = sorted.map(([systemId, asms]) => {
    const sys = state.systemsById.get(systemId);
    const name = sys?.name ?? `#${systemId}`;
    const typeLabel = [...new Set(asms.map((a) => a.label))].join(", ");
    return `<li class="danger-item offline-item" data-system-id="${systemId}" style="cursor:pointer">
      <span class="danger-rank" style="color:rgba(150,160,180,0.8)">${asms.length}</span>
      <span class="danger-name">${name}</span>
      <span class="danger-count" style="color:rgba(140,150,180,0.75);font-size:9px">${typeLabel}</span>
    </li>`;
  }).join("");
  els.offlineList.querySelectorAll("li[data-system-id]").forEach((li) => {
    li.addEventListener("click", () => {
      const sys = state.systemsById.get(Number(li.dataset.systemId));
      if (sys) { selectSystem(sys); centerOnSystem(sys); }
    });
  });
}

// ── Kill density heatmap ───────────────────────────────────────────────────

function drawKillHeatmap() {
  const killsBySystem = buildKillSystemMap();
  if (!killsBySystem.size) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const z = state.camera.zoom;
  const baseRadius = Math.max(25, 90 / z);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const [systemId, kills] of killsBySystem) {
    const visible = state.showKillShipsOnly ? kills.filter(isShipKill) : kills;
    if (!visible.length) continue;
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    const r = baseRadius * Math.min(2.2, 0.6 + Math.log2(visible.length + 1) * 0.45);
    if (p.x < -r || p.y < -r || p.x > rect.width + r || p.y > rect.height + r) continue;
    const intensity = Math.min(0.75, 0.12 + visible.length * 0.055);
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    grd.addColorStop(0,   `rgba(255, 90, 20, ${intensity})`);
    grd.addColorStop(0.45, `rgba(220, 60, 10, ${intensity * 0.55})`);
    grd.addColorStop(1,   `rgba(180, 30,  0, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// ── Assembly name labels ───────────────────────────────────────────────────

function drawAssemblyLabels() {
  if (!state.overlayAssemblies.length) return;
  const z = state.camera.zoom;
  if (z < 1.8) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();

  const bySystem = new Map();
  for (const asm of state.overlayAssemblies) {
    if (state.overlayAssembliesOnlineOnly && !asm.online) continue;
    if (!state.overlayAsmTypeFilter.has(asm.label)) continue;
    if (!bySystem.has(asm.systemId)) bySystem.set(asm.systemId, []);
    bySystem.get(asm.systemId).push(asm);
  }

  ctx.save();
  const fontSize = Math.max(7, Math.min(9, z * 2.8));
  ctx.font = `${fontSize}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (const [systemId, assemblies] of bySystem) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -80 || p.y < -80 || p.x > rect.width + 80 || p.y > rect.height + 80) continue;
    const radius = 5 + Math.min(4, Math.log2(assemblies.length + 1));
    const topY = p.y + radius + 4;
    const lineH = fontSize + 2;
    const toShow = assemblies.slice(0, 3);
    toShow.forEach((asm, i) => {
      const label = asm.name !== asm.label ? asm.name : asm.label;
      const hexColor = asm.online ? asm.color : "rgba(120,140,160,0.55)";
      ctx.fillStyle = "rgba(2,8,12,0.72)";
      ctx.fillText(label, p.x + 0.5, topY + i * lineH + 0.5);
      ctx.fillStyle = hexColor;
      ctx.fillText(label, p.x, topY + i * lineH);
    });
    if (assemblies.length > 3) {
      ctx.fillStyle = "rgba(140,160,180,0.55)";
      ctx.fillText(`+${assemblies.length - 3}`, p.x, topY + 3 * lineH);
    }
  }
  ctx.restore();
}

// ── Region kill stats ──────────────────────────────────────────────────────

function buildRegionKillStats() {
  const { start: ks, end: ke } = killWindowBounds();
  const stats = new Map(); // regionId → { kills, systems: Set }
  for (const kill of state.overlayKills) {
    if (kill.timestamp < ks || kill.timestamp > ke) continue;
    const system = state.systemsById.get(kill.systemId);
    if (!system) continue;
    if (!stats.has(system.regionId)) stats.set(system.regionId, { kills: 0, systems: new Set() });
    const entry = stats.get(system.regionId);
    entry.kills++;
    entry.systems.add(kill.systemId);
  }
  return stats;
}

function updateRegionStatsPanel() {
  if (!els.regionStatsPanel || !els.regionStatsList) return;
  if (!state.showRegionStats || !state.overlayKillsLoaded) {
    els.regionStatsPanel.style.display = "none";
    return;
  }
  const stats = buildRegionKillStats();
  if (!stats.size) {
    els.regionStatsPanel.style.display = "none";
    return;
  }
  els.regionStatsPanel.style.display = "";
  if (els.regionStatsPanelLabel) {
    const wLabel = state.killTimeOffset > 0
      ? `(${state.killTimeOffset}h–${state.killTimeOffset + state.overlayKillsTimeWindow}h ago)`
      : `(last ${state.overlayKillsTimeWindow}h)`;
    els.regionStatsPanelLabel.textContent = wLabel;
  }
  const sorted = [...stats.entries()].sort((a, b) => b[1].kills - a[1].kills).slice(0, 12);
  const maxKills = sorted[0]?.[1].kills || 1;
  els.regionStatsList.innerHTML = sorted.map(([regionId, data]) => {
    const barWidth = Math.round((data.kills / maxKills) * 50);
    return `<li class="danger-item region-stat-item" data-region-id="${regionId}" style="cursor:pointer">
      <span class="danger-rank" style="color:rgba(100,160,200,0.7);min-width:24px">R${regionId}</span>
      <span class="danger-name" style="display:flex;align-items:center;gap:4px">
        <span style="display:inline-block;height:4px;width:${barWidth}px;background:rgba(255,100,80,0.55);border-radius:2px;flex-shrink:0"></span>
      </span>
      <span class="danger-count" style="color:rgba(255,130,110,0.85)">${data.kills}⚠</span>
      <span style="color:rgba(100,140,170,0.65);font-size:9px;flex-shrink:0">${data.systems.size}sys</span>
    </li>`;
  }).join("");
  // Click to highlight systems in region
  els.regionStatsList.querySelectorAll("li[data-region-id]").forEach((li) => {
    li.addEventListener("click", () => {
      const regionId = Number(li.dataset.regionId);
      const regionSystems = state.systems.filter((s) => s.regionId === regionId);
      if (regionSystems.length) fitSystems(regionSystems);
    });
  });
}

// ── Kill trend helper ──────────────────────────────────────────────────────

function getKillTrend(systemId) {
  const { start: ks, end: ke } = killWindowBounds();
  const midpoint = (ks + ke) / 2;
  let older = 0, newer = 0;
  for (const k of state.overlayKills) {
    if (k.systemId !== systemId || k.timestamp < ks || k.timestamp > ke) continue;
    if (k.timestamp < midpoint) older++;
    else newer++;
  }
  if (newer > older * 1.5) return "↑";
  if (older > newer * 1.5) return "↓";
  return "→";
}

// ── v4: Jump Reachability Overlay ─────────────────────────────────────────

function computeReachability(origin, maxHops, jumpRange) {
  const visited = new Map(); // systemId → hop count
  if (!origin || !state.systems.length) return visited;
  if (!state.spatialIndexes.has(jumpRange)) {
    state.spatialIndexes.set(jumpRange, RouteCore.makeSpatialIndex(state.systems, jumpRange));
  }
  const index = state.spatialIndexes.get(jumpRange);
  visited.set(origin.id, 0);
  let frontier = [origin];
  for (let hop = 1; hop <= maxHops; hop++) {
    const nextFrontier = [];
    for (const sys of frontier) {
      const jumpNeighbors = RouteCore.nearbySystems(sys, index, jumpRange);
      const gateNeighbors = state.gateAdjacency.get(sys.id) || [];
      for (const edge of [...jumpNeighbors, ...gateNeighbors]) {
        const neighbor = edge.system;
        if (!visited.has(neighbor.id)) {
          visited.set(neighbor.id, hop);
          nextFrontier.push(neighbor);
        }
      }
    }
    frontier = nextFrontier;
    if (!frontier.length) break;
  }
  return visited;
}

function drawReachabilityOverlay() {
  const origin = parseSystem(els.origin.value);
  if (!origin) return;
  const range = Number(els.jumpRange.value || 120);
  const reachable = computeReachability(origin, state.reachabilityMaxHops, range);
  if (reachable.size <= 1) return;

  const rect = cachedRect || els.canvas.getBoundingClientRect();
  ctx.save();

  // Hop colors: 1=teal-green, 2=cyan, 3=indigo
  const hopPalette = [
    null,
    { fill: "rgba(68, 255, 160, 0.18)", ring: "rgba(68, 255, 160, 0.55)" },
    { fill: "rgba(0, 200, 255, 0.12)", ring: "rgba(0, 200, 255, 0.38)" },
    { fill: "rgba(140, 100, 255, 0.08)", ring: "rgba(140, 100, 255, 0.28)" },
  ];

  for (const [systemId, hopCount] of reachable) {
    if (hopCount === 0) continue;
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -20 || p.y < -20 || p.x > rect.width + 20 || p.y > rect.height + 20) continue;
    const pal = hopPalette[hopCount];
    if (!pal) continue;
    const r = Math.max(3, 5 - hopCount);
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.8);
    grd.addColorStop(0, pal.ring);
    grd.addColorStop(0.5, pal.fill);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Draw the origin pulse ring
  const op = project(origin);
  ctx.strokeStyle = "rgba(68, 255, 160, 0.70)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(op.x, op.y, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

// ── v4: Corporation Territory Overlay ─────────────────────────────────────

function ownerDisplayColor(addr, alpha = 0.22) {
  // Deterministic hue from address hash
  let h = 0;
  for (let i = 2; i < addr.length; i += 4) h = ((h * 31) ^ addr.charCodeAt(i)) >>> 0;
  return `hsla(${h % 360}, 65%, 58%, ${alpha})`;
}

function buildTerritoryMap() {
  const bySystem = new Map(); // systemId → Map<ownerId, count>
  for (const asm of state.overlayAssemblies) {
    if (!asm.ownerId) continue;
    if (!bySystem.has(asm.systemId)) bySystem.set(asm.systemId, new Map());
    const om = bySystem.get(asm.systemId);
    om.set(asm.ownerId, (om.get(asm.ownerId) || 0) + 1);
  }
  const result = new Map();
  for (const [systemId, om] of bySystem) {
    let top = null, topN = 0;
    for (const [owner, n] of om) { if (n > topN) { top = owner; topN = n; } }
    if (top) result.set(systemId, { owner: top, count: topN, total: [...om.values()].reduce((s, v) => s + v, 0) });
  }
  return result;
}

function drawTerritoryOverlay() {
  const territory = buildTerritoryMap();
  if (!territory.size) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  ctx.save();
  const z = state.camera.zoom;
  for (const [systemId, data] of territory) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -30 || p.y < -30 || p.x > rect.width + 30 || p.y > rect.height + 30) continue;
    const r = Math.max(6, 8 + Math.min(6, data.total));
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
    grd.addColorStop(0, ownerDisplayColor(data.owner, 0.38));
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2);
    ctx.fill();
    if (z > 1.4) {
      ctx.strokeStyle = ownerDisplayColor(data.owner, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── v4: Assembly Hub Panel ─────────────────────────────────────────────────

function updateHubPanel() {
  if (!els.hubPanel || !els.hubList) return;
  if (!state.showHubPanel || !state.overlayAssembliesLoaded) {
    els.hubPanel.style.display = "none";
    return;
  }
  // Group assemblies by system and count
  const bySystem = new Map();
  for (const asm of state.overlayAssemblies) {
    if (!bySystem.has(asm.systemId)) bySystem.set(asm.systemId, { total: 0, online: 0, types: new Set() });
    const entry = bySystem.get(asm.systemId);
    entry.total++;
    if (asm.online) entry.online++;
    entry.types.add(asm.label);
  }
  const sorted = [...bySystem.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 15);
  if (!sorted.length) {
    els.hubPanel.style.display = "none";
    return;
  }
  els.hubPanel.style.display = "";
  els.hubList.innerHTML = sorted.map(([systemId, data], idx) => {
    const sys = state.systemsById.get(systemId);
    const name = sys?.name ?? `#${systemId}`;
    const typeStr = [...data.types].slice(0, 2).map((t) => t.split(" ")[0]).join("+");
    const onlineColor = data.online > 0 ? "rgba(0,200,180,0.85)" : "rgba(140,150,170,0.6)";
    return `<li class="danger-item" data-system-id="${systemId}" style="cursor:pointer">
      <span class="danger-rank" style="color:rgba(150,200,255,0.7)">${idx + 1}</span>
      <span class="danger-name">${name}</span>
      <span class="danger-count" style="color:${onlineColor}">${data.online}/${data.total}</span>
      <span style="color:rgba(140,160,180,0.55);font-size:9px;flex-shrink:0">${typeStr}</span>
    </li>`;
  }).join("");
  els.hubList.querySelectorAll("li[data-system-id]").forEach((li) => {
    li.addEventListener("click", () => {
      const sys = state.systemsById.get(Number(li.dataset.systemId));
      if (sys) { selectSystem(sys); centerOnSystem(sys); }
    });
  });
}

// ── v5: Region color shading ──────────────────────────────────────────────

function drawRegionShading() {
  if (!state.systems.length) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const z = state.camera.zoom;

  // Collect visible positions per region
  const regionData = new Map();
  for (const system of state.systems) {
    const p = project(system);
    if (p.x < -300 || p.y < -300 || p.x > rect.width + 300 || p.y > rect.height + 300) continue;
    if (!regionData.has(system.regionId)) {
      regionData.set(system.regionId, { sumX: 0, sumY: 0, count: 0, minX: p.x, maxX: p.x, minY: p.y, maxY: p.y });
    }
    const d = regionData.get(system.regionId);
    d.sumX += p.x; d.sumY += p.y; d.count++;
    if (p.x < d.minX) d.minX = p.x; if (p.x > d.maxX) d.maxX = p.x;
    if (p.y < d.minY) d.minY = p.y; if (p.y > d.maxY) d.maxY = p.y;
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (const [regionId, d] of regionData) {
    if (d.count < 2) continue;
    const cx = d.sumX / d.count;
    const cy = d.sumY / d.count;
    const spread = Math.max(d.maxX - d.minX, d.maxY - d.minY);
    const r = Math.max(60, spread * 0.55);
    const hue = ((regionId * 2654435761) >>> 0) % 360;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0,   `hsla(${hue}, 55%, 30%, 0.09)`);
    grd.addColorStop(0.6, `hsla(${hue}, 45%, 25%, 0.04)`);
    grd.addColorStop(1,   `hsla(${hue}, 40%, 20%, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";

  // Region ID labels at medium zoom
  if (z > 0.35) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = Math.max(8, Math.min(13, z * 5));
    ctx.font = `bold ${fontSize}px ui-monospace, monospace`;
    for (const [regionId, d] of regionData) {
      if (d.count < 2) continue;
      const cx = d.sumX / d.count;
      const cy = d.sumY / d.count;
      if (cx < 0 || cy < 0 || cx > rect.width || cy > rect.height) continue;
      const hue = ((regionId * 2654435761) >>> 0) % 360;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillText(`R${regionId}`, cx + 0.5, cy + 0.5);
      ctx.fillStyle = `hsla(${hue}, 60%, 70%, 0.42)`;
      ctx.fillText(`R${regionId}`, cx, cy);
    }
  }

  ctx.restore();
}

// ── v5: Battle detection ───────────────────────────────────────────────────

function detectBattles() {
  if (!state.overlayKillsLoaded) return [];
  const { start: ks, end: ke } = killWindowBounds();
  const BATTLE_WINDOW_MS = 3_600_000; // 1 hour
  const MIN_KILLS = 3;

  const bySystem = new Map();
  for (const k of state.overlayKills) {
    if (k.timestamp < ks || k.timestamp > ke) continue;
    if (!bySystem.has(k.systemId)) bySystem.set(k.systemId, []);
    bySystem.get(k.systemId).push(k);
  }

  const battles = [];
  for (const [systemId, kills] of bySystem) {
    if (kills.length < MIN_KILLS) continue;
    const times = kills.map((k) => k.timestamp).sort((a, b) => a - b);
    let bestCount = 0, bestStart = 0;
    for (let i = 0; i < times.length; i++) {
      let count = 0;
      for (let j = i; j < times.length && times[j] <= times[i] + BATTLE_WINDOW_MS; j++) count++;
      if (count > bestCount) { bestCount = count; bestStart = times[i]; }
    }
    if (bestCount >= MIN_KILLS) {
      const shipKills = kills.filter(isShipKill).length;
      battles.push({ systemId, kills: bestCount, shipKills, start: bestStart, end: bestStart + BATTLE_WINDOW_MS });
    }
  }
  return battles.sort((a, b) => b.kills - a.kills);
}

function drawBattleOverlay() {
  const battles = detectBattles();
  if (!battles.length) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const z = state.camera.zoom;
  const t = Date.now() / 700;

  ctx.save();
  for (const battle of battles) {
    const system = state.systemsById.get(battle.systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -30 || p.y < -30 || p.x > rect.width + 30 || p.y > rect.height + 30) continue;

    const r = 12 + Math.min(8, battle.kills - 3);
    const pulse = 0.65 + Math.sin(t + battle.systemId * 0.001) * 0.28;

    // Gold glow
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.8);
    grd.addColorStop(0, `rgba(255, 200, 50, ${pulse * 0.28})`);
    grd.addColorStop(1, `rgba(255, 200, 50, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // 8-spike starburst
    ctx.strokeStyle = `rgba(255, 200, 50, ${pulse * 0.9})`;
    ctx.lineWidth = z > 1.0 ? 1.8 : 1.2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const len = i % 2 === 0 ? r : r * 0.6;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(angle) * len, p.y + Math.sin(angle) * len);
    }
    ctx.stroke();

    // Kill count badge
    if (z > 0.45) {
      const label = `⚔${battle.kills}`;
      const fontSize = Math.max(8, Math.min(11, r * 0.75));
      ctx.fillStyle = `rgba(255, 215, 70, ${pulse})`;
      ctx.font = `bold ${fontSize}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, p.x, p.y);
    }
  }
  ctx.restore();
}

function updateBattlesPanel() {
  if (!els.battlesPanel || !els.battlesList) return;
  if (!state.showBattles || !state.overlayKillsLoaded) {
    els.battlesPanel.style.display = "none";
    return;
  }
  const battles = detectBattles();
  if (!battles.length) {
    els.battlesPanel.style.display = "none";
    return;
  }
  els.battlesPanel.style.display = "";
  els.battlesList.innerHTML = battles.slice(0, 12).map((b, idx) => {
    const sys = state.systemsById.get(b.systemId);
    const name = sys?.name ?? `#${b.systemId}`;
    const ago = Math.round((Date.now() - b.start) / 60_000);
    const detail = b.shipKills < b.kills
      ? `${b.shipKills}⚔ ${b.kills - b.shipKills}🏗`
      : `${b.kills}⚔`;
    const agoLabel = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
    return `<li class="danger-item" data-system-id="${b.systemId}" style="cursor:pointer">
      <span class="danger-rank" style="color:rgba(255,200,50,0.9)">${idx + 1}</span>
      <span class="danger-name">${name}</span>
      <span class="danger-count" style="color:rgba(255,180,50,0.85)">${detail}</span>
      <span style="color:rgba(180,160,100,0.65);font-size:9px;flex-shrink:0">${agoLabel}</span>
    </li>`;
  }).join("");
  els.battlesList.querySelectorAll("li[data-system-id]").forEach((li) => {
    li.addEventListener("click", () => {
      const sys = state.systemsById.get(Number(li.dataset.systemId));
      if (sys) { selectSystem(sys); centerOnSystem(sys); }
    });
  });
}

// ── v5: Wallet / owner highlight ───────────────────────────────────────────

function drawWalletHighlight() {
  const addr = state.walletFilterAddress.trim().toLowerCase();
  if (!addr || !state.overlayAssemblies.length) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const t = Date.now() / 900;

  const bySystem = new Map();
  for (const asm of state.overlayAssemblies) {
    if (!asm.ownerId || asm.ownerId.toLowerCase() !== addr) continue;
    if (!bySystem.has(asm.systemId)) bySystem.set(asm.systemId, []);
    bySystem.get(asm.systemId).push(asm);
  }
  if (!bySystem.size) return;

  ctx.save();
  for (const [systemId, asms] of bySystem) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -30 || p.y < -30 || p.x > rect.width + 30 || p.y > rect.height + 30) continue;

    const r = 13 + Math.min(7, asms.length);
    const pulse = 0.62 + Math.sin(t + systemId * 0.001) * 0.28;

    // Outer glow
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
    grd.addColorStop(0, `rgba(100, 220, 255, ${pulse * 0.22})`);
    grd.addColorStop(1, `rgba(100, 220, 255, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Dashed ring
    ctx.strokeStyle = `rgba(100, 220, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Count badge
    if (state.camera.zoom > 0.8) {
      const onlineN = asms.filter((a) => a.online).length;
      ctx.fillStyle = `rgba(130, 230, 255, ${pulse})`;
      ctx.font = "bold 8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${onlineN}/${asms.length}`, p.x, p.y + r + 3);
    }
  }
  ctx.restore();
}

// ── v4: Kill activity timeline bar (used in system card) ──────────────────

function buildKillTimeline(systemId, buckets = 24) {
  const now = Date.now();
  const windowMs = buckets * 3_600_000;
  const counts = new Array(buckets).fill(0);
  for (const k of state.overlayKills) {
    if (k.systemId !== systemId) continue;
    const age = now - k.timestamp;
    if (age < 0 || age > windowMs) continue;
    const idx = Math.min(buckets - 1, Math.floor((age / windowMs) * buckets));
    counts[buckets - 1 - idx]++; // most recent = right
  }
  return counts;
}

function renderKillTimelineHtml(systemId) {
  const counts = buildKillTimeline(systemId);
  const max = Math.max(1, ...counts);
  const bars = counts.map((c) => {
    const h = Math.round((c / max) * 12);
    const alpha = c > 0 ? 0.4 + (c / max) * 0.55 : 0.12;
    return `<span class="ktl-bar" style="height:${Math.max(2, h)}px;background:rgba(255,80,80,${alpha.toFixed(2)})" title="${c} kills"></span>`;
  }).join("");
  return `<div class="kill-timeline" title="Kill activity (last 24h, right=recent)">${bars}</div>`;
}

// ── Overlay UI helpers ─────────────────────────────────────────────────────

function setOverlayStatus(text) {
  els.overlayStatus.textContent = text;
}

function updateOverlayLegend() {
  els.legendKill.style.display = state.showKills ? "" : "none";
  els.legendAssembly.style.display = state.showAssemblies ? "" : "none";
  els.legendBase.style.display = state.showPlayerBases ? "" : "none";
  const legendReach = document.getElementById("legendReach");
  const legendTerritory = document.getElementById("legendTerritory");
  if (legendReach) legendReach.style.display = state.showReachability ? "" : "none";
  if (legendTerritory) legendTerritory.style.display = state.showTerritory ? "" : "none";
}

function updateTimePresets() {
  els.timePresets.forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.hours) === state.overlayKillsTimeWindow);
  });
}

function updateKillOffsetLabel() {
  if (!els.killOffsetLabel) return;
  const off = state.killTimeOffset;
  if (off === 0) {
    els.killOffsetLabel.textContent = "now (live)";
  } else {
    els.killOffsetLabel.textContent = `${off}h–${off + state.overlayKillsTimeWindow}h ago`;
  }
}

async function toggleOverlay(name, enabled) {
  if (name === "kills") {
    state.showKills = enabled;
    els.killTimePanel.style.display = enabled ? "" : "none";
    if (els.timeOffsetRow) els.timeOffsetRow.style.display = enabled ? "" : "none";
    if (enabled) await ensureKillFeed();
    updateHotPanel();
    updateContestedPanel();
    updateRegionStatsPanel();
  } else if (name === "assemblies") {
    state.showAssemblies = enabled;
    if (els.walletFilterRow) els.walletFilterRow.style.display = enabled ? "" : "none";
    if (enabled) await ensureAssemblyOverlay();
    updateOfflinePanel();
  } else if (name === "playerBases") {
    state.showPlayerBases = enabled;
    if (enabled && !state.overlayAssembliesLoaded) await ensureAssemblyOverlay();
  }
  updateOverlayLegend();
  draw();
}

function bindOverlayEvents() {
  els.killsToggle.addEventListener("change", () => toggleOverlay("kills", els.killsToggle.checked));
  els.assembliesToggle.addEventListener("change", () => {
    const on = els.assembliesToggle.checked;
    if (els.asmTypePanel) els.asmTypePanel.style.display = on ? "" : "none";
    toggleOverlay("assemblies", on);
  });
  els.playerBasesToggle.addEventListener("change", () => toggleOverlay("playerBases", els.playerBasesToggle.checked));
  els.asmTypeChecks.forEach((cb) => {
    cb.addEventListener("change", () => {
      const type = cb.dataset.type;
      if (cb.checked) state.overlayAsmTypeFilter.add(type);
      else state.overlayAsmTypeFilter.delete(type);
      draw();
    });
  });
  els.timePresets.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.overlayKillsTimeWindow = Number(btn.dataset.hours);
      updateTimePresets();
      updateKillOffsetLabel();
      updateHotPanel();
      updateContestedPanel();
      updateRegionStatsPanel();
      updateBattlesPanel();
      draw();
    });
  });
  els.refreshOverlays.addEventListener("click", () => {
    state.overlayKillsLoaded = false;
    state.overlayKillsLoading = null;
    state.overlayAssembliesLoaded = false;
    state.overlayAssembliesLoading = null;
    state.overlayKills = [];
    state.overlayAssemblies = [];
    state.overlayPlayerBases = [];
    const reloadTasks = [];
    if (state.showKills) reloadTasks.push(ensureKillFeed());
    if (state.showAssemblies || state.showPlayerBases) reloadTasks.push(ensureAssemblyOverlay());
    if (!reloadTasks.length) setOverlayStatus("Enable an overlay to load data");
    Promise.all(reloadTasks).then(() => {
      updateRegionStatsPanel();
    });
  });

  // New feature bindings
  els.showHotPanelToggle?.addEventListener("change", () => {
    state.showHotPanel = els.showHotPanelToggle.checked;
    updateHotPanel();
  });

  els.showContestedToggle?.addEventListener("change", () => {
    state.showContested = els.showContestedToggle.checked;
    updateContestedPanel();
    scheduleDraw();
  });

  els.showOfflinePanelToggle?.addEventListener("change", () => {
    state.showOfflinePanel = els.showOfflinePanelToggle.checked;
    if (state.showOfflinePanel && !state.overlayAssembliesLoaded) {
      ensureAssemblyOverlay().then(() => updateOfflinePanel()).catch(() => {});
    } else {
      updateOfflinePanel();
    }
  });

  els.offlinePanelClose?.addEventListener("click", () => {
    state.showOfflinePanel = false;
    if (els.showOfflinePanelToggle) els.showOfflinePanelToggle.checked = false;
    updateOfflinePanel();
  });

  els.killTimeOffsetSlider?.addEventListener("input", () => {
    state.killTimeOffset = Number(els.killTimeOffsetSlider.value);
    updateKillOffsetLabel();
    updateHotPanel();
    updateContestedPanel();
    updateRegionStatsPanel();
    updateBattlesPanel();
    scheduleDraw();
  });

  els.showKillHeatmapToggle?.addEventListener("change", () => {
    state.showKillHeatmap = els.showKillHeatmapToggle.checked;
    scheduleDraw();
  });

  els.showAssemblyLabelsToggle?.addEventListener("change", () => {
    state.showAssemblyLabels = els.showAssemblyLabelsToggle.checked;
    scheduleDraw();
  });

  els.avoidContestedToggle?.addEventListener("change", async () => {
    state.avoidContested = els.avoidContestedToggle.checked;
    if (state.avoidContested && !state.overlayKillsLoaded) {
      await ensureKillFeed();
    }
    if (parseSystem(els.origin.value) && parseSystem(els.destination.value)) calculate();
  });

  els.showRegionStatsToggle?.addEventListener("change", () => {
    state.showRegionStats = els.showRegionStatsToggle.checked;
    if (state.showRegionStats && !state.overlayKillsLoaded) {
      ensureKillFeed().then(() => updateRegionStatsPanel()).catch(() => {});
    } else {
      updateRegionStatsPanel();
    }
  });

  // v4 bindings
  els.reachabilityToggle?.addEventListener("change", () => {
    state.showReachability = els.reachabilityToggle.checked;
    if (els.reachabilityPanel) els.reachabilityPanel.style.display = state.showReachability ? "" : "none";
    updateOverlayLegend();
    scheduleDraw();
  });

  els.reachabilityHopBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.reachabilityMaxHops = Number(btn.dataset.hops);
      els.reachabilityHopBtns.forEach((b) => b.classList.toggle("active", b === btn));
      scheduleDraw();
    });
  });

  els.territoryToggle?.addEventListener("change", async () => {
    state.showTerritory = els.territoryToggle.checked;
    if (state.showTerritory && !state.overlayAssembliesLoaded) {
      await ensureAssemblyOverlay();
    }
    updateOverlayLegend();
    scheduleDraw();
  });

  els.hubPanelToggle?.addEventListener("change", async () => {
    state.showHubPanel = els.hubPanelToggle.checked;
    if (state.showHubPanel && !state.overlayAssembliesLoaded) {
      await ensureAssemblyOverlay();
    }
    updateHubPanel();
  });

  // v5 bindings
  els.regionShadingToggle?.addEventListener("change", () => {
    state.showRegionShading = els.regionShadingToggle.checked;
    scheduleDraw();
  });

  els.battlesToggle?.addEventListener("change", () => {
    state.showBattles = els.battlesToggle.checked;
    if (state.showBattles && !state.overlayKillsLoaded) {
      ensureKillFeed().then(() => updateBattlesPanel()).catch(() => {});
    } else {
      updateBattlesPanel();
    }
    scheduleDraw();
  });

  els.walletFilterInput?.addEventListener("input", () => {
    state.walletFilterAddress = els.walletFilterInput.value.trim();
    scheduleDraw();
  });

  els.walletFilterClear?.addEventListener("click", () => {
    state.walletFilterAddress = "";
    if (els.walletFilterInput) els.walletFilterInput.value = "";
    scheduleDraw();
  });
}

async function init() {
  bindEvents();
  bindOverlayEvents();
  updateTimePresets();
  loadUrlParams();
  updateRangePresets();
  updateRouteActions();
  updateSystemActions();
  renderRouteState("Pick an origin and destination", "Use search or click stars on the map.", "", "Pick");
  resizeCanvas();
  try {
    const systems = await fetchAllSystems();
    indexSystems(systems);
    updateRouteActions();
    setStatus(`${systems.length.toLocaleString()} live systems loaded`);
  } catch (error) {
    indexSystems(fallbackSystems.map(normalizeSystem));
    updateRouteActions();
    setStatus("World API unavailable: using demo sector");
  }
  resolveRouteFieldsToNames();
  fitSystems(state.systems);
  // Load gate network eagerly so links appear on the map immediately
  ensureGateNetwork().catch(() => {});
  // Restore overlay data for any overlays enabled via URL params
  if (state.showKills) ensureKillFeed().catch(() => {});
  if (state.showAssemblies || state.showPlayerBases) ensureAssemblyOverlay().catch(() => {});
  if (els.origin.value && els.destination.value) calculate();
}

init();
