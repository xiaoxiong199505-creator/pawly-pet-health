export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age_years: number;
  weight_kg: number;
  photo_url: string | null;
  care_score: number;
  care_status: string;
}

export interface CheckIn {
  id: string;
  pet_id: string;
  check_date: string;
  energy: string;
  appetite: string;
  stool: string;
  mood: string;
  notes: string | null;
}

export interface Reminder {
  id: string;
  pet_id: string;
  title: string;
  reminder_type: string;
  due_date: string;
  status: string;
}

export interface HealthEvent {
  id: string;
  pet_id: string;
  event_date: string;
  title: string;
  description: string | null;
  category: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';
export type SafetyFlag = 'normal' | 'warning' | 'emergency';

export interface ChatMessage {
  id: string;
  pet_id: string;
  role: ChatRole;
  content: string;
  flag: SafetyFlag;
  triage_stage: string | null;
  created_at: string;
}

export interface TriageSummary {
  energy: string;
  appetite: string;
  stool: string;
  duration: string;
  stage: number;
  warningActive: boolean;
  emergencyActive: boolean;
}

export interface Vet {
  id: string;
  full_name: string;
  credentials: string;
  specialty: string;
  rating: number;
  review_count: number;
  clinic_name: string;
  clinic_address: string;
  distance_km: number;
  consultation_fee: number;
  photo_url: string | null;
}

export interface Appointment {
  id: string;
  pet_id: string;
  vet_id: string;
  appointment_date: string;
  time_slot: string;
  visit_type: string;
  triage_summary: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export interface AppointmentWithVet extends Appointment {
  vet: Vet | null;
}
