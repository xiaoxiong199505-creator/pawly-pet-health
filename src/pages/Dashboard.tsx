import { Link } from 'react-router-dom';
import {
  Activity,
  Utensils,
  Smile,
  CalendarHeart,
  Syringe,
  Stethoscope,
  Pill,
  MessageCircleHeart,
  ChevronRight,
  Sparkles,
  HeartPulse,
  CalendarPlus,
  Clock,
  MapPin,
  X,
} from 'lucide-react';
import { usePetData } from '@/hooks/usePetData';
import { useAppointments } from '@/hooks/useAppointments';
import type { CheckIn, Reminder, AppointmentWithVet } from '@/types';

const reminderIcons: Record<string, typeof Syringe> = {
  vaccine: Syringe,
  exam: Stethoscope,
  dental: Activity,
  medication: Pill,
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00').getTime();
  const now = new Date('2026-09-26T00:00:00').getTime();
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function CareScoreWidget({ score, status }: { score: number; status: string }) {
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="animate-slide-up rounded-3xl border border-sage-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sage-600">
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-semibold uppercase tracking-wide">Care Score</span>
      </div>
      <div className="mt-4 flex items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--sage-100)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--sage-500)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-semibold text-slate-800">{score}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">/ 100</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="font-display text-lg font-medium text-slate-800">{status}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Mochi's care routine is on track. A few upcoming reminders will keep the score steady.
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-medium text-sage-700">
              Vaccines current
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              1 reminder soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityTimeline({ checkIns }: { checkIns: CheckIn[] }) {
  return (
    <div className="animate-slide-up rounded-3xl border border-sage-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sage-600">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">Recent Care Activity</span>
        </div>
      </div>
      <div className="mt-5 space-y-1">
        {checkIns.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No check-ins yet.</p>
        )}
        {checkIns.map((ci, i) => (
          <div key={ci.id} className="relative flex gap-4 pb-5 last:pb-0">
            {i < checkIns.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-sage-100" />
            )}
            <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-sage-200 bg-sage-50">
              <HeartPulse className="h-3.5 w-3.5 text-sage-500" />
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{formatDate(ci.check_date)}</p>
                {i === 0 && (
                  <span className="rounded-full bg-sage-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                    Today
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-lg bg-sage-50 px-2 py-1 text-xs text-slate-600">
                  <Activity className="h-3 w-3 text-sage-500" /> {ci.energy}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-sage-50 px-2 py-1 text-xs text-slate-600">
                  <Utensils className="h-3 w-3 text-sage-500" /> {ci.appetite}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-sage-50 px-2 py-1 text-xs text-slate-600">
                  <Smile className="h-3 w-3 text-sage-500" /> {ci.mood}
                </span>
              </div>
              {ci.notes && (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{ci.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RemindersList({ reminders }: { reminders: Reminder[] }) {
  return (
    <div className="animate-slide-up rounded-3xl border border-sage-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sage-600">
        <CalendarHeart className="h-4 w-4" />
        <span className="text-sm font-semibold uppercase tracking-wide">Upcoming Reminders</span>
      </div>
      <div className="mt-4 space-y-2">
        {reminders.map((r) => {
          const Icon = reminderIcons[r.reminder_type] ?? CalendarHeart;
          const days = daysUntil(r.due_date);
          const urgent = days <= 30;
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-2xl border border-sage-100 bg-sage-50/40 p-3 transition-colors hover:bg-sage-50"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${urgent ? 'bg-amber-100 text-amber-600' : 'bg-sage-100 text-sage-600'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">{r.title}</p>
                <p className="text-xs text-slate-400">{formatDate(r.due_date)}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold ${urgent ? 'text-amber-600' : 'text-sage-600'}`}>
                  {days > 0 ? `${days}d` : 'Due'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingAppointments({ appointments, onCancel }: { appointments: AppointmentWithVet[]; onCancel: (id: string) => void }) {
  const upcoming = appointments.filter((a) => a.status === 'upcoming');

  return (
    <div className="animate-slide-up rounded-3xl border border-sage-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sage-600">
          <CalendarPlus className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">Upcoming Vet Appointments</span>
        </div>
        <Link
          to="/book"
          className="inline-flex items-center gap-1 rounded-lg bg-sage-50 px-3 py-1.5 text-xs font-semibold text-sage-700 transition-colors hover:bg-sage-100"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Book
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-sage-200 bg-sage-50/30 p-6 text-center">
          <CalendarPlus className="mx-auto h-8 w-8 text-sage-300" />
          <p className="mt-2 text-sm text-slate-400">No upcoming appointments.</p>
          <Link
            to="/book"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-sage-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-sage-700"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Book Appointment
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {upcoming.map((appt) => {
            const vet = appt.vet;
            const days = daysUntil(appt.appointment_date);
            return (
              <div
                key={appt.id}
                className="rounded-2xl border border-sage-100 bg-sage-50/40 p-3 transition-colors hover:bg-sage-50"
              >
                <div className="flex items-start gap-3">
                  {vet?.photo_url && (
                    <img
                      src={vet.photo_url}
                      alt={vet.full_name}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black">{vet?.full_name ?? 'Veterinarian'}</p>
                    <p className="text-xs text-slate-500">{vet?.specialty}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarHeart className="h-3 w-3 text-sage-500" />
                        {formatDate(appt.appointment_date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-sage-500" />
                        {appt.time_slot}
                      </span>
                      {vet && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-sage-500" />
                          {vet.clinic_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${days <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-sage-100 text-sage-700'}`}>
                      {days > 0 ? `in ${days}d` : 'Today'}
                    </span>
                    <button
                      onClick={() => onCancel(appt.id)}
                      className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 transition-colors hover:text-rose-500"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { pet, checkIns, reminders, loading } = usePetData();
  const { appointments, loading: apptLoading, cancelAppointment, reload } = useAppointments();

  const handleCancel = async (id: string) => {
    await cancelAppointment(id);
    reload();
  };

  if (loading || !pet) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-pulse-soft text-slate-400">Loading Mochi's care overview…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
      {/* Welcome banner */}
      <div className="animate-fade-in overflow-hidden rounded-3xl bg-gradient-to-br from-sage-600 to-sage-700 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {pet.photo_url && (
              <img
                src={pet.photo_url}
                alt={pet.name}
                className="h-16 w-16 rounded-2xl border-2 border-white/30 object-cover shadow-md md:h-20 md:w-20"
              />
            )}
            <div>
              <p className="text-sm font-medium text-sage-100">Welcome back to Pawly</p>
              <h1 className="font-display text-2xl font-semibold md:text-3xl text-black">{pet.name}</h1>
              <p className="mt-1 text-sm text-black/80">
                {pet.species} · {pet.breed} · {pet.age_years} yrs · {pet.weight_kg} kg
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/chat"
              className="group inline-flex items-center gap-2 rounded-2xl bg-white/90 px-5 py-3 text-sm font-semibold text-sage-700 shadow-md transition-all hover:shadow-lg hover:bg-white"
            >
              <MessageCircleHeart className="h-4 w-4" />
              Triage Chat
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/book"
              className="group inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sage-700 shadow-md transition-all hover:shadow-lg hover:gap-3"
            >
              <CalendarPlus className="h-4 w-4" />
              Book Appointment
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Widgets grid */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CareScoreWidget score={pet.care_score} status={pet.care_status} />
        </div>
        <div className="lg:col-span-2">
          <ActivityTimeline checkIns={checkIns} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingAppointments appointments={appointments} onCancel={handleCancel} />
        </div>
        <div className="lg:col-span-1">
          <div className="animate-slide-up flex h-full flex-col justify-between rounded-3xl border border-sage-200 bg-sage-50/60 p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-sage-600">
                <MessageCircleHeart className="h-4 w-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Triage Check-In</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Not sure if something's off? A quick guided chat with Pawly can help you decide
                whether to call your vet — calmly, no alarm.
              </p>
            </div>
            <Link
              to="/chat"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-sage-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage-700"
            >
              Start a Check-In
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Reminders row */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <RemindersList reminders={reminders} />
        </div>
      </div>
    </div>
  );
}
