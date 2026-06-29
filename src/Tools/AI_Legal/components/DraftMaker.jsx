import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronLeft, FileText, Download, Copy, Share2, Edit3, CheckCircle2,
  Search, Gavel, Shield, Landmark, Users, Briefcase, Home, X, ChevronRight,
  Printer, Save, FileDown, Plus, Layout, Scale, ShieldAlert, CreditCard,
  Laptop, FileCheck, Globe, Lock, Heart, Award, Calendar, Clock, Folder,
  Check, Zap, Languages, BookOpen, AlertCircle, RefreshCw, History,
  ChevronDown, ChevronUp, Info, Sparkles, Trash2, Edit2, Mail, Link,
  QrCode, Eye, Settings
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

  useEffect(() => {
    localStorage.setItem('@aisa_draft_history', JSON.stringify(draftHistory));
  }, [draftHistory]);

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

    const courtHeader = tmpl.courtHeader || 'BEFORE THE HON\'BLE COURT';
    
    // Choose instructions based on mode
    let modeLangInstruction = '';
    if (mode === 'hindi') {
      modeLangInstruction = `Generate the complete draft entirely in formal, professional legal Hindi (Devanagari script) using proper court vocabulary (e.g. याचिकाकर्ता, प्रत्यर्थी, प्रार्थना, सत्यापन, अधिवक्ता). Ensure a natural translation and courtroom layout.`;
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
- Return ONLY the document body. Do NOT output JSON, markdown fences (e.g. triple-backticks), or html code blocks.
- Do NOT output any introductory text, greetings, notes, case summaries, explanations, or commentaries.
- Never wrap the document in quotes. The first character of the response must be the first line of the legal document (e.g. "${courtHeader}" or "LEGAL NOTICE" or "REGISTERED A.D.").
- Never return escaped characters like \\n. Return actual physical line breaks.
- **Heading Format**: Use consistent uppercase headings (e.g. "IN THE HON'BLE COURT OF {{court_name}}", "SUIT NO. {{suit_no}} OF {{suit_year}}", "IN THE MATTER OF", "PLAINTIFF", "VERSUS", "DEFENDANT", "PRAYER", "VERIFICATION", "ANNEXURE", "SCHEDULE A").
- **Spacing Constraints**: Max 1 blank line between paragraphs and 2 blank lines before headings. NEVER output multiple consecutive empty lines or manual page breaks.
- **Party Details Block**: Format parties exactly like a real pleading, with right-aligned markers:
  {{plaintiff_name}}
  S/o {{plaintiff_father}}
  R/o {{plaintiff_address}}
                                      ...Plaintiff
  VERSUS
  {{defendant_name}}
  S/o {{defendant_father}}
  R/o {{defendant_address}}
                                      ...Defendant
- **Paragraphs**: Number each paragraph sequentially starting with "1.", "2.", "3.". Never wrap single sentences onto new lines.
- **Prayer**: List relief points using alphabetic bullets: a), b), c), d).
- **Verification**: Render the verification block immediately following the Prayer, with no manual line padding.
- **Schedules**: Generate "SCHEDULE A" with a property description only if relevant. Write "END OF DOCUMENT" after the final content.
- **Placeholders**: Every single variable must be represented as a token in double curly braces: {{placeholder_key}} (e.g. {{client_name}}, {{father_name}}, {{receiver_address}}). NEVER output empty lines, brackets, or underlines ("__________").

Generate the document now:`;
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

      // Save to version history
      setDraftVersionHistory(prev => [
        ...prev,
        { version: draftVersion, mode, content: finalDraft, timestamp: new Date().toLocaleTimeString() }
      ].filter(v => v.content));

      let cleanedText = text.trim();
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

  // ── Export: Print ──
  const handlePrint = () => {
    const rawText = draftDisplayText || finalDraft;
    const textToPrint = cleanGeneratedDraft(rawText, selectedType);
    
    // Convert headers & bold Markdown tags into clean HTML
    const content = textToPrint
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman&family=Noto+Sans:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet"/>
      <title>${selectedType || 'Legal Draft'}</title>
      <style>
        body{font-family:'Times New Roman',serif,sans-serif;padding:50px;line-height:1.9;font-size:12pt;color:#000;max-width:800px;margin:0 auto;white-space:pre-wrap;text-align:justify}
        h1{text-align:center;text-transform:uppercase;font-size:15pt;font-weight:bold;margin:20px 0;letter-spacing:1px}
        h2{font-size:13pt;font-weight:bold;margin:18px 0 10px;text-transform:uppercase}
        h3{font-size:12pt;font-weight:bold;margin:14px 0 8px}
        strong{font-weight:bold}
        .footer{margin-top:50px;border-top:1px solid #ddd;padding-top:15px;font-size:10pt;text-align:right;color:#666}
        @media print{body{padding:20px}.footer{position:fixed;bottom:20px;right:20px;width:100%}}
      </style></head><body>
      ${content}
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
    
    // Split and map into actual MS Word paragraph blocks
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

  // ── Export: Download TXT/MD ──
  const handleDownload = () => {
    const rawText = draftDisplayText || finalDraft;
    const textToDownload = cleanGeneratedDraft(rawText, selectedType)
      .replace(/^[#\s]+/gm, '') // Remove markdown heading markers
      .replace(/\*\*+/g, '')    // Remove bold bold markers
      .replace(/\*+/g, '')      // Remove italics markers
      .replace(/`+/g, '');      // Remove backticks
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedType || 'Legal_Draft').replace(/[^a-z0-9]/gi, '_')}_v${draftVersion}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToExportHistory('Download TXT');
    toast.success('Draft downloaded');
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
      const updatedDrafts = [newDraftItem, ...existingDrafts];
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

      toast.success('Draft saved to case!');
    } catch (e) {
      console.error("Failed to save draft", e);
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
            <div className="flex flex-col text-left">
              {/* Line 1: Tool Identifier */}
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-1">
                Draft Maker
              </span>
              
              {/* Line 2: Selected Draft Template */}
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight tracking-tight uppercase">
                {step === 'SELECT' ? 'Legal Templates' : selectedType || 'Legal Draft'}
              </h2>
              
              {/* Line 3: Context and AI Active status */}
              <div className="flex items-center gap-2 mt-1 select-none">
                <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-indigo-950/40 text-slate-500 dark:text-indigo-400 border border-slate-200/20 rounded-md uppercase tracking-wider">
                  {(() => {
                    if (step === 'SELECT') return 'AI Drafting Workspace';
                    if (isEditing) return 'Editing Draft';
                    if (isProtectedEditing) return 'Editing Draft';
                    if (generationMode === 'court_ready') return 'Court Ready Draft';
                    if (outputLang === 'hi' || generationMode === 'hindi') return 'Hindi Draft';
                    if (outputLang === 'en' || generationMode === 'english') return 'English Draft';
                    if (generationMode === 'bilingual') return 'Bilingual Draft';
                    if (step === 'PREVIEW') return 'Preview Mode';
                    return 'AI Drafting Workspace';
                  })()}
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

        <div className="flex items-center gap-3 relative">
          {step === 'PREVIEW' ? (
            <>
              {/* 1. Language Toggle */}
              <LanguageToggle lang={outputLang} onChange={handleDraftLangChange} isTranslating={isDraftTranslating} />

              {/* 3. Save Button */}
              <button 
                onClick={handleSave} 
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-sm active:scale-95"
              >
                <Save size={13} />
                <span>Save</span>
              </button>

              {/* 4. Copy Icon */}
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 flex items-center justify-center min-w-[32px] h-[32px]"
                title="Copy Draft"
              >
                <Copy size={14} />
              </button>

              {/* 5. Share Icon */}
              <button
                onClick={handleShare}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 flex items-center justify-center min-w-[32px] h-[32px]"
                title="Share Draft"
              >
                <Share2 size={14} />
              </button>

              {/* 6. Download ▼ Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                  className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all gap-1"
                >
                  <Download size={13} />
                  <span>Download</span>
                  <span className="text-[8px]">▼</span>
                </button>

                {isDownloadOpen && (
                  <>
                    <div className="fixed inset-0 z-[119999]" onClick={() => setIsDownloadOpen(false)} />
                    <div className="absolute right-0 mt-2 w-[160px] bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/10 shadow-2xl rounded-xl p-1.5 z-[120000] text-left">
                      <button
                        onClick={() => {
                          handleExportPDF();
                          setIsDownloadOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-705 rounded-lg flex items-center gap-2"
                      >
                        <FileDown size={13} />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => {
                          handleExportDOCX();
                          setIsDownloadOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-705 rounded-lg flex items-center gap-2"
                      >
                        <FileCheck size={13} />
                        <span>DOCX</span>
                      </button>
                      <button
                        onClick={() => {
                          handleDownload();
                          setIsDownloadOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-705 rounded-lg flex items-center gap-2"
                      >
                        <FileText size={13} />
                        <span>TXT</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 7. More (⋮) Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center min-w-[32px] h-[32px]"
                  title="More actions"
                >
                  <span className="text-base font-black leading-none block pb-0.5">⋮</span>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <>
                    <style>{`
                      .custom-menu-scrollbar::-webkit-scrollbar {
                        width: 6px;
                      }
                      .custom-menu-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                      }
                      .custom-menu-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(99, 102, 241, 0.25);
                        border-radius: 9999px;
                      }
                      .custom-menu-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(99, 102, 241, 0.55);
                      }
                      @keyframes menu-appear {
                        from { opacity: 0; transform: scale(0.95) translateY(-5px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                      }
                      @keyframes bottom-sheet-slide-up {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                      }
                      .animate-menu-appear {
                        animation: menu-appear 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                      }
                      .animate-bottom-sheet {
                        animation: bottom-sheet-slide-up 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                      }
                    `}</style>
                    <div className="fixed inset-0 z-[119999] bg-black/35 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none transition-opacity duration-150" onClick={() => setIsMenuOpen(false)} />
                    <div className="fixed bottom-0 left-0 right-0 w-full max-h-[420px] rounded-t-3xl border border-slate-200 dark:border-white/10 shadow-2xl bg-white dark:bg-[#1A2540] p-3.5 z-[120000] text-slate-800 dark:text-white text-left divide-y divide-slate-100 dark:divide-white/5 space-y-2 overflow-y-auto overflow-x-hidden custom-menu-scrollbar transform-gpu animate-bottom-sheet sm:animate-menu-appear sm:absolute sm:top-[calc(100%+8px)] sm:right-0 sm:bottom-auto sm:left-auto sm:w-[290px] sm:rounded-2xl sm:origin-top-right">
                      
                      {/* Category: Editing */}
                      <div className="pb-2 space-y-1">
                        <div className="px-3 text-[9px] font-black tracking-widest text-slate-400 uppercase">Editing</div>
                        <button onClick={() => { setIsProtectedEditing(true); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-[#F5F7FF] dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 text-xs font-semibold text-slate-705 dark:text-slate-350 group">
                          <Edit3 size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          <span>Edit Draft</span>
                        </button>
                        <button onClick={() => { handleRename(); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-[#F5F7FF] dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 text-xs font-semibold text-slate-705 dark:text-slate-355 group">
                          <FileText size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          <span>Rename Draft</span>
                        </button>
                        <button onClick={() => { handleDuplicate(); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-[#F5F7FF] dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 text-xs font-semibold text-slate-705 dark:text-slate-355 group">
                          <Plus size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          <span>Duplicate Draft</span>
                        </button>
                      </div>

                      {/* Category: Generation */}
                      <div className="py-2 space-y-1">
                        <div className="px-3 text-[9px] font-black tracking-widest text-slate-400 uppercase">Generation</div>
                        <button onClick={() => { handleRegenerate(); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-[#F5F7FF] dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 text-xs font-semibold text-slate-705 dark:text-slate-355 group">
                          <RefreshCw size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          <span>Regenerate Draft</span>
                        </button>
                      </div>

                      {/* Category: Language */}
                      <div className="py-2 space-y-1">
                        <div className="px-3 text-[9px] font-black tracking-widest text-slate-400 uppercase">Language</div>
                        <button onClick={() => { handleDraftLangChange('hi'); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-[#F5F7FF] dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 text-xs font-semibold text-slate-705 dark:text-slate-355 group">
                          <Languages size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          <span>Translate to Hindi</span>
                        </button>
                        <button onClick={() => { handleDraftLangChange('en'); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-[#F5F7FF] dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 text-xs font-semibold text-slate-705 dark:text-slate-355 group">
                          <Languages size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          <span>Translate to English</span>
                        </button>
                      </div>

                      {/* Category: Case */}
                      <div className="py-2 space-y-1">
                        <div className="px-3 text-[9px] font-black tracking-widest text-slate-400 uppercase">Case</div>
                        <button onClick={() => { handleSaveToCase(); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-[#F5F7FF] dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 text-xs font-semibold text-slate-705 dark:text-slate-355 group">
                          <Folder size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          <span>Save To Case</span>
                        </button>
                      </div>

                      {/* Category: Utilities */}
                      <div className="py-2 space-y-1">
                        <div className="px-3 text-[9px] font-black tracking-widest text-slate-400 uppercase">Utilities</div>
                        <button onClick={() => { setStep('SELECT'); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-[#F5F7FF] dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 text-xs font-semibold text-slate-705 dark:text-slate-355 group">
                          <Layout size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          <span>Templates</span>
                        </button>
                        <button onClick={() => { handlePrint(); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-[#F5F7FF] dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 text-xs font-semibold text-slate-705 dark:text-slate-355 group">
                          <Printer size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          <span>Print</span>
                        </button>
                      </div>

                      {/* Category: Danger */}
                      <div className="pt-2 space-y-1">
                        <div className="px-3 text-[9px] font-black tracking-widest text-rose-400 uppercase">Danger</div>
                        <button onClick={() => { setIsDeleteModalOpen(true); setIsMenuOpen(false); }} className="w-full h-[42px] px-3 flex items-center gap-2.5 rounded-xl transition-all hover:bg-rose-50 dark:hover:bg-rose-950/25 text-rose-600 dark:text-rose-400 font-bold group">
                          <Trash2 size={14} className="text-rose-500 dark:text-rose-400 group-hover:text-rose-755 transition-colors" />
                          <span>Delete Draft</span>
                        </button>
                      </div>

                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep('SAVED')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
                  step === 'SAVED'
                    ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                    : 'bg-white dark:bg-[#1A2540] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Folder size={13} />
                <span className="hidden sm:inline">Saved</span>
              </button>
              
              <button
                onClick={() => setStep('HISTORY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
                  step === 'HISTORY'
                    ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 text-amber-700 dark:text-amber-400'
                    : 'bg-white dark:bg-[#1A2540] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Clock size={13} />
                <span className="hidden sm:inline">History</span>
              </button>

              <button
                onClick={() => setStep('SELECT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
                  step === 'SELECT'
                    ? 'bg-indigo-100 dark:bg-indigo-950 border-indigo-300 text-indigo-700 dark:text-indigo-400'
                    : 'bg-white dark:bg-[#1A2540] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Layout size={13} />
                <span className="hidden sm:inline">Templates</span>
              </button>
            </div>
          )}
        </div>
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
          <div className="flex flex-col h-full min-h-0 max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 gap-6 pb-6">



            {/* Document preview area designed like an MS Word / Google Docs editor page */}
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-inner flex flex-col p-6 min-h-[500px]">
              <div className="flex-1 bg-white border border-slate-200 shadow-md max-w-[816px] w-full mx-auto p-12 sm:p-16 flex flex-col overflow-y-auto text-left relative min-h-[700px] rounded-lg custom-scrollbar">
                {isDraftTranslating && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 bg-white/90 px-3 py-1 rounded-full border border-indigo-100 shadow-sm animate-pulse">
                    <span className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    अनुवाद हो रहा है...
                  </div>
                )}

                {isEditing ? (
                  <textarea
                    value={finalDraft}
                    onChange={e => setFinalDraft(e.target.value)}
                    className="w-full h-full min-h-[500px] bg-transparent border-none text-slate-800 outline-none resize-none font-mono text-sm leading-relaxed focus:ring-0 focus:outline-none"
                  />
                ) : (
                  renderCleanLegalDraft(draftDisplayText || finalDraft, isDark, draftPlaceholders, placeholderValues)
                )}
              </div>
            </div>

            {/* Actions are fully integrated in the Google Docs Style Header Panel above. */}
          </div>
        )}

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
