import React from 'react';
import { X, Calendar, Gavel, FileText, Brain, Shield, Info } from 'lucide-react';

const statusColors = {
  Upcoming: 'bg-blue-50 dark:bg-blue-950/20 text-blue-650 dark:text-blue-400 border-blue-200/20',
  Completed: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border-emerald-200/20',
  Adjourned: 'bg-amber-50 dark:bg-amber-950/20 text-amber-650 dark:text-amber-400 border-amber-200/20',
  Reserved: 'bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 border-purple-200/20',
  Cancelled: 'bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border-red-200/20',
  Disposed: 'bg-slate-50 dark:bg-slate-950/20 text-slate-650 dark:text-slate-400 border-slate-200/20'
};

export const AiHearingClerkModal = ({ visible, onClose, hearing }) => {
  if (!visible || !hearing) return null;

  const statusStyle = statusColors[hearing.status] || statusColors.Upcoming;

  return (
    <div className="fixed inset-0 z-[120000] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#1a2540] w-full sm:w-[520px] sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800/80" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-xl">
              <Gavel size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">AI Hearing Clerk Dossier</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Courtroom Briefing & Preparation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Stage Title */}
        <div className="mb-5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Hearing Purpose / Stage</span>
          <h4 className="text-lg font-black text-slate-850 dark:text-white leading-snug">{hearing.stage || 'General Appearance'}</h4>
        </div>

        {/* Stats and Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-zinc-800/40 p-2.5 rounded-xl">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">DATE & TIME</span>
            <span className="text-xs font-bold text-slate-700 dark:text-white block">{hearing.date}</span>
            <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{hearing.time || '10:30 AM'}</span>
          </div>

          <div className="bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-zinc-800/40 p-2.5 rounded-xl">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">COURT BENCH</span>
            <span className="text-xs font-bold text-slate-700 dark:text-white block truncate">{hearing.judge || 'Justice Dixit'}</span>
            <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{hearing.courtRoom || 'Courtroom 3'}</span>
          </div>

          <div className="bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-zinc-800/40 p-2.5 rounded-xl flex flex-col justify-between">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">STATUS</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border self-start ${statusStyle}`}>
              {hearing.status}
            </span>
          </div>
        </div>

        {/* Short Proceedings Summary */}
        <div className="mb-5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Court Order / Direction Summary</span>
          <div className="p-3.5 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-2xl">
            <p className="text-xs text-indigo-950 dark:text-indigo-300 font-semibold italic">
              "{hearing.summary || 'No proceedings summary recorded yet.'}"
            </p>
          </div>
        </div>

        {/* AI Preparation notes */}
        <div className="mb-6">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">AI Briefing Clerk Preparations</span>
          <div className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl max-h-[160px] overflow-y-auto leading-relaxed">
            <p className="text-xs text-slate-650 dark:text-slate-350 font-semibold">
              {hearing.clerkNotes || 'AI has analyzed this hearing and confirmed preparation details. Refer to corresponding docket entries for evidentiary compliance checks.'}
            </p>
          </div>
        </div>

        {/* Connected information */}
        <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">LINKED DOCUMENTS</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-white font-bold">
              <FileText size={13} className="text-slate-400" />
              <span>{hearing.linkedDocsCount || 0} Files Attached</span>
            </div>
          </div>

          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">NEXT HEARING SCHEDULE</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-white font-bold">
              <Calendar size={13} className="text-[#4F46E5]" />
              <span>{hearing.nextHearingDate || 'Not Scheduled'}</span>
            </div>
          </div>
        </div>

        {/* Done Action */}
        <button onClick={onClose}
          className="w-full py-3.5 bg-indigo-600 hover:opacity-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all">
          Done
        </button>

      </div>
    </div>
  );
};
export default AiHearingClerkModal;
