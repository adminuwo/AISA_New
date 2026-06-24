import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Plus, FileText, Copy, 
  Share2, FileDown, History, Search, X, Shield, Clock, 
  Brain, Scale, BookOpen, AlertTriangle, TrendingUp, Mic, 
  Database, Cpu, Briefcase, Building2, Landmark, Folder, 
  Fingerprint, ShieldAlert, ShieldCheck, Printer, Upload, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { consumePrefillIntent, mapCaseToForm } from '../services/activeModuleService';

const allTools = [
  { id: 'OCR', name: 'OCR Metadata Scan', desc: 'Timestamp & hash checks', category: 'Metadata' },
  { id: 'Custody', name: 'Chain of Custody', desc: 'Secure transfer seals', category: 'Integrity' },
  { id: 'Inconsistency', name: 'Inconsistency Scan', desc: 'Date & typography audits', category: 'Document' },
  { id: 'Strength', name: 'Evidence Strength', desc: 'Admissibility analysis', category: 'Forensic' },
  { id: 'Telemetry', name: 'Telemetry Integrity', desc: 'Transaction mirror scans', category: 'Integrity' },
  { id: 'Sign', name: 'Signature Audit', desc: 'Digital cert validation', category: 'Document' },
  { id: 'Validator', name: 'Validator Engine', desc: 'Header timezone audits', category: 'Metadata' },
  { id: 'Checker', name: 'Inconsistency Checker', desc: 'GPS velocity checks', category: 'Forensic' },
  { id: 'EXIF', name: 'EXIF Metadata Inspector', desc: 'Hidden device data extraction', category: 'Metadata' },
  { id: 'DocAuth', name: 'Document Authenticity Scan', desc: 'Forgery and alteration check', category: 'Document' },
  { id: 'PDFAnalyzer', name: 'PDF Structure Analyzer', desc: 'Hidden layers & metadata', category: 'Document' },
  { id: 'ImgTamper', name: 'Image Tampering Detection', desc: 'Pixel-level forgery scan', category: 'Image' },
  { id: 'AudioCheck', name: 'Audio Integrity Check', desc: 'Splicing & waveform audit', category: 'Audio' },
  { id: 'VideoFrame', name: 'Video Frame Analyzer', desc: 'Deepfake & frame-drop detection', category: 'Video' },
  { id: 'TimeValid', name: 'Timestamp Validator', desc: 'System clock manipulation check', category: 'Integrity' },
  { id: 'DupDetect', name: 'Duplicate Evidence Detector', desc: 'Cross-case artifact matching', category: 'Forensic' },
  { id: 'HashVerify', name: 'File Hash Verification', desc: 'MD5/SHA-256 integrity check', category: 'Integrity' },
  { id: 'Watermark', name: 'Watermark Detection', desc: 'Invisible digital watermarks', category: 'Image' },
  { id: 'GeoLogic', name: 'Geolocation Consistency', desc: 'GPS spoofing detection', category: 'Forensic' },
  { id: 'ChainReport', name: 'Chain Integrity Report', desc: 'End-to-end custody validation', category: 'Integrity' }
];

const EvidenceAnalysis = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [linkedCaseId, setLinkedCaseId] = useState(currentCase?._id || '');
  const [prefillData, setPrefillData] = useState(null);
  const [prefillBanner, setPrefillBanner] = useState(null);

  // Forensic States
  const [isAuditing, setIsAuditing] = useState(false);
  const [forensicResult, setForensicResult] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [activeForensic, setActiveForensic] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState(null);

  // Advanced Filters State
  const [evidenceType, setEvidenceType] = useState('All');
  const [admissibilityFilter, setAdmissibilityFilter] = useState('All');

  // Tools State
  const [toolsSearchQuery, setToolsSearchQuery] = useState('');
  const [toolsCategory, setToolsCategory] = useState('All');
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanPhase, setScanPhase] = useState(''); // 'uploading' | 'analyzing' | 'generating' | ''

  const scrollRef = useRef(null);

  // ── On mount: consume prefill intent from "Use Active Case" ──
  useEffect(() => {
    const intent = consumePrefillIntent('legal_evidence_checker');
    if (intent?.caseData) {
      const mapped = mapCaseToForm(intent.caseData);
      setPrefillData(mapped);
      // Pre-populate evidence notes with case context
      if (mapped.evidenceNotes) setEvidenceNotes(mapped.evidenceNotes);
      if (mapped.caseTitle) setEvidenceTitle(`${mapped.caseTitle} - Evidence Review`);
      const caseId = intent.caseData?._id || intent.caseData?.id;
      if (caseId) setLinkedCaseId(caseId);
      const docCount = mapped.allDocuments?.length || 0;
      setPrefillBanner({
        caseTitle: mapped.caseTitle || 'Active Case',
        docCount,
        docs: mapped.allDocuments?.slice(0, 5) || []
      });
      toast.success(`✓ Case loaded — ${docCount} evidence files available`, { icon: '💼', duration: 3500 });
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (currentCase) {
      setLinkedCaseId(currentCase._id);
      loadForensicHistory(currentCase._id);
      setEvidenceTitle('');
      setEvidenceNotes('');
      setForensicResult(null);
      setActiveForensic(null);
      setSelectedFile(null);
    } else {
      setHistoryData([]);
      setForensicResult(null);
      setActiveForensic(null);
      setSelectedFile(null);
    }
  }, [currentCase]);

  const loadForensicHistory = async (caseId) => {
    try {
      const targetCase = allProjects.find(p => p._id === caseId) || currentCase;
      if (targetCase && Array.isArray(targetCase.forensicHistory)) {
        setHistoryData(targetCase.forensicHistory);
      } else {
        setHistoryData([]);
      }
    } catch (e) {
      console.error('[EvidenceAnalysis] Error loading history', e);
    }
  };

  const saveForensicToHistory = async (forensic) => {
    try {
      const targetCaseId = linkedCaseId || currentCase?._id;
      if (!targetCaseId) return;
      const targetCase = allProjects.find(p => p._id === targetCaseId) || currentCase;
      if (!targetCase) return;

      const forensicWithCase = { 
        ...forensic, 
        caseId: targetCaseId 
      };

      const existingHistory = targetCase.forensicHistory || [];
      const updatedHistory = [forensicWithCase, ...existingHistory.filter(h => h.id !== forensic.id)];

      // Also attach to active case documents!
      const newDoc = {
        id: forensic.id,
        name: forensic.title,
        uri: selectedFile?.uri || '',
        type: selectedFile?.mimeType || 'document',
        uploadDate: new Date().toLocaleDateString(),
        analysisResult: forensic
      };
      const updatedDocs = [...(targetCase.documents || []), newDoc];

      const payload = { 
        ...targetCase, 
        forensicHistory: updatedHistory,
        documents: updatedDocs 
      };

      const response = await apiService.updateProject(targetCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
      setHistoryData(updatedHistory);
    } catch (e) {
      console.error('[EvidenceAnalysis] Error saving history', e);
    }
  };

  const deleteHistoryItem = async (id) => {
    const targetCaseId = linkedCaseId || currentCase?._id;
    if (!targetCaseId) return;
    const targetCase = allProjects.find(p => p._id === targetCaseId) || currentCase;
    if (!targetCase) return;

    try {
      const updatedHistory = (targetCase.forensicHistory || []).filter(h => h.id !== id);
      const payload = { 
        ...targetCase, 
        forensicHistory: updatedHistory 
      };
      const response = await apiService.updateProject(targetCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
      setHistoryData(updatedHistory);
      toast.success("Forensic log deleted successfully");
    } catch (e) {
      console.error('[EvidenceAnalysis] Error deleting history', e);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanPhase('uploading');
    const sizeKB = Math.round(file.size / 1024);
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      const asset = {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uri: URL.createObjectURL(file),
        base64: base64String
      };
      
      setSelectedFile(asset);
      setEvidenceTitle(asset.name);
      
      const notes = `File: ${asset.name}\nSize: ${sizeKB} KB\nMIME Type: ${asset.mimeType || 'Unknown'}\nCategory: ${toolsCategory}`;
      setEvidenceNotes(notes);

      toast.success("File uploaded! Initializing forensic scan.");
      
      runForensicScanner({
        title: asset.name,
        evidenceNotes: notes,
        fileUri: asset.uri,
        fileBase64: asset.base64,
        fileMimeType: asset.mimeType || 'application/octet-stream',
        fileCategory: toolsCategory,
        fileSizeKB: sizeKB
      });
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
      setScanPhase('');
    };
    reader.readAsDataURL(file);
  };

  const runForensicScanner = async (customState) => {
    const stateToUse = customState || {
      title: evidenceTitle || 'Custom Forensic Evidence Analysis',
      evidenceNotes,
      fileUri: selectedFile?.uri || null,
      fileBase64: selectedFile?.base64 || null,
      fileMimeType: selectedFile?.mimeType || null,
      fileCategory: toolsCategory,
      fileSizeKB: selectedFile ? Math.round(selectedFile.size / 1024) : '?'
    };

    if (!stateToUse.evidenceNotes?.trim() && !stateToUse.fileBase64) {
      toast.error("Please provide evidence description or upload a file.");
      return;
    }

    setIsAuditing(true);
    setForensicResult(null);

    const tid = toast.loading("Connecting to AISA forensic engine...");

    try {
      setScanPhase('analyzing');
      let attachments = [];
      if (stateToUse.fileBase64) {
        const mime = stateToUse.fileMimeType || 'image/jpeg';
        attachments = [{
          url: `data:${mime};base64,${stateToUse.fileBase64}`,
          name: stateToUse.title,
          type: mime.startsWith('image/') ? 'image' : 'document'
        }];
      }

      const cat = stateToUse.fileCategory || toolsCategory || 'All';
      const mime = stateToUse.fileMimeType || '';
      const isImage = cat === 'Image' || mime.startsWith('image/');
      const isVideo = cat === 'Video' || mime.startsWith('video/');
      const isAudio = cat === 'Audio' || mime.startsWith('audio/');
      const isDocument = cat === 'Document' || mime.includes('pdf') || mime.includes('word') || mime.includes('text');

      let typeSpecificInstructions = '';
      if (isImage) {
        typeSpecificInstructions = `
This is an IMAGE file. Analyze:
- Visual content and metadata (EXIF data if available)
- Resolution, color space, compression level
- Signs of editing, cropping, or digital manipulation
- Authenticity indicators (camera/device fingerprint)
- Duplicate detection signals
- Courtroom suitability and admissibility of photographic evidence`;
      } else if (isVideo) {
        typeSpecificInstructions = `
This is a VIDEO file. Analyze:
- Codec and container format
- Frame integrity and discontinuities
- Timestamp consistency across frames
- Signs of splicing, cuts, or re-encoding
- Audio-video sync integrity
- Geolocation metadata if available
- Courtroom admissibility of video evidence`;
      } else if (isAudio) {
        typeSpecificInstructions = `
This is an AUDIO file. Analyze:
- Waveform continuity and anomalies
- Signs of editing, cuts, or splicing
- Compression artifacts and codec fingerprint
- Voice consistency and background noise analysis
- Timestamp and duration integrity
- Courtroom admissibility of audio evidence`;
      } else if (isDocument) {
        typeSpecificInstructions = `
This is a DOCUMENT file (PDF/DOC/TXT). Analyze:
- Text extraction and structure
- Author, creator, modification history metadata
- Digital signature presence and validity
- Document integrity and tampering indicators
- Redaction quality (if any redactions exist)
- Section 65B compliance for electronic records`;
      } else {
        typeSpecificInstructions = `
Analyze this evidence file for:
- File format integrity and header validation
- Metadata extraction
- Hash-based tampering detection
- Chain of custody consistency
- Courtroom admissibility`;
      }

      const systemPrompt = `You are the AISA Supreme Forensic Scanner and Legal Evidence Authenticator. You perform real forensic analysis of uploaded evidence files for Indian courts.

CRITICAL: Base your entire analysis on the ACTUAL file content provided. Do NOT use generic or template output. Every finding must be specific to THIS file.
${typeSpecificInstructions}

Output the report in this exact markdown structure:
### **EVIDENCE ANALYSIS REPORT**

**File Name:** [exact filename]
**Detected File Type:** [actual detected type]
**File Size:** [size in KB]
**Scan Time:** [timestamp]
**Verification Rating:** [0-100]%
**Risk Alerts:** [0-10 count]
**Admissibility Rate:** [0-100]%
**AI Confidence:** [0-100]%

#### **1. ANALYSIS SUMMARY**
[2-3 sentence summary of what was found in THIS specific file]

#### **2. DETAILED FINDINGS**
* **[Finding name]** (Strength: High/Moderate/Low): [Specific finding from this file]
* **[Finding name]** (Strength: High/Moderate/Low): [Specific finding from this file]

#### **3. INTEGRITY ASSESSMENT**
[Specific integrity evaluation of this file]

#### **4. COURT ADMISSIBILITY (SECTION 65B)**
[Specific admissibility assessment based on this file's characteristics]

#### **5. RECOMMENDATIONS**
* **Immediate:** [Action specific to this file]
* **Preservation:** [Preservation instruction specific to this evidence]`;

      let caseContextString = "";
      const activeCase = allProjects.find(p => p._id === (linkedCaseId || currentCase?._id)) || currentCase;
      if (activeCase) {
        caseContextString = `
[Active Case Context]
Case Title: ${activeCase.name}
Case Facts/Description: ${activeCase.description || 'N/A'}
Client: ${activeCase.clientName || 'N/A'}
Opponent: ${activeCase.accused || activeCase.opponentName || 'N/A'}
Court: ${activeCase.courtName || 'N/A'}
`;
      }

      const query = `
${caseContextString}

Perform forensic analysis on this evidence file:
File Name: ${stateToUse.title}
File Size: ${stateToUse.fileSizeKB || '?'} KB
MIME Type: ${stateToUse.fileMimeType || 'Unknown'}
Evidence Category: ${cat}
${stateToUse.evidenceNotes || ''}
Additional Filters: EvidenceType=${evidenceType}, Admissibility Filter=${admissibilityFilter}`;

      setScanPhase('generating');
      const response = await generateChatResponse([], query, systemPrompt, attachments, 'English', null, 'legal');
      const responseText = response?.reply || response || '';

      // Parse scores from output
      let verificationScore = 0, riskAlerts = 0, admissibilityRate = 0, confidenceRate = 0;
      try {
        const vMatch = responseText.match(/Verification Rating:\s*(\d+)%/i);
        if (vMatch) verificationScore = parseInt(vMatch[1]);
        const rMatch = responseText.match(/Risk Alerts:\s*(\d+)/i);
        if (rMatch) riskAlerts = parseInt(rMatch[1]);
        const aMatch = responseText.match(/Admissibility Rate:\s*(\d+)%/i);
        if (aMatch) admissibilityRate = parseInt(aMatch[1]);
        const cMatch = responseText.match(/AI Confidence:\s*(\d+)%/i);
        if (cMatch) confidenceRate = parseInt(cMatch[1]);
      } catch (parseErr) {
        console.warn('[EvidenceAnalysis] Score parsing failed:', parseErr);
      }

      const newForensic = {
        id: Date.now().toString(),
        title: stateToUse.title,
        evidenceNotes: stateToUse.evidenceNotes,
        timestamp: new Date().toLocaleString(),
        stats: { verificationScore, riskAlerts, admissibilityRate, confidenceRate },
        report: responseText
      };

      setActiveForensic(newForensic);
      setForensicResult(newForensic);
      await saveForensicToHistory(newForensic);
      toast.success('Forensic analysis complete', { id: tid });
    } catch (error) {
      console.error('[EvidenceAnalysis] API Error:', error);
      toast.error('Forensic analysis failed.', { id: tid });
    } finally {
      setIsAuditing(false);
      setScanPhase('');
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Report copied to clipboard!");
  };

  const handleShare = async (text) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: evidenceTitle || 'Evidence Forensic Report',
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
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; font-size: 13pt; color: #0f172a; }
          h1 { text-align: center; text-transform: uppercase; font-size: 16pt; font-weight: bold; margin-bottom: 24px; color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          h2 { font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 12px; }
          h3 { font-size: 13pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; }
          strong { font-weight: bold; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; font-size: 10pt; text-align: center; padding-top: 15px; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>AISA FORENSIC EVIDENCE & ADMISSIBILITY REPORT</h1>
        <p><strong>Analysis Date:</strong> ${new Date().toLocaleDateString()}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;"/>
        ${parsedReport}
        <div class="footer">Generated by AISA Enterprise Forensic Authenticator - ${new Date().toLocaleDateString()}</div>
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

  const filteredTools = useMemo(() => {
    return allTools.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(toolsSearchQuery.toLowerCase()) || 
                          t.desc.toLowerCase().includes(toolsSearchQuery.toLowerCase());
      const matchCat = toolsCategory === 'All' || t.category === toolsCategory;
      return matchSearch && matchCat;
    });
  }, [toolsSearchQuery, toolsCategory]);

  const stats = activeForensic ? activeForensic.stats : { verificationScore: '--', riskAlerts: '--', admissibilityRate: '--', confidenceRate: '--' };

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
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">Evidence Analysis</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">FORENSIC AUTHENTICATOR ACTIVE</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setHistoryVisible(true)} 
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/30 rounded-xl text-xs font-black uppercase tracking-wider"
        >
          <History size={14} />
          <span>Forensic History</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar min-h-0 select-text">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Stats Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Fingerprint className="text-indigo-500" size={20} />
              <span className="text-lg font-black text-indigo-500 mt-2">{stats.verificationScore}{stats.verificationScore !== '--' ? '%' : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Verification Score</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <ShieldAlert className={stats.riskAlerts > 0 ? 'text-red-500' : 'text-emerald-500'} size={20} />
              <span className={`text-lg font-black mt-2 ${stats.riskAlerts > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{stats.riskAlerts}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Risk Alerts</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Scale className="text-emerald-500" size={20} />
              <span className="text-lg font-black text-emerald-500 mt-2">{stats.admissibilityRate}{stats.admissibilityRate !== '--' ? '%' : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Admissibility Rate</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Brain className="text-pink-500" size={20} />
              <span className="text-lg font-black text-pink-500 mt-2">{stats.confidenceRate}{stats.confidenceRate !== '--' ? '%' : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">AI Confidence</span>
            </div>
          </div>

          {/* Quick Tools Grid Section */}
          <div className="bg-white dark:bg-[#1A2540] rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4">INTELLIGENT FORENSIC SCIENTIFIC TOOLS</h3>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5">
                <Search className="text-slate-400 mr-2 shrink-0" size={16} />
                <input 
                  type="text" 
                  placeholder="Search forensic tools..."
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                  value={toolsSearchQuery}
                  onChange={e => setToolsSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
                {['All', 'Forensic', 'Metadata', 'Document', 'Image', 'Video', 'Audio', 'Integrity'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setToolsCategory(cat)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${toolsCategory === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-[#131C31] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredTools.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setEvidenceTitle(`${t.name} - Custom Simulation`);
                    setEvidenceNotes(`Perform a detailed forensic analysis targeting ${t.name}. Validate courtroom admissibility under Section 65B.`);
                  }}
                  className="text-left p-4 bg-slate-50 dark:bg-[#131C31] hover:border-indigo-500/50 rounded-2xl transition-all group flex flex-col justify-between min-h-[100px]"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 truncate">{t.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug font-medium line-clamp-2">{t.desc}</p>
                  </div>
                  <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-2">{t.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md space-y-5">

            {/* Active Case Prefill Banner */}
            {prefillBanner && (
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    Active Case: {prefillBanner.caseTitle}
                  </p>
                  {prefillBanner.docCount > 0 ? (
                    <>
                      <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/60 font-medium mt-0.5">
                        {prefillBanner.docCount} evidence file(s) found in case — context pre-loaded
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {prefillBanner.docs.map((d, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[9px] font-bold">
                            <FileText size={8} />
                            {d.name}
                          </span>
                        ))}
                        {prefillBanner.docCount > 5 && (
                          <span className="text-[9px] text-emerald-500 font-bold">+{prefillBanner.docCount - 5} more</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/60 font-medium mt-0.5">
                      Case facts pre-loaded — upload new evidence to analyze
                    </p>
                  )}
                </div>
                <button onClick={() => setPrefillBanner(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full text-emerald-500 shrink-0">
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <Upload size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">UPLOAD ELECTRONIC RECORD EVIDENCE</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dropzone */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-8 hover:bg-slate-50 dark:hover:bg-[#131C31] cursor-pointer transition-all">
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept={
                    toolsCategory === 'Image' ? 'image/*' : 
                    toolsCategory === 'Video' ? 'video/*' : 
                    toolsCategory === 'Audio' ? 'audio/*' : 
                    toolsCategory === 'Document' ? 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain' : 
                    '*/*'
                  }
                />
                <Fingerprint className="text-slate-300 dark:text-zinc-700 mb-2" size={32} />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Click to Select Evidence File</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Accepts {toolsCategory === 'All' ? 'any media' : toolsCategory} (Max 15MB)</span>
              </label>

              {/* Form Metadata */}
              <div className="space-y-4">
                {allProjects.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Link to MyCase</label>
                    <select
                      value={linkedCaseId}
                      onChange={e => handleCaseSelect(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                    >
                      <option value="">Manual Entry (No Sync)</option>
                      {allProjects.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Evidence Description Name</label>
                  <input
                    type="text"
                    placeholder="e.g. CCTV Video Clip - Main Gate"
                    value={evidenceTitle}
                    onChange={e => setEvidenceTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Forensic Context Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide chain of custody, device name or context details..."
                    value={evidenceNotes}
                    onChange={e => setEvidenceNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium outline-none text-slate-800 dark:text-white resize-none"
                  />
                </div>
              </div>
            </div>

            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/20 rounded-2xl">
                <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-white truncate">{selectedFile.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{Math.round(selectedFile.size / 1024)} KB • {selectedFile.mimeType}</p>
                </div>
                <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
            )}

            <button
              onClick={() => runForensicScanner()}
              disabled={isAuditing || (!evidenceNotes.trim() && !selectedFile)}
              className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Fingerprint size={16} />
              <span>Initiate Forensic Analysis</span>
            </button>
          </div>

          {/* Phase loader */}
          {isAuditing && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-500 animate-pulse">
                {scanPhase === 'uploading' ? 'Reading file signature...' : 
                 scanPhase === 'analyzing' ? 'Checking digital timestamps...' : 
                 scanPhase === 'generating' ? 'Writing Section 65B compliance report...' : 
                 'Auditing evidence parameters...'}
              </span>
            </div>
          )}

          {/* Result Forensic Report */}
          {forensicResult && (
            <div ref={scrollRef} className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">FORENSIC INTEGRITY SCAN REPORT</h3>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleCopy(forensicResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-indigo-600"
                    title="Copy Report"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={() => handleShare(forensicResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-indigo-600"
                    title="Share Report"
                  >
                    <Share2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleSpeech(forensicResult.report)}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg ${isSpeaking ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' : 'text-slate-500'}`}
                    title="Speak Report"
                  >
                    <Mic size={14} />
                  </button>
                  <button 
                    onClick={() => handleExportPDF(forensicResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-indigo-600 hover:text-indigo-700"
                    title="Print PDF"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap select-text leading-relaxed text-slate-800 dark:text-slate-200">
                {forensicResult.report}
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
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Forensic Records Archive</h3>
              <button onClick={() => setHistoryVisible(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 mt-4 shrink-0">
              <Search size={16} className="text-slate-400 mr-2" />
              <input 
                type="text"
                placeholder="Search forensic history..."
                className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-3 custom-scrollbar">
              {historyData.filter(h => 
                h.title?.toLowerCase().includes(historySearch.toLowerCase()) || 
                h.evidenceNotes?.toLowerCase().includes(historySearch.toLowerCase())
              ).map(item => (
                <div key={item.id} className="flex justify-between items-start p-4 bg-slate-50 dark:bg-[#1A2540] border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <button
                    onClick={() => {
                      setActiveForensic(item);
                      setForensicResult(item);
                      setHistoryVisible(false);
                      toast.success(`Loaded forensic audit: ${item.title}`);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.title}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{item.timestamp}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium line-clamp-2">{item.evidenceNotes}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[9px] font-bold text-indigo-600 rounded-md">Verification: {item.stats.verificationScore}%</span>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-[9px] font-bold text-emerald-600 rounded-md">Admissibility: {item.stats.admissibilityRate}%</span>
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
                  <p className="text-xs font-semibold text-slate-400 mt-2">No logs saved yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceAnalysis;
