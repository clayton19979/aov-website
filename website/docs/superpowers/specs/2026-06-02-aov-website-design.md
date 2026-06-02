# AoV Website — Design Spec
**Date:** 2026-06-02
**Project:** Architects of the Void — EVE Frontier Corporation Website
**Status:** Approved

---

## Overview

A two-zone website for the Architects of the Void (AoV): a single cinematic public landing page designed to convert visitors into Discord recruits, and a gated internal platform for member tooling, doctrine, designations, and operations. The internal zone will require wallet authentication (not in scope for this build — middleware stub only). The site must be built for extensibility: 20+ tools are planned.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Color palette | Void Teal — `#020b0e` bg, `#00b4d8` accent | Digital/cosmic, "signal from beyond" feel |
| Landing hero | The Monolith — centered eclipse, minimal text, CTA | Pure visual weight, no pitch |
| Internal navigation | Void Portal — hub quadrant grid, no persistent sidebar | Feels like entering a structure, not software |
| Tools layout | Forge Grid — large cards with name, description, category | Readable at a glance, scales to 20+ |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Animation:** Framer Motion
- **Deployment:** Vercel

---

## Color System

```
Background:    #020b0e  (void black)
Accent:        #00b4d8  (void teal)
Accent dim:    #00b4d8 at 10–50% opacity for borders/glows
Text primary:  #ffffff at 90%
Text secondary:#ffffff at 40%
Text ghost:    #ffffff at 15%
```

---

## Typography

- **Headers / labels:** Monospace — `font-mono`, wide letter-spacing (`tracking-widest`)
- **Body:** System sans-serif — clean, readable
- **Doctrine text:** Slightly larger, generous line-height — formatted as sacred text

---

## Site Structure

```
/               Landing page (public)
/hub            Member hub — Void Portal grid (internal)
/tools          Tools section index (internal)
/tools/[slug]   Individual tool pages (internal)
/doctrine       Doctrine library (internal)
/designations   Designation tier viewer (internal)
/operations     Operations placeholder (internal)
```

All routes under `/hub`, `/tools`, `/doctrine`, `/designations`, `/operations` are internal. A single Next.js middleware file (`middleware.ts`) will guard these routes — currently a stub that passes through, ready for wallet auth to be wired in later.

---

## Page Designs

### `/` — Landing Page

**Purpose:** The only page non-members will ever see. Convert visitors to Discord joins.

**Layout:**
- Full-viewport, no scroll required to see the CTA
- Animated star field background (CSS — subtle, not distracting)
- Centered void eclipse: black circle with teal glow rings, subtle pulse animation
- `ARCHITECTS OF THE VOID` — monospace, wide letter-spacing, `text-4xl` on desktop scaling down on mobile
- One doctrine line: *"We were not chosen. We survived."* — dimmed, smaller
- One-sentence description of the order — ghost text
- Discord CTA button — teal border, teal text, hover fills — links to `https://discord.gg/uZtwGbngr7`
- Bottom bar: thin border-top, canonical phrase cycling every 6–8s (`"The Void wastes nothing."`, `"Only the useful endure."`, `"Entropy must be corrected."`)
- No navigation. No links to internal routes.

**Glitch effects (ominous, not decorative):**
- **Title glitch:** `ARCHITECTS OF THE VOID` periodically corrupts — random characters swap to symbols or noise for ~80ms, then snap back. Fires every 4–8s on a random timer. Implemented via a `useGlitchText` hook that replaces characters mid-string briefly.
- **Chromatic aberration:** CSS `text-shadow` on the title creates a subtle RGB split (red offset left, blue offset right) that intensifies during glitch frames.
- **Eclipse flicker:** The void eclipse periodically dims to near-black and recovers — a 120ms blackout, as if the signal was briefly lost. Framer Motion keyframe animation on a random interval.
- **Scanline overlay:** Full-viewport pseudo-element with repeating horizontal lines at 2px intervals, ~4% opacity — always present, gives a corrupted-screen feel without overwhelming.
- **Static noise pulse:** On glitch fire, a grain/noise texture flashes over the whole page at ~15% opacity for one frame (~60ms). CSS animation or a canvas overlay.
- **Cursor:** Custom CSS cursor — crosshair or a small teal reticle.

All glitch effects are CSS-first where possible. JavaScript only for the randomized timing and character-swap logic. Effects are subtle at rest, more aggressive during glitch windows — the page should feel like it's barely holding together.

**Atmosphere goal:** A visitor lands and feels they've intercepted something they weren't supposed to find. The page is unstable. The order is not selling itself. It simply exists — and it noticed you.

---

### `/hub` — Member Hub

**Purpose:** Front door for authenticated members. Navigation hub.

**Layout:**
- Minimal top bar: AoV mark (◈ AoV) left, member designation/status right
- 2×2 quadrant grid filling remaining viewport
- Each quadrant:
  - Section glyph + name (e.g., `⬡ TOOLS`)
  - 1–2 line description
  - Item count or status indicator
  - Full quadrant is a link to the section
- Thin grid lines between quadrants (`#00b4d8` at ~10% opacity)
- No footer — the grid fills the screen

**Quadrants:**
1. **TOOLS** — "Operational toolkit. Logistics, trade, intelligence." — tool count
2. **DOCTRINE** — "Core beliefs, sacred texts, canonical phrases." — section count
3. **DESIGNATIONS** — "Tier hierarchy. From Initiate to Archon." — tier count
4. **OPERATIONS** — "Fleet ops, member directory, intel boards."

---

### `/tools` — Tools Index

**Purpose:** Browse and access all member tools.

**Layout:**
- Back link to hub
- Page title: `⬡ TOOLS — THE FORGE`
- Forge Grid: responsive card grid (3 columns desktop, 2 tablet, 1 mobile)
- Each card:
  - Tool name (monospace, prominent)
  - One-line description
  - Category badge (teal, dimmed)
  - Full card is a link to `/tools/[slug]`
  - Coming-soon cards: dashed border, dimmed text, not clickable
- Cards grouped by category with category header labels

**Categories (initial):**
- `LOGISTICS` — Fuel Calculator, route tools
- `TRADE & ECONOMY` — SSU Trade Hub, market tools
- `INTELLIGENCE` — Void Map, recon tools
- `OPERATIONS` — BaseOps Command Center, corp management

**Tool data source:** `src/data/tools.ts` — single file, one entry per tool. Adding a tool = add entry here + create page file. No other changes needed.

```ts
// src/data/tools.ts shape
export type Tool = {
  slug: string
  name: string
  description: string
  category: ToolCategory
  status: 'live' | 'coming-soon'
}
```

---

### `/tools/[slug]` — Individual Tool Pages

**Purpose:** Full canvas for each tool.

**Layout:**
- Consistent shell: back button (`← TOOLS`), tool name, category badge
- Content area below — each tool renders its own component
- Shell file: `src/components/tools/ToolShell.tsx`
- Single dynamic route: `src/app/tools/[slug]/page.tsx` — looks up tool metadata from `tools.ts` by slug, renders the matching tool component via a component map in `src/components/tools/toolComponents.tsx`

**Adding a new tool:**
1. Add entry to `src/data/tools.ts`
2. Create tool component in `src/components/tools/[ToolName].tsx`
3. Register it in `toolComponents.tsx` map
4. Done — no new page files, no routing changes.

---

### `/doctrine` — Doctrine Library

**Purpose:** AoV lore and canonical texts for members.

**Layout:**
- Back link to hub
- Sections rendered as scrollable documents:
  - **Core Beliefs** — The Five Axioms, Final Doctrine
  - **The Void** — What the Void is, what it does
  - **Sacred Fragments** — Canonical quotes, attributed
  - **Common Phrases** — Doctrine in compressed form
- Typography: generous line-height, wider measure, formatted for reading
- Quotes styled as blockquotes with teal left border

---

### `/designations` — Designation Viewer

**Purpose:** Visual map of the AoV tier hierarchy.

**Layout:**
- Back link to hub
- Visual tier tree:
  - `THE ARCHON` (Tier I) — top node
  - Four Ascendant domains (Tier II): Warden, Forger, Resonant, Shadow
  - Six Architect functions (Tier III): Edgeborn, Sunderwright, Voidreader, Fluxcarrier, Axiomancer, Fracture
  - `VESSELS` (Tier IV), `INITIATES` (Tier V) — base tiers
- Each node: expandable on click — shows description and role
- Removal designations noted: Hollowed, Purged, Unmarked

---

### `/operations` — Operations

**Purpose:** Placeholder section for fleet ops, intel, member directory.

**Layout:**
- Back link to hub
- Placeholder grid with coming-soon cards (same Forge Grid pattern)
- Ready to receive tool-style pages as ops features are built

---

## Component Architecture

```
src/
  app/
    page.tsx                    Landing page
    layout.tsx                  Root layout (minimal — just html/body/fonts)
    hub/
      page.tsx                  Member hub
    tools/
      page.tsx                  Tools index
      [slug]/
        page.tsx                Individual tool (dynamic)
    doctrine/
      page.tsx                  Doctrine library
    designations/
      page.tsx                  Designation viewer
    operations/
      page.tsx                  Operations placeholder
  components/
    landing/
      VoidEclipse.tsx           Animated eclipse SVG/CSS
      StarField.tsx             Background star field
      DiscordCTA.tsx            CTA button
      PhraseCycler.tsx          Rotating bottom bar phrase
    hub/
      HubGrid.tsx               4-quadrant portal grid
      HubQuadrant.tsx           Single quadrant card
    tools/
      ToolCard.tsx              Forge Grid card
      ToolGrid.tsx              Category-grouped grid
      ToolShell.tsx             Per-tool page shell
    shared/
      BackLink.tsx              ← back navigation
      TopBar.tsx                Internal top bar (AoV mark + member status)
      SectionTitle.tsx          Section heading with glyph
  data/
    tools.ts                    Tool registry
    doctrine.ts                 Doctrine content
    designations.ts             Tier/function data
  middleware.ts                 Auth guard stub (pass-through for now)
```

---

## Middleware Stub

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const INTERNAL_ROUTES = ['/hub', '/tools', '/doctrine', '/designations', '/operations']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isInternal = INTERNAL_ROUTES.some(r => pathname.startsWith(r))
  if (isInternal) {
    // TODO: wallet auth check goes here
    return NextResponse.next()
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Expandability Notes

- **New tool:** Add entry to `src/data/tools.ts`, create page file. No layout changes.
- **New section:** Add App Router route, add quadrant to hub grid (currently 4 → can expand to 6 with a 3×2 or scrollable grid).
- **Wallet auth:** Wire into middleware stub — one file. All internal routes locked instantly.
- **New tool category:** Add string literal to `ToolCategory` type in `tools.ts`. Appears automatically in the grid.

---

## Out of Scope (This Build)

- Wallet authentication implementation
- Backend / API routes
- Member data persistence
- Real-time features
- The tool logic itself (Fuel Calculator, SSU Trade Hub, etc. — shells only if not already built)
