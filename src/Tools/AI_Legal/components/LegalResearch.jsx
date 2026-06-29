import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Plus, FileText, Copy, 
  Share2, FileDown, History, Search, X, Shield, Clock, 
  Brain, Scale, BookOpen, AlertTriangle, TrendingUp, Mic, 
  Database, Cpu, Briefcase, Building2, Landmark, Folder, 
  Library, Printer, Check, Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { useActiveCase } from '../context/ActiveCaseContext';
import useOutputLanguage from '../hooks/useOutputLanguage';
import LanguageToggle from './shared/LanguageToggle';
import CopyOutputButton from './shared/CopyOutputButton';

const categories = [
  { id: 'SC', title: 'Supreme Court Research', icon: Landmark, count: '14,230 cases' },
  { id: 'HC', title: 'High Court Judgments', icon: Building2, count: '84,150 cases' },
  { id: 'Const', title: 'Constitutional Law', icon: Scale, count: '1,890 articles' },
  { id: 'Crim', title: 'Criminal Law', icon: Gavel, count: '24,600 files' },
  { id: 'Civ', title: 'Civil Law', icon: FileText, count: '32,110 files' },
  { id: 'Corp', title: 'Corporate Law', icon: Building2, count: '8,420 files' },
  { id: 'Cyber', title: 'Cyber Law', icon: Shield, count: '1,120 files' },
  { id: 'Fam', title: 'Family Law', icon: Library, count: '9,450 files' },
  { id: 'Prop', title: 'Property Law', icon: Landmark, count: '18,300 files' },
  { id: 'Tax', title: 'Taxation Law', icon: FileText, count: '4,520 files' },
  { id: 'Cons', title: 'Consumer Protection', icon: Library, count: '3,110 files' },
  { id: 'Arb', title: 'Arbitration & Mediation', icon: Scale, count: '6,450 files' },
];

const LegalResearch = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';
  const linkedCaseIdRef = useRef(currentCase?._id || '');

  // Get active case context
  const activeCaseContext = useActiveCase();
  const triggerAutoRun = activeCaseContext?.triggerAutoRun;

  // ─ Language toggle ─
  const {
    outputLang,
    setOutputLang,
    isTranslating,
    setIsTranslating,
    getDisplayText,
    translateText,
  } = useOutputLanguage('legal_research', currentCase?._id || 'global');

  const [researchDisplayText, setResearchDisplayText] = useState('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [detectedKeyword, setDetectedKeyword] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  
  // Output States
  const [isAuditing, setIsAuditing] = useState(false);
  const [researchResult, setResearchResult] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [activeResearch, setActiveResearch] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState(null);
  
  const [linkedCaseId, setLinkedCaseId] = useState(currentCase?._id || '');

  // Advanced Filters State
  const [courtFilter, setCourtFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('');
  const [lawType, setLawType] = useState('All');

  const scrollRef = useRef(null);

  useEffect(() => {
    if (currentCase) {
      setLinkedCaseId(currentCase._id);
      loadResearchHistory(currentCase._id);
      const query = `Landmark precedents for: ${currentCase.name}. facts: ${currentCase.description || ''}`;
      setSearchQuery(query);
      setResearchResult(null);
      setActiveResearch(null);
    } else {
      setLinkedCaseId('');
      setSearchQuery('');
      setHistoryData([]);
      setResearchResult(null);
      setActiveResearch(null);
    }
  }, [currentCase]);

  // Execute Auto-Run if intended by Context
  useEffect(() => {
    if (triggerAutoRun && currentCase && !isAuditing) {
      toast.success("✓ Case loaded for Legal Research", { icon: '📚', duration: 3000 });
      setTimeout(() => {
        const query = `Landmark precedents for: ${currentCase.name}. facts: ${currentCase.description || ''}`;
        runPrecedentDiscovery({ searchQuery: query });
      }, 500);
    }
  }, [triggerAutoRun, currentCase]); // Run when triggerAutoRun is active


  const loadResearchHistory = async (caseId) => {
    try {
      const targetCase = allProjects.find(p => p._id === caseId);
      let dbHistory = targetCase?.researchHistory || [];

      // Check legacy local storage history to migrate
      const localData = localStorage.getItem('aisa_legal_research_history');
      if (localData && targetCase) {
        try {
          const parsedLocal = JSON.parse(localData);
          const localForCase = parsedLocal.filter(h => h.caseId === caseId);
          if (localForCase.length > 0) {
            const merged = [...dbHistory];
            localForCase.forEach(item => {
              if (!merged.some(m => m.id === item.id)) {
                merged.push(item);
              }
            });
            const payload = {
              ...targetCase,
              researchHistory: merged
            };
            const response = await apiService.updateProject(caseId, payload);
            if (onUpdateCase) onUpdateCase(response);
            dbHistory = merged;

            const remainingLocal = parsedLocal.filter(h => h.caseId !== caseId);
            if (remainingLocal.length > 0) {
              localStorage.setItem('aisa_legal_research_history', JSON.stringify(remainingLocal));
            } else {
              localStorage.removeItem('aisa_legal_research_history');
            }
          }
        } catch (err) {
          console.error("Error migrating research history", err);
        }
      }

      setHistoryData(dbHistory);
    } catch (e) {
      console.error('[LegalResearch] Error loading history', e);
    }
  };

  const saveResearchToHistory = async (research) => {
    const caseId = linkedCaseId || currentCase?._id;
    if (!caseId) return;
    try {
      const targetCase = allProjects.find(p => p._id === caseId);
      if (!targetCase) return;
      const researchWithCase = {
        ...research,
        caseId: caseId
      };
      const existingHistory = targetCase.researchHistory || [];
      const updated = [researchWithCase, ...existingHistory.filter(h => h.id !== research.id)];

      const payload = {
        ...targetCase,
        researchHistory: updated
      };
      const response = await apiService.updateProject(caseId, payload);
      if (onUpdateCase) onUpdateCase(response);
      setHistoryData(updated);
    } catch (e) {
      console.error('[LegalResearch] Error saving history', e);
    }
  };

  const deleteHistoryItem = async (id) => {
    const caseId = linkedCaseId || currentCase?._id;
    if (!caseId) return;
    try {
      const targetCase = allProjects.find(p => p._id === caseId);
      if (!targetCase) return;
      const existingHistory = targetCase.researchHistory || [];
      const updated = existingHistory.filter(h => h.id !== id);

      const payload = {
        ...targetCase,
        researchHistory: updated
      };
      const response = await apiService.updateProject(caseId, payload);
      if (onUpdateCase) onUpdateCase(response);
      setHistoryData(updated);
      toast.success("Research log deleted successfully");
      if (activeResearch?.id === id) {
        setActiveResearch(null);
        setResearchResult(null);
      }
    } catch (e) {
      console.error('[LegalResearch] Error deleting history', e);
    }
  };

  const handleCaseSelect = (caseId) => {
    setLinkedCaseId(caseId);
    if (caseId) {
      const selected = allProjects.find(c => c._id === caseId);
      if (selected) {
        const query = `Landmark precedents for case: ${selected.name}. facts: ${selected.description || ''}`;
        setSearchQuery(query);
        loadResearchHistory(caseId);
        toast.success(`Context linked to case: ${selected.name}`);
      }
    } else {
      setLinkedCaseId('');
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    const lowerText = text.toLowerCase();
    
    // Live legal keyword detection
    if (lowerText.includes('302') || lowerText.includes('murder')) {
      setDetectedKeyword({ type: 'Section', name: 'IPC Section 302 (Punishment for Murder)' });
    } else if (lowerText.includes('420') || lowerText.includes('cheating')) {
      setDetectedKeyword({ type: 'Section', name: 'IPC Section 420 (Cheating & Delivery of Property)' });
    } else if (lowerText.includes('21') || lowerText.includes('privacy') || lowerText.includes('life')) {
      setDetectedKeyword({ type: 'Article', name: 'Constitution Article 21 (Protection of Life & Liberty)' });
    } else if (lowerText.includes('376') || lowerText.includes('rape')) {
      setDetectedKeyword({ type: 'Section', name: 'IPC Section 376 (Punishment for Sexual Assault)' });
    } else if (lowerText.includes('65b') || lowerText.includes('electronic')) {
      setDetectedKeyword({ type: 'Section', name: 'Evidence Act Section 65B (Electronic Evidence)' });
    } else {
      setDetectedKeyword(null);
    }

    if (text.length > 3) {
      const list = [
        `State of Karnataka vs XYZ (${yearFilter || '2024'})`,
        `Lalita Kumari vs State of UP (2014)`,
        `Kesavananda Bharati vs State of Kerala (1973)`,
        `Maneka Gandhi vs Union of India (1978)`,
        `Arnesh Kumar vs State of Bihar (2014)`
      ].filter(s => s.toLowerCase().includes(lowerText));
      setSuggestions(list);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (s) => {
    setSearchQuery(s);
    setSuggestions([]);
    runPrecedentDiscovery({ searchQuery: s });
  };

  const runPrecedentDiscovery = async (customState) => {
    const queryToUse = customState?.searchQuery || searchQuery;

    if (!queryToUse.trim()) {
      toast.error("Please enter a legal topic, query, or statute number.");
      return;
    }

    setIsAuditing(true);
    setResearchResult(null);

    const tid = toast.loading("Searching statutes and judge precedent indexes...");

    try {
      const systemPrompt = `You are the AISA Supreme Legal Precedent Discovery and Citation Search Engine. You perform research over BNS, IPC, Evidence Act, and Supreme Court rulings.
      
      CRITICAL FORMATTING INSTRUCTIONS:
      Always output a valid markdown with the following exactly matching sections:
      ### **AISA PRECEDENT & CITATION FINDER REPORT**
      
      **Query Target:** [Brief Summary of query]
      **Precedent Citations Found:** [Count] | **Primary Law Act:** [BNS/IPC/Evidence Act/etc]
      
      #### **1. BINDING PRECEDENT OVERVIEW**
      * **[Citation/Case Title]**: [Brief Summary of ruling and legal principle established].
      * **[Second Case Citation]**: [Details].
      
      #### **2. STATUTORY LAWS & APPLICABILITY**
      * **[Act Section/Article Number]**: [Explanation of applicability and statutory bounds].
      
      #### **3. RECOMMENDED CITATIONS FOR COURT**
      * **[Citation 1 Name]** (e.g. Lalita Kumari vs State of UP (2014) 2 SCC 1)
      * **[Citation 2 Name]**
      
      #### **4. LITIGATION REBUTTAL RECOMMENDATION**
      [Brief strategic advice on how to cite these precedents to counter opposition arguments]`;

      const finalQuery = `
      Search Query: ${queryToUse}
      Filters applied: Court=${courtFilter}, Year=${yearFilter}, ActType=${lawType}
      `;

      const response = await generateChatResponse([], finalQuery, systemPrompt, [], 'English', null, 'legal');
      const responseText = response.reply || response || '';

      // Parse counts
      let precedentsCount = 2;
      let primaryAct = 'IPC';

      try {
        const countMatch = responseText.match(/Precedent Citations Found:\s*(\d+)/i);
        if (countMatch) precedentsCount = parseInt(countMatch[1]);
        const actMatch = responseText.match(/Primary Law Act:\s*(\w+)/i);
        if (actMatch) primaryAct = actMatch[1].trim();
      } catch (parseErr) {
        console.warn('Research count parsing failed', parseErr);
      }

      const newResearch = {
        id: Date.now().toString(),
        title: queryToUse.length > 50 ? queryToUse.substring(0, 47) + '...' : queryToUse,
        timestamp: new Date().toLocaleString(),
        stats: { precedentsCount, primaryAct, confidenceRate: 98 },
        report: responseText
      };

      setActiveResearch(newResearch);
      setResearchResult(newResearch);
      setResearchDisplayText(responseText); // reset to English on new search
      await saveResearchToHistory(newResearch);
      toast.success("Precedents discovered!", { id: tid });
    } catch (e) {
      console.error(e);
      toast.error("Failed to execute statutory search.", { id: tid });
    } finally {
      setIsAuditing(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  };

  const handleAttachCitations = async () => {
    const activeCase = allProjects.find(p => p._id === (linkedCaseId || currentCase?._id)) || currentCase;
    if (!activeCase || !researchResult) {
      toast.error("An active case is required to attach citations.");
      return;
    }
    
    const lines = researchResult.report.split('\n');
    const citations = [];
    let inCitationsSection = false;
    
    for (const line of lines) {
      if (line.toLowerCase().includes('recommended citations') || line.toLowerCase().includes('citations for court')) {
        inCitationsSection = true;
        continue;
      }
      if (inCitationsSection) {
        const match = line.match(/\*\*(.*?)\*\*/);
        if (match) {
          citations.push(match[1].trim());
        } else if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
          citations.push(line.replace(/^[*\-\s]+/, '').trim());
        }
      }
    }
    
    if (citations.length === 0) {
      toast.error("No citations found to attach.");
      return;
    }

    const existingCitations = activeCase.citations || [];
    const updatedCitations = Array.from(new Set([...existingCitations, ...citations]));
    
    try {
      const payload = { ...activeCase, citations: updatedCitations };
      const response = await apiService.updateProject(activeCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
      toast.success("Citations attached to active case! 📚");
    } catch (e) {
      toast.error("Failed to attach citations.");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Report copied to clipboard!");
  };

  // ─ Language switch handler ────────────────────────────────────────
  const handleLangChange = useCallback(async (newLang) => {
    setOutputLang(newLang);
    const report = researchResult?.report;
    if (!report) return;

    if (newLang === 'en') {
      setResearchDisplayText(report);
      return;
    }

    const cached = getDisplayText(report);
    if (cached && cached !== report) {
      setResearchDisplayText(cached);
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateText(report);
      if (isMountedRef.current) setResearchDisplayText(translated);
    } catch {
      if (isMountedRef.current) setResearchDisplayText(report);
    } finally {
      if (isMountedRef.current) setIsTranslating(false);
    }
  }, [researchResult, getDisplayText, setOutputLang, setIsTranslating, translateText]);

  // Sync display text when researchResult changes (new research)
  useEffect(() => {
    if (researchResult?.report) {
      if (outputLang === 'en') {
        setResearchDisplayText(researchResult.report);
      } else {
        handleLangChange(outputLang);
      }
    }
  }, [researchResult?.id]); // eslint-disable-line


  const handleShare = async (text) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: searchQuery || 'Statutory Precedents Search',
          text: text
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      handleCopy(text);
    }
  };

  const getHtmlContent = (text) => {
    const parsedReport = text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n/g, '<br/>');

    return `
      <html>
      <head>
        <meta charset="UTF-8"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet"/>
        <style>
          body { font-family: 'Noto Sans Devanagari', 'Noto Sans', Arial, sans-serif; padding: 40px; line-height: 1.8; font-size: 13pt; color: #0f172a; }
          h1 { text-align: center; text-transform: uppercase; font-size: 16pt; font-weight: bold; margin-bottom: 24px; color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          h2 { font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 12px; }
          h3 { font-size: 13pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; }
          strong { font-weight: bold; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; font-size: 10pt; text-align: center; padding-top: 15px; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>AISA LEGAL PRECEDENT Discovery & STATUTORY REPORT</h1>
        <p><strong>Research Date:</strong> ${new Date().toLocaleDateString()}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;"/>
        ${parsedReport}
        <div class="footer">Generated by AISA Supreme Legal Research Suite - ${new Date().toLocaleDateString()}</div>
      </body>
      </html>
    `;
  };

  const handleExportPDF = (text) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(getHtmlContent(text));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleSpeech = (text) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const cleanText = text.replace(/[#*`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeechUtterance(utterance);
      setIsSpeaking(true);
    }
  };

  const stats = activeResearch ? activeResearch.stats : { precedentsCount: '--', primaryAct: '--', confidenceRate: '--' };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-50 dark:bg-transparent overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">Legal Research</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">RESEARCH DIRECTORY ACTIVE</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setHistoryVisible(true)} 
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/30 rounded-xl text-xs font-black uppercase tracking-wider"
        >
          <History size={14} />
          <span>Research Log</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar min-h-0 select-text">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Stats Header */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Landmark className="text-indigo-500" size={20} />
              <span className="text-lg font-black text-indigo-500 mt-2">{stats.precedentsCount}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Precedents Found</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Gavel className="text-emerald-500" size={20} />
              <span className="text-lg font-black text-emerald-500 mt-2">{stats.primaryAct}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Primary Law Act</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Brain className="text-pink-500" size={20} />
              <span className="text-lg font-black text-pink-500 mt-2">{stats.confidenceRate}{stats.confidenceRate !== '--' ? '%' : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">AI Accuracy</span>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="bg-white dark:bg-[#1A2540] rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4 font-bold">RESEARCH DIRECTORY CLASSIFICATIONS</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categories.map(c => {
                const IconComp = c.icon || Landmark;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSearchQuery(`Find landmarks relating to ${c.title}`);
                      runPrecedentDiscovery({ searchQuery: `Find landmarks relating to ${c.title}` });
                    }}
                    className="p-4 bg-slate-50 dark:bg-[#131C31] hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-2xl transition-all flex flex-col items-center text-center justify-center min-h-[110px]"
                  >
                    <IconComp size={18} className="text-indigo-500" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-2 line-clamp-1">{c.title}</h4>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{c.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form and Input Area */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <Library size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">EXPLORE ACTS, RULES & CASE PRECEDENTS</h3>
            </div>

            {/* Case Sync */}
            {allProjects.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Link to MyCase</label>
                <select
                  value={linkedCaseId}
                  onChange={e => handleCaseSelect(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Manual Entry (No Sync)</option>
                  {allProjects.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Search inputs row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Court / Forum</label>
                <select
                  value={courtFilter}
                  onChange={e => setCourtFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                >
                  <option value="All">All Courts</option>
                  <option value="Supreme Court">Supreme Court of India</option>
                  <option value="High Court">High Courts</option>
                  <option value="Tribunal">National Tribunals</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Target Year</label>
                <input
                  type="number"
                  placeholder="e.g. 2023"
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Statutory Act Type</label>
                <select
                  value={lawType}
                  onChange={e => setLawType(e.target.value)}
                  className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                >
                  <option value="All">All Acts</option>
                  <option value="IPC / BNS">BNS / IPC Criminal Code</option>
                  <option value="CPC">Civil Procedure (CPC)</option>
                  <option value="CrPC / BNSS">BNSS / CrPC Procedural</option>
                  <option value="Constitution">Constitutional Provisions</option>
                </select>
              </div>
            </div>

            {/* Keyword detector alert banner */}
            {detectedKeyword && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/30 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                <Brain size={14} className="shrink-0 animate-pulse" />
                <span>Detected Target: <strong>{detectedKeyword.name}</strong></span>
              </div>
            )}

            {/* Search Input Box */}
            <div className="relative">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Precedent query keyword</label>
              <div className="flex items-center bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-3">
                <Search size={16} className="text-slate-400 mr-2 shrink-0" />
                <input 
                  type="text"
                  placeholder="Describe legal scenario or search by IPC/BNS Section..."
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                />
              </div>

              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden max-h-[180px] overflow-y-auto">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#131C31] border-b border-slate-100 dark:border-white/5 last:border-0"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => runPrecedentDiscovery()}
              disabled={isAuditing || !searchQuery.trim()}
              className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Search size={16} />
              <span>Explore Precedent Citations</span>
            </button>
          </div>

          {/* Thinking State */}
          {isAuditing && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-500 animate-pulse">Running statutory precedence query...</span>
            </div>
          )}

          {/* Result Strategy Report */}
          {researchResult && (
            <div ref={scrollRef} className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Library size={16} className="text-emerald-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">STATUTORY LEGAL PRECEDENTS</h3>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button 
                    onClick={handleAttachCitations}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/30 rounded-xl text-[10px] font-black uppercase tracking-wider"
                    title="Link citations onto case context database"
                  >
                    <Star size={12} fill="currentColor" />
                    <span>Attach to Case</span>
                  </button>

                  {/* Language Toggle */}
                  <LanguageToggle
                    lang={outputLang}
                    onChange={handleLangChange}
                    isTranslating={isTranslating}
                  />

                  {/* Copy (language-aware) */}
                  <CopyOutputButton
                    text={researchDisplayText || researchResult.report}
                    label={outputLang === 'hi' ? 'Hindi mein copy karein' : 'Copy report'}
                  />

                  <button 
                    onClick={() => handleShare(researchDisplayText || researchResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-indigo-600"
                    title="Share Report"
                  >
                    <Share2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleSpeech(researchDisplayText || researchResult.report)}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg ${isSpeaking ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' : 'text-slate-500'}`}
                    title="Speak Report"
                  >
                    <Mic size={14} />
                  </button>
                  <button 
                    onClick={() => handleExportPDF(researchDisplayText || researchResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-indigo-600 hover:text-indigo-700"
                    title="Print PDF"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>

              {/* Translating indicator */}
              {isTranslating && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 animate-pulse">
                  <span className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  अनुवाद हो रहा है...
                </div>
              )}

              <div className={`prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap select-text leading-relaxed text-slate-800 dark:text-slate-200 transition-opacity duration-200 ${isTranslating ? 'opacity-50' : 'opacity-100'}`}>
                {researchDisplayText || researchResult.report}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* History Modal */}
      {historyVisible && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setHistoryVisible(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] max-w-lg w-full max-h-[80%] flex flex-col overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 shrink-0">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Research Precedents Log</h3>
              <button onClick={() => setHistoryVisible(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 mt-4 shrink-0">
              <Search size={16} className="text-slate-400 mr-2" />
              <input 
                type="text"
                placeholder="Search past logs..."
                className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-3 custom-scrollbar">
              {historyData.filter(h => 
                h.title?.toLowerCase().includes(historySearch.toLowerCase()) || 
                h.report?.toLowerCase().includes(historySearch.toLowerCase())
              ).map(item => (
                <div key={item.id} className="flex justify-between items-start p-4 bg-slate-50 dark:bg-[#1A2540] border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <button
                    onClick={() => {
                      setActiveResearch(item);
                      setResearchResult(item);
                      setHistoryVisible(false);
                      toast.success(`Loaded research log: ${item.title}`);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.title}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{item.timestamp}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[9px] font-bold text-indigo-600 rounded-md">Act: {item.stats.primaryAct}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-[9px] font-bold text-emerald-600 rounded-md">Precedents: {item.stats.precedentsCount} found</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => deleteHistoryItem(item.id)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500 shrink-0 ml-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {historyData.length === 0 && (
                <div className="text-center py-10">
                  <Folder size={32} className="mx-auto text-slate-300 dark:text-zinc-700" />
                  <p className="text-xs font-semibold text-slate-400 mt-2">No research logs saved yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalResearch;
