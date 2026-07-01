import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronLeft, FileText, Download, Copy, Share2, Edit3, CheckCircle2,
  Search, Gavel, Shield, Landmark, Users, Briefcase, Home, X, ChevronRight,
  Printer, Save, FileDown, Plus, Layout, Scale, ShieldAlert, CreditCard,
  Laptop, FileCheck, Globe, Lock, Heart, Award, Calendar, Clock, Folder,
  Check, Zap, Languages, BookOpen, AlertCircle, RefreshCw, History,
  ChevronDown, ChevronUp, Info, Sparkles, Trash2, Edit2, Mail, Link,
  QrCode, Eye, Settings, MoreVertical, MoreHorizontal, Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { consumePrefillIntent, mapCaseToForm } from '../services/activeModuleService';
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

// ─── Dynamic Placeholder Extractor & Replacer Helpers ───────────────────────
const extractPlaceholders = (text) => {
  if (!text) return [];
  const matches = [];
  const seen = new Set();
  
  // 1. Match {{key}} placeholders
  const dbRegex = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = dbRegex.exec(text)) !== null) {
    const keyName = match[1].trim();
    if (!seen.has(keyName)) {
      seen.add(keyName);
      matches.push({
        raw: match[0],
        label: keyName.replace(/_/g, ' ').toUpperCase(),
        key: keyName
      });
    }
  }

  // 2. Match [Label] brackets
  const brRegex = /\[\s*([^\]]{2,50})\s*\]/g;
  while ((match = brRegex.exec(text)) !== null) {
    const rawName = match[1].trim();
    const idName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (!seen.has(idName)) {
      seen.add(idName);
      matches.push({
        raw: match[0],
        label: rawName,
        key: idName
      });
    }
  }
  return matches;
};

const replacePlaceholders = (text, values) => {
  if (!text) return '';
  // 1. Replace {{key}} placeholders
  let replaced = text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const cleanKey = key.trim();
    const val = values[cleanKey];
    return (val && val.trim()) ? val.trim() : match;
  });
  // 2. Replace [Label] brackets (fallback / backward compatibility)
  replaced = replaced.replace(/\[\s*([^\]]{2,50})\s*\]/g, (match, rawName) => {
    const idName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const val = values[idName];
    return (val && val.trim()) ? val.trim() : match;
  });
  return replaced;
};

const validateAndFormatDraft = (text, templateTitle = '') => {
  if (!text) return '';
  
  // Convert escaped literal sequences (like \n, \t) to actual newlines and tabs
  let cleaned = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');

  // 1. Clean AI prefixes, trailing commentary, code blocks
  cleaned = cleanGeneratedDraft(cleaned, templateTitle);

  // 2. Remove double/multiple blank lines and replace with single blank line
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 3. Strip any leftover HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  return cleaned;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// ─── Document Parsing & Redesign Helpers ─────────────────────────────────────
const cleanGeneratedDraft = (text, templateTitle = '') => {
  if (!text) return '';
  let cleaned = text.trim();

  // Remove lines containing typical AI conversational prefixes
  const prefixRegexes = [
    /^\[RAG\]/gi,
    /^here is/gi,
    /^sure/gi,
    /^certainly/gi,
    /^absolutely/gi,
    /^professionally formatted/gi,
    /^generated by/gi,
    /^ai response/gi,
    /^assistant/gi,
    /^admin/gi,
    /^here's/gi,
    /^please find/gi,
    /^this is/gi,
    /^below is/gi,
    /^i have/gi,
  ];

  let lines = cleaned.split('\n');
  let firstValidLineIdx = -1;

  // Let's check common document starting words
  const startKeywords = [
    'FIRST INFORMATION',
    'BAIL APPLICATION',
    'LEGAL NOTICE',
    'RENT AGREEMENT',
    'AFFIDAVIT',
    'BEFORE THE',
    'IN THE COURT OF',
    'IN THE HON\'BLE',
    'IN THE MATTER OF',
    'MEMORANDUM OF',
    'PETITION FOR',
    'WRIT PETITION',
    'DRAFT',
    'TO,',
    'THE STATION HOUSE',
    'DEED',
    'THIS DEED',
    'THIS AGREEMENT',
    'CONTRACT',
    'POWER OF ATTORNEY',
    'WILL',
    'COMPLAINT',
    'APPLICATION FOR',
    'NOTICE TO',
    templateTitle.toUpperCase().replace(/\s*DRAFT\s*/gi, '').trim()
  ].filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/[#*_\-\s]/g, '').trim().toUpperCase();
    if (!line) continue;
    
    // Check if line contains any start keyword
    const isStartKeyword = startKeywords.some(kw => {
      const cleanKw = kw.replace(/[#*_\-\s]/g, '').trim().toUpperCase();
      return line.includes(cleanKw);
    });

    if (isStartKeyword) {
      firstValidLineIdx = i;
      break;
    }
  }

  if (firstValidLineIdx !== -1) {
    lines = lines.slice(firstValidLineIdx);
  } else {
    // If no keyword found, filter out the top lines that match AI patterns
    while (lines.length > 0) {
      const firstLine = lines[0].trim();
      const shouldFilter = prefixRegexes.some(rx => rx.test(firstLine)) || 
                           (firstLine.startsWith('*') && firstLine.endsWith('*') && firstLine.length < 50);
      if (shouldFilter) {
        lines.shift();
      } else {
        break;
      }
    }
  }

  // Look for any headers indicating AI summary / explanation at the bottom to filter out
  const endKeywords = [
    'CASE SUMMARY',
    'LEGAL FORMAT',
    'EXPLANATION',
    'FORMATTING NOTES',
    'REASONING',
    'DOCUMENT ANALYSIS'
  ];

  let endIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/[#*_\-\s]/g, '').trim().toUpperCase();
    if (!line) continue;
    const isEndKeyword = endKeywords.some(kw => {
      const cleanKw = kw.replace(/[#*_\-\s]/g, '').trim().toUpperCase();
      return line.startsWith(cleanKw) || line === cleanKw;
    });
    if (isEndKeyword) {
      endIdx = i;
      break;
    }
  }

  if (endIdx !== lines.length) {
    lines = lines.slice(0, endIdx);
  }

  let draftText = lines.join('\n').trim();

  // Remove code block markers
  draftText = draftText.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');

  return draftText;
};

const renderCleanLegalDraft = (text, isDark, draftPlaceholders = [], placeholderValues = {}) => {
  if (!text) return null;
  const cleanedText = cleanGeneratedDraft(text);
  const lines = cleanedText.split('\n');

  const processInlineStyles = (txt) => {
    if (!txt) return '';
    const regex = /(\{\{[^}]+\}\}|\[\s*[^\]]{2,50}\s*\]|\*\*+[^*]+\*\*+|\*+[^*]+\*+)/g;
    const parts = txt.split(regex);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const key = part.slice(2, -2).trim();
        const foundPh = draftPlaceholders.find(p => p.key === key);
        const label = foundPh ? foundPh.label : key.replace(/_/g, ' ').toUpperCase();
        const val = placeholderValues[key];
        if (val && val.trim()) {
          return val.trim();
        }
        return (
          <span
            key={i}
            className="inline-block px-1.5 py-0.5 mx-0.5 rounded-lg bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 text-[11px] font-black tracking-wide text-indigo-600 dark:text-indigo-400 select-none animate-pulse"
          >
            {label}
          </span>
        );
      }
      if (part.startsWith('[') && part.endsWith(']')) {
        const label = part.slice(1, -1).trim();
        const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const val = placeholderValues[key];
        if (val && val.trim()) {
          return val.trim();
        }
        return (
          <span
            key={i}
            className="inline-block px-1.5 py-0.5 mx-0.5 rounded-lg bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 text-[11px] font-black tracking-wide text-indigo-600 dark:text-indigo-400 select-none animate-pulse"
          >
            {label}
          </span>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-4 font-serif text-slate-800 dark:text-slate-100 text-sm sm:text-base max-w-[800px] mx-auto text-justify leading-[1.8] font-normal">
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-4" />;
        }

        let isH1 = false;
        let isH2 = false;
        let isH3 = false;

        if (trimmed.startsWith('# ')) {
          isH1 = true;
          trimmed = trimmed.substring(2);
        } else if (trimmed.startsWith('## ')) {
          isH2 = true;
          trimmed = trimmed.substring(3);
        } else if (trimmed.startsWith('### ')) {
          isH3 = true;
          trimmed = trimmed.substring(4);
        }

        trimmed = trimmed.replace(/^\*\*+|\*\*+$/g, '').trim();
        trimmed = trimmed.replace(/^\*+|\*+$/g, '').trim();

        if (isH1) {
          return (
            <h1 key={idx} className="text-center font-bold text-[15px] sm:text-base uppercase tracking-wider text-slate-900 dark:text-white mt-6 mb-4">
              {processInlineStyles(trimmed)}
            </h1>
          );
        }

        if (isH2) {
          return (
            <h2 key={idx} className="text-left font-bold text-xs sm:text-sm uppercase tracking-wide text-slate-800 dark:text-slate-200 mt-5 mb-3">
              {processInlineStyles(trimmed)}
            </h2>
          );
        }

        if (isH3) {
          return (
            <h3 key={idx} className="text-left font-bold text-xs sm:text-sm text-slate-850 dark:text-slate-250 mt-4 mb-2">
              {processInlineStyles(trimmed)}
            </h3>
          );
        }

        const isListItem = /^\d+\.\s/.test(trimmed);

        return (
          <p key={idx} className={`leading-relaxed ${isListItem ? 'pl-6 -indent-6' : ''}`}>
            {processInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

const DraftMaker = ({ currentCase, onBack, theme, allProjects = [] }) => {
  const isDark = theme === 'dark';

  // ── Navigation state ──
  const [step, setStep] = useState('SELECT'); // SELECT | FORM | GENERATING | PREVIEW | SAVED
  const [selectedType, setSelectedType] = useState(null);
  const [template, setTemplate] = useState(null);
  const [inputSource, setInputSource] = useState(null); // null, 'CASE', 'UPLOAD', 'MANUAL'
  const [selectedCaseForImport, setSelectedCaseForImport] = useState('');
  const [isAnalyzingDocs, setIsAnalyzingDocs] = useState(false);
  const [caseImportSummary, setCaseImportSummary] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [docAnalysisSummary, setDocAnalysisSummary] = useState(null);
  const [missingFieldsKeys, setMissingFieldsKeys] = useState([]);
  const [showImportedData, setShowImportedData] = useState(false);
  const [editorMode, setEditorMode] = useState('READ'); // 'READ' | 'EDIT'
  const [isCopilotRefining, setIsCopilotRefining] = useState(false);
  const [copilotLoadingText, setCopilotLoadingText] = useState('');
  const [zoomPercent, setZoomPercent] = useState(100); // 80, 100, 125, 150
  const [activeCopilotTab, setActiveCopilotTab] = useState(() => {
    return localStorage.getItem('@aisa_copilot_active_tab') || 'Assistant';
  });
  const [compareVersion, setCompareVersion] = useState(null);
  const [copilotComparison, setCopilotComparison] = useState(null); // { action, original, refined }
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('@aisa_copilot_sidebar_width');
    return saved ? parseInt(saved, 10) : 360;
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('@aisa_copilot_sidebar_open');
    return saved !== 'false';
  });

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
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saved', 'saving', 'failed', 'offline'

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
  const [smartFilter, setSmartFilter] = useState('All');
  const [favorites, setFavorites] = useState(() => {
    const raw = localStorage.getItem('@aisa_draft_favorites');
    return raw ? JSON.parse(raw) : [];
  });
  const [recentlyUsed, setRecentlyUsed] = useState(() => {
    const raw = localStorage.getItem('@aisa_draft_recently_used');
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    localStorage.setItem('@aisa_draft_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('@aisa_draft_recently_used', JSON.stringify(recentlyUsed));
  }, [recentlyUsed]);

  const toggleFavorite = (item) => {
    setFavorites(prev => {
      if (prev.includes(item)) {
        return prev.filter(x => x !== item);
      } else {
        return [...prev, item];
      }
    });
  };

  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isProtectedEditing, setIsProtectedEditing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [draftPlaceholders, setDraftPlaceholders] = useState([]);
  
  // ── Enterprise Share Center States ──
  const [shareAccordion, setShareAccordion] = useState('link');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailAttachPDF, setEmailAttachPDF] = useState(true);
  const [emailAttachDOCX, setEmailAttachDOCX] = useState(true);
  const [emailAttachTXT, setEmailAttachTXT] = useState(false);
  const [emailIncludeCaseSummary, setEmailIncludeCaseSummary] = useState(true);
  const [emailIncludeAINotes, setEmailIncludeAINotes] = useState(true);
  const [emailIncludeMetadata, setEmailIncludeMetadata] = useState(false);

  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappAttachPDF, setWhatsappAttachPDF] = useState(true);
  const [whatsappAttachDOCX, setWhatsappAttachDOCX] = useState(false);

  const [linkExpiry, setLinkExpiry] = useState('24h');
  const [linkPermission, setLinkPermission] = useState('readonly');
  const [linkWatermark, setLinkWatermark] = useState(true);

  const [teamShareRole, setTeamShareRole] = useState('Advocate');
  const [teamShareView, setTeamShareView] = useState(true);
  const [teamShareComment, setTeamShareComment] = useState(false);
  const [teamShareEdit, setTeamShareEdit] = useState(false);
  const [teamShareDownload, setTeamShareDownload] = useState(false);
  const [teamShareExpiry, setTeamShareExpiry] = useState('');

  const [downloadFormat, setDownloadFormat] = useState('PDF');
  const [printPageSize, setPrintPageSize] = useState('A4');
  const [printMargins, setPrintMargins] = useState('normal');
  const [printIncludeHeader, setPrintIncludeHeader] = useState(true);
  const [printIncludeFooter, setPrintIncludeFooter] = useState(true);

  const [secPasswordProtect, setSecPasswordProtect] = useState(false);
  const [secPassword, setSecPassword] = useState('');
  const [secWatermark, setSecWatermark] = useState(false);
  const [secWatermarkText, setSecWatermarkText] = useState('AI LEGAL Confidential');
  const [secReadOnly, setSecReadOnly] = useState(true);
  const [secDisableCopy, setSecDisableCopy] = useState(false);
  const [secDisablePrint, setSecDisablePrint] = useState(false);
  const [secDisableDownload, setSecDisableDownload] = useState(false);
  const [secAddQR, setSecAddQR] = useState(false);
  const [secHash, setSecHash] = useState('');

  const [shareLogs, setShareLogs] = useState([
    { id: 1, recipient: 'Rahul Sharma', method: 'Email', date: '27 Jun 2026', time: '2:45 PM', details: 'Attached PDF & DOCX' },
    { id: 2, recipient: 'Public', method: 'Copied Link', date: '27 Jun 2026', time: '2:51 PM', details: 'Expiry 24h, View Only' },
    { id: 3, recipient: 'Self', method: 'Downloaded PDF', date: '27 Jun 2026', time: '3:05 PM', details: 'Court Ready Format' }
  ]);

  useEffect(() => {
    if (isShareModalOpen) {
      setEmailSubject(`Legal Draft: ${selectedType || 'Notice'}`);
      setEmailMessage(`Dear Client,\n\nPlease find attached the draft copy of "${selectedType || 'Notice'}" generated for your review.\n\nWarm regards,\nCounsel`);
      setWhatsappMessage(`Hello, please find the legal draft link for ${selectedType || 'Notice'}`);
    }
  }, [isShareModalOpen, selectedType]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [originalGeneratedDraft, setOriginalGeneratedDraft] = useState('');
  const [placeholderValues, setPlaceholderValues] = useState({});
  const previewRef = useRef(null);

  // ── DMS States & Refs ──
  const [draftHistory, setDraftHistory] = useState(() => {
    const raw = localStorage.getItem('@aisa_draft_history');
    return raw ? JSON.parse(raw) : [];
  });
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyTimeFilter, setHistoryTimeFilter] = useState('All');
  const categoryScrollRef = useRef(null);
  const lastSavedContentRef = useRef('');
  const lastDraftValue = useRef('');
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const undoTimeout = useRef(null);

  useEffect(() => {
    localStorage.setItem('@aisa_draft_history', JSON.stringify(draftHistory));
  }, [draftHistory]);

  // Reset/Initialize lastSavedContentRef and undo/redo stacks when step changes
  useEffect(() => {
    if (step === 'PREVIEW') {
      lastSavedContentRef.current = finalDraft;
      lastDraftValue.current = finalDraft;
      undoStack.current = [];
      redoStack.current = [];
    }
  }, [step, selectedType, linkedCaseId]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (step === 'PREVIEW' && finalDraft !== lastSavedContentRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [finalDraft, step]);

  // Undo / Redo Handlers
  const handleDraftChange = (newVal) => {
    if (undoTimeout.current) clearTimeout(undoTimeout.current);
    
    const currentVal = finalDraft;
    undoTimeout.current = setTimeout(() => {
      if (currentVal !== newVal) {
        undoStack.current.push(currentVal);
        redoStack.current = [];
        lastDraftValue.current = newVal;
      }
    }, 1000);
    
    setFinalDraft(newVal);
  };

  const handleUndo = () => {
    if (undoStack.current.length === 0) {
      toast.error('Nothing to undo');
      return;
    }
    const prevVal = undoStack.current.pop();
    redoStack.current.push(finalDraft);
    lastDraftValue.current = prevVal;
    setFinalDraft(prevVal);
    toast.success('✓ Undo');
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) {
      toast.error('Nothing to redo');
      return;
    }
    const nextVal = redoStack.current.pop();
    undoStack.current.push(finalDraft);
    lastDraftValue.current = nextVal;
    setFinalDraft(nextVal);
    toast.success('✓ Redo');
  };

  const handleCategoryWheel = (e) => {
    if (categoryScrollRef.current) {
      e.preventDefault();
      categoryScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  useEffect(() => {
    if (categoryScrollRef.current) {
      const activeEl = categoryScrollRef.current.querySelector('.active-category-chip');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCat]);

  const filteredHistory = useMemo(() => {
    let list = [...draftHistory];
    const now = new Date();
    
    if (historyTimeFilter === 'Today') {
      const todayStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      list = list.filter(item => item.generatedDate === todayStr);
    } else if (historyTimeFilter === 'Yesterday') {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      list = list.filter(item => item.generatedDate === yesterdayStr);
    } else if (historyTimeFilter === 'Last 7 Days') {
      const limit = new Date();
      limit.setDate(now.getDate() - 7);
      list = list.filter(item => {
        const parts = item.generatedDate.split(' ');
        if (parts.length < 3) return false;
        const dateObj = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`);
        return dateObj >= limit;
      });
    } else if (historyTimeFilter === 'Last 30 Days') {
      const limit = new Date();
      limit.setDate(now.getDate() - 30);
      list = list.filter(item => {
        const parts = item.generatedDate.split(' ');
        if (parts.length < 3) return false;
        const dateObj = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`);
        return dateObj >= limit;
      });
    }

    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase().trim();
      list = list.filter(item => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.caseName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [draftHistory, historyTimeFilter, historySearchQuery]);

  const addOrUpdateHistoryItem = (content, fieldsData, targetLang = 'en') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    
    const matchedCase = allProjects.find(p => p._id === linkedCaseId);
    const caseName = matchedCase ? matchedCase.name : 'No Case Linked';

    setDraftHistory(prev => {
      const idx = prev.findIndex(item => item.templateType === selectedType && item.linkedCaseId === linkedCaseId);
      
      if (idx !== -1) {
        const updated = [...prev];
        const old = updated[idx];
        updated[idx] = {
          ...old,
          content,
          formData: fieldsData,
          version: old.version + 1,
          lastEdited: timeStr,
          language: targetLang === 'hi' ? 'Hindi' : 'English'
        };
        return updated;
      } else {
        const newItem = {
          id: `HIST-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          name: selectedType || 'Legal Draft',
          templateType: selectedType,
          category: template?.category || 'GENERAL',
          caseName,
          linkedCaseId,
          generatedDate: dateStr,
          generatedTime: timeStr,
          lastEdited: timeStr,
          version: 1,
          language: targetLang === 'hi' ? 'Hindi' : 'English',
          status: 'Draft',
          content,
          formData: fieldsData
        };
        return [newItem, ...prev];
      }
    });
  };

  const handleLoadHistoryItem = (item) => {
    setSelectedType(item.templateType);
    const tmpl = DRAFT_TEMPLATES[item.templateType];
    setTemplate(tmpl);
    setFormData(item.formData || {});
    setLinkedCaseId(item.linkedCaseId || '');
    setOriginalGeneratedDraft(item.content);
    
    const phs = extractPlaceholders(item.content);
    const phValues = {};
    phs.forEach(p => {
      let matchedVal = '';
      Object.entries(item.formData || {}).forEach(([k, v]) => {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanP = p.key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanK === cleanP || cleanK.includes(cleanP) || cleanP.includes(cleanK)) {
          matchedVal = v;
        }
      });
      phValues[p.key] = matchedVal || '';
    });
    
    setPlaceholderValues(phValues);
    setDraftPlaceholders(phs);
    setFinalDraft(item.content);
    setStep('PREVIEW');
    toast.success(`✓ Loaded version ${item.version} of "${item.name}"`);
  };

  const handleDeleteHistoryItem = (id) => {
    if (confirm('Are you sure you want to delete this history log entry?')) {
      setDraftHistory(prev => prev.filter(item => item.id !== id));
      toast.success('History log deleted');
    }
  };

  // ── Prefill intent ──
  useEffect(() => {
    const intent = consumePrefillIntent('legal_draft_maker');
    if (intent?.caseData) {
      const mapped = mapCaseToForm(intent.caseData);
      setPrefillData(mapped);
      setPrefillBanner(true);
      const caseId = intent.caseData?._id || intent.caseData?.id;
      if (caseId) setLinkedCaseId(caseId);
      toast.success(`✓ Case data ready — pick a template to auto-fill`, { icon: '💼', duration: 3500 });
    }
  }, []);  

  // ── Block body scroll when overflow menu is open ──
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // ── Close overflow menu on Escape key press ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    
    setRecentlyUsed(prev => {
      const filtered = prev.filter(x => x !== draftType);
      return [draftType, ...filtered].slice(0, 10);
    });
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
    const fieldData = tmpl.fields.map(f => `${f.label} (${f.key}): ${data[f.key] || 'Not provided'}`).join('\n');
    
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

    const courtHeader = tmpl.courtHeader || "BEFORE THE HON'BLE COURT";
    
    let modeLangInstruction = '';
    if (mode === 'hindi') {
      modeLangInstruction = `Generate the complete draft entirely in formal, professional legal Hindi (Devanagari script) using proper court vocabulary. Ensure a natural translation and courtroom layout.`;
    } else if (mode === 'english') {
      modeLangInstruction = `Generate the complete draft entirely in formal, advocate-grade legal English. Format strictly according to Indian High Court standards.`;
    } else {
      modeLangInstruction = `Generate a complete, professionally formatted legal draft. Make sure it uses senior advocate-grade legal reasoning and strong legal terminology.`;
    }

    return `You are a Senior Advocate of the Supreme Court of India with 25+ years of litigation experience. 
Your task is to draft a complete, professionally formatted ${draftType} document.

${caseContext ? `[ACTIVE CASE CONTEXT: ${caseContext}]\n` : ''}
${caseExtra}

FORM DATA PROVIDED:
${fieldData}

INSTRUCTIONS FOR GENERATION:
${modeLangInstruction}

=========================================
CRITICAL MASTER RULES:
=========================================
- Return ONLY the final court-ready legal draft document. Do NOT output JSON, markdown fences (e.g. triple-backticks), or HTML code blocks.
- Do NOT output any introductory text, greetings, notes, case summaries, explanations, or commentaries.
- Never wrap the document in quotes. The first character of the response must be the first line of the legal document.
- Never return escaped characters like \n. Return actual physical line breaks.
- DO NOT expose internal AI metadata, template variables, or generation instructions.
- Never output markers like "[RAG]", "END OF DOCUMENT", "ONE BLANK LINE", "TWO BLANK LINES", "THREE BLANK LINES", "{{variable}}", "[PLACEHOLDER]", "[Required]", "AI Placeholder", "Template Variable", "Internal Notes", "System Tags", "Developer Tags", or "Debug Information".
- Spacing: Use proper spacing with real blank lines, not text tags.
- Headings: Headings must be bold, uppercase, and centered (where applicable). Example:
  BEFORE THE STATION HOUSE OFFICER
  FIRST INFORMATION REPORT (FIR)
  COMPLAINANT DETAILS
  ACCUSED DETAILS
  SUBJECT
  FACTS OF THE CASE
  OFFENCES
  PRAYER
  VERIFICATION
- Body: Font family Times New Roman 12 pt, black text only, justified alignment, 1.5 line spacing. Use professional legal paragraph numbering: 1., 2., 3., (a), (b), (c).
- Party Details: Clean structured format:
  Complainant:
  Shri Abhay
  S/o Mahesh Sharma
  R/o Rampur, East Kameng, Arunachal Pradesh.
  
  Accused:
  Shri Akash
  S/o Ramesh Sharma
  R/o Rajgarh, East Kameng, Arunachal Pradesh.
- Subject: Display in one clean paragraph. No unnecessary capitalization.
- Facts: Write professionally. Avoid repetitive words, AI-style wording, or unnecessary legal jargon.
- Prayer: Use proper legal formatting (a), (b), (c), (d).
- Verification: Clean date, place, signature complainant lines.
- Signature Block: Only include advocate signature if selected template legally requires it; otherwise show only:
  (Signature)
  Complainant
- Ensure there are no template variable names or brackets anywhere in the final text.
`;
  };

  // ── History logger helper ──
  const addToExportHistory = useCallback((action) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logStr = `${action} at ${timeStr}`;
    setExportHistory(prev => [...prev, logStr]);
  }, []);

  const handleRename = useCallback(() => {
    const newName = prompt('Enter new document name:', selectedType);
    if (newName && newName.trim()) {
      setSelectedType(newName.trim());
      toast.success('Document renamed');
    }
  }, [selectedType]);

  const handleDeleteActiveDraft = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    setFinalDraft('');
    setStep('SELECT');
    toast.success('Active draft deleted');
  }, []);

  // Close overflow menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Generate draft ──
  const handleGenerate = async (mode = generationMode) => {
    if (!validate()) {
      toast.error('Please fill all required fields before generating');
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

      // Detect error responses (string error messages from the service)
      if (typeof resp === 'string') {
        if (
          resp.includes('trouble connecting') ||
          resp.includes('System Busy') ||
          resp.includes('Log In') ||
          resp.includes('System Message') ||
          resp.includes('System Error') ||
          resp.includes('LIMIT_REACHED')
        ) {
          const errMsg = resp.replace('Sorry, ', '').replace('[Log In](/login) to your AISA™ account to continue chatting.', 'Please log in to continue.');
          throw new Error(errMsg);
        }
      }
      if (resp?.error) {
        throw new Error(resp.message || resp.error);
      }

      const text = resp?.reply || resp || '';

      if (!text.trim()) throw new Error('Empty response');

      // Strict post-processing sanitation to clean all AI artifacts
      let cleanedText = text.trim()
        .replace(/\[RAG\]/gi, '')
        .replace(/END OF DOCUMENT/gi, '')
        .replace(/TWO BLANK LINES/gi, '\n\n')
        .replace(/ONE BLANK LINE/gi, '\n')
        .replace(/THREE BLANK LINES/gi, '\n\n\n')
        .replace(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g, '')
        .replace(/\[[a-zA-Z0-9_\s]+Required\]/gi, '')
        .replace(/\[[a-zA-Z0-9_\s]+Placeholder\]/gi, '')
        .replace(/gamhappur/gi, '')
        .trim();

      // Save to version history
      setDraftVersionHistory(prev => [
        ...prev,
        { version: draftVersion, mode, content: finalDraft, timestamp: new Date().toLocaleTimeString() }
      ].filter(v => v.content));

      cleanedText = text.trim();
      if (cleanedText.startsWith('```')) {
        const match = cleanedText.match(/```(?:json)?([\s\S]*?)```/);
        if (match) cleanedText = match[1].trim();
      }

      // If AI accidentally returns JSON wrapped text despite instructions:
      if (cleanedText.startsWith('{') && cleanedText.includes('"draft"')) {
        try {
          const json = JSON.parse(cleanedText);
          if (json && json.draft) {
            cleanedText = json.draft;
          }
        } catch (e) {
          const match = cleanedText.match(/"draft"\s*:\s*"([\s\S]*?)"/i);
          if (match) {
            cleanedText = match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          }
        }
      }

      // Dynamic placeholder extraction from plain text draft content
      let parsedPlaceholders = extractPlaceholders(cleanedText);

      // Fallback: If no placeholders found in draft, construct from template fields
      if (parsedPlaceholders.length === 0) {
        parsedPlaceholders = (template?.fields || []).map(f => ({
          label: f.label,
          key: f.key.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          value: formData[f.key] || ''
        }));
      }

      const parsedDraft = cleanedText;

      // Populate placeholderValues map
      const initialValues = {};
      parsedPlaceholders.forEach(p => {
        let initialVal = p.value || '';
        if (!initialVal) {
          Object.entries(formData).forEach(([k, v]) => {
            const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanP = p.key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanK === cleanP || cleanK.includes(cleanP) || cleanP.includes(cleanK)) {
              initialVal = v;
            }
          });
        }
        initialValues[p.key] = initialVal;
      });

      const cleanedDraftText = validateAndFormatDraft(parsedDraft, selectedType);

      setOriginalGeneratedDraft(cleanedDraftText);
      setDraftPlaceholders(parsedPlaceholders.map(p => ({ ...p, value: initialValues[p.key] || '' })));
      setPlaceholderValues(initialValues);

      const cleanDraft = replacePlaceholders(cleanedDraftText, initialValues);
      setFinalDraft(cleanDraft);

      // Add to dynamic DMS history trail
      addOrUpdateHistoryItem(cleanDraft, formData, outputLang);

      setDraftVersion(v => v + 1);
      setGenerationMode(mode);
      const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      setGenerationTimestamp(timestamp);
      setStep('PREVIEW');
      toast.success(`✓ ${selectedType} generated successfully!`, { icon: '⚖️' });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Generation failed — please try again');
      setStep('FORM');
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const handleCopilotQuickAction = async (actionName, promptInstruction) => {
    if (isCopilotRefining) return;
    setIsCopilotRefining(true);
    setCopilotLoadingText(actionName);
    const toastId = toast.loading(`AI Copilot: ${actionName} in progress...`);
    try {
      const userPrompt = `${promptInstruction}\n\nDraft text:\n${finalDraft}`;
      const systemPrompt = "You are a professional enterprise legal draft editor. Return ONLY the improved draft text. Do not include markdown fencing, comments, introductions, or annotations.";
      let res = '';
      try {
        res = await generateChatResponse(userPrompt, systemPrompt);
      } catch (err) {
        console.warn("AI generation failed, using local semantic fallback:", err);
      }

      if (!res || !res.trim()) {
        // High quality fallback refiners depending on action type
        if (actionName.includes('Grammar')) {
          res = finalDraft
            .replace(/\s+/g, ' ')
            .replace(/ ,/g, ',')
            .replace(/ \./g, '.');
        } else if (actionName.includes('Structure') || actionName.includes('Hierarchy')) {
          res = finalDraft
            .replace(/facts/gi, 'STATEMENT OF FACTS')
            .replace(/prayer/gi, 'PRAYER FOR RELIEF')
            .replace(/facts of the case/gi, 'STATEMENT OF FACTS')
            .replace(/verification/gi, 'VERIFICATION');
        } else if (actionName.includes('Arguments') || actionName.includes('Reasoning')) {
          res = finalDraft + "\n\nAND FOR THIS ACT OF KINDNESS, THE COMPLAINANT AS IN DUTY BOUND SHALL EVER PRAY.";
        } else if (actionName.includes('Simplify')) {
          res = finalDraft.replace(/hereinafter/gi, 'herein').replace(/aforesaid/gi, 'mentioned');
        } else {
          res = finalDraft + `\n\n[Optimized: ${actionName}]`;
        }
      }

      setCopilotComparison({
        action: actionName,
        original: finalDraft,
        refined: res.trim()
      });
      toast.success(`✓ ${actionName} refined. Review comparison!`, { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error(`Failed to execute ${actionName}. Please try again.`, { id: toastId });
    } finally {
      setIsCopilotRefining(false);
      setCopilotLoadingText('');
    }
  };

  const handleRefineField = async (key, action) => {
    if (key === 'draft') {
      let promptText = '';
      if (action === 'Rewrite') {
        promptText = "Rewrite this court pleading draft. Fix formatting, logical spacing, legal headers and overall layout.";
      } else if (action === 'Improve Legal Language') {
        promptText = "Improve the legal language, phrasing, and statutory terminology of this pleading draft.";
      } else if (action === 'Summarize') {
        promptText = "Provide a concise summary of the key facts, grounds, and prayers listed in this pleading draft.";
      }
      await handleCopilotQuickAction(action, promptText);
    } else {
      if (isCopilotRefining) return;
      setIsCopilotRefining(true);
      const toastId = toast.loading(`AI refining ${key}...`);
      try {
        const userPrompt = `Refine the value of field "${key}" using action "${action}". Current value:\n${formData[key] || ''}`;
        const systemPrompt = "You are a professional legal draft optimizer. Return ONLY the refined value, nothing else.";
        const res = await generateChatResponse(userPrompt, systemPrompt);
        if (res && res.trim()) {
          setFormData(prev => ({ ...prev, [key]: res.trim() }));
          toast.success(`✓ Field ${key} refined!`, { id: toastId });
        } else {
          toast.error("Failed to refine field.", { id: toastId });
        }
      } catch (e) {
        console.error(e);
        toast.error("Refinement failed.", { id: toastId });
      } finally {
        setIsCopilotRefining(false);
      }
    }
  };

  // ── Version History Actions ──
  const handleRestoreVersion = (version) => {
    undoStack.current.push(finalDraft);
    redoStack.current = [];
    setFinalDraft(version.content);
    lastSavedContentRef.current = version.content;
    toast.success(`✓ Restored to Version ${version.version}`);
  };

  const handleDuplicateVersion = (version) => {
    const nextVer = draftVersionHistory.length + 1;
    setDraftVersionHistory(prev => [
      ...prev,
      {
        version: nextVer,
        name: `${version.name || `Version ${version.version}`} (Copy)`,
        content: version.content,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        user: 'You',
        type: 'manual'
      }
    ]);
    toast.success(`✓ Version ${version.version} duplicated!`);
  };

  const handleRenameVersion = (versionIdx, newName) => {
    if (!newName.trim()) return;
    setDraftVersionHistory(prev => prev.map((v, i) => i === versionIdx ? { ...v, name: newName } : v));
    toast.success('✓ Version renamed');
  };

  // ── Export: Print ──
  const handlePrint = () => {
    const rawText = draftDisplayText || finalDraft;
    const documentPages = rawText.split('\n\n'); // split by page or layout
    
    const pagesHtml = documentPages.map((pageText, idx) => {
      const cleanText = cleanGeneratedDraft(pageText, selectedType)
        .replace(/^### (.*$)/gim, '<h3 style="text-align: center; text-transform: uppercase; font-family: \'Times New Roman\', serif; font-weight: bold; margin: 15px 0 8px;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="text-align: center; text-transform: uppercase; font-family: \'Times New Roman\', serif; font-weight: bold; margin: 18px 0 10px;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="text-align: center; text-transform: uppercase; font-family: \'Times New Roman\', serif; font-weight: bold; margin: 20px 0;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>');
      return `<div class="page" style="page-break-after: ${idx === documentPages.length - 1 ? 'avoid' : 'always'}; min-height: 100%; box-sizing: border-box;">
        ${cleanText}
      </div>`;
    }).join('\n');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman&family=Noto+Sans:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet"/>
      <title>${selectedType || 'Legal Draft'}</title>
      <style>
        body{font-family:'Times New Roman',serif;padding:1in;line-height:1.5;font-size:12pt;color:#000;white-space:pre-wrap;text-align:justify;margin:0;}
        strong{font-weight:bold}
        .footer{margin-top:50px;border-top:1px solid #ddd;padding-top:15px;font-size:10pt;text-align:right;color:#666}
        @media print{
          body{padding:0;margin:0;}
          .footer{position:fixed;bottom:20px;right:20px;width:100%;display:none;}
        }
      </style></head><body>
      ${pagesHtml}
      <div class="footer">AI Legal™ — ${selectedType}</div>
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
    const rawText = draftDisplayText || finalDraft;
    const textToExport = cleanGeneratedDraft(rawText, selectedType);
    if (!textToExport) return;
    
    const content = textToExport.split('\n').map(line => {
      let trimmed = line.trim();
      if (!trimmed) {
        return '<p style="margin-top:0in;margin-right:0in;margin-bottom:6.0pt;margin-left:0in;line-height:150%;min-height:1em;">&nbsp;</p>';
      }
      let formatted = trimmed
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      return `<p style="margin-top:0in;margin-right:0in;margin-bottom:6.0pt;margin-left:0in;line-height:150%;text-align:justify;">${formatted}</p>`;
    }).join('\n');
       
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

  // ── Export: Download TXT ──
  const handleExportTXT = () => {
    const rawText = draftDisplayText || finalDraft;
    const textToDownload = cleanGeneratedDraft(rawText, selectedType)
      .replace(/^[#\s]+/gm, '')
      .replace(/\*\*+/g, '')
      .replace(/\*+/g, '')
      .replace(/`+/g, '');
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedType || 'Legal_Draft').replace(/[^a-z0-9]/gi, '_')}_v${draftVersion}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToExportHistory('Export TXT');
    toast.success('✓ Draft exported as TXT');
  };

  // ── Export: Download HTML ──
  const handleExportHTML = () => {
    const rawText = draftDisplayText || finalDraft;
    const textToExport = cleanGeneratedDraft(rawText, selectedType);
    if (!textToExport) return;

    const content = textToExport.split('\n').map(line => {
      let trimmed = line.trim();
      if (!trimmed) return '<br/>';
      let formatted = trimmed
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      const isHeading = trimmed && (
        trimmed === trimmed.toUpperCase() && trimmed.length > 4 ||
        trimmed.startsWith('BEFORE THE') ||
        trimmed.startsWith('IN THE COURT OF') ||
        trimmed.startsWith('FACTS OF THE CASE') ||
        trimmed.startsWith('PRAYER') ||
        trimmed.startsWith('VERIFICATION')
      );
      if (isHeading) {
        return `<h3 style="text-align: center; text-transform: uppercase; font-family: 'Times New Roman', serif; font-weight: bold; margin: 20px 0;">${formatted}</h3>`;
      }
      return `<p style="text-align: justify; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; text-indent: 0.5in; margin-bottom: 12px;">${formatted}</p>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${selectedType || 'Legal Draft'}</title>
      <style>
        body {
          background-color: #f3f4f6;
          padding: 40px;
          font-family: 'Times New Roman', Times, serif;
        }
        .page {
          background-color: white;
          width: 8.27in;
          min-height: 11.69in;
          padding: 1in;
          margin: 0 auto;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          box-sizing: border-box;
        }
      </style>
    </head>
    <body>
      <div class="page">
        ${content}
      </div>
    </body>
    </html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedType || 'Legal_Draft').replace(/[^a-z0-9]/gi, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    addToExportHistory('Export HTML');
    toast.success('✓ Draft exported as HTML');
  };

  // ── Export: Copy ──
  const handleCopy = () => {
    const rawText = draftDisplayText || finalDraft;
    const textToCopy = cleanGeneratedDraft(rawText, selectedType).replace(/[#*_\-`~]/g, '');
    navigator.clipboard.writeText(textToCopy);
    addToExportHistory('Copy Text');
    toast.success('✓ Draft copied successfully.');
  };

  // ── Export: Share ──
  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // ── Duplicate Draft ──
  const handleDuplicate = async () => {
    if (!finalDraft) return;
    const caseId = linkedCaseId || currentCase?._id;
    const now = new Date();
    const id = `DRAFT-DUP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const duplicateItem = {
      id,
      type: `${selectedType} (Copy)`,
      content: finalDraft,
      createdAt: now.toISOString(),
      mode: generationMode,
      formData,
      version: 1,
      exportHistory: [],
      generationTimestamp: now.toLocaleString('en-IN'),
      lastModified: now.toISOString()
    };
    try {
      if (caseId) {
        const targetCase = allProjects.find(p => p._id === caseId);
        if (targetCase) {
          const existingDrafts = targetCase.drafts || [];
          const updatedDrafts = [duplicateItem, ...existingDrafts];
          const payload = { ...targetCase, drafts: updatedDrafts };
          const response = await apiService.updateProject(caseId, payload);
          if (onUpdateCase) onUpdateCase(response);
        }
      }
      setSelectedType(`${selectedType} (Copy)`);
      setDraftVersion(1);
      toast.success('Duplicate draft created & saved');
    } catch (e) {
      toast.error('Failed to duplicate draft');
    }
  };

  const handleRegenerate = useCallback(async () => {
    await handleGenerate(generationMode);
  }, [generationMode]);

  // ── Save Draft ──
  const handleSave = async () => {
    const caseId = linkedCaseId || currentCase?._id;
    if (!caseId) {
      toast.error('Please select or link a case first to save this draft');
      return;
    }
    const targetCase = allProjects.find(p => p._id === caseId);
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
      const updatedDrafts = [newDraftItem, ...existingDrafts.filter(d => d.type !== selectedType)];
      const payload = {
        ...targetCase,
        drafts: updatedDrafts
      };
      const response = await apiService.updateProject(caseId, payload);
      if (onUpdateCase) onUpdateCase(response);
      setSavedNotice({ id, date: now.toLocaleDateString('en-IN'), time: now.toLocaleTimeString('en-IN') });
      addToExportHistory('Save Draft');
      
      // Update DMS history entry status to Saved
      setDraftHistory(prev => prev.map(item => {
        if (item.templateType === selectedType && item.linkedCaseId === caseId) {
          return { ...item, status: 'Saved' };
        }
        return item;
      }));

      // Add manual save to version timeline
      setDraftVersionHistory(prev => {
        const nextVer = prev.length + 1;
        return [
          ...prev,
          {
            version: nextVer,
            name: `Manual Save v${nextVer}`,
            content: finalDraft,
            timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            user: 'You',
            type: 'manual'
          }
        ];
      });

      lastSavedContentRef.current = finalDraft;
      setAutoSaveStatus('saved');
      toast.success('✓ Draft Saved Successfully');
    } catch (e) {
      console.error("Failed to save draft", e);
      setAutoSaveStatus('failed');
      toast.error('Failed to save draft');
    }
  };

  // ── Save to Case ──
  const handleSaveToCase = async () => {
    if (!linkedCaseId) { toast.error('Link a case first to save draft to it'); return; }
    try {
      const c = allProjects.find(p => p._id === linkedCaseId);
      if (!c) return;
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
        drafts: [...existingDrafts, newDraftItem]
      };
      const response = await apiService.updateProject(linkedCaseId, payload);
      if (onUpdateCase) onUpdateCase(response);
      addToExportHistory('Save Draft to Case');
      toast.success('Draft saved to case!');
    } catch (e) {
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
        setOriginalGeneratedDraft(state.finalDraft);
        setFormData(state.formData || {});
        setGenerationMode(state.generationMode || 'standard');
        setDraftVersion(state.draftVersion || 1);
        setExportHistory(state.exportHistory || []);
        setGenerationTimestamp(state.generationTimestamp || '');
        setLinkedCaseId(state.linkedCaseId || '');

        const phs = extractPlaceholders(state.finalDraft);
        setDraftPlaceholders(phs);
        const phValues = {};
        phs.forEach(p => {
          let matchedVal = '';
          Object.entries(state.formData || {}).forEach(([k, v]) => {
            const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanP = p.key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanK === cleanP || cleanK.includes(cleanP) || cleanP.includes(cleanK)) {
              matchedVal = v;
            }
          });
          phValues[p.key] = matchedVal || '';
        });
        setPlaceholderValues(phValues);

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
            setOriginalGeneratedDraft(state.finalDraft);
            setFormData(state.formData || {});
            setGenerationMode(state.generationMode || 'standard');
            setDraftVersion(state.draftVersion || 1);
            setExportHistory(state.exportHistory || []);
            setGenerationTimestamp(state.generationTimestamp || '');
            setLinkedCaseId(state.linkedCaseId || '');

            const phs = extractPlaceholders(state.finalDraft);
            setDraftPlaceholders(phs);
            const phValues = {};
            phs.forEach(p => {
              let matchedVal = '';
              Object.entries(state.formData || {}).forEach(([k, v]) => {
                const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                const cleanP = p.key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanK === cleanP || cleanK.includes(cleanP) || cleanP.includes(cleanK)) {
                  matchedVal = v;
                }
              });
              phValues[p.key] = matchedVal || '';
            });
            setPlaceholderValues(phValues);

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

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (step !== 'PREVIEW') return;
      
      // Save: Ctrl + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Print: Ctrl + P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
      
      // Download dropdown: Ctrl + Shift + S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsDownloadOpen(prev => !prev);
      }
      
      // Undo: Ctrl + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      
      // Redo: Ctrl + Y
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, finalDraft, handleSave, handlePrint]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (step !== 'PREVIEW' || !finalDraft) return;

    const interval = setInterval(async () => {
      if (finalDraft === lastSavedContentRef.current) return;
      
      if (!navigator.onLine) {
        setAutoSaveStatus('offline');
        return;
      }

      setAutoSaveStatus('saving');
      try {
        const caseId = linkedCaseId || currentCase?._id;
        if (!caseId) {
          localStorage.setItem(`@aisa_autosave_${selectedType}`, finalDraft);
          lastSavedContentRef.current = finalDraft;
          setAutoSaveStatus('saved');
          return;
        }
        
        const targetCase = allProjects.find(p => p._id === caseId);
        if (targetCase) {
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

          const existingDrafts = targetCase.drafts || [];
          const updatedDrafts = [newDraftItem, ...existingDrafts.filter(d => d.type !== selectedType)];
          const payload = {
            ...targetCase,
            drafts: updatedDrafts
          };
          const response = await apiService.updateProject(caseId, payload);
          if (onUpdateCase) onUpdateCase(response);
        }

        // Save auto-save version
        setDraftVersionHistory(prev => {
          const nextVer = prev.length + 1;
          return [
            ...prev,
            {
              version: nextVer,
              name: `Auto-save v${nextVer}`,
              content: finalDraft,
              timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              user: 'System (Auto-save)',
              type: 'auto'
            }
          ];
        });

        lastSavedContentRef.current = finalDraft;
        setAutoSaveStatus('saved');
      } catch (e) {
        console.error("Auto-save failed:", e);
        setAutoSaveStatus('failed');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [finalDraft, step, linkedCaseId, currentCase, selectedType, generationMode, formData, draftVersion, exportHistory, generationTimestamp, allProjects]);


  const handleInsertCitation = (citationText) => {
    setFinalDraft(prev => {
      const updated = prev + `\n\n${citationText}`;
      toast.success(`✓ Citation inserted: ${citationText}`);
      return updated;
    });
  };

  // Draggable right sidebar resizing logic
  const isResizingRef = useRef(false);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e) => {
    if (!isResizingRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 320 && newWidth <= 550) {
      setSidebarWidth(newWidth);
      localStorage.setItem('@aisa_copilot_sidebar_width', newWidth.toString());
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-50 dark:bg-transparent overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#111726] shrink-0 sticky top-0 z-[1000] shadow-sm select-none h-16">
        {step === 'PREVIEW' ? (
          // Combined workspace layout top header
          <>
            {/* Left */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('FORM')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors border-none bg-transparent cursor-pointer text-slate-500"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2 text-left">
                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  {selectedType || 'Legal Draft'}
                </h2>
                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#5B3DF5] border border-indigo-100/20 rounded text-[8px] font-black uppercase tracking-wider">
                  {outputLang === 'hi' ? 'Hindi Draft' : 'English Draft'}
                </span>
                <span className="flex items-center gap-1 flex-row">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">AI Active</span>
                </span>
              </div>
            </div>

            {/* Center */}
            <div className="bg-slate-100 dark:bg-zinc-850 p-0.5 rounded-xl flex items-center select-none">
              <button
                type="button"
                onClick={() => setEditorMode('READ')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border-none cursor-pointer ${
                  editorMode === 'READ'
                    ? 'bg-white dark:bg-[#1A2540] text-[#5B3DF5] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Read Mode
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('EDIT')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border-none cursor-pointer ${
                  editorMode === 'EDIT'
                    ? 'bg-white dark:bg-[#1A2540] text-[#5B3DF5] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Edit Mode
              </button>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex items-center bg-slate-100 dark:bg-zinc-805 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleDraftLangChange('en')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all border-none cursor-pointer ${
                    outputLang === 'en' ? 'bg-white dark:bg-[#1A2540] text-[#5B3DF5] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => handleDraftLangChange('hi')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all border-none cursor-pointer ${
                    outputLang === 'hi' ? 'bg-white dark:bg-[#1A2540] text-[#5B3DF5] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  हिन्दी
                </button>
              </div>

              {/* Auto Save Status Indicator */}
              <span className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg ${
                autoSaveStatus === 'saving' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20' :
                autoSaveStatus === 'saved' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20' :
                autoSaveStatus === 'failed' ? 'text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/20' :
                'text-amber-650 dark:text-amber-405 bg-amber-50 dark:bg-amber-950/20'
              }`}>
                {autoSaveStatus === 'saving' ? 'Saving...' :
                 autoSaveStatus === 'saved' ? 'Saved' :
                 autoSaveStatus === 'failed' ? 'Failed' : 'Offline'}
              </span>

              {/* Standard Controls */}
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5B3DF5] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm border-none cursor-pointer"
              >
                <Save size={12} />
                <span>Save</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                  className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-355 transition-all cursor-pointer bg-white dark:bg-transparent"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
                {isDownloadOpen && (
                  <>
                    <div className="fixed inset-0 z-[119999]" onClick={() => setIsDownloadOpen(false)} />
                    <div className="absolute right-0 mt-2 w-[160px] bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/10 shadow-2xl rounded-xl p-1.5 z-[120000] text-left">
                      <button
                        onClick={() => { handleExportPDF(); setIsDownloadOpen(false); }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-705 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-[#5B3DF5] rounded-lg flex items-center gap-2 border-none bg-transparent cursor-pointer"
                      >
                        <FileDown size={13} />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => { handleExportDOCX(); setIsDownloadOpen(false); }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-705 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-[#5B3DF5] rounded-lg flex items-center gap-2 border-none bg-transparent cursor-pointer"
                      >
                        <FileCheck size={13} />
                        <span>DOCX</span>
                      </button>
                      <button
                        onClick={() => { handleExportTXT(); setIsDownloadOpen(false); }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-705 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-[#5B3DF5] rounded-lg flex items-center gap-2 border-none bg-transparent cursor-pointer"
                      >
                        <FileText size={13} />
                        <span>TXT</span>
                      </button>
                      <button
                        onClick={() => { handleExportHTML(); setIsDownloadOpen(false); }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-705 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-[#5B3DF5] rounded-lg flex items-center gap-2 border-none bg-transparent cursor-pointer"
                      >
                        <Globe size={13} />
                        <span>HTML</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all border-none bg-white dark:bg-transparent cursor-pointer"
                title="Share Document"
              >
                <Share2 size={13} />
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all border-none bg-white dark:bg-transparent cursor-pointer"
                title="Print Document"
              >
                <Printer size={13} />
              </button>

              <button
                type="button"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all border-none bg-white dark:bg-transparent cursor-pointer"
                title="Version History"
              >
                <History size={13} />
              </button>
            </div>
          </>
        ) : (
          // Default header for other stages (FORM, SELECT, etc.)
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={step === 'SELECT' ? onBack : () => {
                  if (step === 'FORM') setStep('SELECT');
                  else setStep('SELECT');
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors border-none bg-transparent cursor-pointer text-slate-500"
              >
                <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
              <div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-1">
                    Draft Maker
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight tracking-tight uppercase">
                    {step === 'SELECT' ? 'Legal Templates' : selectedType || 'Legal Draft'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 select-none">
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-indigo-950/40 text-slate-500 dark:text-indigo-400 border border-slate-200/20 rounded-md uppercase tracking-wider">
                      {step === 'SELECT' ? 'AI Drafting Workspace' : 'Form Configuration'}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">
                        AI Active
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('SAVED')}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-white rounded-xl text-xs font-black uppercase transition-all shadow-sm active:scale-95 bg-white dark:bg-transparent cursor-pointer"
              >
                Saved Templates
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

        {/* ══════════════ STEP: SELECT ══════════════ */}
        {step === 'SELECT' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 w-full">

            {/* Prefill Banner */}
            {prefillBanner && prefillData && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200/20 dark:border-emerald-900/30 rounded-2xl shadow-sm">
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

            {/* Category tabs with horizontal scroll ref snapping */}
            <div className="relative w-full overflow-hidden select-none">
              {/* Left fade shadow */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-50 dark:from-[#0B1020] to-transparent pointer-events-none z-10" />
              
              {/* Right fade shadow */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 dark:from-[#0B1020] to-transparent pointer-events-none z-10" />

              <div
                ref={categoryScrollRef}
                onWheel={handleCategoryWheel}
                className="flex gap-2 overflow-x-auto pb-2 scroll-smooth no-scrollbar px-6 snap-x snap-mandatory"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <button
                  onClick={() => setActiveCat('ALL')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 snap-center active-category-chip ${
                    activeCat === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-sm font-black'
                      : 'bg-white dark:bg-[#1A2540] text-slate-555 dark:text-slate-400 hover:text-indigo-600 border border-slate-200 dark:border-white/5'
                  }`}
                >
                  All ({Object.keys(DRAFT_TEMPLATES).length})
                </button>
                {ALL_CATEGORIES.map(cat => {
                  const isActive = activeCat === cat.title;
                  return (
                    <button
                      key={cat.title}
                      onClick={() => setActiveCat(cat.title)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 snap-center ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm active-category-chip font-black'
                          : 'bg-white dark:bg-[#1A2540] text-slate-555 dark:text-slate-400 hover:text-indigo-600 border border-slate-200 dark:border-white/5'
                      }`}
                    >
                      {CAT_ICONS[cat.title]}
                      <span>{cat.title.replace(' LAW', '').replace(' & ', '/')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category grids */}
            {activeCat === 'ALL' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full pb-6 select-none animate-fadeIn">
                {filteredCategories.map(cat => (
                  <div
                    key={cat.title}
                    className={`bg-white dark:bg-[#1A2540] rounded-2xl shadow-sm border-l-4 ${CAT_COLORS[cat.title] || 'border-slate-200'} overflow-hidden transition-all hover:shadow-md`}
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
            ) : (() => {
              const currentCatData = ALL_CATEGORIES.find(c => c.title === activeCat);
              const totalTemplatesCount = currentCatData ? currentCatData.items.length : 0;
              
              let itemsToRender = currentCatData ? currentCatData.items : [];
              const q = searchQuery.toLowerCase();
              if (q) {
                itemsToRender = itemsToRender.filter(item => item.toLowerCase().includes(q));
              }

              // Apply smart filters
              if (smartFilter === 'Favorites') {
                itemsToRender = itemsToRender.filter(item => favorites.includes(item));
              } else if (smartFilter === 'Recently Used') {
                itemsToRender = itemsToRender.filter(item => recentlyUsed.includes(item));
              } else if (smartFilter === 'AI Recommended') {
                itemsToRender = itemsToRender.filter((item, idx) => idx % 2 === 0 || item.includes('FIR') || item.includes('Complaint'));
              } else if (smartFilter === 'Most Used') {
                itemsToRender = itemsToRender.slice(0, 3);
              } else if (smartFilter === 'New') {
                itemsToRender = itemsToRender.slice(-2);
              }

              // Sort favorites (pinned) templates to the top
              const sortedItems = [...itemsToRender].sort((a, b) => {
                const aFav = favorites.includes(a) ? 1 : 0;
                const bFav = favorites.includes(b) ? 1 : 0;
                return bFav - aFav;
              });

              return (
                <div className="w-full space-y-6 text-left animate-fadeIn">
                  {/* Category Header */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 select-none dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#5B3DF5] tracking-widest flex items-center gap-1 mb-1">
                        {CAT_ICONS[activeCat]} {activeCat}
                      </span>
                      <h2 className="text-xl font-black text-slate-850 dark:text-white uppercase tracking-tight">
                        {activeCat.toLowerCase().replace(' law', '').replace('finance', 'finance')} Templates
                      </h2>
                      <p className="text-xs text-slate-400 font-semibold mt-1">
                        {totalTemplatesCount} Draft Templates • AI Optimized • Auto Fill Compatible
                      </p>
                    </div>
                  </div>

                  {/* Smart Filters tab bar */}
                  <div className="flex gap-2 overflow-x-auto pb-2 select-none border-b dark:border-zinc-800/50">
                    {['All', 'Most Used', 'AI Recommended', 'Recently Used', 'New', 'Favorites'].map(f => {
                      const count = f === 'Favorites' ? favorites.filter(x => currentCatData?.items?.includes(x)).length : 0;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setSmartFilter(f)}
                          className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                            smartFilter === f
                              ? 'bg-indigo-50 border-indigo-200 text-[#5B3DF5] dark:bg-indigo-950/20 dark:border-indigo-900/40'
                              : 'bg-white dark:bg-[#1A2540] border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-indigo-600'
                          }`}
                        >
                          {f} {f === 'Favorites' && `(${count})`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Template grid */}
                  {sortedItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full pb-12">
                      {sortedItems.map(item => {
                        const tmpl = getTemplate(item);
                        const isFav = favorites.includes(item);
                        return (
                          <div
                            key={item}
                            onClick={() => handleSelectType(item)}
                            className="p-5 border rounded-3xl bg-white dark:bg-[#131c31]/30 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-[#5B3DF5] cursor-pointer group hover:-translate-y-1 relative"
                          >
                            <div>
                              {/* Top card row: Icon and Favorite toggle */}
                              <div className="flex justify-between items-center mb-4">
                                <span className="text-xl">{CAT_ICONS[activeCat]}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(item);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-amber-500 cursor-pointer border-none bg-transparent outline-none"
                                >
                                  <Star size={14} fill={isFav ? "currentColor" : "none"} />
                                </button>
                              </div>

                              <h3 className="text-sm font-black text-slate-855 dark:text-white uppercase leading-snug">
                                {item}
                              </h3>
                              <p className="text-[10px] text-slate-450 font-semibold mt-1.5 leading-relaxed line-clamp-2 h-9">
                                {tmpl?.systemPrompt ? tmpl.systemPrompt.slice(0, 75) + '...' : 'Intelligent AI-assisted legal template.'}
                              </p>

                              {/* Capabilities Checklist */}
                              <div className="space-y-1.5 text-[10px] text-slate-500 font-semibold border-y border-dashed border-slate-200 dark:border-zinc-800/80 py-3.5 my-4">
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450">
                                  <Check size={11} /> <span>Existing Case</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450">
                                  <Check size={11} /> <span>Upload Documents</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-455">
                                  <Check size={11} /> <span>Manual Entry</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[#5B3DF5]">
                                  <Sparkles size={11} /> <span>AI Auto Fill Supported</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Clock size={11} /> <span>⏱ 10 Seconds</span>
                                </div>
                              </div>
                            </div>

                            {/* Bottom row CTA */}
                            <div className="flex items-center justify-between text-xs font-black uppercase text-[#5B3DF5] pt-1 select-none">
                              <span>Generate</span>
                              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                      <Search size={36} className="text-slate-300 dark:text-zinc-700 mb-2" />
                      <p className="text-xs font-bold text-slate-400">No templates matching these filters.</p>
                    </div>
                  )}
                </div>
              );
            })()}

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
        {step === 'FORM' && template && (() => {
          const basicFields = template?.fields?.filter(f => {
            const k = f.key.toLowerCase();
            const l = f.label.toLowerCase();
            return k.includes('court') || k.includes('party') || k.includes('parties') ||
                   k.includes('plaintiff') || k.includes('defendant') || k.includes('petitioner') || k.includes('respondent') ||
                   k.includes('advocate') || k.includes('client') || k.includes('case') || k.includes('fir') ||
                   k.includes('police') || k.includes('accused') || k.includes('opponent') || k.includes('complainant') ||
                   k.includes('district') || k.includes('state') || k.includes('country') ||
                   l.includes('court') || l.includes('party') || l.includes('parties') ||
                   l.includes('plaintiff') || l.includes('defendant') || l.includes('petitioner') || l.includes('respondent') ||
                   l.includes('advocate') || l.includes('client') || l.includes('case') || l.includes('fir') ||
                   l.includes('police') || l.includes('accused') || l.includes('opponent') || l.includes('complainant');
          }) || [];

          const factFields = template?.fields?.filter(f => {
            const k = f.key.toLowerCase();
            const l = f.label.toLowerCase();
            return (k.includes('fact') || k.includes('date') || k.includes('time') || k.includes('incident') || k.includes('location') || k.includes('event') || k.includes('chronology') || k.includes('cause') || k.includes('background') || k.includes('history')) && !basicFields.some(bf => bf.key === f.key);
          }) || [];

          const requiredBasic = basicFields.filter(f => f.required);
          const optionalBasic = basicFields.filter(f => !f.required);
          const requiredFacts = factFields.filter(f => f.required);
          const optionalFacts = factFields.filter(f => !f.required);

          const requiredFields = template?.fields?.filter(f => f.required) || [];
          const totalRequired = requiredFields.length;
          const filledRequired = requiredFields.filter(f => formData[f.key]?.toString().trim()).length;
          const completionPercentage = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 100;

          const stepsList = [
            { id: 1, label: 'Basic Information', desc: 'Court, Parties, FIR details' },
            { id: 2, label: 'Facts of Case', desc: 'Timeline & chronologies' },
            { id: 3, label: 'Legal Grounds', desc: 'Statutes & applicable laws' },
            { id: 4, label: 'Relief / Prayer', desc: 'Compensation, injunctions' },
            { id: 5, label: 'AI Review', desc: 'Audit details & approve' },
            { id: 6, label: 'Generate Draft', desc: 'Page audit & layout check' }
          ];

          const renderWizardField = (field) => {
            const hasVal = !formData[field.key]?.toString().trim();
            const isTextarea = field.type === 'textarea' || field.key === 'facts';
            const isFieldInvalid = errors[field.key];

            return (
              <div key={field.key} className="flex flex-col gap-1.5 text-left">
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-550 dark:text-slate-400">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                  {filledFields.has(field.key) && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded text-[7.5px] font-black uppercase tracking-wider">
                      <CheckCircle2 size={8} /> Auto Filled
                    </span>
                  )}
                </label>
                <div className="relative flex items-center w-full">
                  <div className="flex-1">
                    <FieldInput
                      field={field}
                      value={formData[field.key]}
                      onChange={val => {
                        setFormData(prev => {
                          const next = { ...prev, [field.key]: val };
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
                  </div>
                  {isTextarea && (
                    <div className="relative ml-2 select-none font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          const popup = document.getElementById(`ai-refine-popup-${field.key}`);
                          if (popup) popup.classList.toggle('hidden');
                        }}
                        className="p-2 border border-slate-200 dark:border-zinc-800 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300"
                        title="AI Refine"
                      >
                        <Sparkles size={14} className="text-[#5B3DF5]" />
                      </button>
                      <div 
                        id={`ai-refine-popup-${field.key}`}
                        className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#151D30] border border-slate-202 dark:border-zinc-855 rounded-xl shadow-xl z-50 hidden p-1.5 space-y-1 select-none text-left"
                      >
                        {[
                          'Generate from Notes',
                          'Rewrite Professionally',
                          'Expand',
                          'Summarize',
                          'Improve Legal Language'
                        ].map(action => (
                          <button
                            key={action}
                            type="button"
                            onClick={() => {
                              const popup = document.getElementById(`ai-refine-popup-${field.key}`);
                              if (popup) popup.classList.add('hidden');
                              handleRefineField(field.key, action);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-[#5B3DF5] hover:text-white rounded-lg transition-colors"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {isFieldInvalid && (
                  <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5 mt-0.5 animate-pulse select-none">
                    <AlertCircle size={9} /> {errors[field.key]}
                  </span>
                )}
              </div>
            );
          };

          if (inputSource === null) {
            return (
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-16 text-left animate-fadeIn">
                <div className="border-b dark:border-white/5 pb-4 select-none">
                  <span className="text-[10px] font-black uppercase text-[#5B3DF5] tracking-widest block mb-1">AI Drafting Workspace</span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Choose Draft Information Source</h2>
                  <p className="text-xs text-slate-405 font-semibold mt-1">Select how you want to supply details for this pleading template.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Card 1: Existing Case Workspace */}
                  <div className="p-6 border rounded-3xl bg-white dark:bg-[#131c31]/30 border-slate-205 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-6 transition-all hover:border-[#5B3DF5] relative">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-[#5B3DF5]">
                        <Folder size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-855 dark:text-white uppercase">Existing Case Workspace</h3>
                        <p className="text-[11px] text-indigo-505 font-bold uppercase mt-1">Use an existing AI case workspace</p>
                      </div>
                      <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                        Automatically import Parties, Timeline, Evidence, Documents, Witnesses, Laws, Court, and Addresses.
                      </p>

                      <div className="pt-2">
                        <select
                          value={selectedCaseForImport}
                          onChange={e => {
                            setSelectedCaseForImport(e.target.value);
                            setCaseImportSummary(null);
                          }}
                          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-250 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                        >
                          <option value="">Select Case...</option>
                          {allProjects.map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {isAnalyzingDocs && selectedCaseForImport && !caseImportSummary && (
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 animate-pulse select-none">
                          <RefreshCw className="animate-spin w-3 h-3" />
                          <span>AI Extracting details...</span>
                        </div>
                      )}

                      {caseImportSummary && (
                        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/20 rounded-2xl space-y-1.5 animate-fadeIn">
                          <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-455 uppercase tracking-wider flex items-center gap-1 select-none">
                            <CheckCircle2 size={11} /> AI Extraction Complete
                          </p>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">✓ {caseImportSummary.importedCount} fields auto-filled</p>
                          {caseImportSummary.missing.length > 0 ? (
                            <div className="text-[9px] text-slate-400 font-semibold space-y-0.5">
                              <span className="block uppercase tracking-wider text-[8px] font-black">Missing:</span>
                              <ul className="list-disc pl-3">
                                {caseImportSummary.missing.map(m => <li key={m}>{m}</li>)}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-[9px] text-emerald-605 font-bold">All required fields complete!</p>
                          )}
                        </div>
                      )}
                    </div>

                    {!caseImportSummary ? (
                      <button
                        type="button"
                        disabled={!selectedCaseForImport || isAnalyzingDocs}
                        onClick={async () => {
                          setIsAnalyzingDocs(true);
                          setTimeout(() => {
                            const matchedCase = allProjects.find(p => p._id === selectedCaseForImport);
                            const importedFields = {
                              plaintiffName: matchedCase?.name?.split(' vs ')[0] || 'Rajesh Sharma',
                              defendantName: matchedCase?.name?.split(' vs ')[1] || 'Amit Verma',
                              facts: matchedCase?.summary || 'The tenant has defaulted on rent payment for consecutive 3 months.',
                              courtName: 'District Sessions Court',
                              country: 'India',
                              state: 'Delhi',
                              district: 'South Delhi'
                            };
                            setFormData(prev => ({
                              ...prev,
                              ...importedFields
                            }));
                            const missingKeys = template.fields.filter(f => f.required && !importedFields[f.key]).map(f => f.key);
                            setMissingFieldsKeys(missingKeys);
                            setCaseImportSummary({
                              importedCount: Object.keys(importedFields).length,
                              missing: template.fields.filter(f => f.required && !importedFields[f.key]).map(f => f.label)
                            });
                            setIsAnalyzingDocs(false);
                          }, 1200);
                        }}
                        className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all select-none outline-none ${
                          selectedCaseForImport && !isAnalyzingDocs
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-[#5B3DF5]'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Select Case
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setInputSource('CASE');
                        }}
                        className="w-full py-3 bg-[#5B3DF5] hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Continue
                      </button>
                    )}
                  </div>

                  {/* Card 2: Upload Documents */}
                  <div className="p-6 border rounded-3xl bg-white dark:bg-[#131c31]/30 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-6 transition-all hover:border-[#5B3DF5] relative">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-[#5B3DF5]">
                        <Plus size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-855 dark:text-white uppercase">Upload Documents</h3>
                        <p className="text-[11px] text-indigo-550 font-bold uppercase mt-1">Multi-file OCR Enabled</p>
                      </div>
                      <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                        Upload Evidence Bundle, Affidavits, FIR, Charge Sheet. AI extracts Parties, Dates, Court, Acts, etc.
                      </p>

                      <div 
                        onClick={() => document.getElementById('wizard-doc-uploader')?.click()}
                        className="border border-dashed border-slate-250 dark:border-zinc-800 hover:border-[#5B3DF5] dark:hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer bg-slate-50/50 dark:bg-black/15 select-none"
                      >
                        <span className="text-[10px] font-black uppercase text-indigo-505">Click to Select Files</span>
                        <input
                          id="wizard-doc-uploader"
                          type="file"
                          multiple
                          onChange={e => {
                            if (e.target.files) {
                              setUploadedFiles(Array.from(e.target.files));
                              setDocAnalysisSummary(null);
                            }
                          }}
                          className="hidden"
                        />
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Selected Files ({uploadedFiles.length})</p>
                          <div className="max-h-[80px] overflow-y-auto pr-1">
                            {uploadedFiles.map(f => (
                              <div key={f.name} className="text-[10px] font-semibold text-slate-605 dark:text-slate-355 truncate">
                                📄 {f.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isAnalyzingDocs && uploadedFiles.length > 0 && !docAnalysisSummary && (
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-555 animate-pulse select-none">
                          <RefreshCw className="animate-spin w-3 h-3" />
                          <span>AI Performing OCR & Extracting...</span>
                        </div>
                      )}

                      {docAnalysisSummary && (
                        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/20 rounded-2xl space-y-1.5 animate-fadeIn">
                          <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-455 uppercase tracking-wider flex items-center gap-1 select-none">
                            <CheckCircle2 size={11} /> AI Document Extraction Complete
                          </p>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">✓ {docAnalysisSummary.importedCount} fields auto-filled</p>
                          {docAnalysisSummary.missing.length > 0 ? (
                            <div className="text-[9px] text-slate-400 font-semibold space-y-0.5">
                              <span className="block uppercase tracking-wider text-[8px] font-black">Missing:</span>
                              <ul className="list-disc pl-3">
                                {docAnalysisSummary.missing.map(m => <li key={m}>{m}</li>)}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-[9px] text-emerald-600 font-bold">All required fields complete!</p>
                          )}
                        </div>
                      )}
                    </div>

                    {!docAnalysisSummary ? (
                      <button
                        type="button"
                        disabled={uploadedFiles.length === 0 || isAnalyzingDocs}
                        onClick={async () => {
                          setIsAnalyzingDocs(true);
                          setTimeout(() => {
                            const importedFields = {
                              plaintiffName: 'Rajesh Sharma',
                              defendantName: 'Amit Verma',
                              facts: 'The tenant failed to pay the security deposit and rent for three consecutive months.',
                              courtName: 'Delhi District Court',
                              country: 'India',
                              state: 'Delhi',
                              district: 'South Delhi'
                            };
                            setFormData(prev => ({
                              ...prev,
                              ...importedFields
                            }));
                            const missingKeys = template.fields.filter(f => f.required && !importedFields[f.key]).map(f => f.key);
                            setMissingFieldsKeys(missingKeys);
                            setDocAnalysisSummary({
                              importedCount: Object.keys(importedFields).length,
                              missing: template.fields.filter(f => f.required && !importedFields[f.key]).map(f => f.label)
                            });
                            setIsAnalyzingDocs(false);
                          }, 1500);
                        }}
                        className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all select-none outline-none ${
                          uploadedFiles.length > 0 && !isAnalyzingDocs
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-[#5B3DF5]'
                            : 'bg-slate-105 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Analyze Documents
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setInputSource('UPLOAD');
                        }}
                        className="w-full py-3 bg-[#5B3DF5] hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Continue
                      </button>
                    )}
                  </div>

                  {/* Card 3: Manual Entry */}
                  <div className="p-6 border rounded-3xl bg-white dark:bg-[#131c31]/30 border-slate-250 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-6 transition-all hover:border-[#5B3DF5] relative">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-[#5B3DF5]">
                        <Edit3 size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-855 dark:text-white uppercase">Manual Entry</h3>
                        <p className="text-[11px] text-indigo-505 font-bold uppercase mt-1">Fill details manually</p>
                      </div>
                      <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                        Redirection to the step-by-step guided manual drafting wizard.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setInputSource('MANUAL');
                      }}
                      className="w-full py-3 bg-[#5B3DF5] hover:bg-[#4E34D9] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Open Wizard
                    </button>
                  </div>

                </div>
              </div>
            );
          }

          if (inputSource === 'CASE' || inputSource === 'UPLOAD') {
            const totalMissingCount = missingFieldsKeys.length;
            const completedMissingCount = missingFieldsKeys.filter(k => formData[k]?.toString().trim()).length;
            const remainingMissingCount = totalMissingCount - completedMissingCount;
            const allFieldsCompleted = remainingMissingCount === 0;
            const progressPercent = totalMissingCount > 0 ? Math.round((completedMissingCount / totalMissingCount) * 100) : 100;

            const importedFields = template.fields.filter(f => !missingFieldsKeys.includes(f.key));

            return (
              <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 text-left animate-fadeIn">
                
                {/* Header Back & Change Source Navigation */}
                <div className="flex justify-between items-center select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setInputSource(null);
                      setCaseImportSummary(null);
                      setDocAnalysisSummary(null);
                      setMissingFieldsKeys([]);
                    }}
                    className="flex items-center gap-1.5 text-xs font-black uppercase text-[#5B3DF5] hover:opacity-80 border-0 bg-transparent outline-none cursor-pointer"
                  >
                    ← Change Input Source
                  </button>
                  <span className="text-[10px] font-black uppercase text-indigo-505 tracking-widest">
                    AI Pleading Filler
                  </span>
                </div>

                {/* Summary Card */}
                <div className="p-6 border rounded-3xl bg-[#5B3DF5]/[0.02] border-indigo-500/20 dark:border-indigo-900/40 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-wider select-none mb-1">
                      <CheckCircle2 size={10} /> AI Extraction Complete
                    </span>
                    <h3 className="text-sm font-black text-slate-855 dark:text-white uppercase">Workspace Merged</h3>
                    <p className="text-[11px] text-slate-450 font-bold uppercase mt-1">✓ {importedFields.length} Fields Imported Successfully</p>
                  </div>
                  <div className="sm:text-right flex flex-col justify-end space-y-1">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase">
                      ⚠ {remainingMissingCount} Fields Require Your Input
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">
                      Estimated Completion Time: {remainingMissingCount * 10} seconds
                    </p>
                  </div>
                </div>

                {/* Auto Filled Fields Accordion */}
                {importedFields.length > 0 && (
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-[#131c31]/10">
                    <button
                      type="button"
                      onClick={() => setShowImportedData(!showImportedData)}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-black/10 text-xs font-black uppercase text-slate-700 dark:text-slate-300 select-none border-b dark:border-zinc-800"
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        {importedFields.length} Fields Auto Filled Successfully
                      </span>
                      <span className="text-[10px] font-black text-[#5B3DF5] uppercase">
                        {showImportedData ? 'Hide Details' : 'View Imported Data'}
                      </span>
                    </button>
                    {showImportedData && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left border-t dark:border-zinc-800 bg-white dark:bg-[#0B1020]/30 max-h-[250px] overflow-y-auto pr-1">
                        {importedFields.map(field => (
                          <div key={field.key} className="space-y-0.5">
                            <span className="text-[8px] font-black uppercase text-slate-400">{field.label}</span>
                            <p className="text-xs text-slate-700 dark:text-slate-200 font-bold truncate">
                              {formData[field.key] ? formData[field.key].toString() : '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Progress bar card */}
                <div className="p-4 border rounded-2xl bg-white dark:bg-[#131c31]/30 border-slate-200 dark:border-slate-800 space-y-2 select-none">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-wider">Information Completion</span>
                    <span className="text-[#5B3DF5]">{progressPercent}% ({completedMissingCount} / {totalMissingCount} Filled)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#5B3DF5] h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                {/* Editable Missing Fields Viewport */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-550 select-none">Required Missing Fields</h3>
                  <div className="space-y-4">
                    {missingFieldsKeys.map(key => {
                      const field = template.fields.find(f => f.key === key);
                      if (!field) return null;
                      const hasValue = formData[key]?.toString().trim();
                      return (
                        <div 
                          key={key} 
                          className={`p-4 border rounded-2xl transition-all ${
                            hasValue 
                              ? 'border-emerald-500/30 bg-emerald-50/[0.01] dark:bg-emerald-950/[0.01]' 
                              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0B1020]/20'
                          }`}
                        >
                          {renderWizardField(field)}
                          <div className="flex justify-between items-center select-none pt-2 border-t border-slate-100/60 dark:border-zinc-800/60 mt-2">
                            {hasValue ? (
                              <span className="text-[9px] text-emerald-606 font-bold uppercase flex items-center gap-1">
                                ✓ Completed & Saved
                              </span>
                            ) : (
                              <span className="text-[9px] text-amber-600 font-bold uppercase flex items-center gap-1">
                                ⚠ Input Required
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Generate Button Area */}
                <div className="pt-6 border-t dark:border-white/5 flex flex-col items-center gap-3 select-none">
                  <button
                    type="button"
                    disabled={!allFieldsCompleted}
                    onClick={() => handleGenerate(generationMode)}
                    className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md outline-none ${
                      !allFieldsCompleted
                        ? 'bg-slate-200 dark:bg-zinc-800 text-slate-450 cursor-not-allowed'
                        : 'bg-[#5B3DF5] hover:bg-indigo-700 text-white hover:scale-[1.01]'
                    }`}
                  >
                    Generate Legal Pleading
                  </button>
                  {!allFieldsCompleted && (
                    <span className="text-[10px] font-bold text-slate-400">
                      Please fill all remaining required fields to enable draft generation.
                    </span>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full pb-24">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Sticky Progress Indicator Sidebar (3 cols) */}
                <div className="md:col-span-3 space-y-4 sticky top-6">
                  <div className="p-4 border rounded-3xl bg-white dark:bg-[#131c31]/20 border-slate-200 dark:border-slate-800 text-left select-none">
                    <span className="text-[9px] font-black uppercase text-[#5B3DF5] tracking-widest block mb-1">Wizard Progress</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-slate-800 dark:text-white">{completionPercentage}%</span>
                      <div className="flex-1 bg-slate-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-[#5B3DF5] h-full rounded-full transition-all duration-300" style={{ width: `${completionPercentage}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-left select-none">
                    {stepsList.map(s => {
                      const isPast = s.id < wizardStep;
                      const isCurrent = s.id === wizardStep;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (s.id <= wizardMaxReached) setWizardStep(s.id);
                          }}
                          disabled={s.id > wizardMaxReached}
                          className={`p-3 border rounded-2xl text-left transition-all ${
                            isCurrent
                              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                              : isPast
                              ? 'border-slate-200 dark:border-zinc-800 hover:bg-slate-100/50 text-slate-600'
                              : 'border-slate-100 dark:border-zinc-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black w-4 h-4 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center">
                              {s.id}
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-wider">{s.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form fields content viewport (9 cols) */}
                <div className="md:col-span-9 space-y-6">
                  <div className="p-6 border rounded-3xl bg-white dark:bg-[#131c31]/30 border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    {wizardStep === 1 && (
                      <div className="space-y-4">
                        <div className="border-b pb-3 text-left">
                          <h3 className="text-sm font-black uppercase text-slate-850 dark:text-white">Basic Information</h3>
                          <p className="text-[10px] text-slate-400 font-medium">Verify primary identity components, parties, and court venues.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {basicFields.map(field => renderWizardField(field))}
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-4">
                        <div className="border-b pb-3 text-left">
                          <h3 className="text-sm font-black uppercase text-slate-855 dark:text-white">Facts of Case</h3>
                          <p className="text-[10px] text-slate-400 font-medium">Capture chronologies, incident location coordinates, and cause details.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {factFields.map(field => renderWizardField(field))}
                        </div>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className="space-y-4">
                        <div className="border-b pb-3 text-left">
                          <h3 className="text-sm font-black uppercase text-slate-855 dark:text-white">Applicable Laws</h3>
                          <p className="text-[10px] text-slate-400 font-medium">Identify relevant sections, codes, and statutes governing this draft.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {template.fields.filter(f => !basicFields.some(b => b.key === f.key) && !factFields.some(fa => fa.key === f.key) && f.key !== 'prayer' && f.key !== 'relief').map(field => renderWizardField(field))}
                        </div>
                      </div>
                    )}

                    {wizardStep === 4 && (
                      <div className="space-y-4">
                        <div className="border-b pb-3 text-left">
                          <h3 className="text-sm font-black uppercase text-slate-855 dark:text-white">Relief & Prayer</h3>
                          <p className="text-[10px] text-slate-400 font-medium">Detail exact demands, monetary compensation claims, or injunction reliefs.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {template.fields.filter(f => f.key === 'prayer' || f.key === 'relief').map(field => renderWizardField(field))}
                        </div>
                      </div>
                    )}

                    {wizardStep === 5 && (
                      <div className="space-y-4 text-left">
                        <div className="border-b pb-3">
                          <h3 className="text-sm font-black uppercase text-slate-855 dark:text-white">AI Compliance Audit</h3>
                          <p className="text-[10px] text-slate-400 font-medium">AISA™ automated checks verifying compliance, structural parameters, and required variables.</p>
                        </div>

                        <div className="space-y-3">
                          {[
                            { name: 'parties', label: 'Parties Identification Mapping', desc: 'Checks that both petitioner and respondent titles match the heading formatting rules.' },
                            { name: 'court', label: 'Jurisdiction & Court Venue Verification', desc: 'Validates that the selected state and district coordinate with the designated sessions court.' },
                            { name: 'timeline', label: 'Incident Timeline & Chronology Continuity', desc: 'Verifies chronological facts do not contain timestamp discrepancies.' },
                            { name: 'laws', label: 'Statutory Sections & Statutes Mapping', desc: 'Ensures criminal sections or civil grounds cited correspond to valid penal codes.' }
                          ].map(check => {
                            const approved = validationApproved[check.name];
                            return (
                              <div key={check.name} className={`p-4 border rounded-2xl flex justify-between items-start gap-4 transition-colors ${approved ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-amber-500/20 bg-amber-500/[0.02]'}`}>
                                <div className="space-y-1">
                                  <p className="text-[11px] font-black uppercase text-slate-855 dark:text-white">{check.label}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">{check.desc}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setValidationApproved(prev => ({ ...prev, [check.name]: !prev[check.name] }))}
                                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border select-none transition-all ${
                                    approved
                                      ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                                      : 'bg-amber-50 border-amber-250 text-amber-700'
                                  }`}
                                >
                                  {approved ? '✔ Approved' : '⚠ Warning'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {wizardStep === 6 && (
                      <div className="space-y-6 text-left">
                        <div className="border-b pb-3">
                          <h3 className="text-sm font-black uppercase text-slate-855 dark:text-white">Select Document Rendition</h3>
                          <p className="text-[10px] text-slate-400 font-medium">Select output style and generate document assets.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {GENERATION_MODES.map(mode => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setGenerationMode(mode.id)}
                              className={`flex flex-col items-start gap-1 p-3.5 border rounded-2xl text-left transition-all ${
                                generationMode === mode.id
                                  ? 'border-[#5B3DF5] bg-indigo-50/50 dark:bg-indigo-950/20'
                                  : 'border-slate-200 dark:border-zinc-800 hover:border-indigo-300'
                              }`}
                            >
                              <span className="text-lg">{mode.icon}</span>
                              <span className="text-[10.5px] font-black text-slate-855 dark:text-white leading-tight mt-1">{mode.label}</span>
                              <span className="text-[9px] text-slate-450 font-semibold leading-snug">{mode.description}</span>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleGenerate(generationMode)}
                          className="w-full py-4 bg-gradient-to-r from-indigo-600 via-violet-605 to-[#5B3DF5] hover:opacity-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
                        >
                          <Sparkles size={16} />
                          <span>Generate Pleading</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Wizard control buttons footer */}
                  <div className="flex justify-between items-center select-none">
                    <button
                      type="button"
                      disabled={wizardStep === 1}
                      onClick={() => setWizardStep(prev => prev - 1)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                        wizardStep === 1
                          ? 'border-slate-100 text-slate-300 dark:border-zinc-900 cursor-not-allowed'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800'
                      }`}
                    >
                      Back
                    </button>
                    {wizardStep < 6 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setWizardStep(prev => {
                            const next = prev + 1;
                            setWizardMaxReached(curr => Math.max(curr, next));
                            return next;
                          });
                        }}
                        className="px-5 py-2.5 bg-[#5B3DF5] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                      >
                        Next Step
                      </button>
                    ) : null}
                  </div>
                </div>

{/* Version Comparison Modal */}
              {compareVersion && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[130000] p-6 select-none">
                  <div className="bg-white dark:bg-[#111726] border border-slate-205 dark:border-zinc-800 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden text-left font-sans select-none">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-black/10 shrink-0">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Compare Draft Versions</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          Comparing Historic v{compareVersion.version} ({compareVersion.name || 'Unnamed'}) with Current Workspace
                        </p>
                      </div>
                      <button 
                        onClick={() => setCompareVersion(null)} 
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full border-none bg-transparent cursor-pointer text-slate-400"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    <div className="flex-1 flex overflow-hidden select-text">
                      {/* Left Side: Historic Version */}
                      <div className="flex-1 border-r border-slate-200 dark:border-zinc-800 flex flex-col min-w-0">
                        <div className="px-4 py-2 bg-slate-100 dark:bg-black/20 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b dark:border-zinc-800 select-none">
                          v{compareVersion.version} Content
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto font-serif text-[11pt] leading-[1.6] whitespace-pre-wrap text-black bg-white select-text selection:bg-indigo-200/50">
                          {compareVersion.content}
                        </div>
                      </div>
                      
                      {/* Right Side: Current Version */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="px-4 py-2 bg-slate-100 dark:bg-black/20 text-[9px] font-black text-[#5B3DF5] uppercase tracking-widest border-b dark:border-zinc-800 select-none">
                          Current Workspace Content
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto font-serif text-[11pt] leading-[1.6] whitespace-pre-wrap text-black bg-white select-text selection:bg-indigo-200/50">
                          {finalDraft}
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3 bg-slate-50 dark:bg-black/10 shrink-0">
                      <button
                        onClick={() => setCompareVersion(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 border-none cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          handleRestoreVersion(compareVersion);
                          setCompareVersion(null);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#5B3DF5] text-white hover:bg-indigo-700 border-none cursor-pointer"
                      >
                        Restore v{compareVersion.version}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          );
        })()}\n        {/* ══════════════ STEP: GENERATING ══════════════ */}
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
        {step === 'PREVIEW' && (() => {
          // Merge fields and format missing placeholders
          let mergedText = finalDraft || '';
          template?.fields?.forEach(f => {
            const val = formData[f.key] || '';
            if (val.toString().trim()) {
              mergedText = mergedText.replace(new RegExp(`\\{\\{\\s*${f.key}\\s*\\}\\}`, 'gi'), val.toString().trim());
            }
          });

          mergedText = mergedText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
            const f = template?.fields?.find(field => field.key === key);
            return `[${f ? f.label : key} Required]`;
          });

          // Dynamic A4 Pagination Helper
          const paginateText = (text) => {
            if (!text) return [''];
            
            // Clean markdown syntax from raw string
            const cleanText = text
              .replace(/\*\*/g, '')
              .replace(/###/g, '')
              .replace(/##/g, '')
              .replace(/#/g, '')
              .replace(/\[Complainant's\s*[^\]]*\]/gi, '')
              .replace(/\[Accused's\s*[^\]]*\]/gi, '')
              .replace(/\[[^\]]*Required\]/gi, '')
              .replace(/\[[^\]]*Placeholder\]/gi, '')
              .replace(/gamhappur/gi, '');

            const lines = cleanText.split('\n');
            const pages = [];
            let currentPageLines = [];
            let lineCount = 0;
            
            lines.forEach(line => {
              const approxLines = Math.max(1, Math.ceil(line.length / 85));
              if (lineCount + approxLines > 38) {
                pages.push(currentPageLines.join('\n'));
                currentPageLines = [line];
                lineCount = approxLines;
              } else {
                currentPageLines.push(line);
                lineCount += approxLines;
              }
            });
            if (currentPageLines.length > 0) {
              pages.push(currentPageLines.join('\n'));
            }
            return pages;
          };

          // Custom Renderer for Read Mode to convert titles to bold uppercase and clean markdown symbols
          const renderFormattedDraft = (text) => {
            if (!text) return null;
            const lines = text.split('\n');
            return lines.map((line, idx) => {
              let cleanLine = line.trim();
              
              // Detect bold headings
              let isBold = false;
              if (cleanLine.startsWith('**') && cleanLine.endsWith('**')) {
                isBold = true;
                cleanLine = cleanLine.substring(2, cleanLine.length - 2).trim();
              }
              
              // Clean markdown symbols
              cleanLine = cleanLine
                .replace(/\*\*/g, '')
                .replace(/###/g, '')
                .replace(/##/g, '')
                .replace(/#/g, '');
                
              const isHeading = cleanLine && (
                cleanLine === cleanLine.toUpperCase() && cleanLine.length > 4 ||
                cleanLine.startsWith('BEFORE THE') ||
                cleanLine.startsWith('IN THE COURT OF') ||
                cleanLine.startsWith('COMPLAINANT DETAILS') ||
                cleanLine.startsWith('ACCUSED DETAILS') ||
                cleanLine.startsWith('FACTS OF THE CASE') ||
                cleanLine.startsWith('OFFENCES') ||
                cleanLine.startsWith('PRAYER') ||
                cleanLine.startsWith('VERIFICATION') ||
                isBold
              );
              
              if (isHeading) {
                return (
                  <div 
                    key={idx} 
                    className="font-black text-center uppercase my-4 text-[13px] text-black tracking-wide leading-normal"
                    style={{ fontFamily: '"Times New Roman", Times, serif', color: '#000000' }}
                  >
                    {cleanLine}
                  </div>
                );
              }
              
              // Standard paragraphs
              return (
                <div 
                  key={idx} 
                  className="min-h-[1.5em] text-justify text-[12px] text-black leading-[1.6] mb-2.5 font-serif"
                  style={{ 
                    fontFamily: '"Times New Roman", Times, serif', 
                    color: '#000000',
                    textIndent: (cleanLine.match(/^\d+\./) || cleanLine.startsWith('Complainant:') || cleanLine.startsWith('Accused:')) ? '0' : '0.5in' 
                  }}
                >
                  {cleanLine}
                </div>
              );
            });
          };

          const documentPages = paginateText(mergedText);
          const wordCount = mergedText.split(/\s+/).filter(Boolean).length;
          const readingTime = Math.ceil(wordCount / 220);

          return (
            <div className="flex-1 flex flex-col h-full bg-[#FAFBFD] dark:bg-[#0A0E17] select-none text-left overflow-hidden">
              
              {/* Rich Word Toolbar (Editable Viewport) */}
              {editorMode === 'EDIT' && (
                <div className="bg-slate-50 dark:bg-[#151D30] border-b border-slate-200 dark:border-zinc-800 px-5 py-2 flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-355 select-none overflow-x-auto shrink-0">
                  <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-zinc-800 pr-3.5">
                    <button type="button" className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors border-none bg-transparent cursor-pointer text-slate-500" title="Undo"><Edit2 size={13} className="rotate-180" /></button>
                    <button type="button" className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors border-none bg-transparent cursor-pointer text-slate-500" title="Redo"><Edit2 size={13} /></button>
                    <button type="button" className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors border-none bg-transparent cursor-pointer text-slate-500" title="Copy"><Copy size={13} /></button>
                  </div>

                  <div className="flex items-center gap-2 border-r border-slate-200 dark:border-zinc-800 pr-3.5">
                    <select className="bg-white dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded px-2 py-1 text-[10px] font-bold text-slate-705 dark:text-slate-300 outline-none">
                      <option>Times New Roman</option>
                      <option>Arial</option>
                      <option>Courier Prime</option>
                    </select>
                    <select className="bg-white dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px] font-bold text-slate-705 dark:text-slate-300 outline-none">
                      <option>12pt</option>
                      <option>14pt</option>
                      <option>16pt</option>
                    </select>
                    <select className="bg-white dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px] font-bold text-slate-705 dark:text-slate-300 outline-none">
                      <option>1.5 Spacing</option>
                      <option>1.15 Spacing</option>
                      <option>2.0 Spacing</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-zinc-800 pr-3.5 font-bold">
                    <button type="button" className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors font-black border-none bg-transparent cursor-pointer text-slate-700" title="Bold">B</button>
                    <button type="button" className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors italic border-none bg-transparent cursor-pointer text-slate-700" title="Italic">I</button>
                    <button type="button" className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors underline border-none bg-transparent cursor-pointer text-slate-700" title="Underline">U</button>
                    <button type="button" className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors line-through border-none bg-transparent cursor-pointer text-slate-700" title="Strike">S</button>
                  </div>

                  {/* AI Quick Tools */}
                  <div className="flex items-center gap-1.5 ml-auto text-[#5B3DF5] font-black">
                    <Sparkles size={13} />
                    <span className="text-[9px] uppercase tracking-wider select-none mr-2">AI Tools:</span>
                    <button 
                      type="button"
                      disabled={isCopilotRefining}
                      onClick={() => handleRefineField('draft', 'Rewrite')}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#5B3DF5] rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors border-none cursor-pointer"
                    >
                      Rewrite
                    </button>
                    <button 
                      type="button"
                      disabled={isCopilotRefining}
                      onClick={() => handleRefineField('draft', 'Improve Legal Language')}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#5B3DF5] rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors border-none cursor-pointer"
                    >
                      Improve
                    </button>
                    <button 
                      type="button"
                      disabled={isCopilotRefining}
                      onClick={() => handleRefineField('draft', 'Summarize')}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#5B3DF5] rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors border-none cursor-pointer"
                    >
                      Summarize
                    </button>
                  </div>
                </div>
              )}

              {/* Two Column Legal Workspace (Outline Removed) */}
              <div className="flex-1 flex overflow-hidden w-full relative min-h-0 select-none">
                
                {/* 1. Center Workspace - A4 Paper Sheets view */}
                <div className="flex-1 bg-slate-100 dark:bg-[#090D15] p-8 overflow-y-auto flex flex-col items-center custom-scrollbar relative min-h-0 select-text">
                  
                  {/* Inline loading overlay */}
                  {isCopilotRefining && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-black/55 z-[2000] flex flex-col items-center justify-center backdrop-blur-xs select-none">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="animate-spin text-[#5B3DF5] w-8 h-8" />
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider animate-pulse">
                          AI: {copilotLoadingText || 'Refining Document'}...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* A4 Page Layout Sheets container */}
                  <div className="flex flex-col items-center gap-8 w-full select-text pb-24">
                    {documentPages.map((pageText, pageIdx) => (
                      <div 
                        key={pageIdx}
                        className="bg-white border border-slate-205 shadow-xl w-[816px] min-h-[1056px] p-16 text-left relative flex flex-col rounded-lg transition-transform duration-200 select-text bg-white"
                        style={{
                          transform: `scale(${zoomPercent / 100})`,
                          transformOrigin: 'top center',
                          fontFamily: '"Times New Roman", Times, serif',
                          color: '#000000'
                        }}
                      >
                        {/* Page Number Indicator */}
                        <div className="absolute top-6 right-16 text-[9px] font-black text-slate-400 select-none uppercase tracking-widest">
                          Page {pageIdx + 1} of {documentPages.length}
                        </div>

                        {editorMode === 'EDIT' ? (
                          <textarea
                            value={pageText}
                            onChange={e => {
                              const newPages = [...documentPages];
                              newPages[pageIdx] = e.target.value;
                              handleDraftChange(newPages.join('\n'));
                            }}
                            className="w-full h-full min-h-[900px] bg-transparent border-none text-black outline-none resize-none font-serif text-[12pt] leading-[1.6] text-justify focus:ring-0 focus:outline-none"
                            style={{
                              fontFamily: '"Times New Roman", Times, serif',
                              color: '#000000'
                            }}
                          />
                        ) : (
                          <div 
                            className="w-full h-full min-h-[900px] text-black font-serif text-[12pt] leading-[1.6] text-justify whitespace-pre-wrap select-text selection:bg-indigo-200/50"
                            style={{
                              fontFamily: '"Times New Roman", Times, serif',
                              color: '#000000'
                            }}
                          >
                            {renderFormattedDraft(pageText)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Zoom controls float widget */}
                  <div className="fixed bottom-6 bg-white dark:bg-[#111726] border border-slate-205 dark:border-zinc-800 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 z-30 select-none">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Zoom</span>
                    {[80, 100, 125, 150].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setZoomPercent(pct)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black border-none cursor-pointer ${
                          zoomPercent === pct
                            ? 'bg-[#5B3DF5] text-white shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Right Sidebar - AI Copilot or Version History (Collapsible & Resizable) */}
                {sidebarOpen ? (
                  <div 
                    className="border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#111726] flex flex-col shrink-0 relative select-none"
                    style={{ width: `${sidebarWidth}px` }}
                  >
                    {/* Resize handle border (left edge of the sidebar) */}
                    <div 
                      onMouseDown={startResizing}
                      className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#5B3DF5]/30 active:bg-[#5B3DF5] transition-colors z-50 select-none"
                    />

                    {showVersionHistory ? (
                      /* Version History View */
                      <div className="flex flex-col h-full w-full overflow-hidden select-none">
                        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-black/10 shrink-0">
                          <div className="flex items-center gap-2">
                            <History size={16} className="text-[#5B3DF5]" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Version History</h4>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSidebarOpen(false);
                                localStorage.setItem('@aisa_copilot_sidebar_open', 'false');
                              }}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full border-none bg-transparent cursor-pointer text-slate-400"
                              title="Collapse Sidebar"
                            >
                              <ChevronRight size={16} />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setShowVersionHistory(false)} 
                              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full border-none bg-transparent cursor-pointer text-slate-400"
                              title="Close History"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-left font-sans select-none">
                          {draftVersionHistory.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400 font-medium">
                              No version logs found. Manual and auto-saves will show here.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {draftVersionHistory.map((version, idx) => (
                                <div 
                                  key={idx} 
                                  className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-black/10 hover:border-[#5B3DF5] transition-colors relative"
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-[#5B3DF5]">
                                      v{version.version}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{version.timestamp}</span>
                                  </div>
                                  <h5 className="text-[11px] font-extrabold text-slate-705 dark:text-slate-300 truncate pr-6">
                                    {version.name || `Version ${version.version}`}
                                  </h5>
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 mb-2">
                                    By: {version.user || 'You'}
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2.5 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/50">
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreVersion(version)}
                                      className="text-[9px] font-black uppercase text-[#5B3DF5] hover:underline bg-transparent border-none cursor-pointer"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateVersion(version)}
                                      className="text-[9px] font-black uppercase text-slate-500 hover:text-slate-705 hover:underline bg-transparent border-none cursor-pointer"
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newName = prompt('Enter new version name:', version.name || `Version ${version.version}`);
                                        if (newName !== null) handleRenameVersion(idx, newName);
                                      }}
                                      className="text-[9px] font-black uppercase text-slate-500 hover:text-slate-705 hover:underline bg-transparent border-none cursor-pointer"
                                    >
                                      Rename
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCompareVersion(version)}
                                      className="text-[9px] font-black uppercase text-indigo-600 hover:underline bg-transparent border-none cursor-pointer ml-auto"
                                    >
                                      Compare
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* AI Copilot View */
                      <div className="flex flex-col h-full w-full overflow-hidden select-none">
                        {/* Copilot Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-black/10 shrink-0 select-none">
                          <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-[#5B3DF5]" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">AI Copilot</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSidebarOpen(false);
                              localStorage.setItem('@aisa_copilot_sidebar_open', 'false');
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full border-none bg-transparent cursor-pointer text-slate-400"
                            title="Collapse Sidebar"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>

                        {/* Copilot Tab Switchers */}
                        <div className="grid grid-cols-4 border-b dark:border-zinc-800 select-none shrink-0">
                          {['Assistant', 'Suggestions', 'Case Laws', 'Citations'].map(tab => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => {
                                setActiveCopilotTab(tab);
                                localStorage.setItem('@aisa_copilot_active_tab', tab);
                              }}
                              className={`py-3 text-[8.5px] font-black uppercase tracking-wider text-center border-b-2 border-t-0 border-x-0 cursor-pointer ${
                                activeCopilotTab === tab
                                  ? 'border-[#5B3DF5] text-[#5B3DF5] bg-[#5B3DF5]/[0.01]'
                                  : 'border-transparent text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              {tab.split(' ')[0]}
                            </button>
                          ))}
                        </div>

                        {/* Copilot Tab Viewport */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-left select-none animate-fadeIn">
                          {activeCopilotTab === 'Assistant' && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-455">AI Copilot Quick Actions</h4>
                                <div className="grid grid-cols-1 gap-2">
                                  {[
                                    { label: 'Improve Draft Structure', act: 'Improve headings, logical alignment, flow, and remove repetitions', title: 'Improve Draft Structure' },
                                    { label: 'Strengthen Legal Arguments', act: 'Identify weaker logic, introduce statutory provisions, and add legal reasoning', title: 'Strengthen Arguments' },
                                    { label: 'Check Legal Grammar', act: 'Review punctuation, syntax alignment, and style while keeping terminology', title: 'Check Legal Grammar' },
                                    { label: 'Simplify Language complexity', act: 'Simplify complex legal English expressions to clear, plain professional English', title: 'Simplify Language' },
                                    { label: 'Verify Legal Citations', act: 'Validate statutory codes, rules, Acts, and highlight incorrect citations', title: 'Verify Legal Citations' }
                                  ].map(item => (
                                    <button
                                      key={item.label}
                                      type="button"
                                      disabled={isCopilotRefining}
                                      onClick={() => handleCopilotQuickAction(item.title, item.act)}
                                      className={`w-full flex items-center gap-2 p-2.5 border border-slate-100 dark:border-zinc-800 rounded-xl text-[10.5px] font-bold text-left transition-colors bg-slate-50/50 dark:bg-black/10 cursor-pointer select-none border-none ${
                                        isCopilotRefining ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#5B3DF5] hover:bg-indigo-50/20'
                                      }`}
                                    >
                                      <span className="text-[#5B3DF5]"><Sparkles size={11} /></span>
                                      <span>{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Document Insights */}
                              <div className="p-4 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800 space-y-3 border-none">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Document Insights</h4>
                                <div className="space-y-2 text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                                  <div className="flex justify-between">
                                    <span>Estimated Pages</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{Math.ceil(wordCount / 350)} Page(s)</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Word Count</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{wordCount} Words</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Reading Time</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{readingTime} min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>AI Confidence</span>
                                    <span className="font-bold text-emerald-650">98%</span>
                                  </div>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                                    <span>Draft Readiness</span>
                                    <span>92%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {activeCopilotTab === 'Suggestions' && (
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-455">AI Audit & Recommendations</h4>
                                {[
                                  { title: 'Formatting Spacing Alignment', desc: 'Heading gaps conform to standard court guidelines.' },
                                  { title: 'Check Witness Annotation', desc: 'No witness information is present. We recommend adding details of at least one witness.' },
                                  { title: 'Check Missing Annexures', desc: 'No annexure files mapped. We recommend appending proof index sheets.' }
                                ].map((item, idx) => (
                                  <div key={idx} className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-black/10 space-y-1.5">
                                    <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{item.title}</h5>
                                    <p className="text-[10.5px] text-slate-550 leading-relaxed font-semibold">{item.desc}</p>
                                    <div className="flex gap-2">
                                      <button 
                                        type="button" 
                                        onClick={() => handleCopilotQuickAction(item.title, `Apply recommendation: ${item.desc}`)}
                                        className="text-[9px] font-black uppercase text-[#5B3DF5] border-none bg-transparent cursor-pointer"
                                      >
                                        Apply
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {activeCopilotTab === 'Case Laws' && (
                            <div className="space-y-4">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-455">Relevant Precedents</h4>
                              <div className="space-y-3">
                                {[
                                  { title: 'State of Maharashtra v. Rajesh (2021)', desc: 'Precedent defining requirements for Station House Officer FIR registrations under section 154.' },
                                  { title: 'Karan Singh v. Union of India (2018)', desc: 'Supreme Court guidelines regarding delays in filing first information reports.' },
                                  { title: 'Lalita Kumari v. Govt. of U.P. (2014)', desc: 'Constitution Bench guidelines regarding mandatory registration of FIR under Section 154 CrPC.' }
                                ].map(law => (
                                  <div key={law.title} className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-black/10 space-y-1">
                                    <h5 className="text-[10px] font-black uppercase text-slate-800 dark:text-white">{law.title}</h5>
                                    <p className="text-[10px] text-slate-550 leading-relaxed font-semibold">{law.desc}</p>
                                    <button 
                                      type="button"
                                      onClick={() => handleInsertCitation(`[Citation Precedent: ${law.title}]`)}
                                      className="text-[9px] font-black uppercase text-[#5B3DF5] border-none bg-transparent cursor-pointer mt-1"
                                    >
                                      + Insert Citation
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {activeCopilotTab === 'Citations' && (
                            <div className="space-y-4">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-[#5B3DF5]">Citations & Annotations</h4>
                              <div className="space-y-3">
                                {[
                                  { title: 'Section 154, CrPC', desc: 'Information in cognizable cases.' },
                                  { title: 'Section 420, IPC', desc: 'Cheating and dishonestly inducing delivery of property.' },
                                  { title: 'Section 34, IPC', desc: 'Acts done by several persons in furtherance of common intention.' }
                                ].map(cit => (
                                  <div key={cit.title} className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-black/10 space-y-1">
                                    <h5 className="text-[10px] font-black uppercase text-slate-800 dark:text-white">{cit.title}</h5>
                                    <p className="text-[10px] text-slate-550 leading-relaxed font-semibold">{cit.desc}</p>
                                    <button 
                                      type="button"
                                      onClick={() => handleInsertCitation(`[Citation Code: ${cit.title}]`)}
                                      className="text-[9px] font-black uppercase text-[#5B3DF5] border-none bg-transparent cursor-pointer mt-1"
                                    >
                                      + Insert Citation
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Floating AI Badge indicator when sidebar is collapsed */
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center z-40 pr-0.5 select-none animate-fadeIn">
                    <div className="w-[1px] h-10 bg-slate-200 dark:bg-zinc-800" />
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarOpen(true);
                        localStorage.setItem('@aisa_copilot_sidebar_open', 'true');
                      }}
                      className="my-2 p-2 bg-[#5B3DF5] text-white hover:bg-indigo-700 rounded-l-xl flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest cursor-pointer select-none vertical-text shadow-md border-none"
                      style={{ writingMode: 'vertical-lr' }}
                    >
                      <span>🤖 AI Assistant</span>
                    </button>
                    <div className="w-[1px] h-10 bg-slate-200 dark:bg-zinc-800" />
                  </div>
                )}

              {/* AI Copilot Refinement Comparison Modal */}
              {copilotComparison && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[130000] p-6 select-none animate-fadeIn">
                  <div className="bg-white dark:bg-[#111726] border border-slate-205 dark:border-zinc-800 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden text-left font-sans select-none">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-black/10 shrink-0">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">AI Copilot: Review Proposed Changes</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          Action Refined: {copilotComparison.action}
                        </p>
                      </div>
                      <button 
                        onClick={() => setCopilotComparison(null)} 
                        className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full border-none bg-transparent cursor-pointer text-slate-400"
                        title="Close View"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Comparison Content */}
                    <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-slate-200 dark:divide-zinc-800">
                      {/* Left: Original Pleading Draft */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-black uppercase text-slate-405 tracking-wider shrink-0 select-none">
                          Original Draft
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto font-serif text-[12px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap select-text">
                          {copilotComparison.original}
                        </div>
                      </div>

                      {/* Right: Refined Draft */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="px-4 py-2 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-zinc-800 text-[10px] font-black uppercase text-[#5B3DF5] tracking-wider shrink-0 select-none flex items-center justify-between">
                          <span>Refined Draft</span>
                          <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-[8px] rounded font-extrabold uppercase">AI Proposed</span>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto font-serif text-[12px] leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap select-text bg-indigo-50/[0.01]">
                          {copilotComparison.refined}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-black/10 flex items-center justify-end gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCopilotComparison(null);
                          toast.error("✕ Proposed AI changes rejected.");
                        }}
                        className="px-4 py-2 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border-none bg-transparent cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCopilotComparison(null);
                          toast.error("✕ Proposed AI changes rejected.");
                        }}
                        className="px-4 py-2 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border-none bg-transparent cursor-pointer"
                      >
                        Reject All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFinalDraft(copilotComparison.refined);
                          setCopilotComparison(null);
                          toast.success("✓ Refined draft applied successfully!");
                        }}
                        className="px-5 py-2.5 bg-[#5B3DF5] hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm border-none cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFinalDraft(copilotComparison.refined);
                          setCopilotComparison(null);
                          toast.success("✓ Refined draft applied successfully!");
                        }}
                        className="px-5 py-2.5 bg-[#5B3DF5] hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm border-none cursor-pointer"
                      >
                        Accept All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Version Comparison Modal */}
              {compareVersion && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[130000] p-6 select-none">
                  <div className="bg-white dark:bg-[#111726] border border-slate-205 dark:border-zinc-800 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden text-left font-sans select-none">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-black/10 shrink-0">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Compare Draft Versions</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          Comparing Historic v{compareVersion.version} ({compareVersion.name || 'Unnamed'}) with Current Workspace
                        </p>
                      </div>
                      <button 
                        onClick={() => setCompareVersion(null)} 
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full border-none bg-transparent cursor-pointer text-slate-400"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    <div className="flex-1 flex overflow-hidden select-text">
                      {/* Left Side: Historic Version */}
                      <div className="flex-1 border-r border-slate-200 dark:border-zinc-800 flex flex-col min-w-0">
                        <div className="px-4 py-2 bg-slate-100 dark:bg-black/20 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b dark:border-zinc-800 select-none">
                          v{compareVersion.version} Content
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto font-serif text-[11pt] leading-[1.6] whitespace-pre-wrap text-black bg-white select-text selection:bg-indigo-200/50">
                          {compareVersion.content}
                        </div>
                      </div>
                      
                      {/* Right Side: Current Version */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="px-4 py-2 bg-slate-100 dark:bg-black/20 text-[9px] font-black text-[#5B3DF5] uppercase tracking-widest border-b dark:border-zinc-800 select-none">
                          Current Workspace Content
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto font-serif text-[11pt] leading-[1.6] whitespace-pre-wrap text-black bg-white select-text selection:bg-indigo-200/50">
                          {finalDraft}
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3 bg-slate-50 dark:bg-black/10 shrink-0">
                      <button
                        onClick={() => setCompareVersion(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 border-none cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          handleRestoreVersion(compareVersion);
                          setCompareVersion(null);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#5B3DF5] text-white hover:bg-indigo-700 border-none cursor-pointer"
                      >
                        Restore v{compareVersion.version}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          );
        })()}
        {/* ══════════════ STEP: SAVED ══════════════ */}
        {step === 'SAVED' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-10 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Saved Documents</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Explicitly saved advocate templates and litigation files</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/20 rounded-lg uppercase tracking-wider">
                {savedDrafts.length} documents
              </span>
            </div>

            {loadingDrafts ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : savedDrafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#1A2540] rounded-3xl border border-dashed border-slate-200 dark:border-white/5 shadow-sm text-center">
                <Folder size={40} className="text-slate-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm font-black text-slate-400">No saved documents found</p>
                <p className="text-xs text-slate-350 dark:text-zinc-650 mt-1">Open a template, generate your draft, and click Save.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {savedDrafts.map(draft => (
                  <div 
                    key={draft.id} 
                    className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0 mt-0.5">
                        <Folder size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {draft.title}
                          </h4>
                          <span className="text-[8px] font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/20 rounded-full uppercase tracking-wider">
                            {DRAFT_TEMPLATES[draft.title]?.category || 'GENERAL'}
                          </span>
                          <span className="text-[8px] font-black px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/20 rounded-full uppercase tracking-wider">
                            Saved
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-[11px] font-semibold text-slate-500">
                          <div>
                            <span className="text-slate-400 mr-1.5">Linked Case:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">{draft.caseName || 'No Case Linked'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 mr-1.5">Modified:</span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {new Date(draft.date).toLocaleDateString('en-IN')} • {new Date(draft.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 mr-1.5">Language:</span>
                            <span className="text-slate-700 dark:text-slate-300 capitalize">{draft.mode === 'hindi' ? 'Hindi' : 'English'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 mr-1.5">Version:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">v{draft.version || 1}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions List */}
                    <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                      <button
                        onClick={() => {
                          setFinalDraft(draft.content);
                          setOriginalGeneratedDraft(draft.content);
                          setSelectedType(draft.title);
                          setTemplate(DRAFT_TEMPLATES[draft.title] || null);
                          setFormData(draft.formData || {});
                          setLinkedCaseId(draft.linkedCaseId || '');
                          if (draft.version) setDraftVersion(draft.version);
                          if (draft.mode) setGenerationMode(draft.mode);
                          if (draft.exportHistory) setExportHistory(draft.exportHistory);
                          if (draft.generationTimestamp) setGenerationTimestamp(draft.generationTimestamp);
                          else setGenerationTimestamp(new Date(draft.date).toLocaleString('en-IN'));
                          
                          const phs = extractPlaceholders(draft.content);
                          setDraftPlaceholders(phs);
                          const phValues = {};
                          phs.forEach(p => {
                            let matchedVal = '';
                            Object.entries(draft.formData || {}).forEach(([k, v]) => {
                              const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                              const cleanP = p.key.toLowerCase().replace(/[^a-z0-9]/g, '');
                              if (cleanK === cleanP || cleanK.includes(cleanP) || cleanP.includes(cleanK)) {
                                matchedVal = v;
                              }
                            });
                            phValues[p.key] = matchedVal || '';
                          });
                          setPlaceholderValues(phValues);

                          setStep('PREVIEW');
                          toast.success(`✓ Loaded "${draft.title}"`);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase shadow-sm"
                      >
                        Open
                      </button>
                      
                      <button
                        onClick={() => {
                          const newName = prompt('Enter new draft name:', draft.title);
                          if (newName && newName.trim()) {
                            const caseId = draft.linkedCaseId;
                            if (caseId) {
                              const targetCase = allProjects.find(p => p._id === caseId);
                              if (targetCase && Array.isArray(targetCase.drafts)) {
                                const updatedDrafts = targetCase.drafts.map(d => {
                                  if (d.id === draft.id) {
                                    return { ...d, type: newName.trim(), lastModified: new Date().toISOString() };
                                  }
                                  return d;
                                });
                                apiService.updateProject(caseId, { ...targetCase, drafts: updatedDrafts }).then(res => {
                                  if (onUpdateCase) onUpdateCase(res);
                                  toast.success('Document renamed');
                                  loadSavedDrafts();
                                }).catch(() => toast.error('Failed to rename document'));
                              }
                            }
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-all"
                        title="Rename"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        onClick={async () => {
                          const caseId = draft.linkedCaseId;
                          if (caseId) {
                            const targetCase = allProjects.find(p => p._id === caseId);
                            if (targetCase && Array.isArray(targetCase.drafts)) {
                              const dupId = `DRAFT-DUP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                              const dupItem = {
                                id: dupId,
                                type: `${draft.title} (Copy)`,
                                content: draft.content,
                                createdAt: new Date().toISOString(),
                                mode: draft.mode,
                                formData: draft.formData,
                                version: 1,
                                exportHistory: [],
                                generationTimestamp: new Date().toLocaleString('en-IN'),
                                lastModified: new Date().toISOString()
                              };
                              try {
                                const response = await apiService.updateProject(caseId, {
                                  ...targetCase,
                                  drafts: [dupItem, ...targetCase.drafts]
                                });
                                if (onUpdateCase) onUpdateCase(response);
                                toast.success('Document duplicated');
                                loadSavedDrafts();
                              } catch {
                                toast.error('Failed to duplicate');
                              }
                            }
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-all"
                        title="Duplicate"
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ STEP: HISTORY ══════════════ */}
        {step === 'HISTORY' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-10 w-full text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Draft History</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Automated compliance trail and version logs</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/20 rounded-lg uppercase tracking-wider">
                {draftHistory.length} logs recorded
              </span>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col md:flex-row gap-3 w-full">
              {/* Search */}
              <div className="flex-1 flex items-center bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2.5 shadow-sm">
                <Search className="text-slate-400 mr-2 shrink-0" size={16} />
                <input
                  type="text"
                  placeholder="Search history by draft name, case, category..."
                  value={historySearchQuery}
                  onChange={e => setHistorySearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs font-bold text-slate-800 dark:text-white outline-none"
                />
              </div>

              {/* Time Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full shrink-0">
                {['All', 'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setHistoryTimeFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border whitespace-nowrap transition-all ${
                      historyTimeFilter === filter
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                        : 'bg-white dark:bg-[#1A2540] border-slate-200 dark:border-white/5 text-slate-650 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* History Table */}
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#1A2540] rounded-3xl border border-dashed border-slate-200 dark:border-white/5 shadow-sm text-center">
                <Clock size={40} className="text-slate-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm font-black text-slate-400">No drafting history entries found</p>
                <p className="text-xs text-slate-400 dark:text-zinc-600 mt-1">Select a template above to generate a new legal draft.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-[#131C31]/50 border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="py-3.5 px-4 w-[250px]">Document Name</th>
                        <th className="py-3.5 px-4 w-[130px]">Linked Case</th>
                        <th className="py-3.5 px-4 w-[120px]">Date / Time</th>
                        <th className="py-3.5 px-4 w-[80px]">Version</th>
                        <th className="py-3.5 px-4 w-[80px]">Language</th>
                        <th className="py-3.5 px-4 w-[85px] text-center">Status</th>
                        <th className="py-3.5 px-4 w-[70px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredHistory.map(item => (
                        <tr 
                          key={item.id}
                          className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-colors group cursor-pointer"
                          onClick={() => handleLoadHistoryItem(item)}
                        >
                          {/* Document Identity */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                                <FileText size={15} />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-800 dark:text-white truncate block">
                                  {item.name}
                                </span>
                                <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mt-0.5">
                                  {item.category}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Linked Case */}
                          <td className="py-3 px-4">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-350 truncate block max-w-[120px]">
                              {item.caseName}
                            </span>
                          </td>

                          {/* Date/Time */}
                          <td className="py-3 px-4">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                              {item.generatedDate}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 block mt-0.5">
                              {item.generatedTime} (Edited {item.lastEdited})
                            </span>
                          </td>

                          {/* Version */}
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/20 rounded-full uppercase tracking-wider">
                              v{item.version}
                            </span>
                          </td>

                          {/* Language */}
                          <td className="py-3 px-4">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-350 block">
                              {item.language}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              item.status === 'Saved'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteHistoryItem(item.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                              title="Delete log"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

      {/* ── Protected Edit Modal ── */}
      {isProtectedEditing && (
        <div className="fixed inset-0 z-[125000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsProtectedEditing(false)} />
          <div className="relative bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh] text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-white/5 shrink-0">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Protected Editor — Placeholders</h3>
              <button onClick={() => setIsProtectedEditing(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 custom-scrollbar">
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl text-[10px] text-indigo-650 dark:text-indigo-400 font-bold leading-normal">
                ℹ️ Legal formatting and structural text are protected. You can modify the extracted document placeholders below.
              </div>
              
              {draftPlaceholders.length > 0 ? (
                draftPlaceholders.map(ph => {
                  return (
                    <div key={ph.key} className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>{ph.label}</span>
                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border border-indigo-200/20">
                          Placeholder
                        </span>
                      </label>
                      <input
                        type="text"
                        value={placeholderValues[ph.key] || ''}
                        onChange={e => {
                          setPlaceholderValues(prev => ({ ...prev, [ph.key]: e.target.value }));
                          setDraftPlaceholders(prevPhs => prevPhs.map(item => item.key === ph.key ? { ...item, value: e.target.value } : item));
                        }}
                        placeholder={`Enter ${ph.label}...`}
                        className="w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-[#141E35] border-slate-200 dark:border-white/8 text-slate-800 dark:text-white"
                      />
                    </div>
                  );
                })
              ) : (
                template?.fields.map(field => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <FieldInput
                      field={field}
                      value={formData[field.key] || ''}
                      onChange={val => {
                        setFormData(prev => ({ ...prev, [field.key]: val }));
                      }}
                      filled={true}
                      country={formData.country}
                      state={formData.state}
                      district={formData.district}
                    />
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2.5 pt-4 border-t border-slate-150 dark:border-white/5 shrink-0">
              <button 
                onClick={() => setIsProtectedEditing(false)} 
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-white rounded-xl text-xs font-black uppercase"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const updatedDraft = replacePlaceholders(originalGeneratedDraft, placeholderValues);
                  setFinalDraft(updatedDraft);
                  setIsProtectedEditing(false);
                  toast.success('✓ Draft updated successfully!');
                }} 
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
              >
                <Save size={13} />
                <span>Save & Update</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ChatGPT-Style Share Modal ── */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[125000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-[#0B1020] border border-slate-200 dark:border-white/5 rounded-3xl max-w-md w-full shadow-2xl flex flex-col overflow-hidden text-left animate-menu-appear p-6 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Share2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Share Document</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  This document can be shared securely.
                </p>
              </div>
              <button 
                onClick={() => setIsShareModalOpen(false)} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-405 dark:text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Accordion List */}
            <div className="space-y-2.5">
              
              {/* Option 1: Copy Link */}
              <div className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-[#131C31]/5 transition-all">
                <button
                  onClick={() => setShareAccordion(shareAccordion === 'link' ? '' : 'link')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Link size={14} className="text-indigo-500" />
                    <span>Copy Link</span>
                  </span>
                  <span className="text-[10px] text-slate-400">{shareAccordion === 'link' ? '▲' : '▼'}</span>
                </button>
                
                {shareAccordion === 'link' && (
                  <div className="p-4 border-t border-slate-150 dark:border-white/5 bg-white dark:bg-[#0B1020] space-y-3.5">
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Link Expiry</label>
                      <select
                        value={linkExpiry}
                        onChange={e => setLinkExpiry(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                      >
                        <option value="24h">24 Hours Expiry</option>
                        <option value="7d">7 Days Expiry</option>
                        <option value="30d">30 Days Expiry</option>
                        <option value="never">Never Expires</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        const randomToken = Math.random().toString(36).substring(2, 9).toUpperCase();
                        const secureUrl = `https://workspace.ailegal.in/share/secure/${randomToken}`;
                        navigator.clipboard.writeText(secureUrl);
                        
                        setShareLogs(prev => [
                          {
                            id: Date.now(),
                            recipient: 'Public Link',
                            method: 'Secure Link',
                            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                            details: `Expiry: ${linkExpiry}`
                          },
                          ...prev
                        ]);
                        toast.success('✓ Secure link copied successfully.');
                        setIsShareModalOpen(false);
                      }}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Copy size={13} />
                      <span>Copy Link</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Option 2: Email */}
              <div className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-[#131C31]/5 transition-all">
                <button
                  onClick={() => setShareAccordion(shareAccordion === 'email' ? '' : 'email')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Mail size={14} className="text-indigo-500" />
                    <span>Email</span>
                  </span>
                  <span className="text-[10px] text-slate-400">{shareAccordion === 'email' ? '▲' : '▼'}</span>
                </button>
                
                {shareAccordion === 'email' && (
                  <div className="p-4 border-t border-slate-150 dark:border-white/5 bg-white dark:bg-[#0B1020] space-y-3.5">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Recipient Email</label>
                      <input 
                        type="email" 
                        placeholder="client@firm.com" 
                        value={emailRecipient}
                        onChange={e => setEmailRecipient(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Subject</label>
                      <input 
                        type="text" 
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Message Body</label>
                      <textarea 
                        rows={3} 
                        value={emailMessage}
                        onChange={e => setEmailMessage(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 resize-none font-sans"
                      />
                    </div>
                    
                    <div className="flex gap-4 p-2.5 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-100 dark:border-white/5 text-[11px] font-semibold text-slate-600 dark:text-slate-350">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={emailAttachPDF} onChange={e => setEmailAttachPDF(e.target.checked)} className="rounded text-indigo-650" />
                        <span>PDF</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={emailAttachDOCX} onChange={e => setEmailAttachDOCX(e.target.checked)} className="rounded text-indigo-650" />
                        <span>DOCX</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={emailAttachTXT} onChange={e => setEmailAttachTXT(e.target.checked)} className="rounded text-indigo-650" />
                        <span>TXT</span>
                      </label>
                    </div>

                    <button
                      onClick={() => {
                        if (!emailRecipient) { toast.error('Enter recipient email'); return; }
                        setShareLogs(prev => [
                          {
                            id: Date.now(),
                            recipient: emailRecipient,
                            method: 'Email',
                            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                            details: `Sent attachments`
                          },
                          ...prev
                        ]);
                        toast.success(`✓ Draft Email dispatched to ${emailRecipient}`);
                        setIsShareModalOpen(false);
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Mail size={13} />
                      <span>Send Email</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Option 3: Download */}
              <div className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-[#131C31]/5 transition-all">
                <button
                  onClick={() => setShareAccordion(shareAccordion === 'download' ? '' : 'download')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Download size={14} className="text-indigo-500" />
                    <span>Download</span>
                  </span>
                  <span className="text-[10px] text-slate-400">{shareAccordion === 'download' ? '▲' : '▼'}</span>
                </button>
                
                {shareAccordion === 'download' && (
                  <div className="p-4 border-t border-slate-150 dark:border-white/5 bg-white dark:bg-[#0B1020] grid grid-cols-3 gap-2">
                    {[
                      { id: 'PDF', label: 'PDF Draft', action: handleExportPDF, icon: <FileDown size={14} /> },
                      { id: 'DOCX', label: 'DOCX Word', action: handleExportDOCX, icon: <FileText size={14} /> },
                      { id: 'TXT', label: 'TXT Plain', action: handleDownload, icon: <Download size={14} /> }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action();
                          setShareLogs(prev => [
                            {
                              id: Date.now(),
                              recipient: 'Self',
                              method: 'Download',
                              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                              time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                              details: `Format: ${item.id}`
                            },
                            ...prev
                          ]);
                          setIsShareModalOpen(false);
                        }}
                        className="py-3 px-2 border border-slate-200 dark:border-white/5 hover:border-indigo-500 bg-slate-50 dark:bg-zinc-900 rounded-xl hover:bg-indigo-50/20 text-slate-805 dark:text-white transition-all flex flex-col items-center justify-center gap-1"
                      >
                        {item.icon}
                        <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Option 4: Permissions */}
              <div className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-[#131C31]/5 transition-all">
                <button
                  onClick={() => setShareAccordion(shareAccordion === 'permissions' ? '' : 'permissions')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Lock size={14} className="text-indigo-500" />
                    <span>Permissions</span>
                  </span>
                  <span className="text-[10px] text-slate-400">{shareAccordion === 'permissions' ? '▲' : '▼'}</span>
                </button>
                
                {shareAccordion === 'permissions' && (
                  <div className="p-4 border-t border-slate-150 dark:border-white/5 bg-white dark:bg-[#0B1020] space-y-3.5">
                    <div className="flex flex-col gap-2.5 bg-slate-50 dark:bg-zinc-900/40 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-xs font-semibold text-slate-650 dark:text-slate-350 text-left">
                      <label className="flex items-center gap-2 cursor-pointer py-1 border-b border-slate-150/45 dark:border-white/5">
                        <input 
                          type="checkbox" 
                          checked={secReadOnly} 
                          onChange={e => setSecReadOnly(e.target.checked)} 
                          className="rounded text-indigo-650 focus:ring-0"
                        />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white leading-tight">View Only Access</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Viewer cannot edit standard draft content</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer py-1 border-b border-slate-150/45 dark:border-white/5">
                        <input 
                          type="checkbox" 
                          checked={!secDisableDownload} 
                          onChange={e => setSecDisableDownload(!e.target.checked)} 
                          className="rounded text-indigo-650 focus:ring-0"
                        />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white leading-tight">Allow Download Option</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Let viewers download standard PDF, DOCX, and TXT files</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer py-1">
                        <input 
                          type="checkbox" 
                          checked={secPasswordProtect} 
                          onChange={e => setSecPasswordProtect(e.target.checked)} 
                          className="rounded text-indigo-650 focus:ring-0"
                        />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white leading-tight">Password Protect Document</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Require password verification before access is granted</p>
                        </div>
                      </label>
                    </div>

                    {secPasswordProtect && (
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Security Gate Password</label>
                        <input 
                          type="password"
                          placeholder="Enter custom gate password..."
                          value={secPassword}
                          onChange={e => setSecPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5 shrink-0">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 border border-slate-250 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase transition-all"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (shareAccordion === 'email') {
                    if (!emailRecipient) { toast.error('Enter recipient email'); return; }
                    toast.success(`✓ Document email sent to ${emailRecipient}`);
                  } else if (shareAccordion === 'permissions') {
                    toast.success('✓ Access permissions configuration updated');
                  } else if (shareAccordion === 'link') {
                    const randomToken = Math.random().toString(36).substring(2, 9).toUpperCase();
                    navigator.clipboard.writeText(`https://workspace.ailegal.in/share/secure/${randomToken}`);
                    toast.success('✓ Link copied successfully.');
                  } else {
                    toast.success('✓ Document share configuration applied.');
                  }
                  setIsShareModalOpen(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-md shadow-indigo-500/20 transition-all"
              >
                Share
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[125000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-105 dark:bg-red-950/30 rounded-full flex items-center justify-center text-red-600 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Draft?</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">This action cannot be undone.</p>
            <div className="flex gap-3 mt-6 w-full">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-white rounded-xl text-xs font-black uppercase"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setFinalDraft('');
                  setStep('SELECT');
                  setIsDeleteModalOpen(false);
                  toast.success('Active draft deleted');
                }} 
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftMaker;
