import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  streamDeepOnboarding,
  completeOnboarding,
  pollEngineDone,
  type ChatMessage,
  type DeepOnboardingDoneEvent,
} from "../utils/cognivest-api";
import { VoiceMicButton } from "./ui/VoiceMicButton";
import OnboardingReviewPanel from "./OnboardingReviewPanel";

// ── Icons ──────────────────────────────────────────────────────────
const SendSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ── Markdown renderer (identical to ChatInterface) ─────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/);
  return (
    <>
      {parts.map((part, k) => {
        if (/^\*\*[^*]+\*\*$/.test(part))
          return <strong key={k} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        if (/^_[^_]+_$/.test(part))
          return <em key={k} className="italic opacity-90">{part.slice(1, -1)}</em>;
        if (/^`[^`]+`$/.test(part))
          return <code key={k} className="px-1 py-0.5 rounded text-[11px] bg-white/10 font-mono tracking-tight">{part.slice(1, -1)}</code>;
        return <span key={k}>{part}</span>;
      })}
    </>
  );
}

// Strip only the deep onboarding completion marker (<<ONBOARDING>> stays visible in this flow)
const MARKERS       = ["<<DETAILS_COMPLETE>>"];
const MAX_MARKER_LEN = Math.max(...MARKERS.map(m => m.length));

function renderMarkdown(rawText: string, streaming?: boolean): React.ReactNode {
  const text = rawText.replace(/<<DETAILS_COMPLETE>>/g, "").trim();
  if (!text) return null;

  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);

    if (h2) {
      result.push(<p key={i} className="font-bold text-foreground text-[13px] mt-2.5 mb-0.5">{renderInline(h2[1])}</p>);
      i++;
    } else if (h3) {
      result.push(<p key={i} className="font-semibold text-foreground/90 text-[13px] mt-2 mb-0.5">{renderInline(h3[1])}</p>);
      i++;
    } else if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      const startI = i;
      while (i < lines.length && /^[-*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, "")); i++; }
      result.push(
        <ul key={startI} className="my-1 space-y-0.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="mt-[7px] w-[3px] h-[3px] rounded-full bg-foreground/40 flex-shrink-0" />
              <span className="text-foreground/80">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      const startI = i;
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, "")); i++; }
      result.push(
        <ol key={startI} className="my-1 space-y-0.5 list-none">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="text-foreground/40 font-mono text-[11px] min-w-[1.4rem] mt-0.5 flex-shrink-0">{j + 1}.</span>
              <span className="text-foreground/80">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    } else if (line.trim() === "") {
      i++;
    } else {
      result.push(<p key={i} className="leading-relaxed text-foreground/80">{renderInline(line)}</p>);
      i++;
    }
  }

  return <div className={`space-y-1 text-sm${streaming ? " streaming-msg" : ""}`}>{result}</div>;
}

// ── Bezier typing animation (identical to ChatInterface) ───────────

const BASE_CHAR_DELAY_MS = 14;
const BEZIER_VARIANCE_MS = 12;

function _cubicBezierY(x: number, x1: number, y1: number, x2: number, y2: number): number {
  const bx = (t: number) => 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3;
  const by = (t: number) => 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (bx(mid) < x) lo = mid; else hi = mid; }
  return by((lo + hi) / 2);
}

function _charDelay(pos: number): number {
  const eased = _cubicBezierY(pos, 0.42, 0, 0.58, 1);
  return BASE_CHAR_DELAY_MS + BEZIER_VARIANCE_MS * Math.abs(eased - 0.5) * 2;
}

// ── Types ──────────────────────────────────────────────────────────

type Phase = "chat" | "review" | "submitting" | "done";

interface DeepOnboardingChatProps {
  clientId: string;
  onComplete: () => void;
}

// ── Component ──────────────────────────────────────────────────────

const DeepOnboardingChat: React.FC<DeepOnboardingChatProps> = ({ clientId, onComplete }) => {
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue]   = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [isStreaming, setIsStreaming]  = useState(false);
  const [phase, setPhase]             = useState<Phase>("chat");
  const [rawProfile, setRawProfile]   = useState<Record<string, unknown> | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const charQueueRef         = useRef<{ ch: string; delay: number }[]>([]);
  const schedulerActive      = useRef(false);
  const pendingTimeout       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRef          = useRef<() => void>(() => {});
  const streamDoneRef        = useRef(false);
  const pendingDoneRef       = useRef<DeepOnboardingDoneEvent | null>(null);
  const displayBufRef        = useRef("");
  const autoStarted          = useRef(false);

  const scrollToBottom = (instant?: boolean) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (instant) el.scrollTop = el.scrollHeight;
    else el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(isStreaming); }, [messages, isLoading, isStreaming]);

  // ── Bezier character scheduler ─────────────────────────────────

  const applyDone = useCallback((meta: DeepOnboardingDoneEvent) => {
    setIsStreaming(false);
    setIsLoading(false);
    setIsExtracting(false);
    if (meta.details_complete && meta.raw_profile) {
      setRawProfile(meta.raw_profile);
      setPhase("review");
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (charQueueRef.current.length === 0) {
      schedulerActive.current = false;
      if (streamDoneRef.current) {
        const meta = pendingDoneRef.current;
        if (meta) { pendingDoneRef.current = null; applyDone(meta); }
      }
      return;
    }
    const { ch, delay } = charQueueRef.current.shift()!;
    pendingTimeout.current = setTimeout(() => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return [...prev.slice(0, -1), { ...last, content: last.content + ch }];
      });
      scheduleRef.current();
    }, delay);
  }, [applyDone]);

  useEffect(() => { scheduleRef.current = scheduleNext; }, [scheduleNext]);

  const enqueueChars = (text: string) => {
    const n = text.length;
    text.split("").forEach((ch, i) => {
      charQueueRef.current.push({ ch, delay: _charDelay(i / Math.max(n - 1, 1)) });
    });
    if (!schedulerActive.current && charQueueRef.current.length > 0) {
      schedulerActive.current = true;
      scheduleRef.current();
    }
  };

  const enqueueToken = (token: string) => {
    displayBufRef.current += token;
    const safe = displayBufRef.current.length - MAX_MARKER_LEN;
    if (safe > 0) {
      let toShow = displayBufRef.current.slice(0, safe);
      MARKERS.forEach(m => { toShow = toShow.split(m).join(""); });
      displayBufRef.current = displayBufRef.current.slice(safe);
      enqueueChars(toShow);
    }
  };

  const cancelTyping = () => {
    if (pendingTimeout.current) { clearTimeout(pendingTimeout.current); pendingTimeout.current = null; }
    charQueueRef.current = [];
    schedulerActive.current = false;
    streamDoneRef.current = false;
    pendingDoneRef.current = null;
    displayBufRef.current = "";
  };

  const handleSend = async (text?: string) => {
    const msg = text || inputValue.trim();
    if (!msg || isLoading || isStreaming || phase !== "chat") return;
    setInputValue("");

    const userMessage: ChatMessage = { role: "user", content: msg };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    cancelTyping();

    let firstToken = true;

    try {
      await streamDeepOnboarding(
        clientId,
        updatedMessages,
        (token) => {
          if (firstToken) {
            firstToken = false;
            setIsLoading(false);
            setIsStreaming(true);
            setMessages(prev => [...prev, { role: "assistant", content: "" }]);
          }
          enqueueToken(token);
        },
        (meta) => {
          let tail = displayBufRef.current;
          MARKERS.forEach(m => { tail = tail.split(m).join(""); });
          displayBufRef.current = "";
          if (tail) enqueueChars(tail);
          streamDoneRef.current = true;
          pendingDoneRef.current = meta;
          if (!schedulerActive.current) { pendingDoneRef.current = null; applyDone(meta); }
        },
        (err) => {
          cancelTyping();
          setIsStreaming(false);
          setIsLoading(false);
          setIsExtracting(false);
          const errorContent = `Sorry, I encountered an error. Please try again. (${err})`;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.content === "") {
              return [...prev.slice(0, -1), { role: "assistant", content: errorContent }];
            }
            return [...prev, { role: "assistant", content: errorContent }];
          });
        },
        () => { setIsExtracting(true); }
      );
    } catch (err: unknown) {
      cancelTyping();
      setIsStreaming(false);
      setIsLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      setMessages([...updatedMessages, { role: "assistant", content: `Sorry, I encountered an error. (${message})` }]);
    }
  };

  // Auto-start: send "Hello" on mount to trigger the bot's opening message
  useEffect(() => {
    if (!autoStarted.current) {
      autoStarted.current = true;
      handleSend("Hello");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Confirm & submit ────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!rawProfile) return;
    setPhase("submitting");
    setSubmitError(null);
    try {
      await completeOnboarding(rawProfile);
      pollEngineDone(
        () => { setPhase("done"); onComplete(); },
        () => { setSubmitError("Engine timed out. Please refresh the page."); setPhase("review"); }
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setPhase("review");
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <AnimatePresence mode="wait">

        {/* ── Chat phase ── */}
        {phase === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl"
          >
            <div className="relative flex flex-col h-[88vh] rounded-2xl border border-border bg-background/95 dark:bg-black/80 backdrop-blur-2xl shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <img src="/cognivest-logo-monochrome.svg" alt="CogniVest" className="h-5 w-5 dark:invert" />
                  <span className="text-sm font-semibold text-foreground/90 tracking-wide">CogniVest AI</span>
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Intake
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto flex flex-col px-5 py-4 scrollbar-thin scrollbar-thumb-white/10 min-h-0"
              >
                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 opacity-60">
                    <img src="/cognivest-logo-monochrome.svg" alt="" className="h-10 w-10 dark:invert opacity-30" />
                    <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
                      Starting your financial intake…
                    </p>
                  </div>
                )}

                {messages.length > 0 && (
                  <div className="flex flex-col gap-4">
                    {messages.map((msg, i) => {
                      const isStreamingThis = isStreaming && i === messages.length - 1 && msg.role === "assistant";
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.role === "user" ? (
                            <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-secondary/80 dark:bg-white/[0.07] border border-border/60 text-foreground/90">
                              <p>{msg.content}</p>
                            </div>
                          ) : (
                            <div className="max-w-[88%] py-1">
                              {renderMarkdown(msg.content, isStreamingThis)}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Typing indicator */}
                    {isLoading && !isStreaming && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="py-2 pl-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Extracting indicator */}
                    {isExtracting && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="flex items-center gap-2 py-2 pl-1 text-xs text-muted-foreground">
                          <div className="w-3 h-3 rounded-full border border-t-transparent border-foreground/30 animate-spin" />
                          Analysing your responses…
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="px-4 py-3 border-t border-border flex-shrink-0">
                <div className="flex items-center gap-2 bg-secondary/50 dark:bg-white/5 rounded-xl px-4 py-2.5 border border-border focus-within:border-foreground/20 transition-colors">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Chat here…"
                    className="flex-1 bg-transparent text-sm text-foreground/90 placeholder-muted-foreground outline-none"
                    disabled={isLoading || isStreaming}
                  />
                  <VoiceMicButton
                    onTranscript={text => { setInputValue(text); setTimeout(() => handleSend(text), 50); }}
                    disabled={isLoading || isStreaming}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || isStreaming || !inputValue.trim()}
                    className="p-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors text-foreground/60 hover:text-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <SendSVG />
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ── Review / submitting phase ── */}
        {(phase === "review" || phase === "submitting") && rawProfile && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl"
          >
            <OnboardingReviewPanel
              rawProfile={rawProfile}
              onConfirm={handleConfirm}
              onBack={() => {
                setMessages(prev => prev.map(m => ({
                  ...m,
                  content: m.content.replace(/<<DETAILS_COMPLETE>>/g, "").trim(),
                })));
                setPhase("chat");
              }}
              isSubmitting={phase === "submitting"}
              error={submitError}
            />
          </motion.div>
        )}

        {/* ── Done / building phase ── */}
        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="text-center space-y-5"
          >
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto"
              style={{ borderColor: "hsl(var(--foreground))", borderTopColor: "transparent" }}
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Building your digital twin…</p>
              <p className="text-xs text-muted-foreground">This takes about a minute. Please don't close this tab.</p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default DeepOnboardingChat;
