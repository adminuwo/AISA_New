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
  { id: 'Bail', name: 'Bail Strategy', desc: 'Pre-arrest roadmap', category: 'Criminal', icon: Gavel },
  { id: 'Criminal', name: 'Criminal Defense', desc: 'Theft & incident plans', category: 'Criminal', icon: Shield },
  { id: 'Civil', name: 'Civil Litigation', desc: 'Damages & breach', category: 'Civil', icon: Scale },
  { id: 'Cyber', name: 'Cyber Crime Plan', desc: 'Telemetry & routing logs', category: 'Cyber', icon: Cpu },
  { id: 'AnticipatoryBail', name: 'Anticipatory Bail', desc: 'Preventive arrest stay', category: 'Criminal', icon: Shield },
  { id: 'FIRResponse', name: 'FIR Response', desc: 'Counter-complaint tactics', category: 'Criminal', icon: FileText },
  { id: 'EvidencePlanning', name: 'Evidence Planning', desc: 'Collection & chain rules', category: 'Civil', icon: Database },
  { id: 'AppealStrategy', name: 'Appeal Strategy', desc: 'High court escalations', category: 'Civil', icon: TrendingUp },
  { id: 'CrossExamination', name: 'Cross Examination', desc: 'Witness questioning', category: 'Trial', icon: Mic },
  { id: 'WitnessPreparation', name: 'Witness Preparation', desc: 'Testimony guidelines', category: 'Trial', icon: Mic },
  { id: 'SettlementStrategy', name: 'Settlement Strategy', desc: 'Mediation & negotiation', category: 'Corporate', icon: Briefcase },
  { id: 'Property', name: 'Property Dispute', desc: 'Possession boundary checks', category: 'Civil', icon: Building2 },
  { id: 'Corporate', name: 'Corporate Defense', desc: 'Shareholder diluting veto', category: 'Corporate', icon: Briefcase },
  { id: 'ContractDispute', name: 'Contract Dispute', desc: 'Breach of terms action', category: 'Civil', icon: FileText },
  { id: 'ArbitrationPlan', name: 'Arbitration Plan', desc: 'ADR & settlement plans', category: 'Corporate', icon: BookOpen },
  { id: 'RecoveryStrategy', name: 'Recovery Strategy', desc: 'Debt collection roadmap', category: 'Civil', icon: Landmark },
  { id: 'TaxLitigation', name: 'Tax Litigation', desc: 'Assessment appeals', category: 'Corporate', icon: BookOpen },
  { id: 'CyberFraudDefense', name: 'Cyber Fraud Defense', desc: 'Digital theft & scams', category: 'Cyber', icon: Cpu },
  { id: 'CriminalAppeal', name: 'Criminal Appeal', desc: 'Sentence reduction', category: 'Criminal', icon: Gavel },
  { id: 'ConsumerComplaint', name: 'Consumer Complaint', desc: 'Defective goods/services', category: 'Civil', icon: AlertTriangle },
  { id: 'DocumentationReview', name: 'Documentation Review', desc: 'Clause analysis', category: 'Trial', icon: FileText },
  { id: 'HearingPreparation', name: 'Hearing Preparation', desc: 'Final arguments', category: 'Trial', icon: Gavel }
];

const StrategyEngine = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';
  const [caseTitle, setCaseTitle] = useState('');
  const [caseFacts, setCaseFacts] = useState('');
  const [linkedCaseId, setLinkedCaseId] = useState(currentCase?._id || '');

  // Strategy States
  const [isAuditing, setIsAuditing] = useState(false);
  const [strategyResult, setStrategyResult] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [activeStrategy, setActiveStrategy] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState(null);

  // Tools Grid State
  const [toolsSearchQuery, setToolsSearchQuery] = useState('');
  const [toolsCategory, setToolsCategory] = useState('All');
  const [prefillBanner, setPrefillBanner] = useState(null);

  const scrollRef = useRef(null);

  // ── On mount: consume prefill intent from "Use Active Case" ──
  useEffect(() => {
    const intent = consumePrefillIntent('legal_strategy_engine');
    if (intent?.caseData) {
      const mapped = mapCaseToForm(intent.caseData);
      if (mapped.caseTitle) setCaseTitle(mapped.caseTitle);
      if (mapped.caseFacts) setCaseFacts(mapped.caseFacts);
      const caseId = intent.caseData?._id || intent.caseData?.id;
      if (caseId) { setLinkedCaseId(caseId); loadStrategyHistory(caseId); }
      setPrefillBanner({ caseTitle: mapped.caseTitle || intent.caseData?.name || 'Active Case' });
      toast.success(`✓ Case data loaded for strategy`, { icon: '🏆', duration: 3000 });
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (currentCase) {
      setLinkedCaseId(currentCase._id);
      loadStrategyHistory(currentCase._id);
      setCaseTitle(currentCase.name || '');
      setCaseFacts(currentCase.description || '');
      setStrategyResult(null);
      setActiveStrategy(null);
    } else {
      setHistoryData([]);
      setStrategyResult(null);
      setActiveStrategy(null);
    }
  }, [currentCase]);

  const loadStrategyHistory = async (caseId) => {
    try {
      const targetCase = allProjects.find(p => p._id === caseId);
      let dbHistory = targetCase?.strategiesHistory || [];

      // Check legacy local storage history to migrate
      const localData = localStorage.getItem('aisa_litigation_strategies_history');
      if (localData && targetCase) {
        try {
          const parsedLocal = JSON.parse(localData);
          const localForCase = parsedLocal.filter(h => h.caseId === caseId);
          if (localForCase.length > 0) {
            const merged = [...dbHistory];
            localForCase.forEach(item => {
              if (!merged.some(m => m.id === item.id)) {
                merged.push(item);
              }
            });
            const payload = {
              ...targetCase,
              strategiesHistory: merged
            };
            const response = await apiService.updateProject(caseId, payload);
            if (onUpdateCase) onUpdateCase(response);
            dbHistory = merged;

            const remainingLocal = parsedLocal.filter(h => h.caseId !== caseId);
            if (remainingLocal.length > 0) {
              localStorage.setItem('aisa_litigation_strategies_history', JSON.stringify(remainingLocal));
            } else {
              localStorage.removeItem('aisa_litigation_strategies_history');
            }
          }
        } catch (err) {
          console.error("Error migrating strategy history", err);
        }
      }

      setHistoryData(dbHistory);
    } catch (e) {
      console.error('[StrategyEngine] Error loading history', e);
    }
  };

  const saveStrategyToHistory = async (strategy) => {
    const caseId = linkedCaseId || currentCase?._id;
    if (!caseId) return;
    try {
      const targetCase = allProjects.find(p => p._id === caseId);
      if (!targetCase) return;
      const strategyWithCase = {
        ...strategy,
        caseId: caseId
      };
      const existingHistory = targetCase.strategiesHistory || [];
      const updated = [strategyWithCase, ...existingHistory.filter(h => h.id !== strategy.id)];

      const payload = {
        ...targetCase,
        strategiesHistory: updated
      };
      const response = await apiService.updateProject(caseId, payload);
      if (onUpdateCase) onUpdateCase(response);
      setHistoryData(updated);
    } catch (e) {
      console.error('[StrategyEngine] Error saving history', e);
    }
  };

  const deleteHistoryItem = async (id) => {
    const caseId = linkedCaseId || currentCase?._id;
    if (!caseId) return;
    try {
      const targetCase = allProjects.find(p => p._id === caseId);
      if (!targetCase) return;
      const existingHistory = targetCase.strategiesHistory || [];
      const updated = existingHistory.filter(h => h.id !== id);

      const payload = {
        ...targetCase,
        strategiesHistory: updated
      };
      const response = await apiService.updateProject(caseId, payload);
      if (onUpdateCase) onUpdateCase(response);
      setHistoryData(updated);
      toast.success("Strategy log deleted successfully");
      if (activeStrategy?.id === id) {
        setActiveStrategy(null);
        setStrategyResult(null);
      }
    } catch (e) {
      console.error('[StrategyEngine] Error deleting history', e);
    }
  };

  const handleCaseSelect = (caseId) => {
    setLinkedCaseId(caseId);
    if (caseId) {
      const selected = allProjects.find(c => c._id === caseId);
      if (selected) {
        setCaseTitle(selected.name);
        setCaseFacts(selected.description || selected.summary || '');
        loadStrategyHistory(caseId);
        toast.success(`Context linked to case: ${selected.name}`);
      }
    } else {
      setLinkedCaseId('');
    }
  };

  const triggerQuickTool = (moduleId, moduleName) => {
    let sampleFacts = '';
    let title = '';

    if (moduleId === 'Bail') {
      title = 'Bail Hearing Strategy - Anticipatory Request';
      sampleFacts = `Anticipatory bail request under IPC Cyber Fraud provisions. Police are seeking physical arrest. Client alleges arbitrary framing and demonstrates full willingness to cooperate with the local investigative team.`;
    } else if (moduleId === 'Criminal') {
      title = 'Criminal Defense Strategy - Theft Accusation';
      sampleFacts = `Prosecution alleges theft based entirely on circumstantial CCTV footage of low resolution. No physical recovery has been recorded, and the accused lacks any previous criminal records.`;
    } else if (moduleId === 'Civil') {
      title = 'Civil Litigation Strategy - Breach of Contract';
      sampleFacts = `Plaintiff claims damages of $150,000 for delayed delivery of software code. Defendant asserts delayed payment of mandatory mobilization fee as the primary cause of operational postponement.`;
    } else if (moduleId === 'Cyber') {
      title = 'Cyber Crime Defense - Unauthorized Intrusion';
      sampleFacts = `Client accused of unauthorized database access. The network audit exhibits overlapping credentials shared among multiple remote external contractors during the specified time period.`;
    } else if (moduleId === 'Property') {
      title = 'Property Dispute Planning - Adverse Possession';
      sampleFacts = `Adverse possession claims over a boundary fence held continuously for 14 years. Plaintiff holds old physical sale deed records but hasn't physically occupied the property in two decades.`;
    } else if (moduleId === 'Breach') {
      title = 'Contract Breach Strategy - Indemnity Claim';
      sampleFacts = `Partner seeks unilateral indemnification for third-party hosting service outage. The primary service levels agreement (SLA) excludes server provider failures from direct liability exposure.`;
    } else if (moduleId === 'Corporate') {
      title = 'Corporate Legal Defense - Shareholder Veto';
      sampleFacts = `Minority shareholder seeks injunction against capital raising round, asserting dilution and lack of proper statutory meeting notice. Board has documented proof of digital notice delivery.`;
    } else if (moduleId === 'AnticipatoryBail') {
      title = 'Anticipatory Bail Strategy';
      sampleFacts = `Client fears imminent arrest in a financial fraud case. Looking to secure an anticipatory bail. No prior criminal record. Ready to surrender passport and cooperate fully with investigators.`;
    } else if (moduleId === 'FIRResponse') {
      title = 'FIR Response & Quashing';
      sampleFacts = `A fabricated FIR has been filed against the client over a personal dispute. Seeking strategy to file a counter-complaint and petition the High Court to quash the FIR under section 482.`;
    } else if (moduleId === 'EvidencePlanning') {
      title = 'Evidence Collection Planning';
      sampleFacts = `Preparing for a civil property dispute. Need a roadmap for collecting municipal records, verifying older land deeds, and securing testimonies from long-term neighbors to establish adverse possession.`;
    } else if (moduleId === 'AppealStrategy') {
      title = 'High Court Appeal Strategy';
      sampleFacts = `Lower court ruled against the client in a breach of contract case, misinterpreting the force majeure clause. Need an appeal strategy focusing on the legal error and precedents on pandemic-related contract failures.`;
    } else if (moduleId === 'CrossExamination') {
      title = 'Cross Examination Tactics';
      sampleFacts = `Hostile witness is scheduled to testify next week. Witness has previously given contradictory statements to the police. Need a line of questioning to expose these contradictions and establish lack of credibility.`;
    } else if (moduleId === 'WitnessPreparation') {
      title = 'Witness Preparation Plan';
      sampleFacts = `Preparing a key expert witness (forensic accountant) for a corporate embezzlement trial. Need to outline the structure of direct examination and prepare the witness for aggressive cross-examination by the defense.`;
    } else if (moduleId === 'SettlementStrategy') {
      title = 'Settlement & Negotiation Strategy';
      sampleFacts = `Client wants to settle a long-running family business dispute. The opposing party is demanding an unreasonable valuation. Need a mediation strategy to force a realistic compromise without admitting liability.`;
    } else if (moduleId === 'ContractDispute') {
      title = 'Contract Dispute Resolution';
      sampleFacts = `Vendor failed to deliver critical software components on time, triggering penalty clauses. Vendor claims scope creep. Need a strategy to enforce penalties or terminate the agreement favorably.`;
    } else if (moduleId === 'ArbitrationPlan') {
      title = 'Arbitration Proceedings Plan';
      sampleFacts = `Initiating binding arbitration in Singapore over an international trade dispute. The opposing party is delaying the appointment of the arbitrator. Need a procedural roadmap to force compliance.`;
    } else if (moduleId === 'RecoveryStrategy') {
      title = 'Debt Recovery Strategy';
      sampleFacts = `A corporate client owes $500,000 in unpaid invoices for over 6 months. Need a strategy starting from legal notices to initiating insolvency proceedings to maximize recovery chances.`;
    } else if (moduleId === 'TaxLitigation') {
      title = 'Tax Assessment Appeal';
      sampleFacts = `The tax authority has disallowed $1M in legitimate business expenses and imposed a 50% penalty. Need an appeal strategy before the tribunal focusing on statutory interpretation and recent favorable case laws.`;
    } else if (moduleId === 'CyberFraudDefense') {
      title = 'Cyber Fraud Defense';
      sampleFacts = `Client's company is accused of facilitating a crypto scam due to a vulnerability in their platform. Need a defense strategy separating the platform's liability from the actions of malicious third-party actors.`;
    } else if (moduleId === 'CriminalAppeal') {
      title = 'Criminal Sentence Appeal';
      sampleFacts = `Client was convicted of negligence and sentenced to 3 years. The trial judge ignored key exculpatory evidence regarding equipment failure. Need an appeal strategy to suspend the sentence and overturn the conviction.`;
    } else if (moduleId === 'ConsumerComplaint') {
      title = 'Consumer Court Strategy';
      sampleFacts = `A real estate developer delayed apartment possession by 4 years. Need a strategy to file a class-action consumer complaint demanding immediate possession and 18% annual interest as compensation.`;
    } else if (moduleId === 'DocumentationReview') {
      title = 'Litigation Documentation Review';
      sampleFacts = `Reviewing a 500-page bundle of email correspondences between the founders before a partnership split. Need a strategy to identify admissions of liability and breaches of fiduciary duty.`;
    } else if (moduleId === 'HearingPreparation') {
      title = 'Final Hearing Preparation';
      sampleFacts = `Final arguments in a trademark infringement suit are next month. Need a roadmap to synthesize 3 years of evidence, expert reports, and case laws into a compelling 30-minute oral presentation.`;
    } else {
      title = `${moduleName || 'Legal Strategy'} - Initial Roadmap`;
      sampleFacts = `Developing comprehensive courtroom strategies and defense plans tailored for ${moduleName || 'this specific legal matter'}. Analyzing opponent tactics, risk exposure, and precedent support.`;
    }

    setCaseTitle(title);
    setCaseFacts(sampleFacts);
    toast.success(`Template loaded: ${title}`);

    runStrategyAuditor({
      title,
      caseFacts: sampleFacts
    });
  };

  const runStrategyAuditor = async (customState) => {
    const stateToUse = customState || {
      title: caseTitle || 'Custom Courtroom Strategy',
      caseFacts
    };

    if (!stateToUse.caseFacts.trim()) {
      toast.error("Please provide case facts or link to a case to run strategy simulation.");
      return;
    }

    setIsAuditing(true);
    setStrategyResult(null);

    const tid = toast.loading("Simulating litigation roadmaps...");

    const isRoadmap = stateToUse.mode === 'roadmap';

    try {
      const systemPrompt = isRoadmap ? `You are the AISA Enterprise Litigation Roadmap Generator. You build clear, step-by-step legal timelines and milestones.
      
      CRITICAL FORMATTING INSTRUCTIONS:
      Always output a valid markdown with the following exactly matching sections:
      ### **AISA CASE ROADMAP**
      
      **Case Stage:** [Current Stage]
      **Strategy Score:** [Timeline Certainty]% | **Litigation Risk:** [Low/Moderate/High]
      
      #### **1. IMMEDIATE LEGAL STEPS**
      * [Step 1]: [Explanation].
      * [Step 2]: [Explanation].
      
      #### **2. EXPECTED TIMELINE & HEARING FLOW**
      * [Month/Phase 1]: [What to expect].
      * [Month/Phase 2]: [What to expect].
      
      #### **3. REQUIRED DOCUMENTS & PREPARATION**
      * [Document/Evidence]: [Why it is needed].` 
      : `You are the AISA Enterprise Litigation Strategy War Room. You generate courtroom plans, rebuttals, tactics, roadmaps, and judge pattern insights.
      
      CRITICAL FORMATTING INSTRUCTIONS:
      Always output a valid markdown with the following exactly matching sections:
      ### **AISA LITIGATION STRATEGY REPORT**
      
      **Case Classification:** [Brief Title/Type]
      **Strategy Score:** [Strategy Strength]% | **Litigation Risk:** [Low/Moderate/High]
      
      #### **1. PRIMARY STRATEGY & LEGAL ARCHITECTURE**
      * [Strategic Action/Point] (Strength: [High/Moderate]): [Detailed courtroom strategy explanation].
      * [Second Strategic Action/Point] (Strength: [High/Moderate]): [Explanation].
      
      #### **2. COURTROOM ATTACK & DEFENSE TACTICS**
      * [Attack Tactic 1]: [Detailed explanation of how to execute cross-examination or challenge evidence].
      * [Attack Tactic 2]: [Explanation].
      
      #### **3. RECOMMENDED WAR ROOM ACTIONS**
      * **Immediate Action:** [Urgent procedural filing advice].
      * **Preservation Action:** [Advice on preserving evidence or obtaining records].`;

      const query = `
      Case Title: ${stateToUse.title}
      Case Facts: ${stateToUse.caseFacts}
      `;

      const response = await generateChatResponse([], query, systemPrompt, [], 'English', null, 'legal');
      const responseText = response.reply || response || '';

      // Parse dynamic indicators
      let strategyStrength = 75;
      let precedentSupport = 80;
      let courtRisk = 'Moderate';

      try {
        const strengthMatch = responseText.match(/Strategy Score:\s*(\d+)%/i) || responseText.match(/Strategy Strength:\s*(\d+)%/i);
        if (strengthMatch) {
          strategyStrength = parseInt(strengthMatch[1]);
          precedentSupport = Math.min(98, strategyStrength + 6);
        }

        const riskMatch = responseText.match(/Litigation Risk:\s*(\w+)/i) || responseText.match(/Risk Level:\s*(\w+)/i);
        if (riskMatch) {
          const parsedRisk = riskMatch[1].trim();
          if (['High', 'Moderate', 'Low'].includes(parsedRisk)) courtRisk = parsedRisk;
        }
      } catch (err) {
        console.log("[Parsing Strategy Stats] Fallback used", err);
      }

      const newStrategy = {
        id: Date.now().toString(),
        title: stateToUse.title,
        caseFacts: stateToUse.caseFacts,
        timestamp: new Date().toLocaleString(),
        stats: { strategyStrength, courtRisk, precedentSupport, confidenceRate: 95 },
        report: responseText
      };

      setActiveStrategy(newStrategy);
      setStrategyResult(newStrategy);
      await saveStrategyToHistory(newStrategy);
      toast.success("Litigation strategy generated!", { id: tid });
    } catch (error) {
      console.error('[StrategyEngine] API Error:', error);
      toast.error("Failed to build strategy plan.", { id: tid });
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
          title: caseTitle || 'Litigation Strategy Report',
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
        <h1>AISA COURTROOM LITIGATION STRATEGY</h1>
        <p><strong>Simulation Date:</strong> ${new Date().toLocaleDateString()}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;"/>
        ${parsedReport}
        <div class="footer">Generated by AISA Litigation Strategy Engine - ${new Date().toLocaleDateString()}</div>
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

  const stats = activeStrategy ? activeStrategy.stats : { strategyStrength: '--', courtRisk: '--', precedentSupport: '--', confidenceRate: '--' };

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
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">Strategy Engine</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">LITIGATION WAR ROOM ACTIVE</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setHistoryVisible(true)} 
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/30 rounded-xl text-xs font-black uppercase tracking-wider"
        >
          <History size={14} />
          <span>Strategy Archive</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar min-h-0 select-text">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Stats Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1A2540] rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <TrendingUp className="text-emerald-500" size={20} />
              <span className="text-lg font-black text-emerald-500 mt-2">{stats.strategyStrength}{stats.strategyStrength !== '--' ? '%' : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Strategy Score</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <AlertTriangle className={stats.courtRisk === 'High' ? 'text-red-500' : 'text-amber-505'} size={20} />
              <span className={`text-lg font-black mt-2 ${stats.courtRisk === 'High' ? 'text-red-500' : 'text-amber-500'}`}>{stats.courtRisk}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Litigation Risk</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Scale className="text-indigo-500" size={20} />
              <span className="text-lg font-black text-indigo-500 mt-2">{stats.precedentSupport}{stats.precedentSupport !== '--' ? '%' : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Precedent Support</span>
            </div>
            <div className="bg-white dark:bg-[#1A2540] rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <Brain className="text-pink-500" size={20} />
              <span className="text-lg font-black text-pink-500 mt-2">{stats.confidenceRate}{stats.confidenceRate !== '--' ? '%' : ''}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">AI Confidence</span>
            </div>
          </div>

          {/* Quick Tools Grid Section */}
          <div className="bg-white dark:bg-[#1A2540] rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4">SPECIALIZED WAR ROOM ROADMAPS</h3>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5">
                <Search className="text-slate-400 mr-2 shrink-0" size={16} />
                <input 
                  type="text" 
                  placeholder="Search strategies..."
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                  value={toolsSearchQuery}
                  onChange={e => setToolsSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
                {['All', 'Criminal', 'Civil', 'Corporate', 'Cyber', 'Trial'].map(cat => (
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
                  onClick={() => triggerQuickTool(t.id, t.name)}
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
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">Active Case: {prefillBanner.caseTitle}</p>
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/60 font-medium mt-0.5">Case facts pre-loaded — click Simulate or Generate Roadmap</p>
              </div>
              <button onClick={() => setPrefillBanner(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full text-emerald-500 shrink-0"><X size={13} /></button>
            </div>
          )}

          {/* Form and Input Area */}
          <div className="bg-white dark:bg-[#1A2540] rounded-3xl p-6 shadow-md space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">AI LITIGATION SCENARIO ARCHITECT</h3>
            </div>

            {/* Case Sync */}
            {allProjects.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Link to MyCase</label>
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

            {/* Case Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Matter Name</label>
              <input
                type="text"
                placeholder="e.g. Injunction against Tenant eviction"
                value={caseTitle}
                onChange={e => setCaseTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-bold outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Case Facts */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Case Facts & Scenario</label>
              <textarea
                rows={5}
                placeholder="Describe current case stage, timeline, dispute details..."
                value={caseFacts}
                onChange={e => setCaseFacts(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-medium outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>

            {/* Options Row */}
            <div className="flex gap-4">
              <button
                onClick={() => runStrategyAuditor({ title: caseTitle, caseFacts, mode: 'strategy' })}
                disabled={isAuditing}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                Simulate Strategy Report
              </button>
              <button
                onClick={() => runStrategyAuditor({ title: caseTitle, caseFacts, mode: 'roadmap' })}
                disabled={isAuditing}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                Generate Milestone Roadmap
              </button>
            </div>
          </div>

          {/* Thinking State */}
          {isAuditing && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-500 animate-pulse">Running scenario engine calculations...</span>
            </div>
          )}

          {/* Result Strategy Report */}
          {strategyResult && (
            <div ref={scrollRef} className="bg-white dark:bg-[#1A2540] rounded-3xl p-6 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="text-emerald-500" size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">LITIGATION WAR ROOM STRATEGY REPORT</h3>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleCopy(strategyResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-indigo-600"
                    title="Copy Strategy"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={() => handleShare(strategyResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-indigo-600"
                    title="Share Strategy"
                  >
                    <Share2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleSpeech(strategyResult.report)}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg ${isSpeaking ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' : 'text-slate-500'}`}
                    title="Speak Strategy"
                  >
                    <Mic size={14} />
                  </button>
                  <button 
                    onClick={() => handleExportPDF(strategyResult.report)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-indigo-600 hover:text-indigo-700"
                    title="Print PDF"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap select-text leading-relaxed text-slate-800 dark:text-slate-200">
                {strategyResult.report}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* History Modal */}
      {historyVisible && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setHistoryVisible(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-[32px] max-w-lg w-full max-h-[80%] flex flex-col overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 shrink-0">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Litigation Strategy Logs</h3>
              <button onClick={() => setHistoryVisible(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 mt-4 shrink-0">
              <Search size={16} className="text-slate-400 mr-2" />
              <input 
                type="text"
                placeholder="Search strategies..."
                className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-3 custom-scrollbar">
              {historyData.filter(h => 
                h.title?.toLowerCase().includes(historySearch.toLowerCase()) || 
                h.caseFacts?.toLowerCase().includes(historySearch.toLowerCase())
              ).map(item => (
                <div key={item.id} className="flex justify-between items-start p-4 bg-slate-50 dark:bg-[#1A2540] rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <button
                    onClick={() => {
                      setActiveStrategy(item);
                      setStrategyResult(item);
                      setHistoryVisible(false);
                      toast.success(`Loaded strategy: ${item.title}`);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.title}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{item.timestamp}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium line-clamp-2">{item.caseFacts}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[9px] font-bold text-indigo-600 rounded-md">Score: {item.stats.strategyStrength}%</span>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-[9px] font-bold text-emerald-600 rounded-md">Risk: {item.stats.courtRisk}</span>
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
                  <p className="text-xs font-semibold text-slate-400 mt-2">No roadmaps archived.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyEngine;
