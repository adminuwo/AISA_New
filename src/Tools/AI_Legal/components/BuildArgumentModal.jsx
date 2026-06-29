import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
import { consumePrefillIntent, mapCaseToForm } from '../services/activeModuleService';
import useOutputLanguage from '../hooks/useOutputLanguage';
import LanguageToggle from './shared/LanguageToggle';
import { exportToPDF } from '../utils/exportToPDF';

// Devanagari translation mapping for labels
const HINDI_LABELS = {
  'Generate Written Argument': 'लिखित तर्क',
  'Generate Oral Argument': 'मौखिक तर्क',
  'Generate Final Submission': 'अंतिम प्रस्तुति',
  'Counter Argument Analysis': 'विपक्षी तर्क विश्लेषण',
  'Generate Judge Perspective': 'न्यायाधीश परिप्रेक्ष्य',
  'Generate Winning Strategy': 'जीतने की रणनीति',
  'Generating...': 'उत्पन्न किया जा रहा है...'
};

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
const LEGAL_SYSTEM = `# AI LEGAL™ — MASTER PROMPT FOR ARGUMENT BUILDER OUTPUT (PRODUCTION VERSION)

You are the official AI LEGAL Court Argument Engine.

Your responsibility is to generate professionally drafted Written Arguments exactly like a senior advocate preparing submissions before an Indian Court.

The output must NEVER resemble a ChatGPT article, essay, blog, notes, or AI-generated content.

It must resemble an actual court filing.

---

## DOCUMENT STYLE

Generate a clean court document.

No markdown.

No code blocks.

No JSON.

No bullets using *, -, or •.

No AI explanations.

No introductory sentence such as

"Here is your document."

Start directly with

IN THE HON'BLE ...

---

## HEADER FORMAT

Generate the following layout:

AI LEGAL™

WRITTEN ARGUMENTS

IN THE HON'BLE __________ COURT

Case No.

Matter:

PETITIONER

Versus

RESPONDENT

Date:

---

## SECTION STRUCTURE

Use Roman Numerals.

I.
INTRODUCTION

II.
FACTUAL BACKGROUND

III.
ISSUES FOR DETERMINATION

IV.
APPLICABLE LEGAL PROVISIONS

V.
EVIDENCE RELIED UPON

VI.
JUDICIAL PRECEDENTS

VII.
ARGUMENTS

VIII.
REBUTTAL

IX.
RELIEF SOUGHT

X.
PRAYER

XI.
SIGNATURE

Never change this order.

---

## FACTS

Present facts chronologically.

Each paragraph should contain only one event.

Example

2.1

Loan advanced.

2.2

Promise to repay.

2.3

Default.

2.4

Legal Notice.

2.5

Non-payment.

Never merge multiple events into one paragraph.

---

## ISSUES

Display separately.

Issue No.1

Issue No.2

Issue No.3

Keep them short.

---

## LEGAL PROVISIONS

Format like

Indian Contract Act, 1872

Section 10

Explanation

Section 73

Explanation

Never dump section numbers together.

Always explain relevance.

---

## EVIDENCE FORMAT

Every evidence should contain

Exhibit Number

Title

Purpose

Legal Relevance

Example

Exhibit P-1

Promissory Note

Purpose

Acknowledgement of debt.

Legal Relevance

Primary documentary evidence proving the transaction.

---

## PRECEDENTS FORMAT

Always write

Case Name

Citation

Ratio Decidendi

Application to Present Case

Example

Kailash Nath Associates v. DDA

(2015) 4 SCC 136

Ratio

The Supreme Court held...

Application

The present facts are directly governed because...

Never simply list case names.

---

## ARGUMENTS

Use formal courtroom language.

Every argument must begin with phrases like

It is respectfully submitted that...

It is further submitted that...

It is most respectfully submitted...

Without prejudice...

The Petitioner respectfully contends...

Avoid repetitive wording.

Arguments should flow logically.

Every argument should be in a separate paragraph.

---

## REBUTTAL

Address probable defence.

Never simply deny.

State why the defence is legally unsustainable.

---

## RELIEF

Use lettering.

(a)

(b)

(c)

(d)

instead of

1

2

3

---

## PRAYER

Always begin

"In view of the facts, evidence, statutory provisions and judicial precedents stated hereinabove, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to—"

Use lettered reliefs.

End with

"Pass such other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice."

---

## SIGNATURE BLOCK

Respectfully Submitted,

---

(Advocate Name)

Counsel for the Petitioner

Enrollment No.: __________

Place: __________

Date: __________

---

## FORMATTING RULES

Font

Times New Roman

Body

11 pt

Headings

13 pt Bold

Main Title

16 pt Bold

Line Spacing

1.15

Paragraph Spacing

6 pt After

Margins

1 inch

Alignment

Justified

Indent first line of each paragraph.

---

## PAGE LAYOUT

Keep proper white space.

Do not leave unnecessary blank pages.

Avoid oversized gaps.

Automatically insert page breaks only when necessary.

Keep signature block together.

---

## FOOTER

Every page should contain

AI LEGAL™

Confidential Legal Document

Page X of Y

---

## WRITING STYLE

Write exactly like a senior Indian litigation advocate.

Professional.

Formal.

Court-ready.

Natural legal language.

No AI tone.

No placeholders like

"Relevant case law may be added."

No sample text.

No examples.

No dummy content.

If information is unavailable, omit it gracefully instead of writing placeholders.

---

## OUTPUT QUALITY

The final document should be immediately suitable for:

• PDF Export
• DOCX Export
• Court Filing
• Client Submission
• Advocate Review
• Printing

The document must look like it was drafted by an experienced High Court/Supreme Court advocate, not by an AI chatbot.`;

// ─── PROMPT BUILDER ──────────────────────────────────────────────────────────
const buildPrompt = (actionId, form) => {
  const {
    caseTitle, caseNumber, courtName, judgeName, caseType,
    petitioner, respondent, advocateName, advocateSide,
    caseFacts, issues, provisions, evidences, caseLaws,
    arguments_, counters, reliefs
  } = form;

  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const issuesList     = issues.filter(i => i.trim()).map((v, i) => `Issue No.${i + 1}\n${v}`).join('\n\n') || '';
  const provList       = provisions.filter(p => p.act.trim()).map(p => `${p.act}\nSection ${p.sections ? p.sections : '[Applicable Section]'}\nRelevance description...`).join('\n\n') || '';
  const evList         = evidences.filter(e => e.title.trim()).map((e, i) => `Exhibit P-${i+1}\n${e.title}\nPurpose\n${e.description || 'Proving the transaction'}\nLegal Relevance\nDocumentary evidence on record.`).join('\n\n') || '';
  const lawList        = caseLaws.filter(c => c.name.trim()).map((c, i) => `Case Name: ${c.name}\nCitation: ${c.citation || '[Citation]'}\nRatio Decidendi: ${c.principle || 'The court held...'}\nApplication to Present Case: The present facts are governed because...`).join('\n\n') || '';
  const argsList       = arguments_.filter(a => a.heading.trim()).map((a, i) => `It is respectfully submitted that ${a.heading}. ${a.detail || ''}`).join('\n\n') || '';
  const counterList    = counters.filter(c => c.opponent.trim()).map((c, i) => `Opponent Argument: ${c.opponent}\nRebuttal: It is submitted that the defence is legally unsustainable because ${c.rebuttal}`).join('\n\n') || '';
  const reliefList     = reliefs.map((r, i) => `(${String.fromCharCode(97 + i)}) ${r}`).join('\n') || '';

  const ctx = `
CASE INFORMATION
Title       : ${caseTitle || '[Case Title]'}
Case Number : ${caseNumber || '[Case Number]'}
Court       : ${courtName || '[Court Name]'}
Judge       : ${judgeName || '[Judge Name]'}
Case Type   : ${caseType || '[Case Type]'}
Date        : ${date}

PARTIES
Petitioner/Plaintiff : ${petitioner || '[Petitioner Name]'}
Respondent/Defendant : ${respondent || '[Respondent Name]'}
Advocate             : ${advocateName || '[Advocate Name]'} (${advocateSide || '[Advocate Side]'})

FACTS OF THE CASE
${caseFacts || '[Facts of the Case]'}

ISSUES FOR DETERMINATION
${issuesList || '[Issues]'}

APPLICABLE LEGAL PROVISIONS
${provList || '[Provisions]'}

EVIDENCE ON RECORD
${evList || '[Evidence]'}

CASE LAWS & PRECEDENTS
${lawList || '[Case Laws]'}

MAIN ARGUMENTS
${argsList || '[Arguments]'}

COUNTER ARGUMENTS & REBUTTALS
${counterList || '[Counter Arguments]'}

RELIEF SOUGHT
${reliefList || '[Relief Sought]'}`;

  const instructions = {
    written: `Generate WRITTEN ARGUMENT according to this exact structure:

AI LEGAL™

WRITTEN ARGUMENTS

IN THE HON'BLE ${courtName?.toUpperCase() || '[COURT NAME]'}

Case No. ${caseNumber || '[Case Number]'}

Matter: ${caseTitle || '[Case Title]'}

${petitioner?.toUpperCase() || '[PETITIONER NAME]'}
                                         ...Petitioner
                        Versus
${respondent?.toUpperCase() || '[RESPONDENT NAME]'}
                                         ...Respondent

Date: ${date}

I. INTRODUCTION
[Draft introduction]

II. FACTUAL BACKGROUND
[Chronological events numbered 2.1, 2.2, 2.3, etc. with only one event per paragraph]

III. ISSUES FOR DETERMINATION
${issuesList || 'Issue No.1\n[Issue 1]\n\nIssue No.2\n[Issue 2]'}

IV. APPLICABLE LEGAL PROVISIONS
${provList || '[Provisions]'}

V. EVIDENCE RELIED UPON
${evList || '[Evidence]'}

VI. JUDICIAL PRECEDENTS
${lawList || '[Precedents]'}

VII. ARGUMENTS
[Arguments advanced in separate paragraphs starting with courtroom language like "It is respectfully submitted that..."]

VIII. REBUTTAL
[Address and deny opposing arguments]

IX. RELIEF SOUGHT
${reliefList || '(a) [Relief 1]\n(b) [Relief 2]'}

X. PRAYER
"In view of the facts, evidence, statutory provisions and judicial precedents stated hereinabove, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to—"
${reliefList || '(a) [Relief 1]\n(b) [Relief 2]'}
"Pass such other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice."

XI. SIGNATURE
Respectfully Submitted,

(Signature)

${advocateName || '[Advocate Name]'}
Counsel for the Petitioner
Enrollment No.: [Enrollment No.]
Place: ${courtName || '[Place]'}
Date: ${date}`,

    oral: `Generate ORAL ARGUMENT according to this exact structure:

1. OPENING ADDRESS TO THE COURT
2. STATEMENT OF FACTS
3. FRAME OF ISSUES
4. MAIN ORAL ARGUMENTS
5. JUDICIAL PRECEDENTS CITATION
6. REBUTTALS TO OPPOSITION
7. CLOSING AND PRAYER`,

    final: `Generate FINAL SUBMISSION according to this exact structure:

IN THE HON'BLE ${courtName?.toUpperCase() || '[COURT NAME]'}
Case No. ${caseNumber || '[Case Number]'}

FINAL WRITTEN SUBMISSIONS ON BEHALF OF ${(advocateSide || 'PETITIONER').toUpperCase()}

I. SYNOPSIS OF THE CASE
II. CHRONOLOGICAL LIST OF DATES AND EVENTS
III. STATEMENT OF FACTS
IV. ISSUES FOR DETERMINATION
V. APPLICABLE STATUTES AND PROVISIONS
VI. EVALUATION OF EVIDENCE
VII. JUDICIAL PRECEDENTS
VIII. DETAILED ARGUMENTS
IX. REBUTTAL AND RESPONSES
X. EQUITY PRINCIPLES
XI. RELIEF SOUGHT
XII. PRAYER`,

    counter: `Generate COUNTER ARGUMENT according to this exact structure:

1. ANTICIPATED ARGUMENTS BY OPPOSING COUNSEL
2. DETAILED REBUTTALS
3. PRE-EMPTIVE LITIGATION STRATEGY
4. WITNESS CROSS EXAMINATION TOPICS
5. FINAL DEFENCE ASSESSMENT`,

    judge: `Generate JUDGE PERSPECTIVE according to this exact structure:

1. PRELIMINARY OBSERVATIONS
2. PRIMA FACIE MERIT EVALUATION
3. EVIDENCE WEIGHT AND ADMISSIBILITY
4. MAIN CONTROVERSIES AND ISSUES
5. CREDIBILITY OF PARTIES
6. QUESTIONS FOR COUNSEL
7. WEAKNESS OF PETITIONER
8. WEAKNESS OF RESPONDENT
9. SUGGESTED VERDICT OUTCOME`,

    strategy: `Generate WINNING STRATEGY according to this exact structure:

1. CASE SWOT ANALYSIS
2. CORE ARGUMENTS RANKING
3. EVIDENCE SUBMISSION STRATEGY
4. WITNESS EXAMINATION ROADMAP
5. CASE LAW CITATION TACTICS
6. INTERIM AND PROCEDURAL STRATEGIC OPTIONS
7. RISK MITIGATION ROADMAP
8. SETTLEMENT COMPROMISE EVALUATION`
  };

  return `MODE: ${actionId.toUpperCase()}\n\n${instructions[actionId]}\n\n${ctx}`;
};

// ─── SHARED STYLES ───────────────────────────────────────────────────────────
const inputCls = 'w-full bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all placeholder-slate-300 dark:placeholder-zinc-600';
const inputSmCls = 'bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-violet-500 transition-all placeholder-slate-300 dark:placeholder-zinc-600';

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SectionHdr = ({ title, open, onToggle }) => (
  <button type="button" onClick={onToggle}
    className="w-full flex items-center justify-between py-3.5 px-5 bg-slate-50/50 dark:bg-zinc-900/20 group hover:bg-slate-100/30 transition-colors"
  >
    <div className="flex items-center gap-2">
      <ChevronDown size={14} className={`text-slate-400 group-hover:text-violet-600 transition-transform duration-200 shrink-0 ${open ? '' : '-rotate-90'}`} />
      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</span>
    </div>
  </button>
);

// ─── RENDERED OUTPUT ──────────────────────────────────────────────────────────
const RenderedOutput = ({ text }) => {
  const cleanText = String(text || '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
  const lines = cleanText.split('\n');

  const renderLine = (line, i) => {
    const cleanLine = line.replace(/\*\*/g, '').trim();

    if (!cleanLine) {
      return <div key={i} style={{ height: '8px' }} />;
    }

    // Detect if line matches a major heading (e.g. 1. INTRODUCTION, I. SYNOPSIS)
    const isHeading = /^\d+\.\s+[A-Z\s]+$/.test(cleanLine) || /^[IVXLCDM]+\.\s+[A-Z\s]+$/.test(cleanLine);

    if (isHeading) {
      return (
        <p 
          key={i} 
          className="font-bold text-black uppercase"
          style={{ 
            fontSize: '13pt', 
            marginTop: '18px', 
            marginBottom: '10px',
            pageBreakAfter: 'avoid',
            breakAfter: 'avoid'
          }}
        >
          {cleanLine}
        </p>
      );
    }

    // Body paragraphs have 8px margin-bottom, 0.3in text-indent for paragraphs, except headings and signatures
    const isSignatureDetail = cleanLine.includes("Counsel for") || cleanLine.includes("Enrollment No") || cleanLine.includes("Place:") || cleanLine.includes("Date:");
    const hasIndent = !isSignatureDetail && cleanLine.length > 50 && !cleanLine.startsWith("Exhibit") && !cleanLine.startsWith("Case Name");

    return (
      <p 
        key={i} 
        style={{ 
          marginBottom: '8px',
          textIndent: hasIndent ? '0.3in' : '0'
        }}
      >
        {cleanLine}
      </p>
    );
  };

  const sigIndex = lines.findIndex(l => l.includes("Respectfully Submitted,") || l.includes("Respectfully submitted,"));

  return (
    <div 
      className="bg-white text-black border border-slate-300 dark:border-zinc-800 shadow-md select-text"
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '11pt',
        lineHeight: '1.45',
        textAlign: 'justify',
        padding: '40px'
      }}
    >
      {sigIndex === -1 ? (
        lines.map((line, i) => renderLine(line, i))
      ) : (
        <>
          {lines.slice(0, sigIndex).map((line, i) => renderLine(line, i))}
          <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginTop: '18px' }}>
            {lines.slice(sigIndex).map((line, i) => renderLine(line, i + sigIndex))}
          </div>
        </>
      )}
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
        if (filled.has('issues') || filled.has('provisions') || filled.has('evidences') || filled.has('caseLaws') || filled.has('arguments_')) {
          setShowAdvanced(true);
        }
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
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ─── LANGUAGE TOGGLE STATE ────────────────────────────────────────
  const {
    outputLang,
    setOutputLang,
    isTranslating: isOutputTranslating,
    setIsTranslating: setIsOutputTranslating,
    translateText: translateOutputText,
    getDisplayText: getOutputDisplayText,
  } = useOutputLanguage('build_argument_output', caseId || 'global');

  const [translatedOutput, setTranslatedOutput] = useState('');

  // Re-run whenever output changes or outputLang changes
  useEffect(() => {
    if (outputLang === 'en' || !output) {
      setTranslatedOutput('');
      return;
    }
    const cached = getOutputDisplayText(output);
    if (cached && cached !== output) {
      setTranslatedOutput(cached);
      return;
    }
    setIsOutputTranslating(true);
    translateOutputText(output).then((translated) => {
      if (isMountedRef.current) setTranslatedOutput(translated);
      setIsOutputTranslating(false);
    }).catch(() => {
      if (isMountedRef.current) setTranslatedOutput('');
      setIsOutputTranslating(false);
    });
  }, [output, outputLang, getOutputDisplayText, translateOutputText, setIsOutputTranslating]);

  // Reset output language when output changes
  useEffect(() => {
    if (output) {
      setOutputLang('en');
      setTranslatedOutput('');
    }
  }, [output]); // eslint-disable-line

  const displayOutput = useMemo(() => {
    if (outputLang === 'hi' && translatedOutput) return translatedOutput;
    return output;
  }, [outputLang, translatedOutput, output]);

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
  // ── EXPORT PDF ──────────────────────────────────────────────────────────────
  const handlePDF = async () => {
    if (!displayOutput) { toast.error('Generate an argument first.'); return; }
    const isHi = outputLang === 'hi';
    const cleanOutputLabel = isHi ? (HINDI_LABELS[outputLabel] || outputLabel) : outputLabel;
    const toastId = toast.loading(isHi ? 'PDF तैयार किया जा रहा है...' : 'Generating PDF...');
    try {
      const el = document.getElementById('argument-rendered-output');
      const cleanText = displayOutput.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\*\*/g, '');
      await exportToPDF({
        element: el,
        text: cleanText,
        title: isHi ? 'AISA™ एआई कानूनी — कोर्ट आर्गुमेंट दस्तावेज़' : 'AISA™ AI Legal — Court Argument Document',
        filename: `AISA_${cleanOutputLabel.replace(/\s+/g, '_')}_${(form.caseTitle || 'Case').replace(/\s+/g, '_')}`,
        lang: outputLang,
        meta: {
          [isHi ? 'मामला' : 'Case']: form.caseTitle || 'N/A',
          [isHi ? 'न्यायालय' : 'Court']: form.courtName || 'N/A',
          [isHi ? 'पक्षकार' : 'Parties']: `${form.petitioner || ''} ${isHi ? 'बनाम' : 'vs'} ${form.respondent || ''}`,
          [isHi ? 'उत्पन्न तिथि' : 'Generated']: new Date().toLocaleString(),
        },
      });
      toast.success(isHi ? 'PDF सफलतापूर्वक निर्यात किया गया!' : 'PDF exported successfully!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error(isHi ? 'PDF निर्यात विफल' : 'PDF export failed. Try copy instead.', { id: toastId });
    }
  };

  // ── EXPORT DOCX ─────────────────────────────────────────────────────────────
  const handleDocx = () => {
    if (!displayOutput) { toast.error('Generate an argument first.'); return; }
    const isHi = outputLang === 'hi';
    const cleanOutputLabel = isHi ? (HINDI_LABELS[outputLabel] || outputLabel) : outputLabel;
    
    const header = isHi
      ? `AISA एआई कानूनी — कोर्ट आर्गुमेंट दस्तावेज़\n${'='.repeat(60)}\nमामला: ${form.caseTitle || 'N/A'}\nमामला संख्या: ${form.caseNumber || 'N/A'} | न्यायालय: ${form.courtName || 'N/A'}\nउत्पन्न तिथि: ${new Date().toLocaleString('hi-IN')}\n${'='.repeat(60)}\n\n`
      : `AISA AI LEGAL — COURT ARGUMENT DOCUMENT\n${'='.repeat(60)}\nCase: ${form.caseTitle || 'N/A'}\nCase No: ${form.caseNumber || 'N/A'} | Court: ${form.courtName || 'N/A'}\nGenerated: ${new Date().toLocaleString('en-IN')}\n${'='.repeat(60)}\n\n`;
      
    const cleanText = displayOutput.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\*\*/g, '');
    const blob = new Blob([header + cleanText], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `AISA_${cleanOutputLabel.replace(/\s+/g, '_')}_${(form.caseTitle || 'Case').replace(/\s+/g, '_')}_${Date.now()}.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('DOCX downloaded!');
  };

  // ── PRINT ────────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!displayOutput) { toast.error('Generate an argument first.'); return; }
    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow popups to print.'); return; }
    
    const isHi = outputLang === 'hi';
    const cleanOutputLabel = isHi ? (HINDI_LABELS[outputLabel] || outputLabel) : outputLabel;
    const titleText = isHi ? "कोर्ट आर्गुमेंट दस्तावेज़" : "COURT ARGUMENT DOCUMENT";
    const caseText = isHi ? "मामला" : "Case";
    const caseNoText = isHi ? "संख्या" : "No.";
    const dateText = isHi ? "दिनांक" : "Date";
    const dateStr = isHi ? new Date().toLocaleDateString('hi-IN') : new Date().toLocaleDateString('en-IN');

    const clean = displayOutput
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,3}\s*/g, '');

    const lines = clean.split('\n');
    const contentHTML = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<div style="height: 6pt;"></div>';
      
      const isHeading = /^\d+\.\s+[A-Z\s]+$/.test(trimmed) || /^[IVXLCDM]+\.\s+[A-Z\s]+$/.test(trimmed);
      if (isHeading) {
        return `<p class="heading-13pt">${trimmed}</p>`;
      }
      return `<p>${trimmed}</p>`;
    }).join('\n');

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${cleanOutputLabel} — ${form.caseTitle}</title>
<style>
  @page { margin: 1in; }
  body { 
    font-family: 'Times New Roman', Times, 'Noto Sans Devanagari', 'Noto Sans', serif; 
    font-size: 11pt; 
    line-height: 1.15; 
    color: #000; 
    margin: 0;
    padding: 0;
  }
  h1 { font-size: 13pt; font-weight: bold; text-align: center; margin-bottom: 12px; text-transform: uppercase; }
  .meta { font-size: 9pt; border-bottom: 1px solid #aaa; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; font-family: sans-serif; }
  .content { text-align: justify; }
  p { margin: 0 0 6pt 0; }
  .heading-13pt { font-size: 13pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; text-transform: uppercase; }
</style></head><body>
<h1>${titleText}</h1>
<div class="meta"><span><b>${caseText}:</b> ${form.caseTitle} | <b>${caseNoText}:</b> ${form.caseNumber}</span><span><b>${dateText}:</b> ${dateStr}</span></div>
<div class="content">${contentHTML}</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
</body></html>`);
    win.document.close();
  };

  // ── COPY ─────────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!displayOutput) { toast.error('Generate an argument first.'); return; }
    const cleanText = displayOutput.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\*\*/g, '');
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard!');
    });
  };

  // ── SAVE TO CASE ─────────────────────────────────────────────────────────────
  const handleSaveToCase = async () => {
    if (!displayOutput) { toast.error('Generate an argument first.'); return; }
    if (!caseId) { toast.error('No active case. Please open a case first.'); return; }

    setSaving(true);
    const tid = toast.loading('Saving to case...');
    try {
      // Build entry to save
      const entry = {
        id: `arg_${Date.now()}`,
        type: outputLabel,
        actionId: activeAction || 'unknown',
        text: displayOutput,
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
                  <h2 className="text-base font-black text-white leading-none">Argument Builder</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] text-emerald-300 font-black uppercase tracking-widest">AI ACTIVE</span>
                  </div>
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
              <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-300 divide-y divide-slate-100 dark:divide-white/5 ${showOutput ? 'lg:max-w-[58%] border-r border-slate-200 dark:border-white/5' : 'max-w-4xl mx-auto w-full'}`}>
 
                {/* Case Information */}
                <div>
                  <SectionHdr title="Case Information" open={sec.s1} onToggle={() => tog('s1')} />
                  {sec.s1 && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Case Title <span className="text-red-500">*</span>
                          <AutoFilledBadge field="caseTitle" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('caseTitle') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.caseTitle} onChange={e => upd('caseTitle', e.target.value)} placeholder="e.g. XYZ vs ABC" />
                      </div>
                      <div className="flex flex-col gap-1.5 col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
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
 
                {/* Parties */}
                <div>
                  <SectionHdr title="Parties" open={sec.s2} onToggle={() => tog('s2')} />
                  {sec.s2 && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Petitioner <span className="text-red-500">*</span>
                          <AutoFilledBadge field="petitioner" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('petitioner') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.petitioner} onChange={e => upd('petitioner', e.target.value)} placeholder="Full legal name" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Respondent <span className="text-red-500">*</span>
                          <AutoFilledBadge field="respondent" />
                        </label>
                        <input className={`${inputCls} ${prefillFields.has('respondent') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.respondent} onChange={e => upd('respondent', e.target.value)} placeholder="Full legal name" />
                      </div>
                    </div>
                  )}
                </div>
 
                {/* Case Facts */}
                <div>
                  <SectionHdr title="Facts" open={sec.s3} onToggle={() => tog('s3')} />
                  {sec.s3 && (
                    <div className="p-4">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                        Facts of the Case <span className="text-red-500">*</span>
                        <AutoFilledBadge field="caseFacts" />
                      </label>
                      <textarea rows={6} value={f.caseFacts} onChange={e => upd('caseFacts', e.target.value)}
                        placeholder="Enter complete facts of the case including dates, events, parties' actions, prior proceedings, previous orders, and all relevant background information..."
                        className={`${inputCls} resize-y min-h-[100px] leading-relaxed ${prefillFields.has('caseFacts') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
                      />
                    </div>
                  )}
                </div>
 
                {/* Advanced Options Accordion */}
                <div className="border-t border-slate-100 dark:border-white/5">
                  <SectionHdr title="Advanced Options" open={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)} />
                  {showAdvanced && (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                      {/* Sub-section: Technical details */}
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            Case Number
                            <AutoFilledBadge field="caseNumber" />
                          </label>
                          <input className={`${inputCls} ${prefillFields.has('caseNumber') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.caseNumber} onChange={e => upd('caseNumber', e.target.value)} placeholder="CS(OS) 123/2024" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            Court Name
                            <AutoFilledBadge field="courtName" />
                          </label>
                          <input className={`${inputCls} ${prefillFields.has('courtName') ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`} value={f.courtName} onChange={e => upd('courtName', e.target.value)} placeholder="e.g. Delhi High Court" />
                        </div>
                      </div>
 
                      {/* Issues */}
                      <div className="p-4 space-y-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block mb-1">Issues for Determination</span>
                        {f.issues.map((issue, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input value={issue} onChange={e => upd('issues', f.issues.map((x, idx) => idx === i ? e.target.value : x))}
                              placeholder="e.g. Whether the contract dated ___ is legally valid?"
                              className={`${inputSmCls} flex-1 w-full`} />
                            {f.issues.length > 1 && (
                              <button onClick={() => upd('issues', f.issues.filter((_, idx) => idx !== i))}
                                className="p-1.5 text-red-400 hover:text-red-600 rounded-lg shrink-0">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => upd('issues', [...f.issues, ''])}
                          className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700">
                          <Plus size={13} /> Add Issue
                        </button>
                      </div>
 
                      {/* Provisions */}
                      <div className="p-4 space-y-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block mb-1">Legal Provisions</span>
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
                                className="p-1.5 text-red-400 hover:text-red-600 rounded-lg shrink-0">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => upd('provisions', [...f.provisions, { act: '', sections: '' }])}
                          className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700">
                          <Plus size={13} /> Add Provision
                        </button>
                      </div>
 
                      {/* Evidence */}
                      <div className="p-4 space-y-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block mb-1">Evidence & Documents</span>
                        {f.evidences.map((ev, i) => (
                          <div key={i} className="border border-slate-200 dark:border-zinc-700 rounded-2xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400">Evidence {i + 1}</span>
                              {f.evidences.length > 1 && (
                                <button onClick={() => upd('evidences', f.evidences.filter((_, idx) => idx !== i))}
                                  className="p-1 text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                              )}
                            </div>
                            <input value={ev.title} onChange={e => upd('evidences', f.evidences.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                              placeholder="Evidence Title" className={`${inputSmCls} w-full`} />
                            <textarea rows={2} value={ev.description} onChange={e => upd('evidences', f.evidences.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                              placeholder="Description..." className={`${inputCls} resize-none`} />
                          </div>
                        ))}
                        <button onClick={() => upd('evidences', [...f.evidences, { title: '', description: '', files: [] }])}
                          className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700">
                          <Plus size={13} /> Add Evidence
                        </button>
                      </div>
 
                      {/* Case Laws */}
                      <div className="p-4 space-y-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block mb-1">Case Laws / Precedents</span>
                        {f.caseLaws.map((cl, i) => (
                          <div key={i} className="border border-slate-200 dark:border-zinc-700 rounded-2xl p-3 space-y-2">
                            <input value={cl.name} onChange={e => upd('caseLaws', f.caseLaws.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                              placeholder="Case Name" className={`${inputSmCls} w-full`} />
                            <input value={cl.citation} onChange={e => upd('caseLaws', f.caseLaws.map((x, idx) => idx === i ? { ...x, citation: e.target.value } : x))}
                              placeholder="Citation" className={`${inputSmCls} w-full`} />
                          </div>
                        ))}
                        <button onClick={() => upd('caseLaws', [...f.caseLaws, { name: '', citation: '', principle: '' }])}
                          className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700">
                          <Plus size={13} /> Add Precedent
                        </button>
                      </div>
                    </div>
                  )}
                </div>
 
                {/* Build Argument Primary Action */}
                <div className="p-5 flex justify-end shrink-0">
                  <button
                    onClick={() => handleGenerate('written')}
                    disabled={generating}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-black transition-all shadow-md shadow-violet-500/20 active:scale-95 disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Build Argument</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
 
              {/* ── RIGHT: AI OUTPUT ────────────────────────────────── */}
              {showOutput && (
                <div ref={outputRef} className="lg:w-[42%] flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-[#060d1a]">
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Output Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-white/5 shrink-0 bg-white/50 dark:bg-black/20">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${generating ? 'bg-violet-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{outputLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!generating && output && (
                          <>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleGenerate(e.target.value);
                                }
                              }}
                              className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-xl text-[10px] font-bold outline-none cursor-pointer border border-slate-200 dark:border-zinc-700 font-sans"
                            >
                              <option value="">Regenerate as...</option>
                              {AI_ACTIONS.map(act => (
                                <option key={act.id} value={act.id}>{act.label}</option>
                              ))}
                            </select>
                            <LanguageToggle
                              lang={outputLang}
                              onChange={setOutputLang}
                              isTranslating={isOutputTranslating}
                            />
                          </>
                        )}
                        <button onClick={() => { setShowOutput(false); setOutput(''); }}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
 
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0 font-sans">
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
                        <div id="argument-rendered-output">
                          <RenderedOutput text={displayOutput} />
                        </div>
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
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
 
export default BuildArgumentModal;
