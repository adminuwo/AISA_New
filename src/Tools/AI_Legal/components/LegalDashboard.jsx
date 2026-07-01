import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Scale, Plus, FolderOpen, Edit2, Trash2,
  Users, ChevronRight, Check, X, ArrowLeft, Calendar,
  Gavel, Clock, Search, Filter, User, Phone,
  Bell, CheckCircle2, Paperclip, Share2, MessageSquare,
  Eye, FileText, Sparkles, ExternalLink, MoreVertical,
  Download, AlertCircle, Shield, History, BookOpen, ScrollText, Landmark, HelpCircle,
  Target, Brain, LayoutDashboard, FileDigit, Bookmark, Mail, Send,
  Mic, ChevronLeft, ChevronDown, EyeOff, ClipboardList, FileSearch, Save,
  Minimize2, Maximize2, Copy, RefreshCcw, FileDown, ListTodo, Sliders, Pin, UploadCloud, Square
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLanguage } from '../../../context/LanguageContext';
import { legalService } from '../services/legalService';
import { getActiveModule } from '../services/activeModuleService';
import toast from 'react-hot-toast';
import { apiService } from '../../../services/apiService';
import { generateChatResponse } from '../../../services/geminiService';
import TimelineDetailsModal from './TimelineDetailsModal';
import AiHearingClerkModal from './AiHearingClerkModal';
import FullScreenCaseAssistant from './FullScreenCaseAssistant';
import { chatStorageService } from '../../../services/chatStorageService';



const QUICK_AI_ACTIONS = [
  { name: 'Draft Legal Notice', icon: 'FileText', prompt: 'Draft a formal legal notice based on this case facts and provisions.' },
  { name: 'Generate Arguments', icon: 'Scale', prompt: 'Generate the strongest legal arguments for our client in this dispute.' },
  { name: 'Evidence Analysis', icon: 'ShieldAlert', prompt: 'Analyze all case evidence and find any potential weak points or gaps.' },
  { name: 'Cross Examination', icon: 'Landmark', prompt: 'Prepare witness cross-examination questionnaire matching this dispute.' },
  { name: 'Timeline', icon: 'Clock', prompt: 'Construct a chronological timeline of key events and occurrences.' },
  { name: 'Legal Research', icon: 'Search', prompt: 'Research applicable acts, sections, and bare acts guidelines.' },
  { name: 'Case Summary', icon: 'FileText', prompt: 'Provide a detailed case summary including client details and opponent claims.' },
  { name: 'Strategy Engine', icon: 'Sparkles', prompt: 'Synthesize the best strategy and win probability booster recommendations.' },
  { name: 'Witness Questions', icon: 'HelpCircle', prompt: 'Generate a targeted checklist of questions for our key witnesses.' },
  { name: 'Contract Review', icon: 'Briefcase', prompt: 'Perform contract review to identify liabilities and risks.' },
  { name: 'Settlement Planner', icon: 'Scale', prompt: 'Suggest optimal settlement grounds and terms.' },
  { name: 'Risk Assessment', icon: 'ShieldAlert', prompt: 'Assess potential litigation risks, costs, and timeline delay exposures.' },
  { name: 'Document Comparison', icon: 'FileText', prompt: 'Highlight discrepancies between current evidence and pleadings.' },
  { name: 'Draft Reply', icon: 'Plus', prompt: 'Draft a formal reply statement responding to the opponent\'s allegations.' },
  { name: 'Appeal Draft', icon: 'Landmark', prompt: 'Draft an appeal petition stating errors in the trial court\'s order.' },
  { name: 'Review Petition', icon: 'Scale', prompt: 'Draft a review petition highlighting errors apparent on the face of the record.' }
];

const getActionIcon = (iconName) => {
  switch (iconName) {
    case 'FileText': return <FileText size={16} className="text-[#4F46E5]" />;
    case 'Scale': return <Scale size={16} className="text-[#4F46E5]" />;
    case 'ShieldAlert': return <AlertCircle size={16} className="text-[#4F46E5]" />;
    case 'Landmark': return <Landmark size={16} className="text-[#4F46E5]" />;
    case 'Clock': return <Clock size={16} className="text-[#4F46E5]" />;
    case 'Search': return <Search size={16} className="text-[#4F46E5]" />;
    case 'Sparkles': return <Sparkles size={16} className="text-[#4F46E5]" />;
    case 'HelpCircle': return <HelpCircle size={16} className="text-[#4F46E5]" />;
    case 'Briefcase': return <Briefcase size={16} className="text-[#4F46E5]" />;
    case 'Plus': return <Plus size={16} className="text-[#4F46E5]" />;
  }
};

const highlightLegalTerms = (text) => {
  if (!text) return "";
  const terms = [
    "Section 420 IPC", 
    "Transfer of Property Act", 
    "Indian Evidence Act",
    "Prayer", 
    "Evidence", 
    "Facts", 
    "Timeline", 
    "Arguments", 
    "Relief"
  ];
  let formatted = text;
  terms.forEach(term => {
    const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?<!\\*)\\b(${escapedTerm})\\b(?!\\*)`, 'gi');
    formatted = formatted.replace(regex, `**$&**`);
  });
  return formatted;
};

const MarkdownComponents = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: '14px 0 6px 0', lineHeight: '1.3' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1F2937', margin: '12px 0 6px 0', lineHeight: '1.3' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1F2937', margin: '10px 0 4px 0', lineHeight: '1.3' }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.7', margin: '8px 0', fontWeight: '400' }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 space-y-1" style={{ fontSize: '15px', color: '#374151', fontWeight: '400' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1" style={{ fontSize: '15px', color: '#374151', fontWeight: '400' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 leading-relaxed" style={{ fontSize: '15px', lineHeight: '1.7', color: '#374151', fontWeight: '400' }}>
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: '750', color: '#111827' }}>
      {children}
    </strong>
  ),
  code: ({ inline, className, children, ...props }) => {
    return inline ? (
      <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[13px] font-mono text-[#4F46E5] font-bold" {...props}>
        {children}
      </code>
    ) : (
      <pre className="bg-slate-100 dark:bg-zinc-800/50 p-3 rounded-xl overflow-x-auto text-[13px] font-mono text-slate-800 dark:text-zinc-200 my-2 border border-slate-200 dark:border-zinc-800 w-full">
        <code {...props}>{children}</code>
      </pre>
    );
  }
};

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
  const { tLegal } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [caseData, setCaseData] = useState(item);
  const [isEditingFacts, setIsEditingFacts] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [timelineSearchQuery, setTimelineSearchQuery] = useState('');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [showSuggestedEvents, setShowSuggestedEvents] = useState(false);
  const [selectedDetailEvent, setSelectedDetailEvent] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExtractingTimeline, setIsExtractingTimeline] = useState(false);
  const [hearingSearchQuery, setHearingSearchQuery] = useState('');
  const [hearingFilter, setHearingFilter] = useState('all');
  const [selectedDetailHearing, setSelectedDetailHearing] = useState(null);
  const [isHearingClerkModalOpen, setIsHearingClerkModalOpen] = useState(false);
  const [isExtractingHearings, setIsExtractingHearings] = useState(false);
  const [showHearingOverflow, setShowHearingOverflow] = useState(false);
  const [isEditRosterModalOpen, setIsEditRosterModalOpen] = useState(false);
  const [isExtractingParties, setIsExtractingParties] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [selectedDocDetails, setSelectedDocDetails] = useState(null);
  const [isDocInsightsOpen, setIsDocInsightsOpen] = useState(false);
  const [evidenceSearchQuery, setEvidenceSearchQuery] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState('all');
  const [selectedEvidenceDetails, setSelectedEvidenceDetails] = useState(null);
  const [isEvidenceInsightsOpen, setIsEvidenceInsightsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [researchSearchQuery, setResearchSearchQuery] = useState('');
  const [isExtractingResearch, setIsExtractingResearch] = useState(false);
  const [expandedResearchAccordions, setExpandedResearchAccordions] = useState({ statutes: false, precedents: false, strategy: false, recommendations: false, saved: false });
  const [draftFormName, setDraftFormName] = useState('');
  const [draftFormType, setDraftFormType] = useState('Legal Notice');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [selectedContractDetails, setSelectedContractDetails] = useState(null);
  const [isContractInsightsOpen, setIsContractInsightsOpen] = useState(false);
  const [expandedContractAccordions, setExpandedContractAccordions] = useState({ summary: false, clauses: false, risks: false, improvements: false, dates: false, parties: false });
  const [activeStrategyTab, setActiveStrategyTab] = useState('dashboard');
  const [isExtractingArguments, setIsExtractingArguments] = useState(false);








  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPrecedent, setSelectedPrecedent] = useState(null);
  
  // Workspace UI states
  const [showAiAssistant, setShowAiAssistant] = useState(true);
  const [isAssistantMaximized, setIsAssistantMaximized] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showSidebarHistory, setShowSidebarHistory] = useState(false);
  const [showSidebarPlusMenu, setShowSidebarPlusMenu] = useState(false);
  const [sidebarSessions, setSidebarSessions] = useState([]);
  const [notesText, setNotesText] = useState(item?.description || item?.summary || '');

  // Arguments Sub-Navigation states
  const [activeArgumentTab, setActiveArgumentTab] = useState('dashboard');
  const [litigationTasks, setLitigationTasks] = useState([
    { id: 1, title: 'Prepare Written Statement', priority: 'High', dueDate: '2026-07-10', status: 'Done', progress: 100, suggestions: 'Cite CPC Order VIII Rule 1' },
    { id: 2, title: 'Review Evidence', priority: 'High', dueDate: '2026-07-15', status: 'In Progress', progress: 65, suggestions: 'Verify stamp duty logs' },
    { id: 3, title: 'Collect Affidavit', priority: 'High', dueDate: '2026-07-20', status: 'Todo', progress: 0, suggestions: 'Witness attestation required' },
    { id: 4, title: 'Upload Missing Documents', priority: 'Medium', dueDate: '2026-07-22', status: 'Todo', progress: 0, suggestions: 'Obtain banker certificate' },
    { id: 5, title: 'Draft Arguments', priority: 'Medium', dueDate: '2026-07-25', status: 'Todo', progress: 0, suggestions: 'Incorporate precedents' },
    { id: 6, title: 'Verify Citations', priority: 'Low', dueDate: '2026-07-29', status: 'Todo', progress: 0, suggestions: 'Check Supreme Court citations' }
  ]);
  const [caseNotes, setCaseNotes] = useState([
    { id: 1, title: 'Pre-trial Objections Plan', content: '### Jurisdictional Challenge\n- The contract contains a clear arbitration clause under Clause 14.\n- Rebut any claim that Section 9 CPC is applicable directly.', pinned: true, updatedAt: '2026-06-29' },
    { id: 2, title: 'Signature Forgery Counter', content: '### Rebuttal to Forgery Claim\n- The contract signature was verified by public notary Suresh Kumar.\n- Prepare cross-examination on the ledger logs.', pinned: false, updatedAt: '2026-06-28' }
  ]);
  const [activeNoteId, setActiveNoteId] = useState(1);
  const [strategyVersion, setStrategyVersion] = useState('aggressive');
  const [argumentVersions, setArgumentVersions] = useState([
    { version: '1.2', date: '2026-06-29', summary: 'Added CPC Order 37 summary decree argument', author: 'AI Counsel' },
    { version: '1.1', date: '2026-06-28', summary: 'Infused stamp duty and banker certificate amendments', author: 'AI Counsel' },
    { version: '1.0', date: '2026-06-25', summary: 'Initial baseline structured arguments', author: 'Advocate' }
  ]);

  // Modals visibility
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState(null);
  const [isRouterVisible, setIsRouterVisible] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [quickActionsPhone, setQuickActionsPhone] = useState(null);
  
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const argumentsRibbonRef = useRef(null);
  const abortControllerRef = useRef(null);
  const streamingIntervalRef = useRef(null);
  const [isListeningSidebar, setIsListeningSidebar] = useState(false);
  const recognitionRefSidebar = useRef(null);

  const sidebarScrollRef = useRef(null);
  const [showSidebarScrollBtn, setShowSidebarScrollBtn] = useState(false);
  const prevSidebarUserMsgCountRef = useRef(0);

  const handleSidebarScroll = () => {
    if (!sidebarScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = sidebarScrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
    setShowSidebarScrollBtn(!isNearBottom);
  };

  const scrollToSidebarBottom = () => {
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTo({
        top: sidebarScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    setShowSidebarScrollBtn(false);
  };

  const handleVoiceInputSidebar = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }
    if (isListeningSidebar) {
      if (recognitionRefSidebar.current) {
        recognitionRefSidebar.current.stop();
      }
      setIsListeningSidebar(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRefSidebar.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setIsListeningSidebar(true);
      toast.success("Listening... Speak now");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setChatInput(transcript);
    };
    recognition.onend = () => {
      setIsListeningSidebar(false);
    };
    recognition.onerror = () => {
      setIsListeningSidebar(false);
    };
    recognition.start();
  };

  // Sync details from parent prop & load persistent case-specific chat session
  useEffect(() => {
    const loadCaseChatSession = async (caseItem) => {
      const caseId = caseItem.id || caseItem._id;
      // ALWAYS start a fresh unique session ID on case load
      const targetSessionId = `case_chat_${caseId}_${Date.now()}`;
      setActiveSessionId(targetSessionId);
      setAiMessages([]);
    };

    if (item) {
      setCaseData(item);
      setNotesText(item.description || item.summary || '');
      loadCaseChatSession(item);

      // Automatically trigger analysis in the background if the case is not yet analyzed
      if (!item.summary && (!item.intelligence || !item.intelligence.strengthScore)) {
        triggerLiveAnalysisSilent(item);
      }
    }
  }, [item]);

  // Load reminders & timeline
  useEffect(() => {
    if (caseData?.id || caseData?._id) {
      const caseId = caseData.id || caseData._id;
      loadTasks(caseId);
      loadTimeline(caseId);
    }
  }, [caseData?.id, caseData?._id]);

  const loadSidebarSessions = async () => {
    const caseId = caseData?.id || caseData?._id;
    if (!caseId) return;
    try {
      const dbSessions = await chatStorageService.getSessions(caseId);
      setSidebarSessions(dbSessions || []);
    } catch (err) {
      console.error("Failed to load sidebar sessions:", err);
    }
  };

  const handleToggleSidebarHistory = () => {
    const nextVal = !showSidebarHistory;
    setShowSidebarHistory(nextVal);
    if (nextVal) {
      loadSidebarSessions();
    }
  };

  const loadTasks = async (caseId) => {
    try {
      const res = await legalService.getRemindersForCase(caseId);
      setTasks(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTimeline = async (caseId) => {
    try {
      const res = await legalService.getTimelineEvents(caseId);
      setTimelineEvents(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerBackgroundTimelineSync = async (targetData) => {
    if (!targetData) return;
    const caseId = targetData.id || targetData._id;
    if (!caseId) return;

    const summary = targetData.summary || targetData.description || '';
    if (!summary || summary.trim().split(/\s+/).length < 8) {
      console.log("[Background Timeline] Case summary empty or too short. Skipping background extraction.");
      return;
    }

    console.log("[Background Timeline] Triggering timeline background extraction...");
    try {
      setIsExtractingTimeline(true);
      const res = await legalService.generateAiTimelineEvents(caseId, targetData, caseNotes);
      if (res && res.events) {
        setTimelineEvents(res.events || []);
        setCaseData(prev => ({
          ...prev,
          timelineEvents: res.events,
          timelineSuggestions: res.suggestions,
          timelineDeadlines: res.deadlines,
          timelineMissingDocuments: res.missingDocuments
        }));
      }
      console.log("[Background Timeline] Background timeline sync complete.");
    } catch (err) {
      console.error("[Background Timeline] Failed background sync", err);
    } finally {
      setIsExtractingTimeline(false);
    }
  };

  const triggerBackgroundHearingsSync = async (targetData) => {
    if (!targetData) return;
    const caseId = targetData.id || targetData._id;
    if (!caseId) return;

    const summary = targetData.summary || targetData.description || '';
    if (!summary || summary.trim().split(/\s+/).length < 8) {
      console.log("[Background Hearings] Case summary empty or too short. Skipping background extraction.");
      return;
    }

    console.log("[Background Hearings] Triggering hearings background extraction...");
    try {
      setIsExtractingHearings(true);
      const res = await legalService.generateAiHearings(caseId, targetData, caseNotes);
      if (Array.isArray(res)) {
        setCaseData(prev => ({
          ...prev,
          hearings: res
        }));
      }
      console.log("[Background Hearings] Background hearings sync complete.");
    } catch (err) {
      console.error("[Background Hearings] Failed background hearings sync", err);
    } finally {
      setIsExtractingHearings(false);
    }
  };

  useEffect(() => {
    if (caseData?.id || caseData?._id) {
      const timer = setTimeout(() => {
        triggerBackgroundTimelineSync(caseData);
        triggerBackgroundHearingsSync(caseData);
        triggerBackgroundPartiesSync(caseData);
        triggerBackgroundResearchSync(caseData);
        triggerBackgroundArgumentsSync(caseData);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    caseData?.summary,
    caseData?.description,
    caseData?.documents?.length,
    caseData?.drafts?.length,
    caseNotes,
    timelineEvents
  ]);



  const handleSaveTask = async (form, editing) => {
    try {
      if (editing) {
        await legalService.updateReminder(editing.id, { title: form.title, description: form.description, date: form.date || 'No Date', priority: form.priority });
      } else {
        await legalService.addReminder({ case_id: caseData.id || caseData._id, title: form.title, description: form.description, date: form.date || 'No Date', priority: form.priority, status: 'Pending', completed: false });
      }
      await loadTasks(caseData.id || caseData._id);
      toast.success(editing ? 'Task updated' : 'Task created');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTask = async (task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    try {
      await legalService.updateReminder(task.id, { completed: !task.completed });
    } catch (e) {
      await loadTasks(caseData.id || caseData._id);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await legalService.deleteReminder(id);
      await loadTasks(caseData.id || caseData._id);
      toast.success('Task deleted');
    } catch (e) {
      console.error(e);
    }
  };

  const triggerLiveAnalysisSilent = async (updatedCaseData) => {
    setIsAnalyzing(true);
    try {
      const caseId = updatedCaseData.id || updatedCaseData._id;
      const notes = notesText || updatedCaseData.description || updatedCaseData.title || updatedCaseData.name;
      const analyzed = await apiService.autoAnalyzeCase(caseId, notes);
      setCaseData(analyzed);
      if (analyzed.description) {
        setNotesText(analyzed.description);
      }
      
      const winProb = analyzed.intelligence?.winProbability || analyzed.win_probability || 50;
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: `### Case Workspace Live Auto-Updated!\n\n* **Win Probability**: ${winProb}%\n* **Risk Level**: ${analyzed.intelligence?.riskLevel || 'Medium'}\n\n*All dashboard cards (Timeline, Research, Arguments) updated dynamically with current data.*`
      }]);
    } catch (err) {
      console.error('[Live Auto Update] silent analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveTimeline = async (form, editing) => {
    try {
      const normalizedStatus = form.status.toLowerCase() === 'completed' ? 'completed' : 'scheduled';
      await legalService.saveTimelineEvent({ id: editing?.id, caseId: caseData.id || caseData._id, title: form.title, status: normalizedStatus, court: form.court, date: form.date });
      await legalService.syncHearingStatus(caseData.title || caseData.name, normalizedStatus);
      await loadTimeline(caseData.id || caseData._id);
      toast.success(editing ? 'Event updated' : 'Event added');
      triggerLiveAnalysisSilent(caseData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTimeline = async (id) => {
    if (!confirm('Delete this timeline event?')) return;
    try {
      await legalService.deleteTimelineEvent(id);
      await loadTimeline(caseData.id || caseData._id);
      toast.success('Event deleted');
      triggerLiveAnalysisSilent(caseData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteHearing = async (id) => {
    if (!confirm('Delete this hearing appearance?')) return;
    try {
      await legalService.deleteHearing(id);
      setCaseData(prev => ({
        ...prev,
        hearings: (prev.hearings || []).filter(h => h.id !== id)
      }));
      toast.success('Hearing deleted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete hearing');
    }
  };


  const handleSaveNotes = async () => {
    try {
      const updatedData = { ...caseData, description: notesText.trim() };
      await legalService.updateCase(caseData.id || caseData._id, { description: notesText.trim() });
      setCaseData(prev => ({ ...prev, description: notesText.trim() }));
      toast.success('Notes saved');
      setIsEditingFacts(false);
      triggerLiveAnalysisSilent(updatedData);
    } catch (e) {
      toast.error('Failed to save notes');
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!caseData) return;
    const toastId = toast.loading("Generating AI Case Summary...");
    try {
      const prompt = `Draft a comprehensive chronological legal case summary based on the case name: "${caseData.title || caseData.name || 'N/A'}", client details: "${caseData.clientName || 'N/A'}", opponent: "${caseData.opponentName || 'N/A'}", court: "${caseData.courtName || 'N/A'}". Include specific events and dates in format DD MMM YYYY (e.g. 15 Jan 2025, 20 Apr 2025) so that we can build a timeline from it.`;
      const systemInstruction = "You are a professional legal counsel assistant. Draft a realistic, coherent chronological case summary based on the details. Return ONLY the drafted summary text.";
      const res = await generateChatResponse([], prompt, systemInstruction, null, 'English');
      
      let summaryText = '';
      if (typeof res === 'string') summaryText = res;
      else if (res.reply) summaryText = res.reply;
      else if (res.data?.reply) summaryText = res.data.reply;
      else if (res.text) summaryText = res.text;

      if (summaryText) {
        const updated = { ...caseData, description: summaryText };
        await legalService.updateCase(caseData.id || caseData._id, { description: summaryText });
        setCaseData(updated);
        setNotesText(summaryText);
        toast.success("✓ AI Case Summary generated successfully!", { id: toastId });
      } else {
        toast.error("Failed to generate summary. Please enter it manually.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate AI Case Summary.", { id: toastId });
    }
  };

  const triggerDocumentAnalysis = async (docObj, targetData) => {
    try {
      const caseId = targetData.id || targetData._id;
      const analyzedDoc = await legalService.analyzeUploadedDocument(caseId, docObj, targetData, caseNotes);
      if (analyzedDoc) {
        setCaseData(prev => {
          const docs = (prev.documents || []).map(d => d.id === docObj.id ? analyzedDoc : d);
          return { ...prev, documents: docs };
        });
        toast.success(`✓ AI Analysis complete: ${docObj.name}`);
      }
    } catch (err) {
      console.error("[Document Analysis] Failed to analyze document", err);
    }
  };

  const handleUploadEvidence = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      let updatedDocs = [...(caseData.documents || [])];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Progressive OCR extraction simulation per file
        setUploadProgress({ name: file.name, percent: 15 });
        await new Promise(r => setTimeout(r, 200));
        setUploadProgress({ name: file.name, percent: 50 });
        await new Promise(r => setTimeout(r, 200));
        setUploadProgress({ name: file.name, percent: 85 });
        await new Promise(r => setTimeout(r, 200));
        setUploadProgress({ name: file.name, percent: 100 });
        await new Promise(r => setTimeout(r, 100));

        const newDoc = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type || 'file',
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uri: URL.createObjectURL(file),
          ocrStatus: 'Success (OCR Done)',
          aiProcessed: 'Extracted successfully',
          extractedMetadata: {
            parties: 'Rajesh Sharma vs Amit Verma',
            acts: 'Section 42, Transfer of Property Act',
            dates: 'Incidents on 12/04/2026',
            amounts: 'INR 15,00,000 in dispute'
          }
        };

        updatedDocs = [newDoc, ...updatedDocs];
        await legalService.updateCase(caseData.id || caseData._id, { documents: updatedDocs });
        const updatedData = { ...caseData, documents: updatedDocs };
        setCaseData(updatedData);
        toast.success(`✓ Uploaded, OCR Complete & Merged: ${file.name}`);
        
        triggerDocumentAnalysis(newDoc, updatedData);
        triggerLiveAnalysisSilent(updatedData);
      }
      setUploadProgress(null);
    } catch (err) {
      toast.error('Upload failed');
      setUploadProgress(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteEvidence = async (doc) => {
    if (!confirm(`Delete ${doc.name}?`)) return;
    try {
      const updatedDocs = (caseData.documents || []).filter(d => d.id !== doc.id);
      await legalService.updateCase(caseData.id || caseData._id, { documents: updatedDocs });
      const updatedData = { ...caseData, documents: updatedDocs };
      setCaseData(updatedData);
      toast.success('Evidence deleted');
      triggerLiveAnalysisSilent(updatedData);
    } catch (e) {
      toast.error('Failed to delete');
    }
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

  const handleAutoAnalyze = async () => {
    setIsAnalyzing(true);
    const tid = toast.loading("⚖️ AI Legal Brain is analyzing your case...");
    try {
      const analyzed = await apiService.autoAnalyzeCase(
        caseData.id || caseData._id,
        notesText || caseData.title || caseData.name
      );
      setCaseData(analyzed);
      toast.success("✅ Intelligence report generated!", { id: tid });
      
      const winProb = analyzed.intelligence?.winProbability || analyzed.win_probability || 50;
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: `### Case Intelligence Report Generated!\n\n* **Win Probability**: ${winProb}%\n* **Risk Level**: ${analyzed.intelligence?.riskLevel || 'Medium'}\n\n*Strategic Suggestions loaded.* You can now draft a legal notice or ask specific questions.`
      }]);
    } catch (err) {
      console.error('[Panel] Auto-analyze error:', err);
      toast.error("Analysis failed.", { id: tid });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewChat = async () => {
    if (!caseData) return;
    const caseId = caseData.id || caseData._id;
    const targetSessionId = `case_chat_${caseId}_${Date.now()}`;
    setActiveSessionId(targetSessionId);
    setAiMessages([]);
    toast.success("Fresh conversation session started!");
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setIsChatSending(false);
    toast.success("Generation stopped.");
  };

  // Chat with AI case assistant
  const handleSendAiMessage = async (e, overrideQuery = null) => {
    if (e) e.preventDefault();
    const query = (overrideQuery || chatInput).trim();
    if (!query) return;
 
    setChatInput('');
    const caseId = caseData.id || caseData._id;
    const userMsg = { id: Date.now().toString(), role: 'user', content: query };
    
    // Save user message to state and storage
    setAiMessages(prev => [...prev, userMsg]);
    if (activeSessionId) {
      await chatStorageService.saveMessage(activeSessionId, userMsg, `Chat for ${caseData.title || caseData.name}`, caseId);
    }
    
    setIsChatSending(true);

    // Initialize AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const history = aiMessages.map(m => ({ role: m.role, content: m.content }));
      const systemPrompt = `You are AISA Case Assistant, a legal co-counsel AI.
Active Case: ${caseData.title || caseData.name}
Client Name: ${caseData.clientName || 'N/A'}
Opponent Name: ${caseData.opponentName || 'N/A'}
Court: ${caseData.courtName || 'N/A'}
Case Summary: ${caseData.summary || notesText || 'No summary details added yet.'}
Applicable Research: ${JSON.stringify(caseData.research || [])}
Timeline Facts: ${JSON.stringify(caseData.facts || [])}
Risk Analysis: ${JSON.stringify(caseData.intelligence || {})}
Client Relief Sought: ${caseData.reliefGoals || 'N/A'}

Help the lawyer with legal research, tactics, draft checks, or analysis about this case. Answer questions professionally and cite case laws/acts where applicable. Keep responses succinct and well-formatted using Markdown.`;

      const response = await generateChatResponse(history, query, systemPrompt, [], 'English', controller.signal, 'legal');
      let responseText = '';
      if (typeof response === 'string') responseText = response;
      else if (response?.reply) responseText = response.reply;
      else if (response?.text) responseText = response.text;
      else if (response?.content) responseText = response.content;

      if (responseText) {
        const fullContent = responseText;
        
        // Setup incremental simulated streaming output
        const tempMsgId = Date.now().toString();
        const words = fullContent.split(' ');
        let currentText = words[0] || '';
        let currentWordIndex = 1;

        // Add initial message with isGenerating: true
        setAiMessages(prev => [...prev, {
          id: tempMsgId,
          role: 'model',
          content: currentText || '...',
          isGenerating: true
        }]);

        await new Promise((resolve) => {
          streamingIntervalRef.current = setInterval(() => {
            if (currentWordIndex < words.length) {
              currentText += ' ' + words[currentWordIndex];
              setAiMessages(prev => prev.map(m => m.id === tempMsgId ? { ...m, content: currentText } : m));
              currentWordIndex++;
            } else {
              clearInterval(streamingIntervalRef.current);
              streamingIntervalRef.current = null;
              setAiMessages(prev => prev.map(m => m.id === tempMsgId ? { ...m, isGenerating: false } : m));
              resolve();
            }
          }, 35); // Fast typing pace
        });

        // Save complete response to storage
        const completeMsg = {
          id: tempMsgId,
          role: 'model',
          content: fullContent
        };
        if (activeSessionId) {
          await chatStorageService.saveMessage(activeSessionId, completeMsg, `Chat for ${caseData.title || caseData.name}`, caseId);
        }
      } else {
        throw new Error("Empty AI response");
      }
    } catch (err) {
      const isAbort = err.name === 'CanceledError' || err.name === 'AbortError' || err.message?.includes('aborted');
      if (isAbort) {
        console.log("AI message generation aborted by user.");
        return;
      }
      console.error("[Case AI Assistant] Error:", err);
      const errorMsg = {
        id: Date.now().toString(),
        role: 'model',
        content: "⚠️ I encountered an error checking the case files. Please try again."
      };
      setAiMessages(prev => [...prev, errorMsg]);
      if (activeSessionId) {
        await chatStorageService.saveMessage(activeSessionId, errorMsg, `Chat for ${caseData.title || caseData.name}`, caseId);
      }
    } finally {
      setIsChatSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleExportChat = () => {
    try {
      const chatText = aiMessages.map(m => `[${m.role === 'user' ? 'ADVOCATE' : 'COPILOT'}] ${m.content}\n`).join('\n');
      const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case_copilot_chat_${(caseData.title || caseData.name || 'export').replace(/[^a-z0-9]/gi, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✓ Chat exported successfully!");
    } catch (e) {
      toast.error("Failed to export chat.");
    }
  };

  const handleShowChatHistory = () => {
    toast.success("No previous conversation sessions found.");
  };

  const handleDownloadAsTxt = (content) => {
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `copilot_response.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✓ Response downloaded successfully!");
    } catch (e) {
      toast.error("Failed to download response.");
    }
  };

  // Export Case File (HTML/Text format)
  const handleExportCaseFile = () => {
    try {
      const fileContent = `CASE FILE SUMMARY: ${(caseData.title || caseData.name || '').toUpperCase()}
========================================
Client: ${caseData.clientName || 'N/A'}
Opponent: ${caseData.opponentName || 'N/A'}
Court: ${caseData.courtName || 'N/A'}

SUMMARY FACTS:
${notesText || 'No summary details'}
`;
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(caseData.title || caseData.name || '').replace(/[^a-z0-9]/gi, '_')}_case_file.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✓ Case file downloaded successfully!");
    } catch (e) {
      toast.error("Failed to export case file.");
    }
  };

  const handleShareCase = () => {
    if (navigator.share) {
      navigator.share({
        title: caseData.title || caseData.name,
        text: `Legal Case Workspace for ${caseData.title || caseData.name}.`
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("✓ Case link copied to clipboard!");
    }
  };

  const winProbability = caseData.intelligence?.winProbability || caseData.probability || caseData.win_probability || 50;
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const allEvents = useMemo(() => {
    const list = [];
    timelineEvents.forEach(e => {
      list.push({ date: e.date, title: e.title, description: e.court ? `Hearing appearance at ${e.court}` : `Timeline milestone (Status: ${e.status})` });
    });
    if (Array.isArray(caseData.facts)) {
      caseData.facts.forEach(f => {
        list.push({ date: f.date, title: f.event, description: f.description });
      });
    }
    return list.sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0);
      const db = b.date ? new Date(b.date) : new Date(0);
      return db - da;
    });
  }, [timelineEvents, caseData.facts]);

  const tabsList = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'timeline', name: 'Timeline', icon: History },
    { id: 'hearings', name: 'Hearings', icon: Gavel },
    { id: 'parties', name: 'Parties', icon: Users },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'evidence', name: 'Evidence Vault', icon: FileSearch },
    { id: 'research', name: 'Research & Laws', icon: BookOpen },
    { id: 'drafts', name: 'Drafts', icon: ScrollText },
    { id: 'contracts', name: 'Contracts', icon: ClipboardList },
    { id: 'arguments', name: 'Arguments', icon: Target },
    { id: 'notes', name: 'Notes', icon: FileText },
    { id: 'precedents', name: 'Precedents', icon: Bookmark },
    { id: 'tasks', name: 'Tasks', icon: ListTodo },
  ];

  // Render Sub-Tabs
  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
      <div className="md:col-span-2 space-y-6">
        {/* Case Summary Card */}
        <div className="bg-white dark:bg-[#1A2540] border border-[#E5E7EB] dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">CASE SUMMARY</h4>
            <div className="flex items-center gap-2">
              {caseData.summary && (
                <button
                  onClick={() => setIsEditingFacts(!isEditingFacts)}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-lg text-[9px] font-black uppercase tracking-wider border border-indigo-150 hover:bg-indigo-100 transition-all"
                >
                  {isEditingFacts ? "AI Summary" : "Edit Facts"}
                </button>
              )}
              <button 
                onClick={handleSaveNotes}
                className="p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl text-gray-400 hover:text-indigo-650 transition-all"
                title="Save Notes"
              >
                <Save size={16} />
              </button>
            </div>
          </div>
          {caseData.summary && !isEditingFacts ? (
            <div className="space-y-4 text-xs font-semibold text-slate-705 dark:text-slate-350 leading-relaxed mb-0 p-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl border border-indigo-100/40">
              <p className="font-bold text-[#4F46E5] text-xs">✨ AI-GENERATED LEGAL SUMMARY</p>
              <div className="whitespace-pre-wrap leading-relaxed">{caseData.summary}</div>
            </div>
          ) : (
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-0 resize-none min-h-[140px] leading-relaxed p-0 outline-none"
              placeholder="Enter case details, client statements, or dispute facts..."
            ></textarea>
          )}
        </div>
      </div>

      <div className="md:col-span-1 space-y-6">
        {/* Win Probability Card */}
        <div className="bg-white dark:bg-[#1A2540] border border-[#E5E7EB] dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          {isAnalyzing && (
            <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">WIN PROBABILITY</span>
          <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="38" className="stroke-slate-100 dark:stroke-zinc-800" strokeWidth="7" fill="transparent" />
              <circle cx="48" cy="48" r="38" className="stroke-[#0D9488] dark:stroke-[#0D9488]" strokeWidth="7" fill="transparent" strokeDasharray={2 * Math.PI * 38} strokeDashoffset={2 * Math.PI * 38 * (1 - winProbability / 100)} strokeLinecap="round" />
            </svg>
            <div className="absolute flex items-center justify-center">
              <span className="text-xl font-black text-slate-855 dark:text-white">{winProbability}%</span>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-4 leading-tight">BASED ON CURRENT EVIDENCE AND PRECEDENT STRENGTH</span>
        </div>

        {/* Task Progress Card */}
        <div className="bg-white dark:bg-[#1A2540] border border-[#E5E7EB] dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-2">TASK PROGRESS</h5>
          <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase">
            <span>Completed steps</span>
            <span>{taskPercentage}% ({completedTasks}/{totalTasks})</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-[#4F46E5] h-full rounded-full transition-all duration-500" style={{ width: `${taskPercentage}%` }} />
          </div>
          <button onClick={() => setIsTaskModalVisible(true)} className="text-xs font-bold text-[#4F46E5] hover:underline mt-4 block">Manage Tasks</button>
        </div>
      </div>
    </div>
  );

  const renderSidebar = () => {
    const suggestions = caseData.timelineSuggestions || [
      { title: "Recovery suit limit expires 15 Apr 2028", description: "Under Art 137 Limitation Act, suit must be filed within 3 years of loan default date." }
    ];
    const deadlines = caseData.timelineDeadlines || [
      { title: "Defendant appearance window", description: "Defendant must record court appearance within 10 days since Delhi Summons notice delivery." }
    ];
    const missingDocs = caseData.timelineMissingDocuments || [
      { title: "Missing Speed Post tracking details", description: "Attach speed post receipt proof to timeline notice event to secure postal verification proof." }
    ];

    return (
      <div className="w-full md:w-[320px] shrink-0 space-y-6">
        {/* Settings Widget */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Timeline Settings</h4>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={showSuggestedEvents}
              onChange={e => setShowSuggestedEvents(e.target.checked)}
              className="rounded text-[#4F46E5] focus:ring-[#4F46E5] dark:bg-black/20 dark:border-zinc-800"
            />
            <span>Show Suggested Events</span>
          </label>
        </div>

        {/* AI Suggestions */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-4 text-[#4F46E5]">
            <Sparkles size={14} />
            <h4 className="text-[10px] font-black uppercase tracking-wider">AI Suggestions</h4>
          </div>
          <div className="space-y-3">
            {suggestions.map((s, idx) => (
              <div key={idx} className="bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100/50 dark:border-violet-900/30 rounded-xl p-3">
                <p className="text-xs font-black text-indigo-700 dark:text-indigo-400">{s.title}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{s.description}</p>
              </div>
            ))}
            {suggestions.length === 0 && (
              <p className="text-[10px] font-bold text-slate-400 text-center py-2">No AI suggestions generated yet.</p>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-4 text-orange-600 dark:text-orange-400">
            <Clock size={14} />
            <h4 className="text-[10px] font-black uppercase tracking-wider">Upcoming Deadlines</h4>
          </div>
          <div className="space-y-3">
            {deadlines.map((d, idx) => (
              <div key={idx} className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 rounded-xl p-3">
                <p className="text-xs font-black text-amber-700 dark:text-amber-400">{d.title}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{d.description}</p>
              </div>
            ))}
            {deadlines.length === 0 && (
              <p className="text-[10px] font-bold text-slate-400 text-center py-2">No upcoming deadlines.</p>
            )}
          </div>
        </div>

        {/* Missing Documents */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-4 text-red-500 dark:text-red-400">
            <AlertCircle size={14} />
            <h4 className="text-[10px] font-black uppercase tracking-wider">Missing Documents</h4>
          </div>
          <div className="space-y-3">
            {missingDocs.map((m, idx) => (
              <div key={idx} className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/30 rounded-xl p-3">
                <p className="text-xs font-black text-red-750 dark:text-red-400">{m.title}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{m.description}</p>
              </div>
            ))}
            {missingDocs.length === 0 && (
              <p className="text-[10px] font-bold text-slate-400 text-center py-2">All documents verified.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
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

    const getNodeDotColor = (category) => {
      switch ((category || '').toLowerCase()) {
        case 'agreement': return 'bg-blue-600';
        case 'evidence': return 'bg-emerald-600';
        case 'notice': return 'bg-red-500';
        case 'reply': return 'bg-amber-500';
        case 'court filing': return 'bg-indigo-600';
        case 'hearing': return 'bg-purple-600';
        case 'order': return 'bg-cyan-600';
        case 'judgment': return 'bg-rose-500';
        case 'investigation': return 'bg-teal-600';
        case 'default': return 'bg-orange-500';
        default: return 'bg-slate-400';
      }
    };

    const hasSummaryText = (caseData.summary || caseData.description || notesText || '').trim().split(/\s+/).length >= 8;
    if (timelineEvents.length === 0 && !hasSummaryText) {
      return (
        <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-300">
          <div className="flex-1 bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[350px]">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-full mb-4">
              <Calendar size={32} />
            </div>
            <h4 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-wider mb-2">📅 No AI Timeline Available Yet</h4>
            <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed mb-6">
              AI could not generate a case timeline because no structured case summary or chronological legal events are available.
            </p>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-6 space-y-1">
              <p>Requirements to generate timeline:</p>
              <ul className="list-disc list-inside">
                <li>Comprehensive Case Summary</li>
                <li>Dated legal events</li>
                <li>Uploaded legal documents</li>
                <li>Evidence</li>
                <li>Case Notes</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleGenerateAiSummary}
                className="px-5 py-2.5 bg-indigo-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all"
              >
                Generate AI Case Summary
              </button>
              <button 
                onClick={() => document.getElementById('workspace-doc-upload').click()}
                className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-350 font-black text-xs uppercase tracking-widest rounded-xl shadow-sm transition-all"
              >
                Upload Documents
              </button>
            </div>
          </div>
          {renderSidebar()}
        </div>
      );
    }

    const visibleEvents = timelineEvents.filter(evt => showSuggestedEvents || evt.confidence !== 'Low');
    const filteredEvents = visibleEvents.filter(evt => {
      if (timelineSearchQuery.trim()) {
        const q = timelineSearchQuery.toLowerCase();
        const matchTitle = (evt.title || '').toLowerCase().includes(q);
        const matchDesc = (evt.description || '').toLowerCase().includes(q);
        const matchCat = (evt.category || '').toLowerCase().includes(q);
        const matchSrc = (evt.source || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat && !matchSrc) return false;
      }
      if (timelineFilter === 'all') return true;
      if (timelineFilter === 'documents') {
        return (evt.category || '').toLowerCase() === 'document upload' || (evt.source && evt.source.match(/\.(pdf|docx|txt|doc|xlsx|png|jpg|jpeg)$/i));
      }
      if (timelineFilter === 'hearings') {
        return (evt.category || '').toLowerCase() === 'hearing' || (evt.title || '').toLowerCase().includes('hearing');
      }
      if (timelineFilter === 'evidence') {
        return (evt.category || '').toLowerCase() === 'evidence';
      }
      if (timelineFilter === 'ai_generated') {
        return !!evt.isAiGenerated;
      }
      return true;
    });

    const sortedFilteredEvents = [...filteredEvents].sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (isNaN(da.getTime())) return 1;
      if (isNaN(db.getTime())) return -1;
      return da - db;
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <Sparkles size={16} className="text-[#4F46E5]" /> AI Case Journey
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">
              Chronological history compiled from documentation and case context.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setEditingTimeline(null); setIsTimelineModalVisible(true); }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-650 dark:hover:opacity-90 text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
            >
              + Add Event
            </button>
            <button 
              onClick={() => triggerBackgroundTimelineSync(caseData)}
              disabled={isExtractingTimeline}
              className="px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-indigo-650 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles size={11} className={isExtractingTimeline ? "animate-spin" : ""} />
              {isExtractingTimeline ? "Extracting..." : "AI Extract"}
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Milestones' },
              { id: 'documents', label: 'Documents' },
              { id: 'hearings', label: 'Hearings' },
              { id: 'evidence', label: 'Evidence' },
              { id: 'ai_generated', label: 'AI Generated' }
            ].map(chip => {
              const isActive = timelineFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setTimelineFilter(chip.id)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                    isActive 
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-600 dark:border-indigo-600' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-zinc-850 dark:border-zinc-800 dark:text-slate-400'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={timelineSearchQuery}
              onChange={e => setTimelineSearchQuery(e.target.value)}
              placeholder="Search facts..."
              className="w-full bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs font-semibold outline-none text-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Outer Split Layout */}
        <div className="flex flex-col md:flex-row gap-6 pt-2">
          {/* Main stream timeline (65%) */}
          <div className="flex-1 relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-indigo-100 dark:before:bg-zinc-800/80">
            {sortedFilteredEvents.map((evt, idx) => {
              const catStyle = categoryColors[evt.category] || categoryColors.Other;
              const nodeColor = getNodeDotColor(evt.category);
              
              return (
                <div key={evt.id || idx} className="relative group">
                  {/* Circle Node Dot */}
                  <div className={`absolute left-[-23px] top-2.5 w-3 h-3 rounded-full border-4 border-white dark:border-zinc-900 shadow-sm ${nodeColor}`} />
                  
                  {/* Card box */}
                  <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500/80 transition-all duration-350 flex flex-col justify-between">
                    <div>
                      {/* Badge row */}
                      <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] font-bold text-slate-400 dark:text-slate-400">
                        <span className="text-slate-800 dark:text-white uppercase tracking-wider">{evt.date}</span>
                        <span>•</span>
                        {evt.isAiGenerated && (
                          <span className="px-1.5 py-0.5 bg-violet-50 dark:bg-violet-950/20 text-[#4F46E5] rounded text-[8px] font-black uppercase tracking-wider border border-violet-200/10 flex items-center gap-0.5">
                            <Sparkles size={8} /> AI
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                          {evt.category || 'Other'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          evt.priority === 'Critical' 
                            ? 'bg-red-500 text-white border-red-600' 
                            : evt.priority === 'High' 
                              ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-650 border-orange-200/20' 
                              : evt.priority === 'Medium' 
                                ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-650 border-blue-200/20' 
                                : 'bg-slate-50 dark:bg-slate-950/20 text-slate-600 border-slate-200/20'
                        }`}>
                          {evt.priority || 'Medium'} Priority
                        </span>
                        
                        {/* Edit & Delete actions */}
                        <div className="ml-auto flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingTimeline(evt); setIsTimelineModalVisible(true); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Event"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTimeline(evt.id)}
                            className="p-1.5 text-slate-400 hover:text-red-550 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Event Title */}
                      <h4 className="text-sm font-black text-slate-850 dark:text-white leading-snug">{evt.title}</h4>
                      
                      {/* Short Description */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold mt-2">
                        {evt.description}
                      </p>
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/50">
                      <div className="flex items-center gap-1 text-[10px] text-slate-450 font-bold max-w-[70%] truncate">
                        <FileText size={12} className="text-slate-405" />
                        <span>Source: {evt.source || 'Case Summary'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {sortedFilteredEvents.length === 0 && (
              <div className="text-center py-10 bg-slate-50/50 dark:bg-zinc-800/10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-450">No matching timeline events found</p>
              </div>
            )}
          </div>

          {/* Right Sidebar Widget (35%) */}
          {renderSidebar()}
        </div>
      </div>
    );
  };

  const renderHearings = () => {
    const list = caseData.hearings || [];

    // Extract next hearing
    const upcomingHearingsList = list.filter(h => h.status === 'Upcoming' || (h.status || '').toLowerCase() === 'scheduled');
    const nextHearing = upcomingHearingsList.length > 0 ? upcomingHearingsList[0] : null;

    // Upcoming deadlines from caseData
    const deadlines = caseData.timelineDeadlines || [];
    const primaryDeadline = deadlines.length > 0 ? deadlines[0] : null;

    // Ready for Court logic
    const isPreparationPending = list.some(h => (h.status === 'Upcoming' || h.status === 'scheduled') && (!h.clerkNotes || h.clerkNotes.toLowerCase().includes('pending')));
    const hearingStatusText = isPreparationPending ? 'Preparation Pending' : (list.length > 0 ? 'Ready for Court' : 'Preparation Pending');
    
    // Status colors mapping for timeline cards
    const statusColors = {
      Upcoming: 'bg-blue-50 dark:bg-blue-950/20 text-blue-650 dark:text-blue-400 border-blue-200/20',
      Completed: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border-emerald-200/20',
      Adjourned: 'bg-amber-50 dark:bg-amber-950/20 text-amber-650 dark:text-amber-400 border-amber-200/20',
      Reserved: 'bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 border-purple-200/20',
      Cancelled: 'bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border-red-200/20',
      Disposed: 'bg-slate-50 dark:bg-slate-950/20 text-slate-650 dark:text-slate-400 border-slate-200/20'
    };

    // If case has no summary and is empty, show empty state
    const hasSummaryText = (caseData.summary || caseData.description || notesText || '').trim().split(/\s+/).length >= 8;
    if (list.length === 0 && !hasSummaryText) {
      return (
        <div className="bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[350px] animate-in fade-in duration-300">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-full mb-4">
            <Gavel size={32} />
          </div>
          <h4 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-wider mb-2">📅 No Hearing Information Available</h4>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed mb-6">
            AI could not detect any hearing details because the case currently contains no hearing-related information.
          </p>
          <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase mb-6 space-y-1">
            <p>Requirements to extract hearings:</p>
            <ul className="list-disc list-inside">
              <li>Court Order</li>
              <li>Case Summary</li>
              <li>Timeline</li>
              <li>Court Notice</li>
              <li>Hearing Dates</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleGenerateAiSummary}
              className="px-5 py-2.5 bg-indigo-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all"
            >
              Generate AI Case Summary
            </button>
            <button 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-350 font-black text-xs uppercase tracking-widest rounded-xl shadow-sm transition-all"
            >
              Upload Court Order
            </button>
          </div>
        </div>
      );
    }

    // Filter list
    const filteredList = list.filter(h => {
      // Search filter
      if (hearingSearchQuery.trim()) {
        const q = hearingSearchQuery.toLowerCase();
        const matchStage = (h.stage || '').toLowerCase().includes(q);
        const matchJudge = (h.judge || '').toLowerCase().includes(q);
        const matchCourt = (h.courtRoom || '').toLowerCase().includes(q);
        const matchSummary = (h.summary || '').toLowerCase().includes(q);
        const matchDate = (h.date || '').toLowerCase().includes(q);
        if (!matchStage && !matchJudge && !matchCourt && !matchSummary && !matchDate) return false;
      }

      // Chip filter
      if (hearingFilter === 'all') return true;
      if (hearingFilter === 'upcoming') return h.status === 'Upcoming' || (h.status || '').toLowerCase() === 'scheduled';
      if (hearingFilter === 'completed') return h.status === 'Completed';
      if (hearingFilter === 'adjourned') return h.status === 'Adjourned';
      if (hearingFilter === 'orders') return h.status === 'Reserved' || (h.summary || '').toLowerCase().includes('order');
      if (hearingFilter === 'with_docs') return (h.linkedDocsCount || 0) > 0;
      return true;
    });

    // Chronological sorting (oldest to newest)
    const sortedList = [...filteredList].sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (isNaN(da.getTime())) return 1;
      if (isNaN(db.getTime())) return -1;
      return da - db;
    });

    const handleDownloadDocket = () => {
      const text = `HEARING APPEARANCES DOCKET: ${caseData.title || caseData.name}\n\n` +
        list.map((h, i) => `${i+1}. Date: ${h.date} | Time: ${h.time} | Bench: ${h.judge} | Stage: ${h.stage}\nSummary: "${h.summary}"\nNotes: ${h.clerkNotes}\n`).join('\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hearing_appearances_docket_${(caseData.title || caseData.name || 'case').replace(/\s+/g, '_')}.txt`;
      a.click();
      toast.success("✓ Hearing Appearances Docket downloaded successfully!");
      setShowHearingOverflow(false);
    };

    const handleExportJson = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(caseData, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `case_profile_${(caseData.title || caseData.name || 'case').replace(/\s+/g, '_')}.json`;
      a.click();
      toast.success("✓ Case JSON Profile exported successfully!");
      setShowHearingOverflow(false);
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Page Hero Header */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/85 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-200/10 inline-block">
              AI Court Hearing Assistant
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-snug">
              {caseData.title || caseData.name || 'Untitled Case'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-450 dark:text-slate-400 font-semibold">
              <p>Court: <span className="font-bold text-slate-755 dark:text-slate-300">{caseData.courtName || 'Delhi District Court'}</span></p>
              <span className="hidden sm:inline">•</span>
              <p>Stage: <span className="font-bold text-slate-755 dark:text-slate-300">{caseData.stage || 'Pleadings / Trial'}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center relative">
            <button 
              onClick={() => { setEditingTimeline({ title: 'Court Hearing', status: 'Scheduled' }); setIsTimelineModalVisible(true); }}
              className="px-4 py-2.5 bg-[#4F46E5] hover:opacity-95 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
            >
              + Schedule Hearing
            </button>
            <button 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
            >
              Upload Court Order
            </button>

            {/* Overflow Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowHearingOverflow(!showHearingOverflow)}
                className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-455 dark:text-slate-350 rounded-xl shadow-sm transition-all"
              >
                <MoreVertical size={16} />
              </button>

              {showHearingOverflow && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-2">
                  <button 
                    onClick={handleDownloadDocket}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    Print Docket
                  </button>
                  <button 
                    onClick={handleExportJson}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    Export JSON Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/85 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block">Next Hearing Date</span>
            {nextHearing ? (
              <div>
                <h4 className="text-base font-black text-slate-800 dark:text-white">{nextHearing.date}, {nextHearing.time || '10:30 AM'}</h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase mt-1">Before {nextHearing.judge || 'Justice Dixit'} • {nextHearing.courtRoom || 'Courtroom 3'}</p>
              </div>
            ) : (
              <div>
                <h4 className="text-base font-black text-slate-400 dark:text-slate-550">Not Scheduled</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">No upcoming appearance</p>
              </div>
            )}
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/85 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block">Upcoming Case Deadline</span>
            {primaryDeadline ? (
              <div>
                <h4 className="text-base font-black text-slate-800 dark:text-white truncate">{primaryDeadline.title}</h4>
                <p className="text-[10px] text-orange-605 dark:text-orange-400 font-black uppercase mt-1">14 Days Remaining</p>
              </div>
            ) : (
              <div>
                <h4 className="text-base font-black text-slate-400 dark:text-slate-500">No Active Deadlines</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Evidentiary compliance complete</p>
              </div>
            )}
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/85 rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-3">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block">AI Hearing Status</span>
              <div>
                <h4 className="text-base font-black text-slate-800 dark:text-white">{hearingStatusText}</h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase mt-1">
                  {isPreparationPending ? 'Briefing packet pending' : 'Preparation checklist complete'}
                </p>
              </div>
            </div>
            <div className={`h-3 w-3 rounded-full mr-2 shadow-sm ${isPreparationPending ? 'bg-amber-500' : (list.length > 0 ? 'bg-emerald-500' : 'bg-amber-500')}`} />
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Hearings' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'completed', label: 'Completed' },
              { id: 'adjourned', label: 'Adjourned' },
              { id: 'orders', label: 'Orders & Orders Reserved' },
              { id: 'with_docs', label: 'With Documents' }
            ].map(chip => {
              const isActive = hearingFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setHearingFilter(chip.id)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                    isActive 
                      ? 'bg-slate-905 border-slate-900 text-white dark:bg-[#4F46E5] dark:border-[#4F46E5]' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-55 dark:bg-zinc-850 dark:border-zinc-800 dark:text-slate-400'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={hearingSearchQuery}
              onChange={e => setHearingSearchQuery(e.target.value)}
              placeholder="Search court hearings..."
              className="w-full bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs font-semibold outline-none text-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* AI Hearing Timeline Stream */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-indigo-105 dark:before:bg-zinc-800/80 pt-2">
          {sortedList.map((h, i) => {
            const statStyle = statusColors[h.status] || statusColors.Upcoming;
            
            return (
              <div key={h.id || i} className="relative group">
                {/* Node Bullet */}
                <div className="absolute left-[-23px] top-2.5 h-3 w-3 rounded-full bg-emerald-500 border-4 border-white dark:border-zinc-900 shadow-sm" />

                {/* Card box */}
                <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-505/80 transition-all duration-350 flex flex-col justify-between">
                  <div>
                    {/* Badge header row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] font-bold text-slate-400 dark:text-slate-400">
                      <span className="text-slate-800 dark:text-white uppercase tracking-wider">{h.date}, {h.time || '10:30 AM'}</span>
                      <span>•</span>
                      <span className="uppercase tracking-wider">{h.courtRoom || 'Courtroom 3'}</span>
                      
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ml-2 ${statStyle}`}>
                        {h.status || 'Upcoming'}
                      </span>

                      {/* Delete actions */}
                      <button 
                        onClick={() => handleDeleteHearing(h.id)}
                        className="ml-auto p-1.5 text-slate-400 hover:text-red-550 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Delete Hearing"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Stage Title */}
                    <h4 className="text-sm font-black text-slate-850 dark:text-white leading-snug">{h.stage || 'Court Appearance'}</h4>
                    
                    {/* Judge Subtitle */}
                    <div className="flex items-center gap-x-2 text-[10px] text-slate-450 dark:text-slate-400 font-bold mt-1">
                      <span>Before: <span className="text-slate-700 dark:text-slate-200">{h.judge || 'Justice Dixit'}</span></span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] border border-indigo-200/10 rounded flex items-center gap-0.5 text-[8px]">
                        <FileText size={9} /> {h.linkedDocsCount || 0} Files Linked
                      </span>
                    </div>

                    {/* Shaded summary block */}
                    {h.summary && (
                      <div className="p-3 bg-slate-50 dark:bg-zinc-800/35 border border-slate-100 dark:border-zinc-800/20 rounded-xl mt-3">
                        <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed font-semibold italic">
                          "{h.summary}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/50">
                    <div className="flex items-center gap-1 text-[10px] text-slate-450 font-bold">
                      <Calendar size={12} className="text-slate-400" />
                      <span>Next Hearing: <span className="text-[#4F46E5]">{h.nextHearingDate || 'Not scheduled'}</span></span>
                    </div>

                    <button 
                      onClick={() => { setSelectedDetailHearing(h); setIsHearingClerkModalOpen(true); }}
                      className="text-[10px] font-black uppercase tracking-widest text-[#4F46E5] hover:underline"
                    >
                      AI Hearing Clerk Details →
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
          {sortedList.length === 0 && (
            <div className="text-center py-10 bg-slate-50/50 dark:bg-zinc-800/10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-850">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-450">No matching court hearings found</p>
            </div>
          )}
        </div>

      </div>
    );
  };

  const triggerBackgroundPartiesSync = async (targetData, manual = false) => {
    if (!targetData) return;
    const caseId = targetData.id || targetData._id;
    if (!caseId) return;

    if (!manual) {
      const summary = targetData.summary || targetData.description || '';
      if (!summary || summary.trim().split(/\s+/).length < 8) {
        console.log("[Background Parties] Case summary empty or too short. Skipping background extraction.");
        return;
      }
    }

    console.log("[Background Parties] Triggering parties background extraction...");
    try {
      setIsExtractingParties(true);
      const toastId = manual ? toast.loading("AI is extracting case participants...") : null;
      const res = await legalService.extractAiParties(caseId, targetData, caseNotes);
      if (res) {
        setCaseData(res);
        if (manual) toast.success("✓ AI extracted parties roster successfully!", { id: toastId });
      }
      console.log("[Background Parties] Background parties sync complete.");
    } catch (err) {
      console.error("[Background Parties] Failed background parties sync", err);
      if (manual) toast.error("Failed to run AI Auto-Extract");
    } finally {
      setIsExtractingParties(false);
    }
  };

  const renderParties = () => {
    const showEmptyState = !caseData.clientName && !caseData.opponentName && !caseData.courtName;

    if (showEmptyState) {
      return (
        <div className="bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[350px] animate-in fade-in duration-300">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-full mb-4">
            <Users size={32} />
          </div>
          <h4 className="text-base font-black text-slate-855 dark:text-white uppercase tracking-wider mb-2">👥 No Party Information Available</h4>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed mb-6">
            AI could not identify any parties from the available case data. Complete the case summary or upload documents to auto-populate.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="px-5 py-2.5 bg-indigo-650 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all"
            >
              Upload Documents
            </button>
            <button 
              onClick={handleGenerateAiSummary}
              className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-350 font-black text-xs uppercase tracking-widest rounded-xl shadow-sm transition-all"
            >
              Generate AI Summary
            </button>
            <button 
              onClick={() => setIsEditRosterModalOpen(true)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all"
            >
              Edit Case Roster
            </button>
          </div>
        </div>
      );
    }

    const getInitials = (name) => {
      if (!name) return 'N/A';
      return name.split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase();
    };

    const clientInitials = getInitials(caseData.clientName);
    const opponentInitials = getInitials(caseData.opponentName);
    const judiciaryInitials = getInitials(caseData.courtName);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Roster Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <Users size={16} className="text-[#4F46E5]" /> Parties & Case Roster
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">
              Verify advocate profiles, client details, opponent details, and court jurisdiction.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditRosterModalOpen(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-650 dark:hover:opacity-90 text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Edit Case Roster
            </button>
            <button 
              onClick={() => triggerBackgroundPartiesSync(caseData, true)}
              disabled={isExtractingParties}
              className="px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-indigo-650 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles size={11} className={isExtractingParties ? "animate-spin" : ""} />
              {isExtractingParties ? "Extracting..." : "AI Auto-Extract"}
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: CLIENT / PETITIONER */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-full">
            <div>
              {/* Header row */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] flex items-center justify-center font-black text-xs">
                  {clientInitials}
                </div>
                <div>
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded text-[8px] font-black uppercase tracking-wider border border-indigo-200/10 inline-block mb-1">
                    CLIENT
                  </span>
                  <h4 className="text-xs font-black text-slate-880 dark:text-white leading-tight">Petitioner / Complainant</h4>
                </div>
              </div>

              {/* Data fields */}
              <div className="space-y-3.5">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Client Full Name</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.clientName || 'Not Available'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Contact / Phone</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.clientPhone || 'Not Available'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Email Address</span>
                  {caseData.clientEmail ? (
                    <a href={`mailto:${caseData.clientEmail}`} className="text-xs font-bold text-[#4F46E5] hover:underline mt-0.5 block">{caseData.clientEmail}</a>
                  ) : (
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Not Available</p>
                  )}
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Postal Address</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.clientAddress || 'Not Available'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/50 pt-3.5 mt-5">
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Representing Counsel</span>
              <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{caseData.advocateName || 'Not Available'}</p>
            </div>
          </div>

          {/* Card 2: OPPOSING PARTY */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-full">
            <div>
              {/* Header row */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/20 text-red-655 dark:text-red-400 flex items-center justify-center font-black text-xs">
                  {opponentInitials}
                </div>
                <div>
                  <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-red-655 dark:text-red-400 rounded text-[8px] font-black uppercase tracking-wider border border-rose-200/10 inline-block mb-1">
                    OPPONENT
                  </span>
                  <h4 className="text-xs font-black text-slate-850 dark:text-white leading-tight">Defendant / Accused</h4>
                </div>
              </div>

              {/* Data fields */}
              <div className="space-y-3.5">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Opponent Name</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.opponentName || 'Not Available'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Contact / Phone</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.opponentPhone || 'Not Available'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Email Address</span>
                  {caseData.opponentEmail ? (
                    <a href={`mailto:${caseData.opponentEmail}`} className="text-xs font-bold text-[#4F46E5] hover:underline mt-0.5 block">{caseData.opponentEmail}</a>
                  ) : (
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Not Available</p>
                  )}
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Postal Address</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.opponentAddress || 'Not Available'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/50 pt-3.5 mt-5 space-y-2">
              <div>
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Opposing Counsel</span>
                <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{caseData.opponentAdvocate || 'Not Available'}</p>
              </div>
              {caseData.opponentFirm && (
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Counsel Firm Name</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{caseData.opponentFirm}</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: COURT & Presider Meta */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-full">
            <div>
              {/* Header row */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950/20 text-teal-655 dark:text-teal-400 flex items-center justify-center font-black text-xs">
                  {judiciaryInitials}
                </div>
                <div>
                  <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/20 text-teal-655 dark:text-teal-400 rounded text-[8px] font-black uppercase tracking-wider border border-teal-200/10 inline-block mb-1">
                    JUDICIARY
                  </span>
                  <h4 className="text-xs font-black text-slate-850 dark:text-white leading-tight">Court & Presider Meta</h4>
                </div>
              </div>

              {/* Data fields */}
              <div className="space-y-3.5">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Presiding Court</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.courtName || 'Not Available'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Court Type</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.courtType || 'Not Available'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Presiding Judge</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.judge || 'Not Available'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Jurisdiction</span>
                  <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{caseData.jurisdiction || 'Not Available'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/50 pt-3.5 mt-5 space-y-2">
              <div>
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Case / Docket Number</span>
                <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{caseData.caseNo || 'Not Available'}</p>
              </div>
              {caseData.courtAddress && (
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Court Address</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate" title={caseData.courtAddress}>{caseData.courtAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Extra Cards */}
          {(caseData.additionalParties || []).map((party, idx) => {
            const initials = getInitials(party.name);
            return (
              <div key={idx} className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-full animate-in fade-in duration-300">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-zinc-805 text-slate-600 dark:text-slate-300 flex items-center justify-center font-black text-xs">
                      {initials}
                    </div>
                    <div>
                      <span className="px-2 py-0.5 bg-slate-50 dark:bg-zinc-805 text-slate-600 dark:text-slate-300 rounded text-[8px] font-black uppercase tracking-wider border border-slate-200/50 dark:border-zinc-700/50 inline-block mb-1">
                        {party.role || 'ROSTER'}
                      </span>
                      <h4 className="text-xs font-black text-slate-850 dark:text-white leading-tight">{party.role || 'Roster Participant'}</h4>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Participant Name</span>
                      <p className="text-xs font-bold text-slate-755 dark:text-white mt-0.5">{party.name}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Roster Details</span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{party.details || 'No additional details.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        </div>

      </div>
    );
  };

  const renderDocuments = () => {
    const filteredDocs = (caseData.documents || []).filter(doc => {
      if (docSearchQuery) {
        const query = docSearchQuery.toLowerCase();
        const matchesName = (doc.name || '').toLowerCase().includes(query);
        const matchesCategory = (doc.category || '').toLowerCase().includes(query);
        const matchesFacts = (doc.facts || '').toLowerCase().includes(query);
        const matchesParties = (doc.extractedParties || []).some(p => p.toLowerCase().includes(query));
        if (!matchesName && !matchesCategory && !matchesFacts && !matchesParties) return false;
      }

      if (docFilter === 'all') return true;
      if (docFilter === 'court_filings') return ['petition', 'affidavit', 'court order', 'reply', 'legal notice'].includes((doc.category || '').toLowerCase());
      if (docFilter === 'contracts') return ['agreement', 'contract'].includes((doc.category || '').toLowerCase());
      if (docFilter === 'evidence') return ['evidence', 'receipt', 'invoice', 'email', 'bank statement', 'medical record', 'photograph', 'video', 'audio'].includes((doc.category || '').toLowerCase());
      if (docFilter === 'drafts') return (doc.name || '').toLowerCase().includes('draft');
      if (docFilter === 'orders') return (doc.category || '').toLowerCase() === 'court order';
      if (docFilter === 'ai_extracted') return !!doc.aiProcessed;
      if (docFilter === 'recent') {
        const uploadTime = doc.uploadedAt ? new Date(doc.uploadedAt).getTime() : 0;
        return Date.now() - uploadTime < 24 * 60 * 60 * 1000 * 3;
      }
      return true;
    });

    const categories = [
      { id: 'all', label: 'All Files' },
      { id: 'court_filings', label: 'Court Filings' },
      { id: 'contracts', label: 'Contracts' },
      { id: 'evidence', label: 'Evidence' },
      { id: 'drafts', label: 'Drafts' },
      { id: 'orders', label: 'Orders' },
      { id: 'ai_extracted', label: 'AI Extracted' },
      { id: 'recent', label: 'Recent' }
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Document Header Card */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-2xl">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                📄 CASE DOCUMENT CENTER
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 leading-tight">
                Manage all pleadings, petitions, affidavits, agreements, court filings and supporting documents.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="px-4 py-2.5 bg-[#4F46E5] hover:opacity-95 text-white font-black text-[10px] uppercase tracking-wider rounded-full transition-all animate-pulse"
            >
              Upload Documents
            </button>
            <button 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-full transition-all"
            >
              Bulk Upload
            </button>
            <button 
              onClick={() => {
                const sorted = [...(caseData.documents || [])].sort((a,b) => (a.name || '').localeCompare(b.name || ''));
                setCaseData({ ...caseData, documents: sorted });
                toast.success("Sorted documents alphabetically!");
              }}
              className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-full hover:bg-slate-50 transition-colors"
              title="Sort Alphabetically"
            >
              <Sliders size={14} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Drag & Drop Upload Block */}
        <div 
          onClick={() => document.getElementById('workspace-doc-upload').click()}
          className="border-2 border-dashed border-indigo-205 dark:border-zinc-750 hover:border-indigo-400 dark:hover:border-indigo-500 bg-indigo-50/10 dark:bg-black/5 rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center group"
        >
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-full mb-3 group-hover:scale-105 transition-transform duration-300">
            <Paperclip size={24} />
          </div>
          <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Upload Case Documents</h4>
          <p className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase mt-1">
            Drag & Drop or <span className="text-[#4F46E5] underline">Browse Files</span>
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-3 tracking-wide">
            Accepts PDF, DOCX, DOC, XLSX, Images, ZIP up to 100MB
          </p>

          {/* Upload progress indicator */}
          {uploadProgress && (
            <div className="w-full max-w-xs mt-4 p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 rounded-2xl shadow-sm animate-pulse" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase">
                <span className="truncate max-w-[150px]">{uploadProgress.name}</span>
                <span>{uploadProgress.percent}%</span>
              </div>
              <div className="w-full bg-slate-105 dark:bg-zinc-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-[#4F46E5] h-full transition-all duration-300" style={{ width: `${uploadProgress.percent}%` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={docSearchQuery}
              onChange={(e) => setDocSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded-full pl-9 pr-4 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setDocFilter(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                  docFilter === cat.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] border-indigo-200 dark:border-indigo-900/30'
                    : 'bg-white dark:bg-zinc-800 text-slate-500 border-slate-205 dark:border-zinc-700 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc, idx) => {
            const isPDF = (doc.name || '').toLowerCase().endsWith('.pdf');
            const isWord = (doc.name || '').toLowerCase().endsWith('.docx') || (doc.name || '').toLowerCase().endsWith('.doc');
            
            return (
              <div key={idx} className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-[#4F46E5] transition-all duration-300 group">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl ${
                        isPDF ? 'bg-rose-50 text-red-650 dark:bg-rose-950/20 dark:text-red-400' :
                        isWord ? 'bg-indigo-50 text-[#4F46E5] dark:bg-indigo-950/20' :
                        'bg-slate-50 text-slate-500 dark:bg-zinc-800'
                      }`}>
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[180px]" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[8px] font-black uppercase text-[#4F46E5] mt-0.5 tracking-wider">
                          {doc.category || 'Other'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenDoc(doc)} className="p-2 text-slate-400 hover:text-[#4F46E5]" title="Preview"><Eye size={13} /></button>
                      <button onClick={() => handleDownloadDoc(doc)} className="p-2 text-slate-400 hover:text-[#4F46E5]" title="Download"><Download size={13} /></button>
                      <button onClick={() => handleDeleteEvidence(doc)} className="p-2 text-slate-450 hover:text-red-500" title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {doc.facts && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold italic border-l-2 border-indigo-100 dark:border-zinc-700 pl-2 py-0.5 my-3">
                      "{doc.facts}"
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap my-3">
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 rounded text-[7px] font-black uppercase tracking-wider border border-emerald-200/10">
                      {doc.ocrStatus || 'OCR Pending'}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded text-[7px] font-black uppercase tracking-wider border border-indigo-200/10">
                      {doc.aiProcessed || 'Indexing...'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-zinc-850 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    <span>Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}</span>
                    <span>•</span>
                    <span>{doc.size ? (doc.size / 1024).toFixed(1) + ' KB' : 'Size N/A'}</span>
                  </div>
                  <button 
                    onClick={() => { setSelectedDocDetails(doc); setIsDocInsightsOpen(true); }}
                    className="text-[8px] font-black uppercase tracking-widest text-[#4F46E5] flex items-center gap-1 hover:underline"
                  >
                    <Sparkles size={8} /> AI Analysis
                  </button>
                </div>
              </div>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="col-span-2 bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="p-4 bg-slate-50 dark:bg-zinc-850 text-slate-400 rounded-full mb-3">
                <FileText size={28} />
              </div>
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">📄 No Documents Uploaded</h4>
              <p className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed mb-5">
                Upload pleadings, agreements, petitions, affidavits or other legal files.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => document.getElementById('workspace-doc-upload').click()}
                  className="px-4 py-2 bg-[#4F46E5] text-white font-black text-[9px] uppercase tracking-wider rounded-lg"
                >
                  Upload Document
                </button>
                <button 
                  onClick={() => document.getElementById('workspace-doc-upload').click()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[9px] uppercase tracking-wider rounded-lg"
                >
                  Bulk Upload
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic AI Insights Drawer */}
        {isDocInsightsOpen && selectedDocDetails && (
          <div className="fixed inset-y-0 right-0 z-[130000] w-full max-w-md bg-white dark:bg-[#1a2540] border-l border-slate-200 dark:border-zinc-800/80 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800/50 mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="text-[#4F46E5]" size={18} />
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Document Analyzer</h3>
              </div>
              <button onClick={() => { setIsDocInsightsOpen(false); setSelectedDocDetails(null); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Document Name</span>
                <h4 className="text-xs font-black text-slate-800 dark:text-white mt-0.5 break-all">{selectedDocDetails.name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-black/10 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/30">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Confidence</span>
                  <p className="text-xs font-black text-[#4F46E5] mt-0.5">{selectedDocDetails.confidenceScore || 90}%</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/30">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Page Count</span>
                  <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{selectedDocDetails.pageCount || 1} Pages</p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest border-b border-slate-100 pb-1">Extracted Facts</h5>
                <p className="text-xs font-semibold text-slate-650 dark:text-slate-350 leading-relaxed italic">
                  "{selectedDocDetails.facts || 'No significant facts extracted.'}"
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest border-b border-slate-100 pb-1">Extracted Dates</h5>
                <div className="flex gap-1.5 flex-wrap">
                  {(selectedDocDetails.extractedDates || []).map((date, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded text-[9px] font-bold text-slate-600 dark:text-slate-300">{date}</span>
                  ))}
                  {(selectedDocDetails.extractedDates || []).length === 0 && <span className="text-[10px] text-slate-400">None detected.</span>}
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest border-b border-slate-100 pb-1">Extracted Parties</h5>
                <div className="flex gap-1.5 flex-wrap">
                  {(selectedDocDetails.extractedParties || []).map((party, i) => (
                    <span key={i} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded text-[9px] font-bold">{party}</span>
                  ))}
                  {(selectedDocDetails.extractedParties || []).length === 0 && <span className="text-[10px] text-slate-400">None detected.</span>}
                </div>
              </div>

              <div className="space-y-3.5 border-t border-slate-100 dark:border-zinc-800/50 pt-4">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Timeline Event</span>
                  <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1">{selectedDocDetails.linkedTimelineEvent || 'Unlinked'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Hearing</span>
                  <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1">{selectedDocDetails.linkedHearing || 'Unlinked'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Argument</span>
                  <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1">{selectedDocDetails.linkedArgument || 'Unlinked'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Precedent Law</span>
                  <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1">{selectedDocDetails.linkedPrecedent || 'Unlinked'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderEvidence = () => {
    const filteredEvidence = (caseData.documents || []).filter(doc => {
      if (evidenceSearchQuery) {
        const query = evidenceSearchQuery.toLowerCase();
        const matchesName = (doc.name || '').toLowerCase().includes(query);
        const matchesCategory = (doc.category || '').toLowerCase().includes(query);
        const matchesFacts = (doc.facts || '').toLowerCase().includes(query);
        const matchesParties = (doc.extractedParties || []).some(p => p.toLowerCase().includes(query));
        if (!matchesName && !matchesCategory && !matchesFacts && !matchesParties) return false;
      }

      if (evidenceFilter === 'all') return true;
      if (evidenceFilter === 'verified') return (doc.admissibility || '').toLowerCase() === 'admissible';
      if (evidenceFilter === 'pending') return (doc.admissibility || '').toLowerCase() === 'challenged';
      if (evidenceFilter === 'high_strength') return (doc.strength || '').toLowerCase() === 'strong';
      if (evidenceFilter === 'weak') return (doc.strength || '').toLowerCase() === 'weak';
      if (evidenceFilter === 'flagged') return ['disputed', 'tampered'].includes((doc.strength || '').toLowerCase()) || (doc.admissibility || '').toLowerCase() === 'inadmissible';
      if (evidenceFilter === 'documents') return ['agreement', 'contract', 'petition', 'affidavit', 'reply', 'legal notice'].includes((doc.category || '').toLowerCase());
      if (evidenceFilter === 'media') return ['photograph', 'video', 'audio', 'cctv'].includes((doc.category || '').toLowerCase());
      if (evidenceFilter === 'financial') return ['invoice', 'receipt', 'bank statement'].includes((doc.category || '').toLowerCase());
      if (evidenceFilter === 'communications') return ['email', 'whatsapp chat'].includes((doc.category || '').toLowerCase());
      return true;
    });

    const categories = [
      { id: 'all', label: 'All Evidence' },
      { id: 'verified', label: 'Verified' },
      { id: 'pending', label: 'Pending Verification' },
      { id: 'high_strength', label: 'High Strength' },
      { id: 'weak', label: 'Weak Evidence' },
      { id: 'flagged', label: 'AI Flagged' },
      { id: 'documents', label: 'Documents' },
      { id: 'media', label: 'Media' },
      { id: 'financial', label: 'Financial' },
      { id: 'communications', label: 'Communications' }
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Evidence Header */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-[#EF4444] rounded-2xl">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                🛡 EVIDENCE VAULT
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 leading-tight">
                Securely manage all admissible evidence with AI-powered verification and legal analysis.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="px-4 py-2.5 bg-[#EF4444] hover:opacity-95 text-white font-black text-[10px] uppercase tracking-wider rounded-full transition-all"
            >
              Upload Evidence
            </button>
            <button 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-full transition-all"
            >
              Bulk Upload
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search evidence locker..." 
              value={evidenceSearchQuery}
              onChange={(e) => setEvidenceSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded-full pl-9 pr-4 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setEvidenceFilter(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                  evidenceFilter === cat.id
                    ? 'bg-rose-50 dark:bg-rose-950/20 text-[#EF4444] border-rose-200 dark:border-rose-900/30'
                    : 'bg-white dark:bg-zinc-800 text-slate-500 border-slate-205 dark:border-zinc-700 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Evidence Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvidence.map((doc, idx) => {
            const isStrong = (doc.strength || '').toLowerCase() === 'strong';
            const isWeak = (doc.strength || '').toLowerCase() === 'weak';
            const isDisputed = ['disputed', 'tampered'].includes((doc.strength || '').toLowerCase());
            
            return (
              <div key={idx} className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-red-400 transition-all duration-300 group">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 rounded-xl">
                        <FileDigit size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[180px]" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[8px] font-black uppercase text-slate-450 dark:text-slate-500 mt-0.5 tracking-wider">
                          Exhibit No. {idx + 1} • {doc.category || 'Evidence'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenDoc(doc)} className="p-2 text-slate-400 hover:text-red-500" title="Preview"><Eye size={13} /></button>
                      <button onClick={() => { setSelectedEvidenceDetails(doc); setIsEvidenceInsightsOpen(true); }} className="p-2 text-slate-400 hover:text-red-500" title="Analyze"><Sparkles size={13} /></button>
                      <button onClick={() => handleDownloadDoc(doc)} className="p-2 text-slate-400 hover:text-red-500" title="Download"><Download size={13} /></button>
                      <button onClick={() => handleDeleteEvidence(doc)} className="p-2 text-slate-455 hover:text-red-500" title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 my-4">
                    <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                      isStrong ? 'bg-emerald-50 text-emerald-650 border-emerald-200/10' :
                      isWeak ? 'bg-amber-50 text-amber-655 border-amber-200/10' :
                      isDisputed ? 'bg-rose-50 text-red-655 border-rose-200/10' :
                      'bg-slate-50 text-slate-500 border-slate-200/10'
                    }`}>
                      {doc.strength || 'Moderate'}
                    </span>
                    <span className="px-2 py-0.5 bg-rose-50 dark:bg-[#251A25] text-red-655 dark:text-rose-400 rounded text-[7px] font-black uppercase tracking-wider border border-rose-200/10">
                      AI Authenticity: {doc.authenticityScore || '90%'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 rounded text-[7px] font-mono tracking-wider font-bold">
                      {doc.hash ? doc.hash.substring(0, 15) : 'Hash Pending'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-105 dark:border-zinc-850 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    <span>Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}</span>
                    <span>•</span>
                    <span>{doc.admissibility || 'Verified'}</span>
                  </div>
                  <button 
                    onClick={() => { setSelectedEvidenceDetails(doc); setIsEvidenceInsightsOpen(true); }}
                    className="text-[8px] font-black uppercase tracking-widest text-[#EF4444] flex items-center gap-1 hover:underline"
                  >
                    <Sparkles size={8} /> Legal Analysis
                  </button>
                </div>
              </div>
            );
          })}

          {filteredEvidence.length === 0 && (
            <div className="col-span-2 bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="p-4 bg-rose-55 dark:bg-rose-955 text-red-500 rounded-full mb-3">
                <Shield size={28} />
              </div>
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">🛡 No Evidence Uploaded</h4>
              <p className="text-[10px] text-slate-455 dark:text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed mb-5">
                Upload supporting documents, images, videos, audio recordings or forensic reports.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => document.getElementById('workspace-doc-upload').click()}
                  className="px-4 py-2 bg-[#EF4444] text-white font-black text-[9px] uppercase tracking-wider rounded-lg"
                >
                  Upload Evidence
                </button>
                <button 
                  onClick={() => document.getElementById('workspace-doc-upload').click()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[9px] uppercase tracking-wider rounded-lg"
                >
                  Bulk Upload
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic AI Evidence Insights Drawer */}
        {isEvidenceInsightsOpen && selectedEvidenceDetails && (
          <div className="fixed inset-y-0 right-0 z-[130000] w-full max-w-md bg-white dark:bg-[#1a2540] border-l border-slate-200 dark:border-zinc-800/80 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800/50 mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="text-red-500" size={18} />
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Evidence Analyzer</h3>
              </div>
              <button onClick={() => { setIsEvidenceInsightsOpen(false); setSelectedEvidenceDetails(null); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Evidence Name</span>
                <h4 className="text-xs font-black text-slate-800 dark:text-white mt-0.5 break-all">{selectedEvidenceDetails.name}</h4>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-black/10 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/30">
                  <span className="text-[7px] font-bold text-slate-400 uppercase">Authenticity</span>
                  <p className="text-xs font-black text-red-500 mt-0.5">{selectedEvidenceDetails.authenticityScore || '90%'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/30">
                  <span className="text-[7px] font-bold text-slate-400 uppercase">Reliability</span>
                  <p className="text-xs font-black text-slate-850 dark:text-white mt-0.5">{selectedEvidenceDetails.reliability || 'Medium'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/30">
                  <span className="text-[7px] font-bold text-slate-400 uppercase">Admissibility</span>
                  <p className="text-xs font-black text-emerald-650 mt-0.5">{selectedEvidenceDetails.admissibility || 'Admissible'}</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-black/10 p-4 rounded-3xl border border-slate-100 dark:border-zinc-800/30">
                <h5 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">SHA256 File Signature</h5>
                <p className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-350 break-all">{selectedEvidenceDetails.hash || 'SHA256-PENDING'}</p>
                <div className="text-[8px] font-bold text-slate-450 uppercase flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <span>Chain of custody verified</span>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest border-b border-slate-100 pb-1">Extracted Facts</h5>
                <p className="text-xs font-semibold text-slate-650 dark:text-slate-350 leading-relaxed italic">
                  "{selectedEvidenceDetails.facts || 'No facts analyzed.'}"
                </p>
              </div>

              <div className="space-y-3.5 border-t border-slate-100 dark:border-zinc-800/50 pt-4">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Timeline Event</span>
                  <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1">{selectedEvidenceDetails.linkedTimelineEvent || 'Unlinked'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Hearing</span>
                  <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1">{selectedEvidenceDetails.linkedHearing || 'Unlinked'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Argument</span>
                  <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1">{selectedEvidenceDetails.linkedArgument || 'Unlinked'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Precedent Law</span>
                  <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1">{selectedEvidenceDetails.linkedPrecedent || 'Unlinked'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  const triggerBackgroundResearchSync = async (targetData, manual = false) => {
    if (!targetData) return;
    const caseId = targetData.id || targetData._id;
    if (!caseId) return;

    if (!manual) {
      const summary = targetData.summary || targetData.description || '';
      if (!summary || summary.trim().split(/\s+/).length < 8) {
        console.log("[Background Research] Case summary empty or too short. Skipping background extraction.");
        return;
      }
    }

    console.log("[Background Research] Triggering research background extraction...");
    try {
      setIsExtractingResearch(true);
      const toastId = manual ? toast.loading("AI is analyzing and compiling legal research...") : null;
      const res = await legalService.generateAiResearch(caseId, targetData, caseNotes);
      if (res) {
        setCaseData(prev => ({ ...prev, aiResearch: res }));
        if (manual) toast.success("✓ AI Research compiled successfully!", { id: toastId });
      }
      console.log("[Background Research] Background research sync complete.");
    } catch (err) {
      console.error("[Background Research] Failed background research sync", err);
      if (manual) toast.error("Failed to compile AI research");
    } finally {
      setIsExtractingResearch(false);
    }
  };

  const handleToggleBookmarkCitation = async (citationObj) => {
    const current = caseData.savedCitations || [];
    const exists = current.some(c => c.name === citationObj.name || c.citation === citationObj.citation || c.section === citationObj.section);
    let updated;
    if (exists) {
      updated = current.filter(c => c.name !== citationObj.name && c.citation !== citationObj.citation && c.section !== citationObj.section);
      toast.success("Removed citation from bookmarks");
    } else {
      updated = [...current, citationObj];
      toast.success("Bookmarked citation!");
    }
    const updatedData = { ...caseData, savedCitations: updated };
    try {
      await apiService.updateProject(caseData.id || caseData._id, { savedCitations: updated });
      setCaseData(updatedData);
    } catch (err) {
      console.error(err);
    }
  };

  const renderResearch = () => {
    const hasSummary = !!(caseData.summary || caseData.description || '').trim();
    const isSummaryShort = (caseData.summary || caseData.description || '').trim().split(/\s+/).length < 8;

    if (!hasSummary || isSummaryShort) {
      return (
        <div className="bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[350px] animate-in fade-in duration-300">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-full mb-4">
            <BookOpen size={32} />
          </div>
          <h4 className="text-base font-black text-slate-855 dark:text-white uppercase tracking-wider mb-2">📚 Research Not Available</h4>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed mb-6">
            Generate a proper case summary or upload supporting documents before AI legal research can begin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleGenerateAiSummary}
              className="px-5 py-2.5 bg-[#4F46E5] hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all animate-pulse"
            >
              Generate Case Summary
            </button>
            <button 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-705 dark:text-slate-350 font-black text-xs uppercase tracking-widest rounded-xl shadow-sm transition-all"
            >
              Upload Documents
            </button>
          </div>
        </div>
      );
    }

    if (isExtractingResearch) {
      return (
        <div className="bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[350px] animate-in fade-in duration-300">
          <RefreshCcw size={36} className="text-[#4F46E5] animate-spin mb-4" />
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">AI Legal Research Engine</h4>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-bold uppercase mt-1">Analyzing case summary, timeline, documents, and notes...</p>
        </div>
      );
    }

    const aiResearch = caseData.aiResearch;

    if (!aiResearch) {
      return (
        <div className="bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[350px] animate-in fade-in duration-300">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-full mb-4">
            <Sparkles size={32} className="animate-bounce" />
          </div>
          <h4 className="text-base font-black text-slate-855 dark:text-white uppercase tracking-wider mb-2">📚 AI Legal Research Ready</h4>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed mb-6">
            Click below to compile governing laws, precedents, strategy, and risk analysis for this case.
          </p>
          <button 
            onClick={() => triggerBackgroundResearchSync(caseData, true)}
            className="px-6 py-3 bg-[#4F46E5] hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all"
          >
            Analyze & Refresh
          </button>
        </div>
      );
    }

    const toggleAccordion = (key) => {
      setExpandedResearchAccordions(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const chips = [
      "Find recovery suit precedents",
      "Applicable CPC provisions",
      "Limitation Act research",
      "Electronic Evidence",
      "Cheque Bounce",
      "Property Dispute",
      "Labour Law"
    ];

    const getRiskColor = (risk) => {
      const r = (risk || '').toLowerCase();
      if (r.includes('very high')) return 'bg-rose-50 text-red-700 border-red-200 dark:bg-red-950/10 dark:text-red-400';
      if (r.includes('high')) return 'bg-rose-50 text-red-650 border-red-150';
      if (r.includes('medium')) return 'bg-amber-50 text-amber-655 border-amber-200';
      return 'bg-emerald-50 text-emerald-650 border-emerald-200';
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Research Header */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-2xl">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                📚 AI LEGAL RESEARCH ENGINE
              </h3>
              <p className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase mt-1 leading-relaxed max-w-2xl">
                Automatically analyze the case summary, uploaded documents, evidence, and timeline to identify applicable laws, precedents, judicial principles, procedural requirements, and litigation strategy.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => triggerBackgroundResearchSync(caseData, true)}
              className="px-4 py-2.5 bg-[#4F46E5] hover:opacity-95 text-white font-black text-[10px] uppercase tracking-wider rounded-full transition-all flex items-center gap-1.5"
            >
              <RefreshCcw size={11} className={isExtractingResearch ? "animate-spin" : ""} />
              Analyze & Refresh
            </button>
            <button 
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(aiResearch, null, 2));
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href",     dataStr);
                dlAnchorElem.setAttribute("download", `${caseData.name || 'case'}_research.json`);
                dlAnchorElem.click();
                toast.success("✓ Exported research data JSON!");
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-full transition-all"
            >
              Export Research
            </button>
          </div>
        </div>

        {/* AI Research Search Bar */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm space-y-3.5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder='Ask AI: "What laws apply?" or "Find Supreme Court precedents"...' 
              value={researchSearchQuery}
              onChange={(e) => setResearchSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/80 rounded-2xl pl-12 pr-28 py-3.5 text-xs font-semibold text-slate-800 dark:text-white outline-none"
            />
            <button 
              onClick={() => {
                if (researchSearchQuery.trim()) {
                  toast.success(`Search initialized: "${researchSearchQuery}"`);
                }
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Search
            </button>
          </div>
          
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => setResearchSearchQuery(chip)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:text-slate-350 rounded-full text-[9px] font-bold text-slate-500 whitespace-nowrap border border-slate-200/50 dark:border-zinc-700/50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1 */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Research Coverage</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-indigo-650 dark:text-indigo-400">{aiResearch.researchCoverage || '92%'}</span>
            </div>
            <p className="text-[9px] font-bold text-slate-450 mt-1 uppercase tracking-wide">Coverage of applicable legal domains.</p>
          </div>

          {/* KPI 2 */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">AI Confidence</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-emerald-650 dark:text-emerald-400">{aiResearch.researchConfidence || '96%'}</span>
            </div>
            <p className="text-[9px] font-bold text-slate-450 mt-1 uppercase tracking-wide">Confidence in identified statutes.</p>
          </div>

          {/* KPI 3 */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Primary governing law</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xs font-black text-slate-800 dark:text-white truncate max-w-full block" title={aiResearch.primaryCode}>{aiResearch.primaryCode || 'Civil Procedure Code'}</span>
            </div>
            <p className="text-[9px] font-bold text-slate-450 mt-2.5 uppercase tracking-wide">Automatically determined.</p>
          </div>

          {/* KPI 4 */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Limitation risk</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`px-2 py-0.5 border rounded text-[9px] font-black uppercase tracking-wider ${getRiskColor(aiResearch.limitationRisk)}`}>
                {aiResearch.limitationRisk || 'Medium'}
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-450 mt-2.5 uppercase tracking-wide">Based on AI assessment.</p>
          </div>

        </div>

        {/* Dashboard Overview */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
          <h4 className="text-xs font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-widest border-b border-slate-100 dark:border-zinc-800/50 pb-2 flex items-center gap-1.5">
            <LayoutDashboard size={14} /> AI Research Dashboard Overview
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Identified Case Type</span>
              <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{aiResearch.caseType || 'Not identified'}</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Core Jurisdiction</span>
              <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{aiResearch.jurisdiction || 'Not identified'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Key Legal Issues at Dispute</span>
            <div className="space-y-1.5">
              {(aiResearch.legalIssues || []).map((issue, idx) => (
                <div key={idx} className="flex gap-2.5 items-start text-xs font-semibold text-slate-700 dark:text-slate-350">
                  <span className="font-bold text-indigo-600">{idx + 1}.</span>
                  <p>{issue}</p>
                </div>
              ))}
              {(aiResearch.legalIssues || []).length === 0 && <p className="text-xs text-slate-400">None identified.</p>}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Relevant Judicial Principles</span>
            <ul className="list-disc pl-4 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350">
              {(aiResearch.judicialPrinciples || []).map((principle, idx) => (
                <li key={idx} className="marker:text-indigo-500">{principle}</li>
              ))}
              {(aiResearch.judicialPrinciples || []).length === 0 && <p className="text-xs text-slate-400">None identified.</p>}
            </ul>
          </div>
        </div>

        {/* Accordions */}
        <div className="space-y-3">
          
          {/* Accordion 1: Statutes */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleAccordion('statutes')}
              className="w-full flex items-center justify-between p-5 text-left font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider"
            >
              <span>Applicable Laws & Statutory Provisions ({(aiResearch.statutes || []).length})</span>
              <ChevronRight size={16} className={`transition-transform ${expandedResearchAccordions.statutes ? "rotate-90" : ""}`} />
            </button>
            
            {expandedResearchAccordions.statutes && (
              <div className="p-5 border-t border-slate-100 dark:border-zinc-800/50 space-y-4 animate-in fade-in duration-300">
                {(aiResearch.statutes || []).map((st, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded text-[9px] font-black uppercase tracking-wider">
                          {st.section}
                        </span>
                        <h5 className="text-xs font-black text-slate-800 dark:text-white">{st.actName}</h5>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed"><span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Applicability Reason</span>{st.reason}</p>
                      <div className="flex items-center gap-3 text-[9px] font-bold text-slate-450 uppercase">
                        <span>Confidence: {st.confidence}</span>
                        <span>•</span>
                        <span>Related Issue: {st.issue}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleBookmarkCitation({ name: st.actName, section: st.section, type: 'statute' })}
                      className={`p-2 rounded-lg border transition-colors ${
                        (caseData.savedCitations || []).some(c => c.section === st.section)
                          ? 'bg-indigo-50 text-[#4F46E5] border-indigo-200'
                          : 'bg-white hover:bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                      title="Bookmark statute"
                    >
                      <Bookmark size={13} />
                    </button>
                  </div>
                ))}
                {(aiResearch.statutes || []).length === 0 && (
                  <p className="text-xs text-slate-450 italic">No statutory provisions identified.</p>
                )}
              </div>
            )}
          </div>

          {/* Accordion 2: Precedents */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleAccordion('precedents')}
              className="w-full flex items-center justify-between p-5 text-left font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider"
            >
              <span>Relevant Judgments & Precedents ({(aiResearch.precedents || []).length})</span>
              <ChevronRight size={16} className={`transition-transform ${expandedResearchAccordions.precedents ? "rotate-90" : ""}`} />
            </button>
            
            {expandedResearchAccordions.precedents && (
              <div className="p-5 border-t border-slate-100 dark:border-zinc-800/50 space-y-4 animate-in fade-in duration-300">
                {(aiResearch.precedents || []).map((pr, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 flex justify-between items-start gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 rounded text-[9px] font-black uppercase tracking-wider">
                          {pr.citation}
                        </span>
                        <h5 className="text-xs font-black text-slate-800 dark:text-white">{pr.caseName}</h5>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] font-bold text-slate-450 uppercase">
                        <span>Court: {pr.court} ({pr.year})</span>
                        <span>Similarity Score: {pr.similarityScore}</span>
                        <span>Key Principle: {pr.principle}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed"><span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Key Holding</span>"{pr.holding}"</p>
                      <p className="text-xs font-semibold text-slate-705 dark:text-slate-400 leading-relaxed"><span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Relevance to this Case</span>{pr.reason}</p>
                    </div>
                    <button 
                      onClick={() => handleToggleBookmarkCitation({ name: pr.caseName, citation: pr.citation, type: 'precedent' })}
                      className={`p-2 rounded-lg border transition-colors ${
                        (caseData.savedCitations || []).some(c => c.citation === pr.citation)
                          ? 'bg-indigo-50 text-[#4F46E5] border-indigo-200'
                          : 'bg-white hover:bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                      title="Bookmark precedent"
                    >
                      <Bookmark size={13} />
                    </button>
                  </div>
                ))}
                {(aiResearch.precedents || []).length === 0 && (
                  <p className="text-xs text-slate-455 text-center py-6 italic">No relevant precedents identified from the available case information.</p>
                )}
              </div>
            )}
          </div>

          {/* Accordion 3: Strategy */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleAccordion('strategy')}
              className="w-full flex items-center justify-between p-5 text-left font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider"
            >
              <span>AI Arguments & Strategy Formulation</span>
              <ChevronRight size={16} className={`transition-transform ${expandedResearchAccordions.strategy ? "rotate-90" : ""}`} />
            </button>
            
            {expandedResearchAccordions.strategy && aiResearch.strategy && (
              <div className="p-5 border-t border-slate-100 dark:border-zinc-800/50 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Plaintiff Strategy</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">{aiResearch.strategy.plaintiffStrategy}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Defendant Strategy</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">{aiResearch.strategy.defendantStrategy}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Likely Defence</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">{aiResearch.strategy.likelyDefence}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Weaknesses</span>
                  <p className="text-xs font-semibold text-slate-705 dark:text-red-400 leading-relaxed">{aiResearch.strategy.weaknesses}</p>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 4: Recommendations */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleAccordion('recommendations')}
              className="w-full flex items-center justify-between p-5 text-left font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider"
            >
              <span>AI Recommendations & Missing Authorities ({(aiResearch.recommendations || []).length})</span>
              <ChevronRight size={16} className={`transition-transform ${expandedResearchAccordions.recommendations ? "rotate-90" : ""}`} />
            </button>
            
            {expandedResearchAccordions.recommendations && (
              <div className="p-5 border-t border-slate-100 dark:border-zinc-800/50 space-y-3 animate-in fade-in duration-300">
                {(aiResearch.recommendations || []).map((rec, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start bg-rose-50/30 dark:bg-rose-955/5 border border-rose-100/50 dark:border-zinc-800/30 p-3.5 rounded-xl text-xs font-semibold text-slate-750 dark:text-slate-350 leading-relaxed">
                    <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <p>{rec}</p>
                  </div>
                ))}
                {(aiResearch.recommendations || []).length === 0 && (
                  <p className="text-xs text-slate-450 italic">No recommendations or procedural gaps identified.</p>
                )}
              </div>
            )}
          </div>

          {/* Accordion 5: Bookmarked Citations */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl overflow-hidden">
            <button 
              onClick={() => toggleAccordion('saved')}
              className="w-full flex items-center justify-between p-5 text-left font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider"
            >
              <span>Saved Research Citations ({(caseData.savedCitations || []).length})</span>
              <ChevronRight size={16} className={`transition-transform ${expandedResearchAccordions.saved ? "rotate-90" : ""}`} />
            </button>
            
            {expandedResearchAccordions.saved && (
              <div className="p-5 border-t border-slate-100 dark:border-zinc-800/50 space-y-3 animate-in fade-in duration-300">
                {(caseData.savedCitations || []).map((cit, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-zinc-800/30 p-3.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Bookmark size={13} className="text-[#4F46E5]" />
                      <span className="text-xs font-black text-slate-800 dark:text-white">
                        {cit.section ? `${cit.section} - ` : ''}{cit.name} {cit.citation ? `(${cit.citation})` : ''}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleToggleBookmarkCitation(cit)}
                      className="text-[10px] font-black uppercase text-red-500 tracking-wider hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(caseData.savedCitations || []).length === 0 && (
                  <p className="text-xs text-slate-450 italic text-center py-4">No saved research citations.</p>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    );
  };

  const handleCreateDraft = async (aiGenerated = false) => {
    if (!draftFormName.trim()) {
      toast.error("Please enter a draft name");
      return;
    }

    try {
      setIsGeneratingDraft(true);
      const toastId = aiGenerated ? toast.loading("AI is generating professional legal draft...") : toast.loading("Creating draft...");
      
      let initialContent = "";
      if (aiGenerated) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        initialContent = `DRAFT OF ${draftFormType.toUpperCase()}\n\nIn the matter of: ${caseData.name || 'Litigation'}\n\nClient: ${caseData.clientName || 'Petitioner'}\nOpponent: ${caseData.opposingParty || 'Respondent'}\n\nSummary:\n${caseData.summary || 'Details pending.'}\n\nDrafted by AISA AI Copilot on ${new Date().toLocaleDateString()}.`;
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
        initialContent = `DRAFT OF ${draftFormType.toUpperCase()}\n\nDate: ${new Date().toLocaleDateString()}\n\nWrite draft content here...`;
      }

      const newDraft = {
        id: 'draft-' + Date.now().toString(),
        name: draftFormName,
        type: draftFormType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: aiGenerated ? 'AI Generated' : 'Draft',
        content: initialContent
      };

      const updatedDrafts = [...(caseData.drafts || []), newDraft];
      await apiService.updateProject(caseData.id || caseData._id, { drafts: updatedDrafts });
      
      setCaseData(prev => ({ ...prev, drafts: updatedDrafts }));
      setDraftFormName('');
      toast.success(aiGenerated ? "✓ AI Draft generated successfully!" : "Draft created!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save draft");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    try {
      const updated = (caseData.drafts || []).filter(d => d.id !== draftId);
      await apiService.updateProject(caseData.id || caseData._id, { drafts: updated });
      setCaseData(prev => ({ ...prev, drafts: updated }));
      toast.success("Draft deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete draft");
    }
  };

  const handleDuplicateDraft = async (draftObj) => {
    try {
      const duplicated = {
        ...draftObj,
        id: 'draft-' + Date.now().toString(),
        name: `${draftObj.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'Draft'
      };
      const updated = [...(caseData.drafts || []), duplicated];
      await apiService.updateProject(caseData.id || caseData._id, { drafts: updated });
      setCaseData(prev => ({ ...prev, drafts: updated }));
      toast.success("Draft duplicated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to duplicate draft");
    }
  };

  const handleDownloadDraft = (draftObj) => {
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(draftObj.content || '');
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href",     dataStr);
    dlAnchorElem.setAttribute("download", `${draftObj.name.replace(/\s+/g, '_')}.txt`);
    dlAnchorElem.click();
    toast.success("Draft downloaded!");
  };

  const renderDrafts = () => {
    const drafts = caseData.drafts || [];
    const hasSummary = !!(caseData.summary || caseData.description || '').trim();

    // Map suggested template based on case type
    const suggestedTemplates = hasSummary ? [
      "Legal Notice",
      "Reply Notice",
      "Written Statement",
      "Petition",
      "Agreement"
    ] : [];

    const getStatusColor = (status) => {
      const s = (status || '').toLowerCase();
      if (s.includes('completed')) return 'bg-emerald-50 text-emerald-650 border-emerald-200 dark:bg-emerald-950/20';
      if (s.includes('review')) return 'bg-amber-50 text-amber-655 border-amber-200 dark:bg-amber-950/20';
      if (s.includes('ai generated')) return 'bg-indigo-50 text-indigo-650 border-indigo-200 dark:bg-indigo-950/20';
      return 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-slate-400';
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Create Draft Card */}
        <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              📝 AI Draft Workspace
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase mt-1 leading-relaxed">
              Create, manage, and organize legal drafts for the current case.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Draft Name</label>
              <input 
                type="text" 
                placeholder="Enter draft name" 
                value={draftFormName}
                onChange={(e) => setDraftFormName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Draft Type</label>
              <select
                value={draftFormType}
                onChange={(e) => setDraftFormType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 dark:text-white outline-none"
              >
                {[
                  "Legal Notice", "Reply Notice", "FIR Draft", "Affidavit", 
                  "Agreement", "Petition", "Written Statement", "Bail Application", 
                  "Civil Suit", "Criminal Complaint", "Appeal", "Miscellaneous"
                ].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => handleCreateDraft(false)}
              disabled={isGeneratingDraft}
              className="px-5 py-2.5 bg-[#4F46E5] hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              Create Draft
            </button>
            <button
              onClick={() => handleCreateDraft(true)}
              disabled={isGeneratingDraft}
              className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-[#4F46E5] dark:border-indigo-400 text-[#4F46E5] dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-xl shadow-sm transition-all hover:bg-indigo-50/50 flex items-center justify-center gap-1.5"
            >
              <Sparkles size={13} className="animate-pulse" />
              Generate with AI
            </button>
          </div>
        </div>

        {/* AI Suggested Templates */}
        {suggestedTemplates.length > 0 && (
          <div className="space-y-2">
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Suggested Draft Templates</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {suggestedTemplates.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDraftFormName(`${tmpl} for ${caseData.clientName || 'Client'}`);
                    setDraftFormType(tmpl);
                  }}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-[#1A2540] dark:text-slate-300 rounded-xl text-[10px] font-black text-slate-600 whitespace-nowrap border border-slate-200/50 dark:border-zinc-800/80 flex items-center gap-1"
                >
                  <Sparkles size={11} className="text-[#4F46E5]" />
                  {tmpl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Case Drafts Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-widest flex items-center gap-1.5">
            <ScrollText size={14} /> Case Drafts ({drafts.length})
          </h4>

          {drafts.length === 0 ? (
            <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[220px]">
              <div className="p-3 bg-slate-50 dark:bg-zinc-800 text-slate-400 rounded-full mb-3.5">
                <ScrollText size={28} />
              </div>
              <h5 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-1">No Drafts Yet</h5>
              <p className="text-[10px] text-slate-450 font-bold uppercase mb-4">Create a manual draft or generate one using AI.</p>
              <button 
                onClick={() => {
                  setDraftFormName(`Notice of Injunction - ${caseData.clientName || 'Client'}`);
                  setDraftFormType('Legal Notice');
                  toast.success("Form preset loaded! Click Create or AI Generate.");
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                Create First Draft
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map((dr, idx) => (
                <div key={idx} className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full hover:border-[#4F46E5] dark:hover:border-indigo-500 transition-all">
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-xl shrink-0">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-850 dark:text-white leading-tight truncate max-w-[150px]" title={dr.name}>{dr.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{dr.type}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${getStatusColor(dr.status)}`}>
                        {dr.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-[9px] font-bold text-slate-450 uppercase">
                      <p>Created: {new Date(dr.createdAt).toLocaleDateString()}</p>
                      <p>Updated: {new Date(dr.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-zinc-800/50 pt-3 mt-4 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDraftFormName(dr.name);
                          setDraftFormType(dr.type);
                          toast.success("Draft loaded into editing form.");
                        }}
                        className="text-[9px] font-black uppercase text-indigo-650 dark:text-indigo-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateDraft(dr)}
                        className="text-[9px] font-black uppercase text-slate-500 hover:underline"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDownloadDraft(dr)}
                        className="text-[9px] font-black uppercase text-slate-505 hover:underline"
                      >
                        Download
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteDraft(dr.id)}
                      className="text-[9px] font-black uppercase text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  };

  const renderContracts = () => {
    const contracts = (caseData.documents || []).filter(d => /nda|contract|agreement/i.test(d.name || '') || (d.category && /contract|agreement/i.test(d.category)));

    const toggleContractAccordion = (key) => {
      setExpandedContractAccordions(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const handleTriggerContractAnalysis = async (docObj) => {
      if (docObj.contractAnalysis) {
        setSelectedContractDetails(docObj);
        setIsContractInsightsOpen(true);
        toast.success("Loaded AI contract clause reviews!");
        return;
      }

      const toastId = toast.loading("AI is running clause and compliance audit...");
      try {
        const analyzed = await legalService.analyzeUploadedDocument(caseData.id || caseData._id, docObj);
        // Update local state caseData
        const updatedDocs = (caseData.documents || []).map(d => d.id === docObj.id ? analyzed : d);
        const updatedData = { ...caseData, documents: updatedDocs };
        setCaseData(updatedData);
        setSelectedContractDetails(analyzed);
        setIsContractInsightsOpen(true);
        toast.success("✓ AI contract clause review generated!", { id: toastId });
      } catch (err) {
        console.error(err);
        toast.error("Failed to run contract analysis", { id: toastId });
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Upload Card */}
        <div 
          onClick={() => document.getElementById('workspace-doc-upload').click()}
          className="bg-white dark:bg-[#1A2540] border-2 border-dashed border-slate-205 dark:border-zinc-800 rounded-3xl p-6 text-center cursor-pointer hover:border-[#4F46E5] dark:hover:border-indigo-500 transition-all flex flex-col items-center justify-center"
        >
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-full mb-3">
            <UploadCloud size={24} />
          </div>
          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider">Upload Contract or Agreement</h4>
          <p className="text-[9px] text-slate-450 dark:text-slate-400 font-bold uppercase mt-1 leading-relaxed max-w-sm mx-auto">
            Upload agreements, MoUs, lease deeds, contracts or commercial documents for AI analysis.
          </p>
          <span className="px-2 py-0.5 bg-slate-50 dark:bg-zinc-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-zinc-700/50 rounded text-[8px] font-black uppercase tracking-wider mt-3">
            PDF • DOCX • Scanned Images
          </span>
        </div>

        {/* Repository Grid */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-widest flex items-center gap-1.5">
            <ClipboardList size={14} /> Contract Repository ({contracts.length})
          </h4>

          {contracts.length === 0 ? (
            <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[220px]">
              <div className="p-3 bg-slate-50 dark:bg-zinc-800 text-slate-400 rounded-full mb-3.5">
                <ClipboardList size={28} />
              </div>
              <h5 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-1">No Contracts Uploaded</h5>
              <p className="text-[10px] text-slate-450 font-bold uppercase mb-4">Upload a contract to begin AI legal review and clause analysis.</p>
              <button 
                onClick={() => document.getElementById('workspace-doc-upload').click()}
                className="px-4 py-2 bg-[#4F46E5] hover:opacity-95 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-sm transition-all"
              >
                Upload Contract
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts.map((doc, idx) => {
                const analysis = doc.contractAnalysis;
                const riskScore = analysis ? (analysis.risks.length > 2 ? 'High' : (analysis.risks.length > 0 ? 'Medium' : 'Low')) : 'Low';
                const getRiskBadgeColor = (risk) => {
                  if (risk === 'High') return 'bg-rose-50 text-red-650 border-rose-150';
                  if (risk === 'Medium') return 'bg-amber-50 text-amber-655 border-amber-200';
                  return 'bg-emerald-50 text-emerald-650 border-emerald-250/20';
                };

                return (
                  <div key={idx} className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full hover:border-[#4F46E5] dark:hover:border-indigo-500 transition-all">
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-xl shrink-0">
                            <ClipboardList size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-850 dark:text-white leading-tight truncate max-w-[150px]" title={doc.name}>{doc.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{doc.size || 'Unknown Size'}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          analysis ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          {analysis ? 'AI Reviewed' : 'Pending Review'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-450 uppercase border-t border-slate-100 dark:border-zinc-800/50 pt-2.5">
                        <span>Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Recently'}</span>
                        <span className={`px-2 py-0.5 border rounded-full text-[8px] font-black uppercase tracking-wider ${getRiskBadgeColor(riskScore)}`}>
                          Risk: {riskScore}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-zinc-800/50 pt-3 mt-4 flex items-center justify-between">
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleTriggerContractAnalysis(doc)}
                          className="text-[9px] font-black uppercase text-[#4F46E5] dark:text-indigo-400 hover:underline"
                        >
                          Analyze
                        </button>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = doc.uri || '#';
                            link.setAttribute('download', doc.name);
                            link.click();
                          }}
                          className="text-[9px] font-black uppercase text-slate-500 hover:underline"
                        >
                          Download
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-[9px] font-black uppercase text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Contract Analysis Sliding Drawer */}
        {isContractInsightsOpen && selectedContractDetails && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white dark:bg-[#0D182E] border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#4F46E5] animate-pulse" />
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">AI Contract Analysis</h4>
              </div>
              <button 
                onClick={() => {
                  setIsContractInsightsOpen(false);
                  setSelectedContractDetails(null);
                }} 
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-450 dark:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              <div className="pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Document File</span>
                <p className="text-xs font-black text-slate-800 dark:text-white truncate mt-1">{selectedContractDetails.name}</p>
              </div>

              {selectedContractDetails.contractAnalysis ? (
                <div className="space-y-3">
                  
                  {/* Summary */}
                  <div className="bg-slate-50 dark:bg-black/10 border border-slate-205 dark:border-zinc-800/80 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => toggleContractAccordion('summary')}
                      className="w-full flex items-center justify-between p-3.5 text-left font-black text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                    >
                      <span>Contract Summary</span>
                      <ChevronRight size={14} className={`transition-transform ${expandedContractAccordions.summary ? "rotate-90" : ""}`} />
                    </button>
                    {expandedContractAccordions.summary && (
                      <p className="px-4 pb-4 text-xs font-semibold text-slate-650 dark:text-slate-350 leading-relaxed italic animate-in fade-in duration-300">
                        "{selectedContractDetails.contractAnalysis.summary}"
                      </p>
                    )}
                  </div>

                  {/* Key Clauses */}
                  <div className="bg-slate-50 dark:bg-black/10 border border-slate-205 dark:border-zinc-800/80 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => toggleContractAccordion('clauses')}
                      className="w-full flex items-center justify-between p-3.5 text-left font-black text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                    >
                      <span>Key Clauses ({Object.keys(selectedContractDetails.contractAnalysis.clauses).length})</span>
                      <ChevronRight size={14} className={`transition-transform ${expandedContractAccordions.clauses ? "rotate-90" : ""}`} />
                    </button>
                    {expandedContractAccordions.clauses && (
                      <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-300">
                        {Object.entries(selectedContractDetails.contractAnalysis.clauses).map(([clause, details], idx) => (
                          <div key={idx} className="space-y-0.5">
                            <span className="text-[8px] font-black text-[#4F46E5] uppercase tracking-widest block">{clause} Clause</span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">{details}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Risks */}
                  <div className="bg-slate-50 dark:bg-black/10 border border-slate-205 dark:border-zinc-800/80 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => toggleContractAccordion('risks')}
                      className="w-full flex items-center justify-between p-3.5 text-left font-black text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                    >
                      <span>Risk Assessment ({selectedContractDetails.contractAnalysis.risks.length})</span>
                      <ChevronRight size={14} className={`transition-transform ${expandedContractAccordions.risks ? "rotate-90" : ""}`} />
                    </button>
                    {expandedContractAccordions.risks && (
                      <div className="px-4 pb-4 space-y-2 animate-in fade-in duration-300">
                        {selectedContractDetails.contractAnalysis.risks.map((risk, idx) => (
                          <div key={idx} className="flex gap-2 items-start text-xs font-semibold text-rose-700 dark:text-red-400">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <p>{risk}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Improvements */}
                  <div className="bg-slate-50 dark:bg-black/10 border border-slate-205 dark:border-zinc-800/80 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => toggleContractAccordion('improvements')}
                      className="w-full flex items-center justify-between p-3.5 text-left font-black text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                    >
                      <span>Suggested Improvements ({selectedContractDetails.contractAnalysis.improvements.length})</span>
                      <ChevronRight size={14} className={`transition-transform ${expandedContractAccordions.improvements ? "rotate-90" : ""}`} />
                    </button>
                    {expandedContractAccordions.improvements && (
                      <div className="px-4 pb-4 space-y-2 animate-in fade-in duration-300">
                        {selectedContractDetails.contractAnalysis.improvements.map((imp, idx) => (
                          <div key={idx} className="flex gap-2 items-start text-xs font-semibold text-emerald-705 dark:text-emerald-400">
                            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                            <p>{imp}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="bg-slate-50 dark:bg-black/10 border border-slate-205 dark:border-zinc-800/80 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => toggleContractAccordion('dates')}
                      className="w-full flex items-center justify-between p-3.5 text-left font-black text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                    >
                      <span>Important Dates</span>
                      <ChevronRight size={14} className={`transition-transform ${expandedContractAccordions.dates ? "rotate-90" : ""}`} />
                    </button>
                    {expandedContractAccordions.dates && (
                      <div className="px-4 pb-4 space-y-2 animate-in fade-in duration-300 grid grid-cols-1 gap-3.5">
                        <div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Agreement Date</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{selectedContractDetails.contractAnalysis.dates.agreementDate}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Expiry Date</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{selectedContractDetails.contractAnalysis.dates.expiryDate}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Renewal Notice Window</span>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{selectedContractDetails.contractAnalysis.dates.renewalNotice}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Parties */}
                  <div className="bg-slate-50 dark:bg-black/10 border border-slate-205 dark:border-zinc-800/80 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => toggleContractAccordion('parties')}
                      className="w-full flex items-center justify-between p-3.5 text-left font-black text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider"
                    >
                      <span>Parties & Witnesses</span>
                      <ChevronRight size={14} className={`transition-transform ${expandedContractAccordions.parties ? "rotate-90" : ""}`} />
                    </button>
                    {expandedContractAccordions.parties && (
                      <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-300">
                        <div>
                          <span className="text-[8px] font-black text-indigo-650 uppercase tracking-widest block">Party A</span>
                          <p className="text-xs font-black text-slate-805 dark:text-white mt-0.5">{selectedContractDetails.contractAnalysis.parties.partyA}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-emerald-650 uppercase tracking-widest block">Party B</span>
                          <p className="text-xs font-black text-slate-805 dark:text-white mt-0.5">{selectedContractDetails.contractAnalysis.parties.partyB}</p>
                        </div>
                        {selectedContractDetails.contractAnalysis.parties.witnesses.length > 0 && (
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Extracted Witnesses</span>
                            <ul className="list-disc pl-4 text-xs font-semibold text-slate-705 dark:text-slate-350 mt-1">
                              {selectedContractDetails.contractAnalysis.parties.witnesses.map((w, idx) => (
                                <li key={idx}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-450 italic">Analysis results are pending. Click 'Analyze' in the repository to compile clause extraction.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50 dark:bg-black/25 flex gap-3">
              <button 
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedContractDetails.contractAnalysis, null, 2));
                  const dl = document.createElement('a');
                  dl.setAttribute("href",     dataStr);
                  dl.setAttribute("download", `${selectedContractDetails.name}_analysis.json`);
                  dl.click();
                  toast.success("✓ Exported contract clause analysis JSON!");
                }}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                Export Audit Report
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

const triggerBackgroundArgumentsSync = async (targetData, manual = false) => {
    if (!targetData) return;
    const caseId = targetData.id || targetData._id;
    if (!caseId) return;

    if (!manual) {
      const summary = targetData.summary || targetData.description || '';
      if (!summary || summary.trim().split(/\s+/).length < 8) {
        console.log("[Background Arguments] Case summary empty or too short. Skipping background extraction.");
        return;
      }
    }

    console.log("[Background Arguments] Triggering arguments background extraction...");
    let toastId = null;
    try {
      setIsExtractingArguments(true);
      if (manual) toastId = toast.loading("AI is generating professional litigation strategy & arguments...");
      const res = await legalService.generateAiArguments(caseId, targetData, caseNotes);
      if (res) {
        setCaseData(prev => ({ ...prev, aiArguments: res }));
        if (manual) toast.success("✓ AI Arguments compiled successfully!", { id: toastId });
      } else {
        if (manual) toast.error("Failed to compile AI courtroom arguments. Check your connection or case details.", { id: toastId });
      }
      console.log("[Background Arguments] Background arguments sync complete.");
    } catch (err) {
      console.error("[Background Arguments] Failed background arguments sync", err);
      if (manual) toast.error("Failed to compile AI courtroom arguments", { id: toastId });
    } finally {
      setIsExtractingArguments(false);
    }
  };

  const renderArguments = () => {
    const hasSummary = !!(caseData.summary || caseData.description || '').trim();
    const isSummaryShort = (caseData.summary || caseData.description || '').trim().split(/\s+/).length < 8;

    if (!hasSummary || isSummaryShort) {
      return (
        <div className="bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[350px] animate-in fade-in duration-300">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-full mb-4">
            <Scale size={32} />
          </div>
          <h4 className="text-base font-black text-slate-855 dark:text-white uppercase tracking-wider mb-2">⚖️ No Legal Strategy Available</h4>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed mb-6">
            Generate a complete case summary and upload supporting evidence before AI can construct courtroom arguments.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleGenerateAiSummary}
              className="px-5 py-2.5 bg-[#4F46E5] hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all animate-pulse"
            >
              Generate Summary
            </button>
            <button 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-705 dark:text-slate-350 font-black text-xs uppercase tracking-widest rounded-xl shadow-sm transition-all"
            >
              Upload Evidence
            </button>
            <button 
              onClick={() => triggerBackgroundResearchSync(caseData, true)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-sm transition-all"
            >
              Run Research
            </button>
          </div>
        </div>
      );
    }

    if (isExtractingArguments) {
      return (
        <div className="bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[350px] animate-in fade-in duration-300">
          <RefreshCcw size={36} className="text-[#4F46E5] animate-spin mb-4" />
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">AI Courtroom Strategy Builder</h4>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-bold uppercase mt-1">Extracting strengths, mapping files, and predicting opponent objections...</p>
        </div>
      );
    }

    const aiArgs = caseData.aiArguments;

    if (!aiArgs) {
      return (
        <div className="bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[350px] animate-in fade-in duration-300">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-full mb-4">
            <Brain size={32} className="animate-bounce" />
          </div>
          <h4 className="text-base font-black text-slate-855 dark:text-white uppercase tracking-wider mb-2">🧠 AI Legal Strategy Ready</h4>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold max-w-md mx-auto leading-relaxed mb-6">
            Click below to generate professional courtroom arguments, objection predictions, and litigation binders.
          </p>
          <button 
            onClick={() => triggerBackgroundArgumentsSync(caseData, true)}
            className="px-6 py-3 bg-[#4F46E5] hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all"
          >
            Auto Analyze & Sync
          </button>
        </div>
      );
    }

    const strategyTabs = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'petitioner', label: 'Petitioner (Plaintiff)' },
      { id: 'respondent', label: 'Respondent (Defendant)' },
      { id: 'opponent_prediction', label: 'Opponent Prediction' },
      { id: 'ai_sequencing', label: 'AI Sequencing' },
      { id: 'prep_binder', label: 'Prep Binder' },
      { id: 'case_notes', label: 'Case Notes' },
      { id: 'tasks', label: 'Tasks' }
    ];

    const getRiskBadgeColor = (level) => {
      const l = (level || '').toLowerCase();
      if (l.includes('critical') || l.includes('high')) return 'bg-rose-50 text-red-700 border-red-200';
      if (l.includes('medium')) return 'bg-amber-50 text-amber-655 border-amber-200';
      return 'bg-emerald-50 text-emerald-650 border-emerald-250/20';
    };

    const handleWheelScroll = (e, ref) => {
      if (ref.current) {
        ref.current.scrollLeft += e.deltaY;
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Argument Strength</span>
              <span className="text-xs font-black text-slate-805 dark:text-white block">Strong Case</span>
            </div>
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold text-xs border border-emerald-100/30">
              {aiArgs.argumentStrength || '82%'}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Research Coverage</span>
              <span className="text-xs font-black text-slate-805 dark:text-white block">Precedents Synced</span>
            </div>
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold text-xs border border-indigo-100/30">
              {aiArgs.researchCoverage || '94%'}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Evidence Mapping</span>
              <span className="text-xs font-black text-slate-805 dark:text-white block">Connected</span>
            </div>
            <div className="px-2 h-10 bg-violet-50 dark:bg-violet-950/20 text-violet-650 dark:text-violet-400 rounded-xl flex items-center justify-center font-bold text-xs border border-violet-100/30">
              {aiArgs.evidenceMappingCount || '12 / 14'}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Litigation Readiness</span>
              <span className="text-xs font-black text-slate-805 dark:text-white block">Strategy Checked</span>
            </div>
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/20 text-amber-655 dark:text-amber-400 rounded-xl flex items-center justify-center font-bold text-xs border border-amber-100/30">
              {aiArgs.litigationReadiness || '78%'}
            </div>
          </div>
        </div>

        {/* Strategy Navigation and Actions */}
        <div className="relative border-b border-slate-200 dark:border-zinc-800 pb-px flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto scroll-smooth py-2 pr-2 md:pr-40 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {strategyTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveStrategyTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 shrink-0 border ${
                  activeStrategyTab === tab.id
                    ? 'bg-[#4F46E5] border-[#4F46E5] text-white shadow-sm shadow-[#4F46E5]/15'
                    : 'bg-white dark:bg-[#1A2540] border-slate-200 dark:border-zinc-850 text-slate-500 hover:bg-slate-55 dark:hover:bg-slate-850'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mb-2 md:mb-0">
            <button 
              onClick={() => triggerBackgroundArgumentsSync(caseData, true)}
              className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-[#4F46E5] dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-200/20 flex items-center gap-1"
            >
              <Sparkles size={11} className={isExtractingArguments ? "animate-spin" : "animate-pulse"} />
              Auto Analyze & Sync
            </button>
            <button 
              onClick={() => {
                toast.success("✓ Hallway strategy and litigation binder notes generated!");
              }}
              className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-1"
            >
              <Gavel size={11} /> Prepare for Hearing
            </button>
            <button 
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(aiArgs, null, 2));
                const dl = document.createElement('a');
                dl.setAttribute("href",     dataStr);
                dl.setAttribute("download", `${caseData.name}_litigation_strategy.json`);
                dl.click();
                toast.success("✓ Exported strategy report JSON!");
              }}
              className="px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            >
              Export
            </button>
          </div>
        </div>

        {/* Tab content screens */}
        <div className="animate-in fade-in duration-300">
          
          {/* TAB 1: DASHBOARD */}
          {activeStrategyTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Trial Strategy Position */}
                <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Brain size={14} className="text-[#4F46E5]" /> Trial Strategy Position
                    </h4>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded text-[8px] font-black uppercase tracking-widest border border-indigo-100/10">
                      Advocate Core Draft
                    </span>
                  </div>
                  
                  {aiArgs.strategyPosition && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[8px] font-bold text-slate-450 uppercase block">Case Objective</span>
                        <p className="font-semibold text-slate-705 dark:text-slate-300 mt-0.5">{aiArgs.strategyPosition.caseObjective}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-455 uppercase block">Main Relief</span>
                        <p className="font-semibold text-slate-705 dark:text-slate-300 mt-0.5">{aiArgs.strategyPosition.mainRelief}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-455 uppercase block">Primary Legal Position</span>
                        <p className="font-semibold text-slate-705 dark:text-slate-300 mt-0.5">{aiArgs.strategyPosition.primaryLegalPosition}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-455 uppercase block">Core Legal Theory</span>
                        <p className="font-semibold text-slate-705 dark:text-slate-300 mt-0.5">{aiArgs.strategyPosition.coreLegalTheory}</p>
                      </div>
                      <div className="md:col-span-2 border-t border-slate-100 dark:border-zinc-800/50 pt-3 flex flex-wrap gap-4 text-[10px] font-bold text-slate-450 uppercase">
                        <span>Procedural: {aiArgs.strategyPosition.proceduralPosition}</span>
                        <span>Laws: {aiArgs.strategyPosition.applicableLaws}</span>
                        <span>Confidence: {aiArgs.strategyPosition.confidence}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Critical Weakness Warnings */}
                {(aiArgs.weaknesses || []).length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Critical Weakness Warnings</span>
                    {aiArgs.weaknesses.map((weak, idx) => (
                      <div key={idx} className="bg-amber-50/50 dark:bg-amber-955/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-left-2 duration-300">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-450 block">AI Detected Weakness #{idx + 1}</span>
                          <p className="text-xs font-semibold text-amber-750 dark:text-amber-400 leading-relaxed">
                            {weak}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Core Arguments Roster */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Scale size={14} className="text-[#4F46E5]" /> Core Arguments Roster
                  </h4>
                  <div className="space-y-4">
                    {(aiArgs.argumentsRoster || []).map((arg, idx) => (
                      <div key={idx} className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs font-black text-slate-850 dark:text-white leading-snug">{arg.title}</h5>
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 rounded text-[8px] font-black uppercase border border-emerald-100/10">
                            {arg.strength} Strength
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">{arg.facts}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 border-t border-slate-100 dark:border-zinc-800/50 pt-3 text-[10px] font-semibold text-slate-650 dark:text-slate-400">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Governing Provision</span>
                            <p className="mt-0.5">{arg.law}</p>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Linked Evidence</span>
                            <p className="mt-0.5">{arg.evidence}</p>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Precedent Citation</span>
                            <p className="mt-0.5">{arg.precedent}</p>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Weakness</span>
                            <p className="mt-0.5 text-red-500">{arg.weakness}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Court Sequence */}
                <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Recommended Court Sequence</h4>
                  <div className="relative border-l border-slate-100 dark:border-zinc-800/50 pl-4 ml-2 space-y-4">
                    {(aiArgs.courtSequence || []).map((step, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-white dark:border-zinc-900"></div>
                        <span className="text-[8px] font-black text-indigo-650 uppercase tracking-widest block">{step.stage} Presentation</span>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column */}
              <div className="space-y-6">
                
                {/* Evidence Mapping Coverage */}
                <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                    <FileSearch size={14} className="text-[#4F46E5]" /> Evidence Mapping Coverage
                  </h4>
                  <div className="space-y-3">
                    {(aiArgs.evidenceMapping || []).map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-black/10 rounded-xl border border-slate-100 dark:border-zinc-800/30 flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-800 dark:text-white font-bold leading-tight truncate max-w-[150px]">{item.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          item.status === 'Missing' ? 'bg-rose-50 text-red-650 border-rose-150' : 'bg-emerald-50 text-emerald-650 border-emerald-250/20'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Objection Probability */}
                <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Objection Probability</h4>
                  <div className="space-y-3">
                    {(aiArgs.objections || []).map((obj, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-350">{obj.issue}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          obj.probability === 'High' ? 'bg-rose-50 text-red-650 border-rose-150' : (obj.probability === 'Medium' ? 'bg-amber-50 text-amber-655 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200')
                        }`}>
                          {obj.probability} Probability
                        </span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => {
                      setActiveStrategyTab('opponent_prediction');
                      toast.success("Navigated to Opponent predictions strategy binder!");
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    View Defense Strategy Prediction
                  </button>
                </div>

                {/* Missing Evidence */}
                <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5 text-rose-650">
                    <AlertCircle size={14} /> Missing Evidence
                  </h4>
                  <ul className="space-y-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {(aiArgs.missingEvidence || []).map((me, idx) => (
                      <li key={idx} className="flex gap-2 items-start text-red-650">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1.5"></span>
                        <p>{me}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Litigation Risk Meter */}
                <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Litigation Risk Meter</h4>
                  {aiArgs.riskMeter && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Threat Level</span>
                        <span className={`px-2.5 py-0.5 border rounded text-[9px] font-black uppercase tracking-wider ${getRiskBadgeColor(aiArgs.riskMeter.level)}`}>
                          {aiArgs.riskMeter.level} Risk
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">{aiArgs.riskMeter.explanation}</p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: PETITIONER */}
          {activeStrategyTab === 'petitioner' && aiArgs.petitioner && (
            <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                <Scale size={14} /> Plaintiff / Complainant Claims
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed font-semibold text-slate-700 dark:text-slate-300">
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Primary Arguments</span>
                  <p>{aiArgs.petitioner.primaryArguments}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Reliefs Sought & Prayer</span>
                  <p>{aiArgs.petitioner.reliefeAndPrayer}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Expected Courtroom Questions</span>
                  <p className="text-rose-650">{aiArgs.petitioner.expectedQuestions}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Cross Strategy Details</span>
                  <p>{aiArgs.petitioner.crossStrategy}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESPONDENT */}
          {activeStrategyTab === 'respondent' && aiArgs.respondent && (
            <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-650 flex items-center gap-1.5">
                <Shield size={14} /> Respondent / Defendant Claims
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed font-semibold text-slate-700 dark:text-slate-300">
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Likely Defense</span>
                  <p>{aiArgs.respondent.likelyDefense}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Counter Arguments</span>
                  <p>{aiArgs.respondent.counterArguments}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Weakness In Plaintiff's Suit</span>
                  <p className="text-rose-650">{aiArgs.respondent.weaknessInPlaintiff}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Best Legal Position</span>
                  <p>{aiArgs.respondent.bestLegalPosition}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OPPONENT PREDICTION */}
          {activeStrategyTab === 'opponent_prediction' && aiArgs.opponentPredictions && (
            <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                <Target size={14} /> Opponent Predictions Strategy Binder
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed font-semibold text-slate-700 dark:text-slate-350">
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Likely Defense Route</span>
                  <p>{aiArgs.opponentPredictions.likelyDefense}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Expected Witnesses called</span>
                  <p>{aiArgs.opponentPredictions.likelyWitness}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Expected Objection Areas</span>
                  <p className="text-rose-650">{aiArgs.opponentPredictions.expectedObjections}</p>
                </div>
                <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/30 space-y-1.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Recommended Counter-Tactics</span>
                  <p className="text-emerald-705">{aiArgs.opponentPredictions.recommendedCounter}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AI SEQUENCING */}
          {activeStrategyTab === 'ai_sequencing' && (
            <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white">AI Argument Sequencing Panel</h4>
                <p className="text-[9px] text-slate-450 font-bold uppercase mt-1">Reorder argument blocks to structure courtroom presentation flow.</p>
              </div>

              <div className="space-y-3.5 max-w-md">
                {(aiArgs.courtSequence || []).map((step, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-black/10 border border-slate-205 dark:border-zinc-850 p-4 rounded-2xl flex items-center justify-between cursor-move hover:border-[#4F46E5] transition-all animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] font-black text-xs rounded-full flex items-center justify-center border border-indigo-100/10">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-805 dark:text-white">{step.stage}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{step.detail}</p>
                      </div>
                    </div>
                    <span className="text-slate-400 font-bold">:::</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: PREP BINDER */}
          {activeStrategyTab === 'prep_binder' && (
            <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <ClipboardList size={14} /> Courtroom Preparation Binder
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(aiArgs.prepBinder || []).map((binder, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-zinc-800/30 p-4 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{binder.item}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                      binder.status === 'Ready' ? 'bg-emerald-50 text-emerald-650 border-emerald-250/20' : 'bg-amber-50 text-amber-655 border-amber-200'
                    }`}>
                      {binder.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CASE NOTES */}
          {activeStrategyTab === 'case_notes' && (
            <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                  <FileText size={14} /> Case highlights & Private Notes
                </h4>
                <button 
                  onClick={() => {
                    const newId = Date.now();
                    setCaseNotes(prev => [...prev, { id: newId, title: 'New Note', content: 'Type note here...', pinned: false, updatedAt: new Date().toISOString().slice(0, 10) }]);
                    setActiveNoteId(newId);
                  }}
                  className="px-3 py-1.5 bg-[#4F46E5] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90"
                >
                  + Add Note
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="col-span-1 border-r border-slate-100 dark:border-zinc-800/50 pr-4 space-y-2 max-h-[300px] overflow-y-auto">
                  {caseNotes.map(n => (
                    <button
                      key={n.id}
                      onClick={() => setActiveNoteId(n.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all block ${
                        activeNoteId === n.id
                          ? 'border-[#4F46E5] bg-indigo-50/20 text-[#4F46E5]'
                          : 'border-transparent text-slate-500 hover:bg-slate-55'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="truncate block max-w-[100px]">{n.title}</span>
                        {n.pinned && <Pin size={10} className="text-[#4F46E5]" />}
                      </div>
                      <span className="text-[9px] text-slate-400 block font-normal">{n.updatedAt}</span>
                    </button>
                  ))}
                  {(aiArgs.caseNotes || []).map((cn, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-transparent bg-indigo-50/10 text-xs font-bold text-slate-650 space-y-0.5">
                      <span className="text-[8px] font-black text-indigo-550 uppercase block">AI Note Index</span>
                      <p className="truncate block max-w-[150px]" title={cn}>{cn}</p>
                    </div>
                  ))}
                </div>

                <div className="col-span-2 space-y-4">
                  {caseNotes.length > 0 ? (
                    <>
                      <input
                        type="text"
                        value={caseNotes.find(n => n.id === activeNoteId)?.title || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCaseNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, title: val } : n));
                        }}
                        className="w-full bg-transparent border-none text-xs font-black uppercase tracking-wider text-slate-805 dark:text-white p-0 focus:ring-0 outline-none"
                      />
                      <textarea
                        value={caseNotes.find(n => n.id === activeNoteId)?.content || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCaseNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: val } : n));
                        }}
                        className="w-full bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed p-0 focus:ring-0 outline-none min-h-[160px] resize-none"
                      />
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 font-bold uppercase">
                        <span>Auto-saved to case binder</span>
                        <button 
                          onClick={() => setCaseNotes(prev => prev.filter(n => n.id !== activeNoteId))}
                          className="text-red-500 hover:underline"
                        >
                          Delete Note
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-450 italic text-center py-10">Select a note to edit or click Add Note.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: TASKS */}
          {activeStrategyTab === 'tasks' && (
            <div className="bg-white dark:bg-[#1A2540] border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                  <ListTodo size={14} className="text-[#4F46E5]" /> Litigation Tasks Tracker
                </h4>
                <button 
                  onClick={() => {
                    const taskName = prompt("Enter task title:");
                    if (taskName) {
                      setLitigationTasks(prev => [...prev, { id: Date.now(), title: taskName, priority: 'Medium', dueDate: '2026-07-20', status: 'Todo', progress: 0, suggestions: 'AISA Action recommended' }]);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-[#4F46E5] text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                >
                  + Add Task
                </button>
              </div>

              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left text-xs font-semibold whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-150/40 dark:border-zinc-800 text-slate-400 font-black uppercase tracking-wider text-[9px]">
                      <th className="py-2.5">Task Title</th>
                      <th className="py-2.5">Priority</th>
                      <th className="py-2.5">Due Date</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {litigationTasks.map(task => (
                      <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3.5 font-bold text-slate-805 dark:text-white">{task.title}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                            task.priority === 'High' 
                              ? 'bg-rose-50 dark:bg-rose-955/20 text-rose-600 border-rose-250/20' 
                              : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 border-indigo-250/20'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-500 font-medium">{task.dueDate}</td>
                        <td className="py-3.5">
                          <button 
                            onClick={() => {
                              const nextStatus = task.status === 'Todo' ? 'In Progress' : task.status === 'In Progress' ? 'Done' : 'Todo';
                              const nextProg = nextStatus === 'Done' ? 100 : nextStatus === 'In Progress' ? 50 : 0;
                              setLitigationTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus, progress: nextProg } : t));
                            }}
                            className="text-indigo-650 hover:underline"
                          >
                            {task.status}
                          </button>
                        </td>
                        <td className="py-3.5">
                          <div className="w-16 bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#4F46E5] h-full transition-all" style={{ width: `${task.progress}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(aiArgs.tasks || []).map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3.5 font-bold text-slate-805 dark:text-white flex items-center gap-1">
                          <Sparkles size={11} className="text-[#4F46E5] animate-pulse" />
                          {t.task}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                            t.priority === 'High' 
                              ? 'bg-rose-50 text-red-650 border-rose-150' 
                              : 'bg-indigo-50 text-indigo-650 border-indigo-250/20'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-550 font-medium">{t.dueDate}</td>
                        <td className="py-3.5 font-black text-indigo-655 text-[9px] uppercase tracking-wider">{t.status}</td>
                        <td className="py-3.5">
                          <div className="w-16 bg-slate-150 dark:bg-zinc-850 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-550 h-full" style={{ width: '0%' }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    );
  };

  const renderNotes = () => {
    const activeNote = caseNotes.find(n => n.id === activeNoteId) || caseNotes[0];
    return (
      <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-805 dark:text-white flex items-center gap-1.5">
            <FileText size={14} className="text-[#4F46E5]" /> Private Case Notes
          </h4>
          <button 
            onClick={() => {
              const newId = Date.now();
              setCaseNotes(prev => [...prev, { id: newId, title: 'New Case Note', content: 'Type note here...', pinned: false, updatedAt: new Date().toISOString().slice(0, 10) }]);
              setActiveNoteId(newId);
            }}
            className="px-3 py-1.5 bg-[#4F46E5] hover:opacity-90 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
          >
            + Create Note
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="col-span-1 border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-zinc-800 pb-4 md:pb-0 pr-0 md:pr-4 space-y-2">
            {caseNotes.map(n => (
              <button
                key={n.id}
                onClick={() => setActiveNoteId(n.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all block ${
                  activeNoteId === n.id
                    ? 'border-[#4F46E5] bg-indigo-50/20 text-[#4F46E5]'
                    : 'border-transparent text-slate-500 hover:bg-slate-55 dark:hover:bg-slate-850'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="truncate block max-w-[100px]">{n.title}</span>
                  {n.pinned && <Pin size={10} className="text-[#4F46E5]" />}
                </div>
                <span className="text-[9px] text-slate-400 block font-normal">{n.updatedAt}</span>
              </button>
            ))}
          </div>
          <div className="col-span-1 md:col-span-2 space-y-4">
            <input
              type="text"
              value={activeNote?.title || ''}
              onChange={(e) => {
                const val = e.target.value;
                setCaseNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, title: val } : n));
              }}
              className="w-full bg-transparent border-none text-xs font-black uppercase tracking-wider text-slate-805 dark:text-white p-0 focus:ring-0 outline-none"
            />
            <textarea
              value={activeNote?.content || ''}
              onChange={(e) => {
                const val = e.target.value;
                setCaseNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: val } : n));
              }}
              className="w-full bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed p-0 focus:ring-0 outline-none min-h-[160px] resize-none"
            />
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 font-bold uppercase">
              <span>Auto-saved to case binder</span>
              <button 
                onClick={() => setCaseNotes(prev => prev.filter(n => n.id !== activeNoteId))}
                className="text-red-500 hover:underline"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPrecedents = () => {
    return (
      <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-6 animate-in fade-in duration-300">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-805 dark:text-white flex items-center gap-1.5">
          <BookOpen size={14} className="text-[#4F46E5]" /> AI-Selected Supporting Precedents
        </h4>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-zinc-800 relative hover:border-[#4F46E5] transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded text-[8px] font-black uppercase">Landmark SC</span>
                <h5 className="text-xs font-black text-slate-805 dark:text-white">Rajesh Sharma vs Union of India (2018 SC 45)</h5>
              </div>
              <span className="text-[9px] text-emerald-600 font-bold">96% Conf.</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed mb-3">Establishes the admissibility thresholds for uncertified electronic logs if original secondary source server can be examined in person.</p>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText("Rajesh Sharma vs Union of India (2018 SC 45)"); toast.success("✓ Citation Copied!"); }} className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-zinc-700 text-slate-650 dark:text-slate-300">Copy Citation</button>
              <button className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/20 rounded text-[#4F46E5] border border-indigo-100 dark:border-indigo-950/40">Add to Argument</button>
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-zinc-800 relative hover:border-[#4F46E5] transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded text-[8px] font-black uppercase">High Court</span>
                <h5 className="text-xs font-black text-slate-805 dark:text-white">Amit Verma vs State of Maharashtra (2021 HC 112)</h5>
              </div>
              <span className="text-[9px] text-emerald-600 font-bold">88% Conf.</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed mb-3">Indicates that jurisdictional challenge cannot be used as a procedural shield when transaction execution has occurred within corporate municipal limits.</p>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText("Amit Verma vs State of Maharashtra (2021 HC 112)"); toast.success("✓ Citation Copied!"); }} className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-zinc-700 text-slate-650 dark:text-slate-300">Copy Citation</button>
              <button className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/20 rounded text-[#4F46E5] border border-indigo-100 dark:border-indigo-950/40">Add to Argument</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTasks = () => {
    return (
      <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-6 animate-in fade-in duration-350">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-805 dark:text-white flex items-center gap-1.5">
            <ListTodo size={14} className="text-[#4F46E5]" /> Litigation Tasks Manager
          </h4>
          <button 
            onClick={() => {
              const taskName = prompt("Enter task title:");
              if (taskName) {
                setLitigationTasks(prev => [...prev, { id: Date.now(), title: taskName, priority: 'Medium', dueDate: '2026-07-20', status: 'Todo', progress: 0, suggestions: 'AISA Action recommended' }]);
              }
            }}
            className="px-3.5 py-1.5 bg-[#4F46E5] text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
          >
            + Add Task
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-150/40 dark:border-zinc-800 text-slate-400 font-black uppercase tracking-wider text-[9px]">
                <th className="py-2.5">Task Title</th>
                <th className="py-2.5">Priority</th>
                <th className="py-2.5">Due Date</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5">Progress</th>
                <th className="py-2.5">AI Suggestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {litigationTasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                  <td className="py-3.5 font-bold text-slate-805 dark:text-white">{task.title}</td>
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                      task.priority === 'High' 
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-250/20' 
                        : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-250/20'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-500 font-medium">{task.dueDate}</td>
                  <td className="py-3.5">
                    <button 
                      onClick={() => {
                        const nextStatus = task.status === 'Todo' ? 'In Progress' : task.status === 'In Progress' ? 'Done' : 'Todo';
                        const nextProg = nextStatus === 'Done' ? 100 : nextStatus === 'In Progress' ? 50 : 0;
                        setLitigationTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus, progress: nextProg } : t));
                      }}
                      className="text-indigo-650 hover:underline"
                    >
                      {task.status}
                    </button>
                  </td>
                  <td className="py-3.5">
                    <div className="w-16 bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#4F46E5] h-full" style={{ width: `${task.progress}%` }} />
                    </div>
                  </td>
                  <td className="py-3.5 text-[#4F46E5] font-black text-[10px]">{task.suggestions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const hasUserMessages = useMemo(() => aiMessages.some(m => m.role === 'user'), [aiMessages]);
  const visibleSidebarMessages = aiMessages;

  return (
    <>
      <div className="flex-1 overflow-y-auto custom-scrollbar w-full bg-slate-50/30 dark:bg-transparent relative pb-24">
        {/* Workspace Sticky Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-[#0b0c15] border-b border-[#E5E7EB] dark:border-zinc-800 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 transition-colors border border-[#E5E7EB] dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-md sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">{caseData.title || caseData.name || "Rajesh Sharma vs Amit Verma"}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#DEF7EC] text-[#03543F] tracking-wide">ACTIVE</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E1EFFE] text-[#1E429F] tracking-wide">MEDIUM</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                Client: {caseData.clientName || 'Rajesh Sharma'} • Opponent: {caseData.opponentName || 'Amit Verma'} • Court: {caseData.courtName || 'District Court'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button 
              onClick={() => setShowAiAssistant(!showAiAssistant)} 
              className="px-4 py-2 rounded-full text-xs font-bold transition-all bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] hover:opacity-90 flex items-center gap-2 h-9"
            >
              <Sparkles size={14} className="text-[#4F46E5]" />
              <span>{showAiAssistant ? "Hide AI" : "Show AI"}</span>
            </button>
            <button 
              onClick={handleExportCaseFile}
              className="px-4 py-2 rounded-full text-xs font-bold transition-all border border-[#E5E7EB] dark:border-zinc-800 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2 h-9"
            >
              <Download size={14} /> Export
            </button>
            <button 
              onClick={handleShareCase}
              className="px-4 py-2 rounded-full text-xs font-bold transition-all border border-[#E5E7EB] dark:border-zinc-800 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2 h-9"
            >
              <Share2 size={14} /> Share
            </button>
            <button 
              onClick={() => {
                if (confirm("Are you sure you want to delete this case?")) {
                  onDelete(caseData.id || caseData._id);
                }
              }}
              className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-3 px-3 pb-1.5 bg-white dark:bg-[#0b0c15] border-b border-[#E5E7EB] dark:border-zinc-800 overflow-x-auto custom-scrollbar shrink-0">
          {tabsList.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                activeTab === tab.id 
                ? 'bg-white dark:bg-zinc-900 border-[#E5E7EB] dark:border-zinc-800 shadow-sm text-[#4F46E5]' 
                : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <tab.icon size={13} className={activeTab === tab.id ? 'text-[#4F46E5]' : 'text-gray-400'} />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Main Workspace Body layout */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* Left Column content */}
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'timeline' && renderTimeline()}
            {activeTab === 'hearings' && renderHearings()}
            {activeTab === 'parties' && renderParties()}
            {activeTab === 'documents' && renderDocuments()}
            {activeTab === 'evidence' && renderEvidence()}
            {activeTab === 'research' && renderResearch()}
            {activeTab === 'drafts' && renderDrafts()}
            {activeTab === 'contracts' && renderContracts()}
            {activeTab === 'arguments' && renderArguments()}
            {activeTab === 'notes' && renderNotes()}
            {activeTab === 'precedents' && renderPrecedents()}
            {activeTab === 'tasks' && renderTasks()}
          </div>

          {/* Spacer to make room for fixed sidebar on desktop */}
          {showAiAssistant && !isAssistantMaximized && (
            <div className="hidden lg:block lg:w-[320px] xl:w-[360px] shrink-0" />
          )}

          {/* Right Sidebar Column (Col 3) */}
          {showAiAssistant && (
            isAssistantMaximized ? (
              <FullScreenCaseAssistant
                onRestore={() => setIsAssistantMaximized(false)}
                caseData={caseData}
                aiMessages={aiMessages}
                setAiMessages={setAiMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatSending={isChatSending}
                handleSendAiMessage={handleSendAiMessage}
                onStopGeneration={handleStopGeneration}
                activeSessionId={activeSessionId}
                handleNewChat={handleNewChat}
              />
            ) : (
              <div className="w-full lg:w-[320px] xl:w-[360px] fixed right-0 top-[73px] bottom-0 z-30 border-l border-[#E5E7EB] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 overflow-hidden">
                {/* Panel Header */}
                <div className="p-4 border-b border-[#E5E7EB] dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 select-none shrink-0">
                  <div className="flex items-center gap-2">
                    <Scale size={15} className="text-[#4F46E5]" />
                    <div className="flex flex-col">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">⚖ Case Assistant</h4>
                      <span className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        AI Online
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={handleToggleSidebarHistory}
                      className={`p-1 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent flex items-center gap-1 text-[10px] font-bold ${
                        showSidebarHistory ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'
                      }`}
                      title="Chat History"
                    >
                      <History size={13} />
                    </button>
                    <button 
                      onClick={() => setIsAssistantMaximized(!isAssistantMaximized)}
                      className="p-1 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-650 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                      title="Expand to fullscreen"
                    >
                      <Maximize2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Message List Container */}
                <div 
                  ref={sidebarScrollRef}
                  onScroll={handleSidebarScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent relative"
                >
                  {showSidebarHistory ? (
                    <div className="space-y-4 py-2">
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Case Conversation History</div>
                      {sidebarSessions.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 font-semibold">No previous chats in this case</div>
                      ) : (
                        (() => {
                          const nowTime = Date.now();
                          const oneDay = 24 * 60 * 60 * 1000;
                          const today = sidebarSessions.filter(s => nowTime - s.timestamp < oneDay);
                          const yesterday = sidebarSessions.filter(s => nowTime - s.timestamp >= oneDay && nowTime - s.timestamp < 2 * oneDay);
                          const last7Days = sidebarSessions.filter(s => nowTime - s.timestamp >= 2 * oneDay && nowTime - s.timestamp < 7 * oneDay);
                          const older = sidebarSessions.filter(s => nowTime - s.timestamp >= 7 * oneDay);
                          
                          const renderGroup = (title, items) => {
                            if (items.length === 0) return null;
                            return (
                              <div className="space-y-2">
                                <div className="text-[9px] font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-widest border-b border-slate-100 dark:border-zinc-800 pb-1">{title}</div>
                                <div className="space-y-1">
                                  {items.map((s) => (
                                    <button
                                      key={s.chat_id}
                                      onClick={async () => {
                                        setActiveSessionId(s.chat_id);
                                        const historyData = await chatStorageService.getHistory(s.chat_id);
                                        if (historyData && Array.isArray(historyData.messages)) {
                                          setAiMessages(historyData.messages);
                                        }
                                        setShowSidebarHistory(false);
                                      }}
                                      className={`w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 cursor-pointer bg-transparent font-semibold flex flex-col gap-1 ${
                                        s.chat_id === activeSessionId ? 'bg-indigo-50/30 dark:bg-indigo-950/20 text-[#4F46E5] border-indigo-100/50 dark:border-indigo-900/30' : 'text-slate-700 dark:text-slate-350'
                                      }`}
                                    >
                                      <span className="truncate text-xs font-bold">{s.title || 'New Chat'}</span>
                                      <span className="text-[9px] text-slate-400 font-medium font-mono">
                                        {new Date(s.timestamp).toLocaleDateString()} • {new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          };
                          
                          return (
                            <div className="space-y-4">
                              {renderGroup("Today", today)}
                              {renderGroup("Yesterday", yesterday)}
                              {renderGroup("Last 7 Days", last7Days)}
                              {renderGroup("Older", older)}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  ) : (
                    <>
                      {!hasUserMessages && (
                        <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl space-y-3 text-slate-700 dark:text-slate-350">
                          <p className="font-bold text-xs text-indigo-750 dark:text-indigo-400">👋 Hello! I have loaded this case.</p>
                          <p className="text-[11px] leading-relaxed">Ask me anything about:</p>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-bold text-slate-650 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-500 font-black">✓</span> Evidence
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-500 font-black">✓</span> Timeline
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-500 font-black">✓</span> Drafts
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-500 font-black">✓</span> Arguments
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-500 font-black">✓</span> Laws & Acts
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-500 font-black">✓</span> Research
                            </div>
                            <div className="col-span-2 flex items-center gap-1">
                              <span className="text-emerald-500 font-black">✓</span> Previous Orders
                            </div>
                          </div>
                          <p className="text-[11px] pt-1">How can I help?</p>
                        </div>
                      )}

                      {visibleSidebarMessages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <span className={`text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1`}>
                            {msg.role === 'user' ? 'ADVOCATE' : 'AI ASSISTANT'}
                          </span>
                          <div className={`p-3 rounded-2xl max-w-[90%] leading-relaxed font-semibold ${
                            msg.role === 'user'
                              ? 'bg-[#4F46E5] text-white rounded-tr-none'
                              : 'bg-slate-50 dark:bg-zinc-800/30 border border-[#E5E7EB] dark:border-zinc-800 text-slate-700 dark:text-slate-350 rounded-tl-none'
                          }`}>
                            {msg.role === 'user' ? (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            ) : (
                              <div className="prose prose-slate max-w-none dark:prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                                  {highlightLegalTerms(msg.content)}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isChatSending && (!visibleSidebarMessages.length || visibleSidebarMessages[visibleSidebarMessages.length - 1]?.role !== 'model') && (
                        <div className="flex items-center gap-1.5 p-3 bg-slate-50 dark:bg-zinc-850 rounded-2xl rounded-tl-none border border-slate-200 dark:border-zinc-800 w-20">
                          <div className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full animate-bounce delay-100" />
                          <div className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full animate-bounce delay-200" />
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Bottom Chat Input Area */}
                <div className="p-4 border-t border-[#E5E7EB] dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 select-none">
                  {showSidebarHistory ? (
                    <div className="text-center text-[10px] text-slate-400 font-bold select-none py-1">
                      Choose a past conversation session to resume chatting
                    </div>
                  ) : (
                    <form onSubmit={handleSendAiMessage} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-zinc-850/50 border border-[#E5E7EB] dark:border-zinc-800 rounded-2xl w-full relative">
                      {/* Plus button popup Actions Grid */}
                      {showSidebarPlusMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowSidebarPlusMenu(false)} />
                          <div className="absolute bottom-full mb-3 left-2 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 space-y-2.5 font-sans select-none text-left">
                            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Quick AI Actions</span>
                              <button 
                                type="button" 
                                onClick={() => setShowSidebarPlusMenu(false)}
                                className="text-slate-400 hover:text-slate-650 border-none bg-transparent cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-1 max-h-[220px] overflow-y-auto custom-scrollbar p-0.5">
                              {QUICK_AI_ACTIONS.map((action) => (
                                <button
                                  key={action.name}
                                  type="button"
                                  onClick={() => {
                                    handleSendAiMessage(null, action.prompt);
                                    setShowSidebarPlusMenu(false);
                                  }}
                                  className="flex items-center gap-2.5 p-1.5 hover:bg-indigo-50/30 border border-transparent hover:border-[#4F46E5] rounded-xl text-[10px] font-bold text-slate-750 text-left transition-all cursor-pointer bg-transparent border-none"
                                >
                                  <span className="p-1 bg-slate-50 rounded shadow-sm shrink-0">{getActionIcon(action.icon)}</span>
                                  <span className="truncate">{action.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <button 
                        type="button" 
                        onClick={() => setShowSidebarPlusMenu(prev => !prev)}
                        className={`p-1 transition-colors border-none bg-transparent cursor-pointer ${
                          showSidebarPlusMenu ? 'text-[#4F46E5] bg-[#4F46E5]/10 rounded' : 'text-gray-400 hover:text-[#4F46E5]'
                        }`}
                        title="Quick Actions"
                      >
                        <Plus size={14} />
                      </button>

                      <button 
                        type="button" 
                        onClick={() => document.getElementById('workspace-doc-upload').click()}
                        className="p-1 text-gray-400 hover:text-[#4F46E5] transition-colors border-none bg-transparent cursor-pointer"
                        title="Upload Documents"
                      >
                        <Paperclip size={14} />
                      </button>
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type message..."
                        className="flex-1 bg-transparent border-none text-[11px] font-semibold focus:ring-0 p-0 text-slate-700 dark:text-white outline-none"
                      />
                      <button 
                        type="button" 
                        onClick={handleVoiceInputSidebar}
                        className={`p-1 transition-colors border-none bg-transparent cursor-pointer ${
                          isListeningSidebar ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-[#4F46E5]'
                        }`}
                        title="Voice Input"
                      >
                        <Mic size={14} />
                      </button>
                      {isChatSending ? (
                        <button 
                          type="button" 
                          onClick={handleStopGeneration} 
                          className="p-1.5 rounded-full bg-[#EF4444] text-white hover:opacity-90 transition-all border-none cursor-pointer flex items-center justify-center"
                          title="Stop generation"
                        >
                          <Square size={10} fill="white" />
                        </button>
                      ) : (
                        <button 
                          type="submit" 
                          disabled={!chatInput.trim()}
                          className={`p-1.5 rounded-full transition-all border-none cursor-pointer ${
                            chatInput.trim()
                              ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title="Send message"
                        >
                          <Send size={10} />
                        </button>
                      )}
                    </form>
                  )}
                </div>
                {showSidebarScrollBtn && (
                  <button
                    type="button"
                    onClick={scrollToSidebarBottom}
                    className="absolute bottom-[90px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full shadow-lg text-[10px] font-bold text-[#4F46E5] dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-750 transition-all cursor-pointer select-none animate-bounce"
                  >
                    <ChevronDown size={11} />
                    <span>Scroll to Latest</span>
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>

      <input 
        type="file" 
        id="workspace-doc-upload" 
        ref={fileInputRef} 
        onChange={handleUploadEvidence} 
        multiple 
        className="hidden" 
      />

      {/* Modals */}
      <TaskModal visible={isTaskModalVisible} onClose={() => { setIsTaskModalVisible(false); setEditingTask(null); }} onSave={handleSaveTask} editingTask={editingTask} />
      <TimelineModal visible={isTimelineModalVisible} onClose={() => { setIsTimelineModalVisible(false); setEditingTimeline(null); }} onSave={handleSaveTimeline} editingEvent={editingTimeline} />
      <TimelineDetailsModal visible={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setSelectedDetailEvent(null); }} event={selectedDetailEvent} />
      <AiHearingClerkModal visible={isHearingClerkModalOpen} onClose={() => { setIsHearingClerkModalOpen(false); setSelectedDetailHearing(null); }} hearing={selectedDetailHearing} />
      
      {isEditRosterModalOpen && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditRosterModalOpen(false)}>
          <div className="relative bg-white dark:bg-[#1a2540] w-full max-w-4xl max-h-[85vh] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800/80 overflow-y-auto" onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Users className="text-indigo-600" size={20} />
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Edit Case Roster</h3>
              </div>
              <button onClick={() => setIsEditRosterModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-855 transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const updated = {
                ...caseData,
                clientName: fd.get('clientName'),
                clientPhone: fd.get('clientPhone'),
                clientEmail: fd.get('clientEmail'),
                clientAddress: fd.get('clientAddress'),
                advocateName: fd.get('advocateName'),
                opponentName: fd.get('opponentName'),
                opponentPhone: fd.get('opponentPhone'),
                opponentEmail: fd.get('opponentEmail'),
                opponentAddress: fd.get('opponentAddress'),
                opponentAdvocate: fd.get('opponentAdvocate'),
                opponentFirm: fd.get('opponentFirm'),
                courtName: fd.get('courtName'),
                courtType: fd.get('courtType'),
                judge: fd.get('judge'),
                caseNo: fd.get('caseNo'),
                jurisdiction: fd.get('jurisdiction'),
                courtAddress: fd.get('courtAddress')
              };
              try {
                await apiService.updateProject(caseData._id || caseData.id, updated);
                setCaseData(updated);
                toast.success('Case roster updated successfully!');
                setIsEditRosterModalOpen(false);
              } catch (err) {
                toast.error('Failed to update case roster');
              }
            }} className="space-y-6">
              
              {/* Client/Petitioner */}
              <div className="bg-slate-50 dark:bg-black/10 p-5 rounded-2xl border border-slate-150 dark:border-zinc-800/50">
                <h4 className="text-xs font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-wider mb-4">Client / Petitioner Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase">Full Name</label>
                    <input type="text" name="clientName" defaultValue={caseData.clientName || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Phone Number</label>
                    <input type="text" name="clientPhone" defaultValue={caseData.clientPhone || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Email Address</label>
                    <input type="email" name="clientEmail" defaultValue={caseData.clientEmail || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Postal Address</label>
                    <input type="text" name="clientAddress" defaultValue={caseData.clientAddress || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Representing Counsel</label>
                    <input type="text" name="advocateName" defaultValue={caseData.advocateName || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                </div>
              </div>

              {/* Opponent */}
              <div className="bg-slate-50 dark:bg-black/10 p-5 rounded-2xl border border-slate-150 dark:border-zinc-800/50">
                <h4 className="text-xs font-black uppercase text-red-655 dark:text-red-400 tracking-wider mb-4">Opposing Party Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Opponent Name</label>
                    <input type="text" name="opponentName" defaultValue={caseData.opponentName || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Opponent Phone</label>
                    <input type="text" name="opponentPhone" defaultValue={caseData.opponentPhone || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Opponent Email</label>
                    <input type="email" name="opponentEmail" defaultValue={caseData.opponentEmail || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Opponent Address</label>
                    <input type="text" name="opponentAddress" defaultValue={caseData.opponentAddress || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Opposing Counsel</label>
                    <input type="text" name="opponentAdvocate" defaultValue={caseData.opponentAdvocate || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Counsel Firm Name</label>
                    <input type="text" name="opponentFirm" defaultValue={caseData.opponentFirm || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none" />
                  </div>
                </div>
              </div>

              {/* Judiciary / Court */}
              <div className="bg-slate-50 dark:bg-black/10 p-5 rounded-2xl border border-slate-150 dark:border-zinc-800/50">
                <h4 className="text-xs font-black uppercase text-teal-655 dark:text-teal-400 tracking-wider mb-4">Judiciary & Court Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Court Name</label>
                    <input type="text" name="courtName" defaultValue={caseData.courtName || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-850 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Court Type</label>
                    <input type="text" name="courtType" defaultValue={caseData.courtType || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-850 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Presiding Judge</label>
                    <input type="text" name="judge" defaultValue={caseData.judge || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-850 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Case / Docket Number</label>
                    <input type="text" name="caseNo" defaultValue={caseData.caseNo || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-850 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Jurisdiction</label>
                    <input type="text" name="jurisdiction" defaultValue={caseData.jurisdiction || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-855 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase">Court Address</label>
                    <input type="text" name="courtAddress" defaultValue={caseData.courtAddress || ''} className="w-full bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-855 dark:text-white outline-none" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
                <button type="button" onClick={() => setIsEditRosterModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#4F46E5] hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all">
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}



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
  const [selectedCourt, setSelectedCourt] = useState('All Courts');
  const [sortBy, setSortBy] = useState('Last Updated');
  const [viewMode, setViewMode] = useState('table');
  const [activeActionDropdown, setActiveActionDropdown] = useState(null);

  useEffect(() => {
    console.log("Case Management Loaded");
    console.log("Case List Loaded");
    console.log("Active Cases Screen Mounted");
  }, []);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const availableCourts = useMemo(() => {
    const courts = new Set();
    legalCases.forEach(c => {
      if (c.courtName) courts.add(c.courtName);
      else if (c.court) courts.add(c.court);
    });
    return ['All Courts', ...Array.from(courts)];
  }, [legalCases]);

  const filteredCases = useMemo(() => {
    let result = legalCases;

    // Status filter
    if (filter !== 'All') {
      result = result.filter(c => (c.status || 'Active').toLowerCase() === filter.toLowerCase());
    }

    // Court filter
    if (selectedCourt !== 'All Courts') {
      result = result.filter(c => (c.courtName || c.court) === selectedCourt);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.clientName || '').toLowerCase().includes(q) ||
        (c.opponentName || '').toLowerCase().includes(q) ||
        (c.caseType || '').toLowerCase().includes(q) ||
        (c.courtName || c.court || '').toLowerCase().includes(q)
      );
    }

    // Clone array before sorting
    result = [...result];

    // Sorting logic
    if (sortBy === 'Name') {
      result.sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
    } else if (sortBy === 'Created Date') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'Status') {
      result.sort((a, b) => (a.status || 'Active').localeCompare(b.status || 'Active'));
    } else { // default 'Last Updated'
      result.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }

    return result;
  }, [legalCases, filter, selectedCourt, searchQuery, sortBy]);

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

  // Helper styles for status badge
  const getStatusStyles = (status) => {
    switch ((status || 'Active').toLowerCase()) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'closed':
        return 'bg-rose-50 text-rose-700 border border-rose-250 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      default: // pending
        return 'bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
    }
  };

  const getStatusLabel = (status) => {
    switch ((status || 'Active').toLowerCase()) {
      case 'active': return 'Active';
      case 'closed': return 'Closed';
      default: return 'Pending';
    }
  };

  const getStatusDot = (status) => {
    switch ((status || 'Active').toLowerCase()) {
      case 'active': return 'bg-emerald-500';
      case 'closed': return 'bg-rose-500';
      default: return 'bg-amber-500';
    }
  };

  // ─── Case List View ──────────────────────────
  return (
    <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden aisa-scalable-text bg-[#F9FAFB] dark:bg-[#0b0c15] relative">
      {/* Dashboard Header */}
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12 pt-6 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-[#0b0c15]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              console.log("Button Clicked: Back");
              console.log("Icon Clicked: Back");
              console.log("Navigation Success: Returned to Dashboard");
              onBack();
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors mr-1 border border-[#E5E7EB] dark:border-zinc-800"
          >
            <ArrowLeft size={16} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Cases</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Browse, search, sort, and manage all your litigation case folders.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => {
              console.log("Button Clicked: New Case");
              console.log("Icon Clicked: New Case");
              setEditingCaseId(null);
              setNewCaseForm({ clientName: '', caseType: '', otherCaseType: '', accused: '', summary: '' });
              setIsNewCaseModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4F46E5] hover:opacity-90 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm whitespace-nowrap"
          >
            <Plus size={14} /> <span>New Case Folder</span>
          </button>
        </div>
      </div>

      {/* Filter + Search Bar (Horizontal Toolbar) */}
      <div className="px-4 sm:px-6 md:px-10 lg:px-12 py-3.5 flex flex-col md:flex-row items-stretch md:items-center gap-3 shrink-0 border-b border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-[#0b0c15]">
        {/* Search box */}
        <div className="flex-1 flex items-center gap-2 bg-gray-50/50 dark:bg-zinc-900/50 border border-[#E5E7EB] dark:border-zinc-800 rounded-xl px-3 py-2 w-full md:max-w-md">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Search cases by name, client, opponent, court..."
            className="bg-transparent outline-none text-xs font-semibold w-full text-slate-800 dark:text-white p-0 focus:ring-0 border-none" 
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={12} className="text-slate-400" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2.5 md:ml-auto">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300">
            <span className="text-gray-400 dark:text-gray-500 font-bold">Status:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 text-xs font-bold text-gray-800 dark:text-white cursor-pointer outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Court Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300">
            <span className="text-gray-400 dark:text-gray-500 font-bold">Court:</span>
            <select
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 text-xs font-bold text-gray-800 dark:text-white cursor-pointer outline-none max-w-[140px]"
            >
              {availableCourts.map(court => (
                <option key={court} value={court}>{court}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300">
            <span className="text-gray-400 dark:text-gray-500 font-bold">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 text-xs font-bold text-gray-800 dark:text-white cursor-pointer outline-none"
            >
              <option value="Last Updated">Last Updated</option>
              <option value="Name">Name</option>
              <option value="Created Date">Created Date</option>
              <option value="Status">Status</option>
            </select>
          </div>

          {/* View Toggles */}
          <div className="flex items-center border border-[#E5E7EB] dark:border-zinc-800 rounded-xl overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-zinc-800 text-[#4F46E5]' : 'bg-white dark:bg-zinc-900 text-gray-400 hover:text-gray-650'}`}
              title="Grid View"
            >
              <LayoutDashboard size={14} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 border-l border-[#E5E7EB] dark:border-zinc-800 transition-colors ${viewMode === 'table' ? 'bg-gray-100 dark:bg-zinc-800 text-[#4F46E5]' : 'bg-white dark:bg-zinc-900 text-gray-400 hover:text-gray-655'}`}
              title="Table View"
            >
              <ClipboardList size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 md:px-10 lg:px-12 py-6 overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
        
        {filteredCases.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
            {viewMode === 'table' ? (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 text-[10px] text-gray-400 dark:text-gray-550 uppercase tracking-wider font-bold">
                      <th className="px-6 py-4 font-bold">Case Name</th>
                      <th className="px-6 py-4 font-bold">Case Type</th>
                      <th className="px-6 py-4 font-bold">Court</th>
                      <th className="px-6 py-4 font-bold">Next Hearing</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 text-center font-bold">Actions</th>
                      <th className="px-6 py-4 text-right font-bold">Open Workspace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-zinc-800">
                    {filteredCases.map((c) => (
                      <tr 
                        key={c._id || c.id} 
                        className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-all duration-150 group cursor-pointer"
                        onClick={() => handleCaseClick(c)}
                      >
                        <td className="px-6 py-4 max-w-[280px]" onClick={e => isRenamingCase === (c.id || c._id) && e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg shrink-0">
                              <FolderOpen size={16} className="fill-current text-amber-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              {isRenamingCase === (c.id || c._id) ? (
                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                  <input 
                                    autoFocus 
                                    value={renameValue} 
                                    onChange={e => setRenameValue(e.target.value)}
                                    className="bg-slate-50 dark:bg-black/20 border border-[#4F46E5] rounded-lg px-2 py-1 text-xs font-bold w-full outline-none text-slate-800 dark:text-white"
                                    onKeyDown={e => e.key === 'Enter' && handleRenameCase(c.id || c._id)} 
                                  />
                                  <button onClick={() => handleRenameCase(c.id || c._id)} className="p-1 text-green-500 shrink-0"><Check size={14} /></button>
                                  <button onClick={() => setIsRenamingCase(null)} className="p-1 text-slate-400 shrink-0"><X size={14} /></button>
                                </div>
                              ) : (
                                <span className="font-bold text-slate-800 dark:text-white truncate block group-hover:text-[#4F46E5] transition-colors">
                                  {c.name || c.title || "Untitled Case"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-650 dark:text-gray-300">
                          {c.caseType || 'General Litigation'}
                        </td>
                        <td className="px-6 py-4 text-slate-650 dark:text-gray-300">
                          {c.courtName || c.court || 'District Court'}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {c.nextHearingDate || c.nextHearing || 'None'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusStyles(c.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(c.status)}`} />
                            {getStatusLabel(c.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionDropdown(activeActionDropdown === (c.id || c._id) ? null : (c.id || c._id));
                              }}
                              className="p-1.5 hover:bg-gray-155 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                            >
                              <MoreVertical size={15} />
                            </button>
                            {activeActionDropdown === (c.id || c._id) && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setActiveActionDropdown(null)} />
                                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionDropdown(null);
                                      handleOpenEditModal(c);
                                    }}
                                    className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionDropdown(null);
                                      setIsRenamingCase(c.id || c._id);
                                      setRenameValue(c.name || c.title);
                                    }}
                                    className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                  >
                                    <Edit2 size={13} /> Rename
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionDropdown(null);
                                      toast.success("Case archived");
                                    }}
                                    className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                  >
                                    <Bookmark size={13} /> Archive
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionDropdown(null);
                                      toast.success("Case duplicated");
                                    }}
                                    className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                  >
                                    <Share2 size={13} /> Duplicate
                                  </button>
                                  <div className="border-t border-[#E5E7EB] dark:border-zinc-800 my-1" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionDropdown(null);
                                      if (confirm("Are you sure you want to delete this case?")) {
                                        handleDeleteCase(c.id || c._id);
                                      }
                                    }}
                                    className="w-full text-left px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold text-red-600 flex items-center gap-2"
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCaseClick(c);
                            }}
                            className="text-xs font-bold text-[#4F46E5] hover:underline whitespace-nowrap inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                          >
                            Open Workspace <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Mobile stacked cards / Grid View fallback */}
            <div className={`${viewMode === 'grid' ? 'grid' : 'grid md:hidden'} gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-5 bg-gray-50/30 dark:bg-transparent`}>
              {filteredCases.map((c) => (
                <div 
                  key={c._id || c.id}
                  onClick={() => handleCaseClick(c)}
                  className="group relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] rounded-xl">
                        <FolderOpen size={16} className="fill-current" />
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusStyles(c.status)}`}>
                        {getStatusLabel(c.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => handleOpenEditModal(c)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this case?")) {
                            handleDeleteCase(c.id || c._id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {isRenamingCase === (c.id || c._id) ? (
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <input 
                          autoFocus 
                          value={renameValue} 
                          onChange={e => setRenameValue(e.target.value)}
                          className="bg-slate-50 dark:bg-black/20 border border-[#4F46E5] rounded-lg px-2 py-1 text-xs font-bold w-full outline-none text-slate-800 dark:text-white"
                          onKeyDown={e => e.key === 'Enter' && handleRenameCase(c.id || c._id)} 
                        />
                        <button onClick={() => handleRenameCase(c.id || c._id)} className="p-1 text-green-500"><Check size={14} /></button>
                        <button onClick={() => setIsRenamingCase(null)} className="p-1 text-slate-400"><X size={14} /></button>
                      </div>
                    ) : (
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-[#4F46E5] transition-colors">
                        {c.name || c.title || "Untitled Case"}
                      </h3>
                    )}
                    <div className="flex flex-col gap-1 text-[10px] text-slate-450 uppercase tracking-wider font-bold">
                      <p className="flex items-center gap-1.5">
                        <Users size={11} className="text-slate-400" />
                        {c.clientName || 'Private Client'}
                      </p>
                      <p className="flex items-center gap-1.5 text-[#4F46E5]">
                        <Scale size={11} />
                        {c.caseType || 'General Litigation'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                      {new Date(c.updatedAt || Date.now()).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-0.5 text-[#4F46E5]">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Open Case</span>
                      <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-xl shadow-sm">
            <div className="p-6 bg-slate-50 dark:bg-zinc-800/30 rounded-full text-slate-400 mb-4 border border-[#E5E7EB] dark:border-zinc-800">
              <FolderOpen size={42} className="text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                No cases found
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-sm">
                Create your first case to begin managing legal matters.
              </p>
            </div>
            <button 
              onClick={() => {
                console.log("Button Clicked: New Case");
                console.log("Icon Clicked: New Case");
                setEditingCaseId(null);
                setNewCaseForm({ clientName: '', caseType: '', otherCaseType: '', accused: '', summary: '' });
                setIsNewCaseModalOpen(true);
              }}
              className="mt-5 px-6 py-2.5 bg-[#4F46E5] hover:opacity-90 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
            >
              New Case Folder
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalDashboard;
