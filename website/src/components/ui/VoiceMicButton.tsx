"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { transcribeAudio } from "../../utils/cognivest-api";

type VoiceState = "idle" | "recording" | "transcribing";

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  /** Called when recording starts — lets parent hide placeholder, etc. */
  onStateChange?: (state: VoiceState) => void;
}

// ── Mic SVG ───────────────────────────────────────────────────────────────────
const MicSVG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8"  y1="23" x2="16" y2="23" />
  </svg>
);

// ── Spinner SVG ───────────────────────────────────────────────────────────────
const SpinnerSVG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="0.9" />
    <path d="M12 2a10 10 0 0 0-10 10" strokeOpacity="0.2" />
  </svg>
);

// ── Waveform bars (shown while recording) ─────────────────────────────────────
const WaveformBars = () => (
  <div className="flex items-center gap-[2px] h-4">
    {[1,2,3,4,5].map(i => (
      <div
        key={i}
        className={`w-[3px] rounded-full bg-red-400 origin-bottom voice-bar-${i}`}
        style={{ height: "14px" }}
      />
    ))}
  </div>
);

// ── Ripple rings ──────────────────────────────────────────────────────────────
const RippleRings = () => (
  <>
    {[1,2,3].map(i => (
      <span
        key={i}
        className={`absolute inset-0 rounded-full border border-red-400/60 mic-ripple-${i}`}
        style={{ pointerEvents: "none" }}
      />
    ))}
  </>
);

// ── Component ─────────────────────────────────────────────────────────────────
export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  onTranscript,
  disabled = false,
  onStateChange,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const setState = useCallback((s: VoiceState) => {
    setVoiceState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  const startRecording = useCallback(async () => {
    if (disabled || voiceState !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setState("transcribing");
        try {
          const text = await transcribeAudio(blob);
          if (text) onTranscript(text);
        } catch {
          // silently fail — leave input as-is
        } finally {
          setState("idle");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState("recording");
    } catch {
      // mic permission denied or not available
      setState("idle");
    }
  }, [disabled, voiceState, onTranscript, setState]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && voiceState === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, [voiceState]);

  const handleClick = () => {
    if (voiceState === "idle")      startRecording();
    else if (voiceState === "recording") stopRecording();
  };

  const isRecording     = voiceState === "recording";
  const isTranscribing  = voiceState === "transcribing";

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing…" : "Voice input"}
      className="relative flex items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed"
      style={{ width: 30, height: 30, flexShrink: 0 }}
      animate={isRecording ? { scale: 1 } : { scale: 1 }}
    >
      {/* Red background when recording */}
      <AnimatePresence>
        {isRecording && (
          <motion.span
            key="bg"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 rounded-lg bg-red-500/20 mic-pulse"
          />
        )}
      </AnimatePresence>

      {/* Ripple rings */}
      <AnimatePresence>
        {isRecording && (
          <motion.span
            key="ripples"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-lg"
          >
            <RippleRings />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Icon / waveform / spinner */}
      <span className="relative z-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isTranscribing ? (
            <motion.span
              key="spinner"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ rotate: { duration: 0.7, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.15 } }}
              className="text-foreground/50"
            >
              <SpinnerSVG />
            </motion.span>
          ) : isRecording ? (
            <motion.span
              key="wave"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <WaveformBars />
            </motion.span>
          ) : (
            <motion.span
              key="mic"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="text-foreground/50 hover:text-foreground/80 transition-colors"
            >
              <MicSVG />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
};

export default VoiceMicButton;
