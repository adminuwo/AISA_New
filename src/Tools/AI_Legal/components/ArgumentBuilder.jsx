import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Send, MessageSquare, Plus, Zap, 
  FileText, Copy, Share2, FileDown, History, Search, X, ShieldCheck, 
  Clock, Brain, Target, Scale, BookOpen, AlertTriangle, TrendingUp, 
  Mic, Star, Database, Cpu, BarChart2, Users, ShieldAlert, Briefcase, 
  Calendar, ChevronDown, ChevronUp, Trash2, Edit2, Eye, Download, Upload, Check, Paperclip,
  Pin, PinOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { useActiveCase } from '../context/ActiveCaseContext';
import BuildArgumentModal from './BuildArgumentModal';
import useOutputLanguage from '../hooks/useOutputLanguage';
import LanguageToggle from './shared/LanguageToggle';
import CopyOutputButton from './shared/CopyOutputButton';
import OutputActionToolbar from '../../../Components/OutputActionToolbar';

// ─── LEGAL MARKDOWN RENDERER ────────────────────────────────────────────────
/**
 * Converts AI-generated Markdown text into professional legal document JSX.
 * Handles: # H1, ## H2, ### H3, **bold**, *italic*, - bullets, 1. numbered lists,
 * --- dividers, and typed paragraphs. Used exclusively in Argument Builder.
 */
const renderLegalMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let listBuffer = [];
  let listType = null; // 'ul' | 'ol'

  const flushList = () => {
    if (!listBuffer.length) return;
    if (listType === 'ol') {
      elements.push(
        <ol key={`ol-${i}`} style={{ margin: '8px 0 12px 0', paddingLeft: '22px', lineHeight: '1.75' }}>
          {listBuffer.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '4px', fontSize: '13.5px', color: 'inherit' }}
              dangerouslySetInnerHTML={{ __html: inlineStyles(item) }} />
          ))}
        </ol>
      );
    } else {
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: '8px 0 12px 0', paddingLeft: '20px', lineHeight: '1.75', listStyleType: 'disc' }}>
          {listBuffer.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '4px', fontSize: '13.5px', color: 'inherit' }}
              dangerouslySetInnerHTML={{ __html: inlineStyles(item) }} />
          ))}
        </ul>
      );
    }
    listBuffer = [];
    listType = null;
  };

  const inlineStyles = (str) => {
    // **bold**
    str = str.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700">$1</strong>');
    // *italic* or _italic_
    str = str.replace(/(?:\*|_)(.+?)(?:\*|_)/g, '<em>$1</em>');
    // `code`
    str = str.replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,0.08);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>');
    return str;
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Blank line — flush list, add spacing
    if (!line.trim()) {
      flushList();
      elements.push(<div key={`br-${i}`} style={{ height: '6px' }} />);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      flushList();
      elements.push(
        <hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1.5px solid rgba(99,102,241,0.18)', margin: '18px 0' }} />
      );
      i++;
      continue;
    }

    // H1 (#)
    if (/^# /.test(line)) {
      flushList();
      const content = line.replace(/^# /, '');
      elements.push(
        <h1 key={`h1-${i}`} style={{
          fontSize: '17px', fontWeight: '800', letterSpacing: '-0.3px',
          color: 'inherit', margin: '20px 0 10px 0', paddingBottom: '8px',
          borderBottom: '2px solid rgba(99,102,241,0.25)', lineHeight: '1.35'
        }} dangerouslySetInnerHTML={{ __html: inlineStyles(content) }} />
      );
      i++;
      continue;
    }

    // H2 (##)
    if (/^## /.test(line)) {
      flushList();
      const content = line.replace(/^## /, '');
      elements.push(
        <h2 key={`h2-${i}`} style={{
          fontSize: '14.5px', fontWeight: '800', color: '#4f46e5',
          margin: '16px 0 7px 0', letterSpacing: '0.1px', lineHeight: '1.4',
          textTransform: 'none'
        }} dangerouslySetInnerHTML={{ __html: inlineStyles(content) }} />
      );
      i++;
      continue;
    }

    // H3 (###)
    if (/^### /.test(line)) {
      flushList();
      const content = line.replace(/^### /, '');
      elements.push(
        <h3 key={`h3-${i}`} style={{
          fontSize: '13px', fontWeight: '700', color: '#6366f1',
          margin: '12px 0 5px 0', lineHeight: '1.4'
        }} dangerouslySetInnerHTML={{ __html: inlineStyles(content) }} />
      );
      i++;
      continue;
    }

    // H4 (####)
    if (/^#### /.test(line)) {
      flushList();
      const content = line.replace(/^#### /, '');
      elements.push(
        <h4 key={`h4-${i}`} style={{
          fontSize: '12px', fontWeight: '700', color: '#7c3aed',
          margin: '10px 0 4px 0', lineHeight: '1.4'
        }} dangerouslySetInnerHTML={{ __html: inlineStyles(content) }} />
      );
      i++;
      continue;
    }

    // Unordered list item (- or * or •)
    if (/^[-*•] /.test(line.trimStart())) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listBuffer.push(line.replace(/^\s*[-*•] /, ''));
      i++;
      continue;
    }

    // Ordered list item (1. 2. etc)
    if (/^\s*\d+\.\s/.test(line)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listBuffer.push(line.replace(/^\s*\d+\.\s*/, ''));
      i++;
      continue;
    }

    // Normal paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} style={{
        margin: '0 0 8px 0', fontSize: '13.5px', lineHeight: '1.75', color: 'inherit'
      }} dangerouslySetInnerHTML={{ __html: inlineStyles(line) }} />
    );
    i++;
  }

  flushList();
  return elements;
};

// ─── PER-MESSAGE LANGUAGE TOGGLE WRAPPER ────────────────────────────────────
const AiMessageWithLangToggle = ({ text, outputLang, getDisplayText, translateText, onLangChange, isLegalReport }) => {
  const [displayText, setDisplayText] = useState(text);
  const [isTranslating, setIsTranslating] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (outputLang === 'en') setDisplayText(text);
  }, [text]); // eslint-disable-line

  useEffect(() => {
    if (outputLang === 'en') {
      setDisplayText(text);
      return;
    }
    const cached = getDisplayText(text);
    if (cached && cached !== text) {
      setDisplayText(cached);
      return;
    }
    setIsTranslating(true);
    translateText(text).then((translated) => {
      if (isMountedRef.current) setDisplayText(translated);
      setIsTranslating(false);
    }).catch(() => {
      if (isMountedRef.current) setDisplayText(text);
      setIsTranslating(false);
    });
  }, [text, outputLang, getDisplayText, translateText]);

  return (
    <div className="relative">
      <div className="flex items-center justify-end gap-1.5 mb-2 shrink-0">
        <LanguageToggle
          lang={outputLang}
          onChange={onLangChange}
          isTranslating={isTranslating}
        />
      </div>

      {isTranslating && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 mb-2 animate-pulse">
          <span className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          अनुवाद हो रहा है...
        </div>
      )}

      {isLegalReport ? (
        /* ── Professional legal document renderer ── */
        <div className={`ab-legal-report select-text transition-opacity duration-200 ${isTranslating ? 'opacity-50' : 'opacity-100'}`}>
          {renderLegalMarkdown(displayText)}
        </div>
      ) : (
        /* ── Plain welcome/system message renderer ── */
        <div className={`transition-opacity duration-200 ${isTranslating ? 'opacity-50' : 'opacity-100'} prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap select-text`}>
          {displayText}
        </div>
      )}
    </div>
  );
};

// ─── PER-MESSAGE RESPONSE CARD WITH LOCALIZED ACTIONS ────────────────────────
const AiResponseCard = ({ msg }) => {
  const {
    outputLang,
    setOutputLang,
    getDisplayText,
    translateText,
  } = useOutputLanguage('argument_builder_msg', msg.id);

  return (
    <>
      <AiMessageWithLangToggle
        text={msg.content}
        outputLang={outputLang}
        getDisplayText={getDisplayText}
        translateText={translateText}
        onLangChange={setOutputLang}
        isLegalReport={!msg.isSystemLog}
      />
      {msg.role !== 'user' && !msg.isSystemLog && (
        <OutputActionToolbar
          msg={msg}
          outputLang={outputLang}
          setOutputLang={setOutputLang}
          getDisplayText={getDisplayText}
          translateText={translateText}
        />
      )}
    </>
  );
};

const WORKFLOW_CATEGORIES = [
  {
    title: 'AI COURTROOM SIMULATION',
    icon: <Gavel size={16} className="text-indigo-600" />,
    items: [
      { name: 'Cross-Examination Simulator', desc: 'Generate targeted lines of questioning for opposing witnesses.' },
      { name: 'Witness Contradiction Finder', desc: 'Expose contradictions in witness depositions.' },
      { name: 'Objection Assistant', desc: 'Simulate courtroom objections and judicial responses.' },
      { name: 'Opposition Strategy Simulator', desc: 'Forecast opposing counsel strategies and build defensive responses.' }
    ]
  },
  {
    title: 'CASE ANALYTICS',
    icon: <BarChart2 size={16} className="text-indigo-600" />,
    items: [
      { name: 'Winning Probability', desc: 'Predict outcome based on case facts and active judge patterns.' },
      { name: 'Evidence Strength Auditor', desc: 'Audit evidence admissibility and relevance scores.' },
      { name: 'Judicial Risk Forecast', desc: 'Scan and calculate potential risk exposure in the active forum.' }
    ]
  },
  {
    title: 'LEGAL RESEARCH ENGINE',
    icon: <Database size={16} className="text-indigo-600" />,
    items: [
      { name: 'IPC & Statutory Interpretations', desc: 'Explore IPC / BNS clauses and legal applicability.' },
      { name: 'Precedent Citation Finder', desc: 'Search and link matching binding precedents.' }
    ]
  },
  {
    title: 'NEGOTIATION & MEDIATION',
    icon: <Scale size={16} className="text-indigo-600" />,
    items: [
      { name: 'Settlement Planner', desc: 'Determine fair valuation terms and draft negotiation stances.' },
      { name: 'Mediation Roadmap Builder', desc: 'Structure step-by-step mediation goals and fallback positions.' }
    ]
  }
];

const ArgumentBuilder = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('assistant'); // assistant, timeline, form
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'model',
      content: 'Welcome to **AISA Argument Intelligence**. I am your Elite Litigation Architect. Describe your case facts or select a courtroom workflow to build a winning strategy.',
      timestamp: Date.now(),
      isSystemLog: true
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Get active case context
  const activeCaseContext = useActiveCase();
  const triggerAutoRun = activeCaseContext?.triggerAutoRun;


  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const messagesContainerRef = useRef(null);
const fileInputRef = useRef(null);

  // Chat sessions state
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showBuildArgument, setShowBuildArgument] = useState(false);
  const [pinnedSessions, setPinnedSessions] = useState([]);



  // ─── HISTORY HANDLERS ────────────────────────────────────────────────────
  const handleTogglePin = async (sessId, e) => {
    e.stopPropagation();
    if (!currentCase) return;
    const nextPinned = pinnedSessions.includes(sessId)
      ? pinnedSessions.filter(id => id !== sessId)
      : [...pinnedSessions, sessId];

    setPinnedSessions(nextPinned);

    try {
      const payload = {
        ...currentCase,
        argumentsData: {
          ...(currentCase.argumentsData || {}),
          pinnedSessions: nextPinned
        }
      };
      const response = await apiService.updateProject(currentCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
    } catch (err) {
      console.error("Failed to pin session", err);
    }
  };

  const handleDeleteSession = async (sessId, e) => {
    e.stopPropagation();
    if (!currentCase) return;

    const updatedSessions = sessions.filter(s => s.id !== sessId);
    let nextActiveId = activeSessionId;
    let nextMessages = messages;

    if (sessId === activeSessionId) {
      if (updatedSessions.length > 0) {
        nextActiveId = updatedSessions[0].id;
        const activeSess = updatedSessions.find(s => s.id === nextActiveId);
        nextMessages = activeSess ? activeSess.messages : [];
      } else {
        const newSessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const caseName = currentCase.name || 'AISA Argument Builder';
        const defaultMsgs = [
          {
            id: '1',
            role: 'model',
            content: `Welcome to **AISA Argument Intelligence** for **${caseName}**. I am your Elite Litigation Architect. Describe your case facts or select a courtroom workflow to build a winning strategy.`,
            timestamp: Date.now(),
            isSystemLog: true
          }
        ];
        const newSession = {
          id: newSessionId,
          title: 'New Chat',
          messages: defaultMsgs,
          timestamp: Date.now()
        };
        updatedSessions.push(newSession);
        nextActiveId = newSessionId;
        nextMessages = defaultMsgs;
      }
    }

    const nextPinned = pinnedSessions.filter(id => id !== sessId);

    setSessions(updatedSessions);
    setActiveSessionId(nextActiveId);
    setMessages(nextMessages);
    setPinnedSessions(nextPinned);

    try {
      const payload = {
        ...currentCase,
        argumentsData: {
          sessions: updatedSessions,
          activeSessionId: nextActiveId,
          pinnedSessions: nextPinned
        }
      };
      const response = await apiService.updateProject(currentCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };


  // Form states for proceeding CRUD (timeline/facts)
  const [formEvent, setFormEvent] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWitnessName, setFormWitnessName] = useState('');
  const [formWitnessType, setFormWitnessType] = useState('Prosecution/Plaintiff');
  const [formMainArgs, setFormMainArgs] = useState('');
  const [formCounterArgs, setFormCounterArgs] = useState('');
  const [formOutcome, setFormOutcome] = useState('');
  const [formNextStep, setFormNextStep] = useState('');
  const [formWitnessQuestions, setFormWitnessQuestions] = useState(['']);

  // Collapse sections
  const [section1Expanded, setSection1Expanded] = useState(true);
  const [section2Expanded, setSection2Expanded] = useState(true);

  // Helper to render correct file icon
  const getFileIcon = (type) => {
    if (!type) return <FileText size={14} className="text-slate-400" />;
    if (type.includes('pdf')) return <FileText size={14} className="text-red-500" />;
    if (type.includes('word') || type.includes('msword') || type.includes('officedocument.word')) return <FileText size={14} className="text-blue-500" />;
    if (type.startsWith('image/')) return <Eye size={14} className="text-emerald-500" />;
    if (type.includes('excel') || type.includes('officedocument.spreadsheet') || type.includes('csv')) return <FileText size={14} className="text-green-600" />;
    return <FileText size={14} className="text-slate-400" />;
  };

  const handleFilesAdded = async (filesList) => {
    const supportedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'text/plain', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      
      // Determine extension as a fallback type check
      const ext = file.name.split('.').pop().toLowerCase();
      const isLegalExtension = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'txt', 'csv', 'xls', 'xlsx'].includes(ext);

      if (!supportedTypes.includes(file.type) && !isLegalExtension) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }

      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      
      const newAtt = {
        id,
        name: file.name,
        type: file.type || `application/${ext}`,
        size: file.size,
        progress: 0,
        isUploading: true,
        dataUrl: ''
      };
      
      setAttachments(prev => [...prev, newAtt]);
      
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result;
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, dataUrl } : a));
        
        let progressVal = 0;
        const interval = setInterval(async () => {
          progressVal += 20;
          if (progressVal >= 100) {
            clearInterval(interval);
            setAttachments(prev => prev.map(a => a.id === id ? { ...a, progress: 100, isUploading: false } : a));
            
            // Sync globally to case documents
            await saveFileToCase({ name: file.name, type: file.type || `application/${ext}`, size: file.size, dataUrl });
          } else {
            setAttachments(prev => prev.map(a => a.id === id ? { ...a, progress: progressVal } : a));
          }
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      handleFilesAdded(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const saveFileToCase = async (fileObj) => {
    if (!currentCase || !currentCase._id) return;
    try {
      const newDoc = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        name: fileObj.name,
        type: fileObj.type || 'file',
        size: fileObj.size,
        uploadedAt: new Date().toISOString(),
        uri: fileObj.dataUrl // base64 URI
      };

      const existingDocs = currentCase.documents || [];
      const updatedDocs = [newDoc, ...existingDocs];
      const payload = {
        ...currentCase,
        documents: updatedDocs
      };
      
      const response = await apiService.updateProject(currentCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
    } catch (e) {
      console.error("Failed to sync file to case documents", e);
    }
  };

  // Load chat history and sessions for the active case
  useEffect(() => {
    if (currentCase) {
      const data = currentCase.argumentsData || {};
      const dbSessions = data.sessions || [];
      const dbActiveSessionId = data.activeSessionId || '';
      const dbPinnedSessions = data.pinnedSessions || [];

      if (dbSessions.length > 0) {
        setSessions(dbSessions);
        setPinnedSessions(dbPinnedSessions);
        const activeId = dbActiveSessionId || dbSessions[0].id;
        setActiveSessionId(activeId);
        const activeSess = dbSessions.find(s => s.id === activeId);
        if (activeSess) {
          setMessages(activeSess.messages);
        }
        return;
      }

      // Check for legacy/local storage sessions to migrate
      const storedSessions = localStorage.getItem(`@aisa_arg_sessions_${currentCase._id}`);
      let migratedSessions = [];
      let migratedActiveSessionId = '';
      let migratedPinnedSessions = [];

      if (storedSessions) {
        try {
          const parsed = JSON.parse(storedSessions);
          if (parsed && Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
            migratedSessions = parsed.sessions;
            migratedActiveSessionId = parsed.activeSessionId || parsed.sessions[0].id;
            migratedPinnedSessions = JSON.parse(localStorage.getItem('arg_builder_pinned_sessions') || '[]');
          }
        } catch (e) {
          console.error("Failed to parse local sessions", e);
        }
      }

      if (migratedSessions.length > 0) {
        setSessions(migratedSessions);
        setActiveSessionId(migratedActiveSessionId);
        setPinnedSessions(migratedPinnedSessions);
        const activeSess = migratedSessions.find(s => s.id === migratedActiveSessionId);
        if (activeSess) {
          setMessages(activeSess.messages);
        }
        const payload = {
          ...currentCase,
          argumentsData: {
            sessions: migratedSessions,
            activeSessionId: migratedActiveSessionId,
            pinnedSessions: migratedPinnedSessions
          }
        };
        apiService.updateProject(currentCase._id, payload).then(response => {
          if (onUpdateCase) onUpdateCase(response);
          localStorage.removeItem(`@aisa_arg_sessions_${currentCase._id}`);
        }).catch(err => console.error("Error migrating local sessions to DB", err));
        return;
      }

      // Check for legacy single chat history to migrate
      const legacyChat = localStorage.getItem(`@aisa_arg_chat_${currentCase._id}`);
      const defaultMsgs = [
        {
          id: '1',
          role: 'model',
          content: `Welcome to **AISA Argument Intelligence** for **${currentCase.name}**. I am your Elite Litigation Architect. Select a courtroom simulation to begin.`,
          timestamp: Date.now(),
          isSystemLog: true
        }
      ];

      const initialId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      let initialMsgs = defaultMsgs;
      let initialTitle = 'Initial Conversation';

      if (legacyChat) {
        try {
          const parsedLegacy = JSON.parse(legacyChat);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            initialMsgs = parsedLegacy;
            const firstUser = parsedLegacy.find(m => m.role === 'user');
            if (firstUser) {
              initialTitle = firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '');
            }
          }
        } catch (e) {
          console.error("Failed to migrate legacy chat history", e);
        }
      }

      const initialSession = {
        id: initialId,
        title: initialTitle,
        messages: initialMsgs,
        timestamp: Date.now()
      };

      setSessions([initialSession]);
      setActiveSessionId(initialId);
      setMessages(initialMsgs);

      const payload = {
        ...currentCase,
        argumentsData: {
          sessions: [initialSession],
          activeSessionId: initialId,
          pinnedSessions: []
        }
      };
      apiService.updateProject(currentCase._id, payload).then(response => {
        if (onUpdateCase) onUpdateCase(response);
        if (legacyChat) {
          localStorage.removeItem(`@aisa_arg_chat_${currentCase._id}`);
        }
      }).catch(err => console.error("Error saving initial session to DB", err));
    }
  }, [currentCase?._id]);

  // Execute Auto-Run if intended by Context
  useEffect(() => {
    if (triggerAutoRun && currentCase && !isGenerating) {
      toast.success("✓ Case loaded for Argument Intelligence", { icon: '⚖️', duration: 3000 });
      setTimeout(() => {
        handleSendMessage("Analyze this case facts and documents, and provide a complete argument and strategy report.", true);
      }, 500);
    }
  }, [triggerAutoRun, currentCase]); // Wait for currentCase to populate sessions first

  const saveChatHistory = async (updatedMsgs) => {
    if (!currentCase || !activeSessionId) return;

    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        let title = s.title;
        if (s.title === 'Initial Conversation' || s.title === 'New Chat') {
          const firstUser = updatedMsgs.find(m => m.role === 'user');
          if (firstUser) {
            title = firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '');
          }
        }
        return { ...s, title, messages: updatedMsgs };
      }
      return s;
    });

    setSessions(updatedSessions);

    try {
      const payload = {
        ...currentCase,
        argumentsData: {
          ...(currentCase.argumentsData || {}),
          sessions: updatedSessions,
          activeSessionId
        }
      };
      const response = await apiService.updateProject(currentCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
    } catch (err) {
      console.error("Failed to save chat history", err);
    }
  };

  const handleNewChat = async () => {
    setIsCreatingChat(true);
    if (!currentCase) {
      const defaultMsgs = [
        {
          id: '1',
          role: 'model',
          content: 'Welcome to **AISA Argument Intelligence**. I am your Elite Litigation Architect. Describe your case facts or select a courtroom workflow to build a winning strategy.',
          timestamp: Date.now(),
          isSystemLog: true
        }
      ];
      setMessages(defaultMsgs);
      setInputValue('');
      setAttachments([]);
      setActiveSessionId('');
      setTimeout(() => {
        const chatInput = document.querySelector('input[placeholder="Describe case details or ask litigation questions..."]');
        if (chatInput) chatInput.focus();
      }, 100);
      setIsCreatingChat(false);
      return;
    }
    // Save current chat session to history before creating new chat
    await saveChatHistory(messages);

    const caseName = currentCase.name || 'AISA Argument Builder';
    const newSessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const defaultMsgs = [
      {
        id: '1',
        role: 'model',
        content: `Welcome to **AISA Argument Intelligence** for **${caseName}**. I am your Elite Litigation Architect. Describe your case facts or select a courtroom workflow to build a winning strategy.`,
        timestamp: Date.now(),
        isSystemLog: true
      }
    ];

    const newSession = {
      id: newSessionId,
      title: 'New Chat',
      messages: defaultMsgs,
      timestamp: Date.now()
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setActiveSessionId(newSessionId);
    setMessages(defaultMsgs);
    setInputValue('');
    setAttachments([]);
    setIsGenerating(false);
    setActiveTab('assistant');
    setShowBuildArgument(false);
    // Scroll to top of messages container
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }

    // Persist the new session without overwriting its empty history
    try {
      const payload = {
        ...currentCase,
        argumentsData: {
          ...(currentCase.argumentsData || {}),
          sessions: updatedSessions,
          activeSessionId: newSessionId
        }
      };
      const response = await apiService.updateProject(currentCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
    } catch (err) {
      console.error("Failed to save new chat session", err);
    }

    // Focus the input after a short delay
    setTimeout(() => {
      const chatInput = document.querySelector('input[placeholder="Describe case details or ask litigation questions..."]');
      if (chatInput) chatInput.focus();
    }, 100);
    setIsCreatingChat(false);
  };

  const switchSession = async (sessionId) => {
    if (!currentCase) return;
    const sess = sessions.find(s => s.id === sessionId);
    if (sess) {
      setActiveSessionId(sessionId);
      setMessages(sess.messages);

      try {
        const payload = {
          ...currentCase,
          argumentsData: {
            ...(currentCase.argumentsData || {}),
            activeSessionId: sessionId
          }
        };
        const response = await apiService.updateProject(currentCase._id, payload);
        if (onUpdateCase) onUpdateCase(response);
      } catch (err) {
        console.error("Failed to switch session", err);
      }

      setTimeout(() => {
        const chatInput = document.querySelector('input[placeholder="Describe case details or ask litigation questions..."]');
        if (chatInput) chatInput.focus();
      }, 100);
    }
  };


  const handleSendMessage = async (customPrompt = null, isAuto = false) => {
    const text = typeof customPrompt === 'string' ? customPrompt : inputValue;
    if (!text.trim() && attachments.length === 0) return;

    const currentAttachments = [...attachments];
    if (!isAuto) setAttachments([]);

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: currentAttachments.map(a => ({ name: a.name, type: a.type }))
    };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    if (!isAuto) setInputValue('');
    setIsGenerating(true);

    try {
      let caseContext = '';
      if (currentCase) {
        caseContext = `
[Active Case Context]
Case Name: ${currentCase.name}
Client: ${currentCase.clientName || 'N/A'}
Accused/Opponent: ${currentCase.accused || currentCase.opponentName || 'N/A'}
Court: ${currentCase.courtName || 'N/A'}
Summary/Facts: ${currentCase.summary || currentCase.caseSummary || currentCase.description || 'N/A'}
`;
      }

      const systemPrompt = `You are AISA™ — an enterprise-grade AI Litigation Architect and courtroom strategy engine.

CRITICAL INSTRUCTION: For EVERY response, you MUST generate a complete, structured legal argument report using EXACTLY the 12-section format below. Never respond in plain chat style. Never skip any section. Never change the structure. Only the legal content changes based on the user's case.

If the user asks a quick question, interpret it as a case scenario and still produce the full structured report.

MANDATORY REPORT FORMAT (use Markdown headings and formatting exactly as shown):

# ⚖️ AISA ARGUMENT INTELLIGENCE REPORT

---

## 1. CASE OVERVIEW
- **Case Title:**
- **Petitioner / Plaintiff / Prosecution:**
- **Respondent / Defendant / Accused:**
- **Court / Tribunal / Forum:**
- **Case Type:** (Civil / Criminal / Corporate / Labour / Family / Property / Tax / Consumer / Constitutional / Arbitration / Banking / Cyber / IPR / Service / etc.)
- **Applicable Law / Jurisdiction:**
- **Relevant Acts / Sections / IPC / BNS:**
- **Date of Filing / Incident:**

---

## 2. FACTS OF THE CASE
[Concise numbered factual summary — what happened, when, who, where, how]

---

## 3. LEGAL ISSUES
[Numbered list of the core legal questions the court must decide]

---

## 4. APPLICABLE LAWS & STATUTORY PROVISIONS
[List each relevant Act, Section, Article, Rule, Regulation with a one-line explanation of its applicability]

---

## 5. RELEVANT JUDGMENTS / LANDMARK CASES
[List at least 3–5 binding or persuasive precedents with citation, year, court, and relevant holding]

---

## 6. ARGUMENTS FOR THE PETITIONER / PLAINTIFF / PROSECUTION
### 6.1 Primary Legal Arguments
### 6.2 Supporting Statutory Provisions
### 6.3 Supporting Case Law & Precedents

---

## 7. ARGUMENTS FOR THE RESPONDENT / DEFENDANT
### 7.1 Counter-Arguments
### 7.2 Supporting Statutory Provisions
### 7.3 Supporting Case Law & Precedents

---

## 8. EVIDENCE ANALYSIS
### 8.1 Available Evidence
### 8.2 Missing / Weak Evidence
### 8.3 Evidence Strength Assessment
### 8.4 Evidence Weakness Assessment

---

## 9. LEGAL STRATEGY
### 9.1 Best Litigation Strategy
### 9.2 Courtroom Approach
### 9.3 Procedural Recommendations

---

## 10. RISK ANALYSIS
- **Strengths:**
- **Weaknesses:**
- **Litigation Risks:**
- **Estimated Success Probability:** [X%] — [Brief rationale]

---

## 11. RECOMMENDED NEXT STEPS
[Numbered action items — what the lawyer/client should do immediately and over the next 30/60/90 days]

---

## 12. FINAL LEGAL OPINION
[Clear, authoritative legal opinion — conclusion, strongest argument, recommended relief sought, and likelihood of success]

---

FORMATTING RULES:
- Always use the exact section numbers and headings above.
- Use **bold** for all key legal terms, section numbers, case names, and party names.
- Use bullet points or numbered lists within sections.
- Keep language formal, precise, and litigation-ready.
- Preserve all IPC/BNS section numbers, case citations, dates, and evidence IDs exactly.
- If the user selects Hindi output, write every section in Hindi but keep legal citations (section numbers, case names, Acts) in English.
- Do not add extra sections. Do not remove any section. Do not change heading names.
- This is a court-ready document, not a chat message.`;

      const apiAttachments = currentAttachments.map(att => ({
        url: att.dataUrl,
        name: att.name,
        type: att.type?.startsWith('image/') ? 'image' : 'document'
      }));

      let promptText = text;
      if (currentAttachments.length > 0) {
        const fileNames = currentAttachments.map(a => a.name).join(', ');
        promptText = `[Attached Files: ${fileNames}]\n${text || 'Please analyze these files.'}`;
      }

      const response = await generateChatResponse(
        newMsgs.filter(m => !m.isSystemLog),
        promptText + (caseContext ? `\n\nContext:\n${caseContext}` : ''),
        systemPrompt,
        apiAttachments,
        'English',
        null,
        'legal'
      );

      // Detect error responses (string error messages from the service)
      let reply = '';
      if (typeof response === 'string') {
        // These are error strings returned by generateChatResponse catch block
        if (
          response.includes('trouble connecting') ||
          response.includes('System Busy') ||
          response.includes('Log In') ||
          response.includes('System Message') ||
          response.includes('System Error') ||
          response.includes('LIMIT_REACHED')
        ) {
          toast.error(response.replace('Sorry, ', '').replace('[Log In](/login) to your AISA™ account to continue chatting.', 'Please log in to continue.'), { duration: 4000 });
          setIsGenerating(false);
          // Remove the user message from UI if AI completely failed
          setMessages(prev => prev.filter(m => m.id !== userMsg.id));
          setInputValue(text); // restore input
          return;
        }
        reply = response;
      } else if (response?.error) {
        const errMsg = response.message || 'Something went wrong. Please try again.';
        toast.error(errMsg, { duration: 4000 });
        setIsGenerating(false);
        setMessages(prev => prev.filter(m => m.id !== userMsg.id));
        setInputValue(text);
        return;
      } else {
        reply = response?.reply || response?.data?.reply || response?.text || '';
      }

      if (!reply) {
        toast.error('AI returned an empty response. Please try again.');
        setIsGenerating(false);
        setMessages(prev => prev.filter(m => m.id !== userMsg.id));
        setInputValue(text);
        return;
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: reply,
        timestamp: Date.now()
      };
      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      saveChatHistory(finalMsgs);
    } catch (e) {
      console.error('[ArgumentBuilder] Send error:', e);
      toast.error('Failed to generate response. Please check your connection.');
      // Restore user input so they can retry
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      setInputValue(text);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProceeding = async () => {
    if (!formEvent.trim()) {
      toast.error("Event/Proceeding Title is required");
      return;
    }
    if (!currentCase) {
      toast.error("An active case is required to save proceedings timeline.");
      return;
    }

    const tid = toast.loading("Syncing case timeline...");
    try {
      const newFact = {
        id: editingFactId || Date.now().toString(),
        event: formEvent,
        date: formDate || new Date().toISOString(),
        description: formDescription,
        witnessName: formWitnessName,
        witnessType: formWitnessType,
        mainArgs: formMainArgs,
        counterArgs: formCounterArgs,
        outcome: formOutcome,
        nextStep: formNextStep,
        questions: formWitnessQuestions.filter(q => q.trim() !== '')
      };

      const existingFacts = currentCase.facts || [];
      let updatedFacts;
      if (editingFactId) {
        updatedFacts = existingFacts.map(f => f.id === editingFactId || f._id === editingFactId ? { ...f, ...newFact } : f);
      } else {
        updatedFacts = [...existingFacts, newFact];
      }

      const payload = {
        ...currentCase,
        facts: updatedFacts
      };

      const response = await apiService.updateProject(currentCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);

      toast.success(editingFactId ? "Proceeding updated! ✅" : "Proceeding added to timeline! ✅", { id: tid });
      
      // Reset form
      setFormEvent('');
      setFormDate('');
      setFormDescription('');
      setFormWitnessName('');
      setFormWitnessType('Prosecution/Plaintiff');
      setFormMainArgs('');
      setFormCounterArgs('');
      setFormOutcome('');
      setFormNextStep('');
      setFormWitnessQuestions(['']);
      setEditingFactId(null);
      
      setActiveTab('timeline');
    } catch (e) {
      toast.error("Failed to sync case facts", { id: tid });
    }
  };

  const handleEditFact = (fact) => {
    setEditingFactId(fact.id || fact._id);
    setFormEvent(fact.event || '');
    setFormDate(fact.date ? new Date(fact.date).toISOString().split('T')[0] : '');
    setFormDescription(fact.description || '');
    setFormWitnessName(fact.witnessName || '');
    setFormWitnessType(fact.witnessType || 'Prosecution/Plaintiff');
    setFormMainArgs(fact.mainArgs || '');
    setFormCounterArgs(fact.counterArgs || '');
    setFormOutcome(fact.outcome || '');
    setFormNextStep(fact.nextStep || '');
    setFormWitnessQuestions(fact.questions && fact.questions.length > 0 ? fact.questions : ['']);
    setActiveTab('form');
  };

  const handleDeleteFact = async (factId) => {
    if (!currentCase) return;
    if (window.confirm("Are you sure you want to delete this event from the timeline?")) {
      const tid = toast.loading("Syncing case timeline...");
      try {
        const updatedFacts = (currentCase.facts || []).filter(f => f.id !== factId && f._id !== factId);
        const payload = {
          ...currentCase,
          facts: updatedFacts
        };
        const response = await apiService.updateProject(currentCase._id, payload);
        if (onUpdateCase) onUpdateCase(response);
        toast.success("Event removed", { id: tid });
      } catch (e) {
        toast.error("Failed to delete event", { id: tid });
      }
    }
  };

  return (
    <>
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
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">Argument Builder</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">COURTROOM INTELLIGENCE ACTIVE</span>
            </div>
          </div>
        </div>
        {/* Build Argument Button */}
        <button
          onClick={() => setShowBuildArgument(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-black transition-all shadow-md shadow-violet-500/20 active:scale-95 shrink-0"
          title="Build Argument"
        >
          <Scale size={15} className="shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Build Argument</span>
        </button>


      </div>

      <div className="flex-1 overflow-y-auto min-h-0 select-text relative">
        {/* TAB 1: AI ASSISTANT CHAT */}
        {activeTab === 'assistant' && (
          <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-transparent">
            {/* Scrollable messages area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.length === 1 && (
                <div className="max-w-7xl mx-auto px-4 space-y-6 w-full">
                  {/* Category selections */}
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">⋄ PRESET SIMULATIONS & ENGINES</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                    {WORKFLOW_CATEGORIES.map(cat => (
                      <div key={cat.title} className="bg-white dark:bg-[#1A2540] rounded-3xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-md hover:scale-[1.01] transition-all duration-300 flex flex-col h-[340px]">
                        <div className="flex items-center gap-2 mb-4 shrink-0">
                          {cat.icon}
                          <h4 className="text-xs font-black tracking-widest text-indigo-600 uppercase">{cat.title}</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1.5 custom-scrollbar flex-1">
                          {cat.items.map(item => (
                            <button
                              key={item.name}
                              onClick={() => handleSendMessage(item.name)}
                              className="text-left p-3 bg-slate-50 dark:bg-[#131C31] hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-2xl transition-all group min-h-[56px] shrink-0 flex flex-col justify-center"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-indigo-600">{item.name}</span>
                                <Zap size={12} className="text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all shrink-0" />
                              </div>
                              <p className="text-[10px] text-subtext font-semibold mt-1 leading-snug">{item.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {messages.length > 1 && messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex max-w-3xl ${msg.role === 'user' ? 'justify-end ml-auto' : 'mr-auto'} gap-4`}>
                  {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black tracking-tighter shrink-0 shadow-md">
                      AI
                    </div>
                  )}
                  <div className={`p-5 rounded-3xl text-sm leading-relaxed break-words ${msg.role === 'user' ? 'bg-slate-100 dark:bg-[#1e293b] text-slate-900 dark:text-slate-100 rounded-tr-none shadow-sm' : 'bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-tl-none text-slate-800 dark:text-slate-200 shadow-sm'}`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {msg.attachments.map((att, idx) => (
                          <div key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${msg.role === 'user' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700'}`}>
                            {getFileIcon(att.type)}
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.role === 'user' || msg.isSystemLog ? (
                      <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap select-text">
                        {msg.content}
                      </div>
                    ) : (
                      <AiResponseCard msg={msg} />
                    )}
                  </div>
                </div>
              ))}

              {isGenerating && (
                <div className="flex items-center gap-3 mr-auto max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shrink-0 animate-pulse">
                    AI
                  </div>
                  <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 p-4 rounded-3xl rounded-tl-none flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* ── NEW CHAT BUTTON — above input bar, left-aligned (mirrors LegalChatScreen) ── */}
            <div className="w-full px-4 pb-2 flex justify-start shrink-0">
                <button
                  type="button"
                  className="ab-new-chat-inline"
                  onClick={handleNewChat}
                  disabled={isCreatingChat}
                  title="Start New Chat"
                >
                <Plus size={14} />
                <span>New Chat</span>
              </button>
            </div>

            {/* Bottom input — matches General Legal Chat exactly */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`ab-chat-input-area flex flex-col gap-2 transition-all ${isDragging ? 'bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-500' : ''}`}
            >
              {/* File preview chips */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full text-xs font-semibold">
                      {getFileIcon(att.type)}
                      <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-200">{att.name}</span>
                      {att.isUploading ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">{att.progress}%</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
                        </div>
                      ) : (
                        <button onClick={() => removeAttachment(att.id)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="ab-chat-input-row">
                {/* Attachment button */}
                <div className="ab-chat-input-buttons">
                  <button
                    type="button"
                    className={`ab-input-action-btn${attachments.length > 0 ? ' active' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file (PDF, Word, Images, Legal Docs)"
                  >
                    <Paperclip size={18} style={{ color: attachments.length > 0 ? '#4f46e5' : undefined }} />
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                  style={{ display: 'none' }}
                />

                {/* Input form pill — mirrors General Legal Chat exactly */}
                <form
                  className="ab-chat-input-form"
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                >
                  <textarea
                    placeholder="Describe case details or ask litigation questions..."
                    value={inputValue}
                    onChange={e => {
                      setInputValue(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    className="ab-chat-input"
                  />
                  <button
                    type="submit"
                    className="ab-send-btn"
                    disabled={!inputValue.trim() && attachments.length === 0}
                    style={{ backgroundColor: (!inputValue.trim() && attachments.length === 0) ? '#94a3b8' : '#4f46e5' }}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>

              {/* Safe-area bottom spacer */}
              <div className="ab-safe-area-bottom" />
            </div>

            {/* Scoped CSS — mirrors General Legal Chat input area exactly */}
            <style>{`
              /* ── Professional Legal Report Renderer ────────────────────── */
              .ab-legal-report {
                font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
                font-size: 13.5px;
                line-height: 1.75;
                color: #1e293b;
                max-width: 100%;
                word-break: break-word;
              }
              .dark .ab-legal-report {
                color: #e2e8f0;
              }
              .ab-legal-report h1 {
                font-size: 17px;
                font-weight: 800;
                letter-spacing: -0.3px;
                margin: 20px 0 10px 0;
                padding-bottom: 8px;
                border-bottom: 2px solid rgba(99,102,241,0.25);
                line-height: 1.35;
                color: inherit;
              }
              .ab-legal-report h2 {
                font-size: 14.5px;
                font-weight: 800;
                color: #4f46e5;
                margin: 18px 0 7px 0;
                letter-spacing: 0.1px;
                line-height: 1.4;
              }
              .dark .ab-legal-report h2 { color: #818cf8; }
              .ab-legal-report h3 {
                font-size: 13px;
                font-weight: 700;
                color: #6366f1;
                margin: 13px 0 5px 0;
                line-height: 1.4;
              }
              .dark .ab-legal-report h3 { color: #a5b4fc; }
              .ab-legal-report h4 {
                font-size: 12px;
                font-weight: 700;
                color: #7c3aed;
                margin: 10px 0 4px 0;
                line-height: 1.4;
              }
              .dark .ab-legal-report h4 { color: #c4b5fd; }
              .ab-legal-report p {
                margin: 0 0 8px 0;
                font-size: 13.5px;
                line-height: 1.75;
                color: inherit;
              }
              .ab-legal-report ul {
                margin: 8px 0 12px 0;
                padding-left: 20px;
                list-style-type: disc;
                line-height: 1.75;
              }
              .ab-legal-report ol {
                margin: 8px 0 12px 0;
                padding-left: 22px;
                line-height: 1.75;
              }
              .ab-legal-report li {
                margin-bottom: 4px;
                font-size: 13.5px;
                color: inherit;
              }
              .ab-legal-report strong { font-weight: 700; }
              .ab-legal-report em { font-style: italic; }
              .ab-legal-report hr {
                border: none;
                border-top: 1.5px solid rgba(99,102,241,0.18);
                margin: 18px 0;
              }
              .ab-legal-report code {
                background: rgba(99,102,241,0.08);
                padding: 1px 5px;
                border-radius: 4px;
                font-size: 12px;
                font-family: monospace;
              }
              /* ── Chat input area ────────────────────────────────── */
              .ab-chat-input-area {
                flex-shrink: 0;
                padding: 8px 12px 0px 12px;
                background: #ffffff;
                border-top: 1px solid rgba(0,0,0,0.06);
              }
              .dark .ab-chat-input-area {
                background: #1e293b;
                border-top-color: rgba(255,255,255,0.06);
              }
              .ab-chat-input-row {
                display: flex;
                align-items: flex-end;
                gap: 10px;
                width: 100%;
              }
              .ab-chat-input-buttons {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
                margin-bottom: 4px;
              }
              .ab-input-action-btn {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f1f5f9;
                border: 1px solid rgba(0,0,0,0.06);
                color: #64748b;
                cursor: pointer;
                transition: all 0.2s ease;
                flex-shrink: 0;
              }
              .dark .ab-input-action-btn {
                background: #1e293b;
                border-color: rgba(255,255,255,0.06);
                color: #94a3b8;
              }
              .ab-input-action-btn:hover {
                color: #4f46e5;
                background: #e2e8f0;
                transform: scale(1.05);
              }
              .dark .ab-input-action-btn:hover {
                color: #818cf8;
                background: #334155;
              }
              .ab-input-action-btn.active {
                color: #4f46e5;
                background: rgba(79,70,229,0.1);
                border-color: rgba(79,70,229,0.2);
              }
              .dark .ab-input-action-btn.active {
                color: #818cf8;
                background: rgba(129,140,248,0.15);
                border-color: rgba(129,140,248,0.25);
              }
              .ab-chat-input-form {
                flex: 1;
                min-width: 0;
                display: flex;
                align-items: flex-end;
                gap: 6px;
                background: #f1f5f9;
                border-radius: 24px;
                padding: 6px 8px;
                border: 1px solid rgba(0,0,0,0.06);
                transition: border-color 0.2s;
              }
              .dark .ab-chat-input-form {
                background: #0f172a;
                border-color: rgba(255,255,255,0.06);
              }
              .ab-chat-input-form:focus-within {
                border-color: rgba(79,70,229,0.4);
              }
              .ab-new-chat-inline {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 5px 12px;
                border-radius: 20px;
                background: rgba(241,245,249,0.8);
                border: 1px solid rgba(0,0,0,0.08);
                color: #64748b;
                font-size: 11px;
                font-weight: 800;
                cursor: pointer;
                white-space: nowrap;
                flex-shrink: 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                transition: all 0.2s;
                min-height: 34px;
                width: auto;
                height: auto;
              }
              .dark .ab-new-chat-inline {
                background: rgba(255,255,255,0.05);
                border-color: rgba(255,255,255,0.08);
                color: #94a3b8;
              }
              .ab-new-chat-inline:hover {
                background: rgba(79,70,229,0.1);
                border-color: rgba(79,70,229,0.3);
                color: #4f46e5;
              }
              .dark .ab-new-chat-inline:hover {
                background: rgba(129,140,248,0.1);
                border-color: rgba(129,140,248,0.3);
                color: #818cf8;
              }
              .ab-new-chat-inline:active { transform: scale(0.96); }
              .ab-chat-input {
                flex: 1;
                border: none;
                outline: none;
                background: transparent;
                font-size: 14px;
                line-height: 1.5;
                resize: none;
                color: #1e293b;
                min-height: 34px;
                max-height: 120px;
                padding: 6px 4px;
                font-family: inherit;
                overflow-y: auto;
              }
              .dark .ab-chat-input { color: #e2e8f0; }
              .ab-chat-input::placeholder { color: #94a3b8; }
              .dark .ab-chat-input::placeholder { color: #475569; }
              @media (max-width: 1023px) {
                .ab-chat-input { font-size: max(16px, 0.9rem) !important; }
              }
              .ab-send-btn {
                width: 34px;
                height: 34px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                cursor: pointer;
                color: white;
                flex-shrink: 0;
                transition: all 0.2s;
              }
              .ab-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
              .ab-send-btn:not(:disabled):hover { transform: scale(1.05); }
              .ab-safe-area-bottom {
                height: env(safe-area-inset-bottom, 0px);
                flex-shrink: 0;
              }
              @media (max-width: 374px) {
                .ab-chat-input-area { padding: 5px 6px 0px; }
                .ab-chat-input-form { padding: 4px 6px; border-radius: 20px; }
                .ab-chat-input { font-size: 13px; min-height: 30px; }
                .ab-send-btn { width: 30px; height: 30px; }
                .ab-input-action-btn { width: 32px; height: 32px; }
                .ab-chat-input-buttons { gap: 4px; margin-bottom: 2px; }
                .ab-new-chat-inline span { display: none; }
                .ab-new-chat-inline { padding: 5px 6px; }
              }
              @media (min-width: 375px) and (max-width: 639px) {
                .ab-chat-input-area { padding: 6px 8px 0px; }
                .ab-input-action-btn { width: 34px; height: 34px; }
                .ab-chat-input-buttons { gap: 6px; margin-bottom: 3px; }
              }
              @media (min-width: 600px) and (max-width: 767px) {
                .ab-chat-input-area { padding: 8px 14px 0px; }
              }
              @media (min-width: 768px) {
                .ab-chat-input-area { padding: 10px 20px 0px; }
              }
              @media (min-width: 1280px) {
                .ab-chat-input-area { padding: 10px 24px 0px; }
              }
              @media (max-width: 1023px) and (orientation: landscape) and (max-height: 500px) {
                .ab-chat-input-area { padding: 4px 10px 0px; }
              }
            `}</style>
          </div>
        )}

        {/* TAB 2: PROCEEDINGS TIMELINE LIST */}
        {activeTab === 'timeline' && (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Court Proceedings Log</h3>
            
            {(!currentCase || !currentCase.facts || currentCase.facts.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl text-center bg-white dark:bg-zinc-900/30">
                <History size={48} className="text-slate-300 dark:text-zinc-700 mb-4" />
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">No court events scheduled</h4>
                <p className="text-xs text-subtext mt-1 max-w-[200px] font-semibold">Track witness depositions, cross-examinations, and legal timelines here.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-indigo-100 dark:before:bg-zinc-800">
                {currentCase.facts.map((fact) => (
                  <div key={fact.id || fact._id} className="relative group">
                    {/* Bullet marker */}
                    <div className="absolute left-[-23px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-4 border-slate-50 dark:border-zinc-900 shadow-sm" />
                    
                    <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">{fact.event}</h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            <Calendar size={12} />
                            <span>{new Date(fact.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditFact(fact)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-indigo-600"
                            title="Edit Event"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteFact(fact.id || fact._id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500"
                            title="Delete Event"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{fact.description}</p>

                      {fact.witnessName && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Presiding Witness</span>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{fact.witnessName}</p>
                            <span className="text-[9px] text-subtext font-semibold uppercase">{fact.witnessType}</span>
                          </div>
                          {fact.outcome && (
                            <div>
                              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Judicial Outcome</span>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{fact.outcome}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CRUD PROCEEDING FORM */}
        {activeTab === 'form' && (
          <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-[28px] p-6 shadow-md">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {editingFactId ? 'Edit Event Details' : 'Add Courtroom Proceeding / Fact'}
              </h3>
              <p className="text-xs text-subtext mt-1 font-semibold">File trial happenings, arguments, and testimonies into the litigation roadmap.</p>
            </div>

            <div className="space-y-6">
              {/* Event title and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Proceeding Title *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Cross Examination of Opponent" 
                    value={formEvent}
                    onChange={e => setFormEvent(e.target.value)}
                    className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Date *</label>
                  <input 
                    type="date" 
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Event Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Brief Overview / Factual Log</label>
                <textarea 
                  rows={3} 
                  placeholder="Record summary details..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              {/* Section 1: Witness Profile */}
              <div className="border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden bg-white dark:bg-[#1A2540]">
                <button
                  type="button"
                  onClick={() => setSection1Expanded(!section1Expanded)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200/50 dark:border-zinc-800"
                >
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Section 1: Witness Examination</span>
                  {section1Expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {section1Expanded && (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Witness Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Dr. K. Sen" 
                          value={formWitnessName}
                          onChange={e => setFormWitnessName(e.target.value)}
                          className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Affiliation</label>
                        <select 
                          value={formWitnessType}
                          onChange={e => setFormWitnessType(e.target.value)}
                          className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                        >
                          <option value="Prosecution/Plaintiff">Prosecution/Plaintiff</option>
                          <option value="Defense/Respondent">Defense/Respondent</option>
                          <option value="Expert Witness">Expert Witness</option>
                          <option value="Official/Third Party">Official/Third Party</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Arguments & Outcomes */}
              <div className="border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden bg-white dark:bg-[#1A2540]">
                <button
                  type="button"
                  onClick={() => setSection2Expanded(!section2Expanded)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200/50 dark:border-zinc-800"
                >
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Section 2: Arguments & Outcomes</span>
                  {section2Expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {section2Expanded && (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Our Primary Arguments</label>
                        <textarea 
                          rows={3} 
                          placeholder="Points structured..."
                          value={formMainArgs}
                          onChange={e => setFormMainArgs(e.target.value)}
                          className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-medium outline-none text-slate-800 dark:text-white resize-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Counterpoints / Rebuttals</label>
                        <textarea 
                          rows={3} 
                          placeholder="Opposition points challenge..."
                          value={formCounterArgs}
                          onChange={e => setFormCounterArgs(e.target.value)}
                          className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-medium outline-none text-slate-800 dark:text-white resize-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Hearing Outcome Summary</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Adjourned to next month"
                          value={formOutcome}
                          onChange={e => setFormOutcome(e.target.value)}
                          className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Next Strategic Step</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Gather document affidavits"
                          value={formNextStep}
                          onChange={e => setFormNextStep(e.target.value)}
                          className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveProceeding}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                {editingFactId ? 'Update Proceeding event' : 'Save Proceeding to Case timeline'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── BUILD ARGUMENT MODAL ────────────────────────────────── */}
    <BuildArgumentModal
      isOpen={showBuildArgument}
      onClose={() => setShowBuildArgument(false)}
      currentCase={currentCase}
      onUpdateCase={onUpdateCase}
    />
    
    </>
  );
};

export default ArgumentBuilder;
