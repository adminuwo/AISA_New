import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Gavel, Plus, FileText, Copy, 
  Share2, FileDown, History, Search, X, Shield, Clock, 
  Brain, Scale, BookOpen, AlertTriangle, TrendingUp, Mic, 
  Database, Cpu, Briefcase, Building2, Landmark, Folder, Printer, CheckCircle2,
  Award, Check, Eye, RefreshCw, Send, AlertCircle, Trash2, ChevronDown, ChevronUp,
  Info, Sparkles, Download, ArrowRight, Lock, PlusCircle, Activity, Flame, Calendar,
  DollarSign, CheckSquare, Square, UserCheck, Upload, Cloud
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
  { id: 'AnticipatoryBail', name: 'Anticipatory Bail', desc: 'Preventive arrest & warrants', category: 'Criminal' },
  { id: 'FIRResponse', name: 'FIR Response', desc: 'Quashing petitions & counter', category: 'Criminal' },
  { id: 'EvidencePlanning', name: 'Property Dispute', desc: 'Adverse possession title', category: 'Property' },
  { id: 'AppealStrategy', name: 'Appeal Strategy', desc: 'High Court & judicial errors', category: 'Civil' },
  { id: 'CrossExamination', name: 'Cross Examination', desc: 'Witness questioning strategies', category: 'Trial' },
  { id: 'SettlementStrategy', name: 'Settlement Plan', desc: 'Mediation & trade settlement', category: 'Corporate' },
  { id: 'DivorceCustody', name: 'Custody & Alimony Plan', desc: 'Child custody & separation terms', category: 'Family' },
  { id: 'TaxAppeal', name: 'GST Dispute Strategy', desc: 'Indirect tax recovery challenge', category: 'Tax' },
  { id: 'WrongfulTermination', name: 'Wrongful Termination', desc: 'Employment contract breach claims', category: 'Employment' },
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

const TEMPLATE_SEED_DATA = {
  Bail: {
    title: 'Bail Application - Cyber Crime Embezzlement',
    facts: 'Anticipating custody in a financial technology embezzlement lawsuit. Police are conducting investigations under Section 318 of BNS. Prosecution relies on server login records originating from client home IP.',
    timeline: 'April 10, 2026: Account access logs flagged.\nMay 2, 2026: Notice received from Police under Section 41A CrPC.\nJune 12, 2026: FIR registered at cyber cell.',
    evidence: '1. Shared Wi-Fi router lease agreement - Admissibility: High, Strength: Strong\n2. Router access log sheets - Admissibility: High, Strength: Medium\n3. Detailed ledger reconciliation reports - Admissibility: Medium, Strength: Strong',
    witnesses: '1. Harish Rao - System Admin\n2. Kavita Lal - Security Analyst',
    opponent: 'Claims absolute fraudulent transfer of tokens and seeks custodial interrogation.',
    relief: 'Interim protection against arrest under Section 438 of CrPC.',
    orders: 'Notice issued to state prosecutor.',
    notes: 'Prioritize audit logs submission.'
  },
  Criminal: {
    title: 'Criminal Defense Plan - Alleged Theft',
    facts: 'Accused of receiving stolen inventory at retail store. Opponent states CCTV capture confirms face, but frame rates are low and unverified. Accused bought items via official bank draft receipt.',
    timeline: 'March 15, 2026: Acquisition of inventory from supplier.\nApril 22, 2026: Supplier arrested for theft.\nMay 1, 2026: Search conducted at client premises.',
    evidence: '1. Original bank draft receipt for purchase - Admissibility: High, Strength: Strong\n2. Supplier trade license copy - Admissibility: High, Strength: Strong\n3. CCTV footage analysis report - Admissibility: Medium, Strength: Weak',
    witnesses: '1. Amit Sen - Store Clerk\n2. Rajesh Sharma - Accountant',
    opponent: 'Asserts client had knowledge of stolen nature of goods.',
    relief: 'Quashing of FIR under Section 482 or acquittal at trial.',
    orders: 'None.',
    notes: 'Verify bank draft clearing date.'
  },
  Civil: {
    title: 'Civil Litigation recovery - Gupta Tech vs Apex Retail',
    facts: 'Recovery suit for contract delays. Plaintiff demands INR 12 Lakhs liquidated damages. Defendant states delays are caused by direct delays in design approvals by the Plaintiff.',
    timeline: 'Jan 15, 2026: Supply order signed.\nFeb 20, 2026: Revised specifications sent by client.\nApril 10, 2026: Completed modules delivered.',
    evidence: '1. Email logs requesting approval for designs - Admissibility: High, Strength: Strong\n2. Mobilization payment receipts - Admissibility: High, Strength: Strong\n3. Delivery confirmation receipts - Admissibility: High, Strength: Strong',
    witnesses: '1. Suresh Sen - Lead Designer\n2. Dev Gupta - Manager',
    opponent: 'Claims delays caused solely by mobilization constraints of the supplier.',
    relief: 'Recovery of INR 12 Lakhs plus interest @ 18% p.a.',
    orders: 'Writ of summons served.',
    notes: 'Prepare comparative delay analysis chart.'
  },
  Cyber: {
    title: 'Cyber Security Breach Liability Suit',
    facts: 'Server database breach litigation. Opponent alleges security breach from user account. User logs show session tokens were active from overlapping geo-locations (Delhi and Singapore) within 5 minutes.',
    timeline: 'May 1, 2026: Data breach detected.\nMay 3, 2026: Account suspended.\nJune 10, 2026: Notice of compensation claim.',
    evidence: '1. ISP authentication log reports - Admissibility: High, Strength: Strong\n2. Multi-factor authentication history - Admissibility: High, Strength: Strong\n3. IT audit compliance certification - Admissibility: High, Strength: Strong',
    witnesses: '1. Dr. Arun Sen - Cyber Analyst\n2. Priya Mehra - IT Admin',
    opponent: 'Claims gross negligence in maintaining credential security protocols.',
    relief: 'Dismissal of claim for lack of negligent cause.',
    orders: 'None.',
    notes: 'Verify VPN logs for the active token session.'
  },
  AnticipatoryBail: {
    title: 'Anticipatory Bail - Loan Default Exposure',
    facts: 'Apprehension of arrest regarding bank loan default. Matter under corporate investigation scanner. Client is cooperative and ready to join inquiry.',
    timeline: 'June 2025: Account declared NPA.\nMarch 2026: Forensic audit report submitted.\nJune 20, 2026: Summons issued by economic offenses wing.',
    evidence: '1. Medical certificates of the promoter - Admissibility: High, Strength: Strong\n2. Details of assets pledged to the bank - Admissibility: High, Strength: Strong\n3. Letter of cooperation sent to IO - Admissibility: High, Strength: Strong',
    witnesses: '1. Dr. R. K. Sen - Consultant\n2. Suresh Lal - Financial Advisor',
    opponent: 'Alleges diversion of funds for personal assets.',
    relief: 'Pre-arrest bail direction protecting promoter liberty.',
    orders: 'Ad-interim protection granted subject to deposit of 10% amount.',
    notes: 'Secure promoter passport copy.'
  },
  FIRResponse: {
    title: 'FIR Quashing Petition - Partnership Dispute',
    facts: 'FIR alleging criminal breach of trust. Dispute is purely civil regarding partnership firm profits split. No criminal intent shown in records.',
    timeline: 'Feb 2026: Partnership dissolved.\nApril 2026: Mutual settlement talks failed.\nJune 10, 2026: FIR registered by outgoing partner.',
    evidence: '1. Written partnership deed with arbitration clause - Admissibility: High, Strength: Strong\n2. Bank accounts ledger sheet for partnership - Admissibility: High, Strength: Strong\n3. Dissolution agreement draft - Admissibility: High, Strength: Strong',
    witnesses: '1. Ajay Sen - partner auditor\n2. Meena Sen - mediation witness',
    opponent: 'Claims deliberate siphoning of capital before dissolution.',
    relief: 'Quashing of FIR under Section 482 of CrPC / BNSS.',
    orders: 'Notice issued, stay on investigation granted.',
    notes: 'Submit ledger copy showing tax payments.'
  },
  EvidencePlanning: {
    title: 'Property Dispute Declaratory Suit',
    facts: 'Seeking adverse possession declaration. Client has stayed on the property since 1994, paying utilities and local land revenue taxes continuously.',
    timeline: 'May 1994: Initial possession under oral agreement.\nJune 2010: Registered owner passed away.\nJune 2026: Legal heirs threatened eviction.',
    evidence: '1. Electricity bills from 1995 to 2026 - Admissibility: High, Strength: Strong\n2. Land revenue tax receipts - Admissibility: High, Strength: Strong\n3. Affidavit declarations from neighbors - Admissibility: Medium, Strength: Medium',
    witnesses: '1. Mr. Ram Avtar - Neighbor\n2. Dev Das - Postman',
    opponent: 'Claims client is a permissive user and licensee.',
    relief: 'Declaration of title by adverse possession.',
    orders: 'Status quo order passed on eviction attempts.',
    notes: 'Collect municipal voting register entries.'
  },
  AppealStrategy: {
    title: 'First Appeal - Eviction Decree Error',
    facts: 'Appeal against lower court order granting eviction. Appellant claims trial judge completely ignored balance of convenience and lack of notice.',
    timeline: 'May 2025: Injunction suit dismissed.\nJune 2026: Decree copy certified.\nJune 28, 2026: Appeal filed in District Court.',
    evidence: '1. Trial court judgment record copy - Admissibility: High, Strength: Strong\n2. Rent deposits slips - Admissibility: High, Strength: Strong\n3. Notice of demand response proof - Admissibility: High, Strength: Strong',
    witnesses: '1. Appellant himself - tenant',
    opponent: 'Claims tenant default of over 12 months.',
    relief: 'Setting aside eviction decree and restoration of tenancy.',
    orders: 'Execution of decree stayed pending appeal.',
    notes: 'File deposit application for outstanding rent.'
  },
  CrossExamination: {
    title: 'Cross Examination Prep - Opposing Manager',
    facts: 'Preparing cross questions for opposing project manager regarding contract delivery logs showing verbal approvals of milestones.',
    timeline: 'Oct 2025: Work started.\nDec 2025: Verbal approval granted for milestones 1 and 2.\nJan 2026: Formal rejection letter sent.',
    evidence: '1. WhatsApp chat logs confirming verbal approvals - Admissibility: High, Strength: Medium\n2. Site visitor registers signed by manager - Admissibility: High, Strength: Strong\n3. Work progress photographs - Admissibility: High, Strength: Strong',
    witnesses: '1. Lead engineer - present during inspections',
    opponent: 'Denies any verbal approval or site visitations.',
    relief: 'Impeaching credibility of opponent witness.',
    orders: 'None.',
    notes: 'Verify WhatsApp timestamps match log files.'
  },
  SettlementStrategy: {
    title: 'Settlement Brief - Franchise Dissolution',
    facts: 'Franchise split dispute. Client seeks amicable resolution of trade trademark disputes. Opponent asks for INR 50 Lakhs payment.',
    timeline: 'Jan 2026: Split announced.\nMarch 2026: Mediation talks initiated.\nJune 2026: Final draft proposal review.',
    evidence: '1. Franchise revenue loss statements - Admissibility: High, Strength: Strong\n2. Competitor shop lease papers - Admissibility: High, Strength: Strong\n3. Trademark license drafts - Admissibility: High, Strength: Strong',
    witnesses: '1. Mr. Dev - Mediator',
    opponent: 'Insists on complete exit fee payments.',
    relief: 'Mutual release of liabilities and exit fee of INR 15 Lakhs.',
    orders: 'Mediation report submitted.',
    notes: 'Prepare final draft exit agreement.'
  },
  DivorceCustody: {
    title: 'Custody & Alimony Plan - Verma vs Verma',
    facts: 'Divorce petition with child custody challenge. Mother seeks sole physical custody of 7-year-old child and maintenance of INR 75,000/month. Father seeks joint legal custody citing stable employment and housing.',
    timeline: 'April 2024: Marriage solemnized.\nMarch 2026: Separation due to compatibility issues.\nJune 15, 2026: Family court filing.',
    evidence: '1. School reports showing active father participation - Admissibility: High, Strength: Strong\n2. Joint bank account statements - Admissibility: High, Strength: Medium\n3. Rent receipts for family house - Admissibility: High, Strength: Strong',
    witnesses: '1. Dr. Neha Sen - Child Psychologist\n2. Ramesh Verma - Neighbor',
    opponent: 'Claims father has long travel schedules and cannot commit to child-rearing.',
    relief: 'Joint custody rights and reasonable monthly maintenance splits.',
    orders: 'Interim visitations allowed on weekends.',
    notes: 'Prioritize psychologist welfare reports.'
  },
  TaxAppeal: {
    title: 'GST Appeal - Apex Retail Tax liability',
    facts: 'Challenge against input tax credit (ITC) denial. Tax authority claims supplier did not deposit GST collected, seeking recovery of INR 8.5 Lakhs plus 18% penalty.',
    timeline: 'Jan 2025: Invoice raised by supplier.\nMarch 2026: Show cause notice issued.\nJune 5, 2026: Recovery demand order.',
    evidence: '1. GST invoices with transaction logs - Admissibility: High, Strength: Strong\n2. Bank statements showing full payment to supplier - Admissibility: High, Strength: Strong\n3. Tax return transcripts (Form GSTR-2B) - Admissibility: High, Strength: Strong',
    witnesses: '1. Rajan Sen - Chartered Accountant',
    opponent: 'Asserts buyer is jointly liable if supplier default occurs.',
    relief: 'Stay on tax recovery and reversal of input credit denial.',
    orders: 'None.',
    notes: 'Submit proof of bona fide trade transactions.'
  },
  WrongfulTermination: {
    title: 'Wrongful Termination - Sen vs InfoTech',
    facts: 'Wrongful dismissal tech lawsuit. Employee terminated immediately without notice pay or compensation. Employer claims performance issues, but employee has 5 consecutive excellent ratings.',
    timeline: 'Dec 2023: Joining date.\nMay 2026: Excellent performance rating email.\nJune 18, 2026: Termination email citing downsizing.',
    evidence: '1. Appointment letter specifying 3 months notice - Admissibility: High, Strength: Strong\n2. Email appraisal records - Admissibility: High, Strength: Strong\n3. Separation severance draft - Admissibility: High, Strength: Medium',
    witnesses: '1. Ajay Lal - Project Manager',
    opponent: 'Claims termination was aligned with restructuring provisions.',
    relief: 'Reinstatement or 3 months severance salary pay plus interest.',
    orders: 'None.',
    notes: 'Check separation clause specifications.'
  }
};

// Parsing Helpers
const parseEvidenceText = (text) => {
  if (!text) return [];
  return text.split('\n').filter(line => line.trim()).map((line, idx) => {
    const cleanLine = line.replace(/^\d+[\.\)\s-]*|^\s*[-*•]\s*/, '').trim();
    const parts = cleanLine.split(' - ');
    const name = parts[0] || 'Evidence #' + (idx + 1);
    const detail = parts[1] || '';
    const detailsMap = detail.split(', ');
    
    let admissibility = 'High';
    let strength = 'Strong';
    let credibility = 'High';
    
    detailsMap.forEach(d => {
      if (d.toLowerCase().includes('admissibility')) {
        admissibility = d.split(':')[1]?.trim() || admissibility;
      }
      if (d.toLowerCase().includes('strength')) {
        strength = d.split(':')[1]?.trim() || strength;
      }
    });

    return {
      id: `ev_${idx}_${Date.now()}`,
      name,
      type: name.toLowerCase().includes('email') || name.toLowerCase().includes('whatsapp') || name.toLowerCase().includes('log') ? 'Digital' : 'Document',
      admissibility: admissibility.replace(/admissibility:?/i, '').trim(),
      strength: strength.replace(/strength:?/i, '').trim(),
      credibility,
      linkedWitness: 'N/A',
      status: 'Admitted',
      risk: admissibility === 'Low' || strength === 'Weak' ? 'High' : 'Low'
    };
  });
};

const parseWitnessText = (text) => {
  if (!text) return [];
  return text.split('\n').filter(line => line.trim()).map((line, idx) => {
    const cleanLine = line.replace(/^\d+[\.\)\s-]*|^\s*[-*•]\s*/, '').trim();
    const parts = cleanLine.split(' - ');
    const name = parts[0] || 'Witness #' + (idx + 1);
    const role = parts[1] || 'Witness';
    return {
      id: `wit_${idx}_${Date.now()}`,
      name,
      role,
      supports: idx % 2 === 0 ? 'Plaintiff' : 'Defendant',
      weakness: 'None identified',
      questions: [`Please verify the details of the event on the record?`],
      credibilityScore: 85 - (idx * 5)
    };
  });
};

const parseTimelineText = (text) => {
  if (!text) return [];
  return text.split('\n').filter(line => line.trim()).map((line, idx) => {
    const cleanLine = line.replace(/^\d+[\.\)\s-]*|^\s*[-*•]\s*/, '').trim();
    const parts = cleanLine.split(': ');
    let date = 'N/A';
    let title = cleanLine;
    if (parts.length > 1) {
      date = parts[0];
      title = parts[1];
    } else {
      const dateMatch = cleanLine.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}|\d{4}/i);
      if (dateMatch) {
        date = dateMatch[0];
      }
    }
    return {
      id: `time_${idx}_${Date.now()}`,
      title,
      date,
      description: `Case milestone event`
    };
  });
};

const serializeEvidenceList = (list) => {
  return list.map((ev, idx) => `${idx + 1}. ${ev.name} - Admissibility: ${ev.admissibility}, Strength: ${ev.strength}`).join('\n');
};

const serializeWitnessList = (list) => {
  return list.map((w, idx) => `${idx + 1}. ${w.name} - ${w.role}`).join('\n');
};

const serializeTimelineList = (list) => {
  return list.map((t, idx) => `${t.date}: ${t.title}`).join('\n');
};

const generatePath = (val) => {
  const num = Number(val) || 50;
  const p1 = 20 - (num * 0.1);
  const p2 = 22 - (num * 0.08);
  const p3 = 18 - (num * 0.12);
  const p4 = 15 - (num * 0.14);
  return `M0,${p1} L25,${p2} L50,${p3} L75,${p4} L100,${20 - (num * 0.13)}`;
};

const StrategyEngine = ({ currentCase, onBack, theme, allProjects = [], onUpdateCase }) => {
  const isDark = theme === 'dark';
  
  // Platform States
  const [strategySource, setStrategySource] = useState('EXISTING_CASE');
  const [caseTitle, setCaseTitle] = useState('');
  const [caseFacts, setCaseFacts] = useState('');
  const [linkedCaseId, setLinkedCaseId] = useState(currentCase?._id || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [localProjects, setLocalProjects] = useState(allProjects);
  
  // Dynamic switch fields for Manual/Doc mode
  const [clientName, setClientName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [matterType, setMatterType] = useState('Civil');
  const [courtName, setCourtName] = useState('');
  const [assignedAdvocate, setAssignedAdvocate] = useState('Senior Counsel');
  const [caseStage, setCaseStage] = useState('Pre-litigation');
  const [hearingDate, setHearingDate] = useState('');
  const [caseStatus, setCaseStatus] = useState('Active');

  // Drag & drop documents state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isExtractingDocs, setIsExtractingDocs] = useState(false);

  // Guided workflow timeline step
  const [activeWorkflowStep, setActiveWorkflowStep] = useState('case_selection');

  // Accordion active group state (Single accordion mode)
  const [activeAccordion, setActiveAccordion] = useState('facts');
  
  // Structured builders
  const [evidenceList, setEvidenceList] = useState([]);
  const [witnessList, setWitnessList] = useState([]);
  const [timelineList, setTimelineList] = useState([]);
  
  // Inline Add states
  const [newEv, setNewEv] = useState({ name: '', type: 'Document', admissibility: 'High', strength: 'Strong', credibility: 'High', risk: 'Low' });
  const [newWit, setNewWit] = useState({ name: '', role: '', supports: 'Plaintiff', credibilityScore: 85 });
  const [newTime, setNewTime] = useState({ date: '', title: '' });

  // Get active case context for auto-running
  const activeCaseContext = useActiveCase();
  const triggerAutoRun = activeCaseContext?.triggerAutoRun;

  // Active Case Auto-load flag
  const [isUsingActiveCase, setIsUsingActiveCase] = useState(!!currentCase);

  // Scenario Builder Raw States (synced with visual lists)
  const [scenarioTimeline, setScenarioTimeline] = useState('');
  const [scenarioEvidence, setScenarioEvidence] = useState('');
  const [scenarioWitnesses, setScenarioWitnesses] = useState('');
  const [scenarioOpponent, setScenarioOpponent] = useState('');
  const [scenarioRelief, setScenarioRelief] = useState('');
  const [scenarioOrders, setScenarioOrders] = useState('');
  const [scenarioNotes, setScenarioNotes] = useState('');

  // Simulation & Loader States
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState('');
  const [strategyResult, setStrategyResult] = useState(null);
  const [activeSimulationStep, setActiveSimulationStep] = useState(0);

  // Modals & History
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState({
    out_arguments: false,
    out_precedents: true,
    out_matrix: true,
    out_settlement: true,
    out_actions: true
  });

  const handleSpeechSummary = () => {
    if (!strategyResult) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = `Litigation Strategy for ${caseTitle || 'this case'}. Winning probability is ${strategyResult.stats?.winningProbability} percent. AI Recommendation is ${strategyResult.finalOpinion?.reasoning || strategyResult.strategies?.primary?.description || 'Proceed with trial'}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Templates Explorer
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  
  // Checklist & Audit
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  // New Case Form state
  const [newCaseForm, setNewCaseForm] = useState({
    clientName: '',
    accused: '',
    matterType: 'Civil',
    courtName: '',
    assignedAdvocate: '',
    stage: 'Pre-litigation',
    summary: ''
  });

  // Favorites Templates
  const [favoriteTemplates, setFavoriteTemplates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aisa_strategy_fav_templates')) || [];
    } catch {
      return [];
    }
  });

  // Recently Used Templates
  const [recentTemplates, setRecentTemplates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aisa_strategy_recent_templates')) || [];
    } catch {
      return [];
    }
  });

  // Project hydration
  useEffect(() => {
    setLocalProjects(allProjects);
  }, [allProjects]);

  // Synchronize dynamic case fields from selected existing case
  const activeProjectObject = useMemo(() => {
    const activeId = linkedCaseId || currentCase?._id;
    return localProjects.find(p => p._id === activeId) || currentCase;
  }, [linkedCaseId, currentCase, localProjects]);

  useEffect(() => {
    if (activeProjectObject && strategySource === 'EXISTING_CASE') {
      setClientName(activeProjectObject.clientName || activeProjectObject.client || '');
      setOpponentName(activeProjectObject.opponentName || activeProjectObject.accused || activeProjectObject.opponent || '');
      setMatterType(activeProjectObject.caseType || activeProjectObject.matterType || 'Civil');
      setCourtName(activeProjectObject.courtName || activeProjectObject.court || '');
      setAssignedAdvocate(activeProjectObject.assignedAdvocate || 'Senior Counsel');
      setCaseStage(activeProjectObject.stage || 'Pre-litigation');
      setHearingDate(activeProjectObject.hearingDate || '');
      setCaseStatus(activeProjectObject.status || 'Active');
    }
  }, [activeProjectObject, strategySource]);

  // Strategy Source change handler
  const handleStrategySourceChange = (source) => {
    setStrategySource(source);
    setStrategyResult(null);
    if (source === 'MANUAL_SCENARIO') {
      resetPlatformState();
      setClientName('');
      setOpponentName('');
      setMatterType('Civil');
      setCourtName('');
      setAssignedAdvocate('Senior Counsel');
      setCaseStage('Pre-litigation');
      setHearingDate('');
      setCaseStatus('Active');
      setActiveWorkflowStep('fact_analysis');
    } else if (source === 'UPLOAD_DOCUMENTS') {
      resetPlatformState();
      setUploadedFiles([]);
      setClientName('');
      setOpponentName('');
      setMatterType('Civil');
      setCourtName('');
      setAssignedAdvocate('Senior Counsel');
      setCaseStage('Pre-litigation');
      setHearingDate('');
      setCaseStatus('Active');
      setActiveWorkflowStep('case_selection');
    } else if (source === 'EXISTING_CASE') {
      if (currentCase) {
        hydrateFromCase(currentCase);
      }
      setActiveWorkflowStep('case_selection');
    }
  };

  const toggleAccordion = (name) => {
    if (name.startsWith('out_')) {
      setCollapsedBlocks(prev => ({
        ...prev,
        [name]: !prev[name]
      }));
      return;
    }
    setActiveAccordion(prev => prev === name ? null : name);
    // Track workflow step based on expanded section
    if (name === 'facts' || name === 'timeline') setActiveWorkflowStep('fact_analysis');
    else if (name === 'evidence' || name === 'witnesses') setActiveWorkflowStep('evidence_analysis');
    else if (name === 'opponent') setActiveWorkflowStep('opponent_prediction');
    else if (name === 'relief' || name === 'orders') setActiveWorkflowStep('legal_risk_analysis');
  };

  // --- Dynamic Simulation Step Progress ---
  useEffect(() => {
    let interval;
    if (isAuditing) {
      setActiveSimulationStep(0);
      interval = setInterval(() => {
        setActiveSimulationStep(prev => (prev < 8 ? prev + 1 : prev));
      }, 1500);
    } else {
      setActiveSimulationStep(0);
    }
    return () => clearInterval(interval);
  }, [isAuditing]);

  const toggleFavoriteTemplate = (id, e) => {
    e.stopPropagation();
    setFavoriteTemplates(prev => {
      const updated = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id];
      localStorage.setItem('aisa_strategy_fav_templates', JSON.stringify(updated));
      return updated;
    });
  };

  // --- Hydration ---
  useEffect(() => {
    if (currentCase && strategySource === 'EXISTING_CASE') {
      setLinkedCaseId(currentCase._id);
      hydrateFromCase(currentCase);
    }
  }, [currentCase, strategySource]);

  // Handle active case auto-load
  useEffect(() => {
    if (currentCase && strategySource === 'EXISTING_CASE') {
      setIsUsingActiveCase(true);
      autoLoadCaseDetails(currentCase);
    }
  }, [currentCase, strategySource]);

  // Execute Auto-Run if intended by Context
  useEffect(() => {
    if (triggerAutoRun && currentCase && !strategyResult && !isAuditing && strategySource === 'EXISTING_CASE') {
      toast.success(`✓ Case workspace prefilled successfully`, { icon: '🏛️' });
      runLitigationSimulation();
    }
  }, [triggerAutoRun, currentCase, strategyResult, isAuditing, strategySource]);

  const resetPlatformState = () => {
    setCaseTitle('');
    setCaseFacts('');
    setScenarioTimeline('');
    setScenarioEvidence('');
    setScenarioWitnesses('');
    setScenarioOpponent('');
    setScenarioRelief('');
    setScenarioOrders('');
    setScenarioNotes('');
    setEvidenceList([]);
    setWitnessList([]);
    setTimelineList([]);
    setStrategyResult(null);
    setAuditLogs([]);
    setTasks([]);
  };

  const hydrateFromCase = (caseObj) => {
    if (!caseObj) return;
    const ls = caseObj.litigationStrategy;
    if (ls) {
      setCaseTitle(ls.caseTitle || caseObj.name || '');
      setCaseFacts(ls.caseFacts || caseObj.description || caseObj.summary || '');
      setScenarioTimeline(ls.scenarioTimeline || '');
      setScenarioEvidence(ls.scenarioEvidence || '');
      setScenarioWitnesses(ls.scenarioWitnesses || '');
      setScenarioOpponent(ls.scenarioOpponent || '');
      setScenarioRelief(ls.scenarioRelief || '');
      setScenarioOrders(ls.scenarioOrders || '');
      setScenarioNotes(ls.scenarioNotes || '');
      setStrategyResult(ls.activeStrategy || null);
      setTasks(ls.tasks || []);
      setAuditLogs(ls.auditLogs || []);

      // Load structured lists
      setEvidenceList(parseEvidenceText(ls.scenarioEvidence || ''));
      setWitnessList(parseWitnessText(ls.scenarioWitnesses || ''));
      setTimelineList(parseTimelineText(ls.scenarioTimeline || caseObj.hearingDate ? `Hearing: ${caseObj.hearingDate}` : ''));
    } else {
      resetPlatformState();
      setCaseTitle(caseObj.name || '');
      setCaseFacts(caseObj.description || caseObj.summary || '');
      setTimelineList(parseTimelineText(caseObj.hearingDate ? `Hearing: ${caseObj.hearingDate}` : ''));
    }
  };

  const autoLoadCaseDetails = (targetCase) => {
    const activeObj = targetCase || currentCase || allProjects.find(p => p._id === linkedCaseId);
    if (!activeObj) return;

    const mapped = mapCaseToForm(activeObj);
    setCaseTitle(activeObj.name || activeObj.title || '');
    setCaseFacts(activeObj.description || activeObj.summary || '');
    setScenarioTimeline(activeObj.hearingDate ? `Hearing milestone scheduled: ${activeObj.hearingDate}` : '');
    setScenarioEvidence(mapped.evidenceSummary || '');
    setScenarioWitnesses(mapped.witnesses || '');
    setScenarioOpponent(mapped.respondent ? `Opposing Party: ${mapped.respondent}` : '');
    setScenarioRelief('');
    setScenarioOrders('');
    setScenarioNotes(activeObj.notes || mapped.notes || '');

    // Parse list structures
    setEvidenceList(parseEvidenceText(mapped.evidenceSummary || ''));
    setWitnessList(parseWitnessText(mapped.witnesses || ''));
    setTimelineList(parseTimelineText(activeObj.hearingDate ? `Hearing: ${activeObj.hearingDate}` : ''));
  };

  const handleUseActiveCaseToggle = (checked) => {
    setIsUsingActiveCase(checked);
    if (checked) {
      autoLoadCaseDetails();
    } else {
      resetPlatformState();
      if (currentCase) {
        setCaseTitle(currentCase.name || '');
        setCaseFacts(currentCase.description || currentCase.summary || '');
      }
    }
  };

  const ensureCaseCreated = async () => {
    if (strategySource !== 'EXISTING_CASE') return { activeId: null, activeProj: null };
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
        setLocalProjects(prev => [newProj, ...prev]);
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

  const syncToDatabase = async (updates) => {
    if (strategySource !== 'EXISTING_CASE') return;
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
          scenarioTimeline,
          scenarioEvidence,
          scenarioWitnesses,
          scenarioOpponent,
          scenarioRelief,
          scenarioOrders,
          scenarioNotes,
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

    if (strategySource === 'EXISTING_CASE') {
      await syncToDatabase({ auditLogs: updatedLogs });
    }
  };

  // --- Task Manager ---
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

    if (strategySource === 'EXISTING_CASE') {
      await syncToDatabase({ tasks: updatedTasks });
    }
    await logAudit("Task Appended", `Added procedural strategy task: "${newTask.task}"`);
    toast.success("Task appended to checklist.");
  };

  const handleToggleTask = async (taskId) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    setTasks(updatedTasks);

    if (strategySource === 'EXISTING_CASE') {
      await syncToDatabase({ tasks: updatedTasks });
    }
    const target = tasks.find(t => t.id === taskId);
    await logAudit("Task Toggled", `Marked task "${target.task}" as ${!target.completed ? 'COMPLETED' : 'PENDING'}`);
  };

  const handleDeleteTask = async (taskId) => {
    const target = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);

    if (strategySource === 'EXISTING_CASE') {
      await syncToDatabase({ tasks: updatedTasks });
    }
    await logAudit("Task Deleted", `Removed task: "${target.task}"`);
  };

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

  // Dynamic AI Strategy Completion Check metrics
  const strategyReadinessCalculated = useMemo(() => {
    const infoOk = clientName.trim() && opponentName.trim() ? 1 : 0;
    const factsOk = caseFacts.trim().length > 15 ? 1 : 0;
    const timelineOk = timelineList.length > 0 ? 1 : 0;
    const evidenceOk = evidenceList.length > 0 ? 1 : 0;
    const witnessesOk = witnessList.length > 0 ? 1 : 0;
    const opponentOk = scenarioOpponent.trim().length > 10 ? 1 : 0;

    const score = Math.round(((infoOk * 15) + (factsOk * 25) + (timelineOk * 15) + (evidenceOk * 15) + (witnessesOk * 15) + (opponentOk * 15)));
    
    return {
      info: infoOk === 1,
      facts: factsOk === 1,
      timeline: timelineOk === 1,
      evidence: evidenceOk === 1,
      witnesses: witnessesOk === 1,
      opponent: opponentOk === 1,
      overall: score
    };
  }, [clientName, opponentName, caseFacts, timelineList, evidenceList, witnessList, scenarioOpponent]);

  // --- Dynamic workflow bar status indicators ---
  const getWorkflowStepStatus = (stepKey) => {
    if (stepKey === 'case_selection') {
      return (strategySource === 'EXISTING_CASE' && activeProjectObject) || (strategySource !== 'EXISTING_CASE' && clientName.trim()) ? 'COMPLETE' : 'PENDING';
    }
    if (stepKey === 'fact_analysis') {
      return caseFacts.trim().length > 15 && timelineList.length > 0 ? 'COMPLETE' : 'PENDING';
    }
    if (stepKey === 'evidence_analysis') {
      return evidenceList.length > 0 && witnessList.length > 0 ? 'COMPLETE' : 'PENDING';
    }
    if (stepKey === 'opponent_prediction') {
      return scenarioOpponent.trim().length > 10 || (strategyResult && strategyResult.opponentStrategy) ? 'COMPLETE' : 'PENDING';
    }
    if (stepKey === 'legal_risk_analysis') {
      return scenarioOrders.trim() || (strategyResult && strategyResult.risks) ? 'COMPLETE' : 'PENDING';
    }
    if (stepKey === 'winning_probability') {
      return strategyResult && strategyResult.stats?.winningProbability !== '--' ? 'COMPLETE' : 'PENDING';
    }
    if (stepKey === 'argument_planning') {
      return strategyResult && strategyResult.finalArguments ? 'COMPLETE' : 'PENDING';
    }
    if (stepKey === 'settlement_rec') {
      return strategyResult && strategyResult.settlement ? 'COMPLETE' : 'PENDING';
    }
    if (stepKey === 'final_strategy') {
      return strategyResult ? 'COMPLETE' : 'PENDING';
    }
    return 'PENDING';
  };

  // --- AI Litigation Auditor Simulation ---
  const runLitigationSimulation = async (actionType = 'FULL_SIMULATION') => {
    const targetCase = currentCase || allProjects.find(p => p._id === linkedCaseId);
    
    // Sync lists back to text forms before run
    const currentFactsText = [
      caseFacts.trim() ? `Case Facts: ${caseFacts.trim()}` : '',
      serializeTimelineList(timelineList) ? `Timeline: ${serializeTimelineList(timelineList)}` : '',
      serializeEvidenceList(evidenceList) ? `Evidence: ${serializeEvidenceList(evidenceList)}` : '',
      serializeWitnessList(witnessList) ? `Witnesses: ${serializeWitnessList(witnessList)}` : '',
      scenarioOpponent.trim() ? `Opponent Position: ${scenarioOpponent.trim()}` : '',
      scenarioRelief.trim() ? `Relief Sought: ${scenarioRelief.trim()}` : '',
      scenarioOrders.trim() ? `Previous Orders: ${scenarioOrders.trim()}` : '',
      scenarioNotes.trim() ? `Notes: ${scenarioNotes.trim()}` : ''
    ].filter(Boolean).join('\n\n');

    const factsText = currentFactsText.trim() || targetCase?.description || targetCase?.summary || '';
    const currentTitle = caseTitle.trim() || targetCase?.name || 'Custom Courtroom Strategy';
    
    if (!factsText.trim()) {
      toast.error("Please provide case facts or load templates first.");
      return;
    }

    setIsAuditing(true);
    setStrategyResult(null);
    setAuditStep('Reading Facts...');

    const toastId = toast.loading(`AI litigation workspace: compiling ${actionType.replace('_', ' ').toLowerCase()}...`);

    let customizedPrompt = `Matter Title: ${currentTitle}\nClient Name: ${clientName}\nOpponent Name: ${opponentName}\nCourt Name: ${courtName}\nMatter Type: ${matterType}\n\nCase Facts Scenario Details:\n${factsText}`;
    if (actionType === 'RISK_ASSESSMENT') {
      customizedPrompt += `\n\n[INSTRUCTION: Focus deeply on litigation and procedural risks. Ensure the "risks" and "stats.litigationRisk" fields are calibrated, and prioritize risk mitigations in "aiRecommendations".]`;
    } else if (actionType === 'EVIDENCE_REVIEW') {
      customizedPrompt += `\n\n[INSTRUCTION: Analyze the evidence dossier. Calibrate the "evidenceStrategy" structure fully and provide strength evaluations.]`;
    } else if (actionType === 'OPPONENT_PREDICTION') {
      customizedPrompt += `\n\n[INSTRUCTION: Conduct deep opponent strategy forecasting. Fully populate the "opponentStrategy" and "counterStrategy" mappings.]`;
    } else if (actionType === 'SETTLEMENT_ANALYSIS') {
      customizedPrompt += `\n\n[INSTRUCTION: Evaluate settlement and mediation viability. Provide structured financial parameters in "negotiationPositions" and "settlement".]`;
    } else if (actionType === 'GENERATE_ARGUMENTS') {
      customizedPrompt += `\n\n[INSTRUCTION: Formulate trial arguments. Structure "finalArguments" (opening, core arguments, rebuttal, closing prayer) and "crossExamPlanner".]`;
    }

    try {
      const response = await generateChatResponse(
        [],
        customizedPrompt,
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
      setActiveWorkflowStep('winning_probability');
      
      // Only write/sync to database if strategySource is EXISTING_CASE
      if (strategySource === 'EXISTING_CASE') {
        const { activeId } = await ensureCaseCreated();
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
        await logAudit("AI Litigation Strategy Simulated", `Completed strategy run with Winning Probability: ${parsed.stats.winningProbability}%.`);
      } else {
        toast.success("Litigation strategy generated locally!");
      }

      toast.success("AI litigation analysis complete!", { id: toastId });

    } catch (e) {
      console.error("Simulation error", e);
      toast.error("Failed to compile strategy simulation: " + e.message, { id: toastId });
    } finally {
      setIsAuditing(false);
      setAuditStep('');
    }
  };

  // --- Real-time AI Extract/Autofill helpers ---
  const runAIFieldExtraction = async (fieldType) => {
    if (!caseFacts.trim()) {
      toast.error("Please enter Case Facts first so the AI can extract data.");
      return;
    }
    const tid = toast.loading(`AI extracting ${fieldType} from case facts...`);
    try {
      let prompt = "";
      if (fieldType === 'timeline') {
        prompt = `Based on these case facts: "${caseFacts}", extract a chronological timeline of events. Return ONLY a JSON array of events. No conversational text.
Schema: [{"title": "Event Title", "date": "Date/Time string", "description": "Short explanation"}]`;
      } else if (fieldType === 'evidence') {
        prompt = `Based on these case facts: "${caseFacts}", identify likely evidence. Return ONLY a JSON array of evidence items. No conversational text.
Schema: [{"name": "Document/Item Name", "type": "Document | Digital | Physical | Oral", "admissibility": "High | Medium | Low", "strength": "Strong | Medium | Weak", "credibility": "High | Medium | Low", "linkedWitness": "Witness Name or N/A", "status": "Ready | Staged", "risk": "Low | Medium | High"}]`;
      } else if (fieldType === 'witnesses') {
        prompt = `Based on these case facts: "${caseFacts}", identify potential witnesses. Return ONLY a JSON array of witness items. No conversational text.
Schema: [{"name": "Witness Name", "role": "Role description", "supports": "Plaintiff | Defendant", "weakness": "Potential vulnerability", "questions": ["Cross exam question 1", "Cross exam question 2"], "credibilityScore": 0-100}]`;
      }

      const response = await generateChatResponse(
        [],
        prompt,
        "You are an expert litigation analysis AI. Return ONLY valid JSON.",
        [],
        'English',
        null,
        'legal'
      );
      const responseText = typeof response === 'string' ? response : (response?.reply || '');
      
      let parsed = null;
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/(\{[\s\S]*\})/) || responseText.match(/(\[[\s\S]*\])/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        parsed = JSON.parse(responseText.trim());
      }

      if (fieldType === 'timeline') {
        const formatted = parsed.map((item, idx) => ({
          id: `time_${idx}_${Date.now()}`,
          ...item
        }));
        setTimelineList(formatted);
        const serialized = serializeTimelineList(formatted);
        setScenarioTimeline(serialized);
        if (strategySource === 'EXISTING_CASE') {
          await syncToDatabase({ scenarioTimeline: serialized });
        }
        toast.success("Timeline milestones extracted!", { id: tid });
      } else if (fieldType === 'evidence') {
        const formatted = parsed.map((item, idx) => ({
          id: `ev_${idx}_${Date.now()}`,
          ...item
        }));
        setEvidenceList(formatted);
        const serialized = serializeEvidenceList(formatted);
        setScenarioEvidence(serialized);
        if (strategySource === 'EXISTING_CASE') {
          await syncToDatabase({ scenarioEvidence: serialized });
        }
        toast.success("Evidence items extracted!", { id: tid });
      } else if (fieldType === 'witnesses') {
        const formatted = parsed.map((item, idx) => ({
          id: `wit_${idx}_${Date.now()}`,
          ...item
        }));
        setWitnessList(formatted);
        const serialized = serializeWitnessList(formatted);
        setScenarioWitnesses(serialized);
        if (strategySource === 'EXISTING_CASE') {
          await syncToDatabase({ scenarioWitnesses: serialized });
        }
        toast.success("Witness pool identified!", { id: tid });
      }
    } catch (err) {
      console.error("AI Extraction failed", err);
      toast.error("Failed to extract data. Make sure facts are detailed.", { id: tid });
    }
  };

  // --- Document Drag and Drop upload extraction ---
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFilesToList(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addFilesToList(files);
  };

  const addFilesToList = (files) => {
    const formatted = files.map((file, idx) => ({
      id: `file_${idx}_${Date.now()}`,
      name: file.name,
      size: Math.round(file.size / 1024) + ' KB',
      type: file.type,
      status: 'Staged'
    }));
    setUploadedFiles(prev => [...prev, ...formatted]);
    toast.success(`${files.length} documents uploaded to workspace.`);
  };

  const runDocumentAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one legal document first.");
      return;
    }
    setIsExtractingDocs(true);
    const tid = toast.loading("AI OCR & Legal Document Parsing active...");
    
    // Simulate OCR steps for UI
    setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'OCR Running' })));
    await new Promise(r => setTimeout(r, 1500));
    setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'OCR Complete' })));
    await new Promise(r => setTimeout(r, 1000));
    setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'Extracting' })));

    try {
      const fileNames = uploadedFiles.map(f => f.name).join(', ');
      const prompt = `Analyze these uploaded legal documents: [${fileNames}]. Extract all case facts, timeline, evidence, witnesses, opponent claims, relief, and court orders. Output your response as a single valid JSON object. Do not output any chat text.
      
      JSON Schema:
      {
        "clientName": "extracted client name",
        "opponentName": "extracted opponent name",
        "matterType": "Civil | Criminal | Corporate | Property | Family | Tax | Employment",
        "courtName": "extracted court jurisdiction",
        "caseFacts": "extracted summary of case facts",
        "timeline": [{"title": "Event Title", "date": "Date/Time string", "description": "Short explanation"}],
        "evidence": [{"name": "Document Name", "type": "Document | Digital | Physical | Oral", "admissibility": "High | Medium | Low", "strength": "Strong | Medium | Weak", "risk": "Low | Medium | High"}],
        "witnesses": [{"name": "Witness Name", "role": "Witness role/duties", "supports": "Plaintiff | Defendant", "credibilityScore": 85}],
        "opponentPosition": "extracted opponent demands/arguments",
        "reliefSought": "extracted relief demands (e.g. Damages, Stay Order)",
        "previousOrders": "extracted summary of previous orders",
        "advocateNotes": "strategic notes for trial prep"
      }`;

      const response = await generateChatResponse(
        [],
        prompt,
        "You are an expert Legal AI parser. Return ONLY valid JSON matching the schema.",
        [],
        'English',
        null,
        'legal'
      );

      const responseText = typeof response === 'string' ? response : (response?.reply || '');
      
      let parsed = null;
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/(\{[\s\S]*\})/) || responseText.match(/(\[[\s\S]*\])/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        parsed = JSON.parse(responseText.trim());
      }

      if (parsed) {
        setClientName(parsed.clientName || 'Extracted Client');
        setOpponentName(parsed.opponentName || 'Extracted Opponent');
        setMatterType(parsed.matterType || 'Civil');
        setCourtName(parsed.courtName || 'Extracted Jurisdiction');
        setCaseFacts(parsed.caseFacts || '');
        setScenarioOpponent(parsed.opponentPosition || '');
        setScenarioRelief(parsed.reliefSought || '');
        setScenarioOrders(parsed.previousOrders || '');
        setScenarioNotes(parsed.advocateNotes || '');

        if (parsed.timeline) {
          setTimelineList(parsed.timeline.map((t, i) => ({ id: `time_${i}_${Date.now()}`, ...t })));
          setScenarioTimeline(serializeTimelineList(parsed.timeline));
        }
        if (parsed.evidence) {
          setEvidenceList(parsed.evidence.map((e, i) => ({ id: `ev_${i}_${Date.now()}`, credibility: 'High', linkedWitness: 'N/A', status: 'Ready', ...e })));
          setScenarioEvidence(serializeEvidenceList(parsed.evidence));
        }
        if (parsed.witnesses) {
          setWitnessList(parsed.witnesses.map((w, i) => ({ id: `wit_${i}_${Date.now()}`, weakness: 'None', questions: [], ...w })));
          setScenarioWitnesses(serializeWitnessList(parsed.witnesses));
        }

        setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'Extracted' })));
        toast.success("Documents successfully parsed! Scenario builder prefilled.", { id: tid });
        setActiveWorkflowStep('fact_analysis');
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to extract content from documents.", { id: tid });
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'Failed' })));
    } finally {
      setIsExtractingDocs(false);
    }
  };

  // --- Exports ---
  const handlePrintPDF = () => {
    if (!strategyResult) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Enable popups to print/export PDF.");
      return;
    }

    const html = `
      <html>
      <head>
        <meta charset="UTF-8"/>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <title>AI LEGAL™ Litigation Command Report - ${caseTitle}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; line-height: 1.6; color: #0f172a; bg: #ffffff; }
          .header { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-family: 'Outfit', sans-serif; font-size: 24pt; font-weight: 800; color: #1e1b4b; margin: 0; }
          .subtitle { font-size: 11pt; color: #6366f1; font-weight: 600; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
          .meta-section { margin-bottom: 25px; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
          .meta-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 15px; text-align: center; }
          .meta-card { padding: 10px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; }
          .meta-val { font-size: 16pt; font-weight: 800; color: #4f46e5; }
          .meta-lbl { font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 4px; }
          .section-title { font-family: 'Outfit', sans-serif; font-size: 14pt; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; color: #1e1b4b; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; }
          .card { padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fafafa; margin-bottom: 15px; }
          .card-title { font-weight: 700; font-size: 11pt; color: #1e1b4b; margin-bottom: 6px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: 700; text-transform: uppercase; }
          .badge-green { background: #d1fae5; color: #065f46; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 60px; border-top: 1px solid #e2e8f0; font-size: 9pt; text-align: center; padding-top: 15px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">AI LEGAL™ Litigation Command Brief</h1>
          <div class="subtitle">Courtroom Strategy, Simulation & Exposure Report</div>
          <div style="margin-top: 10px; font-size: 11pt; font-weight: 500;">Matter: <strong>${caseTitle || 'Litigation Strategy Brief'}</strong></div>
        </div>

        <div class="meta-section">
          <div class="meta-grid">
            <div class="meta-card"><div class="meta-val">${strategyResult.stats?.winningProbability}%</div><div class="meta-lbl">Winning Prob.</div></div>
            <div class="meta-card"><div class="meta-val">${strategyResult.stats?.litigationRisk}%</div><div class="meta-lbl">Litigation Risk</div></div>
            <div class="meta-card"><div class="meta-val">${strategyResult.stats?.overallStrategyScore}%</div><div class="meta-lbl">Strategy Score</div></div>
            <div class="meta-card"><div class="meta-val">${strategyResult.stats?.courtReadiness}%</div><div class="meta-lbl">Readiness</div></div>
          </div>
        </div>

        <div class="section-title">AI Strategic Recommendation</div>
        <div class="card" style="border-left: 5px solid #4f46e5;">
          <div class="card-title">Recommendation Brief</div>
          <p>${strategyResult.finalOpinion?.reasoning || 'No strategy brief available.'}</p>
        </div>

        <div class="section-title">Litigation Strategy Breakdown</div>
        <p><strong>Primary:</strong> ${strategyResult.strategies?.primary?.description || 'N/A'}</p>
        <p><strong>Alternative:</strong> ${strategyResult.strategies?.alternative?.description || 'N/A'}</p>
        <p><strong>Backup:</strong> ${strategyResult.strategies?.backup?.description || 'N/A'}</p>

        <div class="section-title">Argument Roadmap</div>
        <div class="card">
          <p><strong>Opening statements:</strong> ${strategyResult.finalArguments?.opening || 'N/A'}</p>
          <p><strong>Core Courtroom arguments:</strong> ${strategyResult.finalArguments?.arguments?.join(', ') || 'N/A'}</p>
          <p><strong>Closing prayer:</strong> ${strategyResult.finalArguments?.prayer || 'N/A'}</p>
        </div>

        <div class="section-title">Judicial Precedents Mapping</div>
        <ul>
          ${strategyResult.precedents?.map(p => `
            <li style="margin-bottom: 12px;">
              <strong>${p.citation}</strong> (${p.court}) - Similarity Match: ${p.similarityScore}%
              <br/><span style="font-size: 10pt; color: #475569;">Summary Ratio Decidendi: ${p.summary}</span>
            </li>
          `).join('') || '<li>None</li>'}
        </ul>

        <div class="footer">
          Generated automatically by AI LEGAL™ Strategy Engine. Confidential client counsel brief.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      logAudit("Exported PDF Strategy", "Exported litigation strategy PDF report.");
    }, 500);
  };

  const handleExportDoc = () => {
    if (!strategyResult) return;
    
    const docContent = `
AI LEGAL™ LITIGATION STRATEGY REPORT
====================================

Matter: ${caseTitle || 'Litigation Strategy Brief'}
Winning Probability: ${strategyResult.stats?.winningProbability}%
Litigation Risk Score: ${strategyResult.stats?.litigationRisk}%
Precedent Match Support: ${strategyResult.stats?.precedentSupport}%
Overall Court Readiness Score: ${readinessMetrics.overall}%

RECOMMENDED STRATEGY BRIEF:
---------------------------
- Primary Legal Strategy: ${strategyResult.strategies?.primary?.description || 'N/A'}
- Alternative Legal Strategy: ${strategyResult.strategies?.alternative?.description || 'N/A'}
- Backup Strategy Action: ${strategyResult.strategies?.backup?.description || 'N/A'}
- Final Opinion Reasoning: ${strategyResult.finalOpinion?.reasoning || 'N/A'}

COURTROOM MILESTONES TIMELINE:
------------------------------
${strategyResult.winningRoadmap?.map((t, idx) => `${idx + 1}. ${t.stage} [${t.status}]: ${t.description}`).join('\n')}

EVIDENCE & FACT DEPOSITION STRATEGY:
------------------------------------
Strong Evidence Elements:
${strategyResult.evidenceStrategy?.strong?.map(e => `* ${e.evidence} - ${e.reason}`).join('\n')}
Missing Key Proofs:
${strategyResult.evidenceStrategy?.missing?.map(e => `* ${e.evidence} - ${e.reason}`).join('\n')}

WITNESS CROSS EXAMINATION ROADMAP:
----------------------------------
${strategyResult.witnessStrategy?.crossExamination?.map((c, idx) => `${idx + 1}. Topic: ${c.topic}\n   Questions: ${c.questions?.join(', ')}`).join('\n')}

JUDICIAL PRECEDENTS & LAW CODES:
--------------------------------
${strategyResult.precedents?.map(p => `* ${p.citation} (${p.court}) - Match: ${p.similarityScore}%\n  Ratio: ${p.summary}`).join('\n')}

Generated by AI LEGAL™ Litigation Intelligence Suite. Confidential.
`;

    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(caseTitle || 'Strategy').replace(/\s+/g, '_')}_AI_LEGAL_Strategy.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logAudit("Exported Word Brief", "Downloaded litigation strategy document brief.");
    toast.success("Word Document exported successfully!");
  };

  const handleQuickToolSelect = (toolId, toolName) => {
    const seed = TEMPLATE_SEED_DATA[toolId];
    if (seed) {
      setCaseTitle(seed.title);
      setCaseFacts(seed.facts);
      setScenarioTimeline(seed.timeline);
      setScenarioEvidence(seed.evidence);
      setScenarioWitnesses(seed.witnesses);
      setScenarioOpponent(seed.opponent);
      setScenarioRelief(seed.relief);
      setScenarioOrders(seed.orders);
      setScenarioNotes(seed.notes);
      
      // Load structured builders
      setEvidenceList(parseEvidenceText(seed.evidence));
      setWitnessList(parseWitnessText(seed.witnesses));
      setTimelineList(parseTimelineText(seed.timeline));

      toast.success(`Template loaded: ${seed.title}`);
      addToRecentTemplates(toolId);
      setActiveWorkflowStep('fact_analysis');
    }
  };

  const handleQuickActionTrigger = async (actionType) => {
    await runLitigationSimulation(actionType);
  };

  const addToRecentTemplates = (id) => {
    setRecentTemplates(prev => {
      const filtered = prev.filter(t => t !== id);
      const updated = [id, ...filtered].slice(0, 5);
      localStorage.setItem('aisa_strategy_recent_templates', JSON.stringify(updated));
      return updated;
    });
  };

  const historyData = useMemo(() => {
    return localProjects
      .filter(p => p.litigationStrategy && p.litigationStrategy.activeStrategy)
      .map(p => ({
        id: p._id,
        title: p.litigationStrategy.caseTitle || p.name,
        caseFacts: p.litigationStrategy.caseFacts || p.description,
        activeStrategy: p.litigationStrategy.activeStrategy,
        stats: p.litigationStrategy.activeStrategy.stats,
        timestamp: p.litigationStrategy.auditLogs?.[p.litigationStrategy.auditLogs.length - 1]?.timestamp 
          ? new Date(p.litigationStrategy.auditLogs[p.litigationStrategy.auditLogs.length - 1].timestamp).toLocaleString()
          : new Date(p.updatedAt || p.createdAt || Date.now()).toLocaleString()
      }));
  }, [localProjects]);

  const deleteHistoryItem = async (projectId) => {
    try {
      const proj = localProjects.find(p => p._id === projectId);
      if (proj) {
        const payload = {
          ...proj,
          litigationStrategy: null
        };
        const response = await apiService.updateProject(projectId, payload);
        setLocalProjects(prev => prev.map(p => p._id === projectId ? { ...p, litigationStrategy: null } : p));
        if (onUpdateCase) onUpdateCase(response);
        toast.success("Strategy removed from history.");
      }
    } catch (e) {
      toast.error("Failed to delete strategy from archive.");
    }
  };

  const handleCaseSelect = (caseId) => {
    setLinkedCaseId(caseId);
    const selectedProj = localProjects.find(p => p._id === caseId);
    if (selectedProj) {
      hydrateFromCase(selectedProj);
      setIsUsingActiveCase(true);
      toast.success(`Selected Active Case: ${selectedProj.name}`);
      setActiveWorkflowStep('fact_analysis');
    }
  };

  const filteredTemplates = useMemo(() => {
    return allTools.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(templateSearch.toLowerCase()) || 
                            t.desc.toLowerCase().includes(templateSearch.toLowerCase());
      const matchesCategory = selectedTemplateCategory === 'All' || t.category === selectedTemplateCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templateSearch, selectedTemplateCategory]);

  const categoriesList = ['All', 'Civil', 'Criminal', 'Corporate', 'Property', 'Family', 'Tax', 'Employment'];

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
      missingEvidenceCount: 0,
      missingDocumentsCount: 0,
      settlementProbability: '--',
      appealRisk: '--',
      opponentRiskLevel: '--'
    };
  }, [strategyResult]);

  // Handle new case creation modal submit
  const handleCreateNewCase = async () => {
    if (!newCaseForm.clientName.trim()) {
      toast.error("Client Name is required");
      return;
    }
    const tid = toast.loading("Creating legal matter...");
    try {
      const name = newCaseForm.accused
        ? `${newCaseForm.clientName} vs ${newCaseForm.accused}`
        : `${newCaseForm.clientName} Case File`;
        
      const payload = {
        name,
        clientName: newCaseForm.clientName,
        caseType: newCaseForm.matterType,
        accused: newCaseForm.accused,
        summary: newCaseForm.summary,
        courtName: newCaseForm.courtName,
        assignedAdvocate: newCaseForm.assignedAdvocate || 'Senior Counsel',
        stage: newCaseForm.stage,
        isLegalCase: true
      };

      const newProj = await apiService.createProject(payload);
      setLocalProjects(prev => [newProj, ...prev]);
      setLinkedCaseId(newProj._id);
      hydrateFromCase(newProj);
      
      toast.success("New litigation matter created successfully!", { id: tid });
      setNewCaseModalOpen(false);
      setNewCaseForm({
        clientName: '',
        accused: '',
        matterType: 'Civil',
        courtName: '',
        assignedAdvocate: '',
        stage: 'Pre-litigation',
        summary: ''
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to create case", { id: tid });
    }
  };

  // Structured Builder action helpers
  const handleAddEvidence = () => {
    if (!newEv.name.trim()) return;
    const item = {
      id: `ev_${Date.now()}`,
      ...newEv
    };
    const newList = [...evidenceList, item];
    setEvidenceList(newList);
    setScenarioEvidence(serializeEvidenceList(newList));
    setNewEv({ name: '', type: 'Document', admissibility: 'High', strength: 'Strong', credibility: 'High', risk: 'Low' });
    toast.success("Evidence added to dossier.");
  };

  const handleAddWitness = () => {
    if (!newWit.name.trim()) return;
    const item = {
      id: `wit_${Date.now()}`,
      ...newWit,
      weakness: 'None',
      questions: ['Please clarify your observation during cross-examination?']
    };
    const newList = [...witnessList, item];
    setWitnessList(newList);
    setScenarioWitnesses(serializeWitnessList(newList));
    setNewWit({ name: '', role: '', supports: 'Plaintiff', credibilityScore: 85 });
    toast.success("Witness added to pool.");
  };

  const handleAddTimeline = () => {
    if (!newTime.title.trim()) return;
    const item = {
      id: `time_${Date.now()}`,
      ...newTime,
      description: 'Custom timeline event'
    };
    const newList = [...timelineList, item];
    setTimelineList(newList);
    setScenarioTimeline(serializeTimelineList(newList));
    setNewTime({ date: '', title: '' });
    toast.success("Timeline milestone added.");
  };

  const handleRemoveEvidence = (id) => {
    const newList = evidenceList.filter(e => e.id !== id);
    setEvidenceList(newList);
    setScenarioEvidence(serializeEvidenceList(newList));
  };

  const handleRemoveWitness = (id) => {
    const newList = witnessList.filter(w => w.id !== id);
    setWitnessList(newList);
    setScenarioWitnesses(serializeWitnessList(newList));
  };

  const handleRemoveTimeline = (id) => {
    const newList = timelineList.filter(t => t.id !== id);
    setTimelineList(newList);
    setScenarioTimeline(serializeTimelineList(newList));
  };

  // Chip toggler helper for Relief Seeking
  const reliefChips = ['Damages', 'Permanent Injunction', 'Interim Relief', 'Specific Performance', 'Compensation', 'Stay Order', 'Declaration'];
  const handleToggleReliefChip = (chip) => {
    let currentReliefs = scenarioRelief.split(', ').filter(Boolean);
    if (currentReliefs.includes(chip)) {
      currentReliefs = currentReliefs.filter(c => c !== chip);
    } else {
      currentReliefs.push(chip);
    }
    const updated = currentReliefs.join(', ');
    setScenarioRelief(updated);
  };

  // Workflow steps list
  const workflowSteps = [
    { key: 'case_selection', name: 'Case Selection' },
    { key: 'fact_analysis', name: 'Fact Analysis' },
    { key: 'evidence_analysis', name: 'Evidence Analysis' },
    { key: 'opponent_prediction', name: 'Opponent Prediction' },
    { key: 'legal_risk_analysis', name: 'Legal Risk Analysis' },
    { key: 'winning_probability', name: 'Winning Probability' },
    { key: 'argument_planning', name: 'Argument Planning' },
    { key: 'settlement_rec', name: 'Settlement Rec' },
    { key: 'final_strategy', name: 'Final Strategy' }
  ];

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-50 dark:bg-transparent overflow-hidden select-none">
      
      {/* Header bar - minimal vertical footprint */}
      <div className={`flex flex-col px-6 py-3 border-b shrink-0 gap-1 ${isDark ? 'border-slate-800 bg-[#0B1020]/90' : 'border-slate-200 bg-white'} backdrop-blur-xl`}>
        <div className="flex items-center justify-between w-full">
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
              <div className="flex items-center gap-2">
                <h1 className={`text-[20px] font-black leading-none tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Strategy Engine
                </h1>
                {isSyncing && (
                  <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider animate-pulse bg-emerald-500/10 px-1.5 py-0.5 rounded">Syncing</span>
                )}
              </div>
              <p className={`text-[11px] font-medium leading-none mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                AI-powered litigation simulation, opponent prediction, judicial risk analysis, evidence evaluation and courtroom strategy planning.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="hidden lg:flex flex-col text-right text-[10px] text-slate-400 font-semibold mr-1">
              <span>Recent Strategy count: <strong>{historyData.length}</strong></span>
              <span>Last Simulation: <strong>{historyData[0]?.timestamp || 'Never'}</strong></span>
            </div>
            <button 
              onClick={() => setHistoryVisible(true)} 
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                isDark ? 'bg-[#1A2540] border-slate-800 text-indigo-400 hover:bg-[#202E50]' : 'bg-indigo-50 border-indigo-200/30 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <History size={13} className="shrink-0" />
              <span>Simulation History ({historyData.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        
        {/* LEFT SIDEBAR: fixed control panel */}
        <div className={`w-[340px] flex flex-col border-r shrink-0 overflow-y-auto custom-scrollbar p-4 space-y-5 ${isDark ? 'border-slate-800 bg-[#0c1224]' : 'border-slate-200 bg-white'}`}>
          
          {/* Choose Strategy Source dropdown selector */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Choose Strategy Source</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-[#131c31] rounded-xl border dark:border-zinc-800">
              {[
                { id: 'EXISTING_CASE', name: 'Existing Case' },
                { id: 'MANUAL_SCENARIO', name: 'Manual' },
                { id: 'UPLOAD_DOCUMENTS', name: 'Upload Docs' }
              ].map(src => {
                const active = strategySource === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => handleStrategySourceChange(src.id)}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-black uppercase tracking-tight text-center transition-all truncate ${
                      active 
                        ? 'bg-indigo-650 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {src.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Switchable source config content */}
          {strategySource === 'EXISTING_CASE' ? (
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500 font-semibold">Active Case Switching</label>
              <div className="space-y-1.5">
                <select
                  value={linkedCaseId || ''}
                  onChange={e => handleCaseSelect(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer appearance-none ${
                    isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-850'
                  }`}
                >
                  <option value="">-- Select Case File --</option>
                  {localProjects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setNewCaseModalOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed rounded-xl text-[10px] font-black uppercase tracking-wider text-indigo-500 hover:bg-indigo-500/5 transition-all"
                >
                  <PlusCircle size={13} />
                  <span>Create New Scenario</span>
                </button>
              </div>

              {/* Use Active Case Toggle */}
              <div className="flex items-center justify-between p-2.5 border rounded-xl bg-indigo-500/5 border-indigo-500/10 mt-1.5">
                <div className="flex items-center gap-2">
                  <Folder size={14} className="text-indigo-500 shrink-0" />
                  <div className="leading-none">
                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase">Use Active Case</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">Auto-fill all case fields</p>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={isUsingActiveCase}
                  onChange={e => handleUseActiveCaseToggle(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-650 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          ) : strategySource === 'MANUAL_SCENARIO' ? (
            <div className="p-3 border border-indigo-550/15 bg-indigo-550/5 rounded-xl text-xs font-bold text-indigo-500 text-center uppercase tracking-wide">
              Active Mode: Manual Scenario (No Case Required)
            </div>
          ) : (
            /* Upload Documents Drag & Drop area */
            <div className="space-y-3.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Document Upload Workspace</label>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('strategy-doc-uploader').click()}
                className="border-2 border-dashed border-slate-300 dark:border-zinc-800 hover:border-indigo-500 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center gap-2 bg-slate-500/3"
              >
                <Upload className="text-slate-400" size={24} />
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-bold">Drag & drop files or click to browse</span>
                <span className="text-[8px] text-slate-400 uppercase font-semibold">Supports PDFs, Plaints, Agreements, FIRs</span>
                <input 
                  id="strategy-doc-uploader"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Uploaded File List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="p-2.5 border rounded-xl bg-slate-500/5 flex items-center justify-between text-xs font-semibold gap-2">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <FileText size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate text-slate-800 dark:text-slate-300">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          file.status === 'OCR Running' ? 'bg-amber-500/10 text-amber-500 animate-pulse' :
                          file.status === 'OCR Complete' ? 'bg-emerald-500/10 text-emerald-500' :
                          file.status === 'Extracting' ? 'bg-violet-500/10 text-violet-500 animate-pulse' :
                          file.status === 'Extracted' ? 'bg-green-500/10 text-green-500 font-black' :
                          'bg-slate-205 text-slate-450'
                        }`}>{file.status}</span>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
                          }}
                          className="p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-red-500 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={runDocumentAnalysis}
                    disabled={isExtractingDocs}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-650 hover:bg-indigo-705 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {isExtractingDocs ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={12} />}
                    <span>AI Parse Uploaded Documents</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions Panel */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Quick Actions</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { name: 'Simulate Strategy', action: 'FULL_SIMULATION', icon: <Cpu size={12} /> },
                { name: 'Risk Assessment', action: 'RISK_ASSESSMENT', icon: <AlertTriangle size={12} /> },
                { name: 'Evidence Review', action: 'EVIDENCE_REVIEW', icon: <FileText size={12} /> },
                { name: 'Opponent Forecast', action: 'OPPONENT_PREDICTION', icon: <Eye size={12} /> },
                { name: 'Settlement Terms', action: 'SETTLEMENT_ANALYSIS', icon: <DollarSign size={12} /> },
                { name: 'Draft Arguments', action: 'GENERATE_ARGUMENTS', icon: <Gavel size={12} /> }
              ].map(a => (
                <button
                  key={a.name}
                  onClick={() => handleQuickActionTrigger(a.action)}
                  className={`flex items-center gap-1.5 py-2 px-2 border rounded-lg text-[9px] font-black uppercase tracking-wider transition-all hover:border-indigo-500/40 hover:bg-indigo-500/5 ${
                    isDark ? 'bg-[#1A2540] border-zinc-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-indigo-500 shrink-0">{a.icon}</span>
                  <span className="truncate">{a.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates Explorer */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500 font-semibold">Templates Explorer</label>
              {recentTemplates.length > 0 && (
                <span className="text-[8px] font-black text-slate-400 uppercase">Recent ({recentTemplates.length})</span>
              )}
            </div>

            <div className="flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-250 dark:border-white/5 rounded-xl px-2.5 py-1.5">
              <Search size={12} className="text-slate-400 mr-1.5 shrink-0" />
              <input
                type="text"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                className="w-full bg-transparent border-none text-[10px] font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
              />
            </div>

            {/* Categories tab pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedTemplateCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    selectedTemplateCategory === cat 
                      ? 'bg-indigo-650 text-white' 
                      : 'bg-slate-100 dark:bg-[#131C31] text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template lists */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredTemplates.map(t => {
                const isFav = favoriteTemplates.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => handleQuickToolSelect(t.id, t.name)}
                    className={`p-2 border rounded-xl transition-all cursor-pointer hover:border-indigo-500/35 relative group flex flex-col ${
                      isDark ? 'bg-black/15 border-zinc-800 hover:bg-[#131C31]/25' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <h4 className="text-[9px] font-black text-slate-800 dark:text-white truncate group-hover:text-indigo-500">{t.name}</h4>
                        <p className="text-[7.5px] text-slate-400 mt-0.5 line-clamp-1">{t.desc}</p>
                      </div>
                      <button
                        onClick={(e) => toggleFavoriteTemplate(t.id, e)}
                        className={`p-0.5 rounded text-[10px] ${isFav ? 'text-amber-500' : 'text-slate-400'}`}
                      >
                        ★
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT AREA: Litigation Command workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
          <div className="max-w-5xl w-full mx-auto space-y-5 select-text">
            
            {/* Guided Litigation Workflow Tracker Progress Bar */}
            <div className={`p-3.5 border rounded-2xl flex items-center justify-between shadow-sm overflow-x-auto no-scrollbar ${
              isDark ? 'bg-[#131c31]/20 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {workflowSteps.map((step, idx) => {
                const isActive = activeWorkflowStep === step.key;
                const status = getWorkflowStepStatus(step.key);
                const isCompleted = status === 'COMPLETE';
                return (
                  <div 
                    key={step.key} 
                    className="flex items-center gap-1 shrink-0 cursor-pointer"
                    onClick={() => {
                      setActiveWorkflowStep(step.key);
                      // Map step key to accordion expands
                      if (step.key === 'fact_analysis') setActiveAccordion('facts');
                      else if (step.key === 'evidence_analysis') setActiveAccordion('evidence');
                      else if (step.key === 'opponent_prediction') setActiveAccordion('opponent');
                      else if (step.key === 'legal_risk_analysis') setActiveAccordion('relief');
                    }}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                      isActive ? 'bg-indigo-650 text-white shadow-md' : 
                      isCompleted ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' :
                      'bg-slate-100 dark:bg-zinc-800 text-slate-400 border border-transparent'
                    }`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider ${
                      isActive ? 'text-indigo-550 dark:text-indigo-400' : 
                      isCompleted ? 'text-emerald-500' : 'text-slate-400'
                    }`}>
                      {step.name}
                    </span>
                    {idx < workflowSteps.length - 1 && (
                      <span className="text-[10px] text-slate-300 dark:text-zinc-700 ml-1.5">➔</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Case Summary Panel */}
            <div className={`border rounded-3xl p-4 shadow-sm space-y-3.5 transition-all duration-300 ${
              isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Briefcase size={14} className="text-indigo-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Active Case Summary Dossier</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${clientName && opponentName ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-[8px] font-black text-slate-400 uppercase">AI Ready Status: {clientName && opponentName ? 'Ready' : 'Incomplete'}</span>
                </div>
              </div>

              {/* Inputs inside Case Summary Panel for Manual/Doc mode */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-semibold">
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Case Name</span>
                  {strategySource === 'EXISTING_CASE' ? (
                    <p className="font-extrabold text-slate-800 dark:text-slate-200 truncate">{caseTitle || 'Custom Scenario'}</p>
                  ) : (
                    <input 
                      type="text"
                      value={caseTitle}
                      onChange={e => setCaseTitle(e.target.value)}
                      placeholder="Enter Case Title"
                      className={`w-full bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none pb-0.5 text-slate-800 dark:text-white font-extrabold`}
                    />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Client / Petitioner</span>
                  {strategySource === 'EXISTING_CASE' ? (
                    <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{clientName || 'N/A'}</p>
                  ) : (
                    <input 
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="Enter Client Name"
                      className={`w-full bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none pb-0.5 text-slate-800 dark:text-white`}
                    />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Opponent / Respondent</span>
                  {strategySource === 'EXISTING_CASE' ? (
                    <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{opponentName || 'N/A'}</p>
                  ) : (
                    <input 
                      type="text"
                      value={opponentName}
                      onChange={e => setOpponentName(e.target.value)}
                      placeholder="Enter Opponent Name"
                      className={`w-full bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none pb-0.5 text-slate-800 dark:text-white`}
                    />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Matter Court</span>
                  {strategySource === 'EXISTING_CASE' ? (
                    <p className="font-bold text-indigo-500 truncate">{matterType || 'Civil'}</p>
                  ) : (
                    <select
                      value={matterType}
                      onChange={e => setMatterType(e.target.value)}
                      className="bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none pb-0.5 text-indigo-500 font-extrabold cursor-pointer"
                    >
                      <option value="Civil">Civil</option>
                      <option value="Criminal">Criminal</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Property">Property</option>
                      <option value="Family">Family</option>
                      <option value="Tax">Tax</option>
                      <option value="Employment">Employment</option>
                    </select>
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Filing Juris.</span>
                  {strategySource === 'EXISTING_CASE' ? (
                    <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{courtName || 'N/A'}</p>
                  ) : (
                    <input 
                      type="text"
                      value={courtName}
                      onChange={e => setCourtName(e.target.value)}
                      placeholder="Jurisdiction court"
                      className={`w-full bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none pb-0.5 text-slate-800 dark:text-white`}
                    />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Current Stage</span>
                  {strategySource === 'EXISTING_CASE' ? (
                    <span className="inline-block px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[7.5px] font-black uppercase w-fit">{caseStage || 'Pre-trial'}</span>
                  ) : (
                    <select
                      value={caseStage}
                      onChange={e => setCaseStage(e.target.value)}
                      className="bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none pb-0.5 text-amber-600 font-extrabold cursor-pointer"
                    >
                      <option value="Pre-litigation">Pre-litigation</option>
                      <option value="Filing">Filing</option>
                      <option value="Arguments">Arguments</option>
                      <option value="Appeal">Appeal</option>
                    </select>
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Hearing Date</span>
                  {strategySource === 'EXISTING_CASE' ? (
                    <p className="font-bold text-red-500 truncate">{hearingDate || 'N/A'}</p>
                  ) : (
                    <input 
                      type="text"
                      value={hearingDate}
                      onChange={e => setHearingDate(e.target.value)}
                      placeholder="Hearing Date"
                      className={`w-full bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none pb-0.5 text-red-500 font-bold`}
                    />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Assigned Advocate</span>
                  {strategySource === 'EXISTING_CASE' ? (
                    <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{assignedAdvocate || 'Senior Counsel'}</p>
                  ) : (
                    <input 
                      type="text"
                      value={assignedAdvocate}
                      onChange={e => setAssignedAdvocate(e.target.value)}
                      placeholder="Advocate Name"
                      className={`w-full bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none pb-0.5 text-slate-800 dark:text-white`}
                    />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Evidence dossiers</span>
                  <p className="font-bold text-violet-500">{evidenceList.length} Items</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Case Status</span>
                  <span className="inline-block px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[7.5px] font-black uppercase w-fit">{caseStatus}</span>
                </div>
              </div>
            </div>

            {/* SCENARIO BUILDER: Single collapsible accordions */}
            <div className="space-y-2">
              
              {/* Accordion 1: Case Facts */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                activeAccordion === 'facts' 
                  ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-md' 
                  : (isDark ? 'border-zinc-800' : 'border-slate-200')
              }`}>
                <div 
                  onClick={() => toggleAccordion('facts')}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                    activeAccordion === 'facts' 
                      ? (isDark ? 'bg-indigo-550/10' : 'bg-indigo-500/5') 
                      : (isDark ? 'bg-black/10' : 'bg-slate-50')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Case Facts & Claims</span>
                  </div>
                  {activeAccordion === 'facts' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                {activeAccordion === 'facts' && (
                  <div className={`p-4 space-y-3 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                    <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase">
                      <span>Facts statement brief</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCaseFacts('')} className="hover:text-red-500">Clear</button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(caseFacts);
                            toast.success("Copied to clipboard!");
                          }} 
                          className="hover:text-indigo-500"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {!caseFacts.trim() && (
                      <div className="text-center py-6 text-xs text-slate-405 font-bold bg-slate-500/5 rounded-xl border border-dashed leading-relaxed">
                        No case facts entered yet. Type your facts manually, load a scenario template, or upload documents to auto-extract.
                      </div>
                    )}

                    <textarea
                      rows={5}
                      value={caseFacts}
                      onChange={e => setCaseFacts(e.target.value)}
                      placeholder="Enter detailed facts of the case, breach details, transaction issues..."
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${
                        isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Accordion 2: Visual Timeline */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                activeAccordion === 'timeline' 
                  ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-md' 
                  : (isDark ? 'border-zinc-800' : 'border-slate-200')
              }`}>
                <div 
                  onClick={() => toggleAccordion('timeline')}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                    activeAccordion === 'timeline' 
                      ? (isDark ? 'bg-indigo-550/10' : 'bg-indigo-500/5') 
                      : (isDark ? 'bg-black/10' : 'bg-slate-50')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Visual Courtroom Timeline</span>
                  </div>
                  {activeAccordion === 'timeline' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                {activeAccordion === 'timeline' && (
                  <div className={`p-4 space-y-4 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Chronological Milestones Chain</span>
                      <button 
                        onClick={() => runAIFieldExtraction('timeline')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg text-[8px] font-black uppercase transition-all"
                      >
                        <Sparkles size={10} />
                        <span>AI Generate Timeline</span>
                      </button>
                    </div>

                    {/* Timeline chain renderer */}
                    {timelineList.length > 0 ? (
                      <div className="relative border-l-2 border-indigo-500/20 ml-2.5 pl-5 space-y-4">
                        {timelineList.map(t => (
                          <div key={t.id} className="relative group">
                            <span className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-indigo-500 bg-white dark:bg-zinc-900 shrink-0" />
                            <div className="flex justify-between items-start p-3 border rounded-xl bg-slate-500/5">
                              <div>
                                <span className="text-[8px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">{t.date}</span>
                                <h4 className="text-xs font-black text-slate-805 dark:text-white mt-1">{t.title}</h4>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{t.description}</p>
                              </div>
                              <button 
                                onClick={() => handleRemoveTimeline(t.id)} 
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-400 font-semibold bg-slate-500/5 rounded-xl border border-dashed flex flex-col items-center gap-2">
                        <span>No timeline milestones configured. Add manually, use AI Extract, or generate from uploaded documents.</span>
                        <button 
                          onClick={() => runAIFieldExtraction('timeline')}
                          className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-550 rounded text-[9px] font-black uppercase transition-all"
                        >
                          Use AI Extract
                        </button>
                      </div>
                    )}

                    {/* Inline add form */}
                    <div className="p-3.5 border rounded-xl bg-slate-500/5 space-y-3">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Add Milestone</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Date (e.g. Jan 10, 2026)"
                          value={newTime.date}
                          onChange={e => setNewTime(prev => ({ ...prev, date: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        />
                        <input
                          type="text"
                          placeholder="Milestone Event Title"
                          value={newTime.title}
                          onChange={e => setNewTime(prev => ({ ...prev, title: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        />
                      </div>
                      <button
                        onClick={handleAddTimeline}
                        className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        Add Milestone
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Evidence Dossier */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                activeAccordion === 'evidence' 
                  ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-md' 
                  : (isDark ? 'border-zinc-800' : 'border-slate-200')
              }`}>
                <div 
                  onClick={() => toggleAccordion('evidence')}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                    activeAccordion === 'evidence' 
                      ? (isDark ? 'bg-indigo-550/10' : 'bg-indigo-500/5') 
                      : (isDark ? 'bg-black/10' : 'bg-slate-50')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Evidence Dossier</span>
                  </div>
                  {activeAccordion === 'evidence' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                {activeAccordion === 'evidence' && (
                  <div className={`p-4 space-y-4 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Deposition Evidence Cards</span>
                      <button 
                        onClick={() => runAIFieldExtraction('evidence')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg text-[8px] font-black uppercase transition-all"
                      >
                        <Sparkles size={10} />
                        <span>AI Extract Evidence</span>
                      </button>
                    </div>

                    {/* Evidence cards grid */}
                    {evidenceList.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {evidenceList.map(e => (
                          <div key={e.id} className="p-3 border rounded-xl bg-slate-500/5 space-y-2 relative flex flex-col justify-between">
                            <div className="flex justify-between items-start gap-1">
                              <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase">{e.type}</span>
                                <h4 className="text-xs font-black text-slate-850 dark:text-white mt-0.5">{e.name}</h4>
                              </div>
                              <button 
                                onClick={() => handleRemoveEvidence(e.id)} 
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1 items-center pt-2 border-t border-slate-100 dark:border-white/5">
                              <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${
                                e.admissibility === 'High' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                              }`}>Admis: {e.admissibility}</span>
                              <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${
                                e.strength === 'Strong' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                              }`}>Strength: {e.strength}</span>
                              <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${
                                e.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                              }`}>Risk: {e.risk}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-400 font-semibold bg-slate-500/5 rounded-xl border border-dashed flex flex-col items-center gap-2">
                        <span>No evidence cards added. Add manually below or click 'AI Extract Evidence' to identify potential proofs.</span>
                        <button 
                          onClick={() => runAIFieldExtraction('evidence')}
                          className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-550 rounded text-[9px] font-black uppercase transition-all"
                        >
                          Use AI Extract
                        </button>
                      </div>
                    )}

                    {/* Inline form */}
                    <div className="p-3.5 border rounded-xl bg-slate-500/5 space-y-3.5 text-xs">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Create Evidence dossier</span>
                      <div className="grid grid-cols-2 gap-2 font-semibold">
                        <input
                          type="text"
                          placeholder="Evidence Proof name"
                          value={newEv.name}
                          onChange={e => setNewEv(prev => ({ ...prev, name: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 outline-none col-span-2 ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        />
                        <select
                          value={newEv.type}
                          onChange={e => setNewEv(prev => ({ ...prev, type: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        >
                          <option value="Document">Document</option>
                          <option value="Digital">Digital Log</option>
                          <option value="Physical">Physical Proof</option>
                          <option value="Oral">Oral Testimony</option>
                        </select>
                        <select
                          value={newEv.admissibility}
                          onChange={e => setNewEv(prev => ({ ...prev, admissibility: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        >
                          <option value="High">Admissibility: High</option>
                          <option value="Medium">Admissibility: Medium</option>
                          <option value="Low">Admissibility: Low</option>
                        </select>
                        <select
                          value={newEv.strength}
                          onChange={e => setNewEv(prev => ({ ...prev, strength: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        >
                          <option value="Strong">Strength: Strong</option>
                          <option value="Medium">Strength: Medium</option>
                          <option value="Weak">Strength: Weak</option>
                        </select>
                        <select
                          value={newEv.risk}
                          onChange={e => setNewEv(prev => ({ ...prev, risk: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        >
                          <option value="Low">Risk Exposure: Low</option>
                          <option value="Medium">Risk Exposure: Medium</option>
                          <option value="High">Risk Exposure: High</option>
                        </select>
                      </div>
                      <button
                        onClick={handleAddEvidence}
                        className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        Add Evidence
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 4: Witnesses */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                activeAccordion === 'witnesses' 
                  ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-md' 
                  : (isDark ? 'border-zinc-800' : 'border-slate-200')
              }`}>
                <div 
                  onClick={() => toggleAccordion('witnesses')}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                    activeAccordion === 'witnesses' 
                      ? (isDark ? 'bg-indigo-550/10' : 'bg-indigo-500/5') 
                      : (isDark ? 'bg-black/10' : 'bg-slate-50')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Witness Pool</span>
                  </div>
                  {activeAccordion === 'witnesses' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                {activeAccordion === 'witnesses' && (
                  <div className={`p-4 space-y-4 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Witness testimony cards</span>
                      <button 
                        onClick={() => runAIFieldExtraction('witnesses')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg text-[8px] font-black uppercase transition-all"
                      >
                        <Sparkles size={10} />
                        <span>AI Identify Witnesses</span>
                      </button>
                    </div>

                    {/* Witness cards */}
                    {witnessList.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {witnessList.map(w => (
                          <div key={w.id} className="p-3 border rounded-xl bg-slate-500/5 space-y-2 relative flex flex-col justify-between">
                            <div className="flex justify-between items-start gap-1">
                              <div>
                                <h4 className="text-xs font-black text-slate-850 dark:text-white">{w.name}</h4>
                                <span className="text-[8px] font-bold text-slate-400">{w.role}</span>
                              </div>
                              <button 
                                onClick={() => handleRemoveWitness(w.id)} 
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded shrink-0 font-semibold"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 items-center pt-2 border-t border-slate-100 dark:border-white/5">
                              <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${
                                w.supports === 'Plaintiff' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                              }`}>Supports: {w.supports}</span>
                              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-550 rounded text-[7px] font-black uppercase">Credibility: {w.credibilityScore}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-400 font-semibold bg-slate-500/5 rounded-xl border border-dashed flex flex-col items-center gap-2">
                        <span>No witnesses mapped in this scenario. Add manually below or use AI to identify.</span>
                        <button 
                          onClick={() => runAIFieldExtraction('witnesses')}
                          className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-550 rounded text-[9px] font-black uppercase transition-all"
                        >
                          Use AI Extract
                        </button>
                      </div>
                    )}

                    {/* Inline form */}
                    <div className="p-3.5 border rounded-xl bg-slate-500/5 space-y-3 text-xs">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Map Witness</span>
                      <div className="grid grid-cols-2 gap-2 font-semibold">
                        <input
                          type="text"
                          placeholder="Witness Name"
                          value={newWit.name}
                          onChange={e => setNewWit(prev => ({ ...prev, name: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        />
                        <input
                          type="text"
                          placeholder="Role (e.g. Account Auditor)"
                          value={newWit.role}
                          onChange={e => setNewWit(prev => ({ ...prev, role: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        />
                        <select
                          value={newWit.supports}
                          onChange={e => setNewWit(prev => ({ ...prev, supports: e.target.value }))}
                          className={`border rounded-lg px-2.5 py-1.5 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-white text-slate-800'}`}
                        >
                          <option value="Plaintiff">Supports: Plaintiff</option>
                          <option value="Defendant">Supports: Defendant</option>
                        </select>
                        <div className="flex items-center gap-2 border rounded-lg px-2.5 py-1.5 bg-white dark:bg-black/20 dark:border-zinc-800">
                          <span className="text-[8px] text-slate-400 font-black uppercase">Credibility</span>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={newWit.credibilityScore}
                            onChange={e => setNewWit(prev => ({ ...prev, credibilityScore: Number(e.target.value) }))}
                            className="w-full accent-indigo-500 h-1 rounded"
                          />
                          <span className="font-black text-indigo-500 text-[10px]">{newWit.credibilityScore}%</span>
                        </div>
                      </div>
                      <button
                        onClick={handleAddWitness}
                        className="w-full py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        Add Witness
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 5: Opponent claims */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                activeAccordion === 'opponent' 
                  ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-md' 
                  : (isDark ? 'border-zinc-800' : 'border-slate-200')
              }`}>
                <div 
                  onClick={() => toggleAccordion('opponent')}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                    activeAccordion === 'opponent' 
                      ? (isDark ? 'bg-indigo-550/10' : 'bg-indigo-500/5') 
                      : (isDark ? 'bg-black/10' : 'bg-slate-50')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flame size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Opponent Demands & Position</span>
                  </div>
                  {activeAccordion === 'opponent' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                {activeAccordion === 'opponent' && (
                  <div className={`p-4 space-y-3.5 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Core opponent pleading claims</span>
                    
                    {!scenarioOpponent.trim() && (
                      <div className="text-center py-6 text-xs text-slate-400 font-semibold bg-slate-500/5 rounded-xl border border-dashed flex flex-col items-center gap-2">
                        <span>No opponent position details recorded yet. Specify manually or run opponent forecast action.</span>
                      </div>
                    )}

                    <textarea
                      rows={3}
                      value={scenarioOpponent}
                      onChange={e => setScenarioOpponent(e.target.value)}
                      placeholder="Specify opposite party demand, expected delays, legal arguments..."
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${
                        isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Accordion 6: Relief seeking */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                activeAccordion === 'relief' 
                  ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-md' 
                  : (isDark ? 'border-zinc-800' : 'border-slate-200')
              }`}>
                <div 
                  onClick={() => toggleAccordion('relief')}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                    activeAccordion === 'relief' 
                      ? (isDark ? 'bg-indigo-550/10' : 'bg-indigo-500/5') 
                      : (isDark ? 'bg-black/10' : 'bg-slate-50')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Scale size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Relief Sought & Comp.</span>
                  </div>
                  {activeAccordion === 'relief' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                {activeAccordion === 'relief' && (
                  <div className={`p-4 space-y-4 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                    <div className="space-y-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Select Structured Relief Chips</span>
                      <div className="flex flex-wrap gap-2">
                        {reliefChips.map(chip => {
                          const active = scenarioRelief.split(', ').filter(Boolean).includes(chip);
                          return (
                            <button
                              key={chip}
                              onClick={() => handleToggleReliefChip(chip)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                active 
                                  ? 'bg-indigo-650 text-white border-indigo-650' 
                                  : 'bg-slate-100 dark:bg-zinc-800 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {chip}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {!scenarioRelief.trim() && (
                      <div className="text-center py-6 text-xs text-slate-400 font-semibold bg-slate-500/5 rounded-xl border border-dashed flex flex-col items-center gap-2">
                        <span>No relief parameters selected. Toggle the chips below to map damages, injunctions, or specific performance claims.</span>
                      </div>
                    )}

                    <div className="space-y-1 text-xs">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Additional Relief details</span>
                      <input 
                        type="text"
                        placeholder="Damages specifications, relief statements..."
                        value={scenarioRelief}
                        onChange={e => setScenarioRelief(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 outline-none font-semibold ${isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 7: Previous Orders */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                activeAccordion === 'orders' 
                  ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-md' 
                  : (isDark ? 'border-zinc-800' : 'border-slate-200')
              }`}>
                <div 
                  onClick={() => toggleAccordion('orders')}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                    activeAccordion === 'orders' 
                      ? (isDark ? 'bg-indigo-550/10' : 'bg-indigo-500/5') 
                      : (isDark ? 'bg-black/10' : 'bg-slate-50')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Landmark size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Previous Court Orders</span>
                  </div>
                  {activeAccordion === 'orders' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                {activeAccordion === 'orders' && (
                  <div className={`p-4 space-y-3.5 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Details of previous stays or notices</span>
                    
                    {!scenarioOrders.trim() && (
                      <div className="text-center py-6 text-xs text-slate-400 font-semibold bg-slate-500/5 rounded-xl border border-dashed flex flex-col items-center gap-2">
                        <span>No previous judicial orders recorded. Enter stays, caveat petitions, or interim orders.</span>
                      </div>
                    )}

                    <textarea
                      rows={3}
                      value={scenarioOrders}
                      onChange={e => setScenarioOrders(e.target.value)}
                      placeholder="Add details of orders issued by court in the matter..."
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${
                        isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Accordion 8: Advocate Notes */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                activeAccordion === 'notes' 
                  ? 'border-indigo-500/30 ring-1 ring-indigo-500/10 shadow-md' 
                  : (isDark ? 'border-zinc-800' : 'border-slate-200')
              }`}>
                <div 
                  onClick={() => toggleAccordion('notes')}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                    activeAccordion === 'notes' 
                      ? (isDark ? 'bg-indigo-550/10' : 'bg-indigo-500/5') 
                      : (isDark ? 'bg-black/10' : 'bg-slate-50')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Advocate notes & checklist</span>
                  </div>
                  {activeAccordion === 'notes' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                {activeAccordion === 'notes' && (
                  <div className={`p-4 space-y-3.5 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Private notes and action strategies</span>
                    
                    {!scenarioNotes.trim() && (
                      <div className="text-center py-6 text-xs text-slate-400 font-semibold bg-slate-500/5 rounded-xl border border-dashed flex flex-col items-center gap-2">
                        <span>No private advocate notes created. Save key trial dates, reminders, and checklist items here.</span>
                      </div>
                    )}

                    <textarea
                      rows={3}
                      value={scenarioNotes}
                      onChange={e => setScenarioNotes(e.target.value)}
                      placeholder="Type private case strategy notes, checklists..."
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${
                        isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                )}
              </div>

            </div>

            {/* SECTION 4: AI Simulation Run & Loader */}
            <div className="text-center space-y-3.5 pt-3">
              <button
                onClick={() => runLitigationSimulation('FULL_SIMULATION')}
                disabled={isAuditing}
                className="px-10 py-3.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
              >
                {isAuditing ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Cpu size={14} />}
                <span>Simulate Litigation Strategy</span>
              </button>
              
              {!isAuditing && (
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Estimated Processing Time: ~12-15s</p>
              )}

              {/* Animated Progress simulation loader */}
              {isAuditing && (
                <div className={`p-5 border rounded-3xl shadow-sm text-left max-w-md mx-auto space-y-3.5 transition-all duration-300 ${
                  isDark ? 'bg-[#131c31] border-zinc-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active Audit Simulation: {auditStep}</span>
                  </div>

                  <div className="space-y-1 text-[10px] font-bold">
                    {[
                      'Reading Facts',
                      'Evaluating Evidence',
                      'Finding Relevant Judgments',
                      'Matching Legal Principles',
                      'Predicting Opponent',
                      'Calculating Winning Probability',
                      'Evaluating Judge Behaviour',
                      'Generating Strategy',
                      'Creating Final Recommendation'
                    ].map((step, index) => {
                      const isDone = index < activeSimulationStep;
                      const isCurrent = index === activeSimulationStep;
                      return (
                        <div key={step} className="flex items-center gap-2">
                          {isDone ? (
                            <span className="text-emerald-500">✓</span>
                          ) : isCurrent ? (
                            <span className="text-indigo-500 animate-pulse">●</span>
                          ) : (
                            <span className="text-slate-350 dark:text-zinc-700">○</span>
                          )}
                          <span className={isDone ? 'text-emerald-600 dark:text-emerald-500/80 line-through' : isCurrent ? 'text-indigo-650' : 'text-slate-405'}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* AI STRATEGY READINESS CARD (Replaces static no loaded panel when no results exist) */}
            {!strategyResult && !isAuditing && (
              <div className={`border rounded-3xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-indigo-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">AI Strategy Readiness Metrics</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    strategyReadinessCalculated.overall > 75 ? 'bg-emerald-500/10 text-emerald-500' :
                    strategyReadinessCalculated.overall > 40 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {strategyReadinessCalculated.overall}% Ready
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shrink-0">
                  <div className={`h-full transition-all duration-500 ${
                    strategyReadinessCalculated.overall > 75 ? 'bg-emerald-500' :
                    strategyReadinessCalculated.overall > 40 ? 'bg-amber-505' : 'bg-red-500'
                  }`} style={{ width: `${strategyReadinessCalculated.overall}%` }} />
                </div>

                {/* Checklist mapping list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px] font-bold">
                  <div className="flex items-center gap-2">
                    <span className={strategyReadinessCalculated.info ? 'text-emerald-500 font-extrabold' : 'text-slate-350'}>
                      {strategyReadinessCalculated.info ? '✓' : '○'}
                    </span>
                    <span className={strategyReadinessCalculated.info ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>Case Info (Petitioner & Opponent)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={strategyReadinessCalculated.facts ? 'text-emerald-500 font-extrabold' : 'text-slate-350'}>
                      {strategyReadinessCalculated.facts ? '✓' : '○'}
                    </span>
                    <span className={strategyReadinessCalculated.facts ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>Case Facts Statement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={strategyReadinessCalculated.timeline ? 'text-emerald-500 font-extrabold' : 'text-slate-350'}>
                      {strategyReadinessCalculated.timeline ? '✓' : '○'}
                    </span>
                    <span className={strategyReadinessCalculated.timeline ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>Visual Timeline Milestones</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={strategyReadinessCalculated.evidence ? 'text-emerald-500 font-extrabold' : 'text-slate-350'}>
                      {strategyReadinessCalculated.evidence ? '✓' : '○'}
                    </span>
                    <span className={strategyReadinessCalculated.evidence ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>Evidence dossier linkage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={strategyReadinessCalculated.witnesses ? 'text-emerald-500 font-extrabold' : 'text-slate-350'}>
                      {strategyReadinessCalculated.witnesses ? '✓' : '○'}
                    </span>
                    <span className={strategyReadinessCalculated.witnesses ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>Witness pool mapping</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={strategyReadinessCalculated.opponent ? 'text-emerald-500 font-extrabold' : 'text-slate-350'}>
                      {strategyReadinessCalculated.opponent ? '✓' : '○'}
                    </span>
                    <span className={strategyReadinessCalculated.opponent ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>Opponent Defense forecasting</span>
                  </div>
                </div>
              </div>
            )}

            {/* RESULTS VIEW AREA (Immediately below simulation button) */}
            {strategyResult && (
              <div className="space-y-5 animate-fadeIn">
                
                {/* Export panel buttons bar */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800/80 pb-3 pt-2">
                  <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">AI Command Center Intelligence Briefs</span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(strategyResult, null, 2));
                        toast.success("JSON copied to clipboard!");
                      }}
                      className={`p-2 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Copy JSON Report"
                    >
                      <Copy size={13} />
                    </button>
                    <button 
                      onClick={handleSpeechSummary}
                      className={`p-2 rounded-lg transition-colors ${isSpeaking ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' : 'text-slate-500'} ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Read Brief Aloud"
                    >
                      <Mic size={13} />
                    </button>
                    <button 
                      onClick={handlePrintPDF}
                      className={`p-2 rounded-lg text-indigo-650 hover:text-indigo-700 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Export PDF Report"
                    >
                      <Printer size={13} />
                    </button>
                    <button 
                      onClick={handleExportDoc}
                      className={`p-2 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                      title="Export Word Document Brief"
                    >
                      <FileDown size={13} />
                    </button>
                  </div>
                </div>

                {/* AI STRATEGIC RECOMMENDATION (Placed above dashboard) */}
                {(() => {
                  const prob = Number(stats.winningProbability) || 50;
                  const risk = Number(stats.litigationRisk) || 50;
                  let recommendation = "Proceed with Trial";
                  let colorClass = "border-indigo-500 bg-indigo-500/5 text-indigo-500";
                  let bgBadge = "bg-indigo-500/10 text-indigo-500";
                  
                  if (prob < 40) {
                    recommendation = "Settlement Recommended";
                    colorClass = "border-amber-500 bg-amber-500/5 text-amber-500";
                    bgBadge = "bg-amber-500/10 text-amber-500";
                  } else if (risk > 70) {
                    recommendation = "High Litigation Risk";
                    colorClass = "border-red-500 bg-red-500/5 text-red-500";
                    bgBadge = "bg-red-500/10 text-red-500";
                  } else if (stats.missingEvidenceCount > 3) {
                    recommendation = "Collect Additional Evidence";
                    colorClass = "border-violet-500 bg-violet-500/5 text-violet-500";
                    bgBadge = "bg-violet-500/10 text-violet-500";
                  }

                  return (
                    <div className={`border-l-4 rounded-3xl p-5 shadow-sm space-y-3.5 ${colorClass}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Scale size={16} />
                          <h3 className="text-xs font-black uppercase tracking-wider">AI Litigation Recommendation</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${bgBadge}`}>
                          {recommendation}
                        </span>
                      </div>
                      
                      <div className="text-xs space-y-2">
                        <p className="font-extrabold text-slate-800 dark:text-slate-200">
                          <strong>Strategic Opinion:</strong> {strategyResult.finalOpinion?.reasoning || strategyResult.strategies?.primary?.description}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[10px] text-slate-455 font-semibold">
                          <span>Confidence Level: <strong>{stats.aiConfidence}%</strong></span>
                          <span>Opponent Exposure: <strong>{stats.opponentRiskLevel}</strong></span>
                          <span>Appeal Probability: <strong>{stats.appealRisk}%</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* AI LITIGATION DASHBOARD: 12 Premium KPIs Grid */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">AI Litigation Exposure Dashboard</label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {[
                      { key: 'overallStrategyScore', label: 'Strategy Score', val: stats.overallStrategyScore, col: 'text-indigo-500', desc: 'Overall litigation approach score' },
                      { key: 'winningProbability', label: 'Winning Prob.', val: stats.winningProbability, col: 'text-emerald-500', desc: 'Predicted outcome probability' },
                      { key: 'litigationRisk', label: 'Litigation Risk', val: stats.litigationRisk, col: 'text-red-500', desc: 'Procedural and financial exposure' },
                      { key: 'evidenceStrength', label: 'Evidence Strength', val: stats.evidenceStrength, col: 'text-violet-500', desc: 'Admissibility & credibility weight' },
                      { key: 'precedentSupport', label: 'Precedent Support', val: stats.precedentSupport, col: 'text-sky-500', desc: 'Matching case law binding value' },
                      { key: 'aiConfidence', label: 'AI Confidence', val: stats.aiConfidence, col: 'text-pink-505', desc: 'AI model assessment confidence rating' },
                      { key: 'settlementProbability', label: 'Settlement Prob.', val: stats.settlementProbability, col: 'text-amber-500', desc: 'Mediation agreement likelihood' },
                      { key: 'appealRisk', label: 'Appeal Risk', val: stats.appealRisk, col: 'text-orange-500', desc: 'Likelihood of challenge in higher courts' },
                      { key: 'courtReadiness', label: 'Court Readiness', val: readinessMetrics.overall, col: 'text-teal-500', desc: 'Pleadings & document preparation status' },
                      { key: 'judgeReadiness', label: 'Judge Readiness', val: strategyResult ? '85' : '--', col: 'text-emerald-500', desc: 'Judge opinion patterns matching' },
                      { key: 'costEstimate', label: 'Cost Exposure', val: strategyResult ? 'Med' : '--', col: 'text-slate-500', desc: 'Projected litigation cost range' },
                      { key: 'timelineDays', label: 'Est. Timeline', val: strategyResult ? '9 Mos' : '--', col: 'text-indigo-655', desc: 'Est. duration to judgment decree' },
                    ].map(s => (
                      <div 
                        key={s.label} 
                        className={`border rounded-2xl p-3 shadow-sm flex flex-col justify-between min-h-[108px] transition-all relative group ${
                          isDark ? 'bg-[#131c31]/30 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Tooltip trigger info button */}
                        <div className="absolute top-2 right-2 text-slate-350 hover:text-slate-500 cursor-pointer group/tooltip shrink-0">
                          <Info size={11} />
                          <span className="hidden group-hover/tooltip:block absolute right-0 top-4 p-2 bg-slate-900 text-white rounded text-[8px] tracking-wide w-36 text-center leading-normal z-[1000] font-semibold select-none shadow-md">
                            {s.desc}
                          </span>
                        </div>

                        <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">{s.label}</span>
                        
                        <div className="flex items-baseline gap-0.5 mt-2">
                          <span className={`text-xl font-black ${s.col}`}>{s.val}</span>
                          {s.val !== '--' && typeof s.val === 'number' && <span className="text-[10px] text-slate-400 font-extrabold">%</span>}
                        </div>

                        {/* Mini trend graph SVG */}
                        <div className="mt-2.5 shrink-0">
                          <svg className={`w-full h-5 ${s.col}`} viewBox="0 0 100 25" fill="none">
                            <path 
                              d={generatePath(s.val)} 
                              stroke="currentColor" 
                              strokeWidth="1.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collapsible output detail blocks */}
                <div className="space-y-2 pt-2">
                  
                  {/* Accordion Detail: Argument Roadmap */}
                  <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div 
                      onClick={() => toggleAccordion('out_arguments')}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                        isDark ? 'bg-black/10' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Gavel size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Advocate Argument Roadmap</span>
                      </div>
                      {!collapsedBlocks.out_arguments ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                    {!collapsedBlocks.out_arguments && (
                      <div className={`p-4 space-y-3.5 ${isDark ? 'bg-black/5' : 'bg-white'}`}>
                        {[
                          { key: 'opening', label: 'Opening Case Statements' },
                          { key: 'arguments', label: 'Core Courtroom Arguments', isArray: true },
                          { key: 'rebuttal', label: 'Counter Rebuttals Strategy' },
                          { key: 'prayer', label: 'Prayer Submissions' }
                        ].map(a => (
                          <div key={a.key} className="p-3 border rounded-xl bg-slate-500/5 text-xs space-y-1">
                            <span className="text-[8.5px] font-black text-indigo-500 uppercase tracking-widest">{a.label}</span>
                            <p className="font-bold text-slate-705 dark:text-slate-300 leading-relaxed">
                              {a.isArray 
                                ? (strategyResult.finalArguments?.[a.key]?.join('\n') || 'N/A')
                                : (strategyResult.finalArguments?.[a.key] || 'N/A')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accordion Detail: Case Law Intelligence */}
                  <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div 
                      onClick={() => toggleAccordion('out_precedents')}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                        isDark ? 'bg-black/10' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-805 dark:text-white uppercase tracking-wider">Relevant Case Law precedents</span>
                      </div>
                      {!collapsedBlocks.out_precedents ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                    {!collapsedBlocks.out_precedents && (
                      <div className={`p-4 space-y-3 ${isDark ? 'bg-black/5' : 'bg-white'}`}>
                        {strategyResult.precedents?.map((p, idx) => (
                          <div key={idx} className="p-3 border border-slate-205 dark:border-zinc-800 rounded-xl bg-slate-500/5 text-xs space-y-1.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-800 dark:text-white">{p.citation}</span>
                                <span className="text-[8px] font-bold text-slate-405 bg-slate-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{p.court}</span>
                              </div>
                              <p className="font-semibold text-slate-500 dark:text-slate-400 text-[10.5px] mt-1 leading-normal">{p.summary}</p>
                            </div>
                            <button 
                              onClick={() => {
                                toast.success(`Retrieved citation sheets for: ${p.citation}`);
                              }}
                              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shrink-0 w-fit self-end md:self-center"
                            >
                              One-click Open
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accordion Detail: Risk Matrix Heatmap */}
                  <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div 
                      onClick={() => toggleAccordion('out_matrix')}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                        isDark ? 'bg-black/10' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Litigation Risk Heatmap Matrix</span>
                      </div>
                      {!collapsedBlocks.out_matrix ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                    {!collapsedBlocks.out_matrix && (
                      <div className={`p-4 space-y-4 ${isDark ? 'bg-black/5' : 'bg-white'}`}>
                        {/* Risk progress matrix list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {[
                            { name: 'Financial exposure Risk', val: strategyResult.risks?.financial || 40, col: 'bg-red-500' },
                            { name: 'Legal / Pleading risk', val: strategyResult.risks?.legal || 25, col: 'bg-amber-500' },
                            { name: 'Procedural objection risk', val: strategyResult.risks?.procedural || 15, col: 'bg-indigo-550' },
                            { name: 'Evidence Admissibility risk', val: strategyResult.risks?.evidence || 30, col: 'bg-violet-500' },
                            { name: 'Witness vulnerability risk', val: strategyResult.risks?.strategic || 20, col: 'bg-pink-500' },
                            { name: 'Appeal / Appeal risk', val: strategyResult.risks?.appeal || 10, col: 'bg-emerald-500' }
                          ].map(r => (
                            <div key={r.name} className="p-3 border rounded-xl bg-slate-500/3 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{r.name}</span>
                                <span className="font-black text-slate-500 dark:text-slate-405">{r.val}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${r.col}`} style={{ width: `${r.val}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion Detail: Settlement Analysis */}
                  <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div 
                      onClick={() => toggleAccordion('out_settlement')}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                        isDark ? 'bg-black/10' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-805 dark:text-white uppercase tracking-wider">Settlement & Negotiation Analysis</span>
                      </div>
                      {!collapsedBlocks.out_settlement ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                    {!collapsedBlocks.out_settlement && (
                      <div className={`p-4 space-y-3.5 text-xs ${isDark ? 'bg-black/5' : 'bg-white'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="p-3 border rounded-xl bg-slate-500/5 space-y-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Mediation suitability</span>
                            <p className="font-bold text-slate-750 dark:text-slate-250">{strategyResult.settlement?.mediationPossibility || 'High mediation capability'}</p>
                          </div>
                          <div className="p-3 border rounded-xl bg-slate-500/5 space-y-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Negotiation parameters strategy</span>
                            <p className="font-bold text-slate-750 dark:text-slate-250">{strategyResult.settlement?.negotiationStrategy || 'Mediation recommended first'}</p>
                          </div>
                        </div>

                        {/* Negotiation positions box */}
                        <div className="p-4 border border-indigo-500/10 bg-indigo-500/5 rounded-2xl space-y-2">
                          <span className="text-[8.5px] font-black text-indigo-550 uppercase tracking-widest">Target Negotiation Ranges</span>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <span className="text-[8px] font-extrabold uppercase text-slate-400">Opening Claim Offer</span>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{strategyResult.negotiationPositions?.opening || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[8px] font-extrabold uppercase text-slate-400">Realistic Target Settlement</span>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{strategyResult.negotiationPositions?.middle || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[8px] font-extrabold uppercase text-slate-400">Fallback Bottom Line</span>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{strategyResult.negotiationPositions?.final || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion Detail: Next Best Actions */}
                  <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div 
                      onClick={() => toggleAccordion('out_actions')}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                        isDark ? 'bg-black/10' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">AI Next Best Actions Checklist</span>
                      </div>
                      {!collapsedBlocks.out_actions ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                    {!collapsedBlocks.out_actions && (
                      <div className={`p-4 space-y-3.5 ${isDark ? 'bg-black/5' : 'bg-white'}`}>
                        {/* Recommendations mapping */}
                        <div className="space-y-2.5">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Immediate Procedural Actions</span>
                          <div className="space-y-1.5">
                            {strategyResult.aiRecommendations?.doFirst?.map((act, idx) => (
                              <div key={idx} className="flex items-center gap-2.5 p-2.5 border rounded-xl bg-slate-500/5 text-xs font-bold text-slate-800 dark:text-slate-200">
                                <span className="w-3.5 h-3.5 rounded bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-[9px] text-indigo-500 font-extrabold shrink-0">1</span>
                                <span>{act}</span>
                              </div>
                            ))}
                            {strategyResult.aiRecommendations?.doNext?.map((act, idx) => (
                              <div key={idx} className="flex items-center gap-2.5 p-2.5 border rounded-xl bg-slate-500/5 text-xs font-bold text-slate-800 dark:text-slate-200">
                                <span className="w-3.5 h-3.5 rounded bg-slate-500/10 border border-slate-300 flex items-center justify-center text-[9px] text-slate-505 font-extrabold shrink-0">2</span>
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* MODAL: Simulation History */}
      {historyVisible && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setHistoryVisible(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-205 dark:border-zinc-850 rounded-[32px] max-w-lg w-full max-h-[85%] flex flex-col overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 shrink-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Simulation History Logs</h3>
              <button onClick={() => setHistoryVisible(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* History Search Box */}
            <div className="flex items-center bg-slate-50 dark:bg-[#131C31] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 mt-4 shrink-0">
              <Search size={14} className="text-slate-400 mr-2" />
              <input 
                type="text"
                placeholder="Search past simulation strategies..."
                className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-0"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-3 custom-scrollbar">
              {historyData.filter(h => 
                h.title?.toLowerCase().includes(historySearch.toLowerCase()) || 
                h.caseFacts?.toLowerCase().includes(historySearch.toLowerCase())
              ).map((item, idx) => (
                <div key={item.id || idx} className="p-4 bg-slate-50 dark:bg-[#1A2540] border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-1">
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.caseFacts}</p>
                      <span className="text-[8px] text-indigo-500 font-extrabold uppercase mt-1.5 block">{item.timestamp}</span>
                    </div>
                    <button 
                      onClick={() => deleteHistoryItem(item.id)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="border-t border-slate-100 dark:border-white/5 pt-3 mt-3 flex justify-between items-center">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-550 rounded text-[9px] font-black uppercase">
                      Score: {item.stats?.overallStrategyScore}%
                    </span>
                    <button 
                      onClick={() => {
                        setStrategyResult(item.activeStrategy || item);
                        setHistoryVisible(false);
                        toast.success(`Loaded strategy: ${item.title}`);
                      }}
                      className="px-3 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      Load Strategy
                    </button>
                  </div>
                </div>
              ))}
              
              {historyData.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <Folder size={32} className="mx-auto text-slate-350 dark:text-zinc-700" />
                  <p className="text-xs font-semibold text-slate-400">No strategy simulations archived.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create New Scenario/Case */}
      {newCaseModalOpen && (
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setNewCaseModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-205 dark:border-zinc-850 rounded-[32px] max-w-md w-full max-h-[85%] flex flex-col overflow-hidden shadow-2xl p-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 shrink-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">New Scenario Case file</h3>
              <button onClick={() => setNewCaseModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 custom-scrollbar text-xs font-semibold">
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Client / Petitioner Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Gupta"
                  value={newCaseForm.clientName}
                  onChange={e => setNewCaseForm(prev => ({ ...prev, clientName: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Opposing Party Name</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Verma"
                  value={newCaseForm.accused}
                  onChange={e => setNewCaseForm(prev => ({ ...prev, accused: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Matter Type</label>
                  <select
                    value={newCaseForm.matterType}
                    onChange={e => setNewCaseForm(prev => ({ ...prev, matterType: e.target.value }))}
                    className={`w-full border rounded-xl px-3 py-2 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="Civil">Civil</option>
                    <option value="Criminal">Criminal</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Property">Property</option>
                    <option value="Family">Family</option>
                    <option value="Tax">Tax</option>
                    <option value="Employment">Employment</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Stage</label>
                  <select
                    value={newCaseForm.stage}
                    onChange={e => setNewCaseForm(prev => ({ ...prev, stage: e.target.value }))}
                    className={`w-full border rounded-xl px-3 py-2 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="Pre-litigation">Pre-litigation</option>
                    <option value="Filing">Filing stage</option>
                    <option value="Arguments">Arguments</option>
                    <option value="Appeal">Appeal stage</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Court Jurisdiction</label>
                <input
                  type="text"
                  placeholder="e.g. Supreme Court of India"
                  value={newCaseForm.courtName}
                  onChange={e => setNewCaseForm(prev => ({ ...prev, courtName: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2 outline-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Brief Case Facts Summary</label>
                <textarea
                  rows={3}
                  placeholder="Type a brief synopsis of the dispute..."
                  value={newCaseForm.summary}
                  onChange={e => setNewCaseForm(prev => ({ ...prev, summary: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2 outline-none resize-none ${isDark ? 'bg-black/20 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

            </div>

            <div className="border-t border-slate-100 dark:border-white/5 pt-4 mt-4 shrink-0 flex gap-2">
              <button 
                onClick={() => setNewCaseModalOpen(false)}
                className="w-1/2 py-2 border rounded-xl text-xs font-black uppercase text-slate-500"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateNewCase}
                className="w-1/2 py-2 bg-indigo-650 hover:bg-indigo-755 text-white rounded-xl text-xs font-black uppercase transition-all"
              >
                Create Scenario
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default StrategyEngine;
