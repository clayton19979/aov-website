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
          "Sunderwright sustain the order's material base — mining, manufacturing, processing. Without them, the fleet does not fly and the stations do not operate.",
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
