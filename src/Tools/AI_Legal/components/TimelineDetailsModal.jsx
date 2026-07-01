import React from 'react';
import { X, Calendar, FileText, Brain, Scale } from 'lucide-react';

const categoryColors = {
  Agreement: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-650 dark:text-blue-400', border: 'border-blue-200/20' },
  Evidence: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-650 dark:text-emerald-400', border: 'border-emerald-200/20' },
  Notice: { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-650 dark:text-red-400', border: 'border-red-200/20' },
  Reply: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-650 dark:text-amber-400', border: 'border-amber-200/20' },
  Payment: { bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-650 dark:text-green-400', border: 'border-green-200/20' },
  Default: { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-650 dark:text-rose-400', border: 'border-rose-200/20' },
  'Court Filing': { bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-650 dark:text-indigo-400', border: 'border-indigo-200/20' },
  Hearing: { bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-650 dark:text-purple-400', border: 'border-purple-200/20' },
  Order: { bg: 'bg-cyan-50 dark:bg-cyan-950/20', text: 'text-cyan-650 dark:text-cyan-400', border: 'border-cyan-200/20' },
  Investigation: { bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-650 dark:text-teal-400', border: 'border-teal-200/20' },
  Judgment: { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-650 dark:text-rose-400', border: 'border-rose-200/20' },
  'AI Generated': { bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-650 dark:text-violet-400', border: 'border-violet-200/20' },
  'Document Upload': { bg: 'bg-sky-50 dark:bg-sky-950/20', text: 'text-sky-650 dark:text-sky-400', border: 'border-sky-200/20' },
  Research: { bg: 'bg-slate-50 dark:bg-slate-950/20', text: 'text-slate-650 dark:text-slate-400', border: 'border-slate-200/20' },
  Other: { bg: 'bg-gray-50 dark:bg-gray-950/20', text: 'text-gray-650 dark:text-gray-400', border: 'border-gray-200/20' }
};

const confidenceStyles = {
  High: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-250/25',
  Medium: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-250/25',
  Low: 'bg-red-50 dark:bg-red-950/20 text-red-650 border-red-250/25'
};

const priorityStyles = {
  Low: 'bg-slate-50 dark:bg-slate-950/20 text-slate-600 border-slate-200/20',
  Medium: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200/20',
  High: 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 border-orange-200/20',
  Critical: 'bg-red-550 text-white border-red-600'
};

export const TimelineDetailsModal = ({ visible, onClose, event }) => {
  if (!visible || !event) return null;

  const catStyle = categoryColors[event.category] || categoryColors.Other;
  const confStyle = confidenceStyles[event.confidence] || confidenceStyles.High;
  const prioStyle = priorityStyles[event.priority] || priorityStyles.Medium;

  return (
    <div className="fixed inset-0 z-[120000] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#1a2540] w-full sm:w-[500px] sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800/80" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-xl">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">Case Timeline Fact</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Chronological Journey Audit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Event Title */}
        <div className="mb-5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Milestone Event</span>
          <h4 className="text-lg font-black text-slate-850 dark:text-white leading-snug">{event.title}</h4>
        </div>

        {/* Meta badges grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-zinc-800/40 p-2.5 rounded-xl">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">DATE</span>
            <span className="text-xs font-bold text-slate-700 dark:text-white">{event.date}</span>
          </div>

          <div className="bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-zinc-800/40 p-2.5 rounded-xl">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CATEGORY</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
              {event.category}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-zinc-800/40 p-2.5 rounded-xl">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">PRIORITY</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${prioStyle}`}>
              {event.priority}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-zinc-800/40 p-2.5 rounded-xl text-center">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CONFIDENCE</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${confStyle}`}>
              {event.confidence || 'High'}
            </span>
          </div>
        </div>

        {/* Short Description */}
        <div className="mb-6">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fact Description & Context</span>
          <div className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl">
            <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">{event.description}</p>
          </div>
        </div>

        {/* Source & Document details */}
        <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">DATA SOURCE</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-white font-bold">
              {event.isAiGenerated ? <Brain size={13} className="text-[#4F46E5]" /> : <Scale size={13} className="text-slate-405" />}
              <span>{event.isAiGenerated ? 'AI Generated' : 'Manually Created'}</span>
            </div>
          </div>

          <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TRACEABLE ORIGIN</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
              <FileText size={13} className="text-slate-405" />
              <span className="truncate max-w-[160px]">{event.source || 'Case Summary'}</span>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <button onClick={onClose}
          className="w-full py-3.5 bg-indigo-600 hover:opacity-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all">
          Done
        </button>

      </div>
    </div>
  );
};
export default TimelineDetailsModal;
