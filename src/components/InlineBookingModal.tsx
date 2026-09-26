import { useState } from 'react';
import { Check, X, Calendar, Clock, Stethoscope, Download, Sparkles } from 'lucide-react';
import type { Vet, Pet, TriageSummary } from '@/types';
import { downloadIcs } from '@/lib/ics';

interface InlineBookingModalProps {
  vet: Vet;
  pet: Pet;
  preselectedDate: string;
  preselectedTime: string;
  triageSummary: TriageSummary | null;
  triageSummaryText: string;
  onConfirm: (data: {
    vetId: string;
    date: string;
    timeSlot: string;
    visitType: string;
    triageSummary: string;
    notes: string;
  }) => Promise<boolean>;
  onClose: () => void;
}

const VISIT_TYPES = ['Routine Checkup', 'Vaccination', 'Illness/Symptom Follow-up', 'Urgent Care'];

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function InlineBookingModal({
  vet,
  pet,
  preselectedDate,
  preselectedTime,
  triageSummary,
  triageSummaryText,
  onConfirm,
  onClose,
}: InlineBookingModalProps) {
  const defaultVisitType = triageSummary?.emergencyActive ? 'Urgent Care' : 'Illness/Symptom Follow-up';
  const [visitType, setVisitType] = useState(defaultVisitType);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    const success = await onConfirm({
      vetId: vet.id,
      date: preselectedDate,
      timeSlot: preselectedTime,
      visitType,
      triageSummary: triageSummaryText,
      notes: triageSummaryText,
    });
    setConfirming(false);
    if (success) setConfirmed(true);
  };

  const handleAddToCalendar = () => {
    downloadIcs({
      title: `Vet Appointment — ${pet.name} with ${vet.full_name}`,
      description: `Visit type: ${visitType}\nPet: ${pet.name} (${pet.breed})\nClinic: ${vet.clinic_name}`,
      location: `${vet.clinic_name}, ${vet.clinic_address}`,
      dateStr: preselectedDate,
      timeStr: preselectedTime.includes('Now') ? '02:30 PM' : preselectedTime.includes('Walk-in') ? '03:00 PM' : preselectedTime,
      durationMinutes: 30,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="animate-slide-up w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {confirmed ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-100 text-sage-600">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="mt-3 font-display text-lg font-semibold text-black">Appointment Booked!</h2>
            <p className="mt-1 text-sm text-slate-500">
              {pet.name}'s visit with {vet.full_name} is confirmed.
            </p>
            <div className="mt-5 w-full space-y-2">
              <button
                onClick={handleAddToCalendar}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sage-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage-700"
              >
                <Download className="h-4 w-4" />
                Add to Calendar
              </button>
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sage-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-sage-50"
              >
                Back to Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sage-600">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Quick Book</span>
              </div>
              <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-sage-50 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Vet + details summary */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-sage-100 bg-sage-50/40 p-3">
              {vet.photo_url && (
                <img src={vet.photo_url} alt={vet.full_name} className="h-12 w-12 rounded-xl object-cover" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black">{vet.full_name}</p>
                <p className="text-xs text-slate-500">{vet.credentials} · {vet.specialty}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-sage-100 bg-white px-3 py-2.5 text-sm">
                <Calendar className="h-4 w-4 text-sage-500" />
                <span className="text-slate-600">{formatDateFull(preselectedDate)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-sage-100 bg-white px-3 py-2.5 text-sm">
                <Clock className="h-4 w-4 text-sage-500" />
                <span className="text-slate-600">{preselectedTime}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-sage-100 bg-white px-3 py-2.5 text-sm">
                <Stethoscope className="h-4 w-4 text-sage-500" />
                <span className="text-slate-600">{pet.name} · {pet.breed}</span>
              </div>
            </div>

            {/* Visit type */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Visit Type</p>
              <div className="grid grid-cols-2 gap-2">
                {VISIT_TYPES.map((vt) => (
                  <button
                    key={vt}
                    onClick={() => setVisitType(vt)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                      visitType === vt
                        ? 'border-sage-600 bg-sage-50 text-sage-700 ring-1 ring-sage-600'
                        : 'border-sage-200 bg-white text-slate-600 hover:bg-sage-50'
                    }`}
                  >
                    {vt}
                  </button>
                ))}
              </div>
            </div>

            {/* Triage summary attached indicator */}
            {triageSummaryText && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-xs text-sage-700">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Triage summary attached as reason for visit</span>
              </div>
            )}

            {/* Fee + confirm */}
            <div className="mt-4 flex items-center justify-between border-t border-sage-100 pt-4">
              <div>
                <p className="text-xs text-slate-400">Est. Fee</p>
                <p className="font-display text-lg font-semibold text-sage-700">${vet.consultation_fee}</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="inline-flex items-center gap-2 rounded-2xl bg-sage-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage-700 disabled:opacity-50"
              >
                {confirming ? 'Booking…' : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirm Booking
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
