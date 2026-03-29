import React from 'react';
import MailIcon from '@mui/icons-material/Mail';
import TelegramIcon from '@mui/icons-material/Telegram';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { motion } from 'motion/react';

type ContactBarProps = {
  visible?: boolean;
  onToggle?: () => void;
};

const ContactBar: React.FC<ContactBarProps> = ({ visible = true, onToggle }) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 100, x: '-50%' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-6 md:bottom-8 left-1/2 z-40 px-4 md:px-6 py-2 rounded-3xl bg-[rgba(8,8,8,0.82)] border border-white/5 shadow-lg backdrop-blur-sm w-fit"
      role="region"
      aria-label="Contact support bar"
    >
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {/* Center text */}
        <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">bugs? help? feature request?</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap sm:hidden">Need help?</span>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="https://t.me/traversesupport"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors duration-200 text-xs"
            aria-label="Contact on Telegram"
          >
            <TelegramIcon className="w-4 h-4 text-white/80" />
            <span className="text-blue-300">Telegram</span>
          </a>

          <a
            href="mailto:diljotsingh7@gmail.com"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors duration-200 text-xs"
            aria-label="Contact via email"
          >
            <MailIcon className="w-4 h-4 text-white/80" />
            <span className="text-blue-300">Mail</span>
          </a>
        </div>

        {/* Mobile buttons - icon only */}
        <div className="md:hidden flex items-center gap-1.5">
          <a
            href="https://t.me/traversesupport"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors duration-200"
            aria-label="Contact on Telegram"
          >
            <TelegramIcon className="w-4 h-4 text-blue-300" />
          </a>

          <a
            href="mailto:diljotsingh7@gmail.com"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors duration-200"
            aria-label="Contact via email"
          >
            <MailIcon className="w-4 h-4 text-blue-300" />
          </a>
        </div>

        {/* Swap button */}
        <button
          onClick={() => onToggle?.()}
          aria-label="Toggle dock"
          className="w-7 h-7 rounded-full bg-white/3 hover:bg-white/6 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <SwapHorizIcon className="w-4 h-4 text-white/80" />
        </button>
      </div>
    </motion.div>
  );
};

export default ContactBar;
