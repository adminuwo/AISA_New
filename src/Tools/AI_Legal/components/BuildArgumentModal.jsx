import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Scale, Gavel, ChevronDown, Plus, Trash2,
  FileText, Mic, Video, Image as ImageIcon,
  Sparkles, Copy, Printer, Check,
  Shield, FileDown, Save,
  Loader2, Brain, Target, Eye, AlertCircle, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { jsPDF } from 'jspdf';
import { consumePrefillIntent, mapCaseToForm } from '../services/activeModuleService';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CASE_TYPES = ['Civil', 'Criminal', 'Family', 'Consumer', 'Labour', 'Property', 'Arbitration', 'Writ', 'Appeal'];
const ADVOCATE_SIDES = ['Petitioner', 'Respondent', 'Defence', 'Prosecution'];
const STRENGTH_LEVELS = ['Strong', 'Moderate', 'Weak'];
const RELIEF_OPTIONS = ['Injunction', 'Compensation', 'Damages', 'Specific Performance', 'Bail', 'Acquittal', 'Custody', 'Maintenance', 'Other'];
const PROVISIONS_QUICK = ['BNS', 'BNSS', 'Evidence Act', 'CPC', 'CrPC', 'IPC', 'Contract Act', 'Constitution of India', 'Transfer of Property Act', 'Limitation Act'];

const AI_ACTIONS = [
  { id: 'written',  label: 'Generate Written Argument', icon: FileText, grad: 'from-violet-600 to-indigo-600',  desc: 'Formal court written argument' },
  { id: 'oral',     label: 'Generate Oral Argument',    icon: Mic,      grad: 'from-indigo-600 to-blue-600',    desc: 'Court speech & presentation' },
  { id: 'final',    label: 'Generate Final Submission', icon: Gavel,    grad: 'from-blue-600 to-cyan-600',      desc: 'Complete court submission' },
  { id: 'counter',  label: 'Counter Argument Analysis', icon: Shield,   grad: 'from-emerald-600 to-teal-600',  desc: 'Analyze opponent arguments' },
  { id: 'judge',    label: 'Generate Judge Perspective',icon: Eye,      grad: 'from-amber-600 to-orange-600',  desc: 'Judicial view of the case' },
  { id: 'strategy', label: 'Generate Winning Strategy', icon: Target,   grad: 'from-rose-600 to-pink-600',     desc: 'Complete winning roadmap' },
];

// ─── SYSTEM INSTRUCTION ──────────────────────────────────────────────────────
const LEGAL_SYSTEM = `You are an elite Senior Advocate and Indian legal AI assistant with 30+ years of experience. 
You draft professional, court-ready legal documents strictly following Indian court formats.
Use formal legal language, cite Indian law (BNS/IPC/CPC/BNSS/Evidence Act/Constitution etc.) precisely.
Always structure documents with clear numbered headings and subheadings.
Make arguments compelling, legally sound, and based on the facts provided.
Do NOT use placeholders or ask for more information — work with what is given.`;

// ─── PROMPT BUILDER ──────────────────────────────────────────────────────────
const buildPrompt = (actionId, form) => {
  const {
    caseTitle, caseNumber, courtName, judgeName, caseType,
    petitioner, respondent, advocateName, advocateSide,
    caseFacts, issues, provisions, evidences, caseLaws,
    arguments_, counters, reliefs
  } = form;

  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const issuesList     = issues.filter(i => i.trim()).map((v, i) => `${i + 1}. ${v}`).join('\n') || 'Not specified';
  const provList       = provisions.filter(p => p.act.trim()).map(p => `- ${p.act}${p.sections ? ` (${p.sections})` : ''}`).join('\n') || 'Not specified';
  const evList         = evidences.filter(e => e.title.trim()).map((e, i) => `Evidence ${i+1}: ${e.title} — ${e.description}`).join('\n') || 'Not specified';
  const lawList        = caseLaws.filter(c => c.name.trim()).map((c, i) => `${i+1}. ${c.name}${c.citation ? ` [${c.citation}]` : ''}${c.principle ? ` — ${c.principle}` : ''}`).join('\n') || 'Not specified';
  const argsList       = arguments_.filter(a => a.heading.trim()).map((a, i) => `Argument ${i+1} [${a.strength}]: ${a.heading}\n   Details: ${a.detail}\n   Evidence: ${a.evidence || 'N/A'} | Provision: ${a.provision || 'N/A'} | Judgment: ${a.judgment || 'N/A'}`).join('\n\n') || 'Not specified';
  const counterList    = counters.filter(c => c.opponent.trim()).map((c, i) => `${i+1}. Opponent: ${c.opponent}\n   Rebuttal: ${c.rebuttal}`).join('\n\n') || 'Not specified';
  const reliefList     = reliefs.join(', ') || 'Not specified';

  const ctx = `
─────────────────────────────────────────────────────────────────
CASE INFORMATION
─────────────────────────────────────────────────────────────────
Title       : ${caseTitle || 'N/A'}
Case Number : ${caseNumber || 'N/A'}
Court       : ${courtName || 'N/A'}
Judge       : ${judgeName || 'Not specified'}
Case Type   : ${caseType || 'N/A'}
Date        : ${date}

PARTIES
─────────────────────────────────────────────────────────────────
Petitioner/Plaintiff : ${petitioner || 'N/A'}
Respondent/Defendant : ${respondent || 'N/A'}
Advocate             : ${advocateName || 'N/A'} (${advocateSide || 'N/A'})

FACTS OF THE CASE
─────────────────────────────────────────────────────────────────
${caseFacts || 'Not provided'}

ISSUES FOR DETERMINATION
─────────────────────────────────────────────────────────────────
${issuesList}

APPLICABLE LEGAL PROVISIONS
─────────────────────────────────────────────────────────────────
${provList}

EVIDENCE ON RECORD
─────────────────────────────────────────────────────────────────
${evList}

CASE LAWS & PRECEDENTS
─────────────────────────────────────────────────────────────────
${lawList}

MAIN ARGUMENTS
─────────────────────────────────────────────────────────────────
${argsList}

COUNTER ARGUMENTS & REBUTTALS
─────────────────────────────────────────────────────────────────
${counterList}

RELIEF SOUGHT
─────────────────────────────────────────────────────────────────
${reliefList}`;

  const instructions = {
    written: `Draft a complete, court-ready WRITTEN ARGUMENT following the exact format below. Make every argument legally compelling and backed by the provisions and precedents provided.

IN THE HON'BLE ${courtName?.toUpperCase() || 'COURT OF ______'}

Case No. ${caseNumber || '___________'}

BETWEEN

${petitioner?.toUpperCase() || 'PETITIONER/PLAINTIFF'}
                                         ...Petitioner/Plaintiff
                        Versus
${respondent?.toUpperCase() || 'RESPONDENT/DEFENDANT'}
                                         ...Respondent/Defendant

WRITTEN ARGUMENTS ON BEHALF OF THE ${(advocateSide || 'PETITIONER').toUpperCase()}

1. INTRODUCTION
2. BRIEF FACTS OF THE CASE
3. ISSUES FOR DETERMINATION
4. APPLICABLE LAW & PROVISIONS
5. ANALYSIS OF EVIDENCE
6. JUDICIAL PRECEDENTS RELIED UPON
7. ARGUMENTS ADVANCED (elaborate each argument in detail)
8. REBUTTAL OF OPPOSING ARGUMENTS
9. RELIEF SOUGHT
10. PRAYER

PRAYER
In view of the foregoing facts, the evidence on record, the statutory provisions cited and the judicial precedents relied upon, it is most respectfully prayed that this Hon'ble Court may be pleased to:
[List specific reliefs]

And pass such other order/orders as this Hon'ble Court may deem fit and proper in the facts and circumstances of this case, in the interest of justice.

Respectfully Submitted,

${advocateName || 'Advocate for Petitioner/Plaintiff'}
Date: ${date}
Place: ${courtName || '___________'}`,

    oral: `Draft a comprehensive ORAL ARGUMENT script for a ${caseType || 'legal'} matter. This should be what a Senior Advocate actually says in court.

Structure:
1. OPENING ADDRESS TO THE COURT (Respectful salutation and introduction)
2. BRIEF STATEMENT OF FACTS (2-3 minutes of speech)
3. FRAMING THE ISSUES (Clear articulation of legal questions)
4. MAIN ARGUMENTS (Each with clear speaking points, transitions, and emphasis)
5. CITING PRECEDENTS (How to present case laws)
6. REBUTTAL POINTS (Pre-empting opponent's likely arguments)
7. CLOSING STATEMENT AND PRAYER

Include stage directions like [PAUSE], [HAND DOCUMENT TO JUDGE], [TURN TO OPPONENT] for dramatic effect.
Make it persuasive, confident, and legally authoritative.`,

    final: `Draft the most comprehensive FINAL COURT SUBMISSION / WRITTEN STATEMENT OF ARGUMENTS for this ${caseType || 'legal'} case. This is the definitive legal document.

Structure:
IN THE HON'BLE ${courtName?.toUpperCase() || 'COURT'}
Case No. ${caseNumber || '___'}

FINAL WRITTEN SUBMISSIONS ON BEHALF OF ${(advocateSide || 'PETITIONER').toUpperCase()}

I.    SYNOPSIS OF THE CASE
II.   LIST OF DATES AND EVENTS (Chronological)
III.  STATEMENT OF FACTS
IV.   ISSUES FRAMED FOR DETERMINATION
V.    APPLICABLE STATUTES & PROVISIONS (with full text of relevant sections)
VI.   COMPREHENSIVE ANALYSIS OF EVIDENCE
VII.  JUDICIAL PRECEDENTS (with ratio decidendi)
VIII. MAIN ARGUMENTS ADVANCED (exhaustive, well-structured)
IX.   COUNTER-ARGUMENTS & REBUTTALS
X.    PRINCIPLE OF EQUITY AND FAIRNESS
XI.   RELIEF SOUGHT
XII.  PRAYER

CERTIFICATION OF CORRECTNESS
INDEX OF DOCUMENTS`,

    counter: `Perform a professional COUNTER ARGUMENT ANALYSIS for this ${caseType || 'legal'} case. Identify every possible opposing argument and prepare robust rebuttals.

Format:
1. ANTICIPATED ARGUMENTS BY OPPOSING COUNSEL (identify minimum 5-7 likely arguments even if not explicitly listed)
2. FOR EACH OPPOSING ARGUMENT:
   a) Summary of Opponent's Argument
   b) Legal Weakness in their Argument
   c) Our Counter-Argument
   d) Supporting Legal Authority
   e) Evidence that Defeats their Argument
   f) Recommended Courtroom Response
3. PRE-EMPTIVE STRATEGY (arguments to raise before opponent does)
4. CROSS-EXAMINATION STRATEGY (questions to weaken opponent witnesses)
5. FINAL DEFENCE ASSESSMENT`,

    judge: `From the perspective of a Hon'ble Judge presiding over this ${caseType || 'legal'} case, provide an objective JUDICIAL ANALYSIS.

Structure:
1. FIRST IMPRESSION OF THE CASE (How the court views it initially)
2. PRIMA FACIE ASSESSMENT (Is a case made out?)
3. STRENGTH OF EVIDENCE EVALUATION (For both sides)
4. LEGAL ISSUES ANALYSIS (Are they properly framed?)
5. CREDIBILITY ASSESSMENT (Petitioner vs Respondent arguments)
6. LIKELY QUESTIONS FROM THE BENCH (5-10 questions each side should prepare for)
7. AREAS OF CONCERN — FOR PETITIONER (What might harm their case)
8. AREAS OF CONCERN — FOR RESPONDENT (What might harm their case)
9. MISSING EVIDENCE OR LEGAL POINTS
10. LEGAL RISK PROBABILITY (0-100% scale)
11. PROBABLE JUDICIAL OBSERVATIONS
12. LIKELY OUTCOME ASSESSMENT WITH REASONING

Be completely neutral and judicial in tone.`,

    strategy: `Develop a comprehensive WINNING LEGAL STRATEGY AND LITIGATION ROADMAP for this ${caseType || 'legal'} case.

Structure:
1. CASE SWOT ANALYSIS (Strengths / Weaknesses / Opportunities / Threats)
2. CORE WINNING ARGUMENTS (ranked by strength)
3. EVIDENCE STRATEGY
   - Evidence to prioritize
   - How to present each piece
   - Evidence gaps to fill
4. WITNESS STRATEGY
   - Witnesses to call
   - Key testimony points
   - Cross-examination guide
5. LEGAL PRECEDENT STRATEGY
   - Key precedents to cite and how
   - Distinguishing opponent's precedents
6. PROCEDURAL STRATEGY
   - Applications to file
   - Interim reliefs to seek
   - Timeline planning
7. RISK MITIGATION PLAN
8. SETTLEMENT CONSIDERATIONS (when and how)
9. APPEAL STRATEGY (if initial court goes against)
10. COURTROOM CONDUCT RECOMMENDATIONS
11. FINAL RECOMMENDATION (win probability and best approach)`
  };

  return `${instructions[actionId]}\n\n${ctx}`;
};

// ─── SHARED STYLES ───────────────────────────────────────────────────────────
const inputCls = 'w-full bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all placeholder-slate-300 dark:placeholder-zinc-600';
const inputSmCls = 'bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-violet-500 transition-all placeholder-slate-300 dark:placeholder-zinc-600';

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SectionHdr = ({ n, title, sub, open, onToggle }) => (
  <button type="button" onClick={onToggle}
    className="w-full flex items-center justify-between py-4 px-5 bg-gradient-to-r from-slate-50 to-white dark:from-zinc-900/60 dark:to-zinc-900/30 group"
  >
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
        <span className="text-[10px] font-black text-white">{n}</span>
      </div>
      <div className="text-left">
        <div className="text-sm font-black text-slate-800 dark:text-white">{title}</div>
        {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
    <ChevronDown size={16} className={`text-slate-400 group-hover:text-violet-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
  </button>
);

// ─── RENDERED OUTPUT ──────────────────────────────────────────────────────────
const RenderedOutput = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-mono space-y-0.5 select-text">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith('# ')) return <h1 key={i} className="text-base font-black text-slate-900 dark:text-white mt-3 mb-1 border-b border-slate-200 dark:border-zinc-700 pb-1">{line.slice(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-black text-violet-700 dark:text-violet-400 mt-3 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-2 mb-0.5 uppercase tracking-wide">{line.slice(4)}</h3>;
        if (/^\*\*(.+)\*\*$/.test(line.trim())) return <p key={i} className="font-bold text-slate-900 dark:text-white">{line.replace(/\*\*/g, '')}</p>;
        if (line.startsWith('---') || line.startsWith('───')) return <hr key={i} className="border-slate-200 dark:border-zinc-700 my-2" />;
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code class="bg-slate-100 dark:bg-zinc-800 px-1 rounded text-[10px]">$1</code>');
        return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </div>
  );
};

// ─── VALIDATION ──────────────────────────────────────────────────────────────
const validate = (form) => {
  const errors = [];
  if (!form.caseTitle.trim()) errors.push('Case Title is required');
  if (!form.caseFacts.trim()) errors.push('Case Facts are required');
  if (!form.petitioner.trim()) errors.push('Petitioner/Plaintiff name is required');
  if (!form.respondent.trim()) errors.push('Respondent/Defendant name is required');
  return errors;
};

// ─── STORAGE KEY ─────────────────────────────────────────────────────────────
const STORAGE_KEY = (caseId) => `@aisa_build_arg_${caseId || 'default'}`;

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const BuildArgumentModal = ({ isOpen, onClose, currentCase, onUpdateCase }) => {
  const isDark = document.documentElement.classList.contains('dark');
  const caseId = currentCase?._id;

  // ── Load persisted form ──
  const loadSaved = useCallback(() => {
    if (currentCase?.argumentBuilderForm) {
      return currentCase.argumentBuilderForm;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY(caseId));
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }, [caseId, currentCase?.argumentBuilderForm]);

  const defaultForm = useCallback(() => {
    const saved = loadSaved();
    if (saved) return saved;
    return {
      caseTitle:    currentCase?.name || '',
      caseNumber:   '',
      courtName:    currentCase?.courtName || currentCase?.court || '',
      judgeName:    '',
      caseType:     currentCase?.caseType || '',
      petitioner:   currentCase?.clientName || currentCase?.petitioner || '',
      respondent:   currentCase?.accused || currentCase?.respondent || '',
      advocateName: '',
      advocateSide: '',
      caseFacts:    currentCase?.description || currentCase?.caseSummary || currentCase?.caseFacts || '',
      issues:       [''],
      provisions:   [{ act: '', sections: '' }],
      evidences:    [{ title: '', description: '', files: [] }],
      caseLaws:     [{ name: '', citation: '', principle: '' }],
      arguments_:   [{ heading: '', detail: '', evidence: '', provision: '', judgment: '', strength: 'Strong' }],
      counters:     [{ opponent: '', rebuttal: '' }],
      reliefs:      [],
    };
  }, [currentCase, loadSaved]);

  const [form, setFormRaw] = useState(defaultForm);
  const setForm = (updater) => setFormRaw(prev => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    return next;
  });

  // Debounced auto-save form changes to currentCase.argumentBuilderForm in DB
  useEffect(() => {
    if (!currentCase || !currentCase._id) return;
    
    const handler = setTimeout(async () => {
      try {
        if (JSON.stringify(currentCase.argumentBuilderForm) === JSON.stringify(form)) {
          return;
        }
        const payload = {
          ...currentCase,
          argumentBuilderForm: form
        };
        const response = await apiService.updateProject(currentCase._id, payload);
        if (onUpdateCase) onUpdateCase(response);
        
        // Remove legacy local storage key once saved to DB
        localStorage.removeItem(STORAGE_KEY(caseId));
      } catch (err) {
        console.error("Failed to auto-save argument builder form to DB", err);
      }
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [form, currentCase?._id, caseId]);

  // ── Prefill state (tracks which fields were auto-filled from active case) ──
  const [prefillFields, setPrefillFields] = useState(new Set());
  const [prefillBanner, setPrefillBanner] = useState(null); // { count, caseTitle }

  // Reload on open + check for prefill intent
  useEffect(() => {
    if (!isOpen) return;

    const base = defaultForm();

    // Check if user clicked "Use Active Case" — consume one-time prefill intent
    const intent = consumePrefillIntent('legal_argument_builder');
    if (intent?.caseData) {
      const mapped = mapCaseToForm(intent.caseData);
      const filled = new Set();

      const merged = { ...base };

      const tryFill = (key, value) => {
        if (value && String(value).trim()) {
          merged[key] = value;
          filled.add(key);
        }
      };

      tryFill('caseTitle',    mapped.caseTitle);
      tryFill('caseNumber',   mapped.caseNumber);
      tryFill('courtName',    mapped.courtName);
      tryFill('judgeName',    mapped.judgeName);
      tryFill('caseType',     mapped.caseType);
      tryFill('petitioner',   mapped.petitioner);
      tryFill('respondent',   mapped.respondent);
      tryFill('advocateName', mapped.advocateName);
      tryFill('advocateSide', mapped.advocateSide);
      tryFill('caseFacts',    mapped.caseFacts);

      // issues array
      if (mapped.issues) {
        const issueLines = String(mapped.issues).split(/[\n,;]/).map(s => s.trim()).filter(Boolean);
        if (issueLines.length) { merged.issues = [...issueLines, '']; filled.add('issues'); }
      }
      // provisions array
      if (mapped.provisions) {
        const provLines = String(mapped.provisions).split(/[\n,;]/).map(s => s.trim()).filter(Boolean);
        if (provLines.length) { merged.provisions = provLines.map(p => ({ act: p, sections: '' })); filled.add('provisions'); }
      }
      // evidence from uploaded docs
      if (mapped.allDocuments?.length) {
        merged.evidences = mapped.allDocuments.map(d => ({
          title: d.name || 'Document',
          description: `Uploaded evidence: ${d.type || 'file'} - ${d.uploadDate || ''}`,
          files: []
        }));
        filled.add('evidences');
      }
      // case laws
      if (mapped.caseLaws) {
        const lawLines = String(mapped.caseLaws).split(/[\n;]/).map(s => s.trim()).filter(Boolean);
        if (lawLines.length) { merged.caseLaws = lawLines.map(l => ({ name: l, citation: '', principle: '' })); filled.add('caseLaws'); }
      }
      // previous arguments
      if (mapped.previousArgs) {
        const prevArgLines = String(mapped.previousArgs).split(/\n\n/).map(s => s.trim()).filter(Boolean);
        if (prevArgLines.length) {
          merged.arguments_ = prevArgLines.map(a => ({ heading: a.slice(0, 80), detail: a, evidence: '', provision: '', judgment: '', strength: 'Strong' }));
          filled.add('arguments_');
        }
      }

      setFormRaw(merged);
      setPrefillFields(filled);
      if (filled.size > 0) {
        setPrefillBanner({ count: filled.size, caseTitle: mapped.caseTitle || intent.caseData?.name || 'Active Case' });
        // Expand sections that have prefilled data
        setSec(p => ({
          ...p,
          s1: true, // Case Info
          s2: true, // Parties
          s3: true, // Facts
          s4: filled.has('issues'),
          s5: filled.has('provisions'),
          s6: filled.has('evidences'),
          s7: filled.has('caseLaws'),
          s8: filled.has('arguments_'),
        }));
        toast.success(`✓ ${filled.size} fields auto-filled from case data`, { icon: '💼', duration: 3500 });
      }
    } else {
      setFormRaw(base);
      setPrefillFields(new Set());
      setPrefillBanner(null);
    }
  }, [isOpen, caseId]); // eslint-disable-line

  const f = form;
  const upd = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // sections open/close
  const [sec, setSec] = useState({ s1:true,s2:true,s3:true,s4:false,s5:false,s6:false,s7:false,s8:false,s9:false,s10:false });
  const tog = k => setSec(p => ({ ...p, [k]: !p[k] }));

  // AI state
  const [generating, setGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState('');
  const [output, setOutput] = useState('');
  const [outputLabel, setOutputLabel] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const outputRef = useRef(null);

  // ── AI GENERATE ────────────────────────────────────────────────────────────
  const handleGenerate = async (actionId) => {
    const errors = validate(form);
    if (errors.length) {
      errors.forEach(e => toast.error(e, { duration: 3000 }));
      // Auto-expand sections that have errors
      if (!form.caseTitle.trim() || !form.caseType || !form.courtName) setSec(p => ({ ...p, s1: true }));
      if (!form.petitioner.trim() || !form.respondent.trim()) setSec(p => ({ ...p, s2: true }));
      if (!form.caseFacts.trim()) setSec(p => ({ ...p, s3: true }));
      return;
    }

    const action = AI_ACTIONS.find(a => a.id === actionId);
    setGenerating(true);
    setActiveAction(actionId);
    setOutput('');
    setOutputLabel(action?.label || 'Generating...');
    setShowOutput(true);

    // Scroll output into view on mobile
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    try {
      const prompt = buildPrompt(actionId, form);
      const response = await generateChatResponse(
        [],           // history
        prompt,       // message
        LEGAL_SYSTEM, // system instruction
        [],           // attachments
        'English',    // language
        null,         // abortSignal
        'legal',      // mode
        null,         // sessionId
        caseId || null // projectId
      );

      // Handle all response shapes
      let text = '';
      if (typeof response === 'string') {
        text = response;
      } else if (response?.reply) {
        text = response.reply;
      } else if (response?.data?.reply) {
        text = response.data.reply;
      } else if (response?.text) {
        text = response.text;
      } else if (response?.error) {
        throw new Error(response.message || response.error);
      } else {
        text = JSON.stringify(response);
      }

      if (!text || text.includes('Log In') || text.includes('Please [Log In]')) {
        throw new Error('Authentication required. Please log in and try again.');
      }

      setOutput(text);
      toast.success(`${action?.label || 'Argument'} generated!`, { duration: 2500 });
    } catch (err) {
      console.error('[BuildArgument] AI error:', err);
      const msg = err?.message || 'Failed to generate. Please try again.';
      toast.error(msg);
      setOutput('');
      setShowOutput(false);
    } finally {
      setGenerating(false);
      setActiveAction('');
    }
  };

  // ── EXPORT PDF ──────────────────────────────────────────────────────────────
  const handlePDF = () => {
    if (!output) { toast.error('Generate an argument first.'); return; }
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const M = 20, PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
      const maxW = PW - M * 2;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text('AISA™ AI LEGAL — COURT ARGUMENT DOCUMENT', M, 18);
      doc.setLineWidth(0.4); doc.line(M, 21, PW - M, 21);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      doc.text(`Case: ${form.caseTitle || 'N/A'}`, M, 27);
      doc.text(`Case No: ${form.caseNumber || 'N/A'} | Court: ${form.courtName || 'N/A'} | Type: ${form.caseType || 'N/A'}`, M, 32);
      doc.text(`Parties: ${form.petitioner || 'N/A'} vs ${form.respondent || 'N/A'}`, M, 37);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')} | Type: ${outputLabel}`, M, 42);
      doc.line(M, 45, PW - M, 45);

      // Clean markdown
      const clean = output
        .replace(/^#{1,3}\s+/gm, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '')
        .replace(/─+/g, '─'.repeat(30)).replace(/\r\n/g, '\n');

      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(clean, maxW);
      let y = 52;
      for (const line of lines) {
        if (y > PH - M) { doc.addPage(); y = M; }
        // Simple heading detection: ALL CAPS line → bold
        if (/^[A-Z\s\d.]+$/.test(line.trim()) && line.trim().length > 3 && line.trim().length < 60) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(line, M, y);
        y += 5.5;
      }
      doc.save(`AISA_${outputLabel.replace(/\s+/g, '_')}_${form.caseTitle || 'Case'}_${Date.now()}.pdf`);
      toast.success('PDF exported!');
    } catch (e) {
      console.error(e);
      toast.error('PDF export failed. Try copy instead.');
    }
  };

  // ── EXPORT DOCX ─────────────────────────────────────────────────────────────
  const handleDocx = () => {
    if (!output) { toast.error('Generate an argument first.'); return; }
    const header = `AISA AI LEGAL — COURT ARGUMENT DOCUMENT\n${'='.repeat(60)}\nCase: ${form.caseTitle}\nCase No: ${form.caseNumber} | Court: ${form.courtName}\nGenerated: ${new Date().toLocaleString('en-IN')}\n${'='.repeat(60)}\n\n`;
    const blob = new Blob([header + output], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `AISA_${outputLabel.replace(/\s+/g, '_')}_${form.caseTitle || 'Case'}_${Date.now()}.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('DOCX downloaded!');
  };

  // ── PRINT ────────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!output) { toast.error('Generate an argument first.'); return; }
    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow popups to print.'); return; }
    const clean = output.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,3}\s*/g, '');
    win.document.write(`<!DOCTYPE html><html><head><title>${outputLabel} — ${form.caseTitle}</title>
<style>
  @page { margin: 25mm 20mm; }
  body { font-family: "Times New Roman", serif; font-size: 13pt; line-height: 1.9; color: #000; }
  h1 { font-size: 15pt; text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px; }
  .meta { font-size: 9pt; border-bottom: 1px solid #aaa; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; }
  .content { text-align: justify; white-space: pre-wrap; }
</style></head><body>
<h1>COURT ARGUMENT DOCUMENT</h1>
<div class="meta"><span><b>Case:</b> ${form.caseTitle} | <b>No.:</b> ${form.caseNumber}</span><span><b>Date:</b> ${new Date().toLocaleDateString('en-IN')}</span></div>
<div class="content">${clean}</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
</body></html>`);
    win.document.close();
  };

  // ── COPY ─────────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!output) { toast.error('Generate an argument first.'); return; }
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard!');
    });
  };

  // ── SAVE TO CASE ─────────────────────────────────────────────────────────────
  const handleSaveToCase = async () => {
    if (!output) { toast.error('Generate an argument first.'); return; }
    if (!caseId) { toast.error('No active case. Please open a case first.'); return; }

    setSaving(true);
    const tid = toast.loading('Saving to case...');
    try {
      // Build entry to save
      const entry = {
        id: `arg_${Date.now()}`,
        type: outputLabel,
        actionId: activeAction || 'unknown',
        text: output,
        formSnapshot: {
          caseTitle: form.caseTitle,
          caseNumber: form.caseNumber,
          courtName: form.courtName,
          caseType: form.caseType,
          petitioner: form.petitioner,
          respondent: form.respondent,
          advocateName: form.advocateName,
          advocateSide: form.advocateSide,
          reliefs: form.reliefs,
        },
        generatedAt: new Date().toISOString(),
      };

      // Get current case data and append
      let existing = [];
      try {
        const proj = await apiService.getProject(caseId);
        existing = proj?.builtArguments || proj?.arguments_built || [];
        if (!Array.isArray(existing)) existing = [];
      } catch { existing = []; }

      const updated = await apiService.updateProject(caseId, {
        builtArguments: [...existing, entry],
        lastArgumentBuiltAt: new Date().toISOString(),
      });

      toast.success('Argument saved to case!', { id: tid });
      if (onUpdateCase && updated) onUpdateCase(updated);
    } catch (err) {
      console.error('[BuildArgument] Save error:', err);
      toast.error('Failed to save. Check your connection.', { id: tid });
    } finally {
      setSaving(false);
    }
  };

  // ── QUICK PROVISION CHIP ──────────────────────────────────────────────────
  const addQuickProvision = (act) => {
    // Find empty slot or add new
    const emptyIdx = form.provisions.findIndex(p => !p.act.trim());
    if (emptyIdx >= 0) {
      const next = form.provisions.map((p, i) => i === emptyIdx ? { ...p, act } : p);
      upd('provisions', next);
    } else {
      upd('provisions', [...form.provisions, { act, sections: '' }]);
    }
  };

  const strengthColor = (s) =>
    s === 'Strong'   ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' :
    s === 'Moderate' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800' :
                       'text-red-500 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800';

  if (!isOpen) return null;

  // ── Auto Fill Badge helper ──
  const AutoFilledBadge = ({ field }) =>
    prefillFields.has(field) ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-full text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide ml-1.5">
        <CheckCircle2 size={8} />
        Auto Filled
      </span>
    ) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-stretch justify-center sm:items-center sm:p-3 lg:p-4"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className="w-full sm:max-w-6xl bg-white dark:bg-[#0e1628] flex flex-col sm:rounded-3xl sm:max-h-[95vh] h-full sm:h-auto overflow-hidden shadow-2xl border border-slate-200/40 dark:border-white/5"
          >
            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-700 via-indigo-700 to-indigo-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shadow-inner">
                  <Scale size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white leading-none">Build Argument</h2>
                  <p className="text-[10px] text-white/60 font-medium mt-0.5 uppercase tracking-widest">
                    {currentCase?.name ? `Case: ${currentCase.name}` : 'Professional Court Document Wizard'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentCase && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-[10px] font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Case Linked
                  </div>
                )}
                <button onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── PREFILL BANNER ──────────────────────────────────────── */}
            {prefillBanner && (
              <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border-b border-emerald-200 dark:border-emerald-900/30">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={13} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 leading-none">
                    Case data loaded — {prefillBanner.count} fields auto-filled
                  </p>
                  <p className="text-[9px] text-emerald-600/70 dark:text-emerald-500/60 font-medium mt-0.5 truncate">
                    From: {prefillBanner.caseTitle} • You can edit any field below
                  </p>
                </div>
                <button
                  onClick={() => setPrefillBanner(null)}
                  className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full text-emerald-500 shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* ── BODY ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

              {/* ── LEFT: FORM ───────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar lg:max-w-[58%] divide-y divide-slate-100 dark:divide-white/5">

                {/* S1 Case Info */}
                <div>
                  <SectionHdr n="1" title="Case Information" sub="Core case identifiers" open={sec.s1} onToggle={() => tog('s1')} />
                  {sec.s1 && (
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Case Title <span className="text-red-500">*</span>
                          <AutoFilledBadge field="caseTitle" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('caseTitle') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.caseTitle} onChange={e => upd('caseTitle', e.target.value)} placeholder="e.g. XYZ vs ABC" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Case Number
                          <AutoFilledBadge field="caseNumber" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('caseNumber') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.caseNumber} onChange={e => upd('caseNumber', e.target.value)} placeholder="CS(OS) 123/2024" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Court Name
                          <AutoFilledBadge field="courtName" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('courtName') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.courtName} onChange={e => upd('courtName', e.target.value)} placeholder="e.g. Delhi High Court" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Judge Name (Optional)
                          <AutoFilledBadge field="judgeName" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('judgeName') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.judgeName} onChange={e => upd('judgeName', e.target.value)} placeholder="Hon'ble Justice..." />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Case Type
                          <AutoFilledBadge field="caseType" />
                        </label>
                        <select className={`${inputCls} ${prefillFields.has('caseType') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.caseType} onChange={e => upd('caseType', e.target.value)}>
                          <option value="">Select type...</option>
                          {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* S2 Party Info */}
                <div>
                  <SectionHdr n="2" title="Party Information" sub="Parties & advocates" open={sec.s2} onToggle={() => tog('s2')} />
                  {sec.s2 && (
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Petitioner / Plaintiff <span className="text-red-500">*</span>
                          <AutoFilledBadge field="petitioner" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('petitioner') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.petitioner} onChange={e => upd('petitioner', e.target.value)} placeholder="Full legal name" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Respondent / Defendant <span className="text-red-500">*</span>
                          <AutoFilledBadge field="respondent" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('respondent') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.respondent} onChange={e => upd('respondent', e.target.value)} placeholder="Full legal name" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Advocate Name
                          <AutoFilledBadge field="advocateName" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('advocateName') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.advocateName} onChange={e => upd('advocateName', e.target.value)} placeholder="Advocate / Sr. Advocate" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Advocate Side</label>
                        <select className={inputCls} value={f.advocateSide} onChange={e => upd('advocateSide', e.target.value)}>
                          <option value="">Select side...</option>
                          {ADVOCATE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* S3 Case Facts */}
                <div>
                  <SectionHdr n="3" title="Case Facts" sub="Complete factual background" open={sec.s3} onToggle={() => tog('s3')} />
                  {sec.s3 && (
                    <div className="p-5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-2">
                        Facts of the Case <span className="text-red-500">*</span>
                        <AutoFilledBadge field="caseFacts" />
                      </label>
                      <textarea rows={8} value={f.caseFacts} onChange={e => upd('caseFacts', e.target.value)}
                        placeholder="Enter complete facts of the case including dates, events, parties' actions, prior proceedings, previous orders, and all relevant background information..."
                        className={`${inputCls} resize-y min-h-[120px] leading-relaxed ${prefillFields.has('caseFacts') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
                      />
                      <p className="text-[9px] text-slate-400 mt-1.5">{f.caseFacts.length} characters · More detail = better AI output</p>

                    </div>
                  )}
                </div>

                {/* S4 Issues */}
                <div>
                  <SectionHdr n="4" title="Issues For Determination" sub="Legal questions before the court" open={sec.s4} onToggle={() => tog('s4')} />
                  {sec.s4 && (
                    <div className="p-5 space-y-3">
                      {f.issues.map((issue, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-black text-violet-600">{i + 1}</span>
                          </div>
                          <input value={issue} onChange={e => upd('issues', f.issues.map((x, idx) => idx === i ? e.target.value : x))}
                            placeholder="e.g. Whether the contract dated ___ is legally valid?"
                            className={`${inputSmCls} flex-1 w-full`} />
                          {f.issues.length > 1 && (
                            <button onClick={() => upd('issues', f.issues.filter((_, idx) => idx !== i))}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => upd('issues', [...f.issues, ''])}
                        className="flex items-center gap-2 text-xs font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest px-2 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                        <Plus size={13} /> Add Issue
                      </button>
                    </div>
                  )}
                </div>

                {/* S5 Legal Provisions */}
                <div>
                  <SectionHdr n="5" title="Legal Provisions" sub="Applicable acts and sections" open={sec.s5} onToggle={() => tog('s5')} />
                  {sec.s5 && (
                    <div className="p-5 space-y-3">
                      <div className="flex flex-wrap gap-1.5 pb-2">
                        {PROVISIONS_QUICK.map(act => (
                          <button key={act} onClick={() => addQuickProvision(act)}
                            className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 transition-colors">
                            + {act}
                          </button>
                        ))}
                      </div>
                      {f.provisions.map((prov, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <input value={prov.act} onChange={e => upd('provisions', f.provisions.map((x, idx) => idx === i ? { ...x, act: e.target.value } : x))}
                              placeholder="Act / Statute" className={`${inputSmCls} w-full`} />
                            <input value={prov.sections} onChange={e => upd('provisions', f.provisions.map((x, idx) => idx === i ? { ...x, sections: e.target.value } : x))}
                              placeholder="Section(s)" className={`${inputSmCls} w-full`} />
                          </div>
                          {f.provisions.length > 1 && (
                            <button onClick={() => upd('provisions', f.provisions.filter((_, idx) => idx !== i))}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => upd('provisions', [...f.provisions, { act: '', sections: '' }])}
                        className="flex items-center gap-2 text-xs font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest px-2 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                        <Plus size={13} /> Add Provision
                      </button>
                    </div>
                  )}
                </div>

                {/* S6 Evidence */}
                <div>
                  <SectionHdr n="6" title="Evidence" sub="All supporting evidence" open={sec.s6} onToggle={() => tog('s6')} />
                  {sec.s6 && (
                    <div className="p-5 space-y-4">
                      {f.evidences.map((ev, i) => (
                        <div key={i} className="border border-slate-200 dark:border-zinc-700 rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-zinc-800/40">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Evidence {i + 1}</span>
                            {f.evidences.length > 1 && (
                              <button onClick={() => upd('evidences', f.evidences.filter((_, idx) => idx !== i))}
                                className="p-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
                            )}
                          </div>
                          <div className="p-4 space-y-2.5">
                            <input value={ev.title} onChange={e => upd('evidences', f.evidences.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                              placeholder="Evidence Title / Document Name" className={`${inputSmCls} w-full`} />
                            <textarea rows={2} value={ev.description} onChange={e => upd('evidences', f.evidences.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                              placeholder="Brief description of this evidence and its significance..."
                              className={`${inputCls} resize-none`} />
                            <div className="flex flex-wrap gap-2">
                              {[{ icon: FileText, label: 'Doc', accept: '.pdf,.doc,.docx,.txt' }, { icon: ImageIcon, label: 'Image', accept: 'image/*' }, { icon: Mic, label: 'Audio', accept: 'audio/*' }, { icon: Video, label: 'Video', accept: 'video/*' }].map(({ icon: Icon, label, accept }) => (
                                <label key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-violet-400 hover:text-violet-600 cursor-pointer transition-colors">
                                  <Icon size={10} /><span>{label}</span>
                                  <input type="file" accept={accept} className="hidden" onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      upd('evidences', f.evidences.map((x, idx) => idx === i ? { ...x, files: [...(x.files||[]), { name: file.name, type: file.type, size: file.size }] } : x));
                                      toast.success(`${file.name} attached`);
                                    }
                                  }} />
                                </label>
                              ))}
                            </div>
                            {ev.files?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {ev.files.map((f, fi) => (
                                  <span key={fi} className="flex items-center gap-1 px-2 py-1 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-full text-[9px] font-bold text-violet-700">
                                    <FileText size={8} />{f.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <button onClick={() => upd('evidences', [...f.evidences, { title: '', description: '', files: [] }])}
                        className="flex items-center gap-2 text-xs font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest px-2 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                        <Plus size={13} /> Add Evidence
                      </button>
                    </div>
                  )}
                </div>

                {/* S7 Case Laws */}
                <div>
                  <SectionHdr n="7" title="Case Laws / Precedents" sub="Binding & persuasive authorities" open={sec.s7} onToggle={() => tog('s7')} />
                  {sec.s7 && (
                    <div className="p-5 space-y-3">
                      {f.caseLaws.map((cl, i) => (
                        <div key={i} className="border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-violet-600">Precedent {i + 1}</span>
                            {f.caseLaws.length > 1 && (
                              <button onClick={() => upd('caseLaws', f.caseLaws.filter((_, idx) => idx !== i))}
                                className="p-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
                            )}
                          </div>
                          <input value={cl.name} onChange={e => upd('caseLaws', f.caseLaws.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                            placeholder="Case Name e.g. State of Maharashtra v. Mayer Hans George" className={`${inputSmCls} w-full`} />
                          <input value={cl.citation} onChange={e => upd('caseLaws', f.caseLaws.map((x, idx) => idx === i ? { ...x, citation: e.target.value } : x))}
                            placeholder="Citation e.g. AIR 1965 SC 722 / (2024) 3 SCC 456" className={`${inputSmCls} w-full`} />
                          <input value={cl.principle} onChange={e => upd('caseLaws', f.caseLaws.map((x, idx) => idx === i ? { ...x, principle: e.target.value } : x))}
                            placeholder="Principle / Ratio Decidendi established" className={`${inputSmCls} w-full`} />
                        </div>
                      ))}
                      <button onClick={() => upd('caseLaws', [...f.caseLaws, { name: '', citation: '', principle: '' }])}
                        className="flex items-center gap-2 text-xs font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest px-2 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                        <Plus size={13} /> Add Precedent
                      </button>
                    </div>
                  )}
                </div>

                {/* S8 Main Arguments */}
                <div>
                  <SectionHdr n="8" title="Main Arguments" sub="Your primary legal arguments" open={sec.s8} onToggle={() => tog('s8')} />
                  {sec.s8 && (
                    <div className="p-5 space-y-4">
                      {f.arguments_.map((arg, i) => (
                        <div key={i} className="border border-slate-200 dark:border-zinc-700 rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/20 border-b border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">Argument {i + 1}</span>
                            <div className="flex items-center gap-2">
                              <select value={arg.strength} onChange={e => upd('arguments_', f.arguments_.map((x, idx) => idx === i ? { ...x, strength: e.target.value } : x))}
                                className={`text-[10px] font-black px-2 py-1 rounded-full border cursor-pointer outline-none transition-colors ${strengthColor(arg.strength)}`}>
                                {STRENGTH_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              {f.arguments_.length > 1 && (
                                <button onClick={() => upd('arguments_', f.arguments_.filter((_, idx) => idx !== i))}
                                  className="p-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
                              )}
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            <input value={arg.heading} onChange={e => upd('arguments_', f.arguments_.map((x, idx) => idx === i ? { ...x, heading: e.target.value } : x))}
                              placeholder="Argument Heading / Title" className={`${inputSmCls} w-full font-bold`} />
                            <textarea rows={4} value={arg.detail} onChange={e => upd('arguments_', f.arguments_.map((x, idx) => idx === i ? { ...x, detail: e.target.value } : x))}
                              placeholder="Detailed legal argument — include reasoning, facts, and legal principles..."
                              className={`${inputCls} resize-none`} />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input value={arg.evidence} onChange={e => upd('arguments_', f.arguments_.map((x, idx) => idx === i ? { ...x, evidence: e.target.value } : x))}
                                placeholder="Supporting Evidence" className={`${inputSmCls} w-full text-xs`} />
                              <input value={arg.provision} onChange={e => upd('arguments_', f.arguments_.map((x, idx) => idx === i ? { ...x, provision: e.target.value } : x))}
                                placeholder="Legal Provision" className={`${inputSmCls} w-full text-xs`} />
                              <input value={arg.judgment} onChange={e => upd('arguments_', f.arguments_.map((x, idx) => idx === i ? { ...x, judgment: e.target.value } : x))}
                                placeholder="Supporting Judgment" className={`${inputSmCls} w-full text-xs`} />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => upd('arguments_', [...f.arguments_, { heading: '', detail: '', evidence: '', provision: '', judgment: '', strength: 'Strong' }])}
                        className="flex items-center gap-2 text-xs font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest px-2 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                        <Plus size={13} /> Add Argument
                      </button>
                    </div>
                  )}
                </div>

                {/* S9 Counter Arguments */}
                <div>
                  <SectionHdr n="9" title="Counter Arguments" sub="Opponent arguments & rebuttals" open={sec.s9} onToggle={() => tog('s9')} />
                  {sec.s9 && (
                    <div className="p-5 space-y-4">
                      {f.counters.map((c, i) => (
                        <div key={i} className="border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Counter {i + 1}</span>
                            {f.counters.length > 1 && (
                              <button onClick={() => upd('counters', f.counters.filter((_, idx) => idx !== i))}
                                className="p-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
                            )}
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Opponent's Argument</label>
                            <textarea rows={2} value={c.opponent} onChange={e => upd('counters', f.counters.map((x, idx) => idx === i ? { ...x, opponent: e.target.value } : x))}
                              placeholder="What the opposing counsel will argue..."
                              className={`${inputCls} resize-none bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-900/30 focus:border-red-400`} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Your Rebuttal</label>
                            <textarea rows={2} value={c.rebuttal} onChange={e => upd('counters', f.counters.map((x, idx) => idx === i ? { ...x, rebuttal: e.target.value } : x))}
                              placeholder="Your counter and legal reasoning..."
                              className={`${inputCls} resize-none bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30 focus:border-emerald-400`} />
                          </div>
                        </div>
                      ))}
                      <button onClick={() => upd('counters', [...f.counters, { opponent: '', rebuttal: '' }])}
                        className="flex items-center gap-2 text-xs font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest px-2 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                        <Plus size={13} /> Add Counter
                      </button>
                    </div>
                  )}
                </div>

                {/* S10 Relief */}
                <div>
                  <SectionHdr n="10" title="Relief Sought" sub="Prayers to the Hon'ble Court" open={sec.s10} onToggle={() => tog('s10')} />
                  {sec.s10 && (
                    <div className="p-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {RELIEF_OPTIONS.map(r => (
                          <button key={r} onClick={() => upd('reliefs', f.reliefs.includes(r) ? f.reliefs.filter(x => x !== r) : [...f.reliefs, r])}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition-all active:scale-95 ${
                              f.reliefs.includes(r)
                                ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-500/20'
                                : 'bg-white dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400 hover:border-violet-400 hover:text-violet-600'
                            }`}>
                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${f.reliefs.includes(r) ? 'bg-white/20' : 'bg-slate-100 dark:bg-zinc-700'}`}>
                              {f.reliefs.includes(r) && <Check size={10} className="text-white" />}
                            </div>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-8" />
              </div>

              {/* ── RIGHT: AI ENGINE + OUTPUT ────────────────────────────────── */}
              <div ref={outputRef} className="lg:w-[42%] flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-[#060d1a]">

                {/* AI Buttons */}
                <div className="p-4 border-b border-slate-200 dark:border-white/5 shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={13} className="text-violet-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Generation Engine</span>
                    {generating && (
                      <span className="ml-auto text-[9px] font-bold text-violet-500 animate-pulse">Processing...</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                    {AI_ACTIONS.map(action => {
                      const Icon = action.icon;
                      const isActive = activeAction === action.id && generating;
                      const isDone = activeAction !== action.id || !generating;
                      return (
                        <button
                          key={action.id}
                          onClick={() => handleGenerate(action.id)}
                          disabled={generating}
                          className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all active:scale-[0.98] group
                            ${isActive
                              ? `bg-gradient-to-r ${action.grad} text-white shadow-lg`
                              : 'bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-violet-400 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-white/20' : `bg-gradient-to-br ${action.grad} opacity-10 group-hover:opacity-100`}`}>
                            {isActive
                              ? <Loader2 size={14} className="animate-spin text-white" />
                              : <Icon size={14} className={isActive ? 'text-white' : `text-violet-600 group-hover:scale-110 transition-transform`} />
                            }
                          </div>
                          <div className="min-w-0">
                            <div className={`text-[11px] font-black leading-tight ${isActive ? 'text-white' : ''}`}>{action.label}</div>
                            <div className={`text-[9px] mt-0.5 truncate ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{action.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Required fields hint */}
                  <div className="flex items-start gap-2 mt-3 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
                    <AlertCircle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                      Required: Case Title, Facts, Petitioner & Respondent names. More data = better AI output.
                    </p>
                  </div>
                </div>

                {/* Output Area */}
                <div className="flex-1 flex flex-col min-h-0">
                  {showOutput ? (
                    <>
                      {/* Output Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-white/5 shrink-0 bg-white/50 dark:bg-black/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${generating ? 'bg-violet-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{outputLabel}</span>
                        </div>
                        <button onClick={() => { setShowOutput(false); setOutput(''); }}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2">
                          <X size={13} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0">
                        {generating ? (
                          <div className="flex flex-col items-center justify-center h-full gap-5 py-10">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                                <Brain size={26} className="text-white" />
                              </div>
                              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 animate-ping" />
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{outputLabel}</p>
                              <p className="text-xs text-slate-400">AI is analyzing your case data...</p>
                              <p className="text-[9px] text-slate-300 dark:text-slate-600">This may take 15–30 seconds</p>
                            </div>
                            <div className="flex gap-1.5">
                              {[0,1,2,3,4].map(i => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
                              ))}
                            </div>
                          </div>
                        ) : output ? (
                          <RenderedOutput text={output} />
                        ) : null}
                      </div>

                      {/* Export Bar */}
                      {!generating && output && (
                        <div className="px-3 py-3 border-t border-slate-200 dark:border-white/5 shrink-0 bg-white/50 dark:bg-black/10">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Export & Save</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button onClick={handleCopy}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 hover:border-violet-400'}`}>
                              {copied ? <Check size={11} /> : <Copy size={11} />}
                              <span>{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                            <button onClick={handlePDF}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-red-600 hover:border-red-400 transition-all">
                              <FileText size={11} /><span>PDF</span>
                            </button>
                            <button onClick={handleDocx}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-blue-600 hover:border-blue-400 transition-all">
                              <FileDown size={11} /><span>DOCX</span>
                            </button>
                            <button onClick={handlePrint}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 hover:border-violet-400 transition-all">
                              <Printer size={11} /><span>Print</span>
                            </button>
                            <button onClick={handleSaveToCase} disabled={saving || !caseId}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                !caseId
                                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 border border-slate-200 dark:border-zinc-700 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-sm shadow-violet-500/20 disabled:opacity-50'
                              }`}
                              title={!caseId ? 'Open a case to enable Save to Case' : 'Save to current case in database'}>
                              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                              <span>{saving ? 'Saving...' : 'Save to Case'}</span>
                            </button>
                          </div>
                          {!caseId && (
                            <p className="text-[9px] text-slate-400 mt-1.5">Open a case from the dashboard to enable database save.</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 px-6 gap-4 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-200 dark:border-violet-800/40 flex items-center justify-center">
                        <Scale size={28} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-600 dark:text-slate-300">AI Output Panel</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-[200px] mx-auto">
                          Fill the form sections, then click any generation button above to produce a court-ready document.
                        </p>
                      </div>
                      <div className="text-[9px] text-slate-300 dark:text-slate-600 font-medium">
                        PDF · DOCX · Print · Copy · Save to Case
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BuildArgumentModal;
