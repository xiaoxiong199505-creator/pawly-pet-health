import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star,
  MapPin,
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  Clock,
  Dog,
  FileText,
  CalendarPlus,
  CalendarHeart,
  X,
  Download,
  LayoutDashboard,
  CalendarCheck,
  Filter,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useVets, useAppointments } from '@/hooks/useAppointments';
import { useTriageContext } from '@/hooks/useTriageContext';
import { downloadIcs } from '@/lib/ics';
import type { Vet, Pet } from '@/types';

const VISIT_TYPES = [
  { value: 'Routine Checkup', label: 'Routine Checkup', icon: Stethoscope },
  { value: 'Vaccination', label: 'Vaccination', icon: CalendarPlus },
  { value: 'Illness/Symptom Follow-up', label: 'Illness / Symptom Follow-up', icon: AlertCircle },
  { value: 'Urgent Care', label: 'Urgent Care', icon: AlertCircle },
];

const SPECIALTIES = ['All', 'General Practice', 'Dermatology', 'Dental & Oral Surgery', 'Emergency & Critical Care'];

const TIME_SLOTS = {
  Morning: ['09:00 AM', '09:30 AM', '10:30 AM', '11:00 AM'],
  Afternoon: ['01:30 PM', '02:30 PM', '03:30 PM', '04:00 PM'],
};

const BOOKED_SLOTS: Record<string, string[]> = {
  '2026-09-29': ['09:00 AM', '02:30 PM'],
  '2026-09-30': ['11:00 AM', '04:00 PM'],
  '2026-10-01': ['09:30 AM'],
  '2026-10-02': ['10:30 AM', '01:30 PM', '03:30 PM'],
};

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function generateCalendarDays(): { date: string; day: number; monthDay: string; weekday: string; isPast: boolean }[] {
  const days: { date: string; day: number; monthDay: string; weekday: string; isPast: boolean }[] = [];
  const today = new Date('2026-09-26T00:00:00');
  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      day: d.getDate(),
      monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      isPast: i === 0,
    });
  }
  return days;
}

const STEPS = ['Select Vet', 'Pick Date & Time', 'Visit Details', 'Confirm'];

export default function BookVet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromTriage = searchParams.get('from') === 'triage';
  const { vets, loading: vetsLoading } = useVets();
  const { pet, createAppointment, reload } = useAppointments();
  const { triageSummary, buildTriageSummaryText, clearTriageSummary } = useTriageContext();

  const [step, setStep] = useState(0);
  const [selectedVet, setSelectedVet] = useState<Vet | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [visitType, setVisitType] = useState('Routine Checkup');
  const [notes, setNotes] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('All');
  const [filterDistance, setFilterDistance] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<{
    vet: Vet;
    pet: Pet;
    date: string;
    time: string;
    visitType: string;
    fee: number;
  } | null>(null);

  const calendarDays = useMemo(() => generateCalendarDays(), []);

  useEffect(() => {
    if (fromTriage && triageSummary) {
      const summaryText = buildTriageSummaryText();
      if (summaryText) setNotes(summaryText);
      if (triageSummary.emergencyActive || triageSummary.warningActive) {
        setVisitType('Urgent Care');
      }
    }
  }, [fromTriage, triageSummary, buildTriageSummaryText]);

  const filteredVets = useMemo(() => {
    let list = vets;
    if (filterSpecialty !== 'All') {
      list = list.filter((v) => v.specialty === filterSpecialty);
    }
    if (filterDistance) {
      list = [...list].sort((a, b) => a.distance_km - b.distance_km);
    }
    return list;
  }, [vets, filterSpecialty, filterDistance]);

  const handleSelectVet = (vet: Vet) => {
    setSelectedVet(vet);
    setStep(1);
  };

  const handleSelectDateTime = () => {
    if (selectedDate && selectedTime) setStep(2);
  };

  const handleConfirm = async () => {
    if (!selectedVet || !pet || !selectedDate || !selectedTime) return;
    const triageText = fromTriage ? buildTriageSummaryText() : null;
    const appt = await createAppointment({
      pet_id: pet.id,
      vet_id: selectedVet.id,
      appointment_date: selectedDate,
      time_slot: selectedTime,
      visit_type: visitType,
      triage_summary: triageText,
      notes: notes || null,
    });
    if (appt) {
      setBookedAppointment({
        vet: selectedVet,
        pet,
        date: selectedDate,
        time: selectedTime,
        visitType,
        fee: selectedVet.consultation_fee,
      });
      setShowSuccess(true);
      clearTriageSummary();
      reload();
    }
  };

  const handleAddToCalendar = () => {
    if (!bookedAppointment) return;
    downloadIcs({
      title: `Vet Appointment — ${bookedAppointment.pet.name} with ${bookedAppointment.vet.full_name}`,
      description: `Visit type: ${bookedAppointment.visitType}\nPet: ${bookedAppointment.pet.name} (${bookedAppointment.pet.breed})\nClinic: ${bookedAppointment.vet.clinic_name}`,
      location: `${bookedAppointment.vet.clinic_name}, ${bookedAppointment.vet.clinic_address}`,
      dateStr: bookedAppointment.date,
      timeStr: bookedAppointment.time,
      durationMinutes: 30,
    });
  };

  if (vetsLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-pulse-soft text-slate-400">Loading available veterinarians…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="animate-fade-in flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-black md:text-3xl">Book a Vet Appointment</h1>
          <p className="mt-1 text-sm text-slate-500">
            Find the right care for Mochi — calmly and at your own pace.
          </p>
        </div>
        {fromTriage && (
          <div className="flex items-center gap-2 rounded-xl border border-sage-300 bg-sage-50 px-4 py-2 text-sm text-sage-700">
            <Sparkles className="h-4 w-4" />
            Triage summary attached as reason for visit
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-1 md:gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-1 md:gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                i < step
                  ? 'bg-sage-600 text-white'
                  : i === step
                  ? 'bg-sage-600 text-white ring-4 ring-sage-100'
                  : 'bg-sage-100 text-slate-400'
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden text-xs font-medium md:inline ${
                i <= step ? 'text-slate-700' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${i < step ? 'bg-sage-500' : 'bg-sage-100'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="mt-8">
        {/* Step 0: Vet Selection */}
        {step === 0 && (
          <div className="animate-slide-up">
            {/* Filters */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setFilterSpecialty(sp)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      filterSpecialty === sp
                        ? 'border-sage-600 bg-sage-600 text-white'
                        : 'border-sage-200 bg-white text-slate-600 hover:bg-sage-50'
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFilterDistance(!filterDistance)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  filterDistance
                    ? 'border-sage-600 bg-sage-600 text-white'
                    : 'border-sage-200 bg-white text-slate-600 hover:bg-sage-50'
                }`}
              >
                <MapPin className="h-3 w-3" />
                Nearest first
              </button>
            </div>

            {/* Vet cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {filteredVets.map((vet) => (
                <VetCard
                  key={vet.id}
                  vet={vet}
                  selected={selectedVet?.id === vet.id}
                  onClick={() => handleSelectVet(vet)}
                />
              ))}
            </div>
            {filteredVets.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                No veterinarians match this filter.
              </div>
            )}
          </div>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && selectedVet && (
          <div className="animate-slide-up">
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-sage-100 bg-white p-4 shadow-sm">
              {selectedVet.photo_url && (
                <img src={selectedVet.photo_url} alt={selectedVet.full_name} className="h-12 w-12 rounded-xl object-cover" />
              )}
              <div>
                <p className="font-display text-sm font-semibold text-black">{selectedVet.full_name}</p>
                <p className="text-xs text-slate-500">{selectedVet.specialty} · {selectedVet.clinic_name}</p>
              </div>
            </div>

            {/* Calendar */}
            <div className="rounded-2xl border border-sage-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sage-600">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Select a Date</span>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {calendarDays.map((d) => {
                  const isSelected = selectedDate === d.date;
                  return (
                    <button
                      key={d.date}
                      onClick={() => {
                        setSelectedDate(d.date);
                        setSelectedTime('');
                      }}
                      disabled={d.isPast}
                      className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-3 transition-all ${
                        isSelected
                          ? 'border-sage-600 bg-sage-600 text-white shadow-md'
                          : d.isPast
                          ? 'border-sage-100 bg-sage-50/30 text-slate-300 cursor-not-allowed'
                          : 'border-sage-200 bg-sage-50/40 text-slate-600 hover:border-sage-400 hover:bg-sage-50'
                      }`}
                      style={{ minWidth: '70px' }}
                    >
                      <span className="text-[10px] uppercase font-medium opacity-70">{d.weekday}</span>
                      <span className="font-display text-lg font-semibold">{d.day}</span>
                      <span className="text-[10px] opacity-70">{d.monthDay.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="mt-5 rounded-2xl border border-sage-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sage-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    Available Times — {formatDateFull(selectedDate)}
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  {Object.entries(TIME_SLOTS).map(([period, slots]) => (
                    <div key={period}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{period}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {slots.map((slot) => {
                          const booked = (BOOKED_SLOTS[selectedDate] ?? []).includes(slot);
                          const isSelected = selectedTime === slot;
                          return (
                            <button
                              key={slot}
                              onClick={() => !booked && setSelectedTime(slot)}
                              disabled={booked}
                              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                                isSelected
                                  ? 'border-sage-600 bg-sage-600 text-white shadow-sm'
                                  : booked
                                  ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                                  : 'border-sage-200 bg-sage-50/40 text-slate-600 hover:border-sage-400 hover:bg-sage-50'
                              }`}
                            >
                              {booked && <X className="h-3 w-3" />}
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <StepNav onBack={() => setStep(0)} onNext={handleSelectDateTime} nextDisabled={!selectedDate || !selectedTime} nextLabel="Continue" />
          </div>
        )}

        {/* Step 2: Pet & Visit Reason */}
        {step === 2 && selectedVet && pet && (
          <div className="animate-slide-up space-y-5">
            {/* Pet selector */}
            <div className="rounded-2xl border border-sage-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sage-600">
                <Dog className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Pet</span>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-sage-100 bg-sage-50/40 p-3">
                {pet.photo_url && (
                  <img src={pet.photo_url} alt={pet.name} className="h-10 w-10 rounded-xl object-cover" />
                )}
                <div>
                  <p className="text-sm font-semibold text-black">{pet.name}</p>
                  <p className="text-xs text-slate-500">{pet.breed} · {pet.species} · {pet.age_years} yrs</p>
                </div>
              </div>
            </div>

            {/* Visit type */}
            <div className="rounded-2xl border border-sage-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sage-600">
                <Stethoscope className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Visit Type</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {VISIT_TYPES.map((vt) => {
                  const Icon = vt.icon;
                  const isSelected = visitType === vt.value;
                  return (
                    <button
                      key={vt.value}
                      onClick={() => setVisitType(vt.value)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-sage-600 bg-sage-50 ring-1 ring-sage-600'
                          : 'border-sage-200 bg-sage-50/30 hover:border-sage-300'
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSelected ? 'bg-sage-600 text-white' : 'bg-sage-100 text-sage-600'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-black' : 'text-slate-600'}`}>{vt.label}</span>
                      {isSelected && <Check className="ml-auto h-4 w-4 text-sage-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes / triage summary */}
            <div className="rounded-2xl border border-sage-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sage-600">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Notes & Reason for Visit</span>
              </div>
              {fromTriage && triageSummary && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-sage-200 bg-sage-50 px-3 py-2 text-xs text-sage-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Pre-filled from your AI Triage Health Review summary.
                </div>
              )}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Add any symptoms, concerns, or context for the vet…"
                className="mt-3 w-full rounded-xl border border-sage-200 bg-sage-50/30 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
              />
            </div>

            <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={false} nextLabel="Review & Confirm" />
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedVet && pet && (
          <div className="animate-slide-up">
            <div className="rounded-3xl border border-sage-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sage-600">
                <CalendarCheck className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Booking Summary</span>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {/* Vet info */}
                <div className="flex items-center gap-3 rounded-2xl border border-sage-100 bg-sage-50/40 p-4">
                  {selectedVet.photo_url && (
                    <img src={selectedVet.photo_url} alt={selectedVet.full_name} className="h-14 w-14 rounded-2xl object-cover" />
                  )}
                  <div>
                    <p className="font-display text-sm font-semibold text-black">{selectedVet.full_name}</p>
                    <p className="text-xs text-slate-500">{selectedVet.credentials} · {selectedVet.specialty}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{selectedVet.clinic_name}</p>
                  </div>
                </div>

                {/* Date & time */}
                <div className="flex items-center gap-3 rounded-2xl border border-sage-100 bg-sage-50/40 p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-black">{formatDateFull(selectedDate)}</p>
                    <p className="text-xs text-slate-500">{selectedTime} · 30 min consultation</p>
                  </div>
                </div>

                {/* Pet */}
                <div className="flex items-center gap-3 rounded-2xl border border-sage-100 bg-sage-50/40 p-4">
                  {pet.photo_url && (
                    <img src={pet.photo_url} alt={pet.name} className="h-10 w-10 rounded-xl object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-black">{pet.name}</p>
                    <p className="text-xs text-slate-500">{pet.breed} · {pet.age_years} yrs</p>
                  </div>
                </div>

                {/* Visit type + fee */}
                <div className="flex items-center justify-between rounded-2xl border border-sage-100 bg-sage-50/40 p-4">
                  <div>
                    <p className="text-xs text-slate-400">Visit Type</p>
                    <p className="text-sm font-semibold text-black">{visitType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Est. Fee</p>
                    <p className="font-display text-lg font-semibold text-sage-700">${selectedVet.consultation_fee}</p>
                  </div>
                </div>
              </div>

              {/* Notes preview */}
              {notes && (
                <div className="mt-4 rounded-2xl border border-sage-100 bg-sage-50/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{notes}</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-sage-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-sage-50"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-sage-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage-700 sm:flex-none"
              >
                <Check className="h-4 w-4" />
                Confirm Appointment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success modal */}
      {showSuccess && bookedAppointment && (
        <SuccessModal
          appointment={bookedAppointment}
          onClose={() => navigate('/')}
          onAddToCalendar={handleAddToCalendar}
          onViewAppointments={() => navigate('/')}
        />
      )}
    </div>
  );
}

function VetCard({
  vet,
  selected,
  onClick,
}: {
  vet: Vet;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col rounded-3xl border p-5 text-left shadow-sm transition-all hover:shadow-md ${
        selected ? 'border-sage-600 ring-2 ring-sage-200' : 'border-sage-200 bg-white hover:border-sage-300'
      }`}
    >
      <div className="flex items-start gap-4">
        {vet.photo_url && (
          <img
            src={vet.photo_url}
            alt={vet.full_name}
            className="h-16 w-16 rounded-2xl border border-sage-100 object-cover shadow-sm"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold text-black">{vet.full_name}</p>
          <p className="text-xs text-slate-500">{vet.credentials}</p>
          <div className="mt-1.5 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-slate-700">{vet.rating}</span>
            <span className="text-xs text-slate-400">({vet.review_count} reviews)</span>
          </div>
        </div>
        {selected && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sage-600 text-white">
            <Check className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Stethoscope className="h-3.5 w-3.5 text-sage-500" />
          {vet.specialty}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-sage-500" />
          {vet.clinic_name} · {vet.distance_km} km away
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-sage-100 pt-3">
        <div>
          <span className="text-xs text-slate-400">Consultation</span>
          <p className="font-display text-lg font-semibold text-sage-700">${vet.consultation_fee}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-xl bg-sage-50 px-3 py-2 text-xs font-semibold text-sage-700 transition-colors group-hover:bg-sage-100">
          Select <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  nextLabel: string;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-2xl border border-sage-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-sage-50"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-sage-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed sm:flex-none"
      >
        {nextLabel}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SuccessModal({
  appointment,
  onClose,
  onAddToCalendar,
  onViewAppointments,
}: {
  appointment: {
    vet: Vet;
    pet: Pet;
    date: string;
    time: string;
    visitType: string;
    fee: number;
  };
  onClose: () => void;
  onAddToCalendar: () => void;
  onViewAppointments: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
      <div className="animate-slide-up w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
        {/* Success check */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-600">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold text-black">Appointment Booked!</h2>
          <p className="mt-1 text-sm text-slate-500">
            {appointment.pet.name}'s visit is confirmed.
          </p>
        </div>

        {/* Summary */}
        <div className="mt-6 rounded-2xl border border-sage-100 bg-sage-50/40 p-4">
          <div className="flex items-center gap-3">
            {appointment.vet.photo_url && (
              <img src={appointment.vet.photo_url} alt={appointment.vet.full_name} className="h-12 w-12 rounded-xl object-cover" />
            )}
            <div>
              <p className="text-sm font-semibold text-black">{appointment.vet.full_name}</p>
              <p className="text-xs text-slate-500">{appointment.vet.clinic_name}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1 border-t border-sage-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Pet</span>
              <span className="font-medium text-black">{appointment.pet.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date</span>
              <span className="font-medium text-black">{formatDateFull(appointment.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time</span>
              <span className="font-medium text-black">{appointment.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Visit Type</span>
              <span className="font-medium text-black">{appointment.visitType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Est. Fee</span>
              <span className="font-semibold text-sage-700">${appointment.fee}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 space-y-2">
          <button
            onClick={onAddToCalendar}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sage-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage-700"
          >
            <Download className="h-4 w-4" />
            Add to Calendar
          </button>
          <div className="flex gap-2">
            <button
              onClick={onViewAppointments}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-sage-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-sage-50"
            >
              <CalendarHeart className="h-4 w-4" />
              My Appointments
            </button>
            <button
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-sage-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-sage-50"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
