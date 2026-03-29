import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatInterface from "./ChatInterface";

interface ChatFullscreenOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isOnboarding?: boolean;
}

const ChatFullscreenOverlay: React.FC<ChatFullscreenOverlayProps> = ({
  isOpen,
  onClose,
  isOnboarding = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-black/60"
          />

          {/* Chat Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 40 }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-10 w-full max-w-4xl mx-4 md:mx-auto"
          >
            <ChatInterface isFullscreen={true} onClose={onClose} isOnboarding={isOnboarding} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatFullscreenOverlay;
