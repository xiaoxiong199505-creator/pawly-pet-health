import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PawPrint,
  Send,
  AlertTriangle,
  ShieldAlert,
  Hospital,
  CheckCircle2,
  Activity,
  Utensils,
  Droplets,
  Clock,
  RotateCcw,
  ChevronRight,
  Bot,
  CircleAlert,
  CalendarPlus,
  Star,
  MapPin,
  Sparkles,
  Navigation,
  Stethoscope,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  getInitialGreeting,
  buildTriageResponse,
  detectRedFlag,
} from '@/lib/triage';
import { useTriageContext } from '@/hooks/useTriageContext';
import { useVets, useAppointments } from '@/hooks/useAppointments';
import { matchVets, hasEnoughDataForMatching, isTriageComplete, type VetMatch } from '@/lib/vetMatching';
import InlineBookingModal from '@/components/InlineBookingModal';
import type { Pet, ChatMessage as DbChatMessage, TriageSummary, SafetyFlag, Vet } from '@/types';

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  flag: SafetyFlag;
  isEmergency?: boolean;
  isDisclaimer?: boolean;
  vetRecommendation?: VetMatch;
}

const emptySummary: TriageSummary = {
  energy: '—',
  appetite: '—',
  stool: '—',
  duration: '—',
  stage: 0,
  warningActive: false,
  emergencyActive: false,
};

const summaryFields = [
  { key: 'energy' as const, label: 'Energy', icon: Activity },
  { key: 'appetite' as const, label: 'Appetite', icon: Utensils },
  { key: 'stool' as const, label: 'Stool Quality', icon: Droplets },
  { key: 'duration' as const, label: 'Duration', icon: Clock },
];

// 需要拦截的系统按钮及确认文本列表，防止写入病症卡片
const SYSTEM_ACTION_TEXTS = [
  'I understand, thank you',
  'Find Nearest ER Vet',
  'Book This Vet Now',
  'Directions to ER Vet',
  'Restart',
  'I understand',
  'Thank you',
];

export default function TriageChat() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [stage, setStage] = useState(0);
  const [summary, setSummary] = useState<TriageSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [bookingMatch, setBookingMatch] = useState<VetMatch | null>(null);

  const { vets } = useVets();
  const { createAppointment } = useAppointments();
  const { setTriageSummary, buildTriageSummaryText } = useTriageContext();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: petData } = await supabase
        .from('pets')
        .select('*')
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (petData) setPet(petData as Pet);
      setLoading(false);
    })();
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  const startConversation = useCallback(() => {
    const greeting = getInitialGreeting();
    setMessages([{
      id: crypto.randomUUID(),
      role: 'assistant',
      content: greeting.content,
      flag: 'normal',
    }]);
    setStage(greeting.stage);
    setQuickReplies(greeting.quickReplies);
    setSummary({ ...emptySummary, stage: 0 });
  }, []);

  useEffect(() => {
    if (!loading && messages.length === 0) startConversation();
  }, [loading, messages.length, startConversation]);

  // Compute vet matches based on current summary
  const vetMatches = useMemo<VetMatch[]>(() => {
    if (vets.length === 0 || !hasEnoughDataForMatching(summary)) return [];
    return matchVets(vets, summary, 2);
  }, [vets, summary]);

  // Track whether we've already posted a recommendation card in chat
  const [postedRecommendation, setPostedRecommendation] = useState(false);
  const [postedEmergencyRec, setPostedEmergencyRec] = useState(false);

  const persistMessage = async (
    petId: string,
    role: 'user' | 'assistant',
    content: string,
    flag: SafetyFlag,
    triageStage: number | null
  ) => {
    await supabase.from('chat_messages').insert({
      pet_id: petId,
      role,
      content,
      flag,
      triage_stage: triageStage ? String(triageStage) : null,
    });
  };

  const handleSend = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || !pet || typing) return;

    setInput('');
    const isEmergencyInput = detectRedFlag(userText);

    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      flag: isEmergencyInput ? 'emergency' : 'normal',
    }]);
    setQuickReplies([]);
    setTyping(true);

    const stageBefore = stage;
    let newSummary = { ...summary };

    // 检查是否为系统确认/操作按钮文本
    const isSystemAction = SYSTEM_ACTION_TEXTS.some(
      (sysText) => sysText.toLowerCase() === userText.toLowerCase()
    );

    // 🛡️ 仅当非系统文本、非紧急警报激活且处于有效阶段 (1-4) 时，才更新右侧卡片病症槽位
    if (!isSystemAction && !summary.emergencyActive && stageBefore >= 1 && stageBefore <= 4) {
      setSummary((prev) => {
        newSummary = { ...prev };
        switch (stageBefore) {
          case 1: newSummary.energy = userText; break;
          case 2: newSummary.appetite = userText; break;
          case 3: newSummary.stool = userText; break;
          case 4: newSummary.duration = userText; break;
        }
        return newSummary;
      });
    }

    const response = buildTriageResponse(userText, stageBefore, summary);
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 500));

    const assistantMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.content,
      flag: response.flag,
      isEmergency: response.isEmergency,
      isDisclaimer: response.isDisclaimer,
    };

    // Update summary for emergency/disclaimer
    if (response.isEmergency) {
      newSummary = { ...newSummary, emergencyActive: true };
      setSummary(newSummary);
    } else if (response.isDisclaimer) {
      newSummary = { ...newSummary, warningActive: true };
      setSummary(newSummary);
    }

    setStage(response.stage);
    setQuickReplies(response.quickReplies);
    setTyping(false);

    // Post vet recommendation card into chat when triage completes or emergency detected
    const shouldPostEmergency = response.isEmergency && !postedEmergencyRec;
    const shouldPostCompletion = response.stage >= 5 && !postedRecommendation;

    if (shouldPostEmergency || shouldPostCompletion) {
      const matches = matchVets(vets, newSummary, 2);
      if (matches.length > 0) {
        const intro = shouldPostEmergency
          ? 'Given the urgency, here is the nearest ER vet I recommend:'
          : 'Based on what you shared, here is the vet I think is the best match for Mochi right now:';
        // Post intro text first, then the card
        setMessages((prev) => [
          ...prev,
          assistantMsg,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: intro,
            flag: shouldPostEmergency ? 'emergency' : 'normal',
          },
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            flag: shouldPostEmergency ? 'emergency' : 'normal',
            vetRecommendation: matches[0],
          },
        ]);
        if (shouldPostEmergency) setPostedEmergencyRec(true);
        if (shouldPostCompletion) setPostedRecommendation(true);
      } else {
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } else {
      setMessages((prev) => [...prev, assistantMsg]);
    }

    if (pet) {
      await persistMessage(pet.id, 'user', userText, isEmergencyInput ? 'emergency' : 'normal', stageBefore);
      await persistMessage(pet.id, 'assistant', response.content, response.flag, response.stage);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setQuickReplies([]);
    setStage(0);
    setSummary({ ...emptySummary });
    setPostedRecommendation(false);
    setPostedEmergencyRec(false);
    startConversation();
  };

  const handleQuickBook = (match: VetMatch) => {
    setBookingMatch(match);
    setTriageSummary(summary);
  };

  const handleConfirmBooking = async (data: {
    vetId: string;
    date: string;
    timeSlot: string;
    visitType: string;
    triageSummary: string;
    notes: string;
  }): Promise<boolean> => {
    if (!pet) return false;
    const result = await createAppointment({
      pet_id: pet.id,
      vet_id: data.vetId,
      appointment_date: data.date,
      time_slot: data.timeSlot,
      visit_type: data.visitType,
      triage_summary: data.triageSummary || null,
      notes: data.notes || null,
    });
    return result !== null;
  };

  if (loading || !pet) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-pulse-soft text-slate-400">Loading Pawly Triage…</div>
      </div>
    );
  }

  const completedSteps = summaryFields.filter((f) => summary[f.key] !== '—').length;
  const progressPct = (completedSteps / 4) * 100;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col md:h-screen md:flex-row md:overflow-hidden">
      {/* Mobile top bar */}
      <div className="flex items-center gap-2 border-b border-sage-200 bg-sage-50/60 px-5 py-3 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-600 text-white">
          <PawPrint className="h-4 w-4" />
        </div>
        <span className="font-display text-base font-semibold text-slate-800">Pawly Triage</span>
      </div>

      {/* Left: Chat panel */}
      <div className="flex flex-1 flex-col md:h-screen md:min-w-0 md:flex-1">
        {/* Chat header */}
        <div className="hidden items-center gap-3 border-b border-sage-200 bg-white/60 px-6 py-4 backdrop-blur-sm md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-display text-base font-semibold text-slate-800">Pawly Triage Assistant</p>
            <p className="flex items-center gap-1 text-xs text-sage-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sage-500" />
              Online · Educational guidance only
            </p>
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sage-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-sage-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              petName={pet.name}
              onBookVet={handleQuickBook}
            />
          ))}
          {typing && (
            <div className="flex items-end gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white shadow-sm">
                <PawPrint className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm border border-sage-100">
                <span className="typing-dot h-2 w-2 rounded-full bg-sage-400" />
                <span className="typing-dot h-2 w-2 rounded-full bg-sage-400" />
                <span className="typing-dot h-2 w-2 rounded-full bg-sage-400" />
              </div>
            </div>
          )}
        </div>

        {/* Quick replies */}
        {quickReplies.length > 0 && !typing && (
          <div className="flex flex-wrap gap-2 px-4 pb-2 md:px-8">
            {quickReplies.map((reply, i) => {
              const isER = reply === 'Find Nearest ER Vet';
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (isER) {
                      window.open('https://www.google.com/maps/search/emergency+veterinary+clinic', '_blank');
                    } else {
                      handleSend(reply);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all hover:scale-[1.02] active:scale-95 ${
                    isER
                      ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'border-sage-300 bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  {isER && <Hospital className="h-3.5 w-3.5" />}
                  {reply}
                </button>
              );
            })}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-sage-200 bg-white/60 px-4 py-3 backdrop-blur-sm md:px-8 md:py-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe what you're noticing with Mochi…"
              className="flex-1 rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || typing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-sm transition-all hover:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <CircleAlert className="h-3 w-3" />
            Pawly offers educational triage, not veterinary diagnosis or prescriptions.
          </p>
        </div>
      </div>

      {/* Right: Triage Health Review + AI Matched Vets */}
      <div className="border-t border-sage-200 bg-sage-50/40 md:h-screen md:w-[340px] lg:w-[380px] md:shrink-0 md:border-l md:border-t-0 md:overflow-y-auto">
        <TriageSummaryCard
          summary={summary}
          progressPct={progressPct}
          petName={pet.name}
          petPhoto={pet.photo_url}
          vetMatches={vetMatches}
          onBookVet={handleQuickBook}
          setTriageSummary={setTriageSummary}
        />
      </div>

      {/* Inline booking modal */}
      {bookingMatch && pet && (
        <InlineBookingModal
          vet={bookingMatch.vet}
          pet={pet}
          preselectedDate={bookingMatch.earliestDate}
          preselectedTime={bookingMatch.earliestSlot}
          triageSummary={summary}
          triageSummaryText={buildTriageSummaryText()}
          onConfirm={handleConfirmBooking}
          onClose={() => setBookingMatch(null)}
        />
      )}
    </div>
  );
}

/* ---------- Chat Message Bubble ---------- */

function MessageBubble({
  message,
  petName,
  onBookVet,
}: {
  message: UIMessage;
  petName: string;
  onBookVet: (match: VetMatch) => void;
}) {
  if (message.vetRecommendation) {
    return <ChatVetCard match={message.vetRecommendation} onBook={onBookVet} />;
  }

  const isUser = message.role === 'user';

  if (message.isEmergency) {
    return (
      <div className="animate-slide-up">
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-700">
            <ShieldAlert className="h-5 w-5" />
            <span className="font-display text-sm font-semibold uppercase tracking-wide">Urgent — Possible Emergency</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-rose-800">{message.content}</p>
          <button
            onClick={() => window.open('https://www.google.com/maps/search/emergency+veterinary+clinic', '_blank')}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-700 sm:w-auto"
          >
            <Hospital className="h-4 w-4" />
            Find Nearest ER Vet
          </button>
        </div>
      </div>
    );
  }

  if (message.isDisclaimer) {
    return (
      <div className="animate-slide-up flex items-end gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white shadow-sm">
          <PawPrint className="h-4 w-4" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-amber-200 bg-amber-50/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Medical Boundary</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-slide-up flex items-end gap-2.5 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white shadow-sm">
          <PawPrint className="h-4 w-4" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
        isUser ? 'rounded-br-md bg-sage-600 text-white' : 'rounded-bl-md bg-white text-slate-700 border border-sage-100'
      }`}>
        {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-white shadow-sm">
          <span className="text-[11px] font-bold">You</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Chat Vet Recommendation Card ---------- */

function ChatVetCard({ match, onBook }: { match: VetMatch; onBook: (m: VetMatch) => void }) {
  const { vet, matchScore, rationale, earliestSlot, isEmergency } = match;

  return (
    <div className="animate-slide-up flex items-end gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white shadow-sm">
        <PawPrint className="h-4 w-4" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-sage-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sage-600">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wide">AI Recommended Vet</span>
        </div>
        <div className="mt-3 flex items-start gap-3">
          {vet.photo_url && (
            <img src={vet.photo_url} alt={vet.full_name} className="h-12 w-12 rounded-xl object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-black">{vet.full_name}</p>
            <p className="text-xs text-slate-500">{vet.credentials} · {vet.specialty}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isEmergency ? 'bg-rose-100 text-rose-700' : 'bg-sage-100 text-sage-700'
              }`}>
                <Sparkles className="h-2.5 w-2.5" />
                {matchScore}% Match
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                {vet.rating}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-slate-500">{rationale}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          Earliest: {earliestSlot}
        </div>
        <button
          onClick={() => onBook(match)}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all ${
            isEmergency ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sage-600 hover:bg-sage-700'
          }`}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Book This Vet Now
        </button>
      </div>
    </div>
  );
}

/* ---------- Right Panel: Triage Summary + AI Matched Vets ---------- */

function TriageSummaryCard({
  summary,
  progressPct,
  petName,
  petPhoto,
  vetMatches,
  onBookVet,
  setTriageSummary,
}: {
  summary: TriageSummary;
  progressPct: number;
  petName: string;
  petPhoto: string | null;
  vetMatches: VetMatch[];
  onBookVet: (match: VetMatch) => void;
  setTriageSummary: (s: TriageSummary) => void;
}) {
  return (
    <div className="p-5 md:p-6">
      {/* Pet mini header */}
      <div className="flex items-center gap-3">
        {petPhoto && (
          <img src={petPhoto} alt={petName} className="h-12 w-12 rounded-2xl border border-sage-100 object-cover shadow-sm" />
        )}
        <div>
          <p className="font-display text-base font-semibold text-black">{petName}</p>
          <p className="text-xs text-black/70">Triage Health Review</p>
        </div>
      </div>

      {/* Warning / Emergency badge */}
      {(summary.warningActive || summary.emergencyActive) && (
        <div className={`mt-4 flex items-center gap-2 rounded-2xl border p-3 text-sm font-medium animate-fade-in ${
          summary.emergencyActive ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-amber-300 bg-amber-50 text-amber-700'
        }`}>
          {summary.emergencyActive ? (
            <><ShieldAlert className="h-4 w-4" /> Emergency flag triggered — seek immediate care</>
          ) : (
            <><AlertTriangle className="h-4 w-4" /> Out-of-scope request — guidance boundary shown</>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-sage-600">Triage Progress</span>
          <span className="text-xs text-slate-400">{Math.round(progressPct)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sage-100">
          <div className="h-full rounded-full bg-sage-500 transition-all duration-700 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Summary fields */}
      <div className="mt-5 space-y-2.5">
        {summaryFields.map((field) => {
          const Icon = field.icon;
          const filled = summary[field.key] !== '—';
          return (
            <div key={field.key} className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${
              filled ? 'border-sage-200 bg-white shadow-sm' : 'border-sage-100 bg-sage-50/30'
            }`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                filled ? 'bg-sage-100 text-sage-600' : 'bg-sage-50 text-slate-300'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-black/60">{field.label}</p>
                <p className={`truncate text-sm font-medium ${filled ? 'text-black' : 'text-slate-300'}`}>
                  {summary[field.key]}
                </p>
              </div>
              {filled && <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-500" />}
            </div>
          );
        })}
      </div>

      {/* Status note */}
      <div className="mt-5 rounded-2xl border border-sage-100 bg-white/60 p-4">
        <div className="flex items-center gap-2 text-sage-600">
          <PawPrint className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wide">Pawly's Note</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {progressPct === 100
            ? 'Triage check complete. This summary is educational only — not a diagnosis. If anything concerns you, contact your vet.'
            : progressPct === 0
            ? "Answer a few gentle questions and I'll build a calm summary of what you're seeing."
            : 'Keep going — a few more questions to complete the picture.'}
        </p>
      </div>

      {/* AI-Matched Veterinarians section */}
      {vetMatches.length > 0 && (
        <div className="mt-5 animate-fade-in">
          <div className="flex items-center gap-2 text-sage-600">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">AI-Matched Veterinarians</span>
          </div>
          <div className="mt-3 space-y-3">
            {vetMatches.map((match) => (
              <MatchedVetCard key={match.vet.id} match={match} onBook={onBookVet} />
            ))}
          </div>
        </div>
      )}

      {/* Book vet with triage summary */}
      {(progressPct > 0 || summary.emergencyActive || summary.warningActive) && (
        <Link
          to="/book?from=triage"
          onClick={() => setTriageSummary(summary)}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-sage-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage-700"
        >
          <CalendarPlus className="h-4 w-4" />
          Book a Vet with This Summary
        </Link>
      )}

      {/* Quick links */}
      <div className="mt-3 space-y-2">
        <Link to="/" className="flex items-center justify-between rounded-2xl border border-sage-100 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-sage-50">
          Back to Dashboard
          <ChevronRight className="h-4 w-4 text-sage-400" />
        </Link>
        <Link to="/record" className="flex items-center justify-between rounded-2xl border border-sage-100 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-sage-50">
          View Health Record
          <ChevronRight className="h-4 w-4 text-sage-400" />
        </Link>
      </div>
    </div>
  );
}

/* ---------- Matched Vet Card (right panel) ---------- */

function MatchedVetCard({ match, onBook }: { match: VetMatch; onBook: (m: VetMatch) => void }) {
  const { vet, matchScore, rationale, earliestSlot, earliestDate, isEmergency } = match;

  return (
    <div className={`rounded-2xl border bg-white p-3.5 shadow-sm transition-all hover:shadow-md ${
      isEmergency ? 'border-rose-200' : 'border-sage-200'
    }`}>
      <div className="flex items-start gap-3">
        {vet.photo_url && (
          <img src={vet.photo_url} alt={vet.full_name} className="h-11 w-11 rounded-xl object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-black">{vet.full_name}</p>
          <p className="text-xs text-slate-500">{vet.credentials}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isEmergency ? 'bg-rose-100 text-rose-700' : 'bg-sage-100 text-sage-700'
            }`}>
              <Sparkles className="h-2.5 w-2.5" />
              {matchScore}% Match
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {vet.rating}
            </span>
          </div>
        </div>
      </div>

      {/* Specialty */}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <Stethoscope className="h-3 w-3 text-sage-500" />
        {vet.specialty}
      </div>

      {/* Rationale */}
      <div className={`mt-2 rounded-xl p-2.5 text-xs leading-relaxed ${
        isEmergency ? 'bg-rose-50 text-rose-700' : 'bg-sage-50 text-slate-600'
      }`}>
        <span className="font-semibold">Why: </span>{rationale}
      </div>

      {/* Location + earliest slot */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {vet.distance_km} km
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {earliestSlot}
        </span>
      </div>

      {/* CTA buttons */}
      <div className="mt-3 flex gap-2">
        {isEmergency ? (
          <button
            onClick={() => window.open('https://www.google.com/maps/search/emergency+veterinary+clinic', '_blank')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-rose-700"
          >
            <Navigation className="h-3.5 w-3.5" />
            Directions to ER Vet
          </button>
        ) : (
          <button
            onClick={() => onBook(match)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sage-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-sage-700"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Quick Book Slot
          </button>
        )}
      </div>
    </div>
  );
}
