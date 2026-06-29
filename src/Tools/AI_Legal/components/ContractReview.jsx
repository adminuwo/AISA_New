import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Plus, FileText, Copy, 
  Share2, FileDown, History, Search, X, Shield, Clock, 
  Brain, Scale, BookOpen, AlertTriangle, TrendingUp, Mic, 
  Database, Cpu, Briefcase, Building2, Landmark, Folder, Printer, CheckCircle2,
  Upload, Sparkles, RefreshCw, BarChart2, Edit3, Trash2, Eye, Award, Check, FileSpreadsheet, Send, FileCheck, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { mapCaseToForm } from '../services/activeModuleService';
import { useActiveCase } from '../context/ActiveCaseContext';
import { getUserData } from '../../../userStore/userData';
import useOutputLanguage from '../hooks/useOutputLanguage';
import LanguageToggle from './shared/LanguageToggle';
import CopyOutputButton from './shared/CopyOutputButton';

// Specialized modules presets
const allTools = [
  { id: 'NDA', name: 'NDA Review', desc: 'Indemnity & leak audit', category: 'Corporate' },
  { id: 'Employment', name: 'Employment Scan', desc: 'Non-compete & severance', category: 'HR' },
  { id: 'Lease', name: 'Lease Review', desc: 'Rent escalations & evictions', category: 'Real Estate' },
  { id: 'Vendor', name: 'Vendor Agreement', desc: 'Net payment & penalties', category: 'Commercial' },
  { id: 'Investment', name: 'Investment Review', desc: 'Liquidation & vetos', category: 'Corporate' },
  { id: 'SaaS', name: 'SaaS Agreement', desc: 'SLA uptime & data rights', category: 'IT' },
  { id: 'Privacy', name: 'Privacy Policy', desc: 'GDPR & DPDP compliance', category: 'IT' },
];

const ContractReview = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';
  
  // Platform States
  const [contractTitle, setContractTitle] = useState('');
  const [contractText, setContractText] = useState('');
  const [linkedCaseId, setLinkedCaseId] = useState(currentCase?._id || '');
  const [isSyncing, setIsSyncing] = useState(false);

  // Upload & OCR States
  const [files, setFiles] = useState([]);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrSearchQuery, setOcrSearchQuery] = useState('');
  const [isEditingOcr, setIsEditingOcr] = useState(false);
  const [activeFileId, setActiveFileId] = useState(null);

  // Audit States
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState('');
  const [auditResult, setAuditResult] = useState(null);
  
  // Tabs & Views
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'clauses' | 'missing' | 'risks' | 'compliance' | 'financials' | 'obligations' | 'dates' | 'compare' | 'chat' | 'logs'
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Version Control & Logging
  const [versions, setVersions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Rewrite Engine States
  const [activeRewriteClause, setActiveRewriteClause] = useState(null);
  const [rewriteTone, setRewriteTone] = useState('Balanced');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewrittenWording, setRewrittenWording] = useState('');

  // Comparison States
  const [secondContractFile, setSecondContractFile] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);

  // Contract Chat States
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // UI state filters
  const [toolsCategory, setToolsCategory] = useState('All');
  const [prefillBanner, setPrefillBanner] = useState(null);

  // Get active case context
  const activeCaseContext = useActiveCase();
  const triggerAutoRun = activeCaseContext?.triggerAutoRun;

  const scrollRef = useRef(null);
  const chatBottomRef = useRef(null);
  const contractMountedRef = useRef(true);

  // ─ Language Toggle ────────────────────────────────────────
  const {
    outputLang: contractLang,
    setOutputLang: setContractLang,
    isTranslating: isContractTranslating,
    setIsTranslating: setIsContractTranslating,
    translateText: translateContractText,
    getDisplayText: getContractDisplayText,
  } = useOutputLanguage('contract_review', currentCase?._id || 'global');

  const [contractOpinionDisplay, setContractOpinionDisplay] = useState('');

  useEffect(() => {
    contractMountedRef.current = true;
    return () => { contractMountedRef.current = false; };
  }, []);

  // Reset display when auditResult changes
  useEffect(() => {
    if (auditResult?.finalOpinion?.reasoning) {
      setContractOpinionDisplay(auditResult.finalOpinion.reasoning);
      setContractLang('en');
    }
  }, [auditResult]); // eslint-disable-line

  const handleContractLangChange = useCallback(async (newLang) => {
    setContractLang(newLang);
    const text = auditResult?.finalOpinion?.reasoning;
    if (!text) return;
    if (newLang === 'en') {
      setContractOpinionDisplay(text);
      return;
    }
    const cached = getContractDisplayText(text);
    if (cached && cached !== text) {
      setContractOpinionDisplay(cached);
      return;
    }
    setIsContractTranslating(true);
    try {
      const translated = await translateContractText(text);
      if (contractMountedRef.current) setContractOpinionDisplay(translated);
    } catch {
      if (contractMountedRef.current) setContractOpinionDisplay(text);
    } finally {
      if (contractMountedRef.current) setIsContractTranslating(false);
    }
  }, [auditResult, getContractDisplayText, setContractLang, setIsContractTranslating, translateContractText]);

  // --- Initialize and Hydrate from Database ---
  useEffect(() => {
    if (currentCase) {
      setLinkedCaseId(currentCase._id);
      hydrateFromCase(currentCase);
    } else {
      resetPlatformState();
    }
  }, [currentCase]);

  // Handle active case auto-load and trigger auto-run
  useEffect(() => {
    if (currentCase) {
      const mapped = mapCaseToForm(currentCase);

      if (mapped.hasContract && mapped.contractFiles?.length) {
        const contractFile = mapped.contractFiles[0];
        setContractTitle(`${mapped.caseTitle} — ${contractFile.name}`);
        setContractText(mapped.caseFacts || '');
        setPrefillBanner({ type: 'success', caseTitle: mapped.caseTitle, message: `Contract found: ${contractFile.name}. Automatically staging context.` });
      } else if (mapped.caseFacts) {
        setContractTitle(mapped.caseTitle || '');
        setContractText(mapped.caseFacts);
        setPrefillBanner({ type: 'warning', caseTitle: mapped.caseTitle, message: 'No contract files found in case. Seeding facts as review context.' });
      }
    }
  }, [currentCase]);

  // Execute Auto-Run if intended by Context
  useEffect(() => {
    if (triggerAutoRun && currentCase && !auditResult && !isAuditing) {
      toast.success(`✓ Case workspace prefilled successfully`, { icon: '📄', duration: 3000 });
      setTimeout(() => {
        const mapped = mapCaseToForm(currentCase);
        let runTitle = mapped.caseTitle || currentCase.name || '';
        let runText = mapped.caseFacts || currentCase.description || '';
        if (mapped.hasContract && mapped.contractFiles?.length) {
          runTitle = `${mapped.caseTitle} — ${mapped.contractFiles[0].name}`;
        }
        performContractAuditInternal(runTitle, runText, files, versions, auditLogs);
      }, 100);
    }
  }, [triggerAutoRun, currentCase, auditResult, isAuditing]);

  const resetPlatformState = () => {
    setContractTitle('');
    setContractText('');
    setFiles([]);
    setAuditResult(null);
    setVersions([]);
    setAuditLogs([]);
    setChatHistory([]);
    setComparisonResult(null);
    setSecondContractFile(null);
    setActiveFileId(null);
  };

  const hydrateFromCase = (caseObj) => {
    if (!caseObj) return;
    const ci = caseObj.contractIntelligence;
    if (ci) {
      setFiles(ci.files || []);
      setContractTitle(ci.contractTitle || caseObj.name || '');
      setContractText(ci.activeContractText || caseObj.description || '');
      setAuditResult(ci.auditResult || null);
      setVersions(ci.versions || []);
      setAuditLogs(ci.auditLogs || []);
      setChatHistory(ci.chatHistory || []);
      setComparisonResult(ci.comparisonResult || null);
      if (ci.files?.length > 0) {
        setActiveFileId(ci.files[0].id);
      }
    } else {
      // Legacy or fresh case fallback
      resetPlatformState();
      setContractTitle(caseObj.name || '');
      setContractText(caseObj.description || '');
    }
  };

  // Ensure case is created in database (For manual entries)
  const ensureCaseCreated = async (fileName) => {
    let activeId = linkedCaseId || currentCase?._id;
    let activeProj = currentCase || allProjects.find(p => p._id === activeId);

    if (!activeId) {
      setIsSyncing(true);
      const title = `Contract Review: ${fileName || contractTitle || 'Custom Agreement'}`;
      try {
        const newProj = await apiService.createProject({
          name: title,
          isLegalCase: true,
          description: `Automatically created for Contract Review of ${fileName || 'uploaded file'}.`
        });
        activeId = newProj._id;
        activeProj = newProj;
        setLinkedCaseId(activeId);
        if (onUpdateCase) onUpdateCase(newProj);
        toast.success(`📁 Database Case created: "${title}"`);
      } catch (e) {
        console.error("Auto-create case failed", e);
        toast.error("Offline fallback: using local simulation.");
      } finally {
        setIsSyncing(false);
      }
    }
    return { activeId, activeProj };
  };

  // Sync state changes directly to the database
  const syncToDatabase = async (updates) => {
    const activeId = linkedCaseId || currentCase?._id;
    if (!activeId) return;
    setIsSyncing(true);
    try {
      const activeProj = allProjects.find(p => p._id === activeId) || currentCase;
      const currentCi = activeProj?.contractIntelligence || {};
      const payload = {
        ...activeProj,
        contractIntelligence: {
          ...currentCi,
          contractTitle,
          activeContractText: contractText,
          files,
          auditResult,
          versions,
          auditLogs,
          chatHistory,
          comparisonResult,
          ...updates
        }
      };
      const response = await apiService.updateProject(activeId, payload);
      if (onUpdateCase) onUpdateCase(response);
    } catch (e) {
      console.error("Database sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Push record to Audit Log Trail
  const logAudit = async (action, details, customLogsList = null) => {
    const timestamp = new Date().toISOString();
    const userEmail = getUserData()?.email || 'System User';
    const userName = getUserData()?.name || 'Advocate';
    const newLog = {
      timestamp,
      action,
      details,
      editedBy: `${userName} (${userEmail})`
    };

    const targetList = customLogsList || auditLogs;
    const updatedLogs = [...targetList, newLog];
    setAuditLogs(updatedLogs);

    // Sync database with updated logs list
    await syncToDatabase({ auditLogs: updatedLogs });
  };

  // Create document version record
  const createDocumentVersion = async (newText, note, customVersionsList = null) => {
    const targetVersions = customVersionsList || versions;
    const nextVerNo = targetVersions.length + 1;
    const newVer = {
      version: nextVerNo,
      timestamp: new Date().toISOString(),
      text: newText,
      note: note || `Revision version ${nextVerNo}`
    };
    const updatedVersions = [...targetVersions, newVer];
    setVersions(updatedVersions);
    
    await syncToDatabase({
      activeContractText: newText,
      versions: updatedVersions
    });
    await logAudit('Version Saved', `Saved Document version ${nextVerNo} - ${note}`, updatedVersions);
  };

  // --- Drop & Drag / File Upload Handlers ---
  const handleFileUpload = async (e, isComparison = false) => {
    const uploadedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (uploadedFiles.length === 0) return;

    if (isComparison) {
      const file = uploadedFiles[0];
      setSecondContractFile({ name: file.name, status: 'Staged', text: '' });
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        setSecondContractFile(prev => ({ ...prev, base64: base64Data, status: 'Loaded' }));
        toast.success(`Secondary contract staged: ${file.name}`);
      };
      reader.readAsDataURL(file);
      return;
    }

    const { activeId } = await ensureCaseCreated(uploadedFiles[0].name);

    setIsOcrLoading(true);
    const newStagedFiles = [];

    for (const file of uploadedFiles) {
      const reader = new FileReader();
      const loadPromise = new Promise((resolve) => {
        reader.onload = async () => {
          const base64Data = reader.result.split(',')[1];
          const newFile = {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadDate: new Date().toLocaleDateString(),
            base64: base64Data,
            ocrText: ''
          };
          resolve(newFile);
        };
        reader.readAsDataURL(file);
      });

      const fileObj = await loadPromise;
      newStagedFiles.push(fileObj);

      // Perform OCR immediately using Gemini Multi-modal API
      try {
        toast.loading(`OCR Extracting text: ${fileObj.name}...`, { id: 'ocr' });
        const systemPrompt = `You are a professional legal OCR and text extraction engine. Extract all text content from this contract file exactly, maintaining lines, headings, paragraphs, and structure. Do NOT add any notes, headers, or explanations. Just return the extracted document text.`;
        const currentMessage = `Extract the content of this file: ${fileObj.name}`;
        
        const response = await generateChatResponse(
          [],
          currentMessage,
          systemPrompt,
          [{ url: `data:${fileObj.type || 'application/pdf'};base64,${fileObj.base64}`, name: fileObj.name, type: fileObj.type.startsWith('image/') ? 'image' : 'document' }],
          'English',
          null,
          'legal'
        );

        fileObj.ocrText = response.reply || response || '';
        toast.success(`OCR Complete: ${fileObj.name}`, { id: 'ocr' });
      } catch (err) {
        console.error("OCR Extraction failed", err);
        toast.error(`OCR extraction failed. Copying raw details.`, { id: 'ocr' });
        fileObj.ocrText = `File content staged: ${fileObj.name}. Manual revision required if scanned.`;
      }
    }

    const updatedFiles = [...files, ...newStagedFiles];
    setFiles(updatedFiles);
    setActiveFileId(newStagedFiles[0].id);
    
    // Set active contract details to the first uploaded contract
    setContractTitle(newStagedFiles[0].name);
    setContractText(newStagedFiles[0].ocrText);

    // Save to version control
    const currentVersions = [...versions];
    const nextVerNo = currentVersions.length + 1;
    const initialVer = {
      version: nextVerNo,
      timestamp: new Date().toISOString(),
      text: newStagedFiles[0].ocrText,
      note: `Original Upload: ${newStagedFiles[0].name}`
    };
    const updatedVersions = [...currentVersions, initialVer];
    setVersions(updatedVersions);

    setIsOcrLoading(false);

    // Trigger state sync and log upload
    const timestamp = new Date().toISOString();
    const userEmail = getUserData()?.email || 'System User';
    const userName = getUserData()?.name || 'Advocate';
    const newLog = {
      timestamp,
      action: 'File Uploaded & OCR Scanned',
      details: `Staged contract ${newStagedFiles[0].name} (${Math.round(newStagedFiles[0].size / 1024)} KB) and completed structural OCR text extraction.`,
      editedBy: `${userName} (${userEmail})`
    };
    const updatedLogs = [...auditLogs, newLog];
    setAuditLogs(updatedLogs);

    // Write to database
    await syncToDatabase({
      contractTitle: newStagedFiles[0].name,
      activeContractText: newStagedFiles[0].ocrText,
      files: updatedFiles,
      versions: updatedVersions,
      auditLogs: updatedLogs
    });

    // Auto-run analysis
    await performContractAuditInternal(newStagedFiles[0].name, newStagedFiles[0].ocrText, updatedFiles, updatedVersions, updatedLogs);
  };

  // --- AI Contract Review Engine ---
  const runContractAudit = async () => {
    if (!contractText.trim()) {
      toast.error("Please stage contract text or upload documents first.");
      return;
    }
    await performContractAuditInternal(contractTitle, contractText, files, versions, auditLogs);
  };

  const performContractAuditInternal = async (title, text, activeFiles, activeVersions, activeLogs) => {
    setIsAuditing(true);
    setAuditResult(null);
    setAuditStep('Auditing Clauses...');

    const toastId = toast.loading("AI Platform auditing contract parameters...");

    try {
      const systemPrompt = `You are the AISA Enterprise Contract Intelligence Platform.
Audit the provided contract content and output your complete legal findings as a single valid JSON object.
Do NOT include any markdown envelope other than "json" code block. No conversation.
Ensure all keys matches the target structure exactly.

JSON Schema structure:
{
  "stats": {
    "overallScore": <Integer 0-100>,
    "riskScore": <Integer 0-100>,
    "complianceScore": <Integer 0-100>,
    "missingClausesCount": <Integer>,
    "confidenceRate": <Integer 0-100>,
    "highRiskClausesCount": <Integer>,
    "mediumRiskClausesCount": <Integer>,
    "lowRiskClausesCount": <Integer>,
    "totalClausesCount": <Integer>,
    "reviewStatus": "<Safe to Sign | Review Before Signing | High Risk | Needs Legal Revision | Not Recommended>"
  },
  "summary": {
    "contractType": "<Contract classification e.g. NDA, SaaS, SLA>",
    "parties": "<Detailed list of parties and business units>",
    "effectiveDate": "<Date or 'Not Specified'>",
    "expiryDate": "<Date or 'Not Specified'>",
    "duration": "<Duration details>",
    "jurisdiction": "<Legal jurisdiction location>",
    "governingLaw": "<Governing laws and legislative frameworks>",
    "paymentTerms": "<Payment milestones and schedules>",
    "terminationDate": "<Termination notice periods and dates>",
    "renewalDate": "<Renewal schedules>"
  },
  "clauses": [
    {
      "id": "<Unique code, e.g. c1, c2>",
      "name": "<Clause Name e.g. Confidentiality, Indemnity>",
      "text": "<The actual text corresponding from the contract>",
      "risk": "<Low | Medium | High | Critical>",
      "explanation": "<Legal exposure and explanation of why this risk rating is assigned>",
      "unfair": <Boolean true/false if clause is one-sided or highly unfair>,
      "suggestion": "<Suggested edits and mitigation edits>"
    }
  ],
  "missingClauses": [
    {
      "name": "<Missing clause title e.g. Dispute Resolution>",
      "category": "<Critical Missing | Recommended | Optional>",
      "explanation": "<Why this clause is necessary in this contract type>",
      "riskCreated": "<Negative impact or vulnerability created by its absence>"
    }
  ],
  "compliance": [
    {
      "law": "<Framework name e.g. Indian Contract Act 1872, DPDP Act 2023, GST Act, Consumer Protection>",
      "status": "<Compliant | Warning | Non-Compliant>",
      "explanation": "<Brief check details and compliance description>"
    }
  ],
  "financials": {
    "paymentAmount": "<Payment numbers and parameters>",
    "taxes": "<GST/tax rates or liability>",
    "deposit": "<Security deposits details>",
    "penalty": "<Liquidated damages or penalty rates>",
    "lateFees": "<Interest or late fees rules>",
    "renewalCharges": "<Renewal pricing rules>",
    "interest": "<Compounded interest values>",
    "summaryText": "<Financial overview explanation>"
  },
  "obligations": {
    "yours": ["<Your action obligation 1>", "<Your action obligation 2>"],
    "theirs": ["<Opposite party obligation 1>", "<Opposite party obligation 2>"],
    "summaryText": "<Obligation matrix breakdown summary>"
  },
  "timeline": [
    {
      "date": "<Target date event>",
      "event": "<Event title e.g. First Payment, Expiry>",
      "description": "<Description of requirements or deadlines>"
    }
  ],
  "recommendations": [
    {
      "type": "<Strategic | Legal | Negotiation>",
      "title": "<Recommendation Title>",
      "suggestion": "<Actions recommended to protect the interests>",
      "negotiationPoint": "<How to present and argue this change to the opposite party>",
      "alternativeText": "<Safer draft clause wording substitute>"
    }
  ],
  "finalOpinion": {
    "status": "<Safe to Sign | Review Before Signing | High Risk | Needs Legal Revision | Not Recommended>",
    "reasoning": "<Executive reasoning explaining the risk and suitability>"
  }
}`;

      setAuditStep('Processing compliance algorithms...');
      const response = await generateChatResponse(
        [],
        `Contract Title: ${title || 'Custom Agreement Review'}\n\nContract Text:\n${text}`,
        systemPrompt,
        [],
        'English',
        null,
        'legal'
      );

      const responseText = response.reply || response || '';
      
      let parsedResult = null;
      try {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          parsedResult = JSON.parse(responseText.trim());
        }
      } catch (err) {
        console.error("JSON parse failed, extracting via regex summary", err);
      }

      if (!parsedResult || !parsedResult.stats) {
        throw new Error("Unable to parse structured legal parameters.");
      }

      setAuditResult(parsedResult);
      toast.success("AI Contract intelligence report compiled!", { id: toastId });

      // Save report and append audit logs
      const timestamp = new Date().toISOString();
      const userEmail = getUserData()?.email || 'System User';
      const userName = getUserData()?.name || 'Advocate';
      const newLog = {
        timestamp,
        action: 'AI Clause Review Generated',
        details: `Generated intelligence audit. Compliance Rating: ${parsedResult.stats.complianceScore}%, Risk rating: ${parsedResult.stats.reviewStatus}. Identified ${parsedResult.clauses?.length || 0} active clauses and ${parsedResult.missingClauses?.length || 0} gaps.`,
        editedBy: `${userName} (${userEmail})`
      };
      const updatedLogs = [...activeLogs, newLog];
      setAuditLogs(updatedLogs);

      await syncToDatabase({
        auditResult: parsedResult,
        auditLogs: updatedLogs
      });

    } catch (err) {
      console.error(err);
      toast.error("Failed to compile structured audit metrics.", { id: toastId });
    } finally {
      setIsAuditing(false);
      setAuditStep('');
    }
  };

  // --- Clause Rewrite Engine ---
  const triggerClauseRewrite = (clause) => {
    setActiveRewriteClause(clause);
    setRewrittenWording('');
    setRewriteTone('Balanced');
  };

  const executeClauseRewrite = async () => {
    if (!activeRewriteClause) return;
    setIsRewriting(true);
    try {
      const systemPrompt = `You are a senior enterprise corporate lawyer drafting contracts under Indian and international laws.
Rewrite the provided clause to make it more ${rewriteTone}. 
Ensure the wording is highly professional, precise, court-ready, and mitigates undue liability.
Output ONLY the rewritten clause text inside a code block. Do NOT add conversational headers, greetings, or details.`;
      
      const response = await generateChatResponse(
        [],
        `Original Clause Name: ${activeRewriteClause.name}\nOriginal Text: ${activeRewriteClause.text}\n\nRewrite Style: ${rewriteTone}`,
        systemPrompt,
        [],
        'English',
        null,
        'legal'
      );

      const reply = response.reply || response || '';
      const cleanReply = reply.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
      setRewrittenWording(cleanReply);
    } catch (e) {
      toast.error("Failed to rewrite clause.");
    } finally {
      setIsRewriting(false);
    }
  };

  const applyRewrittenClause = async () => {
    if (!activeRewriteClause || !rewrittenWording) return;
    
    // Replace original clause in main text
    const idx = contractText.indexOf(activeRewriteClause.text);
    if (idx === -1) {
      toast.error("Original clause text was modified and could not be matches. Appending revised clause to end.");
      const updatedText = `${contractText}\n\n/* Revised ${activeRewriteClause.name} Clause */\n${rewrittenWording}`;
      setContractText(updatedText);
      await createDocumentVersion(updatedText, `Replaced ${activeRewriteClause.name} clause (appended)`);
    } else {
      const updatedText = contractText.replace(activeRewriteClause.text, rewrittenWording);
      setContractText(updatedText);
      await createDocumentVersion(updatedText, `Replaced ${activeRewriteClause.name} clause with ${rewriteTone} version`);
    }

    toast.success("Clause replaced and version logged successfully!");
    setActiveRewriteClause(null);

    // Auto update OCR text for active staged file
    if (activeFileId) {
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, ocrText: contractText.replace(activeRewriteClause.text, rewrittenWording) } : f));
    }

    // Run audit automatically with updated text
    await performContractAuditInternal(contractTitle, contractText.replace(activeRewriteClause.text, rewrittenWording), files, versions, auditLogs);
  };

  // --- Contract Chat Assistant ---
  const sendContractChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content: chatInput };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsChatSending(true);

    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const systemPrompt = `You are the Contract Intelligence Assistant. You answer advocate questions specifically using the provided contract text.
Refer to specific clauses, obligations, dates, or details mentioned in the text.
If the answer is not present in the contract, explain that it is missing.
Here is the active contract text for reference:
--------------------
${contractText}
--------------------
Provide clean, professional, courtroom-ready responses.`;

      const response = await generateChatResponse(
        updatedHistory.slice(0, -1), // Previous history
        chatInput,
        systemPrompt,
        [],
        'English',
        null,
        'legal'
      );

      const modelMsg = { id: (Date.now() + 1).toString(), role: 'model', content: response.reply || response || '' };
      const finalHistory = [...updatedHistory, modelMsg];
      setChatHistory(finalHistory);

      await syncToDatabase({ chatHistory: finalHistory });
    } catch (e) {
      toast.error("Failed to fetch response.");
    } finally {
      setIsChatSending(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // --- Contract Comparison Engine ---
  const runContractComparison = async () => {
    if (!secondContractFile || !secondContractFile.base64) {
      toast.error("Please stage a secondary contract file to compare.");
      return;
    }
    setIsComparing(true);
    setComparisonResult(null);
    const toastId = toast.loading("Analyzing clause modifications and risk differentials...");

    try {
      const systemPrompt = `You are a senior corporate contract litigation attorney.
Compare the Primary Contract with the Secondary Contract.
Identify:
1. Clauses that exist in primary but are added or completely new in the secondary.
2. Clauses removed from the primary.
3. Clauses that exist in both but are modified, explaining legal risks and implications.
4. General changes in legal risk scores.

Output your comparison as a valid JSON object matching the requested schema. Do not write normal conversation.
JSON Schema:
{
  "added": [
    { "clause": "<Clause Name>", "text": "<Wording added>", "implication": "<Implication of this addition>" }
  ],
  "removed": [
    { "clause": "<Clause Name>", "text": "<Wording removed>", "implication": "<Implication of this deletion>" }
  ],
  "modified": [
    { "clause": "<Clause Name>", "originalText": "<Primary version>", "modifiedText": "<Secondary version>", "implication": "<Implication of changes>" }
  ],
  "riskChanges": [
    { "clause": "<Clause Name>", "oldRisk": "<Low/Medium/High/Critical>", "newRisk": "<Low/Medium/High/Critical>", "explanation": "<Why risk level shifted>" }
  ]
}`;

      const response = await generateChatResponse(
        [],
        `PRIMARY CONTRACT:\n${contractText}\n\nSECONDARY CONTRACT BASE64 STAGED.\nPlease compare files.`,
        systemPrompt,
        [{ url: `data:application/pdf;base64,${secondContractFile.base64}`, name: secondContractFile.name, type: 'document' }],
        'English',
        null,
        'legal'
      );

      const text = response.reply || response || '';
      let parsed = null;
      try {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          parsed = JSON.parse(text.trim());
        }
      } catch (err) {
        console.error("Comparison JSON parse error", err);
      }

      if (!parsed) throw new Error("Unable to parse differences.");

      setComparisonResult(parsed);
      toast.success("Comparison completed!", { id: toastId });

      await logAudit("Contract Comparison Executed", `Compared primary agreement "${contractTitle}" with "${secondContractFile.name}".`);
      await syncToDatabase({ comparisonResult: parsed });

    } catch (e) {
      toast.error("Failed to complete contract comparison.", { id: toastId });
    } finally {
      setIsComparing(false);
    }
  };

  // --- Exports & Share Actions ---
  const handleCopyReport = () => {
    if (!auditResult) return;
    const reportText = JSON.stringify(auditResult, null, 2);
    navigator.clipboard.writeText(reportText);
    toast.success("JSON Audit report copied to clipboard!");
    logAudit("Copied Audit Report", "Copied complete structural audit report.");
  };

  const handleShareReport = async () => {
    if (!auditResult) return;
    const shareText = `AISA Legal Audit for ${contractTitle}. Compliance: ${auditResult.stats?.complianceScore}%. Status: ${auditResult.stats?.reviewStatus}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Audit Report: ${contractTitle}`, text: shareText });
        logAudit("Shared Audit Report", "Shared audit metadata report via native channels.");
      } catch (e) { console.log(e); }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Summary copied to clipboard!");
    }
  };

  const handleSpeechSummary = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (auditResult) {
      const text = `Contract Audit Summary for ${contractTitle}. Classification: ${auditResult.summary?.contractType}. Overall compliance is ${auditResult.stats?.complianceScore} percent. Risk classification is ${auditResult.stats?.reviewStatus}. Opinion: ${auditResult.finalOpinion?.reasoning}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handlePrintPDF = () => {
    if (!auditResult) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Enable popups to export printable PDF.");
      return;
    }

    const html = `
      <html>
      <head>
        <meta charset="UTF-8"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet"/>
        <title>AISA Contract Intelligence Report - ${contractTitle}</title>
        <style>
          body { font-family: 'Noto Sans Devanagari', 'Noto Sans', Arial, sans-serif; padding: 45px; line-height: 1.8; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 30px; }
          .title { text-transform: uppercase; font-size: 18pt; font-weight: bold; color: #4f46e5; margin: 0; }
          .meta-section { margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; font-size: 11pt; }
          .section-title { font-size: 14pt; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; color: #1e1b4b; margin-top: 30px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10.5pt; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .risk-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 9pt; }
          .risk-High, .risk-Critical { background: #fee2e2; color: #991b1b; }
          .risk-Medium { background: #fef3c7; color: #92400e; }
          .risk-Low { background: #dcfce7; color: #166534; }
          .footer { margin-top: 60px; border-top: 1px solid #e2e8f0; font-size: 9pt; text-align: center; padding-top: 15px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 9pt; font-weight: bold; letter-spacing: 2px; color: #4f46e5; margin-bottom: 5px;">AISA ENTERPRISE CONTRACT INTELLIGENCE</div>
          <h1 class="title">AI Compliance & Risk Audit Report</h1>
          <div style="margin-top: 5px; font-size: 11pt;">Document: <strong>${contractTitle}</strong></div>
        </div>

        <div class="meta-section">
          <div class="meta-grid">
            <div>
              <p><strong>Compliance Rating:</strong> ${auditResult.stats?.complianceScore}%</p>
              <p><strong>Overall Risk Status:</strong> ${auditResult.stats?.reviewStatus}</p>
              <p><strong>AI Confidence Rate:</strong> ${auditResult.stats?.confidenceRate}%</p>
            </div>
            <div>
              <p><strong>Contract Type:</strong> ${auditResult.summary?.contractType}</p>
              <p><strong>Jurisdiction:</strong> ${auditResult.summary?.jurisdiction}</p>
              <p><strong>Governing Law:</strong> ${auditResult.summary?.governingLaw}</p>
            </div>
          </div>
        </div>

        <div class="section-title">1. Executive Final Opinion</div>
        <p style="font-size: 11pt; line-height: 1.6;">${contractOpinionDisplay || auditResult.finalOpinion?.reasoning}</p>

        <div class="section-title">2. Clause-by-Clause Risk Breakdown</div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Clause Name</th>
              <th style="width: 15%;">Risk Level</th>
              <th>Auditor Exposure & Suggestions</th>
            </tr>
          </thead>
          <tbody>
            ${auditResult.clauses?.map(c => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td><span class="risk-badge risk-${c.risk}">${c.risk}</span></td>
                <td>
                  <p style="margin: 0 0 5px 0;">${c.explanation}</p>
                  ${c.suggestion ? `<p style="margin: 5px 0 0 0; font-style: italic; color: #4f46e5;">Proposed: ${c.suggestion}</p>` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="3">No clauses analyzed.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">3. Identified Gaps & Missing Clauses</div>
        <ul>
          ${auditResult.missingClauses?.map(m => `
            <li style="margin-bottom: 10px; font-size: 11pt;">
              <strong>${m.name}</strong> (${m.category}) - ${m.explanation}
              <br/><span style="color: #b91c1c; font-size: 10pt;">Risk Created: ${m.riskCreated}</span>
            </li>
          `).join('') || '<li>No missing clauses identified.</li>'}
        </ul>

        <div class="section-title">4. Compliance Framework Evaluation</div>
        <ul>
          ${auditResult.compliance?.map(c => `
            <li style="margin-bottom: 8px; font-size: 11pt;">
              <strong>${c.law}:</strong> Status [${c.status}] - ${c.explanation}
            </li>
          `).join('') || '<li>No compliance modules mapped.</li>'}
        </ul>

        <div class="footer">
          Generated automatically by AISA Court-Ready Platform on ${new Date().toLocaleString()}
          <br/>Audit logs synced. Secured and authenticated document copy.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      logAudit("Exported PDF Report", "Generated and exported printable contract review PDF.");
    }, 500);
  };

  const handleExportDoc = () => {
    if (!auditResult) return;
    const docContent = `
AISA CONTRACT INTELLIGENCE PLATFORM REPORT
=========================================

Title: ${contractTitle}
Audited Date: ${new Date().toLocaleDateString()}
Compliance Score: ${auditResult.stats?.complianceScore}%
Risk Rating: ${auditResult.stats?.reviewStatus}
AI Confidence Rate: ${auditResult.stats?.confidenceRate}%

SUMMARY INFO:
-------------
- Contract Classification: ${auditResult.summary?.contractType}
- Parties Involved: ${auditResult.summary?.parties}
- Effective Date: ${auditResult.summary?.effectiveDate}
- Jurisdiction: ${auditResult.summary?.jurisdiction}
- Governing Legislation: ${auditResult.summary?.governingLaw}
- Payment Terms: ${auditResult.summary?.paymentTerms}

FINAL AI LEGAL OPINION:
-----------------------
${contractOpinionDisplay || auditResult.finalOpinion?.reasoning}

AUDITED CLAUSES REPORT:
-----------------------
${auditResult.clauses?.map(c => `
Clause Name: ${c.name}
Risk Rating: ${c.risk}
Unfair Clause Flag: ${c.unfair ? 'YES' : 'NO'}
Clause Draft text: "${c.text}"
Auditor Findings: ${c.explanation}
Proposed Alternate: ${c.suggestion || 'No edits suggested.'}
-----------------------
`).join('\n')}

IDENTIFIED GAPS & MISSING CLAUSES:
----------------------------------
${auditResult.missingClauses?.map(m => `
- [${m.category}] ${m.name}:
  Description: ${m.explanation}
  Risk Created: ${m.riskCreated}
`).join('\n')}

COMPLIANCE ROADMAP:
-------------------
${auditResult.compliance?.map(c => `- ${c.law} [${c.status}]: ${c.explanation}`).join('\n')}

FINANCIAL OBLIGATIONS EXTRACT:
------------------------------
${auditResult.financials?.summaryText || ''}
- Payments: ${auditResult.financials?.paymentAmount || 'N/A'}
- Taxes / GST: ${auditResult.financials?.taxes || 'N/A'}
- Penalty Rates: ${auditResult.financials?.penalty || 'N/A'}

OBLIGATIONS TIMELINE:
---------------------
${auditResult.obligations?.summaryText || ''}
Your obligations:
${auditResult.obligations?.yours?.map(o => `  * ${o}`).join('\n')}
Opposing party obligations:
${auditResult.obligations?.theirs?.map(o => `  * ${o}`).join('\n')}

Generated by AISA AI Legal Assistant. Database verified.
`;

    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contractTitle.replace(/\s+/g, '_')}_AISA_Audit_Report.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logAudit("Downloaded DOCX Report", "Downloaded structured Word review report.");
    toast.success("Word document review report downloaded!");
  };

  const handleQuickToolSelect = (toolId) => {
    let title = '';
    let text = '';
    
    if (toolId === 'NDA') {
      title = 'Mutual Non-Disclosure Agreement.pdf';
      text = `This Mutual Non-Disclosure Agreement is entered between TechCorp India and SparkAI Solutions. Section 6 (Indemnity) states that SparkAI must fully indemnify TechCorp for any indirect, incidental, or consequential damages resulting from proprietary breaches, without any limitation of liability. No reciprocal indemnity is provided for TechCorp breaches. All disputes are governed exclusively by New York law.`;
    } else if (toolId === 'Employment') {
      title = 'Executive Employment Agreement.docx';
      text = `Section 15 states that the Executive agrees to a 24-month post-employment non-compete covenant applicable worldwide. The Company reserves the unilateral right to terminate the Executive immediately without notice, compensation, or payment in lieu of notice for any structural reorganization. The Executive waives all rights to seek court-ordered arbitration or labor disputes redressal.`;
    } else if (toolId === 'Lease') {
      title = 'Commercial Office Lease Deed.docx';
      text = `Section 9 states that the Landlord shall have the right to escalate the monthly license fee by 18% compounding annually. Under Section 14, in the event of any municipal utility maintenance delays exceeding 48 hours, the Landlord reserves the absolute right of summary eviction with a 72-hour vacate notice. The Security Deposit is forfeited entirely if tenancy is terminated before 36 months.`;
    } else if (toolId === 'Vendor') {
      title = 'Master Services Vendor Contract.pdf';
      text = `Section 12 details payment terms as Net 120 days upon client certification. Any delay in project sprints, irrespective of lockdowns, force majeure, or developer illness, shall attract a daily liquidated penalty of 2% of the aggregate annual contract value. All Intellectual Property rights transfers to the client immediately upon codeline creation.`;
    } else if (toolId === 'Investment') {
      title = 'Series A Share Purchase Agreement.pdf';
      text = `Section 5 stipulates a 3.5x liquidation preference on all preferred class stocks. The investors retain full veto rights over board approvals, including hiring, operations budgets, and scaling paths. Founder vesting is extended to 7 years with a 2-year cliff. Governing jurisdiction is exclusively Singapore arbitration centers.`;
    } else if (toolId === 'SaaS') {
      title = 'Enterprise Cloud SaaS License.docx';
      text = `Section 10 grants customer SaaS access. The SLA availability is set at 96% with no service credit refunds for outages. Section 14 states that all metadata telemetry, transaction facts, and uploaded databases become the exclusive IP of the Provider with reseller capabilities.`;
    } else if (toolId === 'Privacy') {
      title = 'App User Privacy Policy.txt';
      text = `This policy details that the App stores all geolocation tracking, contact logs, device telemetry, and advertising IDs indefinitely. This data is shared and sold to ad-broker networks. By downloading, the user consents. No opt-out forms are supported. Dispute venue is located in Seychelles under local rules.`;
    }

    setContractTitle(title);
    setContractText(text);
    toast.success(`Template loaded: ${title}`);
    
    // Trigger auto-analysis on selection
    performContractAuditInternal(title, text, files, versions, auditLogs);
  };

  // --- Dynamic Stats Definitions ---
  const stats = useMemo(() => {
    if (auditResult && auditResult.stats) {
      return auditResult.stats;
    }
    return {
      overallScore: '--',
      riskScore: '--',
      complianceScore: '--',
      missingClausesCount: '--',
      confidenceRate: '--',
      highRiskClausesCount: 0,
      mediumRiskClausesCount: 0,
      lowRiskClausesCount: 0,
      totalClausesCount: 0,
      reviewStatus: '--'
    };
  }, [auditResult]);

  // Filter tools category logic
  const filteredTools = useMemo(() => {
    return allTools.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(toolsSearchQuery.toLowerCase()) || 
                          t.desc.toLowerCase().includes(toolsSearchQuery.toLowerCase());
      const matchCat = toolsCategory === 'All' || t.category === toolsCategory;
      return matchSearch && matchCat;
    });
  }, [toolsSearchQuery, toolsCategory]);

  return (
    <div className={`flex-1 flex flex-col w-full h-full min-h-0 ${isDark ? 'bg-[#070b16] text-slate-100' : 'bg-slate-50 text-slate-800'} overflow-hidden select-none`}>
      
      {/* Header bar */}
      <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-slate-800 bg-[#0B1020]/80' : 'border-slate-200 bg-white'} backdrop-blur-xl`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className={`text-lg font-black leading-none tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>AI Contract Intelligence Platform</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">AISA COURT-READY SYSTEM</span>
              {isSyncing && (
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider animate-pulse ml-2">✓ DB Synced</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setHistoryVisible(true)} 
            className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${isDark ? 'bg-[#1A2540] border-slate-800 text-indigo-400 hover:bg-[#202E50]' : 'bg-indigo-50 border-indigo-200/30 text-indigo-600 hover:bg-indigo-100'}`}
          >
            <History size={14} />
            <span>Platform Logs ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Main Panel Layout */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        
        {/* Left Control Panel: Upload, OCR, Chat */}
        <div className={`w-80 flex flex-col border-r shrink-0 overflow-y-auto custom-scrollbar p-5 space-y-5 ${isDark ? 'border-slate-800 bg-[#0c1224]' : 'border-slate-200 bg-white'}`}>
          
          {/* Active Case Selector */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Linked Case / Workspace</label>
            <select
              value={linkedCaseId}
              onChange={e => {
                const id = e.target.value;
                setLinkedCaseId(id);
                if (id) {
                  const selected = allProjects.find(p => p._id === id);
                  hydrateFromCase(selected);
                  toast.success(`Context synced with case: ${selected.name}`);
                } else {
                  resetPlatformState();
                }
              }}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white focus:ring-indigo-500/20' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500/20'}`}
            >
              <option value="">Manual Entry (Auto-Create case)</option>
              {allProjects.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Upload Engine */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Upload Contract File</label>
            <div 
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all relative ${
                isDark ? 'border-zinc-800 hover:border-indigo-500/50 bg-[#131c31]/30' : 'border-slate-200 hover:border-indigo-500 bg-slate-50/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)';
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
                if (isOcrLoading || isAuditing) return;
                const droppedFiles = e.dataTransfer.files;
                if (droppedFiles && droppedFiles.length > 0) {
                  handleFileUpload({ target: { files: droppedFiles } });
                }
              }}
            >
              <input 
                type="file" 
                multiple
                accept=".pdf,.docx,.doc,.txt,image/*"
                onChange={e => {
                  handleFileUpload(e);
                  // Reset input so the same file can be selected again
                  e.target.value = '';
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ zIndex: 10 }}
                disabled={isOcrLoading || isAuditing}
              />
              <Upload className="mx-auto text-indigo-500 mb-2" size={24} />
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400">DRAG & DROP OR BROWSE</p>
              <p className="text-[8px] text-slate-400 mt-1">PDF, DOCX, TXT, DOC, Images (OCR enabled)</p>
              {files.length > 0 && (
                <p className="text-[9px] font-bold text-indigo-500 mt-2 truncate">{files[files.length - 1].name}</p>
              )}
            </div>
          </div>

          {/* Staged Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Staged Contracts ({files.length})</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                {files.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setActiveFileId(f.id);
                      setContractTitle(f.name);
                      setContractText(f.ocrText);
                      // Audit with newly selected file
                      performContractAuditInternal(f.name, f.ocrText, files, versions, auditLogs);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${f.id === activeFileId ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-500' : 'border-slate-200/50 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1A2540]/30'}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck size={14} className="shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className="text-[8px] text-slate-400 font-medium shrink-0">{Math.round(f.size / 1024)} KB</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Module Templates Selection */}
          <div className="bg-slate-500/5 rounded-2xl p-4 space-y-3">
            <h3 className="text-[9px] font-black tracking-widest text-slate-400 uppercase">LOAD TEMPLATE</h3>
            <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
              {allTools.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleQuickToolSelect(t.id)}
                  className={`text-left p-2.5 bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-xl transition-all hover:border-indigo-500/40 group flex flex-col justify-between`}
                >
                  <h4 className="text-[10px] font-black text-slate-800 dark:text-white group-hover:text-indigo-500 truncate">{t.name}</h4>
                  <p className="text-[8px] text-slate-400 leading-none mt-1 truncate">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* OCR Panel */}
          <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-3 bg-[#131c31]/10">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">OCR / Transcribed Text</span>
              <button 
                onClick={() => setIsEditingOcr(!isEditingOcr)}
                className="text-[9px] font-black text-indigo-500 uppercase tracking-wider"
              >
                {isEditingOcr ? 'Discard' : 'Edit text'}
              </button>
            </div>
            
            <div className="flex items-center bg-slate-100 dark:bg-black/25 rounded-lg px-2.5 py-1.5 border border-slate-200/50 dark:border-zinc-800">
              <Search size={12} className="text-slate-400 mr-1.5 shrink-0" />
              <input 
                type="text" 
                placeholder="Search OCR keywords..."
                className="w-full bg-transparent border-none text-[10px] font-bold outline-none text-slate-850 dark:text-white"
                value={ocrSearchQuery}
                onChange={e => setOcrSearchQuery(e.target.value)}
              />
            </div>

            {isEditingOcr ? (
              <div className="space-y-2">
                <textarea
                  className={`w-full h-36 p-2 rounded-xl text-[10px] font-medium outline-none resize-none border ${isDark ? 'bg-black/40 border-zinc-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'}`}
                  value={contractText}
                  onChange={e => setContractText(e.target.value)}
                />
                <button
                  onClick={async () => {
                    setIsEditingOcr(false);
                    // Update Stages text
                    if (activeFileId) {
                      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, ocrText: contractText } : f));
                    }
                    await createDocumentVersion(contractText, 'Manual OCR text adjustment');
                    toast.success("Extracted text updated!");
                    performContractAuditInternal(contractTitle, contractText, files, versions, auditLogs);
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Save Updates
                </button>
              </div>
            ) : (
              <div className={`h-36 overflow-y-auto p-2.5 rounded-xl border text-[10px] leading-relaxed font-semibold font-mono whitespace-pre-wrap select-text custom-scrollbar ${isDark ? 'bg-black/20 border-zinc-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                {ocrSearchQuery ? (
                  (() => {
                    const parts = contractText.split(new RegExp(`(${ocrSearchQuery})`, 'gi'));
                    return parts.map((p, i) => 
                      p.toLowerCase() === ocrSearchQuery.toLowerCase() 
                        ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-600/80 text-black px-0.5 rounded font-black">{p}</mark>
                        : p
                    );
                  })()
                ) : (
                  contractText || "No contract text loaded. Upload a file or load a template."
                )}
              </div>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(contractText);
                toast.success("Text copied to clipboard!");
              }}
              disabled={!contractText}
              className="w-full py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-indigo-500 transition-colors disabled:opacity-50"
            >
              Copy Text
            </button>
          </div>

        </div>

        {/* Right Main Platform Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar px-6 py-6 space-y-6">
          <div className="max-w-6xl w-full mx-auto space-y-6">
            
            {/* Live Analytics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`border rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center ${isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Award className={stats.reviewStatus === 'Safe to Sign' ? 'text-emerald-500' : 'text-amber-500'} size={24} />
                <span className={`text-xl font-black mt-2 tracking-tight ${stats.overallScore > 80 ? 'text-emerald-500' : (stats.overallScore > 60 ? 'text-amber-500' : 'text-red-500')}`}>
                  {stats.overallScore}%
                </span>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-1">Contract Score</span>
              </div>

              <div className={`border rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center ${isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'}`}>
                <AlertTriangle className={stats.riskScore > 60 ? 'text-red-500' : 'text-amber-500'} size={24} />
                <span className={`text-xl font-black mt-2 tracking-tight ${stats.riskScore > 60 ? 'text-red-500' : (stats.riskScore > 30 ? 'text-amber-500' : 'text-emerald-500')}`}>
                  {stats.riskScore}%
                </span>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-1">Legal Risk Score</span>
              </div>

              <div className={`border rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center ${isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Shield className="text-emerald-500" size={24} />
                <span className="text-xl font-black mt-2 tracking-tight text-emerald-500">
                  {stats.complianceScore}%
                </span>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-1">Compliance Score</span>
              </div>

              <div className={`border rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center ${isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'}`}>
                <FileText className="text-indigo-500" size={24} />
                <span className="text-xl font-black mt-2 tracking-tight text-slate-800 dark:text-white">
                  {stats.missingClausesCount}
                </span>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-1">Missing Clauses</span>
              </div>

              <div className={`border rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center ${isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Brain className="text-pink-500" size={24} />
                <span className="text-xl font-black mt-2 tracking-tight text-pink-500">
                  {stats.confidenceRate}%
                </span>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-1">AI Confidence</span>
              </div>
            </div>

            {/* Stage Info and Running Audit trigger */}
            {contractText && !auditResult && !isAuditing && (
              <div className={`p-6 border rounded-3xl text-center shadow-md ${isDark ? 'bg-[#131c31]/20 border-slate-800' : 'bg-white border-slate-200'}`}>
                <FileText className="mx-auto text-indigo-500 mb-3" size={32} />
                <h3 className="text-sm font-black text-slate-850 dark:text-white mb-1.5 uppercase">Contract Text Staged</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mb-4">The text of your contract is staged and ready for analysis. Trigger the AI legal auditor to identify clauses, analyze liabilities, verify compliance laws, and audit risk levels.</p>
                <button
                  onClick={runContractAudit}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20"
                >
                  Analyze & Run Legal Audit
                </button>
              </div>
            )}

            {/* Audit Status Screen */}
            {isAuditing && (
              <div className={`p-8 border rounded-3xl text-center shadow-md space-y-4 ${isDark ? 'bg-[#131c31]/20 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-indigo-500 animate-pulse uppercase tracking-wider">AISA Auditing System Active</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{auditStep || 'Scanning contract structures...'}</p>
                </div>
                <div className="w-48 bg-slate-100 dark:bg-black/30 h-1.5 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-indigo-600 animate-progress rounded-full w-2/3" />
                </div>
              </div>
            )}

            {/* Main Tabs Navigation */}
            {auditResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
                  <div className="flex gap-1 overflow-x-auto pb-1.5 no-scrollbar max-w-full">
                    {[
                      { id: 'summary', name: 'Executive Summary', icon: Gavel },
                      { id: 'clauses', name: 'Clause Detection', icon: Shield },
                      { id: 'missing', name: 'Missing Clauses', icon: AlertTriangle },
                      { id: 'risks', name: 'Unfair Clauses', icon: Scale },
                      { id: 'compliance', name: 'Compliance Engine', icon: Landmark },
                      { id: 'financials', name: 'Financial Analysis', icon: FileSpreadsheet },
                      { id: 'obligations', name: 'Obligation Tracker', icon: Clock },
                      { id: 'dates', name: 'Timeline Dates', icon: Clock },
                      { id: 'compare', name: 'Compare Contract', icon: RefreshCw },
                      { id: 'chat', name: 'Contract Chat', icon: Send },
                    ].map(t => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-[#131C31] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
                        >
                          <Icon size={12} />
                          <span>{t.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Document Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-2 flex-wrap justify-end">
                    {/* Language Toggle */}
                    <LanguageToggle
                      lang={contractLang}
                      onChange={handleContractLangChange}
                      isTranslating={isContractTranslating}
                    />
                    <button 
                      onClick={handleShareReport}
                      className={`p-2 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Share Summary"
                    >
                      <Share2 size={14} />
                    </button>
                    <button 
                      onClick={handleSpeechSummary}
                      className={`p-2 rounded-lg transition-colors ${isSpeaking ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' : 'text-slate-500'} ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Read Aloud"
                    >
                      <Mic size={14} />
                    </button>
                    <button 
                      onClick={handlePrintPDF}
                      className={`p-2 rounded-lg text-indigo-600 hover:text-indigo-750 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Print PDF"
                    >
                      <Printer size={14} />
                    </button>
                    <button 
                      onClick={handleExportDoc}
                      className={`p-2 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Export Word Document"
                    >
                      <FileDown size={14} />
                    </button>
                  </div>
                </div>

                {/* Tab Workspace Contents */}
                <div className={`border rounded-3xl p-6 shadow-md min-h-[350px] select-text ${isDark ? 'bg-[#1A2540] border-slate-800' : 'bg-white border-slate-200'}`}>
                  
                  {/* Executive Summary */}
                  {activeTab === 'summary' && (
                    <div className="space-y-6">
                      {isContractTranslating && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 animate-pulse">
                          <span className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          अनुवाद हो रहा है...
                        </div>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Gavel className="text-indigo-500" size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AISA Platform Decision Recommendation</span>
                          <h4 className={`text-base font-black mt-0.5 uppercase ${stats.reviewStatus === 'Safe to Sign' ? 'text-emerald-500' : (stats.reviewStatus === 'Needs Legal Revision' || stats.reviewStatus === 'Review Before Signing' ? 'text-amber-500' : 'text-red-500')}`}>
                            {stats.reviewStatus}
                          </h4>
                          <p className={`text-xs font-semibold text-slate-500 mt-1 leading-relaxed transition-opacity duration-200 ${isContractTranslating ? 'opacity-50' : 'opacity-100'}`}>{contractOpinionDisplay || auditResult.finalOpinion?.reasoning}</p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { label: 'Contract Classification', value: auditResult.summary?.contractType },
                          { label: 'Parties Involved', value: auditResult.summary?.parties },
                          { label: 'Jurisdiction Venue', value: auditResult.summary?.jurisdiction },
                          { label: 'Governing Legislation', value: auditResult.summary?.governingLaw },
                          { label: 'Effective Date', value: auditResult.summary?.effectiveDate },
                          { label: 'Expiration Term', value: auditResult.summary?.expiryDate },
                          { label: 'Contract Duration', value: auditResult.summary?.duration },
                          { label: 'Payment Terms / Rules', value: auditResult.summary?.paymentTerms },
                        ].map(s => (
                          <div key={s.label} className="space-y-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.value || 'Not Specified'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clause Detection Table */}
                  {activeTab === 'clauses' && (
                    <div className="space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-bold">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400">
                              <th className="py-3 px-2 uppercase tracking-wider text-[10px]">Clause Name</th>
                              <th className="py-3 px-2 uppercase tracking-wider text-[10px]">Risk Flag</th>
                              <th className="py-3 px-2 uppercase tracking-wider text-[10px]">Findings Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40">
                            {auditResult.clauses?.map(c => (
                              <tr key={c.id} className="hover:bg-slate-500/5 transition-colors">
                                <td className="py-3 px-2 text-slate-900 dark:text-white">{c.name}</td>
                                <td className="py-3 px-2">
                                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md ${c.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-500' : (c.risk === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500')}`}>
                                    {c.risk}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-slate-600 dark:text-slate-400 font-medium">
                                  <p>{c.explanation}</p>
                                  {c.suggestion && (
                                    <p className="text-indigo-500 font-bold mt-1 text-[10px]">Suggestion: {c.suggestion}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <button
                                      onClick={() => triggerClauseRewrite(c)}
                                      className="text-[9px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1"
                                    >
                                      <RefreshCw size={10} /> Rewrite clause
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Missing Clauses */}
                  {activeTab === 'missing' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        {auditResult.missingClauses?.map((m, index) => (
                          <div key={index} className="p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-850 bg-slate-500/5 space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{m.name}</h4>
                              <span className={`px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase ${m.category === 'Critical Missing' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {m.category}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 leading-relaxed">{m.explanation}</p>
                            <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 flex items-start gap-2">
                              <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={14} />
                              <span className="text-[10px] font-bold text-red-500 leading-normal">
                                <strong>Vulnerability Created:</strong> {m.riskCreated}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Analysis & Unfair Clauses */}
                  {activeTab === 'risks' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        {auditResult.clauses?.filter(c => c.unfair || c.risk === 'High' || c.risk === 'Critical').map(c => (
                          <div key={c.id} className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">{c.name} (Audited Clause)</h4>
                              <span className="px-2 py-0.5 bg-red-500 text-white rounded-md text-[8px] font-black uppercase">
                                {c.risk} Risk / Unfair
                              </span>
                            </div>
                            <blockquote className="p-3 bg-black/10 rounded-xl border-l-4 border-red-500 font-mono text-[10px] leading-relaxed text-slate-400 select-text">
                              "{c.text}"
                            </blockquote>
                            <p className="text-xs font-semibold text-red-500 leading-relaxed">
                              <strong>Legal Findings:</strong> {c.explanation}
                            </p>
                            {c.suggestion && (
                              <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-1">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Recommended alternate wording</span>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono leading-relaxed">"{c.suggestion}"</p>
                                <button
                                  onClick={() => handleQuickToolSelect('NDA')} // trigger reload or replace
                                  className="text-[9px] font-black uppercase text-indigo-500 mt-2 block"
                                >
                                  Apply this correction edit
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {auditResult.clauses?.filter(c => c.unfair || c.risk === 'High' || c.risk === 'Critical').length === 0 && (
                          <div className="text-center py-10">
                            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                            <p className="text-xs font-bold text-slate-500">No unfair or critical liability clauses flagged!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Statutory Compliance Checklist */}
                  {activeTab === 'compliance' && (
                    <div className="space-y-4">
                      <div className="divide-y divide-slate-100 dark:divide-zinc-800/40">
                        {auditResult.compliance?.map((c, index) => (
                          <div key={index} className="py-3.5 flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{c.law}</h4>
                              <p className="text-xs font-semibold text-slate-500 leading-relaxed">{c.explanation}</p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase ${c.status === 'Compliant' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              {c.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial Analysis */}
                  {activeTab === 'financials' && (
                    <div className="space-y-6">
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">{auditResult.financials?.summaryText}</p>
                      
                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: 'Payment Terms / Value', value: auditResult.financials?.paymentAmount },
                          { label: 'Applicable Taxes / GST', value: auditResult.financials?.taxes },
                          { label: 'Retainer / Escrow Deposits', value: auditResult.financials?.deposit },
                          { label: 'Liquidated Penalty Rates', value: auditResult.financials?.penalty },
                          { label: 'Late Fees or Interest', value: auditResult.financials?.lateFees },
                          { label: 'Compounding Calculations', value: auditResult.financials?.interest },
                          { label: 'Renewal Rate Charges', value: auditResult.financials?.renewalCharges },
                        ].map(f => (
                          <div key={f.label} className="p-3.5 border border-slate-100 dark:border-zinc-800 bg-slate-500/5 rounded-2xl">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{f.label}</span>
                            <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{f.value || 'Not specified'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Obligation Tracker */}
                  {activeTab === 'obligations' && (
                    <div className="space-y-6">
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">{auditResult.obligations?.summaryText}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Yours */}
                        <div className="space-y-3 p-4 rounded-2xl border border-indigo-500/10 bg-indigo-500/5">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Your Assigned Obligations</span>
                          <ul className="space-y-2">
                            {auditResult.obligations?.yours?.map((o, index) => (
                              <li key={index} className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                <span>{o}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Theirs */}
                        <div className="space-y-3 p-4 rounded-2xl border border-violet-500/10 bg-violet-500/5">
                          <span className="text-[9px] font-black text-violet-500 uppercase tracking-widest">Counterparty Obligations</span>
                          <ul className="space-y-2">
                            {auditResult.obligations?.theirs?.map((o, index) => (
                              <li key={index} className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                                <span>{o}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dates Timeline */}
                  {activeTab === 'dates' && (
                    <div className="space-y-4">
                      <div className="relative border-l-2 border-indigo-500/30 pl-6 ml-3 space-y-6 py-2">
                        {auditResult.timeline?.map((t, index) => (
                          <div key={index} className="relative">
                            <span className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full border-4 border-indigo-600 bg-white dark:bg-[#1A2540] flex items-center justify-center shrink-0" />
                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{t.date}</span>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">{t.event}</h4>
                              <p className="text-xs font-semibold text-slate-500 leading-relaxed">{t.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contract Comparison */}
                  {activeTab === 'compare' && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl bg-slate-500/5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                            <RefreshCw size={20} className={isComparing ? 'animate-spin' : ''} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Compare with secondary draft</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Upload a secondary version of this contract to run a line-by-line diff and analyze liability shifts.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`relative border border-dashed rounded-xl px-4 py-2 text-center transition-all ${isDark ? 'border-zinc-850 hover:border-indigo-500' : 'border-slate-300 hover:border-indigo-500'}`}>
                            <input 
                              type="file" 
                              onChange={e => handleFileUpload(e, true)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={isComparing}
                            />
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">
                              {secondContractFile ? secondContractFile.name : 'Select Diff Draft'}
                            </span>
                          </div>
                          <button
                            onClick={runContractComparison}
                            disabled={isComparing || !secondContractFile}
                            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                          >
                            Compare files
                          </button>
                        </div>
                      </div>

                      {comparisonResult ? (
                        <div className="space-y-4">
                          {/* Added */}
                          {comparisonResult.added?.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                <Plus size={12} /> Staged Added Clauses
                              </h4>
                              <div className="space-y-2">
                                {comparisonResult.added.map((item, i) => (
                                  <div key={i} className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-xs">
                                    <div className="font-bold text-slate-900 dark:text-white uppercase">{item.clause}</div>
                                    <p className="font-mono text-[10px] text-slate-400 mt-1 italic">"+ {item.text}"</p>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-normal font-semibold"><strong>Implication:</strong> {item.implication}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Removed */}
                          {comparisonResult.removed?.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
                                <Trash2 size={12} /> Staged Removed Clauses
                              </h4>
                              <div className="space-y-2">
                                {comparisonResult.removed.map((item, i) => (
                                  <div key={i} className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-xs">
                                    <div className="font-bold text-slate-900 dark:text-white uppercase">{item.clause}</div>
                                    <p className="font-mono text-[10px] text-slate-400 mt-1 italic">"- {item.text}"</p>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-normal font-semibold"><strong>Implication:</strong> {item.implication}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Modified */}
                          {comparisonResult.modified?.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                <Edit3 size={12} /> Staged Modified Clauses
                              </h4>
                              <div className="space-y-2">
                                {comparisonResult.modified.map((item, i) => (
                                  <div key={i} className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-xs">
                                    <div className="font-bold text-slate-900 dark:text-white uppercase">{item.clause}</div>
                                    <div className="grid grid-cols-2 gap-3 mt-1.5 font-mono text-[9px] text-slate-400">
                                      <div className="p-2 bg-black/10 rounded-lg">Original: "{item.originalText}"</div>
                                      <div className="p-2 bg-black/10 rounded-lg text-amber-400">Modified: "{item.modifiedText}"</div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 leading-normal font-semibold"><strong>Implication:</strong> {item.implication}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        !isComparing && (
                          <div className="text-center py-8">
                            <Folder size={32} className="mx-auto text-slate-300 dark:text-zinc-700" />
                            <p className="text-xs font-semibold text-slate-400 mt-2">No comparison results compiled yet.</p>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Contract Chat */}
                  {activeTab === 'chat' && (
                    <div className="flex flex-col h-[350px] min-h-0">
                      {/* Messages list */}
                      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar mb-4">
                        {chatHistory.length === 0 && (
                          <div className="text-center py-10">
                            <Brain size={32} className="mx-auto text-slate-350 dark:text-zinc-700 animate-pulse" />
                            <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-wider">AISA Contract assistant ready</p>
                            <p className="text-[10px] text-slate-400 font-semibold">Ask questions about indemnities, terminations, governing rules, or missing terms in this contract.</p>
                          </div>
                        )}
                        {chatHistory.map(msg => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-semibold leading-relaxed break-words ${msg.role === 'user' ? 'bg-slate-100 dark:bg-[#1e293b] text-slate-900 dark:text-slate-100' : 'bg-slate-100 dark:bg-black/25 text-slate-700 dark:text-slate-200 border border-slate-200/30'}`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {isChatSending && (
                          <div className="flex justify-start">
                            <div className="bg-slate-100 dark:bg-black/25 text-indigo-500 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wider animate-pulse border border-slate-200/30">
                              Assistant typing...
                            </div>
                          </div>
                        )}
                        <div ref={chatBottomRef} />
                      </div>

                      {/* Input row */}
                      <div className="flex gap-2 shrink-0">
                        <input
                          type="text"
                          placeholder="Ask a question about this contract..."
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendContractChatMessage()}
                          className={`flex-1 border rounded-xl px-4 py-3 text-xs font-bold outline-none ${isDark ? 'bg-black/25 border-zinc-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'}`}
                        />
                        <button
                          onClick={sendContractChatMessage}
                          disabled={isChatSending || !chatInput.trim()}
                          className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* History Modal */}
      {historyVisible && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setHistoryVisible(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-[32px] max-w-lg w-full max-h-[80%] flex flex-col overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 shrink-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Platform Audit Trails</h3>
              <button onClick={() => setHistoryVisible(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 mt-4 shrink-0">
              <Search size={14} className="text-slate-400 mr-2" />
              <input 
                type="text"
                placeholder="Search audit trail logs..."
                className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-3 custom-scrollbar">
              {auditLogs.filter(h => 
                h.action?.toLowerCase().includes(historySearch.toLowerCase()) || 
                h.details?.toLowerCase().includes(historySearch.toLowerCase())
              ).map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-[#1A2540] border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{item.action}</h4>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider shrink-0 ml-2">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{item.editedBy}</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed select-text">{item.details}</p>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="text-center py-10">
                  <Folder size={32} className="mx-auto text-slate-350 dark:text-zinc-700" />
                  <p className="text-xs font-semibold text-slate-400 mt-2">No audit logs synced to database yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rewrite Engine Modal */}
      {activeRewriteClause && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setActiveRewriteClause(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-800 rounded-[32px] max-w-xl w-full max-h-[85%] flex flex-col overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Clause Rewrite Engine</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{activeRewriteClause.name}</p>
              </div>
              <button onClick={() => setActiveRewriteClause(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4 custom-scrollbar">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-450">Original Clause text</label>
                <blockquote className="p-3 bg-slate-500/5 rounded-xl font-mono text-[10px] leading-relaxed text-slate-400 mt-1 select-text">
                  "{activeRewriteClause.text}"
                </blockquote>
              </div>

              {/* Tone Selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-450">Draft Tone Wording</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {['Balanced', 'Professional', 'Court-safe', 'Legally Strong'].map(tone => (
                    <button
                      key={tone}
                      onClick={() => setRewriteTone(tone)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${rewriteTone === tone ? 'bg-indigo-650 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={executeClauseRewrite}
                disabled={isRewriting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={12} className={isRewriting ? 'animate-spin' : ''} />
                <span>Generate Rewritten Clause</span>
              </button>

              {rewrittenWording && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[9px] font-black uppercase tracking-widest text-emerald-500">AI Rewritten Alternate</label>
                  <blockquote className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 font-mono text-[10px] leading-relaxed text-emerald-600 dark:text-emerald-400 select-text">
                    "{rewrittenWording}"
                  </blockquote>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-white/5 shrink-0">
              <button
                onClick={() => setActiveRewriteClause(null)}
                className="flex-1 py-3 border border-slate-200 dark:border-zinc-800 rounded-xl font-black text-xs text-slate-500 uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={applyRewrittenClause}
                disabled={!rewrittenWording}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Apply Edit Draft
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ContractReview;
