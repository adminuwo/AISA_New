import React from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, Scale, Plus, FolderOpen, Edit2, Trash2,
  Users, ChevronRight, Check, X, ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

const LegalDashboard = ({
  legalCases,
  currentProjectId,
  handleOpenCase,
  handleOpenEditModal,
  handleDeleteCase,
  isRenamingCase,
  renameValue,
  setRenameValue,
  handleRenameCase,
  setIsRenamingCase,
  setIsNewCaseModalOpen,
  setEditingCaseId,
  setNewCaseForm,
  setActiveLegalToolkit,
  onBack
}) => {
  const { tLegal } = useLanguage();

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden aisa-scalable-text bg-slate-50/30 dark:bg-transparent relative">
      {/* Dashboard Header - Sticky */}
      <div className="w-full px-4 sm:px-10 pt-6 sm:pt-8 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/80 dark:bg-[#0B1020]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors mr-1"
            >
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </motion.button>
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl sm:rounded-2xl shadow-xl shadow-indigo-500/20 text-white">
              <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{tLegal('myCase')}</h1>
            <p className="text-[10px] sm:text-xs text-subtext font-medium mt-0.5">{tLegal('manageReposDesc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveLegalToolkit(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-[#131C31] hover:bg-slate-50 dark:hover:bg-[#18233A] text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/5 rounded-xl sm:rounded-full font-black text-xs sm:text-sm transition-all active:scale-95 shadow-xl shadow-indigo-500/5 whitespace-nowrap"
          >
            <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{tLegal('legalToolkitTitle')}</span>
          </button>
          <button
            onClick={() => {
              setEditingCaseId(null);
              setNewCaseForm({ clientName: '', caseType: '', otherCaseType: '', accused: '', summary: '' });
              setIsNewCaseModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white rounded-xl sm:rounded-full font-black text-xs sm:text-sm transition-all active:scale-95 shadow-xl shadow-indigo-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{tLegal('newCaseBtn')}</span>
          </button>
        </div>
      </div>

      {/* Case Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-10 py-6 sm:py-8 overscroll-contain touch-pan-y">
        {legalCases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {legalCases.map((c) => (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="group relative bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-[28px] p-4 sm:p-6 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/15 transition-all cursor-pointer"
                onClick={() => handleOpenCase(c)}
              >
                <div className="flex justify-between items-start mb-4 sm:mb-5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${currentProjectId === c._id ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-indigo-50 dark:bg-[#131C31] text-indigo-600'} transition-colors`}>
                      <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    {(() => {
                      if (!c.hearings || c.hearings.length === 0) return null;
                      const today = new Date(); today.setHours(0,0,0,0);
                      const dueHearing = c.hearings.find(h => h.status === 'Upcoming' && new Date(h.date).setHours(0,0,0,0) === today.getTime());
                      const upcomingHearing = c.hearings.find(h => h.status === 'Upcoming' && new Date(h.date).setHours(0,0,0,0) > today.getTime());
                      const missedHearing = c.hearings.find(h => h.status === 'Missed');

                      const baseClass = "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] sm:text-[8px] font-black uppercase tracking-tighter shadow-sm whitespace-nowrap border";
                      
                      if (dueHearing) return (
                        <div className={`${baseClass} bg-red-500 text-white border-red-400 animate-pulse`}>
                          <span className="w-1 h-1 rounded-full bg-white" />
                          {tLegal('hearingDue')}
                        </div>
                      );
                      if (missedHearing) return (
                        <div className={`${baseClass} bg-amber-500 text-white border-amber-400`}>
                          <span className="w-1 h-1 rounded-full bg-white" />
                          {tLegal('missedHearing')}
                        </div>
                      );
                      if (upcomingHearing) return (
                        <div className={`${baseClass} bg-indigo-500 text-white border-indigo-400`}>
                          <span className="w-1 h-1 rounded-full bg-white opacity-60" />
                          {tLegal('upcomingHearing')}
                        </div>
                      );
                      return null;
                    })()}
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(c);
                      }}
                      className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg sm:rounded-xl text-subtext transition-colors bg-white/50 dark:bg-black/20 sm:bg-transparent"
                      title="Edit Case"
                    >
                      <Edit2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCase(c._id);
                      }}
                      className="p-1.5 sm:p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg sm:rounded-xl text-red-500 transition-colors bg-white/50 dark:bg-black/20 sm:bg-transparent"
                      title="Delete Case"
                    >
                      <Trash2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5 mb-4 sm:mb-5">
                  {isRenamingCase === c._id ? (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        className="bg-slate-50 dark:bg-black/20 border border-primary rounded-lg px-2 py-1 text-xs sm:text-sm font-bold w-full outline-none"
                        onKeyDown={e => e.key === 'Enter' && handleRenameCase(c._id)}
                      />
                      <button onClick={() => handleRenameCase(c._id)} className="p-1 text-green-500"><Check size={14} /></button>
                      <button onClick={() => setIsRenamingCase(null)} className="p-1 text-slate-400"><X size={14} /></button>
                    </div>
                  ) : (
                    <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.name}</h3>
                  )}
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] sm:text-xs text-subtext font-bold uppercase tracking-widest flex items-center gap-1 sm:gap-1.5">
                      <Users size={10} className="sm:w-[11px] sm:h-[11px]" />
                      {c.clientName || 'Private Client'}
                    </p>
                    {c.caseType && (
                      <p className="text-[8px] sm:text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1 sm:gap-1.5">
                        <Scale size={10} className="sm:w-[11px] sm:h-[11px]" />
                        {c.caseType}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/5">
                  <span className="text-[9px] sm:text-[10px] text-subtext font-bold uppercase tracking-tighter">
                    {new Date(c.updatedAt || Date.now()).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{tLegal('openCaseBtn')}</span>
                    <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4">
            <div className="p-6 bg-slate-100 dark:bg-zinc-800/50 rounded-full text-slate-400">
              <FolderOpen className="w-14 h-14" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">{tLegal('noActiveCases')}</h3>
              <p className="text-sm text-subtext mt-2 max-w-sm">{tLegal('startByCreatingCase')}</p>
            </div>
            <button
              onClick={() => setIsNewCaseModalOpen(true)}
              className="mt-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"
            >
              {tLegal('initializeFirstCase')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalDashboard;
