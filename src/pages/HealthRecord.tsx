import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Syringe,
  Stethoscope,
  Pill,
  Activity,
  Scissors,
  CalendarHeart,
  ChevronRight,
  MessageCircleHeart,
  Weight,
  Cake,
  Dog,
  CalendarPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Pet, HealthEvent, Reminder } from '@/types';

const categoryIcons: Record<string, typeof Syringe> = {
  vaccine: Syringe,
  exam: Stethoscope,
  surgery: Scissors,
  dental: Activity,
  medication: Pill,
};

const categoryColors: Record<string, string> = {
  vaccine: 'bg-sage-100 text-sage-700',
  exam: 'bg-blue-50 text-blue-600',
  surgery: 'bg-rose-50 text-rose-600',
  dental: 'bg-amber-50 text-amber-600',
  medication: 'bg-violet-50 text-violet-600',
};

const reminderTypeIcons: Record<string, typeof Syringe> = {
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

export default function HealthRecord() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: petData } = await supabase
        .from('pets')
        .select('*')
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (!petData) {
        setLoading(false);
        return;
      }
      setPet(petData as Pet);
      const [evRes, remRes] = await Promise.all([
        supabase
          .from('health_events')
          .select('*')
          .eq('pet_id', petData.id)
          .order('event_date', { ascending: false }),
        supabase
          .from('reminders')
          .select('*')
          .eq('pet_id', petData.id)
          .order('due_date', { ascending: true }),
      ]);
      setEvents((evRes.data as HealthEvent[]) ?? []);
      setReminders((remRes.data as Reminder[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading || !pet) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-pulse-soft text-slate-400">Loading health record…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
      {/* Profile header */}
      <div className="animate-fade-in overflow-hidden rounded-3xl border border-sage-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
          {pet.photo_url && (
            <img
              src={pet.photo_url}
              alt={pet.name}
              className="h-24 w-24 rounded-3xl border border-sage-100 object-cover shadow-sm md:h-28 md:w-28"
            />
          )}
          <div className="flex-1">
            <h1 className="font-display text-2xl font-semibold text-black md:text-3xl">
              {pet.name}'s Health Record
            </h1>
            <p className="mt-1 text-sm text-black/80">{pet.breed} · {pet.species}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl bg-sage-50 px-3 py-2 text-sm text-black">
                <Cake className="h-4 w-4 text-sage-500" />
                {pet.age_years} years old
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-sage-50 px-3 py-2 text-sm text-black">
                <Weight className="h-4 w-4 text-sage-500" />
                {pet.weight_kg} kg
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-sage-50 px-3 py-2 text-sm text-black">
                <Dog className="h-4 w-4 text-sage-500" />
                {pet.species}
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-sage-600 px-3 py-2 text-sm font-medium text-white">
                <Activity className="h-4 w-4" />
                Care Score: {pet.care_score}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sage-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-sage-50"
            >
              <MessageCircleHeart className="h-4 w-4" />
              Triage Chat
            </Link>
            <Link
              to="/book"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sage-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage-700"
            >
              <CalendarPlus className="h-4 w-4" />
              Book Appointment
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Upcoming reminders */}
        <div className="animate-slide-up rounded-3xl border border-sage-200 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="flex items-center gap-2 text-sage-600">
            <CalendarHeart className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wide">Upcoming Reminders</span>
          </div>
          <div className="mt-4 space-y-2">
            {reminders.map((r) => {
              const Icon = reminderTypeIcons[r.reminder_type] ?? CalendarHeart;
              const days = daysUntil(r.due_date);
              const urgent = days <= 30;
              return (
                <div
                  key={r.id}
                  className={`rounded-2xl border p-3 transition-colors ${urgent ? 'border-amber-200 bg-amber-50/50' : 'border-sage-100 bg-sage-50/40'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${urgent ? 'bg-amber-100 text-amber-600' : 'bg-sage-100 text-sage-600'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{r.title}</p>
                      <p className="text-xs text-slate-400">{formatDate(r.due_date)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Health history */}
        <div className="animate-slide-up rounded-3xl border border-sage-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-sage-600">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wide">Health History</span>
          </div>
          <div className="mt-5 space-y-1">
            {events.map((ev, i) => {
              const Icon = categoryIcons[ev.category] ?? Activity;
              const colorClass = categoryColors[ev.category] ?? 'bg-sage-100 text-sage-700';
              return (
                <div key={ev.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < events.length - 1 && (
                    <div className="absolute left-[19px] top-10 bottom-0 w-px bg-sage-100" />
                  )}
                  <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-700">{ev.title}</p>
                      <span className="shrink-0 text-xs text-slate-400">{formatDate(ev.event_date)}</span>
                    </div>
                    {ev.description && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{ev.description}</p>
                    )}
                    <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>
                      {ev.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
