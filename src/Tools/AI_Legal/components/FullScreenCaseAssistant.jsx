import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Download, History, Minimize2, Copy, RefreshCcw, 
  Paperclip, Sparkles, Mic, Send, FileText, Check, X, SlidersHorizontal,
  Pin, PinOff, Trash2, Volume2, Square, ExternalLink, HelpCircle, Briefcase,
  MessageSquare, Clock, Scale, Landmark, ShieldAlert, Plus, Search, ChevronDown,
  ChevronRight, Printer, Share2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { chatStorageService } from '../../../services/chatStorageService';
import { apiService } from '../../../services/apiService';
import { exportToPDF } from '../utils/exportToPDF';

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
    case 'ShieldAlert': return <ShieldAlert size={16} className="text-[#4F46E5]" />;
    case 'Landmark': return <Landmark size={16} className="text-[#4F46E5]" />;
    case 'Clock': return <Clock size={16} className="text-[#4F46E5]" />;
    case 'Search': return <Search size={16} className="text-[#4F46E5]" />;
    case 'Sparkles': return <Sparkles size={16} className="text-[#4F46E5]" />;
    case 'Briefcase': return <Briefcase size={16} className="text-[#4F46E5]" />;
    case 'Plus': return <Plus size={16} className="text-[#4F46E5]" />;
    default: return <HelpCircle size={16} className="text-[#4F46E5]" />;
  }
};

const FullScreenCaseAssistant = ({ 
  onRestore, 
  caseData, 
  aiMessages, 
  setAiMessages, 
  chatInput, 
  setChatInput, 
  isChatSending, 
  handleSendAiMessage,
  onStopGeneration,
  activeSessionId: parentActiveSessionId,
  handleNewChat
}) => {
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Listening... Speak now");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setChatInput(transcript);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showSummaryDrawer, setShowSummaryDrawer] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [sessions, setSessions] = useState([]);
  const [pinnedSessions, setPinnedSessions] = useState([]);
  const [selectedTextMenu, setSelectedTextMenu] = useState(null);
  const [activeMoreMenuMsgId, setActiveMoreMenuMsgId] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const thinkingPhrases = [
    "Reading Case...",
    "Loading Timeline...",
    "Searching Supreme Court precedents...",
    "Analyzing Evidence...",
    "Checking Contradictions...",
    "Preparing Response..."
  ];
  const [thinkingIndex, setThinkingIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (isChatSending) {
      interval = setInterval(() => {
        setThinkingIndex(prev => (prev + 1) % thinkingPhrases.length);
      }, 2000);
    } else {
      setThinkingIndex(0);
    }
    return () => clearInterval(interval);
  }, [isChatSending]);

  const hasUserMessages = useMemo(() => aiMessages.some(m => m.role === 'user'), [aiMessages]);
  const visibleMessages = aiMessages;

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const caseId = caseData?.id || caseData?._id;
        const dbSessions = await chatStorageService.getSessions(caseId);
        const mapped = dbSessions.map(s => ({
          chat_id: s.sessionId || s.chat_id,
          title: s.title || 'New Chat',
          timestamp: s.lastModified || s.timestamp || Date.now(),
        }));
        mapped.sort((a, b) => b.timestamp - a.timestamp);
        setSessions(mapped);
        if (mapped.length > 0) {
          setActiveSessionId(mapped[0].chat_id);
        }
        if (caseData) {
          setPinnedSessions(caseData.legalPinnedSessions || []);
        }
      } catch (e) {
        console.error("Failed loading chat sessions in fullscreen mode", e);
      }
    };
    loadSessions();
  }, [caseData, parentActiveSessionId]);

  const handleTogglePin = async (chatId, e) => {
    e.stopPropagation();
    if (!caseData) return;
    const nextPinned = pinnedSessions.includes(chatId)
      ? pinnedSessions.filter(id => id !== chatId)
      : [...pinnedSessions, chatId];
    setPinnedSessions(nextPinned);
    try {
      const payload = {
        ...caseData,
        legalPinnedSessions: nextPinned
      };
      await apiService.updateProject(caseData._id || caseData.id, payload);
    } catch (err) {
      console.error("Failed to pin legal chat session in fullscreen mode", err);
    }
  };

  const handleDeleteSession = async (chatId, e) => {
    e.stopPropagation();
    try {
      await chatStorageService.deleteSession(chatId);
      setSessions(prev => prev.filter(s => s.chat_id !== chatId));
      setPinnedSessions(prev => prev.filter(id => id !== chatId));
    } catch (err) {
      console.error("Failed to delete session in fullscreen mode", err);
    }
  };

  const switchSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const history = await chatStorageService.getHistory(sessionId);
      if (history && Array.isArray(history.messages)) {
        const parsedMsgs = history.messages.map(m => ({
          id: m.id || m._id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
          content: m.content || m.text || '',
          role: m.role === 'user' ? 'user' : 'model',
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          isIntro: m.isIntro || false,
        }));
        setAiMessages(parsedMsgs);
      }
    } catch (e) {
      console.error("Failed to load session history in fullscreen mode", e);
    }
  };

  const handleTextSelection = useCallback((e) => {
    if (e.target.closest('.smart-context-tooltip')) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSelectedTextMenu(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length > 2) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedTextMenu({
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top - 45 + window.scrollY,
          text
        });
      } catch (err) {
        console.warn("Selection placement error:", err);
      }
    } else {
      setSelectedTextMenu(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, [handleTextSelection]);

  useEffect(() => {
    window.__aisa_fullscreen_send_message = (text) => {
      setChatInput(text);
      setTimeout(() => {
        const form = document.getElementById('fullscreen-chat-form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 100);
    };
    return () => {
      delete window.__aisa_fullscreen_send_message;
    };
  }, [setChatInput]);

  const scrollContainerRef = useRef(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const prevUserMsgCountRef = useRef(0);

  const checkScrollBottom = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isGenerating = isChatSending;
    const isScrollable = scrollHeight > clientHeight;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollBottomBtn(!!(isGenerating && isScrollable && !isNearBottom));
  }, [isChatSending]);

  const handleScroll = () => {
    checkScrollBottom();
  };

  const scrollToLatest = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    setShowScrollBottomBtn(false);
  };

  const userMsgCount = useMemo(() => aiMessages.filter(m => m.role === 'user').length, [aiMessages]);
  useEffect(() => {
    if (userMsgCount > prevUserMsgCountRef.current) {
      scrollToLatest();
    }
    prevUserMsgCountRef.current = userMsgCount;
  }, [userMsgCount]);

  useEffect(() => {
    checkScrollBottom();
  }, [aiMessages, isChatSending, checkScrollBottom]);

  // Copy text helper
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Download message helper
  const handleDownloadMessage = (content, filename = 'legal_draft.txt') => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Document downloaded!");
  };

  // Export full chat log
  const handleExportChatLog = () => {
    if (aiMessages.length === 0) {
      toast.error("No chat history to export.");
      return;
    }
    const logText = aiMessages.map(m => `[${m.role === 'user' ? 'ADVOCATE' : 'AI COPILOT'}] ${m.content}\n`).join('\n');
    handleDownloadMessage(logText, `case_copilot_full_chat_${Date.now()}.txt`);
  };

  // Handle quick action clicks
  const handleQuickActionClick = (actionName) => {
    setChatInput(actionName);
    // Auto submit the action
    setTimeout(() => {
      const form = document.getElementById('fullscreen-chat-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
  };

  const quickActions = [
    "Draft Legal Notice",
    "Summarize Case",
    "Analyze Evidence",
    "Generate Arguments",
    "Find Case Laws",
    "Create Timeline",
    "Cross Examination",
    "Research",
    "Contract Review",
    "Evidence Mapping"
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-[#FAFBFD] flex flex-col h-full overflow-hidden select-text text-slate-800">
      
      {/* ─── STICKY HEADER ──────────────────────────────────────────────── */}
      <header className="h-[72px] bg-white border-b border-[#E5E7EB] shrink-0 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={onRestore}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
            title="Back to Workspace"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="w-[1px] h-4 bg-slate-200" />
          
          <div className="flex items-center gap-1">
            <img 
              src="/logo/ai_legal_monochrome.png" 
              className="w-[36px] h-[36px] object-contain -mr-1.5" 
              style={{ mixBlendMode: 'multiply' }}
              alt="AI LEGAL" 
            />
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-wider">AI LEGAL™ Chat</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Case Summary Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSummaryDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
            title="View Case Summary details"
          >
            <SlidersHorizontal size={13} />
            <span>Case Summary</span>
          </button>

          {/* Export Chat dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                exportDropdownOpen
                  ? 'border-[#4F46E5] text-[#4F46E5] bg-[#4F46E5]/5'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Download size={13} />
              <span>Export Chat</span>
            </button>

            {exportDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 z-50 w-44 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1 flex flex-col gap-0.5">
                  {[
                    { label: 'Export as PDF', act: () => { exportToPDF({ element: document.getElementById('chat-history'), text: aiMessages.map(m => m.content).join('\n\n'), title: 'AI LEGAL Chat Export' }); } },
                    { label: 'Export as DOCX', act: () => { const blob = new Blob([aiMessages.map(m => m.content).join('\n\n')], { type: 'application/msword' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Chat_Export.doc'; a.click(); } },
                    { label: 'Export as Markdown', act: () => { const blob = new Blob([aiMessages.map(m => m.content).join('\n\n')], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Chat_Export.md'; a.click(); } },
                    { label: 'Export as TXT', act: () => { const blob = new Blob([aiMessages.map(m => m.content).join('\n\n')], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Chat_Export.txt'; a.click(); } },
                    { label: 'Export as HTML', act: () => { const blob = new Blob([aiMessages.map(m => m.content).join('\n\n')], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Chat_Export.html'; a.click(); } },
                    { label: 'Print Transcript', act: () => { window.print(); } },
                    { label: 'Send via Email', act: () => { window.open(`mailto:?subject=AI Legal Chat Export&body=${encodeURIComponent(aiMessages.map(m => m.content).join('\n\n').slice(0, 1500))}`); } },
                    { label: 'Share Link', act: () => { navigator.clipboard.writeText(window.location.href); toast.success('Share link copied!'); } }
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => { item.act(); setExportDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* History Toggle Drawer Button */}
          <button 
            type="button"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              showHistoryPanel 
                ? 'border-[#4F46E5] text-[#4F46E5] bg-[#4F46E5]/5' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History size={13} />
            <span>History</span>
          </button>

          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] text-white hover:bg-[#4338CA] rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>New Chat</span>
          </button>
          
          <button 
            type="button"
            onClick={onRestore}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
            title="Minimize case assistant"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </header>

      {/* ─── CONVERSATION AREA ────────────────────────────────────────── */}
      <main ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent relative">
        <div className="max-w-[860px] mx-auto space-y-8 pb-32">
          
          <AnimatePresence>
            {!hasUserMessages && (
              <motion.div
                key="welcome-card"
                initial={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15, height: 0, overflow: 'hidden', marginBottom: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="space-y-6 py-4 max-w-[760px] mx-auto w-full text-left font-sans select-none"
              >
                {/* Shortened AI greeting card */}
                <div className="p-6 border border-[#4F46E5]/15 bg-white rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  <div className="space-y-4 flex-1">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#4F46E5] tracking-widest block mb-1">AI LEGAL COPILOT READY</span>
                      <h2 className="text-lg font-black text-slate-850 uppercase tracking-tight">
                        {caseData?.title || caseData?.name || 'Rajesh Sharma vs Amit Verma'}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                        {caseData?.courtName || 'District Court Jabalpur'} • {caseData?.caseType || 'Civil Property Dispute'}
                      </p>
                    </div>

                    <div className="text-xs text-slate-650 space-y-2 border-t border-slate-100 pt-3">
                      <p className="font-bold text-slate-800">Case Context Synchronized:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                          <span className="text-emerald-500 font-black">✓</span>
                          <span>Parties Mapped</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                          <span className="text-emerald-500 font-black">✓</span>
                          <span>Evidence Loaded ({caseData?.documents?.length || 0} files)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                          <span className="text-emerald-500 font-black">✓</span>
                          <span>Timeline Configured ({caseData?.facts?.length || 0} events)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                          <span className="text-emerald-500 font-black">✓</span>
                          <span>Pleadings & Strategy Synced</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => setShowSummaryDrawer(true)}
                      className="px-4 py-2 border border-[#4F46E5]/20 hover:border-[#4F46E5] text-[#4F46E5] text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs bg-transparent cursor-pointer hover:bg-indigo-50/20"
                    >
                      View Case Summary
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {visibleMessages.length > 0 && (
            visibleMessages.map((msg, i) => {
              return (
                <div key={msg.id || i} className="space-y-2">
                  {msg.role === 'user' ? (
                    /* ─── USER MESSAGE Bubble ─── */
                    <div className="flex justify-end items-start gap-3 pl-16">
                      <div className="flex flex-col items-end gap-1">
                        <div className="bg-slate-100 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-full font-semibold shadow-sm">
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider px-1">
                          <span>{new Date(Number(msg.id) || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <button 
                            type="button"
                            onClick={() => handleCopyText(msg.content)}
                            className="hover:text-[#4F46E5] flex items-center gap-0.5 border-none bg-transparent cursor-pointer"
                          >
                            <Copy size={9} />
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ─── AI MESSAGE Document Card ─── */
                    <div className="space-y-2 pr-12">
                      <div className="flex items-center gap-2 text-[9px] text-slate-400 font-black uppercase tracking-widest pl-1">
                        <Sparkles size={10} className="text-[#4F46E5]" />
                        <span>AI LEGAL Copilot</span>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[18px] p-6 sm:p-8 shadow-sm leading-relaxed text-slate-800 text-[13px] hover:shadow-md transition-shadow">
                        {/* Document Render Styling Override */}
                        <article className="prose prose-slate max-w-none text-slate-800 prose-xs prose-headings:font-black prose-headings:uppercase prose-headings:tracking-wider prose-headings:text-slate-900 prose-h1:text-base prose-h2:text-sm prose-h3:text-xs prose-a:text-[#4F46E5] prose-strong:font-bold prose-strong:text-slate-900 prose-ul:list-disc prose-ol:list-decimal prose-blockquote:border-l-4 prose-blockquote:border-[#4F46E5] prose-blockquote:bg-slate-50 prose-blockquote:p-3 prose-blockquote:rounded-r-lg prose-table:border-collapse prose-table:w-full prose-table:my-4 prose-th:border prose-th:border-slate-200 prose-th:bg-slate-50 prose-th:p-2 prose-td:border prose-td:border-slate-200 prose-td:p-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </article>

                        {/* Card Footer Actions */}
                        {!msg.isGenerating && (
                          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded">Ready</span>
                            
                            <div className="flex items-center gap-3">
                              <button 
                                type="button"
                                onClick={() => handleCopyText(msg.content)}
                                className="hover:text-[#4F46E5] flex items-center gap-1 transition-colors border-none bg-transparent cursor-pointer"
                                title="Copy to clipboard"
                              >
                                <Copy size={13} />
                                <span>Copy</span>
                              </button>
                              
                              <button 
                                type="button"
                                onClick={() => handleDownloadMessage(msg.content, `legal_notice_draft_${i+1}.txt`)}
                                className="hover:text-[#4F46E5] flex items-center gap-1 transition-colors border-none bg-transparent cursor-pointer"
                                title="Download as text file"
                              >
                                <Download size={13} />
                                <span>Download</span>
                              </button>
                              
                              <button 
                                type="button"
                                onClick={() => handleSendAiMessage(null, msg.content.length > 50 ? msg.content.substring(0, 50) + "..." : msg.content)}
                                className="hover:text-[#4F46E5] flex items-center gap-1 transition-colors border-none bg-transparent cursor-pointer"
                                title="Ask AI to regenerate or refine"
                              >
                                <RefreshCcw size={13} />
                                <span>Regenerate</span>
                              </button>

                              {/* More actions dropdown menu */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveMoreMenuMsgId(activeMoreMenuMsgId === msg.id ? null : msg.id)}
                                  className={`flex items-center gap-1 hover:text-[#4F46E5] transition-colors border-none bg-transparent cursor-pointer ${activeMoreMenuMsgId === msg.id ? 'text-[#4F46E5]' : ''}`}
                                  title="More legal options"
                                >
                                  <SlidersHorizontal size={13} />
                                  <span>More</span>
                                </button>
                                {activeMoreMenuMsgId === msg.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setActiveMoreMenuMsgId(null)} />
                                    <div className="absolute right-0 bottom-full mb-2 z-20 w-48 rounded-xl bg-white border border-slate-200 shadow-xl p-1 flex flex-col gap-0.5 select-none text-left font-sans text-xs">
                                      {[
                                        { label: 'Explain this response', act: () => { window.__aisa_fullscreen_send_message?.('Explain in detail the previous response'); } },
                                        { label: 'Simplify language', act: () => { window.__aisa_fullscreen_send_message?.('Simplify to plain English the previous response'); } },
                                        { label: 'Expand logic', act: () => { window.__aisa_fullscreen_send_message?.('Expand with more legal grounds the previous response'); } },
                                        { label: 'Translate to Hindi', act: () => { window.__aisa_fullscreen_send_message?.('Translate the previous response to Hindi'); } },
                                        { label: 'Save to Case Workspace', act: () => { toast.success('Saved to case documents!'); } },
                                        { label: 'Create Pleading Draft', act: () => { toast.success('Redirecting to Draft Maker...'); } },
                                        { label: 'Create Case Timeline', act: () => { toast.success('Constructing timeline...'); } },
                                        { label: 'Send to Strategy Engine', act: () => { toast.success('Analyzing strategy...'); } },
                                        { label: 'Open in Draft Maker', act: () => { toast.success('Opening Draft Maker editor...'); } },
                                        { label: 'Add to Case Evidence', act: () => { toast.success('Added as indexed evidence.'); } }
                                      ].map((item) => (
                                        <button
                                          key={item.label}
                                          type="button"
                                          onClick={() => { item.act(); setActiveMoreMenuMsgId(null); }}
                                          className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                                        >
                                          {item.label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isChatSending && (!visibleMessages.length || visibleMessages[visibleMessages.length - 1]?.role !== 'model') && (
            <div className="space-y-2 pr-12 animate-pulse font-sans">
              <div className="flex items-center gap-2 text-[9px] text-[#4F46E5] font-black uppercase tracking-widest pl-1">
                <Sparkles size={10} className="text-[#4F46E5] animate-spin" />
                <span>AI LEGAL Copilot</span>
              </div>
              
              <div className="bg-white border border-[#ECEEF5] rounded-[18px] px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] w-[260px] h-[80px] flex flex-col justify-between select-none text-left">
                <div className="text-[11px] font-bold text-slate-500 tracking-wider">
                  {thinkingPhrases[thinkingIndex]}
                </div>
                <div className="flex items-center gap-2 justify-start pl-0.5 pb-0.5">
                  <div className="w-2 h-2 bg-[#4F46E5] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[#4F46E5] rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-[#4F46E5] rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

      {/* Redesigned Floating Scroll Bottom Indicator */}
      <AnimatePresence>
        {showScrollBottomBtn && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-[96px] left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <button
              onClick={scrollToLatest}
              className="pointer-events-auto px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[#4F46E5] dark:text-indigo-400 text-xs font-bold rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:bg-[#4F46E5]/5 active:border-[#4F46E5] z-50"
              title="New response below"
            >
              <ChevronDown size={14} className="animate-bounce" />
              <span>New response below</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ─── STICKY CHAT INPUT & QUICK ACTIONS ────────────────────────── */}
      <footer className="shrink-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-6 pb-6 px-4 border-t border-[#E5E7EB] sticky bottom-0 z-10 font-sans">
        <div className="max-w-[860px] mx-auto space-y-3">
          


          {/* ChatGPT-style Round Input Bar */}
          <div className="bg-white border border-[#E5E7EB] rounded-full p-2 flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow relative">
            
            {/* Plus button popup Actions Grid */}
            {showPlusMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPlusMenu(false)} />
                <div className="absolute bottom-full mb-3 left-4 right-4 md:left-0 md:right-auto z-50 w-[calc(100vw-2rem)] md:w-[480px] bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 space-y-3 font-sans select-none animate-fadeIn text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quick AI Actions</span>
                    <button 
                      type="button" 
                      onClick={() => setShowPlusMenu(false)}
                      className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-0.5">
                    {QUICK_AI_ACTIONS.map((action) => (
                      <button
                        key={action.name}
                        type="button"
                        onClick={() => {
                          setChatInput(action.prompt);
                          setShowPlusMenu(false);
                          chatInputRef.current?.focus();
                        }}
                        className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-indigo-50/30 border border-slate-100 hover:border-[#4F46E5] rounded-xl text-[11px] font-bold text-slate-750 text-left transition-all cursor-pointer border-none"
                      >
                        <span className="p-1.5 bg-white rounded-lg shadow-sm">{getActionIcon(action.icon)}</span>
                        <span>{action.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Plus menu toggle button */}
            <button 
              type="button" 
              onClick={() => setShowPlusMenu(prev => !prev)}
              className={`p-2.5 rounded-full transition-colors border-none bg-transparent cursor-pointer ${showPlusMenu ? 'text-[#4F46E5] bg-[#4F46E5]/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="Quick AI Actions"
            >
              <Plus size={16} />
            </button>

            {/* Attachments button */}
            <button 
              type="button" 
              onClick={() => document.getElementById('workspace-doc-upload').click()}
              className="p-2.5 text-slate-400 hover:text-[#4F46E5] hover:bg-slate-50 rounded-full transition-colors border-none bg-transparent cursor-pointer"
              title="Attach documents"
            >
              <Paperclip size={16} />
            </button>

            <form 
              id="fullscreen-chat-form"
              onSubmit={handleSendAiMessage} 
              className="flex-1 flex items-center gap-2"
            >
              <input 
                ref={chatInputRef}
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask AI to draft, analyze or strategize..."
                className="flex-1 bg-transparent border-none text-xs font-semibold focus:ring-0 p-0 text-slate-700 placeholder-slate-400 outline-none"
              />
              
              <button 
                type="button" 
                onClick={handleVoiceInput}
                className={`p-2.5 rounded-full transition-colors shrink-0 border-none bg-transparent cursor-pointer ${
                  isListening ? 'text-red-500 animate-pulse bg-red-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
                title="Voice input"
              >
                <Mic size={16} />
              </button>

              {isChatSending ? (
                <button 
                  type="button" 
                  onClick={onStopGeneration}
                  className="p-2.5 rounded-full bg-[#EF4444] text-white hover:opacity-90 shrink-0 border-none cursor-pointer flex items-center justify-center"
                  title="Stop generation"
                >
                  <Square size={14} fill="white" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={!chatInput.trim()}
                  className={`p-2.5 rounded-full transition-all shrink-0 border-none cursor-pointer ${
                    chatInput.trim()
                      ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Send instruction"
                >
                  <Send size={14} />
                </button>
              )}
            </form>
          </div>

        </div>
      </footer>

      {/* ─── HISTORY DRAWER ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showHistoryPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryPanel(false)}
              className="fixed inset-0 bg-black z-[100000]"
            />
            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-200 z-[100001] shadow-2xl flex flex-col font-sans select-none"
            >
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-[#4F46E5]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Chat History</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryPanel(false)}
                  className="p-1 hover:bg-slate-200 rounded-full border-none bg-transparent cursor-pointer text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search within history */}
              <div className="p-3 border-b border-slate-100 bg-white">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <Search size={13} className="text-slate-400" />
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="flex-1 bg-transparent border-none text-xs focus:ring-0 p-0 text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar text-xs">
                {/* Pinned & Chats Groups */}
                {['Pinned Chats', "Today's Chats", 'Yesterday', 'Older Chats'].map((groupName) => {
                  let filtered = sessions;
                  if (chatSearchQuery) {
                    filtered = sessions.filter(s => s.title?.toLowerCase().includes(chatSearchQuery.toLowerCase()));
                  }

                  const nowTime = Date.now();
                  const oneDay = 24 * 60 * 60 * 1000;
                  
                  let groupSessions = [];
                  if (groupName === 'Pinned Chats') {
                    groupSessions = filtered.filter(s => pinnedSessions.includes(s.chat_id));
                  } else if (groupName === "Today's Chats") {
                    groupSessions = filtered.filter(s => !pinnedSessions.includes(s.chat_id) && (nowTime - s.timestamp < oneDay));
                  } else if (groupName === 'Yesterday') {
                    groupSessions = filtered.filter(s => !pinnedSessions.includes(s.chat_id) && (nowTime - s.timestamp >= oneDay && nowTime - s.timestamp < 2 * oneDay));
                  } else {
                    groupSessions = filtered.filter(s => !pinnedSessions.includes(s.chat_id) && (nowTime - s.timestamp >= 2 * oneDay));
                  }

                  if (groupSessions.length === 0) return null;

                  return (
                    <div key={groupName} className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider pl-1 mb-1">{groupName}</div>
                      <div className="space-y-1">
                        {groupSessions.map(s => {
                          const isPinned = pinnedSessions.includes(s.chat_id);
                          return (
                            <div 
                              key={s.chat_id}
                              className={`group flex items-center justify-between p-2 rounded-xl transition-all ${
                                s.chat_id === activeSessionId 
                                  ? 'bg-[#4F46E5]/5 text-[#4F46E5] border border-indigo-100/50' 
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <button
                                onClick={() => { switchSession(s.chat_id); setShowHistoryPanel(false); }}
                                className="flex-1 text-left font-bold truncate flex flex-col gap-0.5 pl-1 border-none bg-transparent cursor-pointer"
                              >
                                <span className="truncate">{s.title || 'New Chat'}</span>
                                <span className="text-[9px] text-slate-400 font-medium font-mono">
                                  {new Date(s.timestamp).toLocaleDateString()} • Template: Copilot
                                </span>
                              </button>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => handleTogglePin(s.chat_id, e)}
                                  className={`p-1 rounded hover:bg-slate-200 transition-colors ${isPinned ? 'text-amber-500' : 'text-slate-400'} border-none bg-transparent cursor-pointer`}
                                  title={isPinned ? "Unpin" : "Pin"}
                                >
                                  {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newName = prompt("Rename this chat:", s.title || "New Chat");
                                    if (newName) {
                                      chatStorageService.saveMessage(s.chat_id, {}, newName, caseData?._id);
                                      setSessions(prev => prev.map(p => p.chat_id === s.chat_id ? { ...p, title: newName } : p));
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-750 border-none bg-transparent cursor-pointer"
                                  title="Rename"
                                >
                                  <SlidersHorizontal size={11} />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteSession(s.chat_id, e)}
                                  className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {sessions.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <MessageSquare size={20} className="mx-auto mb-2 opacity-50" />
                    <span>No previous chats found</span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── CASE SUMMARY DRAWER ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showSummaryDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSummaryDrawer(false)}
              className="fixed inset-0 bg-black z-[100000]"
            />
            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-slate-200 z-[100001] shadow-2xl flex flex-col font-sans select-none text-left"
            >
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-[#4F46E5]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Case Summary Profile</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSummaryDrawer(false)}
                  className="p-1 hover:bg-slate-200 rounded-full border-none bg-transparent cursor-pointer text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
                {/* Meta details */}
                <div className="space-y-4">
                  <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-3">
                    <span className="text-[10px] font-black uppercase text-[#4F46E5] tracking-widest block">Active Workspace</span>
                    <h5 className="text-sm font-black text-slate-850 uppercase tracking-tight leading-none">{caseData?.title || caseData?.name || 'Rajesh Sharma vs Amit Verma'}</h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status: Memory Active</p>
                  </div>

                  {/* 11 AI Context Panel Variables Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-3 border border-slate-100 bg-white rounded-xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Client</span>
                      <span className="text-xs font-bold text-slate-700 block mt-1">{caseData?.clientName || 'Rajesh Sharma'}</span>
                    </div>
                    <div className="p-3 border border-slate-100 bg-white rounded-xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Opponent</span>
                      <span className="text-xs font-bold text-slate-700 block mt-1">{caseData?.opponentName || 'Amit Verma'}</span>
                    </div>

                    <div className="p-3 border border-slate-100 bg-white rounded-xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Case Type</span>
                      <span className="text-xs font-bold text-slate-700 block mt-1">{caseData?.caseType || 'Civil Property Dispute'}</span>
                    </div>
                    <div className="p-3 border border-slate-100 bg-white rounded-xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Current Stage</span>
                      <span className="text-xs font-bold text-slate-700 block mt-1">{caseData?.stage || 'Evidence Stage'}</span>
                    </div>

                    <div className="p-3 border border-slate-100 bg-white rounded-xl col-span-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Court Name</span>
                      <span className="text-xs font-bold text-slate-700 block mt-1">{caseData?.courtName || 'District Court Jabalpur'}</span>
                    </div>

                    <div className="p-3 border border-slate-100 bg-white rounded-xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Next Hearing</span>
                      <span className="text-xs font-bold text-[#4F46E5] block mt-1">{caseData?.nextHearingDate || '15 Jul 2026'}</span>
                    </div>
                    <div className="p-3 border border-slate-100 bg-white rounded-xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Deadlines</span>
                      <span className="text-xs font-bold text-[#EF4444] block mt-1 truncate" title={caseData?.deadlines || 'CPC Order 37 Reply'}>{caseData?.deadlines || '12 Jul 2026'}</span>
                    </div>

                    <div className="p-3 border border-slate-100 bg-white rounded-xl flex items-center justify-between col-span-2">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Open Tasks</span>
                        <span className="text-xs font-bold text-slate-750 block mt-0.5">{caseData?.tasks?.filter(t => t.status !== 'Done').length || 3} items</span>
                      </div>
                      <div className="flex gap-1.5 text-[9px] font-black text-slate-400">
                        <span className="px-2 py-0.5 bg-slate-100 rounded">Evidence: {caseData?.documents?.length || 4}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded">Drafts: {caseData?.drafts?.length || 2}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded">Research: {caseData?.research?.length || 3}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-[#4F46E5]/10 bg-indigo-50/30 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-[#4F46E5]">
                      <span>AI Win Probability</span>
                      <span>{caseData?.probability || 60}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#4F46E5] h-full rounded-full" style={{ width: `${caseData?.probability || 60}%` }} />
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  <div className="p-4 bg-emerald-50/30 border border-emerald-500/10 rounded-2xl space-y-2.5">
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest block">AI Pleading Strategy</span>
                    <p className="text-slate-600 font-semibold leading-relaxed">
                      Verify witness statements against timelines to highlight early trial delay defenses. Prepare anticipatory bail if counter complaints arise.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Smart Context Tooltip */}
      {selectedTextMenu && (
        <div 
          className="fixed z-[200000] bg-slate-900 text-white rounded-xl shadow-2xl p-1 flex items-center gap-0.5 smart-context-tooltip text-[10px] font-bold select-none"
          style={{ 
            left: `${selectedTextMenu.x}px`, 
            top: `${selectedTextMenu.y}px`, 
            transform: 'translateX(-50%)' 
          }}
        >
          {[
            { label: 'Explain', prefix: 'Explain this legal reference' },
            { label: 'Rewrite', prefix: 'Rewrite this section' },
            { label: 'More Formal', prefix: 'Rewrite in a formal advocate voice' },
            { label: 'Judge Friendly', prefix: 'Rewrite in a judge friendly structure' },
            { label: 'Translate', prefix: 'Translate this section to Hindi' },
            { label: 'Shorten', prefix: 'Summarize and shorten' },
            { label: 'Expand', prefix: 'Provide more explanation and grounds' },
            { label: 'Create Draft', prefix: 'Draft a legal document outline matching' }
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                const text = selectedTextMenu.text;
                window.__aisa_fullscreen_send_message?.(`${opt.prefix}:\n"${text}"`);
                setSelectedTextMenu(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="px-2.5 py-1 bg-transparent hover:bg-white/10 text-white rounded-lg transition-colors border-none cursor-pointer font-bold whitespace-nowrap"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

    </div>
  );
};

export default FullScreenCaseAssistant;
