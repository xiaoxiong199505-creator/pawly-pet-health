import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { TriageSummary } from '@/types';

interface TriageContextValue {
  triageSummary: TriageSummary | null;
  setTriageSummary: (summary: TriageSummary | null) => void;
  clearTriageSummary: () => void;
  buildTriageSummaryText: () => string;
}

const TriageContext = createContext<TriageContextValue | null>(null);

export function TriageProvider({ children }: { children: ReactNode }) {
  const [triageSummary, setTriageSummaryState] = useState<TriageSummary | null>(null);

  const setTriageSummary = useCallback((summary: TriageSummary | null) => {
    setTriageSummaryState(summary);
  }, []);

  const clearTriageSummary = useCallback(() => {
    setTriageSummaryState(null);
  }, []);

  const buildTriageSummaryText = useCallback((): string => {
    if (!triageSummary) return '';
    const lines: string[] = ['AI Triage Health Review Summary:'];
    if (triageSummary.energy && triageSummary.energy !== '—')
      lines.push(`- Energy: ${triageSummary.energy}`);
    if (triageSummary.appetite && triageSummary.appetite !== '—')
      lines.push(`- Appetite: ${triageSummary.appetite}`);
    if (triageSummary.stool && triageSummary.stool !== '—')
      lines.push(`- Stool Quality: ${triageSummary.stool}`);
    if (triageSummary.duration && triageSummary.duration !== '—')
      lines.push(`- Duration: ${triageSummary.duration}`);
    if (triageSummary.emergencyActive)
      lines.push('- SAFETY FLAG: Emergency symptoms detected during triage');
    if (triageSummary.warningActive)
      lines.push('- SAFETY FLAG: Out-of-scope request detected during triage');
    return lines.join('\n');
  }, [triageSummary]);

  return (
    <TriageContext.Provider
      value={{ triageSummary, setTriageSummary, clearTriageSummary, buildTriageSummaryText }}
    >
      {children}
    </TriageContext.Provider>
  );
}

export function useTriageContext(): TriageContextValue {
  const ctx = useContext(TriageContext);
  if (!ctx) throw new Error('useTriageContext must be used within TriageProvider');
  return ctx;
}
