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

export interface SymptomAnalysis {
  hasVomiting: boolean;
  hasLethargy: boolean;
  hasDiarrhea: boolean;
  hasAppetiteLoss: boolean;
  cleanSummaryText: string;
}

/**
 * 从用户自然语言中解析出核心病症关键词
 */
export function extractSymptomKeywords(input: string): SymptomAnalysis {
  const lower = input.toLowerCase();
  const hasVomiting =
    lower.includes('thrown up') ||
    lower.includes('vomit') ||
    lower.includes('puke') ||
    lower.includes('throwing up') ||
    lower.includes('puking');
  const hasLethargy =
    lower.includes('lethargic') ||
    lower.includes('tired') ||
    lower.includes('low energy') ||
    lower.includes('lazy') ||
    lower.includes('sleeping all day') ||
    lower.includes('weak');
  const hasDiarrhea =
    lower.includes('diarrhea') ||
    lower.includes('loose stool') ||
    lower.includes('watery') ||
    lower.includes('soft stool') ||
    lower.includes('runny');
  const hasAppetiteLoss =
    lower.includes("isn't eating") ||
    lower.includes('not eating') ||
    lower.includes('refusing food') ||
    lower.includes('no appetite') ||
    lower.includes('less food');

  let cleanSummaryText = input.trim();
  if (hasVomiting && !hasLethargy) cleanSummaryText = 'Reported vomiting';
  else if (hasVomiting && hasLethargy) cleanSummaryText = 'Low energy & vomiting';
  else if (hasLethargy) cleanSummaryText = 'Low energy / Lethargic';
  else if (hasDiarrhea) cleanSummaryText = 'Loose stool / Diarrhea';
  else if (hasAppetiteLoss) cleanSummaryText = 'Appetite loss / Refusing food';

  return {
    hasVomiting,
    hasLethargy,
    hasDiarrhea,
    hasAppetiteLoss,
    cleanSummaryText,
  };
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

  // 1. 紧急红线检测
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

  // 2. 医疗用药规避检测
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

  // 3. 语义与病症关键词分析
  const symptoms = extractSymptomKeywords(userInput);

  // 4. 根据当前问诊阶段及识别出的病症进行动态回复
  if (currentStage === 1) {
    let ackContent = STAGE_ENERGY_ACK;
    if (symptoms.hasVomiting) {
      ackContent = "I've noted that Mochi threw up. Vomiting can certainly affect a pet's comfort and energy. Now, how has Mochi's appetite been since then — eating normally, eating a bit less, or refusing food?";
    } else if (symptoms.hasLethargy) {
      ackContent = "I've noted Mochi is feeling low on energy today. Next, how is Mochi's appetite — eating normally, a bit less, or not interested in food?";
    }

    return {
      content: ackContent,
      flag: 'normal',
      stage: 2,
      quickReplies: QUICK_REPLIES_APPETITE,
      isEmergency: false,
      isDisclaimer: false,
    };
  }

  if (currentStage === 2) {
    let ackContent = STAGE_APPETITE_ACK;
    if (symptoms.hasAppetiteLoss) {
      ackContent = "Got it, I've recorded Mochi's appetite changes. Next — have you noticed any changes in Mochi's stool recently?";
    } else if (symptoms.hasVomiting) {
      ackContent = "Got it, thank you. Alongside the vomiting, have you noticed any changes in Mochi's stool recently?";
    }

    return {
      content: ackContent,
      flag: 'normal',
      stage: 3,
      quickReplies: QUICK_REPLIES_STOOL,
      isEmergency: false,
      isDisclaimer: false,
    };
  }

  if (currentStage === 3) {
    let ackContent = STAGE_STOOL_ACK;
    if (symptoms.hasDiarrhea) {
      ackContent = "Thank you. I've noted the stool changes. One more question to round out the picture: how long have you been noticing these changes — did they start today, or have they been going on longer?";
    }

    return {
      content: ackContent,
      flag: 'normal',
      stage: 4,
      quickReplies: QUICK_REPLIES_DURATION,
      isEmergency: false,
      isDisclaimer: false,
    };
  }

  if (currentStage === 4) {
    return {
      content: SUMMARY_COMPLETE,
      flag: 'normal',
      stage: 5,
      quickReplies: [],
      isEmergency: false,
      isDisclaimer: false,
    };
  }

  return {
    content: "I've already completed the triage check. You can start a new check-in anytime, or head back to the dashboard.",
    flag: 'normal',
    stage: currentStage,
    quickReplies: [],
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
  const { cleanSummaryText } = extractSymptomKeywords(userInput);
  const textToUse = cleanSummaryText || userInput;

  switch (stage) {
    case 1:
      updated.energy = textToUse;
      break;
    case 2:
      updated.appetite = textToUse;
      break;
    case 3:
      updated.stool = textToUse;
      break;
    case 4:
      updated.duration = textToUse;
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
  const { cleanSummaryText } = extractSymptomKeywords(userMessage);
  const textToUse = cleanSummaryText || userMessage;

  switch (stageBefore) {
    case 1:
      updated.energy = textToUse;
      break;
    case 2:
      updated.appetite = textToUse;
      break;
    case 3:
      updated.stool = textToUse;
      break;
    case 4:
      updated.duration = textToUse;
      break;
  }
  return updated;
}
