import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Plus, FileText, Copy, 
  Share2, FileDown, History, Search, X, Shield, Clock, 
  Brain, Scale, BookOpen, AlertTriangle, TrendingUp, Mic, 
  Database, Cpu, Briefcase, Building2, Landmark, Folder, Printer, CheckCircle2,
  Upload, Sparkles, RefreshCw, BarChart2, Edit3, Trash2, Eye, Award, Check, FileSpreadsheet, Send, FileCheck, ArrowUpRight,
  FolderKanban, UploadCloud, ScanText, FileStack, Clock3, BriefcaseBusiness, BadgeCheck, Star, Pin, Lock, ChevronUp, ChevronDown,
  Files, BrainCircuit, FilePenLine, GitCompareArrows, ShieldCheck, NotebookPen, Calendar, CheckSquare, SlidersHorizontal
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
  { id: 'NDA', name: 'NDA Review', desc: 'Indemnity & leak audit', category: 'NDA' },
  { id: 'Employment', name: 'Employment Scan', desc: 'Non-compete & severance', category: 'Employment' },
  { id: 'Lease', name: 'Lease Review', desc: 'Rent escalations & evictions', category: 'Lease' },
  { id: 'Vendor', name: 'Vendor Agreement', desc: 'Net payment & penalties', category: 'Vendor' },
  { id: 'Investment', name: 'Investment Review', desc: 'Liquidation & vetos', category: 'Investment' },
  { id: 'SaaS', name: 'SaaS Agreement', desc: 'SLA uptime & data rights', category: 'Tech' },
  { id: 'MSA', name: 'Master Services Agreement', desc: 'Enterprise terms & liability', category: 'MSA' },
];

const generateMockContractIntelligence = (caseObj) => {
  const name = caseObj.name || '';
  let title = 'Master Commercial Agreement.pdf';
  let text = `MASTER SERVICES AGREEMENT
This Master Services Agreement ("Agreement") is entered into on 01 January 2026 ("Effective Date") by and between Rajesh Sharma, residing at New Delhi ("Client"), and Amit Verma, residing at Mumbai ("Opponent").
WHEREAS, the parties desire to enter into a partnership to execute commercial civil construction works.
Section 3. Payment Terms: Client shall pay the contractor Net 30 days upon submission of invoices. If any payment is delayed, contractor shall accrue interest at 18% per annum.
Section 7. Indemnity: Contractor shall indemnify and hold harmless the Client against all third-party claims, liabilities, and court costs.
Section 12. Term and Termination: This Agreement shall remain in effect for 24 months, expiring on 31 December 2027. It shall renew automatically for successive 12-month terms unless terminated.
Section 15. Jurisdiction: This Agreement is governed by the laws of India. Any litigation or arbitration arising under this Agreement shall be subject to the exclusive jurisdiction of the courts of New Delhi.`;

  let cType = 'Commercial Dispute';
  let client = caseObj.clientName || 'Rajesh Sharma';
  let opponent = caseObj.accused || 'Amit Verma';
  let cStatus = caseObj.caseStatus || caseObj.status || 'Active';
  let jurisdiction = 'New Delhi';

  if (name.toLowerCase().includes('abc') || name.toLowerCase().includes('xyz')) {
    title = 'ABC Partnership Deed.pdf';
    text = `COMMERCIAL PARTNERSHIP AGREEMENT
This agreement is made on 15 Feb 2026 between ABC Pvt Ltd and XYZ Ltd.
Section 4. Profit Sharing: ABC Pvt Ltd shall receive 60% and XYZ Ltd 40% of net proceeds.
Section 8. Dispute Resolution: Subject to arbitration in Mumbai.
Section 11. Termination: Eviction of tenancy space with 15 days notice.`;
    cType = 'Commercial Dispute';
    client = 'ABC Pvt Ltd';
    opponent = 'XYZ Ltd';
    jurisdiction = 'Mumbai';
  } else if (name.toLowerCase().includes('samsung') || name.toLowerCase().includes('consumer')) {
    title = 'Samsung Product Purchase Warranty.pdf';
    text = `WARRANTY TERMS & CONDITIONS
Consumer Case warranty for Samsung electronic devices purchased in 2026.
Section 1. Warranty Period: 12 months from purchase.
Section 6. Liability Limitation: Samsung liability is strictly limited to product replacement. No commercial or consequential damages are covered.`;
    cType = 'Consumer Case';
    client = 'Consumer Client';
    opponent = 'Samsung Electronics';
    jurisdiction = 'Bangalore';
  } else if (name.toLowerCase().includes('employment') || name.toLowerCase().includes('employee')) {
    title = 'Executive Employment Agreement.pdf';
    text = `EMPLOYMENT CONTRACT
This Employment Contract is made on 01 Mar 2026.
Section 2. Non-Compete: Employee shall not join any competitor in India for 24 months post termination.
Section 5. Termination Notice: 3 months notice required.
Section 9. Governing Law: Subject to Courts of Delhi.`;
    cType = 'Employment Contract';
    client = 'Advocate Staff';
    opponent = 'Tech Corp India';
    jurisdiction = 'Delhi';
  }

  const auditResult = {
    stats: {
      overallScore: 82,
      riskScore: 28,
      complianceScore: 91,
      negotiationScore: 74,
      missingClausesCount: 3,
      confidenceRate: 96,
      reviewStatus: 'Review Before Signing',
      timeSaved: '2.4 hrs'
    },
    summary: {
      contractType: title.replace('.pdf', ''),
      jurisdiction: jurisdiction,
      governingLaw: 'Indian Contract Act, 1872',
      effectiveDate: '01 Jan 2026',
      expiryDate: '31 Dec 2027',
      renewalStatus: 'Automatic'
    },
    finalOpinion: {
      status: 'Review Before Signing',
      reasoning: `The contract is overall well-structured with a strong compliance rating of 91%. However, several key clauses require review:
1. High interest rate of 18% per annum on payment delays (Section 3).
2. Unilateral automatic renewal terms (Section 12).
3. We recommend negotiating a cap on the interest rates to 10% and adding a 30-day manual renewal option.`
    },
    clauses: [
      {
        id: 'c1',
        name: 'Payment Terms',
        text: 'Section 3. Payment Terms: Client shall pay the contractor Net 30 days upon submission of invoices. If any payment is delayed, contractor shall accrue interest at 18% per annum.',
        risk: 'Medium',
        indianLawMapping: {
          section: 'Section 73',
          actName: 'Indian Contract Act 1872',
          applicability: 'Applies to liquidated damages and reasonable compensations.',
          interpretation: 'Indian courts do not enforce penal interest rates. 18% may be deemed penal depending on commercial context.',
          practicalEffect: 'High likelihood of interest rate reductions during litigation or arbitration proceedings.'
        },
        caseLawMapping: [
          {
            judgmentName: 'Maula Bux vs Union of India',
            citation: '1970 SCR (1) 928',
            ratio: 'Penal liquidated damages without actual loss proof are not recoverable.',
            implication: 'Interest rate claim of 18% requires reasonable evidence of actual loss.'
          }
        ],
        redraftSuggestions: {
          lawyerVersion: 'Section 3. Payment Terms: Client shall pay the contractor Net 30 days. Delayed payments shall accrue simple interest at a rate of 9% per annum.',
          clientVersion: 'Client shall pay Net 45 days. No interest or penalty shall apply to delayed invoices.',
          plainEnglish: 'The client will pay invoices within 30 days. Late payments will have a simple 9% annual interest charge.'
        }
      },
      {
        id: 'c2',
        name: 'Indemnity',
        text: 'Section 7. Indemnity: Contractor shall indemnify and hold harmless the Client against all third-party claims, liabilities, and court costs.',
        risk: 'Low',
        indianLawMapping: {
          section: 'Section 124',
          actName: 'Indian Contract Act 1872',
          applicability: 'Defines contracts of indemnity.',
          interpretation: 'Valid and fully enforceable indemnity covenant.',
          practicalEffect: 'Enables client to recover complete litigation costs and settlement fees.'
        },
        caseLawMapping: [
          {
            judgmentName: 'Gajanan Moreshwar vs Moreshwar Madan',
            citation: '(1942) 44 BOMLR 703',
            ratio: 'Indemnifier liability commences as soon as the indemnified person’s liability is absolute.',
            implication: 'Client can sue for indemnity even before paying third party damages.'
          }
        ],
        redraftSuggestions: {
          lawyerVersion: 'Section 7. Indemnity: Contractor agrees to indemnify Client against direct third-party damages arising from negligence.',
          clientVersion: 'Contractor covers direct third-party losses.',
          plainEnglish: 'The contractor will pay for any legal losses caused by their work.'
        }
      }
    ],
    missingClauses: [
      {
        id: 'm1',
        clause: 'Limitation of Liability',
        implication: 'Unlimited liability exposure on both parties. Risk is High.',
        recommendation: 'Add a clause capping liabilities to 100% of contract values.'
      },
      {
        id: 'm2',
        clause: 'Force Majeure',
        implication: 'No excuse terms for pandemic or government lockdown outages.',
        recommendation: 'Insert standard force majeure list including lockdowns.'
      }
    ]
  };

  const files = [
    {
      id: `file_${Date.now()}_1`,
      name: title,
      size: 14520,
      type: 'application/pdf',
      uploadDate: new Date().toLocaleDateString(),
      ocrText: text
    }
  ];

  const versions = [
    {
      version: 1,
      timestamp: new Date().toISOString(),
      text: text,
      note: `Original Upload: ${title}`
    }
  ];

  const auditLogs = [
    {
      timestamp: new Date(Date.now() - 300000).toISOString(),
      action: 'File Uploaded & OCR Scanned',
      details: `Staged contract ${title} and completed structural OCR text extraction.`,
      editedBy: 'Advocate (advocate@mock.com)'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      action: 'AI Clause Review Generated',
      details: 'Generated intelligence audit. Compliance Rating: 91%, Risk rating: Review Before Signing. Identified 2 active clauses and 2 gaps.',
      editedBy: 'Advocate (advocate@mock.com)'
    }
  ];

  return {
    files,
    contractTitle: title,
    activeContractText: text,
    auditResult,
    versions,
    auditLogs,
    chatHistory: [],
    comparisonResult: null
  };
};

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
  const [toolsSearchQuery, setToolsSearchQuery] = useState('');
  const [toolsCategory, setToolsCategory] = useState('All');
  // Workspace Selector and case management states
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('');
  const [workspaceCategory, setWorkspaceCategory] = useState('All');
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [prefillBanner, setPrefillBanner] = useState(null);
  
  // Create Case Form States
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseClient, setNewCaseClient] = useState('');
  const [newCaseOpponent, setNewCaseOpponent] = useState('');
  const [newCaseType, setNewCaseType] = useState('Civil Suit');
  const [newCaseSummary, setNewCaseSummary] = useState('');

  // Duplicate upload version conflict state
  const [duplicateFileConflict, setDuplicateFileConflict] = useState(null);

  // Favorite / Pinned cases lists
  const [favoriteCases, setFavoriteCases] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aisa_fav_cases') || '[]');
    } catch {
      return [];
    }
  });

  // v3.0 Workspace interactive states
  const [selectedHeatmapRisk, setSelectedHeatmapRisk] = useState(null);
  const [activeRedraftId, setActiveRedraftId] = useState(null);
  const [redraftPerspective, setRedraftPerspective] = useState('lawyer');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState({
    summary: false,
    clauses: true,
    heatmap: true,
    compliance: true,
    negotiation: true,
    redraft: true,
    caseLaws: true,
    activityLog: true,
    chat: true
  });

  const toggleBlock = (key) => {
    setCollapsedBlocks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleQuickActionClick = (id) => {
    const blockKeyMap = {
      summary: 'summary',
      heatmap: 'heatmap',
      clauses: 'clauses',
      compliance: 'compliance',
      negotiation: 'negotiation',
      redraft: 'redraft',
      caseLaws: 'caseLaws',
      activityLog: 'activityLog'
    };

    const targetKey = blockKeyMap[id];
    if (targetKey) {
      setCollapsedBlocks(prev => ({
        ...prev,
        [targetKey]: false
      }));

      setTimeout(() => {
        const element = document.getElementById(`section-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };
  const [activeSidebarSection, setActiveSidebarSection] = useState('contract');
  const [openSections, setOpenSections] = useState({
    workspace: true,
    contract: true,
    actions: true,
    templates: false,
    ocr: false,
    insights: false,
    activity: true
  });
  const [favoriteTools, setFavoriteTools] = useState(() => {
    try {
      const stored = localStorage.getItem('aisa_fav_templates');
      return stored ? JSON.parse(stored) : ['NDA'];
    } catch {
      return ['NDA'];
    }
  });

  useEffect(() => {
    localStorage.setItem('aisa_fav_templates', JSON.stringify(favoriteTools));
  }, [favoriteTools]);

  const [pinnedTools, setPinnedTools] = useState(['Employment']);

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

  useEffect(() => {
    localStorage.setItem('aisa_fav_cases', JSON.stringify(favoriteCases));
  }, [favoriteCases]);

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
      
      // Auto-filter Template Explorer category according to case matter type
      const type = currentCase.caseType || '';
      if (type.toLowerCase().includes('employment') || type.toLowerCase().includes('hr')) {
        setToolsCategory('Employment');
      } else if (type.toLowerCase().includes('nda') || type.toLowerCase().includes('disclosure')) {
        setToolsCategory('NDA');
      } else if (type.toLowerCase().includes('lease') || type.toLowerCase().includes('rent')) {
        setToolsCategory('Lease');
      } else if (type.toLowerCase().includes('vendor') || type.toLowerCase().includes('commercial')) {
        setToolsCategory('Vendor');
      } else {
        setToolsCategory('All');
      }
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

  const hydrateFromCase = async (caseObj) => {
    if (!caseObj) return;
    setIsWorkspaceLoading(true);
    
    // Simulate high-density enterprise workspace switch loading
    await new Promise(resolve => setTimeout(resolve, 400));
    
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
      // Auto-generate mock contract intelligence for standard empty cases
      const seededCi = generateMockContractIntelligence(caseObj);
      
      const payload = {
        ...caseObj,
        contractIntelligence: seededCi
      };
      
      try {
        const response = await apiService.updateProject(caseObj._id, payload);
        if (onUpdateCase) onUpdateCase(response);
      } catch (err) {
        console.error("Auto-seeding case failed to sync", err);
      }

      setFiles(seededCi.files || []);
      setContractTitle(seededCi.contractTitle || caseObj.name || '');
      setContractText(seededCi.activeContractText || caseObj.description || '');
      setAuditResult(seededCi.auditResult || null);
      setVersions(seededCi.versions || []);
      setAuditLogs(seededCi.auditLogs || []);
      setChatHistory(seededCi.chatHistory || []);
      setComparisonResult(seededCi.comparisonResult || null);
      if (seededCi.files?.length > 0) {
        setActiveFileId(seededCi.files[0].id);
      }
    }
    setIsWorkspaceLoading(false);
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

  // Conflict handlers for duplicate uploads
  const processReplaceVersionConflict = async (fileObj, conflictObj) => {
    setDuplicateFileConflict(null);
    setIsOcrLoading(true);
    const tid = toast.loading(`OCR Extracting text: ${fileObj.name}...`);
    try {
      const systemPrompt = `You are a professional legal OCR and text extraction engine. Extract all text content from this contract file exactly, maintaining lines, headings, paragraphs, and structure. Do NOT add any notes, headers, or explanations. Just return the extracted document text.`;
      const currentMessage = `Extract the content of this file: ${fileObj.name}`;
      
      const response = await generateChatResponse(
        [],
        currentMessage,
        systemPrompt,
        [{ url: `data:${fileObj.type || 'application/pdf'};base64,${conflictObj.base64}`, name: fileObj.name, type: fileObj.type.startsWith('image/') ? 'image' : 'document' }],
        'English',
        null,
        'legal'
      );

      const ocrText = response.reply || response || '';
      toast.success(`OCR Complete: ${fileObj.name}`, { id: tid });

      // Overwrite raw file in files list
      const updatedFiles = files.map(f => f.name === fileObj.name ? { ...f, size: fileObj.size, uploadDate: new Date().toLocaleDateString(), ocrText, base64: conflictObj.base64 } : f);
      setFiles(updatedFiles);
      setContractTitle(fileObj.name);
      setContractText(ocrText);

      // Save a new version record
      const currentVersions = [...versions];
      const nextVerNo = currentVersions.length + 1;
      const initialVer = {
        version: nextVerNo,
        timestamp: new Date().toISOString(),
        text: ocrText,
        note: `Version Replaced (Overwrite): ${fileObj.name}`
      };
      const updatedVersions = [...currentVersions, initialVer];
      setVersions(updatedVersions);

      // Log & sync
      const timestamp = new Date().toISOString();
      const userEmail = getUserData()?.email || 'System User';
      const userName = getUserData()?.name || 'Advocate';
      const newLog = {
        timestamp,
        action: 'File Version Overwritten',
        details: `Replaced staged file "${fileObj.name}" with a newer copy. Version incremented to v${nextVerNo}.`,
        editedBy: `${userName} (${userEmail})`
      };
      const updatedLogs = [...auditLogs, newLog];
      setAuditLogs(updatedLogs);

      await syncToDatabase({
        activeContractText: ocrText,
        files: updatedFiles,
        versions: updatedVersions,
        auditLogs: updatedLogs
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to replace version.", { id: tid });
    } finally {
      setIsOcrLoading(false);
    }
  };

  const processCreateNewVersionConflict = async (fileObj, conflictObj) => {
    setDuplicateFileConflict(null);
    setIsOcrLoading(true);
    const tid = toast.loading(`OCR Extracting text: ${fileObj.name}...`);
    try {
      const systemPrompt = `You are a professional legal OCR and text extraction engine. Extract all text content from this contract file exactly, maintaining lines, headings, paragraphs, and structure. Do NOT add any notes, headers, or explanations. Just return the extracted document text.`;
      const currentMessage = `Extract the content of this file: ${fileObj.name}`;
      
      const response = await generateChatResponse(
        [],
        currentMessage,
        systemPrompt,
        [{ url: `data:${fileObj.type || 'application/pdf'};base64,${conflictObj.base64}`, name: fileObj.name, type: fileObj.type.startsWith('image/') ? 'image' : 'document' }],
        'English',
        null,
        'legal'
      );

      const ocrText = response.reply || response || '';
      toast.success(`OCR Complete: ${fileObj.name}`, { id: tid });

      // Keep existing files, but append version
      const currentVersions = [...versions];
      const nextVerNo = currentVersions.length + 1;
      const initialVer = {
        version: nextVerNo,
        timestamp: new Date().toISOString(),
        text: ocrText,
        note: `New Version Uploaded: ${fileObj.name}`
      };
      const updatedVersions = [...currentVersions, initialVer];
      setVersions(updatedVersions);

      // Overwrite the active document text & title
      setContractTitle(fileObj.name);
      setContractText(ocrText);

      // Log & sync
      const timestamp = new Date().toISOString();
      const userEmail = getUserData()?.email || 'System User';
      const userName = getUserData()?.name || 'Advocate';
      const newLog = {
        timestamp,
        action: 'New File Version Created',
        details: `Created new version record for contract "${fileObj.name}" without replacing current list.`,
        editedBy: `${userName} (${userEmail})`
      };
      const updatedLogs = [...auditLogs, newLog];
      setAuditLogs(updatedLogs);

      await syncToDatabase({
        activeContractText: ocrText,
        versions: updatedVersions,
        auditLogs: updatedLogs
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create new version.", { id: tid });
    } finally {
      setIsOcrLoading(false);
    }
  };

  const processCompareVersionsConflict = async (fileObj, conflictObj) => {
    setDuplicateFileConflict(null);
    setIsOcrLoading(true);
    const tid = toast.loading(`Extracting version text for comparison...`);
    try {
      const systemPrompt = `You are a professional legal OCR and text extraction engine. Extract all text content from this contract file exactly.`;
      const currentMessage = `Extract the content of this file: ${fileObj.name}`;
      
      const response = await generateChatResponse(
        [],
        currentMessage,
        systemPrompt,
        [{ url: `data:${fileObj.type || 'application/pdf'};base64,${conflictObj.base64}`, name: fileObj.name, type: fileObj.type.startsWith('image/') ? 'image' : 'document' }],
        'English',
        null,
        'legal'
      );

      const newOcrText = response.reply || response || '';
      toast.success(`OCR Complete! Generating Comparison...`, { id: tid });

      // Run comparison
      const comparePrompt = `You are a professional legal counsel. Compare the following two versions of a contract:
Version 1 (Existing):
${conflictObj.existingFile.ocrText}

Version 2 (New Upload):
${newOcrText}

Provide a comparative analysis in JSON format:
{
  "modified": [
    {
      "clause": "Name of the clause changed",
      "originalText": "original text summary",
      "newText": "new text summary",
      "riskAssessment": "Risk evaluation of changes"
    }
  ]
}`;
      
      const compRes = await generateChatResponse(
        [],
        "Compare the versions",
        comparePrompt,
        [],
        'English',
        null,
        'legal'
      );

      const compText = compRes.reply || compRes || '';
      let parsedComp = { modified: [] };
      try {
        const jsonMatch = compText.match(/```json\s*([\s\S]*?)\s*```/) || compText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) parsedComp = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (err) {
        console.error(err);
      }

      setComparisonResult(parsedComp);
      setActiveTab('compare');
      toast.success("Comparison populated! Switch to comparison view tab to inspect.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to compare versions.", { id: tid });
    } finally {
      setIsOcrLoading(false);
    }
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

    // Check if the contract is already uploaded
    const existingFile = files.find(f => f.name === uploadedFiles[0].name);
    if (existingFile) {
      const file = uploadedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1];
        setDuplicateFileConflict({
          file: file,
          existingFile: existingFile,
          base64: base64Data
        });
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
      toast.error(
        <span>
          <strong>Unable to analyze contract.</strong><br/>
          Reason: OCR text missing.<br/>
          Upload or load a template first.
        </span>,
        { duration: 6000 }
      );
      return;
    }
    await performContractAuditInternal(contractTitle, contractText, files, versions, auditLogs);
  };

  const performContractAuditInternal = async (title, text, activeFiles, activeVersions, activeLogs, loadingMsg) => {
    setIsAuditing(true);
    setAuditResult(null);
    setAuditStep('Auditing Clauses...');

    const toastId = toast.loading(loadingMsg || "AI Platform auditing contract parameters...");

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
    "negotiationScore": <Integer 0-100>,
    "missingClausesCount": <Integer>,
    "confidenceRate": <Integer 0-100>,
    "highRiskClausesCount": <Integer>,
    "mediumRiskClausesCount": <Integer>,
    "lowRiskClausesCount": <Integer>,
    "totalClausesCount": <Integer>,
    "timeSaved": "<Estimated review time saved e.g. 4.5 Hours>",
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
    "renewalDate": "<Renewal schedules>",
    "renewalStatus": "<Automatic | Manual | Non-Renewable>"
  },
  "executiveSummary": {
    "overallAssessment": "<Overall assessment summary>",
    "majorLegalRisks": ["<Risk 1>", "<Risk 2>"],
    "commercialRisks": ["<Risk 1>", "<Risk 2>"],
    "financialRisks": ["<Risk 1>", "<Risk 2>"],
    "complianceConcerns": ["<Concern 1>", "<Concern 2>"],
    "urgentActionItems": ["<Action 1>", "<Action 2>"],
    "negotiationPriorities": ["<Priority 1>", "<Priority 2>"],
    "finalRecommendation": "<Final recommendation statement>"
  },
  "clauses": [
    {
      "id": "<Unique code, e.g. c1, c2>",
      "name": "<Clause Name e.g. Confidentiality, Indemnity>",
      "text": "<The actual text corresponding from the contract>",
      "risk": "<Low | Medium | High | Critical>",
      "explanation": "<Legal exposure and explanation of why this risk rating is assigned>",
      "unfair": <Boolean true/false if clause is one-sided or highly unfair>,
      "suggestion": "<Suggested edits and mitigation edits>",
      "legalImpact": "<High | Medium | Low>",
      "commercialImpact": "<High | Medium | Low>",
      "industryStandard": "<Standard wording / deviation detail>",
      "confidence": <Integer 0-100>,
      "indianLawMapping": {
        "section": "<Section e.g. Section 73>",
        "actName": "<Act name e.g. Indian Contract Act 1872>",
        "applicability": "<Applicability text>",
        "interpretation": "<Legal interpretation>",
        "practicalEffect": "<Practical effect>"
      },
      "caseLawMapping": [
        {
          "citation": "<Supreme Court or High Court Citation>",
          "judgmentName": "<Case Title>",
          "ratio": "<Ratio decidendi>",
          "implication": "<Practical implication>"
        }
      ],
      "redraftSuggestions": {
        "lawyerVersion": "<Draft written by a senior attorney>",
        "clientVersion": "<Client-friendly version>",
        "plainEnglish": "<Simple translation without legal jargon>"
      }
    }
  ],
  "missingClauses": [
    {
      "name": "<Missing clause title e.g. Dispute Resolution>",
      "category": "<Critical Missing | Recommended | Optional>",
      "importance": "<High | Medium | Low>",
      "explanation": "<Why this clause is necessary in this contract type>",
      "riskCreated": "<Negative impact or vulnerability created by its absence>",
      "suggestedWording": "<Suggested wording>",
      "applicableActs": "<Acts e.g. Indian Contract Act 1872>",
      "relatedJudgments": "<Case citations>"
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
  "negotiationCenter": {
    "sellerFriendly": ["<Point 1>"],
    "buyerFriendly": ["<Point 1>"],
    "oneSided": ["<Point 1>"],
    "balanced": ["<Point 1>"],
    "negotiationSuggestions": ["<Point 1>"],
    "fallbackLanguage": ["<Fallback language draft>"],
    "betterDraft": ["<Better revised wording>"]
  },
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
      toast.error(
        <span>
          <strong>Unable to analyze contract.</strong><br/>
          Reason: {err.message || 'Network delay or parsing issues'}.<br/>
          Upload or load a template first.
        </span>,
        { id: toastId, duration: 6000 }
      );
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

    const activeProj = allProjects.find(p => p._id === linkedCaseId) || currentCase;
    const caseHeaderHtml = activeProj ? `
        <div style="margin-top: 15px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #f8fafc; font-size: 9.5pt; line-height: 1.5; text-align: left;">
          <div style="font-weight: bold; color: #4f46e5; font-size: 8.5pt; text-transform: uppercase; margin-bottom: 5px;">Linked Case Context</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><strong>Case Name:</strong> ${activeProj.name || '--'}</div>
            <div><strong>Case No:</strong> ${activeProj.caseNumber || activeProj._id || '--'}</div>
            <div><strong>Client Name:</strong> ${activeProj.clientName || '--'}</div>
            <div><strong>Matter:</strong> ${activeProj.caseType || '--'}</div>
          </div>
        </div>
    ` : '';

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
          ${caseHeaderHtml}
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

    // Create file record to append to case contract catalog
    const fileId = `file_template_${Date.now()}`;
    const newFile = {
      id: fileId,
      name: title,
      size: text.length * 2,
      type: title.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadDate: new Date().toLocaleDateString(),
      ocrText: text
    };
    const updatedFiles = [newFile];
    setFiles(updatedFiles);
    setActiveFileId(fileId);

    // Create first contract version
    const newVersion = {
      version: 1,
      timestamp: new Date().toISOString(),
      text: text,
      note: `Template staged: ${title}`
    };
    const updatedVersions = [newVersion];
    setVersions(updatedVersions);

    // Generate chronological activity feed logs
    const timestamp = new Date().toISOString();
    const userEmail = getUserData()?.email || 'System User';
    const userName = getUserData()?.name || 'Advocate';
    const newLog = {
      timestamp,
      action: `${toolId} Template Loaded`,
      details: `Staged contract template "${title}" into active workspace.`,
      editedBy: `${userName} (${userEmail})`
    };
    const updatedLogs = [newLog];
    setAuditLogs(updatedLogs);

    // Add entry to AISA diagnostic audit list
    logAudit("Template Loaded", `Loaded legal template: ${title}`);

    // Persist staged template context to MongoDB
    syncToDatabase({
      contractTitle: title,
      activeContractText: text,
      files: updatedFiles,
      versions: updatedVersions,
      auditLogs: updatedLogs,
      auditResult: null // Reset previous audit reports to enable manual analyzing flow
    });

    // Populate staged alert prefill banner
    setPrefillBanner({
      type: 'warning',
      caseTitle: currentCase?.name || 'Staged Case Workspace',
      message: `Template loaded: ${title}. Staged in case contract catalog. Ready for Analysis.`
    });
  };

  // --- Dynamic Stats Definitions ---
  const stats = useMemo(() => {
    if (auditResult && auditResult.stats) {
      return {
        ...auditResult.stats,
        negotiationScore: auditResult.stats.negotiationScore ?? '--',
        timeSaved: auditResult.stats.timeSaved ?? '--'
      };
    }
    return {
      overallScore: '--',
      riskScore: '--',
      complianceScore: '--',
      negotiationScore: '--',
      missingClausesCount: '--',
      confidenceRate: '--',
      highRiskClausesCount: 0,
      mediumRiskClausesCount: 0,
      lowRiskClausesCount: 0,
      totalClausesCount: 0,
      timeSaved: '--',
      reviewStatus: '--'
    };
  }, [auditResult]);

  // Filter tools category logic
  const filteredTools = useMemo(() => {
    return allTools.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(toolsSearchQuery.toLowerCase()) || 
                          t.desc.toLowerCase().includes(toolsSearchQuery.toLowerCase());
      const matchCat = toolsCategory === 'All' 
        ? true 
        : toolsCategory === 'Favorites'
          ? favoriteTools.includes(t.id)
          : t.category === toolsCategory;
      return matchSearch && matchCat;
    });
  }, [toolsSearchQuery, toolsCategory, favoriteTools]);

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDownloadFile = (file) => {
    if (!file || !file.ocrText) return;
    const blob = new Blob([file.ocrText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.txt') 
      ? file.name 
      : `${file.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded: ${file.name}`);
  };

  const handleDeleteFile = async (fileId) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    if (activeFileId === fileId) {
      if (updatedFiles.length > 0) {
        setActiveFileId(updatedFiles[0].id);
        setContractTitle(updatedFiles[0].name);
        setContractText(updatedFiles[0].ocrText);
      } else {
        setActiveFileId('');
        setContractTitle('');
        setContractText('');
        setAuditResult(null);
      }
    }
    
    const timestamp = new Date().toISOString();
    const userEmail = getUserData()?.email || 'System User';
    const userName = getUserData()?.name || 'Advocate';
    const newLog = {
      timestamp,
      action: 'Document Deleted',
      details: `Removed contract with file ID ${fileId} from matter catalog.`,
      editedBy: `${userName} (${userEmail})`
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    await syncToDatabase({
      files: updatedFiles,
      auditLogs: updatedLogs
    });
    
    toast.success("Document removed from workspace catalog.");
  };

  const renderKPICards = () => {
    if (isWorkspaceLoading || isAuditing) {
      return (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`border rounded-2xl p-4 shadow-sm space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-zinc-800" />
                <div className="h-4 w-12 bg-slate-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className={`border rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.01)] space-y-1.5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="h-3 w-10 bg-slate-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!auditResult) return null;

    const listPrimary = [
      { label: 'Overall Health', value: stats.overallScore, color: 'text-indigo-500', icon: Award },
      { label: 'Legal Risk Score', value: stats.riskScore, color: 'text-red-500', icon: AlertTriangle },
      { label: 'Compliance Score', value: stats.complianceScore, color: 'text-emerald-500', icon: ShieldCheck },
      { label: 'Negotiation Score', value: stats.negotiationScore, color: 'text-indigo-650', icon: GitCompareArrows },
      { label: 'Missing Clauses', value: stats.missingClausesCount, color: 'text-violet-500', icon: NotebookPen }
    ];

    const listSecondary = [
      { label: 'Contract Type', value: auditResult.meta?.contractType || 'N/A', icon: FileText },
      { label: 'Jurisdiction', value: auditResult.meta?.jurisdiction || 'N/A', icon: Landmark },
      { label: 'Effective Date', value: auditResult.meta?.effectiveDate || 'N/A', icon: Calendar },
      { label: 'Expiration / Term', value: auditResult.meta?.expirationDate || 'N/A', icon: Calendar },
      { label: 'Renewal Status', value: auditResult.meta?.renewalStatus || 'N/A', icon: RefreshCw },
      { label: 'AI Confidence', value: stats.confidenceRate !== '--' ? `${stats.confidenceRate}%` : 'N/A', icon: ShieldCheck },
      { label: 'Review Time Saved', value: stats.timeSaved !== '--' ? stats.timeSaved : 'N/A', icon: Clock }
    ];

    return (
      <div className="space-y-4">
        {/* Primary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {listPrimary.map((item, idx) => {
            const Icon = item.icon;
            const val = item.value === '--' ? 'Analysis Pending' : item.value;
            return (
              <div key={idx} className={`border rounded-2xl p-4 shadow-sm flex flex-col justify-between ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[8px] font-black uppercase tracking-wider">{item.label}</span>
                  <Icon size={12} className={item.color} />
                </div>
                <p className={`text-base font-black mt-2 leading-none ${item.color}`}>{val}</p>
              </div>
            );
          })}
        </div>

        {/* Secondary metadata strip */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {listSecondary.map((item, idx) => {
            const Icon = item.icon;
            const val = item.value === '--' ? 'Analysis Pending' : item.value;
            return (
              <div key={idx} className={`border rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.01)] flex flex-col justify-between ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Icon size={11} className="shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-wider truncate">{item.label}</span>
                </div>
                <p className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 truncate mt-1.5 leading-none">{val}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex-1 flex flex-col w-full h-full min-h-0 ${isDark ? 'bg-[#070b16] text-slate-100' : 'bg-slate-50 text-slate-800'} overflow-hidden select-none`}>
      
      {/* Header bar */}
      <div className={`flex flex-col px-6 pt-5 pb-4 border-b shrink-0 gap-1.5 ${isDark ? 'border-slate-800 bg-[#0B1020]/80' : 'border-slate-200 bg-white'} backdrop-blur-xl`}>
        {/* Row 1: Back + Title & Audit Timeline */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack} 
              className={`w-[76px] h-9 flex items-center justify-center gap-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 ${
                isDark ? 'bg-[#1A2540] border-slate-800 text-slate-355 hover:bg-[#202E50]' : 'bg-slate-50 border-slate-205 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ChevronLeft size={12} />
              <span>Back</span>
            </button>
            
            <h1 className={`text-[28px] md:text-[32px] font-black leading-none tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Contract Analyzer
            </h1>
            {isSyncing && (
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider animate-pulse ml-2">✓ DB Synced</span>
            )}
          </div>

          <div className="shrink-0 flex items-center">
            <button 
              onClick={() => setHistoryVisible(true)} 
              title="View AI audit history, processing timeline and previous analysis events."
              className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                isDark ? 'bg-[#1A2540] border-slate-800 text-indigo-400 hover:bg-[#202E50]' : 'bg-indigo-50 border-indigo-200/30 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <History size={14} className="shrink-0" />
              <span>
                <span className="hidden md:inline">Audit Timeline </span>
                <span>({auditLogs.length})</span>
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: Subtitle */}
        <div className="pl-[92px] hidden md:block">
          <p className={`text-[14px] md:text-[15px] font-medium leading-relaxed max-w-3xl ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            AI-powered contract review, clause intelligence, compliance verification & legal risk assessment.
          </p>
        </div>
        <div className="md:hidden">
          <p className={`text-[13px] font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            AI-powered contract review, clause intelligence, compliance verification & legal risk assessment.
          </p>
        </div>
      </div>
      {/* Main Panel Layout */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        
        {/* Left Control Panel: Collapsible AI Workspace */}
        <div className={`transition-all duration-300 border-r flex flex-col shrink-0 overflow-y-auto custom-scrollbar select-none relative ${
          isSidebarCollapsed ? 'w-[72px] px-2 py-4 space-y-6 items-center' : 'w-[330px] p-5 space-y-4'
        } ${isDark ? 'border-slate-800 bg-[#0c1224]' : 'border-slate-200 bg-white'}`}>

          {/* Toggle Collapse Button in Sidebar */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : 'justify-between pb-2 border-b border-slate-100 dark:border-zinc-800'}`}>
            {!isSidebarCollapsed && (
              <span className="text-[11px] font-black tracking-widest text-slate-450 dark:text-slate-405 uppercase">AI Control Panel</span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-slate-500/5 text-slate-500 hover:text-indigo-500 hover:border-indigo-500/30 transition-all`}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {isSidebarCollapsed ? (
            /* COLLAPSED ICON MODE */
            <div className="flex flex-col gap-5 items-center w-full">
              {/* Workspace */}
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="group relative p-2.5 rounded-xl bg-slate-500/5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 border border-transparent hover:border-indigo-500/20 transition-all"
              >
                <FolderKanban size={20} />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  Workspace
                </span>
              </button>

              {/* Upload */}
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="group relative p-2.5 rounded-xl bg-slate-500/5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 border border-transparent hover:border-indigo-500/20 transition-all"
              >
                <UploadCloud size={20} />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  Upload Contract
                </span>
              </button>

              {/* Quick Actions */}
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="group relative p-2.5 rounded-xl bg-slate-500/5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 border border-transparent hover:border-indigo-500/20 transition-all"
              >
                <Sparkles size={20} />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  Quick Actions
                </span>
              </button>

              {/* AI Insights */}
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="group relative p-2.5 rounded-xl bg-slate-500/5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 border border-transparent hover:border-indigo-500/20 transition-all"
              >
                <BrainCircuit size={20} />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  AI Insights
                </span>
              </button>

              {/* Templates */}
              <button
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  setOpenSections(prev => ({ ...prev, templates: true }));
                }}
                className="group relative p-2.5 rounded-xl bg-slate-500/5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 border border-transparent hover:border-indigo-500/20 transition-all"
              >
                <Files size={20} />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  Templates
                </span>
              </button>

              {/* OCR Editor */}
              <button
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  setOpenSections(prev => ({ ...prev, ocr: true }));
                }}
                className="group relative p-2.5 rounded-xl bg-slate-500/5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 border border-transparent hover:border-indigo-500/20 transition-all"
              >
                <ScanText size={20} />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  OCR Workspace
                </span>
              </button>

              {/* Activity Feed */}
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="group relative p-2.5 rounded-xl bg-slate-500/5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 border border-transparent hover:border-indigo-500/20 transition-all"
              >
                <History size={20} />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  Activity Feed
                </span>
              </button>
            </div>
          ) : (
            /* EXPANDED PANEL MODE */
            <div className="flex-1 flex flex-col space-y-5 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
              {/* 1. WORKSPACE */}
              <div className="space-y-1.5 shrink-0 relative">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550">Workspace</span>
                
                {/* Custom Trigger */}
                <div
                  onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                  className={`w-full border rounded-xl px-2.5 py-1.5 text-[10px] font-black cursor-pointer transition-all flex items-center justify-between ${
                    isDark ? 'bg-[#131c31]/30 border-slate-800 text-white hover:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-indigo-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FolderKanban size={11} className="text-indigo-500 shrink-0" />
                    <span className="truncate">
                      {linkedCaseId 
                        ? (allProjects.find(p => p._id === linkedCaseId)?.name || 'Linked Case Workspace') 
                        : 'Manual Entry (Auto-Create case)'}
                    </span>
                  </div>
                  <ChevronDown size={11} className={`text-slate-400 transition-transform ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Custom Dropdown Panel */}
                {isWorkspaceDropdownOpen && (
                  <div className={`absolute left-0 right-0 mt-1 z-[1000] border rounded-2xl shadow-2xl p-2.5 space-y-2.5 font-semibold text-[9.5px] transition-all max-h-[300px] overflow-y-auto custom-scrollbar ${
                    isDark ? 'bg-[#131c31] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    {/* Create New Case Button */}
                    <button
                      onClick={() => {
                        setIsWorkspaceDropdownOpen(false);
                        setIsCreateCaseModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-indigo-500 hover:bg-indigo-500/10 transition-all font-black text-left uppercase text-[9px] border border-dashed border-indigo-500/30"
                    >
                      <Plus size={12} />
                      <span>＋ Create New Case</span>
                    </button>

                    <div className="border-t border-slate-100 dark:border-zinc-800" />

                    {/* Search Field */}
                    <div className="flex items-center bg-slate-500/5 border border-slate-200 dark:border-zinc-850 px-2 py-1 rounded-xl">
                      <Search size={10} className="text-slate-400 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search cases..."
                        className="w-full bg-transparent border-none text-[9px] font-bold outline-none text-slate-800 dark:text-white"
                        value={workspaceSearchQuery}
                        onChange={e => setWorkspaceSearchQuery(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>

                    {/* Filter Category Chips */}
                    <div className="flex flex-wrap gap-1">
                      {['All', 'Active', 'Draft', 'Closed', 'Archived', 'Favorites'].map(cat => (
                        <button
                          key={cat}
                          onClick={(e) => {
                            e.stopPropagation();
                            setWorkspaceCategory(cat);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase ${
                            workspaceCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Cases List */}
                    <div className="space-y-1 overflow-y-auto max-h-[140px] pr-0.5 custom-scrollbar">
                      {/* Manual Option */}
                      <div
                        onClick={() => {
                          setLinkedCaseId('');
                          resetPlatformState();
                          setIsWorkspaceDropdownOpen(false);
                          toast.success("Switched to manual entry workspace");
                        }}
                        className={`p-1.5 rounded-xl cursor-pointer hover:bg-indigo-500/5 hover:text-indigo-500 transition-all flex items-center gap-1.5 ${
                          !linkedCaseId ? 'text-indigo-500 bg-indigo-500/5 font-black' : ''
                        }`}
                      >
                        <Scale size={11} className="shrink-0" />
                        <span>Manual Entry Workspace</span>
                      </div>

                      {/* Separator */}
                      <div className="text-[7px] uppercase text-slate-400 dark:text-slate-500 tracking-wider py-1 font-black">Existing Cases</div>

                      {(() => {
                        const legalCases = allProjects.filter(p => p.isLegalCase);
                        const filtered = legalCases.filter(c => {
                          const matchesQuery = !workspaceSearchQuery.trim() || 
                            c.name?.toLowerCase().includes(workspaceSearchQuery.toLowerCase()) ||
                            c.clientName?.toLowerCase().includes(workspaceSearchQuery.toLowerCase()) ||
                            c.caseType?.toLowerCase().includes(workspaceSearchQuery.toLowerCase()) ||
                            c._id?.toLowerCase().includes(workspaceSearchQuery.toLowerCase());
                          
                          if (workspaceCategory === 'All') return matchesQuery;
                          if (workspaceCategory === 'Favorites') return matchesQuery && favoriteCases.includes(c._id);
                          const caseStatus = c.caseStatus || c.status || 'Active';
                          return matchesQuery && caseStatus.toLowerCase() === workspaceCategory.toLowerCase();
                        });

                        const favs = filtered.filter(c => favoriteCases.includes(c._id));
                        const others = filtered.filter(c => !favoriteCases.includes(c._id));
                        const sortedCases = [...favs, ...others];

                        if (sortedCases.length === 0) {
                          return <div className="text-center py-3 text-slate-400 text-[8.5px]">No cases found</div>;
                        }

                        return sortedCases.map(c => {
                          const isFav = favoriteCases.includes(c._id);
                          const isCurrent = linkedCaseId === c._id;
                          const cStatus = c.caseStatus || c.status || 'Active';
                          return (
                            <div
                              key={c._id}
                              onClick={() => {
                                setLinkedCaseId(c._id);
                                if (onUpdateCase) onUpdateCase(c);
                                hydrateFromCase(c);
                                setIsWorkspaceDropdownOpen(false);
                                toast.success(`Workspace: ${c.name}`);
                              }}
                              className={`p-1.5 rounded-xl cursor-pointer hover:bg-indigo-500/5 hover:text-indigo-500 transition-all flex flex-col gap-0.5 ${
                                isCurrent ? 'text-indigo-500 bg-indigo-500/5 font-black' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between min-w-0 gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FolderKanban size={10} className="shrink-0 text-indigo-500" />
                                  <span className="font-extrabold truncate max-w-[150px]">{c.name}</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFavoriteCases(prev => 
                                      prev.includes(c._id) ? prev.filter(id => id !== c._id) : [...prev, c._id]
                                    );
                                  }}
                                  className={`p-0.5 rounded ${isFav ? 'text-amber-500' : 'text-slate-350 hover:text-amber-500'}`}
                                >
                                  <Star size={9} fill={isFav ? 'currentColor' : 'none'} />
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-[7px] font-black uppercase text-slate-400 dark:text-slate-500">
                                <span>{c.caseType || 'General Matter'}</span>
                                <span className={`px-1 rounded text-[6px] text-white ${
                                  cStatus.toLowerCase() === 'active' ? 'bg-indigo-500' : 'bg-slate-400'
                                }`}>{cStatus}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
                <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  {linkedCaseId ? "Case Active • Staged Workspace" : "Detached Draft • Manual Scope"}
                </div>
              </div>

              {/* 2. CONTRACT UPLOAD */}
              <div className="space-y-1.5 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550">Upload</span>
                <div 
                  className={`border border-dashed rounded-xl p-3 text-center transition-all relative hover:bg-indigo-500/5 ${
                    isDark ? 'border-slate-850 bg-[#131c31]/10' : 'border-slate-200 bg-slate-50/50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                      e.target.value = '';
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ zIndex: 10 }}
                    disabled={isOcrLoading || isAuditing}
                  />
                  <div className="flex items-center justify-center gap-1.5">
                    <UploadCloud size={14} className="text-indigo-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase">Drop or Browse contract</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1.5 text-[7.5px] font-extrabold text-slate-400">
                    <span className="flex items-center gap-0.5 text-emerald-500"><BadgeCheck size={9} /> OCR READY</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-indigo-500"><Lock size={9} /> ENCRYPTED</span>
                  </div>
                </div>

                {/* Staged file list */}
                {files.length > 0 && (
                  <div className="space-y-1">
                    {files.map(f => (
                      <div
                        key={f.id}
                        className={`flex items-center justify-between p-2 rounded-xl border text-[9px] font-black transition-all ${
                          f.id === activeFileId 
                            ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-500' 
                            : 'border-slate-200/50 dark:border-zinc-800 text-slate-600 dark:text-slate-400 bg-white/5 dark:bg-zinc-900/30'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setActiveFileId(f.id);
                            setContractTitle(f.name);
                            setContractText(f.ocrText);
                            performContractAuditInternal(f.name, f.ocrText, files, versions, auditLogs);
                          }}
                          className="flex items-center gap-1.5 truncate text-left flex-1"
                        >
                          <FileCheck size={12} className="shrink-0 text-indigo-500" />
                          <span className="truncate max-w-[170px]">{f.name}</span>
                        </button>
                        <button
                          onClick={() => {
                            setFiles(prev => prev.filter(item => item.id !== f.id));
                            if (activeFileId === f.id) {
                              setActiveFileId(null);
                              setContractText('');
                            }
                            toast.success("Contract removed");
                          }}
                          className="p-1 hover:text-red-500 rounded shrink-0"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. QUICK ACTIONS */}
              <div className="space-y-1.5 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550">Quick Actions</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'summary', name: 'Analyze', icon: Sparkles, runAudit: true },
                    { id: 'heatmap', name: 'Risk Scan', icon: AlertTriangle },
                    { id: 'clauses', name: 'Clauses', icon: NotebookPen },
                    { id: 'compliance', name: 'Compliance', icon: ShieldCheck },
                    { id: 'negotiation', name: 'Negotiate', icon: GitCompareArrows },
                    { id: 'redraft', name: 'Redraft', icon: FilePenLine },
                  ].map(act => {
                    const IconComp = act.icon;
                    const isActive = activeTab === act.id;
                    return (
                      <button
                        key={act.id}
                        disabled={isAuditing}
                        onClick={async () => {
                          if (!contractText.trim()) {
                            toast.error(
                              <span>
                                <strong>Unable to run {act.name}.</strong><br/>
                                Reason: OCR text missing.<br/>
                                Upload or load a template first.
                              </span>
                            );
                            return;
                          }
                          
                          setActiveTab(act.id);
                          handleQuickActionClick(act.id);
                          
                          if (!auditResult && !isAuditing) {
                            let customLoadingMsg = "AI Platform auditing contract parameters...";
                            if (act.id === 'heatmap') customLoadingMsg = "AI Platform scanning risk vectors & heatmap matrix...";
                            if (act.id === 'clauses') customLoadingMsg = "AI Platform detecting active clauses & replacement standards...";
                            if (act.id === 'compliance') customLoadingMsg = "AI Platform checking compliance against Indian Contract Act & related statutes...";
                            if (act.id === 'negotiation') customLoadingMsg = "AI Platform building negotiation suggestions & fallback language...";
                            if (act.id === 'redraft') customLoadingMsg = "AI Platform generating side-by-side redrafted contract drafts...";
                            
                            await performContractAuditInternal(contractTitle, contractText, files, versions, auditLogs, customLoadingMsg);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-wider transition-all h-[32px] ${
                          isActive
                            ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500 shadow-[0_2px_8px_rgba(99,102,241,0.15)]'
                            : 'border-slate-200/60 dark:border-zinc-800/80 bg-white/5 text-slate-600 dark:text-slate-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-indigo-500'
                        }`}
                      >
                        <IconComp size={11} className={`${isActive ? 'text-indigo-500' : 'text-slate-400'} ${act.id === 'summary' && isAuditing ? 'animate-spin' : ''}`} />
                        <span>{act.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. AI INSIGHTS */}
              <div className="space-y-1.5 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550">AI Insights</span>
                <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold text-slate-500">
                  {[
                    { label: 'Type', value: auditResult?.summary?.contractType || '--' },
                    { label: 'Jurisdiction', value: auditResult?.summary?.jurisdiction || '--' },
                    { label: 'Effective', value: auditResult?.summary?.effectiveDate || '--' },
                    { label: 'Expiry', value: auditResult?.summary?.expiryDate || '--' },
                    {label: 'Confidence', value: auditResult?.stats?.confidenceRate ? `${auditResult?.stats?.confidenceRate}%` : '--' },
                    { label: 'Saved Time', value: stats.timeSaved || '--' }
                  ].map((insight, idx) => (
                    <div key={idx} className="flex flex-col p-1.5 bg-slate-500/5 border border-slate-200/30 dark:border-zinc-800/60 rounded-lg">
                      <span className="text-[7.5px] uppercase text-slate-400 dark:text-slate-500 font-black tracking-wider">{insight.label}</span>
                      {isWorkspaceLoading ? (
                        <div className="animate-pulse bg-slate-200/50 dark:bg-zinc-800/80 rounded h-3 w-10 mt-0.5" />
                      ) : (
                        <span className="text-slate-755 dark:text-slate-305 font-extrabold truncate mt-0.5">{insight.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. TEMPLATE LIBRARY (collapsible accordion) */}
              <div className="border border-slate-100 dark:border-zinc-805 bg-slate-500/5 rounded-xl overflow-hidden shrink-0">
                <button
                  onClick={() => setOpenSections(prev => ({ ...prev, templates: !prev.templates }))}
                  className="w-full px-3 py-2 flex items-center justify-between text-slate-805 dark:text-slate-200 hover:bg-slate-500/10 transition-colors font-black text-[9px] uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    <Files size={12} className="text-indigo-500" />
                    <span className="text-slate-400 dark:text-slate-500">Templates</span>
                  </div>
                  {openSections.templates ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {openSections.templates && (
                  <div className="p-3 pt-0 space-y-2 border-t border-slate-150 dark:border-zinc-800 bg-white/20 dark:bg-black/10">
                    <div className="flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-1 rounded-lg mt-2 font-bold">
                      <Search size={10} className="text-slate-400 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search templates..."
                        className="w-full bg-transparent border-none text-[9px] font-bold outline-none text-slate-800 dark:text-white"
                        value={toolsSearchQuery}
                        onChange={e => setToolsSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {['All', 'Favorites', 'NDA', 'Employment', 'Lease', 'Vendor', 'Tech', 'MSA'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setToolsCategory(cat)}
                          className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase ${
                            toolsCategory === cat ? 'bg-indigo-650 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {filteredTools.map(t => {
                        const isFav = favoriteTools.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            className="group flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg transition-all hover:border-indigo-500/40"
                          >
                            <button
                              onClick={() => handleQuickToolSelect(t.id)}
                              className="text-left flex-1 min-w-0"
                            >
                              <h4 className="text-[9px] font-black text-slate-800 dark:text-white group-hover:text-indigo-500 truncate">{t.name}</h4>
                              <p className="text-[7.5px] text-slate-400 mt-0.5 truncate">{t.desc}</p>
                            </button>
                            <div className="flex gap-1 pl-1 shrink-0">
                              <button
                                onClick={() => {
                                  setFavoriteTools(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]);
                                }}
                                className={`p-0.5 rounded ${isFav ? 'text-amber-500' : 'text-slate-350 hover:text-amber-500'}`}
                              >
                                <Star size={10} fill={isFav ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. OCR EDITOR (collapsible accordion) */}
              <div className="border border-slate-100 dark:border-zinc-805 bg-slate-500/5 rounded-xl overflow-hidden shrink-0 font-bold">
                <button
                  onClick={() => setOpenSections(prev => ({ ...prev, ocr: !prev.ocr }))}
                  className="w-full px-3 py-2 flex items-center justify-between text-slate-805 dark:text-slate-200 hover:bg-slate-500/10 transition-colors font-black text-[9px] uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    <ScanText size={12} className="text-indigo-500" />
                    <span className="text-slate-400 dark:text-slate-500">OCR Workspace</span>
                  </div>
                  {openSections.ocr ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {openSections.ocr && (
                  <div className="p-3 pt-0 space-y-2 border-t border-slate-150 dark:border-zinc-800 bg-white/20 dark:bg-black/10">
                    <div className="flex items-center justify-between mt-2 text-[8px] font-black text-slate-400">
                      <span>CONFIDENCE: 98.4%</span>
                      <button 
                        onClick={() => setIsEditingOcr(!isEditingOcr)}
                        className="text-indigo-500 hover:underline uppercase"
                      >
                        {isEditingOcr ? 'Discard' : 'Edit'}
                      </button>
                    </div>

                    <div className="flex items-center bg-white dark:bg-zinc-900 rounded-lg px-2 py-1 border border-slate-200 dark:border-zinc-800">
                      <Search size={10} className="text-slate-400 mr-1.5 shrink-0" />
                      <input 
                        type="text" 
                        placeholder="Search text..."
                        className="w-full bg-transparent border-none text-[9px] font-bold outline-none text-slate-800 dark:text-white"
                        value={ocrSearchQuery}
                        onChange={e => setOcrSearchQuery(e.target.value)}
                      />
                    </div>

                    {isEditingOcr ? (
                      <div className="space-y-1.5">
                        <textarea
                          className={`w-full h-24 p-2 rounded-lg text-[9px] font-medium outline-none resize-none border ${
                            isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                          }`}
                          value={contractText}
                          onChange={e => setContractText(e.target.value)}
                        />
                        <button
                          onClick={async () => {
                            setIsEditingOcr(false);
                            if (activeFileId) {
                              setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, ocrText: contractText } : f));
                            }
                            await createDocumentVersion(contractText, 'Manual OCR text adjustment');
                            toast.success("Text updated!");
                            performContractAuditInternal(contractTitle, contractText, files, versions, auditLogs);
                          }}
                          className="w-full py-1 bg-indigo-655 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className={`h-24 overflow-y-auto p-2 rounded-lg border text-[9px] leading-relaxed font-mono whitespace-pre-wrap select-text custom-scrollbar ${
                        isDark ? 'bg-black/20 border-zinc-805 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
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
                          contractText || "No text loaded."
                        )}
                      </div>
                    )}

                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(contractText);
                          toast.success("Text copied!");
                        }}
                        disabled={!contractText}
                        className="w-full py-1 border border-slate-200 dark:border-zinc-800 rounded-lg text-[8px] font-black uppercase tracking-wider text-slate-500 hover:text-indigo-500 transition-colors disabled:opacity-50"
                      >
                        Copy Workspace Text
                      </button>
                    </div>

                    {/* Extracted Entities List */}
                    {contractText && (
                      <div className="p-2 rounded-lg bg-slate-500/5 border border-slate-250/20 space-y-1.5 text-[8.5px] font-bold text-slate-450 dark:text-slate-400">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">Extracted Entities (Regex)</span>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Detected Currency:</span>
                            <span className="text-slate-800 dark:text-white font-extrabold">
                              {contractText.match(/(₹|Rs\.?|\$|INR|USD)\s?\d+/gi)?.[0] || 'None'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Detected Parties:</span>
                            <span className="text-slate-855 dark:text-white font-extrabold truncate max-w-[120px]">
                              {contractText.match(/(Agreement between|Vendor|Client|Company|[\w\s]{2,20}Limited)/i)?.[0] || 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 7. AI ACTIVITY FEED */}
              <div className="space-y-1.5 pt-1 shrink-0 font-bold">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Activity Log</span>
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar text-[8.5px] font-bold text-slate-400">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-1.5 border-l border-indigo-500/30 pl-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0 animate-pulse" />
                        <div className="flex-1 space-y-0.5">
                          <p className="text-slate-700 dark:text-slate-350">{log.action}</p>
                          <span className="text-[7px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 text-slate-450">No activities logged.</div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Main Platform Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar px-6 py-6 space-y-6">
          <div className="max-w-6xl w-full mx-auto space-y-6">

            {/* 1. CASE HEADER */}
            {linkedCaseId && (() => {
              const activeProj = allProjects.find(p => p._id === linkedCaseId) || currentCase;
              if (!activeProj) return null;
              const cStatus = activeProj.caseStatus || activeProj.status || 'Active';
              const cType = activeProj.caseType || 'General Matter';
              const client = activeProj.clientName || 'N/A';
              const opponent = activeProj.accused || 'N/A';
              const upcomingHearing = activeProj.hearings?.length > 0 
                ? new Date(activeProj.hearings[0].date).toLocaleDateString()
                : 'No upcoming hearing';
              const pendingTasks = activeProj.tasks?.filter(t => !t.completed).length || 0;
              
              return (
                <div className={`border rounded-2xl p-4 shadow-sm space-y-3 ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase text-white bg-indigo-500">{cStatus}</span>
                        <span className="text-[10px] font-bold text-slate-400">Case No: {activeProj._id || 'N/A'}</span>
                      </div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5 mt-1">
                        <FolderKanban size={14} className="text-indigo-500" />
                        {activeProj.name}
                      </h2>
                    </div>
                    <div className="text-[9.5px] font-bold text-slate-400">
                      Opponent: <span className="font-black text-slate-700 dark:text-slate-200">{opponent}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] pt-1">
                    <div className="p-2.5 bg-slate-500/5 rounded-xl border border-slate-200/40 dark:border-zinc-800/40 space-y-0.5">
                      <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Client Name</span>
                      <p className="text-slate-800 dark:text-slate-250 font-extrabold">{client}</p>
                    </div>
                    <div className="p-2.5 bg-slate-500/5 rounded-xl border border-slate-200/40 dark:border-zinc-800/40 space-y-0.5">
                      <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Matter Type</span>
                      <p className="text-slate-800 dark:text-slate-250 font-extrabold">{cType}</p>
                    </div>
                    <div className="p-2.5 bg-slate-500/5 rounded-xl border border-slate-200/40 dark:border-zinc-800/40 space-y-0.5">
                      <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Contracts Linked</span>
                      <p className="text-indigo-500 font-black">{files.length} Staged</p>
                    </div>
                    <div className="p-2.5 bg-slate-500/5 rounded-xl border border-slate-200/40 dark:border-zinc-800/40 space-y-0.5">
                      <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Overall Legal Risk</span>
                      <p className={`font-black ${
                        stats.riskScore > 60 ? 'text-red-500' : (stats.riskScore > 30 ? 'text-amber-500' : 'text-emerald-500')
                      }`}>{stats.riskScore !== '--' ? `${stats.riskScore}%` : 'Not Analyzed'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[9px] font-semibold text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} className="text-indigo-500" />
                      <span>Hearing Date: <strong className="text-slate-700 dark:text-slate-300">{upcomingHearing}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckSquare size={11} className="text-indigo-500" />
                      <span>Tasks Pending: <strong className="text-slate-700 dark:text-slate-300">{pendingTasks} case tasks</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} className="text-indigo-500" />
                      <span>Last Audit: <strong className="text-slate-700 dark:text-slate-300">
                        {auditLogs.length > 0 ? new Date(auditLogs[0].timestamp).toLocaleString() : 'No audits yet'}
                      </strong></span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. CONTRACT WORKSPACE */}
            {linkedCaseId && files.length > 0 && (() => {
              const activeFile = files.find(f => f.id === activeFileId) || files[0];
              const fileVer = versions.filter(v => v.note?.includes(activeFile.name)).length || 1;
              return (
                <div className={`border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[7.5px] uppercase font-black tracking-widest text-indigo-500">Active Workspace Document</span>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{activeFile.name}</h4>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                        Version: <span className="text-indigo-500">v{fileVer}</span> • Uploaded: {activeFile.uploadDate || 'N/A'} • Status: <span className="text-emerald-500">Ready for Analysis</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      onClick={() => handleDownloadFile(activeFile)}
                      className="px-2.5 py-1.5 bg-slate-500/5 hover:bg-slate-500/15 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-slate-200/40 dark:border-zinc-800"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => {
                        const input = document.getElementById('contract-upload-input');
                        if (input) input.click();
                      }}
                      className="px-2.5 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-indigo-500/20"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => handleDeleteFile(activeFile.id)}
                      className="px-2.5 py-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })()}

            {linkedCaseId && files.length === 0 && (
              <div className={`border rounded-2xl p-6 shadow-sm text-center space-y-3 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <UploadCloud className="mx-auto text-indigo-500 animate-bounce" size={32} />
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase">No Contracts Linked</h4>
                <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Staging workspace is currently vacant. Drop or upload a contract in the left control panel to begin analysis.
                </p>
              </div>
            )}

            {/* 3. AI ANALYSIS CARD */}
            {linkedCaseId && files.length > 0 && !isAuditing && (
              <div className={`border rounded-2xl p-5 shadow-sm space-y-3.5 relative overflow-hidden ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase tracking-widest text-indigo-500 font-black">AI Audit Readiness Status</span>
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white">Ready for AI Review</h3>
                    <p className="text-[9.5px] text-slate-400 font-bold">
                      Document size: <span className="text-slate-600 dark:text-slate-300">{(contractText.length / 1024).toFixed(1)} KB</span> • 
                      OCR Status: <span className="text-emerald-500">Successful</span> • 
                      Estimated Audit Time: <span className="text-indigo-500">12 Seconds</span>
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Cpu size={16} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={runContractAudit}
                    className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-755 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20"
                  >
                    {auditResult ? 'Analyze Again' : 'Start AI Audit'}
                  </button>
                  {auditResult && (
                    <button
                      onClick={() => handleQuickActionClick('summary')}
                      className="px-5 py-2.5 bg-slate-500/5 hover:bg-slate-500/15 text-slate-700 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border border-slate-200/40 dark:border-zinc-800"
                    >
                      View Latest Analysis
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CONTRACT CATALOG */}
            {linkedCaseId && (
              <div className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <FileStack size={14} className="text-indigo-500" /> Case Contract Catalog
                </h3>
                {files.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-[10px]">No contracts linked to this case. Drag or upload a contract in the left control panel to begin.</div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-[9.5px] min-w-[900px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-zinc-800 text-[8px] uppercase tracking-widest text-slate-400">
                          <th className="py-2.5 px-3">Contract Name</th>
                          <th className="py-2.5 px-3">Version</th>
                          <th className="py-2.5 px-3">Pages</th>
                          <th className="py-2.5 px-3">File Size</th>
                          <th className="py-2.5 px-3">Uploaded By</th>
                          <th className="py-2.5 px-3">Upload Time</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Analysis Status</th>
                          <th className="py-2.5 px-3">Risk Level</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {files.map((f, i) => {
                          const fileVer = versions.filter(v => v.note?.includes(f.name)).length || 1;
                          const fileLogs = auditLogs.filter(l => l.details?.includes(f.name));
                          const fileUploader = fileLogs.length > 0 
                            ? fileLogs[fileLogs.length - 1].editedBy.split(' (')[0]
                            : 'System Advocate';
                          
                          const isActive = activeFileId === f.id;
                          const fileSize = f.size ? `${(f.size / 1024).toFixed(1)} KB` : '14.5 KB';
                          const pageCount = f.pages || 1;

                          return (
                            <tr key={f.id} className={`hover:bg-slate-500/5 transition-colors ${isActive ? 'bg-indigo-50/5 font-black' : ''}`}>
                              <td className="py-2.5 px-3 flex items-center gap-2">
                                <FileText size={12} className="text-indigo-500 shrink-0" />
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{f.name}</span>
                              </td>
                              <td className="py-2.5 px-3">v{fileVer}</td>
                              <td className="py-2.5 px-3">{pageCount}</td>
                              <td className="py-2.5 px-3">{fileSize}</td>
                              <td className="py-2.5 px-3 text-slate-450">{fileUploader}</td>
                              <td className="py-2.5 px-3 text-slate-450">{f.uploadDate}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Ready</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase ${
                                  auditResult ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-100 dark:bg-zinc-800 text-slate-450'
                                }`}>{auditResult ? 'Complete' : 'Pending'}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase text-white ${
                                  stats.riskScore > 60 ? 'bg-red-500' : (stats.riskScore > 30 ? 'bg-amber-500' : 'bg-emerald-500')
                                }`}>{stats.riskScore !== '--' ? `${stats.riskScore}% Risk` : 'Pending'}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setActiveFileId(f.id);
                                      setContractTitle(f.name);
                                      setContractText(f.ocrText);
                                      toast.success(`Loaded: ${f.name}`);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-slate-500/5 hover:bg-slate-500/15 text-[8px] font-black uppercase text-slate-600 dark:text-slate-300"
                                    title="View"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFileId(f.id);
                                      setContractTitle(f.name);
                                      setContractText(f.ocrText);
                                      runContractAudit();
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-[8px] font-black uppercase text-indigo-500"
                                    title="Analyze"
                                  >
                                    Analyze
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveFileId(f.id);
                                      const input = document.getElementById('contract-upload-input');
                                      if (input) input.click();
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-[8px] font-black uppercase text-amber-500"
                                    title="Replace"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    onClick={() => handleDownloadFile(f)}
                                    className="px-1.5 py-0.5 rounded bg-slate-500/5 hover:bg-slate-500/15 text-[8px] font-black uppercase text-slate-600 dark:text-slate-300"
                                    title="Download"
                                  >
                                    Download
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFile(f.id)}
                                    className="px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-[8px] font-black uppercase text-red-500"
                                    title="Delete"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 4. LIVE ANALYSIS PROGRESS */}
            {isAuditing && (
              <div className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-indigo-500">
                  <span>AI Legal Audit In Progress</span>
                  <span className="animate-pulse">{auditStep || 'Staging analysis parameters...'}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-650 h-full rounded-full animate-pulse" style={{ width: '65%' }} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[8px] uppercase tracking-wider text-slate-400 font-extrabold text-center">
                  <div className="text-emerald-500">✓ OCR Completed</div>
                  <div className={auditStep.includes('Clauses') ? 'text-indigo-500 animate-pulse' : ''}>Clause Extraction</div>
                  <div className={auditStep.includes('compliance') ? 'text-indigo-500 animate-pulse' : ''}>Compliance Checks</div>
                  <div className={auditStep.includes('risk') ? 'text-indigo-500 animate-pulse' : ''}>Risk Calculations</div>
                  <div className={auditStep.includes('summary') ? 'text-indigo-500 animate-pulse' : ''}>Executive Opinion</div>
                  <div>Redrafts Build</div>
                </div>
              </div>
            )}

            {/* 5. KPI DASHBOARD */}
            {linkedCaseId && renderKPICards()}

            {/* Sticky Actions Row */}
            {auditResult && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-500/5 border border-slate-200/40 dark:border-zinc-800 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Analysis Controls</span>
                <div className="flex items-center gap-1.5 flex-wrap">
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
                    title="Download Report"
                  >
                    <FileDown size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* 6. EXECUTIVE SUMMARY */}
            {auditResult && (
              <div id="section-summary" className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => toggleBlock('summary')}
                  className="w-full flex items-center justify-between text-left font-black text-xs uppercase tracking-wider text-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <Award size={14} />
                    <span>Executive Summary & Opinion</span>
                  </div>
                  {collapsedBlocks.summary ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {!collapsedBlocks.summary && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                      <span className="text-[8px] uppercase tracking-widest text-indigo-500 font-black">Recommendation Verdict</span>
                      <h4 className="text-xs font-black text-slate-850 dark:text-slate-200">{auditResult.finalOpinion?.status || auditResult.stats?.reviewStatus}</h4>
                      <p className="text-[10.5px] leading-relaxed text-slate-500 mt-1 font-medium">{auditResult.finalOpinion?.reasoning}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10.5px] text-slate-600 dark:text-slate-400 font-medium">
                      <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 space-y-1.5">
                        <span className="text-[8px] uppercase tracking-wider text-red-500 font-black">Critical Legal Risks</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {auditResult.executiveSummary?.majorLegalRisks?.map((r, idx) => <li key={idx}>{r}</li>) || <li>None identified.</li>}
                        </ul>
                      </div>
                      <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-1.5">
                        <span className="text-[8px] uppercase tracking-wider text-amber-500 font-black">Financial Gaps</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {auditResult.executiveSummary?.financialRisks?.map((r, idx) => <li key={idx}>{r}</li>) || <li>None identified.</li>}
                        </ul>
                      </div>
                      <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-1.5">
                        <span className="text-[8px] uppercase tracking-wider text-indigo-500 font-black">Recommended Actions</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {auditResult.executiveSummary?.urgentActionItems?.map((r, idx) => <li key={idx}>{r}</li>) || <li>None identified.</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. CLAUSE DETECTION */}
            {auditResult && (
              <div id="section-clauses" className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => toggleBlock('clauses')}
                  className="w-full flex items-center justify-between text-left font-black text-xs uppercase tracking-wider text-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <NotebookPen size={14} />
                    <span>Clause Analysis ({auditResult.clauses?.length || 0} Clauses Detected)</span>
                  </div>
                  {collapsedBlocks.clauses ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {!collapsedBlocks.clauses && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                    {auditResult.clauses?.map((c, idx) => (
                      <div key={c.id || idx} className="p-4 rounded-xl bg-slate-500/5 border border-slate-200/50 dark:border-zinc-800/80 space-y-2 text-[10.5px]">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">{c.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${
                            c.risk === 'High' || c.risk === 'Critical' ? 'bg-red-500' : (c.risk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500')
                          }`}>{c.risk} Risk</span>
                        </div>
                        <p className="bg-white/50 dark:bg-black/10 p-2.5 rounded-lg font-mono text-[9.5px] border border-slate-200/20">{c.text}</p>
                        <p className="text-slate-500 leading-relaxed font-semibold">{c.explanation}</p>
                        {c.suggestion && (
                          <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-indigo-500 font-extrabold text-[9.5px]">
                            <strong>Suggested Revision:</strong> {c.suggestion}
                          </div>
                        )}
                      </div>
                    ))}
                    {auditResult.missingClauses?.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Critical Missing Clauses (Gaps)</span>
                        {auditResult.missingClauses.map((m, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-red-500/5 border border-red-500/15 space-y-1.5 text-[10.5px]">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-red-500 uppercase tracking-wider text-[11px]">{m.clause || m.name}</h4>
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase text-white bg-red-500">{m.category || 'Critical Missing'}</span>
                            </div>
                            <p className="text-slate-500 font-semibold">{m.explanation}</p>
                            <p className="text-red-500 font-black text-[9.5px]">Risk Implication: {m.riskCreated || m.implication}</p>
                            {m.suggestedWording && (
                              <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[9.5px]">
                                <strong>Recommended Clause wording:</strong> {m.suggestedWording}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 8. RISK ANALYSIS */}
            {auditResult && (
              <div id="section-heatmap" className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => toggleBlock('heatmap')}
                  className="w-full flex items-center justify-between text-left font-black text-xs uppercase tracking-wider text-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>Risk Severity Matrix & Assessment</span>
                  </div>
                  {collapsedBlocks.heatmap ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {!collapsedBlocks.heatmap && (
                  <div className="space-y-6 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Interactive Risk Grid Matrix</span>
                        <div className="grid grid-cols-5 gap-1.5 bg-slate-500/5 p-4 rounded-2xl border border-slate-200/40 dark:border-zinc-800">
                          {['Critical', 'High', 'Medium', 'Low'].map((likelihood) => (
                            <React.Fragment key={likelihood}>
                              <div className="text-[9px] font-black text-slate-400 uppercase flex items-center justify-end pr-2 h-10 leading-none">
                                {likelihood}
                              </div>
                              {['Low', 'Medium', 'High', 'Critical'].map((severity) => {
                                const matching = auditResult.clauses?.filter(c => c.risk === likelihood && (c.legalImpact || 'Medium') === severity) || [];
                                const hasMatches = matching.length > 0;
                                return (
                                  <div
                                    key={severity}
                                    className={`h-10 rounded-xl flex items-center justify-center font-black text-xs border transition-all cursor-pointer ${
                                      hasMatches
                                        ? likelihood === 'Critical' || likelihood === 'High'
                                          ? 'bg-red-500/20 border-red-500 text-red-500 shadow-sm shadow-red-500/10'
                                          : 'bg-amber-500/20 border-amber-500 text-amber-500'
                                        : 'bg-slate-500/5 border-transparent text-slate-400'
                                    }`}
                                  >
                                    {matching.length || ''}
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          ))}
                          <div />
                          {['Low', 'Medium', 'High', 'Critical'].map(label => (
                            <div key={label} className="text-[9px] font-black text-slate-400 uppercase text-center mt-2 leading-none">{label}</div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Risk Assessment Assessment</span>
                        <div className="space-y-3 text-[10.5px]">
                          <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                            <h4 className="font-black text-red-500 uppercase tracking-wider text-[11px]">Financial Risks</h4>
                            <p className="text-slate-500 mt-1 font-semibold">{auditResult.financials?.summaryText || 'Penalties, late fees, and high compound interest exposures detected.'}</p>
                          </div>
                          <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                            <h4 className="font-black text-amber-500 uppercase tracking-wider text-[11px]">Operational Risks</h4>
                            <p className="text-slate-500 mt-1 font-semibold">{auditResult.executiveSummary?.commercialRisks?.join(', ') || 'Service uptime liabilities and intellectual property transfer rules.'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 9. COMPLIANCE REPORT */}
            {auditResult && (
              <div id="section-compliance" className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => toggleBlock('compliance')}
                  className="w-full flex items-center justify-between text-left font-black text-xs uppercase tracking-wider text-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} />
                    <span>Compliance & Statutes Checklist</span>
                  </div>
                  {collapsedBlocks.compliance ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {!collapsedBlocks.compliance && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10.5px]">
                    {auditResult.compliance?.map((c, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-4 p-3 bg-slate-500/5 border border-slate-200/45 rounded-xl">
                        <div className="space-y-1">
                          <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">{c.law}</h4>
                          <p className="text-slate-500 leading-relaxed font-semibold">{c.explanation}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white shrink-0 ${
                          c.status === 'Compliant' ? 'bg-emerald-500' : (c.status === 'Warning' ? 'bg-amber-500' : 'bg-red-500')
                        }`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 10. NEGOTIATION CENTER */}
            {auditResult && (
              <div id="section-negotiation" className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => toggleBlock('negotiation')}
                  className="w-full flex items-center justify-between text-left font-black text-xs uppercase tracking-wider text-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <GitCompareArrows size={14} />
                    <span>Negotiation Strategy Center</span>
                  </div>
                  {collapsedBlocks.negotiation ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {!collapsedBlocks.negotiation && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10.5px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-1.5">
                        <span className="text-[8px] uppercase tracking-wider text-indigo-500 font-black">Buyer-Friendly Safeguards</span>
                        <ul className="list-disc pl-4 space-y-1 font-medium text-slate-600 dark:text-slate-400">
                          {auditResult.negotiationCenter?.buyerFriendly?.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                      <div className="p-3 bg-slate-500/5 rounded-xl border border-slate-200/40 dark:border-zinc-800 space-y-1.5">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-black">Seller-Friendly Wording</span>
                        <ul className="list-disc pl-4 space-y-1 font-medium text-slate-600 dark:text-slate-400">
                          {auditResult.negotiationCenter?.sellerFriendly?.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-500/5 border rounded-xl space-y-2">
                      <span className="text-[8px] uppercase tracking-widest text-indigo-500 font-black">Negotiation Terminology suggestions</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-500 font-semibold">
                        {auditResult.negotiationCenter?.negotiationSuggestions?.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 11. REDRAFT VERSION */}
            {auditResult && (
              <div id="section-redraft" className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => toggleBlock('redraft')}
                  className="w-full flex items-center justify-between text-left font-black text-xs uppercase tracking-wider text-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <FilePenLine size={14} />
                    <span>Redraft Wording comparison</span>
                  </div>
                  {collapsedBlocks.redraft ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {!collapsedBlocks.redraft && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10.5px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wording alternatives</span>
                      <button
                        onClick={handleExportDoc}
                        className="px-2.5 py-1.5 bg-indigo-655 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow shadow-indigo-500/20"
                      >
                        <FileDown size={11} />
                        Download Word Report
                      </button>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                      {auditResult.clauses?.map((c, i) => {
                        if (!c.redraftSuggestions) return null;
                        return (
                          <div key={i} className="p-4 rounded-xl border border-slate-200/50 dark:border-zinc-800 space-y-3">
                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">{c.name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1 bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                                <span className="text-[8px] font-black text-red-500 uppercase tracking-wider">Original Text</span>
                                <p className="font-mono text-[9px] leading-relaxed text-slate-600 dark:text-slate-400">{c.text}</p>
                              </div>
                              <div className="space-y-1 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Advocate Draft version</span>
                                <p className="font-mono text-[9px] leading-relaxed text-slate-600 dark:text-slate-400">{c.redraftSuggestions.lawyerVersion}</p>
                              </div>
                            </div>
                            <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-indigo-500 font-extrabold text-[9.5px]">
                              <strong>Layman translation:</strong> {c.redraftSuggestions.plainEnglish}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 12. CASE LAW MAPPING */}
            {auditResult && (
              <div id="section-caseLaws" className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => toggleBlock('caseLaws')}
                  className="w-full flex items-center justify-between text-left font-black text-xs uppercase tracking-wider text-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} />
                    <span>Case Law Citation Mapping</span>
                  </div>
                  {collapsedBlocks.caseLaws ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {!collapsedBlocks.caseLaws && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10.5px]">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Supreme Court and Landmark Citations</span>
                    <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      {auditResult.clauses?.flatMap(c => c.caseLawMapping || []).map((c, i) => (
                        <div key={i} className="p-3.5 bg-slate-500/5 border border-slate-200/40 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider">{c.judgmentName}</h4>
                            <span className="text-indigo-500 font-black">{c.citation}</span>
                          </div>
                          <p className="text-slate-500 font-semibold"><strong className="text-slate-600 dark:text-slate-400">Ratio:</strong> {c.ratio}</p>
                          <p className="text-indigo-500 font-extrabold text-[9.5px]"><strong className="text-indigo-600">Workspace Implication:</strong> {c.implication}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONTRACT CHAT COLLAPSIBLE CARD */}
            {auditResult && (
              <div id="section-chat" className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => toggleBlock('chat')}
                  className="w-full flex items-center justify-between text-left font-black text-xs uppercase tracking-wider text-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <Send size={14} />
                    <span>AI Contract Chat Assistant</span>
                  </div>
                  {collapsedBlocks.chat ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {!collapsedBlocks.chat && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <div className="flex flex-col h-[280px] min-h-0">
                      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar mb-3">
                        {chatHistory.length === 0 && (
                          <div className="text-center py-6">
                            <Brain size={24} className="mx-auto text-slate-350 dark:text-zinc-700 animate-pulse" />
                            <p className="text-[10px] font-black text-slate-455 mt-2 uppercase tracking-wider">AISA Assistant Ready</p>
                            <p className="text-[9px] text-slate-400 font-semibold">Ask questions about indemnities, terminations, governing rules, or missing terms in this contract.</p>
                          </div>
                        )}
                        {chatHistory.map(msg => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs font-semibold leading-relaxed break-words ${msg.role === 'user' ? 'bg-slate-100 dark:bg-[#1e293b] text-slate-900 dark:text-slate-100' : 'bg-slate-100 dark:bg-black/25 text-slate-700 dark:text-slate-200 border border-slate-200/30'}`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {isChatSending && (
                          <div className="flex justify-start">
                            <div className="bg-slate-100 dark:bg-black/25 text-indigo-500 rounded-2xl px-3 py-1.5 text-[9px] font-black uppercase tracking-wider animate-pulse border border-slate-200/30">
                              Assistant typing...
                            </div>
                          </div>
                        )}
                        <div ref={chatBottomRef} />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <input
                          type="text"
                          placeholder="Ask a question about this contract..."
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendContractChatMessage()}
                          className={`flex-1 border rounded-xl px-3 py-2 text-[10px] font-bold outline-none ${isDark ? 'bg-black/25 border-zinc-805 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'}`}
                        />
                        <button
                          onClick={sendContractChatMessage}
                          disabled={isChatSending || !chatInput.trim()}
                          className="px-3 bg-indigo-650 hover:bg-indigo-755 text-white rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 13. Case Activity Log Timeline */}
            {linkedCaseId && (
              <div id="section-activityLog" className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => toggleBlock('activityLog')}
                  className="w-full flex items-center justify-between text-left font-black text-xs uppercase tracking-wider text-indigo-500"
                >
                  <div className="flex items-center gap-2">
                    <History size={14} />
                    <span>Case Activity Log Timeline</span>
                  </div>
                  {collapsedBlocks.activityLog ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {!collapsedBlocks.activityLog && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10.5px] max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {auditLogs.length === 0 ? (
                      <p className="text-slate-400 font-semibold py-3 text-center">No activities logged for this case context.</p>
                    ) : (
                      <div className="relative border-l border-slate-250 dark:border-zinc-800 ml-3.5 space-y-4 py-2">
                        {auditLogs.map((log, idx) => (
                          <div key={idx} className="relative pl-6">
                            <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-650 border border-white dark:border-zinc-900" />
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 dark:text-white uppercase text-[10px]">{log.action}</span>
                              <span className="text-[9px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-500 mt-0.5 leading-relaxed font-semibold">{log.details}</p>
                            <span className="text-[8px] text-indigo-500 font-black mt-1 block">Triggered by: {log.editedBy}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!linkedCaseId && (
              <div className="text-center py-20 space-y-3">
                <Folder size={48} className="mx-auto text-slate-350 dark:text-zinc-700 animate-pulse" />
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Select Case Matter</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-semibold leading-relaxed">
                  Select an existing case matter or create a new case from the left sidebar to activate the AI LEGAL™ workspace environment.
                </p>
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

      {/* Create New Case Modal */}
      {isCreateCaseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-md border rounded-2xl shadow-2xl p-5 space-y-4 font-semibold text-[10px] ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                <FolderKanban size={14} /> Create Case Matter Profile
              </h3>
              <button onClick={() => setIsCreateCaseModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">Case Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma vs Amit Verma"
                  className={`w-full px-3 py-2 border rounded-xl outline-none text-[10px] font-bold ${
                    isDark ? 'bg-black/20 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  value={newCaseName}
                  onChange={e => setNewCaseName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">Client Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    className={`w-full px-3 py-2 border rounded-xl outline-none text-[10px] font-bold ${
                      isDark ? 'bg-black/20 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    value={newCaseClient}
                    onChange={e => setNewCaseClient(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">Opponent Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Amit Verma"
                    className={`w-full px-3 py-2 border rounded-xl outline-none text-[10px] font-bold ${
                      isDark ? 'bg-black/20 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    value={newCaseOpponent}
                    onChange={e => setNewCaseOpponent(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">Case Matter Type</label>
                <select
                  className={`w-full px-3 py-2 border rounded-xl outline-none text-[10px] font-bold ${
                    isDark ? 'bg-black/20 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  value={newCaseType}
                  onChange={e => setNewCaseType(e.target.value)}
                >
                  <option value="Civil Suit">Civil Suit</option>
                  <option value="Commercial Dispute">Commercial Dispute</option>
                  <option value="Consumer Case">Consumer Case</option>
                  <option value="Contract Matter">Contract Matter</option>
                  <option value="Employment Matter">Employment Matter</option>
                  <option value="IT Wording Audit">IT Wording Audit</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">Brief Overview / Description</label>
                <textarea
                  placeholder="Summarize the core legal issue..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-xl outline-none text-[10px] font-bold resize-none ${
                    isDark ? 'bg-black/20 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  value={newCaseSummary}
                  onChange={e => setNewCaseSummary(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => setIsCreateCaseModalOpen(false)}
                className={`flex-1 py-2.5 border rounded-xl font-black text-xs uppercase tracking-wider text-slate-405 dark:border-zinc-805 hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newCaseName.trim()) {
                    toast.error("Case Name is required");
                    return;
                  }
                  setIsSyncing(true);
                  const payload = {
                    name: newCaseName,
                    clientName: newCaseClient,
                    caseType: newCaseType,
                    accused: newCaseOpponent,
                    summary: newCaseSummary,
                    caseStatus: 'Active',
                    isLegalCase: true
                  };
                  try {
                    const newCase = await apiService.createProject(payload);
                    const hydrationObj = {
                      ...payload,
                      ...newCase
                    };
                    if (onUpdateCase) onUpdateCase(hydrationObj);
                    setLinkedCaseId(hydrationObj._id);
                    hydrateFromCase(hydrationObj);
                    setIsCreateCaseModalOpen(false);
                    setNewCaseName('');
                    setNewCaseClient('');
                    setNewCaseOpponent('');
                    setNewCaseSummary('');
                    toast.success("📁 New Case Matter Profile linked successfully!");
                  } catch (e) {
                    console.error(e);
                    toast.error("Failed to link case profile.");
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Link Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Contract Conflict Dialog */}
      {duplicateFileConflict && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm border rounded-2xl shadow-2xl p-5 space-y-4 font-semibold text-[10px] ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} /> Duplicate Document Found
              </h3>
              <button onClick={() => setDuplicateFileConflict(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            <p className="text-slate-450 text-[10.5px] leading-relaxed">
              A contract with the name <strong className="text-indigo-500">"{duplicateFileConflict.file.name}"</strong> is already linked to this case. Choose how you would like to proceed with the upload:
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => processReplaceVersionConflict(duplicateFileConflict.file, duplicateFileConflict)}
                className="w-full p-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all font-black text-left flex items-start gap-2.5"
              >
                <RefreshCw size={14} className="shrink-0 mt-0.5" />
                <div className="flex-1 text-[8.5px] font-bold uppercase tracking-wider space-y-0.5">
                  <div className="font-black text-[9.5px]">Replace Version</div>
                  <span className="text-slate-450 text-[8px] font-semibold lowercase normal-case">Overwrite the current staged copy and overwrite OCR text</span>
                </div>
              </button>

              <button
                onClick={() => processCreateNewVersionConflict(duplicateFileConflict.file, duplicateFileConflict)}
                className="w-full p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 transition-all font-black text-left flex items-start gap-2.5"
              >
                <Plus size={14} className="shrink-0 mt-0.5" />
                <div className="flex-1 text-[8.5px] font-bold uppercase tracking-wider space-y-0.5">
                  <div className="font-black text-[9.5px]">Create New Version</div>
                  <span className="text-slate-455 text-[8px] font-semibold lowercase normal-case">Store as a separate incremental revision in versions history list</span>
                </div>
              </button>

              <button
                onClick={() => processCompareVersionsConflict(duplicateFileConflict.file, duplicateFileConflict)}
                className="w-full p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 transition-all font-black text-left flex items-start gap-2.5"
              >
                <Eye size={14} className="shrink-0 mt-0.5" />
                <div className="flex-1 text-[8.5px] font-bold uppercase tracking-wider space-y-0.5">
                  <div className="font-black text-[9.5px]">Compare Versions</div>
                  <span className="text-slate-450 text-[8px] font-semibold lowercase normal-case">Compare difference mappings without updating the database case</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ContractReview;
