import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Scale, Search, X, Clock, ChevronDown,
  ChevronRight, Copy, FileDown, Share2, Plus, ArrowLeft,
  Sparkles, FileText, Image as ImageIcon, RotateCcw, Check,
  SlidersHorizontal, ChevronLeft, ChevronUp, Landmark, ShieldAlert, Calendar,
  Download, Printer, Briefcase
} from 'lucide-react';
import { generateChatResponse } from '../../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { searchAndFilterCases, getFilterOptions } from '../data/caseDatabase';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { legalService } from '../services/legalService';

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

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const LegalChatScreen = ({ onBack, currentCase }) => {
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
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showCasesSheet, setShowCasesSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDownloadMenu, setActiveDownloadMenu] = useState(null);
  const [activeShareMenu, setActiveShareMenu] = useState(null);

  // ─── LEGAL ACTION BAR HANDLERS ─────────────────────────────────────────────
  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Response copied to clipboard");
  };

  const handleExportPDF = (text) => {
    try {
      const doc = new jsPDF();
      const margin = 20;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const maxW = pageW - margin * 2;
      
      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("AISA AI LEGAL RESEARCH REPORT", margin, 20);
      doc.setLineWidth(0.5);
      doc.line(margin, 23, pageW - margin, 23);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Reference ID: ${chatIdRef.current.toUpperCase()}`, margin, 29);
      doc.text(`Date Generated: ${new Date().toLocaleString()}`, margin, 34);
      doc.line(margin, 37, pageW - margin, 37);
      
      // Content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      
      const cleanText = text
        .replace(/###\s+/g, '')
        .replace(/##\s+/g, '')
        .replace(/#\s+/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '');
        
      const lines = doc.splitTextToSize(cleanText, maxW);
      let y = 45;
      
      for (let i = 0; i < lines.length; i++) {
        if (y > pageH - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(lines[i], margin, y);
        y += 6;
      }
      
      doc.save(`Legal_Research_Report_${Date.now()}.pdf`);
      toast.success("PDF exported successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDF");
    }
  };

  const handleDownloadTxt = (text) => {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
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

  const handleDownloadDoc = (text) => {
    try {
      const blob = new Blob([text], { type: 'application/msword;charset=utf-8' });
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

  const handleShareEmail = (text) => {
    window.open(`mailto:?subject=AI Legal Research Report&body=${encodeURIComponent(text.slice(0, 2000) + '\n\n...[Report Truncated]')}`);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied to clipboard");
  };

  const handleShareInternal = () => {
    if (currentCase) {
      toast.success(`Report shared with case: ${currentCase.title || currentCase.name}`);
    } else {
      toast.error("No active case selected to share internally.");
    }
  };

  const handleSaveToCase = async (text) => {
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
      
      await legalService.updateCase(caseId, { description: updatedDesc });
      
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

  const handlePrint = (text) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to print.");
      return;
    }
    const cleanHtml = `
      <html>
      <head>
        <title>AISA Legal Report</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; color: #111; }
          h1 { text-align: center; font-size: 22px; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .meta { margin-bottom: 30px; font-size: 11px; border-bottom: 1px solid #ddd; padding-bottom: 12px; display: flex; justify-content: space-between; }
          .content { font-size: 13.5px; white-space: pre-wrap; text-align: justify; }
        </style>
      </head>
      <body>
        <h1>AISA COURT-READY LEGAL REPORT</h1>
        <div class="meta">
          <div><strong>Date Generated:</strong> ${new Date().toLocaleString()}</div>
          <div><strong>Reference:</strong> ${chatIdRef.current.toUpperCase()}</div>
        </div>
        <div class="content">${text.replace(/###\s+/g, '').replace(/##\s+/g, '').replace(/#\s+/g, '').replace(/\*\*/g, '').replace(/\*/g, '')}</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(cleanHtml);
    printWindow.document.close();
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

  // ─── CHAT HISTORY ──────────────────────────────────────────────────────────
  const saveChatHistory = useCallback(async (msgs) => {
    try {
      const raw = localStorage.getItem('legal_chat_history');
      const currentList = raw ? JSON.parse(raw) : [];
      const newSessionItem = {
        chat_id: chatIdRef.current,
        toolName,
        timestamp: Date.now(),
        messages: msgs.map(m => ({ ...m, timestamp: m.timestamp?.toISOString?.() || m.timestamp }))
      };
      const existingIndex = currentList.findIndex(s => s.chat_id === chatIdRef.current);
      if (existingIndex >= 0) {
        currentList[existingIndex] = newSessionItem;
      } else {
        currentList.push(newSessionItem);
      }
      localStorage.setItem('legal_chat_history', JSON.stringify(currentList));
    } catch (e) {
      console.error('[LegalChatScreen] saveChatHistory failed', e);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 1) saveChatHistory(messages);
  }, [messages, saveChatHistory]);

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────
  const sendMessage = async (overrideText) => {
    const text = (overrideText && typeof overrideText === 'string') ? overrideText.trim() : inputValue.trim();
    if (!text && !attachment) return;

    const userMsg = {
      id: Date.now().toString(),
      text: text || '',
      attachment: attachment ? { name: attachment.name, type: attachment.type } : null,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    const currentAttachment = attachment;
    setAttachment(null);

    try {
      const apiHistory = messages.filter(m => !m.isIntro).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      let apiAttachments = [];
      let promptText = text;

      if (currentAttachment?.dataUrl) {
        apiAttachments.push({
          url: currentAttachment.dataUrl,
          name: currentAttachment.name || 'uploaded_file',
          type: currentAttachment.type?.startsWith('image/') ? 'image' : 'document'
        });
        promptText = `[Attached File: ${currentAttachment.name}]\n${text || 'Please analyze this attachment.'}`;
      }

      console.log('[LegalChat] Sending message — attachments:', apiAttachments.length);

      const response = await generateChatResponse(
        apiHistory,
        promptText,
        LEGAL_SYSTEM_INSTRUCTION,
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
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
  const handleNewChat = () => {
    chatIdRef.current = Date.now().toString(36) + Math.random().toString(36).substr(2);
    setMessages([{
      id: '1',
      text: `Hello! I am your AI ${toolName}. ${toolDesc} How can I assist you today?`,
      sender: 'ai',
      timestamp: new Date(),
      isIntro: true,
    }]);
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
        <div className="legal-chat-header-actions">
          <button className="legal-chat-action-btn" onClick={handleNewChat} title="New Chat">
            <RotateCcw size={16} />
          </button>
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
                  {msg.attachment && (
                    <div className="legal-msg-attachment-chip">
                      <Paperclip size={12} />
                      <span>{msg.attachment.name}</span>
                    </div>
                  )}
                  {isAi ? (
                    <div className="legal-msg-ai-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="legal-msg-user-text">{msg.text}</p>
                  )}
                  {isAi && !msg.isIntro ? (
                    <div className="legal-research-action-bar border-t border-slate-100 dark:border-white/5 mt-3 pt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <button onClick={() => handleCopyText(msg.text, msg.id)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Copy Response">
                        {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                        <span>Copy Response</span>
                      </button>
                      <span className="text-slate-200 dark:text-white/10 select-none">|</span>
                      
                      <button onClick={() => handleExportPDF(msg.text)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Export PDF">
                        <FileText size={13} />
                        <span>Export PDF</span>
                      </button>
                      <span className="text-slate-200 dark:text-white/10 select-none">|</span>
                      
                      {/* Download Menu */}
                      <div className="relative">
                        <button onClick={() => setActiveDownloadMenu(activeDownloadMenu === msg.id ? null : msg.id)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Download options">
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                        {activeDownloadMenu === msg.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveDownloadMenu(null)} />
                            <div className="absolute left-0 bottom-full mb-2 z-20 w-32 rounded-lg bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-white/10 shadow-xl p-1 flex flex-col gap-0.5">
                              <button onClick={() => { handleDownloadTxt(msg.text); setActiveDownloadMenu(null); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">TXT Format</button>
                              <button onClick={() => { handleDownloadDoc(msg.text); setActiveDownloadMenu(null); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">DOCX Format</button>
                              <button onClick={() => { handleExportPDF(msg.text); setActiveDownloadMenu(null); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">PDF Format</button>
                            </div>
                          </>
                        )}
                      </div>
                      <span className="text-slate-200 dark:text-white/10 select-none">|</span>

                      {/* Share Menu */}
                      <div className="relative">
                        <button onClick={() => setActiveShareMenu(activeShareMenu === msg.id ? null : msg.id)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Share options">
                          <Share2 size={13} />
                          <span>Share Report</span>
                        </button>
                        {activeShareMenu === msg.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveShareMenu(null)} />
                            <div className="absolute left-0 bottom-full mb-2 z-20 w-38 rounded-lg bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-white/10 shadow-xl p-1 flex flex-col gap-0.5">
                              <button onClick={() => { handleShareEmail(msg.text); setActiveShareMenu(null); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">Email Report</button>
                              <button onClick={() => { handleShareLink(); setActiveShareMenu(null); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">Copy Link</button>
                              <button onClick={() => { handleShareInternal(); setActiveShareMenu(null); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">Internal Case Share</button>
                            </div>
                          </>
                        )}
                      </div>
                      <span className="text-slate-200 dark:text-white/10 select-none">|</span>

                      <button onClick={() => handleSaveToCase(msg.text)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Save to Case">
                        <Briefcase size={13} />
                        <span>Save to Case</span>
                      </button>
                      <span className="text-slate-200 dark:text-white/10 select-none">|</span>

                      <button onClick={() => handleAddToEvidence(msg.text)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Add to Evidence">
                        <ShieldAlert size={13} />
                        <span>Add to Evidence</span>
                      </button>
                      <span className="text-slate-200 dark:text-white/10 select-none">|</span>

                      <button onClick={() => handleCreateCitation(msg.text)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Create Citation">
                        <Landmark size={13} />
                        <span>Create Citation</span>
                      </button>
                      <span className="text-slate-200 dark:text-white/10 select-none">|</span>

                      <button onClick={() => handlePrint(msg.text)} className="legal-research-action-btn flex items-center gap-1 font-bold hover:text-indigo-600 transition-colors" title="Print Report">
                        <Printer size={13} />
                        <span>Print</span>
                      </button>
                    </div>
                  ) : (
                    <div className="legal-msg-footer">
                      <span className="legal-msg-time">{safeFormatTime(msg.timestamp)}</span>
                    </div>
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

      {/* ── INPUT BAR ─────────────────────────────────────────────────── */}
      <div className="legal-chat-input-area">
        {attachment && (
          <div className="legal-attachment-preview">
            <Paperclip size={14} style={{ color: toolColor }} />
            <span className="legal-attachment-name">{attachment.name}</span>
            <button className="legal-attachment-remove" onClick={() => setAttachment(null)}>
              <X size={14} />
            </button>
          </div>
        )}
        <form className="legal-chat-input-form" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
          <button
            type="button"
            className="legal-input-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <Paperclip size={18} style={{ color: attachment ? toolColor : undefined }} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="legal-cases-btn"
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
            disabled={!inputValue.trim() && !attachment}
            style={{ backgroundColor: (!inputValue.trim() && !attachment) ? '#94a3b8' : toolColor }}
          >
            <Send size={16} />
          </button>
        </form>
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
          padding: 12px 16px;
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

        /* ── MESSAGES ───────────────────────────────────── */
        .legal-chat-messages {
          flex: 1; overflow-y: auto; padding: 20px 16px 12px;
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
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white;
          border-bottom-right-radius: 6px;
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
        .legal-msg-user-text { margin: 0; font-size: 14px; line-height: 1.5; }
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
          flex-shrink: 0; padding: 8px 12px calc(12px + env(safe-area-inset-bottom, 0px));
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
        .legal-chat-input-form {
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
          background: none; border: none; cursor: pointer; padding: 4px;
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
          .legal-chat-header { padding: 8px 10px; gap: 8px; }
          .legal-chat-header-icon { width: 28px; height: 28px; border-radius: 8px; }
          .legal-chat-header-title { font-size: 13px; }
          .legal-chat-input-area { padding: 5px 6px calc(6px + env(safe-area-inset-bottom, 0px)); }
          .legal-chat-input-form { padding: 4px 6px; border-radius: 20px; }
          .legal-chat-input { font-size: 13px; min-height: 30px; }
          .legal-input-icon-btn { width: 30px; height: 30px; }
          .legal-send-btn { width: 30px; height: 30px; }
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
          .legal-chat-messages { padding: 16px 10px 8px; gap: 12px; }
          .legal-chat-header { padding: 10px 12px; }
          .legal-chat-input-area { padding: 6px 8px calc(8px + env(safe-area-inset-bottom, 0px)); }
          .legal-cases-btn span { display: none; }
          .legal-cases-btn { padding: 6px 8px; }
        }
        /* Foldables & small tablets (600px-767px) */
        @media (min-width: 600px) and (max-width: 767px) {
          .legal-msg-row { max-width: 85%; }
          .legal-chat-messages { padding: 20px 16px 12px; gap: 14px; }
          .legal-chat-header { padding: 12px 20px; }
          .legal-chat-input-area { padding: 8px 14px calc(10px + env(safe-area-inset-bottom, 0px)); }
          .legal-cases-container { align-items: center; padding: 20px; }
          .legal-cases-sheet { max-width: 400px; border-radius: 24px; max-height: 80vh; }
        }
        /* Tablets portrait (768px-1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .legal-msg-row { max-width: 80%; }
          .legal-chat-messages { padding: 24px 5% 14px; gap: 16px; }
          .legal-chat-header { padding: 14px 24px; }
          .legal-chat-input-area { padding: 10px 20px calc(12px + env(safe-area-inset-bottom, 0px)); }
          .legal-chat-input-form { max-width: 90%; margin: 0 auto; }
          .legal-cases-container { align-items: center; padding: 24px; }
          .legal-cases-sheet { max-width: 420px; border-radius: 24px; max-height: 80vh; }
        }
        /* Desktop (1024px-1279px) */
        @media (min-width: 1024px) {
          .legal-chat-messages { padding: 24px 8%; }
          .legal-msg-row { max-width: 72%; }
          .legal-cases-container { align-items: center; padding: 24px; }
          .legal-cases-sheet { max-width: 480px; border-radius: 24px; max-height: 80vh; }
        }
        /* Large desktop (1280px-1919px) */
        @media (min-width: 1280px) {
          .legal-chat-messages { padding: 28px 12%; }
          .legal-msg-row { max-width: 65%; }
          .legal-chat-input-form { max-width: 800px; margin: 0 auto; }
        }
        /* Ultra-wide / 4K (1920px+) */
        @media (min-width: 1920px) {
          .legal-chat-messages { padding: 32px 18%; }
          .legal-msg-row { max-width: 55%; }
          .legal-chat-input-form { max-width: 900px; }
          .legal-msg-ai-text { font-size: 15px; }
          .legal-msg-user-text { font-size: 15px; }
        }
        /* Landscape phones — reduce vertical space */
        @media (max-height: 500px) and (orientation: landscape) {
          .legal-chat-header { padding: 6px 12px; }
          .legal-chat-header-icon { width: 28px; height: 28px; }
          .legal-chat-input-area { padding: 4px 10px calc(4px + env(safe-area-inset-bottom, 0px)); }
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
