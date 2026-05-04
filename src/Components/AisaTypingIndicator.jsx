import React from 'react';
import { motion } from 'framer-motion';

const AisaTypingIndicator = ({ visible = true, message = "AISA™ is thinking" }) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 opacity-80 py-1"
    >
      <span className="text-[11px] text-primary font-extrabold uppercase tracking-widest">
        {message}
      </span>
      <div className="flex gap-1 ml-1">
        <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </motion.div>
  );
};

export default AisaTypingIndicator;

