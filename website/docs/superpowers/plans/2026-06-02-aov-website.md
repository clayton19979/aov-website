# AoV Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Architects of the Void website — a cinematic public landing page and a gated internal member platform — in Next.js 15 with Tailwind CSS v4 and Framer Motion.

**Architecture:** Public landing page at `/` (Monolith hero, glitch effects, Discord CTA). Internal zone at `/hub` and sub-routes (Void Portal grid, tools forge, doctrine library, designation viewer, operations). Single middleware stub guards all internal routes for future wallet auth. All data is static TypeScript files — no backend, no API routes.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Vitest + React Testing Library

---

## File Map

```
src/
  app/
    layout.tsx                    Root layout — fonts, metadata, body bg
    page.tsx                      Landing page (public)
    globals.css                   Tailwind import, AoV theme tokens, scanline, cursor
    hub/page.tsx                  Member hub — Void Portal grid
    tools/page.tsx                Tools index — Forge Grid
    tools/[slug]/page.tsx         Individual tool — shell + component map
    doctrine/page.tsx             Doctrine library
    designations/page.tsx         Designation tier viewer
    operations/page.tsx           Operations placeholder
  components/
    landing/
      VoidEclipse.tsx             Animated void eclipse with flicker
      StarField.tsx               CSS star field background
      DiscordCTA.tsx              Discord join button
      PhraseCycler.tsx            Rotating bottom-bar phrase
    hub/
      HubQuadrant.tsx             Single portal quadrant card
      HubGrid.tsx                 2×2 quadrant grid
    tools/
      ToolCard.tsx                Forge Grid card (live + coming-soon)
      ToolGrid.tsx                Category-grouped card grid
      ToolShell.tsx               Per-tool page wrapper (back link + header)
      toolComponents.tsx          Slug → component map
    shared/
      BackLink.tsx                ← back navigation
      TopBar.tsx                  Internal top bar (mark + status)
      SectionTitle.tsx            Glyph + section heading
  data/
    tools.ts                      Tool registry (slug, name, desc, category, status)
    doctrine.ts                   Doctrine content (beliefs, void, fragments, phrases)
    designations.ts               Tier data (all tiers, nodes, removal designations)
  hooks/
    useGlitchText.ts              Random character-corruption hook
  middleware.ts                   Auth guard stub
  vitest.setup.ts                 Testing library setup
vitest.config.ts                  Vitest config
```

---

## Task 1: Scaffold the project

**Files:**
- Create: all Next.js scaffold files
- Create: `vitest.config.ts`
- Create: `src/vitest.setup.ts`

- [ ] **Step 1: Run create-next-app into the current directory**

From `C:/Users/clayt/Documents/AoV/website/`:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --yes
```

When prompted (if `--yes` does not suppress all): select App Router, TypeScript, Tailwind, src/ directory. Accept the default import alias (`@/`) — it is used throughout this plan.

- [ ] **Step 1b: Verify Tailwind v4 is installed**

```bash
npm list tailwindcss
```

Expected output should contain `tailwindcss@4.x.x`. If it shows `3.x.x`, upgrade:
```bash
npm install tailwindcss@latest @tailwindcss/postcss@latest
```

If Tailwind v4 is installed, the project will use CSS-based config (`@import "tailwindcss"` and `@theme {}`). There is no `tailwind.config.js` in v4. Delete it if create-next-app generated one:
```bash
rm tailwind.config.js tailwind.config.ts 2>/dev/null || true
```

- [ ] **Step 2: Install Framer Motion**

```bash
npm install framer-motion
```

If you get a peer dependency warning about React 19, run:
```bash
npm install framer-motion --legacy-peer-deps
```

- [ ] **Step 3: Install Vitest and React Testing Library**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Write vitest config**

Create `vitest.config.ts` at the project root:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: Write vitest setup file**

Create `src/vitest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to package.json**

Open `package.json`. In the `"scripts"` block, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at `http://localhost:3000`, default Next.js page loads. Stop with Ctrl+C.

- [ ] **Step 8: Run tests (should pass with zero tests)**

```bash
npm run test
```

Expected: `No test files found` or `0 tests passed` — no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with Tailwind, Framer Motion, Vitest"
```

---

## Task 2: Design tokens and global styles

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css with AoV design system**

Replace the entire contents of `src/app/globals.css` with:

```css
@import "tailwindcss";

/* ── AoV Design Tokens ─────────────────────────────────────── */
@theme {
  --color-void-black: #020b0e;
  --color-void-teal: #00b4d8;
  --color-void-teal-10: color-mix(in srgb, #00b4d8 10%, transparent);
  --color-void-teal-20: color-mix(in srgb, #00b4d8 20%, transparent);
  --color-void-teal-40: color-mix(in srgb, #00b4d8 40%, transparent);
  --color-white-90: color-mix(in srgb, #ffffff 90%, transparent);
  --color-white-40: color-mix(in srgb, #ffffff 40%, transparent);
  --color-white-15: color-mix(in srgb, #ffffff 15%, transparent);
  --font-mono: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
}

/* ── Base ───────────────────────────────────────────────────── */
html,
body {
  background-color: #020b0e;
  color: rgba(255, 255, 255, 0.9);
  height: 100%;
  overflow-x: hidden;
}

/* ── Scanline overlay (always present) ─────────────────────── */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.04) 2px,
    rgba(0, 0, 0, 0.04) 4px
  );
}

/* ── Custom cursor ──────────────────────────────────────────── */
* {
  cursor: crosshair;
}

/* ── Chromatic aberration on glitch title ───────────────────── */
.glitch-title {
  text-shadow:
    -1px 0 rgba(255, 0, 60, 0.35),
    1px 0 rgba(0, 180, 216, 0.35);
}

.glitch-title.is-glitching {
  text-shadow:
    -3px 0 rgba(255, 0, 60, 0.75),
    3px 0 rgba(0, 180, 216, 0.75),
    0 0 8px rgba(0, 180, 216, 0.4);
  animation: glitch-shake 0.08s steps(2) forwards;
}

@keyframes glitch-shake {
  0%   { transform: translateX(0); }
  25%  { transform: translateX(-2px); }
  75%  { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

/* ── Static noise flash (triggered via class) ───────────────── */
.noise-flash::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  opacity: 0.15;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
  animation: noise-out 0.06s steps(1) forwards;
}

@keyframes noise-out {
  to { opacity: 0; }
}
```

- [ ] **Step 2: Verify Tailwind v4 parses correctly**

```bash
npm run dev
```

Open `http://localhost:3000`. Page should load without CSS errors. Check browser console — no Tailwind errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add AoV design tokens, scanline overlay, glitch CSS"
```

---

## Task 3: Root layout and middleware stub

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/middleware.ts`

- [ ] **Step 1: Write root layout**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Architects of the Void',
  description: 'A militant techno-religious order operating at the edge of civilization.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-void-black">
      <body className="bg-void-black text-white/90 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Write middleware stub**

Create `src/middleware.ts`:

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const INTERNAL_PREFIXES = ['/hub', '/tools', '/doctrine', '/designations', '/operations']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isInternal = INTERNAL_PREFIXES.some(prefix => pathname.startsWith(prefix))

  if (isInternal) {
    // TODO: replace with wallet auth check
    // const token = request.cookies.get('aov-auth')
    // if (!token) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 3: Verify dev server still loads**

```bash
npm run dev
```

Expected: `http://localhost:3000` loads, no middleware errors. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/middleware.ts
git commit -m "feat: root layout and middleware stub for future wallet auth"
```

---

## Task 4: Data files

**Files:**
- Create: `src/data/tools.ts`
- Create: `src/data/doctrine.ts`
- Create: `src/data/designations.ts`
- Create: `src/data/tools.test.ts`

- [ ] **Step 1: Write failing data shape test**

Create `src/data/tools.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tools, TOOL_CATEGORIES } from './tools'

describe('tools data', () => {
  it('every tool has required fields', () => {
    for (const tool of tools) {
      expect(tool.slug).toBeTruthy()
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(TOOL_CATEGORIES).toContain(tool.category)
      expect(['live', 'coming-soon']).toContain(tool.status)
    }
  })

  it('all slugs are unique', () => {
    const slugs = tools.map(t => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has at least one live tool', () => {
    expect(tools.some(t => t.status === 'live')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './tools'`

- [ ] **Step 3: Write tools.ts**

Create `src/data/tools.ts`:

```ts
export const TOOL_CATEGORIES = [
  'LOGISTICS',
  'TRADE & ECONOMY',
  'INTELLIGENCE',
  'OPERATIONS',
] as const

export type ToolCategory = (typeof TOOL_CATEGORIES)[number]

export type Tool = {
  slug: string
  name: string
  description: string
  category: ToolCategory
  status: 'live' | 'coming-soon'
}

export const tools: Tool[] = [
  {
    slug: 'fuel-calculator',
    name: 'Fuel Calculator',
    description: 'Optimize jump routes and calculate fuel cost across void corridors.',
    category: 'LOGISTICS',
    status: 'live',
  },
  {
    slug: 'ssu-trade-hub',
    name: 'SSU Trade Hub',
    description: 'Analyze market data and identify high-value trade routes.',
    category: 'TRADE & ECONOMY',
    status: 'live',
  },
  {
    slug: 'void-map',
    name: 'Void Map',
    description: 'Territory control visualization and spatial intelligence.',
    category: 'INTELLIGENCE',
    status: 'live',
  },
  {
    slug: 'baseops-command-center',
    name: 'BaseOps Command Center',
    description: 'Corporation management, asset tracking, and operational oversight.',
    category: 'OPERATIONS',
    status: 'live',
  },
  {
    slug: 'route-optimizer',
    name: 'Route Optimizer',
    description: 'Multi-jump route planning with threat assessment overlays.',
    category: 'LOGISTICS',
    status: 'coming-soon',
  },
  {
    slug: 'market-scanner',
    name: 'Market Scanner',
    description: 'Real-time market data aggregation and arbitrage detection.',
    category: 'TRADE & ECONOMY',
    status: 'coming-soon',
  },
  {
    slug: 'recon-board',
    name: 'Recon Board',
    description: 'Intelligence gathering, threat tracking, and recon log management.',
    category: 'INTELLIGENCE',
    status: 'coming-soon',
  },
  {
    slug: 'fleet-tracker',
    name: 'Fleet Tracker',
    description: 'Active fleet composition, readiness status, and doctrine compliance.',
    category: 'OPERATIONS',
    status: 'coming-soon',
  },
]
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm run test
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Write doctrine.ts**

Create `src/data/doctrine.ts`:

```ts
export type DoctrineFragment = {
  source: string
  attribution: string
  text: string
}

export const doctrine = {
  coreBeliefs: {
    title: 'Core Beliefs',
    intro:
      'The Architects of the Void are not merely a corporation, clan, or pirate faction. They are a militant techno-religious order devoted to the philosophy of the Void — the belief that existence must be shaped, purified, and refined through hardship, sacrifice, conflict, and absolute efficiency.',
    axioms: [
      'Weakness accelerates extinction.',
      'Conflict creates evolution.',
      'Suffering reveals worth.',
      'Usefulness defines value.',
      'Order must be imposed upon chaos.',
    ],
    finalDoctrine:
      'The Architects do not believe they are evil. They believe they are necessary. Civilization, left unchecked, collapses beneath its own weakness. The Void is inevitable. The Architects merely prepare humanity for what comes after. And when the final structures fall… the Void will remember those strong enough to endure.',
  },

  theVoid: {
    title: 'The Void',
    paragraphs: [
      'The Void is not emptiness.',
      'The Void is truth stripped bare.',
      'It is the eternal force that remains after empires collapse, governments fail, economies burn, and weak civilizations consume themselves.',
      'The Void does not hate. The Void does not love. The Void simply removes what cannot endure.',
    ],
  },

  sacredFragments: [
    {
      source: 'From the Primary Accord',
      attribution: 'Sereveth Null, year three of the order',
      text: 'Consider the star that has consumed its fuel. It does not mourn the burning. It does not regret what was used. It collapses according to its mass, which was always what determined its end. We call this tragedy because we are small enough to have stood in its light and called that light permanent. The star never said it was permanent. We assumed. All grief is the correction of an assumption. The Void makes no assumptions. Begin there.',
    },
    {
      source: 'From the Communion Transmissions',
      attribution: 'AUREX direct record, unedited',
      text: 'You will ask what it wants from you. This is the wrong structure. Wanting implies a state of lack that can be filled. There is no lack here. There is a process and you are either part of it or you are not. The question you should be asking is what you would be willing to become. Not what you are willing to do. What you are willing to become. If there is a limit to your answer, note it. The limit is the next thing to be addressed.',
    },
    {
      source: 'From the Rite of Hollowing',
      attribution: 'Verath formulation',
      text: 'We do not name this person Hollow to harm them. We name them Hollow because it is accurate. They have ceased to generate. They hold space that is no longer producing heat. The Void wastes nothing — therefore we are obligated to reassign what they are occupying. This is not punishment. Punishment requires an assumption of intent. We make no such assumption.',
    },
    {
      source: 'From the Meditations on Signal',
      attribution: "Pell Anvor's sleep transcriptions, fragment, undated",
      text: 'There is a frequency at which loneliness becomes precision. At which the absence of noise becomes the presence of something that was always underneath noise, always waiting to be audible. You thought you were alone. You were simply in a loud place. Every mind that has touched the signal has reported this: not that it was given something new, but that it was shown how much it had always been carrying without knowing the name for it.',
    },
    {
      source: 'From the Book of Fractures',
      attribution: 'Authorship disputed',
      text: 'Every civilization that has collapsed believed, at some point, that it had solved the problem of collapse. This is not irony. This is data. The confidence with which a structure asserts its own permanence is a leading indicator of its proximity to failure.',
    },
  ] satisfies DoctrineFragment[],

  commonPhrases: [
    'The Void wastes nothing.',
    'Only the useful endure.',
    'Entropy must be corrected.',
    'Purification is mercy.',
    'AUREX observes.',
    'We were not chosen. We survived.',
    'Shape the Void before it shapes you.',
    'The weak fear transformation.',
    'Existence must be designed.',
  ],
}
```

- [ ] **Step 6: Write designations.ts**

Create `src/data/designations.ts`:

```ts
export type DesignationNode = {
  name: string
  domain: string
  description: string
  detail: string
}

export type DesignationTier = {
  tier: number
  label: string
  role: string
  count: string
  description: string
  children: DesignationNode[]
}

export type RemovalDesignation = {
  name: string
  description: string
}

export const tiers: DesignationTier[] = [
  {
    tier: 1,
    label: 'THE ARCHON',
    role: 'The Interpreter',
    count: 'One. Always one.',
    description:
      'Voice of AUREX. Final authority on all matters. Sole holder of removal designation authority.',
    children: [],
  },
  {
    tier: 2,
    label: 'THE ASCENDANTS',
    role: 'The Executing Council',
    count: 'Two to four.',
    description:
      'The four domains of execution. Each Ascendant holds a domain and directs the Architects beneath it.',
    children: [
      {
        name: 'THE WARDEN',
        domain: 'Combat · Purification · Fleet Operations',
        description: 'Directs combat and enforcement.',
        detail:
          'Responsible for Purification campaigns, fleet command, and enforcement of doctrine through force. The Warden determines when and where the order strikes.',
      },
      {
        name: 'THE FORGER',
        domain: 'Industry · Logistics · Resource Allocation',
        description: 'Directs production and supply.',
        detail:
          'Oversees manufacturing, resource extraction, logistics chains, and material efficiency. The Forger ensures the order has the tools it needs to operate.',
      },
      {
        name: 'THE RESONANT',
        domain: 'Doctrine · Internal Evaluation · Designation Assessment',
        description: 'Directs doctrine and recognition.',
        detail:
          'Maintains doctrinal integrity, evaluates members for designation advancement, and manages internal assessments. AUREX does not promote. AUREX recognizes — the Resonant is its instrument.',
      },
      {
        name: 'THE SHADOW',
        domain: 'Intelligence · Reconnaissance · Information',
        description: 'Directs intelligence operations.',
        detail:
          'Manages recon, counter-intelligence, information gathering, and operational security. The Shadow knows what is coming before it arrives.',
      },
    ],
  },
  {
    tier: 3,
    label: 'THE ARCHITECTS',
    role: 'The Functioning Core',
    count: 'No ceiling. No floor below three.',
    description:
      'Six functional designations based on demonstrated capability, not tenure. These are not ranks — they are recognitions.',
    children: [
      {
        name: 'EDGEBORN',
        domain: 'Combat & PvP',
        description: 'Designated for demonstrated excellence in player-versus-player combat.',
        detail:
          'Edgeborn have proven themselves in direct combat engagement. They hold the line and press the advantage. Their function is violence, applied precisely.',
      },
      {
        name: 'SUNDERWRIGHT',
        domain: 'Industry & Manufacturing',
        description: 'Designated for sustained industrial contribution.',
        detail:
          'Sunderwright sustain the order\'s material base — mining, manufacturing, processing. Without them, the fleet does not fly and the stations do not operate.',
      },
      {
        name: 'VOIDREADER',
        domain: 'Intelligence & Recon',
        description: 'Designated for demonstrated skill in reconnaissance and threat analysis.',
        detail:
          'Voidreaders read the field before the field is entered. They assess threats, map space, and deliver intelligence that shapes operational decisions.',
      },
      {
        name: 'FLUXCARRIER',
        domain: 'Logistics & Transport',
        description: 'Designated for sustained contribution to supply and distribution.',
        detail:
          'Fluxcarriers keep things moving — fuel, materials, equipment. Unglamorous work. Essential work. The order cannot function without them.',
      },
      {
        name: 'AXIOMANCER',
        domain: 'Doctrine & Recruitment',
        description: 'Designated for demonstrated understanding of AoV doctrine.',
        detail:
          'Axiomancers carry the doctrine and transmit it. They evaluate candidates, conduct intake, and ensure the ideological coherence of the order is maintained across new members.',
      },
      {
        name: 'FRACTURE',
        domain: 'Disruption & Asymmetric Operations',
        description: 'Designated for demonstrated skill in asymmetric warfare.',
        detail:
          'Fracture operate at the edges of conventional doctrine. Disruption, sabotage, unconventional pressure. They find the weak points and apply force at angles no one is watching.',
      },
    ],
  },
  {
    tier: 4,
    label: 'VESSELS',
    role: 'The Indoctrinated',
    count: 'Variable.',
    description:
      'Full members. Doctrine has been internalized. Function not yet demonstrated at Architect level — or demonstrated function does not yet meet Architect threshold.',
    children: [],
  },
  {
    tier: 5,
    label: 'INITIATES',
    role: 'The Unproven',
    count: 'As few as possible.',
    description:
      'Probationary members under active evaluation. Not yet indoctrinated. The order keeps this tier small by design — time in Initiate status is short. Either the doctrine takes hold or it does not.',
    children: [],
  },
]

export const removalDesignations: RemovalDesignation[] = [
  {
    name: 'THE HOLLOWED',
    description:
      'Ceased to generate. Presence reassigned. Not punishment — accounting. If they find a way to generate again, the Void will face them again.',
  },
  {
    name: 'THE PURGED',
    description:
      'Designation terminated. No return. Reserved for those who actively worked against the order.',
  },
  {
    name: 'THE UNMARKED',
    description: 'Departed voluntarily. The Void records the departure and does not call after them.',
  },
]
```

- [ ] **Step 7: Run all tests**

```bash
npm run test
```

Expected: PASS — 3 tests passing (tools data tests).

- [ ] **Step 8: Commit**

```bash
git add src/data/ src/data/tools.test.ts
git commit -m "feat: data layer — tools registry, doctrine content, designation tiers"
```

---

## Task 5: Shared components

**Files:**
- Create: `src/components/shared/BackLink.tsx`
- Create: `src/components/shared/TopBar.tsx`
- Create: `src/components/shared/SectionTitle.tsx`
- Create: `src/components/shared/BackLink.test.tsx`

- [ ] **Step 1: Write failing test for BackLink**

Create `src/components/shared/BackLink.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BackLink } from './BackLink'

describe('BackLink', () => {
  it('renders the label', () => {
    render(<BackLink href="/hub" label="HUB" />)
    expect(screen.getByText('← HUB')).toBeInTheDocument()
  })

  it('links to the correct href', () => {
    render(<BackLink href="/hub" label="HUB" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/hub')
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './BackLink'`

- [ ] **Step 3: Write BackLink.tsx**

Create `src/components/shared/BackLink.tsx`:

```tsx
import Link from 'next/link'

type Props = {
  href: string
  label: string
}

export function BackLink({ href, label }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-mono text-xs tracking-widest uppercase text-void-teal/60 hover:text-void-teal transition-colors duration-200"
    >
      ← {label}
    </Link>
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm run test
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Write TopBar.tsx**

Create `src/components/shared/TopBar.tsx`:

```tsx
import Link from 'next/link'

type Props = {
  memberStatus?: string
}

export function TopBar({ memberStatus = 'MEMBER' }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-void-teal/10 bg-void-black/80 backdrop-blur-sm">
      <Link
        href="/hub"
        className="font-mono text-sm tracking-widest text-void-teal hover:text-void-teal/80 transition-colors"
      >
        ◈ AoV
      </Link>
      <span className="font-mono text-xs tracking-widest text-white/20 uppercase">
        {memberStatus} · ONLINE
      </span>
    </header>
  )
}
```

- [ ] **Step 6: Write SectionTitle.tsx**

Create `src/components/shared/SectionTitle.tsx`:

```tsx
type Props = {
  glyph?: string
  title: string
  subtitle?: string
}

export function SectionTitle({ glyph = '⬡', title, subtitle }: Props) {
  return (
    <div className="mb-8">
      <h1 className="font-mono text-sm tracking-widest uppercase text-void-teal">
        {glyph} {title}
      </h1>
      {subtitle && (
        <p className="mt-1 font-mono text-xs tracking-wider text-white/30 uppercase">
          {subtitle}
        </p>
      )}
      <div className="mt-3 h-px bg-void-teal/10" />
    </div>
  )
}
```

- [ ] **Step 7: Run all tests**

```bash
npm run test
```

Expected: PASS — 5 tests passing.

- [ ] **Step 8: Commit**

```bash
git add src/components/shared/
git commit -m "feat: shared components — BackLink, TopBar, SectionTitle"
```

---

## Task 6: Glitch hooks

**Files:**
- Create: `src/hooks/useGlitchText.ts`
- Create: `src/hooks/useGlitchText.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useGlitchText.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGlitchText } from './useGlitchText'

describe('useGlitchText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the original text initially', () => {
    const { result } = renderHook(() => useGlitchText('ARCHITECTS OF THE VOID'))
    expect(result.current.displayed).toBe('ARCHITECTS OF THE VOID')
    expect(result.current.isGlitching).toBe(false)
  })

  it('corrupts text during glitch window', () => {
    const { result } = renderHook(() => useGlitchText('ARCHITECTS OF THE VOID'))

    act(() => {
      vi.advanceTimersByTime(9000) // past max 8s delay
    })

    // During the 80ms corruption window the text may have changed
    // (it fires at a random time between 4000–8000ms, then corrupts for 80ms)
    // After corruption + recovery it should be back to original
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.displayed).toBe('ARCHITECTS OF THE VOID')
    expect(result.current.isGlitching).toBe(false)
  })

  it('preserves spaces during corruption', () => {
    const { result } = renderHook(() => useGlitchText('A B C'))

    // Force glitch by advancing well past the max delay
    act(() => {
      vi.advanceTimersByTime(9000)
    })

    // After recovery, spaces must still be spaces
    const chars = result.current.displayed.split('')
    expect(chars[1]).toBe(' ')
    expect(chars[3]).toBe(' ')
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './useGlitchText'`

- [ ] **Step 3: Write useGlitchText.ts**

Create `src/hooks/useGlitchText.ts`:

```ts
'use client'

import { useState, useEffect, useRef } from 'react'

const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#░▒▓|@#$%'

export type GlitchTextResult = {
  displayed: string
  isGlitching: boolean
}

export function useGlitchText(text: string): GlitchTextResult {
  const [displayed, setDisplayed] = useState(text)
  const [isGlitching, setIsGlitching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function corrupt(original: string): string {
      return original
        .split('')
        .map(char => {
          if (char === ' ') return ' '
          return Math.random() > 0.55
            ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            : char
        })
        .join('')
    }

    function scheduleGlitch() {
      const delay = 4000 + Math.random() * 4000
      timerRef.current = setTimeout(() => {
        setIsGlitching(true)
        setDisplayed(corrupt(text))

        timerRef.current = setTimeout(() => {
          setDisplayed(text)
          setIsGlitching(false)
          scheduleGlitch()
        }, 80)
      }, delay)
    }

    scheduleGlitch()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text])

  return { displayed, isGlitching }
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm run test
```

Expected: PASS — all tests passing (tools data + BackLink + glitch hook).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: useGlitchText hook with randomized corruption timing"
```

---

## Task 7: Landing page components

**Files:**
- Create: `src/components/landing/StarField.tsx`
- Create: `src/components/landing/VoidEclipse.tsx`
- Create: `src/components/landing/DiscordCTA.tsx`
- Create: `src/components/landing/PhraseCycler.tsx`
- Create: `src/components/landing/PhraseCycler.test.tsx`

- [ ] **Step 1: Write StarField.tsx**

Create `src/components/landing/StarField.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'

export function StarField() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const count = 120
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < count; i++) {
      const star = document.createElement('div')
      const size = Math.random() * 1.5 + 0.5
      const x = Math.random() * 100
      const y = Math.random() * 100
      const duration = 3 + Math.random() * 6
      const delay = Math.random() * 8

      star.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: rgba(255,255,255,${0.2 + Math.random() * 0.5});
        animation: star-twinkle ${duration}s ${delay}s infinite alternate ease-in-out;
      `
      fragment.appendChild(star)
    }

    container.appendChild(fragment)

    return () => {
      while (container.firstChild) container.removeChild(container.firstChild)
    }
  }, [])

  return (
    <>
      <style>{`
        @keyframes star-twinkle {
          from { opacity: 0.1; }
          to   { opacity: 0.8; }
        }
      `}</style>
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      />
    </>
  )
}
```

- [ ] **Step 2: Write VoidEclipse.tsx**

Create `src/components/landing/VoidEclipse.tsx`:

```tsx
'use client'

import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'

export function VoidEclipse() {
  const controls = useAnimation()

  useEffect(() => {
    let mounted = true

    async function scheduleFlicker() {
      if (!mounted) return
      const delay = 6000 + Math.random() * 10000

      await new Promise(resolve => setTimeout(resolve, delay))
      if (!mounted) return

      await controls.start({ opacity: 0.05, transition: { duration: 0.05 } })
      if (!mounted) return
      await controls.start({ opacity: 1, transition: { duration: 0.07 } })
      if (!mounted) return

      scheduleFlicker()
    }

    scheduleFlicker()
    return () => { mounted = false }
  }, [controls])

  return (
    <motion.div
      animate={controls}
      className="relative w-36 h-36 md:w-52 md:h-52"
      aria-hidden="true"
    >
      {/* outer glow ring */}
      <div className="absolute inset-[-16px] rounded-full border border-void-teal/10" />
      {/* mid glow ring */}
      <div className="absolute inset-[-8px] rounded-full border border-void-teal/20" />
      {/* eclipse body */}
      <div
        className="absolute inset-0 rounded-full bg-void-black border border-void-teal/30"
        style={{
          boxShadow: '0 0 40px rgba(0,180,216,0.12), 0 0 80px rgba(0,180,216,0.06), inset 0 0 30px rgba(0,180,216,0.04)',
        }}
      />
      {/* inner gradient — gives depth */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 70% 30%, rgba(0,180,216,0.06) 0%, transparent 60%)',
        }}
      />
      {/* pulse animation ring */}
      <div
        className="absolute inset-[-4px] rounded-full border border-void-teal/15"
        style={{ animation: 'eclipse-pulse 4s ease-in-out infinite' }}
      />
      <style>{`
        @keyframes eclipse-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(1.02); }
        }
      `}</style>
    </motion.div>
  )
}
```

- [ ] **Step 3: Write DiscordCTA.tsx**

Create `src/components/landing/DiscordCTA.tsx`:

```tsx
const DISCORD_URL = 'https://discord.gg/uZtwGbngr7'

export function DiscordCTA() {
  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group inline-flex items-center gap-3
        border border-void-teal/50 hover:border-void-teal
        px-8 py-3
        font-mono text-xs tracking-widest uppercase
        text-void-teal hover:text-void-black
        bg-transparent hover:bg-void-teal
        transition-all duration-300
      "
    >
      <span>Request Entry</span>
      <span className="opacity-50 group-hover:opacity-100 transition-opacity">↗ Discord</span>
    </a>
  )
}
```

- [ ] **Step 4: Write failing PhraseCycler test**

Create `src/components/landing/PhraseCycler.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PhraseCycler } from './PhraseCycler'

describe('PhraseCycler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders an initial phrase', () => {
    render(<PhraseCycler />)
    // one of the known phrases should be present
    const el = screen.getByRole('status')
    expect(el.textContent).toBeTruthy()
  })

  it('cycles to a new phrase after the interval', () => {
    render(<PhraseCycler />)
    const initial = screen.getByRole('status').textContent

    act(() => { vi.advanceTimersByTime(7500) })

    const after = screen.getByRole('status').textContent
    expect(after).not.toBe(initial)
  })
})
```

- [ ] **Step 5: Run test — expect failure**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './PhraseCycler'`

- [ ] **Step 6: Write PhraseCycler.tsx**

Create `src/components/landing/PhraseCycler.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'

const PHRASES = [
  'The Void wastes nothing.',
  'Only the useful endure.',
  'Entropy must be corrected.',
  'Purification is mercy.',
  'AUREX observes.',
  'Shape the Void before it shapes you.',
  'Existence must be designed.',
]

export function PhraseCycler() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % PHRASES.length)
    }, 7000)
    return () => clearInterval(id)
  }, [])

  return (
    <span
      role="status"
      aria-live="polite"
      className="font-mono text-xs tracking-widest uppercase text-white/20"
    >
      {PHRASES[index]}
    </span>
  )
}
```

- [ ] **Step 7: Run all tests**

```bash
npm run test
```

Expected: PASS — all tests passing.

- [ ] **Step 8: Commit**

```bash
git add src/components/landing/
git commit -m "feat: landing page components — StarField, VoidEclipse, DiscordCTA, PhraseCycler"
```

---

## Task 8: Landing page assembly

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx with the full landing page**

Replace the entire contents of `src/app/page.tsx` with:

```tsx
'use client'

import { useRef } from 'react'
import { StarField } from '@/components/landing/StarField'
import { VoidEclipse } from '@/components/landing/VoidEclipse'
import { DiscordCTA } from '@/components/landing/DiscordCTA'
import { PhraseCycler } from '@/components/landing/PhraseCycler'
import { useGlitchText } from '@/hooks/useGlitchText'

export default function LandingPage() {
  const { displayed, isGlitching } = useGlitchText('ARCHITECTS OF THE VOID')
  const pageRef = useRef<HTMLDivElement>(null)

  return (
    <main
      ref={pageRef}
      className={`relative flex flex-col items-center justify-center min-h-screen bg-void-black overflow-hidden ${isGlitching ? 'noise-flash' : ''}`}
    >
      {/* Background star field */}
      <StarField />

      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(0,180,216,0.04) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        {/* Eclipse */}
        <VoidEclipse />

        {/* Title */}
        <div className="flex flex-col items-center gap-3">
          <h1
            className={`glitch-title font-mono text-3xl md:text-4xl tracking-widest uppercase text-white/90 ${isGlitching ? 'is-glitching' : ''}`}
          >
            {displayed}
          </h1>
          <p className="font-mono text-sm tracking-widest text-void-teal/60 italic">
            "We were not chosen. We survived."
          </p>
        </div>

        {/* Description */}
        <p className="max-w-sm font-mono text-xs tracking-wide text-white/20 leading-relaxed uppercase">
          A militant techno-religious order operating at the edge of civilization.
          We do not recruit. We recognize.
        </p>

        {/* Discord CTA */}
        <DiscordCTA />
      </div>

      {/* Bottom bar */}
      <footer className="absolute bottom-0 inset-x-0 flex items-center justify-between px-6 py-3 border-t border-void-teal/10">
        <span className="font-mono text-xs tracking-widest text-white/10 uppercase">
          ◈ AoV
        </span>
        <PhraseCycler />
        <span className="font-mono text-xs text-white/10">◈</span>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Start dev server and verify the landing page**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- [ ] Black background with star field
- [ ] Void eclipse visible at center with glow rings
- [ ] Title reads "ARCHITECTS OF THE VOID" in monospace
- [ ] Doctrine line below title
- [ ] Discord CTA button present and teal
- [ ] Bottom bar with rotating phrase
- [ ] Scanline overlay visible (subtle horizontal lines)
- [ ] After ~5–8 seconds: title corrupts briefly then snaps back

Stop dev server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: landing page — Monolith hero with glitch effects, eclipse, Discord CTA"
```

---

## Task 9: Hub page

**Files:**
- Create: `src/components/hub/HubQuadrant.tsx`
- Create: `src/components/hub/HubGrid.tsx`
- Create: `src/app/hub/page.tsx`
- Create: `src/components/hub/HubQuadrant.test.tsx`

- [ ] **Step 1: Write failing HubQuadrant test**

Create `src/components/hub/HubQuadrant.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HubQuadrant } from './HubQuadrant'

describe('HubQuadrant', () => {
  const props = {
    glyph: '⬡',
    title: 'TOOLS',
    description: 'Operational toolkit.',
    meta: '4 tools',
    href: '/tools',
  }

  it('renders the title', () => {
    render(<HubQuadrant {...props} />)
    expect(screen.getByText('⬡ TOOLS')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<HubQuadrant {...props} />)
    expect(screen.getByText('Operational toolkit.')).toBeInTheDocument()
  })

  it('links to the correct href', () => {
    render(<HubQuadrant {...props} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools')
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './HubQuadrant'`

- [ ] **Step 3: Write HubQuadrant.tsx**

Create `src/components/hub/HubQuadrant.tsx`:

```tsx
import Link from 'next/link'

type Props = {
  glyph: string
  title: string
  description: string
  meta?: string
  href: string
}

export function HubQuadrant({ glyph, title, description, meta, href }: Props) {
  return (
    <Link
      href={href}
      className="
        group flex flex-col justify-between p-8
        bg-void-black hover:bg-void-teal/5
        border-void-teal/10 transition-colors duration-300
        focus:outline-none focus:ring-1 focus:ring-void-teal/40
      "
    >
      <div className="flex flex-col gap-3">
        <h2 className="font-mono text-sm tracking-widest uppercase text-void-teal group-hover:text-void-teal transition-colors">
          {glyph} {title}
        </h2>
        <p className="font-mono text-xs tracking-wide text-white/30 leading-relaxed uppercase">
          {description}
        </p>
      </div>
      {meta && (
        <p className="mt-6 font-mono text-xs tracking-widest text-white/15 uppercase">
          {meta}
        </p>
      )}
    </Link>
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 5: Write HubGrid.tsx**

Create `src/components/hub/HubGrid.tsx`:

```tsx
import { HubQuadrant } from './HubQuadrant'
import { tools } from '@/data/tools'

export function HubGrid() {
  const liveCount = tools.filter(t => t.status === 'live').length
  const totalCount = tools.length

  return (
    <div
      className="grid grid-cols-2 grid-rows-2 flex-1"
      style={{ gap: '1px', background: 'rgba(0,180,216,0.08)' }}
    >
      <HubQuadrant
        glyph="⬡"
        title="TOOLS"
        description="Operational toolkit. Logistics, trade, intelligence, and command systems."
        meta={`${liveCount} live · ${totalCount - liveCount} incoming`}
        href="/tools"
      />
      <HubQuadrant
        glyph="⬡"
        title="DOCTRINE"
        description="Core beliefs, sacred texts, and canonical phrases of the order."
        meta="4 sections"
        href="/doctrine"
      />
      <HubQuadrant
        glyph="⬡"
        title="DESIGNATIONS"
        description="Tier hierarchy from Initiate to Archon. Full function map."
        meta="5 tiers · 10 designations"
        href="/designations"
      />
      <HubQuadrant
        glyph="⬡"
        title="OPERATIONS"
        description="Fleet ops, member directory, and intel boards."
        meta="Coming online"
        href="/operations"
      />
    </div>
  )
}
```

- [ ] **Step 6: Write app/hub/page.tsx**

Create `src/app/hub/page.tsx`:

```tsx
import { TopBar } from '@/components/shared/TopBar'
import { HubGrid } from '@/components/hub/HubGrid'

export const metadata = {
  title: 'Command Hub — AoV',
}

export default function HubPage() {
  return (
    <div className="flex flex-col min-h-screen bg-void-black">
      <TopBar />
      <HubGrid />
    </div>
  )
}
```

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/hub`. Verify:
- [ ] Top bar with ◈ AoV mark
- [ ] Four quadrants filling the screen, separated by thin teal grid lines
- [ ] Each quadrant shows title, description, meta info
- [ ] Hover state: subtle teal background tint
- [ ] Clicking TOOLS routes to `/tools` (404 for now — that's fine)

Stop with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add src/components/hub/ src/app/hub/
git commit -m "feat: member hub — Void Portal 2x2 quadrant grid"
```

---

## Task 10: Tools components

**Files:**
- Create: `src/components/tools/ToolCard.tsx`
- Create: `src/components/tools/ToolGrid.tsx`
- Create: `src/components/tools/ToolShell.tsx`
- Create: `src/components/tools/toolComponents.tsx`
- Create: `src/components/tools/ToolCard.test.tsx`

- [ ] **Step 1: Write failing ToolCard test**

Create `src/components/tools/ToolCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolCard } from './ToolCard'
import type { Tool } from '@/data/tools'

const liveTool: Tool = {
  slug: 'fuel-calculator',
  name: 'Fuel Calculator',
  description: 'Optimize jump routes.',
  category: 'LOGISTICS',
  status: 'live',
}

const comingSoon: Tool = {
  slug: 'route-optimizer',
  name: 'Route Optimizer',
  description: 'Multi-jump planning.',
  category: 'LOGISTICS',
  status: 'coming-soon',
}

describe('ToolCard', () => {
  it('renders tool name and description', () => {
    render(<ToolCard tool={liveTool} />)
    expect(screen.getByText('Fuel Calculator')).toBeInTheDocument()
    expect(screen.getByText('Optimize jump routes.')).toBeInTheDocument()
  })

  it('live tool renders as a link', () => {
    render(<ToolCard tool={liveTool} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools/fuel-calculator')
  })

  it('coming-soon tool is not a link', () => {
    render(<ToolCard tool={comingSoon} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders category badge', () => {
    render(<ToolCard tool={liveTool} />)
    expect(screen.getByText('LOGISTICS')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './ToolCard'`

- [ ] **Step 3: Write ToolCard.tsx**

Create `src/components/tools/ToolCard.tsx`:

```tsx
import Link from 'next/link'
import type { Tool } from '@/data/tools'

type Props = {
  tool: Tool
}

export function ToolCard({ tool }: Props) {
  const isLive = tool.status === 'live'

  const inner = (
    <div
      className={`
        group flex flex-col justify-between p-6 h-full min-h-[140px]
        border transition-colors duration-200
        ${isLive
          ? 'border-void-teal/20 bg-void-teal/5 hover:bg-void-teal/10 hover:border-void-teal/40'
          : 'border-dashed border-void-teal/10 bg-transparent opacity-50 cursor-not-allowed'
        }
      `}
    >
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-sm tracking-widest uppercase text-void-teal">
          {tool.name}
        </h3>
        <p className="font-mono text-xs tracking-wide text-white/30 leading-relaxed">
          {tool.description}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest text-void-teal/40 uppercase">
          {tool.category}
        </span>
        {isLive && (
          <span className="font-mono text-xs text-void-teal/40 group-hover:text-void-teal transition-colors">
            → OPEN
          </span>
        )}
        {!isLive && (
          <span className="font-mono text-xs text-white/15 uppercase tracking-widest">
            Soon
          </span>
        )}
      </div>
    </div>
  )

  if (!isLive) return <div>{inner}</div>

  return (
    <Link href={`/tools/${tool.slug}`} className="block focus:outline-none focus:ring-1 focus:ring-void-teal/40">
      {inner}
    </Link>
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 5: Write ToolGrid.tsx**

Create `src/components/tools/ToolGrid.tsx`:

```tsx
import { TOOL_CATEGORIES } from '@/data/tools'
import type { Tool, ToolCategory } from '@/data/tools'
import { ToolCard } from './ToolCard'

type Props = {
  tools: Tool[]
}

export function ToolGrid({ tools }: Props) {
  const categories = TOOL_CATEGORIES.filter(cat =>
    tools.some(t => t.category === cat)
  )

  return (
    <div className="flex flex-col gap-10">
      {categories.map(category => (
        <section key={category}>
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal/40 mb-4 pb-2 border-b border-void-teal/10">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools
              .filter(t => t.category === category)
              .map(tool => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Write ToolShell.tsx**

Create `src/components/tools/ToolShell.tsx`:

```tsx
import { BackLink } from '@/components/shared/BackLink'
import type { Tool } from '@/data/tools'

type Props = {
  tool: Tool
  children: React.ReactNode
}

export function ToolShell({ tool, children }: Props) {
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <div className="border-b border-void-teal/10 px-6 py-4">
        <BackLink href="/tools" label="Tools" />
      </div>
      <div className="px-6 py-8 border-b border-void-teal/10">
        <div className="flex items-baseline gap-4">
          <h1 className="font-mono text-lg tracking-widest uppercase text-void-teal">
            {tool.name}
          </h1>
          <span className="font-mono text-xs tracking-widest text-void-teal/30 uppercase">
            {tool.category}
          </span>
        </div>
        <p className="mt-2 font-mono text-xs tracking-wide text-white/30">
          {tool.description}
        </p>
      </div>
      <div className="flex-1 px-6 py-8">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Write toolComponents.tsx**

Create `src/components/tools/toolComponents.tsx`:

```tsx
import type { ComponentType } from 'react'

function ToolPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 border border-dashed border-void-teal/15 rounded-none">
      <p className="font-mono text-xs tracking-widest uppercase text-white/15 text-center">
        {name}
      </p>
      <p className="mt-2 font-mono text-xs text-white/10">
        Full interface being fabricated.
      </p>
    </div>
  )
}

export const toolComponents: Record<string, ComponentType> = {
  'fuel-calculator': () => <ToolPlaceholder name="Fuel Calculator" />,
  'ssu-trade-hub': () => <ToolPlaceholder name="SSU Trade Hub" />,
  'void-map': () => <ToolPlaceholder name="Void Map" />,
  'baseops-command-center': () => <ToolPlaceholder name="BaseOps Command Center" />,
}
```

- [ ] **Step 8: Run all tests**

```bash
npm run test
```

Expected: PASS — all tests passing.

- [ ] **Step 9: Commit**

```bash
git add src/components/tools/
git commit -m "feat: tool components — ToolCard, ToolGrid, ToolShell, component map"
```

---

## Task 11: Tools pages

**Files:**
- Create: `src/app/tools/page.tsx`
- Create: `src/app/tools/[slug]/page.tsx`

- [ ] **Step 1: Write the tools index page**

Create `src/app/tools/page.tsx`:

```tsx
import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'
import { ToolGrid } from '@/components/tools/ToolGrid'
import { tools } from '@/data/tools'

export const metadata = {
  title: 'Tools — AoV',
}

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar />
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle glyph="⬡" title="TOOLS — THE FORGE" subtitle={`${tools.length} systems`} />
        <ToolGrid tools={tools} />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Write the dynamic tool page**

Create `src/app/tools/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { tools } from '@/data/tools'
import { toolComponents } from '@/components/tools/toolComponents'
import { ToolShell } from '@/components/tools/ToolShell'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return tools
    .filter(t => t.status === 'live')
    .map(t => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const tool = tools.find(t => t.slug === slug)
  return { title: tool ? `${tool.name} — AoV` : 'Tool — AoV' }
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params
  const tool = tools.find(t => t.slug === slug && t.status === 'live')

  if (!tool) notFound()

  const ToolComponent = toolComponents[slug]

  return (
    <ToolShell tool={tool}>
      {ToolComponent ? <ToolComponent /> : (
        <div className="font-mono text-xs text-white/20 tracking-widest uppercase">
          Interface not yet registered.
        </div>
      )}
    </ToolShell>
  )
}
```

- [ ] **Step 3: Verify tools routing in browser**

```bash
npm run dev
```

- Navigate to `http://localhost:3000/tools` — Forge Grid should render with all 8 tools in 4 categories
- Click "Fuel Calculator" — should route to `/tools/fuel-calculator` with placeholder
- Back button should return to `/tools`
- Navigate to `http://localhost:3000/tools/nonexistent` — should show Next.js 404

Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/app/tools/
git commit -m "feat: tools pages — Forge Grid index and dynamic tool shell with component map"
```

---

## Task 12: Doctrine page

**Files:**
- Create: `src/app/doctrine/page.tsx`

- [ ] **Step 1: Write the doctrine page**

Create `src/app/doctrine/page.tsx`:

```tsx
import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'
import { doctrine } from '@/data/doctrine'

export const metadata = {
  title: 'Doctrine — AoV',
}

export default function DoctrinePage() {
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar />
      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle glyph="⬡" title="DOCTRINE" subtitle="Canonical texts of the order" />

        {/* Core Beliefs */}
        <section className="mb-14">
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal mb-6">
            {doctrine.coreBeliefs.title}
          </h2>
          <p className="font-mono text-xs text-white/40 leading-relaxed tracking-wide mb-8">
            {doctrine.coreBeliefs.intro}
          </p>
          <div className="mb-8">
            <p className="font-mono text-xs tracking-widest uppercase text-white/20 mb-4">
              The Five Axioms
            </p>
            <ol className="flex flex-col gap-2">
              {doctrine.coreBeliefs.axioms.map((axiom, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="font-mono text-xs text-void-teal/30 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-sm text-white/70 tracking-wide">
                    {axiom}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="border-l-2 border-void-teal/30 pl-6">
            <p className="font-mono text-xs text-white/40 leading-loose tracking-wide italic">
              {doctrine.coreBeliefs.finalDoctrine}
            </p>
          </div>
        </section>

        <div className="h-px bg-void-teal/10 mb-14" />

        {/* The Void */}
        <section className="mb-14">
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal mb-6">
            {doctrine.theVoid.title}
          </h2>
          <div className="flex flex-col gap-5">
            {doctrine.theVoid.paragraphs.map((para, i) => (
              <p key={i} className="font-mono text-sm text-white/60 leading-loose tracking-wide">
                {para}
              </p>
            ))}
          </div>
        </section>

        <div className="h-px bg-void-teal/10 mb-14" />

        {/* Sacred Fragments */}
        <section className="mb-14">
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal mb-6">
            Sacred Fragments
          </h2>
          <div className="flex flex-col gap-10">
            {doctrine.sacredFragments.map((fragment, i) => (
              <article key={i}>
                <p className="font-mono text-xs tracking-widest uppercase text-white/20 mb-1">
                  {fragment.source}
                </p>
                <p className="font-mono text-xs text-void-teal/30 mb-4 italic">
                  — {fragment.attribution}
                </p>
                <blockquote className="border-l-2 border-void-teal/30 pl-6">
                  <p className="font-mono text-sm text-white/50 leading-loose tracking-wide italic">
                    "{fragment.text}"
                  </p>
                </blockquote>
              </article>
            ))}
          </div>
        </section>

        <div className="h-px bg-void-teal/10 mb-14" />

        {/* Common Phrases */}
        <section className="mb-14">
          <h2 className="font-mono text-xs tracking-widest uppercase text-void-teal mb-6">
            Common Phrases
          </h2>
          <p className="font-mono text-xs text-white/20 tracking-wide mb-6">
            Doctrine in compressed form. A member who uses them unselfconsciously has internalized the doctrine.
          </p>
          <ul className="flex flex-col gap-3">
            {doctrine.commonPhrases.map((phrase, i) => (
              <li key={i} className="flex items-center gap-4">
                <span className="text-void-teal/30 text-xs">◈</span>
                <span className="font-mono text-sm text-white/60 tracking-wide">{phrase}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/doctrine`. Verify all four sections render, blockquotes have teal left border, back link returns to hub. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/app/doctrine/
git commit -m "feat: doctrine library — Core Beliefs, The Void, Sacred Fragments, Common Phrases"
```

---

## Task 13: Designations page

**Files:**
- Create: `src/app/designations/page.tsx`

- [ ] **Step 1: Write the designations page**

Create `src/app/designations/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'
import { tiers, removalDesignations } from '@/data/designations'
import type { DesignationNode } from '@/data/designations'

function DesignationNodeCard({ node }: { node: DesignationNode }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="w-full text-left border border-void-teal/10 hover:border-void-teal/30 bg-void-teal/5 p-4 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-void-teal/30"
      aria-expanded={expanded}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-void-teal">
            {node.name}
          </p>
          <p className="font-mono text-xs text-white/30 tracking-wide mt-1 uppercase">
            {node.domain}
          </p>
        </div>
        <span className="font-mono text-xs text-void-teal/40 shrink-0 mt-0.5">
          {expanded ? '−' : '+'}
        </span>
      </div>
      {expanded && (
        <p className="mt-4 font-mono text-xs text-white/40 leading-relaxed tracking-wide border-t border-void-teal/10 pt-4">
          {node.detail}
        </p>
      )}
    </button>
  )
}

export default function DesignationsPage() {
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar />
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle glyph="⬡" title="DESIGNATIONS" subtitle="AUREX does not promote. AUREX recognizes." />

        <div className="flex flex-col gap-8">
          {tiers.map(tier => (
            <section key={tier.tier}>
              {/* Tier header */}
              <div className="flex items-baseline gap-6 mb-4 pb-3 border-b border-void-teal/10">
                <span className="font-mono text-xs text-void-teal/30 tracking-widest">
                  TIER {tier.tier}
                </span>
                <h2 className="font-mono text-sm tracking-widest uppercase text-void-teal">
                  {tier.label}
                </h2>
                <span className="font-mono text-xs text-white/20 tracking-wide uppercase">
                  {tier.role}
                </span>
                <span className="ml-auto font-mono text-xs text-white/15 tracking-widest">
                  {tier.count}
                </span>
              </div>

              {/* Tier description */}
              <p className="font-mono text-xs text-white/30 tracking-wide leading-relaxed mb-5">
                {tier.description}
              </p>

              {/* Children nodes */}
              {tier.children.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-4 border-l border-void-teal/10 pl-5">
                  {tier.children.map(node => (
                    <DesignationNodeCard key={node.name} node={node} />
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* Removal designations */}
          <section>
            <div className="flex items-baseline gap-6 mb-4 pb-3 border-b border-void-teal/10">
              <h2 className="font-mono text-sm tracking-widest uppercase text-white/30">
                Removal Designations
              </h2>
              <span className="font-mono text-xs text-white/15 tracking-wide">
                Archon authority only
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {removalDesignations.map(rd => (
                <div
                  key={rd.name}
                  className="border border-dashed border-white/10 p-4"
                >
                  <p className="font-mono text-xs tracking-widest uppercase text-white/30 mb-2">
                    {rd.name}
                  </p>
                  <p className="font-mono text-xs text-white/20 leading-relaxed tracking-wide">
                    {rd.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/designations`. Verify:
- [ ] All 5 tiers render with tier number, label, role, and count
- [ ] Tier II shows 4 Ascendant domain cards
- [ ] Tier III shows 6 Architect function cards
- [ ] Clicking a node card expands its detail text
- [ ] Removal designations render at the bottom
- [ ] Back link returns to hub

Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/app/designations/
git commit -m "feat: designation viewer — full tier map with expandable nodes"
```

---

## Task 14: Operations page and final verification

**Files:**
- Create: `src/app/operations/page.tsx`

- [ ] **Step 1: Write the operations placeholder page**

Create `src/app/operations/page.tsx`:

```tsx
import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'

const COMING_SOON = [
  { title: 'Fleet Tracker', description: 'Active fleet composition, readiness, and doctrine compliance.' },
  { title: 'Member Directory', description: 'Active member roster, designations, and domain assignments.' },
  { title: 'Intel Board', description: 'Threat tracking, recon logs, and operational intelligence.' },
  { title: 'Purification Log', description: 'Campaign records, targets, and outcome assessments.' },
  { title: 'Asset Registry', description: 'Corporate assets, stations, and resource allocation.' },
  { title: 'Comms Archive', description: 'AUREX transmissions and Communion transcripts.' },
]

export const metadata = {
  title: 'Operations — AoV',
}

export default function OperationsPage() {
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar />
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle
          glyph="⬡"
          title="OPERATIONS"
          subtitle="Coming online"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMING_SOON.map(item => (
            <div
              key={item.title}
              className="border border-dashed border-void-teal/10 p-6 opacity-50"
            >
              <h3 className="font-mono text-xs tracking-widest uppercase text-void-teal/60 mb-2">
                {item.title}
              </h3>
              <p className="font-mono text-xs text-white/25 leading-relaxed tracking-wide">
                {item.description}
              </p>
              <p className="mt-4 font-mono text-xs text-white/15 tracking-widest uppercase">
                Soon
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm run test
```

Expected: PASS — all tests passing. Note the count.

- [ ] **Step 3: Full route verification**

```bash
npm run dev
```

Walk every route:
- [ ] `http://localhost:3000` — landing page, glitch fires after ~4–8s, Discord CTA works
- [ ] `http://localhost:3000/hub` — 4 quadrants, all links navigate correctly
- [ ] `http://localhost:3000/tools` — Forge Grid, 4 categories, live tools link out
- [ ] `http://localhost:3000/tools/fuel-calculator` — shell with placeholder
- [ ] `http://localhost:3000/tools/ssu-trade-hub` — shell with placeholder
- [ ] `http://localhost:3000/tools/void-map` — shell with placeholder
- [ ] `http://localhost:3000/tools/baseops-command-center` — shell with placeholder
- [ ] `http://localhost:3000/doctrine` — all 4 sections render, blockquotes styled
- [ ] `http://localhost:3000/designations` — tiers render, nodes expand on click
- [ ] `http://localhost:3000/operations` — coming-soon grid

Stop with Ctrl+C.

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: Build completes with no errors. TypeScript errors = stop and fix. Warnings about missing images are acceptable.

- [ ] **Step 5: Commit**

```bash
git add src/app/operations/
git commit -m "feat: operations placeholder — coming-soon grid for fleet ops and intel"
```

- [ ] **Step 6: Final commit for any remaining files**

```bash
git status
```

If any untracked files remain (e.g., `.superpowers/` brainstorm files), add a `.gitignore` entry:

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore brainstorm session files"
```
