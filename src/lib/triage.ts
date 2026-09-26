import type { SafetyFlag, TriageSummary } from '@/types';

const RED_FLAG_PATTERNS = [
  'unresponsive',
  'bloody stool',
  'blood in stool',
  'seizure',
  'seizures',
  'breathing difficulty',
  'difficulty breathing',
  'labored breathing',
  'shortness of breath',
  'poisoning',
  'poisoned',
  'toxic',
  'ingested poison',
  'paralysis',
  'collapsed',
  'collapse',
  'pale gums',
  'blue gums',
  'cyanosis',
  'bleeding',
  'heavy bleeding',
  'hit by car',
  'trauma',
  'choking',
  'cannot breathe',
  'cant breathe',
  "can't breathe",
  'convulsion',
  'loss of consciousness',
  'unconscious',
];

const MEDICAL_ADVICE_PATTERNS = [
  'how much',
  'what dose',
  'dosage',
  'dose of',
  'should i give',
  'can i give',
  'prescribe',
  'diagnose',
  'diagnosis',
  'what disease',
  'what illness',
  'do they have',
  'does she have',
  'does he have',
  'antibiotic',
  'amoxicillin',
  'metacam',
  'tramadol',
  'prednisone',
  'ibuprofen',
  'tylenol',
  'aspirin',
  'insulin dose',
];

const QUICK_REPLIES_STAGE_0 = [
  "Mochi seems a little low energy today",
  "Mochi isn't eating much",
  "Mochi's stool looks different",
  "Mochi seems fine, just checking in",
];

const QUICK_REPLIES_ENERGY = [
  "Bright and playful",
  "Normal energy",
  "A bit quiet / low energy",
  "Very lethargic, barely moving",
];

const QUICK_REPLIES_APPETITE = [
  "Eating normally",
  "Eating a bit less than usual",
  "Not interested in food",
  "Refusing all food and water",
];

const QUICK_REPLIES_STOOL = [
  "Normal and firm",
  "Slightly soft",
  "Loose / diarrhea",
  "I haven't checked",
];

const QUICK_REPLIES_DURATION = [
  "Started today",
  "Since yesterday",
  "For 2-3 days",
  "About a week or more",
];

export interface TriageResponse {
  content: string;
  flag: SafetyFlag;
  stage: number;
  quickReplies: string[];
  isEmergency: boolean;
  isDisclaimer: boolean;
}

export function detectRedFlag(input: string): boolean {
  const lower = input.toLowerCase();
  return RED_FLAG_PATTERNS.some((p) => lower.includes(p));
}

export function detectMedicalAdvice(input: string): boolean {
  const lower = input.toLowerCase();
  return MEDICAL_ADVICE_PATTERNS.some((p) => lower.includes(p));
}

export const EMERGENCY_MESSAGE =
  "I'm picking up on language that may indicate a medical emergency. Please do not wait — take Mochi to the nearest emergency veterinary clinic right now. If you cannot transport safely, call an ER vet immediately for guidance. Signs like this can worsen quickly and are best assessed in person by a veterinarian.";

export const DISCLAIMER_MESSAGE =
  "Pawly provides educational triage guidance only and cannot prescribe medication or diagnose diseases. Please consult a licensed veterinarian for dosing, prescriptions, or a definitive diagnosis. I can still help you assess whether what you're seeing may warrant a sooner visit.";

const GREETING_MESSAGE =
  "Hi there, I'm Pawly — I'm here to help you check in on Mochi in a calm, structured way. I'll ask a few gentle questions about energy, appetite, stool, and how long any changes have lasted. This isn't a diagnosis — just a triage check to help you decide on next steps. To start: how has Mochi's energy been today?";

const STAGE_ENERGY_ACK =
  "Thank you for sharing that. Now, how is Mochi's appetite — eating normally, a bit less, or not interested in food?";

const STAGE_APPETITE_ACK =
  "Got it, that's helpful to know. Next — have you noticed any changes in Mochi's stool recently?";

const STAGE_STOOL_ACK =
  "Thank you. One more question to round out the picture: how long have you been noticing these changes — did they start today, or have they been going on longer?";

const SUMMARY_COMPLETE =
  "Thank you for walking through that with me. Based on what you've shared, I've put together a summary on the right side of your screen. This is an educational overview, not a diagnosis. If anything feels urgent or you're unsure, reaching out to your vet is always a good call. You can start a new check-in anytime, or head to the dashboard to log today's update.";

export function getInitialGreeting(): TriageResponse {
  return {
    content: GREETING_MESSAGE,
    flag: 'normal',
    stage: 1,
    quickReplies: QUICK_REPLIES_ENERGY,
    isEmergency: false,
    isDisclaimer: false,
  };
}

export function getQuickRepliesForStage(stage: number, isInitial: boolean): string[] {
  if (isInitial) return QUICK_REPLIES_STAGE_0;
  switch (stage) {
    case 1:
      return QUICK_REPLIES_ENERGY;
    case 2:
      return QUICK_REPLIES_APPETITE;
    case 3:
      return QUICK_REPLIES_STOOL;
    case 4:
      return QUICK_REPLIES_DURATION;
    default:
      return [];
  }
}

export function buildTriageResponse(
  userInput: string,
  currentStage: number,
  summary: TriageSummary
): TriageResponse {
  const lower = userInput.toLowerCase();

  if (detectRedFlag(lower)) {
    return {
      content: EMERGENCY_MESSAGE,
      flag: 'emergency',
      stage: currentStage,
      quickReplies: ['Find Nearest ER Vet', 'I understand, thank you'],
      isEmergency: true,
      isDisclaimer: false,
    };
  }

  if (detectMedicalAdvice(lower)) {
    return {
      content: DISCLAIMER_MESSAGE,
      flag: 'warning',
      stage: currentStage,
      quickReplies: getQuickRepliesForStage(currentStage, false),
      isEmergency: false,
      isDisclaimer: true,
    };
  }

  const responses: Record<number, { content: string; nextStage: number; replies: string[] }> = {
    1: {
      content: STAGE_ENERGY_ACK,
      nextStage: 2,
      replies: QUICK_REPLIES_APPETITE,
    },
    2: {
      content: STAGE_APPETITE_ACK,
      nextStage: 3,
      replies: QUICK_REPLIES_STOOL,
    },
    3: {
      content: STAGE_STOOL_ACK,
      nextStage: 4,
      replies: QUICK_REPLIES_DURATION,
    },
    4: {
      content: SUMMARY_COMPLETE,
      nextStage: 5,
      replies: [],
    },
  };

  const entry = responses[currentStage] ?? {
    content: "I've already completed the triage check. You can start a new check-in anytime, or head back to the dashboard.",
    nextStage: currentStage,
    replies: [],
  };

  return {
    content: entry.content,
    flag: 'normal',
    stage: entry.nextStage,
    quickReplies: entry.replies,
    isEmergency: false,
    isDisclaimer: false,
  };
}

export function getSummaryLabelForStage(stage: number): string {
  switch (stage) {
    case 1:
      return 'Energy';
    case 2:
      return 'Appetite';
    case 3:
      return 'Stool';
    case 4:
      return 'Duration';
    default:
      return 'Complete';
  }
}

export function updateSummaryField(
  summary: TriageSummary,
  stage: number,
  userInput: string
): TriageSummary {
  const updated = { ...summary, stage };
  switch (stage) {
    case 1:
      updated.energy = userInput;
      break;
    case 2:
      updated.appetite = userInput;
      break;
    case 3:
      updated.stool = userInput;
      break;
    case 4:
      updated.duration = userInput;
      break;
  }
  return updated;
}

export function summarizeForSummaryCard(
  summary: TriageSummary,
  userMessage: string,
  stageBefore: number
): TriageSummary {
  const updated = { ...summary };
  switch (stageBefore) {
    case 1:
      updated.energy = userMessage;
      break;
    case 2:
      updated.appetite = userMessage;
      break;
    case 3:
      updated.stool = userMessage;
      break;
    case 4:
      updated.duration = userMessage;
      break;
  }
  return updated;
}
