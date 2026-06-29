import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Scale, Search, X, Clock, ChevronDown,
  ChevronRight, Copy, FileDown, Share2, Plus, ArrowLeft,
  Sparkles, FileText, Image as ImageIcon, RotateCcw, Check,
  SlidersHorizontal, ChevronLeft, ChevronUp, Landmark, ShieldAlert, Calendar,
  Download, Printer, Briefcase, History, MessageSquare, Pin, PinOff, Trash2
} from 'lucide-react';
import { generateChatResponse } from '../../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { searchAndFilterCases, getFilterOptions } from '../data/caseDatabase';
import toast from 'react-hot-toast';
import { legalService } from '../services/legalService';
import { apiService } from '../../../services/apiService';
import { chatStorageService } from '../../../services/chatStorageService';
import LanguageToggle from './shared/LanguageToggle';
import CopyOutputButton from './shared/CopyOutputButton';
import useOutputLanguage from '../hooks/useOutputLanguage';
import { exportToPDF } from '../utils/exportToPDF';

// ─── LEGAL SYSTEM INSTRUCTION (matches AISA-Mobile) ─────────────────────────
const LEGAL_SYSTEM_INSTRUCTION = `You are the AISA AI General Legal Chat Assistant. You are an expert in law. If a user uploads an image, PDF, or document, perform OCR, analyze the content, and provide structured legal insights. For Images: Provide a Summary, Key points, and Legal observations. For PDFs/Docs: Provide an Overview, Issues, and Recommendations. Never say you cannot view files. IMPORTANT: You must reply in the exact same language as the user's prompt (e.g., if the user asks in Hindi, reply in Hindi). If the user asks you to translate the previous response "in Hindi" or "hindi me batao", translate the current context to Hindi without hesitation.`;


// ─── FORMAT TIME ─────────────────────────────────────────────────────────────
const safeFormatTime = (ts) => {
  if (!ts) return '';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

// ─── PER-MESSAGE LANGUAGE TOGGLE WRAPPER ────────────────────────────────────
/**
 * AiMessageWithLangToggle
 * Renders one AI chat bubble with language toggle + copy button driven by global parent state.
 */
const AiMessageWithLangToggle = ({ text, msgId, outputLang, getDisplayText, translateText, onLangChange }) => {
  const [displayText, setDisplayText] = useState(text);
  const [isTranslating, setIsTranslating] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // When original text changes (unlikely but safe), reset
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
    <div className="legal-msg-ai-text relative">
      {/* Language Toggle bar */}
      <div className="flex items-center justify-end gap-1.5 mb-2">
        <LanguageToggle
          lang={outputLang}
          onChange={onLangChange}
          isTranslating={isTranslating}
        />
      </div>

      {/* Translating overlay */}
      {isTranslating && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 mb-2 animate-pulse">
          <span className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          अनुवाद हो रहा है...
        </div>
      )}

      {/* Content */}
      <div id={`msg-content-${msgId}`} className={`transition-opacity duration-200 ${isTranslating ? 'opacity-50' : 'opacity-100'}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
      </div>
    </div>
  );
};

// ─── PER-MESSAGE RESPONSE CARD WITH LOCALIZED ACTIONS ────────────────────────
const AiResponseCard = ({ msg, currentCase, chatIdRef }) => {
  const [copied, setCopied] = useState(false);
  const [activeDownloadMenu, setActiveDownloadMenu] = useState(false);
  const [activeShareMenu, setActiveShareMenu] = useState(false);

  // Each response card has its own independent Hook instance and unique session key!
  const {
    outputLang,
    setOutputLang,
    getDisplayText,
    translateText,
  } = useOutputLanguage('legal_chat_msg', msg.id);

  const handleCopyText = () => {
    const resolvedText = getDisplayText(msg.text);
    navigator.clipboard.writeText(resolvedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Response copied to clipboard");
  };

  const handleExportPDF = async () => {
    const resolvedText = getDisplayText(msg.text);
    const isHi = outputLang === 'hi';
    const toastId = toast.loading(isHi ? 'PDF तैयार किया जा रहा है...' : 'Generating PDF...');
    try {
      const el = document.getElementById(`msg-content-${msg.id}`);
      await exportToPDF({
        element: el,
        text: resolvedText,
        title: isHi ? 'AISA एआई कानूनी चैट रिपोर्ट' : 'AISA AI Legal Chat Report',
        filename: 'Legal_Chat_Report',
        lang: outputLang,
        meta: {
          [isHi ? 'संदर्भ आईडी' : 'Reference ID']: chatIdRef.current.toUpperCase(),
          [isHi ? 'उत्पन्न तिथि' : 'Date Generated']: new Date().toLocaleString(),
        },
      });
      toast.success(isHi ? 'PDF सफलतापूर्वक निर्यात किया गया' : 'PDF exported successfully', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error(isHi ? 'PDF निर्यात विफल' : 'Failed to export PDF', { id: toastId });
    }
  };

  const handleDownloadTxt = () => {
    const resolvedText = getDisplayText(msg.text);
    try {
      const blob = new Blob([resolvedText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Legal_Report_${Date.now()}.txt`;
      a.click();
      toast.success("Downloaded as TXT");
    } catch (e) {
      toast.error("Failed to download");
    }
  };

  const handleDownloadDoc = () => {
    const resolvedText = getDisplayText(msg.text);
    try {
      const blob = new Blob([resolvedText], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Legal_Report_${Date.now()}.doc`;
      a.click();
      toast.success("Downloaded as DOCX");
    } catch (e) {
      toast.error("Failed to download");
    }
  };

  const handleShareEmail = () => {
    const resolvedText = getDisplayText(msg.text);
    const isHi = outputLang === 'hi';
    window.open(`mailto:?subject=${encodeURIComponent(isHi ? "एआई कानूनी अनुसंधान रिपोर्ट" : "AI Legal Research Report")}&body=${encodeURIComponent(resolvedText.slice(0, 2000) + '\n\n...[Report Truncated]')}`);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied to clipboard");
  };

  const handlePrint = () => {
    const resolvedText = getDisplayText(msg.text);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to print.");
      return;
    }
    const isHi = outputLang === 'hi';
    const cleanHtml = `
      <html>
      <head>
        <title>${isHi ? "AISA कानूनी रिपोर्ट" : "AISA Legal Report"}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; color: #111; }
          h1 { text-align: center; font-size: 22px; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .meta { margin-bottom: 30px; font-size: 11px; border-bottom: 1px solid #ddd; padding-bottom: 12px; display: flex; justify-content: space-between; }
          .content { font-size: 13.5px; white-space: pre-wrap; text-align: justify; }
        </style>
      </head>
      <body>
        <h1>${isHi ? "AISA कोर्ट-रेडी कानूनी रिपोर्ट" : "AISA COURT-READY LEGAL REPORT"}</h1>
        <div class="meta">
          <div><strong>${isHi ? "उत्पन्न तिथि" : "Date Generated"}:</strong> ${new Date().toLocaleString()}</div>
          <div><strong>${isHi ? "संदर्भ" : "Reference"}:</strong> ${chatIdRef.current.toUpperCase()}</div>
        </div>
        <div class="content">${resolvedText.replace(/###\s+/g, '').replace(/##\s+/g, '').replace(/#\s+/g, '').replace(/\*\*/g, '').replace(/\*/g, '')}</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(cleanHtml);
    printWindow.document.close();
  };

  return (
    <>
      <AiMessageWithLangToggle
        text={msg.text}
        msgId={msg.id}
        outputLang={outputLang}
        getDisplayText={getDisplayText}
        translateText={translateText}
        onLangChange={setOutputLang}
      />
      {/* Action Bar */}
      {!msg.isIntro ? (
        <div className="legal-research-action-bar border-t border-slate-100 dark:border-white/5 mt-3 pt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <button onClick={handleCopyText} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Copy Response">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>Copy Response</span>
          </button>
          <span className="text-slate-200 dark:text-white/10 select-none">|</span>
          
          <button onClick={handleExportPDF} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Export PDF">
            <FileText size={13} />
            <span>Export PDF</span>
          </button>
          <span className="text-slate-200 dark:text-white/10 select-none">|</span>
          
          {/* Download Menu */}
          <div className="relative">
            <button onClick={() => setActiveDownloadMenu(prev => !prev)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Download options">
              <Download size={13} />
              <span>Download</span>
            </button>
            {activeDownloadMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActiveDownloadMenu(false)} />
                <div className="absolute left-0 bottom-full mb-2 z-20 w-32 rounded-lg bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-white/10 shadow-xl p-1 flex flex-col gap-0.5">
                  <button onClick={() => { handleDownloadTxt(); setActiveDownloadMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">TXT Format</button>
                  <button onClick={() => { handleDownloadDoc(); setActiveDownloadMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">DOCX Format</button>
                  <button onClick={() => { handleExportPDF(); setActiveDownloadMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">PDF Format</button>
                </div>
              </>
            )}
          </div>
          <span className="text-slate-200 dark:text-white/10 select-none">|</span>

          {/* Share Menu */}
          <div className="relative">
            <button onClick={() => setActiveShareMenu(prev => !prev)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Share options">
              <Share2 size={13} />
              <span>Share Report</span>
            </button>
            {activeShareMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActiveShareMenu(false)} />
                <div className="absolute left-0 bottom-full mb-2 z-20 w-38 rounded-lg bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-white/10 shadow-xl p-1 flex flex-col gap-0.5">
                  <button onClick={() => { handleShareEmail(); setActiveShareMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">Email Report</button>
                  <button onClick={() => { handleShareLink(); setActiveShareMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">Copy Link</button>
                  <button onClick={() => { handleExportPDF(); setActiveShareMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">Download PDF</button>
                </div>
              </>
            )}
          </div>

          <button onClick={handlePrint} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Print Report">
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      ) : (
        <div className="legal-msg-footer">
          <span className="legal-msg-time">{safeFormatTime(msg.timestamp)}</span>
        </div>
      )}
    </>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const LegalChatScreen = ({ onBack, currentCase, onUpdateCase }) => {
  console.log("Legal Chat Screen Mounted");
  console.log("AI Legal General Chat Clicked");
  console.log("Current Theme:", document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  console.log("AI Legal Theme Applied");

  const toolName = 'General Legal Chat';
  const toolColor = '#4f46e5';
  const toolDesc = 'Professional legal discourse, situational guidance, and citation Q&A.';

  const chatIdRef = useRef(Date.now().toString(36) + Math.random().toString(36).substr(2));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isAutoScrolling = useRef(false);
  const lastScrollTime = useRef(0);

  const [messages, setMessages] = useState([
    {
      id: '1',
      text: `Hello! I am your AI ${toolName}. ${toolDesc} How can I assist you today?`,
      sender: 'ai',
      timestamp: new Date(),
      isIntro: true,
    }
  ]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showCasesSheet, setShowCasesSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDownloadMenu, setActiveDownloadMenu] = useState(null);
  const [activeShareMenu, setActiveShareMenu] = useState(null);
  const [activeCitationData, setActiveCitationData] = useState(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [pinnedSessions, setPinnedSessions] = useState([]);


  // Load pinned sessions from currentCase
  useEffect(() => {
    if (currentCase) {
      setPinnedSessions(currentCase.legalPinnedSessions || []);
    }
  }, [currentCase?._id]);

  // ─── HISTORY HANDLERS ──────────────────────────────────────────────────────
  const handleTogglePin = async (chatId, e) => {
    e.stopPropagation();
    if (!currentCase) return;
    const nextPinned = pinnedSessions.includes(chatId)
      ? pinnedSessions.filter(id => id !== chatId)
      : [...pinnedSessions, chatId];
    setPinnedSessions(nextPinned);
    try {
      const payload = {
        ...currentCase,
        legalPinnedSessions: nextPinned
      };
      const response = await apiService.updateProject(currentCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
    } catch (err) {
      console.error("Failed to pin legal chat session", err);
    }
  };

  const handleDeleteSession = async (chatId, e) => {
    e.stopPropagation();
    try {
      await chatStorageService.deleteSession(chatId);
      
      const updated = sessions.filter(s => s.chat_id !== chatId);
      setSessions(updated);

      if (chatId === activeSessionId) {
        if (updated.length > 0) {
          switchSession(updated[0].chat_id);
        } else {
          handleNewChat(updated);
        }
      }

      if (currentCase) {
        const nextPinned = (currentCase.legalPinnedSessions || []).filter(id => id !== chatId);
        setPinnedSessions(nextPinned);
        const payload = {
          ...currentCase,
          legalPinnedSessions: nextPinned
        };
        const response = await apiService.updateProject(currentCase._id, payload);
        if (onUpdateCase) onUpdateCase(response);
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };



  const getPrecedingUserMessage = (msgId) => {
    const index = messages.findIndex(m => m.id === msgId);
    if (index <= 0) return 'AI Legal Query';
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        return messages[i].text;
      }
    }
    return 'AI Legal Query';
  };

  const handleSaveToCase = async (text, queryText = 'AI Legal Research', msgId) => {
    if (!currentCase) {
      toast.error("No active case selected. Please activate a case to use this feature.");
      return;
    }
    try {
      const caseId = currentCase.id || currentCase._id;
      const cases = await legalService.getCases();
      const existingCase = cases.find(c => c.id === caseId || c._id === caseId);
      
      const currentDesc = existingCase?.description || "";
      const updatedDesc = `${currentDesc}\n\n--- AI Legal Research Note (${new Date().toLocaleDateString()}) ---\n${text}`.trim();
      
      const currentSaved = existingCase?.savedResponses || [];
      const newResponse = {
        id: msgId || Date.now().toString(),
        query: queryText,
        response: text,
        timestamp: new Date().toISOString()
      };
      
      await legalService.updateCase(caseId, {
        description: updatedDesc,
        savedResponses: [newResponse, ...currentSaved]
      });
      
      // Save timeline event
      await legalService.saveTimelineEvent({
        caseId,
        title: "Saved AI Legal Research",
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        court: 'System Log'
      });
      
      toast.success(`Successfully saved to case: ${currentCase.title || currentCase.name}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save to case");
    }
  };

  const handleAddToEvidence = async (text) => {
    if (!currentCase) {
      toast.error("No active case selected. Please activate a case to use this feature.");
      return;
    }
    try {
      const caseId = currentCase.id || currentCase._id;
      const cases = await legalService.getCases();
      const existingCase = cases.find(c => c.id === caseId || c._id === caseId);
      const currentDocs = existingCase?.documents || [];
      
      const blob = new Blob([text], { type: 'text/plain' });
      const docName = `AI_Research_Evidence_${Date.now()}.txt`;
      
      const newDoc = {
        id: Date.now().toString(),
        name: docName,
        type: 'text/plain',
        size: blob.size,
        uploadedAt: new Date().toISOString(),
        uri: URL.createObjectURL(blob)
      };
      
      await legalService.updateCase(caseId, { documents: [newDoc, ...currentDocs] });
      toast.success("Saved to evidence repository");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add to evidence");
    }
  };

  const handleCreateCitation = (text) => {
    const matches = text.match(/(?:Section|Sec\.)\s+\d+[A-Za-z]*|[A-Z\s]+ v\.? [A-Z\s]+(?:\s*\([^)]+\))?|AIR\s+\d+\s+SC\s+\d+|SCC\s+\d+|SCR\s+\d+/gi) || [];
    const citations = matches.length > 0 ? Array.from(new Set(matches)).join("\n") : `AISA AI Legal Research Portal, Ref: ${chatIdRef.current.slice(0, 8).toUpperCase()}`;
    navigator.clipboard.writeText(citations);
    toast.success("Citations extracted and copied to clipboard");
  };

  // ─── LEGAL DATABASE STATES ──────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    category: '',
    court: '',
    act: '',
    ipcBns: '',
    year: '',
    jurisdiction: '',
    state: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState(null);

  // ─── MOUNT LOGGING ─────────────────────────────────────────────────────────
  useEffect(() => {
    console.log("Chat Scroll Container Mounted");
  }, []);

  // ─── SCROLL EVENT HANDLER ──────────────────────────────────────────────────
  const handleScroll = () => {
    if (isAutoScrolling.current) {
      isAutoScrolling.current = false;
    } else {
      const now = Date.now();
      if (now - lastScrollTime.current > 1000) {
        console.log("Manual Scroll Enabled");
        lastScrollTime.current = now;
      }
    }
  };

  // ─── AUTO SCROLL ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (messagesEndRef.current) {
      isAutoScrolling.current = true;
      console.log("Auto Scroll Triggered");
      if (scrollContainerRef.current) {
        console.log("Scroll Height:", scrollContainerRef.current.scrollHeight);
        console.log("Client Height:", scrollContainerRef.current.clientHeight);
      }
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isTyping]);

  // ─── FOCUS INPUT ON MOUNT ──────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // ─── CHAT SESSIONS & HISTORY ────────────────────────────────────────────────
  const mapDbMessageToLocal = (m) => ({
    id: m.id || m._id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
    text: m.content || m.text || '',
    sender: m.role === 'user' ? 'user' : 'ai',
    timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
    isIntro: m.isIntro || false,
    attachments: m.attachments || []
  });

  const mapLocalMessageToDb = (m) => ({
    id: m.id,
    role: m.sender === 'user' ? 'user' : 'model',
    content: m.text,
    timestamp: m.timestamp?.toISOString?.() || m.timestamp,
    isIntro: m.isIntro || false,
    attachments: m.attachments || []
  });

  const loadSessionHistory = async (sessionId) => {
    try {
      const history = await chatStorageService.getHistory(sessionId);
      if (history && Array.isArray(history.messages)) {
        const parsedMsgs = history.messages.map(mapDbMessageToLocal);
        setMessages(parsedMsgs);
      }
    } catch (e) {
      console.error("Failed to load session history", e);
    }
  };

  const saveChatHistory = useCallback(async (msgs) => {
    if (msgs.length === 0) return;
    const lastMsg = msgs[msgs.length - 1];
    const firstUserMsg = msgs.find(m => m.sender === 'user');
    const title = firstUserMsg 
      ? (firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : ''))
      : 'New Chat';

    const dbMsg = mapLocalMessageToDb(lastMsg);
    dbMsg.activeTool = 'General Legal Chat';
    dbMsg.mode = 'NORMAL_CHAT';

    try {
      await chatStorageService.saveMessage(chatIdRef.current, dbMsg, title, currentCase?._id);
      
      setSessions(prev => prev.map(s => {
        if (s.chat_id === chatIdRef.current) {
          return { ...s, title, timestamp: Date.now() };
        }
        return s;
      }));
    } catch (e) {
      console.error('[LegalChatScreen] saveChatHistory failed', e);
    }
  }, [currentCase?._id]);

  // Load sessions on mount / migrate from localStorage
  useEffect(() => {
    const migrateAndLoad = async () => {
      try {
        const raw = localStorage.getItem('legal_chat_history');
        const localList = raw ? JSON.parse(raw) : [];
        const localGeneral = localList.filter(s => s.toolName === toolName);

        const dbSessions = await chatStorageService.getSessions(currentCase?._id);
        const filteredDb = dbSessions.filter(s => s.activeTool === 'General Legal Chat');

        if (localGeneral.length > 0) {
          for (const ls of localGeneral) {
            const exists = filteredDb.some(db => db.sessionId === ls.chat_id || db.chat_id === ls.chat_id);
            if (!exists) {
              const sessId = ls.chat_id;
              const firstMsg = ls.messages.find(m => m.sender === 'user');
              const title = firstMsg ? firstMsg.text.slice(0, 30) : 'New Chat';
              
              for (const m of ls.messages) {
                const dbMsg = mapLocalMessageToDb(m);
                dbMsg.activeTool = 'General Legal Chat';
                dbMsg.mode = 'NORMAL_CHAT';
                await chatStorageService.saveMessage(sessId, dbMsg, title, currentCase?._id);
              }
            }
          }
          localStorage.removeItem('legal_chat_history');
          const reloaded = await chatStorageService.getSessions(currentCase?._id);
          const filtered = reloaded.filter(s => s.activeTool === 'General Legal Chat');
          const mapped = filtered.map(s => ({
            chat_id: s.sessionId || s.chat_id,
            title: s.title || 'New Chat',
            timestamp: s.lastModified || s.timestamp || Date.now(),
          }));
          mapped.sort((a, b) => b.timestamp - a.timestamp);
          setSessions(mapped);
          if (mapped.length > 0) {
            chatIdRef.current = mapped[0].chat_id;
            setActiveSessionId(mapped[0].chat_id);
            await loadSessionHistory(mapped[0].chat_id);
          } else {
            await handleNewChat(true);
          }
          return;
        }

        const mapped = filteredDb.map(s => ({
          chat_id: s.sessionId || s.chat_id,
          title: s.title || 'New Chat',
          timestamp: s.lastModified || s.timestamp || Date.now(),
        }));
        mapped.sort((a, b) => b.timestamp - a.timestamp);
        setSessions(mapped);

        if (mapped.length > 0) {
          chatIdRef.current = mapped[0].chat_id;
          setActiveSessionId(mapped[0].chat_id);
          await loadSessionHistory(mapped[0].chat_id);
        } else {
          await handleNewChat(true);
        }
      } catch (e) {
        console.error("Failed loading/migrating legal chat sessions", e);
      }
    };

    migrateAndLoad();
  }, [toolName, currentCase?._id]);

  useEffect(() => {
    if (messages.length > 1) {
      saveChatHistory(messages);
    }
  }, [messages, saveChatHistory]);

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────
  const sendMessage = async (overrideText) => {
    const text = (overrideText && typeof overrideText === 'string') ? overrideText.trim() : inputValue.trim();
    if (!text && attachments.length === 0) return;

    const currentAttachments = [...attachments];
    setAttachments([]);

    const userMsg = {
      id: Date.now().toString(),
      text: text || '',
      attachments: currentAttachments.map(a => ({ name: a.name, type: a.type })),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const apiHistory = messages.filter(m => !m.isIntro).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      let apiAttachments = currentAttachments.map(att => ({
        url: att.dataUrl,
        name: att.name || 'uploaded_file',
        type: att.type?.startsWith('image/') ? 'image' : 'document'
      }));

      let promptText = text;
      if (currentAttachments.length > 0) {
        const fileNames = currentAttachments.map(a => a.name).join(', ');
        promptText = `[Attached Files: ${fileNames}]\n${text || 'Please analyze these attachments.'}`;
      }

      console.log('[LegalChat] Sending message — attachments:', apiAttachments.length);

      let systemInstruction = LEGAL_SYSTEM_INSTRUCTION;
      if (currentCase) {
        systemInstruction += `\n\nContext for the current case:\n`;
        systemInstruction += `- Case ID: ${currentCase.id || currentCase._id}\n`;
        systemInstruction += `- Case Name: ${currentCase.title || currentCase.name || 'N/A'}\n`;
        systemInstruction += `- Case Number: ${currentCase.caseNumber || 'N/A'}\n`;
        systemInstruction += `- Case Type: ${currentCase.caseType || currentCase.category || 'N/A'}\n`;
        systemInstruction += `- Court: ${currentCase.courtName || currentCase.courtType || 'N/A'}\n`;
        systemInstruction += `- Client Details: ${currentCase.clientName || 'N/A'}\n`;
        systemInstruction += `- Opponent Details: ${currentCase.opponentName || 'N/A'}\n`;
        systemInstruction += `- Case Status: ${currentCase.status || 'N/A'}\n`;
        systemInstruction += `- Case Description: ${currentCase.summary || currentCase.description || 'N/A'}\n`;
        systemInstruction += `- Notes: ${currentCase.notes || 'N/A'}\n`;
      }

      const response = await generateChatResponse(
        apiHistory,
        promptText,
        systemInstruction,
        apiAttachments,
        'English',
        null, // abortSignal
        null, // mode
        null, // sessionId
        null  // projectId
      );

      let responseText = '';
      if (typeof response === 'string') responseText = response;
      else if (response?.reply) responseText = response.reply;
      else if (response?.data?.reply) responseText = response.data.reply;
      else if (response?.text) responseText = response.text;
      else if (response && typeof response === 'object') responseText = JSON.stringify(response);
      if (!responseText) responseText = 'We could not process the response. Please try again.';

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('[LegalChatScreen] API Error:', error);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        text: error?.message || 'Unable to connect. Please check your connection and try again.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      console.log("AI Legal Chat Ready");
    }
  };

  // ─── SEND ON CASE SELECT ───────────────────────────────────────────────────
  const handleSelectCase = (item) => {
    setShowCasesSheet(false);
    setExpandedCaseId(null);
    
    const actsStr = item.applicableActs?.map(a => `${a.name} (Enacted: ${a.enactmentYear}, Amended: ${a.lastAmendmentYear})`).join(', ') || 'N/A';
    const sectionsStr = item.ipcBnsReferences?.length > 0
      ? `IPC/BNS Sections: ${item.ipcBnsReferences.map(r => `${r.ipcSection} / ${r.bnsSection} (Punishment: ${r.punishment}, Applicability: ${r.applicability})`).join(', ')}`
      : 'N/A';
    const landmarkStr = item.landmarkJudgments?.length > 0
      ? `Landmark Judgments: ${item.landmarkJudgments.map(j => `"${j.caseName}" (${j.citation}, ${j.court}, ${j.year}) - Principle: ${j.legalPrinciple}`).join('; ')}`
      : 'N/A';

    const promptText = `Provide a comprehensive legal analysis and strategy advice for the following case type:
- **Title**: ${item.name}
- **Category**: ${item.category}
- **Court / Jurisdiction**: ${item.courtType} (${item.jurisdiction})
- **Applicable Acts**: ${actsStr}
- **IPC/BNS Sections**: ${sectionsStr}
- **Summary**: ${item.summary}
- **Reference Landmark Cases**: ${landmarkStr}
`;

    sendMessage(promptText);
  };

  // ─── FILE ATTACHMENT ───────────────────────────────────────────────────────
  const getFileIcon = (type) => {
    if (!type) return <FileText size={14} className="text-slate-400" />;
    if (type.includes('pdf')) return <FileText size={14} className="text-red-500" />;
    if (type.includes('word') || type.includes('msword') || type.includes('officedocument.word')) return <FileText size={14} className="text-blue-500" />;
    if (type.startsWith('image/')) return <ImageIcon size={14} className="text-emerald-500" />;
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
            
            // Sync to case documents
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

  // ─── COPY ──────────────────────────────────────────────────────────────────
  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  // ─── NEW CHAT ──────────────────────────────────────────────────────────────
  const handleNewChat = async (param) => {
    let isAutoAnalysis = false;
    if (param === true || Array.isArray(param)) {
      isAutoAnalysis = true;
    } else if (param && param.preventDefault) {
      param.preventDefault();
      isAutoAnalysis = false;
    }

    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    chatIdRef.current = newId;
    setActiveSessionId(newId);

    setAttachments([]);
    setInputValue('');

    if (currentCase && isAutoAnalysis) {
      const promptText = `Provide a comprehensive legal analysis and strategy advice for the following case:
- **Case ID**: ${currentCase.id || currentCase._id}
- **Case Name**: ${currentCase.title || currentCase.name || 'N/A'}
- **Case Number**: ${currentCase.caseNumber || 'N/A'}
- **Case Type**: ${currentCase.caseType || currentCase.category || 'N/A'}
- **Court**: ${currentCase.courtName || currentCase.courtType || 'N/A'}
- **Client Details**: ${currentCase.clientName || 'N/A'}
- **Opponent Details**: ${currentCase.opponentName || 'N/A'}
- **Case Status**: ${currentCase.status || 'N/A'}
- **Case Description**: ${currentCase.summary || currentCase.description || 'N/A'}
- **Uploaded Documents**: ${(currentCase.documents || []).length} files
- **Evidence**: ${(currentCase.evidence || []).length} items
- **Notes**: ${currentCase.notes || 'N/A'}
- **Timeline**: ${(currentCase.timeline || []).length} events
- **Previous AI Legal conversations**: ${currentCase.savedResponses ? currentCase.savedResponses.length : 0}

Please provide:
- Case Summary
- Legal Issues
- Applicable Laws
- Strengths of the Case
- Weaknesses of the Case
- Missing Evidence
- Missing Documents
- Recommended Legal Strategy
- Possible Defences
- Relevant Legal Precedents
- Draft Suggestions
- Risks
- Next Legal Steps
- Probability Assessment
- Recommended Actions`;

      const userMsg = {
        id: Date.now().toString(),
        text: promptText,
        sender: 'user',
        timestamp: new Date(),
        isIntro: false,
      };

      setMessages([userMsg]);
      setIsTyping(true);

      const newSessionItem = {
        chat_id: newId,
        title: 'Case Analysis',
        timestamp: Date.now(),
      };
      setSessions(prev => [newSessionItem, ...prev]);

      const dbMsg = mapLocalMessageToDb(userMsg);
      dbMsg.activeTool = 'General Legal Chat';
      dbMsg.mode = 'NORMAL_CHAT';
      try {
        await chatStorageService.saveMessage(newId, dbMsg, 'Case Analysis', currentCase?._id);
      } catch (err) {
        console.error("Failed to save initial user message", err);
      }

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);

      try {
        let systemInstruction = LEGAL_SYSTEM_INSTRUCTION;
        systemInstruction += `\n\nContext for the current case:\n`;
        systemInstruction += `- Case ID: ${currentCase.id || currentCase._id}\n`;
        systemInstruction += `- Case Name: ${currentCase.title || currentCase.name || 'N/A'}\n`;
        systemInstruction += `- Case Number: ${currentCase.caseNumber || 'N/A'}\n`;
        systemInstruction += `- Case Type: ${currentCase.caseType || currentCase.category || 'N/A'}\n`;
        systemInstruction += `- Court: ${currentCase.courtName || currentCase.courtType || 'N/A'}\n`;
        systemInstruction += `- Client Details: ${currentCase.clientName || 'N/A'}\n`;
        systemInstruction += `- Opponent Details: ${currentCase.opponentName || 'N/A'}\n`;
        systemInstruction += `- Case Status: ${currentCase.status || 'N/A'}\n`;
        systemInstruction += `- Case Description: ${currentCase.summary || currentCase.description || 'N/A'}\n`;
        systemInstruction += `- Notes: ${currentCase.notes || 'N/A'}\n`;

        const response = await generateChatResponse(
          [], 
          promptText,
          systemInstruction,
          [],
          'English',
          null, null, null, null
        );

        let responseText = '';
        if (typeof response === 'string') responseText = response;
        else if (response?.reply) responseText = response.reply;
        else if (response?.data?.reply) responseText = response.data.reply;
        else if (response?.text) responseText = response.text;
        else if (response && typeof response === 'object') responseText = JSON.stringify(response);
        if (!responseText) responseText = 'We could not process the response. Please try again.';

        const aiMsg = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'ai',
          timestamp: new Date(),
          isIntro: false,
        };

        setMessages(prev => {
          const updated = [...prev, aiMsg];
          saveChatHistory(updated);
          return updated;
        });
      } catch (err) {
        console.error('[LegalChatScreen] API Error:', err);
        const errorMsg = {
          id: (Date.now() + 1).toString(),
          text: err?.message || 'Unable to connect. Please check your connection and try again.',
          sender: 'ai',
          timestamp: new Date(),
          isIntro: false,
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }

    } else if (currentCase && !isAutoAnalysis) {
      const caseName = currentCase.title || currentCase.name || 'N/A';
      const welcomeText = `**AI Legal Chat**

**Current Case:**
${caseName}

How can I help you with this case today?

**Examples:**
• Analyse my evidence.
• Draft a legal notice.
• Build court arguments.
• Review uploaded documents.
• Predict the outcome.
• Find relevant precedents.`;

      const newMsgs = [{
        id: '1',
        text: welcomeText,
        sender: 'ai',
        timestamp: new Date(),
        isIntro: true,
      }];
      setMessages(newMsgs);

      const newSessionItem = {
        chat_id: newId,
        title: 'New Chat',
        timestamp: Date.now(),
      };
      setSessions(prev => [newSessionItem, ...prev]);

      const dbMsg = mapLocalMessageToDb(newMsgs[0]);
      dbMsg.activeTool = 'General Legal Chat';
      dbMsg.mode = 'NORMAL_CHAT';
      try {
        await chatStorageService.saveMessage(newId, dbMsg, 'New Chat', currentCase._id);
      } catch (e) {
        console.error("Failed to save initial message in new chat", e);
      }
      
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);

    } else {
      const newMsgs = [{
        id: '1',
        text: `Hello! I am your AI ${toolName}. ${toolDesc} How can I assist you today?`,
        sender: 'ai',
        timestamp: new Date(),
        isIntro: true,
      }];
      setMessages(newMsgs);

      const newSessionItem = {
        chat_id: newId,
        title: 'New Chat',
        timestamp: Date.now(),
      };
      setSessions(prev => [newSessionItem, ...prev]);

      const dbMsg = mapLocalMessageToDb(newMsgs[0]);
      dbMsg.activeTool = 'General Legal Chat';
      dbMsg.mode = 'NORMAL_CHAT';
      try {
        await chatStorageService.saveMessage(newId, dbMsg, 'New Chat', currentCase?._id);
      } catch (e) {
        console.error("Failed to save initial message in new chat", e);
      }
      
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  };

  const switchSession = async (sessionId) => {
    try {
      chatIdRef.current = sessionId;
      setActiveSessionId(sessionId);
      await loadSessionHistory(sessionId);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (e) {
      console.error("Failed to switch session", e);
    }
  };

  // ─── CASES DATABASE SEARCH & FILTER ────────────────────────────────────────
  const filterOptions = useMemo(() => getFilterOptions(), []);

  const searchResults = useMemo(() => {
    return searchAndFilterCases(searchQuery, filters, currentPage, 6);
  }, [searchQuery, filters, currentPage]);

  const filteredCases = searchResults.cases;
  const totalCases = searchResults.total;
  const totalPages = searchResults.totalPages;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="legal-chat-screen">
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="legal-chat-header">
        <button className="legal-chat-back-btn" onClick={onBack} title="Back to Dashboard">
          <ArrowLeft size={20} />
        </button>
        <div className="legal-chat-header-info">
          <div className="legal-chat-header-icon">
            <Scale size={16} />
          </div>
          <div>
            <h1 className="legal-chat-header-title">{toolName}</h1>
            <span className="legal-chat-header-sub">AI Engine Active</span>
          </div>
        </div>

        {/* History Button */}
        <div className="legal-history-btn-wrap">
          <button
            className="legal-chat-action-btn legal-history-btn"
            onClick={() => setShowHistoryPanel(v => !v)}
            title="Chat History"
          >
            <History size={18} />
          </button>

          {/* History Dropdown Panel */}
          {showHistoryPanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHistoryPanel(false)} />
              <div className="legal-history-panel">
                <div className="legal-history-panel-header">
                  <History size={14} />
                  <span>Chat History</span>
                </div>
                {(() => {
                  // Only show sessions with real titles (not empty "New Chat" sessions)
                  const realSessions = sessions.filter(s => s.title && s.title.trim() !== '' && s.title !== 'New Chat');
                  if (realSessions.length === 0) return (
                    <div className="legal-history-empty">
                      <MessageSquare size={28} />
                      <p>No previous chats</p>
                    </div>
                  );
                  const pinned = realSessions.filter(s => pinnedSessions.includes(s.chat_id));
                  const unpinned = realSessions.filter(s => !pinnedSessions.includes(s.chat_id));
                  const renderItem = (s) => (
                    <div key={s.chat_id} className="legal-history-item-wrap">
                      <button
                        className={`legal-history-item ${s.chat_id === activeSessionId ? 'active' : ''}`}
                        onClick={() => { switchSession(s.chat_id); setShowHistoryPanel(false); }}
                      >
                        {pinnedSessions.includes(s.chat_id)
                          ? <Pin size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          : <MessageSquare size={13} style={{ flexShrink: 0 }} />
                        }
                        <span>{s.title || 'Untitled Chat'}</span>
                      </button>
                      <div className="legal-history-item-actions">
                        <button
                          className={`legal-history-action-btn ${pinnedSessions.includes(s.chat_id) ? 'pinned' : ''}`}
                          onClick={(e) => handleTogglePin(s.chat_id, e)}
                          title={pinnedSessions.includes(s.chat_id) ? 'Unpin' : 'Pin'}
                        >
                          {pinnedSessions.includes(s.chat_id) ? <PinOff size={13} /> : <Pin size={13} />}
                        </button>
                        <button
                          className="legal-history-action-btn delete"
                          onClick={(e) => handleDeleteSession(s.chat_id, e)}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                  return (
                    <div className="legal-history-list">
                      {pinned.length > 0 && (
                        <>
                          <div className="legal-history-section-label">📌 Pinned</div>
                          {pinned.map(renderItem)}
                          {unpinned.length > 0 && <div className="legal-history-divider" />}
                        </>
                      )}
                      {unpinned.length > 0 && (
                        <>
                          {pinned.length > 0 && <div className="legal-history-section-label">Recent</div>}
                          {unpinned.map(renderItem)}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MESSAGES ──────────────────────────────────────────────────── */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="legal-chat-messages">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`legal-msg-row ${isAi ? 'legal-msg-ai' : 'legal-msg-user'}`}
              >
                {isAi && (
                  <div className="legal-msg-avatar">
                    <Scale size={14} />
                  </div>
                )}
                <div className={`legal-msg-bubble ${isAi ? 'legal-bubble-ai' : 'legal-bubble-user'}`}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {msg.attachments.map((att, idx) => (
                        <div key={idx} className="legal-msg-attachment-chip">
                          {getFileIcon(att.type)}
                          <span>{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isAi ? (
                    <AiResponseCard
                      msg={msg}
                      currentCase={currentCase}
                      chatIdRef={chatIdRef}
                    />
                  ) : (
                    <>
                      <p className="legal-msg-user-text">{msg.text}</p>
                      <div className="legal-msg-footer">
                        <span className="legal-msg-time">{safeFormatTime(msg.timestamp)}</span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="legal-msg-row legal-msg-ai"
          >
            <div className="legal-msg-avatar">
              <Scale size={14} />
            </div>
            <div className="legal-bubble-ai legal-typing-bubble">
              <div className="legal-typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── NEW CHAT BUTTON ───────────────────────────────────────────── */}
      <div className="w-full px-4 pb-2 flex justify-start shrink-0">
        <button
          type="button"
          className="legal-input-action-btn legal-input-action-btn-label"
          onClick={handleNewChat}
          title="Start New Chat"
        >
          <Plus size={15} />
          <span>New Chat</span>
        </button>
      </div>

      {/* ── INPUT BAR ─────────────────────────────────────────────────── */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`legal-chat-input-area flex flex-col gap-2 transition-all ${isDragging ? 'bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-500' : ''}`}
      >
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
        <div className="legal-chat-input-row">
          <div className="legal-chat-input-buttons">
            <button
              type="button"
              className={`legal-input-action-btn ${attachments.length > 0 ? 'active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip size={18} style={{ color: attachments.length > 0 ? toolColor : undefined }} />
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

          <form className="legal-chat-input-form" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
            <button
              type="button"
              className="legal-input-icon-btn legal-input-action-btn-cases legal-input-action-btn-label"
              onClick={() => setShowCasesSheet(true)}
              title="Browse Cases"
            >
              <Scale size={14} />
              <span>Cases</span>
            </button>
            <textarea
              ref={inputRef}
              className="legal-chat-input"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={`Ask ${toolName}...`}
              rows={1}
            />
            <button
              type="submit"
              className="legal-send-btn"
              disabled={!inputValue.trim() && attachments.length === 0}
              style={{ backgroundColor: (!inputValue.trim() && attachments.length === 0) ? '#94a3b8' : toolColor }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* ── CASES BOTTOM SHEET ────────────────────────────────────────── */}
      <AnimatePresence>
        {showCasesSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="legal-cases-overlay"
              onClick={() => setShowCasesSheet(false)}
            />
            <motion.div
              className="legal-cases-container"
              initial={{ opacity: 1 }}
              exit={{ opacity: 1 }}
            >
              <motion.div
                initial={{ y: '100vh' }}
                animate={{ y: 0 }}
                exit={{ y: '100vh' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="legal-cases-sheet"
              >
                <div className="legal-cases-sheet-drag">
                  <div className="legal-cases-drag-bar" />
                </div>
              <div className="legal-cases-sheet-header">
                <Scale size={20} style={{ color: toolColor }} />
                <h3>Browse Cases</h3>
                <button onClick={() => setShowCasesSheet(false)} className="legal-cases-close">
                  <X size={18} />
                </button>
              </div>
                
                {/* Search Bar + Collapsible Filters Toggle */}
                <div className="legal-cases-search-container">
                  <div className="legal-cases-search-wrap">
                    <Search size={16} />
                    <input
                      type="text"
                      className="legal-cases-search"
                      placeholder="Search cases, laws, acts, IPC/BNS, keywords..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  <button 
                    type="button" 
                    className={`legal-filter-toggle-btn ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                    title="Toggle Advanced Filters"
                  >
                    <SlidersHorizontal size={16} />
                    <span>Filters</span>
                  </button>
                </div>

                {/* Collapsible Filters Panel */}
                {showFilters && (
                  <div className="legal-cases-filters-grid">
                    <div className="legal-filter-group">
                      <label>Category</label>
                      <select
                        value={filters.category}
                        onChange={(e) => { setFilters(prev => ({ ...prev, category: e.target.value })); setCurrentPage(1); }}
                      >
                        <option value="">All Categories</option>
                        {filterOptions.categories.map((c, idx) => (
                          <option key={idx} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="legal-filter-group">
                      <label>Court</label>
                      <select
                        value={filters.court}
                        onChange={(e) => { setFilters(prev => ({ ...prev, court: e.target.value })); setCurrentPage(1); }}
                      >
                        <option value="">All Courts</option>
                        {filterOptions.courts.map((ct, idx) => (
                          <option key={idx} value={ct}>{ct}</option>
                        ))}
                      </select>
                    </div>
                    <div className="legal-filter-group">
                      <label>Act</label>
                      <select
                        value={filters.act}
                        onChange={(e) => { setFilters(prev => ({ ...prev, act: e.target.value })); setCurrentPage(1); }}
                      >
                        <option value="">All Acts</option>
                        {filterOptions.acts.map((act, idx) => (
                          <option key={idx} value={act}>{act}</option>
                        ))}
                      </select>
                    </div>
                    <div className="legal-filter-group">
                      <label>IPC/BNS Section</label>
                      <input
                        type="text"
                        placeholder="e.g. 302"
                        value={filters.ipcBns}
                        onChange={(e) => { setFilters(prev => ({ ...prev, ipcBns: e.target.value })); setCurrentPage(1); }}
                      />
                    </div>
                    <div className="legal-filter-group">
                      <label>Jurisdiction</label>
                      <input
                        type="text"
                        placeholder="e.g. State"
                        value={filters.jurisdiction}
                        onChange={(e) => { setFilters(prev => ({ ...prev, jurisdiction: e.target.value })); setCurrentPage(1); }}
                      />
                    </div>
                    <div className="legal-filter-group">
                      <label>Year</label>
                      <input
                        type="text"
                        placeholder="e.g. 2017"
                        value={filters.year}
                        onChange={(e) => { setFilters(prev => ({ ...prev, year: e.target.value })); setCurrentPage(1); }}
                      />
                    </div>
                    <button
                      type="button"
                      className="legal-clear-filters-btn"
                      onClick={() => {
                        setFilters({ category: '', court: '', act: '', ipcBns: '', year: '', jurisdiction: '', state: '' });
                        setCurrentPage(1);
                      }}
                    >
                      Reset Filters
                    </button>
                  </div>
                )}

                {/* Cases List */}
                <div className="legal-cases-list">
                  {filteredCases.map((c, i) => {
                    const isExpanded = expandedCaseId === c.id;
                    return (
                      <div key={c.id} className={`legal-case-card ${isExpanded ? 'expanded' : ''}`}>
                        <div className="legal-case-card-header">
                          <div className="legal-case-card-title-row">
                            <span className="legal-case-card-name">{c.name}</span>
                            <div className="legal-case-card-badges">
                              {c.landmarkJudgments?.length > 0 && (
                                <span className="legal-landmark-badge" title="Landmark Judgment Case">
                                  <Landmark size={10} />
                                  <span>Landmark</span>
                                </span>
                              )}
                              <span className="legal-category-badge">{c.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="legal-case-card-body">
                          <p className="legal-case-summary-short">{c.summary}</p>
                          
                          <div className="legal-case-meta-tags">
                            <span className="legal-case-meta-tag">
                              <Scale size={11} />
                              <span>{c.courtType}</span>
                            </span>
                            <span className="legal-case-meta-tag">
                              <Calendar size={11} />
                              <span>{c.jurisdiction}</span>
                            </span>
                          </div>
                        </div>

                        {/* Collapsible Detail Panel */}
                        {isExpanded && (
                          <div className="legal-case-details-expanded">
                            {/* Summary */}
                            <div className="legal-expanded-section">
                              <h4>Full Legal Reference Summary</h4>
                              <p>{c.summary}</p>
                            </div>

                            {/* Applicable Acts Table */}
                            {c.applicableActs?.length > 0 && (
                              <div className="legal-expanded-section">
                                <h4>Statutory Acts Coverage</h4>
                                <div className="legal-table-wrapper">
                                  <table className="legal-table">
                                    <thead>
                                      <tr>
                                        <th>Act Title</th>
                                        <th>Enacted</th>
                                        <th>Last Amended</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {c.applicableActs.map((act, aIdx) => (
                                        <tr key={aIdx}>
                                          <td className="font-semibold">{act.name}</td>
                                          <td>{act.enactmentYear}</td>
                                          <td>{act.lastAmendmentYear || 'N/A'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* IPC / BNS Comparisons Table */}
                            {c.ipcBnsReferences?.length > 0 && (
                              <div className="legal-expanded-section">
                                <h4>IPC vs. BNS Penal Cross-Reference</h4>
                                <div className="legal-table-wrapper">
                                  <table className="legal-table">
                                    <thead>
                                      <tr>
                                        <th>IPC Section</th>
                                        <th>BNS Section</th>
                                        <th>Statutory Punishment</th>
                                        <th>Applicability</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {c.ipcBnsReferences.map((ref, rIdx) => (
                                        <tr key={rIdx}>
                                          <td className="text-red-650 dark:text-red-400 font-bold">{ref.ipcSection}</td>
                                          <td className="text-indigo-605 dark:text-indigo-400 font-bold">{ref.bnsSection}</td>
                                          <td className="text-xs">{ref.punishment}</td>
                                          <td className="text-xs">{ref.applicability}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Landmark Judgments */}
                            {c.landmarkJudgments?.length > 0 && (
                              <div className="legal-expanded-section">
                                <h4>Landmark Precedents & Citations</h4>
                                <div className="legal-landmark-list">
                                  {c.landmarkJudgments.map((j, jIdx) => (
                                    <div key={jIdx} className="legal-landmark-item">
                                      <div className="legal-landmark-item-header">
                                        <Landmark size={12} style={{ marginRight: '6px', color: '#b45309' }} />
                                        <h5>{j.caseName}</h5>
                                      </div>
                                      <div className="legal-landmark-item-meta">
                                        <span>{j.citation}</span> • <span>{j.court} ({j.year})</span>
                                      </div>
                                      <p className="legal-landmark-item-principle">
                                        <strong>Legal Principle:</strong> {j.legalPrinciple}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="legal-case-actions">
                          <button
                            type="button"
                            className="legal-case-details-toggle"
                            onClick={() => setExpandedCaseId(isExpanded ? null : c.id)}
                          >
                            <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          
                          <button
                            type="button"
                            className="legal-case-select-btn"
                            onClick={() => handleSelectCase(c)}
                            style={{ backgroundColor: toolColor }}
                          >
                            <span>Use in Chat</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredCases.length === 0 && (
                    <div className="legal-cases-empty-state">
                      <ShieldAlert size={36} />
                      <p>No cases found matching the search criteria.</p>
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="legal-pagination">
                    <button
                      type="button"
                      className="legal-pagination-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      <ChevronLeft size={16} />
                      <span>Prev</span>
                    </button>
                    
                    <span className="legal-pagination-info">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      className="legal-pagination-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Citation Modal */}
      {activeCitationData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setActiveCitationData(null)}>
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Legal Citations Generator</h3>
              <button onClick={() => setActiveCitationData(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Bluebook Citation */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Bluebook Citation</span>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-slate-50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-mono select-all text-slate-800 dark:text-slate-200 break-all leading-relaxed">
                    {activeCitationData.bluebook}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(activeCitationData.bluebook); toast.success("Bluebook citation copied"); }} className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-xl flex items-center justify-center shrink-0">
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Indian Legal Citation */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">Indian Legal Citation</span>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-slate-50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-mono select-all text-slate-800 dark:text-slate-200 break-all leading-relaxed">
                    {activeCitationData.indian}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(activeCitationData.indian); toast.success("Indian citation copied"); }} className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-xl flex items-center justify-center shrink-0">
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Court Reference Format */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Court Reference Format</span>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-slate-50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-mono select-all text-slate-800 dark:text-slate-200 break-all leading-relaxed">
                    {activeCitationData.courtRef}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(activeCitationData.courtRef); toast.success("Court reference copied"); }} className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-xl flex items-center justify-center shrink-0">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .legal-chat-screen {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
          min-height: 0;
        }
        .dark .legal-chat-screen { background: #0f172a; }

        /* ── HEADER ─────────────────────────────────────── */
        .legal-chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 12px;
          background: #ffffff;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          flex-shrink: 0;
          z-index: 10;
        }
        .dark .legal-chat-header {
          background: #1e293b;
          border-bottom-color: rgba(255,255,255,0.06);
        }
        .legal-chat-back-btn {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.04);
          border: none; cursor: pointer;
          color: #334155;
          transition: all 0.2s;
        }
        .dark .legal-chat-back-btn { background: rgba(255,255,255,0.05); color: #e2e8f0; }
        .legal-chat-back-btn:hover { background: rgba(0,0,0,0.08); }
        .dark .legal-chat-back-btn:hover { background: rgba(255,255,255,0.1); }
        .legal-chat-header-info { display: flex; align-items: center; gap: 10px; flex: 1; }
        .legal-chat-header-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }
        .legal-chat-header-title {
          font-size: 15px; font-weight: 800; margin: 0;
          color: #0f172a;
          letter-spacing: -0.3px;
        }
        .dark .legal-chat-header-title { color: #f1f5f9; }
        .legal-chat-header-sub {
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px;
          color: #4f46e5; opacity: 0.8;
        }
        .legal-chat-header-actions { display: flex; gap: 6px; }
        .legal-chat-action-btn {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.04);
          border: none; cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }
        .dark .legal-chat-action-btn { background: rgba(255,255,255,0.05); color: #94a3b8; }
        .legal-chat-action-btn:hover { color: #4f46e5; background: rgba(79,70,229,0.1); }

        /* ── HISTORY BUTTON & PANEL ──────────────────────── */
        .legal-history-btn-wrap {
          position: relative;
          margin-left: auto;
          flex-shrink: 0;
        }
        .legal-history-btn {
          background: rgba(0,0,0,0.04) !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
        }
        .dark .legal-history-btn {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.08) !important;
        }
        .legal-history-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 260px;
          max-height: 360px;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          z-index: 50;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .dark .legal-history-panel {
          background: #1e293b;
          border-color: rgba(255,255,255,0.08);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .legal-history-panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          flex-shrink: 0;
        }
        .dark .legal-history-panel-header {
          color: #f1f5f9;
          border-color: rgba(255,255,255,0.06);
        }
        .legal-history-list {
          overflow-y: auto;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .legal-history-list::-webkit-scrollbar { width: 4px; }
        .legal-history-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .dark .legal-history-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
        .legal-history-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 12px;
          border-radius: 10px;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          color: #475569;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.15s;
          width: 100%;
        }
        .legal-history-item span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .legal-history-item:hover {
          background: rgba(79,70,229,0.06);
          color: #4f46e5;
        }
        .dark .legal-history-item { color: #94a3b8; }
        .dark .legal-history-item:hover {
          background: rgba(129,140,248,0.1);
          color: #818cf8;
        }
        .legal-history-item.active {
          background: rgba(79,70,229,0.1);
          color: #4f46e5;
          font-weight: 800;
        }
        .dark .legal-history-item.active {
          background: rgba(129,140,248,0.15);
          color: #818cf8;
        }
        .legal-history-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          color: #94a3b8;
          gap: 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .legal-history-empty p { margin: 0; }
        .legal-history-item-wrap {
          position: relative;
          display: flex;
          align-items: center;
          border-radius: 10px;
          overflow: hidden;
        }
        .legal-history-item-wrap .legal-history-item {
          flex: 1;
          min-width: 0;
          border-radius: 10px 0 0 10px;
        }
        .legal-history-item-actions {
          display: none;
          align-items: center;
          gap: 2px;
          padding: 0 6px;
          flex-shrink: 0;
          background: rgba(241,245,249,0.9);
          height: 100%;
          min-height: 36px;
        }
        .dark .legal-history-item-actions {
          background: rgba(30,41,59,0.9);
        }
        .legal-history-item-wrap:hover .legal-history-item-actions {
          display: flex;
        }
        .legal-history-action-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: none;
          color: #94a3b8;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .legal-history-action-btn:hover {
          background: rgba(79,70,229,0.1);
          color: #4f46e5;
        }
        .legal-history-action-btn.pinned {
          color: #f59e0b;
        }
        .legal-history-action-btn.pinned:hover {
          background: rgba(245,158,11,0.1);
          color: #d97706;
        }
        .legal-history-action-btn.delete:hover {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
        }
        .dark .legal-history-action-btn { color: #475569; }
        .dark .legal-history-action-btn:hover { background: rgba(129,140,248,0.1); color: #818cf8; }
        .legal-history-section-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #94a3b8;
          padding: 6px 12px 4px;
        }
        .dark .legal-history-section-label { color: #475569; }
        .legal-history-divider {
          height: 1px;
          background: rgba(0,0,0,0.06);
          margin: 4px 8px;
        }
        .dark .legal-history-divider { background: rgba(255,255,255,0.06); }

        /* ── MESSAGES ───────────────────────────────────── */
        .legal-chat-messages {
          flex: 1; overflow-y: auto; padding: 14px 16px 12px;
          display: flex; flex-direction: column; gap: 16px;
          scroll-behavior: smooth;
          min-height: 0;
          height: 0;
        }
        .legal-chat-messages::-webkit-scrollbar {
          width: 6px;
        }
        .legal-chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }
        .legal-chat-messages::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.12);
          border-radius: 10px;
        }
        .dark .legal-chat-messages::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
        }
        .legal-msg-row { display: flex; gap: 10px; max-width: 85%; }
        .legal-msg-ai { align-self: flex-start; }
        .legal-msg-user { align-self: flex-end; flex-direction: row-reverse; }
        .legal-msg-avatar {
          width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          color: white; margin-top: 2px;
        }
        .legal-msg-bubble { border-radius: 18px; padding: 12px 16px; max-width: 100%; }
        .legal-bubble-ai {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.06);
          border-bottom-left-radius: 6px;
        }
        .dark .legal-bubble-ai {
          background: #1e293b;
          border-color: rgba(255,255,255,0.06);
        }
        .legal-bubble-user {
          background: #f1f5f9;
          color: #0f172a;
          border-bottom-right-radius: 6px;
        }
        .dark .legal-bubble-user {
          background: #1e293b;
          color: #f1f5f9;
        }
        .legal-msg-ai-text {
          font-size: 14px; line-height: 1.65;
          color: #1e293b;
        }
        .dark .legal-msg-ai-text { color: #e2e8f0; }
        .legal-msg-ai-text p { margin: 0 0 8px; }
        .legal-msg-ai-text p:last-child { margin-bottom: 0; }
        .legal-msg-ai-text strong { font-weight: 700; color: #0f172a; }
        .dark .legal-msg-ai-text strong { color: #f1f5f9; }
        .legal-msg-ai-text ul, .legal-msg-ai-text ol { margin: 4px 0; padding-left: 20px; }
        .legal-msg-ai-text li { margin-bottom: 4px; }
        .legal-msg-ai-text code {
          background: rgba(0,0,0,0.06);
          padding: 2px 6px; border-radius: 4px; font-size: 13px;
        }
        .dark .legal-msg-ai-text code { background: rgba(255,255,255,0.08); }
        .legal-msg-ai-text pre {
          background: #f1f5f9;
          padding: 12px; border-radius: 8px; overflow-x: auto; margin: 8px 0;
        }
        .dark .legal-msg-ai-text pre { background: #0f172a; }
        .legal-msg-ai-text pre code { background: none; padding: 0; }
        .legal-msg-ai-text table {
          width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px;
        }
        .legal-msg-ai-text th, .legal-msg-ai-text td {
          border: 1px solid rgba(0,0,0,0.1);
          padding: 6px 10px; text-align: left;
        }
        .dark .legal-msg-ai-text th, .dark .legal-msg-ai-text td {
          border-color: rgba(255,255,255,0.1);
        }
        .legal-msg-ai-text th {
          background: rgba(79,70,229,0.08);
          font-weight: 700;
        }
        .dark .legal-msg-ai-text th { background: rgba(79,70,229,0.15); }
        .legal-msg-user-text { margin: 0; font-size: 14px; line-height: 1.6; color: #0f172a; }
        .dark .legal-msg-user-text { color: #f1f5f9; }
        .legal-msg-attachment-chip {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 8px; margin-bottom: 6px;
          background: rgba(79,70,229,0.12); font-size: 12px; font-weight: 600;
          color: #4338ca;
        }
        .dark .legal-msg-attachment-chip { color: #c7d2fe; }
        .legal-msg-footer {
          display: flex; align-items: center; gap: 8px; margin-top: 6px;
        }
        .legal-msg-time {
          font-size: 10px; font-weight: 600; opacity: 0.5;
          color: inherit;
        }
        .legal-msg-copy-btn {
          background: none; border: none; cursor: pointer; padding: 2px;
          color: #94a3b8; display: flex; align-items: center;
          transition: color 0.2s;
        }
        .dark .legal-msg-copy-btn { color: #64748b; }
        .legal-msg-copy-btn:hover { color: #4f46e5; }

        .legal-research-action-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          border-top: 1px solid rgba(0,0,0,0.06);
          margin-top: 12px;
          padding-top: 12px;
          flex-wrap: wrap;
        }
        .dark .legal-research-action-bar {
          border-top-color: rgba(255,255,255,0.08);
          color: #94a3b8;
        }
        .legal-research-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 700;
          color: inherit;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .legal-research-action-btn:hover {
          color: #4f46e5;
          background: rgba(79,70,229,0.06);
        }
        .dark .legal-research-action-btn:hover {
          color: #818cf8;
          background: rgba(129,140,248,0.1);
        }

        /* ── TYPING ─────────────────────────────────────── */
        .legal-typing-bubble { padding: 14px 20px !important; }
        .legal-typing-dots { display: flex; gap: 5px; align-items: center; }
        .legal-typing-dots span {
          width: 7px; height: 7px; border-radius: 50%; background: #4f46e5;
          animation: legalBounce 1.4s infinite ease-in-out both;
        }
        .legal-typing-dots span:nth-child(1) { animation-delay: 0s; }
        .legal-typing-dots span:nth-child(2) { animation-delay: 0.16s; }
        .legal-typing-dots span:nth-child(3) { animation-delay: 0.32s; }
        @keyframes legalBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* ── INPUT AREA ─────────────────────────────────── */
        .legal-chat-input-area {
          flex-shrink: 0;
          padding: 8px 12px 0px 12px;
          background: #ffffff;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .dark .legal-chat-input-area {
          background: #1e293b;
          border-top-color: rgba(255,255,255,0.06);
        }
        .legal-attachment-preview {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px; margin-bottom: 8px;
          background: rgba(79,70,229,0.08);
          border-radius: 10px; font-size: 12px; font-weight: 600;
          color: #4338ca;
        }
        .dark .legal-attachment-preview { background: rgba(79,70,229,0.12); color: #c7d2fe; }
        .legal-attachment-name {
          flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .legal-attachment-remove {
          background: none; border: none; cursor: pointer; padding: 2px;
          color: #64748b; display: flex;
        }
        .dark .legal-attachment-remove { color: #94a3b8; }
        .legal-chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          width: 100%;
        }
        .legal-chat-input-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          margin-bottom: 4px;
        }
        .legal-input-action-btn {
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
        .dark .legal-input-action-btn {
          background: #1e293b;
          border-color: rgba(255,255,255,0.06);
          color: #94a3b8;
        }
        .legal-input-action-btn:hover {
          color: #4f46e5;
          background: #e2e8f0;
          transform: scale(1.05);
        }
        .dark .legal-input-action-btn:hover {
          color: #818cf8;
          background: #334155;
        }
        .legal-input-action-btn.active {
          color: #4f46e5;
          background: rgba(79,70,229,0.1);
          border-color: rgba(79,70,229,0.2);
        }
        .dark .legal-input-action-btn.active {
          color: #818cf8;
          background: rgba(129,140,248,0.15);
          border-color: rgba(129,140,248,0.25);
        }
        /* Pill variant with icon + label text */
        .legal-input-action-btn-label {
          width: auto !important;
          border-radius: 20px !important;
          padding: 0 12px !important;
          gap: 5px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          white-space: nowrap;
        }
        .legal-input-action-btn-label:hover {
          transform: none !important;
        }
        .legal-input-action-btn-cases {
          background: rgba(79,70,229,0.08);
          border-color: rgba(79,70,229,0.15);
          color: #4f46e5;
        }
        .dark .legal-input-action-btn-cases {
          background: rgba(129,140,248,0.1);
          border-color: rgba(129,140,248,0.15);
          color: #818cf8;
        }
        .legal-input-action-btn-cases:hover {
          background: rgba(79,70,229,0.15);
          border-color: rgba(79,70,229,0.3);
          color: #4f46e5;
        }
        .dark .legal-input-action-btn-cases:hover {
          background: rgba(129,140,248,0.2);
          border-color: rgba(129,140,248,0.3);
          color: #818cf8;
        }
        .legal-chat-input-form {
          flex: 1; min-width: 0;
          display: flex; align-items: flex-end; gap: 6px;
          background: #f1f5f9;
          border-radius: 24px; padding: 6px 8px;
          border: 1px solid rgba(0,0,0,0.06);
          transition: border-color 0.2s;
        }
        .dark .legal-chat-input-form {
          background: #0f172a;
          border-color: rgba(255,255,255,0.06);
        }
        .legal-chat-input-form:focus-within {
          border-color: rgba(79,70,229,0.4);
        }
        .legal-input-icon-btn {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer;
          color: #94a3b8; flex-shrink: 0;
          transition: color 0.2s;
        }
        .dark .legal-input-icon-btn { color: #64748b; }
        .legal-input-icon-btn:hover { color: #4f46e5; }
        .legal-cases-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 5px 10px; border-radius: 20px;
          background: rgba(79,70,229,0.1); border: 1px solid rgba(79,70,229,0.2);
          color: #4f46e5; font-size: 11px; font-weight: 800;
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
          text-transform: uppercase; letter-spacing: 0.5px;
          transition: all 0.2s;
        }
        .legal-cases-btn:hover { background: rgba(79,70,229,0.18); }
        .legal-chat-input {
          flex: 1; border: none; outline: none; background: transparent;
          font-size: 14px; line-height: 1.5; resize: none;
          color: #1e293b;
          min-height: 34px; max-height: 120px; padding: 6px 4px;
          font-family: inherit;
        }
        .dark .legal-chat-input { color: #e2e8f0; }
        .legal-chat-input::placeholder { color: #94a3b8; }
        .dark .legal-chat-input::placeholder { color: #475569; }
        .legal-send-btn {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer; color: white; flex-shrink: 0;
          transition: all 0.2s;
        }
        .legal-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .legal-send-btn:not(:disabled):hover { transform: scale(1.05); }

        /* ── NEW CHAT BUTTON ────────────────────────────── */
        .legal-new-chat-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 20px; flex-shrink: 0;
          background: #f1f5f9; border: 1px solid rgba(0,0,0,0.08);
          color: #64748b; font-size: 11px; font-weight: 800;
          cursor: pointer; white-space: nowrap;
          text-transform: uppercase; letter-spacing: 0.5px;
          transition: all 0.2s; min-height: 34px;
        }
        .dark .legal-new-chat-btn {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.08);
          color: #94a3b8;
        }
        .legal-new-chat-btn:hover {
          background: rgba(79,70,229,0.1);
          border-color: rgba(79,70,229,0.3);
          color: #4f46e5;
        }
        .legal-new-chat-btn:active { transform: scale(0.96); }

        /* ── HISTORY SESSION DROPDOWN ───────────────────── */
        .legal-chat-history-select {
          background: #f1f5f9;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 14px;
          color: #334155;
          font-size: 11px; font-weight: 700;
          padding: 5px 10px;
          outline: none; cursor: pointer;
          max-width: 180px;
          text-overflow: ellipsis;
          transition: border-color 0.2s;
        }
        .dark .legal-chat-history-select {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.1);
          color: #e2e8f0;
        }
        .legal-chat-history-select:focus {
          border-color: rgba(79,70,229,0.5);
        }

        /* ── CASES SHEET ────────────────────────────────── */
        .legal-cases-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          z-index: 1000; backdrop-filter: blur(4px);
        }
        .legal-cases-container {
          position: fixed; inset: 0;
          display: flex; align-items: flex-end; justify-content: center;
          z-index: 1001; pointer-events: none;
        }
        .legal-cases-sheet {
          position: relative; width: 100%;
          max-height: 70vh;
          background: #ffffff;
          border-top-left-radius: 24px; border-top-right-radius: 24px;
          display: flex; flex-direction: column;
          box-shadow: 0 -4px 30px rgba(0,0,0,0.15);
          pointer-events: auto;
        }
        .dark .legal-cases-sheet { background: #1e293b; }
        .legal-cases-sheet-drag {
          display: flex; justify-content: center; padding: 10px 0 6px;
        }
        .legal-cases-drag-bar {
          width: 40px; height: 4px; border-radius: 2px;
          background: rgba(0,0,0,0.12);
        }
        .dark .legal-cases-drag-bar { background: rgba(255,255,255,0.15); }
        .legal-cases-sheet-header {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 20px 12px; font-weight: 800;
        }
        .legal-cases-sheet-header h3 {
          flex: 1; margin: 0; font-size: 16px;
          color: #0f172a;
        }
        .dark .legal-cases-sheet-header h3 { color: #f1f5f9; }
        .legal-cases-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #94a3b8;
        }
        .dark .legal-cases-close { color: #64748b; }
        .legal-cases-search-container {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 16px 12px;
        }
        .legal-cases-search-wrap {
          display: flex; align-items: center; gap: 8px;
          flex: 1; padding: 8px 14px;
          background: rgba(0,0,0,0.04);
          border-radius: 12px;
          color: #94a3b8;
        }
        .dark .legal-cases-search-wrap { background: rgba(255,255,255,0.05); color: #64748b; }
        .legal-cases-search {
          flex: 1; border: none; outline: none; background: transparent;
          font-size: 13px; color: #1e293b;
        }
        .dark .legal-cases-search { color: #e2e8f0; }
        .legal-cases-search::placeholder { color: #94a3b8; }
        .dark .legal-cases-search::placeholder { color: #475569; }

        .legal-filter-toggle-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.08);
          background: #ffffff; color: #475569;
          font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .dark .legal-filter-toggle-btn {
          border-color: rgba(255,255,255,0.08);
          background: #1e293b; color: #94a3b8;
        }
        .legal-filter-toggle-btn:hover, .legal-filter-toggle-btn.active {
          color: #4f46e5; border-color: rgba(79,70,229,0.3);
          background: rgba(79,70,229,0.05);
        }

        /* Filters Grid */
        .legal-cases-filters-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin: 0 16px 12px;
          padding: 12px;
          background: rgba(0,0,0,0.02);
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.04);
          box-sizing: border-box;
        }
        .dark .legal-cases-filters-grid {
          background: rgba(255,255,255,0.02);
          border-color: rgba(255,255,255,0.04);
        }
        @media (max-width: 600px) {
          .legal-cases-filters-grid {
            grid-template-columns: 1fr;
          }
        }
        .legal-filter-group {
          display: flex; flex-direction: column; gap: 4px;
          min-width: 0;
        }
        .legal-filter-group label {
          font-size: 10px; font-weight: 800; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .dark .legal-filter-group label { color: #475569; }
        .legal-filter-group input, .legal-filter-group select {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          padding: 6px 10px; border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.1);
          background: #ffffff; color: #1e293b;
          font-size: 12px; outline: none;
        }
        .dark .legal-filter-group input, .dark .legal-filter-group select {
          border-color: rgba(255,255,255,0.1);
          background: #0f172a; color: #e2e8f0;
        }
        .legal-clear-filters-btn {
          grid-column: 1 / -1;
          padding: 8px; border-radius: 8px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px dashed rgba(239, 68, 68, 0.2);
          color: #ef4444; font-size: 11px; font-weight: 700;
          cursor: pointer; text-transform: uppercase;
          letter-spacing: 0.5px; transition: all 0.2s;
        }
        .legal-clear-filters-btn:hover {
          background: rgba(239, 68, 68, 0.15);
        }

        /* Cases list */
        .legal-cases-list {
          flex: 1; overflow-y: auto; padding: 0 16px 20px;
          display: flex; flex-direction: column; gap: 10px;
        }

        /* Case Card */
        .legal-case-card {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 16px; padding: 16px;
          display: flex; flex-direction: column; gap: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.2s;
        }
        .dark .legal-case-card {
          background: #1e293b; border-color: rgba(255,255,255,0.06);
        }
        .legal-case-card:hover {
          border-color: rgba(79,70,229,0.2);
          box-shadow: 0 4px 12px rgba(79,70,229,0.05);
        }
        .legal-case-card-header {
          display: flex; flex-direction: column; gap: 4px;
        }
        .legal-case-card-title-row {
          display: flex; justify-content: space-between;
          align-items: flex-start; gap: 12px;
        }
        @media (max-width: 480px) {
          .legal-case-card-title-row {
            flex-direction: column; align-items: flex-start; gap: 6px;
          }
        }
        .legal-case-card-name {
          font-size: 14px; font-weight: 800; color: #0f172a;
          line-height: 1.4;
        }
        .dark .legal-case-card-name { color: #f1f5f9; }
        
        .legal-case-card-badges {
          display: flex; gap: 6px; flex-shrink: 0; align-items: center;
        }
        .legal-landmark-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 6px;
          background: rgba(245, 158, 11, 0.1);
          color: #d97706; font-size: 9px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.5px;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .legal-category-badge {
          display: inline-flex; align-items: center;
          padding: 3px 8px; border-radius: 6px;
          background: rgba(79,70,229,0.08);
          color: #4f46e5; font-size: 9px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .dark .legal-category-badge {
          background: rgba(99, 102, 241, 0.15); color: #818cf8;
        }

        .legal-case-card-body {
          display: flex; flex-direction: column; gap: 8px;
        }
        .legal-case-summary-short {
          margin: 0; font-size: 12px; line-height: 1.5; color: #475569;
        }
        .dark .legal-case-summary-short { color: #94a3b8; }
        
        .legal-case-meta-tags {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .legal-case-meta-tag {
          display: flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 700; color: #64748b;
          background: rgba(0,0,0,0.03); padding: 4px 8px; border-radius: 6px;
        }
        .dark .legal-case-meta-tag {
          color: #94a3b8; background: rgba(255,255,255,0.03);
        }

        /* Actions row */
        .legal-case-actions {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 8px; padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.04);
        }
        .dark .legal-case-actions {
          border-top-color: rgba(255,255,255,0.04);
        }
        .legal-case-details-toggle {
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 4px;
          color: #4f46e5; font-size: 12px; font-weight: 750;
        }
        .legal-case-select-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border: none; border-radius: 8px;
          color: #ffffff; font-size: 11px; font-weight: 800;
          text-transform: uppercase; cursor: pointer; transition: all 0.2s;
        }
        .legal-case-select-btn:hover {
          transform: translateY(-1px); filter: brightness(1.1);
        }

        /* Expanded Panel Styling */
        .legal-case-details-expanded {
          display: flex; flex-direction: column; gap: 14px;
          background: rgba(0,0,0,0.015); border-radius: 12px;
          padding: 14px; border: 1px solid rgba(0,0,0,0.03);
          margin-top: 6px;
        }
        .dark .legal-case-details-expanded {
          background: rgba(255,255,255,0.01); border-color: rgba(255,255,255,0.03);
        }
        .legal-expanded-section {
          display: flex; flex-direction: column; gap: 6px;
        }
        .legal-expanded-section h4 {
          margin: 0; font-size: 11px; font-weight: 800; color: #1e293b;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .dark .legal-expanded-section h4 { color: #f1f5f9; }
        .legal-expanded-section p {
          margin: 0; font-size: 12px; line-height: 1.5; color: #475569;
        }
        .dark .legal-expanded-section p { color: #94a3b8; }

        /* Tables */
        .legal-table-wrapper {
          overflow-x: auto; border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.06);
          background: #ffffff;
        }
        .dark .legal-table-wrapper {
          border-color: rgba(255,255,255,0.06); background: #0f172a;
        }
        .legal-table {
          width: 100%; border-collapse: collapse; text-align: left;
          font-size: 11px;
        }
        .legal-table th, .legal-table td {
          padding: 8px 10px; border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .dark .legal-table th, .dark .legal-table td {
          border-color: rgba(255,255,255,0.06);
        }
        .legal-table th {
          background: rgba(0,0,0,0.02); font-weight: 800; color: #475569;
        }
        .dark .legal-table th {
          background: rgba(255,255,255,0.02); color: #94a3b8;
        }
        .legal-table tr:last-child td {
          border-bottom: none;
        }

        .text-red-655 { color: #dc2626; }
        .dark .text-red-655 { color: #f87171; }
        .text-indigo-605 { color: #4f46e5; }
        .dark .text-indigo-605 { color: #818cf8; }

        /* Landmark list */
        .legal-landmark-list {
          display: flex; flex-direction: column; gap: 8px;
        }
        .legal-landmark-item {
          background: #ffffff; border-radius: 8px; padding: 10px;
          border-left: 3px solid #f59e0b; border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
        }
        .dark .legal-landmark-item {
          background: #0f172a; border-color: rgba(255,255,255,0.05);
        }
        .legal-landmark-item-header {
          display: flex; align-items: center; gap: 4px;
        }
        .legal-landmark-item-header h5 {
          margin: 0; font-size: 11px; font-weight: 800; color: #1e293b;
        }
        .dark .legal-landmark-item-header h5 { color: #e2e8f0; }
        .legal-landmark-item-meta {
          font-size: 9px; font-weight: 700; color: #94a3b8; margin-top: 2px;
        }
        .legal-landmark-item-principle {
          margin: 4px 0 0; font-size: 11px; line-height: 1.4; color: #475569;
        }
        .dark .legal-landmark-item-principle { color: #94a3b8; }

        .legal-cases-empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 40px 20px; color: #94a3b8; text-align: center; gap: 10px;
        }
        .legal-cases-empty-state p { margin: 0; font-size: 12px; font-weight: 600; }

        /* Pagination */
        .legal-pagination {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 16px 16px; border-top: 1px solid rgba(0,0,0,0.06);
          background: #ffffff;
        }
        .dark .legal-pagination {
          background: #1e293b; border-top-color: rgba(255,255,255,0.06);
        }
        .legal-pagination-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.08); background: #ffffff;
          color: #475569; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .dark .legal-pagination-btn {
          border-color: rgba(255,255,255,0.08); background: #0f172a;
          color: #94a3b8;
        }
        .legal-pagination-btn:hover:not(:disabled) {
          border-color: rgba(79,70,229,0.3); color: #4f46e5;
          background: rgba(79,70,229,0.05);
        }
        .legal-pagination-btn:disabled {
          opacity: 0.4; cursor: not-allowed;
        }
        .legal-pagination-info {
          font-size: 11px; font-weight: 750; color: #64748b;
        }

        /* ── RESPONSIVE ─────────────────────────────────── */
        /* Tiny phones (iPhone SE, Galaxy S8 — 320px-374px) */
        @media (max-width: 374px) {
          .legal-msg-row { max-width: 95%; }
          .legal-chat-messages { padding: 12px 8px 6px; gap: 10px; }
          .legal-chat-header { padding: calc(8px + env(safe-area-inset-top, 0px)) 10px 8px; gap: 8px; }
          .legal-chat-header-icon { width: 28px; height: 28px; border-radius: 8px; }
          .legal-chat-header-title { font-size: 13px; }
          .legal-chat-input-area { padding: 5px 6px 0px; }
          .legal-chat-input-form { padding: 4px 6px; border-radius: 20px; }
          .legal-chat-input { font-size: 13px; min-height: 30px; }
          .legal-input-icon-btn { width: 30px; height: 30px; }
          .legal-send-btn { width: 30px; height: 30px; }
          .legal-input-action-btn { width: 32px; height: 32px; }
          .legal-chat-input-buttons { gap: 4px; margin-bottom: 2px; }
          .legal-msg-bubble { padding: 10px 12px; border-radius: 14px; }
          .legal-msg-ai-text { font-size: 13px; line-height: 1.55; }
          .legal-msg-user-text { font-size: 13px; }
          .legal-msg-avatar { width: 26px; height: 26px; border-radius: 8px; }
          .legal-cases-btn span { display: none; }
          .legal-cases-btn { padding: 5px 6px; }
          .legal-chat-action-btn { width: 28px; height: 28px; }
          .legal-chat-back-btn { width: 32px; height: 32px; }
        }
        /* Small phones (375px-639px) */
        @media (min-width: 375px) and (max-width: 639px) {
          .legal-msg-row { max-width: 92%; }
          .legal-chat-messages { padding: 14px 10px 8px; gap: 12px; }
          .legal-chat-header { padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 10px; }
          .legal-chat-input-area { padding: 6px 8px 0px; }
          .legal-input-action-btn { width: 34px; height: 34px; }
          .legal-chat-input-buttons { gap: 6px; margin-bottom: 3px; }
          .legal-cases-btn span { display: none; }
          .legal-cases-btn { padding: 6px 8px; }
        }
        /* Foldables & small tablets (600px-767px) */
        @media (min-width: 600px) and (max-width: 767px) {
          .legal-msg-row { max-width: 85%; }
          .legal-chat-messages { padding: 14px 16px 12px; gap: 14px; }
          .legal-chat-header { padding: calc(12px + env(safe-area-inset-top, 0px)) 20px 12px; }
          .legal-chat-input-area { padding: 8px 14px 0px; }
          .legal-cases-container { align-items: center; padding: 20px; }
          .legal-cases-sheet { max-width: 400px; border-radius: 24px; max-height: 80vh; }
        }
        /* Tablets portrait (768px-1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .legal-msg-row { max-width: 80%; }
          .legal-chat-messages { padding: 16px 5% 14px; gap: 16px; }
          .legal-chat-header { padding: calc(14px + env(safe-area-inset-top, 0px)) 24px 14px; }
          .legal-chat-input-area { padding: 10px 20px 0px; }
          .legal-cases-container { align-items: center; padding: 24px; }
          .legal-cases-sheet { max-width: 420px; border-radius: 24px; max-height: 80vh; }
        }
        /* Desktop (1024px-1279px) */
        @media (min-width: 1024px) {
          .legal-chat-messages { padding: 16px 8%; }
          .legal-msg-row { max-width: 72%; }
          .legal-cases-container { align-items: center; padding: 24px; }
          .legal-cases-sheet { max-width: 480px; border-radius: 24px; max-height: 80vh; }
        }
        /* Large desktop (1280px-1919px) */
        @media (min-width: 1280px) {
          .legal-chat-messages { padding: 16px 12%; }
          .legal-msg-row { max-width: 65%; }
        }
        /* Ultra-wide / 4K (1920px+) */
        @media (min-width: 1920px) {
          .legal-chat-messages { padding: 16px 18%; }
          .legal-msg-row { max-width: 55%; }
          .legal-msg-ai-text { font-size: 15px; }
          .legal-msg-user-text { font-size: 15px; }
        }
        /* Landscape phones — reduce vertical space */
        @media (max-height: 500px) and (orientation: landscape) {
          .legal-chat-header { padding: 6px 12px; }
          .legal-chat-header-icon { width: 28px; height: 28px; }
          .legal-chat-input-area { padding: 4px 10px 0px; }
          .legal-chat-input-form { padding: 4px 6px; }
          .legal-chat-input { min-height: 28px; max-height: 80px; }
          .legal-msg-row { max-width: 75%; }
          .legal-chat-messages { padding: 10px 8px 6px; gap: 8px; }
        }
      `}</style>
    </div>
  );
};

export default LegalChatScreen;
