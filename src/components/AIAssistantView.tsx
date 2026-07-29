import React, { useMemo, useRef, useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AssistantPersonaId, ChatMessage, RoleLevel } from '../types';
import { ASSISTANT_PERSONAS, AssistantPersona } from '../lib/assistantPersonas';
import { DateInput } from './DateInput';

interface AIAssistantViewProps {
  businessContext: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  roleLevel: RoleLevel;
  activeAdminName: string;
}

const MESSAGES_STORAGE_KEY = 'tharnthong_assistant_messages';
const todayStr = () => new Date().toISOString().slice(0, 10);

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL = 'gemini-flash-latest';

const PersonaAvatar: React.FC<{ persona: AssistantPersona; className: string }> = ({
  persona,
  className,
}) => {
  if (persona.avatarImage) {
    return <img src={persona.avatarImage} alt={persona.name} className={className} />;
  }
  return (
    <div
      className={`${className} flex items-center justify-center bg-gradient-to-br from-[#0284C7] to-[#1E3A5F] text-white font-bold`}
    >
      {persona.name.charAt(0)}
    </div>
  );
};

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  businessContext,
  selectedDate,
  onDateChange,
  roleLevel,
  activeAdminName,
}) => {
  const visiblePersonas = Object.values(ASSISTANT_PERSONAS).filter((p) =>
    p.visibleTo.includes(roleLevel)
  );

  const [activePersonaId, setActivePersonaId] = useState<AssistantPersonaId>(
    visiblePersonas[0]?.id || 'snow'
  );
  // Persisted across sessions/logins so the owner can review what accounting staff asked Snow on past days
  const [messagesByPersona, setMessagesByPersona] = useState<
    Record<AssistantPersonaId, ChatMessage[]>
  >(() => {
    const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!saved) return { snow: [] };
    try {
      const parsed = JSON.parse(saved);
      return { snow: [], ...parsed };
    } catch {
      return { snow: [] };
    }
  });

  useEffect(() => {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messagesByPersona));
  }, [messagesByPersona]);

  // Owner viewing Snow: show today's accounting-staff activity log instead of chatting directly
  const isOwnerViewingSnow = roleLevel === 'owner' && activePersonaId === 'snow';
  const [ownerLogDate, setOwnerLogDate] = useState(() => todayStr());

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visiblePersonas.some((p) => p.id === activePersonaId) && visiblePersonas[0]) {
      setActivePersonaId(visiblePersonas[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLevel]);

  const persona = ASSISTANT_PERSONAS[activePersonaId];
  const messages = messagesByPersona[activePersonaId] || [];

  // Group Snow's Q&A by which accounting admin asked, for the owner's daily activity log
  const ownerLogEntries = (() => {
    if (!isOwnerViewingSnow) return [] as { askedBy: string; question: string; answer?: string; timestamp: string }[];
    const snowMessages = (messagesByPersona.snow || []).filter((m) => m.date === ownerLogDate);
    const entries: { askedBy: string; question: string; answer?: string; timestamp: string }[] = [];
    snowMessages.forEach((m, i) => {
      if (m.role !== 'user') return;
      const next = snowMessages[i + 1];
      entries.push({
        askedBy: m.askedBy || 'ไม่ทราบชื่อ',
        question: m.text,
        answer: next?.role === 'model' ? next.text : undefined,
        timestamp: m.timestamp,
      });
    });
    return entries;
  })();

  const ownerLogByAdmin = ownerLogEntries.reduce<Record<string, typeof ownerLogEntries>>((acc, entry) => {
    (acc[entry.askedBy] ||= []).push(entry);
    return acc;
  }, {});

  const ai = useMemo(() => {
    if (!API_KEY) return null;
    return new GoogleGenAI({ apiKey: API_KEY });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (!ai) {
      setErrorMsg(
        'ยังไม่ได้ตั้งค่า Gemini API Key กรุณาใส่ VITE_GEMINI_API_KEY ในไฟล์ .env.local แล้วรีสตาร์ทเซิร์ฟเวอร์'
      );
      return;
    }

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `MSG-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      date: todayStr(),
      askedBy: activeAdminName,
    };

    const historyForRequest = [...messages, userMsg];
    setMessagesByPersona((prev) => ({ ...prev, [activePersonaId]: historyForRequest }));
    setInput('');
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: historyForRequest.map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
        config: {
          systemInstruction: persona.systemInstruction(businessContext),
        },
      });

      const replyText = response.text || 'ขออภัยค่ะ/ครับ ไม่สามารถสร้างคำตอบได้ในขณะนี้';
      const modelMsg: ChatMessage = {
        id: `MSG-${Date.now()}-r`,
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        date: todayStr(),
      };
      setMessagesByPersona((prev) => ({
        ...prev,
        [activePersonaId]: [...(prev[activePersonaId] || []), modelMsg],
      }));
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? `เกิดข้อผิดพลาด: ${err.message}` : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Gemini API'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-[#D2E0EB] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] flex items-center gap-2 font-sans">
              <span className="material-symbols-outlined text-[#0284C7]">smart_toy</span>
              ผู้ช่วย AI สรุปรายวัน
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              คุยกับผู้ช่วยเพื่อสรุปงานประจำวัน โดยอ้างอิงข้อมูลจริงจากระบบร้าน
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1.5 rounded-xl">
            <span className="material-symbols-outlined text-sm text-[#0284C7]">calendar_today</span>
            <span className="text-xs font-bold text-[#1E3A5F]">ข้อมูลวันที่:</span>
            <DateInput
              value={selectedDate}
              onChange={onDateChange}
              className="bg-transparent text-xs font-bold text-[#0284C7] data-mono outline-none cursor-pointer w-24"
            />
          </div>
        </div>

      </section>

      {!API_KEY && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-semibold px-4 py-3 rounded-2xl flex items-start gap-2">
          <span className="material-symbols-outlined text-base">warning</span>
          <span>
            ยังไม่ได้ตั้งค่า Gemini API Key — เพิ่ม <code className="bg-white/60 px-1 rounded">VITE_GEMINI_API_KEY</code> ในไฟล์{' '}
            <code className="bg-white/60 px-1 rounded">.env.local</code> แล้วรีสตาร์ทเซิร์ฟเวอร์ dev
          </span>
        </div>
      )}

      {/* Owner's view of Snow: daily activity log of what the accounting staff asked, instead of chatting directly */}
      {isOwnerViewingSnow && (
        <section className="bg-white rounded-2xl border border-[#D2E0EB] shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-[#1E3A5F] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0284C7]">group</span>
                กิจกรรมฝ่ายบัญชีวันนี้ — ใครถาม Snow อะไรบ้าง
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                ดูได้ว่าแอดมินฝ่ายบัญชีแต่ละคนถาม Snow เรื่องอะไรไปบ้างในแต่ละวัน
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1.5 rounded-xl shrink-0">
              <span className="material-symbols-outlined text-sm text-[#0284C7]">calendar_today</span>
              <DateInput
                value={ownerLogDate}
                onChange={setOwnerLogDate}
                className="bg-transparent text-xs font-bold text-[#0284C7] data-mono outline-none cursor-pointer w-24"
              />
            </div>
          </div>

          {Object.keys(ownerLogByAdmin).length === 0 ? (
            <div className="text-center text-xs text-[#94A3B8] py-8">
              ยังไม่มีแอดมินฝ่ายบัญชีคุยกับ Snow ในวันที่เลือกนี้
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(ownerLogByAdmin).map(([adminName, entries]) => (
                <div key={adminName} className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
                  <div className="bg-[#EBF2F7] px-4 py-2.5 flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1E3A5F] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">person</span>
                      {adminName}
                    </span>
                    <span className="text-[10px] font-bold bg-white text-[#64748B] px-2 py-0.5 rounded-full border border-[#D2E0EB]">
                      ถาม {entries.length} ครั้ง
                    </span>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {entries.map((e, i) => (
                      <div key={i} className="p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#94A3B8] data-mono shrink-0">{e.timestamp}</span>
                          <span className="text-xs font-bold text-[#1E293B]">{e.question}</span>
                        </div>
                        {e.answer && (
                          <p className="text-[11px] text-[#64748B] pl-[52px] line-clamp-3 whitespace-pre-wrap">{e.answer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Chat Window */}
      <section className="bg-white rounded-2xl border border-[#D2E0EB] shadow-xs flex flex-col h-[60dvh] min-h-[420px]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0]">
          <PersonaAvatar
            persona={persona}
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#D2E0EB]"
          />
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-[#1E3A5F]">{persona.name}</p>
            <p className="text-[11px] text-[#64748B] truncate">{persona.role}</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex gap-2.5 max-w-[85%]">
              <PersonaAvatar
                persona={persona}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#D2E0EB]"
              />
              <div className="bg-[#F1F5F9] text-[#1E293B] text-sm rounded-2xl rounded-tl-sm px-4 py-2.5">
                {persona.greeting}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {m.role === 'model' && (
                <PersonaAvatar
                  persona={persona}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#D2E0EB]"
                />
              )}
              <div
                className={`text-sm px-4 py-2.5 whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#1E3A5F] text-white rounded-2xl rounded-tr-sm'
                    : 'bg-[#F1F5F9] text-[#1E293B] rounded-2xl rounded-tl-sm'
                }`}
              >
                {m.text}
                <div
                  className={`text-[10px] mt-1 opacity-60 ${
                    m.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 max-w-[85%]">
              <PersonaAvatar
                persona={persona}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#D2E0EB]"
              />
              <div className="bg-[#F1F5F9] text-[#64748B] text-sm rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#94A3B8] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-[#94A3B8] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-[#94A3B8] rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mx-4 mb-2 bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs font-semibold px-3 py-2 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Quick action + input */}
        <div className="border-t border-[#E2E8F0] p-3 space-y-2">
          <button
            onClick={() => sendMessage(persona.quickAction)}
            disabled={isLoading}
            className="text-xs font-bold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] px-3 py-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 w-fit"
          >
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            {persona.quickAction}
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`พิมพ์คำถามถึง ${persona.name}...`}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-[#CBD5E1] rounded-full text-sm focus:ring-2 focus:ring-[#0284C7] outline-none disabled:bg-[#F8FAFC]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-11 h-11 shrink-0 rounded-full bg-[#1E3A5F] hover:bg-[#152C4A] disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
