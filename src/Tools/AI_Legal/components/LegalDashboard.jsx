import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Scale, Plus, FolderOpen, Edit2, Trash2,
  Users, ChevronRight, Check, X, ArrowLeft, Calendar,
  Gavel, Clock, Search, Filter, User, Phone,
  Bell, CheckCircle2, Paperclip, Share2, MessageSquare,
  Eye, FileText, Sparkles, ExternalLink, MoreVertical,
  Download, AlertCircle, Shield
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { legalService } from '../services/legalService';
import { getActiveModule } from '../services/activeModuleService';
import toast from 'react-hot-toast';

// ─── Status badge component ──────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const colors = {
    'Active': 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200/50',
    'Pending': 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200/50',
    'Closed': 'bg-slate-100 dark:bg-slate-800/30 text-slate-500 border-slate-200/50',
    'High Risk': 'bg-red-50 dark:bg-red-950/20 text-red-500 border-red-200/50'
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${colors[status] || colors['Active']}`}>
      {status || 'Active'}
    </span>
  );
};

// ─── Quick Actions Modal ─────────────────────────────────────────────
const QuickActionsModal = ({ visible, onClose, phoneNumber, countryCode }) => {
  if (!visible) return null;
  const fullPhone = phoneNumber ? `${countryCode || '+91'}${phoneNumber}` : null;
  
  const handleCall = () => {
    console.log("Button Clicked: Call");
    console.log("Icon Clicked: Call");
    if (fullPhone) window.open(`tel:${fullPhone}`, '_self');
  };
  const handleWhatsApp = () => {
    console.log("Button Clicked: WhatsApp");
    console.log("Icon Clicked: WhatsApp");
    if (fullPhone) {
      const stripped = fullPhone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${stripped}`, '_blank');
    }
  };
  const handleCopy = () => {
    console.log("Button Clicked: Copy");
    console.log("Icon Clicked: Copy");
    if (fullPhone) {
      navigator.clipboard.writeText(fullPhone);
      toast.success('Phone number copied');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120000] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#1e293b] w-full sm:w-96 sm:rounded-3xl rounded-t-3xl p-6 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-5" />
        <h3 className="text-center text-base font-black text-slate-900 dark:text-white">Quick Actions</h3>
        <p className="text-center text-sm font-bold text-indigo-600 mt-1 mb-6">{fullPhone || 'No number available'}</p>
        {!fullPhone ? (
          <p className="text-center text-sm text-slate-400 py-4">No client contact available</p>
        ) : (
          <div className="flex justify-around mb-6">
            <button onClick={handleCall} className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 gap-2 hover:scale-105 transition-all">
              <Phone size={22} className="text-emerald-600" />
              <span className="text-[11px] font-black text-emerald-600">Call</span>
            </button>
            <button onClick={handleWhatsApp} className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-green-50 dark:bg-green-950/20 gap-2 hover:scale-105 transition-all">
              <MessageSquare size={22} className="text-green-600" />
              <span className="text-[11px] font-black text-green-600">WhatsApp</span>
            </button>
            <button onClick={handleCopy} className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-violet-50 dark:bg-violet-950/20 gap-2 hover:scale-105 transition-all">
              <Paperclip size={22} className="text-violet-600" />
              <span className="text-[11px] font-black text-violet-600">Copy</span>
            </button>
          </div>
        )}
        <button onClick={onClose} className="w-full py-3 text-center text-sm font-bold text-slate-400 border-t border-slate-100 dark:border-white/5">Dismiss</button>
      </div>
    </div>
  );
};

// ─── Module Router Modal ─────────────────────────────────────────────
// ─── Single reusable ModuleCard ──────────────────────────────────────
const ModuleCard = React.memo(({ module: m, isActive, onSelect }) => {
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(m.id);
  }, [m.id, onSelect]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(m.id);
    }
  }, [m.id, onSelect]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open case in ${m.name}: ${m.desc}${isActive ? ' (currently active)' : ''}`}
      aria-pressed={isActive}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      className={[
        'w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1',
        'active:scale-[0.98]',
        isActive
          ? 'bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-800/40 shadow-sm'
          : 'border border-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:border-slate-100 dark:hover:border-zinc-700/50'
      ].join(' ')}
    >
      {/* Module icon — pointer-events: none so clicks always reach the wrapper */}
      <div
        aria-hidden="true"
        style={{ pointerEvents: 'none' }}
        className={[
          'w-10 h-10 rounded-2xl flex items-center justify-center text-base shrink-0 transition-all',
          isActive
            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-500/20'
            : 'bg-slate-100 dark:bg-zinc-800'
        ].join(' ')}
      >
        <span role="img" aria-hidden="true">{m.icon}</span>
      </div>

      {/* Name + description — pointer-events: none */}
      <div className="min-w-0 flex-1" style={{ pointerEvents: 'none' }}>
        <p className={`text-sm font-black leading-tight ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-slate-900 dark:text-white'}`}>
          {m.name}
        </p>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-snug">{m.desc}</p>
      </div>

      {/* Status badge — pointer-events: none */}
      <div style={{ pointerEvents: 'none' }} className="shrink-0">
        {isActive ? (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm shadow-violet-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            ACTIVE
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-full">
            AVAILABLE
          </span>
        )}
      </div>
    </div>
  );
});
ModuleCard.displayName = 'ModuleCard';

// ─── Module Router Modal ─────────────────────────────────────────────
const ALL_MODULES = [
  { id: 'legal_argument_builder', name: 'Argument Builder', desc: 'Draft courtroom strategies and arguments', icon: '⚖️' },
  { id: 'legal_precedents',       name: 'Legal Precedent',  desc: 'AI precedent and citation explorer',       icon: '🏛️' },
  { id: 'legal_draft_maker',      name: 'Draft Maker',      desc: 'Generate court-ready legal drafts',        icon: '📝' },
  { id: 'legal_evidence_checker', name: 'Evidence Analysis',desc: 'Analyze legal documents and evidence',     icon: '🔍' },
  { id: 'legal_case_predictor',   name: 'Case Predictor',   desc: 'Judicial scanner and forecast',            icon: '🎯' },
  { id: 'legal_contract_analyzer',name: 'Contract Review',  desc: 'Agreement review and compliance',          icon: '📋' },
  { id: 'legal_strategy_engine',  name: 'Strategy Engine',  desc: 'Litigation Roadmap & Tactical Suggestions',icon: '🗺️' },
];

const ModuleRouterModal = ({ visible, onClose, caseData, onLaunchModule, activeModuleId }) => {
  const [search, setSearch] = useState('');
  // Navigation lock: prevents double-firing on rapid taps
  const launchingRef = useRef(false);

  // Reset search and lock when modal opens/closes
  useEffect(() => {
    if (visible) {
      setSearch('');
      launchingRef.current = false;
    }
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_MODULES;
    const q = search.toLowerCase();
    return ALL_MODULES.filter(m =>
      m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)
    );
  }, [search]);

  // Single shared handler — fires once regardless of which element inside the card was touched
  const handleSelectModule = useCallback((moduleId) => {
    if (launchingRef.current) return;   // guard against double-tap
    launchingRef.current = true;
    // Close popup first so the user sees instant feedback
    onClose();
    // Then trigger navigation (state update is async; calling after onClose is fine)
    onLaunchModule(moduleId, caseData);
  }, [onClose, onLaunchModule, caseData]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Open Case In module selector"
      className="fixed inset-0 z-[120000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div
        className="relative bg-white dark:bg-[#0e1628] w-full sm:w-[500px] max-h-[85vh] sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200/50 dark:border-white/5"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Drag handle (mobile only) */}
        <div className="w-10 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" aria-hidden="true" />

        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Open Case In...</h2>
              {caseData && (
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-[280px]">
                  📁 {caseData.title || caseData.name || 'Selected Case'}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close module selector"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 outline-none"
            >
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Search — no autoFocus so it doesn't interfere with touch on mobile */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-black/20 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-white/5">
            <Search size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules..."
              aria-label="Search modules"
              className="bg-transparent outline-none text-sm font-semibold w-full text-slate-800 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Module list — each card is a fully-clickable ModuleCard */}
        <div
          className="flex-1 overflow-y-auto p-3 space-y-1.5"
          role="list"
          aria-label="Available modules"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-slate-400 font-semibold py-8">
              No modules match your search
            </p>
          ) : (
            filtered.map((m) => (
              <div key={m.id} role="listitem">
                <ModuleCard
                  module={m}
                  isActive={activeModuleId === m.id}
                  onSelect={handleSelectModule}
                />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-black/10">
          <p className="text-[9px] text-center text-slate-400 font-medium">
            Selecting a module will set it as ACTIVE for this case
          </p>
        </div>
      </div>
    </div>
  );
};


// ─── Task Modal ──────────────────────────────────────────────────────
const TaskModal = ({ visible, onClose, onSave, editingTask }) => {
  const [form, setForm] = useState({ title: '', description: '', date: '', priority: 'Normal' });
  const priorities = ['Low', 'Normal', 'High', 'Urgent', 'Critical'];

  useEffect(() => {
    if (editingTask) {
      setForm({ title: editingTask.title || editingTask.text || '', description: editingTask.description || '', date: editingTask.date || '', priority: editingTask.priority || 'Normal' });
    } else {
      setForm({ title: '', description: '', date: '', priority: 'Normal' });
    }
  }, [editingTask, visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[120000] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#1e293b] w-full sm:w-[440px] sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-black text-slate-900 dark:text-white">{editingTask ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Task Title</label>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. File rejoinder before Friday"
          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none mb-3 text-slate-800 dark:text-white" />
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Description</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add details..." rows={2}
          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none resize-none mb-3 text-slate-800 dark:text-white" />
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Due Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none text-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Priority</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none text-slate-800 dark:text-white">
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => {
          if (form.title.trim()) {
            console.log("Button Clicked: Save Task");
            console.log("Icon Clicked: Save Task");
            onSave(form, editingTask);
            onClose();
          }
        }}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all">
          {editingTask ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </div>
  );
};

// ─── Timeline Event Modal ────────────────────────────────────────────
const TimelineModal = ({ visible, onClose, onSave, editingEvent }) => {
  const [form, setForm] = useState({ title: '', status: 'Scheduled', court: '', date: '' });

  useEffect(() => {
    if (editingEvent) {
      setForm({ title: editingEvent.title || '', status: editingEvent.status || 'Scheduled', court: editingEvent.court || '', date: editingEvent.date || '' });
    } else {
      setForm({ title: '', status: 'Scheduled', court: '', date: '' });
    }
  }, [editingEvent, visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[120000] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#1e293b] w-full sm:w-[440px] sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-black text-slate-900 dark:text-white">{editingEvent ? 'Edit Event' : 'New Timeline Event'}</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Event Title</label>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Case hearing at District Court"
          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none mb-3 text-slate-800 dark:text-white" />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none text-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none text-slate-800 dark:text-white">
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Court</label>
        <input value={form.court} onChange={e => setForm({ ...form, court: e.target.value })} placeholder="e.g. District Court, Delhi"
          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none mb-5 text-slate-800 dark:text-white" />
        <button onClick={() => {
          if (form.title.trim()) {
            console.log("Button Clicked: Save Event");
            console.log("Icon Clicked: Save Event");
            onSave(form, editingEvent);
            onClose();
          }
        }}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all">
          {editingEvent ? 'Update Event' : 'Add Event'}
        </button>
      </div>
    </div>
  );
};

// ─── Notes Modal ─────────────────────────────────────────────────────
const NotesModal = ({ visible, onClose, onSave, initialText }) => {
  const [text, setText] = useState('');
  useEffect(() => { if (visible) setText(initialText || ''); }, [visible, initialText]);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[120000] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#1e293b] w-full sm:w-[520px] sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Case Notes</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={8} autoFocus placeholder="Add private case notes here..."
          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none resize-none mb-4 text-slate-800 dark:text-white leading-relaxed" />
        <div className="flex gap-3">
          <button onClick={() => {
            console.log("Button Clicked: Cancel Save Notes");
            console.log("Icon Clicked: Cancel Save Notes");
            onClose();
          }} className="flex-1 py-3 border border-slate-200 dark:border-white/5 rounded-xl font-bold text-xs text-slate-500 uppercase tracking-wider">Cancel</button>
          <button onClick={() => {
            console.log("Button Clicked: Save Notes");
            console.log("Icon Clicked: Save Notes");
            onSave(text);
            onClose();
          }}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all">Save Notes</button>
        </div>
      </div>
    </div>
  );
};

// ─── Document Viewer Modal ───────────────────────────────────────────
const DocViewerModal = ({ visible, onClose, doc }) => {
  if (!visible || !doc) return null;
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(doc.name?.split('.').pop()?.toLowerCase());
  const isPdf = doc.name?.split('.').pop()?.toLowerCase() === 'pdf';

  return (
    <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#1e293b] w-full max-w-3xl h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-black/10">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">{doc.name}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Preview Mode</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                console.log("Button Clicked: Download Evidence");
                console.log("Icon Clicked: Download Evidence");
                const a = document.createElement('a');
                a.href = doc.uri;
                a.download = doc.name;
                a.click();
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
              title="Download File"
            >
              <Download size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Content Area */}
        <div className="flex-1 bg-slate-100 dark:bg-black/40 flex items-center justify-center overflow-auto p-4">
          {isImage ? (
            <img src={doc.uri} alt={doc.name} className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
          ) : isPdf ? (
            <iframe src={doc.uri} title={doc.name} className="w-full h-full border-0 rounded-lg" />
          ) : (
            <div className="text-center p-8 bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl max-w-sm shadow-xl">
              <FileText size={48} className="text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <h4 className="text-base font-black text-slate-900 dark:text-white mb-2">Preview Unavailable</h4>
              <p className="text-xs text-slate-400 mb-6 font-semibold">We don't support inline previewing for this file type. You can download and view it locally.</p>
              <button
                onClick={() => {
                  console.log("Button Clicked: Download Evidence");
                  console.log("Icon Clicked: Download Evidence");
                  const a = document.createElement('a');
                  a.href = doc.uri;
                  a.download = doc.name;
                  a.click();
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Case Detail View ────────────────────────────────────────────────
const CaseDetailView = ({ item, isDark, onBack, onDelete, onAskStrategy, onViewRoadmap, onLaunchModuleWithCase }) => {
  const [tasks, setTasks] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState(null);
  const [isNotesModalVisible, setIsNotesModalVisible] = useState(false);
  const [quickActionsPhone, setQuickActionsPhone] = useState(null);
  const [isRouterVisible, setIsRouterVisible] = useState(false);
  const [caseData, setCaseData] = useState(item);
  const fileInputRef = useRef(null);

  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);

  // Track active module for this case
  const [activeModuleId, setActiveModuleId] = useState(() => {
    const state = getActiveModule();
    const caseId = item?.id || item?._id;
    return (state && state.caseId === caseId) ? state.moduleId : null;
  });

  const docFormat = (doc) => {
    if (!doc?.name) return 'file';
    return doc.name.split('.').pop() || 'file';
  };

  const handleOpenDoc = (doc) => {
    if (!doc.uri) {
      toast.error("File preview is only supported for newly uploaded files in this session.");
      return;
    }
    setActiveDoc(doc);
    setIsDocViewerOpen(true);
  };

  const handleDownloadDoc = (doc) => {
    if (!doc?.uri) {
      toast.error("Download URL not available");
      return;
    }
    const a = document.createElement('a');
    a.href = doc.uri;
    a.download = doc.name;
    a.click();
    toast.success("Downloading document...");
  };

  useEffect(() => { setCaseData(item); }, [item]);

  useEffect(() => {
    console.log("Active Cases Screen Mounted");
    console.log("Case Details Ready");
    if (caseData?.id) {
      loadTasks(caseData.id);
      loadTimeline(caseData.id);
    }
  }, [caseData?.id]);

  const loadTasks = async (caseId) => {
    try { setTasks(await legalService.getRemindersForCase(caseId)); } catch (e) { console.error(e); }
  };
  const loadTimeline = async (caseId) => {
    try { setTimelineEvents(await legalService.getTimelineEvents(caseId)); } catch (e) { console.error(e); }
  };

  const handleSaveTask = async (form, editing) => {
    console.log("Button Clicked: Save Task");
    console.log("Icon Clicked: Save Task");
    try {
      if (editing) {
        await legalService.updateReminder(editing.id, { title: form.title, description: form.description, date: form.date || 'No Date', priority: form.priority });
      } else {
        await legalService.addReminder({ case_id: caseData.id, title: form.title, description: form.description, date: form.date || 'No Date', priority: form.priority, status: 'Pending', completed: false });
      }
      await loadTasks(caseData.id);
      console.log("Action Completed: Task Saved");
      toast.success(editing ? 'Task updated' : 'Task created');
    } catch (e) { console.error(e); }
  };

  const handleToggleTask = async (task) => {
    console.log("Button Clicked: Toggle Task Status");
    console.log("Icon Clicked: Toggle Task Status");
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    try {
      await legalService.updateReminder(task.id, { completed: !task.completed });
      console.log("Action Completed: Task Completed Status Toggled");
    } catch (e) {
      await loadTasks(caseData.id);
    }
  };

  const handleDeleteTask = async (id) => {
    console.log("Button Clicked: Delete Task");
    console.log("Icon Clicked: Delete Task");
    if (!confirm('Delete this task?')) return;
    try {
      await legalService.deleteReminder(id);
      await loadTasks(caseData.id);
      console.log("Action Completed: Task Deleted");
      toast.success('Task deleted');
    } catch (e) { console.error(e); }
  };

  const handleSaveTimeline = async (form, editing) => {
    console.log("Button Clicked: Save Event");
    console.log("Icon Clicked: Save Event");
    try {
      const normalizedStatus = form.status.toLowerCase() === 'completed' ? 'completed' : 'scheduled';
      await legalService.saveTimelineEvent({ id: editing?.id, caseId: caseData.id, title: form.title, status: normalizedStatus, court: form.court, date: form.date });
      await legalService.syncHearingStatus(caseData.title, normalizedStatus);
      await loadTimeline(caseData.id);
      console.log("Action Completed: Timeline Event Saved");
      toast.success(editing ? 'Event updated' : 'Event added');
    } catch (e) { console.error(e); }
  };

  const handleDeleteTimeline = async (id) => {
    console.log("Button Clicked: Delete Event");
    console.log("Icon Clicked: Delete Event");
    if (!confirm('Delete this timeline event?')) return;
    try {
      await legalService.deleteTimelineEvent(id);
      await loadTimeline(caseData.id);
      console.log("Action Completed: Timeline Event Deleted");
      toast.success('Event deleted');
    } catch (e) { console.error(e); }
  };

  const handleSaveNotes = async (text) => {
    console.log("Button Clicked: Save Notes");
    console.log("Icon Clicked: Save Notes");
    try {
      await legalService.updateCase(caseData.id, { description: text.trim() });
      setCaseData(prev => ({ ...prev, description: text.trim() }));
      console.log("Action Completed: Case Notes Saved");
      toast.success('Notes saved');
    } catch (e) { toast.error('Failed to save notes'); }
  };

  const handleUploadEvidence = async (e) => {
    console.log("Button Clicked: Upload Evidence");
    console.log("Icon Clicked: Upload Evidence");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newDoc = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type || 'file',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uri: URL.createObjectURL(file)
      };
      const updatedDocs = [newDoc, ...(caseData.documents || [])];
      await legalService.updateCase(caseData.id, { documents: updatedDocs });
      setCaseData(prev => ({ ...prev, documents: updatedDocs }));
      console.log("Action Completed: Evidence Uploaded");
      toast.success(`Uploaded: ${file.name}`);
    } catch (err) {
      toast.error('Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteEvidence = async (doc) => {
    console.log("Button Clicked: Delete Evidence");
    console.log("Icon Clicked: Delete Evidence");
    if (!confirm(`Delete ${doc.name}?`)) return;
    try {
      const updatedDocs = (caseData.documents || []).filter(d => d.id !== doc.id);
      await legalService.updateCase(caseData.id, { documents: updatedDocs });
      setCaseData(prev => ({ ...prev, documents: updatedDocs }));
      console.log("Action Completed: Evidence Deleted");
      toast.success('Evidence deleted');
    } catch (e) { toast.error('Failed to delete'); }
  };

  const formatSize = (size) => {
    if (!size || isNaN(size)) return '0 KB';
    const kb = size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Case Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-200/60 dark:border-white/5 pb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{caseData.title}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <User size={14} className="text-indigo-500" /> Client: <span className="text-slate-700 dark:text-slate-200 font-black">{caseData.clientName || 'N/A'}</span>
                </div>
                {caseData.opponentName && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                    <Users size={14} className="text-violet-500" /> Opponent: <span className="text-slate-700 dark:text-slate-200 font-black">{caseData.opponentName}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 sm:mt-0">
              <StatusBadge status={caseData.status || 'Active'} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Main Content Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* AI Intelligence Card */}
              <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden border border-indigo-400/25">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/10 rounded-lg">
                      <Sparkles size={16} className="text-amber-300" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest opacity-95">AI Case Intelligence</span>
                  </div>
                  {caseData.probability && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/15 dark:bg-white/10 rounded-full border border-white/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">{caseData.probability}% Win Probability</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm sm:text-base font-semibold leading-relaxed opacity-95 mb-6 relative z-10">
                  {caseData.aiSummary || `Strategic assessment for ${caseData.title} is pending. Complete case details and documentation to generate precise AI intelligence.`}
                </p>
                
                <div className="flex flex-wrap gap-2.5 relative z-10">
                  <button onClick={() => {
                    console.log("Button Clicked: AI Legal Chat");
                    console.log("Icon Clicked: AI Legal Chat");
                    onAskStrategy?.(caseData);
                  }} className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-indigo-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-95 duration-150">
                    <MessageSquare size={14} /> AI Legal Chat
                  </button>

                  <button onClick={() => {
                    console.log("Button Clicked: Open Case In");
                    console.log("Icon Clicked: Open Case In");
                    setIsRouterVisible(true);
                  }} className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 duration-150">
                    <ExternalLink size={14} /> Open Case In...
                  </button>
                </div>
              </div>

              {/* Case Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: Calendar, label: 'NEXT HEARING', value: caseData.hearingDate || 'TBD', color: 'text-indigo-600 dark:text-indigo-400' },
                  { icon: Gavel, label: 'COURT', value: caseData.courtName || 'General', color: 'text-violet-600 dark:text-violet-400' },
                  { icon: Scale, label: 'CASE TYPE', value: caseData.caseType || 'General', color: 'text-amber-600 dark:text-amber-400' },
                  { icon: Paperclip, label: 'EVIDENCE', value: `${(caseData.documents || []).length} Files`, color: 'text-emerald-600 dark:text-emerald-400' }
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center gap-3.5 p-4 bg-white dark:bg-[#1A2540] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-300">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                      <Icon size={18} className={color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Items & Reminders */}
              <div className="bg-white dark:bg-[#1A2540] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <Bell size={16} className="text-red-500" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Action Items & Reminders</h4>
                  </div>
                  <span className="px-2.5 py-0.5 text-[9px] font-black uppercase bg-red-50 dark:bg-red-950/20 text-red-600 rounded-md">
                    {tasks.filter(t => !t.completed).length} Pending
                  </span>
                </div>
                {tasks.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 px-2 rounded-xl transition-all">
                        <button onClick={() => handleToggleTask(task)}
                          className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${task.completed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'}`}>
                          {task.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                        </button>
                        <button onClick={() => {
                          console.log("Button Clicked: Edit Task");
                          console.log("Icon Clicked: Edit Task");
                          setEditingTask(task);
                          setIsTaskModalVisible(true);
                        }} className="flex-1 text-left min-w-0">
                          <p className={`text-sm font-semibold truncate ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>{task.title || task.text}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{task.date}{task.priority ? ` • ${task.priority}` : ''}</p>
                        </button>
                        {task.completed && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
                        {!task.completed && <button onClick={() => {
                          console.log("Button Clicked: Edit Task");
                          console.log("Icon Clicked: Edit Task");
                          setEditingTask(task);
                          setIsTaskModalVisible(true);
                        }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0 transition-colors"><Edit2 size={13} className="text-slate-400 hover:text-indigo-500" /></button>}
                        <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg shrink-0 transition-colors"><Trash2 size={13} className="text-red-400 hover:text-red-500" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl mb-4 bg-slate-50/50 dark:bg-slate-900/10">
                    <p className="text-xs text-slate-400 font-bold">No action items yet</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5 font-bold">Create your first reminder</p>
                  </div>
                )}
                <button onClick={() => {
                  console.log("Button Clicked: Add New Task");
                  console.log("Icon Clicked: Add New Task");
                  setEditingTask(null);
                  setIsTaskModalVisible(true);
                }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-xl text-xs font-black transition-all">
                  <Plus size={14} /> Add New Task
                </button>
              </div>

              {/* Case Timeline */}
              <div className="bg-white dark:bg-[#1A2540] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-violet-50 dark:bg-violet-950/20 rounded-lg">
                    <Clock size={16} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Case Timeline</h4>
                </div>
                {timelineEvents.length > 0 ? (
                  <div className="space-y-0 mb-4 px-1">
                    {timelineEvents.map((evt, i) => {
                      const isCompleted = (evt.status || '').toLowerCase() === 'completed';
                      return (
                        <div key={evt.id || i} className="flex gap-4">
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 ${isCompleted ? 'bg-red-500 border-red-200 dark:border-red-950' : 'bg-emerald-500 border-emerald-200 dark:border-emerald-950'} z-10 shadow-sm`} />
                            {i < timelineEvents.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700/60 min-h-[36px]" />}
                          </div>
                          <div className="flex-1 pb-5 min-w-0">
                            <div className="flex items-start justify-between gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/30 dark:border-white/5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-all">
                              <button onClick={() => {
                                console.log("Button Clicked: Edit Event");
                                console.log("Icon Clicked: Edit Event");
                                setEditingTimeline(evt);
                                setIsTimelineModalVisible(true);
                              }} className="text-left min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{evt.title}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{evt.date}{evt.court ? ` • ${evt.court}` : ''}</p>
                                <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isCompleted ? 'bg-red-50 dark:bg-red-950/20 text-red-500' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'}`}>
                                  {evt.status}
                                </span>
                              </button>
                              <div className="flex items-center gap-1">
                                <button onClick={() => {
                                  console.log("Button Clicked: Edit Event");
                                  console.log("Icon Clicked: Edit Event");
                                  setEditingTimeline(evt);
                                  setIsTimelineModalVisible(true);
                                }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0 transition-colors"><Edit2 size={13} className="text-slate-400 hover:text-indigo-500" /></button>
                                <button onClick={() => handleDeleteTimeline(evt.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg shrink-0 transition-colors"><Trash2 size={13} className="text-red-400 hover:text-red-500" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl mb-4 bg-slate-50/50 dark:bg-slate-900/10">
                    <p className="text-xs text-slate-400 font-bold">No timeline events</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5 font-bold">Create your first event</p>
                  </div>
                )}
                <button onClick={() => {
                  console.log("Button Clicked: Add Event");
                  console.log("Icon Clicked: Add Event");
                  setEditingTimeline(null);
                  setIsTimelineModalVisible(true);
                }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-xl text-xs font-black transition-all">
                  <Plus size={14} /> Add Event
                </button>
              </div>

            </div>

            {/* Right Sidebar Column */}
            <div className="lg:col-span-1 space-y-6">

              {/* Client Contact */}
              <div className="bg-white dark:bg-[#1A2540] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                    <User size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Client Contact</h4>
                </div>
                <div className="flex items-center gap-3.5 p-3 bg-slate-50 dark:bg-slate-900/10 border border-slate-200/30 dark:border-white/5 rounded-xl">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                    {caseData.clientName?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{caseData.clientName || 'Unnamed Client'}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">{caseData.clientPhone ? `${caseData.countryCode || '+91'} ${caseData.clientPhone}` : 'No contact added'}</p>
                  </div>
                  <button onClick={() => {
                    console.log("Button Clicked: Call Client");
                    console.log("Icon Clicked: Call Client");
                    setQuickActionsPhone(caseData.clientPhone || null);
                  }}
                    className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl hover:scale-105 active:scale-95 transition-all text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50">
                    <Phone size={18} />
                  </button>
                </div>
              </div>

              {/* Private Case Notes */}
              <div className="bg-white dark:bg-[#1A2540] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <MessageSquare size={16} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Private Case Notes</h4>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/10 border border-slate-200/30 dark:border-white/5 rounded-xl mb-4 min-h-[100px] flex flex-col justify-between">
                  {caseData.description?.trim() ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold leading-relaxed whitespace-pre-wrap">{caseData.description}</p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic font-semibold text-center my-auto">No notes added yet</p>
                  )}
                </div>
                <button onClick={() => {
                  console.log("Button Clicked: Add or Edit Notes");
                  console.log("Icon Clicked: Add or Edit Notes");
                  setIsNotesModalVisible(true);
                }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-xl text-xs font-black transition-all">
                  <Edit2 size={12} /> Add or Edit Notes
                </button>

                {caseData.savedResponses && caseData.savedResponses.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Saved AI Research Reports</h5>
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                      {caseData.savedResponses.map((item) => (
                        <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900/10 border border-slate-200/30 dark:border-white/5 rounded-xl">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{item.query}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed whitespace-pre-wrap">{item.response}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence Manager */}
              <div className="bg-white dark:bg-[#1A2540] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                      <Paperclip size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Evidence Manager</h4>
                  </div>
                  <span className="px-2.5 py-0.5 text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-md">
                    {(caseData.documents || []).length} Files
                  </span>
                </div>
                {(caseData.documents || []).length > 0 ? (
                  <div className="space-y-2.5 mb-4">
                    {(caseData.documents || []).map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/10 border border-slate-200/30 dark:border-white/5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-all">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg shrink-0">
                          <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{formatSize(doc.size)} • {formatDate(doc.uploadedAt)}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => {
                            console.log("Button Clicked: View Evidence");
                            console.log("Icon Clicked: View Evidence");
                            handleOpenDoc(doc);
                          }} className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors" title="View Preview">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => {
                            console.log("Button Clicked: Download Evidence");
                            console.log("Icon Clicked: Download Evidence");
                            handleDownloadDoc(doc);
                          }} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors" title="Download">
                            <Download size={13} />
                          </button>
                          <button onClick={() => {
                            console.log("Button Clicked: Delete Evidence");
                            console.log("Icon Clicked: Delete Evidence");
                            handleDeleteEvidence(doc);
                          }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500 transition-colors" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl mb-4 bg-slate-50/50 dark:bg-slate-900/10">
                    <p className="text-xs text-slate-400 font-bold">No evidence uploaded yet</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5 font-bold">Support PDF, DOC, PNG, JPG</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleUploadEvidence} className="hidden" />
                <button onClick={() => {
                  console.log("Button Clicked: Upload Evidence");
                  console.log("Icon Clicked: Upload Evidence");
                  fileInputRef.current?.click();
                }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                  <Plus size={16} /> Upload Evidence
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TaskModal visible={isTaskModalVisible} onClose={() => { setIsTaskModalVisible(false); setEditingTask(null); }} onSave={handleSaveTask} editingTask={editingTask} />
      <TimelineModal visible={isTimelineModalVisible} onClose={() => { setIsTimelineModalVisible(false); setEditingTimeline(null); }} onSave={handleSaveTimeline} editingEvent={editingTimeline} />
      <NotesModal visible={isNotesModalVisible} onClose={() => setIsNotesModalVisible(false)} onSave={handleSaveNotes} initialText={caseData.description} />
      <QuickActionsModal visible={quickActionsPhone !== null} onClose={() => setQuickActionsPhone(null)} phoneNumber={quickActionsPhone} countryCode={caseData.countryCode} />
      <ModuleRouterModal
        visible={isRouterVisible}
        onClose={() => setIsRouterVisible(false)}
        caseData={caseData}
        activeModuleId={activeModuleId}
        onLaunchModule={(moduleId, cd) => {
          // Update local active state immediately for instant UI feedback
          setActiveModuleId(moduleId);
          onLaunchModuleWithCase(moduleId, cd);
        }}
      />
      <DocViewerModal visible={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} doc={activeDoc} />
    </>
  );
};


// ═══════════════════════════════════════════════════════════════════════
// ─── Main LegalDashboard Component ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
const LegalDashboard = ({
  legalCases = [],
  currentProjectId = null,
  handleOpenCase = () => {},
  handleOpenEditModal = () => {},
  handleDeleteCase = () => {},
  isRenamingCase = null,
  renameValue = '',
  setRenameValue = () => {},
  handleRenameCase = () => {},
  setIsRenamingCase = () => {},
  setIsNewCaseModalOpen = () => {},
  setEditingCaseId = () => {},
  setNewCaseForm = () => {},
  setActiveLegalToolkit = () => {},
  onBack = () => {},
  // New callbacks for module routing
  onAskStrategy,
  onViewRoadmap,
  onLaunchModuleWithCase,
  initialFilter = 'All'
}) => {
  const { tLegal } = useLanguage();
  const [selectedCase, setSelectedCase] = useState(null);
  const [filter, setFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    console.log("Case Management Loaded");
    console.log("Case List Loaded");
    console.log("Active Cases Screen Mounted");
  }, []);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const filters = ['All', 'Active'];

  const filteredCases = useMemo(() => {
    let result = legalCases;
    // Status filter
    if (filter !== 'All') {
      result = result.filter(c => (c.status || 'Active') === filter);
    }
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.clientName || '').toLowerCase().includes(q) ||
        (c.caseType || '').toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [legalCases, filter, searchQuery]);

  const handleCaseClick = (c) => {
    console.log("Active Cases Card Clicked");
    console.log("Loading AISA-Mobile Active Cases Module");
    // Convert to legalService format if needed (allProjects uses _id, legalService uses id)
    const caseForDetail = {
      ...c,
      id: c.id || c._id,
      title: c.title || c.name,
    };
    setSelectedCase(caseForDetail);
  };

  const handleDeleteFromDetail = async (id) => {
    try {
      await legalService.deleteCase(id);
      // Also call parent delete if using _id format
      if (handleDeleteCase) handleDeleteCase(id);
      setSelectedCase(null);
      toast.success('Case deleted');
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Case Detail View ────────────────────────
  if (selectedCase) {
    return (
      <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden bg-transparent relative">
        {/* Header */}
        <div className="w-full px-4 sm:px-6 md:px-10 pt-5 pb-4 flex items-center justify-between gap-4 shrink-0 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/80 dark:bg-[#0B1020]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => {
              console.log("Button Clicked: Back To Dashboard");
              console.log("Icon Clicked: Back To Dashboard");
              console.log("Navigation Success: Returned to Dashboard");
              setSelectedCase(null);
            }} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Case Management</h2>
          </div>
        </div>
        <CaseDetailView
          item={selectedCase}
          isDark={false}
          onBack={() => setSelectedCase(null)}
          onDelete={handleDeleteFromDetail}
          onAskStrategy={onAskStrategy}
          onViewRoadmap={onViewRoadmap}
          onLaunchModuleWithCase={onLaunchModuleWithCase}
        />
      </div>
    );
  }

  // ─── Case List View ──────────────────────────
  return (
    <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden aisa-scalable-text bg-transparent relative">
      {/* Dashboard Header */}
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12 pt-6 sm:pt-8 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/80 dark:bg-[#0B1020]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => {
              console.log("Button Clicked: Back");
              console.log("Icon Clicked: Back");
              console.log("Navigation Success: Returned to Dashboard");
              onBack();
            }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors mr-1">
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
          <button onClick={() => {
            console.log("Button Clicked: New Case");
            console.log("Icon Clicked: New Case");
            setEditingCaseId(null);
            setNewCaseForm({ clientName: '', caseType: '', otherCaseType: '', accused: '', summary: '' });
            setIsNewCaseModalOpen(true);
          }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white rounded-xl sm:rounded-full font-black text-xs sm:text-sm transition-all active:scale-95 shadow-xl shadow-indigo-500/20 whitespace-nowrap">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> <span>{tLegal('newCaseBtn')}</span>
          </button>
        </div>
      </div>

      {/* Filter + Search Bar */}
      <div className="px-4 sm:px-6 md:px-10 lg:px-12 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar w-full sm:w-auto">
          {filters.map(f => (
            <button key={f} onClick={() => {
              console.log("Button Clicked: Filter - " + f);
              console.log("Icon Clicked: Filter - " + f);
              setFilter(f);
            }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-white dark:bg-[#1A2540] text-slate-500 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#18233A]'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 w-full sm:w-64 sm:ml-auto">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search cases..."
            className="bg-transparent outline-none text-xs font-semibold w-full text-slate-800 dark:text-white" />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14} className="text-slate-400" /></button>}
        </div>
      </div>

      {/* Case Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 md:px-10 lg:px-12 py-6 sm:py-8 overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
        {filteredCases.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-[repeat(auto-fit,_minmax(250px,_1fr))]">
            {filteredCases.map((c) => (
              <motion.div key={c._id || c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="group relative bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-[28px] p-4 sm:p-6 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/15 transition-colors duration-300 cursor-pointer"
                onClick={() => handleCaseClick(c)}
              >
                <div className="flex justify-between items-start mb-4 sm:mb-5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${currentProjectId === (c.id || c._id) ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-indigo-50 dark:bg-[#131C31] text-indigo-600'} transition-colors`}>
                      <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <StatusBadge status={c.status || 'Active'} />
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => {
                      e.stopPropagation();
                      console.log("Button Clicked: Edit Case");
                      console.log("Icon Clicked: Edit Case");
                      handleOpenEditModal(c);
                    }}
                      className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg sm:rounded-xl text-subtext transition-colors bg-white/50 dark:bg-black/20 sm:bg-transparent" title="Edit Case">
                      <Edit2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      console.log("Button Clicked: Delete Case");
                      console.log("Icon Clicked: Delete Case");
                      handleDeleteCase(c.id || c._id);
                    }}
                      className="p-1.5 sm:p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg sm:rounded-xl text-red-500 transition-colors bg-white/50 dark:bg-black/20 sm:bg-transparent" title="Delete Case">
                      <Trash2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5 mb-4 sm:mb-5">
                  {isRenamingCase === (c.id || c._id) ? (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        className="bg-slate-50 dark:bg-black/20 border border-primary rounded-lg px-2 py-1 text-xs sm:text-sm font-bold w-full outline-none"
                        onKeyDown={e => e.key === 'Enter' && handleRenameCase(c.id || c._id)} />
                      <button onClick={() => handleRenameCase(c.id || c._id)} className="p-1 text-green-500"><Check size={14} /></button>
                      <button onClick={() => setIsRenamingCase(null)} className="p-1 text-slate-400"><X size={14} /></button>
                    </div>
                  ) : (
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.name || c.title}</h3>
                  )}
                  <div className="flex flex-col gap-1">
                    <p className="text-[8px] sm:text-xs text-subtext font-bold uppercase tracking-widest flex items-center gap-1 sm:gap-1.5">
                      <Users size={10} className="sm:w-[11px] sm:h-[11px]" />
                      {c.clientName || 'Private Client'}
                    </p>
                    {c.caseType && (
                      <p className="text-[7px] sm:text-[9px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1 sm:gap-1.5">
                        <Scale size={10} className="sm:w-[11px] sm:h-[11px]" />
                        {c.caseType}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-slate-100 dark:border-white/5">
                  <span className="text-[8px] sm:text-[9px] text-subtext font-bold uppercase tracking-tighter">
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
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                {searchQuery || filter !== 'All' ? 'No matching cases' : tLegal('noActiveCases')}
              </h3>
              <p className="text-sm text-subtext mt-2 max-w-sm">
                {searchQuery || filter !== 'All' ? 'Try adjusting your search or filters.' : tLegal('startByCreatingCase')}
              </p>
            </div>
            {!searchQuery && filter === 'All' && (
              <button onClick={() => {
                console.log("Button Clicked: New Case");
                console.log("Icon Clicked: New Case");
                setIsNewCaseModalOpen(true);
              }}
                className="mt-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-indigo-500/20">
                {tLegal('initializeFirstCase')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalDashboard;
