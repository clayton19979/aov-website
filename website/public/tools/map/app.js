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

  // ── Gate links ───────────────────────────────────────
  drawGateLinks();
  if (state.showKills) drawKillOverlay();
  if (state.showAssemblies) drawAssemblyOverlay();
  if (state.showPlayerBases) drawPlayerBaseOverlay();
  drawRoute();

  if (state.selected) drawSystemMarker(state.selected, "#61d5c7", 7);
  if (state.hovered && state.hovered !== state.selected) drawSystemMarker(state.hovered, "#f1b84b", 5);
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
    const li = document.createElement("li");
    const safeName = escapeHtml(system.name);
    const detail = isWaypoint
      ? " - waypoint"
      : edge?.gate
        ? ` - ${edge.kind === "game" ? "Game Gate" : "Smart Gate"}`
        : edge
          ? ` - ${edge.distance.toFixed(1)} LY`
          : " - depart";
    li.innerHTML = `
      <span class="step-index">${index + 1}</span>
      <div>
        <strong>${safeName}</strong>
        <small>Region ${system.regionId}${detail}</small>
      </div>
      ${routeChip(edge, index, routeLength, isWaypoint)}
    `;
    li.dataset.systemId = String(system.id);
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
  els.metrics.innerHTML = `
    <div><span>Systems</span><strong>${result.path.length}</strong></div>
    <div><span>Jump distance</span><strong>${totalDistance.toFixed(1)} LY</strong></div>
    <div><span>Fuel efficiency score</span><strong>${result.fuelScore ?? 100}/100</strong></div>
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
  els.card.querySelector("div:first-child").innerHTML = `<span>Region ${system.regionId} - Constellation ${system.constellationId}</span><strong>${safeName}</strong><span>${system.x.toFixed(1)}, ${system.y.toFixed(1)}, ${system.z.toFixed(1)} LY</span>`;
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

function findRouteInMain(origin, destination, mode, range) {
  const systemsById = state.systemsById;
  const gateAdjacency = RouteCore.buildGateAdjacency(systemsById, state.gates);
  if (!state.spatialIndexes.has(range)) {
    state.spatialIndexes.set(range, RouteCore.makeSpatialIndex(state.systems, range));
  }
  const base = {
    systems: state.systems,
    systemsById,
    gateAdjacency,
    origin,
    destination,
    range,
    useGates: els.useGates.checked,
    spatialIndex: state.spatialIndexes.get(range),
  };
  const result = RouteCore.findRoute({ ...base, mode });
  const fuelBest = mode === "fuel" ? result : RouteCore.findRoute({ ...base, mode: "fuel" });
  if (result && fuelBest) result.fuelScore = RouteCore.fuelScore(result, fuelBest);
  return result;
}

async function calculateRoute(origin, destination, mode, range) {
  if (routeWorker) {
    await syncRouteWorker();
    const message = await workerMessage({
      type: "route",
      originId: origin.id,
      destinationId: destination.id,
      range,
      mode,
      useGates: els.useGates.checked,
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
  els.jumpRange.addEventListener("input", updateRangePresets);
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
  const MAX_PAGES = 10; // up to ~1 000 events
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

function buildKillSystemMap() {
  const cutoff = Date.now() - state.overlayKillsTimeWindow * 60 * 60 * 1000;
  const map = new Map();
  for (const kill of state.overlayKills) {
    if (kill.timestamp < cutoff) continue;
    if (!map.has(kill.systemId)) map.set(kill.systemId, []);
    map.get(kill.systemId).push(kill);
  }
  return map;
}

function drawKillOverlay() {
  const killsBySystem = buildKillSystemMap();
  if (!killsBySystem.size) return;
  ctx.save();
  for (const [systemId, kills] of killsBySystem) {
    const system = state.systemsById.get(systemId);
    if (!system) continue;
    const p = project(system);
    const rect = cachedRect || els.canvas.getBoundingClientRect();
    if (p.x < -20 || p.y < -20 || p.x > rect.width + 20 || p.y > rect.height + 20) continue;
    const count = kills.length;
    const radius = Math.min(12, 4 + Math.log2(count + 1) * 2);
    // Glow
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.5);
    grd.addColorStop(0, "rgba(255, 60, 60, 0.35)");
    grd.addColorStop(1, "rgba(255, 60, 60, 0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Core dot
    ctx.fillStyle = "rgba(255, 80, 80, 0.90)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    // Count label for 2+
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
      draw();
    }
  })();
  return state.overlayKillsLoading;
}

// ── Overlay: Smart Assemblies ──────────────────────────────────────────────

// Correct module paths from world-contracts source
// (github.com/evefrontier/world-contracts/tree/main/contracts/world/sources)
const ASSEMBLY_TYPE_DEFS = [
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
      };
    })
    .filter((a) => a.systemId);
}

function drawAssemblyOverlay() {
  if (!state.overlayAssemblies.length) return;
  ctx.save();
  // Group by system
  const bySystem = new Map();
  for (const asm of state.overlayAssemblies) {
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

// ── Overlay UI helpers ─────────────────────────────────────────────────────

function setOverlayStatus(text) {
  els.overlayStatus.textContent = text;
}

function updateOverlayLegend() {
  els.legendKill.style.display = state.showKills ? "" : "none";
  els.legendAssembly.style.display = state.showAssemblies ? "" : "none";
  els.legendBase.style.display = state.showPlayerBases ? "" : "none";
}

function updateTimePresets() {
  els.timePresets.forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.hours) === state.overlayKillsTimeWindow);
  });
}

async function toggleOverlay(name, enabled) {
  if (name === "kills") {
    state.showKills = enabled;
    els.killTimePanel.style.display = enabled ? "" : "none";
    if (enabled) await ensureKillFeed();
  } else if (name === "assemblies") {
    state.showAssemblies = enabled;
    if (enabled) await ensureAssemblyOverlay();
  } else if (name === "playerBases") {
    state.showPlayerBases = enabled;
    if (enabled && !state.overlayAssembliesLoaded) await ensureAssemblyOverlay();
  }
  updateOverlayLegend();
  draw();
}

function bindOverlayEvents() {
  els.killsToggle.addEventListener("change", () => toggleOverlay("kills", els.killsToggle.checked));
  els.assembliesToggle.addEventListener("change", () => toggleOverlay("assemblies", els.assembliesToggle.checked));
  els.playerBasesToggle.addEventListener("change", () => toggleOverlay("playerBases", els.playerBasesToggle.checked));
  els.timePresets.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.overlayKillsTimeWindow = Number(btn.dataset.hours);
      updateTimePresets();
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
    Promise.all(reloadTasks);
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
  if (els.origin.value && els.destination.value) calculate();
}

init();
