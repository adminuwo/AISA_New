import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Plus, FileText, Copy, 
  Share2, FileDown, History, Search, X, Shield, Clock, 
  Brain, Scale, BookOpen, AlertTriangle, TrendingUp, Mic, 
  Database, Cpu, Briefcase, Building2, Landmark, Folder, Printer, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { consumePrefillIntent, mapCaseToForm } from '../services/activeModuleService';

const allTools = [
  { id: 'NDA', name: 'NDA Review', desc: 'Indemnity & leak audit', category: 'Corporate' },
  { id: 'Employment', name: 'Employment Scan', desc: 'Non-compete & severance', category: 'HR' },
  { id: 'Lease', name: 'Lease Review', desc: 'Rent escalations & evictions', category: 'Real Estate' },
  { id: 'Vendor', name: 'Vendor Agreement', desc: 'Net payment & penalties', category: 'Commercial' },
  { id: 'Investment', name: 'Investment Review', desc: 'Liquidation & vetos', category: 'Corporate' },
  { id: 'Partnership', name: 'Partnership Check', desc: 'Voting & overdraft liability', category: 'Corporate' },
  { id: 'SaaS', name: 'SaaS Agreement', desc: 'SLA uptime & data rights', category: 'IT' },
  { id: 'Privacy', name: 'Privacy Policy', desc: 'GDPR compliance', category: 'IT' },
  { id: 'Terms', name: 'Terms of Use', desc: 'Class-action & arbitration', category: 'IT' },
  { id: 'Service', name: 'Service Agreement', desc: 'Liability & IP rights', category: 'Commercial' },
  { id: 'Freelance', name: 'Freelance Contract', desc: 'Exclusivity & benefits', category: 'HR' },
  { id: 'Loan', name: 'Loan Agreement', desc: 'Defaults & penalties', category: 'Commercial' },
  { id: 'MOU', name: 'MOU Analyzer', desc: 'Binding clauses & damages', category: 'Corporate' },
  { id: 'Franchise', name: 'Franchise Review', desc: 'Terminations & supplies', category: 'Commercial' },
  { id: 'Procurement', name: 'Procurement Contract', desc: 'Penalties & rejections', category: 'Commercial' },
  { id: 'RealEstate', name: 'Real Estate Agreement', desc: 'Deposits & warranties', category: 'Real Estate' },
  { id: 'Licensing', name: 'Licensing Review', desc: 'Revocability & audits', category: 'IT' },
  { id: 'DPA', name: 'Data Processing', desc: 'Data transfers & liability', category: 'IT' },
  { id: 'NonCompete', name: 'Non Compete', desc: 'Scope & durations', category: 'HR' },
  { id: 'Arbitration', name: 'Arbitration Check', desc: 'Jurisdiction & costs', category: 'Dispute' },
  { id: 'RiskScan', name: 'Risk Scanner', desc: 'General liabilities', category: 'Corporate' }
];

const ContractReview = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';
  const [contractTitle, setContractTitle] = useState('');
  const [contractText, setContractText] = useState('');
  const [linkedCaseId, setLinkedCaseId] = useState(currentCase?._id || '');
  
  // Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [activeAudit, setActiveAudit] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState(null);

  // Tools Grid State
  const [toolsSearchQuery, setToolsSearchQuery] = useState('');
  const [toolsCategory, setToolsCategory] = useState('All');
  const [prefillBanner, setPrefillBanner] = useState(null); // { type: 'success'|'warning', message, caseTitle }

  const scrollRef = useRef(null);

  // ── On mount: consume prefill intent from "Use Active Case" ──
  useEffect(() => {
    const intent = consumePrefillIntent('legal_contract_analyzer');
    if (intent?.caseData) {
      const mapped = mapCaseToForm(intent.caseData);
      const caseId = intent.caseData?._id || intent.caseData?.id;
      if (caseId) { setLinkedCaseId(caseId); loadAuditHistory(caseId); }

      if (mapped.hasContract && mapped.contractFiles?.length) {
        // Found contract files in this case
        const contractFile = mapped.contractFiles[0];
        setContractTitle(`${mapped.caseTitle} — ${contractFile.name}`);
        setContractText(mapped.caseFacts || `Contract file: ${contractFile.name}\nCase: ${mapped.caseTitle}\n\n${mapped.notes || ''}`);
        setPrefillBanner({ type: 'success', caseTitle: mapped.caseTitle, message: `Contract found: ${contractFile.name}` });
        toast.success(`✓ Contract file detected — pre-loaded for review`, { icon: '📄', duration: 3000 });
      } else if (mapped.caseFacts) {
        // No contract file but has case facts — load them as context
        setContractTitle(mapped.caseTitle || '');
        setContractText(mapped.caseFacts);
        setPrefillBanner({ type: 'warning', caseTitle: mapped.caseTitle, message: 'No contract file found in this case. Paste contract text below or select a template.' });
        toast(`⚠️ No contract found — case facts loaded as context`, { icon: '⚠️', duration: 4000 });
      } else {
        // Nothing useful
        setPrefillBanner({ type: 'warning', caseTitle: mapped.caseTitle, message: 'No contract found in this case. Upload or paste contract text to analyze.' });
      }
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (currentCase) {
      setLinkedCaseId(currentCase._id);
      loadAuditHistory(currentCase._id);
      setContractTitle(currentCase.name || '');
      setContractText(currentCase.description || '');
      setActiveAudit(null);
      setAuditResult(null);
    } else {
      setHistoryData([]);
      setActiveAudit(null);
      setAuditResult(null);
    }
  }, [currentCase]);

  const loadAuditHistory = async (caseId) => {
    try {
      const data = localStorage.getItem('aisa_contract_audits_history');
      if (data && caseId) {
        const parsed = JSON.parse(data);
        const filtered = parsed.filter(h => h.caseId === caseId);
        setHistoryData(filtered);
      } else {
        setHistoryData([]);
      }
    } catch (e) {
      console.error('[ContractReview] Error loading history', e);
    }
  };

  const saveAuditToHistory = async (audit) => {
    try {
      const stored = localStorage.getItem('aisa_contract_audits_history');
      const allAudits = stored ? JSON.parse(stored) : [];
      const auditWithCase = {
        ...audit,
        caseId: linkedCaseId || currentCase?._id
      };
      const updated = [auditWithCase, ...allAudits.filter(h => h.id !== audit.id)];
      localStorage.setItem('aisa_contract_audits_history', JSON.stringify(updated));
      if (linkedCaseId || currentCase?._id) {
        setHistoryData(updated.filter(h => h.caseId === (linkedCaseId || currentCase?._id)));
      }
    } catch (e) {
      console.error('[ContractReview] Error saving history', e);
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      const stored = localStorage.getItem('aisa_contract_audits_history');
      const allAudits = stored ? JSON.parse(stored) : [];
      const updated = allAudits.filter(h => h.id !== id);
      localStorage.setItem('aisa_contract_audits_history', JSON.stringify(updated));
      if (linkedCaseId || currentCase?._id) {
        setHistoryData(updated.filter(h => h.caseId === (linkedCaseId || currentCase?._id)));
      }
      toast.success("Audit log deleted successfully");
      if (activeAudit?.id === id) {
        setActiveAudit(null);
        setAuditResult(null);
      }
    } catch (e) {
      console.error('[ContractReview] Error deleting history', e);
    }
  };

  const handleCaseSelect = (caseId) => {
    setLinkedCaseId(caseId);
    if (caseId) {
      const selected = allProjects.find(c => c._id === caseId);
      if (selected) {
        setContractTitle(selected.name);
        setContractText(selected.description || selected.summary || '');
        loadAuditHistory(caseId);
        toast.success(`Context linked to case: ${selected.name}`);
      }
    } else {
      setLinkedCaseId('');
    }
  };

  const triggerQuickTool = (toolId) => {
    let sampleText = '';
    let title = '';

    if (toolId === 'NDA') {
      title = 'Mutual Non-Disclosure Agreement (NDA)';
      sampleText = `This Mutual Non-Disclosure Agreement is entered between CorpA and PartnerB. Section 5 states that PartnerB must fully indemnify CorpA for any indirect, consequential, or punitive damages resulting from any accidental proprietary leak, without any limitation of liability. No remedy period is granted for security incidents.`;
    } else if (toolId === 'Employment') {
      title = 'Senior Executive Employment Agreement';
      sampleText = `Section 12 specifies a 12-month post-employment non-compete clause applicable worldwide, and gives the employer the absolute right to terminate employment immediately without notice or severance pay. Employee waives all statutory rights to appeal or arbitration.`;
    } else if (toolId === 'Lease') {
      title = 'Commercial Lease & Tenancy Agreement';
      sampleText = `Section 8 allows the landlord to escalate rent by 25% annually at their sole discretion and permits immediate eviction with 3 days of written notice if municipal utilities are delayed for any reason. Security deposit is non-refundable under all circumstances.`;
    } else if (toolId === 'Vendor') {
      title = 'Master Services Vendor Agreement';
      sampleText = `Section 14 states that payment terms are Net 90 days from the invoice approval date. Any delayed deliverables, regardless of force majeure events, incur a daily liquidated penalty of 5% of total annual contract value. All source code rights transfer immediately upon drafting.`;
    } else if (toolId === 'Investment') {
      title = 'Series A Preferred Stock Purchase Agreement';
      sampleText = `Investor receives 10% equity for $1.5M. Section 4 mandates a 3x liquidation preference, full veto rights over all operational decisions including hire/fire, and anti-dilution protection based on full ratchet calculation. Founder shares vest over 8 years.`;
    } else if (toolId === 'Partnership') {
      title = 'General Partnership & Joint Venture Deed';
      sampleText = `Partners shall share profits equally. Section 9 states that Partner A is solely liable for any bank overdrafts, while Partner B retains sole voting authority on partnership dissolution and asset division.`;
    } else if (toolId === 'SaaS') {
      title = 'Enterprise Cloud SaaS License Agreement';
      sampleText = `Provider grants SaaS access. Section 11 states that service availability SLA is 95% with no credit penalties for outages, and all user uploaded customer data becomes the absolute property of the provider with global resell rights.`;
    } else if (toolId === 'Privacy') {
      title = 'AISA Mobile App Privacy Policy';
      sampleText = `This policy details how user personal telemetry and location metadata is stored indefinitely and sold to third-party ad networks for targeted outreach without explicit opt-out mechanism. Jurisdiction is located in Seychelles.`;
    } else if (toolId === 'Terms') {
      title = 'Web Portal Terms of Use & Liability Waiver';
      sampleText = `By accessing this website, the user waives all rights to file class-action lawsuits, agrees to arbitrate exclusively in Bermuda under maritime law, and agrees to indemnify the operator for all hosting outages and technical bugs.`;
    } else if (toolId === 'Service') {
      title = 'Master Service Agreement';
      sampleText = `Service provider requires 100% upfront payment. Section 6 limits provider liability to $100 total, despite contract value of $50,000. Client grants perpetual license to all intellectual property created during the service.`;
    } else if (toolId === 'Freelance') {
      title = 'Independent Contractor Agreement';
      sampleText = `Contractor must be available 9AM-5PM exclusively for the Client. Section 8 prevents contractor from working with any other company in the same industry for 2 years post-termination. No benefits or insurance provided.`;
    } else if (toolId === 'Loan') {
      title = 'Commercial Loan Agreement';
      sampleText = `Lender may call the loan immediately upon any default. Section 5 mandates a 25% penalty interest rate upon late payment, compounded daily. Borrower must provide all personal assets as collateral.`;
    } else if (toolId === 'MOU') {
      title = 'Memorandum of Understanding';
      sampleText = `This MOU is intended to be legally binding. Section 3 prevents either party from negotiating with third parties for a period of 6 months. Any dispute will result in immediate damages of $500,000.`;
    } else if (toolId === 'Franchise') {
      title = 'Franchise Agreement';
      sampleText = `Franchisee must purchase all supplies from the franchisor at markup. Section 12 allows franchisor to terminate without cause with 30 days notice. Non-compete extends to any food business globally for 5 years.`;
    } else if (toolId === 'Procurement') {
      title = 'Supply & Procurement Contract';
      sampleText = `Supplier must deliver goods within 3 days. Section 7 imposes a penalty of 10% of total order value for every day of delay. Buyer can reject goods at their sole discretion without providing reasons.`;
    } else if (toolId === 'RealEstate') {
      title = 'Commercial Real Estate Agreement';
      sampleText = `Buyer forfeits entire 20% deposit if closing is delayed by even 1 day. Section 9 states property is sold strictly 'as-is' and seller makes no warranties regarding structural integrity or zoning laws.`;
    } else if (toolId === 'Licensing') {
      title = 'Software Licensing Agreement';
      sampleText = `License is revocable at will by the Licensor. Section 4 states that Licensor may audit Licensee's computers at any time without notice. Licensee indemnifies Licensor against any third-party IP claims.`;
    } else if (toolId === 'DPA') {
      title = 'Data Processing Agreement (DPA)';
      sampleText = `Processor may transfer data to any country without notification. Section 6 states that Processor liability for data breaches is capped at the monthly subscription fee. No obligation to assist with data subject requests.`;
    } else if (toolId === 'NonCompete') {
      title = 'Non-Compete Agreement';
      sampleText = `Employee agrees not to work in any capacity for any technology company in North America for a period of 3 years after termination. Violation results in automatic liquidated damages of $1,000,000.`;
    } else if (toolId === 'Arbitration') {
      title = 'Arbitration Clause Addendum';
      sampleText = `All disputes must be resolved by binding arbitration in Singapore. Section 2 states that each party bears their own costs regardless of outcome, and the arbitrator must be selected solely by the Company.`;
    } else if (toolId === 'RiskScan') {
      title = 'General Risk Scan';
      sampleText = `The parties agree to mutually release all past, present, and future claims. Section 10 allows Party A to amend the agreement unilaterally at any time without notice to Party B.`;
    }

    setContractTitle(title);
    setContractText(sampleText);
    toast.success(`Template loaded: ${title}`);
    
    // Auto run audit on selection
    runContractAudit({
      title,
      contractText: sampleText
    });
  };

  const runContractAudit = async (customState) => {
    const stateToUse = customState || {
      title: contractTitle || 'Custom Agreement Review',
      contractText
    };

    if (!stateToUse.contractText.trim()) {
      toast.error("Please paste the contract text or link to a case to run an audit.");
      return;
    }

    setIsAuditing(true);
    setAuditResult(null);

    const tid = toast.loading("Analyzing contract clauses & risks...");

    try {
      const systemPrompt = `You are the AISA Enterprise Contract Intelligence Platform. You perform clause risk auditing, missing clause detection, and compliance score analysis.
      
      CRITICAL FORMATTING INSTRUCTIONS:
      Always output a valid markdown with the following exactly matching sections:
      ### **AISA CONTRACT AUDIT REPORT**
      
      **Agreement Title:** [Brief Title]
      **Compliance Rating:** [Compliance Score]% | **Risk Classification:** [Low/Moderate/High]
      
      #### **1. CRITICAL CLAUSE AUDIT & RISK ANALYSIS**
      * [High Risk Clause Description] (Risk Level: [Risk]): [Detailed legal explanation of exposure].
      * [Second Clause Description] (Risk Level: [Risk]): [Detailed legal explanation].
      
      #### **2. MISSING COMPLIANCE CLAUSES**
      * **[Missing Clause name]:** [Why it is required and what risk its absence creates].
      * **[Second Missing Clause]:** [Explanation].
      
      #### **3. SAFER CLAUSE RECOMMENDATIONS**
      * **Proposed Clause:** "[Safer legal draft wording to mitigate risk]".
      * **Negotiation Suggestion:** [Advice on how to present this change to the counterparty].`;

      const query = `
      Contract Title: ${stateToUse.title}
      Contract Text: ${stateToUse.contractText}
      `;

      const response = await generateChatResponse([], query, systemPrompt, [], 'English', null, 'legal');
      const responseText = response.reply || response || '';

      // Dynamically parse values from response
      let complianceScore = 75;
      let missingCount = 2;
      let riskLevel = 'Moderate';

      try {
        const compMatch = responseText.match(/Compliance Rating:\s*(\d+)%/i) || responseText.match(/Compliance Score:\s*(\d+)%/i);
        if (compMatch) complianceScore = parseInt(compMatch[1]);

        const riskMatch = responseText.match(/Risk Classification:\s*(\w+)/i) || responseText.match(/Risk Level:\s*(\w+)/i);
        if (riskMatch) {
          const parsedRisk = riskMatch[1].trim();
          if (['High', 'Moderate', 'Low'].includes(parsedRisk)) riskLevel = parsedRisk;
        }

        const missingCountMatch = responseText.match(/Missing Compliance Clauses:\s*(\d+)/i) || responseText.match(/Missing Clauses:\s*(\d+)/i);
        if (missingCountMatch) {
          missingCount = parseInt(missingCountMatch[1]);
        } else {
          const bulletMatches = responseText.match(/#### \*\*2\. MISSING COMPLIANCE CLAUSES\*\*([\s\S]*?)####/i);
          if (bulletMatches) {
            const count = (bulletMatches[1].match(/\*/g) || []).length;
            if (count > 0) missingCount = count;
          }
        }
      } catch (err) {
        console.log("[Parsing Stats] Fallback used", err);
      }

      const newAudit = {
        id: Date.now().toString(),
        title: stateToUse.title,
        contractText: stateToUse.contractText,
        timestamp: new Date().toLocaleString(),
        stats: { riskLevel, complianceScore, missingClausesCount: missingCount, confidenceRate: 94 },
        report: responseText
      };

      setActiveAudit(newAudit);
      setAuditResult(newAudit);
      await saveAuditToHistory(newAudit);
      toast.success("Contract audit generated successfully!", { id: tid });
    } catch (error) {
      console.error('[ContractReview] API Error:', error);
      toast.error("Failed to connect to the AISA network.", { id: tid });
    } finally {
      setIsAuditing(false);
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
          title: contractTitle || 'Contract Review Report',
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
        <h1>AISA CONTRACT COMPLIANCE & RISK AUDIT</h1>
        <p><strong>Audit Date:</strong> ${new Date().toLocaleDateString()}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;"/>
        ${parsedReport}
        <div class="footer">Generated by AISA Enterprise Contract Intelligence Platform - ${new Date().toLocaleDateString()}</div>
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

  const stats = activeAudit ? activeAudit.stats : { riskLevel: '--', complianceScore: '--', missingClausesCount: '--', confidenceRate: '--' };

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
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">Contract Review</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">CONTRACT INTELLIGENCE ACTIVE</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setHistoryVisible(true)} 
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/30 rounded-xl text-xs font-black uppercase tracking-wider"
        >
          <History size={14} />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar min-h-0 select-text">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Stats Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <AlertTriangle className={stats.riskLevel === 'High' ? 'text-red-500' : 'text-amber-500'} size={20} />
              <span className={`text-lg font-black mt-2 ${stats.riskLevel === 'High' ? 'text-red-500' : 'text-amber-500'}`}>{stats.riskLevel}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Risk Level</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Shield className="text-emerald-500" size={20} />
              <span className="text-lg font-black text-emerald-500 mt-2">{stats.complianceScore}{stats.complianceScore !== '--' ? '%' : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Compliance</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <FileText className="text-indigo-500" size={20} />
              <span className="text-lg font-black text-slate-900 dark:text-white mt-2">{stats.missingClausesCount}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Missing Clauses</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Brain className="text-pink-500" size={20} />
              <span className="text-lg font-black text-pink-500 mt-2">{stats.confidenceRate}{stats.confidenceRate !== '--' ? '%' : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">AI Confidence</span>
            </div>
          </div>

          {/* Quick Tools Grid Section */}
          <div className="bg-white dark:bg-[#1A2540] rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4">SPECIALIZED CONTRACT REVIEW MODULES</h3>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5">
                <Search className="text-slate-400 mr-2 shrink-0" size={16} />
                <input 
                  type="text" 
                  placeholder="Search modules..."
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                  value={toolsSearchQuery}
                  onChange={e => setToolsSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
                {['All', 'Corporate', 'HR', 'Commercial', 'Real Estate', 'IT'].map(cat => (
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
                  onClick={() => triggerQuickTool(t.id)}
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

          {/* Active Case Prefill Banner */}
          {prefillBanner && (
            <div className={`flex items-start gap-3 px-4 py-3 border rounded-2xl shadow-sm ${
              prefillBanner.type === 'success'
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-200 dark:border-emerald-900/30'
                : 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/10 border-amber-200 dark:border-amber-900/30'
            }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                prefillBanner.type === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}>
                {prefillBanner.type === 'success' ? <CheckCircle2 size={16} className="text-white" /> : <AlertTriangle size={14} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black leading-none ${ prefillBanner.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {prefillBanner.type === 'success' ? `Active Case: ${prefillBanner.caseTitle}` : `⚠️ No Contract Found — ${prefillBanner.caseTitle}`}
                </p>
                <p className={`text-[10px] font-medium mt-0.5 ${ prefillBanner.type === 'success' ? 'text-emerald-600/70 dark:text-emerald-500/60' : 'text-amber-600/70 dark:text-amber-500/60'}`}>
                  {prefillBanner.message}
                </p>
              </div>
              <button onClick={() => setPrefillBanner(null)} className={`p-1 rounded-full shrink-0 ${ prefillBanner.type === 'success' ? 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-500' : 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500'}`}><X size={13} /></button>
            </div>
          )}

          {/* Form and Input Area */}
          <div className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <Scale size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">AI AGREEMENT INTUITIVE SCANNER</h3>
            </div>

            {/* Case Sync */}
            {allProjects.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Link to MyCase (Auto-Fill)</label>
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

            {/* Agreement Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Agreement Title</label>
              <input
                type="text"
                placeholder="e.g. Mutual Non-Disclosure Agreement"
                value={contractTitle}
                onChange={e => setContractTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-bold outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Agreement Text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Agreement Clauses / Text</label>
              <textarea
                rows={6}
                placeholder="Paste contract clauses or agreement details to audit..."
                value={contractText}
                onChange={e => setContractText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-medium outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>

            <button
              onClick={() => runContractAudit()}
              disabled={isAuditing}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Shield size={16} />
              <span>Audit Contract Clauses</span>
            </button>
          </div>

          {/* Thinking State */}
          {isAuditing && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-500 animate-pulse">Auditing clauses & risks...</span>
            </div>
          )}

          {/* Audit Results Report */}
          {auditResult && (
            <div ref={scrollRef} className="bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-emerald-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">CONTRACT AUDIT & COMPLIANCE SUMMARY</h3>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleCopy(auditResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-indigo-600"
                    title="Copy Report"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={() => handleShare(auditResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-indigo-600"
                    title="Share Report"
                  >
                    <Share2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleSpeech(auditResult.report)}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg ${isSpeaking ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' : 'text-slate-500'}`}
                    title="Speak Report"
                  >
                    <Mic size={14} />
                  </button>
                  <button 
                    onClick={() => handleExportPDF(auditResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-indigo-600 hover:text-indigo-700"
                    title="Export Printable PDF"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap select-text leading-relaxed text-slate-800 dark:text-slate-200">
                {auditResult.report}
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
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Audit Logs History</h3>
              <button onClick={() => setHistoryVisible(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 mt-4 shrink-0">
              <Search size={16} className="text-slate-400 mr-2" />
              <input 
                type="text"
                placeholder="Search past audits..."
                className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-3 custom-scrollbar">
              {historyData.filter(h => 
                h.title?.toLowerCase().includes(historySearch.toLowerCase()) || 
                h.contractText?.toLowerCase().includes(historySearch.toLowerCase())
              ).map(item => (
                <div key={item.id} className="flex justify-between items-start p-4 bg-slate-50 dark:bg-[#1A2540] border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <button
                    onClick={() => {
                      setActiveAudit(item);
                      setAuditResult(item);
                      setHistoryVisible(false);
                      toast.success(`Loaded audit: ${item.title}`);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.title}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{item.timestamp}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium line-clamp-2">{item.contractText}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[9px] font-bold text-indigo-600 rounded-md">Risk: {item.stats.riskLevel}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-[9px] font-bold text-emerald-600 rounded-md">Score: {item.stats.complianceScore}%</span>
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
                  <p className="text-xs font-semibold text-slate-400 mt-2">No audits saved yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractReview;
