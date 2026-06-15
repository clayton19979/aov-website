export type RecognitionSignal = {
  step: string
  title: string
  body: string
  measure: string
}

export const recognitionBrief = {
  eyebrow: 'Recognition protocol',
  title: 'The order does not recruit. It selects.',
  intro:
    'AoV is built for pilots who already move with discipline: useful under pressure, accountable under failure, and drawn to doctrine as something operational rather than decorative.',
  publicSignal:
    'If you require encouragement to apply, you are already disqualified.',
  signals: [
    {
      step: '00',
      title: 'Public Signal',
      body:
        'The first filter happens before contact. No benefit list, no soft invitation, no promise that uncertainty will be accommodated.',
      measure: 'Temperament before volume.',
    },
    {
      step: '01',
      title: 'Void Statement',
      body:
        'The candidate is asked for purpose, not history. Brevity, seriousness, and self-awareness matter more than performance.',
      measure: 'Purpose before biography.',
    },
    {
      step: '02',
      title: 'Trial Operation',
      body:
        'Observation happens in live context. The standard is usefulness, communication, and behavior when pressure makes the costume fall away.',
      measure: 'Function before claim.',
    },
  ] satisfies RecognitionSignal[],
}
