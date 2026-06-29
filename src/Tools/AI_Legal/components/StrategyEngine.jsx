import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Plus, FileText, Copy, 
  Share2, FileDown, History, Search, X, Shield, Clock, 
  Brain, Scale, BookOpen, AlertTriangle, TrendingUp, Mic, 
  Database, Cpu, Briefcase, Building2, Landmark, Folder, Printer, CheckCircle2,
  Award, Check, Eye, RefreshCw, Send, AlertCircle, Trash2
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

// Specialized litigation roadmap templates
const allTools = [
  { id: 'Bail', name: 'Bail Strategy', desc: 'Pre-arrest roadmap & stay', category: 'Criminal' },
  { id: 'Criminal', name: 'Criminal Defense', desc: 'Theft & investigation plans', category: 'Criminal' },
  { id: 'Civil', name: 'Civil Litigation', desc: 'Damages & contract breach', category: 'Civil' },
  { id: 'Cyber', name: 'Cyber Crime Plan', desc: 'Digital theft & forensics logs', category: 'Cyber' },
  { id: 'AnticipatoryBail', name: 'Anticipatory Bail', desc: 'Preventive arrest & warrants', category: 'Criminal' },
  { id: 'FIRResponse', name: 'FIR Response', desc: 'Quashing petitions & counter', category: 'Criminal' },
  { id: 'EvidencePlanning', name: 'Evidence Planning', desc: 'Municipal & land deed records', category: 'Civil' },
  { id: 'AppealStrategy', name: 'Appeal Strategy', desc: 'High Court & judicial errors', category: 'Civil' },
  { id: 'CrossExamination', name: 'Cross Examination', desc: 'Witness questioning strategies', category: 'Trial' },
  { id: 'WitnessPreparation', name: 'Witness Preparation', desc: 'Testimony guidelines & chief', category: 'Trial' },
  { id: 'SettlementStrategy', name: 'Settlement Plan', desc: 'Mediation & trade settlement', category: 'Corporate' },
];

const LITIGATION_SYSTEM_PROMPT = `You are a professional courtroom litigation attorney and judicial strategy architect.
Analyze the provided legal matter facts. Output your complete strategy assessment as a single valid JSON object.
Do NOT write conversational text outside the "json" code block. Double quote keys.

JSON Schema:
{
  "stats": {
    "overallStrategyScore": <Integer 0-100>,
    "winningProbability": <Integer 0-100>,
    "litigationRisk": <Integer 0-100>,
    "evidenceStrength": <Integer 0-100>,
    "precedentSupport": <Integer 0-100>,
    "aiConfidence": <Integer 0-100>,
    "courtReadiness": <Integer 0-100>,
    "missingEvidenceCount": <Integer>,
    "missingDocumentsCount": <Integer>,
    "settlementProbability": <Integer 0-100>,
    "appealRisk": <Integer 0-100>,
    "opponentRiskLevel": "<Low | Medium | High>"
  },
  "strategies": {
    "primary": { "title": "Primary Legal Strategy", "description": "Courtroom arguments focus on this central claim." },
    "alternative": { "title": "Alternative Legal Strategy", "description": "Secondary line of defense if primary is challenged." },
    "backup": { "title": "Backup Safety Strategy", "description": "Procedural actions to execute." },
    "emergency": { "title": "Emergency Escalation Strategy", "description": "Filing stays or appeals immediately." }
  },
  "winningRoadmap": [
    { "stage": "Investigation", "status": "Completed", "description": "Forensic timeline of events compiled." },
    { "stage": "Evidence Collection", "status": "In Progress", "description": "Staging municipal records and deeds." },
    { "stage": "Notice", "status": "Staged", "description": "Send legal demand notice to opposite party." },
    { "stage": "Filing", "status": "Staged", "description": "File main suit/petition in registry." },
    { "stage": "Interim Relief", "status": "Staged", "description": "File injunction or temporary stay petition." },
    { "stage": "Witness Examination", "status": "Staged", "description": "Chief examination of primary client." },
    { "stage": "Cross Examination", "status": "Staged", "description": "Expose hostile contradictions." },
    { "stage": "Final Arguments", "status": "Staged", "description": "Synthesize case law precedents." },
    { "stage": "Judgment", "status": "Staged", "description": "Wait for decree or judicial order." },
    { "stage": "Appeal", "status": "Staged", "description": "Prepare grounds of appeal if required." }
  ],
  "evidenceStrategy": {
    "strong": [{ "evidence": "Primary proof name", "reason": "Why it is legally binding" }],
    "weak": [{ "evidence": "Corroborative proof", "reason": "Why it lacks direct force" }],
    "missing": [{ "evidence": "Missing record", "reason": "Need to request immediately" }],
    "priority": [{ "evidence": "High priority record", "reason": "Should secure first" }],
    "sequence": ["Evidence Step 1", "Evidence Step 2"]
  },
  "witnessStrategy": {
    "key": [{ "witness": "Key witness role", "purpose": "Explain facts of event" }],
    "optional": [{ "witness": "Optional character witness", "purpose": "Support credibility" }],
    "weak": [{ "witness": "Vulnerable witness", "purpose": "Susceptible to timelines" }],
    "crossExamination": [
      { "topic": "Credibility challenge", "questions": ["Question 1?"], "followUps": ["Follow-up?"], "traps": ["Trap question?"] }
    ]
  },
  "opponentStrategy": {
    "likelyDefence": "Summary of likely opposition defense tactics",
    "likelyObjections": ["Objection 1", "Objection 2"],
    "counterArguments": ["Counter 1", "Counter 2"],
    "appealPossibility": "High probability of appeal to higher court",
    "delayStrategy": "Likely to seek frequent adjournments using procedural rules"
  },
  "counterStrategy": [
    { "opponentArgument": "Opponent claim", "counterResponse": "Your rebuttal", "evidenceRequired": "Proof to rebut", "applicableLaw": "BSA or CPC rule", "recommendedAction": "Action to take" }
  ],
  "judgePerspective": {
    "likelyQuestions": ["Judicial question 1?"],
    "courtConcerns": ["Concern 1", "Concern 2"],
    "weakAreas": ["Weak link in case"],
    "legalObservations": ["Relevant judicial observations"],
    "expectedFocusAreas": ["Primary focus points"]
  },
  "precedents": [
    { "citation": "Supreme Court Citation", "court": "Supreme Court of India", "summary": "Core legal principle settled", "similarityScore": 95, "type": "Binding Precedent" }
  ],
  "laws": [
    { "section": "Section code", "act": "BSA / BNS / CPC / IT Act", "applicability": "Applicability details" }
  ],
  "timeline": [
    { "phase": "Notice Stage", "duration": "15 Days", "description": "Drafting and dispatching legal notice." }
  ],
  "risks": {
    "legal": 20,
    "evidence": 30,
    "procedural": 10,
    "financial": 40,
    "strategic": 15,
    "riskPercentage": 25
  },
  "settlement": {
    "settlementChance": 50,
    "negotiationStrategy": "Mediation approach details",
    "mediationPossibility": "High mediation suitability",
    "arbitrationSuitability": "Arbitration clauses valid"
  },
  "negotiationPositions": {
    "opening": "Opening negotiation demands",
    "middle": "Realistic middle ground demands",
    "final": "Bottom line target",
    "fallback": "Litigation recovery fallback"
  },
  "crossExamPlanner": [
    { "witness": "Witness name", "mainQuestions": ["Q1"], "followUps": ["F1"], "contradictionQuestions": ["C1"], "credibilityQuestions": ["CR1"], "closingQuestions": ["CL1"] }
  ],
  "finalArguments": {
    "opening": "Opening statement outlines",
    "arguments": ["Legal argument 1"],
    "evidenceRefs": ["Evidence reference code"],
    "laws": ["Statutory section"],
    "precedents": ["Precedents citation"],
    "prayer": "prayer request to court",
    "submission": "Final submission request"
  },
  "appealStrategy": {
    "grounds": ["Ground 1", "Ground 2"],
    "timeline": "30 days from decree copy",
    "additionalEvidence": ["Additional documents needed"],
    "higherCourtStrategy": "High Court approach"
  },
  "readiness": {
    "evidence": 80,
    "witness": 70,
    "documentation": 75,
    "argument": 85,
    "overall": 77
  },
  "pendingTasks": [
    { "task": "Collect registry petition copy", "completed": false },
    { "task": "File vakalatnama and memo", "completed": false }
  ],
  "aiRecommendations": {
    "doFirst": ["Action 1"],
    "doNext": ["Action 2"],
    "avoid": ["Action to avoid"],
    "criticalIssues": ["Critical issue identified"],
    "priorityImprovements": ["Priority improvement needed"]
  }
}`;

const StrategyEngine = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';
  
  // Platform States
  const [caseTitle, setCaseTitle] = useState('');
  const [caseFacts, setCaseFacts] = useState('');
  const [linkedCaseId, setLinkedCaseId] = useState(currentCase?._id || '');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Get active case context for auto-running
  const activeCaseContext = useActiveCase();
  const triggerAutoRun = activeCaseContext?.triggerAutoRun;

  // Active Case Auto-load flag
  const [useActiveCase, setUseActiveCase] = useState(!!currentCase);

  // Simulation & Loader States
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState('');
  const [strategyResult, setStrategyResult] = useState(null);
  
  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'roadmap' | 'evidence' | 'opponent' | 'judge' | 'precedents' | 'negotiation' | 'planner' | 'readiness' | 'logs'
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Audit Logs & Task Manager
  const [auditLogs, setAuditLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');

  const scrollRef = useRef(null);
  const isMountedRef = useRef(true);

  // ─ Language Toggle ───────────────────────────────────────────
  const {
    outputLang,
    setOutputLang,
    isTranslating: isStrategyTranslating,
    setIsTranslating: setIsStrategyTranslating,
    translateText: translateStrategyText,
    getDisplayText: getStrategyDisplayText,
  } = useOutputLanguage('strategy_engine', currentCase?._id || 'global');

  // Per-section display text state
  const [strategyDisplayTexts, setStrategyDisplayTexts] = useState({});

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const buildSummaryText = useCallback((result) => {
    if (!result) return '';
    const strats = result.strategies || {};
    return [
      `PRIMARY: ${strats.primary?.description || ''}`,
      `ALTERNATIVE: ${strats.alternative?.description || ''}`,
      `BACKUP: ${strats.backup?.description || ''}`,
      `EMERGENCY: ${strats.emergency?.description || ''}`,
      `OPINION: ${result.finalOpinion?.reasoning || ''}`,
    ].join('\n\n');
  }, []);

  const parseTranslatedSummary = (translated, original) => {
    const lines = translated.split(/\n\n/);
    const keys = ['primary', 'alternative', 'backup', 'emergency', 'opinion'];
    const result = {};
    keys.forEach((key, i) => {
      const line = lines[i] || '';
      const colonIdx = line.indexOf(':');
      result[key] = colonIdx !== -1 ? line.slice(colonIdx + 1).trim() : line.trim() || original[key] || '';
    });
    return result;
  };

  const handleStrategyLangChange = useCallback(async (newLang) => {
    setOutputLang(newLang);
    if (!strategyResult) return;
    if (newLang === 'en') {
      setStrategyDisplayTexts({});
      return;
    }
    const summary = buildSummaryText(strategyResult);
    const cached = getStrategyDisplayText(summary);
    if (cached && cached !== summary) {
      const originalTexts = {
        primary: strategyResult.strategies?.primary?.description || '',
        alternative: strategyResult.strategies?.alternative?.description || '',
        backup: strategyResult.strategies?.backup?.description || '',
        emergency: strategyResult.strategies?.emergency?.description || '',
        opinion: strategyResult.finalOpinion?.reasoning || '',
      };
      setStrategyDisplayTexts(parseTranslatedSummary(cached, originalTexts));
      return;
    }
    setIsStrategyTranslating(true);
    try {
      const translated = await translateStrategyText(summary);
      if (!isMountedRef.current) return;
      const originalTexts = {
        primary: strategyResult.strategies?.primary?.description || '',
        alternative: strategyResult.strategies?.alternative?.description || '',
        backup: strategyResult.strategies?.backup?.description || '',
        emergency: strategyResult.strategies?.emergency?.description || '',
        opinion: strategyResult.finalOpinion?.reasoning || '',
      };
      setStrategyDisplayTexts(parseTranslatedSummary(translated, originalTexts));
    } catch {
      // stay original
    } finally {
      if (isMountedRef.current) setIsStrategyTranslating(false);
    }
  }, [strategyResult, buildSummaryText, getStrategyDisplayText, setOutputLang, setIsStrategyTranslating, translateStrategyText]);

  // Helper: get translated text or fallback
  const sText = useCallback((key, fallback) => {
    if (outputLang === 'en' || !strategyDisplayTexts[key]) return fallback;
    return strategyDisplayTexts[key];
  }, [outputLang, strategyDisplayTexts]);

  // Reset display on new result
  useEffect(() => {
    if (strategyResult) {
      setStrategyDisplayTexts({});
      setOutputLang('en');
    }
  }, [strategyResult]); // eslint-disable-line

  // --- Hydration & Setup ---
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
      setUseActiveCase(true);
      autoLoadCaseDetails(currentCase);
    }
  }, [currentCase]);

  // Execute Auto-Run if intended by Context
  useEffect(() => {
    if (triggerAutoRun && currentCase && !strategyResult && !isAuditing) {
      toast.success(`✓ Case workspace prefilled successfully`, { icon: '🏛️' });
      runLitigationSimulation(currentCase);
    }
  }, [triggerAutoRun, currentCase, strategyResult, isAuditing]);

  const resetPlatformState = () => {
    setCaseTitle('');
    setCaseFacts('');
    setStrategyResult(null);
    setAuditLogs([]);
    setTasks([]);
  };

  const hydrateFromCase = (caseObj) => {
    if (!caseObj) return;
    const ls = caseObj.litigationStrategy;
    if (ls) {
      setCaseTitle(ls.caseTitle || caseObj.name || '');
      setCaseFacts(ls.caseFacts || caseObj.description || '');
      setStrategyResult(ls.activeStrategy || null);
      setTasks(ls.tasks || []);
      setAuditLogs(ls.auditLogs || []);
    } else {
      resetPlatformState();
      setCaseTitle(caseObj.name || '');
      setCaseFacts(caseObj.description || '');
    }
  };

  // Auto load context variables when "Use Active Case" is enabled
  const autoLoadCaseDetails = (targetCase) => {
    const activeObj = targetCase || currentCase || allProjects.find(p => p._id === linkedCaseId);
    if (!activeObj) return;

    const mapped = mapCaseToForm(activeObj);
    const title = activeObj.name || activeObj.title || '';
    
    // Assemble visual context facts outline from ALL available data
    const assembledFacts = [
      `Case ID: ${activeObj._id || activeObj.id || 'N/A'}`,
      `Court: ${mapped.courtName || 'District/High Court'}`,
      `Client Name (Party 1): ${mapped.petitioner || 'N/A'}`,
      `Opposing Party (Opponent): ${mapped.respondent || 'N/A'}`,
      `Case Category/Type: ${mapped.caseType || 'Litigation'}`,
      `Case Number: ${mapped.caseNumber || 'N/A'}`,
      `Timeline & Important Dates: ${activeObj.hearingDate || activeObj.timeline || 'N/A'}`,
      `Witnesses & Evidence Matrix: ${mapped.evidenceSummary || 'N/A'}`,
      `Uploaded Documents Summary: ${Array.isArray(activeObj.documents) ? activeObj.documents.map(d => d.name).join(', ') : 'No documents'}`,
      `Previous Notes & Drafts: ${activeObj.notes || mapped.notes || ''}`,
      `Case Summary/Arguments:\n${mapped.caseFacts || activeObj.description || ''}`
    ].filter(Boolean).join('\n');

    setCaseTitle(title);
    setCaseFacts(assembledFacts);
  };

  const handleUseActiveCaseToggle = (checked) => {
    setUseActiveCase(checked);
    if (checked) {
      autoLoadCaseDetails();
    } else {
      resetPlatformState();
      if (currentCase) {
        setCaseTitle(currentCase.name || '');
        setCaseFacts(currentCase.description || '');
      }
    }
  };

  // Ensure case is created in database (Manual fallback)
  const ensureCaseCreated = async () => {
    let activeId = linkedCaseId || currentCase?._id;
    let activeProj = currentCase || allProjects.find(p => p._id === activeId);

    if (!activeId) {
      setIsSyncing(true);
      const title = `Litigation Strategy: ${caseTitle || 'Custom Courtroom Matter'}`;
      try {
        const newProj = await apiService.createProject({
          name: title,
          isLegalCase: true,
          description: `Automatically created for litigation strategy of ${caseTitle || 'matter'}.`
        });
        activeId = newProj._id;
        activeProj = newProj;
        setLinkedCaseId(activeId);
        if (onUpdateCase) onUpdateCase(newProj);
        toast.success(`📁 Database Case created: "${title}"`);
      } catch (e) {
        console.error("Auto-create case failed", e);
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
      const currentLs = activeProj?.litigationStrategy || {};
      const payload = {
        ...activeProj,
        litigationStrategy: {
          ...currentLs,
          caseTitle,
          caseFacts,
          activeStrategy: strategyResult,
          tasks,
          auditLogs,
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

  // Push audit logs
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

    await syncToDatabase({ auditLogs: updatedLogs });
  };

  // --- Task Manager & Checklist ---
  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    const newTask = {
      id: `task_${Date.now()}`,
      task: newTaskText.trim(),
      completed: false
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setNewTaskText('');

    await syncToDatabase({ tasks: updatedTasks });
    await logAudit("Task Appended", `Added procedural strategy task: "${newTask.task}"`);
    toast.success("Task appended to checklist.");
  };

  const handleToggleTask = async (taskId) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    setTasks(updatedTasks);

    await syncToDatabase({ tasks: updatedTasks });
    const target = tasks.find(t => t.id === taskId);
    await logAudit("Task Toggled", `Marked task "${target.task}" as ${!target.completed ? 'COMPLETED' : 'PENDING'}`);
  };

  const handleDeleteTask = async (taskId) => {
    const target = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);

    await syncToDatabase({ tasks: updatedTasks });
    await logAudit("Task Deleted", `Removed task: "${target.task}"`);
  };

  // --- Dynamic Court Readiness Score ---
  const readinessMetrics = useMemo(() => {
    if (strategyResult && strategyResult.readiness) {
      const base = strategyResult.readiness;
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      const taskPercentage = totalTasks > 0 ? Math.round((completedTasks * 100) / totalTasks) : 100;
      
      const overall = Math.round((base.evidence + base.witness + base.documentation + base.argument + taskPercentage) / 5);
      return {
        ...base,
        taskPercentage,
        overall
      };
    }
    return {
      evidence: '--',
      witness: '--',
      documentation: '--',
      argument: '--',
      taskPercentage: '--',
      overall: '--'
    };
  }, [strategyResult, tasks]);

  // --- AI Litigation Auditor ---
  const runLitigationSimulation = async (forceCase = null) => {
    const targetCase = forceCase || currentCase;
    if (!caseFacts.trim() && targetCase) {
      // Auto-load if facts are missing but active case exists
      autoLoadCaseDetails(targetCase);
    }
    
    // Check again after potentially auto-loading
    setTimeout(async () => {
      const currentFacts = caseFacts.trim() || targetCase?.description || '';
      const currentTitle = caseTitle.trim() || targetCase?.name || '';
      
      if (!currentFacts) {
        toast.error("Please provide case facts or load templates first.");
        return;
      }

      const { activeId } = await ensureCaseCreated();

      setIsAuditing(true);
      setStrategyResult(null);
      setAuditStep('Contextualizing case facts...');

      const toastId = toast.loading("AI War Room calculating legal exposure & roadmap...");

      try {
        setAuditStep('Precedents database search...');
        const response = await generateChatResponse(
          [],
          `Matter Title: ${currentTitle || 'Custom Courtroom Strategy'}\n\nCase Facts Scenario:\n${currentFacts}`,
          LITIGATION_SYSTEM_PROMPT,
          [],
          'English',
          null,
          'legal'
        );

        const responseText = typeof response === 'string' ? response : (response?.reply || '');
        
        if (responseText.includes("System Busy") || responseText.includes("System Message") || responseText.includes("System Error")) {
            throw new Error(responseText);
        }
        
        let parsed = null;
        try {
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/(\{[\s\S]*\})/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } else {
            parsed = JSON.parse(responseText.trim());
          }
        } catch (err) {
          console.error("JSON parsing failed. Raw response:", responseText);
          throw new Error("AI returned invalid JSON format.");
        }

        if (!parsed || !parsed.stats) {
          throw new Error("Unable to parse structured litigation strategy metrics.");
        }

        setStrategyResult(parsed);
        
        // Seed task manager with generated tasks
        if (parsed.pendingTasks?.length > 0) {
          const newTasks = parsed.pendingTasks.map((t, idx) => ({
            id: `task_${Date.now()}_${idx}`,
            task: t.task,
            completed: false
          }));
          setTasks(newTasks);
          await syncToDatabase({
            activeStrategy: parsed,
            tasks: newTasks
          });
        } else {
          await syncToDatabase({
            activeStrategy: parsed
          });
        }

        toast.success("AI litigation strategy compiled!", { id: toastId });

        // Save audit log
        const timestamp = new Date().toISOString();
        const userEmail = getUserData()?.email || 'System User';
        const userName = getUserData()?.name || 'Advocate';
        const newLog = {
          timestamp,
          action: 'AI Litigation Strategy Simulated',
          details: `Simulated legal exposure. Winning Probability: ${parsed.stats.winningProbability}%. Risk Rating: ${parsed.stats.opponentRiskLevel}. Court Readiness: ${parsed.stats.courtReadiness}%. Mapped ${parsed.precedents?.length || 0} precedents.`,
          editedBy: `${userName} (${userEmail})`
        };
        const updatedLogs = [...auditLogs, newLog];
        setAuditLogs(updatedLogs);
        await syncToDatabase({ auditLogs: updatedLogs });

      } catch (e) {
        console.error("Litigation Simulation Error:", e);
        const errMsg = e.message || String(e);
        toast.error(errMsg.length < 100 ? errMsg : "Failed to compile litigation strategy.", { id: toastId });
      } finally {
        setIsAuditing(false);
        setAuditStep('');
      }
    }, 0);
  };

  // --- Exports & Sharing ---
  const handleCopyReport = () => {
    if (!strategyResult) return;
    const reportText = JSON.stringify(strategyResult, null, 2);
    navigator.clipboard.writeText(reportText);
    toast.success("Litigation JSON report copied to clipboard!");
    logAudit("Copied Strategy Report", "Copied litigation strategy report.");
  };

  const handleShareReport = async () => {
    if (!strategyResult) return;
    const shareText = `AISA Litigation Strategy for ${caseTitle}. Winning Prob: ${strategyResult.stats?.winningProbability}%. Risk: ${strategyResult.stats?.opponentRiskLevel}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Strategy Report: ${caseTitle}`, text: shareText });
        logAudit("Shared Strategy Report", "Shared strategy metadata report.");
      } catch (e) { console.log(e); }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Summary copied!");
    }
  };

  const handleSpeechSummary = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (strategyResult) {
      const text = `Litigation Strategy Summary for ${caseTitle}. Winning probability is ${strategyResult.stats?.winningProbability} percent. Court readiness is ${strategyResult.stats?.courtReadiness} percent. Litigation risk is ${strategyResult.stats?.litigationRisk} percent. Primary Strategy: ${strategyResult.strategies?.primary?.description}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handlePrintPDF = () => {
    if (!strategyResult) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Enable popups to print/export PDF.");
      return;
    }

    const isHi = outputLang === 'hi';
    const primaryStr = sText('primary', strategyResult.strategies?.primary?.description);
    const alternativeStr = sText('alternative', strategyResult.strategies?.alternative?.description);
    const backupStr = sText('backup', strategyResult.strategies?.backup?.description);
    const emergencyStr = sText('emergency', strategyResult.strategies?.emergency?.description);
    const opinionStr = sText('opinion', strategyResult.finalOpinion?.reasoning);

    const html = `
      <html>
      <head>
        <meta charset="UTF-8"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet"/>
        <title>${isHi ? "AISA मुकदमा रणनीति रिपोर्ट" : "AISA Litigation Strategy Report"} - ${caseTitle}</title>
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
          .footer { margin-top: 60px; border-top: 1px solid #e2e8f0; font-size: 9pt; text-align: center; padding-top: 15px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 9pt; font-weight: bold; letter-spacing: 2px; color: #4f46e5; margin-bottom: 5px;">${isHi ? "AISA उद्यम मुकदमेबाजी रणनीति" : "AISA ENTERPRISE LITIGATION STRATEGY"}</div>
          <h1 class="title">${isHi ? "एआई कोर्टरूम रणनीति और प्रकटीकरण रिपोर्ट" : "AI Courtroom Strategy & Exposure Report"}</h1>
          <div style="margin-top: 5px; font-size: 11pt;">${isHi ? "विषय" : "Matter"}: <strong>${caseTitle}</strong></div>
        </div>

        <div class="meta-section">
          <div class="meta-grid">
            <div>
              <p><strong>${isHi ? "जीतने की संभावना" : "Winning Probability"}:</strong> ${strategyResult.stats?.winningProbability}%</p>
              <p><strong>${isHi ? "मुकदमेबाजी जोखिम स्कोर" : "Litigation Risk Score"}:</strong> ${strategyResult.stats?.litigationRisk}%</p>
              <p><strong>${isHi ? "नजीर समर्थन" : "Precedent Support"}:</strong> ${strategyResult.stats?.precedentSupport}%</p>
            </div>
            <div>
              <p><strong>${isHi ? "न्यायालय तत्परता रेटिंग" : "Court Readiness Rating"}:</strong> ${strategyResult.stats?.courtReadiness}%</p>
              <p><strong>${isHi ? "एआई विश्वास दर" : "AI Confidence Rate"}:</strong> ${strategyResult.stats?.aiConfidence}%</p>
              <p><strong>${isHi ? "विपक्ष जोखिम स्थिति" : "Opponent Risk Status"}:</strong> ${strategyResult.stats?.opponentRiskLevel}</p>
            </div>
          </div>
        </div>

        <div class="section-title">${isHi ? "1. मुकदमेबाजी रणनीतियों की रूपरेखा" : "1. Litigation Strategies Outline"}</div>
        <p><strong>${isHi ? "प्राथमिक रणनीति" : "Primary strategy"}:</strong> ${primaryStr}</p>
        <p><strong>${isHi ? "वैकल्पिक रणनीति" : "Alternative strategy"}:</strong> ${alternativeStr}</p>
        <p><strong>${isHi ? "बैकअप रणनीति" : "Backup Strategy"}:</strong> ${backupStr}</p>
        <p><strong>${isHi ? "आपातकालीन रणनीति" : "Emergency Strategy"}:</strong> ${emergencyStr}</p>
        <p><strong>${isHi ? "अंतिम कानूनी राय" : "Final Legal Opinion"}:</strong> ${opinionStr}</p>

        <div class="section-title">${isHi ? "2. जीतने की समयसीमा रोडमैप" : "2. Winning Roadmap timeline"}</div>
        <ul>
          ${strategyResult.winningRoadmap?.map(t => `
            <li style="margin-bottom: 8px;"><strong>${t.stage}:</strong> ${t.description} (Status: ${t.status})</li>
          `).join('') || '<li>None</li>'}
        </ul>

        <div class="section-title">${isHi ? "3. स्वीकार्य साक्ष्य रणनीति" : "3. Admissible Evidence Strategy"}</div>
        <p><strong>${isHi ? "सबसे मजबूत साक्ष्य" : "Strongest Evidence"}:</strong></p>
        <ul>${strategyResult.evidenceStrategy?.strong?.map(e => `<li>${e.evidence}: ${e.reason}</li>`).join('') || '<li>None</li>'}</ul>
        <p><strong>${isHi ? "लापता मुख्य साक्ष्य" : "Missing Key Evidence"}:</strong></p>
        <ul>${strategyResult.evidenceStrategy?.missing?.map(e => `<li>${e.evidence}: ${e.reason}</li>`).join('') || '<li>None</li>'}</ul>

        <div class="section-title">${isHi ? "4. न्यायिक मिसालें और उद्धरण" : "4. Judicial Precedents & Citations"}</div>
        <ul>
          ${strategyResult.precedents?.map(p => `
            <li style="margin-bottom: 10px;">
              <strong>${p.citation}</strong> (${p.court}) - Similarity: ${p.similarityScore}%
              <br/><span style="font-size: 10pt; color: #4b5563;">Summary: ${p.summary}</span>
            </li>
          `).join('') || '<li>None</li>'}
        </ul>

        <div class="footer">
          ${isHi ? `AISA मुकदमेबाजी रणनीति प्लेटफॉर्म द्वारा स्वचालित रूप से उत्पन्न - ${new Date().toLocaleString()}` : `Generated automatically by AISA Litigation Strategy Platform on ${new Date().toLocaleString()}`}
          <br/>Authentic case counsel records copy.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      logAudit("Exported PDF Strategy", "Exported printable litigation strategy PDF report.");
    }, 500);
  };

  const handleExportDoc = () => {
    if (!strategyResult) return;
    const isHi = outputLang === 'hi';
    const primaryStr = sText('primary', strategyResult.strategies?.primary?.description);
    const alternativeStr = sText('alternative', strategyResult.strategies?.alternative?.description);
    const backupStr = sText('backup', strategyResult.strategies?.backup?.description);
    const emergencyStr = sText('emergency', strategyResult.strategies?.emergency?.description);
    const opinionStr = sText('opinion', strategyResult.finalOpinion?.reasoning);

    const docContent = `
${isHi ? "AISA मुकदमेबाजी रणनीति प्लेटफार्म रिपोर्ट" : "AISA LITIGATION STRATEGY PLATFORM REPORT"}
========================================

${isHi ? "विषय" : "Matter"}: ${caseTitle}
${isHi ? "सिम्युलेटेड दिनांक" : "Simulated Date"}: ${new Date().toLocaleDateString()}
${isHi ? "जीतने की संभावना" : "Winning Probability"}: ${strategyResult.stats?.winningProbability}%
${isHi ? "मुकदमेबाजी जोखिम स्कोर" : "Litigation Risk Score"}: ${strategyResult.stats?.litigationRisk}%
${isHi ? "नजीर समर्थन" : "Precedent Support"}: ${strategyResult.stats?.precedentSupport}%
${isHi ? "समग्र तत्परता स्कोर" : "Overall Readiness Score"}: ${readinessMetrics.overall}%

${isHi ? "रणनीतिक संक्षिप्त विवरण:" : "STRATEGIC BRIEF:"}
----------------
- ${isHi ? "प्राथमिक बचाव" : "Primary Defense"}: ${primaryStr}
- ${isHi ? "वैकल्पिक बचाव" : "Alternative Defense"}: ${alternativeStr}
- ${isHi ? "बैकअप रणनीति" : "Backup Strategy"}: ${backupStr}
- ${isHi ? "आपातकालीन कार्रवाई" : "Emergency Action"}: ${emergencyStr}
- ${isHi ? "अंतिम राय" : "Final Opinion"}: ${opinionStr}

${isHi ? "न्यायालय मील के पत्थर रोडमैप:" : "COURTROOM MILESTONES ROADMAP:"}
-----------------------------
${strategyResult.winningRoadmap?.map((t, idx) => `${idx + 1}. ${t.stage} [${t.status}]: ${t.description}`).join('\n')}

${isHi ? "साक्ष्य और अभिरक्षा रणनीति:" : "EVIDENCE & CUSTODY STRATEGY:"}
----------------------------
${isHi ? "मजबूत तत्व" : "Strong Elements"}:
${strategyResult.evidenceStrategy?.strong?.map(e => `* ${e.evidence} - ${e.reason}`).join('\n')}
${isHi ? "लापता तत्व" : "Missing Elements"}:
${strategyResult.evidenceStrategy?.missing?.map(e => `* ${e.evidence} - ${e.reason}`).join('\n')}
${isHi ? "प्राथमिकता अनुक्रमण" : "Priority sequencing"}:
${strategyResult.evidenceStrategy?.sequence?.map((s, i) => `  Phase ${i + 1}: ${s}`).join('\n')}

${isHi ? "गवाह जिरह की तैयारी:" : "WITNESS CROSS EXAMINATION PREPARATION:"}
-------------------------------------
${isHi ? "मुख्य गवाह" : "Key Witness"}:
${strategyResult.witnessStrategy?.key?.map(w => `* ${w.witness}: ${w.purpose}`).join('\n')}
${isHi ? "विपक्षी जिरह जाल प्रश्न" : "Hostile Cross Trap Questions"}:
${strategyResult.witnessStrategy?.crossExamination?.map(x => `
${isHi ? "विषय" : "Topic"}: ${x.topic}
  ${isHi ? "मुख्य" : "Main"}: ${x.questions?.join(', ')}
  ${isHi ? "जाल" : "Traps"}: ${x.traps?.join(', ')}
`).join('\n')}

${isHi ? "विपक्ष बचाव विश्लेषण:" : "OPPONENT DEFENSE ANALYSIS:"}
--------------------------
- ${isHi ? "अपेक्षित बचाव" : "Expected Defense"}: ${strategyResult.opponentStrategy?.likelyDefence}
- ${isHi ? "प्रत्याशित आपत्तियां" : "Anticipated Objections"}: ${strategyResult.opponentStrategy?.likelyObjections?.join(', ')}
- ${isHi ? "अपेक्षित देरी रणनीति" : "Delay tactics expected"}: ${strategyResult.opponentStrategy?.delayStrategy}

${isHi ? "वैधानिक विधायी इंजन" : "STATUTORY LEGISLATIVE ENGINES (BNS/CPC)"}:
----------------------------------------
${strategyResult.laws?.map(l => `- Section ${l.section} under ${l.act}: ${l.applicability}`).join('\n')}

${isHi ? "बाध्यकारी न्यायिक उद्धरण" : "BINDING JUDICIAL CITATIONS"}:
---------------------------
${strategyResult.precedents?.map(p => `- [${p.similarityScore}% matches] ${p.citation} (${p.court}): ${p.summary}`).join('\n')}

${isHi ? "प्रक्रियात्मक कार्य चेकलिस्ट" : "PROCEDURAL TASKS CHECKLIST"}:
---------------------------
${tasks.map(t => `- [${t.completed ? 'x' : ' '}] ${t.task}`).join('\n')}

${isHi ? "AISA एआई मुकदमेबाजी रणनीति सूट द्वारा उत्पन्न। गोपनीय रिकॉर्ड।" : "Generated by AISA AI Litigation Strategy Suite. Confidential record."}
`;

    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${caseTitle.replace(/\s+/g, '_')}_AISA_Strategy_Report.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logAudit("Downloaded DOCX Strategy", "Downloaded litigation strategy document brief.");
    toast.success("Word document strategy report downloaded!");
  };

  const handleQuickToolSelect = (toolId, toolName) => {
    let facts = '';
    let title = '';
    
    if (toolId === 'Bail') {
      title = 'Bail Application Strategy - Cyber Crime';
      facts = `Filing for Anticipatory Bail in a financial technology embezzlement case. Police are conducting investigation under BNS section 318. Prosecution relies on server logins from the client's home IP address. Client claims shared Wi-Fi networks and arbitrary registration of FIR without prelim audit.`;
    } else if (toolId === 'Criminal') {
      title = 'Criminal Defense Plan - Possession Claim';
      facts = `Accused of possession of stolen artifacts under property theft rules. CCTV evidence is low-frame rates and does not show face. Accused has clean record, established store, and bought items with transaction receipts.`;
    } else if (toolId === 'Civil') {
      title = 'Civil Suits Brief - Contract Delay';
      facts = `Recovery suit for contract delays. Plaintiff demands 12L INR liquidated damages. Defendant states delays are caused by direct delays in designs approval and lack of prompt mobilization payments by the Plaintiff.`;
    } else if (toolId === 'Cyber') {
      title = 'Cyber Forensic Defense Strategy';
      facts = `Server database breach litigation. Opponent alleges security breach from user account. User logs show session tokens were active from overlapping geo-locations (Delhi and Singapore) within 5 minutes.`;
    } else if (toolId === 'AnticipatoryBail') {
      title = 'Anticipatory Bail - Economic Offence';
      facts = `Apprehension of arrest in relation to bank loan default. Matter under corporate scanner. Ready to surrender passport, provide corporate security bonds, and join local police inquiry.`;
    } else if (toolId === 'FIRResponse') {
      title = 'FIR Response Brief';
      facts = `FIR filed alleging cheating. Dispute is purely civil regarding business partnership split. No criminal element. Filing petition under section 482 for quashing FIR.`;
    } else if (toolId === 'EvidencePlanning') {
      title = 'Property Title Evidence Strategy';
      facts = `Title declaration suit. Seeking adverse possession proofs. Overlapping title deeds from 1994. Long-term electricity bills, land revenue taxes, and neighbor testimonies are staged.`;
    } else if (toolId === 'AppealStrategy') {
      title = 'Appeal - Lower Court Injunction Error';
      facts = `Appeal against lower court order refusing interim stay in property eviction. Trial judge failed to weigh balance of convenience and irreparable injury rules.`;
    } else if (toolId === 'CrossExamination') {
      title = 'Cross Examination Roadmap - Contract Witness';
      facts = `Cross-examination of opposing project manager. Witness email logs explicitly admit that project requirements were altered unilaterally midway, contradicting deposition facts.`;
    } else if (toolId === 'WitnessPreparation') {
      title = 'Witness Preparation - Forensic Accountant';
      facts = `Preparing forensic auditor to testify on financial ledger audits. Ready for cross questions regarding auditing methodologies and data sample sizes.`;
    } else if (toolId === 'SettlementStrategy') {
      title = 'Settlement Brief - Franchise Split';
      facts = `ADR mediation regarding contract breach. Opponent demands 50L INR. Client offers 15L settlement backed by documented revenue losses during lockouts.`;
    }

    setCaseTitle(title);
    setCaseFacts(facts);
    toast.success(`Template loaded: ${title}`);
    
    // Auto simulate
    performStrategySimulationInternal(title, facts);
  };

  const performStrategySimulationInternal = async (title, factsText) => {
    setIsAuditing(true);
    setStrategyResult(null);
    setAuditStep('Calculating legal timelines...');
    const toastId = toast.loading("AI War Room compiling litigation report...");

    try {
      const response = await generateChatResponse(
        [],
        `Matter Title: ${title}\n\nCase Facts Scenario:\n${factsText}`,
        LITIGATION_SYSTEM_PROMPT,
        [],
        'English',
        null,
        'legal'
      );

      const responseText = typeof response === 'string' ? response : (response?.reply || '');
      
      if (responseText.includes("System Busy") || responseText.includes("System Message") || responseText.includes("System Error")) {
          throw new Error(responseText);
      }

      let parsed = null;
      try {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          parsed = JSON.parse(responseText.trim());
        }
      } catch (err) {
        console.error("Simulation parse failed. Raw text:", responseText);
        throw new Error("AI returned invalid JSON format.");
      }

      if (!parsed) throw new Error("Parse error.");

      setStrategyResult(parsed);
      if (parsed.pendingTasks?.length > 0) {
        const newTasks = parsed.pendingTasks.map((t, idx) => ({
          id: `task_${Date.now()}_${idx}`,
          task: t.task,
          completed: false
        }));
        setTasks(newTasks);
        await syncToDatabase({ activeStrategy: parsed, tasks: newTasks });
      } else {
        await syncToDatabase({ activeStrategy: parsed });
      }

      toast.success("AI litigation strategy compiled!", { id: toastId });
      
      const timestamp = new Date().toISOString();
      const userEmail = getUserData()?.email || 'System User';
      const userName = getUserData()?.name || 'Advocate';
      const newLog = {
        timestamp,
        action: 'AI Litigation Strategy Simulated',
        details: `Simulated legal exposure. Winning Probability: ${parsed.stats.winningProbability}%. Risk Rating: ${parsed.stats.opponentRiskLevel}. Court Readiness: ${parsed.stats.courtReadiness}%. Mapped ${parsed.precedents?.length || 0} precedents.`,
        editedBy: `${userName} (${userEmail})`
      };
      const updatedLogs = [...auditLogs, newLog];
      setAuditLogs(updatedLogs);
      await syncToDatabase({ auditLogs: updatedLogs });

    } catch (e) {
      console.error("Internal Simulation Error:", e);
      const errMsg = e.message || String(e);
      toast.error(errMsg.length < 100 ? errMsg : "Failed to build litigation strategy.", { id: toastId });
    } finally {
      setIsAuditing(false);
      setAuditStep('');
    }
  };

  // Dynamic statistics
  const stats = useMemo(() => {
    if (strategyResult && strategyResult.stats) {
      return strategyResult.stats;
    }
    return {
      overallStrategyScore: '--',
      winningProbability: '--',
      litigationRisk: '--',
      evidenceStrength: '--',
      precedentSupport: '--',
      aiConfidence: '--',
      courtReadiness: '--',
      missingEvidenceCount: '--',
      missingDocumentsCount: '--',
      settlementProbability: '--',
      appealRisk: '--',
      opponentRiskLevel: '--'
    };
  }, [strategyResult]);

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-50 dark:bg-transparent overflow-hidden select-none">
      
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
            <h2 className={`text-lg font-black leading-none tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>AI Litigation Strategy Platform</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">COURTROOM LITIGATION WAR ROOM ACTIVE</span>
              {isSyncing && (
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider animate-pulse ml-2">✓ DB Synced</span>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={() => setHistoryVisible(true)} 
          className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${isDark ? 'bg-[#1A2540] border-slate-800 text-indigo-400 hover:bg-[#202E50]' : 'bg-indigo-50 border-indigo-200/30 text-indigo-600 hover:bg-indigo-100'}`}
        >
          <History size={14} />
          <span>Strategy Archive</span>
        </button>
      </div>

      {/* Main Panel Layout */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        
        {/* Left Input Sidebar */}
        <div className={`w-80 flex flex-col border-r shrink-0 overflow-y-auto custom-scrollbar p-5 space-y-5 ${isDark ? 'border-slate-800 bg-[#0c1224]' : 'border-slate-200 bg-white'}`}>
          
          {/* Use Active Case Toggle */}
          <div className="flex items-center justify-between p-3.5 border rounded-2xl bg-indigo-500/5 border-indigo-500/10">
            <div className="flex items-center gap-2">
              <Folder size={16} className="text-indigo-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none">Use Active Case</p>
                <p className="text-[8px] text-slate-400 mt-1">Sync case details dossier</p>
              </div>
            </div>
            <input 
              type="checkbox"
              checked={useActiveCase}
              onChange={e => handleUseActiveCaseToggle(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500"
            />
          </div>

          {/* Case Title */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Matter Name</label>
            <input
              type="text"
              placeholder="e.g. Trademark Infringement Suit"
              value={caseTitle}
              onChange={e => setCaseTitle(e.target.value)}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              disabled={useActiveCase}
            />
          </div>

          {/* Case Facts Scenario */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Case Facts Scenario Details</label>
            <textarea
              rows={6}
              placeholder="Describe legal timeline dispute details, evidence, witnesses, previous arguments..."
              value={caseFacts}
              onChange={e => setCaseFacts(e.target.value)}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none resize-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              disabled={useActiveCase}
            />
          </div>

          <button
            onClick={runLitigationSimulation}
            disabled={isAuditing}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            Simulate Litigation Strategy
          </button>

          {/* specialized war room roadmap templates */}
          <div className="border border-slate-250 dark:border-slate-800 rounded-2xl p-4 bg-slate-500/5 space-y-3">
            <h3 className="text-[9px] font-black tracking-widest text-slate-400 uppercase">LOAD TEMPLATE SCENARIOS</h3>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {allTools.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleQuickToolSelect(t.id, t.name)}
                  className={`text-left p-2.5 bg-white dark:bg-[#1A2540] border border-slate-200 dark:border-white/5 rounded-xl transition-all hover:border-indigo-500/40 group flex flex-col justify-between`}
                >
                  <h4 className="text-[10px] font-black text-slate-800 dark:text-white group-hover:text-indigo-500 truncate">{t.name}</h4>
                  <p className="text-[8px] text-slate-400 leading-none mt-1 truncate">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right main workspace view */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar px-6 py-6 space-y-6">
          <div className="max-w-6xl w-full mx-auto space-y-6 select-text">

            {/* Dynamic Litigation stats dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { label: 'Strategy Score', val: stats.overallStrategyScore, col: 'text-indigo-500' },
                { label: 'Winning Prob.', val: stats.winningProbability, col: 'text-emerald-500' },
                { label: 'Litigation Risk', val: stats.litigationRisk, col: 'text-red-500' },
                { label: 'Evidence Strength', val: stats.evidenceStrength, col: 'text-violet-500' },
                { label: 'Precedent Support', val: stats.precedentSupport, col: 'text-emerald-500' },
                { label: 'AI Confidence', val: stats.aiConfidence, col: 'text-pink-500' },
              ].map(s => (
                <div key={s.label} className={`border rounded-2xl p-4 text-center shadow-sm flex flex-col items-center justify-center ${isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className={`text-base font-black ${s.col}`}>{s.val}{s.val !== '--' ? '%' : ''}</span>
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Second row stats */}
            {strategyResult && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 animate-fadeIn">
                {[
                  { label: 'Court Readiness', val: readinessMetrics.overall + '%', col: 'text-indigo-500' },
                  { label: 'Missing Evidence', val: stats.missingEvidenceCount, col: 'text-amber-500' },
                  { label: 'Missing Docs', val: stats.missingDocumentsCount, col: 'text-amber-550' },
                  { label: 'Settlement Prob.', val: stats.settlementProbability + '%', col: 'text-emerald-500' },
                  { label: 'Appeal Risk', val: stats.appealRisk + '%', col: 'text-red-500' },
                  { label: 'Opponent Risk', val: stats.opponentRiskLevel, col: 'text-red-500 font-black' },
                ].map(s => (
                  <div key={s.label} className={`border rounded-2xl p-3 text-center shadow-sm flex flex-col items-center justify-center ${isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className={`text-xs font-black ${s.col}`}>{s.val}</span>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Staged fact view / Initial state */}
            {caseFacts && !strategyResult && !isAuditing && (
              <div className={`p-6 border rounded-3xl text-center shadow-md ${isDark ? 'bg-[#131c31]/20 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Scale className="mx-auto text-indigo-500 mb-3" size={32} />
                <h3 className="text-sm font-black text-slate-850 dark:text-white mb-1.5 uppercase">Case Facts Staged</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mb-4">Litigation details are staged. Run the AI litigation strategy calculator to simulate roadmaps, map precedents, and construct final arguments checklists.</p>
                <button
                  onClick={runLitigationSimulation}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Analyze & Generate Strategy Brief
                </button>
              </div>
            )}

            {/* Audit Status Screen */}
            {isAuditing && (
              <div className={`p-8 border rounded-3xl text-center shadow-md space-y-4 ${isDark ? 'bg-[#131c31]/20 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-indigo-500 animate-pulse uppercase tracking-wider">AISA War Room Active</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{auditStep || 'Simulating litigation outcomes...'}</p>
                </div>
                <div className="w-48 bg-slate-100 dark:bg-black/30 h-1.5 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-indigo-600 animate-progress rounded-full w-2/3" />
                </div>
              </div>
            )}

            {/* Results workspace tabs */}
            {strategyResult && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Tabs selection */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
                  <div className="flex gap-1 overflow-x-auto pb-1.5 no-scrollbar max-w-full">
                    {[
                      { id: 'overview', name: 'Strategies Overview', icon: Gavel },
                      { id: 'roadmap', name: 'Winning Roadmap', icon: TrendingUp },
                      { id: 'evidence', name: 'Evidence & Witness', icon: Shield },
                      { id: 'opponent', name: 'Opponent Strategy', icon: Eye },
                      { id: 'judge', name: 'Precedents & Judge', icon: Landmark },
                      { id: 'negotiation', name: 'Settlement & Neg', icon: Briefcase },
                      { id: 'planner', name: 'Trial Planner', icon: FileText },
                      { id: 'readiness', name: 'Readiness & Tasks', icon: CheckCircle2 },
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

                  {/* Actions bar */}
                  <div className="flex items-center gap-1 shrink-0 ml-2 flex-wrap justify-end">
                    {/* Language Toggle */}
                    <LanguageToggle
                      lang={outputLang}
                      onChange={handleStrategyLangChange}
                      isTranslating={isStrategyTranslating}
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
                      title="Read Aloud Summary"
                    >
                      <Mic size={14} />
                    </button>
                    <button 
                      onClick={handlePrintPDF}
                      className={`p-2 rounded-lg text-indigo-600 hover:text-indigo-750 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Print PDF Strategy"
                    >
                      <Printer size={14} />
                    </button>
                    <button 
                      onClick={handleExportDoc}
                      className={`p-2 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Export Word brief"
                    >
                      <FileDown size={14} />
                    </button>
                  </div>
                </div>

                {/* Workspace tab contents */}
                <div className={`border rounded-3xl p-6 shadow-md min-h-[350px] ${isDark ? 'bg-[#1A2540] border-slate-800' : 'bg-white border-slate-200'}`}>
                  
                  {/* Overview Panel */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Translating indicator */}
                      {isStrategyTranslating && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 animate-pulse">
                          <span className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          अनुवाद हो रहा है...
                        </div>
                      )}
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-200 ${isStrategyTranslating ? 'opacity-50' : 'opacity-100'}`}>
                        {[
                          { key: 'primary', label: 'Primary Legal Strategy', color: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-500' },
                          { key: 'alternative', label: 'Alternative Legal Strategy', color: 'border-violet-500/20 bg-violet-500/5 text-violet-500' },
                          { key: 'backup', label: 'Backup Safety Strategy', color: 'border-amber-500/20 bg-amber-500/5 text-amber-550' },
                          { key: 'emergency', label: 'Emergency Escalation Strategy', color: 'border-red-500/20 bg-red-500/5 text-red-500' },
                        ].map(s => (
                          <div key={s.key} className={`p-5 border rounded-2xl shadow-sm space-y-2 ${s.color}`}>
                            <div className="flex items-center gap-2">
                              <Shield size={16} />
                              <h4 className="text-xs font-black uppercase tracking-wider">{s.label}</h4>
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-250 leading-relaxed">
                              {sText(s.key, strategyResult.strategies?.[s.key]?.description || 'Litigation defense parameter not compiled.')}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI Strategic Counsel Advice</span>
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex items-start gap-3">
                          <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-1 text-xs">
                            <span className="font-black text-emerald-500 uppercase tracking-wider">Litigation Suitability</span>
                            <p className="font-semibold text-slate-600 dark:text-slate-350 leading-normal">{sText('opinion', strategyResult.finalOpinion?.reasoning)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Winning Roadmap Chevron Timelines */}
                  {activeTab === 'roadmap' && (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visual Courtroom Timeline Roadmap</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {strategyResult.winningRoadmap?.map((item, idx) => (
                            <div key={idx} className="p-4 border border-slate-200/50 dark:border-zinc-800/60 rounded-2xl flex gap-3.5 items-start bg-slate-500/5">
                              <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${item.status === 'Completed' ? 'bg-emerald-500 text-white' : (item.status === 'In Progress' ? 'bg-indigo-500 text-white' : 'bg-slate-300 text-slate-600')}`}>
                                {idx + 1}
                              </span>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{item.stage}</h4>
                                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase ${item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : (item.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-300/10 text-slate-450')}`}>
                                    {item.status}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-500 leading-normal">{item.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Evidence & Witness */}
                  {activeTab === 'evidence' && (
                    <div className="space-y-6">
                      
                      {/* Evidence strategy */}
                      <div className="space-y-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Evidence Strategy Roadmap</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Strong */}
                          <div className="p-4 border border-emerald-500/10 bg-emerald-500/5 rounded-2xl space-y-2">
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Strong Admissible Evidence</span>
                            <ul className="space-y-2">
                              {strategyResult.evidenceStrategy?.strong?.map((e, idx) => (
                                <li key={idx} className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                                  <strong>{e.evidence}</strong>: {e.reason}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Missing */}
                          <div className="p-4 border border-red-500/10 bg-red-500/5 rounded-2xl space-y-2">
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Missing Key Evidence Gaps</span>
                            <ul className="space-y-2">
                              {strategyResult.evidenceStrategy?.missing?.map((e, idx) => (
                                <li key={idx} className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                                  <strong>{e.evidence}</strong>: {e.reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Sequence */}
                        <div className="p-4 border border-slate-200/50 dark:border-zinc-800 bg-slate-500/5 rounded-2xl space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recommended Evidence Presentation Sequence</span>
                          <ol className="list-decimal pl-4 space-y-1.5 text-xs font-semibold text-slate-655 dark:text-slate-300">
                            {strategyResult.evidenceStrategy?.sequence?.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      {/* Witness strategy */}
                      <div className="space-y-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Witness Prep & Examination Plans</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { label: 'Key Testimony Witnesses', list: strategyResult.witnessStrategy?.key, col: 'border-indigo-500/10 bg-indigo-500/5 text-indigo-500' },
                            { label: 'Corroborative Optional Witnesses', list: strategyResult.witnessStrategy?.optional, col: 'border-violet-500/10 bg-violet-500/5 text-violet-500' },
                            { label: 'Vulnerable Weak Witnesses', list: strategyResult.witnessStrategy?.weak, col: 'border-amber-500/10 bg-amber-500/5 text-amber-500' }
                          ].map(w => (
                            <div key={w.label} className={`p-4 border rounded-2xl space-y-2 ${w.col}`}>
                              <span className="text-[9px] font-black uppercase tracking-widest">{w.label}</span>
                              <ul className="space-y-2">
                                {w.list?.map((item, idx) => (
                                  <li key={idx} className="text-xs font-bold leading-normal text-slate-700 dark:text-slate-350">
                                    {item.witness}: <span className="font-semibold text-slate-500">{item.purpose}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Opponent & Counter Strategy */}
                  {activeTab === 'opponent' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border border-slate-200/50 dark:border-zinc-850 rounded-2xl bg-slate-500/5 space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opponent Expected Defense Tactics</span>
                          <p className="text-xs font-semibold text-slate-500 leading-relaxed">{strategyResult.opponentStrategy?.likelyDefence}</p>
                        </div>
                        <div className="p-4 border border-slate-200/50 dark:border-zinc-850 rounded-2xl bg-slate-500/5 space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expected Objections & Delay strategies</span>
                          <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                            <strong>Objections:</strong> {strategyResult.opponentStrategy?.likelyObjections?.join(', ')}
                            <br/><br/>
                            <strong>Delay Tactics:</strong> {strategyResult.opponentStrategy?.delayStrategy}
                          </p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      {/* Rebuttals table */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Counter-Strategy Rebuttal Matrix</span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-bold">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400">
                                <th className="py-2.5 px-2 uppercase tracking-wider text-[9px]">Opponent Argument</th>
                                <th className="py-2.5 px-2 uppercase tracking-wider text-[9px]">Counter Response</th>
                                <th className="py-2.5 px-2 uppercase tracking-wider text-[9px]">Evidence/Law Required</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/30">
                              {strategyResult.counterStrategy?.map((c, idx) => (
                                <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                                  <td className="py-3 px-2 text-slate-900 dark:text-white align-top">{c.opponentArgument}</td>
                                  <td className="py-3 px-2 text-slate-600 dark:text-slate-400 font-medium align-top">
                                    <p>{c.counterResponse}</p>
                                    <p className="text-indigo-500 font-bold mt-1 text-[10px]">Action: {c.recommendedAction}</p>
                                  </td>
                                  <td className="py-3 px-2 text-slate-500 align-top">
                                    <p><strong>Proof:</strong> {c.evidenceRequired}</p>
                                    <p className="text-violet-500 mt-1 font-bold"><strong>Law:</strong> {c.applicableLaw}</p>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Precedents & Judge */}
                  {activeTab === 'judge' && (
                    <div className="space-y-6">
                      
                      {/* Judge perspective */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expected Judicial Perspectives</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 border border-violet-500/10 bg-violet-500/5 rounded-2xl space-y-2">
                            <span className="text-[9px] font-black text-violet-500 uppercase tracking-widest">Likely Judicial Questions & Focus Areas</span>
                            <ul className="space-y-1.5">
                              {strategyResult.judgePerspective?.likelyQuestions?.map((q, i) => (
                                <li key={i} className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-start gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                                  <span>{q}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 border border-red-500/10 bg-red-500/5 rounded-2xl space-y-2">
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Trial Concerns & Vulnerable Links</span>
                            <ul className="space-y-1.5">
                              {strategyResult.judgePerspective?.courtConcerns?.map((c, i) => (
                                <li key={i} className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-start gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      {/* Judgments precedents */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Favorable Judicial Precedents & Citations</span>
                        <div className="grid grid-cols-1 gap-3">
                          {strategyResult.precedents?.map((p, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-slate-200/50 dark:border-zinc-800 bg-slate-500/5 space-y-2">
                              <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{p.citation}</h4>
                                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md text-[8px] font-black uppercase">
                                  {p.similarityScore}% Matches
                                </span>
                              </div>
                              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider leading-none">{p.court} • {p.type}</p>
                              <p className="text-xs font-semibold text-slate-500 leading-normal">{p.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      {/* Laws */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Statutory Legislative applicability report (BNS / CPC)</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {strategyResult.laws?.map((l, idx) => (
                            <div key={idx} className="p-3.5 border border-slate-100 dark:border-zinc-850 bg-slate-500/5 rounded-2xl">
                              <span className="text-[9px] font-black text-violet-500 uppercase tracking-widest">Section {l.section} - {l.act}</span>
                              <p className="text-xs font-semibold text-slate-650 dark:text-slate-350 mt-1 leading-relaxed">{l.applicability}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Negotiation & Settlement */}
                  {activeTab === 'negotiation' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center p-4 border border-slate-200/50 dark:border-zinc-850 rounded-2xl bg-[#131c31]/10">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Settlement Probability Chance</span>
                          <h4 className="text-2xl font-black text-emerald-500 mt-0.5">{strategyResult.settlement?.settlementChance}%</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-extrabold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                            Mediation: {strategyResult.settlement?.mediationPossibility || 'Good'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        <strong>Negotiation Strategy:</strong> {strategyResult.settlement?.negotiationStrategy}
                      </p>

                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      {/* Positions */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Negotiation Position Outlines</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: 'Opening position demand', val: strategyResult.negotiationPositions?.opening, col: 'border-indigo-500/10 bg-indigo-500/5 text-indigo-500' },
                            { label: 'Middle target compromise', val: strategyResult.negotiationPositions?.middle, col: 'border-violet-500/10 bg-violet-500/5 text-violet-500' },
                            { label: 'Final bottom line position', val: strategyResult.negotiationPositions?.final, col: 'border-amber-500/10 bg-amber-500/5 text-amber-500' },
                            { label: 'Litigation recovery fallback', val: strategyResult.negotiationPositions?.fallback, col: 'border-red-500/10 bg-red-500/5 text-red-500' },
                          ].map(p => (
                            <div key={p.label} className={`p-4 border rounded-2xl space-y-1.5 ${p.col}`}>
                              <span className="text-[9px] font-black uppercase tracking-widest">{p.label}</span>
                              <p className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300">{p.val || 'Position details pending.'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trial Planner */}
                  {activeTab === 'planner' && (
                    <div className="space-y-6">
                      
                      {/* Cross exam questions */}
                      <div className="space-y-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cross-Examination Questions Planner</span>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {strategyResult.crossExamPlanner?.map((item, idx) => (
                            <div key={idx} className="p-4 border border-slate-200/50 dark:border-zinc-800 bg-slate-500/5 rounded-2xl space-y-4">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Witness Target: {item.witness}</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-slate-450 uppercase">Main Questions Line</span>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {item.mainQuestions?.map((q, i) => <li key={i}>{q}</li>)}
                                  </ul>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-indigo-500 uppercase">Follow-up inquiries</span>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {item.followUps?.map((q, i) => <li key={i}>{q}</li>)}
                                  </ul>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-red-500 uppercase">Contradiction questions</span>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {item.contradictionQuestions?.map((q, i) => <li key={i}>{q}</li>)}
                                  </ul>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-violet-500 uppercase">Credibility challenges</span>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {item.credibilityQuestions?.map((q, i) => <li key={i}>{q}</li>)}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      {/* Final arguments planner */}
                      <div className="space-y-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Final argument planner outlines</span>
                        <div className="p-4 border border-indigo-500/10 bg-indigo-500/5 rounded-2xl space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          <p><strong>Opening arguments statement:</strong> {strategyResult.finalArguments?.opening}</p>
                          <p><strong>Key legal arguments points:</strong> {strategyResult.finalArguments?.arguments?.join(', ')}</p>
                          <p><strong>Favorable Precedent references:</strong> {strategyResult.finalArguments?.precedents?.join(', ')}</p>
                          <p><strong>Statutory Prayers / reliefs sought:</strong> <span className="text-indigo-500 font-bold">"{strategyResult.finalArguments?.prayer}"</span></p>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Readiness & Tasks */}
                  {activeTab === 'readiness' && (
                    <div className="space-y-6">
                      
                      {/* Readiness scores dashboard */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { label: 'Evidence readiness', val: readinessMetrics.evidence, col: 'text-indigo-500' },
                          { label: 'Witness readiness', val: readinessMetrics.witness, col: 'text-violet-500' },
                          { label: 'Documentation readiness', val: readinessMetrics.documentation, col: 'text-emerald-500' },
                          { label: 'Arguments readiness', val: readinessMetrics.argument, col: 'text-emerald-550' },
                          { label: 'Overall Readiness', val: readinessMetrics.overall, col: 'text-indigo-650 font-black' },
                        ].map(r => (
                          <div key={r.label} className="p-4 border border-slate-100 dark:border-zinc-800 bg-slate-500/5 rounded-2xl text-center">
                            <span className={`text-base font-black ${r.col}`}>{r.val}%</span>
                            <p className="text-[8px] text-slate-450 font-extrabold uppercase mt-1 tracking-wider leading-none">{r.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="h-[1px] bg-slate-200 dark:bg-zinc-800/80" />

                      {/* Interactive task manager */}
                      <div className="space-y-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Litigation task checklist manager</span>
                        
                        {/* Task List */}
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                          {tasks.map(t => (
                            <div key={t.id} className="p-3 border border-slate-200/50 dark:border-zinc-800 bg-slate-500/5 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={t.completed}
                                  onChange={() => handleToggleTask(t.id)}
                                  className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500"
                                />
                                <span className={`text-xs font-bold ${t.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                                  {t.task}
                                </span>
                              </div>
                              <button 
                                onClick={() => handleDeleteTask(t.id)}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                          {tasks.length === 0 && (
                            <div className="text-center py-6 text-xs text-slate-400 font-semibold bg-slate-500/5 rounded-xl">
                              No tasks created. Add a task below to start tracking.
                            </div>
                          )}
                        </div>

                        {/* Add Task Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add custom task e.g. File caveat petition..."
                            value={newTaskText}
                            onChange={e => setNewTaskText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                            className={`flex-1 border rounded-xl px-4 py-2.5 text-xs font-bold outline-none ${isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                          />
                          <button
                            onClick={handleAddTask}
                            className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0"
                          >
                            Add Task
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* History Archive Modal */}
      {historyVisible && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setHistoryVisible(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-[32px] max-w-lg w-full max-h-[80%] flex flex-col overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 shrink-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Strategy Archive Logs</h3>
              <button onClick={() => setHistoryVisible(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 mt-4 shrink-0">
              <Search size={14} className="text-slate-400 mr-2" />
              <input 
                type="text"
                placeholder="Search past strategies..."
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
              ).map((item, idx) => (
                <div key={item.id || idx} className="p-4 bg-slate-50 dark:bg-[#1A2540] border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm">
                  <button
                    onClick={() => {
                      setStrategyResult(item.activeStrategy || item);
                      setHistoryVisible(false);
                      toast.success(`Loaded strategy: ${item.title}`);
                    }}
                    className="w-full text-left min-w-0"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{item.title}</h4>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider shrink-0 ml-2">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium line-clamp-2">{item.caseFacts}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-[8px] font-black uppercase text-indigo-600 rounded-md">Score: {item.stats?.overallStrategyScore || item.stats?.strategyStrength}%</span>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-[8px] font-black uppercase text-emerald-600 rounded-md">Prob: {item.stats?.winningProbability || 'N/A'}%</span>
                    </div>
                  </button>
                  <div className="flex justify-end border-t border-slate-100 dark:border-white/5 pt-2.5 mt-2.5">
                    <button 
                      onClick={() => deleteHistoryItem(item.id)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500 flex items-center gap-1 text-[9px] font-black uppercase"
                    >
                      <Trash2 size={12} /> Delete Log
                    </button>
                  </div>
                </div>
              ))}
              {historyData.length === 0 && (
                <div className="text-center py-10">
                  <Folder size={32} className="mx-auto text-slate-350 dark:text-zinc-700" />
                  <p className="text-xs font-semibold text-slate-400 mt-2">No strategy roadmaps saved.</p>
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
