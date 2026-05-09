import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scale, Gavel, FileText, Search, ShieldCheck, Zap, Brain, PenTool, Layout, ChevronRight } from 'lucide-react';
import { PREMIUM_TOOLS } from '../constants/legalTools';

const ContextualLegalPanel = ({ isOpen, onClose, onSelectTool, activeToolId }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[1000] lg:hidden"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-20 right-4 bottom-24 w-[320px] bg-white/90 dark:bg-[#0B1020]/95 backdrop-blur-xl rounded-[32px] border border-slate-200 dark:border-white/5 shadow-2xl z-[1001] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                  <Scale size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Legal Toolkit</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tight">Contextual Workspace</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tool Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
              {PREMIUM_TOOLS.map((tool) => {
                const isActive = activeToolId === tool.id;
                const Icon = tool.icon || Scale;

                return (
                  <motion.button
                    key={tool.id}
                    whileHover={{ x: 4, backgroundColor: 'rgba(99, 102, 241, 0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectTool(tool.id, tool.name)}
                    className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all border ${
                      isActive 
                        ? 'bg-indigo-600/10 border-indigo-500/30' 
                        : 'bg-transparent border-transparent hover:border-slate-100 dark:hover:border-white/5'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${
                      isActive 
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white' 
                        : 'bg-slate-100 dark:bg-[#131C31] text-slate-500 dark:text-[#94A3B8]'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className={`text-xs font-black tracking-tight ${
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-zinc-300'
                      }`}>
                        {tool.name}
                      </h4>
                      <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 line-clamp-1">
                        {tool.desc}
                      </p>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50/50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Context</span>
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Synced</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContextualLegalPanel;
