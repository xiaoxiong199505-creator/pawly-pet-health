import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pet, Vet, Appointment, AppointmentWithVet } from '@/types';

export function useVets() {
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('vets')
        .select('*')
        .order('rating', { ascending: false });
      if (!error && data) setVets(data as Vet[]);
      setLoading(false);
    })();
  }, []);

  return { vets, loading };
}

export function useAppointments() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithVet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
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

    const { data: appts } = await supabase
      .from('appointments')
      .select('*')
      .eq('pet_id', petData.id)
      .order('appointment_date', { ascending: true });

    const apptList = (appts as Appointment[]) ?? [];
    const vetIds = [...new Set(apptList.map((a) => a.vet_id))];
    let vetsMap: Record<string, Vet> = {};
    if (vetIds.length > 0) {
      const { data: vetsData } = await supabase
        .from('vets')
        .select('*')
        .in('id', vetIds);
      vetsMap = ((vetsData as Vet[]) ?? []).reduce((acc, v) => {
        acc[v.id] = v;
        return acc;
      }, {} as Record<string, Vet>);
    }

    const withVets: AppointmentWithVet[] = apptList.map((a) => ({
      ...a,
      vet: vetsMap[a.vet_id] ?? null,
    }));
    setAppointments(withVets);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createAppointment = useCallback(
    async (appt: Omit<Appointment, 'id' | 'created_at' | 'status'>): Promise<Appointment | null> => {
      const { data, error } = await supabase
        .from('appointments')
        .insert({ ...appt, status: 'upcoming' })
        .select('*')
        .maybeSingle();
      if (error || !data) return null;
      return data as Appointment;
    },
    []
  );

  const cancelAppointment = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);
    return !error;
  }, []);

  return {
    pet,
    appointments,
    loading,
    reload: load,
    createAppointment,
    cancelAppointment,
  };
}
