import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Plus, FileText, Copy, Share2, 
  FileDown, History, Search, X, ShieldCheck, Clock, Brain, Scale, 
  BookOpen, AlertTriangle, TrendingUp, Mic, Database, Cpu, BarChart2, Users, Save, CheckCircle2,
  Download, Printer, Edit3, Check, RefreshCw, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateChatResponse } from '../../../services/geminiService';
import { apiService } from '../../../services/apiService';
import { mapCaseToForm } from '../services/activeModuleService';
import { useActiveCase } from '../context/ActiveCaseContext';
import useOutputLanguage from '../hooks/useOutputLanguage';
import LanguageToggle from './shared/LanguageToggle';
import { exportToPDF } from '../utils/exportToPDF';

const QUICK_PRESETS = [
  { name: 'Bail Forecast', desc: 'Predict bail approval chances for financial disputes.' },
  { name: 'Adverse Possession', desc: 'Forecast land claim validity based on occupancy duration.' },
  { name: 'Contract Breach Claim', desc: 'Evaluate liability thresholds for delayed deliveries.' },
  { name: 'Cyber Intrusion Risk', desc: 'Evaluate liability for remote contractor data breaches.' }
];

const CasePredictor = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';

  // Form states
  const [caseType, setCaseType] = useState('Criminal');
  const [ipcSections, setIpcSections] = useState('');
  const [courtName, setCourtName] = useState('');
  const [facts, setFacts] = useState('');
  const [evidenceList, setEvidenceList] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [opponentDetails, setOpponentDetails] = useState('');
  const [witnessDetails, setWitnessDetails] = useState('');

  // UI Flow states
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePrediction, setActivePrediction] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [prefillBanner, setPrefillBanner] = useState(null);
  
  // Get active case context
  const activeCaseContext = useActiveCase();
  const triggerAutoRun = activeCaseContext?.triggerAutoRun;
  
  // Results UI states
  const [activeTab, setActiveTab] = useState('caseStrength');
  const [selectedReportTab, setSelectedReportTab] = useState('predictionReport');
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editedReportText, setEditedReportText] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ─── LANGUAGE TOGGLE STATE ────────────────────────────────────────
  const {
    outputLang,
    setOutputLang,
    isTranslating: isPredictorTranslating,
    setIsTranslating: setIsPredictorTranslating,
    translateText: translatePredictorText,
    getDisplayText: getPredictorDisplayText,
  } = useOutputLanguage('case_predictor', currentCase?._id || 'global');

  const [translatedReportText, setTranslatedReportText] = useState('');

  const displayPrediction = useMemo(() => {
  return activePrediction || (historyData && historyData.length > 0 ? historyData[0] : null);
}, [activePrediction, historyData]);

const originalReportText = useMemo(() => {
  return displayPrediction?.reports?.[selectedReportTab] || displayPrediction?.report || '';
}, [displayPrediction, selectedReportTab]);

  // Re-run translation whenever original report or language changes
  useEffect(() => {
    if (outputLang === 'en' || !originalReportText) {
      setTranslatedReportText('');
      return;
    }
    const cached = getPredictorDisplayText(originalReportText);
    if (cached && cached !== originalReportText) {
      setTranslatedReportText(cached);
      return;
    }
    setIsPredictorTranslating(true);
    translatePredictorText(originalReportText).then((translated) => {
      if (isMountedRef.current) setTranslatedReportText(translated);
      setIsPredictorTranslating(false);
    }).catch(() => {
      if (isMountedRef.current) setTranslatedReportText('');
      setIsPredictorTranslating(false);
    });
  }, [originalReportText, outputLang, getPredictorDisplayText, translatePredictorText, setIsPredictorTranslating]);

  // Reset output language when prediction changes
  useEffect(() => {
    if (displayPrediction) {
      setOutputLang('en');
      setTranslatedReportText('');
    }
  }, [displayPrediction]); // eslint-disable-line

  const displayReportText = useMemo(() => {
    if (outputLang === 'hi' && translatedReportText) return translatedReportText;
    return editedReportText || originalReportText;
  }, [outputLang, translatedReportText, editedReportText, originalReportText]);

  // Clean JSON block string helper
  const cleanJsonString = (str) => {
    const jsonMatch = str.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return str.substring(start, end + 1).trim();
    }
    return str.trim();
  };

  // On mount: sync case data
  useEffect(() => {
    if (currentCase) {
      handlePrefillFromActiveCase(currentCase);
      const mapped = mapCaseToForm(currentCase);
      setPrefillBanner({ caseTitle: mapped.caseTitle || currentCase?.name || 'Active Case' });
    }
  }, [currentCase]);

  // Execute Auto-Run if intended by Context
  useEffect(() => {
    if (triggerAutoRun && currentCase && !activePrediction && !isGenerating) {
      toast.success(`✓ Case data pre-loaded for prediction`, { icon: '⚖️', duration: 3000 });
      handlePrefillFromActiveCase(currentCase);
      
      setTimeout(() => {
        const formData = buildFormDataFromCase(currentCase);
        runOutcomePrediction(formData);
      }, 100);
    }
  }, [triggerAutoRun, currentCase, activePrediction, isGenerating]);

  // Load history count on mount (from localStorage when no case is selected)
  useEffect(() => {
    if (!currentCase?._id) {
      try {
        const localData = localStorage.getItem('aisa_case_predictions_history');
        if (localData) {
          const parsed = JSON.parse(localData);
          setHistoryData(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      loadPredictionHistory();
    }
  }, [currentCase]);

  // Load target case forecast logs
  const loadPredictionHistory = useCallback(async () => {
    if (!currentCase?._id) return;
    try {
      const targetCase = allProjects.find(p => p._id === currentCase._id);
      let dbHistory = targetCase?.predictionsHistory || [];

      // Check legacy local storage history to migrate
      const localData = localStorage.getItem('aisa_case_predictions_history');
      if (localData && targetCase) {
        try {
          const parsedLocal = JSON.parse(localData);
          const localForCase = parsedLocal.filter(h => h.caseId === currentCase._id);
          if (localForCase.length > 0) {
            const merged = [...dbHistory];
            localForCase.forEach(item => {
              if (!merged.some(m => m.id === item.id)) {
                merged.push(item);
              }
            });
            const payload = {
              ...targetCase,
              predictionsHistory: merged
            };
            const response = await apiService.updateProject(currentCase._id, payload);
            if (onUpdateCase) onUpdateCase(response);
            dbHistory = merged;

            const remainingLocal = parsedLocal.filter(h => h.caseId !== currentCase._id);
            if (remainingLocal.length > 0) {
              localStorage.setItem('aisa_case_predictions_history', JSON.stringify(remainingLocal));
            } else {
              localStorage.removeItem('aisa_case_predictions_history');
            }
          }
        } catch (err) {
          console.error("Error migrating prediction history", err);
        }
      }

      setHistoryData(dbHistory);
      
      // Auto-set the latest prediction from history if no active prediction is selected yet
      if (dbHistory.length > 0 && !activePrediction) {
        const latest = dbHistory[0];
        setActivePrediction(latest);
        setEditedReportText(latest.reports?.[selectedReportTab] || latest.report || '');
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentCase, allProjects, activePrediction, onUpdateCase, selectedReportTab]);

  // Helper to build Form Data directly from Case
  const buildFormDataFromCase = (targetCase) => {
    if (!targetCase) return null;
    let resolvedOpponent = '';
    if (targetCase.opponentName) {
      resolvedOpponent = `Opponent: ${targetCase.opponentName}`;
      if (targetCase.opponentAdvocate) {
        resolvedOpponent += ` (Advocate: ${targetCase.opponentAdvocate})`;
      }
    }

    let resolvedType = 'Criminal';
    if (targetCase.caseType) {
      const type = targetCase.caseType.toLowerCase();
      if (type.includes('civil')) resolvedType = 'Civil';
      else if (type.includes('corporate')) resolvedType = 'Corporate';
      else if (type.includes('cyber')) resolvedType = 'Cyber';
      else if (type.includes('family')) resolvedType = 'Family';
      else if (type.includes('property')) resolvedType = 'Property';
      else if (type.includes('labour') || type.includes('labor')) resolvedType = 'Labour';
      else if (type.includes('consumer')) resolvedType = 'Consumer';
    }

    let evidence = '';
    if (targetCase.documents && targetCase.documents.length > 0) {
      evidence = targetCase.documents.map(d => d.name).join(', ');
    }

    let witnesses = '';
    if (targetCase.witnesses) {
      if (Array.isArray(targetCase.witnesses)) {
        witnesses = targetCase.witnesses.map(w => `${w.name} (${w.role || 'Witness'})`).join(', ');
      } else {
        witnesses = targetCase.witnesses;
      }
    }

    return {
      caseType: resolvedType,
      ipcSections: targetCase.provisions || targetCase.ipcSections || targetCase.statutes || '',
      courtName: targetCase.courtName || '',
      facts: targetCase.summary || targetCase.caseSummary || targetCase.description || '',
      evidenceList: evidence,
      opponentDetails: resolvedOpponent,
      witnessDetails: witnesses
    };
  };

  // Handle case prefill sync trigger
  const handlePrefillFromActiveCase = (forceCase = null) => {
    const targetCase = forceCase || currentCase;
    if (!targetCase) {
      toast.error("No active case selected. Please select a case from the sidebar.");
      return;
    }
    const data = buildFormDataFromCase(targetCase);
    
    setFacts(data.facts);
    setCourtName(data.courtName);
    setOpponentDetails(data.opponentDetails);
    setCaseType(data.caseType);
    setEvidenceList(data.evidenceList);
    setWitnessDetails(data.witnessDetails);
    setIpcSections(data.ipcSections);

    if (!forceCase) toast.success("Active case data successfully synchronized!");
  };

  // Sync predictions list to the case's database project
  const savePredictionToHistory = async (prediction) => {
    if (!currentCase?._id) {
      // Save to localStorage when no case is selected
      try {
        const localData = localStorage.getItem('aisa_case_predictions_history');
        const existing = localData ? JSON.parse(localData) : [];
        const updated = [prediction, ...existing.filter(h => h.id !== prediction.id)];
        localStorage.setItem('aisa_case_predictions_history', JSON.stringify(updated));
        setHistoryData(updated);
      } catch (e) {
        console.error(e);
      }
      return;
    }
    try {
      const targetCase = allProjects.find(p => p._id === currentCase._id);
      if (!targetCase) return;
      const predictionWithCase = { ...prediction, caseId: currentCase._id };
      const existingHistory = targetCase.predictionsHistory || [];
      const updated = [predictionWithCase, ...existingHistory.filter(h => h.id !== prediction.id)];

      const payload = {
        ...targetCase,
        predictionsHistory: updated
      };
      const response = await apiService.updateProject(currentCase._id, payload);
      if (onUpdateCase) onUpdateCase(response);
      setHistoryData(updated);
    } catch (e) {
      console.error(e);
      toast.error("Failed to sync prediction history to the database");
    }
  };

  // Delete prediction item
  const handleDeleteHistoryItem = async (id) => {
    if (!currentCase?._id) return;
    if (window.confirm("Are you sure you want to permanently delete this prediction?")) {
      try {
        const targetCase = allProjects.find(p => p._id === currentCase._id);
        if (!targetCase) return;
        const existingHistory = targetCase.predictionsHistory || [];
        const updated = existingHistory.filter(h => h.id !== id);

        const payload = {
          ...targetCase,
          predictionsHistory: updated
        };
        const response = await apiService.updateProject(currentCase._id, payload);
        if (onUpdateCase) onUpdateCase(response);
        setHistoryData(updated);
        
        if (activePrediction?.id === id) {
          setActivePrediction(updated.length > 0 ? updated[0] : null);
          if (updated.length > 0) {
            setEditedReportText(updated[0].reports?.[selectedReportTab] || updated[0].report || '');
          } else {
            setEditedReportText('');
          }
        }
        toast.success("Prediction record deleted successfully");
      } catch (e) {
        console.error(e);
        toast.error("Deletion failed");
      }
    }
  };

  // Fallback data generator if JSON parse fails
  const generateFallbackData = (text, form) => {
    const successRate = parseInt(text.match(/Success Probability:\s*(\d+)/i)?.[1] || "65");
    const litigationRisk = text.match(/Litigation Risk:\s*(\w+)/i)?.[1] || "Moderate";
    
    return {
      stats: {
        successRate: successRate,
        defendantWinRate: 100 - successRate,
        litigationRisk: ['High', 'Moderate', 'Low'].includes(litigationRisk) ? litigationRisk : "Moderate",
        evidenceStrength: 70,
        caseStrength: 65,
        missingDocsCount: 1,
        courtReadiness: 80,
        settlementProbability: 50,
        appealRisk: 45,
        confidenceScore: 85
      },
      caseStrengthDetails: {
        strongPoints: ["Factual consistency in core timeline", "Applicable statutory provisions align with client arguments"],
        weakPoints: ["Minor gaps in documentary proof", "Jurisdictional precedents are mixed"],
        vulnerabilities: ["Potential delay in formal witness affidavits"],
        criticalRisks: ["Opposing counsel may claim statutory bar of limitation"]
      },
      evidenceImpactDetails: {
        strongEvidence: ["Primary documents under record", "Supporting electronic notifications"],
        weakEvidence: ["Indirect witness verbal assertions"],
        missingEvidence: ["Certified copy of registry ledger"]
      },
      judgePerspectiveDetails: {
        questions: ["Why was there a delay in notifying the breach?", "Where is the contract sign-off document?"],
        concerns: ["Standard of proof regarding intention", "Absence of certified forensic copy"],
        weakArguments: ["Argument claiming total immunity under force majeure"]
      },
      opponentTactics: {
        mappedClaims: ["Contributory negligence by the plaintiff", "Inadmissibility of electronic records under Section 65B"],
        objections: ["Objection to the inclusion of unverified emails"],
        appealRisks: ["Likelihood of appeal is high if initial verdict is favorable"],
        counterStrategies: ["Prepare certified affidavits beforehand", "Lodge a caveat in the High Court post-order"]
      },
      timelineForecasts: {
        trialDuration: "8-14 months",
        interimOrders: "2-3 months",
        appealsDuration: "12-18 months",
        finalJudgment: "18-24 months"
      },
      precedents: [
        {
          citation: "Supreme Court Guidelines on Judicial Assessment (2022)",
          relevanceScore: 90,
          summary: "Detailed criteria on evidence admissibility standard in civil claims.",
          applicability: "Aligns with our evidence submission procedure."
        }
      ],
      statutoryProvisions: [
        {
          section: form.ipcSections || "Relevant Statute",
          description: "Primary provision governing the offense/claim.",
          applicability: "Applies to the transaction facts described."
        }
      ],
      reports: {
        predictionReport: text || "Full case prediction report containing detailed forecasting parameters.",
        litigationStrategyReport: "Litigation strategy report detailing arguments and procedure.",
        judicialForecastReport: "Judicial forecast report mapping simulated bench concerns.",
        riskAssessmentReport: "Risk assessment report outlining appeal and settlement rates.",
        advocateBrief: "Advocate brief optimized for courtroom reference."
      }
    };
  };

  // Invoke Neural Forecast Prediction
  const runOutcomePrediction = async (customForm = null) => {
    const fData = customForm || {
      caseType, ipcSections, courtName, facts, evidenceList, opponentDetails, witnessDetails
    };

    if (!fData.facts.trim()) {
      toast.error("Please provide case facts to predict outcome");
      return;
    }

    setIsGenerating(true);
    setActivePrediction(null);

    try {
      const systemPrompt = `You are the AISA AI Judicial Intelligence & Case Forecasting System.
Analyze the provided legal case facts, evidence, witnesses, statutes, and jurisdiction.
Your analysis must be court-ready, forensic-grade, and highly detailed.

You MUST return your response as a single valid JSON object enclosed in a markdown code block starting with \`\`\`json and ending with \`\`\`. Do not include any text outside the code block.

The JSON structure must match this schema:
{
  "stats": {
    "successRate": number (Plaintiff win % from 0 to 100),
    "defendantWinRate": number (Defendant win % from 0 to 100, must sum to 100 with successRate),
    "litigationRisk": "Low" | "Moderate" | "High",
    "evidenceStrength": number (0 to 100),
    "caseStrength": number (0 to 100),
    "missingDocsCount": number (0 to 10),
    "courtReadiness": number (0 to 100),
    "settlementProbability": number (0 to 100),
    "appealRisk": number (0 to 100),
    "confidenceScore": number (AI model confidence % from 0 to 100)
  },
  "caseStrengthDetails": {
    "strongPoints": string[],
    "weakPoints": string[],
    "vulnerabilities": string[],
    "criticalRisks": string[]
  },
  "evidenceImpactDetails": {
    "strongEvidence": string[],
    "weakEvidence": string[],
    "missingEvidence": string[]
  },
  "judgePerspectiveDetails": {
    "questions": string[],
    "concerns": string[],
    "weakArguments": string[]
  },
  "opponentTactics": {
    "mappedClaims": string[],
    "objections": string[],
    "appealRisks": string[],
    "counterStrategies": string[]
  },
  "timelineForecasts": {
    "trialDuration": string (estimated trial duration, e.g. "8-14 months"),
    "interimOrders": string (estimated time for interim orders, e.g. "2-3 months"),
    "appealsDuration": string (estimated appeal duration, e.g. "12-18 months"),
    "finalJudgment": string (estimated time to final judgment, e.g. "18-24 months")
  },
  "precedents": [
    {
      "citation": string,
      "relevanceScore": number,
      "summary": string,
      "applicability": string
    }
  ],
  "statutoryProvisions": [
    {
      "section": string,
      "description": string,
      "applicability": string
    }
  ],
  "reports": {
    "predictionReport": string,
    "litigationStrategyReport": string,
    "judicialForecastReport": string,
    "riskAssessmentReport": string,
    "advocateBrief": string
  }
}

Ensure all report values in "reports" are long, detailed, professional legal briefs written in standard, formal legal terminology. DO NOT use generic placeholders.`;

      const query = `
      Case Type: ${fData.caseType}
      IPC/Statutes/BNS: ${fData.ipcSections}
      Court / Jurisdiction: ${fData.courtName}
      Facts: ${fData.facts}
      Evidences: ${fData.evidenceList}
      Opponent Details: ${fData.opponentDetails}
      Witness Details: ${fData.witnessDetails}
      `;

      const response = await generateChatResponse([], query, systemPrompt, evidenceFiles, 'English', null, 'legal');
      const reply = response?.reply || response || '';

      let parsedJson = null;
      try {
        const jsonStr = cleanJsonString(reply);
        parsedJson = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.warn("JSON parsing failed, trying fallback...", parseErr);
        parsedJson = generateFallbackData(reply, fData);
      }

      if (!parsedJson || !parsedJson.stats) {
        throw new Error("Invalid forecast format");
      }

      const prediction = {
        id: Date.now().toString(),
        caseType: fData.caseType,
        ipcSections: fData.ipcSections,
        courtName: fData.courtName,
        facts: fData.facts,
        evidenceList: fData.evidenceList,
        opponentDetails: fData.opponentDetails,
        witnessDetails: fData.witnessDetails,
        timestamp: new Date().toLocaleString(),
        ...parsedJson
      };

      setActivePrediction(prediction);
      setEditedReportText(prediction.reports.predictionReport);
      setSelectedReportTab('predictionReport');
      await savePredictionToHistory(prediction);
      toast.success("Judicial verdict forecast completed! ⚖️");
    } catch (e) {
      console.error(e);
      toast.error("Verdict forecasting engine failed. Please verify case facts.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Run preset simulation
  const triggerPreset = (presetName, presetFacts) => {
    setFacts(presetFacts);
    const resolvedType = presetName === 'Bail Forecast' ? 'Criminal' : 'Civil';
    setCaseType(resolvedType);
    runOutcomePrediction({
      caseType: resolvedType,
      ipcSections: presetName === 'Bail Forecast' ? 'IPC Section 420, 120B' : 'Adverse Possession Statutes',
      courtName: 'District Sessions Court',
      facts: presetFacts,
      evidenceList: 'Affidavits, Old Deeds, Receipts',
      opponentDetails: 'Opponent State Property Board',
      witnessDetails: 'Two neighboring land owners'
    });
  };

  // Switch between report tabs
  const handleReportTabChange = (tabId) => {
    setSelectedReportTab(tabId);
    setOutputLang('en');
    setTranslatedReportText('');
    if (activePrediction?.reports?.[tabId]) {
      setEditedReportText(activePrediction.reports[tabId]);
    } else {
      setEditedReportText('');
    }
    setIsEditingReport(false);
  };

  // Save edits locally and to backend database
  const handleSaveChanges = async () => {
    if (!activePrediction) return;
    try {
      const updatedPrediction = {
        ...activePrediction,
        reports: {
          ...activePrediction.reports,
          [selectedReportTab]: editedReportText
        }
      };
      setActivePrediction(updatedPrediction);
      await savePredictionToHistory(updatedPrediction);
      setIsEditingReport(false);
      toast.success("Changes saved successfully to Case Database!");
    } catch (e) {
      toast.error("Failed to save changes");
    }
  };

  // Export report to MS Word DOC
  const handleDownloadDocx = () => {
    if (!activePrediction) return;
    
    const titles = {
      predictionReport: "Case Prediction Report",
      litigationStrategyReport: "Litigation Strategy Report",
      judicialForecastReport: "Judicial Forecast Report",
      riskAssessmentReport: "Risk Assessment Report",
      advocateBrief: "Advocate Brief"
    };
    
    const reportTitle = titles[selectedReportTab] || "Case Predictor Brief";
    const reportContent = displayReportText;
    
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; }
          h1 { color: #2B6CB0; border-bottom: 2px solid #2B6CB0; padding-bottom: 5px; font-size: 20pt; }
          h2 { color: #2D3748; font-size: 14pt; margin-top: 15px; }
          p, li { font-size: 11pt; color: #4A5568; }
          ul { margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <div>${reportContent.replace(/\n/g, '<br/>')}</div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/\s+/g, '_')}_${Date.now()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("DOCX Brief Downloaded!");
  };

  // Print selected report
  const handlePrint = () => {
    if (!activePrediction) return;
    
    const titles = {
      predictionReport: "Case Prediction Report",
      litigationStrategyReport: "Litigation Strategy Report",
      judicialForecastReport: "Judicial Forecast Report",
      riskAssessmentReport: "Risk Assessment Report",
      advocateBrief: "Advocate Brief"
    };
    
    const reportTitle = titles[selectedReportTab] || "Case Predictor Brief";
    const reportContent = displayReportText;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          h1 { text-align: center; color: #1a365d; margin-bottom: 30px; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          h2 { color: #2b6cb0; font-size: 18px; margin-top: 20px; border-bottom: 1px solid #edf2f7; padding-bottom: 5px; }
          p, li { font-size: 14px; color: #4a5568; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <div>${reportContent.replace(/\n/g, '<br/>')}</div>
        <div class="footer">Generated by AISA AI Judicial Intelligence on ${new Date().toLocaleDateString()}</div>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Copy selected report text
  const handleCopyText = () => {
    const reportContent = displayReportText;
    if (!reportContent) return;
    navigator.clipboard.writeText(reportContent);
    toast.success("Report brief copied to clipboard!");
  };

  // Share report via native share sheet
  const handleShareReport = async () => {
    if (!activePrediction) return;

    const titles = {
      predictionReport: "Case Prediction Report",
      litigationStrategyReport: "Litigation Strategy Report",
      judicialForecastReport: "Judicial Forecast Report",
      riskAssessmentReport: "Risk Assessment Report",
      advocateBrief: "Advocate Brief"
    };
    
    const reportTitle = titles[selectedReportTab] || "Case Predictor Brief";
    const reportContent = displayReportText;

    // Test if file sharing is supported
    const dummyFile = new File([''], 'test.txt', { type: 'text/plain' });
    const supportsFiles = navigator.share && navigator.canShare && navigator.canShare({ files: [dummyFile] });

    if (!supportsFiles) {
      toast.error("Your browser does not support file sharing. Please use the Download button instead.");
      return;
    }

    try {
      toast.loading("Preparing PDF to share...", { id: 'sharePdf' });
      
      const blob = await exportToPDF({
        text: reportContent,
        title: reportTitle,
        filename: 'Shared_Brief',
        returnBlob: true,
      });
      
      const file = new File([blob], `${reportTitle.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
      
      await navigator.share({
        title: reportTitle,
        text: 'Here is the case prediction brief.',
        files: [file]
      });
      
      toast.success("PDF shared successfully!", { id: 'sharePdf' });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        toast.error("Failed to share PDF", { id: 'sharePdf' });
      } else {
        toast.dismiss('sharePdf');
      }
    }
  };

  // Highlight keywords within report text
  const highlightReportText = (text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 dark:bg-amber-500/50 text-amber-950 dark:text-amber-100 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };



  return (
    <div className={`flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#0B1020] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 backdrop-blur-xl ${
        isDark ? 'border-white/5 bg-[#0B1020]/80' : 'border-slate-200 bg-white/80'
      }`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`p-2 rounded-full transition-colors ${
            isDark ? 'hover:bg-zinc-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
          }`}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className={`text-lg font-black leading-none tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>AI Judicial Intelligence & Forecasting</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`}>NEURAL VERDICT PREDICTOR ONLINE</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentCase && (
            <button 
              onClick={handlePrefillFromActiveCase}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                isDark 
                  ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400 hover:bg-emerald-950/40' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <RefreshCw size={12} className="animate-spin-slow" />
              <span>Sync with {currentCase.name}</span>
            </button>
          )}
          <button 
            onClick={() => {
              if (currentCase?._id) {
                loadPredictionHistory();
              } else {
                // Load from localStorage when no case is selected
                try {
                  const localData = localStorage.getItem('aisa_case_predictions_history');
                  if (localData) {
                    const parsed = JSON.parse(localData);
                    setHistoryData(parsed);
                  }
                } catch (e) {
                  console.error(e);
                }
              }
              setHistoryVisible(true);
            }} 
            className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              isDark 
                ? 'bg-indigo-950/20 border-indigo-900/30 text-indigo-400 hover:bg-indigo-950/40' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            <History size={14} />
            <span>Forecast History ({historyData.length})</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar select-text">
        <div className="max-w-[1600px] mx-auto space-y-6">
          
          {/* Active Case Prefill Banner */}
          {prefillBanner && (
            <div className={`flex items-center gap-3 px-4 py-3 border rounded-2xl shadow-sm ${
              isDark 
                ? 'bg-gradient-to-r from-emerald-950/20 to-teal-950/10 border-emerald-900/30 text-emerald-400' 
                : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700'
            }`}>
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black">Active Case Loaded: {prefillBanner.caseTitle}</p>
                <p className={`text-[10px] font-semibold mt-0.5 ${isDark ? 'text-emerald-500/60' : 'text-emerald-600/70'}`}>
                  Factual metrics and references have been auto-populated below. Verify information and run predictions.
                </p>
              </div>
              <button onClick={() => setPrefillBanner(null)} className={`p-1 rounded-full ${isDark ? 'hover:bg-emerald-900/30' : 'hover:bg-emerald-100'}`}>
                <X size={13} />
              </button>
            </div>
          )}

          {/* 8 Live Analytics Dashboard metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            
            {/* 1. Plaintiff Win Margin */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-start">
                <TrendingUp size={16} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase text-emerald-500">Plaintiff</span>
              </div>
              <p className="text-2xl font-black mt-2 text-emerald-500">
                {displayPrediction ? `${displayPrediction.stats.successRate}%` : '--%'}
              </p>
              <p className={`text-[9px] font-bold mt-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Win Probability
              </p>
            </div>

            {/* 2. Defendant Win Margin */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-start">
                <Scale size={16} className="text-red-500" />
                <span className="text-[9px] font-black uppercase text-red-500">Defendant</span>
              </div>
              <p className="text-2xl font-black mt-2 text-red-500">
                {displayPrediction ? `${displayPrediction.stats.defendantWinRate}%` : '--%'}
              </p>
              <p className={`text-[9px] font-bold mt-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Win Probability
              </p>
            </div>

            {/* 3. Litigation Risk level */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-start">
                <AlertTriangle size={16} className={
                  displayPrediction?.stats.litigationRisk === 'High' ? 'text-red-500' :
                  displayPrediction?.stats.litigationRisk === 'Moderate' ? 'text-amber-500' : 'text-emerald-500'
                } />
                <span className="text-[9px] font-black uppercase text-slate-400">Risk</span>
              </div>
              <p className={`text-2xl font-black mt-2 ${
                displayPrediction?.stats.litigationRisk === 'High' ? 'text-red-500' :
                displayPrediction?.stats.litigationRisk === 'Moderate' ? 'text-amber-500' : 
                displayPrediction?.stats.litigationRisk === 'Low' ? 'text-emerald-500' : 'text-slate-500'
              }`}>
                {displayPrediction ? displayPrediction.stats.litigationRisk : '--'}
              </p>
              <p className={`text-[9px] font-bold mt-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Litigation Risk
              </p>
            </div>

            {/* 4. Evidence Strength rating */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-start">
                <FileText size={16} className="text-indigo-500" />
                <span className="text-[9px] font-black uppercase text-slate-400">Evidence</span>
              </div>
              <p className="text-2xl font-black mt-2 text-indigo-500">
                {displayPrediction ? `${displayPrediction.stats.evidenceStrength}%` : '--%'}
              </p>
              <p className={`text-[9px] font-bold mt-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Strength Rating
              </p>
            </div>

            {/* 5. Case Strength rating */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-start">
                <Brain size={16} className="text-violet-500" />
                <span className="text-[9px] font-black uppercase text-slate-400">Viability</span>
              </div>
              <p className="text-2xl font-black mt-2 text-violet-500">
                {displayPrediction ? `${displayPrediction.stats.caseStrength}%` : '--%'}
              </p>
              <p className={`text-[9px] font-bold mt-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Case Strength
              </p>
            </div>

            {/* 6. Missing documents count */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-start">
                <AlertCircle size={16} className="text-orange-500" />
                <span className="text-[9px] font-black uppercase text-slate-400">Gaps</span>
              </div>
              <p className="text-2xl font-black mt-2 text-orange-500">
                {displayPrediction ? displayPrediction.stats.missingDocsCount : '--'}
              </p>
              <p className={`text-[9px] font-bold mt-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Missing Docs
              </p>
            </div>

            {/* 7. Court Readiness Score */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-start">
                <ShieldCheck size={16} className="text-teal-500" />
                <span className="text-[9px] font-black uppercase text-slate-400">Status</span>
              </div>
              <p className="text-2xl font-black mt-2 text-teal-500">
                {displayPrediction ? `${displayPrediction.stats.courtReadiness}%` : '--%'}
              </p>
              <p className={`text-[9px] font-bold mt-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Readiness Score
              </p>
            </div>

            {/* 8. Settlement Probability */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-start">
                <Users size={16} className="text-sky-500" />
                <span className="text-[9px] font-black uppercase text-slate-400">Mediation</span>
              </div>
              <p className="text-2xl font-black mt-2 text-sky-500">
                {displayPrediction ? `${displayPrediction.stats.settlementProbability}%` : '--%'}
              </p>
              <p className={`text-[9px] font-bold mt-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Settlement Rate
              </p>
            </div>

          </div>

          {/* Quick presets row */}
          {!activePrediction && !isGenerating && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>⋄ FORECAST SIMULATIONS PRESETS</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {QUICK_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      let facts = '';
                      if (preset.name === 'Bail Forecast') facts = 'Anticipatory bail request under IPC Cyber Fraud provisions. Client alleges arbitrary framing and demonstrates full willingness to cooperate with the local investigative team.';
                      else if (preset.name === 'Adverse Possession') facts = 'Adverse possession claims over a boundary fence held continuously for 14 years. Plaintiff holds old physical sale deed records.';
                      else if (preset.name === 'Contract Breach Claim') facts = 'Plaintiff claims damages of $150,000 for delayed delivery of software code. Defendant asserts delayed payment of mandatory mobilization fee.';
                      else facts = 'Client accused of unauthorized database access. The network audit exhibits overlapping credentials shared among multiple remote external contractors.';
                      triggerPreset(preset.name, facts);
                    }}
                    className={`p-4 rounded-2xl shadow-sm text-left border transition-all group ${
                      isDark 
                        ? 'bg-[#1A2540] border-white/5 hover:border-indigo-500/30' 
                        : 'bg-white border-slate-200 hover:shadow-md hover:border-indigo-500/20'
                    }`}
                  >
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block transition-colors group-hover:text-indigo-500">{preset.name}</span>
                    <span className={`text-[10px] font-semibold mt-1 block leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main workspace panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left inputs column */}
            <div className={`rounded-3xl p-6 border shadow-sm ${
              isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-6">
                <Brain size={18} className="text-indigo-500 animate-pulse" />
                <h3 className={`text-sm font-black uppercase tracking-wider ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>Neural Case Architect</h3>
              </div>

              <div className="space-y-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Case Category</label>
                  <select 
                    value={caseType} 
                    onChange={e => setCaseType(e.target.value)}
                    className={`border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Criminal">Criminal</option>
                    <option value="Civil">Civil</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Cyber">Cyber</option>
                    <option value="Family">Family</option>
                    <option value="Property">Property</option>
                    <option value="Labour">Labour</option>
                    <option value="Consumer">Consumer</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Statutes / Legal Sections</label>
                  <input 
                    type="text" 
                    placeholder="e.g. IPC 420 / BNS 318, BSA 65B" 
                    value={ipcSections}
                    onChange={e => setIpcSections(e.target.value)}
                    className={`border rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Court & Jurisdiction</label>
                  <input 
                    type="text" 
                    placeholder="e.g. High Court of Delhi" 
                    value={courtName}
                    onChange={e => setCourtName(e.target.value)}
                    className={`border rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Opposing Party Details</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Respondent name, Advocate details" 
                    value={opponentDetails}
                    onChange={e => setOpponentDetails(e.target.value)}
                    className={`border rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Witness Statements</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Inspector Rao (IO), eyewitness accounts" 
                    value={witnessDetails}
                    onChange={e => setWitnessDetails(e.target.value)}
                    className={`border rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Evidences & Documents</label>
                  <input 
                    type="file" 
                    multiple
                    accept=".pdf,image/*"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 0) {
                        const fileNames = files.map(f => f.name).join(', ');
                        setEvidenceList(fileNames);
                        
                        const processedFiles = await Promise.all(files.map(file => {
                          return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              resolve({
                                url: event.target.result,
                                type: file.type.startsWith('image/') ? 'image' : 'document',
                                name: file.name,
                                mimeType: file.type
                              });
                            };
                            reader.readAsDataURL(file);
                          });
                        }));
                        setEvidenceFiles(processedFiles);
                      } else {
                        setEvidenceList('');
                        setEvidenceFiles([]);
                      }
                    }}
                    className={`border rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 ${
                      isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Comprehensive Facts *</label>
                  <textarea 
                    rows={6} 
                    placeholder="Provide detailed chronological events, specific violations, claims and defense arguments..."
                    value={facts}
                    onChange={e => setFacts(e.target.value)}
                    className={`border rounded-2xl px-4 py-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none ${
                      isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-850'
                    }`}
                  />
                </div>

                <button
                  onClick={() => runOutcomePrediction()}
                  disabled={isGenerating}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:opacity-90 shadow-xl shadow-indigo-500/25 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Modeling Verdict...</span>
                    </>
                  ) : (
                    <>
                      <Gavel size={16} />
                      <span>Predict Judicial Outcome</span>
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* Right results column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Generator loading status */}
              {isGenerating && (
                <div className={`rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 ${
                  isDark ? 'bg-[#1A2540]/60' : 'bg-white shadow-sm border border-slate-200'
                }`}>
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <div className="space-y-1">
                    <h4 className={`text-base font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Processing Legal Directives...</h4>
                    <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      AI is indexing similar case histories, assessing statute limits, and generating predictions.
                    </p>
                  </div>
                </div>
              )}

              {/* Prediction details */}
              {displayPrediction && !isGenerating && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* Win probability progress bar */}
                  <div className={`rounded-3xl p-6 border shadow-sm ${
                    isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200'
                  }`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Verdict Probability Margin
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-extrabold">
                        <span className="text-emerald-500 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Plaintiff win margin: {displayPrediction.stats.successRate}%
                        </span>
                        <span className="text-red-500 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Defendant win margin: {displayPrediction.stats.defendantWinRate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-4 overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-700 ease-out" 
                          style={{ width: `${displayPrediction.stats.successRate}%` }} 
                        />
                        <div 
                          className="bg-red-500 h-full transition-all duration-700 ease-out" 
                          style={{ width: `${displayPrediction.stats.defendantWinRate}%` }} 
                        />
                      </div>
                      <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Forecast computed with {displayPrediction.stats.confidenceScore || 90}% overall AI neural model confidence.
                      </p>
                    </div>
                  </div>

                  {/* Tabs navigation */}
                  <div className={`rounded-3xl border shadow-sm overflow-hidden ${
                    isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200'
                  }`}>
                    <div className={`flex flex-wrap border-b ${
                      isDark ? 'border-white/5 bg-[#1B2644]' : 'border-slate-200 bg-slate-50/50'
                    }`}>
                      {[
                        { id: 'caseStrength', label: 'Case Strength', icon: Brain },
                        { id: 'evidenceImpact', label: 'Evidence Impact', icon: FileText },
                        { id: 'judgePerspective', label: 'Judge Perspective', icon: Scale },
                        { id: 'opponentTactics', label: 'Opponent Tactics', icon: Users },
                        { id: 'timelines', label: 'Timeline Forecast', icon: Clock },
                        { id: 'precedents', label: 'Precedent Match', icon: BookOpen },
                        { id: 'laws', label: 'Applicable Laws', icon: ShieldCheck }
                      ].map(t => {
                        const Icon = t.icon;
                        const isSelected = activeTab === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                              isSelected 
                                ? 'border-indigo-500 text-indigo-500 bg-white/5' 
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                          >
                            <Icon size={13} />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-6">
                      
                      {/* Case Strength Tab */}
                      {activeTab === 'caseStrength' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/40 border-emerald-950/20' : 'bg-emerald-50/20 border-emerald-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1 mb-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Strong points
                            </span>
                            <ul className="space-y-2 text-xs font-semibold">
                              {displayPrediction.caseStrengthDetails?.strongPoints?.map((p, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="text-emerald-500">✔</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/40 border-amber-950/20' : 'bg-amber-50/20 border-amber-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1 mb-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Weak points
                            </span>
                            <ul className="space-y-2 text-xs font-semibold">
                              {displayPrediction.caseStrengthDetails?.weakPoints?.map((p, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="text-amber-500">⚠</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/40 border-orange-950/20' : 'bg-orange-50/20 border-orange-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 flex items-center gap-1 mb-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              Vulnerabilities
                            </span>
                            <ul className="space-y-2 text-xs font-semibold">
                              {displayPrediction.caseStrengthDetails?.vulnerabilities?.map((p, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="text-orange-500">⚡</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/40 border-red-950/20' : 'bg-red-50/20 border-red-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-500 flex items-center gap-1 mb-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              Critical risks
                            </span>
                            <ul className="space-y-2 text-xs font-semibold">
                              {displayPrediction.caseStrengthDetails?.criticalRisks?.map((p, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="text-red-500">✘</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                        </div>
                      )}

                      {/* Evidence Impact Tab */}
                      {activeTab === 'evidenceImpact' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span>Evidence Admissibility Level</span>
                            <span className="text-indigo-500">{displayPrediction.stats.evidenceStrength}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${displayPrediction.stats.evidenceStrength}%` }} />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-2 block">Strong evidence</span>
                              <ul className="space-y-1.5 text-xs font-semibold">
                                {displayPrediction.evidenceImpactDetails?.strongEvidence?.map((e, idx) => (
                                  <li key={idx} className="flex gap-1.5">
                                    <span>•</span>
                                    <span>{e}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-2 block">Weak evidence</span>
                              <ul className="space-y-1.5 text-xs font-semibold">
                                {displayPrediction.evidenceImpactDetails?.weakEvidence?.map((e, idx) => (
                                  <li key={idx} className="flex gap-1.5">
                                    <span>•</span>
                                    <span>{e}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 mb-2 block">Missing evidence</span>
                              <ul className="space-y-1.5 text-xs font-semibold">
                                {displayPrediction.evidenceImpactDetails?.missingEvidence?.map((e, idx) => (
                                  <li key={idx} className="flex gap-1.5">
                                    <span>•</span>
                                    <span>{e}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Judge Perspective Tab */}
                      {activeTab === 'judgePerspective' && (
                        <div className="space-y-4">
                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-2 block">Bench Questions</span>
                            <ul className="space-y-2 text-xs font-semibold">
                              {displayPrediction.judgePerspectiveDetails?.questions?.map((q, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="text-indigo-500">?</span>
                                  <span>{q}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-2 block">Judicial Concerns</span>
                            <ul className="space-y-2 text-xs font-semibold">
                              {displayPrediction.judgePerspectiveDetails?.concerns?.map((c, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="text-amber-500">!</span>
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-500 mb-2 block">Vulnerable Client Arguments</span>
                            <ul className="space-y-2 text-xs font-semibold">
                              {displayPrediction.judgePerspectiveDetails?.weakArguments?.map((w, idx) => (
                                <li key={idx} className="flex gap-2 text-red-500/90 dark:text-red-400/90">
                                  <span>⚠</span>
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Opponent Tactics Tab */}
                      {activeTab === 'opponentTactics' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 block">Mapped Claims</span>
                              <ul className="space-y-1.5 text-xs font-semibold">
                                {displayPrediction.opponentTactics?.mappedClaims?.map((c, idx) => (
                                  <li key={idx} className="flex gap-1.5">
                                    <span>•</span>
                                    <span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 block">Objections expected</span>
                              <ul className="space-y-1.5 text-xs font-semibold">
                                {displayPrediction.opponentTactics?.objections?.map((o, idx) => (
                                  <li key={idx} className="flex gap-1.5">
                                    <span>•</span>
                                    <span>{o}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-2 block">Advocate Defense Strategies</span>
                            <ul className="space-y-2 text-xs font-semibold">
                              {displayPrediction.opponentTactics?.counterStrategies?.map((s, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="text-indigo-500">🛡</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Timeline Forecasts Tab */}
                      {activeTab === 'timelines' && (
                        <div className="space-y-4">
                          <h5 className="text-xs font-bold mb-4">Phase Duration Forecast Timeline</h5>
                          <div className="relative pl-6 border-l-2 border-slate-200 dark:border-zinc-800 space-y-6">
                            
                            <div className="relative">
                              <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-zinc-900" />
                              <h6 className="text-xs font-extrabold">Interim & Motion Hearings</h6>
                              <p className="text-[11px] font-bold text-indigo-500 mt-0.5">
                                {displayPrediction.timelineForecasts?.interimOrders || '2-3 months'}
                              </p>
                              <p className={`text-[10px] font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Resolution of immediate caveats and temporary injunction requests.
                              </p>
                            </div>

                            <div className="relative">
                              <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-violet-600 border-4 border-white dark:border-zinc-900" />
                              <h6 className="text-xs font-extrabold">Trial & Examination Window</h6>
                              <p className="text-[11px] font-bold text-violet-500 mt-0.5">
                                {displayPrediction.timelineForecasts?.trialDuration || '8-14 months'}
                              </p>
                              <p className={`text-[10px] font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Cross-examination of witnesses, evidence submission hearings, and oral arguments.
                              </p>
                            </div>

                            <div className="relative">
                              <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-600 border-4 border-white dark:border-zinc-900" />
                              <h6 className="text-xs font-extrabold">Final Arguments & Judgment</h6>
                              <p className="text-[11px] font-bold text-emerald-500 mt-0.5">
                                {displayPrediction.timelineForecasts?.finalJudgment || '12-18 months'}
                              </p>
                              <p className={`text-[10px] font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Submission of written statements and decree issuance from the bench.
                              </p>
                            </div>

                            <div className="relative">
                              <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-600 border-4 border-white dark:border-zinc-900" />
                              <h6 className="text-xs font-extrabold">Appellate Review Stage</h6>
                              <p className="text-[11px] font-bold text-amber-500 mt-0.5">
                                {displayPrediction.timelineForecasts?.appealsDuration || '12-24 months'}
                              </p>
                              <p className={`text-[10px] font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Potential appeals handling scope in the High Court / Supreme Court.
                              </p>
                            </div>

                          </div>
                        </div>
                      )}

                      {/* Precedents Tab */}
                      {activeTab === 'precedents' && (
                        <div className="space-y-4">
                          {displayPrediction.precedents?.map((p, idx) => (
                            <div key={idx} className={`p-4 rounded-2xl border ${
                              isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100 shadow-xs'
                            }`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-extrabold text-indigo-500">{p.citation}</span>
                                <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                  {p.relevanceScore}% Match
                                </span>
                              </div>
                              <p className="text-xs font-semibold">{p.summary}</p>
                              <p className={`text-[10px] font-semibold mt-2 border-t pt-2 ${
                                isDark ? 'border-white/5 text-slate-400' : 'border-slate-200 text-slate-500'
                              }`}>
                                <span className="font-extrabold uppercase text-[9px] block text-slate-400">Relevance Details</span>
                                {p.applicability}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Laws Tab */}
                      {activeTab === 'laws' && (
                        <div className="space-y-4">
                          {displayPrediction.statutoryProvisions?.map((law, idx) => (
                            <div key={idx} className={`p-4 rounded-2xl border ${
                              isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-slate-50 border-slate-100 shadow-xs'
                            }`}>
                              <span className="text-xs font-extrabold text-indigo-500 block mb-1">{law.section}</span>
                              <p className="text-xs font-semibold">{law.description}</p>
                              <p className={`text-[10px] font-semibold mt-2 border-t pt-2 ${
                                isDark ? 'border-white/5 text-slate-400' : 'border-slate-200 text-slate-500'
                              }`}>
                                <span className="font-extrabold uppercase text-[9px] block text-slate-400">Applicability</span>
                                {law.applicability}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Editable Litigation Reports Selector */}
                  <div className={`rounded-3xl border shadow-sm overflow-hidden ${
                    isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200'
                  }`}>
                    
                    {/* Pills navigation */}
                    <div className={`flex flex-wrap gap-2 px-6 py-4 border-b ${
                      isDark ? 'border-white/5 bg-[#1B2644]' : 'border-slate-200 bg-slate-50/50'
                    }`}>
                      {[
                        { id: 'predictionReport', label: 'Prediction Brief' },
                        { id: 'litigationStrategyReport', label: 'Litigation Strategy' },
                        { id: 'judicialForecastReport', label: 'Judicial Forecast' },
                        { id: 'riskAssessmentReport', label: 'Risk Assessment' },
                        { id: 'advocateBrief', label: 'Advocate Court Brief' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => handleReportTabChange(tab.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                            selectedReportTab === tab.id
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                              : isDark 
                                ? 'bg-zinc-900/40 border-zinc-800 text-slate-400 hover:text-white' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Brief editor viewport */}
                    <div className="p-6 space-y-4">
                      
                      {/* Options and Search */}
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative w-full sm:w-72">
                          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                          }`} />
                          <input 
                            type="text" 
                            placeholder="Search keywords inside brief..."
                            value={reportSearchQuery}
                            onChange={e => setReportSearchQuery(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                              isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          
                          {isEditingReport ? (
                            <>
                              <button 
                                onClick={handleSaveChanges}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                              >
                                <Check size={14} />
                                <span>Save Changes</span>
                              </button>
                              <button 
                                onClick={() => {
                                  setIsEditingReport(false);
                                  setEditedReportText(displayPrediction.reports?.[selectedReportTab] || displayPrediction.report || '');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                  isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-250'
                                }`}
                              >
                                <X size={14} />
                                <span>Cancel</span>
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => setIsEditingReport(true)}
                              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <Edit3 size={14} />
                              <span>Edit Brief</span>
                            </button>
                          )}

                          {!isEditingReport && (
                            <LanguageToggle
                              lang={outputLang}
                              onChange={setOutputLang}
                              isTranslating={isPredictorTranslating}
                            />
                          )}

                          <button 
                            onClick={handleDownloadDocx}
                            className={`p-2 border rounded-xl transition-all ${
                              isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-indigo-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-indigo-650'
                            }`}
                            title="Download MS Word Brief"
                          >
                            <Download size={14} />
                          </button>

                          <button 
                            onClick={handlePrint}
                            className={`p-2 border rounded-xl transition-all ${
                              isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-emerald-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-emerald-650'
                            }`}
                            title="Print / Save PDF"
                          >
                            <Printer size={14} />
                          </button>

                          <button 
                            onClick={handleCopyText}
                            className={`p-2 border rounded-xl transition-all ${
                              isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-slate-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-650'
                            }`}
                            title="Copy text"
                          >
                            <Copy size={14} />
                          </button>

                          <button 
                            onClick={handleShareReport}
                            className={`p-2 border rounded-xl transition-all ${
                              isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-slate-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-650'
                            }`}
                            title="Share Brief"
                          >
                            <Share2 size={14} />
                          </button>

                        </div>
                      </div>

                      {/* Display / Edit Text Box */}
                      {isEditingReport ? (
                        <textarea
                          rows={16}
                          value={editedReportText}
                          onChange={e => setEditedReportText(e.target.value)}
                          className={`w-full p-4 border rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono resize-none leading-relaxed ${
                            isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        />
                      ) : (
                        <div className={`p-5 rounded-2xl border text-xs sm:text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar font-sans select-text ${
                          isDark ? 'bg-zinc-900/30 border-white/5 text-slate-200' : 'bg-slate-50 border-slate-100 text-slate-700 shadow-inner'
                        }`}>
                          {highlightReportText(displayReportText || '', reportSearchQuery)}
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              )}

              {/* Empty State Onboarding */}
              {!displayPrediction && !isGenerating && (
                <div className={`rounded-3xl p-16 text-center border flex flex-col items-center justify-center gap-4 ${
                  isDark ? 'bg-[#1A2540] border-white/5' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <Gavel size={36} className="text-slate-400 animate-bounce" />
                  <div className="space-y-1">
                    <h4 className={`text-base font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Judicial Forecasting Center</h4>
                    <p className={`text-xs font-bold max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Build a Neural Case Architect configuration using active details or quick presets, then click Predict to launch the verification simulation.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>

      {/* History modal */}
      {historyVisible && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setHistoryVisible(false)} />
          <div className={`relative rounded-[32px] p-6 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-250 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 ${
              isDark ? 'border-zinc-800' : 'border-slate-100'
            }`}>
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                <History size={16} />
                <span>Forecasting Verdict Logs</span>
              </h3>
              <button onClick={() => setHistoryVisible(false)} className={`p-1 rounded-full ${
                isDark ? 'hover:bg-zinc-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}>
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {historyData.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-semibold text-xs">No previous forecasts found in database history.</div>
              ) : (
                historyData.map(item => (
                  <div key={item.id} className={`p-4 rounded-2xl flex items-center justify-between gap-4 border ${
                    isDark ? 'bg-zinc-800/40 border-zinc-700/30' : 'bg-slate-50 border-slate-200/60'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black truncate">{item.caseType} Analysis</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">{item.timestamp} • Win: {item.stats.successRate}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setActivePrediction(item);
                          setEditedReportText(item.reports?.[selectedReportTab] || item.report || '');
                          setHistoryVisible(false);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                      >
                        Load
                      </button>
                      <button 
                        onClick={() => handleDeleteHistoryItem(item.id)}
                        className={`p-2 rounded-lg text-red-500 transition-colors ${
                          isDark ? 'hover:bg-red-950/20' : 'hover:bg-red-50'
                        }`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasePredictor;
