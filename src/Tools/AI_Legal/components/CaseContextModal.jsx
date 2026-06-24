import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Briefcase, X, Sparkles, FileText, Users,
  Gavel, Shield, FolderOpen, Zap, AlertCircle
} from 'lucide-react';

// ─── MODULE CONFIG ────────────────────────────────────────────────────────────
const MODULE_META = {
  legal_argument_builder:  { icon: Gavel,      color: 'from-violet-600 to-indigo-600',  label: 'Argument Builder'  },
  legal_precedents:        { icon: Scale,       color: 'from-indigo-600 to-blue-600',    label: 'Legal Precedent'   },
  legal_draft_maker:       { icon: FileText,    color: 'from-blue-600 to-cyan-600',      label: 'Draft Maker'       },
  legal_evidence_checker:  { icon: Shield,      color: 'from-emerald-600 to-teal-600',  label: 'Evidence Analysis' },
  legal_case_predictor:    { icon: Zap,         color: 'from-amber-600 to-orange-600',  label: 'Case Predictor'    },
  legal_contract_analyzer: { icon: FolderOpen,  color: 'from-rose-600 to-pink-600',     label: 'Contract Review'   },
  legal_strategy_engine:   { icon: Sparkles,    color: 'from-purple-600 to-violet-600', label: 'Strategy Engine'   },
};

/**
 * CaseContextModal — shown when user enters a module with an active case.
 *
 * Props:
 *   isOpen       boolean
 *   onClose      () => void
 *   caseData     object  { title, clientName, accused, description, documents, … }
 *   moduleId     string  e.g. 'legal_argument_builder'
 *   moduleName   string  e.g. 'Argument Builder'
 *   onUseCase    (caseData) => void  — user chose to use active case
 *   onManualMode () => void          — user chose manual/fresh mode
 */
const CaseContextModal = ({
  isOpen,
  onClose,
  caseData,
  moduleId,
  moduleName,
  onUseCase,
  onManualMode,
}) => {
  if (!isOpen) return null;

  const meta = MODULE_META[moduleId] || { icon: Scale, color: 'from-indigo-600 to-violet-600', label: moduleName };
  const ModuleIcon = meta.icon;

  const caseName = caseData?.title || caseData?.name || 'Untitled Case';
  const clientName = caseData?.clientName || caseData?.petitioner || null;
  const opponent = caseData?.accused || caseData?.opponentName || caseData?.respondent || null;
  const court = caseData?.courtName || caseData?.court || null;
  const docCount = (caseData?.documents || []).length;
  const argCount = (caseData?.builtArguments || []).length;
  const factCount = (caseData?.facts || []).length;

  // Summary items to display
  const summaryItems = [
    clientName && { label: 'Client / Petitioner', value: clientName, icon: Users },
    opponent   && { label: 'Opponent / Respondent', value: opponent, icon: Users },
    court      && { label: 'Court', value: court, icon: Gavel },
    docCount > 0 && { label: 'Evidence Files', value: `${docCount} uploaded`, icon: FileText },
    argCount > 0 && { label: 'Previous Arguments', value: `${argCount} built`, icon: Scale },
    factCount > 0 && { label: 'Case Events', value: `${factCount} on timeline`, icon: AlertCircle },
  ].filter(Boolean);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[210000] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          {/* Card */}
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative w-full sm:max-w-md bg-white dark:bg-[#0e1628] sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-white/5 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="w-10 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

            {/* Header gradient */}
            <div className={`px-6 pt-6 pb-5 bg-gradient-to-br ${meta.color} relative overflow-hidden`}>
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                    <ModuleIcon size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/70">Active Case Detected</p>
                    <h2 className="text-base font-black text-white leading-tight">{meta.label}</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Case name pill */}
              <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20 relative z-10">
                <Briefcase size={14} className="text-white shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Case</p>
                  <p className="text-sm font-black text-white leading-tight truncate">{caseName}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">

              {/* Case summary */}
              {summaryItems.length > 0 && (
                <div className="bg-slate-50 dark:bg-zinc-900/60 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-4 pt-3 pb-1.5">Case Summary</p>
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {summaryItems.map(({ label, value, icon: Icon }, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2">
                        <Icon size={12} className="text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">{label}</span>
                          <span className="text-[10px] text-slate-700 dark:text-slate-200 font-black truncate max-w-[140px] text-right">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {caseData?.description && (
                <div className="bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Case Facts</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-3">{caseData.description}</p>
                </div>
              )}

              {/* Question */}
              <div className="text-center">
                <p className="text-xs font-black text-slate-700 dark:text-slate-200">How would you like to continue?</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Choose your working mode for {meta.label}</p>
              </div>

              {/* Buttons */}
              <div className="space-y-2.5">
                {/* Use Active Case */}
                <button
                  onClick={() => onUseCase?.(caseData)}
                  className={`w-full flex items-start gap-3.5 p-4 bg-gradient-to-r ${meta.color} text-white rounded-2xl hover:opacity-95 active:scale-[0.98] transition-all shadow-md group`}
                >
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Briefcase size={15} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black leading-tight">Use Active Case</p>
                    <p className="text-[10px] text-white/75 font-medium mt-0.5 leading-relaxed">
                      Auto-load all case facts, parties, evidence, documents, and history.
                    </p>
                  </div>
                </button>

                {/* Manual Mode */}
                <button
                  onClick={() => onManualMode?.()}
                  className="w-full flex items-start gap-3.5 p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 rounded-2xl hover:border-slate-300 dark:hover:border-zinc-600 active:scale-[0.98] transition-all group"
                >
                  <div className="w-8 h-8 bg-slate-100 dark:bg-zinc-700 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={15} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black leading-tight">Manual Mode</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                      Ignore active case. Enter custom facts and start a fresh standalone task.
                    </p>
                  </div>
                </button>
              </div>

              {/* Bottom hint */}
              <p className="text-center text-[9px] text-slate-300 dark:text-slate-600 font-medium pb-1">
                This setting applies to {meta.label} only • You can switch at any time
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CaseContextModal;
