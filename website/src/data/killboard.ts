export type Kill = {
  id: string
  timestamp: string
  target: string
  ship: string
  pilots: string[]
  location: string
  value: number
  status: 'confirmed' | 'disputed'
}

export const kills: Kill[] = [
  {
    id: 'k-008',
    timestamp: '2025-11-20T18:45:00Z',
    target: 'Peloran Gast',
    ship: 'Battlecruiser',
    pilots: ['Archon Veyr', 'Cipher Thane', 'Null-Seeker Idris'],
    location: 'Theron VI · Drift Belt',
    value: 31400,
    status: 'confirmed',
  },
  {
    id: 'k-007',
    timestamp: '2025-11-17T09:12:00Z',
    target: 'Ydra Coss',
    ship: 'Cruiser',
    pilots: ['Void-Warden Sael'],
    location: 'Korreth II · Ice Field',
    value: 9800,
    status: 'confirmed',
  },
  {
    id: 'k-006',
    timestamp: '2025-11-14T03:22:00Z',
    target: 'Vanrath Osei',
    ship: 'Hauler',
    pilots: ['Archon Veyr', 'Cipher Thane'],
    location: 'Solitude IV · Transit Lane',
    value: 22700,
    status: 'confirmed',
  },
  {
    id: 'k-005',
    timestamp: '2025-11-10T21:58:00Z',
    target: 'Maren Voldt',
    ship: 'Frigate',
    pilots: ['Null-Seeker Idris'],
    location: 'Ashen Reach · Sector 7',
    value: 4100,
    status: 'confirmed',
  },
  {
    id: 'k-004',
    timestamp: '2025-11-07T14:33:00Z',
    target: 'Celouri Mining Co.',
    ship: 'Industrial',
    pilots: ['Archon Veyr', 'Void-Warden Sael', 'Cipher Thane'],
    location: 'Pelion Deep · Gate Approach',
    value: 47900,
    status: 'confirmed',
  },
  {
    id: 'k-003',
    timestamp: '2025-11-02T07:04:00Z',
    target: 'Brenn Usk',
    ship: 'Destroyer',
    pilots: ['Cipher Thane'],
    location: 'Korreth II · Outer Rim',
    value: 6600,
    status: 'disputed',
  },
  {
    id: 'k-002',
    timestamp: '2025-10-28T22:19:00Z',
    target: 'Talos Freight',
    ship: 'Freighter',
    pilots: ['Archon Veyr', 'Null-Seeker Idris', 'Void-Warden Sael'],
    location: 'Solitude IV · Waypoint 3',
    value: 88200,
    status: 'confirmed',
  },
  {
    id: 'k-001',
    timestamp: '2025-10-21T11:47:00Z',
    target: 'Orven Dahl',
    ship: 'Cruiser',
    pilots: ['Archon Veyr'],
    location: 'Theron VI · Debris Field',
    value: 11300,
    status: 'confirmed',
  },
]

export function killStats(ks: Kill[]) {
  const confirmed = ks.filter(k => k.status === 'confirmed')
  const totalValue = ks.reduce((sum, k) => sum + k.value, 0)
  const pilotCounts = ks
    .flatMap(k => k.pilots)
    .reduce<Record<string, number>>((acc, p) => {
      acc[p] = (acc[p] ?? 0) + 1
      return acc
    }, {})
  const topPilot = Object.entries(pilotCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  return { total: ks.length, confirmed: confirmed.length, totalValue, topPilot }
}
