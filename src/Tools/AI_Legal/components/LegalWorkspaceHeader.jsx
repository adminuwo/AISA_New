import { ArrowLeft, Briefcase, Users, Edit2, Trash2, ShieldCheck, Zap } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

const LegalWorkspaceHeader = ({
  currentCase,
  isRenamingCase,
  renameValue,
  setRenameValue,
  handleRenameCase,
  setIsRenamingCase,
  handleDeleteCase,
  handleBackToDashboard,
  selectedLegalTool,
  activeTool
}) => {
  const { tLegal } = useLanguage();

  // Helper to get tool display name
  const getToolDisplayName = () => {
    if (!selectedLegalTool) return 'AI Legal Assistant';
    if (selectedLegalTool.id === 'legal_my_case') return 'Case Assistant';
    return selectedLegalTool.name;
  };

  return (
    <div className="w-full px-4 sm:px-12 pt-3 sm:pt-4 mb-4 sm:mb-8 bg-transparent">
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Navigation & Status Row */}
        <div className="flex items-center justify-between w-full">
          {selectedLegalTool?.id === 'legal_my_case' && (
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-[#131C31] px-3 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all hover:gap-3 group border border-transparent dark:border-white/5"
            >
              <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform sm:w-[14px]" />
              {tLegal('backToCaseList')}
            </button>
          )}
        </div>

        {currentCase && (
          <div className="flex flex-row items-center justify-between gap-4 sm:gap-6 bg-white/50 dark:bg-[#0F172A]/40 p-2 sm:p-0 rounded-2xl sm:rounded-none border border-slate-100 dark:border-white/5 sm:border-none">
            <div className="flex items-center gap-2 sm:gap-5 flex-1 min-w-0">
              {/* Case Icon - Smaller on Mobile */}
              <div className="relative group shrink-0 hidden xs:block">
                <div className="relative p-2 sm:p-4 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl sm:rounded-2xl text-white shadow-lg sm:shadow-xl shadow-indigo-500/10">
                  <Briefcase size={16} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
                </div>
              </div>

              {/* Case Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                   {isRenamingCase === currentCase._id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameCase(currentCase._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameCase(currentCase._id);
                        if (e.key === 'Escape') setIsRenamingCase(null);
                      }}
                      className="bg-slate-50 dark:bg-black/20 border border-indigo-500 rounded-lg px-2 py-0.5 text-xs sm:text-lg font-black w-full outline-none text-slate-900 dark:text-white"
                      autoFocus
                    />
                  ) : (
                    <div className="px-2 py-0.5 bg-indigo-50 dark:bg-[#131C31] rounded-lg border border-indigo-100 dark:border-white/5">
                      <h2 className="text-[12px] sm:text-2xl font-black text-indigo-700 dark:text-[#F8FAFC] tracking-tight leading-tight uppercase truncate">
                        {currentCase.name}
                      </h2>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-x-2 sm:gap-x-4">
                  <p className="text-[8px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1">
                    <Users size={10} className="sm:w-[14px]" strokeWidth={2.5} />
                    <span className="truncate max-w-[50px] sm:max-w-none">{currentCase?.clientName || tLegal('privateClient')}</span>
                  </p>
                  
                  <div className="h-0.5 w-0.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                  
                  <p className="text-[8px] sm:text-xs text-subtext font-bold uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck size={10} className="text-slate-400 sm:w-[14px]" />
                    <span className="hidden xxs:inline">Scoped</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Tool Identity Row - Inline on Mobile */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <div className="flex flex-col items-end">
                   <span className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 hidden sm:block">Current Tool</span>
                   <AnimatePresence mode="wait">
                    <motion.div
                      key={getToolDisplayName()}
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -5, opacity: 0 }}
                       className="flex items-center gap-1 px-1.5 py-0.5 sm:px-4 sm:py-2 bg-slate-100 dark:bg-[#131C31] text-slate-500 dark:text-[#94A3B8] border border-slate-200 dark:border-white/5 rounded-md sm:rounded-full"
                    >
                      <Zap size={8} className="sm:w-[14px]" />
                      <span className="text-[7px] sm:text-sm font-bold tracking-wide whitespace-nowrap uppercase opacity-70">{getToolDisplayName()}</span>
                    </motion.div>
                   </AnimatePresence>
                </div>
                
                {/* Management Actions */}
                <div className="flex items-center gap-1 sm:gap-2">
                   <button
                    onClick={() => {
                      setRenameValue(currentCase.name);
                      setIsRenamingCase(currentCase._id);
                    }}
                    className="p-1.5 sm:p-2.5 bg-white dark:bg-[#131C31] border border-slate-200 dark:border-white/5 text-slate-400 hover:text-indigo-600 rounded-lg sm:rounded-full transition-all shadow-sm group"
                    title="Rename Case"
                  >
                    <Edit2 size={12} className="sm:w-4 sm:h-4" />
                  </button>
                   <button
                    onClick={() => handleDeleteCase(currentCase._id)}
                    className="p-1.5 sm:p-2.5 bg-white dark:bg-[#131C31] border border-slate-200 dark:border-white/5 text-slate-400 hover:text-red-500 rounded-lg sm:rounded-full transition-all shadow-sm group"
                    title="Delete Case"
                  >
                    <Trash2 size={12} className="sm:w-4 sm:h-4" />
                  </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalWorkspaceHeader;
