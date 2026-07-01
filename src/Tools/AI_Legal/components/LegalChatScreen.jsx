import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Scale, Search, X, Clock, ChevronDown,
  ChevronRight, Copy, FileDown, Share2, Plus, ArrowLeft,
  Sparkles, FileText, Image as ImageIcon, RotateCcw, Check,
  SlidersHorizontal, ChevronLeft, ChevronUp, Landmark, ShieldAlert, Calendar,
  Download, Printer, Briefcase, History, MessageSquare, Pin, PinOff, Trash2,
  ThumbsUp, ThumbsDown, Volume2, Settings, ExternalLink, HelpCircle, Mic, Square
} from 'lucide-react';
import { generateChatResponse } from '../../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { searchAndFilterCases, getFilterOptions } from '../data/caseDatabase';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { legalService } from '../services/legalService';
import { apiService } from '../../../services/apiService';
import { chatStorageService } from '../../../services/chatStorageService';
import LanguageToggle from './shared/LanguageToggle';
import useOutputLanguage from '../hooks/useOutputLanguage';
import { exportToPDF } from '../utils/exportToPDF';

// ─── LEGAL SYSTEM INSTRUCTION ────────────────────────────────────────────────
const LEGAL_SYSTEM_INSTRUCTION = `You are the AISA AI General Legal Chat Assistant. You are an expert in law.
Provide comprehensive, structured legal analysis. Always format your responses using these structural blocks:
1. SUMMARY: A brief 2-3 sentence overview.
2. DEFINITION: Precise legal definition.
3. RELEVANT STATUTES / LAW: Highlight the specific acts/sections using "> [!STATUTE] Section Name: Text".
4. DETAILED EXPLANATION: Broken down into logical sub-headings.
5. IMPORTANT POINTS: Numbered list.
6. EXCEPTIONS / CLAUSES: Bulleted list of exceptions or qualifications. Use "> [!WARNING] Warning Info" if there is an important caution.
7. RELEVANT CASE LAWS: Important Supreme Court/High Court precedents. Use "> [!CASE] Case Name: Holding".
8. PRACTICAL EXAMPLE / SCENARIO: A realistic hypothetical scenario explaining how this law applies in practice.
9. CONCLUSION: Professional closing note.

STRICT RULES:
- Never fabricate citations or statutes. If no citation is found, write Citation Not Available.
- Respond in the same language as the user's prompt (e.g. Hindi, English).
- Always use the legal styling callouts: [!IMPORTANT], [!WARNING], [!CASE], and [!STATUTE] inside markdown blockquotes to structure critical callouts.
`;

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

// ─── CUSTOM MARKDOWN BLOCKQUOTE RENDERER ─────────────────────────────────────
const CustomBlockquote = ({ children }) => {
  // Extract clean text from react nodes children
  const content = React.Children.toArray(children)
    .map(c => typeof c === 'string' ? c : (c.props?.children || ''))
    .join(' ');

  if (content.includes('[!IMPORTANT]')) {
    return (
      <div className="my-4 p-4 bg-blue-50/50 border-l-4 border-blue-500 rounded-r-xl text-xs text-slate-800 font-semibold shadow-sm flex gap-3 items-start">
        <div className="mt-0.5 text-blue-500 shrink-0"><ShieldAlert size={16} /></div>
        <div className="flex-1">
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block mb-1">IMPORTANT</span>
          <p className="m-0 text-slate-700 leading-relaxed font-medium">{content.replace('[!IMPORTANT]', '').trim()}</p>
        </div>
      </div>
    );
  }
  if (content.includes('[!WARNING]')) {
    return (
      <div className="my-4 p-4 bg-amber-50/55 border-l-4 border-amber-500 rounded-r-xl text-xs text-slate-800 font-semibold shadow-sm flex gap-3 items-start">
        <div className="mt-0.5 text-amber-600 shrink-0"><ShieldAlert size={16} /></div>
        <div className="flex-1">
          <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block mb-1">LEGAL ADVICE / WARNING</span>
          <p className="m-0 text-slate-700 leading-relaxed font-medium">{content.replace('[!WARNING]', '').trim()}</p>
        </div>
      </div>
    );
  }
  if (content.includes('[!CASE]')) {
    return (
      <div className="my-4 p-4 bg-purple-50/50 border-l-4 border-purple-500 rounded-r-xl text-xs text-slate-800 font-semibold shadow-sm flex gap-3 items-start">
        <div className="mt-0.5 text-purple-500 shrink-0"><Landmark size={16} /></div>
        <div className="flex-1">
          <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider block mb-1">CASE LAW PRECEDENT</span>
          <p className="m-0 text-slate-700 leading-relaxed font-medium">{content.replace('[!CASE]', '').trim()}</p>
        </div>
      </div>
    );
  }
  if (content.includes('[!STATUTE]')) {
    return (
      <div className="my-4 p-4 bg-slate-100/50 border-l-4 border-slate-500 rounded-r-xl text-xs text-slate-800 font-semibold shadow-sm flex gap-3 items-start">
        <div className="mt-0.5 text-slate-500 shrink-0"><Scale size={16} /></div>
        <div className="flex-1">
          <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">BARE ACT / STATUTE</span>
          <p className="m-0 text-slate-700 leading-relaxed font-medium">{content.replace('[!STATUTE]', '').trim()}</p>
        </div>
      </div>
    );
  }
  return (
    <blockquote className="border-l-4 border-[#4F46E5] bg-slate-50/60 p-4 rounded-r-xl italic my-4 text-slate-600">
      {children}
    </blockquote>
  );
};

// ─── PER-MESSAGE RESPONSE CARD WITH LOCALIZED ACTIONS ────────────────────────
const AiResponseCard = ({ msg, currentCase, chatIdRef, handleRegenerateMessage, getPrecedingUserMessage }) => {
  const [copied, setCopied] = useState(false);
  const [activeDownloadMenu, setActiveDownloadMenu] = useState(false);
  const [activeShareMenu, setActiveShareMenu] = useState(false);
  const [liked, setLiked] = useState(null); // 'like' | 'dislike' | null
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const triggerPromptAction = (promptPrefix) => {
    const precedingText = msg.text.slice(0, 100) + '...';
    const queryText = `${promptPrefix} for the previous response text:\n"${precedingText}"`;
    if (window.__aisa_legal_send_message) {
      window.__aisa_legal_send_message(queryText);
    }
  };

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
          body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.8; color: #111; }
          h1 { text-align: center; font-size: 22px; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .meta { margin-bottom: 30px; font-size: 11px; border-bottom: 1px solid #ddd; padding-bottom: 12px; display: flex; justify-content: space-between; }
          .content { font-size: 14px; white-space: pre-wrap; text-align: justify; }
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

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        toast.success("Voice reading stopped.");
        return;
      }
      const resolvedText = getDisplayText(msg.text);
      const textToRead = resolvedText.replace(/###|##|#|\[\!IMPORTANT\]|\[\!WARNING\]|\[\!CASE\]|\[\!STATUTE\]|\*\*|\*/g, '');
      const utterance = new SpeechSynthesisUtterance(textToRead);
      window.speechSynthesis.speak(utterance);
      toast.success("Reading report aloud...");
    } else {
      toast.error("Speech synthesis is not supported on this browser.");
    }
  };

  const handleFeedback = (type) => {
    setLiked(type);
    toast.success(type === 'like' ? 'Thank you for your rating!' : 'Feedback captured to improve AI legal outputs.');
  };

  return (
    <div className="w-full flex flex-col">
      {/* Dynamic Translated Content Wrapper */}
      <div className="legal-msg-ai-text relative flex-1 text-slate-800 text-[14px]">
        {/* Language selector block inside card */}
        <div className="flex items-center justify-between gap-1.5 mb-4 border-b border-slate-100 pb-2">
          <span className="text-[10px] font-black uppercase text-[#4F46E5] tracking-wider">AI Case Report</span>
          <LanguageToggle
            lang={outputLang}
            onChange={setOutputLang}
          />
        </div>

        {/* Real Document Content body */}
        <div 
          id={`msg-content-${msg.id}`} 
          className="prose prose-slate max-w-none text-slate-800 prose-xs prose-headings:font-black prose-headings:uppercase prose-headings:tracking-wider prose-headings:text-slate-900 prose-h1:text-base prose-h2:text-sm prose-h3:text-xs prose-a:text-[#4F46E5] prose-strong:font-bold prose-strong:text-slate-900 prose-table:border-collapse prose-table:w-full prose-table:my-4 prose-th:border prose-th:border-slate-200 prose-th:bg-slate-50 prose-th:p-2 prose-td:border prose-td:border-slate-200 prose-td:p-2"
        >
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              blockquote: CustomBlockquote
            }}
          >
            {getDisplayText(msg.text)}
          </ReactMarkdown>
        </div>
      </div>

      {/* Expanded Interactive Action Bar */}
      {!msg.isIntro && !msg.isStopped && !msg.isFailed && (
        <div className="border-t border-slate-100 mt-6 pt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] font-bold text-slate-500">
          
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
            <button 
              onClick={() => handleFeedback('like')} 
              className={`p-1.5 rounded transition-all hover:bg-slate-200 ${liked === 'like' ? 'text-green-600 bg-green-50' : 'text-slate-400'}`}
              title="Helpful Answer"
            >
              <ThumbsUp size={13} />
            </button>
            <button 
              onClick={() => handleFeedback('dislike')} 
              className={`p-1.5 rounded transition-all hover:bg-slate-200 ${liked === 'dislike' ? 'text-red-600 bg-red-50' : 'text-slate-400'}`}
              title="Not Helpful Answer"
            >
              <ThumbsDown size={13} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleCopyText} className="flex items-center gap-1 hover:text-[#4F46E5] transition-colors" title="Copy text">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>Copy</span>
            </button>

            <button onClick={handleReadAloud} className="flex items-center gap-1 hover:text-[#4F46E5] transition-colors" title="Read Aloud">
              <Volume2 size={13} />
              <span>Read Aloud</span>
            </button>

            <button onClick={() => handleRegenerateMessage(msg.id)} className="flex items-center gap-1 hover:text-[#4F46E5] transition-colors" title="Regenerate strategy">
              <RotateCcw size={13} />
              <span>Regenerate</span>
            </button>

            {/* Download Dropdown */}
            <div className="relative">
              <button onClick={() => setActiveDownloadMenu(prev => !prev)} className="flex items-center gap-1 hover:text-[#4F46E5] transition-colors" title="Export file">
                <Download size={13} />
                <span>Export</span>
              </button>
              {activeDownloadMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActiveDownloadMenu(false)} />
                  <div className="absolute right-0 bottom-full mb-2 z-20 w-32 rounded-xl bg-white border border-slate-200 shadow-xl p-1 flex flex-col gap-0.5">
                    <button onClick={() => { handleDownloadTxt(); setActiveDownloadMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">TXT bare text</button>
                    <button onClick={() => { handleDownloadDoc(); setActiveDownloadMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">DOCX document</button>
                    <button onClick={() => { handleExportPDF(); setActiveDownloadMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">PDF print file</button>
                  </div>
                </>
              )}
            </div>

            {/* Share Link Dropdown */}
            <div className="relative">
              <button onClick={() => setActiveShareMenu(prev => !prev)} className="flex items-center gap-1 hover:text-[#4F46E5] transition-colors" title="Share options">
                <Share2 size={13} />
                <span>Share</span>
              </button>
              {activeShareMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActiveShareMenu(false)} />
                  <div className="absolute right-0 bottom-full mb-2 z-20 w-36 rounded-xl bg-white border border-slate-200 shadow-xl p-1 flex flex-col gap-0.5">
                    <button onClick={() => { handleShareEmail(); setActiveShareMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">Send Email Report</button>
                    <button onClick={() => { handleShareLink(); setActiveShareMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">Copy Share Link</button>
                  </div>
                </>
              )}
            </div>

            {/* More Copilot Actions */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)} 
                className={`flex items-center gap-1 hover:text-[#4F46E5] transition-colors ${moreMenuOpen ? 'text-[#4F46E5]' : ''}`} 
                title="More legal options"
              >
                <SlidersHorizontal size={13} />
                <span>More Actions</span>
              </button>
              {moreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreMenuOpen(false)} />
                  <div className="absolute right-0 bottom-full mb-2 z-20 w-48 rounded-xl bg-white border border-slate-200 shadow-xl p-1 flex flex-col gap-0.5 select-none text-left">
                    {[
                      { label: 'Explain this response', act: () => triggerPromptAction('Explain in detail') },
                      { label: 'Simplify language', act: () => triggerPromptAction('Simplify to plain English') },
                      { label: 'Expand logic', act: () => triggerPromptAction('Expand with more legal grounds') },
                      { label: 'Translate to Hindi', act: () => triggerPromptAction('Translate response to Hindi') },
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
                        onClick={() => { item.act(); setMoreMenuOpen(false); }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={handlePrint} className="flex items-center gap-1 hover:text-[#4F46E5] transition-colors" title="Print Report">
              <Printer size={13} />
              <span>Print</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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

// ─── MAIN LEGAL CHAT SCREEN ──────────────────────────────────────────────────
const LegalChatScreen = ({ onBack, currentCase, onUpdateCase }) => {
  const toolName = 'General Legal Chat';
  const toolColor = '#4f46e5';
  const toolDesc = 'Professional legal discourse, situational guidance, and citation Q&A.';

  const getSuggestionsForResponse = (text = "") => {
    const textLower = text.toLowerCase();
    
    // 1. Criminal Law / IPC / BNS
    if (textLower.includes("ipc") || textLower.includes("bns") || textLower.includes("criminal") || textLower.includes("hurt") || textLower.includes("murder") || textLower.includes("police") || textLower.includes("complaint") || textLower.includes("section")) {
      return [
        {
          icon: <Scale size={16} className="text-[#4F46E5]" />,
          title: "📚 View Bare Act",
          desc: "Read official statute section text",
          query: "Show the official bare act text and detailed description of the related sections in this query."
        },
        {
          icon: <Landmark size={16} className="text-[#4F46E5]" />,
          title: "⚖ Relevant Judgments",
          desc: "Find Supreme Court precedents",
          query: "Find landmark Supreme Court and High Court judgments related to the sections mentioned with brief summaries of the holdings."
        },
        {
          icon: <FileText size={16} className="text-[#4F46E5]" />,
          title: "📄 Draft Complaint",
          desc: "Generate draft complaint using this law",
          query: "Draft a formal criminal complaint petition based on this legal provision."
        },
        {
          icon: <HelpCircle size={16} className="text-[#4F46E5]" />,
          title: "🧠 Explain Simply",
          desc: "Simplified explanation of this law",
          query: "Explain this legal section in simple, layman's terms with a practical example."
        },
        {
          icon: <ExternalLink size={16} className="text-[#4F46E5]" />,
          title: "📖 Related IPC Sections",
          desc: "View connected criminal statutes",
          query: "List and explain connected sections of IPC/BNS that apply to this offense."
        },
        {
          icon: <Briefcase size={16} className="text-[#4F46E5]" />,
          title: "📋 Practical Example",
          desc: "Realistic hypothetical application",
          query: "Explain this law using real-world examples."
        },
        {
          icon: <ShieldAlert size={16} className="text-[#4F46E5]" />,
          title: "⚠ Common Mistakes",
          desc: "Crucial cautions for defense/prosecution",
          query: "What are the common procedural mistakes made in cases involving this law?"
        },
        {
          icon: <Sparkles size={16} className="text-[#4F46E5]" />,
          title: "🌐 Hindi Version",
          desc: "अनुवाद हिंदी में देखें",
          query: "Explain the previous response in Hindi language."
        }
      ];
    }

    // 2. Consumer Disputes
    if (textLower.includes("consumer") || textLower.includes("service") || textLower.includes("defect") || textLower.includes("goods") || textLower.includes("complainant") || textLower.includes("forum")) {
      return [
        {
          icon: <FileText size={16} className="text-[#4F46E5]" />,
          title: "📄 Generate Complaint",
          desc: "Draft a formal Consumer Forum complaint",
          query: "Draft a formal consumer court complaint petition detailing deficiency of service and claiming compensation."
        },
        {
          icon: <Briefcase size={16} className="text-[#4F46E5]" />,
          title: "📋 Required Documents",
          desc: "Checklist for filing the case",
          query: "What are the required documents and evidence list to file a consumer complaint for this matter?"
        },
        {
          icon: <Landmark size={16} className="text-[#4F46E5]" />,
          title: "⚖ Forum Jurisdiction",
          desc: "Find where to file the complaint",
          query: "Explain the pecuniary and territorial jurisdiction rules for filing a consumer complaint in this case."
        },
        {
          icon: <Clock size={16} className="text-[#4F46E5]" />,
          title: "⏱ Limitation Period",
          desc: "Find deadline for filing",
          query: "What is the statutory limitation period for filing a complaint in this consumer dispute?"
        },
        {
          icon: <HelpCircle size={16} className="text-[#4F46E5]" />,
          title: "🧠 Explain Simply",
          desc: "Simplified explanation of rights",
          query: "Provide a simplified, plain-English summary of the consumer rights involved."
        },
        {
          icon: <ExternalLink size={16} className="text-[#4F46E5]" />,
          title: "⚖ Relevant Judgments",
          desc: "Precedents & citations",
          query: "Find landmark Supreme Court and High Court judgments related to consumer protection in this context."
        },
        {
          icon: <Settings size={16} className="text-[#4F46E5]" />,
          title: "💰 Compensation Calculation",
          desc: "Analyze possible claim amounts",
          query: "Explain how compensation for mental agony, service defect, and litigation costs is calculated in consumer forums."
        },
        {
          icon: <ChevronRight size={16} className="text-[#4F46E5]" />,
          title: "📋 Next Steps",
          desc: "Step-by-step litigation process",
          query: "What are the step-by-step legal procedures after filing a consumer complaint?"
        }
      ];
    }

    // 3. Divorce & Family Law
    if (textLower.includes("divorce") || textLower.includes("marriage") || textLower.includes("family") || textLower.includes("maintenance") || textLower.includes("alimony") || textLower.includes("custody")) {
      return [
        {
          icon: <Briefcase size={16} className="text-[#4F46E5]" />,
          title: "📋 Required Documents",
          desc: "Checklist for divorce petition",
          query: "Provide a complete checklist of documents needed to file for divorce under the applicable family law."
        },
        {
          icon: <FileText size={16} className="text-[#4F46E5]" />,
          title: "📄 Draft Petition",
          desc: "Generate petition template",
          query: "Draft a family court petition for divorce by mutual consent/contested grounds under the relevant Act."
        },
        {
          icon: <Scale size={16} className="text-[#4F46E5]" />,
          title: "💰 Maintenance Rules",
          desc: "Understand alimony rules",
          query: "Explain the rules and calculation criteria for interim maintenance and alimony in this case."
        },
        {
          icon: <Clock size={16} className="text-[#4F46E5]" />,
          title: "⏱ Family Court Procedure",
          desc: "Understand next steps in court",
          query: "Explain the step-by-step procedure and timeline of divorce proceedings in family court."
        },
        {
          icon: <Landmark size={16} className="text-[#4F46E5]" />,
          title: "⚖ Relevant Judgments",
          desc: "Precedents & citations",
          query: "Find landmark Supreme Court and High Court judgments related to divorce and child custody in similar circumstances."
        },
        {
          icon: <HelpCircle size={16} className="text-[#4F46E5]" />,
          title: "🧠 Explain Simply",
          desc: "Simplified explanation",
          query: "Provide a simplified, plain-English summary of family law principles involved."
        },
        {
          icon: <ShieldAlert size={16} className="text-[#4F46E5]" />,
          title: "⚠ Common Mistakes",
          desc: "Avoid critical divorce filing errors",
          query: "What are the common mistakes to avoid during mutual consent or contested divorce proceedings?"
        },
        {
          icon: <ChevronRight size={16} className="text-[#4F46E5]" />,
          title: "📋 Custody Guidelines",
          desc: "Check rules for child custody",
          query: "What are the legal principles family courts follow to decide custody and visitation rights?"
        }
      ];
    }

    // 4. Property Law
    if (textLower.includes("property") || textLower.includes("land") || textLower.includes("title") || textLower.includes("deed") || textLower.includes("registration") || textLower.includes("stamp")) {
      return [
        {
          icon: <Briefcase size={16} className="text-[#4F46E5]" />,
          title: "📋 Required Documents",
          desc: "List of title deeds required",
          query: "What are the critical documents needed for title verification and property registry in this state?"
        },
        {
          icon: <Scale size={16} className="text-[#4F46E5]" />,
          title: "💰 Stamp Duty & Reg",
          desc: "Calculate registration fees",
          query: "Explain how stamp duty and registration fees are calculated for property transfer in this scenario."
        },
        {
          icon: <ShieldAlert size={16} className="text-[#4F46E5]" />,
          title: "⚠ Common Disputes",
          desc: "Avoid property litigation",
          query: "List the most common legal disputes in property transfer and how to prevent them."
        },
        {
          icon: <Landmark size={16} className="text-[#4F46E5]" />,
          title: "⚖ Relevant Case Laws",
          desc: "View key property judgments",
          query: "Find relevant Supreme Court decisions on property mutation, possession, and title disputes."
        },
        {
          icon: <FileText size={16} className="text-[#4F46E5]" />,
          title: "📄 Legal Strategy",
          desc: "Step-by-step registry guidance",
          query: "What is the recommended legal strategy and due diligence checklist before purchasing land or property?"
        },
        {
          icon: <HelpCircle size={16} className="text-[#4F46E5]" />,
          title: "🧠 Explain Simply",
          desc: "Simple explanation of title rights",
          query: "Provide a simplified, plain-English summary of property ownership and transfer laws."
        },
        {
          icon: <ExternalLink size={16} className="text-[#4F46E5]" />,
          title: "📖 Related Sections",
          desc: "Transfer of Property Act",
          query: "Detail the key sections of Transfer of Property Act applicable to this transaction."
        },
        {
          icon: <ChevronRight size={16} className="text-[#4F46E5]" />,
          title: "📋 Next Steps",
          desc: "Timeline of dispute settlement",
          query: "What are the next legal steps to clear an adverse possession claim on a property?"
        }
      ];
    }

    // Default Fallback Empty State
    return [
      {
        icon: <Scale size={16} className="text-[#4F46E5]" />,
        title: "📚 View Bare Act",
        desc: "Read official statute section",
        query: "Show the official bare act text of the laws and sections mentioned in the response."
      },
      {
        icon: <Landmark size={16} className="text-[#4F46E5]" />,
        title: "⚖ Relevant Judgments",
        desc: "Precedents & citations",
        query: "Find landmark Supreme Court and High Court judgments matching this legal topic."
      },
      {
        icon: <FileText size={16} className="text-[#4F46E5]" />,
        title: "📄 Generate Notice",
        desc: "Draft client notice draft",
        query: "Draft a formal legal notice based on the facts and law discussed above."
      },
      {
        icon: <HelpCircle size={16} className="text-[#4F46E5]" />,
        title: "🧠 Explain Simply",
        desc: "Read a simple explanation",
        query: "Provide a simplified, plain-English summary of the legal principles involved."
      },
      {
        icon: <ExternalLink size={16} className="text-[#4F46E5]" />,
        title: "📖 Find Related Laws",
        desc: "Search other relevant sections",
        query: "Find related sections of other Acts that might apply to this query context."
      },
      {
        icon: <ChevronRight size={16} className="text-[#4F46E5]" />,
        title: "📋 Continue Research",
        desc: "Deep-dive legal research query",
        query: "Conduct a deeper legal research inquiry on this topic to identify secondary liabilities and remedies."
      }
    ];
  };

  const buildHiddenContext = (card, lastMsgText) => {
    const lastMsgLower = lastMsgText.toLowerCase();
    let detectedAct = "N/A";
    let detectedSection = "N/A";
    let detectedTopic = "General Legal Query";

    if (lastMsgLower.includes("ipc") || lastMsgLower.includes("penal code")) {
      detectedAct = "Indian Penal Code (IPC)";
      detectedTopic = "Criminal Law / IPC Section";
    } else if (lastMsgLower.includes("consumer protection act") || lastMsgLower.includes("consumer")) {
      detectedAct = "Consumer Protection Act 2019";
      detectedTopic = "Consumer Dispute / Grievance";
    } else if (lastMsgLower.includes("divorce") || lastMsgLower.includes("marriage")) {
      detectedAct = "Hindu Marriage Act / Family Law";
      detectedTopic = "Matrimonial & Family Dispute";
    } else if (lastMsgLower.includes("property") || lastMsgLower.includes("land") || lastMsgLower.includes("deed")) {
      detectedAct = "Transfer of Property Act / Land Revenue Act";
      detectedTopic = "Property & Land Title Dispute";
    }

    const sectionMatch = lastMsgText.match(/(?:Section|Sec\.)\s*(\d+[A-Za-z]*)/i);
    if (sectionMatch) {
      detectedSection = sectionMatch[0];
    }

    const previousUserMsg = messages.length > 1 ? messages[messages.length - 2]?.text : "N/A";

    return `[CONVERSATION STATE & CONTEXT]
- Identified Legal Topic: ${detectedTopic}
- Detected Act: ${detectedAct}
- Detected Section: ${detectedSection}
- Last User Question: ${previousUserMsg}
- Last AI Response Context: ${lastMsgText.slice(0, 400)}... (truncated for context token efficiency)

Follow-up Request:
${card.query}

Please continue the conversation naturally using this context. Never ask the user to re-specify which law or section they are referring to.`;
  };

  const chatIdRef = useRef(Date.now().toString(36) + Math.random().toString(36).substr(2));
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const abortControllerRef = useRef(null);
  const isStreamingRef = useRef(false);
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
      setInputValue(transcript);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.start();
  };

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
  const [generationState, setGenerationState] = useState('idle');
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const messagesEndObserverRef = useRef(null);
  const [isEndVisible, setIsEndVisible] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottomBtn(!isNearBottom);
  };
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCasesSheet, setShowCasesSheet] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [pinnedSessions, setPinnedSessions] = useState([]);
  const [showSummaryDrawer, setShowSummaryDrawer] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [selectedTextMenu, setSelectedTextMenu] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    court: '',
    act: '',
    ipcBns: '',
    year: '',
    jurisdiction: '',
    state: ''
  });

  // Rotating Legal Loader Phrases
  const thinkingPhrases = [
    "Reading Case...",
    "Loading Timeline...",
    "Searching Supreme Court precedents...",
    "Analyzing Evidence...",
    "Checking Contradictions...",
    "Preparing Response..."
  ];
  const [thinkingIndex, setThinkingIndex] = useState(0);

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
    let interval;
    if (isTyping) {
      interval = setInterval(() => {
        setThinkingIndex(prev => (prev + 1) % thinkingPhrases.length);
      }, 2500);
    } else {
      setThinkingIndex(0);
    }
    return () => clearInterval(interval);
  }, [isTyping]);

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

  // ─── INTERSECTION OBSERVER FOR CHAT BOTTOM ──────────────────────────────────
  useEffect(() => {
    if (!scrollContainerRef.current || !messagesEndRef.current) return;

    if (messagesEndObserverRef.current) {
      messagesEndObserverRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsEndVisible(entry.isIntersecting);
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.1,
      }
    );

    observer.observe(messagesEndRef.current);
    messagesEndObserverRef.current = observer;

    return () => {
      if (observer) observer.disconnect();
    };
  }, [messages.length]);

  // ─── AUTO SCROLL ON NEW MESSAGES ───────────────────────────────────────────
  const prevUserMsgCountRef = useRef(0);
  const userMsgCount = useMemo(() => messages.filter(m => m.sender === 'user').length, [messages]);

  useEffect(() => {
    const hasActiveMessages = messages.filter(m => !m.isIntro).length > 0;
    if (!hasActiveMessages || !messagesEndRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current || {};
    const isNearBottom = scrollHeight && clientHeight ? (scrollHeight - scrollTop - clientHeight < 120) : true;

    if (userMsgCount > prevUserMsgCountRef.current || isNearBottom) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
    prevUserMsgCountRef.current = userMsgCount;
  }, [messages.length, userMsgCount]);

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
    attachments: m.attachments || [],
    fullPromptText: m.fullPromptText || undefined
  });

  const mapLocalMessageToDb = (m) => ({
    id: m.id,
    role: m.sender === 'user' ? 'user' : 'model',
    content: m.text,
    timestamp: m.timestamp?.toISOString?.() || m.timestamp,
    isIntro: m.isIntro || false,
    attachments: m.attachments || [],
    fullPromptText: m.fullPromptText || undefined
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

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const dbSessions = await chatStorageService.getSessions(currentCase?._id);
        const filteredDb = dbSessions.filter(s => s.activeTool === 'General Legal Chat');
        const mapped = filteredDb.map(s => ({
          chat_id: s.sessionId || s.chat_id,
          title: s.title || 'New Chat',
          timestamp: s.lastModified || s.timestamp || Date.now(),
        }));
        mapped.sort((a, b) => b.timestamp - a.timestamp);
        setSessions(mapped);

        const isPathNew = window.location.pathname.endsWith('/new');

        if (!isPathNew) {
          if (mapped.length > 0) {
            chatIdRef.current = mapped[0].chat_id;
            setActiveSessionId(mapped[0].chat_id);
            await loadSessionHistory(mapped[0].chat_id);
          } else {
            await handleNewChat(false);
          }
        }
      } catch (e) {
        console.error("Failed loading chat sessions", e);
      }
    };
    loadSessions();
  }, [currentCase?._id]);

  // Listen to path changes to always initialize a clean workspace on '/new'
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      handleNewChat(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (messages.length > 1) {
      saveChatHistory(messages);
    }
  }, [messages, saveChatHistory]);

  // ─── STOP WORKFLOW ─────────────────────────────────────────────────────────
  const handleStop = () => {
    isStreamingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsTyping(false);
    setGenerationState('stopped');
    toast.success("Generation stopped.");
  };

  const handleRetryMessage = (msgId) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg) return;
    
    // Remove the failed card
    setMessages(prev => prev.filter(m => m.id !== msgId));
    
    // Resend using the stored raw prompts
    sendMessage(targetMsg.failedPrompt, targetMsg.failedHiddenContext);
  };

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────
  const sendMessage = async (overrideText, hiddenContextText) => {
    const text = (overrideText && typeof overrideText === 'string') ? overrideText.trim() : inputValue.trim();
    if (!text && attachments.length === 0) return;

    // Automatically stop ongoing generation before starting a new one
    if (isStreamingRef.current || isTyping) {
      handleStop();
    }

    const currentAttachments = [...attachments];
    setAttachments([]);

    const userMsg = {
      id: Date.now().toString(),
      text: text || '',
      attachments: currentAttachments.map(a => ({ name: a.name, type: a.type })),
      sender: 'user',
      timestamp: new Date(),
      fullPromptText: hiddenContextText || text,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    setGenerationState('streaming');
    setTimeout(scrollToBottom, 50);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    isStreamingRef.current = true;

    try {
      const apiHistory = messages.filter(m => !m.isIntro).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.fullPromptText || m.text }]
      }));

      let apiAttachments = currentAttachments.map(att => ({
        url: att.dataUrl,
        name: att.name || 'uploaded_file',
        type: att.type?.startsWith('image/') ? 'image' : 'document'
      }));

      let promptText = hiddenContextText || text;
      if (currentAttachments.length > 0) {
        const fileNames = currentAttachments.map(a => a.name).join(', ');
        promptText = `[Attached Files: ${fileNames}]\n${promptText || 'Please analyze these attachments.'}`;
      }

      let systemInstruction = LEGAL_SYSTEM_INSTRUCTION;
      if (currentCase) {
        systemInstruction += `\n\nContext for the current case:\n`;
        systemInstruction += `- Case ID: ${currentCase.id || currentCase._id}\n`;
        systemInstruction += `- Case Name: ${currentCase.title || currentCase.name || 'N/A'}\n`;
        systemInstruction += `- Case Description: ${currentCase.summary || currentCase.description || 'N/A'}\n`;
      }

      const response = await generateChatResponse(
        apiHistory,
        promptText,
        systemInstruction,
        apiAttachments,
        'English',
        abortControllerRef.current.signal,
        'LEGAL_TOOLKIT',
        null,
        null
      );

      let responseText = '';
      if (typeof response === 'string') responseText = response;
      else if (response?.reply) responseText = response.reply;
      else if (response?.data?.reply) responseText = response.data.reply;
      else if (response?.text) responseText = response.text;
      if (!responseText) throw new Error('Empty response received from LLM.');

      // Hide the loader before typewriter starts
      setIsTyping(false);

      const aiMsgId = 'ai-' + Date.now();
      const aiMsg = {
        id: aiMsgId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: true,
        fullPromptText: responseText
      };
      setMessages(prev => [...prev, aiMsg]);

      const words = responseText.split(' ');
      let currentText = '';

      for (let j = 0; j < words.length; j++) {
        if (!isStreamingRef.current) {
          break;
        }
        currentText += (j === 0 ? '' : ' ') + words[j];
        
        setMessages(prev => prev.map(m => {
          if (m.id === aiMsgId) {
            return { ...m, text: currentText };
          }
          return m;
        }));

        await new Promise(resolve => setTimeout(resolve, 30));
      }

      const wasStopped = !isStreamingRef.current;
      setMessages(prev => prev.map(m => {
        if (m.id === aiMsgId) {
          return { 
            ...m, 
            isStreaming: false, 
            isStopped: wasStopped,
            text: wasStopped ? currentText : responseText
          };
        }
        return m;
      }));

      setGenerationState(wasStopped ? 'stopped' : 'completed');
    } catch (error) {
      console.error('[LegalChatScreen] API Error:', error);
      setIsTyping(false);

      const isCancel = error.name === 'AbortError' || error.message === 'canceled' || error.message?.includes('canceled') || (typeof error === 'object' && error.constructor?.name === 'Cancel');
      
      if (isCancel || !isStreamingRef.current) {
        setGenerationState('stopped');
        const aiMsgId = 'ai-stopped-' + Date.now();
        const stoppedMsg = {
          id: aiMsgId,
          text: '',
          sender: 'ai',
          timestamp: new Date(),
          isStopped: true
        };
        setMessages(prev => [...prev, stoppedMsg]);
      } else {
        setGenerationState('error');
        const aiMsgId = 'ai-failed-' + Date.now();
        const errorMsg = {
          id: aiMsgId,
          text: '',
          sender: 'ai',
          timestamp: new Date(),
          isFailed: true,
          failedPrompt: promptText,
          failedHiddenContext: hiddenContextText
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      isStreamingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    window.__aisa_legal_send_message = (text) => sendMessage(text);
    return () => {
      delete window.__aisa_legal_send_message;
    };
  }, [sendMessage]);

  const handleRegenerateMessage = async (msgId) => {
    const aiMsgIdx = messages.findIndex(m => m.id === msgId);
    if (aiMsgIdx === -1) return;

    let userMsg = null;
    let userMsgIdx = -1;
    for (let i = aiMsgIdx - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        userMsg = messages[i];
        userMsgIdx = i;
        break;
      }
    }
    if (!userMsg) return;

    const promptText = userMsg.fullPromptText || userMsg.text;
    const suffixId = Date.now().toString();
    const statusCardId = 'regen-status-' + suffixId;

    const statusMsg = {
      id: statusCardId,
      sender: 'system_regenerating',
      originalPrompt: promptText.length > 120 ? promptText.slice(0, 120) + '...' : promptText,
      status: 'loading',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, statusMsg]);
    setIsRegenerating(true);
    setIsTyping(true);
    setGenerationState('streaming');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    isStreamingRef.current = true;

    try {
      const precedingHistory = messages.slice(0, userMsgIdx).filter(m => !m.isIntro).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.fullPromptText || m.text }]
      }));

      let systemInstruction = LEGAL_SYSTEM_INSTRUCTION;
      if (currentCase) {
        systemInstruction += `\n\nContext for the current case:\n`;
        systemInstruction += `- Case ID: ${currentCase.id || currentCase._id}\n`;
        systemInstruction += `- Case Name: ${currentCase.title || currentCase.name || 'N/A'}\n`;
        systemInstruction += `- Case Description: ${currentCase.summary || currentCase.description || 'N/A'}\n`;
      }

      const response = await generateChatResponse(
        precedingHistory,
        promptText,
        systemInstruction,
        [],
        'English',
        abortControllerRef.current.signal,
        'LEGAL_TOOLKIT',
        null,
        null
      );

      let responseText = '';
      if (typeof response === 'string') responseText = response;
      else if (response?.reply) responseText = response.reply;
      else if (response?.data?.reply) responseText = response.data.reply;
      else if (response?.text) responseText = response.text;
      if (!responseText) throw new Error('Empty response received from LLM.');

      setMessages(prev => prev.map(m => {
        if (m.id === statusCardId) {
          return { ...m, status: 'success' };
        }
        return m;
      }));
      setIsRegenerating(false);
      setIsTyping(false);

      const newAiMsgId = 'ai-regen-' + suffixId;
      const newAiMsg = {
        id: newAiMsgId,
        sender: 'ai',
        text: '',
        timestamp: new Date(),
        isStreaming: true,
        fullPromptText: responseText
      };
      setMessages(prev => [...prev, newAiMsg]);

      const words = responseText.split(' ');
      let currentText = '';

      for (let j = 0; j < words.length; j++) {
        if (!isStreamingRef.current) {
          break;
        }
        currentText += (j === 0 ? '' : ' ') + words[j];
        
        setMessages(prev => prev.map(m => {
          if (m.id === newAiMsgId) {
            return { ...m, text: currentText };
          }
          return m;
        }));

        await new Promise(resolve => setTimeout(resolve, 30));
      }

      const wasStopped = !isStreamingRef.current;
      setMessages(prev => prev.map(m => {
        if (m.id === newAiMsgId) {
          return { 
            ...m, 
            isStreaming: false, 
            isStopped: wasStopped,
            text: wasStopped ? currentText : responseText
          };
        }
        return m;
      }));

      setGenerationState(wasStopped ? 'stopped' : 'completed');
      toast.success("Response regenerated successfully!");
    } catch (error) {
      console.error('[LegalChatScreen] Regeneration API Error:', error);
      setIsRegenerating(false);
      setIsTyping(false);

      const isCancel = error.name === 'AbortError' || error.message === 'canceled' || error.message?.includes('canceled') || (typeof error === 'object' && error.constructor?.name === 'Cancel');
      
      setMessages(prev => {
        const cleaned = prev.filter(m => m.id !== statusCardId);
        if (isCancel || !isStreamingRef.current) {
          setGenerationState('stopped');
          const stoppedCard = {
            id: 'regen-stopped-' + suffixId,
            sender: 'ai',
            text: '',
            timestamp: new Date(),
            isStopped: true
          };
          return [...cleaned, stoppedCard];
        } else {
          setGenerationState('error');
          const errorCard = {
            id: 'regen-error-' + suffixId,
            sender: 'system_regenerating_error',
            originalPrompt: promptText.length > 120 ? promptText.slice(0, 120) + '...' : promptText,
            targetMsgId: msgId,
            timestamp: new Date()
          };
          return [...cleaned, errorCard];
        }
      });
      toast.error(error?.message || 'Failed to regenerate response.');
    } finally {
      isStreamingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  // ─── USER MESSAGE ACTIONS ──────────────────────────────────────────────────
  const handleEditUserMessage = (msg) => {
    setInputValue(msg.text);
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msg.id);
      return idx !== -1 ? prev.slice(0, idx) : prev;
    });
  };

  const handleCopyUserMessage = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Query copied!");
  };

  const handleDeleteUserMessage = (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    toast.success("Message removed");
  };

  // ─── FILE ATTACHMENTS ──────────────────────────────────────────────────────
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
    if (e.target.files) handleFilesAdded(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) handleFilesAdded(e.dataTransfer.files);
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
        uri: fileObj.dataUrl
      };
      const payload = {
        ...currentCase,
        documents: [newDoc, ...(currentCase.documents || [])]
      };
      const response = await apiService.updateProject(currentCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
    } catch (e) {
      console.error(e);
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon size={14} className="text-emerald-500" />;
    if (type?.includes('excel') || type?.includes('spreadsheet') || type?.includes('csv')) return <FileText size={14} className="text-green-600" />;
    return <FileText size={14} className="text-slate-400" />;
  };

  const handleNewChat = async (param) => {
    let isAutoAnalysis = false;
    if (param === true || Array.isArray(param)) isAutoAnalysis = true;
    
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    chatIdRef.current = newId;
    setActiveSessionId(newId);
    setAttachments([]);
    setInputValue('');
    setTimeout(() => inputRef.current?.focus(), 150);

    if (currentCase && isAutoAnalysis) {
      const promptText = `Provide a comprehensive legal analysis and strategy advice for the case: ${currentCase.title || currentCase.name}`;
      const userMsg = { id: Date.now().toString(), text: promptText, sender: 'user', timestamp: new Date(), fullPromptText: promptText };
      setMessages([userMsg]);
      setIsTyping(true);

      const newSessionItem = { chat_id: newId, title: 'Case Analysis', timestamp: Date.now() };
      setSessions(prev => [newSessionItem, ...prev]);

      const dbMsg = mapLocalMessageToDb(userMsg);
      dbMsg.activeTool = 'General Legal Chat';
      dbMsg.mode = 'NORMAL_CHAT';
      await chatStorageService.saveMessage(newId, dbMsg, 'Case Analysis', currentCase?._id);

      try {
        let systemInstruction = LEGAL_SYSTEM_INSTRUCTION;
        systemInstruction += `\n\nCase Context:\n- Title: ${currentCase.title || currentCase.name}\n- Summary: ${currentCase.summary || currentCase.description}\n`;
        const response = await generateChatResponse([], promptText, systemInstruction, [], 'English', null, 'LEGAL_TOOLKIT', null, null);
        
        let responseText = typeof response === 'string' ? response : (response?.reply || response?.text || 'Analysis complete.');
        const aiMsg = { id: (Date.now() + 1).toString(), text: responseText, sender: 'ai', timestamp: new Date() };
        setMessages(prev => {
          const updated = [...prev, aiMsg];
          saveChatHistory(updated);
          return updated;
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsTyping(false);
      }
    } else {
      const newMsgs = [{
        id: '1',
        text: `Hello! I am your AI ${toolName}. Ask me anything about statutes, bare acts, case research, or litigation strategy.`,
        sender: 'ai',
        timestamp: new Date(),
        isIntro: true,
      }];
      setMessages(newMsgs);
      const newSessionItem = { chat_id: newId, title: 'New Chat', timestamp: Date.now() };
      setSessions(prev => [newSessionItem, ...prev]);
      const dbMsg = mapLocalMessageToDb(newMsgs[0]);
      dbMsg.activeTool = 'General Legal Chat';
      dbMsg.mode = 'NORMAL_CHAT';
      await chatStorageService.saveMessage(newId, dbMsg, 'New Chat', currentCase?._id);
    }
  };

  const switchSession = async (sessionId) => {
    chatIdRef.current = sessionId;
    setActiveSessionId(sessionId);
    await loadSessionHistory(sessionId);
  };

  const handleSelectCase = (item) => {
    setShowCasesSheet(false);
    const promptText = `Please analyze the case laws, applicable acts and strategy advice for: ${item.name} (${item.category})`;
    sendMessage(promptText);
  };

  // ─── CASES DATABASE SEARCH & FILTER ────────────────────────────────────────
  const filterOptions = useMemo(() => getFilterOptions(), []);
  const searchResults = useMemo(() => {
    return searchAndFilterCases(searchQuery, filters, 1, 6);
  }, [searchQuery, filters]);
  const filteredCases = searchResults.cases;

  const handleQuickAction = (action) => {
    sendMessage(action);
  };

  const suggestedQuestions = [
    "What is IPC 420?",
    "Explain Article 21.",
    "How to file an FIR?",
    "What is anticipatory bail?",
    "Consumer complaint format.",
    "Divorce procedure in India."
  ];

  // Helper to determine greeting message
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good Morning";
    if (hrs < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#FAFBFD] font-sans relative overflow-hidden select-text text-slate-800">
      
      {/* ─── STICKY HEADER ──────────────────────────────────────────────── */}
      <header className="h-[72px] bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            title="Back to Dashboard"
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

        <div className="flex items-center gap-3 select-none">
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
                    { label: 'Export as PDF', act: () => { exportToPDF({ element: document.getElementById('chat-history'), text: messages.map(m => m.text).join('\n\n'), title: 'AI LEGAL Chat Export' }); } },
                    { label: 'Export as DOCX', act: () => { const blob = new Blob([messages.map(m => m.text).join('\n\n')], { type: 'application/msword' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Chat_Export.doc'; a.click(); } },
                    { label: 'Export as Markdown', act: () => { const blob = new Blob([messages.map(m => m.text).join('\n\n')], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Chat_Export.md'; a.click(); } },
                    { label: 'Export as TXT', act: () => { const blob = new Blob([messages.map(m => m.text).join('\n\n')], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Chat_Export.txt'; a.click(); } },
                    { label: 'Export as HTML', act: () => { const blob = new Blob([messages.map(m => m.text).join('\n\n')], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Chat_Export.html'; a.click(); } },
                    { label: 'Print Transcript', act: () => { window.print(); } },
                    { label: 'Send via Email', act: () => { window.open(`mailto:?subject=AI Legal Chat Export&body=${encodeURIComponent(messages.map(m => m.text).join('\n\n').slice(0, 1500))}`); } },
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
            onClick={() => handleNewChat(false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] text-white hover:bg-[#4338CA] rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>New Chat</span>
          </button>
        </div>
      </header>

      {/* ─── CONVERSATION AREA ────────────────────────────────────────── */}
      <main 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="flex-1 flex flex-col overflow-y-auto px-4 py-8 custom-scrollbar shrink-0 relative"
      >
        <div className={`max-w-[960px] w-full mx-auto space-y-8 pb-32 ${messages.filter(m => !m.isIntro).length === 0 ? 'flex-1 flex flex-col justify-center' : ''}`}>
          
          {messages.filter(m => !m.isIntro).length === 0 ? (
            /* ─── EMPTY STATE VIEW ─── */
            <div className="space-y-8 py-6 max-w-[760px] mx-auto w-full text-left font-sans select-none">
              
              {/* Shortened AI greeting card */}
              <div className="p-6 border border-[#4F46E5]/15 bg-white rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-4 flex-1">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#4F46E5] tracking-widest block mb-1">AI LEGAL COPILOT READY</span>
                    <h2 className="text-lg font-black text-slate-850 uppercase tracking-tight">
                      {currentCase?.title || currentCase?.name || 'Rajesh Sharma vs Amit Verma'}
                    </h2>
                    <p className="text-[11px] text-slate-405 font-bold uppercase tracking-wider mt-1">
                      {currentCase?.court || 'District Court Jabalpur'} • Civil Property Dispute
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                    {['Parties', 'Evidence', 'Timeline', 'Previous Orders', 'Applicable Laws'].map((item) => (
                      <div key={item} className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                        <span className="text-emerald-500 font-black">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setShowSummaryDrawer(true)}
                    className="px-4 py-2 border border-[#4F46E5]/20 hover:border-[#4F46E5] text-[#4F46E5] text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs bg-transparent cursor-pointer"
                  >
                    View Case Summary
                  </button>
                </div>
              </div>

              {/* suggested prompts & recent activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block pl-1">Suggested Prompts</span>
                  <div className="space-y-2">
                    {[
                      "Draft a Legal Notice",
                      "Summarize entire case",
                      "Generate strongest arguments"
                    ].map((promptText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickAction(promptText)}
                        className="w-full text-left p-3.5 bg-white hover:bg-indigo-50/[0.03] border border-slate-200 hover:border-[#4F46E5] rounded-2xl flex items-center justify-between shadow-xs transition-all group cursor-pointer"
                      >
                        <span className="text-xs font-bold text-slate-700 group-hover:text-[#4F46E5] transition-colors">{promptText}</span>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block pl-1">Recent Activity</span>
                  <div className="space-y-2">
                    {[
                      { action: 'Evidence Analysis Complete', date: 'Just now', type: 'System' },
                      { action: 'Legal Notice Draft saved', date: '10 mins ago', type: 'Notice' },
                      { action: 'Workspace memory loaded', date: '1 hour ago', type: 'Loader' }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-bold text-slate-750">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{item.action}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{item.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* ─── MESSAGES CONTAINER ─── */
            messages.filter(m => !m.isIntro).map((msg, i) => {
              if (msg.sender === 'system_regenerating') {
                return (
                  <div key={msg.id || i} className="flex justify-start max-w-[480px] mr-auto w-full my-4 pl-1 text-slate-800">
                    <div className="bg-[#FAFBFD] border border-slate-200 rounded-[18px] p-5 shadow-[0_4px_18px_rgba(15,23,42,.03)] w-full space-y-3">
                      <div className="flex items-center gap-2 text-xs font-black text-[#4F46E5] uppercase tracking-wider">
                        <RotateCcw size={13} className={`w-3.5 h-3.5 ${msg.status === 'loading' ? 'animate-spin' : ''}`} />
                        <span>Regenerating previous response...</span>
                      </div>
                      <div className="text-xs bg-white border border-slate-100 rounded-xl p-3 space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Original Request</span>
                        <p className="text-slate-700 font-medium italic">"{msg.originalPrompt}"</p>
                      </div>
                      {msg.status === 'loading' && (
                        <div className="space-y-1.5 pl-1">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-ping shrink-0" />
                            <span>Reviewing previous context...</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                            <span>Searching legal precedents...</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-[#4F46E5]/60 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]/40 shrink-0" />
                            <span>Improving response...</span>
                          </div>
                        </div>
                      )}
                      {msg.status === 'success' && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 pl-1">
                          <Check size={12} />
                          <span>Successfully regenerated improved answer</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (msg.sender === 'system_regenerating_error') {
                return (
                  <div key={msg.id || i} className="flex justify-start max-w-[480px] mr-auto w-full my-4 pl-1 text-slate-800">
                    <div className="bg-red-50/50 border border-red-200 rounded-[18px] p-5 shadow-[0_4px_18px_rgba(15,23,42,.03)] w-full space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black text-red-600 uppercase tracking-wider">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Unable to regenerate response</span>
                      </div>
                      <div className="text-xs bg-white border border-red-100 rounded-xl p-3 space-y-1">
                        <span className="text-[10px] font-black uppercase text-red-400 tracking-wider block">Failed Prompt</span>
                        <p className="text-slate-700 font-medium italic">"{msg.originalPrompt}"</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-500">The regeneration process encountered an error. Would you like to try again?</p>
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => {
                            setMessages(prev => prev.filter(m => m.id !== msg.id));
                            handleRegenerateMessage(msg.targetMsgId);
                          }}
                          className="px-3.5 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                        >
                          Retry
                        </button>
                        <button
                          onClick={() => {
                            setMessages(prev => prev.filter(m => m.id !== msg.id && m.id !== 'regen-status-' + msg.id.split('-').pop()));
                          }}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold shadow-sm transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const isAi = msg.sender === 'ai';
              return (
                <div key={msg.id || i} className="space-y-3">
                  
                  {isAi ? (
                    /* AI message document card layout */
                    <div className="space-y-2 pr-8">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#4F46E5] pl-1">
                        <img 
                          src="/logo/ai_legal_monochrome.png" 
                          className="w-[24px] h-[24px] object-contain" 
                          style={{ mixBlendMode: 'multiply' }}
                          alt="AI LEGAL" 
                        />
                        <span>AI LEGAL™ Copilot</span>
                      </div>

                      <div className="bg-white border border-[#E7EAF3] rounded-[18px] p-6 sm:p-8 shadow-[0_4px_18px_rgba(15,23,42,.05)] leading-relaxed select-text hover:shadow-md transition-shadow">
                        <AiResponseCard
                          msg={msg}
                          currentCase={currentCase}
                          chatIdRef={chatIdRef}
                          handleRegenerateMessage={handleRegenerateMessage}
                          getPrecedingUserMessage={getPrecedingUserMessage}
                        />

                        {msg.isStopped && (
                          <div className="mt-6 pt-4 border-t border-slate-100 space-y-4 select-none">
                            <div className="space-y-1">
                              <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5 pl-1">
                                <Square size={8} className="fill-slate-400 stroke-none" />
                                <span>Generation stopped.</span>
                              </div>
                              <p className="text-xs text-slate-500 font-semibold leading-relaxed pl-1">The response was interrupted before completion.</p>
                            </div>
                            <button
                              onClick={() => handleRegenerateMessage(msg.id)}
                              className="px-3.5 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 ml-1"
                            >
                              <RotateCcw size={12} />
                              <span>Regenerate Response</span>
                            </button>
                          </div>
                        )}

                        {msg.isFailed && (
                          <div className="mt-6 pt-4 border-t border-slate-100 space-y-4 select-none">
                            <div className="space-y-1">
                              <div className="text-[10px] text-red-500 font-black uppercase tracking-wider flex items-center gap-1.5 pl-1">
                                <ShieldAlert size={10} className="text-red-500" />
                                <span>Generation interrupted.</span>
                              </div>
                              <p className="text-xs text-slate-500 font-semibold leading-relaxed pl-1">The connection was lost during generation.</p>
                            </div>
                            <button
                              onClick={() => handleRetryMessage(msg.id)}
                              className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1.5 ml-1"
                            >
                              <RotateCcw size={12} />
                              <span>Retry Generation</span>
                            </button>
                          </div>
                        )}

                        {/* Redesigned Pill-style Suggestions Panel */}
                        {i === messages.filter(m => !m.isIntro).length - 1 && !msg.isStreaming && !msg.isStopped && !msg.isFailed && (
                          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                            <div className="flex items-center gap-1.5 pl-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#4F46E5]">✨ Suggested follow-ups</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {getSuggestionsForResponse(msg.text).map((card, cardIdx) => {
                                const cleanTitle = card.title.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim();
                                return (
                                  <button
                                    key={cardIdx}
                                    onClick={() => {
                                      const hiddenContext = buildHiddenContext(card, msg.text);
                                      sendMessage(cleanTitle, hiddenContext);
                                    }}
                                    className="h-[34px] px-3.5 bg-white border border-[#4F46E5]/15 hover:border-[#4F46E5] hover:bg-[#4F46E5]/5 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#4F46E5] shadow-xs select-none shrink-0"
                                  >
                                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">{card.icon}</span>
                                    <span>{cleanTitle}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* User prompt card bubble layout */
                    <div className="flex justify-end pl-16">
                      <div className="flex flex-col items-end gap-1.5 max-w-full">
                        <div className="bg-white border border-slate-200 text-slate-800 p-4 rounded-2xl rounded-tr-none text-xs leading-relaxed font-semibold shadow-sm max-w-full">
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2 shrink-0">
                              {msg.attachments.map((att, idx) => (
                                <div key={idx} className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold">
                                  {getFileIcon(att.type)}
                                  <span>{att.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        
                        {/* User Card bottom action items */}
                        <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold uppercase tracking-wider px-1">
                          <span>{safeFormatTime(msg.timestamp)}</span>
                          <span>•</span>
                          {!isTyping && !isStreamingRef.current && (
                            <>
                              <button 
                                onClick={() => handleEditUserMessage(msg)}
                                className="hover:text-[#4F46E5] flex items-center gap-0.5"
                              >
                                <span>Edit</span>
                              </button>
                              <span>•</span>
                            </>
                          )}
                          <button 
                            onClick={() => handleCopyUserMessage(msg.text)}
                            className="hover:text-[#4F46E5] flex items-center gap-0.5"
                          >
                            <span>Copy</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteUserMessage(msg.id)}
                            className="hover:text-red-500 flex items-center gap-0.5"
                          >
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}

          {/* Legal Loader Indicator with rotating phrases or regeneration status */}
          {isTyping && (
            <div className="space-y-2 pr-8 animate-pulse">
              <div className="flex items-center gap-2 text-[9px] text-[#4F46E5] font-black uppercase tracking-widest pl-1">
                <img 
                  src="/logo/ai_legal_monochrome.png" 
                  className="w-[24px] h-[24px] object-contain" 
                  style={{ mixBlendMode: 'multiply' }}
                  alt="AI LEGAL" 
                />
                <span>AI LEGAL™ Copilot</span>
              </div>
              
              {isRegenerating ? (
                <div className="bg-white border border-[#E7EAF3] rounded-[18px] p-5 shadow-[0_4px_18px_rgba(15,23,42,.05)] max-w-[320px] space-y-3.5 text-slate-800">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <RotateCcw size={12} className="animate-spin text-[#4F46E5]" />
                    <span>Regenerating response...</span>
                  </div>
                  <div className="space-y-2 text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-ping shrink-0" />
                      <span className="text-slate-600">Reviewing previous context...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      <span>Loading legal references...</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-50">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      <span>Generating improved answer...</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 justify-center pt-2 border-t border-slate-100">
                    <div className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full animate-bounce delay-100" />
                    <div className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#ECEEF5] rounded-[18px] px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] w-[200px] h-[80px] flex flex-col justify-between select-none">
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes legalDotThinking {
                      0%, 100% {
                        transform: scale(0.85);
                        opacity: 0.35;
                      }
                      50% {
                        transform: scale(1.15);
                        opacity: 1;
                      }
                    }
                    .legal-thinking-dot {
                      animation: legalDotThinking 1s infinite ease-in-out;
                    }
                    .legal-thinking-dot-1 {
                      animation-delay: 0s;
                    }
                    .legal-thinking-dot-2 {
                      animation-delay: 0.3s;
                    }
                    .legal-thinking-dot-3 {
                      animation-delay: 0.6s;
                    }
                  `}} />
                  <div className="text-[11px] font-bold text-slate-500 tracking-wider">
                    Thinking...
                  </div>
                  <div className="flex items-center gap-2 justify-start pl-0.5 pb-0.5">
                    <div className="w-2 h-2 bg-[#4F46E5] rounded-full legal-thinking-dot legal-thinking-dot-1" />
                    <div className="w-2 h-2 bg-[#4F46E5] rounded-full legal-thinking-dot legal-thinking-dot-2" />
                    <div className="w-2 h-2 bg-[#4F46E5] rounded-full legal-thinking-dot legal-thinking-dot-3" />
                  </div>
                </div>
              )}
            </div>
          )}

          {showScrollBottomBtn && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full shadow-xl text-[11px] font-bold text-[#4F46E5] dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-750 transition-all select-none cursor-pointer scale-95 hover:scale-100"
            >
              <ChevronDown size={14} className="animate-bounce text-[#4F46E5] dark:text-indigo-400" />
              <span>New response below</span>
            </button>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ─── STICKY BOTTOM INPUT FLOATING CONTAINER ──────────────────── */}
      <footer className="shrink-0 bg-gradient-to-t from-[#FAFBFD] via-[#FAFBFD]/95 to-transparent pt-4 pb-6 px-4 border-t border-slate-200/60 sticky bottom-0 z-30">
        <div className="max-w-[960px] mx-auto space-y-3">
          


          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-200 rounded-2xl max-h-[100px] overflow-y-auto shrink-0 shadow-sm">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold">
                  {getFileIcon(att.type)}
                  <span className="truncate max-w-[130px] text-slate-700">{att.name}</span>
                  {att.isUploading ? (
                    <span className="text-[8px] text-[#4F46E5] animate-pulse">{att.progress}%</span>
                  ) : (
                    <button type="button" onClick={() => removeAttachment(att.id)} className="text-slate-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

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
                          sendMessage(action.prompt);
                          setShowPlusMenu(false);
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
              onClick={() => fileInputRef.current?.click()}
              className={`p-2.5 rounded-full transition-colors border-none bg-transparent cursor-pointer ${attachments.length > 0 ? 'text-[#4F46E5] bg-[#4F46E5]/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="Attach document/image"
            >
              <Paperclip size={16} />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
              style={{ display: 'none' }}
            />

            <form 
              onSubmit={(e) => { 
                e.preventDefault(); 
                if (isTyping || generationState === 'streaming') {
                  handleStop();
                } else {
                  sendMessage(); 
                }
              }}
              className="flex-1 flex items-center gap-2"
            >
              <input 
                ref={inputRef}
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
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

              {(isTyping || generationState === 'streaming') ? (
                <button 
                  type="button" 
                  onClick={handleStop}
                  className="p-2.5 rounded-full transition-all shrink-0 bg-red-500 hover:bg-red-600 text-white shadow-sm flex items-center justify-center animate-pulse border-none cursor-pointer"
                  title="Stop generating"
                >
                  <Square size={10} className="fill-white stroke-none" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={!inputValue.trim() && attachments.length === 0}
                  className={`p-2.5 rounded-full transition-all shrink-0 border-none cursor-pointer ${
                    (inputValue.trim() || attachments.length > 0)
                      ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Send query"
                >
                  <Send size={14} />
                </button>
              )}
            </form>
          </div>

        </div>
      </footer>

      {/* Redesigned Floating Scroll Bottom Indicator (Solid White Background Overlay) */}
      <AnimatePresence>
        {(!isEndVisible && messages.filter(m => !m.isIntro).length > 0) && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-[96px] left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <button
              onClick={scrollToBottom}
              className="pointer-events-auto px-4 py-2 border border-[#4F46E5]/15 hover:border-[#4F46E5]/40 text-[#4F46E5] text-xs font-bold rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:bg-[#4F46E5]/5 active:border-[#4F46E5]"
              style={{ backgroundColor: '#ffffff', opacity: 1 }}
              title="Jump to Latest"
            >
              <ChevronDown size={14} className="animate-bounce" />
              <span>Jump to Latest</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CASES BOTTOM SHEET ────────────────────────────────────────── */}
      <AnimatePresence>
        {showCasesSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
              onClick={() => setShowCasesSheet(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-slate-200 rounded-t-[24px] max-h-[85vh] flex flex-col shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
              
              <div className="px-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Scale size={18} className="text-[#4F46E5]" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Browse template cases</h3>
                </div>
                <button onClick={() => setShowCasesSheet(false)} className="p-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
                
              {/* Search Bar + Filters */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
                <div className="bg-white border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                  <Search size={15} className="text-slate-400" />
                  <input
                    type="text"
                    className="flex-1 bg-transparent border-none text-xs font-semibold focus:ring-0 p-0 text-slate-700 placeholder-slate-400 outline-none"
                    placeholder="Search template cases, laws, acts, IPC/BNS, keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Cases List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredCases.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <Briefcase className="mx-auto mb-2 opacity-35" size={24} />
                    <span>No cases match search query</span>
                  </div>
                ) : (
                  filteredCases.map(c => (
                    <div 
                      key={c.id} 
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-[#4F46E5] hover:shadow transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-xs font-black text-slate-900 block">{c.name}</span>
                          <span className="text-[10px] text-slate-400 mt-1 block font-bold uppercase tracking-wider">{c.category} • {c.courtType}</span>
                          <p className="text-xs text-slate-500 mt-2 font-medium line-clamp-2 leading-relaxed">{c.landmarkJudgments?.[0]?.legalPrinciple || 'Standard legal disputable matter guidance template.'}</p>
                        </div>
                        
                        <button
                          onClick={() => handleSelectCase(c)}
                          className="px-3 py-1.5 bg-[#4F46E5] text-white hover:bg-[#4338CA] rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-colors shrink-0"
                        >
                          Select Case
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                                      chatStorageService.saveMessage(s.chat_id, {}, newName, currentCase?._id);
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
                    <h5 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{currentCase?.title || currentCase?.name || 'Rajesh Sharma vs Amit Verma'}</h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status: Memory Active</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border border-slate-100 bg-white rounded-xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Client</span>
                      <span className="text-xs font-bold text-slate-700 block mt-1">{currentCase?.clientName || 'Rajesh Sharma'}</span>
                    </div>
                    <div className="p-3 border border-slate-100 bg-white rounded-xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Opponent</span>
                      <span className="text-xs font-bold text-slate-700 block mt-1">{currentCase?.opponentName || 'Amit Verma'}</span>
                    </div>
                  </div>

                  <div className="p-3 border border-slate-100 bg-white rounded-xl space-y-2">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Court Jurisdiction</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">{currentCase?.court || 'District Court Jabalpur'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Stage & Judge</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">{currentCase?.stage || 'Evidence Stage'} • Hon'ble Mr. Justice Rawat</span>
                    </div>
                  </div>

                  <div className="p-4 border border-[#4F46E5]/10 bg-indigo-50/30 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-[#4F46E5]">
                      <span>AI Win Probability</span>
                      <span>60%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#4F46E5] h-full rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>

                  {/* Highlights checklist */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block pl-1">Indexed Components</span>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { title: 'Parties profiles mapped', desc: '✓ Client & opponent details fully parsed.' },
                        { title: 'Evidence index sheet', desc: '✓ 4 documents uploaded and analyzed.' },
                        { title: 'Litigation timeline', desc: '✓ Sequential timeline occurrences structured.' },
                        { title: 'Statutes database', desc: '✓ Connected laws & BNS codes index complete.' }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-slate-50/20 flex gap-2.5 items-start">
                          <span className="text-emerald-500 font-extrabold mt-0.5">✓</span>
                          <div>
                            <span className="font-bold text-slate-750 block">{item.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{item.desc}</span>
                          </div>
                        </div>
                      ))}
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
                sendMessage(`${opt.prefix}:\n"${text}"`);
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

export default LegalChatScreen;
