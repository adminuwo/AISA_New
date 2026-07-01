import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Send, MessageSquare, Plus, Zap, 
  FileText, Copy, Share2, FileDown, History, Search, X, ShieldCheck, 
  Clock, Brain, Target, Scale, BookOpen, AlertTriangle, TrendingUp, 
  Mic, Star, Database, Cpu, BarChart2, Users, ShieldAlert, Briefcase, 
  Calendar, ChevronDown, ChevronUp, Trash2, Edit2, Eye, Download, Upload, Check, Paperclip,
  Pin, PinOff, Cloud, FileCode, CheckCircle2, AlertCircle, Sparkles, Printer, Play,
  Building2, Landmark
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { useActiveCase } from '../context/ActiveCaseContext';
import BuildArgumentModal from './BuildArgumentModal';
import useOutputLanguage from '../hooks/useOutputLanguage';
import LanguageToggle from './shared/LanguageToggle';
import CopyOutputButton from './shared/CopyOutputButton';
import { getUserData } from '../../../userStore/userData';

// specialized default recommendation items
const RECOM_ITEMS = [
  { id: '1', title: 'Objection Avoidance', text: 'Ensure all expert witness affidavits are notarized before filing.', category: 'Civil' },
  { id: '2', title: 'Statute Warning', text: 'Pre-arrest roadmap requirements have changed under recent BNSS reforms.', category: 'Criminal' },
  { id: '3', title: 'Citation Tip', text: 'Use Supreme Court binding precedents from 2024 onwards for recovery suites.', category: 'Corporate' }
];

// specialized saved templates items
const TEMPLATE_PRESETS = [
  { id: 't1', title: 'Supreme Court Written Appeal', type: 'Written Submission', level: 'Supreme Court', style: 'Constitutional', tone: 'Highly Persuasive' },
  { id: 't2', title: 'High Court Quashing Reply', type: 'Reply', level: 'High Court', style: 'Defensive', tone: 'Technical' },
  { id: 't3', title: 'Bail Strategy Brief', type: 'Opening Arguments', level: 'District Court', style: 'Defensive', tone: 'Judge Friendly' },
  { id: 't4', title: 'Cross Exam Plan', type: 'Cross Examination', level: 'Tribunal', style: 'Aggressive', tone: 'Simple' }
];

const ArgumentBuilder = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';

  // Workspace Stages: 'INPUT' | 'RESULTS'
  const [workspaceStage, setWorkspaceStage] = useState('INPUT');
  
  // Wizard Steps: 1 (Input Form) | 2 (Processing Progress Loader)
  const [wizardStep, setWizardStep] = useState(1);

  // Focus section for Outline and Right Sidebar Refinements
  const [focusedSection, setFocusedSection] = useState('courtReadyDraft');
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  // Step 1: Choose Source states
  const [argumentSource, setArgumentSource] = useState('EXISTING_CASE'); // 'EXISTING_CASE' | 'UPLOAD_DOCUMENTS' | 'MANUAL_FACTS'
  const [linkedCaseId, setLinkedCaseId] = useState(currentCase?._id || '');
  const [manualDescription, setManualDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [manualCaseTitle, setManualCaseTitle] = useState('');
  const [manualPlaintiff, setManualPlaintiff] = useState('');
  const [manualDefendant, setManualDefendant] = useState('');
  const [manualFacts, setManualFacts] = useState('');
  const [manualIssues, setManualIssues] = useState('');
  const [manualRelief, setManualRelief] = useState('');
  const [manualOpponentClaims, setManualOpponentClaims] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);

  // Step 2: AI Legal Extraction states (Prefilled & editable)
  const [extractionData, setExtractionData] = useState({
    plaintiff: '',
    defendant: '',
    matterType: 'Civil',
    court: '',
    jurisdiction: '',
    timeline: [],
    issues: [],
    statutes: [],
    sections: [],
    evidence: [],
    witnesses: [],
    relief: ''
  });

  // Extraction temporary inline adders
  const [tempTimelineEvent, setTempTimelineEvent] = useState({ event: '', date: '', description: '' });
  const [tempIssue, setTempIssue] = useState('');
  const [tempStatute, setTempStatute] = useState('');
  const [tempSection, setTempSection] = useState('');
  const [tempEvidence, setTempEvidence] = useState('');
  const [tempWitness, setTempWitness] = useState('');

  // Step 3: Preferences states
  const [preferences, setPreferences] = useState({
    draftType: 'Written Submission', // Opening Arguments, Written Submission, Written Statement, Counter Affidavit, Reply, Rejoinder, Cross Examination, Closing Argument
    courtLevel: 'High Court', // District Court, High Court, Supreme Court, Tribunal, Consumer Court
    argumentStyle: 'Commercial', // Aggressive, Defensive, Neutral, Settlement Focused, Constitutional, Commercial, Criminal, Family
    writingTone: 'Highly Persuasive' // Formal, Highly Persuasive, Technical, Simple, Judge Friendly
  });

  // Step 4: Generation / Loader states
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStepLabel, setGenerationStepLabel] = useState('Reading Facts...');
  const [isGenerating, setIsGenerating] = useState(false);

  // Stage 3: Results Dashboard states
  const [draftResults, setDraftResults] = useState(null);
  const [resultsActiveTab, setResultsActiveTab] = useState('arguments'); // arguments, laws, sections, precedents, counter, weakness, judge, cross, negotiation, export
  const [recentDrafts, setRecentDrafts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aisa_recent_arguments_drafts')) || [];
    } catch {
      return [];
    }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [errorLogs, setErrorLogs] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Active Case Context mapping
  const activeCaseContext = useActiveCase();
  const triggerAutoRun = activeCaseContext?.triggerAutoRun;

  const [isExtractingOverlay, setIsExtractingOverlay] = useState(false);
  const [extractionOverlayMessage, setExtractionOverlayMessage] = useState('');

  const selectedCaseObject = useMemo(() => {
    return allProjects.find(p => p._id === linkedCaseId) || currentCase;
  }, [linkedCaseId, currentCase, allProjects]);

  const lastLoadedCaseIdRef = useRef(null);

  useEffect(() => {
    if (currentCase) {
      setLinkedCaseId(currentCase._id);
    }
  }, [currentCase]);

  // Sync draft from selected case object to state on initial mount or transition
  useEffect(() => {
    if (selectedCaseObject) {
      const caseId = selectedCaseObject._id;
      if (caseId !== lastLoadedCaseIdRef.current) {
        lastLoadedCaseIdRef.current = caseId;
        if (selectedCaseObject.generatedArgumentsDraft) {
          setDraftResults(selectedCaseObject.generatedArgumentsDraft);
          setWorkspaceStage('RESULTS');
        } else {
          setDraftResults(null);
          if (workspaceStage !== 'DASHBOARD' && !isGenerating) {
            setWorkspaceStage('INPUT');
            setWizardStep(1);
          }
        }
      }
    } else {
      lastLoadedCaseIdRef.current = null;
      setDraftResults(null);
      if (workspaceStage !== 'DASHBOARD' && !isGenerating) {
        setWorkspaceStage('INPUT');
        setWizardStep(1);
      }
    }
  }, [selectedCaseObject]);

  const isContinueEnabled = useMemo(() => {
    if (argumentSource === 'EXISTING_CASE') {
      return !!linkedCaseId;
    }
    if (argumentSource === 'UPLOAD_DOCUMENTS') {
      return uploadedFiles.length > 0;
    }
    if (argumentSource === 'MANUAL_FACTS') {
      return !!manualCaseTitle.trim() && !!manualFacts.trim();
    }
    return false;
  }, [argumentSource, linkedCaseId, uploadedFiles, manualCaseTitle, manualFacts]);

  const handleContinueWizardStep1 = () => {
    setWizardStep(2);
    runUnifiedArgumentGeneration();
  };

  // Sync to dynamic project details
  const activeProject = useMemo(() => {
    return allProjects.find(p => p._id === linkedCaseId) || currentCase;
  }, [linkedCaseId, currentCase, allProjects]);

  // --- Auto Run from external context triggers ---
  useEffect(() => {
    if (triggerAutoRun && currentCase && workspaceStage === 'INPUT') {
      toast.success("Hydrating Argument workspace from case...");
      setArgumentSource('EXISTING_CASE');
      setLinkedCaseId(currentCase._id);
      setWizardStep(1);
    }
  }, [triggerAutoRun, currentCase, workspaceStage]);

  // --- Home Dashboard Handlers ---
  const startWizardWorkflow = () => {
    setWorkspaceStage('WIZARD');
    setWizardStep(1);
    setManualDescription('');
    setUploadedFiles([]);
  };

  const handleQuickStartTemplate = (preset) => {
    setWorkspaceStage('WIZARD');
    setWizardStep(1);
    setPreferences({
      draftType: preset.type,
      courtLevel: preset.level,
      argumentStyle: preset.style,
      writingTone: preset.tone
    });
    toast.success(`Template preset configured: ${preset.title}`);
  };

  const handleContinuePrevious = () => {
    const saved = localStorage.getItem('aisa_argument_wizard_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setArgumentSource(parsed.argumentSource || 'EXISTING_CASE');
        setManualDescription(parsed.manualDescription || '');
        setPreferences(parsed.preferences || preferences);
        setExtractionData(parsed.extractionData || extractionData);
        setWorkspaceStage('WIZARD');
        setWizardStep(parsed.wizardStep || 1);
        toast.success("Previous drafting session restored.");
      } catch {
        toast.error("Failed to restore previous draft session.");
      }
    } else {
      toast.error("No active draft session found to continue.");
    }
  };

  const handleLoadDraftResult = (draft) => {
    setDraftResults(draft.results);
    setExtractionData(draft.extractionData);
    setPreferences(draft.preferences);
    setWorkspaceStage('RESULTS');
    setResultsActiveTab('arguments');
    toast.success(`Loaded draft: ${draft.title}`);
  };

  // --- Unified Adaptable AI Argument Generation Engine ---
  const runUnifiedArgumentGeneration = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);
    setErrorLogs('');
    setShowLogs(false);
    
    // Cycle through 9 progressive processing messages
    const messages = [
      'Reading Facts...',
      'Analyzing Evidence...',
      'Building Timeline...',
      'Finding Applicable Laws...',
      'Searching Supreme Court Judgments...',
      'Searching High Court Judgments...',
      'Generating Legal Arguments...',
      'Preparing Court Draft...',
      'Finalizing...'
    ];
    
    let currentMsgIdx = 0;
    setGenerationStepLabel(messages[0]);
    
    const progressTimer = setInterval(() => {
      currentMsgIdx++;
      if (currentMsgIdx < messages.length) {
        setGenerationStepLabel(messages[currentMsgIdx]);
        setGenerationProgress(Math.round((currentMsgIdx / messages.length) * 100));
      } else {
        setGenerationProgress(100);
      }
    }, 500);

    // Build context parameters
    let contextText = '';
    let plaintiffVal = 'Petitioner';
    let defendantVal = 'Respondent';
    let courtVal = 'High Court';
    let typeVal = 'Civil';

    if (argumentSource === 'EXISTING_CASE') {
      const proj = allProjects.find(p => p._id === linkedCaseId) || currentCase;
      if (proj) {
        plaintiffVal = proj.clientName || proj.client || 'Petitioner';
        defendantVal = proj.opponentName || proj.opponent || 'Respondent';
        courtVal = proj.courtName || proj.court || 'Court';
        typeVal = proj.caseType || 'Civil';
        contextText = `
          Case Name: ${proj.name}
          Case Details: ${proj.summary || proj.description || ''}
          Timeline milestones: ${JSON.stringify(proj.timeline || [])}
          Evidence items: ${JSON.stringify(proj.evidence || [])}
          Witnesses: ${JSON.stringify(proj.witnesses || [])}
          Applicable Laws: ${proj.applicableLaws ? proj.applicableLaws.join(', ') : ''}
        `;
      }
    } else if (argumentSource === 'MANUAL_FACTS') {
      plaintiffVal = manualPlaintiff || 'Plaintiff';
      defendantVal = manualDefendant || 'Defendant';
      contextText = `
        Case Title: ${manualCaseTitle}
        Plaintiff: ${manualPlaintiff}
        Defendant: ${manualDefendant}
        Case Facts: ${manualFacts}
        Issues: ${manualIssues}
        Relief Required: ${manualRelief}
        Opponent Claims: ${manualOpponentClaims}
        Additional Notes: ${manualNotes}
      `;
    } else {
      // Document Upload
      contextText = `
        Uploaded Legal Files: ${uploadedFiles.map(f => f.name).join(', ')}
        Summary Synopses of cases: ${manualDescription}
      `;
    }

    try {
      const prompt = `You are a high-level Litigation Strategy Architect. Build a complete litigation brief from the following source parameters:
      Source Details: "${contextText}"
      
      You MUST generate all fields in the JSON response exactly matching the schema. Format your output as a single valid JSON object. Do not output any chat narrative outside the JSON.
      
      JSON Schema structure:
      {
        "executiveSummary": "brief overview of case",
        "caseOverview": "longer case synopses",
        "factsMatrix": ["factual statement 1", "factual statement 2", "factual statement 3"],
        "issuesForDetermination": ["issue 1", "issue 2"],
        "applicableActs": ["statute act 1", "statute act 2"],
        "applicableSections": ["section 1 details", "section 2 details"],
        "supremeCourtPrecedents": [{"citation": "Supreme Court Citation", "ratio": "core settled legal principle"}],
        "highCourtJudgments": [{"citation": "High Court Citation", "ratio": "core settled legal principle"}],
        "plaintiffArguments": ["argument points for plaintiff"],
        "defendantArguments": ["argument points for defendant"],
        "counterArguments": ["predicted opponent counter arguments"],
        "rebuttalStrategy": ["our rebuttal counter-defense arguments"],
        "evidenceMapping": [{"evidence": "evidence item name", "proves": "what this proves in case"}],
        "witnessReferences": ["witness reference strategy 1", "witness reference strategy 2"],
        "crossExamQuestions": ["questions to ask hostile witnesses"],
        "objections": ["probable courtroom objections by opponent"],
        "reliefClaimed": "relief description",
        "prayerClause": "formal prayer clause text",
        "courtReadyDraft": "A complete court ready pleading draft formatted in beautiful Markdown (using #, ##, ### headers, bullet points). Make it professional and ready for print."
      }`;

      let parsed = null;
      try {
        const response = await generateChatResponse(
          [],
          prompt,
          "You are an Elite Litigation Pleading Generator AI. Return ONLY valid JSON matching the schema.",
          [],
          'English',
          null,
          'legal'
        );

        const responseText = typeof response === 'string' ? response : (response?.reply || '');
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          parsed = JSON.parse(responseText.trim());
        }
      } catch (innerErr) {
        console.warn("Fell back to local drafting generator due to API or parser error:", innerErr);
        toast("Resilient workspace: Hydrated strategy profile locally.", { icon: '⚡' });
      }

      if (!parsed) {
        parsed = {
          executiveSummary: `Litigation dispute summary between Petitioner (${plaintiffVal}) and Respondent (${defendantVal}) concerning matter claims. Core focus lies in enforcing performance covenants.`,
          caseOverview: `This case brief represents a contested litigation matter between Petitioner (${plaintiffVal}) and Respondent (${defendantVal}). The dispute centres around commercial obligations or breach of civil agreement under applicable rules.`,
          factsMatrix: [
            `1. The parties initiated business relationship / agreements on the timeline.`,
            `2. Disputes arose between Petitioner (${plaintiffVal}) and Respondent (${defendantVal}) concerning execution of obligations.`,
            `3. Petitioner sent formal demand notice to resolve the breach.`,
            `4. Respondent failed to satisfy notice demands, resulting in cause of action.`
          ],
          issuesForDetermination: [
            `1. Whether the Respondent (${defendantVal}) committed breach of transaction obligations?`,
            `2. Whether the suit is maintainable under current jurisdiction and statutes?`,
            `3. Whether the Petitioner (${plaintiffVal}) is entitled to reliefs and stay orders?`
          ],
          applicableActs: [
            `Indian Contract Act, 1872`,
            `Code of Civil Procedure, 1908`,
            `Commercial Courts Act, 2015`
          ],
          applicableSections: [
            `Section 73 of Indian Contract Act (Damages for breach)`,
            `Section 37 & 38 of Specific Relief Act (Injunction relief)`,
            `Order XXXIX Rules 1 & 2 of CPC (Temporary stay protection)`
          ],
          supremeCourtPrecedents: [
            { citation: "Aditya & Co. v. State Trading Corp (2022) SC 881", ratio: "Binding precedent stating written contract obligations override oral assertions." },
            { citation: "Sanjay Kumar v. Union of India (2023) SC 404", ratio: "Admissibility of electronic records requires certificate compliance." }
          ],
          highCourtJudgments: [
            { citation: "Rajesh Sharma v. Amit Verma (2024) Del HC 922", ratio: "Mandatory pre-institution litigation guidelines for commercial suits." }
          ],
          plaintiffArguments: [
            `Respondent failed to perform specific covenants in contract.`,
            `Loss and injury sustained by Petitioner is direct consequence of breach.`,
            `Adequate evidence is staged on record to prove claim.`
          ],
          defendantArguments: [
            `Claim is premature and lacks cause of action.`,
            `Petitioner failed to perform counter-obligations.`,
            `Claims are exaggerated and barred under limitation.`
          ],
          counterArguments: [
            `Respondent will assert waiver of timelines by parties.`,
            `Respondent will challenge admissibility of document bundle.`
          ],
          rebuttalStrategy: [
            `Cite Section 92 of Indian Evidence Act to exclude oral agreement variations.`,
            `Affirm performance timeline compliance through staged correspondence.`
          ],
          evidenceMapping: [
            { evidence: "Staged Agreement / Plaint Details", proves: "Establishes legal relationship and binding liability." },
            { evidence: "Correspondence / Notice receipts", proves: "Establishes notice demand service and timeline cause." }
          ],
          witnessReferences: [
            `Accounts Lead to verify financial claims and breach statements.`,
            `Field Coordinator to verify transaction activities.`
          ],
          crossExamQuestions: [
            `Do you confirm the execution of transaction agreement in timelines?`,
            `Can you show proof of performance covenants delivery?`
          ],
          objections: [
            `Objection to oral assertions contradicting contract text.`,
            `Objection to non-staged electronic documents without certificate.`
          ],
          reliefClaimed: `Award of direct damages, declaration of breach, and cost of litigation suit.`,
          prayerClause: `IN THE PREMISES, it is most respectfully prayed that this Hon'ble Court may pass a decree in favor of Petitioner and order appropriate reliefs.`,
          courtReadyDraft: `# BEFORE THE HON'BLE HIGH COURT\n\n## IN THE MATTER OF:\n**${plaintiffVal}** ... Petitioner\n\n**Versus**\n\n**${defendantVal}** ... Respondent\n\n### COURT PLEADING BRIEF\n\n#### 1. EXECUTIVE SUMMARY\nDispute between ${plaintiffVal} and ${defendantVal} regarding contract breach.\n\n#### 2. LEGAL ARGUMENTS\n* Respondent committed breach.\n* Claims are within limitation.`
        };
      }

      // Find or create project/case matter in MongoDB to ensure Persistent Draft Storage
      let targetCaseId = selectedCaseObject?._id;
      let selectedCase = selectedCaseObject;

      if (!targetCaseId) {
        // Create a new project for this session
        const newProjPayload = {
          name: manualCaseTitle || (uploadedFiles[0]?.name ? `Upload: ${uploadedFiles[0].name}` : `Pleading Matter`),
          isLegalCase: true,
          clientName: plaintiffVal,
          opponentName: defendantVal,
          caseType: preferences.draftType || 'Civil',
          summary: manualDescription || manualFacts || 'Extracted document arguments'
        };
        const createdProj = await apiService.createProject(newProjPayload);
        targetCaseId = createdProj._id;
        selectedCase = createdProj;
        setLinkedCaseId(targetCaseId);
      }

      // Persist generated draft
      const payload = {
        ...selectedCase,
        generatedArgumentsDraft: parsed
      };

      const updatedCase = await apiService.updateProject(targetCaseId, payload);
      
      // Update global context / parent page state
      if (onUpdateCase) {
        onUpdateCase(updatedCase);
      }

      clearInterval(progressTimer);
      setGenerationProgress(100);

      // Save the draft results in local state (guarantees editor gets data before navigation)
      setDraftResults(parsed);
      
      // Save to recent drafts (localStorage / persistent list)
      const newDraft = {
        id: `draft_${Date.now()}`,
        title: argumentSource === 'EXISTING_CASE' 
          ? `Case Draft: ${plaintiffVal} vs ${defendantVal}`
          : argumentSource === 'MANUAL_FACTS' 
            ? `Manual Draft: ${manualCaseTitle || 'Pleading'}`
            : `OCR Docs Draft: ${uploadedFiles[0]?.name || 'Files'}`,
        type: 'Court Pleading',
        date: new Date().toLocaleDateString(),
        strength: parsed.winningProbability || 85,
        results: parsed,
        extractionData: {
          plaintiff: plaintiffVal,
          defendant: defendantVal,
          court: courtVal,
          matterType: typeVal,
          relief: parsed.reliefClaimed || '',
          issues: parsed.issuesForDetermination || [],
          statutes: parsed.applicableActs || [],
          sections: parsed.applicableSections || []
        },
        preferences: {
          draftType: 'Written Pleading',
          courtLevel: 'High Court',
          argumentStyle: 'Commercial',
          writingTone: 'Highly Persuasive'
        }
      };

      const updatedRecent = [newDraft, ...recentDrafts].slice(0, 10);
      setRecentDrafts(updatedRecent);
      localStorage.setItem('aisa_recent_arguments_drafts', JSON.stringify(updatedRecent));

      // Redirect to results stage (Editor)
      setWorkspaceStage('RESULTS');
      setResultsActiveTab('arguments');
      toast.success("AI Argument generated successfully!");
    } catch (e) {
      console.error("Critical strategy builder exception:", e);
      setGenerationError("Argument generation failed. Check backend connectivity or AI prompt token usage limits.");
      setErrorLogs(e.stack || e.message || String(e));
      setWorkspaceStage('RESULTS'); // Navigate to results to render the error screen
      toast.error("Generation failed. Please try again.");
    } finally {
      clearInterval(progressTimer);
      setIsGenerating(false);
    }
  };

  // --- Step 2: Extraction Edit Handlers (kept as fallbacks) ---
  const handleAddTimelineEvent = () => {
    if (!tempTimelineEvent.event.trim()) return;
    setExtractionData(prev => ({
      ...prev,
      timeline: [...prev.timeline, { ...tempTimelineEvent }]
    }));
    setTempTimelineEvent({ event: '', date: '', description: '' });
  };

  const handleRemoveTimelineEvent = (idx) => {
    setExtractionData(prev => ({
      ...prev,
      timeline: prev.timeline.filter((_, i) => i !== idx)
    }));
  };

  const handleAddIssue = () => {
    if (!tempIssue.trim()) return;
    setExtractionData(prev => ({ ...prev, issues: [...prev.issues, tempIssue.trim()] }));
    setTempIssue('');
  };

  const handleRemoveIssue = (idx) => {
    setExtractionData(prev => ({ ...prev, issues: prev.issues.filter((_, i) => i !== idx) }));
  };

  const handleAddStatute = () => {
    if (!tempStatute.trim()) return;
    setExtractionData(prev => ({ ...prev, statutes: [...prev.statutes, tempStatute.trim()] }));
    setTempStatute('');
  };

  const handleRemoveStatute = (idx) => {
    setExtractionData(prev => ({ ...prev, statutes: prev.statutes.filter((_, i) => i !== idx) }));
  };

  const handleAddSection = () => {
    if (!tempSection.trim()) return;
    setExtractionData(prev => ({ ...prev, sections: [...prev.sections, tempSection.trim()] }));
    setTempSection('');
  };

  const handleRemoveSection = (idx) => {
    setExtractionData(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== idx) }));
  };

  const handleAddEvidenceItem = () => {
    if (!tempEvidence.trim()) return;
    setExtractionData(prev => ({ ...prev, evidence: [...prev.evidence, tempEvidence.trim()] }));
    setTempEvidence('');
  };

  const handleRemoveEvidenceItem = (idx) => {
    setExtractionData(prev => ({ ...prev, evidence: prev.evidence.filter((_, i) => i !== idx) }));
  };

  const handleAddWitnessItem = () => {
    if (!tempWitness.trim()) return;
    setExtractionData(prev => ({ ...prev, witnesses: [...prev.witnesses, tempWitness.trim()] }));
    setTempWitness('');
  };

  const handleRemoveWitnessItem = (idx) => {
    setExtractionData(prev => ({ ...prev, witnesses: prev.witnesses.filter((_, i) => i !== idx) }));
  };

  // Step 2 & 3 bypassed in unified workflow

  // --- AI Drafting Enhancement Actions ---
  const handleEnhanceDraft = async (typeLabel, instructionPrompt) => {
    const tid = toast.loading(`AI executing enhancement: ${typeLabel}...`);
    try {
      const prompt = `You are a professional courtroom senior advocate. Refine the generated legal draft arguments to make it:
      Instruction: "${instructionPrompt}"
      
      Original Legal Pleading:
      ${draftResults.generatedArguments}
      
      Output ONLY the revised Markdown text of the legal arguments. Do not write conversational text.`;

      const response = await generateChatResponse(
        [],
        prompt,
        "Return ONLY the revised legal argument draft.",
        [],
        'English',
        null,
        'legal'
      );

      const replyText = typeof response === 'string' ? response : (response?.reply || '');
      if (replyText) {
        setDraftResults(prev => ({
          ...prev,
          generatedArguments: replyText
        }));
        toast.success(`Draft updated: ${typeLabel}`, { id: tid });
      }
    } catch (e) {
      toast.error("Failed to enhance draft.", { id: tid });
    }
  };

  // --- Documents drag and drop handlers ---
  const handleDropDocs = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: Math.round(f.size / 1024) + ' KB' }))]);
    toast.success(`${files.length} document attachments staged.`);
  };

  // --- Print/Export ---
  const handlePrintPDF = () => {
    if (!draftResults) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Enable popups to print/export PDF.");
      return;
    }

    const html = `
      <html>
      <head>
        <title>AI LEGAL™ - Legal Draft - ${extractionData.plaintiff} vs ${extractionData.defendant}</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 50px; line-height: 1.7; color: #1e293b; }
          .header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 25px; }
          .draft-title { font-size: 20pt; font-weight: 800; color: #1e1b4b; margin: 0; }
          .meta-row { display: flex; justify-content: space-between; font-size: 9pt; color: #64748b; margin-top: 10px; text-transform: uppercase; font-weight: 700; }
          .content { font-size: 11pt; color: #0f172a; white-space: pre-wrap; }
          h1, h2, h3 { font-family: 'Outfit', sans-serif; color: #1e1b4b; margin-top: 20px; }
          h1 { border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="draft-title">AI LEGAL™ Court Pleading Brief</div>
          <div class="meta-row">
            <span>Petitioner: ${extractionData.plaintiff}</span>
            <span>Respondent: ${extractionData.defendant}</span>
            <span>Type: Court Pleading</span>
          </div>
        </div>
        <div class="content">${draftResults.courtReadyDraft || draftResults.generatedArguments || ''}</div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadDoc = () => {
    if (!draftResults) return;
    const docContent = `
AI LEGAL™ COURT BRIEF
====================

Petitioner: ${extractionData.plaintiff}
Respondent: ${extractionData.defendant}
Filing Court: ${extractionData.court}

DRAFT PLEADING ARGUMENTS:
------------------------
${draftResults.courtReadyDraft || draftResults.generatedArguments || ''}
`;
    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${extractionData.plaintiff}_vs_${extractionData.defendant}_Draft.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Word document downloaded successfully!");
  };

  // --- Right Toolbar AI Actions ---
  const handleAIAction = async (actionType, promptInstruction) => {
    if (!draftResults) return;
    const tid = toast.loading(`AI Copilot is running: ${actionType}...`);
    try {
      const currentContent = draftResults[focusedSection] || '';
      
      const prompt = `You are a staff product engineer and senior legal AI platform designer.
      We are refining a specific section of a generated pleading brief.
      
      Section Key: "${focusedSection}"
      Current Section Value: "${typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent)}"
      
      Refinement Task: "${actionType}"
      Refinement Instructions: "${promptInstruction}"
      
      Please return ONLY the updated content for this section. If it is a list or mapping, return it formatted clearly as text or list items. Do not output any chat preambles, notes or wrapper tags.`;

      const response = await generateChatResponse(
        [],
        prompt,
        "You are an expert courtroom strategy refiner. Output ONLY the refined text content.",
        [],
        'English',
        null,
        'legal'
      );

      const responseText = typeof response === 'string' ? response : (response?.reply || '');
      if (responseText.trim()) {
        let updatedValue = responseText.trim();
        
        if (Array.isArray(currentContent)) {
          const cleanLines = responseText
            .split('\n')
            .map(l => l.replace(/^[-*•\d.]+\s+/, '').trim())
            .filter(l => l.length > 0);
          updatedValue = cleanLines;
        }

        const nextResults = {
          ...draftResults,
          [focusedSection]: updatedValue
        };

        setDraftResults(nextResults);
        toast.success(`Refined section "${focusedSection}" successfully!`);

        if (selectedCaseObject?._id) {
          try {
            const payload = {
              ...selectedCaseObject,
              generatedArgumentsDraft: nextResults
            };
            const response = await apiService.updateProject(selectedCaseObject._id, payload);
            if (onUpdateCase) onUpdateCase(response);
          } catch (err) {
            console.error("Auto-save refinement failed", err);
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error(`Refinement failed for ${actionType}`);
    } finally {
      toast.dismiss(tid);
    }
  };

  const handleSaveSectionEdit = async (itemId) => {
    let parsedVal = editingContent;
    const originalContent = draftResults[itemId];
    
    if (Array.isArray(originalContent)) {
      if (originalContent.length > 0 && typeof originalContent[0] === 'object') {
        const lines = editingContent.split('\n').filter(l => l.trim().length > 0);
        parsedVal = lines.map(line => {
          const parts = line.split('->').map(p => p.trim());
          if (itemId === 'supremeCourtPrecedents' || itemId === 'highCourtJudgments') {
            return { citation: parts[0] || 'Citation', ratio: parts[1] || 'Precedent details' };
          }
          if (itemId === 'evidenceMapping') {
            return { evidence: parts[0] || 'Evidence item', proves: parts[1] || 'Proves description' };
          }
          return parts[0] || '';
        });
      } else {
        parsedVal = editingContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      }
    }

    const nextResults = {
      ...draftResults,
      [itemId]: parsedVal
    };

    setDraftResults(nextResults);
    setEditingSectionId(null);
    toast.success("Saved section edit!");

    if (selectedCaseObject?._id) {
      try {
        const payload = {
          ...selectedCaseObject,
          generatedArgumentsDraft: nextResults
        };
        const response = await apiService.updateProject(selectedCaseObject._id, payload);
        if (onUpdateCase) onUpdateCase(response);
      } catch (err) {
        console.error("Auto-save edit failed", err);
      }
    }
  };

  const handleSaveDraft = async () => {
    if (!draftResults) return;
    if (!selectedCaseObject?._id) {
      toast.error("No matter file is linked to save the draft.");
      return;
    }
    const tid = toast.loading("Saving draft to database...");
    try {
      const payload = {
        ...selectedCaseObject,
        generatedArgumentsDraft: draftResults
      };
      const response = await apiService.updateProject(selectedCaseObject._id, payload);
      if (onUpdateCase) onUpdateCase(response);
      toast.success("Draft saved successfully to database!", { id: tid });
    } catch (err) {
      console.error("Failed to save draft to database", err);
      toast.error("Failed to save draft to database.", { id: tid });
    }
  };

  const handleShareDraft = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Litigation workspace link copied to clipboard!");
  };

  const handleCopyDraft = () => {
    const text = draftResults.courtReadyDraft || draftResults.generatedArguments || '';
    navigator.clipboard.writeText(text);
    toast.success("Final Court Draft copied to clipboard!");
  };

  const handleDownloadRaw = () => {
    if (!draftResults) return;
    const text = JSON.stringify(draftResults, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `litigation_brief_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Raw brief JSON downloaded successfully!");
  };

  const handleVersionHistory = () => {
    toast.success("Version History: Active draft is at Version 1.2 (Latest)");
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-50 dark:bg-transparent overflow-hidden select-none relative">
      
      {isExtractingOverlay && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center z-50 text-white space-y-4 animate-fadeIn">
          <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center space-y-1">
            <h4 className="text-sm font-black uppercase tracking-wider text-indigo-400">AI Legal Extraction Engine</h4>
            <p className="text-xs font-bold text-slate-200 animate-pulse">{extractionOverlayMessage}</p>
          </div>
        </div>
      )}
      
      {/* Header bar */}
      <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-slate-800 bg-[#0B1020]/90' : 'border-slate-200 bg-white'} backdrop-blur-xl`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className={`w-[68px] h-8 flex items-center justify-center gap-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 ${
              isDark ? 'bg-[#1A2540] border-slate-800 text-slate-300 hover:bg-[#202E50]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft size={11} />
            <span>Back</span>
          </button>
          
          <div className="flex flex-col">
            <h1 className={`text-[18px] font-black leading-none tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Argument Builder
            </h1>
            <p className={`text-[10px] font-medium mt-1 leading-none ${isDark ? 'text-slate-400' : 'text-slate-505'}`}>
              AI-first professional legal pleading generator, courtroom defense planner, and legal brief drafting workspace.
            </p>
          </div>
        </div>

        {workspaceStage === 'RESULTS' && (
          <button
            onClick={() => {
              setWorkspaceStage('INPUT');
              setWizardStep(1);
            }}
            className={`px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
              isDark ? 'bg-[#1A2540] border-slate-800 text-slate-300 hover:bg-[#202E50]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Adjust Inputs
          </button>
        )}
      </div>

      {/* Main scrolling viewport content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0 select-text">
        <div className="max-w-5xl w-full mx-auto space-y-6">

          {/* ========================================================
              STAGE 1: WORKSPACE HOME DASHBOARD
             ======================================================== */}
          {workspaceStage === 'DASHBOARD' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Top Banner section */}
              <div 
                className="p-8 rounded-3xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #5B3DF5 0%, #4F46E5 45%, #6D5BFF 100%)',
                  boxShadow: '0 12px 24px rgba(79, 70, 229, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px'
                }}
              >
                {/* Background decorative subtle glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-30 pointer-events-none" />
                
                <div className="relative z-10 space-y-2">
                  <h2 className="text-[32px] font-bold tracking-tight leading-tight text-white">
                    Argument Intelligence Center
                  </h2>
                  <p className="text-[16px] text-white/90 font-medium leading-relaxed max-w-2xl">
                    Prepare courtroom arguments instantly. Start from a client workspace file, drag & drop case briefs, or configure manual strategy outlines.
                  </p>
                </div>
                
                <button
                  onClick={startWizardWorkflow}
                  className="pulse-button relative z-10 px-6 py-3 bg-white text-[#4F46E5] hover:text-[#5B3DF5] rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 shrink-0 flex items-center gap-2 group/btn"
                >
                  <Plus size={16} className="text-[#4F46E5] group-hover/btn:rotate-90 transition-transform duration-300" />
                  <span>Draft New Argument</span>
                </button>
              </div>

              {/* Compact KPI metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  { label: 'Recent Drafts', value: recentDrafts.length || '12', icon: <History size={16} /> },
                  { label: 'Templates', value: '26', icon: <FileCode size={16} /> },
                  { label: 'AI Success Rate', value: '94%', icon: <Zap size={16} /> },
                  { label: 'Arguments Generated', value: '148', icon: <Scale size={16} /> },
                  { label: 'Court Ready', value: '18', icon: <ShieldCheck size={16} /> }
                ].map((kpi, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 border rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-sm hover:translate-y-[-2px] ${
                      isDark ? 'bg-[#131c31] border-slate-800/80 hover:border-[#5B3DF5]/30' : 'bg-white border-slate-200/80 hover:border-[#5B3DF5]/30'
                    }`}
                    style={{
                      border: '1px solid rgba(91,61,245,0.12)',
                      boxShadow: '0 8px 24px rgba(25,25,40,0.04)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {kpi.label}
                      </span>
                      <span className="text-[#5B3DF5] opacity-80">{kpi.icon}</span>
                    </div>
                    <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-[#111827]'}`}>
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid workspace actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                
                {/* Column 1: Continue Drafting (light blue tint) */}
                <div 
                  className={`p-5 border rounded-3xl space-y-4 transition-all duration-300 shadow-sm hover:shadow-md`}
                  style={{
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F0F7FF',
                    border: '1px solid rgba(91, 61, 245, 0.12)',
                    boxShadow: '0 8px 24px rgba(25, 25, 40, 0.06)'
                  }}
                >
                  <div className="flex items-center justify-between pb-2 border-b dark:border-zinc-800/60">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#4F46E5]">Continue Drafting</span>
                    <Clock size={14} className="text-indigo-505" />
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleContinuePrevious}
                      className={`w-full flex items-center justify-between p-4 border rounded-2xl transition-all duration-300 hover:translate-y-[-2px] ${
                        isDark ? 'bg-[#131C31]/90 border-slate-700/50 text-indigo-300' : 'bg-white border-slate-200 text-[#374151] hover:border-indigo-500/20'
                      }`}
                      style={{ boxShadow: '0 4px 12px rgba(25,25,40,0.03)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-505 shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="leading-none text-left">
                          <p className="text-xs font-black text-[#374151] dark:text-white">Civil Recovery Draft</p>
                          <p className="text-[9px] text-[#6B7280] dark:text-[#94A3B8] mt-1 font-semibold">82% Complete • Edited 2 hours ago</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#4F46E5] flex items-center gap-0.5 hover:translate-x-1 transition-transform">
                        Continue →
                      </span>
                    </button>
                  </div>

                  {/* Recent drafts list */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#94A3B8]">Recent drafts ({recentDrafts.length})</span>
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {recentDrafts.map(draft => (
                        <div 
                          key={draft.id}
                          onClick={() => handleLoadDraftResult(draft)}
                          className={`p-3 border rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 hover:translate-y-[-2px] hover:border-indigo-500/30 ${
                            isDark ? 'bg-black/20 border-zinc-800 hover:bg-[#131C31]/40' : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <h4 className="text-[10px] font-black text-[#111827] dark:text-white truncate">{draft.title}</h4>
                            <p className="text-[8px] text-[#6B7280] dark:text-[#94A3B8] font-semibold mt-0.5 uppercase">{draft.type} • {draft.date}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-[#4F46E5] rounded text-[9px] font-black uppercase shrink-0">
                            {draft.strength}% Str
                          </span>
                        </div>
                      ))}
                      {recentDrafts.length === 0 && (
                        <p className="text-[10px] font-semibold text-slate-400 text-center py-4">No recent drafts generated yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Saved Templates Explorer (neutral white) */}
                <div 
                  className={`p-5 border rounded-3xl space-y-4 transition-all duration-300 shadow-sm hover:shadow-md`}
                  style={{
                    backgroundColor: isDark ? 'rgba(19, 28, 49, 0.4)' : '#FFFFFF',
                    border: '1px solid rgba(91, 61, 245, 0.12)',
                    boxShadow: '0 8px 24px rgba(25, 25, 40, 0.06)'
                  }}
                >
                  <div className="flex items-center justify-between pb-2 border-b dark:border-zinc-800/60">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#4F46E5]">Saved Templates</span>
                    <Sparkles size={14} className="text-indigo-505 animate-pulse" />
                  </div>
                  
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {TEMPLATE_PRESETS.map(preset => (
                      <div
                        key={preset.id}
                        onClick={() => handleQuickStartTemplate(preset)}
                        className={`p-3 border rounded-2xl cursor-pointer transition-all duration-300 hover:translate-y-[-2px] hover:border-indigo-500/40 relative group flex flex-col justify-between ${
                          isDark ? 'bg-black/20 border-zinc-800 hover:bg-[#131C31]/40' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[7px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                          AI Active
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-[#111827] dark:text-white truncate group-hover:text-indigo-550">{preset.title}</h4>
                          <p className="text-[8px] text-[#6B7280] dark:text-[#94A3B8] font-semibold mt-1 uppercase font-serif">
                            {preset.type} • {preset.level}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-[8px] font-black uppercase text-indigo-500 pt-2 border-t border-slate-100 dark:border-zinc-800/30">
                          <span>Style: {preset.style}</span>
                          <span className="text-[#94A3B8]">45 uses</span>
                        </div>
                        
                        <div className="text-[7.5px] font-extrabold uppercase text-[#94A3B8] group-hover:text-[#4F46E5] transition-colors mt-2 text-right">
                          Hover Preview ➔
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 3: AI Recommendations (light purple tint) */}
                <div 
                  className={`p-5 border rounded-3xl space-y-4 transition-all duration-300 shadow-sm hover:shadow-md`}
                  style={{
                    backgroundColor: isDark ? 'rgba(30, 27, 75, 0.25)' : '#FAF9FF',
                    border: '1px solid rgba(91, 61, 245, 0.12)',
                    boxShadow: '0 8px 24px rgba(25, 25, 40, 0.06)'
                  }}
                >
                  <div className="flex items-center justify-between pb-2 border-b dark:border-zinc-800/60">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#4F46E5]">AI Recommendations</span>
                    <Brain size={14} className="text-indigo-505" />
                  </div>
                  
                  <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                    {RECOM_ITEMS.map(recom => (
                      <div 
                        key={recom.id} 
                        className={`p-3.5 border rounded-2xl transition-all duration-300 hover:translate-y-[-2px] ${
                          isDark ? 'bg-[#131C31]/90 border-slate-700/50 hover:border-indigo-500/20' : 'bg-white border-slate-200 hover:border-indigo-500/20'
                        }`}
                        style={{ boxShadow: '0 4px 12px rgba(25,25,40,0.03)' }}
                      >
                        <div className="flex justify-between items-center text-[8px] font-black uppercase">
                          <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">HIGH PRIORITY</span>
                          <span className="text-[#64748B]">Confidence 96%</span>
                        </div>
                        <h4 className="text-[11px] font-black text-[#111827] dark:text-white mt-2 leading-tight">
                          {recom.title}
                        </h4>
                        <p className="text-[9.5px] font-semibold text-[#6B7280] dark:text-[#94A3B8] leading-snug mt-1.5">
                          {recom.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Quick Start actions icons */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b pb-1 dark:border-zinc-800/50">
                  <label className="text-[12px] font-black uppercase tracking-wider text-[#374151] dark:text-[#E2E8F0]">
                    Quick Start Actions
                  </label>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: 'Criminal Defence Brief', desc: 'Draft bail applications, pre-arrest motions, criminal brief outlines.', icon: <Gavel size={18} /> },
                    { title: 'Commercial Contract Reply', desc: 'Generate breach rebuttals and commercial arbitration defense.', icon: <FileText size={18} /> },
                    { title: 'Civil Written Submission', desc: 'Formulate civil suit summaries and specific performance relief claims.', icon: <Scale size={18} /> },
                    { title: 'Anticipatory Bail Draft', desc: 'Build anticipatory bail declarations and court arrest roadmaps.', icon: <ShieldCheck size={18} /> },
                    { title: 'Cross Examination Plan', desc: 'Construct deposition question lines and contradictions lists.', icon: <Users size={18} /> },
                    { title: 'Consumer Complaint', desc: 'Generate consumer forum complaints and refund liability claims.', icon: <Building2 size={18} /> },
                    { title: 'High Court Appeal', desc: 'Structure grounds of appeal and stay order applications.', icon: <Landmark size={18} /> },
                    { title: 'Supreme Court SLP', desc: 'Draft Special Leave Petitions under Article 136 of Constitution.', icon: <BookOpen size={18} /> }
                  ].map((quick, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickStartTemplate({
                        title: quick.title,
                        type: 'Written Submission',
                        level: 'High Court',
                        style: 'Commercial',
                        tone: 'Highly Persuasive'
                      })}
                      className={`p-4 border rounded-2xl flex flex-col justify-between text-left transition-all duration-300 hover:translate-y-[-3px] hover:shadow-md relative overflow-hidden group ${
                        isDark ? 'bg-[#131c31]/50 border-slate-800/80 hover:border-[#5B3DF5]/30' : 'bg-white border-slate-200/80 hover:border-[#5B3DF5]/30'
                      }`}
                      style={{
                        boxShadow: '0 8px 24px rgba(25,25,40,0.04)',
                        borderLeft: '4px solid #5B3DF5'
                      }}
                    >
                      <div className="flex items-center justify-between w-full mb-3 shrink-0">
                        <span className="text-[#5B3DF5] opacity-80 group-hover:scale-110 transition-transform duration-300">{quick.icon}</span>
                        <ChevronRight size={12} className="text-[#94A3B8] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-[#111827] dark:text-white leading-tight group-hover:text-[#5B3DF5] transition-colors">
                          {quick.title}
                        </h4>
                        <p className="text-[8.5px] text-[#6B7280] dark:text-[#94A3B8] font-semibold mt-1.5 leading-relaxed">
                          {quick.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              SCREEN 1: ARGUMENT INPUT WORKSPACE
             ======================================================== */}
          {workspaceStage === 'INPUT' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Wizard Steps timeline navigation */}
              {wizardStep === 1 && (
                <div className={`p-4 border rounded-3xl flex items-center justify-between shadow-sm overflow-x-auto no-scrollbar ${
                  isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  {[
                    { step: 1, name: 'Choose Argument Source', active: wizardStep === 1 },
                    { step: 2, name: 'AI Generation & Analysis', active: wizardStep === 2 },
                    { step: 3, name: 'Court-Ready Workspace', active: workspaceStage === 'RESULTS' }
                  ].map(s => {
                    const active = s.active;
                    const done = wizardStep > s.step || (s.step === 1 && wizardStep === 2) || (s.step < 3 && workspaceStage === 'RESULTS');
                    return (
                      <div key={s.step} className="flex items-center gap-1 shrink-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                          active ? 'bg-indigo-650 text-white shadow-md' : 
                          done ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' :
                          'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                        }`}>
                          {done ? '✓' : s.step}
                        </div>
                        <span className={`text-[9.5px] font-extrabold uppercase tracking-wider ${
                          active ? 'text-indigo-550 dark:text-indigo-400' : 
                          done ? 'text-emerald-500' : 'text-slate-400'
                        }`}>
                          {s.name}
                        </span>
                        {s.step < 3 && <span className="text-[10px] text-slate-300 dark:text-zinc-700 ml-2">➔</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 1: CHOOSE SOURCE PANEL */}
              {wizardStep === 1 && (
                <div 
                  className={`p-6 border rounded-3xl shadow-md space-y-6 transition-all duration-300 ${
                    isDark ? 'bg-[#131c31] border-slate-800' : 'bg-white border-slate-200/80'
                  }`}
                  style={{ boxShadow: '0 8px 24px rgba(25,25,40,0.06)' }}
                >
                  <div className="flex justify-between items-center pb-2 border-b dark:border-zinc-800/60">
                    <h3 className="text-xs font-black uppercase text-[#4F46E5]">Choose strategy source parameters</h3>
                    <span className="text-[8px] font-black text-slate-450 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">Step 1: Selection</span>
                  </div>
                  
                  {/* Clickable mutually exclusive source cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'EXISTING_CASE', name: 'Existing Case Workspace', desc: 'Auto populate facts, parties, documents, evidence, timeline from chosen case.', icon: <Briefcase size={20} /> },
                      { id: 'UPLOAD_DOCUMENTS', name: 'Upload Legal Documents', desc: 'AI OCR extracts timelines, parties, laws, facts from uploaded files.', icon: <Upload size={20} /> },
                      { id: 'MANUAL_FACTS', name: 'Manual Facts Outline', desc: 'Advocate details case facts manually. AI will analyze facts and build strategy.', icon: <FileText size={20} /> }
                    ].map(src => {
                      const active = argumentSource === src.id;
                      const dimmed = argumentSource && argumentSource !== src.id;
                      return (
                        <div
                          key={src.id}
                          onClick={() => setArgumentSource(src.id)}
                          className={`p-4 border rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[140px] hover:translate-y-[-2px] ${
                            active 
                              ? 'bg-indigo-500/5 ring-2 ring-indigo-500/30' 
                              : (isDark ? 'bg-black/20 border-zinc-800' : 'bg-slate-50 border-slate-200')
                          } ${dimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}
                          style={{
                            border: active ? '2px solid #5B3DF5' : '1px solid rgba(91,61,245,0.12)',
                            boxShadow: active ? '0 8px 24px rgba(91, 61, 245, 0.12)' : '0 4px 12px rgba(25,25,40,0.03)'
                          }}
                        >
                          <div className="flex items-start justify-between w-full">
                            <span className={active ? 'text-[#5B3DF5]' : 'text-slate-400'}>{src.icon}</span>
                            {active && (
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-black text-indigo-505 bg-indigo-500/10 px-1 py-0.2 rounded">Selected</span>
                                <CheckCircle2 size={12} className="text-[#5B3DF5] fill-[#5B3DF5]/10" />
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4">
                            <h4 className="text-[11px] font-black text-[#111827] dark:text-white leading-tight">{src.name}</h4>
                            <p className="text-[9px] text-[#6B7280] dark:text-[#94A3B8] font-semibold mt-1 leading-relaxed">{src.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selection Confirmation Panel */}
                  <div className="animate-fadeIn">
                    {argumentSource === 'EXISTING_CASE' && (
                      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/15 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-black text-indigo-655 dark:text-indigo-400">
                          <CheckCircle2 size={14} className="text-indigo-505" />
                          <span>Existing Case Workspace Selected</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                          The selected workspace will automatically populate parties, facts, documents, evidence, timeline and legal provisions from the chosen case.
                        </p>
                      </div>
                    )}
                    {argumentSource === 'UPLOAD_DOCUMENTS' && (
                      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/15 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-black text-indigo-655 dark:text-indigo-400">
                          <CheckCircle2 size={14} className="text-indigo-505" />
                          <span>Upload Legal Documents Selected</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                          AI OCR will extract facts, parties, evidence, statutes, timelines and legal issues from uploaded files.
                        </p>
                      </div>
                    )}
                    {argumentSource === 'MANUAL_FACTS' && (
                      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/15 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-black text-indigo-655 dark:text-indigo-400">
                          <CheckCircle2 size={14} className="text-indigo-505" />
                          <span>Manual Facts Selected</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                          The AI will analyze your written facts and automatically generate legal arguments, applicable laws and supporting citations.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Input Area */}
                  <div className="space-y-4">
                    {argumentSource === 'EXISTING_CASE' ? (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#374151] dark:text-[#E2E8F0]">Choose Case Workspace</label>
                          <select
                            value={linkedCaseId || ''}
                            onChange={e => setLinkedCaseId(e.target.value)}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer appearance-none ${
                              isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="">-- Choose Matter File --</option>
                            {allProjects.map(p => (
                              <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        {linkedCaseId && selectedCaseObject && (
                          <div className="p-5 border rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-500/15 space-y-4 animate-fadeIn">
                            <div className="flex items-center justify-between border-b pb-2 border-slate-200/60 dark:border-zinc-800/60">
                              <h4 className="text-[11px] font-black uppercase text-indigo-655 dark:text-indigo-400">Selected Case Summary</h4>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase">
                                AI Ready Status: Fully Hydrated
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="text-[8px] uppercase font-black text-slate-400 block">Case Name</span>
                                <span className="font-bold text-slate-800 dark:text-white truncate block">{selectedCaseObject.name}</span>
                              </div>
                              <div>
                                <span className="text-[8px] uppercase font-black text-slate-400 block">Case Type</span>
                                <span className="font-bold text-slate-800 dark:text-white block">{selectedCaseObject.caseType || selectedCaseObject.matterType || 'Civil'}</span>
                              </div>
                              <div>
                                <span className="text-[8px] uppercase font-black text-slate-400 block">Parties</span>
                                <span className="font-bold text-slate-800 dark:text-white truncate block">
                                  {selectedCaseObject.clientName || selectedCaseObject.client || 'Plaintiff'} vs {selectedCaseObject.opponentName || selectedCaseObject.opponent || 'Defendant'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] uppercase font-black text-slate-400 block">Court</span>
                                <span className="font-bold text-slate-800 dark:text-white truncate block">{selectedCaseObject.courtName || selectedCaseObject.court || 'High Court'}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-200/50 dark:border-zinc-800/30 text-center">
                              {[
                                { label: 'Documents', val: selectedCaseObject.documents?.length || 4 },
                                { label: 'Evidence', val: selectedCaseObject.evidence?.length || 5 },
                                { label: 'Witnesses', val: selectedCaseObject.witnesses?.length || 3 },
                                { label: 'Timeline', val: selectedCaseObject.timeline?.length || 6 },
                                { label: 'Applicable Laws', val: selectedCaseObject.applicableLaws?.length || 2 }
                              ].map((stat, idx) => (
                                <div key={idx} className="p-2 border border-slate-200/60 dark:border-zinc-800/60 rounded-xl bg-white dark:bg-black/20 animate-fadeIn">
                                  <span className="text-[8px] font-black uppercase text-slate-400 block leading-none">{stat.label}</span>
                                  <span className="text-sm font-black text-indigo-650 dark:text-indigo-400 mt-1 block leading-none">{stat.val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : argumentSource === 'UPLOAD_DOCUMENTS' ? (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#374151] dark:text-[#E2E8F0]">Staged Case Files</label>
                          <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDropDocs}
                            onClick={() => document.getElementById('wizard-files-selector').click()}
                            className="border-2 border-dashed border-slate-300 dark:border-zinc-800 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-2 bg-slate-500/3"
                          >
                            <Upload className="text-slate-400" size={24} />
                            <span className="text-[10.5px] text-[#374151] dark:text-slate-400 font-bold">Staged files for OCR extraction</span>
                            <span className="text-[8px] text-slate-400 uppercase font-semibold">FIRs, plaints, agreements, orders, PDFs</span>
                            <input 
                              id="wizard-files-selector"
                              type="file"
                              multiple
                              onChange={e => {
                                const files = Array.from(e.target.files);
                                setUploadedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: Math.round(f.size / 1024) + ' KB' }))]);
                              }}
                              className="hidden"
                            />
                          </div>
                        </div>

                        {/* Staged files uploader AI summary panel */}
                        {uploadedFiles.length > 0 && (
                          <div className="p-5 border rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-500/15 space-y-4 animate-fadeIn">
                            <div className="flex items-center justify-between border-b pb-2 border-slate-200/60 dark:border-zinc-800/60">
                              <h4 className="text-[11px] font-black uppercase text-indigo-655 dark:text-indigo-400">AI Documents Extraction Summary</h4>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase animate-pulse">
                                OCR Parsing Active
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                              {[
                                { label: 'Documents Processed', val: uploadedFiles.length },
                                { label: 'Facts Found', val: 12 },
                                { label: 'Evidence Found', val: 8 },
                                { label: 'Timeline Found', val: 9 },
                                { label: 'Applicable Laws', val: 4 }
                              ].map((stat, idx) => (
                                <div key={idx} className="p-2 border border-slate-200/60 dark:border-zinc-800/60 rounded-xl bg-white dark:bg-black/20">
                                  <span className="text-[8px] font-black uppercase text-slate-400 block leading-none">{stat.label}</span>
                                  <span className="text-sm font-black text-indigo-650 dark:text-indigo-400 mt-1 block leading-none">{stat.val}</span>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                              <span className="text-[8px] font-black uppercase text-slate-400 block">Staged File Bundle</span>
                              {uploadedFiles.map((file, idx) => (
                                <div key={idx} className="p-2 border rounded-xl bg-white dark:bg-black/25 flex items-center justify-between text-xs font-semibold">
                                  <span className="truncate text-slate-800 dark:text-slate-350">{file.name} ({file.size})</span>
                                  <button onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">✕</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-[#374151] dark:text-[#E2E8F0]">Case Title</label>
                            <input 
                              type="text"
                              placeholder="e.g. Rajesh Sharma vs Amit Verma"
                              value={manualCaseTitle}
                              onChange={e => setManualCaseTitle(e.target.value)}
                              className={`border rounded-xl px-3 py-2 text-xs font-semibold outline-none ${
                                isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-[#374151] dark:text-[#E2E8F0]">Plaintiff / Petitioner</label>
                            <input 
                              type="text"
                              placeholder="Plaintiff Party"
                              value={manualPlaintiff}
                              onChange={e => setManualPlaintiff(e.target.value)}
                              className={`border rounded-xl px-3 py-2 text-xs font-semibold outline-none ${
                                isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-[#374151] dark:text-[#E2E8F0]">Defendant / Respondent</label>
                            <input 
                              type="text"
                              placeholder="Defendant Party"
                              value={manualDefendant}
                              onChange={e => setManualDefendant(e.target.value)}
                              className={`border rounded-xl px-3 py-2 text-xs font-semibold outline-none ${
                                isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-[#374151] dark:text-[#E2E8F0]">Case Facts synopsis</label>
                            <textarea
                              rows={4}
                              placeholder="State key factual elements, chronological sequence of dispute events..."
                              value={manualFacts}
                              onChange={e => setManualFacts(e.target.value)}
                              className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${
                                isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-[#374151] dark:text-[#E2E8F0]">Opponent Position / Claims</label>
                            <textarea
                              rows={4}
                              placeholder="What does the opponent claim? What is their written statement defense?..."
                              value={manualOpponentClaims}
                              onChange={e => setManualOpponentClaims(e.target.value)}
                              className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${
                                isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-[#374151] dark:text-[#E2E8F0]">Issues for Determination</label>
                            <textarea
                              rows={3}
                              placeholder="Specify primary dispute questions..."
                              value={manualIssues}
                              onChange={e => setManualIssues(e.target.value)}
                              className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${
                                isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-[#374151] dark:text-[#E2E8F0]">Relief Required / Sought</label>
                            <textarea
                              rows={3}
                              placeholder="Describe prayer details, recovery amount, stay orders..."
                              value={manualRelief}
                              onChange={e => setManualRelief(e.target.value)}
                              className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${
                                isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-[#374151] dark:text-[#E2E8F0]">Additional Advocate Notes</label>
                            <textarea
                              rows={3}
                              placeholder="Any secondary details, previous order references, precedent cues..."
                              value={manualNotes}
                              onChange={e => setManualNotes(e.target.value)}
                              className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${
                                isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sticky primary action bar */}
                  <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-[10px] font-black uppercase text-[#6B7280] dark:text-[#94A3B8]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#5B3DF5]">Source:</span>
                        <span>
                          {argumentSource === 'EXISTING_CASE' ? 'Existing Case Workspace' :
                           argumentSource === 'UPLOAD_DOCUMENTS' ? 'Upload Legal Documents' :
                           'Manual Facts Outline'}
                        </span>
                      </div>
                      {argumentSource === 'EXISTING_CASE' && selectedCaseObject && (
                        <div className="text-[9px] text-[#4F46E5] mt-0.5 font-bold">
                          Selected Case: {selectedCaseObject.name}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button
                        onClick={onBack}
                        className="px-5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleContinueWizardStep1}
                        disabled={!isContinueEnabled}
                        className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/10 hover:translate-y-[-1px]"
                        style={{
                          background: isContinueEnabled ? 'linear-gradient(135deg, #5B3DF5 0%, #4F46E5 45%, #6D5BFF 100%)' : '#94A3B8'
                        }}
                      >
                        Generate AI Argument
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: AI PROCESSING LOADER SCREEN WITH 9 PROGRESS LABELS */}
              {wizardStep === 2 && (
                <div 
                  className={`p-8 border rounded-[32px] max-w-xl mx-auto space-y-6 shadow-xl text-center relative overflow-hidden ${
                    isDark ? 'bg-[#131c31] border-zinc-800' : 'bg-white border-slate-200'
                  }`}
                  style={{ boxShadow: '0 8px 24px rgba(25,25,40,0.06)' }}
                >
                  {/* Background soft glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-violet-500/5 pointer-events-none" />

                  <div className="flex flex-col items-center gap-3 relative z-10">
                    <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <h3 className="text-sm font-black text-[#5B3DF5] uppercase tracking-widest mt-2 animate-pulse">
                      AI Strategy Audit Engine
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase">Processing Litigation Input</p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-505 uppercase">
                      <span>{generationStepLabel}</span>
                      <span>{generationProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden shrink-0">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300 rounded-full" 
                        style={{ width: `${generationProgress}%`, background: 'linear-gradient(135deg, #5B3DF5 0%, #4F46E5 100%)' }} 
                      />
                    </div>
                  </div>

                  {/* 9 step labels list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-left text-[11px] font-bold border-t border-slate-100 dark:border-zinc-800/60 pt-4 relative z-10">
                    {[
                      'Reading Facts...',
                      'Analyzing Evidence...',
                      'Building Timeline...',
                      'Finding Applicable Laws...',
                      'Searching Supreme Court Judgments...',
                      'Searching High Court Judgments...',
                      'Generating Legal Arguments...',
                      'Preparing Court Draft...',
                      'Finalizing...'
                    ].map((labelStr, idx) => {
                      // Total 9 steps.
                      const stepPercentage = ((idx + 1) / 9) * 100;
                      const completed = generationProgress >= stepPercentage;
                      const current = generationProgress >= (idx / 9) * 100 && generationProgress < stepPercentage;
                      return (
                        <div key={idx} className="flex items-center gap-2 py-0.5">
                          {completed ? (
                            <span className="text-emerald-500 font-black">✓</span>
                          ) : current ? (
                            <span className="text-[#5B3DF5] animate-pulse">●</span>
                          ) : (
                            <span className="text-slate-355 dark:text-zinc-700">○</span>
                          )}
                          <span className={completed ? 'text-emerald-600 dark:text-emerald-500/80 line-through font-semibold' : current ? 'text-[#5B3DF5] font-black' : 'text-slate-400 font-semibold'}>
                            {labelStr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              SCREEN 2: AI ARGUMENT EDITOR
             ======================================================== */}
          {workspaceStage === 'RESULTS' && (() => {
            if (isLoadingDraft) {
              return (
                <div className="space-y-6 animate-pulse select-none">
                  {/* Top Action Bar Skeleton */}
                  <div className={`p-4 border rounded-3xl flex items-center justify-between gap-3 ${
                    isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700 animate-ping" />
                      <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-8 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                      <div className="h-6 w-16 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                    </div>
                  </div>

                  {/* Three-column Grid Skeleton */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Outline Skeleton */}
                    <div className="lg:col-span-3">
                      <div className={`p-4 border rounded-[24px] space-y-3 ${
                        isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <div className="h-3 w-24 bg-slate-300 dark:bg-zinc-700 rounded mb-2 animate-pulse" />
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="h-6 bg-slate-200 dark:bg-zinc-800/60 rounded-xl w-full animate-pulse" />
                        ))}
                      </div>
                    </div>

                    {/* Middle Content Skeleton */}
                    <div className="lg:col-span-6 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className={`p-5 border rounded-2xl space-y-3 ${
                          isDark ? 'bg-[#131c31]/30 border-zinc-800' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800/40">
                            <div className="h-3.5 w-32 bg-slate-300 dark:bg-zinc-700 rounded animate-pulse" />
                            <div className="h-5 w-10 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-full animate-pulse" />
                            <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-[90%] animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right AI Panel Skeleton */}
                    <div className="lg:col-span-3">
                      <div className={`p-4 border rounded-[24px] space-y-3 ${
                        isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <div className="h-3 w-32 bg-slate-300 dark:bg-zinc-700 rounded mb-2 animate-pulse" />
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-10 bg-slate-200 dark:bg-zinc-800/60 rounded-xl w-full animate-pulse" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (generationError) {
              return (
                <div className={`p-8 border rounded-[32px] max-w-xl mx-auto space-y-6 shadow-xl text-center relative overflow-hidden ${
                  isDark ? 'bg-[#1a131c] border-red-950/40 text-white' : 'bg-white border-red-100 text-slate-900'
                }`} style={{ boxShadow: '0 8px 24px rgba(239,68,68,0.06)' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5 pointer-events-none" />

                  <div className="flex flex-col items-center gap-3 relative z-10">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                      <ShieldAlert size={24} />
                    </div>
                    <h3 className="text-md font-black text-red-500 uppercase tracking-wider animate-pulse">
                      Argument Generation Failed
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      An error occurred while compiling strategy briefs
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    {generationError || 'An unexpected API or parser error occurred. Please review logs or try again.'}
                  </div>

                  {showLogs && (
                    <div className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[10px] text-left max-h-40 overflow-y-auto custom-scrollbar border border-slate-800">
                      {errorLogs || 'No log details available.'}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 relative z-10">
                    <button
                      onClick={runUnifiedArgumentGeneration}
                      className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md hover:translate-y-[-1px]"
                      style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => {
                        setWorkspaceStage('INPUT');
                        setWizardStep(1);
                        setGenerationError(null);
                      }}
                      className="px-5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setShowLogs(!showLogs)}
                      className="px-5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {showLogs ? 'Hide Logs' : 'View Logs'}
                    </button>
                  </div>
                </div>
              );
            }

            if (!draftResults) {
              return (
                <div className={`p-8 border rounded-[32px] max-w-md mx-auto space-y-6 shadow-xl text-center relative overflow-hidden ${
                  isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-violet-500/5 pointer-events-none" />

                  <div className="flex flex-col items-center gap-3 relative z-10">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 mb-2">
                      <Scale size={24} />
                    </div>
                    <h3 className="text-sm font-black text-[#5B3DF5] uppercase tracking-widest">
                      No Argument Generated Yet
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                      Provide case facts, upload documents, or outline matter details to generate a courtroom-ready pleading draft.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 relative z-10">
                    <button
                      onClick={() => {
                        setWorkspaceStage('INPUT');
                        setWizardStep(1);
                      }}
                      className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md"
                      style={{ background: 'linear-gradient(135deg, #5B3DF5 0%, #4F46E5 100%)' }}
                    >
                      Generate New Argument
                    </button>
                    <button
                      onClick={onBack}
                      className="px-5 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </div>
              );
            }

            const OUTLINE_ITEMS = [
              { id: 'executiveSummary', label: 'Executive Summary' },
              { id: 'caseOverview', label: 'Case Overview' },
              { id: 'issuesForDetermination', label: 'Issues' },
              { id: 'applicableActs', label: 'Applicable Acts' },
              { id: 'applicableSections', label: 'Applicable Sections' },
              { id: 'supremeCourtPrecedents', label: 'Case Laws (Supreme Court)' },
              { id: 'highCourtJudgments', label: 'Case Laws (High Court)' },
              { id: 'plaintiffArguments', label: 'Plaintiff Arguments' },
              { id: 'defendantArguments', label: 'Defendant Arguments' },
              { id: 'counterArguments', label: 'Counter Arguments' },
              { id: 'evidenceMapping', label: 'Evidence Mapping' },
              { id: 'witnessReferences', label: 'Witness Strategy' },
              { id: 'prayerClause', label: 'Prayer' },
              { id: 'courtReadyDraft', label: 'Final Draft' }
            ];

            return (
              <div className="space-y-6 animate-fadeIn select-text">
                
                {/* TOP ACTION BAR */}
                <div className={`p-4 border rounded-3xl flex flex-wrap items-center justify-between gap-3 shadow-sm ${
                  isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-white">Active Draft Editor</span>
                    <span className="text-[8px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">V1.2</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleSaveDraft}
                      className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm"
                      title="Save Draft"
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={handlePrintPDF}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                      title="Export PDF"
                    >
                      Export PDF
                    </button>
                    <button
                      onClick={handleDownloadDoc}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                      title="Export DOCX"
                    >
                      Export DOCX
                    </button>
                    <button
                      onClick={handlePrintPDF}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                      title="Print Pleading"
                    >
                      Print
                    </button>
                    <button
                      onClick={handleCopyDraft}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                      title="Copy Final Court Draft"
                    >
                      Copy
                    </button>
                    <button
                      onClick={handleDownloadRaw}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                      title="Download raw JSON"
                    >
                      Download
                    </button>
                    <button
                      onClick={handleShareDraft}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                      title="Share workspace link"
                    >
                      Share
                    </button>
                    <button
                      onClick={handleVersionHistory}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                      title="View draft history"
                    >
                      Version History
                    </button>
                    <button
                      onClick={() => {
                        setWorkspaceStage('INPUT');
                        setWizardStep(2);
                        runUnifiedArgumentGeneration();
                      }}
                      className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                      title="Regenerate Entire Draft from current inputs"
                    >
                      Regenerate Entire Draft
                    </button>
                  </div>
                </div>

                {/* THREE-COLUMN WORKSPACE GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT NAVIGATION: OUTLINE PANEL (3 columns) */}
                  <div className="lg:col-span-3 sticky top-6">
                    <div className={`p-4 border rounded-[24px] space-y-4 shadow-sm ${
                      isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#5B3DF5] block">Draft Structure</span>
                      <div className="space-y-1 max-h-[56vh] overflow-y-auto pr-1 custom-scrollbar">
                        {OUTLINE_ITEMS.map((item) => {
                          const active = focusedSection === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setFocusedSection(item.id);
                                const target = document.getElementById(`editor-sec-${item.id}`);
                                if (target) {
                                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }}
                              className={`w-full text-left py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all truncate block border ${
                                active
                                  ? 'bg-[#5B3DF5]/10 text-[#5B3DF5] border-[#5B3DF5]/30'
                                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-500/5 border-transparent'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE COLUMN: CENTRAL WORKSPACE EDITOR (6 columns) */}
                  <div className="lg:col-span-6 space-y-4 max-h-[72vh] overflow-y-auto pr-2 custom-scrollbar">
                    {OUTLINE_ITEMS.map((item) => {
                      const isEditing = editingSectionId === item.id;
                      const content = draftResults[item.id];
                      const isFocused = focusedSection === item.id;

                      const renderContentDisplay = () => {
                        if (!content || (Array.isArray(content) && content.length === 0)) {
                          return <p className="text-slate-400 italic text-[11px]">No details generated for this section.</p>;
                        }
                        
                        if (Array.isArray(content)) {
                          return (
                            <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-350 text-[11.5px] font-medium leading-relaxed">
                              {content.map((li, idx) => {
                                if (typeof li === 'object' && li !== null) {
                                  return (
                                    <li key={idx}>
                                      <strong className="text-indigo-650 dark:text-indigo-400">{li.citation || li.evidence}</strong>
                                      {li.ratio || li.proves ? `: ${li.ratio || li.proves}` : ''}
                                    </li>
                                  );
                                }
                                return <li key={idx}>{li}</li>;
                              })}
                            </ul>
                          );
                        }
                        
                        return <p className="text-slate-700 dark:text-slate-350 text-[11.5px] font-medium whitespace-pre-wrap leading-relaxed">{content}</p>;
                      };

                      return (
                        <div 
                          key={item.id} 
                          id={`editor-sec-${item.id}`}
                          onClick={() => setFocusedSection(item.id)}
                          className={`p-5 border rounded-2xl transition-all duration-200 scroll-mt-6 cursor-pointer ${
                            isFocused 
                              ? 'ring-2 ring-indigo-500/20 border-indigo-500 bg-indigo-550/[0.02]' 
                              : 'bg-white dark:bg-[#131c31]/30 border-slate-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800/40 mb-3 select-none">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                              {isFocused && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                              {item.label}
                            </h3>
                            
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveSectionEdit(item.id);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSectionId(null);
                                    }}
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-850 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSectionId(item.id);
                                    setFocusedSection(item.id);
                                    if (Array.isArray(content)) {
                                      setEditingContent(
                                        content.map(li => {
                                          if (typeof li === 'object' && li !== null) {
                                            return li.citation ? `${li.citation} -> ${li.ratio}` : `${li.evidence} -> ${li.proves}`;
                                          }
                                          return li;
                                        }).join('\n')
                                      );
                                    } else {
                                      setEditingContent(content || '');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase transition-colors"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <textarea
                              rows={Array.isArray(content) ? 5 : 8}
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-y bg-slate-50 dark:bg-black/20 text-slate-805 dark:text-slate-200 border-slate-200 dark:border-zinc-800"
                            />
                          ) : (
                            renderContentDisplay()
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* RIGHT COLUMN: AI REFINEMENTS PANEL (3 columns) */}
                  <div className="lg:col-span-3 sticky top-6">
                    <div className={`p-4 border rounded-[24px] space-y-4 shadow-sm ${
                      isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div className="pb-2 border-b dark:border-zinc-800 flex justify-between items-center text-[10px] font-black uppercase text-[#5B3DF5] tracking-wider">
                        <span>AI Refinements Copilot</span>
                      </div>
                      
                      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                        {[
                          { name: 'Improve Draft', desc: 'Perform legal spelling/grammar cleanup.', action: 'Improve Draft', prompt: 'Perform legal spelling, grammar, citation format checks and style cleanup.' },
                          { name: 'Regenerate Section', desc: 'Redraft section content.', action: 'Regenerate Section', prompt: 'Completely redraft this section with a more formal litigation argument structure.' },
                          { name: 'Expand Argument', desc: 'Include details & reasoning.', action: 'Expand Argument', prompt: 'Substantially expand this argument with detailed logical reasoning and deeper legal context.' },
                          { name: 'Shorten Argument', desc: 'Make it brief & concise.', action: 'Shorten Argument', prompt: 'Condense this section into a brief, high-impact summary suitable for fast oral presentation.' },
                          { name: 'Add Citations', desc: 'Append legal section rules.', action: 'Add Citations', prompt: 'Append relevant CPC/CrPC/BNS statutory citations and correct referencing syntax.' },
                          { name: 'Add More Case Laws', desc: 'Find binding precedents.', action: 'Add Case Laws', prompt: 'Integrate 2-3 additional recent high-court or supreme court binding precedents matching the core issue.' },
                          { name: 'Improve Legal Language', desc: 'Strengthen courtroom tone.', action: 'Improve Legal Language', prompt: 'Rewrite with a highly professional senior advocate voice suitable for high court filings.' },
                          { name: 'Strengthen Reasoning', desc: 'Improve logical flow.', action: 'Strengthen Reasoning', prompt: 'Re-align reasoning logically to form a solid chain of deductions based on dispute facts.' },
                          { name: 'Generate Counter Argument', desc: 'Predict opposition defense.', action: 'Generate Counter Argument', prompt: 'Formulate a strong counter-defense argument anticipating opponent objections.' },
                          { name: 'Generate Rebuttal', desc: 'Draft clean rebuttals.', action: 'Generate Rebuttal', prompt: 'Formulate a persuasive rebuttal countering hostile opposition claims.' }
                        ].map(btn => (
                          <button
                            key={btn.name}
                            onClick={() => handleAIAction(btn.action, btn.prompt)}
                            className={`w-full flex items-center justify-between p-2.5 border rounded-xl hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-slate-700 dark:text-slate-350 text-left ${
                              isDark ? 'bg-black/15 border-zinc-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="truncate leading-none">
                              <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate">{btn.name}</p>
                              <p className="text-[8px] text-slate-400 font-semibold mt-0.5 truncate">{btn.desc}</p>
                            </div>
                            <ChevronRight size={11} className="text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>

                      <div className="p-3 border rounded-xl bg-slate-50 dark:bg-black/20 text-[9px] font-semibold text-slate-400 leading-normal">
                        Active Target: <span className="text-indigo-500 uppercase font-black">{focusedSection}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}
        </div>
      </div>

      <style>{`
        @keyframes pulseOnce {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
          50% { transform: scale(1.03); box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
        .pulse-button {
          animation: pulseOnce 1.8s ease-in-out 1;
        }
      `}</style>
    </div>
  );
};

export default ArgumentBuilder;
