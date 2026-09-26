import type { Vet, TriageSummary } from '@/types';

export interface VetMatch {
  vet: Vet;
  matchScore: number;
  rationale: string;
  earliestSlot: string;
  earliestDate: string;
  isEmergency: boolean;
}

const EARLIEST_SLOTS = [
  { date: '2026-09-26', time: '02:30 PM' },
  { date: '2026-09-26', time: '04:00 PM' },
  { date: '2026-09-27', time: '09:30 AM' },
  { date: '2026-09-27', time: '11:00 AM' },
  { date: '2026-09-29', time: '10:30 AM' },
];

const EARLIEST_ER_SLOTS = [
  { date: '2026-09-26', time: 'Now — 24/7 ER' },
  { date: '2026-09-26', time: 'Walk-in available' },
];

function inferSymptomCategory(summary: TriageSummary): string {
  const stool = summary.stool.toLowerCase();
  const appetite = summary.appetite.toLowerCase();
  const energy = summary.energy.toLowerCase();

  if (summary.emergencyActive) return 'Emergency';
  if (energy.includes('lethargic') || energy.includes('barely') || appetite.includes('refusing all') || appetite.includes('not interested'))
    return 'Urgent';
  if (stool.includes('loose') || stool.includes('diarrhea') || stool.includes('soft') || appetite.includes('less'))
    return 'GI';
  if (stool.includes('normal') && appetite.includes('normally') && energy.includes('normal'))
    return 'Wellness';
  return 'General';
}

function getSpecialtyRelevance(specialty: string, category: string): number {
  const map: Record<string, string[]> = {
    'Emergency': ['Emergency & Critical Care'],
    'Urgent': ['Emergency & Critical Care', 'General Practice'],
    'GI': ['General Practice', 'Dermatology'],
    'Wellness': ['General Practice', 'Dental & Oral Surgery'],
    'General': ['General Practice', 'Dermatology', 'Dental & Oral Surgery'],
  };
  const relevant = map[category] ?? map['General'];
  if (relevant[0] === specialty) return 1.0;
  if (relevant.includes(specialty)) return 0.85;
  return 0.5;
}

function buildRationale(vet: Vet, summary: TriageSummary, category: string): string {
  const symptoms: string[] = [];
  if (summary.energy && summary.energy !== '—' && !summary.energy.toLowerCase().includes('bright'))
    symptoms.push(summary.energy.toLowerCase());
  if (summary.appetite && summary.appetite !== '—' && !summary.appetite.toLowerCase().includes('normally'))
    symptoms.push(`appetite: ${summary.appetite.toLowerCase()}`);
  if (summary.stool && summary.stool !== '—' && !summary.stool.toLowerCase().includes('normal'))
    symptoms.push(`stool: ${summary.stool.toLowerCase()}`);

  const symptomText = symptoms.length > 0 ? symptoms.join(', ') : 'a general wellness concern';

  if (category === 'Emergency' || category === 'Urgent') {
    return `${vet.full_name} specializes in ${vet.specialty.toLowerCase()}, best suited for urgent symptoms like ${symptomText}. Located ${vet.distance_km} km away for fast access.`;
  }

  const experienceMap: Record<string, string> = {
    'General Practice': 'canine general and gastroenterology care',
    'Dermatology': 'skin and gastrointestinal symptom management',
    'Dental & Oral Surgery': 'oral health and routine wellness',
    'Emergency & Critical Care': 'critical and urgent symptom assessment',
  };
  const experience = experienceMap[vet.specialty] ?? 'comprehensive pet care';

  return `${vet.full_name} has extensive experience in ${experience}, matching Mochi's ${symptomText}.`;
}

function getEarliestSlot(isEmergency: boolean, vetIndex: number): { date: string; time: string } {
  if (isEmergency) {
    return EARLIEST_ER_SLOTS[vetIndex % EARLIEST_ER_SLOTS.length];
  }
  return EARLIEST_SLOTS[vetIndex % EARLIEST_SLOTS.length];
}

export function matchVets(vets: Vet[], summary: TriageSummary, maxResults = 2): VetMatch[] {
  if (vets.length === 0) return [];

  const category = inferSymptomCategory(summary);
  const isEmergency = category === 'Emergency' || category === 'Urgent' || summary.emergencyActive;

  let scored = vets.map((vet, idx) => {
    const relevance = getSpecialtyRelevance(vet.specialty, category);
    const ratingFactor = (vet.rating / 5) * 0.15;
    const distanceFactor = isEmergency ? Math.max(0, 1 - vet.distance_km / 10) * 0.25 : 0;
    let score = relevance * 0.6 + ratingFactor + distanceFactor;
    if (isEmergency && vet.specialty === 'Emergency & Critical Care') score += 0.3;
    score = Math.min(score, 0.99);
    return { vet, score, idx };
  });

  if (isEmergency) {
    scored = scored.sort((a, b) => {
      if (a.vet.specialty === 'Emergency & Critical Care' && b.vet.specialty !== 'Emergency & Critical Care') return -1;
      if (b.vet.specialty === 'Emergency & Critical Care' && a.vet.specialty !== 'Emergency & Critical Care') return 1;
      return a.vet.distance_km - b.vet.distance_km;
    });
  } else {
    scored = scored.sort((a, b) => b.score - a.score);
  }

  return scored.slice(0, maxResults).map(({ vet, score, idx }) => {
    const slot = getEarliestSlot(isEmergency, idx);
    return {
      vet,
      matchScore: Math.round(score * 100),
      rationale: buildRationale(vet, summary, category),
      earliestSlot: slot.time,
      earliestDate: slot.date,
      isEmergency,
    };
  });
}

export function hasEnoughDataForMatching(summary: TriageSummary): boolean {
  if (summary.emergencyActive) return true;
  const filled = [summary.energy, summary.appetite, summary.stool].filter(
    (v) => v !== '—' && v !== ''
  ).length;
  return filled >= 2;
}

export function isTriageComplete(summary: TriageSummary): boolean {
  return summary.duration !== '—' && summary.stage >= 5;
}
