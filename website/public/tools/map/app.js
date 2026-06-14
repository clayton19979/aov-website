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
  showRegionColors: false,
  showGameGates: true,
  showSmartGateLinks: true,
  avoidKills: false,
  overlayAssembliesOnlineOnly: false,
  overlayAsmTypeFilter: new Set(["Smart Gate", "Network Node", "Storage Unit", "Assembly", "Turret"]),
  showJumpRange: false,
  showKillLabels: false,
  showKillShipsOnly: false,
  showKillTrend: true,
  killHeatmap: false,
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
  showKillTrendToggle: document.getElementById("showKillTrend"),
  killHeatmapToggle: document.getElementById("killHeatmap"),
  regionColorsToggle: document.getElementById("regionColorsToggle"),
  legendRegion: document.getElementById("legendRegion"),
  assemblyDetailList: document.getElementById("assemblyDetailList"),
  findSystemBtn: document.getElementById("findSystem"),
  findPanel: document.getElementById("findPanel"),
  findInput: document.getElementById("findInput"),
  findSuggestions: document.getElementById("findSuggestions"),
  customHours: document.getElementById("customHours"),
  applyCustomHours: document.getElementById("applyCustomHours"),
  dangerPanel: document.getElementById("dangerPanel"),
  dangerList: document.getElementById("dangerList"),
  dangerWindowLabel: document.getElementById("dangerWindowLabel"),
  assemblyStats: document.getElementById("assemblyStats"),
  assemblyStatsContent: document.getElementById("assemblyStatsContent"),
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
  if (els.bookmarkSystemBtn) els.bookmarkSystemBtn.disabled = !hasSelection;
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

// ── Region color palette ─────────────────────────────────────────────────
// Deterministic hue from regionId using golden-angle distribution.
function regionHue(regionId) {
  return (regionId * 137.508) % 360;
}

function drawRegionColors() {
  if (!state.systems.length || !state.bounds) return;
  const z = state.camera.zoom;
  if (z < 0.25) return; // too zoomed out — too noisy
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const n = state.systems.length;
  const visibleStep = n > 10000 ? (z < 0.4 ? 5 : z < 0.7 ? 3 : z < 1.1 ? 2 : 1) : 1;
  const dotR = z > 1.5 ? 3.2 : z > 0.8 ? 2.0 : 1.2;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < n; i += visibleStep) {
    const system = state.systems[i];
    const p = project(system);
    if (p.x < -6 || p.y < -6 || p.x > rect.width + 6 || p.y > rect.height + 6) continue;
    const h = regionHue(system.regionId);
    ctx.fillStyle = `hsla(${h},80%,60%,0.28)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function constellationHue(constellationId) {
  return (constellationId * 83.7) % 360;
}

function drawConstellationColors() {
  if (!state.systems.length || !state.bounds) return;
  const z = state.camera.zoom;
  if (z < 0.25) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const n = state.systems.length;
  const visibleStep = n > 10000 ? (z < 0.4 ? 5 : z < 0.7 ? 3 : z < 1.1 ? 2 : 1) : 1;
  const dotR = z > 1.5 ? 3.2 : z > 0.8 ? 2.0 : 1.2;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < n; i += visibleStep) {
    const system = state.systems[i];
    const p = project(system);
    if (p.x < -6 || p.y < -6 || p.x > rect.width + 6 || p.y > rect.height + 6) continue;
    const h = constellationHue(system.constellationId);
    ctx.fillStyle = `hsla(${h},85%,65%,0.30)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
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

  // ── Region / constellation color dots ───────────────
  if (state.showRegionColors) drawRegionColors();
  if (state.showConstellationColors) drawConstellationColors();

  // ── Gate links ───────────────────────────────────────
  drawGateLinks();
  if (state.showJumpRange) drawJumpRangeCircle();
  if (state.showKills && state.showKillHeatmap) drawKillHeatmap();
  if (state.showKills) drawKillOverlay();
  if (state.showKills && state.showContested && state.overlayKillsLoaded) drawContestedOverlay();
  if (state.showKills && state.showKillLabels) drawKillLabels();
  if (state.showAssemblies) drawAssemblyOverlay();
  if (state.showAssemblies && state.showAssemblyLabels) drawAssemblyLabels();
  if (state.showPlayerBases) drawPlayerBaseOverlay();
  if (state.showCoverageRadius && state.showPlayerBases) drawCoverageRadiusOverlay();
  if (state.showTerritoryOwnership && state.overlayAssembliesLoaded) drawTerritoryOverlay();
  if (state.showSmartGateHubs) drawSmartGateHubOverlay();
  if (state.showKills && state.showKillFlash && state.overlayKillsLoaded) drawKillFlashOverlay();
  if (state.showSystemLabels) drawSystemLabels();
  if (state.showBookmarks && state.bookmarks.length) drawBookmarks();
  drawSystemNoteMarkers();
  drawRoute();

  if (state.selected) drawSystemMarker(state.selected, "#61d5c7", 7);
  if (state.hovered && state.hovered !== state.selected) drawSystemMarker(state.hovered, "#f1b84b", 5);
  if (state.hovered) drawHoverTooltip();

  if (state.showMinimap) drawMinimap(rect);
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

  // Kill warning triangle markers on hot route waypoints
  if (state.showKills && state.overlayKillsLoaded) {
    const cutoff = Date.now() - state.overlayKillsTimeWindow * 3_600_000;
    for (const system of state.route) {
      let count = 0;
      for (const k of state.overlayKills) {
        if (k.systemId !== system.id || k.timestamp < cutoff) continue;
        if (state.showKillShipsOnly && !isShipKill(k)) continue;
        count++;
      }
      if (count < 1) continue;
      const p = project(system);
      const ts = Math.min(6, 3 + Math.log2(count + 1) * 1.4);
      const killRgb = count >= 6 ? "255,48,48" : count >= 3 ? "255,130,32" : "255,204,40";
      ctx.fillStyle = `rgba(${killRgb},0.88)`;
      ctx.strokeStyle = `rgba(${killRgb},0.50)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - ts - 8);
      ctx.lineTo(p.x + ts, p.y - 3);
      ctx.lineTo(p.x - ts, p.y - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (ts >= 4 && state.camera.zoom > 0.5) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = `bold ${Math.max(6, Math.round(ts))}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", p.x, p.y - ts / 2 - 8);
      }
    }
  }

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

  let assemblyDetailHtml = "";
  if (state.overlayAssembliesLoaded) {
    const asms = state.overlayAssemblies.filter((a) => a.systemId === system.id);
    if (asms.length) {
      const online = asms.filter((a) => a.online).length;
      stats.push(`<span class="sys-stat sys-stat--assembly">${online}/${asms.length} assembl${asms.length > 1 ? "ies" : "y"}</span>`);
      const shown = asms.slice(0, 6);
      assemblyDetailHtml = shown.map((a) =>
        `<div class="asm-detail-item${a.online ? " asm-detail-online" : ""}">
          <span class="asm-detail-dot" style="background:${escapeHtml(a.color)}"></span>
          <span class="asm-detail-name">${escapeHtml(a.name)}</span>
          <span class="asm-detail-status">${a.online ? "ONLINE" : "OFFLINE"}</span>
        </div>`
      ).join("") + (asms.length > 6 ? `<div class="asm-detail-more">+${asms.length - 6} more</div>` : "");
    }
  }

  const base = state.overlayPlayerBases.find((b) => b.systemId === system.id);
  if (base) stats.push(`<span class="sys-stat sys-stat--base">Player Base · ${base.assemblyCount} asm</span>`);

  const note = state.systemNotes[system.id];
  if (note) stats.push(`<span class="sys-stat sys-stat--note" title="${escapeHtml(note)}">📝 Note</span>`);

  const statsHtml = stats.length ? `<div class="sys-stats">${stats.join("")}</div>` : "";
  const sparkline = killSparklineStr(system.id);
  const sparklineHtml = sparkline
    ? `<div class="sys-sparkline"><span class="sys-sparkline-label">Activity (old→new)</span><span class="sys-sparkline-bars">${escapeHtml(sparkline)}</span></div>`
    : "";
  els.card.querySelector("div:first-child").innerHTML = `<span>Region ${system.regionId} - Constellation ${system.constellationId}</span><strong>${safeName}</strong><span>${system.x.toFixed(1)}, ${system.y.toFixed(1)}, ${system.z.toFixed(1)} LY</span>${statsHtml}${sparklineHtml}`;

  if (els.assemblyDetailList) {
    if (assemblyDetailHtml) {
      els.assemblyDetailList.innerHTML = assemblyDetailHtml;
      els.assemblyDetailList.style.display = "";
    } else {
      els.assemblyDetailList.style.display = "none";
    }
  }

  updateSystemActions();
  updateBookmarkButton(system);
  updateSelectedRouteStep();
  updateDangerNeighborsPanel(system);
  updateNearbyBasesPanel(system);
  if (els.copySystemIdBtn) els.copySystemIdBtn.disabled = false;
  updateSystemNotePanel(system);
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
  if (!state.showKillTrend) params.set("ov_kt", "0");
  if (state.showAssemblies) params.set("ov_a", "1");
  if (state.overlayAssembliesOnlineOnly) params.set("ov_ao", "1");
  if (state.showPlayerBases) params.set("ov_b", "1");
  if (state.killHeatmap) params.set("ov_km", "1");
  if (state.showRegionColors) params.set("ov_rc", "1");
  if (state.showConstellationColors) params.set("ov_cc", "1");
  if (state.showDangerRadius) params.set("ov_dr", "1");
  if (state.showConstellationKills) params.set("ov_ck", "1");
  if (state.showSmartGateHubs) params.set("ov_sh", "1");
  if (state.killMinCount > 1) params.set("ov_kmin", String(state.killMinCount));
  if (state.killPlayerFilter) params.set("ov_kpf", state.killPlayerFilter);
  if (state.showRecentKills) params.set("ov_rk", "1");
  if (state.showRegionKills) params.set("ov_rgk", "1");
  if (state.showKillEscalating) params.set("ov_ke", "1");
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
  if (params.get("ov_kt") === "0") {
    els.showKillTrendToggle && (els.showKillTrendToggle.checked = false);
    state.showKillTrend = false;
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
  if (params.get("ov_km") === "1") {
    state.killHeatmap = true;
    els.killHeatmapToggle && (els.killHeatmapToggle.checked = true);
  }
  if (params.get("ov_rc") === "1") {
    state.showRegionColors = true;
    els.regionColorsToggle && (els.regionColorsToggle.checked = true);
  }
  if (params.get("ov_cc") === "1") {
    state.showConstellationColors = true;
    els.constellationColorsToggle && (els.constellationColorsToggle.checked = true);
  }
  if (params.get("ov_dr") === "1") {
    state.showDangerRadius = true;
    els.showDangerRadiusToggle && (els.showDangerRadiusToggle.checked = true);
  }
  if (params.get("ov_ck") === "1") {
    state.showConstellationKills = true;
    els.constellationKillsToggle && (els.constellationKillsToggle.checked = true);
  }
  if (params.get("ov_sh") === "1") {
    state.showSmartGateHubs = true;
    els.smartGateHubsToggle && (els.smartGateHubsToggle.checked = true);
    updateHubPanel();
  }
  if (params.has("ov_kmin")) {
    const min = Number(params.get("ov_kmin"));
    if (min >= 1 && min <= 999) {
      state.killMinCount = min;
      els.killMinCountInput && (els.killMinCountInput.value = String(min));
    }
  }
  if (params.has("ov_kpf")) {
    state.killPlayerFilter = params.get("ov_kpf");
    els.killPlayerFilterInput && (els.killPlayerFilterInput.value = state.killPlayerFilter);
  }
  if (params.get("ov_rk") === "1") {
    state.showRecentKills = true;
    els.showRecentKillsToggle && (els.showRecentKillsToggle.checked = true);
  }
  if (params.get("ov_rgk") === "1") {
    state.showRegionKills = true;
    els.showRegionKillsToggle && (els.showRegionKillsToggle.checked = true);
  }
  if (params.get("ov_ke") === "1") {
    state.showKillEscalating = true;
    els.showKillEscalatingToggle && (els.showKillEscalatingToggle.checked = true);
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
  // Find system panel search
  if (els.findInput && els.findSuggestions) {
    setupSystemSearch(els.findInput, els.findSuggestions);
    els.findInput.addEventListener("change", () => {
      const system = parseSystem(els.findInput.value);
      if (system) { centerOnSystem(system); selectSystem(system); closeFindPanel(); }
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.findPanelOpen) closeFindPanel();
    if ((e.key === "/" || e.key === "f") && !e.ctrlKey && !e.metaKey && !e.target.matches("input, textarea")) {
      e.preventDefault();
      state.findPanelOpen ? closeFindPanel() : openFindPanel();
    }
  });
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
  els.jumpRange.addEventListener("input", () => { updateRangePresets(); if (state.showJumpRange || state.showReachableHighlight) scheduleDraw(); });
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
    updateAssemblyStats();
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
  els.bookmarkSystemBtn?.addEventListener("click", () => toggleBookmark(state.selected));
  els.copySystemIdBtn?.addEventListener("click", async () => {
    if (!state.selected) return;
    const text = `${state.selected.name} (${state.selected.id})`;
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
    const btn = els.copySystemIdBtn;
    const orig = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = orig; }, 1200);
  });
  els.showBookmarksToggle?.addEventListener("change", () => {
    state.showBookmarks = els.showBookmarksToggle.checked;
    updateOverlayLegend();
    scheduleDraw();
  });
  els.clearBookmarks?.addEventListener("click", () => {
    state.bookmarks = [];
    saveBookmarks();
    renderBookmarksPanel();
    updateOverlayLegend();
    if (state.selected) updateBookmarkButton(state.selected);
    scheduleDraw();
  });

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
  // Apply minimum kills filter
  const minKills = state.killMinCount || 1;
  if (minKills > 1) {
    for (const [id, kills] of map) {
      if (kills.length < minKills) map.delete(id);
    }
  }
  return map;
}

function buildKillTrendMap() {
  const now = Date.now();
  const windowMs = state.overlayKillsTimeWindow * 3_600_000;
  const midpoint = now - windowMs / 2;
  const trends = new Map();
  for (const kill of state.overlayKills) {
    if (kill.timestamp < now - windowMs) continue;
    if (!trends.has(kill.systemId)) trends.set(kill.systemId, { recent: 0, older: 0 });
    const t = trends.get(kill.systemId);
    if (kill.timestamp >= midpoint) t.recent++;
    else t.older++;
  }
  return trends;
}

function updateDangerPanel() {
  if (!state.showKills || !state.overlayKillsLoaded) {
    els.dangerPanel.style.display = "none";
    return;
  }
  els.dangerPanel.style.display = "";
  const w = state.overlayKillsTimeWindow;
  els.dangerWindowLabel.textContent = w < 1 ? `/ ${Math.round(w * 60)}m` : w >= 24 ? `/ ${Math.round(w / 24)}d` : `/ ${w}h`;

  const killsBySystem = buildKillSystemMap();
  const trendMap = buildKillTrendMap();
  const sorted = [...killsBySystem.entries()]
    .filter(([id]) => state.systemsById.has(id))
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  if (!sorted.length) {
    els.dangerList.innerHTML = '<li class="danger-empty">No kills in this time window</li>';
    return;
  }

  els.dangerList.innerHTML = sorted.map(([systemId, kills], idx) => {
    const system = state.systemsById.get(systemId);
    const name = escapeHtml(system.name);
    const count = kills.length;
    const shipN = kills.filter(isShipKill).length;
    const structN = count - shipN;
    const trend = trendMap.get(systemId);
    let trendHtml = "";
    if (trend) {
      if (trend.recent > trend.older + 1) trendHtml = `<span class="danger-trend danger-trend--up">↑</span>`;
      else if (trend.older > trend.recent + 1) trendHtml = `<span class="danger-trend danger-trend--down">↓</span>`;
    }
    const typeHtml = structN > 0
      ? `<span class="danger-type-split"><span class="danger-ship">${shipN}⚔</span><span class="danger-struct">${structN}▪</span></span>`
      : "";
    return `<li class="danger-item" data-system-id="${systemId}">
      <span class="danger-rank">${idx + 1}</span>
      <span class="danger-name">${name}${typeHtml}</span>
      <span class="danger-count">${count}${trendHtml}</span>
    </li>`;
  }).join("");

  els.dangerList.querySelectorAll(".danger-item").forEach((li) => {
    li.addEventListener("click", () => {
      const system = state.systemsById.get(Number(li.dataset.systemId));
      if (system) { selectSystem(system); centerOnSystem(system); }
    });
  });
  updateRecentKillsPanel();
  updateRegionKillPanel();
  updateEscalatingPanel();
  updateKillHourlyPanel();
}

function updateRecentKillsPanel() {
  if (!els.recentKillsPanel || !els.recentKillsList) return;
  if (!state.showKills || !state.overlayKillsLoaded || !state.showRecentKills) {
    els.recentKillsPanel.style.display = "none";
    return;
  }
  els.recentKillsPanel.style.display = "";
  const cutoff = Date.now() - state.overlayKillsTimeWindow * 3_600_000;
  const filtered = state.overlayKills
    .filter((k) => k.timestamp >= cutoff && killPassesPlayerFilter(k))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  if (els.recentKillsCount) {
    els.recentKillsCount.textContent = `(${filtered.length} shown)`;
  }
  if (!filtered.length) {
    els.recentKillsList.innerHTML = '<li class="danger-empty">No kills in this time window</li>';
    return;
  }
  const now = Date.now();
  els.recentKillsList.innerHTML = filtered.map((kill) => {
    const system = state.systemsById.get(kill.systemId);
    const systemName = system ? escapeHtml(system.name) : `#${kill.systemId}`;
    const minsAgo = Math.round((now - kill.timestamp) / 60000);
    const timeStr = minsAgo < 60
      ? `${minsAgo}m ago`
      : `${Math.round(minsAgo / 60)}h ago`;
    const isShip = isShipKill(kill);
    const typeIcon = isShip ? "⚔" : "▪";
    const typeColor = isShip ? "rgba(255,100,100,0.9)" : "rgba(160,100,255,0.9)";
    const kidShort = kill.killerId ? kill.killerId.slice(0, 8) + "…" : "?";
    return `<li class="recent-kill-item" data-system-id="${kill.systemId}">
      <span class="recent-kill-type" style="color:${typeColor}">${typeIcon}</span>
      <span class="recent-kill-system">${systemName}</span>
      <span class="recent-kill-meta">
        <span class="recent-kill-killer" title="${escapeHtml(kill.killerId ?? "")}">${escapeHtml(kidShort)}</span>
        <span class="recent-kill-time">${timeStr}</span>
      </span>
    </li>`;
  }).join("");

  els.recentKillsList.querySelectorAll(".recent-kill-item").forEach((li) => {
    li.addEventListener("click", () => {
      const system = state.systemsById.get(Number(li.dataset.systemId));
      if (system) { selectSystem(system); centerOnSystem(system); }
    });
  });
}

function updateRegionKillPanel() {
  if (!els.regionKillPanel || !els.regionKillList) return;
  if (!state.showKills || !state.overlayKillsLoaded || !state.showRegionKills) {
    els.regionKillPanel.style.display = "none";
    return;
  }
  els.regionKillPanel.style.display = "";
  const w = state.overlayKillsTimeWindow;
  if (els.regionKillWindowLabel) {
    els.regionKillWindowLabel.textContent = w < 1 ? `/ ${Math.round(w * 60)}m` : w >= 24 ? `/ ${Math.round(w / 24)}d` : `/ ${w}h`;
  }
  const cutoff = Date.now() - w * 3_600_000;
  const byRegion = new Map();
  for (const kill of state.overlayKills) {
    if (kill.timestamp < cutoff) continue;
    if (!killPassesPlayerFilter(kill)) continue;
    const system = state.systemsById.get(kill.systemId);
    if (!system) continue;
    const rid = system.regionId;
    if (!byRegion.has(rid)) byRegion.set(rid, { ships: 0, structs: 0, systems: new Set() });
    const r = byRegion.get(rid);
    if (isShipKill(kill)) r.ships++; else r.structs++;
    r.systems.add(kill.systemId);
  }
  const sorted = [...byRegion.entries()].sort((a, b) => (b[1].ships + b[1].structs) - (a[1].ships + a[1].structs)).slice(0, 10);
  if (!sorted.length) {
    els.regionKillList.innerHTML = '<li class="danger-empty">No kills in this time window</li>';
    return;
  }
  els.regionKillList.innerHTML = sorted.map(([rid, stats], idx) => {
    const total = stats.ships + stats.structs;
    const sysCount = stats.systems.size;
    const typeHtml = stats.structs > 0
      ? `<span class="danger-type-split"><span class="danger-ship">${stats.ships}⚔</span><span class="danger-struct">${stats.structs}▪</span></span>`
      : "";
    return `<li class="danger-item" data-region-id="${rid}">
      <span class="danger-rank">${idx + 1}</span>
      <span class="danger-name">R${rid}${typeHtml}<span class="region-sys-count"> · ${sysCount} sys</span></span>
      <span class="danger-count">${total}</span>
    </li>`;
  }).join("");

  els.regionKillList.querySelectorAll(".danger-item").forEach((li) => {
    li.addEventListener("click", () => {
      const rid = Number(li.dataset.regionId);
      const regionSystems = state.systems.filter((s) => s.regionId === rid);
      if (regionSystems.length) fitSystems(regionSystems);
    });
  });
}

function updateAssemblyStats() {
  if (!state.overlayAssembliesLoaded || !state.showAssemblies || !state.overlayAssemblies.length) {
    els.assemblyStats.style.display = "none";
    return;
  }
  els.assemblyStats.style.display = "";

  const byType = new Map();
  for (const asm of state.overlayAssemblies) {
    if (!byType.has(asm.label)) byType.set(asm.label, { total: 0, online: 0, color: asm.color });
    const t = byType.get(asm.label);
    t.total++;
    if (asm.online) t.online++;
  }

  const systemsWithAsm = new Set(state.overlayAssemblies.map((a) => a.systemId)).size;
  const rows = [...byType.entries()].map(([label, stats]) =>
    `<div class="asm-stat-row">
      <span>${escapeHtml(label)}</span>
      <span><span style="color:${escapeHtml(stats.color)}">${stats.online}</span>/${stats.total}</span>
    </div>`
  ).join("");

  els.assemblyStatsContent.innerHTML = `
    <div class="asm-stat-header">Online / Total — ${systemsWithAsm} system${systemsWithAsm !== 1 ? "s" : ""}</div>
    ${rows}
  `;
}

function isShipKill(kill) {
  const t = String(kill.lossType ?? "").toLowerCase();
  // Heuristic: non-ship types include "turret", "assembly", "structure", "networknode", "storageunit"
  if (!t || t === "ship" || t === "capsule" || t === "shuttle") return true;
  if (t.includes("turret") || t.includes("assembly") || t.includes("structure")
      || t.includes("node") || t.includes("storage") || t.includes("gate")) return false;
  return true; // default to ship if type is unknown
}

// Returns a 10-character Unicode sparkline showing kill distribution across the
// selected time window, oldest (left) to newest (right). Returns "" if no data.
function killSparklineStr(systemId) {
  if (!state.overlayKillsLoaded) return "";
  const windowMs = state.overlayKillsTimeWindow * 3_600_000;
  const now = Date.now();
  const BUCKETS = 10;
  const buckets = new Array(BUCKETS).fill(0);
  for (const kill of state.overlayKills) {
    if (kill.systemId !== systemId) continue;
    const age = now - kill.timestamp;
    if (age < 0 || age > windowMs) continue;
    const idx = Math.min(BUCKETS - 1, Math.floor((age / windowMs) * BUCKETS));
    buckets[BUCKETS - 1 - idx]++;
  }
  if (!buckets.some((b) => b > 0)) return "";
  const maxB = Math.max(1, ...buckets);
  const chars = "▁▂▃▄▅▆▇█";
  return buckets.map((b) => (b === 0 ? "·" : chars[Math.min(7, Math.round((b / maxB) * 7))])).join("");
}

// Returns up to `limit` systems within the current jump range of `system`
// that have kills in the active time window, sorted by kill count desc.
function getDangerNeighbors(system, limit = 5) {
  if (!state.overlayKillsLoaded || !state.showKills || !state.overlayKills.length) return [];
  const range = Number(els.jumpRange.value || 120);
  const cutoff = Date.now() - state.overlayKillsTimeWindow * 3_600_000;
  const killMap = new Map();
  for (const kill of state.overlayKills) {
    if (kill.timestamp < cutoff) continue;
    if (state.showKillShipsOnly && !isShipKill(kill)) continue;
    killMap.set(kill.systemId, (killMap.get(kill.systemId) || 0) + 1);
  }
  if (!killMap.size) return [];
  const results = [];
  for (const [systemId, count] of killMap) {
    if (systemId === system.id) continue;
    const other = state.systemsById.get(systemId);
    if (!other) continue;
    const dist = RouteCore.distance(other, system);
    if (dist <= range) results.push({ system: other, count, dist });
  }
  return results.sort((a, b) => b.count - a.count || a.dist - b.dist).slice(0, limit);
}

// Renders the danger-neighbors panel in the system card.
function updateDangerNeighborsPanel(system) {
  if (!els.dangerNeighborsPanel) return;
  const neighbors = system ? getDangerNeighbors(system) : [];
  if (!neighbors.length) {
    els.dangerNeighborsPanel.style.display = "none";
    return;
  }
  const w = state.overlayKillsTimeWindow;
  const wLabel = w < 1 ? `${Math.round(w * 60)}m` : w >= 24 ? `${Math.round(w / 24)}d` : `${w}h`;
  els.dangerNeighborsPanel.style.display = "";
  els.dangerNeighborsPanel.innerHTML = `
    <div class="danger-neighbors-header">Hot within jump range <span class="danger-window-label">/ ${escapeHtml(wLabel)}</span></div>
    <ol class="danger-neighbors-list">
      ${neighbors.map(({ system: s, count, dist }) => `
        <li class="danger-neighbor-item" data-system-id="${s.id}">
          <span class="danger-neighbor-name">${escapeHtml(s.name)}</span>
          <span class="danger-neighbor-meta">
            <span class="danger-neighbor-count">${count}⚠</span>
            <span class="danger-neighbor-dist">${dist.toFixed(0)} LY</span>
          </span>
        </li>`).join("")}
    </ol>`;
  els.dangerNeighborsPanel.querySelectorAll(".danger-neighbor-item").forEach((li) => {
    li.addEventListener("click", () => {
      const s = state.systemsById.get(Number(li.dataset.systemId));
      if (s) { selectSystem(s); centerOnSystem(s); }
    });
  });
}

function getKillTrend(systemId) {
  if (!state.overlayKillsLoaded) return null;
  const windowMs = state.overlayKillsTimeWindow * 3_600_000;
  const now = Date.now();
  const cutoff = now - windowMs;
  const mid = now - windowMs / 2;
  const kills = state.overlayKills.filter((k) => k.systemId === systemId && k.timestamp >= cutoff);
  if (kills.length < 3) return null;
  const recent = kills.filter((k) => k.timestamp >= mid).length;
  const older = kills.filter((k) => k.timestamp < mid).length;
  if (recent >= older * 2 && recent >= 2) return "up";
  if (older >= recent * 2 && older >= 2) return "down";
  return null;
}

function drawKillOverlay() {
  const killsBySystem = buildKillSystemMap();
  if (!killsBySystem.size) return;
  const trendMap = state.showKillTrend && state.camera.zoom > 0.5 ? buildKillTrendMap() : null;
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

    // Trend arrow
    if (trendMap) {
      const trend = trendMap.get(systemId);
      if (trend) {
        const isRising = trend.recent > trend.older + 1;
        const isFalling = trend.older > trend.recent + 1;
        if (isRising || isFalling) {
          const ax = p.x + radius + 5;
          const ay = p.y;
          const as = 4;
          ctx.fillStyle = isRising ? "rgba(255, 140, 60, 0.92)" : "rgba(100, 220, 100, 0.85)";
          ctx.beginPath();
          if (isRising) {
            ctx.moveTo(ax, ay - as);
            ctx.lineTo(ax + as * 0.6, ay + as * 0.5);
            ctx.lineTo(ax - as * 0.6, ay + as * 0.5);
          } else {
            ctx.moveTo(ax, ay + as);
            ctx.lineTo(ax + as * 0.6, ay - as * 0.5);
            ctx.lineTo(ax - as * 0.6, ay - as * 0.5);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
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
      draw();
    }
  })();
  return state.overlayKillsLoading;
}


// ── Kill Heatmap ───────────────────────────────────────────────────────────

let _heatmapCanvas = null;

function drawKillHeatmap() {
  const killsBySystem = buildKillSystemMap();
  if (!killsBySystem.size) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const W = Math.floor(rect.width);
  const H = Math.floor(rect.height);

  if (!_heatmapCanvas || _heatmapCanvas.width !== W || _heatmapCanvas.height !== H) {
    _heatmapCanvas = document.createElement("canvas");
    _heatmapCanvas.width = W;
    _heatmapCanvas.height = H;
  }
  const oc = _heatmapCanvas.getContext("2d");
  oc.clearRect(0, 0, W, H);
  oc.globalCompositeOperation = "lighter";

  const now = Date.now();
  const windowMs = state.overlayKillsTimeWindow * 3_600_000;

  for (const [systemId, kills] of killsBySystem) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -120 || p.y < -120 || p.x > W + 120 || p.y > H + 120) continue;

    const visible = state.showKillShipsOnly ? kills.filter(isShipKill) : kills;
    if (!visible.length) continue;

    const count = visible.length;
    const mostRecent = Math.max(...visible.map((k) => k.timestamp));
    const freshness = 1 - Math.min(1, (now - mostRecent) / windowMs);
    const r = Math.min(100, 22 + count * 9 + freshness * 18);
    const alpha = Math.min(0.30, 0.05 + freshness * 0.14 + Math.log2(count + 1) * 0.025);

    const grd = oc.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    grd.addColorStop(0,    "rgba(255, 60, 30, " + alpha + ")");
    grd.addColorStop(0.40, "rgba(255, 110, 30, " + (alpha * 0.52) + ")");
    grd.addColorStop(0.75, "rgba(255, 160, 20, " + (alpha * 0.18) + ")");
    grd.addColorStop(1,    "rgba(0, 0, 0, 0)");
    oc.fillStyle = grd;
    oc.beginPath();
    oc.arc(p.x, p.y, r, 0, Math.PI * 2);
    oc.fill();
  }

  oc.globalCompositeOperation = "source-over";
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.drawImage(_heatmapCanvas, 0, 0);
  ctx.restore();
}

// ── Danger radius circles ─────────────────────────────────────────────────

function drawDangerRadius() {
  const killsBySystem = buildKillSystemMap();
  if (!killsBySystem.size) return;
  const range = Number(els.jumpRange.value || 120);
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const SEGS = 48;
  const THRESHOLD = 2;
  ctx.save();
  ctx.setLineDash([3, 7]);
  for (const [systemId, kills] of killsBySystem) {
    const visible = state.showKillShipsOnly ? kills.filter(isShipKill) : kills;
    if (visible.length < THRESHOLD) continue;
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const intensity = Math.min(1, visible.length / 8);
    const alpha = 0.10 + intensity * 0.18;
    ctx.strokeStyle = `rgba(255, 60, 60, ${alpha})`;
    ctx.lineWidth = 0.8 + intensity * 0.5;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= SEGS; i++) {
      const a = (i / SEGS) * Math.PI * 2;
      const pt = { x: system.x + Math.cos(a) * range, y: system.y, z: system.z + Math.sin(a) * range };
      const pp = project(pt);
      if (pp.x < -rect.width || pp.y < -rect.height || pp.x > rect.width * 2 || pp.y > rect.height * 2) {
        first = true;
        continue;
      }
      if (first) { ctx.moveTo(pp.x, pp.y); first = false; }
      else ctx.lineTo(pp.x, pp.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
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
      return {
        id: a.id,
        systemId,
        label: a._typeLabel,
        color: a._typeColor,
        online,
        name: a.metadata?.name || a._typeLabel,
        connectedCount,
        ownerId: a.owner_id || a.character_id || a.owner?.item_id || a.character?.item_id || "",
      };
    })
    .filter((a) => a.systemId);
}

function drawAssemblyOverlay() {
  if (!state.overlayAssemblies.length) return;
  ctx.save();
  const nameFilter = state.overlayAsmNameFilter.trim().toLowerCase();
  // Group by system, respecting the online-only, type, and name filters
  const bySystem = new Map();
  for (const asm of state.overlayAssemblies) {
    if (state.overlayAssembliesOnlineOnly && !asm.online) continue;
    if (!state.overlayAsmTypeFilter.has(asm.label)) continue;
    if (nameFilter && !asm.name.toLowerCase().includes(nameFilter)) continue;
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

// ── Overlay: Smart Gate Hubs ───────────────────────────────────────────────

function computeGateHubs(minConnections = 3) {
  const connectionCount = new Map();
  for (const gate of state.gates) {
    if (gate.kind !== "smart") continue;
    connectionCount.set(gate.from, (connectionCount.get(gate.from) || 0) + 1);
    connectionCount.set(gate.to, (connectionCount.get(gate.to) || 0) + 1);
  }
  return [...connectionCount.entries()]
    .filter(([, count]) => count >= minConnections)
    .sort((a, b) => b[1] - a[1]);
}

function drawSmartGateHubOverlay() {
  if (!state.gates.length) return;
  const hubs = computeGateHubs();
  if (!hubs.length) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const z = state.camera.zoom;
  ctx.save();
  for (const [systemId, count] of hubs) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -30 || p.y < -30 || p.x > rect.width + 30 || p.y > rect.height + 30) continue;
    const r = 6 + Math.min(7, count * 0.8);
    const intensity = Math.min(1, count / 8);
    const alpha = 0.55 + intensity * 0.35;
    // 5-pointed star shape
    const points = 5;
    ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
    ctx.fillStyle = `rgba(100, 200, 255, ${0.07 + intensity * 0.13})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.42;
      const px = p.x + Math.cos(angle) * radius;
      const py = p.y + Math.sin(angle) * radius;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (z > 0.6) {
      ctx.fillStyle = `rgba(100,200,255,${alpha})`;
      ctx.font = `bold ${Math.max(7, Math.min(10, r - 1))}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(count), p.x, p.y);
    }
  }
  ctx.restore();
}

function updateHubPanel() {
  if (!els.hubPanel || !els.hubList) return;
  if (!state.showSmartGateHubs) {
    els.hubPanel.style.display = "none";
    return;
  }
  els.hubPanel.style.display = "";
  if (!state.gatesLoaded) {
    els.hubList.innerHTML = '<li class="danger-empty">Loading gate network…</li>';
    return;
  }
  const hubs = computeGateHubs();
  if (!hubs.length) {
    els.hubList.innerHTML = '<li class="danger-empty">No hubs found (need smart gate data)</li>';
    return;
  }
  els.hubList.innerHTML = hubs.slice(0, 12).map(([systemId, count], idx) => {
    const system = state.systemsById.get(systemId);
    if (!system) return "";
    return `<li class="danger-item" data-system-id="${systemId}">
      <span class="danger-rank">${idx + 1}</span>
      <span class="danger-name">${escapeHtml(system.name)}</span>
      <span class="danger-count">${count} conn</span>
    </li>`;
  }).filter(Boolean).join("");
  els.hubList.querySelectorAll(".danger-item").forEach((li) => {
    li.addEventListener("click", () => {
      const system = state.systemsById.get(Number(li.dataset.systemId));
      if (system) { selectSystem(system); centerOnSystem(system); }
    });
  });
}

// ── Overlay: Constellation Kill Zones ─────────────────────────────────────

function buildConstellationKillMap() {
  const cutoff = Date.now() - state.overlayKillsTimeWindow * 60 * 60 * 1000;
  const map = new Map();
  for (const kill of state.overlayKills) {
    if (kill.timestamp < cutoff) continue;
    const system = state.systemsById.get(kill.systemId);
    if (!system) continue;
    const cid = system.constellationId;
    map.set(cid, (map.get(cid) || 0) + 1);
  }
  return map;
}

function drawConstellationKillZones() {
  if (!state.overlayKillsLoaded || !state.overlayKills.length) return;
  const constellKillMap = buildConstellationKillMap();
  if (!constellKillMap.size) return;
  const maxKills = Math.max(...constellKillMap.values());
  const minKills = state.killMinCount || 1;

  // Group systems by constellation
  const constellSystems = new Map();
  for (const system of state.systems) {
    const cid = system.constellationId;
    if (!constellSystems.has(cid)) constellSystems.set(cid, []);
    constellSystems.get(cid).push(system);
  }

  const rect = cachedRect || els.canvas.getBoundingClientRect();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const [cid, killCount] of constellKillMap) {
    if (killCount < minKills) continue;
    const systems = constellSystems.get(cid);
    if (!systems || systems.length < 2) continue;
    const pts = systems.map((s) => project(s)).filter(
      (p) => p.x > -rect.width && p.y > -rect.height && p.x < rect.width * 2 && p.y < rect.height * 2
    );
    if (!pts.length) continue;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const maxDist = Math.max(30, ...pts.map((p) => Math.hypot(p.x - cx, p.y - cy)));
    const intensity = Math.min(1, killCount / Math.max(1, maxKills));
    const alpha = 0.04 + intensity * 0.14;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist * 1.4);
    grd.addColorStop(0,   `rgba(255, 80, 30, ${alpha})`);
    grd.addColorStop(0.6, `rgba(255, 120, 30, ${alpha * 0.45})`);
    grd.addColorStop(1,   `rgba(255, 60, 20, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, maxDist * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// ── Kill auto-refresh ──────────────────────────────────────────────────────

let _killRefreshTimer = null;

function setupKillAutoRefresh() {
  clearInterval(_killRefreshTimer);
  if (!state.autoRefreshKills || !state.showKills) return;
  _killRefreshTimer = setInterval(async () => {
    state.overlayKillsLoaded = false;
    state.overlayKillsLoading = null;
    state.overlayKills = [];
    await ensureKillFeed();
  }, 5 * 60 * 1000);
}

// ── Bookmarks ──────────────────────────────────────────────────────────────

const BOOKMARKS_KEY = "frontier-gps.bookmarks.v1";

function loadBookmarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
    state.bookmarks = Array.isArray(saved) ? saved.filter((id) => typeof id === "number") : [];
  } catch {
    state.bookmarks = [];
  }
}

function saveBookmarks() {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(state.bookmarks));
  } catch {}
}

function toggleBookmark(system) {
  if (!system) return;
  const idx = state.bookmarks.indexOf(system.id);
  if (idx >= 0) state.bookmarks.splice(idx, 1);
  else state.bookmarks.push(system.id);
  saveBookmarks();
  renderBookmarksPanel();
  updateBookmarkButton(system);
  updateOverlayLegend();
  if (state.showBookmarks) scheduleDraw();
}

function updateBookmarkButton(system) {
  if (!els.bookmarkSystemBtn || !system) return;
  const isBookmarked = state.bookmarks.includes(system.id);
  els.bookmarkSystemBtn.textContent = isBookmarked ? "Unbookmark" : "Bookmark";
  els.bookmarkSystemBtn.classList.toggle("active-bookmark", isBookmarked);
}

function renderBookmarksPanel() {
  if (!els.bookmarksPanel || !els.bookmarksList) return;
  const systems = state.bookmarks.map((id) => state.systemsById.get(id)).filter(Boolean);
  if (!systems.length) {
    els.bookmarksPanel.style.display = "none";
    return;
  }
  els.bookmarksPanel.style.display = "";
  els.bookmarksList.innerHTML = systems.map((system) =>
    `<li class="bookmark-item" data-system-id="${system.id}">
      <span class="bookmark-name">${escapeHtml(system.name)}</span>
      <span class="bookmark-region">R${system.regionId}</span>
      <button class="bookmark-remove" data-system-id="${system.id}" title="Remove bookmark" aria-label="Remove bookmark">×</button>
    </li>`
  ).join("");
  els.bookmarksList.querySelectorAll(".bookmark-item").forEach((li) => {
    li.addEventListener("click", (e) => {
      if (e.target.classList.contains("bookmark-remove")) return;
      const system = state.systemsById.get(Number(li.dataset.systemId));
      if (system) { selectSystem(system); centerOnSystem(system); }
    });
  });
  els.bookmarksList.querySelectorAll(".bookmark-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const system = state.systemsById.get(Number(btn.dataset.systemId));
      if (system) toggleBookmark(system);
    });
  });
}

function drawBookmarks() {
  if (!state.bookmarks.length) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const z = state.camera.zoom;
  ctx.save();
  for (const id of state.bookmarks) {
    const system = state.systemsById.get(id);
    if (!system) continue;
    const p = project(system);
    if (p.x < -30 || p.y < -30 || p.x > rect.width + 30 || p.y > rect.height + 30) continue;
    const r = 7;
    // 4-pointed star shape
    ctx.strokeStyle = "rgba(255, 220, 80, 0.88)";
    ctx.fillStyle = "rgba(255, 220, 80, 0.14)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.42;
      const px = p.x + Math.cos(angle) * radius;
      const py = p.y + Math.sin(angle) * radius;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (z > 1.0) {
      ctx.fillStyle = "rgba(255, 220, 80, 0.82)";
      ctx.font = `bold 8px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      // Shadow
      ctx.fillStyle = "rgba(2,8,12,0.70)";
      ctx.fillText(system.name, p.x + 0.5, p.y - r - 1.5);
      ctx.fillStyle = "rgba(255, 220, 80, 0.82)";
      ctx.fillText(system.name, p.x, p.y - r - 2);
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
      // Type breakdown when multiple types present
      const byType = new Map();
      for (const a of visible) {
        if (!byType.has(a.label)) byType.set(a.label, { total: 0, online: 0 });
        const t = byType.get(a.label);
        t.total++;
        if (a.online) t.online++;
      }
      if (byType.size > 1) {
        for (const [label, counts] of byType) {
          lines.push({ text: `  ${label}: ${counts.online}/${counts.total}`, color: "rgba(0,180,216,0.55)", bold: false });
        }
      }
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
    const trend = state.showKillTrend ? getKillTrend(systemId) : null;
    const label = trend === "up" ? system.name + " ↑" : trend === "down" ? system.name + " ↓" : system.name;
    ctx.font = "bold 9px ui-monospace, monospace";
    // Shadow for readability
    ctx.fillStyle = "rgba(2,8,12,0.70)";
    ctx.fillText(label, p.x + 1, p.y - radius - 1);
    ctx.fillStyle = trend === "up" ? "rgba(255, 160, 80, 0.92)" : trend === "down" ? "rgba(130, 230, 130, 0.92)" : "rgba(255, 130, 130, 0.92)";
    ctx.fillText(label, p.x, p.y - radius - 2);
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

// ── Overlay UI helpers ─────────────────────────────────────────────────────

function setOverlayStatus(text) {
  els.overlayStatus.textContent = text;
}

// ── Find System Panel ──────────────────────────────────────────────────────

function openFindPanel() {
  state.findPanelOpen = true;
  if (els.findPanel) {
    els.findPanel.style.display = "";
    els.findInput && els.findInput.focus();
  }
}

function closeFindPanel() {
  state.findPanelOpen = false;
  if (els.findPanel) els.findPanel.style.display = "none";
  if (els.findInput) { els.findInput.value = ""; els.findSuggestions && hideSuggestions(els.findSuggestions); }
}



function updateOverlayLegend() {
  if (els.legendRegion) els.legendRegion.style.display = state.showRegionColors ? "" : "none";
  if (els.legendConstellation) els.legendConstellation.style.display = state.showConstellationColors ? "" : "none";
  els.legendKill.style.display = state.showKills ? "" : "none";
  els.legendAssembly.style.display = state.showAssemblies ? "" : "none";
  els.legendBase.style.display = state.showPlayerBases ? "" : "none";
  if (els.legendHub) els.legendHub.style.display = state.showSmartGateHubs ? "" : "none";
  if (els.legendBookmark) els.legendBookmark.style.display = (state.showBookmarks && state.bookmarks.length) ? "" : "none";
  if (els.asmNameFilterRow) {
    els.asmNameFilterRow.style.display = state.showAssemblies ? "" : "none";
  }
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
  els.regionColorsToggle?.addEventListener("change", () => {
    state.showRegionColors = els.regionColorsToggle.checked;
    updateOverlayLegend();
    draw();
  });
  els.constellationColorsToggle?.addEventListener("change", () => {
    state.showConstellationColors = els.constellationColorsToggle.checked;
    updateOverlayLegend();
    draw();
  });
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
      draw();
    });
  });
  els.applyCustomHours?.addEventListener("click", () => {
    const h = Number(els.customHours?.value || 0);
    if (h >= 1 && h <= 720) {
      state.overlayKillsTimeWindow = h;
      updateTimePresets();
      updateDangerPanel();
      draw();
    }
  });
  els.customHours?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.applyCustomHours?.click();
  });
  els.showKillTrendToggle?.addEventListener("change", () => {
    state.showKillTrend = els.showKillTrendToggle.checked;
    updateDangerPanel();
    draw();
  });
  els.killHeatmapToggle?.addEventListener("change", () => {
    state.killHeatmap = Boolean(els.killHeatmapToggle?.checked);
    draw();
  });
  els.showDangerRadiusToggle?.addEventListener("change", () => {
    state.showDangerRadius = Boolean(els.showDangerRadiusToggle?.checked);
    draw();
  });
  els.constellationKillsToggle?.addEventListener("change", () => {
    state.showConstellationKills = Boolean(els.constellationKillsToggle?.checked);
    draw();
  });
  els.smartGateHubsToggle?.addEventListener("change", () => {
    state.showSmartGateHubs = Boolean(els.smartGateHubsToggle?.checked);
    updateOverlayLegend();
    updateHubPanel();
    draw();
  });
  els.killMinCountInput?.addEventListener("change", () => {
    const v = Number(els.killMinCountInput.value || 1);
    state.killMinCount = Math.max(1, Math.min(999, v));
    updateDangerPanel();
    draw();
  });
  els.killMinCountInput?.addEventListener("input", () => {
    const v = Number(els.killMinCountInput.value || 1);
    state.killMinCount = Math.max(1, Math.min(999, v));
    updateDangerPanel();
    scheduleDraw();
  });
  els.killAutoRefreshToggle?.addEventListener("change", () => {
    state.autoRefreshKills = Boolean(els.killAutoRefreshToggle?.checked);
    setupKillAutoRefresh();
  });
  els.killPlayerFilterInput?.addEventListener("input", () => {
    state.killPlayerFilter = els.killPlayerFilterInput.value;
    updateDangerPanel();
    scheduleDraw();
  });
  els.clearPlayerFilterBtn?.addEventListener("click", () => {
    state.killPlayerFilter = "";
    if (els.killPlayerFilterInput) els.killPlayerFilterInput.value = "";
    updateDangerPanel();
    scheduleDraw();
  });
  els.showRecentKillsToggle?.addEventListener("change", () => {
    state.showRecentKills = Boolean(els.showRecentKillsToggle?.checked);
    updateRecentKillsPanel();
  });
  els.showRegionKillsToggle?.addEventListener("change", () => {
    state.showRegionKills = Boolean(els.showRegionKillsToggle?.checked);
    updateRegionKillPanel();
  });
  els.findSystemBtn?.addEventListener("click", () => {
    if (state.findPanelOpen) closeFindPanel();
    else openFindPanel();
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
}

// ── Minimap ────────────────────────────────────────────────────────────────
// Always drawn top-down (X/Z projection, ignoring 3D rotation) for a stable
// overview regardless of current 3D camera angle.

const minimapCtx = els.minimapCanvas ? els.minimapCanvas.getContext("2d") : null;
const MM_W = 160;
const MM_H = 110;

function minimapWorldToLocal(worldX, worldZ) {
  const b = state.bounds;
  if (!b) return { x: 0, y: 0 };
  const pad = 6;
  const scaleX = (MM_W - pad * 2) / Math.max(1, b.maxX - b.minX);
  const scaleZ = (MM_H - pad * 2) / Math.max(1, b.maxZ - b.minZ);
  const scale = Math.min(scaleX, scaleZ);
  const centerX = (b.minX + b.maxX) / 2;
  const centerZ = (b.minZ + b.maxZ) / 2;
  return {
    x: MM_W / 2 + (worldX - centerX) * scale,
    y: MM_H / 2 + (worldZ - centerZ) * scale,
  };
}

function drawMinimap(rect) {
  if (!minimapCtx || !state.systems.length || !state.bounds) return;
  const mc = minimapCtx;
  const b = state.bounds;

  // Clear
  mc.clearRect(0, 0, MM_W, MM_H);

  // Background
  mc.fillStyle = "rgba(2, 8, 15, 0.90)";
  mc.fillRect(0, 0, MM_W, MM_H);

  // All systems as tiny dots (skip every N for performance)
  const step = state.systems.length > 10000 ? 3 : 1;
  mc.fillStyle = "rgba(140, 170, 220, 0.28)";
  mc.beginPath();
  for (let i = 0; i < state.systems.length; i += step) {
    const s = state.systems[i];
    const p = minimapWorldToLocal(s.x, s.z);
    mc.moveTo(p.x + 0.7, p.y);
    mc.arc(p.x, p.y, 0.7, 0, Math.PI * 2);
  }
  mc.fill();

  // Kill hotspots
  if (state.showKills && state.overlayKillsLoaded) {
    const killMap = buildKillSystemMap();
    for (const [systemId, kills] of killMap) {
      const sys = state.systemsById.get(systemId);
      if (!sys) continue;
      const p = minimapWorldToLocal(sys.x, sys.z);
      const r = Math.min(4, 1.5 + Math.log2(kills.length + 1) * 0.8);
      mc.fillStyle = `rgba(255, 60, 30, ${0.5 + Math.min(0.4, kills.length * 0.04)})`;
      mc.beginPath();
      mc.arc(p.x, p.y, r, 0, Math.PI * 2);
      mc.fill();
    }
  }

  // Route line
  if (state.route.length > 1) {
    mc.strokeStyle = "rgba(97, 213, 199, 0.75)";
    mc.lineWidth = 1.2;
    mc.beginPath();
    for (let i = 0; i < state.route.length; i++) {
      const p = minimapWorldToLocal(state.route[i].x, state.route[i].z);
      i === 0 ? mc.moveTo(p.x, p.y) : mc.lineTo(p.x, p.y);
    }
    mc.stroke();
  }

  // Selected system dot
  if (state.selected) {
    const sp = minimapWorldToLocal(state.selected.x, state.selected.z);
    mc.strokeStyle = "rgba(97, 213, 199, 0.95)";
    mc.lineWidth = 1.2;
    mc.beginPath();
    mc.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
    mc.stroke();
  }

  // Viewport rectangle (top-down approximation)
  const width = Math.max(1, b.maxX - b.minX);
  const height = Math.max(1, b.maxZ - b.minZ);
  const projBase = Math.min(rect.width / width, rect.height / height) * 0.84;
  const projScale = projBase * state.camera.zoom;
  const worldCenterX = (b.minX + b.maxX) / 2;
  const worldCenterZ = (b.minZ + b.maxZ) / 2;

  const screenToWorld = (sx, sy) => ({
    wx: (sx - rect.width / 2 - state.camera.x) / projScale + worldCenterX,
    wz: (sy - rect.height / 2 - state.camera.y) / projScale + worldCenterZ,
  });
  const tl = screenToWorld(0, 0);
  const br = screenToWorld(rect.width, rect.height);
  const mmTL = minimapWorldToLocal(tl.wx, tl.wz);
  const mmBR = minimapWorldToLocal(br.wx, br.wz);
  const vw = mmBR.x - mmTL.x;
  const vh = mmBR.y - mmTL.y;

  mc.strokeStyle = "rgba(0, 180, 216, 0.50)";
  mc.lineWidth = 1;
  mc.setLineDash([2, 2]);
  mc.strokeRect(mmTL.x, mmTL.y, vw, vh);
  mc.setLineDash([]);

  // Border
  mc.strokeStyle = "rgba(0, 180, 216, 0.20)";
  mc.lineWidth = 1;
  mc.strokeRect(0.5, 0.5, MM_W - 1, MM_H - 1);

  // Copy to on-page canvas element (if using separate canvas)
  // The minimap canvas is a separate DOM element — it draws itself.
}

// Minimap click navigation
if (els.minimapCanvas) {
  els.minimapCanvas.addEventListener("click", (e) => {
    if (!state.systems.length || !state.bounds) return;
    const rect = els.minimapCanvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (MM_W / rect.width);
    const my = (e.clientY - rect.top) * (MM_H / rect.height);

    const b = state.bounds;
    const pad = 6;
    const scaleX = (MM_W - pad * 2) / Math.max(1, b.maxX - b.minX);
    const scaleZ = (MM_H - pad * 2) / Math.max(1, b.maxZ - b.minZ);
    const scale = Math.min(scaleX, scaleZ);
    const centerX = (b.minX + b.maxX) / 2;
    const centerZ = (b.minZ + b.maxZ) / 2;

    const worldX = (mx - MM_W / 2) / scale + centerX;
    const worldZ = (my - MM_H / 2) / scale + centerZ;

    const mainRect = els.canvas.getBoundingClientRect();
    const width = Math.max(1, b.maxX - b.minX);
    const height = Math.max(1, b.maxZ - b.minZ);
    const projBase = Math.min(mainRect.width / width, mainRect.height / height) * 0.84;
    const projScale = projBase * state.camera.zoom;

    state.camera.x = mainRect.width / 2 - worldX * projScale + ((b.minX + b.maxX) / 2) * projScale - mainRect.width / 2;
    state.camera.y = mainRect.height / 2 - worldZ * projScale + ((b.minZ + b.maxZ) / 2) * projScale - mainRect.height / 2;
    scheduleDraw();
  });
}

// ── Constellation Boundaries ────────────────────────────────────────────────

// Compute 2D convex hull (Graham scan) for a set of {x,y} points.
function convexHull2D(pts) {
  if (pts.length < 3) return pts;
  const sorted = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [], upper = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

// Cache constellation groups so we don't re-compute on every frame.
let _constellGroupCache = null;
let _constellGroupSystemCount = 0;

function getConstellationGroups() {
  if (_constellGroupCache && _constellGroupSystemCount === state.systems.length) return _constellGroupCache;
  const groups = new Map();
  for (const s of state.systems) {
    if (!groups.has(s.constellationId)) groups.set(s.constellationId, []);
    groups.get(s.constellationId).push(s);
  }
  _constellGroupCache = groups;
  _constellGroupSystemCount = state.systems.length;
  return groups;
}

function drawConstellationBoundaries() {
  if (!state.systems.length || !state.bounds) return;
  const z = state.camera.zoom;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const groups = getConstellationGroups();

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (const [cid, systems] of groups) {
    if (systems.length < 2) continue;
    const pts = systems.map((s) => project(s));
    const hull = convexHull2D(pts);
    if (hull.length < 2) continue;

    // Skip fully off-screen hulls
    const onScreen = hull.some(
      (p) => p.x > -20 && p.y > -20 && p.x < rect.width + 20 && p.y < rect.height + 20,
    );
    if (!onScreen) continue;

    const h = constellationHue(cid);
    const alpha = 0.18 + Math.min(0.12, z * 0.06);
    ctx.strokeStyle = `hsla(${h}, 75%, 65%, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(hull[0].x, hull[0].y);
    for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i].x, hull[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// ── System Notes ────────────────────────────────────────────────────────────

const NOTES_KEY = "frontier-gps.notes.v1";

function loadSystemNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
    state.systemNotes = typeof saved === "object" && saved !== null ? saved : {};
  } catch {
    state.systemNotes = {};
  }
}

function saveSystemNotes() {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(state.systemNotes));
  } catch {}
}

function updateSystemNotePanel(system) {
  if (!els.systemNoteWrap || !els.systemNoteInput) return;
  if (!system) {
    els.systemNoteWrap.style.display = "none";
    return;
  }
  els.systemNoteWrap.style.display = "";
  els.systemNoteInput.value = state.systemNotes[system.id] || "";
}

function drawSystemNoteMarkers() {
  const ids = Object.keys(state.systemNotes).map(Number).filter((id) => state.systemNotes[id]);
  if (!ids.length) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const z = state.camera.zoom;
  ctx.save();
  ctx.fillStyle = "rgba(255, 220, 80, 0.80)";
  ctx.font = `${Math.max(8, Math.min(11, z * 4))}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (const id of ids) {
    const sys = state.systemsById.get(id);
    if (!sys) continue;
    const p = project(sys);
    if (p.x < -20 || p.y < -20 || p.x > rect.width + 20 || p.y > rect.height + 20) continue;
    ctx.fillText("📝", p.x, p.y - 8);
  }
  ctx.restore();
}

// ── Reachable stars highlight ───────────────────────────────────────────────

function drawReachableHighlight() {
  if (!state.selected || !state.systems.length) return;
  const range = Number(els.jumpRange.value || 120);
  const origin = state.selected;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const sys of state.systems) {
    if (sys.id === origin.id) continue;
    const dist = RouteCore.distance(sys, origin);
    if (dist > range) continue;
    const p = project(sys);
    if (p.x < -10 || p.y < -10 || p.x > rect.width + 10 || p.y > rect.height + 10) continue;
    const proximity = 1 - dist / range;
    const alpha = 0.08 + proximity * 0.22;
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
    grd.addColorStop(0, `rgba(0, 220, 200, ${alpha})`);
    grd.addColorStop(1, `rgba(0, 220, 200, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// ── Smart gate reach overlay ────────────────────────────────────────────────

function computeGateReach(systemId) {
  const reached = new Set();
  const queue = [systemId];
  reached.add(systemId);
  while (queue.length) {
    const cur = queue.shift();
    for (const gate of state.gates) {
      if (gate.kind !== "smart") continue;
      let neighbor = null;
      if (gate.from === cur) neighbor = gate.to;
      else if (gate.to === cur) neighbor = gate.from;
      if (neighbor && !reached.has(neighbor)) {
        reached.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  reached.delete(systemId);
  return reached;
}

function drawGateReachOverlay() {
  if (!state.selected || !state.gates.length) return;
  const reached = computeGateReach(state.selected.id);
  if (!reached.size) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const sysId of reached) {
    const sys = state.systemsById.get(sysId);
    if (!sys) continue;
    const p = project(sys);
    if (p.x < -10 || p.y < -10 || p.x > rect.width + 10 || p.y > rect.height + 10) continue;
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
    grd.addColorStop(0, "rgba(0, 200, 255, 0.28)");
    grd.addColorStop(1, "rgba(0, 200, 255, 0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// ── Kill escalation panel ────────────────────────────────────────────────────

function updateEscalatingPanel() {
  if (!els.escalatingPanel || !els.escalatingList) return;
  if (!state.showKills || !state.overlayKillsLoaded || !state.showKillEscalating) {
    els.escalatingPanel.style.display = "none";
    return;
  }
  els.escalatingPanel.style.display = "";
  const now = Date.now();
  const windowMs = state.overlayKillsTimeWindow * 3_600_000;
  const cutoff = now - windowMs;
  const midpoint = now - windowMs / 2;

  const bySystem = new Map();
  for (const kill of state.overlayKills) {
    if (kill.timestamp < cutoff) continue;
    if (!killPassesPlayerFilter(kill)) continue;
    const id = kill.systemId;
    if (!bySystem.has(id)) bySystem.set(id, { recent: 0, older: 0 });
    const t = bySystem.get(id);
    if (kill.timestamp >= midpoint) t.recent++;
    else t.older++;
  }

  const escalating = [];
  for (const [id, counts] of bySystem) {
    if (counts.recent < 2) continue;
    const ratio = counts.recent / Math.max(1, counts.older);
    if (ratio < 1.5) continue;
    escalating.push({ systemId: id, recent: counts.recent, older: counts.older, ratio });
  }
  escalating.sort((a, b) => b.ratio - a.ratio || b.recent - a.recent);

  if (!escalating.length) {
    els.escalatingList.innerHTML = '<li class="danger-empty">No escalating activity in this window</li>';
    return;
  }

  els.escalatingList.innerHTML = escalating.slice(0, 8).map(({ systemId, recent, older, ratio }, idx) => {
    const system = state.systemsById.get(systemId);
    if (!system) return "";
    const name = escapeHtml(system.name);
    const ratioStr = ratio >= 10 ? "10×+" : `${ratio.toFixed(1)}×`;
    return `<li class="danger-item" data-system-id="${systemId}">
      <span class="danger-rank">${idx + 1}</span>
      <span class="danger-name">${name}<span class="escalating-old"> +${older}</span></span>
      <span class="danger-count escalating-rising">+${recent} <span class="escalating-ratio">${ratioStr}</span></span>
    </li>`;
  }).filter(Boolean).join("");

  els.escalatingList.querySelectorAll(".danger-item").forEach((li) => {
    li.addEventListener("click", () => {
      const system = state.systemsById.get(Number(li.dataset.systemId));
      if (system) { selectSystem(system); centerOnSystem(system); }
    });
  });
}

// ── Nearby player bases panel ────────────────────────────────────────────────

function updateNearbyBasesPanel(system) {
  if (!els.nearbyBasesPanel) return;
  if (!system || !state.overlayPlayerBases.length || !state.showPlayerBases) {
    els.nearbyBasesPanel.style.display = "none";
    return;
  }
  const range = Number(els.jumpRange.value || 120) * 3;
  const nearby = state.overlayPlayerBases
    .filter((b) => b.systemId !== system.id)
    .map((b) => {
      const s = state.systemsById.get(b.systemId);
      if (!s) return null;
      return { base: b, system: s, dist: RouteCore.distance(s, system) };
    })
    .filter((item) => item && item.dist <= range)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5);

  if (!nearby.length) {
    els.nearbyBasesPanel.style.display = "none";
    return;
  }
  els.nearbyBasesPanel.style.display = "";
  els.nearbyBasesPanel.innerHTML = `
    <div class="danger-neighbors-header">Nearby bases <span class="danger-window-label">/ ${Math.round(range)} LY</span></div>
    <ol class="danger-neighbors-list">
      ${nearby.map(({ base, system: s, dist }) => {
        const active = base.onlineCount > 0;
        const activeClass = active ? " nearby-base--active" : "";
        return `<li class="danger-neighbor-item nearby-base-item${activeClass}" data-system-id="${s.id}">
          <span class="danger-neighbor-name">${escapeHtml(s.name)}</span>
          <span class="danger-neighbor-meta">
            <span class="nearby-base-count">${base.assemblyCount}⬡</span>
            <span class="danger-neighbor-dist">${dist.toFixed(0)} LY</span>
          </span>
        </li>`;
      }).join("")}
    </ol>`;
  els.nearbyBasesPanel.querySelectorAll(".nearby-base-item").forEach((li) => {
    li.addEventListener("click", () => {
      const s = state.systemsById.get(Number(li.dataset.systemId));
      if (s) { selectSystem(s); centerOnSystem(s); }
    });
  });
}

// ── New overlay bindings ────────────────────────────────────────────────────

function bindNewOverlayEvents() {
  // Minimap toggle
  els.toggleMinimapBtn?.addEventListener("click", () => {
    state.showMinimap = !state.showMinimap;
    if (els.minimapCanvas) els.minimapCanvas.style.display = state.showMinimap ? "" : "none";
    els.toggleMinimapBtn.classList.toggle("active-bookmark", state.showMinimap);
    scheduleDraw();
  });

  // Constellation boundaries toggle
  els.constellationBoundariesToggle?.addEventListener("change", () => {
    state.showConstellationBoundaries = els.constellationBoundariesToggle.checked;
    scheduleDraw();
  });

  // Assembly name filter
  els.asmNameFilterInput?.addEventListener("input", () => {
    state.overlayAsmNameFilter = els.asmNameFilterInput.value;
    scheduleDraw();
  });
  els.clearAsmNameFilterBtn?.addEventListener("click", () => {
    state.overlayAsmNameFilter = "";
    if (els.asmNameFilterInput) els.asmNameFilterInput.value = "";
    scheduleDraw();
  });

  // Reachable highlight toggle
  els.showReachableHighlightToggle?.addEventListener("change", () => {
    state.showReachableHighlight = els.showReachableHighlightToggle.checked;
    scheduleDraw();
  });

  // Smart gate reach toggle
  els.showGateReachToggle?.addEventListener("change", () => {
    state.showGateReach = els.showGateReachToggle.checked;
    scheduleDraw();
  });

  // Kill escalation toggle
  els.showKillEscalatingToggle?.addEventListener("change", () => {
    state.showKillEscalating = els.showKillEscalatingToggle.checked;
    updateEscalatingPanel();
  });

  // System notes save
  els.saveSystemNoteBtn?.addEventListener("click", () => {
    if (!state.selected) return;
    const note = els.systemNoteInput?.value?.trim() || "";
    if (note) {
      state.systemNotes[state.selected.id] = note;
    } else {
      delete state.systemNotes[state.selected.id];
    }
    saveSystemNotes();
    const btn = els.saveSystemNoteBtn;
    const orig = btn.textContent;
    btn.textContent = "Saved!";
    setTimeout(() => { btn.textContent = orig; }, 1000);
    // Re-render system card to update note badge
    selectSystem(state.selected);
  });
}

// ── Territory Ownership Overlay ────────────────────────────────────────────

const OWNER_HUES = [200, 30, 150, 60, 270, 10, 330, 180, 240, 100, 300, 45];
const ownerColorMap = new Map();
let ownerColorIndex = 0;

function getOwnerColor(ownerId, alpha = 0.7) {
  if (!ownerColorMap.has(ownerId)) {
    const hue = OWNER_HUES[ownerColorIndex % OWNER_HUES.length];
    ownerColorMap.set(ownerId, hue);
    ownerColorIndex++;
  }
  const hue = ownerColorMap.get(ownerId);
  return `hsla(${hue}, 75%, 58%, ${alpha})`;
}

function buildTerritoryMap() {
  const bySystem = new Map();
  for (const asm of state.overlayAssemblies) {
    const oid = asm.ownerId || "unknown";
    if (!bySystem.has(asm.systemId)) bySystem.set(asm.systemId, new Map());
    const owners = bySystem.get(asm.systemId);
    owners.set(oid, (owners.get(oid) || 0) + 1);
  }
  const result = new Map();
  for (const [systemId, owners] of bySystem) {
    let topOwner = "unknown", topCount = 0;
    for (const [oid, count] of owners) {
      if (count > topCount) { topOwner = oid; topCount = count; }
    }
    result.set(systemId, { ownerId: topOwner, count: topCount });
  }
  return result;
}

function drawTerritoryOverlay() {
  if (!state.overlayAssemblies.length) return;
  const territoryMap = buildTerritoryMap();
  if (!territoryMap.size) return;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const [systemId, { ownerId }] of territoryMap) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -20 || p.y < -20 || p.x > rect.width + 20 || p.y > rect.height + 20) continue;
    const r = 14;
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    grd.addColorStop(0, getOwnerColor(ownerId, 0.25));
    grd.addColorStop(1, getOwnerColor(ownerId, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function updateTerritoryPanel() {
  if (!els.territoryPanel || !els.territoryList) return;
  if (!state.showTerritoryOwnership || !state.overlayAssembliesLoaded) {
    els.territoryPanel.style.display = "none";
    return;
  }
  els.territoryPanel.style.display = "";
  const ownerAsms = new Map();
  const ownerSystems = new Map();
  for (const asm of state.overlayAssemblies) {
    const oid = asm.ownerId || "unknown";
    ownerAsms.set(oid, (ownerAsms.get(oid) || 0) + 1);
    if (!ownerSystems.has(oid)) ownerSystems.set(oid, new Set());
    ownerSystems.get(oid).add(asm.systemId);
  }
  const owners = [...ownerAsms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (!owners.length) {
    els.territoryList.innerHTML = '<li class="danger-empty">No assembly ownership data found</li>';
    return;
  }
  els.territoryList.innerHTML = owners.map(([oid, asmCount], idx) => {
    const sysCount = ownerSystems.get(oid)?.size || 0;
    const shortId = oid === "unknown" ? "Unknown" : `${oid.slice(0, 6)}…${oid.slice(-4)}`;
    const colorDot = getOwnerColor(oid, 1);
    return `<li class="danger-item territory-item" data-owner-id="${escapeHtml(oid)}">
      <span class="danger-rank">${idx + 1}</span>
      <span class="territory-dot" style="background:${colorDot}"></span>
      <span class="danger-name territory-name" title="${escapeHtml(oid)}">${escapeHtml(shortId)}</span>
      <span class="danger-count">${asmCount}⬡ <span class="territory-sys">${sysCount}✦</span></span>
    </li>`;
  }).join("");
}

// ── Kill Flash Overlay ─────────────────────────────────────────────────────

let killFlashAnimFrame = null;

function drawKillFlashOverlay() {
  const realNow = Date.now();
  const FLASH_WINDOW_MS = 15 * 60 * 1000;
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const recent = state.overlayKills.filter((k) => realNow - k.timestamp < FLASH_WINDOW_MS);
  if (!recent.length) return;
  ctx.save();
  for (const kill of recent) {
    const system = state.systemsById.get(kill.systemId);
    if (!system) continue;
    const p = project(system);
    if (p.x < -30 || p.y < -30 || p.x > rect.width + 30 || p.y > rect.height + 30) continue;
    const ageFrac = (realNow - kill.timestamp) / FLASH_WINDOW_MS;
    const baseR = 3 + ageFrac * 18;
    const alpha = Math.max(0, 0.7 - ageFrac * 0.7);
    ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
    ctx.lineWidth = 1.5 - ageFrac;
    ctx.beginPath();
    ctx.arc(p.x, p.y, baseR, 0, Math.PI * 2);
    ctx.stroke();
    if (ageFrac < 0.15) {
      const innerAlpha = Math.max(0, 0.85 - ageFrac * 5);
      ctx.fillStyle = `rgba(255, 80, 40, ${innerAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function startKillFlashAnimation() {
  if (killFlashAnimFrame) return;
  const step = () => {
    if (!state.showKillFlash || !state.showKills) { killFlashAnimFrame = null; return; }
    const now = Date.now();
    const hasRecent = state.overlayKills.some((k) => now - k.timestamp < 15 * 60 * 1000);
    if (hasRecent) scheduleDraw();
    killFlashAnimFrame = requestAnimationFrame(step);
  };
  killFlashAnimFrame = requestAnimationFrame(step);
}

// ── Kill Hourly Distribution Panel ────────────────────────────────────────

function buildKillHourlyDistribution() {
  const hours = new Array(24).fill(0);
  const cutoff = Date.now() - 7 * 24 * 3_600_000;
  for (const kill of state.overlayKills) {
    if (kill.timestamp < cutoff) continue;
    const h = new Date(kill.timestamp).getUTCHours();
    hours[h]++;
  }
  return hours;
}

function updateKillHourlyPanel() {
  if (!els.killHourlyPanel || !els.killHourlyChart) return;
  if (!state.showKills || !state.overlayKillsLoaded || !state.showKillHourly) {
    els.killHourlyPanel.style.display = "none";
    return;
  }
  els.killHourlyPanel.style.display = "";
  const dist = buildKillHourlyDistribution();
  const max = Math.max(...dist, 1);
  const peakHour = dist.indexOf(Math.max(...dist));
  const total = dist.reduce((s, n) => s + n, 0);
  els.killHourlyChart.innerHTML = `
    <div class="kill-hourly-bars">
      ${dist.map((count, h) => {
        const pct = Math.round((count / max) * 100);
        const isPeak = h === peakHour && count > 0;
        return `<div class="kill-hourly-bar-wrap" title="${h}:00 UTC — ${count} kill${count !== 1 ? "s" : ""}">
          <div class="kill-hourly-bar${isPeak ? " kill-hourly-bar--peak" : ""}" style="height:${Math.max(2, pct)}%"></div>
          ${h % 6 === 0 ? `<span class="kill-hourly-label">${h}h</span>` : ""}
        </div>`;
      }).join("")}
    </div>
    ${total > 0
      ? `<div class="kill-hourly-peak">Peak: ${peakHour}:00–${(peakHour + 1) % 24}:00 UTC · ${dist[peakHour]} kill${dist[peakHour] !== 1 ? "s" : ""}</div>`
      : `<div class="kill-hourly-peak">No kill data in last 7 days</div>`
    }`;
}

// ── Coverage Radius Overlay ────────────────────────────────────────────────

function drawCoverageRadiusOverlay() {
  if (!state.overlayPlayerBases.length || !state.bounds) return;
  const range = Number(els.jumpRange?.value || 120);
  const rect = cachedRect || els.canvas.getBoundingClientRect();
  const width = Math.max(1, state.bounds.maxX - state.bounds.minX);
  const heightZ = Math.max(1, state.bounds.maxZ - state.bounds.minZ);
  const baseScale = Math.min(rect.width / width, rect.height / heightZ) * 0.84;
  const radiusPx = range * baseScale * state.camera.zoom;
  if (radiusPx < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const base of state.overlayPlayerBases) {
    const system = state.systemsById.get(base.systemId);
    if (!system) continue;
    const p = project(system);
    const d = radiusPx + 20;
    if (p.x < -d || p.y < -d || p.x > rect.width + d || p.y > rect.height + d) continue;
    const active = base.onlineCount > 0;
    const fillAlpha = active ? 0.07 : 0.03;
    const strokeAlpha = active ? 0.20 : 0.08;
    const grd = ctx.createRadialGradient(p.x, p.y, radiusPx * 0.5, p.x, p.y, radiusPx);
    grd.addColorStop(0, `rgba(241, 184, 75, 0)`);
    grd.addColorStop(0.8, `rgba(241, 184, 75, ${fillAlpha})`);
    grd.addColorStop(1, `rgba(241, 184, 75, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(241, 184, 75, ${strokeAlpha})`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// ── New feature event bindings ─────────────────────────────────────────────

function bindFeatureOverlayEvents() {
  els.showTerritoryOwnershipToggle?.addEventListener("change", () => {
    state.showTerritoryOwnership = els.showTerritoryOwnershipToggle.checked;
    if (state.showTerritoryOwnership && !state.overlayAssembliesLoaded) {
      ensureAssemblyOverlay().catch(() => {});
    }
    updateTerritoryPanel();
    scheduleDraw();
  });

  els.showCoverageRadiusToggle?.addEventListener("change", () => {
    state.showCoverageRadius = els.showCoverageRadiusToggle.checked;
    scheduleDraw();
  });

  els.showKillFlashToggle?.addEventListener("change", () => {
    state.showKillFlash = els.showKillFlashToggle.checked;
    if (state.showKillFlash) startKillFlashAnimation();
    else if (killFlashAnimFrame) { cancelAnimationFrame(killFlashAnimFrame); killFlashAnimFrame = null; }
    scheduleDraw();
  });

  els.showKillHourlyToggle?.addEventListener("change", () => {
    state.showKillHourly = els.showKillHourlyToggle.checked;
    updateKillHourlyPanel();
  });
}

async function init() {
  loadBookmarks();
  loadSystemNotes();
  bindEvents();
  bindOverlayEvents();
  bindNewOverlayEvents();
  bindFeatureOverlayEvents();
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
  // Bookmarks panel rendered after systems load so names resolve
  renderBookmarksPanel();
  updateOverlayLegend();
  resolveRouteFieldsToNames();
  fitSystems(state.systems);
  // Load gate network eagerly so links appear on the map immediately
  ensureGateNetwork().then(() => { if (state.showSmartGateHubs) updateHubPanel(); }).catch(() => {});
  // Restore overlay data for any overlays enabled via URL params
  if (state.showKills) { ensureKillFeed().catch(() => {}); setupKillAutoRefresh(); }
  if (state.showAssemblies || state.showPlayerBases) ensureAssemblyOverlay().catch(() => {});
  if (els.origin.value && els.destination.value) calculate();
}

init();
