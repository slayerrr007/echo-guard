import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  RefreshCw,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Terminal,
  ChevronRight,
  Minimize2,
} from 'lucide-react';
import { useAppContext } from '../lib/dataContext';
import { evaluateModels, ModelMetrics } from '../services/api';
import { queryEchoGuardChatbot } from '../lib/chatbotHandler';
import { cn } from '../lib/utils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: 'gemini_live' | 'project_help';
  providerLabel?: string;
}

interface StoredPredictionItem {
  timestamp?: string;
  result?: 'ROCK' | 'MINE' | string;
  confidence?: number;
  pRock?: number;
  pMine?: number;
  model?: string;
  inputs?: number[];
}

const SUGGESTED_QUESTIONS = [
  'How does Echo-Guard work?',
  'What is StandardScaler?',
  'Explain my prediction.',
  'What is a false positive?',
  'Compare the three ML models.',
];

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-0',
  role: 'assistant',
  content: [
    '### Echo-Guard AI Assistant Online',
    'Welcome, Operator. I am the **Echo-Guard Technical Assistant** for the Naval Sonar Classification Platform.',
    '',
    '- **Capabilities**: Explain **KNN**, **Logistic Regression**, **Random Forest**, **StandardScaler**, **Accuracy**, **Precision**, **Recall**, **Specificity**, and **Confusion Matrices**, or interpret your latest prediction.',
    '- **Classification Boundary**: All live Rock (`R`) vs. Mine (`M`) sonar classifications are executed by the Python **Flask + `scikit-learn`** pipeline (`https://echo-guard-api.onrender.com`).',
    '',
    'Select a suggested prompt below or enter a query in the terminal input.',
  ].join('\n'),
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const STORAGE_KEY = 'echo_guard_chat_history_v1';

export const Chatbot: React.FC = () => {
  const { selectedModel, metrics } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
    return [INITIAL_WELCOME_MESSAGE];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<'gemini_live' | 'project_help'>('project_help');
  const [providerLabel, setProviderLabel] = useState<string>('Verified Project-Help Mode');
  const [liveEvalMetrics, setLiveEvalMetrics] = useState<Record<string, ModelMetrics> | null>(null);
  const [latestPred, setLatestPred] = useState<StoredPredictionItem | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Persist conversation history in sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage quota issues
    }
  }, [messages]);

  // Sync assistant status and live backend evaluation metrics when opened
  useEffect(() => {
    const fetchStatusAndMetrics = async () => {
      try {
        const res = await fetch('/api/assistant/status');
        if (res.ok) {
          const data = await res.json();
          setAssistantMode(data.mode === 'gemini_live' ? 'gemini_live' : 'project_help');
          setProviderLabel(
            data.mode === 'gemini_live'
              ? 'Live Gemini AI (gemini-3.8-flash)'
              : 'Verified Project-Help Assistant'
          );
        }
      } catch {
        setAssistantMode('project_help');
        setProviderLabel('Verified Project-Help Assistant');
      }

      try {
        const evalRes = await evaluateModels();
        if (evalRes?.models) {
          setLiveEvalMetrics(evalRes.models);
        }
      } catch {
        // Keep existing metrics if evaluation call is unreachable
      }
    };

    fetchStatusAndMetrics();
  }, [isOpen]);

  const readLatestPredictionFromStorage = (): StoredPredictionItem | null => {
    try {
      const raw = localStorage.getItem('predictHistory');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const latest = parsed[parsed.length - 1] as StoredPredictionItem;
        setLatestPred(latest);
        return latest;
      }
    } catch {
      // Ignore storage errors
    }
    setLatestPred(null);
    return null;
  };

  useEffect(() => {
    if (isOpen) {
      readLatestPredictionFromStorage();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const sendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    const currentPred = readLatestPredictionFromStorage();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!textToSend) {
      setInput('');
    }
    setIsLoading(true);

    try {
      const result = await queryEchoGuardChatbot(
        updatedHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        {
          selectedModel,
          latestPrediction: currentPred,
          liveMetrics:
            liveEvalMetrics ||
            (metrics && metrics.model ? { [metrics.model]: metrics } : null),
        }
      );

      setAssistantMode(result.mode);
      setProviderLabel(result.providerLabel);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: result.mode,
        providerLabel: result.providerLabel,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Unable to process query. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setErrorMsg(null);
    const resetMsg: ChatMessage = {
      ...INITIAL_WELCOME_MESSAGE,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([resetMsg]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const formatInlineText = (text: string): React.ReactNode => {
    const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return tokens.map((tok, idx) => {
      if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-green-300">
            {tok.slice(2, -2)}
          </strong>
        );
      }
      if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/30 text-green-300 font-mono text-[11px]"
          >
            {tok.slice(1, -1)}
          </code>
        );
      }
      return <React.Fragment key={idx}>{tok}</React.Fragment>;
    });
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs leading-relaxed">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={i} className="h-1" />;
          }
          if (trimmed.startsWith('### ')) {
            return (
              <h4
                key={i}
                className="text-xs font-mono font-bold uppercase tracking-wider text-green-400 pt-1"
              >
                {formatInlineText(trimmed.slice(4))}
              </h4>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h4
                key={i}
                className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 pt-1"
              >
                {formatInlineText(trimmed.slice(3))}
              </h4>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="text-green-400 font-mono mt-0.5 select-none">›</span>
                <span className="flex-1 text-slate-200">{formatInlineText(trimmed.slice(2))}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
            if (match) {
              return (
                <div key={i} className="flex items-start gap-2 pl-1">
                  <span className="text-green-400 font-mono font-bold shrink-0">
                    {match[1]}
                  </span>
                  <span className="flex-1 text-slate-200">{formatInlineText(match[2])}</span>
                </div>
              );
            }
          }
          return (
            <p key={i} className="text-slate-200">
              {formatInlineText(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Slide-in Chat Window */}
      <div
        className={cn(
          'mb-3 w-[calc(100vw-2.5rem)] sm:w-[425px] h-[600px] max-h-[calc(100vh-6.5rem)] bg-black/95 backdrop-blur-2xl border border-green-500/45 rounded-3xl shadow-[0_0_45px_rgba(34,197,94,0.25)] flex flex-col overflow-hidden transition-all duration-300 ease-out origin-bottom-right',
          isOpen
            ? 'translate-x-0 translate-y-0 opacity-100 scale-100 pointer-events-auto'
            : 'translate-x-8 translate-y-4 opacity-0 scale-95 pointer-events-none h-0 mb-0 border-0'
        )}
        role="dialog"
        aria-hidden={!isOpen}
        aria-label="Echo-Guard AI Assistant Chat Window"
      >
        {/* Matrix-Style Green Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-black via-green-950/45 to-black border-b border-green-500/35 flex items-center justify-between gap-2 relative overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0 relative z-10">
            <div className="w-9 h-9 rounded-2xl bg-green-500/15 border border-green-400/50 flex items-center justify-center text-green-400 shrink-0 shadow-[0_0_15px_rgba(74,222,128,0.35)]">
              <Bot size={19} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-mono font-bold text-white tracking-wider truncate">
                  ECHO-GUARD AI ASSISTANT
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-green-400/90 truncate">
                <Terminal size={10} className="text-green-400 shrink-0" />
                <span className="truncate">{providerLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 relative z-10">
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 rounded-xl text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-colors cursor-pointer"
              title="Clear conversation history"
              aria-label="Clear conversation history"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-colors cursor-pointer"
              title="Close slide-in chat window"
              aria-label="Close slide-in chat window"
            >
              <Minimize2 size={15} />
            </button>
          </div>
        </div>

        {/* Live Telemetry Context Bar */}
        <div className="px-4 py-2 bg-green-950/20 border-b border-green-500/20 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-green-400 shrink-0" />
            <span>
              Model: <strong className="text-green-400">{selectedModel}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {latestPred && latestPred.result ? (
              <span className="text-cyan-300">
                Latest Ping: <strong>{latestPred.result}</strong> (
                {((latestPred.confidence ?? 0) * 100).toFixed(1)}%)
              </span>
            ) : (
              <span className="text-slate-500">Latest Ping: Standby</span>
            )}
          </div>
        </div>

        {/* Scrollable Conversation History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={cn(
                  'flex items-start gap-2.5 animate-in fade-in duration-200',
                  isUser ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border mt-0.5',
                    isUser
                      ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                      : 'bg-green-500/15 border-green-400/50 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]'
                  )}
                >
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>

                <div
                  className={cn(
                    'max-w-[84%] rounded-2xl px-3.5 py-2.5 border',
                    isUser
                      ? 'bg-green-950/35 border-green-400/40 text-slate-100 rounded-tr-sm'
                      : 'bg-slate-950/95 border-green-500/30 text-slate-200 rounded-tl-sm shadow-[0_0_15px_rgba(16,185,129,0.06)]'
                  )}
                >
                  {isUser ? (
                    <p className="text-xs leading-relaxed text-green-100 font-mono">
                      {msg.content}
                    </p>
                  ) : (
                    renderFormattedContent(msg.content)
                  )}

                  <div className="mt-1.5 pt-1 border-t border-green-500/10 flex items-center justify-between gap-2 text-[9px] font-mono text-slate-500">
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <span
                        className={
                          msg.mode === 'gemini_live'
                            ? 'text-cyan-400'
                            : 'text-green-400/80'
                        }
                      >
                        {msg.mode === 'gemini_live'
                          ? 'Gemini 3.8 Flash'
                          : 'Verified Project KB'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading State Indicator */}
          {isLoading && (
            <div className="flex items-start gap-2.5 animate-in fade-in">
              <div className="w-7 h-7 rounded-xl bg-green-500/15 border border-green-400/50 text-green-400 flex items-center justify-center shrink-0">
                <RefreshCw size={13} className="animate-spin" />
              </div>
              <div className="bg-slate-950/95 border border-green-500/35 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs font-mono text-green-400 flex items-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.15)]">
                <span>Processing sonar telemetry query...</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-rose-300 font-mono">
                  Assistant Transmission Error
                </p>
                <p className="text-[11px] text-rose-200/90">{errorMsg}</p>
              </div>
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Suggested Prompts Bar */}
        <div className="px-3.5 py-2 bg-black/95 border-t border-green-500/20">
          <div className="text-[10px] font-mono uppercase tracking-wider text-green-400/80 mb-1.5 flex items-center justify-between">
            <span>Suggested Queries</span>
            <span className="text-slate-500">Click to execute</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isLoading}
                onClick={() => sendMessage(q)}
                className="px-2.5 py-1 rounded-lg bg-green-950/25 hover:bg-green-500/20 text-slate-300 hover:text-green-300 border border-green-500/25 hover:border-green-400/60 text-[11px] font-mono whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <ChevronRight size={11} className="text-green-400" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Input & Send Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3 bg-black border-t border-green-500/30 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about KNN, StandardScaler, or your prediction..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-green-500/30 focus:border-green-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors font-mono"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-slate-950 font-mono font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(74,222,128,0.35)]"
            aria-label="Send message"
          >
            {isLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Floating Action Button (Bottom-Right Corner) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'group flex items-center gap-2.5 px-4 py-3 rounded-full font-mono text-xs font-bold transition-all cursor-pointer border shadow-2xl',
          isOpen
            ? 'bg-black text-green-400 border-green-400/70 shadow-[0_0_25px_rgba(74,222,128,0.35)]'
            : 'bg-black/90 backdrop-blur-xl text-green-400 border-green-400/60 hover:border-green-400 shadow-[0_0_28px_rgba(74,222,128,0.4)] hover:scale-[1.03]'
        )}
        aria-label={isOpen ? 'Close Echo-Guard Chatbot' : 'Open Echo-Guard Chatbot'}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-400 to-emerald-300 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(74,222,128,0.5)]">
          {isOpen ? <X size={16} /> : <MessageSquare size={16} />}
        </div>
        <span className="tracking-wider whitespace-nowrap pr-1">
          {isOpen ? 'CLOSE TERMINAL' : 'ECHO-GUARD AI'}
        </span>
      </button>
    </div>
  );
};

export default Chatbot;
