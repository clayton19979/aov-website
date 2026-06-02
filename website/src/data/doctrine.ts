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
