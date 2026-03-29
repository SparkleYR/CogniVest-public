import React, { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamTwinChat, type TwinCitation } from "../../utils/cognivest-api";
import { VoiceMicButton } from "../ui/VoiceMicButton";

// ── Icons ────────────────────────────────────────────────────────────────────
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
  "How would you feel if your portfolio dropped 20% tomorrow?",
  "Which of your goals worries you the most right now?",
  "How do you feel about the SIP amount we've set?",
  "Would you ever sell everything and move to FD?",
];

// ── Markdown renderer ─────────────────────────────────────────────────────────
const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p:          ({ children }) => <p className="leading-relaxed text-foreground/80 text-sm mb-1 last:mb-0">{children}</p>,
  h1:         ({ children }) => <p className="font-bold text-foreground text-sm mt-3 mb-1">{children}</p>,
  h2:         ({ children }) => <p className="font-bold text-foreground text-[13px] mt-2.5 mb-0.5">{children}</p>,
  h3:         ({ children }) => <p className="font-semibold text-foreground/90 text-[13px] mt-2 mb-0.5">{children}</p>,
  ul:         ({ children }) => <ul className="my-1 space-y-0.5 pl-0 list-none">{children}</ul>,
  ol:         ({ children }) => <ol className="my-1 space-y-0.5 pl-0 list-none">{children}</ol>,
  li:         ({ children }) => (
    <li className="flex items-start gap-2 text-sm text-foreground/80">
      <span className="mt-[8px] w-[3px] h-[3px] rounded-full bg-foreground/40 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
  strong:     ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em:         ({ children }) => <em className="italic opacity-90">{children}</em>,
  code:       ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    return isBlock
      ? <code className="block w-full px-3 py-2 my-1.5 rounded-lg text-[11px] bg-foreground/8 font-mono tracking-tight text-foreground/80 overflow-x-auto whitespace-pre">{children}</code>
      : <code className="px-1 py-0.5 rounded text-[11px] bg-foreground/10 font-mono tracking-tight">{children}</code>;
  },
  pre:        ({ children }) => <>{children}</>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-foreground/20 pl-3 my-1.5 text-foreground/60 italic text-sm">{children}</blockquote>,
  hr:         () => <hr className="my-2 border-border/30" />,
  a:          ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 text-blue-400 hover:text-blue-300">{children}</a>,
  table:      ({ children }) => <div className="overflow-x-auto my-1.5"><table className="w-full text-xs border-collapse">{children}</table></div>,
  th:         ({ children }) => <th className="px-2 py-1 text-left font-semibold text-foreground/70 border-b border-border/40">{children}</th>,
  td:         ({ children }) => <td className="px-2 py-1 text-foreground/70 border-b border-border/20">{children}</td>,
};

function MarkdownMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  if (!content) return null;
  return (
    <div className={streaming ? "space-y-0.5 streaming-msg" : "space-y-0.5"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Bezier typing animation — mirrors chatbot4 terminal animation ──────────────
// cubic-bezier(0.42, 0, 0.58, 1) = ease-in-out: slow start/end, fast middle
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

// ── Citation card ─────────────────────────────────────────────────────────────
function CitationCard({ hit }: { hit: TwinCitation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1 rounded-lg border border-border/50 bg-foreground/[0.03] overflow-hidden"
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-foreground/5 transition-colors"
      >
        <span className="text-[10px] font-mono text-foreground/30 flex-shrink-0">
          {hit.similarity.toFixed(2)}
        </span>
        <span className="flex-1 text-[11px] text-muted-foreground truncate">{hit.scenario_text}</span>
        <span className="text-[9px] text-foreground/30 flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 space-y-1 text-[11px]">
          <div className="flex gap-2">
            <span className="text-foreground/40 flex-shrink-0">Reaction</span>
            <span className="text-foreground/70">{hit.client_reaction}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-foreground/40 flex-shrink-0">Emotion</span>
            <span className="text-foreground/70">{hit.emotional_state}</span>
          </div>
          {hit.verbatim_quote && (
            <div className="mt-1 italic text-foreground/60 border-l-2 border-foreground/20 pl-2">
              "{hit.verbatim_quote}"
            </div>
          )}
          {hit.bias_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {hit.bias_tags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 rounded-full text-[9px] bg-foreground/8 border border-border/50 text-foreground/50">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── /advisor command result panel ─────────────────────────────────────────────
function AdvisorCommandResult({ citations }: { citations: TwinCitation[] }) {
  if (!citations.length) {
    return <p className="text-sm text-muted-foreground italic">No behavioral vectors found for this query.</p>;
  }
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-foreground/40 mb-2">
        {citations.length} behavioral vector{citations.length !== 1 ? "s" : ""} retrieved
      </p>
      {citations.map(hit => <CitationCard key={hit.vector_id} hit={hit} />)}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type TempPreset = "rational" | "balanced" | "emotional";
const TEMP_VALUES: Record<TempPreset, number> = { rational: 0.2, balanced: 0.5, emotional: 0.8 };

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: TwinCitation[];
  isAdvisorCommand?: boolean;
  isStreaming?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  advisorId: string;
  clientId: string;
  clientName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AdvisorChatPanel({ open, onClose, advisorId, clientId, clientName }: Props) {
  const [inputValue, setInputValue]   = useState("");
  const [messages, setMessages]       = useState<Message[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [isStreaming, setIsStreaming]  = useState(false);
  const [tempPreset, setTempPreset]   = useState<TempPreset>("balanced");

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const charQueueRef     = useRef<{ ch: string; delay: number }[]>([]);
  const schedulerActive  = useRef(false);
  const pendingTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRef      = useRef<() => void>(() => {});
  const streamDoneRef    = useRef(false);
  const pendingCitations = useRef<TwinCitation[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? "instant" : "smooth" });
  }, [messages, isLoading, isStreaming]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
      charQueueRef.current    = [];
      schedulerActive.current = false;
      streamDoneRef.current   = false;
    }
  }, [open]);

  // ── Bezier scheduler ───────────────────────────────────────────────────────
  const scheduleNext = useCallback(() => {
    if (charQueueRef.current.length === 0) {
      schedulerActive.current = false;
      if (streamDoneRef.current) {
        const cits = pendingCitations.current;
        pendingCitations.current = [];
        streamDoneRef.current    = false;
        setIsStreaming(false);
        setIsLoading(false);
        // Attach citations to final message
        if (cits.length > 0) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== "assistant") return prev;
            return [...prev.slice(0, -1), { ...last, citations: cits, isStreaming: false }];
          });
        } else {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== "assistant") return prev;
            return [...prev.slice(0, -1), { ...last, isStreaming: false }];
          });
        }
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
  }, []);

  useEffect(() => { scheduleRef.current = scheduleNext; }, [scheduleNext]);

  const enqueueChars = useCallback((text: string) => {
    const n = text.length;
    for (let i = 0; i < n; i++) {
      charQueueRef.current.push({ ch: text[i], delay: _charDelay(i / Math.max(n - 1, 1)) });
    }
    if (!schedulerActive.current) {
      schedulerActive.current = true;
      scheduleRef.current();
    }
  }, []);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? inputValue).trim();
    if (!msg || isLoading || isStreaming) return;
    setInputValue("");

    const isAdvisorCmd = msg.toLowerCase().startsWith("/advisor");

    const userMessage: Message = { role: "user", content: msg };
    const assistantPlaceholder: Message = { role: "assistant", content: "", isStreaming: true };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
    setIsLoading(true);
    setIsStreaming(false);

    // Build history for the API (exclude the placeholder we just added)
    const historyMessages = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));

    charQueueRef.current    = [];
    schedulerActive.current = false;
    streamDoneRef.current   = false;
    pendingCitations.current = [];

    streamTwinChat(
      advisorId,
      clientId,
      historyMessages,
      TEMP_VALUES[tempPreset],
      (token) => {
        // First token — stop spinner, start streaming
        setIsLoading(false);
        setIsStreaming(true);
        enqueueChars(token);
      },
      (meta) => {
        if (isAdvisorCmd) {
          // /advisor command: replace placeholder with vector results
          setIsLoading(false);
          setIsStreaming(false);
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== "assistant") return prev;
            return [...prev.slice(0, -1), {
              ...last,
              content: "",
              citations: meta.citations,
              isAdvisorCommand: true,
              isStreaming: false,
            }];
          });
        } else {
          // Normal: wait for queue to drain, then attach citations
          pendingCitations.current = meta.citations;
          streamDoneRef.current    = true;
          if (!schedulerActive.current) {
            scheduleRef.current();
          }
        }
      },
      (err) => {
        setIsLoading(false);
        setIsStreaming(false);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (!last || last.role !== "assistant") return prev;
          return [...prev.slice(0, -1), { ...last, content: `Error: ${err}`, isStreaming: false }];
        });
      }
    ).catch((err: Error) => {
      setIsLoading(false);
      setIsStreaming(false);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return [...prev.slice(0, -1), { ...last, content: `Network error: ${err.message}`, isStreaming: false }];
      });
    });
  }, [advisorId, clientId, enqueueChars, inputValue, isLoading, isStreaming, messages, tempPreset]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Spinner dots component
  const SpinnerDots = () => (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-foreground/30"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="twin-panel"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed right-0 top-0 bottom-0 w-[400px] flex flex-col shadow-2xl z-[110] border-l border-border bg-background/95 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex-shrink-0 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/cognivest-logo-monochrome.svg" alt="CogniVest" className="h-5 w-5 dark:invert" />
                <span className="text-sm font-semibold text-foreground/90 tracking-wide">CogniVest AI</span>
                <span className="ml-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/20">
                  Twin
                </span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                <CloseSVG />
              </button>
            </div>

            {/* Temperature selector */}
            <div className="mt-3 flex items-center gap-1.5">
              <span className="text-[10px] text-foreground/30 mr-0.5">Mode</span>
              {(["rational", "balanced", "emotional"] as TempPreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => setTempPreset(preset)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-all"
                  style={tempPreset === preset
                    ? { background: preset === "emotional" ? "#ef444422" : preset === "rational" ? "#22c55e22" : "#3b82f622", color: preset === "emotional" ? "#ef4444" : preset === "rational" ? "#22c55e" : "#3b82f6", border: `1px solid ${preset === "emotional" ? "#ef444440" : preset === "rational" ? "#22c55e40" : "#3b82f640"}` }
                    : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }
                  }
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto flex flex-col px-5 py-2 scrollbar-thin scrollbar-thumb-white/10">

            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 opacity-60">
                <img src="/cognivest-logo-monochrome.svg" alt="" className="h-10 w-10 dark:invert opacity-30" />
                <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
                  Ask me anything as {clientName ?? "this client"}. I'll respond in their voice with behavioral memory.
                </p>
                <p className="text-[11px] text-muted-foreground/50 max-w-[230px]">
                  Use <code className="bg-foreground/8 px-1 rounded">/advisor &lt;query&gt;</code> to retrieve behavioral vectors directly.
                </p>
              </div>
            )}

            {messages.length > 0 && (
              <div className="flex flex-col gap-4 pb-2">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "user" ? (
                      <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-foreground/10 border border-border/60 text-foreground/90">
                        <p>{msg.content}</p>
                      </div>
                    ) : (
                      <div className="max-w-[92%] py-1 w-full">
                        {/* Spinner while loading */}
                        {msg.isStreaming && msg.content === "" && <SpinnerDots />}

                        {/* /advisor command: vector results */}
                        {msg.isAdvisorCommand && (
                          <AdvisorCommandResult citations={msg.citations ?? []} />
                        )}

                        {/* Normal assistant message */}
                        {!msg.isAdvisorCommand && msg.content !== "" && (
                          <MarkdownMessage content={msg.content} streaming={msg.isStreaming} />
                        )}

                        {/* Citations (collapsible) */}
                        {!msg.isAdvisorCommand && (msg.citations ?? []).length > 0 && (
                          <div className="mt-3">
                            <p className="text-[10px] text-foreground/30 mb-1.5 uppercase tracking-wide">
                              Behavioral memory — {msg.citations!.length} vector{msg.citations!.length !== 1 ? "s" : ""}
                            </p>
                            {msg.citations!.map(hit => <CitationCard key={hit.vector_id} hit={hit} />)}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-border/30">
            {messages.length === 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {SUGGESTION_CHIPS.map((chip, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.06, duration: 0.25 }}
                    onClick={() => handleSend(chip)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-border bg-foreground/5 text-muted-foreground hover:text-foreground hover:bg-foreground/10 hover:border-foreground/20 transition-all duration-200"
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 bg-foreground/5 rounded-xl px-4 py-2.5 border border-border focus-within:border-foreground/20 transition-colors">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${clientName ?? "the twin"}… or /advisor <query>`}
                className="flex-1 bg-transparent text-sm text-foreground/90 placeholder-muted-foreground outline-none"
              />
              <VoiceMicButton
                onTranscript={(text) => { setInputValue(text); setTimeout(() => handleSend(text), 50); }}
                disabled={isLoading || isStreaming}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading || isStreaming}
                className="p-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors text-foreground/60 hover:text-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <SendSVG />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
              Responding as {clientName ?? "client"} · {tempPreset} mode · RAG-augmented
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
