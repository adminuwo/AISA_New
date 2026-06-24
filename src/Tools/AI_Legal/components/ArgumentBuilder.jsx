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
import BuildArgumentModal from './BuildArgumentModal';

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
  const [editingFactId, setEditingFactId] = useState(null);
  
  // Attachments and Drag & Drop States
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
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
    if (!currentCase) return;
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

    setTimeout(() => {
      const chatInput = document.querySelector('input[placeholder="Describe case details or ask litigation questions..."]');
      if (chatInput) chatInput.focus();
    }, 100);
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


  const handleSendMessage = async (customPrompt = null) => {
    const text = customPrompt || inputValue;
    if (!text.trim() && attachments.length === 0) return;

    const currentAttachments = [...attachments];
    setAttachments([]);

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: currentAttachments.map(a => ({ name: a.name, type: a.type }))
    };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInputValue('');
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

      const systemPrompt = `You are the AISA Enterprise Litigation Strategy War Room. You build courtroom arguments, rebuttals, cross-examination structures, and win probability reports.
Format response in clean Markdown.
Use professional Legal English.`;

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

        {/* History Icon Button + Panel */}
        {activeTab === 'assistant' && (
          <div className="relative">
            <button
              onClick={() => setShowHistoryPanel(v => !v)}
              title="Chat History"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold ${
                showHistoryPanel
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-600'
                  : 'bg-slate-100 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              <History size={16} />
              <span className="hidden sm:inline">History</span>
              {sessions.filter(s => s.title && s.title !== 'New Chat' && s.title !== 'Initial Conversation').length > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-black">
                  {sessions.filter(s => s.title && s.title !== 'New Chat' && s.title !== 'Initial Conversation').length}
                </span>
              )}
            </button>

            {/* History Dropdown Panel */}
            {showHistoryPanel && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHistoryPanel(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
                  {/* Panel Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                    <History size={14} className="text-indigo-600" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Chat History</span>
                  </div>

                  {/* Session List */}
                  <div className="max-h-72 overflow-y-auto py-1.5 custom-scrollbar">
                    {(() => {
                      const realSessions = sessions.filter(s => s.title && s.title.trim() !== '' && s.title !== 'New Chat' && s.title !== 'Initial Conversation');
                      if (realSessions.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <MessageSquare size={28} className="text-slate-300 dark:text-zinc-700" />
                          <p className="text-xs text-slate-400 font-semibold">No previous chats</p>
                        </div>
                      );
                      const pinned = realSessions.filter(s => pinnedSessions.includes(s.id));
                      const unpinned = realSessions.filter(s => !pinnedSessions.includes(s.id));
                      const renderItem = (s) => (
                        <div key={s.id} className="flex items-center gap-1 px-2 group">
                          <button
                            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-semibold ${
                              s.id === activeSessionId
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                            onClick={() => { switchSession(s.id); setShowHistoryPanel(false); }}
                          >
                            {pinnedSessions.includes(s.id)
                              ? <Pin size={11} className="text-amber-500 shrink-0" />
                              : <MessageSquare size={11} className="text-slate-400 shrink-0" />
                            }
                            <span className="truncate flex-1">{s.title || 'Untitled Chat'}</span>
                          </button>
                          {/* Pin & Delete Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => handleTogglePin(s.id, e)}
                              title={pinnedSessions.includes(s.id) ? 'Unpin' : 'Pin'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                pinnedSessions.includes(s.id)
                                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                  : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                              }`}
                            >
                              {pinnedSessions.includes(s.id) ? <PinOff size={12} /> : <Pin size={12} />}
                            </button>
                            <button
                              onClick={(e) => handleDeleteSession(s.id, e)}
                              title="Delete session"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                      return (
                        <div>
                          {pinned.length > 0 && (
                            <>
                              <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-amber-500">📌 Pinned</div>
                              {pinned.map(renderItem)}
                              {unpinned.length > 0 && <div className="mx-4 my-1 border-t border-slate-100 dark:border-white/5" />}
                            </>
                          )}
                          {unpinned.length > 0 && (
                            <>
                              {pinned.length > 0 && <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Recent</div>}
                              {unpinned.map(renderItem)}
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
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
                  <div className={`p-5 rounded-3xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/10' : 'bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-tl-none text-slate-800 dark:text-slate-200 shadow-sm'}`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {msg.attachments.map((att, idx) => (
                          <div key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${msg.role === 'user' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700'}`}>
                            {getFileIcon(att.type)}
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap select-text">
                      {msg.content}
                    </div>
                    {msg.role !== 'user' && !msg.isSystemLog && (
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            toast.success("Copied to clipboard");
                          }}
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600"
                        >
                          <Copy size={12} />
                          <span>Copy</span>
                        </button>
                        <button 
                          onClick={() => {
                            const blob = new Blob([msg.content], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `courtroom_strategy_${Date.now()}.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600"
                        >
                          <FileDown size={12} />
                          <span>Download</span>
                        </button>
                      </div>
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

            {/* Bottom prompt input for chat */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-4 bg-white dark:bg-[#0c0c14] border-t border-slate-200 dark:border-white/5 shrink-0 flex flex-col gap-2 transition-all ${isDragging ? 'bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-500' : ''}`}
            >
              {/* File preview chips */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
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

              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex items-center gap-1.5 px-4 h-12 bg-slate-50 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-full text-slate-500 hover:text-indigo-600 active:scale-95 transition-all shrink-0 font-bold text-xs"
                  title="Start New Chat"
                >
                  <Plus size={16} />
                  <span>New Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-full text-slate-500 hover:text-indigo-600 active:scale-95 transition-all shrink-0"
                  title="Upload attachment (PDF, Word, Images, Legal Docs)"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                  className="hidden"
                />
                
                <input 
                  type="text"
                  placeholder="Describe case details or ask litigation questions..."
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 rounded-full px-5 py-3.5 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all min-w-0"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-95 transition-all shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
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
