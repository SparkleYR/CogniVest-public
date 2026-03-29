import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { streamChatMessage, type ChatMessage, type ChatResponse } from "../utils/cognivest-api";
import { VoiceMicButton } from "./ui/VoiceMicButton";

// ── Icons ──────────────────────────────────────────────────────────
const SendSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const CloseSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SUGGESTION_CHIPS = [
  "What is an ETF?",
  "Where should I invest ₹10 lakh?",
  "Tax saving strategies",
  "Market sentiment today",
  "Create my account",
];

// ── Markdown renderer ──────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  // Handle **bold**, _italic_, `code`
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

function renderMarkdown(rawText: string, streaming?: boolean): React.ReactNode {
  const text = rawText
    .replace(/<<ONBOARDING>>/g, "")
    .replace(/<<DETAILS_COMPLETE>>/g, "")
    .trim();

  if (!text) return null;

  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);

    if (h2) {
      result.push(
        <p key={i} className="font-bold text-foreground text-[13px] mt-2.5 mb-0.5">
          {renderInline(h2[1])}
        </p>
      );
      i++;
    } else if (h3) {
      result.push(
        <p key={i} className="font-semibold text-foreground/90 text-[13px] mt-2 mb-0.5">
          {renderInline(h3[1])}
        </p>
      );
      i++;
    } else if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      const startI = i;
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
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
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
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
      result.push(
        <p key={i} className="leading-relaxed text-foreground/80">
          {renderInline(line)}
        </p>
      );
      i++;
    }
  }

  return <div className={`space-y-1 text-sm${streaming ? " streaming-msg" : ""}`}>{result}</div>;
}

// ── Bezier typing animation — mirrors chatbot3/4 terminal animation ──
// cubic-bezier(0.42, 0, 0.58, 1) = CSS ease-in-out: slow start/end, fast middle

const MARKERS       = ["<<ONBOARDING>>", "<<DETAILS_COMPLETE>>"];
const MAX_MARKER_LEN = Math.max(...MARKERS.map(m => m.length)); // 18 chars

const BASE_CHAR_DELAY_MS = 14;   // nominal ms per character
const BEZIER_VARIANCE_MS = 12;   // ±ms shaped by the curve

function _cubicBezierY(x: number, x1: number, y1: number, x2: number, y2: number): number {
  const bx = (t: number) => 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3;
  const by = (t: number) => 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (bx(mid) < x) lo = mid; else hi = mid; }
  return by((lo + hi) / 2);
}

// pos ∈ [0, 1] within each token burst → delay in ms
// edges of each burst are slightly slower than the middle, mimicking natural typing
function _charDelay(pos: number): number {
  const eased = _cubicBezierY(pos, 0.42, 0, 0.58, 1);
  return BASE_CHAR_DELAY_MS + BEZIER_VARIANCE_MS * Math.abs(eased - 0.5) * 2;
}

type PendingMeta = { state: string; details_complete: boolean; user_details: ChatResponse["user_details"] };

// ── Component ──────────────────────────────────────────────────────

interface ChatInterfaceProps {
  isFullscreen?: boolean;
  onClose?: () => void;
  isOnboarding?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isFullscreen = false,
  onClose,
  isOnboarding = false,
}) => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);   // waiting for first token (dots)
  const [isStreaming, setIsStreaming] = useState(false); // tokens arriving
  const [chatState, setChatState] = useState<"free_chat" | "onboarding">("free_chat");
  const [showSignupCTA, setShowSignupCTA] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Character-level animation state (mirrors terminal's char_q + scheduler)
  const charQueueRef    = useRef<{ ch: string; delay: number }[]>([]);
  const schedulerActive = useRef(false);
  const pendingTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRef     = useRef<() => void>(() => {});
  const streamDoneRef   = useRef(false);
  const pendingMetaRef  = useRef<PendingMeta | null>(null);
  const displayBufRef   = useRef(""); // safe-window buffer for marker stripping

  const scrollToBottom = (instant?: boolean) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (instant) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom(isStreaming);
  }, [messages, isLoading, isStreaming]);

  // ── Bezier character scheduler ─────────────────────────────────────

  // Applies stream metadata (state/CTA) after typing completes
  const applyMeta = useCallback((meta: PendingMeta) => {
    setIsStreaming(false);
    setIsLoading(false);
    setChatState(prev => (meta.state === "onboarding" && prev === "free_chat") ? "onboarding" : prev);
    if (meta.details_complete && meta.user_details) {
      localStorage.setItem("chatbot_signup_data", JSON.stringify(meta.user_details));
      setShowSignupCTA(true);
    }
  }, []);

  // Recursive scheduler: pops one char, sleeps its bezier delay, writes it, recurses
  const scheduleNext = useCallback(() => {
    if (charQueueRef.current.length === 0) {
      schedulerActive.current = false;
      if (streamDoneRef.current) {
        const meta = pendingMetaRef.current;
        if (meta) { pendingMetaRef.current = null; applyMeta(meta); }
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
      scheduleRef.current(); // always call via ref so closure is always fresh
    }, delay);
  }, [applyMeta]);

  useEffect(() => { scheduleRef.current = scheduleNext; }, [scheduleNext]);

  // Enqueue already-safe text as (ch, delay) pairs and kick scheduler if idle
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

  // Accumulate token in safe-window buffer; flush chars only once markers can't straddle
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

  // Cancel any in-progress animation and reset all typing state
  const cancelTyping = () => {
    if (pendingTimeout.current) { clearTimeout(pendingTimeout.current); pendingTimeout.current = null; }
    charQueueRef.current = [];
    schedulerActive.current = false;
    streamDoneRef.current = false;
    pendingMetaRef.current = null;
    displayBufRef.current = "";
  };

  const handleSend = async (text?: string) => {
    const msg = text || inputValue.trim();
    if (!msg || isLoading || isStreaming) return;
    setInputValue("");

    const userMessage: ChatMessage = { role: "user", content: msg };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Reset all animation state for fresh send
    cancelTyping();
    if (pendingTimeout.current) { clearTimeout(pendingTimeout.current); pendingTimeout.current = null; }

    let firstToken = true;

    try {
      await streamChatMessage(
        updatedMessages,
        // onToken — safe-window buffer → bezier char queue
        (token) => {
          if (firstToken) {
            firstToken = false;
            setIsLoading(false);
            setIsStreaming(true);
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
          }
          enqueueToken(token);
        },
        // onDone — flush buffer tail, mark stream done, apply meta after typing finishes
        (meta) => {
          let tail = displayBufRef.current;
          MARKERS.forEach(m => { tail = tail.split(m).join(""); });
          displayBufRef.current = "";
          if (tail) enqueueChars(tail);
          streamDoneRef.current = true;
          pendingMetaRef.current = meta;
          // Scheduler may have already emptied the queue before done arrived
          if (!schedulerActive.current) { pendingMetaRef.current = null; applyMeta(meta); }
        },
        // onError
        (err) => {
          cancelTyping();
          setIsStreaming(false);
          setIsLoading(false);
          const errorContent = `Sorry, I encountered an error. Please try again. (${err})`;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.content === "") {
              return [...prev.slice(0, -1), { role: "assistant", content: errorContent }];
            }
            return [...prev, { role: "assistant", content: errorContent }];
          });
        }
      );
    } catch (err: unknown) {
      cancelTyping();
      setIsStreaming(false);
      setIsLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      setMessages([...updatedMessages, { role: "assistant", content: `Sorry, I encountered an error. (${message})` }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGoToSignup = () => {
    if (onClose) onClose();
    navigate("/signup/client");
  };

  return (
    <div
      className={`flex flex-col ${isFullscreen
        ? isOnboarding
          ? "w-full max-w-3xl mx-auto h-[88vh]"
          : "w-full max-w-3xl mx-auto h-[80vh]"
        : "w-full h-full"
        }`}
    >
      {/* Chat Panel */}
      <div
        className={`relative flex-1 flex flex-col overflow-hidden rounded-2xl border border-border ${isFullscreen
          ? "bg-background/95 dark:bg-black/80 backdrop-blur-2xl shadow-2xl"
          : "bg-secondary/80 dark:bg-black/40 backdrop-blur-md shadow-lg"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img
              src="/cognivest-logo-monochrome.svg"
              alt="CogniVest"
              className="h-5 w-5 dark:invert"
            />
            <span className="text-sm font-semibold text-foreground/90 tracking-wide">
              CogniVest AI
            </span>
            {chatState === "onboarding" && (
              <span className="ml-2 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                Onboarding
              </span>
            )}
          </div>
          {isFullscreen && onClose && !isOnboarding && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-secondary transition-colors"
            >
              <CloseSVG />
            </button>
          )}
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto flex flex-col px-5 py-4 scrollbar-thin scrollbar-thumb-white/10">

          {/* Empty state — vertically + horizontally centred */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 opacity-60">
              <img
                src="/cognivest-logo-monochrome.svg"
                alt=""
                className="h-10 w-10 dark:invert opacity-30"
              />
              <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
                {isOnboarding ? "Please wait for Onboarding." : "Ask me anything about finance, investing, or portfolio management."}
              </p>
            </div>
          )}

          {/* Message list */}
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
                      /* User bubble — keep box */
                      <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-secondary/80 dark:bg-white/[0.07] border border-border/60 text-foreground/90">
                        <p>{msg.content}</p>
                      </div>
                    ) : (
                      /* Assistant — no box, just formatted text */
                      <div className="max-w-[88%] py-1">
                        {renderMarkdown(msg.content, isStreamingThis)}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Typing indicator — only shown before first token arrives */}
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

              {/* Signup CTA */}
              <AnimatePresence>
                {showSignupCTA && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex justify-center pt-4"
                  >
                    <div className="rounded-2xl border border-border bg-secondary/40 p-5 text-center max-w-sm">
                      <div className="text-sm font-bold text-foreground mb-1">
                        Your details are ready!
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Let's create your brand new CogniVest account.
                      </p>
                      <button
                        onClick={handleGoToSignup}
                        className="px-6 py-2.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-80 transition-all"
                      >
                        Create My Account →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}

        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 bg-secondary/50 dark:bg-white/5 rounded-xl px-4 py-2.5 border border-border focus-within:border-foreground/20 transition-colors">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isOnboarding
                  ? "Chat here..."
                  : chatState === "onboarding"
                    ? "Tell me about yourself..."
                    : "Ask CogniVest AI anything..."
              }
              className="flex-1 bg-transparent text-sm text-foreground/90 placeholder-muted-foreground outline-none"
              disabled={isLoading || isStreaming}
            />
            <VoiceMicButton
              onTranscript={(text) => { setInputValue(text); setTimeout(() => handleSend(text), 50); }}
              disabled={isLoading || isStreaming}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || isStreaming || !inputValue.trim()}
              className="p-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors text-foreground/60 hover:text-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Send message"
            >
              <SendSVG />
            </button>
          </div>
        </div>
      </div>

      {/* Suggestion Chips — only when empty and not in onboarding mode */}
      {messages.length === 0 && !isOnboarding && (
        <div className={`mt-4 flex flex-wrap gap-2 ${isFullscreen ? "justify-center" : ""}`}>
          {SUGGESTION_CHIPS.map((chip, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
              onClick={() => handleSend(chip)}
              className="px-3.5 py-2 text-xs font-medium rounded-full border border-border bg-secondary/50 dark:bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-foreground/20 transition-all duration-200 backdrop-blur-sm"
            >
              {chip}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
