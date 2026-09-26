import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pet, CheckIn, Reminder } from '@/types';

export function usePetData() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
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

    const [checkInsRes, remindersRes] = await Promise.all([
      supabase
        .from('check_ins')
        .select('*')
        .eq('pet_id', petData.id)
        .order('check_date', { ascending: false })
        .limit(10),
      supabase
        .from('reminders')
        .select('*')
        .eq('pet_id', petData.id)
        .order('due_date', { ascending: true }),
    ]);

    setCheckIns((checkInsRes.data as CheckIn[]) ?? []);
    setReminders((remindersRes.data as Reminder[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { pet, checkIns, reminders, loading, reload: load };
}
