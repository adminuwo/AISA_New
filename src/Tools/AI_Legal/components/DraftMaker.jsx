import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronLeft, FileText, Download, Copy, Share2, Edit3, CheckCircle2,
  Search, Gavel, Shield, Landmark, Users, Briefcase, Home, X, ChevronRight,
  Printer, Save, FileDown, Plus, Layout, Scale, ShieldAlert, CreditCard,
  Laptop, FileCheck, Globe, Lock, Heart, Award, Calendar, Clock, Folder,
  Check, Zap, Languages, BookOpen, AlertCircle, RefreshCw, History,
  ChevronDown, ChevronUp, Info, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { mapCaseToForm } from '../services/activeModuleService';
import { useActiveCase } from '../context/ActiveCaseContext';
import { getTemplate, GENERATION_MODES, DRAFT_TEMPLATES } from '../data/draftTemplates';
import CountrySelect from './CountrySelect';
import StateSelect from './StateSelect';
import DistrictSelect from './DistrictSelect';
import PoliceStationSelect from './PoliceStationSelect';
import SectionSelect from './SectionSelect';
import { CRIMINAL_SECTIONS, getSuggestionKeywords } from '../data/criminalLawData';
import useOutputLanguage from '../hooks/useOutputLanguage';
import LanguageToggle from './shared/LanguageToggle';
import CopyOutputButton from './shared/CopyOutputButton';

// ── Country field definition (injected after every *address field) ────────────
const COUNTRY_FIELD = {
  key: 'country',
  label: 'Country',
  type: 'country',
  required: true,
  placeholder: 'Search and select country...',
};

// ── State / Province field definition (injected directly below Country) ──────
const STATE_FIELD = {
  key: 'state',
  label: 'State / Province',
  type: 'state',
  required: true,
  placeholder: 'Search and select state / province...',
};

// ── District field definition (injected directly below State / Province) ──────
const DISTRICT_FIELD = {
  key: 'district',
  label: 'District',
  type: 'district',
  required: true,
  placeholder: 'Search and select district...',
};

// ── Police Station field definition (injected directly below District) ────────
const POLICE_STATION_FIELD = {
  key: 'policeStation',
  label: 'Police Station',
  type: 'policeStation',
  required: true,
  placeholder: 'Search and select police station...',
};

// ── Build enriched field list: inject Country, State, District, Police Station sequence ──
const buildEnrichedFields = (originalFields) => {
  const fields = originalFields.map(f => f.key === 'ipcSections' ? { ...f, type: 'sections' } : f);
  // 1. Check if the original fields contains policeStation or district keys
  const hasPoliceStation = fields.some(f => {
    const k = f.key.toLowerCase();
    return k === 'policestation' || k === 'police_station' || k === 'district';
  });

  // 2. Filter out any existing location/police station fields to prevent duplicates
  const cleanedFields = fields.filter(f => {
    const k = f.key.toLowerCase();
    return k !== 'country' && k !== 'state' && k !== 'province' && k !== 'district' && k !== 'policestation' && k !== 'police_station';
  });

  const result = [];
  let injected = false;
  let firstAddressIdx = -1;

  // Find index of first address-related field
  for (let i = 0; i < cleanedFields.length; i++) {
    const lk = cleanedFields[i].key.toLowerCase();
    if (lk.includes('address') || lk.includes('addr')) {
      firstAddressIdx = i;
      break;
    }
  }

  if (firstAddressIdx !== -1) {
    // Inject right after the first address field
    cleanedFields.forEach((field, idx) => {
      result.push(field);
      if (idx === firstAddressIdx) {
        result.push(COUNTRY_FIELD);
        result.push(STATE_FIELD);
        if (hasPoliceStation) {
          result.push(DISTRICT_FIELD);
          result.push(POLICE_STATION_FIELD);
        }
        injected = true;
      }
    });
  } else if (hasPoliceStation) {
    // If it has policeStation but no address field, inject Country -> State -> District -> Police Station
    // at the index where policeStation was originally found (or index 2 as fallback)
    const originalPoliceStationIdx = fields.findIndex(f => {
      const k = f.key.toLowerCase();
      return k === 'policestation' || k === 'police_station' || k === 'district';
    });
    const insertIdx = originalPoliceStationIdx !== -1 ? originalPoliceStationIdx : 2;

    cleanedFields.forEach((field, idx) => {
      if (idx === insertIdx) {
        result.push(COUNTRY_FIELD);
        result.push(STATE_FIELD);
        result.push(DISTRICT_FIELD);
        result.push(POLICE_STATION_FIELD);
        injected = true;
      }
      result.push(field);
    });

    if (!injected) {
      result.push(COUNTRY_FIELD);
      result.push(STATE_FIELD);
      result.push(DISTRICT_FIELD);
      result.push(POLICE_STATION_FIELD);
      injected = true;
    }
  } else {
    // Regular injection of Country & State / Province (for forms without policeStation)
    cleanedFields.forEach((field, idx) => {
      result.push(field);
      if (idx === 1) { // Inject as 3rd field
        result.push(COUNTRY_FIELD);
        result.push(STATE_FIELD);
        injected = true;
      }
    });
    if (!injected) {
      result.push(COUNTRY_FIELD);
      result.push(STATE_FIELD);
    }
  }

  return result;
};

// ─── Category Icon map ────────────────────────────────────────────────────────
const CAT_ICONS = {
  'CRIMINAL LAW': <Gavel size={15} className="text-red-500" />,
  'CIVIL LAW': <Scale size={15} className="text-blue-500" />,
  'FAMILY LAW': <Users size={15} className="text-pink-500" />,
  'PROPERTY LAW': <Home size={15} className="text-amber-500" />,
  'CORPORATE LAW': <Briefcase size={15} className="text-violet-500" />,
  'BANKING & FINANCE': <Landmark size={15} className="text-emerald-500" />,
  'LABOUR LAW': <Shield size={15} className="text-orange-500" />,
  'CONSUMER COURT': <CreditCard size={15} className="text-cyan-500" />,
  'CYBER LAW': <Laptop size={15} className="text-indigo-500" />,
  'TAX & GST': <FileCheck size={15} className="text-lime-600" />,
  'INTELLECTUAL PROPERTY': <Lock size={15} className="text-purple-500" />,
  'COURT & DOCUMENTS': <FileText size={15} className="text-slate-500" />,
  'GENERAL': <FileText size={15} className="text-slate-500" />,
};

const CAT_COLORS = {
  'CRIMINAL LAW': 'border-red-200 dark:border-red-900/30',
  'CIVIL LAW': 'border-blue-200 dark:border-blue-900/30',
  'FAMILY LAW': 'border-pink-200 dark:border-pink-900/30',
  'PROPERTY LAW': 'border-amber-200 dark:border-amber-900/30',
  'CORPORATE LAW': 'border-violet-200 dark:border-violet-900/30',
  'BANKING & FINANCE': 'border-emerald-200 dark:border-emerald-900/30',
  'LABOUR LAW': 'border-orange-200 dark:border-orange-900/30',
  'CONSUMER COURT': 'border-cyan-200 dark:border-cyan-900/30',
  'CYBER LAW': 'border-indigo-200 dark:border-indigo-900/30',
  'TAX & GST': 'border-lime-200 dark:border-lime-900/30',
  'INTELLECTUAL PROPERTY': 'border-purple-200 dark:border-purple-900/30',
  'COURT & DOCUMENTS': 'border-slate-200 dark:border-slate-800',
};

// ─── Derived categories from templates ────────────────────────────────────────
const buildCategories = () => {
  const catMap = {};
  Object.entries(DRAFT_TEMPLATES).forEach(([draftType, tmpl]) => {
    const cat = tmpl.category;
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push(draftType);
  });
  return Object.entries(catMap).map(([title, items]) => ({ title, items }));
};
const ALL_CATEGORIES = buildCategories();

// ─── Field renderer ───────────────────────────────────────────────────────────
const FieldInput = ({ field, value, onChange, filled, country, state, district }) => {
  const base = `w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
    filled
      ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-700/50 text-slate-800 dark:text-white'
      : 'bg-white dark:bg-[#141E35] border-slate-200 dark:border-white/8 text-slate-800 dark:text-white'
  }`;

  if (field.type === 'sections') {
    return (
      <SectionSelect
        value={value || ''}
        onChange={onChange}
        filled={filled}
        placeholder={field.placeholder || 'Search and select sections...'}
        required={field.required}
      />
    );
  }
  if (field.type === 'country') {
    return (
      <CountrySelect
        value={value || ''}
        onChange={onChange}
        filled={filled}
        placeholder={field.placeholder || 'Search and select country...'}
        required={field.required}
      />
    );
  }
  if (field.type === 'state') {
    return (
      <StateSelect
        country={country}
        value={value || ''}
        onChange={onChange}
        filled={filled}
        placeholder={field.placeholder || 'Search and select state / province...'}
        required={field.required}
      />
    );
  }
  if (field.type === 'district') {
    return (
      <DistrictSelect
        state={state}
        value={value || ''}
        onChange={onChange}
        filled={filled}
        placeholder={field.placeholder || 'Search and select district...'}
        required={field.required}
      />
    );
  }
  if (field.type === 'policeStation') {
    return (
      <PoliceStationSelect
        district={district}
        value={value || ''}
        onChange={onChange}
        filled={filled}
        placeholder={field.placeholder || 'Search and select police station...'}
        required={field.required}
      />
    );
  }
  if (field.type === 'date') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={base}
      />
    );
  }
  if (field.type === 'select' && field.options) {
    return (
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={base}
      >
        <option value="">— Select {field.label} —</option>
        {field.options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        rows={4}
        placeholder={field.placeholder || `Enter ${field.label}...`}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={`${base} resize-y min-h-[100px] leading-relaxed`}
      />
    );
  }
  return (
    <input
      type="text"
      placeholder={field.placeholder || `Enter ${field.label}...`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={base}
    />
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const DraftMaker = ({ currentCase, onBack, theme, allProjects = [] }) => {
  const isDark = theme === 'dark';

  // ── Navigation state ──
  const [step, setStep] = useState('SELECT'); // SELECT | FORM | GENERATING | PREVIEW | SAVED
  const [selectedType, setSelectedType] = useState(null);
  const [template, setTemplate] = useState(null);

  // ── Form state ──
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [linkedCaseId, setLinkedCaseId] = useState(currentCase?._id || '');
  const [prefillData, setPrefillData] = useState(null);
  const [prefillBanner, setPrefillBanner] = useState(false);
  const [filledFields, setFilledFields] = useState(new Set());

  // ── Generation state ──
  const [generationMode, setGenerationMode] = useState('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [finalDraft, setFinalDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [draftVersion, setDraftVersion] = useState(1);
  const [draftVersionHistory, setDraftVersionHistory] = useState([]);

  // ── Saved drafts state ──
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [savedNotice, setSavedNotice] = useState(null);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);
  const [generationTimestamp, setGenerationTimestamp] = useState('');

  // ─ Language Toggle state ────────────────────────────────────────
  const {
    outputLang,
    setOutputLang,
    isTranslating: isDraftTranslating,
    setIsTranslating: setIsDraftTranslating,
    getDisplayText: getDraftDisplayText,
    translateText: translateDraftText,
  } = useOutputLanguage('draft_maker', currentCase?._id || 'global');
  const [draftDisplayText, setDraftDisplayText] = useState('');
  const draftMountedRef = useRef(true);
  useEffect(() => { draftMountedRef.current = true; return () => { draftMountedRef.current = false; }; }, []);

  // Reset display text when finalDraft changes
  useEffect(() => {
    if (finalDraft) {
      if (outputLang === 'en') {
        setDraftDisplayText(finalDraft);
      } else {
        handleDraftLangChange(outputLang);
      }
    } else {
      setDraftDisplayText('');
    }
  }, [finalDraft]); // eslint-disable-line

  const handleDraftLangChange = useCallback(async (newLang) => {
    setOutputLang(newLang);
    if (!finalDraft) return;
    if (newLang === 'en') {
      setDraftDisplayText(finalDraft);
      return;
    }
    const cached = getDraftDisplayText(finalDraft);
    if (cached && cached !== finalDraft) {
      setDraftDisplayText(cached);
      return;
    }
    setIsDraftTranslating(true);
    try {
      const translated = await translateDraftText(finalDraft);
      if (draftMountedRef.current) setDraftDisplayText(translated);
    } catch {
      if (draftMountedRef.current) setDraftDisplayText(finalDraft);
    } finally {
      if (draftMountedRef.current) setIsDraftTranslating(false);
    }
  }, [finalDraft, getDraftDisplayText, setOutputLang, setIsDraftTranslating, translateDraftText]);

  // ─ UI state ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCat, setActiveCat] = useState('ALL');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const previewRef = useRef(null);

  // Get active case context
  const activeCaseContext = useActiveCase();
  const triggerAutoRun = activeCaseContext?.triggerAutoRun;

  // ── Handle active case context ──
  useEffect(() => {
    if (currentCase) {
      const mapped = mapCaseToForm(currentCase);
      setPrefillData(mapped);
      setPrefillBanner(true);
      setLinkedCaseId(currentCase._id);
    }
  }, [currentCase]);

  // ── Execute Auto-Run ──
  useEffect(() => {
    if (triggerAutoRun && currentCase) {
      toast.success(`✓ Case data ready — pick a template to auto-fill`, { icon: '💼', duration: 3500 });
    }
  }, [triggerAutoRun, currentCase]);

  // ── Filtered draft types ──
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return ALL_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        q === '' || item.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q)
      )
    })).filter(cat =>
      (activeCat === 'ALL' || cat.title === activeCat) && cat.items.length > 0
    );
  }, [searchQuery, activeCat]);

  // ── Smart prefill for form fields ──
  const applyPrefill = useCallback((tmpl, mapped) => {
    if (!tmpl?.fields || !mapped) return {};
    const filled = {};
    const filledSet = new Set();
    tmpl.fields.forEach(field => {
      const k = field.key;
      const lk = k.toLowerCase();
      const ll = field.label.toLowerCase();
      let val = '';
      if (k === 'country') {
        // Use country from case data or default to India
        val = mapped._raw?.country || mapped._raw?.jurisdiction || 'India';
      } else if (k === 'state') {
        val = mapped._raw?.state || mapped._raw?.province || '';
      } else if (k === 'district') {
        val = mapped._raw?.district || '';
      } else if (k === 'policeStation') {
        val = mapped._raw?.policeStation || mapped._raw?.police_station || '';
      } else if (lk.includes('petitioner') || lk.includes('plaintiff') || lk.includes('complainant') || lk.includes('applicant') || lk.includes('claimant') || ll.includes('party 1') || lk.includes('creditor') || lk.includes('sender') || lk.includes('aggrieved') || lk.includes('borrower') || lk.includes('employee')) {
        val = mapped.petitioner || '';
      } else if (lk.includes('respondent') || lk.includes('defendant') || lk.includes('accused') || lk.includes('debtor') || lk.includes('receiver') || lk.includes('harasser') || lk.includes('employer') || ll.includes('party 2') || lk.includes('opposite')) {
        val = mapped.respondent || '';
      } else if (lk.includes('court') || lk.includes('jurisdiction') || lk.includes('forum') || lk.includes('tribunal')) {
        val = mapped.courtName || '';
      } else if (lk.includes('casefact') || lk.includes('facts') || lk.includes('incident') || lk.includes('description') || lk.includes('background') || lk.includes('detail') || lk.includes('scenario')) {
        val = mapped.caseFacts || '';
      } else if (lk.includes('casenumber') || lk.includes('case_no') || (lk.includes('number') && lk.includes('case')) || lk.includes('fir_no') || lk.includes('firnumber')) {
        val = mapped.caseNumber || '';
      } else if (lk.includes('casetype') || (lk.includes('type') && lk.includes('case'))) {
        val = mapped.caseType || '';
      } else if (lk.includes('advocate') || lk.includes('counsel') || lk.includes('lawyer')) {
        val = mapped.advocateName || '';
      } else if (lk.includes('section') || lk.includes('provision') || lk.includes('ipc') || lk.includes('act')) {
        val = mapped.provisions || '';
      } else if (lk.includes('evidence')) {
        val = mapped.evidenceSummary || '';
      } else if (lk.includes('title') || lk.includes('subject') || lk.includes('matter')) {
        val = mapped.caseTitle || '';
      } else if (lk.includes('address')) {
        if (lk.includes('applicant') || lk.includes('petitioner') || lk.includes('plaintiff') || lk.includes('complainant')) {
          val = mapped._raw?.clientAddress || '';
        }
      }
      if (val) {
        filled[k] = val;
        filledSet.add(k);
      }
    });
    return { filled, filledSet };
  }, []);

  // ── Select a draft type ──
  const handleSelectType = useCallback((draftType) => {
    const tmpl = getTemplate(draftType);
    // Build enriched fields (with injected Country field)
    const enrichedFields = buildEnrichedFields(tmpl.fields);
    const enrichedTmpl = { ...tmpl, fields: enrichedFields };
    setSelectedType(draftType);
    setTemplate(enrichedTmpl);
    setErrors({});
    setFinalDraft('');
    setDraftVersion(1);
    setDraftVersionHistory([]);
    setIsEditing(false);
    setExportHistory([]);
    setGenerationTimestamp('');
    if (currentCase) {
      apiService.updateProject(currentCase._id, {
        ...currentCase,
        activeDraftWork: null
      }).then(res => {
        if (onUpdateCase) onUpdateCase(res);
      }).catch(err => console.error("Failed to clear active draft work in DB", err));
    }

    // Auto-prefill from intent
    let initialData = {};
    let initialFilled = new Set();
    if (prefillData) {
      const { filled, filledSet } = applyPrefill(enrichedTmpl, prefillData);
      // Default country to India if not prefilled
      if (!filled['country']) { filled['country'] = 'India'; filledSet.add('country'); }
      initialData = filled;
      initialFilled = filledSet;
      if (filledSet.size > 0) toast.success(`✓ ${filledSet.size} fields auto-filled`, { icon: '✨' });
    } else {
      // Default country = India
      initialData = { country: 'India' };
    }
    setFormData(initialData);
    setFilledFields(initialFilled);
    setStep('FORM');
  }, [prefillData, applyPrefill]);

  // ── Case select auto-fill ──
  const handleCaseSelect = useCallback((caseId) => {
    setLinkedCaseId(caseId);
    if (caseId && template) {
      const selected = allProjects.find(c => c._id === caseId);
      if (selected) {
        const mapped = mapCaseToForm(selected);
        const { filled, filledSet } = applyPrefill(template, mapped);
        // Default country
        if (!filled['country']) filled['country'] = 'India';
        filledSet.add('country');
        setFormData(prev => ({ ...prev, ...filled }));
        setFilledFields(prev => new Set([...prev, ...filledSet]));
        toast.success(`✓ ${filledSet.size} fields filled from "${selected.name}"`);
      }
    }
  }, [template, allProjects, applyPrefill]);

  // ── Validation ──
  const validate = () => {
    const errs = {};
    template?.fields?.forEach(field => {
      const val = formData[field.key];
      // country field value is a string without .trim issue, handle separately
      if (field.required && !val?.toString().trim()) {
        errs[field.key] = `${field.label} is required`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Build generation prompt ──
  const buildPrompt = (mode, tmpl, data, draftType, caseContext) => {
    // 1. Compile form fields
    const fieldData = tmpl.fields.map(f => `${f.label} (${f.key}): ${data[f.key] || 'Not provided'}`).join('\n');
    
    // 2. Extra Active Case Context (if linkedCaseId is present)
    let caseExtra = '';
    if (linkedCaseId) {
      const c = allProjects.find(p => p._id === linkedCaseId);
      if (c) {
        caseExtra = `\n[ACTIVE CASE DATABASE CONTEXT]:\n` +
          `Case Title/Name: ${c.title || c.name || ''}\n` +
          `Case Description/Facts: ${c.description || c.caseSummary || ''}\n` +
          `Client (Petitioner): ${c.clientName || 'N/A'}\n` +
          `Opponent (Respondent): ${c.accused || c.opponentName || 'N/A'}\n` +
          `Court Name: ${c.courtName || 'N/A'}\n` +
          `Jurisdiction: ${c.jurisdiction || 'N/A'}\n` +
          `Applicable Sections: ${c.sections || 'N/A'}\n` +
          `Evidence/Documents Available: ${c.documents?.map(d => d.name).join(', ') || 'None uploaded'}\n` +
          `---------------------------`;
      }
    }

    const courtHeader = tmpl.courtHeader || 'IN THE HON\'BLE COURT';
    
    // Choose instructions based on mode
    let modeInstruction = '';
    
    if (mode === 'standard') {
      modeInstruction = `
[GENERATION MODE: STANDARD DRAFT]
Generate a complete, professionally formatted legal draft.
Structure the document containing:
1. DRAFT CONTENT: The complete text of the ${draftType} incorporating all form fields.
2. CASE SUMMARY: A concise 1-paragraph summary of the case facts.
3. LEGAL FORMAT: A brief explanation of the legal drafting format and rules applied.
Ensure professional layout and correct terminology.`;
    } else if (mode === 'enhanced') {
      modeInstruction = `
[GENERATION MODE: ENHANCED DRAFT]
Generate an advanced legal draft leveraging senior advocate-grade legal reasoning and stronger legal language.
You MUST explicitly incorporate:
- Detailed references to applicable laws and statutes.
- Specified IPC/BNS Sections: ${data.ipcSections || 'None selected'}.
- Relevant landmark case laws, precedents, and citations of the Supreme Court or High Courts.
- Coherent, strong supporting legal arguments based on case facts.
- Context of the available evidence: ${data.evidenceAvailable || data.evidence || 'None selected'}.
Draft the petition/document with a high level of sophistication, legal weight, and deep legal reasoning.`;
    } else if (mode === 'court_ready') {
      modeInstruction = `
[GENERATION MODE: COURT-READY DRAFT]
Generate a final, official, filing-ready court petition.
It MUST strictly include the following sections in exact court layout:
1. COURT HEADING: "${courtHeader}" at the top.
2. CASE DETAILS: Case/FIR No. space and Year.
3. PARTIES LAYOUT: Proper Petitioner vs Respondent names, ages, and addresses.
4. FACTS OF THE MATTER: Detailed chronological narrative paragraphs.
5. LEGAL GROUNDS: Specific numbered grounds referencing legal principles.
6. APPLICABLE PROVISIONS: Detailed statutory sections and IPC/BNS sections invoked.
7. PRAYER CLAUSE: Formal, complete prayer seeking specific reliefs.
8. VERIFICATION BLOCK: The standard verification/affidavit clause confirming facts.
9. SIGNATURE BLOCKS: Designated placeholders for the Petitioner, Advocate, Date, and Place.
Must be 100% complete and ready for submission to a court of law.`;
    } else if (mode === 'hindi') {
      modeInstruction = `
[GENERATION MODE: HINDI VERSION]
Generate the complete legal draft entirely in formal, professional legal Hindi (Devanagari script).
Requirements:
- Use standard court vocabulary (e.g., 'याचिकाकर्ता', 'प्रत्यर्थी', 'प्रार्थना', 'सत्यापन', 'अधिवक्ता').
- Maintain proper court-room formatting.
- Ensure natural, accurate legal translations and phrasing (no broken word-for-word machine translation).`;
    } else if (mode === 'english') {
      modeInstruction = `
[GENERATION MODE: ENGLISH VERSION]
Generate the complete legal draft entirely in professional, advocate-grade legal English.
Requirements:
- Use sophisticated legal terms and active advocacy language.
- Format strictly according to high court standards.`;
    } else if (mode === 'bilingual') {
      modeInstruction = `
[GENERATION MODE: BILINGUAL VERSION]
Generate both the English and Hindi versions of the complete legal draft in a single document.
Use the following strict layout:

[ENGLISH SECTION]
[Insert the complete legal draft in formal English here]

----------------

[HINDI SECTION]
[Insert the complete legal draft in formal Hindi (Devanagari script) here]

Ensure both sections are fully detailed and match each other's facts completely.`;
    }

    return `You are a Senior Advocate of the Supreme Court of India with 25+ years of litigation experience. 
Draft a complete, professionally formatted ${draftType} document.

${caseContext ? `[ACTIVE CASE CONTEXT: ${caseContext}]\n` : ''}
${caseExtra}

FORM DATA PROVIDED:
${fieldData}

INSTRUCTIONS FOR GENERATION:
${modeInstruction}

ADDITIONAL RULES:
- Use formal legal style, no casual remarks, and format all currency amounts in Indian Rupees (₹).
- Output in clean, well-formatted Markdown with bold titles.
- Always output the complete text — never truncate or leave sections unfinished.

Generate the draft now:`;
  };

  // ── History logger helper ──
  const addToExportHistory = useCallback((action) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logStr = `${action} at ${timeStr}`;
    setExportHistory(prev => [...prev, logStr]);
  }, []);

  // ── Generate draft ──
  const handleGenerate = async (mode = generationMode) => {
    if (!validate()) {
      toast.error('Please fill all required fields before generating');
      return;
    }

    if (finalDraft && !window.confirm("Are you sure you want to generate a new draft? This will replace the current content.")) {
      return;
    }

    setIsGenerating(true);
    setStep('GENERATING');

    const statusMessages = [
      'Analysing case facts...',
      'Applying legal framework...',
      'Drafting court format document...',
      'Adding legal provisions...',
      'Finalising prayer and verification...',
    ];
    let idx = 0;
    setGenerationStatus(statusMessages[0]);
    const interval = setInterval(() => {
      idx++;
      if (idx < statusMessages.length) setGenerationStatus(statusMessages[idx]);
    }, 2200);

    try {
      let caseCtx = '';
      if (linkedCaseId) {
        const c = allProjects.find(p => p._id === linkedCaseId);
        if (c) caseCtx = `Case: ${c.name} | Client: ${c.clientName || 'N/A'} | Court: ${c.courtName || 'N/A'}`;
      }

      const systemPrompt = `${template.systemPrompt}\nAlways generate the complete document — never truncate. Use formal legal language. Include all sections.`;
      const prompt = buildPrompt(mode, template, formData, selectedType, caseCtx);

      const resp = await generateChatResponse([], prompt, systemPrompt, [], 'English', null, 'legal');
      const text = resp?.reply || resp || '';

      if (!text.trim()) throw new Error('Empty response');

      // Save to version history
      setDraftVersionHistory(prev => [
        ...prev,
        { version: draftVersion, mode, content: finalDraft, timestamp: new Date().toLocaleTimeString() }
      ].filter(v => v.content));

      setFinalDraft(text);
      setDraftVersion(v => v + 1);
      setGenerationMode(mode);
      const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      setGenerationTimestamp(timestamp);
      setStep('PREVIEW');
      toast.success(`✓ ${selectedType} generated successfully!`, { icon: '⚖️' });
    } catch (err) {
      console.error(err);
      toast.error('Generation failed — please try again');
      setStep('FORM');
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  // ── Export: Print ──
  const handlePrint = () => {
    const textToPrint = draftDisplayText || finalDraft;
    const content = textToPrint
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n/g, '<br/>');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet"/>
      <title>${selectedType || 'Legal Draft'}</title>
      <style>
        body{font-family:'Noto Sans Devanagari','Noto Sans',Arial,sans-serif;padding:40px;line-height:1.9;font-size:13pt;color:#000;max-width:800px;margin:0 auto}
        h1{text-align:center;text-transform:uppercase;font-size:16pt;font-weight:bold;margin:20px 0;letter-spacing:1px}
        h2{font-size:14pt;font-weight:bold;margin:18px 0 10px;text-transform:uppercase}
        h3{font-size:13pt;font-weight:bold;margin:14px 0 8px}
        strong{font-weight:bold}
        .footer{margin-top:60px;border-top:2px solid #000;padding-top:15px;font-size:10pt;text-align:right}
        @media print{body{padding:20px}.footer{position:fixed;bottom:20px;right:20px;width:100%}}
      </style></head><body>
      ${content}
      <div class="footer">Generated by AISA Legal AI — ${new Date().toLocaleDateString('en-IN')} | ${selectedType}</div>
      </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
    addToExportHistory('Print Draft');
  };

  // ── Export: PDF ──
  const handleExportPDF = () => {
    addToExportHistory('Export PDF');
    handlePrint();
  };

  // ── Export: DOCX (Word Format) ──
  const handleExportDOCX = () => {
    const textToExport = draftDisplayText || finalDraft;
    if (!textToExport) return;
    const content = textToExport
      .replace(/\n/g, '<p style="margin-top:0in;margin-right:0in;margin-bottom:6.0pt;margin-left:0in;line-height:150%"></p>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
       
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${selectedType || 'Legal Draft'}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; padding: 1in; }
          p { margin: 0 0 6pt 0; text-align: justify; }
          h1 { text-align: center; text-transform: uppercase; font-size: 16pt; font-weight: bold; margin: 20px 0; }
          h2 { font-size: 14pt; font-weight: bold; margin: 18px 0 10px; text-transform: uppercase; }
          h3 { font-size: 12pt; font-weight: bold; margin: 14px 0 8px; }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>`;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedType || 'Legal_Draft').replace(/[^a-z0-9]/gi, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    
    addToExportHistory('Export DOCX');
    toast.success('Draft exported as Word DOC format');
  };

  // ── Export: Download TXT/MD/PDF/DOCX ──
  const handleDownload = () => {
    const choice = window.prompt('Enter download format (PDF, DOCX, TXT):', 'DOCX');
    if (!choice) return;
    
    const format = choice.toUpperCase().trim();
    if (format === 'PDF') {
      handleExportPDF();
    } else if (format === 'DOCX' || format === 'DOC') {
      handleExportDOCX();
    } else {
      const textToDownload = draftDisplayText || finalDraft;
      const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(selectedType || 'Legal_Draft').replace(/[^a-z0-9]/gi, '_')}_v${draftVersion}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      addToExportHistory('Download TXT');
      toast.success('Draft downloaded');
    }
  };

  // ── Export: Copy ──
  const handleCopy = () => {
    const textToCopy = draftDisplayText || finalDraft;
    navigator.clipboard.writeText(textToCopy);
    addToExportHistory('Copy Text');
    toast.success('Draft copied to clipboard');
  };

  // ── Export: Share ──
  const handleShare = async () => {
    const textToShare = draftDisplayText || finalDraft;
    if (navigator.share) {
      try {
        await navigator.share({ title: selectedType || 'Legal Draft', text: textToShare });
        addToExportHistory('Share Report');
      } catch (e) {
        if (e.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  // ── Save Draft ──
  const handleSave = async () => {
    const caseId = linkedCaseId || currentCase?._id;
    if (!caseId) {
      toast.error('Please select or link a case first to save this draft');
      return;
    }
    const targetCase = allProjects.find(p => p._id === caseId) || currentCase;
    if (!targetCase) {
      toast.error('Linked case not found');
      return;
    }
    const id = `DRAFT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const now = new Date();
    const newDraftItem = {
      id,
      type: selectedType || 'Legal Draft',
      content: finalDraft,
      createdAt: now.toISOString(),
      mode: generationMode,
      formData,
      version: draftVersion,
      exportHistory,
      generationTimestamp: generationTimestamp || now.toLocaleString('en-IN'),
      lastModified: now.toISOString()
    };

    try {
      const existingDrafts = targetCase.drafts || [];
      const updatedDrafts = [newDraftItem, ...existingDrafts];
      const payload = {
        ...targetCase,
        drafts: updatedDrafts
      };
      const response = await apiService.updateProject(caseId, payload);
      if (onUpdateCase) onUpdateCase(response);
      setSavedNotice({ id, date: now.toLocaleDateString('en-IN'), time: now.toLocaleTimeString('en-IN') });
      addToExportHistory('Save Draft');
      toast.success('Draft Saved Successfully');
    } catch (e) {
      console.error("Failed to save draft", e);
      toast.error('Failed to save draft');
    }
  };

  // ── Save to Case ──
  const handleSaveToCase = async () => {
    const targetCaseId = linkedCaseId || currentCase?._id;
    if (!targetCaseId) { toast.error('Link a case first to save draft to it'); return; }
    try {
      const c = allProjects.find(p => p._id === targetCaseId) || currentCase;
      if (!c) { toast.error('Case not found'); return; }
      
      const existingDrafts = c.drafts || [];
      const now = new Date();
      const id = `DRAFT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const newDraftItem = {
        id,
        type: selectedType,
        content: finalDraft,
        createdAt: now.toISOString(),
        mode: generationMode,
        formData,
        version: draftVersion,
        exportHistory,
        generationTimestamp: generationTimestamp || now.toLocaleString('en-IN'),
        lastModified: now.toISOString()
      };

      const payload = {
        ...c,
        drafts: [newDraftItem, ...existingDrafts]
      };
      const response = await apiService.updateProject(targetCaseId, payload);
      if (onUpdateCase) onUpdateCase(response);
      addToExportHistory('Save Draft to Case');
      toast.success('Draft saved to case!');
    } catch (e) {
      console.error('Failed to save to case:', e);
      toast.error('Failed to save to case');
    }
  };

  // ── Load Saved Drafts ──
  const loadSavedDrafts = useCallback(() => {
    setLoadingDrafts(true);
    try {
      const consolidated = [];
      allProjects.forEach(proj => {
        if (Array.isArray(proj.drafts)) {
          proj.drafts.forEach(d => {
            consolidated.push({
              id: d.id || `${proj._id}-${d.createdAt}`,
              title: d.type || d.title || 'Legal Draft',
              content: d.content,
              mode: d.mode,
              formData: d.formData,
              linkedCaseId: proj._id,
              caseName: proj.name,
              date: d.lastModified || d.createdAt || proj.updatedAt || new Date().toISOString(),
              version: d.version,
              exportHistory: d.exportHistory,
              generationTimestamp: d.generationTimestamp
            });
          });
        }
      });

      // Read local drafts for migration
      const localRaw = localStorage.getItem('@aisa_drafts');
      if (localRaw) {
        try {
          const localDrafts = JSON.parse(localRaw);
          if (Array.isArray(localDrafts) && localDrafts.length > 0) {
            if (currentCase) {
              const currentDrafts = currentCase.drafts || [];
              const draftsToMigrate = localDrafts.map(ld => ({
                id: ld.id,
                type: ld.title,
                content: ld.content,
                createdAt: ld.date || new Date().toISOString(),
                mode: ld.mode,
                formData: ld.formData,
                version: ld.version,
                exportHistory: ld.exportHistory,
                generationTimestamp: ld.generationTimestamp,
                lastModified: ld.date || new Date().toISOString()
              }));

              const payload = {
                ...currentCase,
                drafts: [...currentDrafts, ...draftsToMigrate]
              };

              apiService.updateProject(currentCase._id, payload).then(res => {
                if (onUpdateCase) onUpdateCase(res);
                localStorage.removeItem('@aisa_drafts');
              }).catch(err => console.error("Failed to migrate local drafts to DB", err));
            } else {
              localDrafts.forEach(ld => {
                if (!consolidated.some(c => c.id === ld.id)) {
                  consolidated.push({
                    ...ld,
                    caseName: 'Offline / Unlinked'
                  });
                }
              });
            }
          }
        } catch (e) {
          console.error("Failed to parse/migrate local drafts", e);
        }
      }

      consolidated.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSavedDrafts(consolidated);
    } finally {
      setLoadingDrafts(false);
    }
  }, [allProjects, currentCase]);

  useEffect(() => {
    if (step === 'SAVED') loadSavedDrafts();
  }, [step, loadSavedDrafts]);

  // Auto-save active draft workspace state to currentCase in database (debounced)
  useEffect(() => {
    if (!currentCase || !currentCase._id) return;
    if (!selectedType || !finalDraft) return;

    const handler = setTimeout(async () => {
      try {
        const state = {
          selectedType,
          finalDraft,
          formData,
          generationMode,
          draftVersion,
          exportHistory,
          generationTimestamp,
          linkedCaseId
        };
        if (JSON.stringify(currentCase.activeDraftWork) === JSON.stringify(state)) {
          return;
        }
        const payload = {
          ...currentCase,
          activeDraftWork: state
        };
        const response = await apiService.updateProject(currentCase._id, payload);
        if (onUpdateCase) onUpdateCase(response);
      } catch (err) {
        console.error("Failed to auto-save active draft work to DB:", err);
      }
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [selectedType, finalDraft, formData, generationMode, draftVersion, exportHistory, generationTimestamp, linkedCaseId, currentCase?._id]);

  // Restore active draft workspace state on mount or case load (if available)
  useEffect(() => {
    if (currentCase) {
      if (currentCase.activeDraftWork && currentCase.activeDraftWork.selectedType) {
        const state = currentCase.activeDraftWork;
        setSelectedType(state.selectedType);
        setTemplate(getTemplate(state.selectedType));
        setFinalDraft(state.finalDraft);
        setFormData(state.formData || {});
        setGenerationMode(state.generationMode || 'standard');
        setDraftVersion(state.draftVersion || 1);
        setExportHistory(state.exportHistory || []);
        setGenerationTimestamp(state.generationTimestamp || '');
        setLinkedCaseId(state.linkedCaseId || '');
        setStep('PREVIEW'); // Go straight to preview
        return;
      }

      const raw = localStorage.getItem('@aisa_active_draft_work');
      if (raw) {
        try {
          const state = JSON.parse(raw);
          if (state.selectedType) {
            setSelectedType(state.selectedType);
            setTemplate(getTemplate(state.selectedType));
            setFinalDraft(state.finalDraft);
            setFormData(state.formData || {});
            setGenerationMode(state.generationMode || 'standard');
            setDraftVersion(state.draftVersion || 1);
            setExportHistory(state.exportHistory || []);
            setGenerationTimestamp(state.generationTimestamp || '');
            setLinkedCaseId(state.linkedCaseId || '');
            setStep('PREVIEW'); // Go straight to preview

            const payload = {
              ...currentCase,
              activeDraftWork: state
            };
            apiService.updateProject(currentCase._id, payload).then(res => {
              if (onUpdateCase) onUpdateCase(res);
              localStorage.removeItem('@aisa_active_draft_work');
            }).catch(err => console.error("Failed to migrate local active draft work to DB", err));
          }
        } catch (e) {
          console.warn('Failed to restore/migrate active draft work:', e);
        }
      }
    }
  }, [currentCase?._id]);

  const handleDeleteDraft = async (id) => {
    let foundCase = null;
    let updatedDrafts = [];
    for (const proj of allProjects) {
      if (proj.drafts && proj.drafts.some(d => d.id === id || `${proj._id}-${d.createdAt}` === id)) {
        foundCase = proj;
        updatedDrafts = proj.drafts.filter(d => d.id !== id && `${proj._id}-${d.createdAt}` !== id);
        break;
      }
    }
    if (!foundCase) {
      toast.error('Draft not found in any case');
      return;
    }
    try {
      const payload = {
        ...foundCase,
        drafts: updatedDrafts
      };
      const response = await apiService.updateProject(foundCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
      setSavedDrafts(prev => prev.filter(d => d.id !== id));
      toast.success('Draft deleted from case');
    } catch (e) {
      console.error("Failed to delete draft", e);
      toast.error('Failed to delete draft');
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-50 dark:bg-transparent overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={step === 'SELECT' ? onBack : () => {
              if (step === 'FORM') setStep('SELECT');
              else if (step === 'PREVIEW') setStep('FORM');
              else setStep('SELECT');
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-none tracking-tight">
                {step === 'SELECT' ? 'Drafting Suite' : step === 'FORM' ? selectedType : step === 'PREVIEW' ? 'Document Preview' : 'Saved Drafts'}
              </h2>
              {step === 'FORM' && template && (
                <span className="text-[9px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full font-black uppercase tracking-wider">
                  {template.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">AI ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step === 'PREVIEW' && (
            <>
              <button onClick={handlePrint} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg" title="Print/PDF">
                <Printer size={16} className="text-slate-500" />
              </button>
              <button onClick={handleCopy} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg" title="Copy">
                <Copy size={16} className="text-slate-500" />
              </button>
              <button onClick={handleShare} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg" title="Share">
                <Share2 size={16} className="text-slate-500" />
              </button>
              <button onClick={handleDownload} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg" title="Download">
                <Download size={16} className="text-slate-500" />
              </button>
              <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wide">
                <Save size={13} /> Save
              </button>
            </>
          )}
          <button
            onClick={() => setStep('SAVED')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 rounded-xl text-xs font-black uppercase tracking-wide"
          >
            <Folder size={13} />
            <span className="hidden sm:inline">Saved</span>
          </button>
          <button
            onClick={() => setStep('SELECT')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40 rounded-xl text-xs font-black uppercase tracking-wide"
          >
            <Layout size={13} />
            <span className="hidden sm:inline">Templates</span>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

        {/* ══════════════ STEP: SELECT ══════════════ */}
        {step === 'SELECT' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 w-full">

            {/* Prefill Banner */}
            {prefillBanner && prefillData && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    Active Case Ready — {prefillData.caseTitle || 'Case data loaded'}
                  </p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/60 font-medium mt-0.5">
                    Select any template — all matching fields will be auto-filled from your case
                  </p>
                </div>
                <button onClick={() => setPrefillBanner(false)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full text-emerald-500 shrink-0">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Search + Category filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 shadow-sm">
                <Search className="text-slate-400 mr-3 shrink-0" size={18} />
                <input
                  type="text"
                  placeholder="Search draft types (Bail, Divorce, NDA, RTI...)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-slate-800 dark:text-white outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full ml-2">
                    <X size={14} className="text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setActiveCat('ALL')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${activeCat === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-[#1A2540] text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-white/5'}`}
              >
                All ({Object.keys(DRAFT_TEMPLATES).length})
              </button>
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat.title}
                  onClick={() => setActiveCat(cat.title)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${activeCat === cat.title ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-[#1A2540] text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-white/5'}`}
                >
                  {CAT_ICONS[cat.title]}
                  <span>{cat.title.replace(' LAW', '').replace(' & ', '/')}</span>
                </button>
              ))}
            </div>

            {/* Category grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full pb-6">
              {filteredCategories.map(cat => (
                <div
                  key={cat.title}
                  className={`bg-white dark:bg-[#1A2540] rounded-2xl shadow-sm border-l-4 ${CAT_COLORS[cat.title] || 'border-slate-200'} overflow-hidden`}
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/5">
                    {CAT_ICONS[cat.title]}
                    <h4 className="text-[10px] font-black tracking-widest text-slate-600 dark:text-slate-400 uppercase">{cat.title}</h4>
                    <span className="ml-auto text-[9px] font-bold text-slate-400 dark:text-slate-600">{cat.items.length}</span>
                  </div>
                  <div className="p-2 flex flex-col gap-1">
                    {cat.items.map(item => (
                      <button
                        key={item}
                        onClick={() => handleSelectType(item)}
                        className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-[#131C31] hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-700 dark:hover:text-indigo-300 text-left rounded-xl transition-all group text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        <span className="break-words pr-2 leading-snug">{item}</span>
                        <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search size={40} className="text-slate-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm font-black text-slate-400">No templates found for "{searchQuery}"</p>
                <button onClick={() => { setSearchQuery(''); setActiveCat('ALL'); }} className="mt-3 text-xs text-indigo-600 font-bold underline">Clear search</button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ STEP: FORM ══════════════ */}
        {step === 'FORM' && template && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-10">

            {/* Case Link Bar */}
            {allProjects.length > 0 && (
              <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                <label className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-2">
                  🔗 Link to Case (Auto-Fill All Fields)
                </label>
                <select
                  value={linkedCaseId}
                  onChange={e => handleCaseSelect(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                >
                  <option value="">Manual Entry (No Auto-Fill)</option>
                  {allProjects.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                {filledFields.size > 0 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
                    <CheckCircle2 size={11} /> {filledFields.size} fields auto-filled
                  </p>
                )}
              </div>
            )}

            {/* Form Fields */}
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                  {CAT_ICONS[template.category] || <FileText size={15} className="text-indigo-500" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{selectedType}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{template.fields.filter(f => f.required).length} required fields • {template.fields.length} total (incl. Country)</p>
                </div>
                {filledFields.size > 0 && (
                  <span className="ml-auto text-[9px] font-black px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                    ✓ {filledFields.size} auto-filled
                  </span>
                )}
              </div>

              {template.fields.map((field, i) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                    {filledFields.has(field.key) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[8px] font-bold normal-case tracking-normal">
                        <CheckCircle2 size={8} /> Auto Filled
                      </span>
                    )}
                  </label>
                  <FieldInput
                    field={field}
                    value={formData[field.key]}
                    onChange={val => {
                      setFormData(prev => {
                        const next = { ...prev, [field.key]: val };
                        // Clear dependent selections
                        if (field.key === 'country') {
                          next['state'] = '';
                          next['district'] = '';
                          next['policeStation'] = '';
                        } else if (field.key === 'state') {
                          next['district'] = '';
                          next['policeStation'] = '';
                        } else if (field.key === 'district') {
                          next['policeStation'] = '';
                        }
                        return next;
                      });
                      if (errors[field.key]) setErrors(prev => { const e = { ...prev }; delete e[field.key]; return e; });
                    }}
                    filled={filledFields.has(field.key)}
                    country={formData.country}
                    state={formData.state}
                    district={formData.district}
                  />
                  {errors[field.key] && (
                    <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                      <AlertCircle size={10} /> {errors[field.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Generation Mode + Buttons */}
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Generation Mode</h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GENERATION_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setGenerationMode(mode.id)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${generationMode === mode.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-700/50'}`}
                  >
                    <span className="text-base">{mode.icon}</span>
                    <span className="text-[10px] font-black text-slate-800 dark:text-white leading-tight">{mode.label}</span>
                    <span className="text-[9px] text-slate-400 font-medium leading-tight">{mode.description}</span>
                    {generationMode === mode.id && <Check size={10} className="text-indigo-600 mt-1" />}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleGenerate(generationMode)}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:opacity-90 shadow-xl shadow-indigo-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                <span>Generate {GENERATION_MODES.find(m => m.id === generationMode)?.label || 'Draft'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP: GENERATING ══════════════ */}
        {step === 'GENERATING' && (
          <div className="flex flex-col items-center justify-center h-full py-32 gap-6 max-w-md mx-auto text-center px-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-900 rounded-full" />
              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Gavel size={20} className="text-indigo-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{generationStatus}</h3>
              <p className="text-xs text-slate-400 font-medium">Generating court-ready {selectedType}</p>
              <div className="flex justify-center gap-1 mt-3">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ STEP: PREVIEW ══════════════ */}
        {step === 'PREVIEW' && (
          <div className="flex flex-col h-full min-h-0 max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 gap-4 pb-6">

            {/* Preview Toolbar */}
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 shadow-sm">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${isEditing ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              >
                <Edit3 size={13} /> {isEditing ? 'Preview' : 'Edit Draft'}
              </button>

              <div className="flex items-center gap-1 ml-auto flex-wrap">
                {/* Re-generate buttons */}
                {GENERATION_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => handleGenerate(mode.id)}
                    disabled={isGenerating}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all disabled:opacity-50 whitespace-nowrap"
                    title={mode.description}
                  >
                    <span>{mode.icon}</span>
                    <span className="hidden sm:inline">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Version History */}
            {draftVersionHistory.length > 0 && (
              <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 shadow-sm">
                <button
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider"
                >
                  <History size={13} />
                  Version History ({draftVersionHistory.length})
                  {showVersionHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {showVersionHistory && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {draftVersionHistory.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => { setFinalDraft(v.content); setShowVersionHistory(false); }}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                      >
                        v{v.version} · {v.mode} · {v.timestamp}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Document content */}
            <div className="flex-1 bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-indigo-600" />
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{selectedType}</span>
                  <span className="text-[9px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-bold">v{draftVersion}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-400 font-medium">{finalDraft.length.toLocaleString()} chars</span>
                  <LanguageToggle
                    lang={outputLang}
                    onChange={handleDraftLangChange}
                    isTranslating={isDraftTranslating}
                  />
                  <CopyOutputButton
                    text={draftDisplayText || finalDraft}
                    label={outputLang === 'hi' ? 'Draft Hindi mein copy karein' : 'Copy draft'}
                  />
                </div>
              </div>

              {/* Metadata Output Panel */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2.5 bg-slate-50/50 dark:bg-zinc-900/20 border-b border-slate-200/80 dark:border-zinc-800 text-[10px] text-slate-400 font-bold shrink-0">
                <span>MODE: <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{GENERATION_MODES.find(m => m.id === generationMode)?.label || 'Standard Draft'}</span></span>
                {generationTimestamp && (
                  <span>GENERATED: <span className="text-slate-600 dark:text-slate-300 uppercase tracking-wider">{generationTimestamp}</span></span>
                )}
                {linkedCaseId && (
                  <span>LINKED CASE: <span className="text-violet-600 dark:text-violet-400 uppercase tracking-wider">{allProjects.find(p => p._id === linkedCaseId)?.name || 'Case'}</span></span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar" ref={previewRef}>
                {/* Translating indicator */}
                {isDraftTranslating && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 mb-3 animate-pulse">
                    <span className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    अनुवाद हो रहा है...
                  </div>
                )}
                {isEditing ? (
                  <textarea
                    value={finalDraft}
                    onChange={e => setFinalDraft(e.target.value)}
                    className="w-full h-full min-h-[500px] bg-transparent border-none text-slate-800 dark:text-slate-100 outline-none resize-none font-mono text-xs sm:text-sm leading-relaxed focus:ring-0"
                  />
                ) : (
                  <div className={`prose dark:prose-invert max-w-none font-serif leading-loose text-slate-800 dark:text-slate-200 text-sm sm:text-base whitespace-pre-wrap select-text transition-opacity duration-200 ${isDraftTranslating ? 'opacity-50' : 'opacity-100'}`}>
                    {draftDisplayText || finalDraft}
                  </div>
                )}
              </div>
            </div>

            {/* Export History Log */}
            {exportHistory.length > 0 && (
              <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Export & Version History Log</h4>
                <div className="max-h-[80px] overflow-y-auto custom-scrollbar text-[10px] font-bold text-slate-500 space-y-1">
                  {exportHistory.map((log, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 shrink-0">
              <button onClick={handleSave} className="flex items-center justify-center gap-1.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md">
                <Save size={14} /> Save Draft
              </button>
              <button onClick={handleSaveToCase} className="flex items-center justify-center gap-1.5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md">
                <Folder size={14} /> Save to Case
              </button>
              <button onClick={handleExportPDF} className="flex items-center justify-center gap-1.5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md">
                <FileDown size={14} /> Export PDF
              </button>
              <button onClick={handleExportDOCX} className="flex items-center justify-center gap-1.5 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md">
                <FileCheck size={14} /> Word DOCX
              </button>
              <button onClick={handleCopy} className="flex items-center justify-center gap-1.5 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md">
                <Copy size={14} /> Copy Text
              </button>
              <button onClick={handleShare} className="flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md">
                <Share2 size={14} /> Share Report
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ STEP: SAVED ══════════════ */}
        {step === 'SAVED' && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4 pb-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Saved Drafts</h3>
              <span className="text-xs text-slate-400 font-bold">{savedDrafts.length} drafts</span>
            </div>

            {loadingDrafts ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : savedDrafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl text-center bg-white dark:bg-zinc-900/30">
                <Folder size={48} className="text-slate-300 dark:text-zinc-700 mb-4" />
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">No Saved Drafts</h4>
                <p className="text-xs text-slate-400 mt-1 font-medium">Generate drafts and save them here</p>
                <button onClick={() => setStep('SELECT')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider">
                  Browse Templates
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {savedDrafts.map(draft => (
                  <div key={draft.id} className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl shrink-0 mt-0.5">
                          <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{draft.title}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {new Date(draft.date).toLocaleDateString('en-IN')} • {new Date(draft.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                            {draft.content?.substring(0, 80)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setFinalDraft(draft.content);
                            setSelectedType(draft.title);
                            setTemplate(getTemplate(draft.title));
                            if (draft.formData) setFormData(draft.formData);
                            if (draft.mode) setGenerationMode(draft.mode);
                            if (draft.version) setDraftVersion(draft.version);
                            if (draft.exportHistory) setExportHistory(draft.exportHistory);
                            if (draft.generationTimestamp) setGenerationTimestamp(draft.generationTimestamp);
                            else setGenerationTimestamp(new Date(draft.date).toLocaleString('en-IN'));
                            setStep('PREVIEW');
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Saved Confirmation Modal ── */}
      {savedNotice && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSavedNotice(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-green-500/30">
              <Check size={28} strokeWidth={3} />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Draft Saved!</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Your document is saved and available offline.</p>
            <div className="w-full mt-4 space-y-1.5 text-left bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl text-xs">
              <div className="flex justify-between"><span className="text-slate-400">ID:</span><span className="font-bold dark:text-white">{savedNotice.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Saved:</span><span className="font-bold dark:text-white">{savedNotice.date} • {savedNotice.time}</span></div>
            </div>
            <div className="flex gap-2 mt-4 w-full">
              <button onClick={() => setSavedNotice(null)} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-white rounded-xl text-xs font-black uppercase">Close</button>
              <button onClick={() => { setSavedNotice(null); setStep('SAVED'); }} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase">View All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftMaker;
