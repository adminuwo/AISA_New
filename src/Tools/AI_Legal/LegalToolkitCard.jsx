import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck, Scale, Landmark, Target, Waypoints,
  Clock, CheckCircle, Lock, Sparkles,
  MessageCircle, ArrowRight, X, ChevronDown, Zap, Maximize2, Minimize2,
  Gavel, FolderKanban, NotebookPen, ScanText, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

export const PREMIUM_TOOLS = (t) => [
  {
    id: 'legal_my_case',
    name: t('myCase'),
    icon: FolderKanban,
    desc: t('myCaseDesc'),
    price: '₹1299',
    workflow: t('myCaseWorkflow')
  },
  {
    id: 'legal_precedents',
    name: t('legalPrecedents'),
    icon: Landmark,
    desc: t('legalPrecedentsDesc'),
    price: '₹999',
    workflow: t('legalPrecedentsWorkflow')
  },
  {
    id: 'legal_draft_maker',
    name: t('draftMaker'),
    icon: NotebookPen,
    desc: t('draftMakerDesc'),
    price: '₹599',
    workflow: t('draftMakerWorkflow')
  },
  {
    id: 'legal_evidence_checker',
    name: t('evidenceAnalyst'),
    icon: ScanText,
    desc: t('evidenceAnalystDesc'),
    price: '₹599',
    workflow: t('evidenceAnalystWorkflow')
  },
  {
    id: 'legal_argument_builder',
    name: t('argumentBuilder'),
    icon: Gavel,
    desc: t('argumentBuilderDesc'),
    price: '₹999',
    workflow: t('argumentBuilderWorkflow')
  },
  {
    id: 'legal_case_predictor',
    name: t('casePredictor'),
    icon: Target,
    desc: t('casePredictorDesc'),
    price: '₹999',
    workflow: t('casePredictorWorkflow')
  },
  {
    id: 'legal_contract_analyzer',
    name: t('contractAnalyzer'),
    icon: FileCheck,
    desc: t('contractAnalyzerDesc'),
    price: '₹799',
    workflow: t('contractAnalyzerWorkflow')
  },
  {
    id: 'legal_strategy_engine',
    name: t('strategyEngine'),
    icon: Waypoints,
    desc: t('strategyEngineDesc'),
    price: '₹899',
    workflow: t('strategyEngineWorkflow')
  },
  {
    id: 'legal_research_assistant',
    name: t('researchAssistant'),
    icon: BookOpen,
    desc: t('researchAssistantDesc'),
    price: '₹699',
    workflow: t('researchAssistantWorkflow')
  }
];


const ToolCard = ({ tool, isPrimary = false, size = 'md', onClose, onSelect, t }) => {
  const isUnlocked = true; // All legal tools are now available for ALL tiers (Free included)
  const Icon = tool.icon;
  const [showWorkflow, setShowWorkflow] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={() => {
        if (isUnlocked) {
          // If selecting a sub-tool, we want to ensure we're in the right mode for the 'Activated' screen
          onSelect(tool, isUnlocked);
        }
      }}
      className={`group relative cursor-pointer rounded-[1rem] sm:rounded-[1.4rem] p-3 sm:p-4 transition-colors duration-300 border overflow-hidden
        bg-white/65 border-white/75 backdrop-blur-[12px] shadow-[0_4px_16px_rgba(99,102,241,0.06)]
        dark:bg-[#1A2540]/60 dark:border-white/5 dark:shadow-none`}
    >
      {/* Workflow Overlay */}
      <AnimatePresence>
        {showWorkflow && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 z-20 bg-indigo-600/95 rounded-[1.4rem] p-6 flex flex-col justify-start overflow-y-auto custom-scrollbar overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h6 className="text-white font-black text-[12px] uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-4 h-4 fill-white" /> {t('workflow')}
                </h6>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowWorkflow(false); }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="space-y-2.5">
                {Array.isArray(tool.workflow) && tool.workflow.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-white/90 text-[11px] leading-snug font-medium pt-0.5">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); if (isUnlocked) onSelect(tool, isUnlocked); }}
              className="w-full py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-lg mt-4"
            >
              {t('launchNow')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover shimmer */}
      <motion.div
        className="absolute inset-0 rounded-[1.4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)' }}
      />

      <div className="flex flex-col gap-2.5 sm:gap-4 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_8px_24px_rgba(99,102,241,0.22)]"
              style={{
                backgroundColor: '#F5F4FF',
                color: '#5B5FEF',
                border: '1px solid rgba(99,102,241,0.14)',
                boxShadow: '0 4px 12px rgba(99,102,241,0.10)'
              }}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.8} />
            </div>
            {tool.id === 'legal_case_predictor' && (
              <span className={`text-[6px] font-black uppercase tracking-[0.1em] transition-colors ${isUnlocked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>सत्यमेव जयते</span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowWorkflow(true); }}
            className="p-2 transition-all text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-lg"
            title="How it works"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors tracking-tight text-[12px] sm:text-[14px]">
              {tool.name}
            </h5>
            {isUnlocked ? (
              <span className="text-[7.5px] font-black text-indigo-600 bg-indigo-50/80 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-500/30 uppercase tracking-tighter">Unlocked</span>
            ) : (
              <span className="text-[7.5px] font-black text-slate-400 bg-white/70 dark:bg-zinc-800/70 px-1.5 py-0.5 rounded-full border border-white/80 dark:border-white/10 uppercase tracking-tighter">Pro</span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-[11px] leading-relaxed font-medium line-clamp-2">
            {tool.desc}
          </p>
        </div>

        {!isUnlocked && (
          <div className="pt-2.5 border-t border-white/60 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">{tool.price}</span>
            <div className="flex items-center gap-1 text-indigo-600 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-all">
              Upgrade <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const LegalToolkitCard = ({ isOpen, onClose, onSelect, unlockedTools = [], isAdmin = false }) => {
  const { toolkitLanguage, setToolkitLanguage, tLegal } = useLanguage();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isMaximized) {
          setIsMaximized(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isMaximized]);

  useEffect(() => {
    if (!isOpen) setIsMaximized(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = 'unset'; }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-4 mb-5 mt-8 first:mt-0">
      <div className="w-1 h-1 rounded-full bg-slate-500" />
      <h4 className="text-[8px] sm:text-[9px] font-black text-slate-500 dark:text-[#94A3B8] uppercase tracking-[0.28em] whitespace-nowrap">{children}</h4>
      <div className="h-[1px] flex-1 bg-black/[0.06] dark:bg-white/5" />
    </div>
  );

  const handleLanguageChange = (lang) => {
    setToolkitLanguage(lang);
    const messages = {
      'Auto': 'Auto Language Detection Active 🌐',
      'Hindi': 'भाषा बदलकर हिंदी कर दी गई है 🇮🇳',
      'English': 'Language switched to English 🇺🇸',
      'Hinglish': 'Language switched to Hinglish 🇮🇳'
    };
    toast.success(messages[lang] || `Language set to ${lang}`, {
      icon: '🌐',
      style: { borderRadius: '12px', background: '#333', color: '#fff', fontSize: '12px' }
    });
  };

  const toolsList = PREMIUM_TOOLS(tLegal);

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="legal-toolkit-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="fixed inset-0 z-[110000] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[12px]"
          />

          {/* Outer wrapper */}
          <div className={`relative z-10 w-full flex items-center justify-center ${isMaximized ? 'h-full' : 'max-w-5xl'}`}>

            {/* Main card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, transition: { duration: 0.12 } }}
              transition={{
                opacity: { duration: 0.15 },
                scale: { duration: 0.15 }
              }}
              className={`relative z-[2] flex flex-col overflow-hidden w-full ${isMaximized ? 'modal-maximized rounded-[27px]' : 'modal-default rounded-[28px]'}`}
              style={{
                boxShadow: '0 40px 80px -15px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)',
                maxHeight: '90vh'
              }}
            >
              {/* Clean frosted glass base */}
              <div className="absolute inset-0 bg-white/95 dark:bg-[#0B1020]/98 backdrop-blur-[40px] z-0 rounded-[28px]" />

              {/* Header */}
              <div
                className="relative z-[8] flex items-center justify-between px-4 sm:px-10 py-4 sm:py-5 border-b border-black/[0.05] dark:border-white/5 bg-white/40 dark:bg-[#131C31]/50 backdrop-blur-md cursor-default select-none"
                onDoubleClick={() => setIsMaximized(!isMaximized)}
              >
                <div className="flex items-center gap-2 sm:gap-3.5">
                  <div className="flex flex-col items-center gap-1.5">
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center shadow-[0_6px_15px_rgba(99,102,241,0.30)] border border-white/20"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)' }}
                  >
                    <Scale size={20} strokeWidth={1.8} className="text-white" />
                  </motion.div>
                  </div>
                  <div>
                    <h1 className="text-[17px] font-black text-slate-900 dark:text-white leading-tight tracking-tight">{tLegal('legalToolkitTitle')}</h1>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />
                      <span className="text-[7.5px] sm:text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.22em]">{tLegal('legalProfessionalToolkit')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Toolkit Language Switcher */}
                  <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-[#131C31] p-1 rounded-xl border border-black/5 dark:border-white/5 mr-1 sm:mr-2">
                    <button
                      onClick={() => handleLanguageChange('English')}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${toolkitLanguage === 'English' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => handleLanguageChange('Hindi')}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black transition-all ${toolkitLanguage === 'Hindi' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      हिंदी
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setIsMaximized(!isMaximized)}
                      title={isMaximized ? 'Restore' : 'Maximize'}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#131C31] flex items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:shadow-md transition-all shadow-sm border border-black/5 dark:border-white/5"
                    >
                      {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      title="Close"
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#131C31] flex items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-rose-500 hover:shadow-md transition-all shadow-sm border border-black/5 dark:border-white/5"
                    >
                      <X size={18} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div 
                className="relative z-[8] flex-1 overflow-y-auto px-5 sm:px-11 py-5 sm:py-7 custom-scrollbar min-h-0 overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
              >

                {!isMaximized && (
                  <div className="mb-6">
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold">{tLegal('advancedSuitesDesc')}</p>
                  </div>
                )}

                {/* Hero — General Legal Chat */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    onSelect({ id: 'legal_general_chat', name: tLegal('generalLegalChat') }, true);
                    onClose();
                  }}
                  className="group relative cursor-pointer rounded-[1.4rem] sm:rounded-[1.8rem] p-4 sm:p-7 mb-5 sm:mb-8 overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #7c3aed 100%)',
                    boxShadow: '0 25px 60px -10px rgba(79,70,229,0.5)',
                  }}
                  whileHover={{ scale: 1.015, y: -3 }}
                  whileTap={{ scale: 0.985 }}
                >
                  {/* Animated shimmer sweep */}
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2.5 }}
                    className="absolute top-0 bottom-0 w-[45%] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                  />
                  <div className="absolute top-0 right-0 w-60 h-60 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-400/25 rounded-full -ml-10 -mb-10 blur-2xl" />

                  <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">

                    <div className="flex items-center gap-3.5 sm:gap-6 w-full sm:w-auto">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-xl rounded-[1rem] sm:rounded-[1.4rem] flex items-center justify-center border border-white/25 shadow-xl group-hover:scale-105 transition-transform duration-500 shrink-0">
                        <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      </div>

                      <div className="flex-1 text-left space-y-0.5 sm:space-y-1.5">
                        <div className="flex items-center justify-start gap-1.5 sm:gap-2">
                          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full text-[7px] sm:text-[8px] font-black text-white uppercase tracking-widest">{tLegal('basicStatus')}</span>
                          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400 fill-yellow-400" />
                        </div>
                        <h2 className="text-[17px] leading-tight sm:text-2xl font-extrabold text-white tracking-tight">💬 {tLegal('generalLegalChat')}</h2>
                        <p className="text-indigo-100 text-[10px] sm:text-[12px] font-medium leading-tight sm:leading-relaxed">
                          {tLegal('generalLegalChatDesc')}
                        </p>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto mt-0 sm:mt-0 px-4 py-2.5 sm:px-6 sm:py-3 bg-white text-indigo-700 font-black rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all text-[10px] sm:text-[11px] uppercase tracking-[0.15em] shrink-0"
                    >
                      {tLegal('startChatBtn')}
                    </motion.button>
                  </div>
                </motion.div>

                {/* Professional Legal Engines */}
                <SectionTitle>{tLegal('professionalLegalEngines')}</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                  {toolsList.map((tool, idx) => (
                    <ToolCard key={tool.id} tool={tool} index={idx} onClose={onClose} onSelect={onSelect} t={tLegal} />
                  ))}
                </div>

                {/* Upgrade Banner */}
                {!isAdmin && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-10 sm:mt-12 p-6 sm:p-8 rounded-[1.8rem] sm:rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/5 dark:bg-[#131C31]/40 border border-black/5 dark:border-white/5 backdrop-blur-2xl shadow-lg"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[1.2rem] flex items-center justify-center shadow-lg">
                        <Shield className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h6 className="font-extrabold text-slate-900 dark:text-white text-[15px] sm:text-[17px]">{tLegal('fullLegalSuiteAccess')}</h6>
                        <p className="text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400 font-semibold">{tLegal('unlockAdvancedTools')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                      className="relative px-8 py-3.5 rounded-2.5xl font-black text-[12px] uppercase tracking-[0.2em] text-white overflow-hidden shrink-0 shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
                    >
                      <motion.div
                        animate={{ backgroundPosition: ['0% center', '200% center'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_auto]"
                      />
                      <span className="relative z-10">{tLegal('accessProSuite')}</span>
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LegalToolkitCard;
