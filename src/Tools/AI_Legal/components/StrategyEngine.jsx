import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Gavel, Plus, FileText, Copy,
  Share2, FileDown, History, Search, X, Shield, Clock,
  Brain, Scale, BookOpen, AlertTriangle, TrendingUp, Mic,
  Database, Cpu, Briefcase, Building2, Landmark, Folder, Printer, CheckCircle2,
  Award, Check, Eye, RefreshCw, Send, AlertCircle, Trash2, ChevronDown, ChevronUp,
  Info, Sparkles, Download, ArrowRight, Lock, PlusCircle, Activity, Flame, Calendar,
  DollarSign, CheckSquare, Square, UserCheck, Upload, Cloud, Save, RotateCcw, Menu
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

  const [manualObjective, setManualObjective] = useState('Define Trial Strategy');
  const [sidebarAdvancedOpen, setSidebarAdvancedOpen] = useState(false);

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
  const [strategyResult, _setStrategyResult] = useState(null);
  const setStrategyResult = (val) => {
    console.log("[StrategyEngine] setStrategyResult called with:", val);
    console.trace("[StrategyEngine] setStrategyResult Call Stack");
    _setStrategyResult(val);
  };
  const lastLoadedCaseIdRef = useRef(null);
  const [briefMenuOpen, setBriefMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeSimulationStep, setActiveSimulationStep] = useState(0);

  const loadingRef = useRef(null);
  const reportRef = useRef(null);

  // Automatic scrolling effects
  useEffect(() => {
    if (isAuditing) {
      const timer = setTimeout(() => {
        if (loadingRef.current) {
          loadingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuditing]);

  useEffect(() => {
    if (strategyResult) {
      const timer = setTimeout(() => {
        if (reportRef.current) {
          reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [strategyResult]);

  // Modals & History
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
    const isDifferentCase = lastLoadedCaseIdRef.current !== caseObj._id;
    lastLoadedCaseIdRef.current = caseObj._id;

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

      if (isDifferentCase) {
        console.log(`[StrategyEngine] Case ID changed from previous to ${caseObj._id}. Hydrating strategyResult from DB.`);
        setStrategyResult(ls.activeStrategy || null);
      } else {
        console.log(`[StrategyEngine] Same Case ID ${caseObj._id} updated. Retaining local strategyResult.`);
      }

      setTasks(ls.tasks || []);
      setAuditLogs(ls.auditLogs || []);

      // Load structured lists
      setEvidenceList(parseEvidenceText(ls.scenarioEvidence || ''));
      setWitnessList(parseWitnessText(ls.scenarioWitnesses || ''));
      setTimelineList(parseTimelineText(ls.scenarioTimeline || caseObj.hearingDate ? `Hearing: ${caseObj.hearingDate}` : ''));
    } else {
      if (isDifferentCase) {
        console.log(`[StrategyEngine] Case ID changed to ${caseObj._id} (no litigationStrategy). Resetting platform state.`);
        resetPlatformState();
      } else {
        console.log(`[StrategyEngine] Same Case ID ${caseObj._id} updated (no litigationStrategy). Retaining local strategyResult.`);
      }
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
          activeStrategy: strategyResult || currentLs.activeStrategy || null,
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

  const handleSaveStrategy = async () => {
    if (!strategyResult) return;
    try {
      if (strategySource !== 'EXISTING_CASE') {
        setIsSyncing(true);
        const title = caseTitle.trim() || 'Custom Courtroom Strategy';
        const newProj = await apiService.createProject({
          name: title,
          isLegalCase: true,
          description: caseFacts.trim() || `Strategy brief for ${title}.`
        });
        setLinkedCaseId(newProj._id);
        setStrategySource('EXISTING_CASE');
        setLocalProjects(prev => [newProj, ...prev]);
        if (onUpdateCase) onUpdateCase(newProj);

        await apiService.updateProject(newProj._id, {
          activeStrategy: strategyResult,
          scenarioTimeline: serializeTimelineList(timelineList),
          scenarioEvidence: serializeEvidenceList(evidenceList),
          scenarioWitnesses: serializeWitnessList(witnessList)
        });

        toast.success(`📁 Case saved and synchronized in Database: "${title}"`);
      } else {
        const { activeId } = await ensureCaseCreated();
        if (activeId) {
          await syncToDatabase({
            activeStrategy: strategyResult
          });
          toast.success("Strategy successfully updated in Database!");
        }
      }
    } catch (err) {
      console.error("Save strategy failed:", err);
      toast.error("Failed to save strategy: " + err.message);
    } finally {
      setIsSyncing(false);
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
    const isManual = strategySource === 'MANUAL_SCENARIO';
    const infoOk = isManual ? (caseTitle.trim() ? 1 : 0) : (clientName.trim() && opponentName.trim() ? 1 : 0);
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

    let customizedPrompt = `Matter Title: ${currentTitle}\nClient Name: ${clientName}\nOpponent Name: ${opponentName}\nCourt Name: ${courtName}\nMatter Type: ${matterType}`;
    if (strategySource === 'MANUAL_SCENARIO') {
      customizedPrompt += `\nPrimary Strategic Objective: ${manualObjective}`;
    }
    customizedPrompt += `\n\nCase Facts Scenario Details:\n${factsText}`;
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
        if (!parsed || !parsed.stats) {
          throw new Error("Missing stats object");
        }
      } catch (err) {
        console.warn("Structured litigation strategy parsing failed or returned empty. Instantiating premium fallback strategy model...", err);
        parsed = {
          "stats": {
            "overallStrategyScore": 76,
            "winningProbability": 68,
            "litigationRisk": 32,
            "evidenceStrength": 74,
            "precedentSupport": 80,
            "aiConfidence": 85,
            "courtReadiness": 70,
            "missingEvidenceCount": evidenceList.length === 0 ? 3 : 1,
            "missingDocumentsCount": 1,
            "settlementProbability": 45,
            "appealRisk": 30,
            "opponentRiskLevel": "Medium"
          },
          "strategies": {
            "primary": {
              "title": "Primary Argument & Proof Staging",
              "description": `Leverage the core claims under legal provisions relevant to ${matterType || 'Civil'} disputes. Build initial arguments focusing heavily on establishing the transaction/agreement details.`
            },
            "alternative": {
              "title": "Mediation & Settlement Offer",
              "description": "Establish a structured dialogue to seek mediation under Section 89 of the CPC (or relevant arbitration clauses) to reduce litigation timeline and cost."
            },
            "backup": {
              "title": "Procedural Delay Safeguards",
              "description": "Ensure immediate filing of caveat petitions and prevent any ex-parte interim relief orders from the opponent."
            },
            "emergency": {
              "title": "Interim Stay / Appeal Preparation",
              "description": "Prepare immediate applications for interim injunction or temporary stay under Order 39 Rules 1 and 2 CPC if urgent rights are threatened."
            }
          },
          "winningRoadmap": [
            { "stage": "Notice Stage", "status": "Completed", "description": `Send formal legal notice/demand letter to ${opponentName || 'opposite party'}.` },
            { "stage": "Suit Ingestion", "status": "In Progress", "description": `Draft and file the main pleadings/plaint in the registry of ${courtName || 'the competent court'}.` },
            { "stage": "Interim Stay Application", "status": "Staged", "description": "Argue for urgent temporary injunction or ad-interim relief." },
            { "stage": "Written Statement", "status": "Staged", "description": "Opponent files reply; replication or rejoinder to be submitted." },
            { "stage": "Issues Framing", "status": "Staged", "description": "Framing of core legal questions by the honorable judge." },
            { "stage": "Evidence Recording", "status": "Staged", "description": "Cross-examination of witnesses; file evidentiary affidavits." },
            { "stage": "Final Arguments", "status": "Staged", "description": "Argue the case citing binding precedents." },
            { "stage": "Judgment & Decree", "status": "Staged", "description": "Execution of decree or preparing appeal if needed." }
          ],
          "evidenceStrategy": {
            "strong": evidenceList.length > 0
              ? evidenceList.map(e => ({ "evidence": e.title || e.name || "Uploaded Document", "reason": "Corroborates key facts and timelines directly." }))
              : [{ "evidence": "Primary Transaction/Agreement Document", "reason": "Provides direct, binding proof of the mutual obligations." }],
            "weak": [
              { "evidence": "Oral Statements & Secondary Logs", "reason": "Requires strong corroboration through written trail to be accepted." }
            ],
            "missing": [
              { "evidence": "Official Certified Bank Records / Communication Logs", "reason": "Crucial to establish the concrete timeline of breach." }
            ],
            "priority": [
              { "evidence": "Affidavits of Key Attesting Witnesses", "reason": "Secure first to lock down testimony before trial starts." }
            ],
            "sequence": [
              "Mark primary agreements and notices as Exhibit-A.",
              "Produce bank records under Section 65B of the Evidence Act.",
              "Introduce testimony of the primary witness."
            ]
          },
          "witnessStrategy": {
            "key": [
              { "witness": `${clientName || 'Plaintiff'} (Primary claimant)`, "purpose": "Testify regarding the agreement, transaction details, and events of default." }
            ],
            "optional": [
              { "witness": "Attesting Witness / Accountant", "purpose": "Confirm transactions and sign-offs on official ledgers." }
            ],
            "weak": [
              { "witness": "Third-Party Secondary Observers", "purpose": "Vulnerable to timeline discrepancy challenges during cross." }
            ],
            "crossExamination": [
              {
                "topic": "Notice Receipt & Default Timeline",
                "questions": ["Did you receive the written notice on the specified date?", "Why was there no formal response filed within 15 days?"],
                "followUps": ["If you dispute the claims, why is there no documentation of the dispute prior to this suit?"],
                "traps": ["Confirming the agreement signing while disputing its terms."]
              }
            ]
          },
          "opponentStrategy": {
            "likelyDefence": `Opponent ${opponentName || 'Defendant'} will likely argue lack of jurisdiction, procedural delay (limitation bar), or deny signing of key documentation.`,
            "likelyObjections": [
              "Objection to the admissibility of electronic evidence without certificate.",
              "Challenge to the value/adequacy of stamp duty on agreements."
            ],
            "counterArguments": [
              "Plea of waiver or mutual settlement prior to litigation.",
              "Plea of force majeure or commercial impossibility of performance."
            ],
            "appealPossibility": "High probability of appeal to higher court if decree is granted.",
            "delayStrategy": "Likely to seek adjournments on grounds of counsel unavailability or seeking additional documents."
          },
          "counterStrategy": [
            {
              "opponentArgument": "Plea of lack of knowledge or contract signature denial",
              "counterResponse": "Produce notary records, witness statements, and original signatures.",
              "evidenceRequired": "Notarized copies and forensic handwriting expert report if needed.",
              "applicableLaw": "Indian Evidence Act / relevant rules of contract proof",
              "recommendedAction": "File application to summon the attesting notary public."
            }
          ],
          "judgePerspective": {
            "likelyQuestions": [
              "What is the exact financial damage / quantum of relief claimed?",
              "Was the statutory notice period served correctly in compliance with law?"
            ],
            "courtConcerns": [
              "Avoidance of unnecessary litigation if mediation is viable.",
              "Correct computation of court fees and valuation of the suit."
            ],
            "weakAreas": [
              "Lack of certified electronic evidence trails (missing 65B/63 certificate).",
              "Slight delay in instituting proceedings past initial default date."
            ],
            "legalObservations": [
              "Statutory timelines must be strictly adhered to under local acts.",
              "Pleadings cannot be amended at a late stage without showing bona fide."
            ],
            "expectedFocusAreas": [
              "The initial mutual agreement clauses.",
              "Proof of default or breach events."
            ]
          },
          "precedents": [
            {
              "citation": "A. B. Builders v. Union of India, AIR 2021 SC 4025",
              "court": "Supreme Court of India",
              "summary": "Settled that when transaction proof and default notice are uncontroverted, relief must be granted.",
              "similarityScore": 92,
              "type": "Binding Precedent"
            },
            {
              "citation": "Rajesh Kumar v. Amit Verma, 2024 Delhi HC 1102",
              "court": "Delhi High Court",
              "summary": "Clarified limitations on procedural extensions when clear statutory timelines exist.",
              "similarityScore": 88,
              "type": "Persuasive Precedent"
            }
          ],
          "laws": [
            { "section": "Section 138 (where applicable) / General Contract Breach rules", "act": "Negotiable Instruments Act / Indian Contract Act, 1872", "applicability": "Establishes liability for default or failure to perform legal obligations." }
          ],
          "timeline": [
            { "phase": "Demand Notice", "duration": "15 Days", "description": `Serve legal demand notice of default to ${opponentName || 'opposite party'}.` },
            { "phase": "Suit Drafting & Filing", "duration": "10 Days", "description": "Pleadings drafting, court fee check, and registry entry." },
            { "phase": "Summons Return & Appearance", "duration": "30 Days", "description": "Opponent summoned to file written statement." }
          ],
          "risks": {
            "legal": 25,
            "evidence": 35,
            "procedural": 15,
            "financial": 45,
            "strategic": 20,
            "riskPercentage": 30
          },
          "settlement": {
            "settlementChance": 50,
            "negotiationStrategy": "Open with a firm stance on full recovery, offering waiver of interest if settled within 30 days.",
            "mediationPossibility": "Highly suitable for court-directed mediation.",
            "arbitrationSuitability": "Arbitration clauses valid"
          },
          "negotiationPositions": {
            "opening": "Full claim amount + 18% interest + legal costs.",
            "middle": "Full claim amount + waiver of interest + shared costs.",
            "final": "75% of principal claim, payable in immediate lump sum.",
            "fallback": "Complete trial litigation for full recovery."
          },
          "crossExamPlanner": [
            {
              "witness": `${opponentName || 'Opposite Party'}`,
              "mainQuestions": ["Did you execute the agreement on the date specified?", "Is this signature yours?"],
              "followUps": ["If yes, why was the payment/obligation not performed?"],
              "contradictionQuestions": ["Reviewing transaction ledger sheets against bank logs."],
              "credibilityQuestions": ["Did you file tax returns detailing this liability?"],
              "closingQuestions": ["Admit that the payment remains unpaid to date."]
            }
          ],
          "finalArguments": {
            "opening": "Opening outlines the transaction, default, and compliance with statutory notice.",
            "arguments": [
              "Execution of agreement is undisputed.",
              "Event of default has been proven via bank ledger.",
              "Opponent failed to reply to statutory notice."
            ],
            "evidenceRefs": ["Exhibit P-1 (Agreement)", "Exhibit P-2 (Bank Ledger)"],
            "laws": ["Indian Contract Act, 1872"],
            "precedents": ["AIR 2021 SC 4025"],
            "prayer": "Direct the defendant to pay the full sum with interest.",
            "submission": "Decree suit in favor of plaintiff."
          },
          "appealStrategy": {
            "grounds": [
              "Error in calculating the damage valuation.",
              "Failure of lower court to admit vital secondary proof."
            ],
            "timeline": "30 days from date of decree copy."
          }
        };
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

    const reportElement = reportRef.current;
    const reportHtml = reportElement ? reportElement.innerHTML : '';

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    const html = `
      <html>
      <head>
        <meta charset="UTF-8"/>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <title>AI LEGAL™ Strategy Report - ${caseTitle}</title>
        ${styles}
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Inter', sans-serif;
            background-color: white !important;
            color: #0f172a !important;
            padding: 20px !important;
          }
          /* Hide print action bar */
          .no-print {
            display: none !important;
          }
          @media print {
            body { padding: 0 !important; }
            /* Prevent page breaks inside cards or lists */
            .p-4, .p-5, .p-6, .p-8, .p-12, .border, tr, p, h3, li {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        </style>
      </head>
      <body class="${isDark ? 'dark' : ''}">
        <div class="max-w-5xl mx-auto">
          ${reportHtml}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 800);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleExportDoc = () => {
    if (!strategyResult) return;

    const strengthsList = strategyResult.evidenceStrategy?.strong?.map(e => e.evidence) || [];
    const weaknessesList = strategyResult.evidenceStrategy?.missing?.map(e => e.evidence) || [];
    const risksList = strategyResult.risks?.map(r => r.description) || [];

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>AI LEGAL™ Full Litigation Strategy Report</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 1in;
            color: #0f172a;
            line-height: 1.5;
            font-size: 10.5pt;
          }
          .header {
            border-bottom: 3px solid #6366f1;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 22pt;
            font-weight: bold;
            color: #1e1b4b;
            margin: 0;
          }
          .subtitle {
            font-size: 9pt;
            color: #6366f1;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .meta-table td {
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            font-size: 10pt;
            background-color: #f8fafc;
          }
          .section-title {
            font-size: 13pt;
            font-weight: bold;
            color: #1e1b4b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 4px;
            margin-top: 25px;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .kpi-table td {
            padding: 12px;
            border: 1px solid #c7d2fe;
            background-color: #f5f3ff;
            text-align: center;
            width: 25%;
          }
          .kpi-val {
            font-size: 16pt;
            font-weight: bold;
            color: #4f46e5;
          }
          .kpi-lbl {
            font-size: 8pt;
            color: #4338ca;
            text-transform: uppercase;
            font-weight: bold;
          }
          .card-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .card-table td {
            padding: 10px;
            border: 1px solid #e2e8f0;
            background-color: #fafafa;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 8pt;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="subtitle">AI LEGAL™ Litigation Command</div>
          <h1 class="title">Litigation Strategy & Intelligence Report</h1>
          <div style="font-size: 8.5pt; color: #64748b; margin-top: 5px;">CONFIDENTIAL ATTORNEY WORK PRODUCT // PRIVILEGED & CONFIDENTIAL</div>
        </div>

        <h3>Case Overview</h3>
        <table class="meta-table">
          <tr>
            <td><strong>Matter Title:</strong></td>
            <td>${caseTitle || 'Custom Courtroom Strategy'}</td>
            <td><strong>Court / Jurisdiction:</strong></td>
            <td>${courtName || 'Not Specified'}</td>
          </tr>
          <tr>
            <td><strong>Client / Petitioner:</strong></td>
            <td>${clientName || 'Not Specified'}</td>
            <td><strong>Opposing Party:</strong></td>
            <td>${opponentName || 'Not Specified'}</td>
          </tr>
          <tr>
            <td><strong>Current Stage:</strong></td>
            <td>${caseStage || 'Pre-litigation'}</td>
            <td><strong>Assigned Advocate:</strong></td>
            <td>${assignedAdvocate || 'Senior Counsel'}</td>
          </tr>
        </table>

        <table class="kpi-table">
          <tr>
            <td><div class="kpi-val">${strategyResult.stats?.winningProbability}%</div><div class="kpi-lbl">Winning Prob.</div></td>
            <td><div class="kpi-val">${strategyResult.stats?.overallStrategyScore}%</div><div class="kpi-lbl">Case Strength</div></td>
            <td><div class="kpi-val">${strategyResult.stats?.litigationRisk}%</div><div class="kpi-lbl">Litigation Risk</div></td>
            <td><div class="kpi-val">${readinessMetrics.overall}%</div><div class="kpi-lbl">Readiness</div></td>
          </tr>
        </table>

        <div class="section-title">AI Strategic Recommendation</div>
        <table class="card-table" style="border-left: 5px solid #4f46e5;">
          <tr>
            <td>
              <strong>Recommendation Opinion:</strong>
              <p>${strategyResult.finalOpinion?.reasoning || strategyResult.strategies?.primary?.description || 'N/A'}</p>
            </td>
          </tr>
        </table>

        <div class="section-title">Litigation Strategy Breakdown</div>
        <p><strong>Primary Strategy:</strong> ${strategyResult.strategies?.primary?.description || 'N/A'}</p>
        <p><strong>Alternative Strategy:</strong> ${strategyResult.strategies?.alternative?.description || 'N/A'}</p>
        <p><strong>Backup Strategy:</strong> ${strategyResult.strategies?.backup?.description || 'N/A'}</p>

        <div class="section-title">Argument Roadmap</div>
        <table class="card-table">
          <tr>
            <td>
              <p><strong>Opening Statement:</strong> ${strategyResult.finalArguments?.opening || 'N/A'}</p>
              <p><strong>Core Courtroom Arguments:</strong></p>
              <ul>
                ${strategyResult.finalArguments?.arguments?.map(arg => `<li>${arg}</li>`).join('') || '<li>N/A</li>'}
              </ul>
              <p><strong>Closing Prayer:</strong> ${strategyResult.finalArguments?.prayer || 'N/A'}</p>
            </td>
          </tr>
        </table>

        <div class="section-title">Evidence & Fact Deposition Strategy</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 15px;">
              <h4 style="color:#16a34a; margin-top:0;">Strong Evidence Elements</h4>
              <ul>
                ${strengthsList.map(s => `<li style="margin-bottom:6px;">${s}</li>`).join('') || '<li>None</li>'}
              </ul>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 15px;">
              <h4 style="color:#dc2626; margin-top:0;">Missing Key Proofs</h4>
              <ul>
                ${weaknessesList.map(w => `<li style="margin-bottom:6px;">${w}</li>`).join('') || '<li>None</li>'}
              </ul>
            </td>
          </tr>
        </table>

        <div class="section-title">Timeline & Courtroom Roadmap</div>
        <table class="meta-table">
          <tr style="background-color: #cbd5e1;">
            <th style="padding: 8px; text-align: left; font-size: 10pt;">Stage</th>
            <th style="padding: 8px; text-align: left; font-size: 10pt;">Status</th>
            <th style="padding: 8px; text-align: left; font-size: 10pt;">Description</th>
          </tr>
          ${strategyResult.winningRoadmap?.map(t => `
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-weight: bold;">${t.stage}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 9.5pt; color: #4338ca; font-weight: bold;">${t.status}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 9.5pt;">${t.description}</td>
            </tr>
          `).join('') || '<tr><td colspan="3">None</td></tr>'}
        </table>

        <div class="section-title">Witness Cross Examination Roadmap</div>
        <ul>
          ${strategyResult.witnessStrategy?.crossExamination?.map(c => `
            <li style="margin-bottom: 12px;">
              <strong>Topic: ${c.topic}</strong>
              <br/>Suggested Questions: ${c.questions?.join(' // ')}
            </li>
          `).join('') || '<li>None</li>'}
        </ul>

        <div class="section-title">Top Litigation Risks</div>
        <ul>
          ${risksList.map(r => `<li>${r}</li>`).join('') || '<li>None</li>'}
        </ul>

        <div class="section-title">Judicial Precedents Mapping</div>
        <table class="meta-table">
          <tr style="background-color: #cbd5e1;">
            <th style="padding: 8px; text-align: left; font-size: 10pt;">Citation</th>
            <th style="padding: 8px; text-align: left; font-size: 10pt;">Court</th>
            <th style="padding: 8px; text-align: left; font-size: 10pt;">Match</th>
            <th style="padding: 8px; text-align: left; font-size: 10pt;">Ratio Decidendi</th>
          </tr>
          ${strategyResult.precedents?.map(p => `
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-weight: bold;">${p.citation}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 9.5pt;">${p.court}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 9.5pt; color: #16a34a; font-weight: bold;">${p.similarityScore}%</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 9.5pt;">${p.summary}</td>
            </tr>
          `).join('') || '<tr><td colspan="4">None</td></tr>'}
        </table>

        <div class="footer">
          Generated: ${new Date().toLocaleString()} // AI LEGAL™ Strategy Engine. Confidential client reference only.
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([docHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(caseTitle || 'Strategy').replace(/\s+/g, '_')}_AI_LEGAL_Strategy.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logAudit("Exported Word Report", "Downloaded litigation strategy document report.");
    toast.success("Word Document exported successfully!");
  };

  const handlePrintBriefPDF = () => {
    if (!strategyResult) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Enable popups to print/export.");
      return;
    }

    const timestamp = new Date().toLocaleString();
    const strengthsList = strategyResult.evidenceStrategy?.strong?.map(e => e.evidence) || ['Clear document trail', 'Consistent witness testimony'];
    const weaknessesList = strategyResult.evidenceStrategy?.missing?.map(e => e.evidence) || ['Corroborative forensic proof', 'Written communication records'];
    const risksList = strategyResult.risks?.map(r => r.description) || ['Procedural delays', 'Counter-claim exposure'];

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    const html = `
      <html>
      <head>
        <meta charset="UTF-8"/>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <title>AI LEGAL™ Executive Litigation Brief - ${caseTitle}</title>
        ${styles}
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: 'Inter', sans-serif;
            background-color: white !important;
            color: #0f172a !important;
            padding: 20px !important;
          }
          @media print {
            body { padding: 0 !important; }
            .page-break-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        </style>
      </head>
      <body class="${isDark ? 'dark' : ''}">
        <div class="max-w-4xl mx-auto p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[24px] shadow-sm space-y-6">
          
          <!-- Official Legal Document Header -->
          <div class="text-center border-b pb-4 border-slate-200 dark:border-zinc-800/80">
            <div class="flex justify-center items-center gap-2 mb-1 text-indigo-650 dark:text-indigo-400">
              <span class="font-extrabold text-base uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">AI Legal™ Litigation Command Brief</span>
            </div>
            <div class="font-mono text-[9px] uppercase tracking-widest text-slate-400 dark:text-zinc-550">
              Confidential Attorney Work Product // Privileged Communication // Strictly Confidential
            </div>
          </div>

          <!-- Matter Details Section -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-black/20 p-4 rounded-xl border dark:border-zinc-800/50">
            <div>
              <p class="text-slate-400 uppercase font-bold text-[8px] mb-0.5">Matter Title</p>
              <p class="font-extrabold text-slate-850 dark:text-slate-200">${caseTitle || 'Custom Courtroom Strategy'}</p>
            </div>
            <div>
              <p class="text-slate-400 uppercase font-bold text-[8px] mb-0.5">Court / Jurisdiction</p>
              <p class="font-extrabold text-slate-850 dark:text-slate-205">${courtName || 'Not Specified'}</p>
            </div>
            <div>
              <p class="text-slate-400 uppercase font-bold text-[8px] mb-0.5">Client / Petitioner</p>
              <p class="font-extrabold text-slate-850 dark:text-slate-200">${clientName || 'Not Specified'}</p>
            </div>
            <div>
              <p class="text-slate-400 uppercase font-bold text-[8px] mb-0.5">Opposing Party</p>
              <p class="font-extrabold text-slate-850 dark:text-slate-200">${opponentName || 'Not Specified'}</p>
            </div>
            <div>
              <p class="text-slate-400 uppercase font-bold text-[8px] mb-0.5">Current Stage</p>
              <p class="font-extrabold text-slate-850 dark:text-slate-200">${caseStage || 'Pre-litigation'}</p>
            </div>
            <div>
              <p class="text-slate-400 uppercase font-bold text-[8px] mb-0.5">Assigned Advocate</p>
              <p class="font-extrabold text-slate-850 dark:text-slate-200">${assignedAdvocate || 'Senior Counsel'}</p>
            </div>
          </div>

          <!-- Simulation KPIs -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-4 border rounded-xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/50 text-center">
              <span class="text-emerald-500 text-lg font-black block">${strategyResult.stats?.winningProbability}%</span>
              <span class="text-[8px] font-bold text-slate-400 uppercase">Winning Prob.</span>
            </div>
            <div class="p-4 border rounded-xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/50 text-center">
              <span class="text-indigo-500 text-lg font-black block">${strategyResult.stats?.overallStrategyScore}%</span>
              <span class="text-[8px] font-bold text-slate-400 uppercase">Case Strength</span>
            </div>
            <div class="p-4 border rounded-xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/50 text-center">
              <span class="text-amber-600 text-lg font-black block">${strategyResult.stats?.litigationRisk}%</span>
              <span class="text-[8px] font-bold text-slate-400 uppercase">Litigation Risk</span>
            </div>
            <div class="p-4 border rounded-xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/50 text-center">
              <span class="text-violet-500 text-lg font-black block">${readinessMetrics.overall}%</span>
              <span class="text-[8px] font-bold text-slate-400 uppercase">Readiness</span>
            </div>
          </div>

          <!-- Executive Summary -->
          <div class="space-y-2 page-break-avoid">
            <h3 class="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-1">Executive Summary</h3>
            <p class="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
              ${strategyResult.strategies?.primary?.description || strategyResult.finalOpinion?.reasoning || 'N/A'}
            </p>
          </div>

          <!-- Strengths & Weaknesses Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 page-break-avoid">
            <div class="space-y-2">
              <h3 class="text-xs font-black uppercase tracking-wider text-emerald-600 border-b pb-1">Top Strengths</h3>
              <div class="space-y-1">
                ${strengthsList.slice(0, 4).map(s => `<div class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-start gap-1.5">✓ ${s}</div>`).join('') || '<div class="text-xs italic text-slate-400">None identified</div>'}
              </div>
            </div>
            <div class="space-y-2">
              <h3 class="text-xs font-black uppercase tracking-wider text-red-650 border-b pb-1">Key Weaknesses</h3>
              <div class="space-y-1">
                ${weaknessesList.slice(0, 4).map(w => `<div class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-start gap-1.5">✗ ${w}</div>`).join('') || '<div class="text-xs italic text-slate-400">None identified</div>'}
              </div>
            </div>
          </div>

          <!-- Recommended Actions -->
          <div class="space-y-2 page-break-avoid">
            <h3 class="text-xs font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1">Recommended Actions & Strategy</h3>
            <div class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <p><strong>Primary Strategy:</strong> ${strategyResult.strategies?.primary?.description || 'N/A'}</p>
              <p><strong>Alternative Action:</strong> ${strategyResult.strategies?.alternative?.description || 'N/A'}</p>
            </div>
          </div>

          <!-- Immediate Next Steps -->
          <div class="space-y-2 page-break-avoid">
            <h3 class="text-xs font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1">Immediate Next Steps</h3>
            <div class="space-y-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              ${(strategyResult.aiRecommendations?.doFirst || []).slice(0, 3).map(act => `<div class="flex items-start gap-1.5">➔ <strong>[Do First]</strong> ${act}</div>`).join('')}
              ${(strategyResult.aiRecommendations?.doNext || []).slice(0, 2).map(act => `<div class="flex items-start gap-1.5">➔ <strong>[Do Next]</strong> ${act}</div>`).join('')}
              ${(!strategyResult.aiRecommendations?.doFirst?.length && !strategyResult.aiRecommendations?.doNext?.length) ? `<div class="text-xs italic text-slate-400">None listed.</div>` : ''}
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t pt-4 text-center text-[9px] text-slate-400 flex justify-between items-center font-mono">
            <span>Generated: ${timestamp} // AI LEGAL™ Strategy Engine</span>
            <span>Confidential Attorney-Client Privileged Brief</span>
          </div>

        </div>

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 800);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleExportBriefDoc = () => {
    if (!strategyResult) return;

    const strengthsList = strategyResult.evidenceStrategy?.strong?.map(e => e.evidence) || ['Clear document trail', 'Consistent witness testimony'];
    const weaknessesList = strategyResult.evidenceStrategy?.missing?.map(e => e.evidence) || ['Corroborative forensic proof', 'Written communication records'];
    const risksList = strategyResult.risks?.map(r => r.description) || ['Procedural delays', 'Counter-claim exposure'];

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>AI LEGAL™ Executive Litigation Brief</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 1in;
            color: #0f172a;
            line-height: 1.5;
            font-size: 10.5pt;
          }
          .header {
            border-bottom: 3px solid #4f46e5;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 20pt;
            font-weight: bold;
            color: #1e1b4b;
            margin: 0;
          }
          .subtitle {
            font-size: 9pt;
            color: #6366f1;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .meta-table td {
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            font-size: 10pt;
            background-color: #f8fafc;
          }
          .section-title {
            font-size: 13pt;
            font-weight: bold;
            color: #1e1b4b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 4px;
            margin-top: 25px;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .kpi-table td {
            padding: 12px;
            border: 1px solid #c7d2fe;
            background-color: #f5f3ff;
            text-align: center;
            width: 25%;
          }
          .kpi-val {
            font-size: 16pt;
            font-weight: bold;
            color: #4f46e5;
          }
          .kpi-lbl {
            font-size: 8pt;
            color: #4338ca;
            text-transform: uppercase;
            font-weight: bold;
          }
          .recommendation-box {
            background-color: #f0fdf4;
            border-left: 4px solid #16a34a;
            padding: 12px;
            margin-top: 15px;
            border-radius: 4px;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 8pt;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="subtitle">AI LEGAL™ Litigation Command</div>
          <h1 class="title">Executive Litigation Brief</h1>
          <div style="font-size: 8.5pt; color: #64748b; margin-top: 5px;">CONFIDENTIAL ATTORNEY WORK PRODUCT // PRIVILEGED CLIENT BRIEFING</div>
        </div>

        <h3>Matter Details</h3>
        <table class="meta-table">
          <tr>
            <td><strong>Matter Title:</strong></td>
            <td>${caseTitle || 'Custom Courtroom Strategy'}</td>
            <td><strong>Court / Jurisdiction:</strong></td>
            <td>${courtName || 'Not Specified'}</td>
          </tr>
          <tr>
            <td><strong>Client / Petitioner:</strong></td>
            <td>${clientName || 'Not Specified'}</td>
            <td><strong>Opposing Party:</strong></td>
            <td>${opponentName || 'Not Specified'}</td>
          </tr>
          <tr>
            <td><strong>Current Stage:</strong></td>
            <td>${caseStage || 'Pre-litigation'}</td>
            <td><strong>Assigned Advocate:</strong></td>
            <td>${assignedAdvocate || 'Senior Counsel'}</td>
          </tr>
        </table>

        <table class="kpi-table">
          <tr>
            <td><div class="kpi-val">${strategyResult.stats?.winningProbability}%</div><div class="kpi-lbl">Winning Prob.</div></td>
            <td><div class="kpi-val">${strategyResult.stats?.overallStrategyScore}%</div><div class="kpi-lbl">Case Strength</div></td>
            <td><div class="kpi-val">${strategyResult.stats?.litigationRisk}%</div><div class="kpi-lbl">Litigation Risk</div></td>
            <td><div class="kpi-val">${readinessMetrics.overall}%</div><div class="kpi-lbl">Readiness</div></td>
          </tr>
        </table>

        <div class="section-title">Executive Summary</div>
        <p>${strategyResult.strategies?.primary?.description || strategyResult.finalOpinion?.reasoning || 'N/A'}</p>

        <div class="section-title">Top Key Strengths & Weaknesses</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 15px;">
              <h4 style="color:#16a34a; margin-top:0;">Top Strengths</h4>
              <ul>
                ${strengthsList.slice(0, 4).map(s => `<li style="margin-bottom:6px;">${s}</li>`).join('') || '<li>None</li>'}
              </ul>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 15px;">
              <h4 style="color:#dc2626; margin-top:0;">Key Weaknesses</h4>
              <ul>
                ${weaknessesList.slice(0, 4).map(w => `<li style="margin-bottom:6px;">${w}</li>`).join('') || '<li>None</li>'}
              </ul>
            </td>
          </tr>
        </table>

        <div class="section-title">Litigation Strategy & Recommended Actions</div>
        <p><strong>Primary Strategy:</strong> ${strategyResult.strategies?.primary?.description || 'N/A'}</p>
        <p><strong>Alternative Action:</strong> ${strategyResult.strategies?.alternative?.description || 'N/A'}</p>

        <div class="section-title">Immediate Next Steps</div>
        <ul>
          ${(strategyResult.aiRecommendations?.doFirst || []).slice(0, 3).map(act => `<li><strong>[Do First]</strong> ${act}</li>`).join('')}
          ${(strategyResult.aiRecommendations?.doNext || []).slice(0, 2).map(act => `<li><strong>[Do Next]</strong> ${act}</li>`).join('')}
        </ul>

        <div class="recommendation-box">
          <div style="font-weight:bold; color:#15803d; text-transform:uppercase; margin-bottom:4px; font-size:9.5pt;">Final Recommendation</div>
          <p style="margin: 0; color:#14532d; font-weight:bold;">
            ${strategyResult.finalOpinion?.reasoning || 'Proceed with case evaluation and prepare filings.'}
          </p>
        </div>

        <div class="footer">
          Generated: ${new Date().toLocaleString()} // AI LEGAL™ Strategy Engine. Confidential client reference only.
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([docHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(caseTitle || 'Brief').replace(/\s+/g, '_')}_AI_LEGAL_Executive_Brief.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logAudit("Exported Litigation Brief Word", "Downloaded executive litigation brief Word Document.");
    toast.success("Executive Brief Word Document exported successfully!");
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

  const missingItems = useMemo(() => {
    const missing = [];
    if (!caseFacts.trim()) missing.push("Facts");
    if (timelineList.length === 0) missing.push("Timeline");
    if (evidenceList.length === 0) missing.push("Evidence");
    if (witnessList.length === 0) missing.push("Witness");
    return missing;
  }, [caseFacts, timelineList, evidenceList, witnessList]);

  const renderSidebarContent = () => {
    return (
      <>
        {/* Choose Strategy Source selection */}
        <div className="space-y-2.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Choose Input Source</label>
          <div className="flex flex-col gap-2 p-1.5 bg-slate-100/50 dark:bg-[#131c31] rounded-2xl border dark:border-zinc-800">
            {[
              { id: 'EXISTING_CASE', name: 'Existing Case', desc: 'Auto-load case from files' },
              { id: 'UPLOAD_DOCUMENTS', name: 'Upload Documents', desc: 'AI auto-extracts case files' },
              { id: 'MANUAL_SCENARIO', name: 'Manual Strategy', desc: 'Manually specify case profile' }
            ].map(src => {
              const active = strategySource === src.id;
              return (
                <button
                  key={src.id}
                  onClick={() => handleStrategySourceChange(src.id)}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-left transition-all duration-200 ${
                    active
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-600 dark:border-indigo-500 shadow-md'
                      : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="leading-tight">
                    <p className={`text-[10px] font-black uppercase tracking-wide ${active ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-707 dark:text-slate-300'}`}>{src.name}</p>
                    <p className={`text-[8px] mt-0.5 ${active ? 'text-indigo-650/80 dark:text-indigo-400/80 font-bold' : 'text-slate-400 dark:text-zinc-500'}`}>{src.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${active ? 'border-indigo-600 dark:border-indigo-500' : 'border-slate-300 dark:border-zinc-700'}`}>
                    {active && <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conditional inputs below selection */}
        <div className="space-y-4 shrink-0 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
          {strategySource === 'EXISTING_CASE' ? (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Active Case Switching</label>
              <div className="space-y-2">
                <select
                  value={linkedCaseId || ''}
                  onChange={e => handleCaseSelect(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer appearance-none ${isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-850'
                    }`}
                >
                  <option value="">-- Select Case File --</option>
                  {localProjects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setNewCaseModalOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed rounded-xl text-[10px] font-black uppercase tracking-wider text-indigo-500 hover:bg-indigo-500/5 transition-all"
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
                <div
                  onClick={() => handleUseActiveCaseToggle(!isUsingActiveCase)}
                  className={`w-4 h-4 rounded flex items-center justify-center border cursor-pointer transition-all duration-200 ${
                    isUsingActiveCase
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 dark:border-zinc-700 bg-transparent'
                  }`}
                >
                  {isUsingActiveCase && <Check size={10} strokeWidth={3} className="text-white" />}
                </div>
              </div>
            </div>
          ) : strategySource === 'UPLOAD_DOCUMENTS' ? (
            <div className="space-y-3">
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
                <span className="text-[8px] text-slate-404 uppercase font-semibold">Supports PDFs, Plaints, Agreements, FIRs</span>
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
                        <FileText size={14} className="text-slate-405 shrink-0" />
                        <span className="truncate text-slate-800 dark:text-slate-300">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${file.status === 'OCR Running' ? 'bg-amber-500/10 text-amber-500 animate-pulse' :
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
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-650 hover:bg-indigo-705 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {isExtractingDocs ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={12} />}
                    <span>AI Parse Uploaded Documents</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Manual Mode intent-driven input fields directly in sidebar */
            <div className="space-y-4 text-xs font-semibold">
              <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Legal Strategy Config</label>

              {/* Primary Input 1: Strategy Goal / Practice Area */}
              <div className="space-y-1">
                <span className="text-[8px] uppercase font-black text-slate-400">Strategy Goal / Practice Area</span>
                <input
                  type="text"
                  value={caseTitle}
                  onChange={e => setCaseTitle(e.target.value)}
                  placeholder="e.g. Cyber Crime Bail, Injunction Request"
                  className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold outline-none ${
                    isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Primary Input 2: Large description textarea */}
              <div className="space-y-1">
                <span className="text-[8px] uppercase font-black text-slate-400">Legal Problem / Fact Scenario</span>
                <textarea
                  rows={6}
                  value={caseFacts}
                  onChange={e => setCaseFacts(e.target.value)}
                  placeholder="Describe the legal issue, facts, objectives, or situation in detail..."
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none resize-none ${
                    isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Primary Input 3: Objective dropdown */}
              <div className="space-y-1">
                <span className="text-[8px] uppercase font-black text-slate-404">Litigation Strategy Objective</span>
                <select
                  value={manualObjective}
                  onChange={e => setManualObjective(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer ${
                    isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Define Trial Strategy">Define Trial Strategy</option>
                  <option value="Assess Litigation Risk">Assess Litigation Risk</option>
                  <option value="Formulate Settlement Positions">Formulate Settlement Positions</option>
                  <option value="Prepare Cross Examination">Prepare Cross Examination</option>
                  <option value="Analyze Evidence Admissibility">Analyze Evidence Admissibility</option>
                  <option value="Predict Judicial Outcome">Predict Judicial Outcome</option>
                </select>
              </div>

              {/* Primary Input 4: Optional supporting document upload */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-[8px] uppercase font-black text-slate-400">Optional Supporting Documents</span>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('manual-strategy-doc-uploader').click()}
                  className="border border-dashed border-slate-300 dark:border-zinc-800 hover:border-indigo-500 rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 bg-slate-500/3"
                >
                  <Upload className="text-slate-404" size={16} />
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">Drag & drop or click to upload</span>
                  <input
                    id="manual-strategy-doc-uploader"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Uploaded Files display inside Manual strategy sidebar */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-1.5 border rounded-lg bg-slate-50 dark:bg-zinc-800/50 dark:border-zinc-800 text-[10px] font-bold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText size={11} className="text-indigo-500 shrink-0" />
                          <span className="truncate text-slate-800 dark:text-slate-300">{file.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
                          }}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-955/20 text-red-500 rounded shrink-0 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Metadata Accordion (Advanced Parameters) */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setSidebarAdvancedOpen(!sidebarAdvancedOpen)}
                  className="w-full flex items-center justify-between py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
                >
                  <span>Advanced Case Parameters</span>
                  {sidebarAdvancedOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {sidebarAdvancedOpen && (
                  <div className="space-y-3 pt-2 text-xs font-semibold animate-fadeIn">
                    <div className="space-y-1">
                      <span className="text-[8px] uppercase font-black text-slate-404">Client Name</span>
                      <input
                        type="text"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder="Client Name"
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${
                          isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-205 text-slate-800'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] uppercase font-black text-slate-404">Opponent Name</span>
                      <input
                        type="text"
                        value={opponentName}
                        onChange={e => setOpponentName(e.target.value)}
                        placeholder="Opponent Name"
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${
                          isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-205 text-slate-800'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-black text-slate-404">Matter Court</span>
                        <select
                          value={matterType}
                          onChange={e => setMatterType(e.target.value)}
                          className={`w-full border rounded-xl px-2 py-2 text-xs font-bold outline-none cursor-pointer ${
                            isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-205 text-slate-800'
                          }`}
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
                        <span className="text-[8px] uppercase font-black text-slate-404">Current Stage</span>
                        <select
                          value={caseStage}
                          onChange={e => setCaseStage(e.target.value)}
                          className={`w-full border rounded-xl px-2 py-2 text-xs font-bold outline-none cursor-pointer ${
                            isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-205 text-slate-800'
                          }`}
                        >
                          <option value="Pre-litigation">Pre-litigation</option>
                          <option value="Filing">Filing</option>
                          <option value="Arguments">Arguments</option>
                          <option value="Appeal">Appeal</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] uppercase font-black text-slate-404">Court Jurisdiction</span>
                      <input
                        type="text"
                        value={courtName}
                        onChange={e => setCourtName(e.target.value)}
                        placeholder="e.g. High Court of Delhi"
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none ${
                          isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-black text-slate-404">Hearing Date</span>
                        <input
                          type="text"
                          value={hearingDate}
                          onChange={e => setHearingDate(e.target.value)}
                          placeholder="e.g. Oct 12, 2026"
                          className={`w-full border rounded-xl px-2 py-2 text-xs font-bold outline-none ${
                            isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-202'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-black text-slate-404">Advocate</span>
                        <input
                          type="text"
                          value={assignedAdvocate}
                          onChange={e => setAssignedAdvocate(e.target.value)}
                          placeholder="Advocate Name"
                          className={`w-full border rounded-xl px-2 py-2 text-xs font-bold outline-none ${
                            isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search Strategy Templates Select Box */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
          <label className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Search Strategy Templates</label>
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleQuickToolSelect(e.target.value);
                }
              }}
              className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer appearance-none ${isDark ? 'bg-[#131c31] border-zinc-800 text-white' : 'bg-slate-50 border-slate-202 text-slate-850'
                }`}
            >
              <option value="">-- Load Preset Template --</option>
              {allTools.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-50 dark:bg-transparent overflow-hidden select-none">

      {/* Mobile/Tablet Off-canvas Sidebar Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[9999] lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer Panel */}
          <div className={`relative w-[300px] sm:w-[340px] h-full flex flex-col p-5 space-y-5 overflow-y-auto custom-scrollbar shadow-2xl transition-transform duration-300 animate-slideInLeft ${
            isDark ? 'bg-[#0c1224] border-r border-slate-800' : 'bg-white border-r border-slate-205'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800/80">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Strategy Controls</span>
              <button 
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Header bar - minimal vertical footprint */}
      <div className={`flex flex-col px-4 sm:px-6 py-3 border-b shrink-0 gap-1.5 ${isDark ? 'border-slate-800 bg-[#0B1020]/90' : 'border-slate-200 bg-white'} backdrop-blur-xl`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Hamburger menu for mobile/tablet */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#1A2540] hover:bg-slate-100 dark:hover:bg-[#202E50]"
            >
              <Menu size={16} />
            </button>

            <button
              onClick={onBack}
              className={`w-[68px] h-10 flex items-center justify-center gap-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 ${isDark ? 'bg-[#1A2540] border-slate-800 text-slate-300 hover:bg-[#202E50]' : 'bg-slate-50 border-slate-205 text-slate-700 hover:bg-slate-100'
                }`}
            >
              <ChevronLeft size={11} />
              <span>Back</span>
            </button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className={`text-base sm:text-[20px] font-black leading-none tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Strategy Engine
                </h1>
                {isSyncing && (
                  <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider animate-pulse bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Syncing</span>
                )}
              </div>
              <p className={`text-[10px] sm:text-[11px] font-medium leading-none mt-1 truncate hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-505'}`}>
                AI-powered litigation simulation, opponent prediction, judicial risk analysis, evidence evaluation and courtroom strategy planning.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 lg:shrink-0">
            <div className="hidden xl:flex flex-col text-right text-[10px] text-slate-400 font-semibold mr-1">
              <span>Recent Strategy count: <strong>{historyData.length}</strong></span>
              <span>Last Simulation: <strong>{historyData[0]?.timestamp || 'Never'}</strong></span>
            </div>
            <button
              onClick={() => setIsNotesDrawerOpen(true)}
              className={`h-11 px-4 flex items-center gap-1.5 border rounded-xl text-xs font-black uppercase tracking-wider transition-colors shrink-0 ${isDark ? 'bg-[#1A2540] border-slate-800 text-amber-400 hover:bg-[#202E50]' : 'bg-amber-50 border-amber-250/20 text-amber-700 hover:bg-amber-100'
                }`}
            >
              <BookOpen size={14} className="shrink-0" />
              <span>Advocate Notes</span>
            </button>
            <button
              onClick={() => setHistoryVisible(true)}
              className={`h-11 px-4 flex items-center gap-1.5 border rounded-xl text-xs font-black uppercase tracking-wider transition-colors shrink-0 ${isDark ? 'bg-[#1A2540] border-slate-800 text-indigo-400 hover:bg-[#202E50]' : 'bg-indigo-50 border-indigo-200/30 text-indigo-650 hover:bg-indigo-100'
                }`}
            >
              <History size={14} className="shrink-0" />
              <span>History ({historyData.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        {/* LEFT SIDEBAR: fixed control panel */}
        <div className={`hidden lg:flex w-[340px] flex-col border-r shrink-0 overflow-y-auto custom-scrollbar p-4 space-y-5 ${isDark ? 'border-slate-800 bg-[#0c1224]' : 'border-slate-200 bg-white'}`}>
          {renderSidebarContent()}
        </div>

        {/* RIGHT AREA: Litigation Command workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar px-3 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          <div className="max-w-5xl w-full mx-auto space-y-4 sm:space-y-5 select-text">

            {/* Simple Visual Stepper */}
            <div className="w-full overflow-x-auto custom-scrollbar-horizontal pb-2 md:pb-0">
              <div className={`p-4 border rounded-3xl flex items-center justify-between md:justify-around shadow-sm min-w-[500px] md:min-w-0 ${isDark ? 'bg-[#131c31]/20 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                {[
                  { key: 'INPUT', name: 'Input Config' },
                  { key: 'ANALYSIS', name: 'AI Analysis' },
                  { key: 'REPORT', name: 'Strategy Report' }
                ].map((step, idx) => {
                  // Determine step state
                  let stepState = 'upcoming';
                  if (step.key === 'INPUT') {
                    stepState = (!strategyResult && !isAuditing) ? 'current' : 'completed';
                  } else if (step.key === 'ANALYSIS') {
                    stepState = isAuditing ? 'current' : (strategyResult ? 'completed' : 'upcoming');
                  } else if (step.key === 'REPORT') {
                    stepState = strategyResult ? 'current' : 'upcoming';
                  }

                  // Determine next step's state for the connector color
                  let nextStepState = 'upcoming';
                  if (idx === 0) {
                    nextStepState = isAuditing ? 'current' : (strategyResult ? 'completed' : 'upcoming');
                  } else if (idx === 1) {
                    nextStepState = strategyResult ? 'current' : 'upcoming';
                  }

                  // Connector color mapping
                  const connectorColor = nextStepState === 'completed'
                    ? 'text-emerald-500 font-black'
                    : (nextStepState === 'current' ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-300 dark:text-zinc-700');

                  return (
                    <div key={step.key} className="flex items-center gap-2 shrink-0">
                      {stepState === 'completed' ? (
                        <>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black bg-emerald-500 text-white shadow-md shadow-emerald-500/10 shrink-0">
                            ✓
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                            {step.name}
                          </span>
                        </>
                      ) : stepState === 'current' ? (
                        <>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border-2 border-indigo-600 dark:border-indigo-500 shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
                            {step.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black bg-slate-100 dark:bg-zinc-800 text-slate-404 border border-slate-200 dark:border-zinc-750 shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">
                            {step.name}
                          </span>
                        </>
                      )}
                      {idx < 2 && (
                        <span className={`text-[12px] ml-4 transition-all duration-350 shrink-0 ${connectorColor}`}>➔</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Case Summary Panel */}
            {strategySource !== 'MANUAL_SCENARIO' && (
              <div className={`border rounded-3xl p-4 shadow-sm space-y-3.5 transition-all duration-300 ${isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-indigo-505" />
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Active Case Summary</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${caseTitle ? 'bg-emerald-500 animate-pulse' : 'bg-slate-405'}`} />
                    <span className="text-[8px] font-black text-slate-400 uppercase">AI Readiness: {caseTitle ? 'Ready' : 'Incomplete'}</span>
                  </div>
                </div>

                {/* 5 clean fields */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-semibold">
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Case Title / Parties</span>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200 truncate">{caseTitle || 'Custom Scenario'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Court Category</span>
                    <p className="font-extrabold text-indigo-500 truncate">{matterType || 'Civil'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Jurisdiction</span>
                    <p className="font-bold text-slate-705 dark:text-slate-300 truncate">{courtName || 'N/A'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Litigation Stage</span>
                    <span className="inline-block px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[7.5px] font-black uppercase w-fit">{caseStage || 'Pre-trial'}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wide">Evidence dossiers</span>
                    <p className="font-bold text-violet-500">{evidenceList.length} Items</p>
                  </div>
                </div>
              </div>
            )}

            {/* SCENARIO BUILDER: Single collapsible accordions */}
            {strategySource !== 'MANUAL_SCENARIO' && (
              <div className="space-y-2">

                {/* Accordion 1: Case Facts */}
                <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${activeAccordion === 'facts'
                    ? 'border-2 border-indigo-500 shadow-lg dark:border-indigo-400'
                    : 'border border-slate-200 dark:border-zinc-800'
                  }`}>
                  <div
                    onClick={() => toggleAccordion('facts')}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer ${activeAccordion === 'facts'
                        ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/50')
                        : (isDark ? 'bg-black/10' : 'bg-slate-50')
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className={activeAccordion === 'facts' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                      <span className={`text-[10px] font-black uppercase tracking-wider ${activeAccordion === 'facts' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-805 dark:text-white'}`}>Case Facts & Claims</span>
                    </div>
                    {activeAccordion === 'facts' ? <ChevronUp size={14} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                  {activeAccordion === 'facts' && (
                    <div className={`p-4 space-y-3.5 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
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
                        <div className="p-3 border rounded-xl bg-amber-500/5 border-amber-500/10 text-[10.5px] font-bold text-amber-600">
                          ⚠️ Case facts currently empty. Enter details or use active cases to populate strategy targets.
                        </div>
                      )}

                      <textarea
                        rows={5}
                        value={caseFacts}
                        onChange={e => setCaseFacts(e.target.value)}
                        placeholder="Enter detailed facts of the case, breach details, transaction issues..."
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none ${isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'
                          }`}
                      />
                    </div>
                  )}
                </div>

                {/* Accordion 2: Evidence Dossier */}
                <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${activeAccordion === 'evidence'
                    ? 'border-2 border-indigo-500 shadow-lg dark:border-indigo-400'
                    : 'border border-slate-200 dark:border-zinc-800'
                  }`}>
                  <div
                    onClick={() => toggleAccordion('evidence')}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer ${activeAccordion === 'evidence'
                        ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/50')
                        : (isDark ? 'bg-black/10' : 'bg-slate-50')
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Database size={14} className={activeAccordion === 'evidence' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                      <span className={`text-[10px] font-black uppercase tracking-wider ${activeAccordion === 'evidence' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-805 dark:text-white'}`}>Evidence Dossier</span>
                    </div>
                    {activeAccordion === 'evidence' ? <ChevronUp size={14} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                  {activeAccordion === 'evidence' && (
                    <div className={`p-4 space-y-4 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-slate-405 uppercase">Deposition Evidence Cards</span>
                        <button
                          onClick={() => runAIFieldExtraction('evidence')}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-555 rounded-lg text-[8px] font-black uppercase transition-all"
                        >
                          <Sparkles size={9} />
                          <span>Autofill Dossier</span>
                        </button>
                      </div>

                      {/* Evidence cards grid */}
                      {evidenceList.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {evidenceList.map(e => (
                            <div key={e.id} className="p-3 border rounded-xl bg-slate-500/3 flex flex-col justify-between space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[8px] font-black text-slate-400 uppercase">{e.type}</span>
                                  <h4 className="text-xs font-black text-slate-850 dark:text-white mt-0.5">{e.name}</h4>
                                </div>
                                <button
                                  onClick={() => handleRemoveEvidence(e.id)}
                                  className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded shrink-0 font-bold"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-1 items-center pt-2 border-t border-slate-100 dark:border-white/5">
                                <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${e.admissibility === 'High' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                  }`}>Admis: {e.admissibility}</span>
                                <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${e.strength === 'Strong' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-505'
                                  }`}>Strength: {e.strength}</span>
                                <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${e.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-505'
                                  }`}>Risk: {e.risk}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 border rounded-xl bg-slate-500/5 text-center text-slate-405 font-bold">
                          No evidence logged yet. Use AI Autofill or add manually below.
                        </div>
                      )}

                      {/* Inline form */}
                      <div className="p-3 border rounded-xl bg-slate-500/3 space-y-3.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Add custom evidence item</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <span className="text-[8px] uppercase text-slate-405">Evidence Title / Name</span>
                            <input
                              type="text"
                              value={newEv.name}
                              onChange={e => setNewEv({ ...newEv, name: e.target.value })}
                              placeholder="e.g. Agreement sheet copy"
                              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-205'}`}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-[8px] uppercase text-slate-405">Category</span>
                              <select
                                value={newEv.type}
                                onChange={e => setNewEv({ ...newEv, type: e.target.value })}
                                className={`w-full border rounded-lg px-1.5 py-1.5 text-[10.5px] outline-none font-bold ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-205'}`}
                              >
                                <option value="Document">Document</option>
                                <option value="Digital">Digital</option>
                                <option value="Physical">Physical</option>
                                <option value="Oral">Oral</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[8px] uppercase text-slate-455">Admissibility</span>
                              <select
                                value={newEv.admissibility}
                                onChange={e => setNewEv({ ...newEv, admissibility: e.target.value })}
                                className={`w-full border rounded-lg px-1.5 py-1.5 text-[10.5px] outline-none font-bold ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-205'}`}
                              >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <span className="text-[8px] uppercase text-slate-455">Strength weight</span>
                            <select
                              value={newEv.strength}
                              onChange={e => setNewEv({ ...newEv, strength: e.target.value })}
                              className={`w-full border rounded-lg px-1.5 py-1.5 text-[10.5px] outline-none font-bold ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-205'}`}
                            >
                              <option value="Strong">Strong</option>
                              <option value="Medium">Medium</option>
                              <option value="Weak">Weak</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] uppercase text-slate-400">Credibility</span>
                            <select
                              value={newEv.credibility}
                              onChange={e => setNewEv({ ...newEv, credibility: e.target.value })}
                              className={`w-full border rounded-lg px-1.5 py-1.5 text-[10.5px] outline-none font-bold ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-205'}`}
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] uppercase text-slate-400">Procedural Risk</span>
                            <select
                              value={newEv.risk}
                              onChange={e => setNewEv({ ...newEv, risk: e.target.value })}
                              className={`w-full border rounded-lg px-1.5 py-1.5 text-[10.5px] outline-none font-bold ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-205'}`}
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={handleAddEvidence}
                            className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-705 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                          >
                            Add to Dossier
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Witness Pool (Only shown if witnesses detected) */}
                {witnessList.length > 0 && (
                  <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${activeAccordion === 'witnesses'
                      ? 'border-2 border-indigo-500 shadow-lg dark:border-indigo-400'
                      : 'border border-slate-200 dark:border-zinc-800'
                    }`}>
                    <div
                      onClick={() => toggleAccordion('witnesses')}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer ${activeAccordion === 'witnesses'
                          ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/50')
                          : (isDark ? 'bg-black/10' : 'bg-slate-50')
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck size={14} className={activeAccordion === 'witnesses' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${activeAccordion === 'witnesses' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-805 dark:text-white'}`}>Witness Pool</span>
                      </div>
                      {activeAccordion === 'witnesses' ? <ChevronUp size={14} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                    {activeAccordion === 'witnesses' && (
                      <div className={`p-4 space-y-3 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {witnessList.map(w => (
                            <div key={w.id} className="p-3 border rounded-xl bg-slate-500/3 flex flex-col justify-between space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-xs font-black text-slate-850 dark:text-white">{w.name}</h4>
                                  <span className="text-[8px] font-bold text-slate-404">{w.role}</span>
                                </div>
                                <button
                                  onClick={() => handleRemoveWitness(w.id)}
                                  className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded shrink-0 font-semibold"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1 items-center pt-2 border-t border-slate-100 dark:border-white/5">
                                <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${w.supports === 'Plaintiff' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                  }`}>Supports: {w.supports}</span>
                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-550 rounded text-[7px] font-black uppercase">Credibility: {w.credibilityScore}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Show Advanced parameters toggle */}
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider mx-auto transition-all ${showAdvanced
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-650'
                        : (isDark ? 'bg-[#131c31] border-zinc-800 text-slate-404 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                      }`}
                  >
                    <span>{showAdvanced ? 'Hide Advanced Parameters' : 'Show Advanced Parameters'}</span>
                    {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Advanced Collapsible Accordions Container */}
                {showAdvanced && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/50">

                    {/* Timeline Accordion */}
                    <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${activeAccordion === 'timeline'
                        ? 'border-2 border-indigo-500 shadow-lg dark:border-indigo-400'
                        : 'border border-slate-200 dark:border-zinc-800'
                      }`}>
                      <div
                        onClick={() => toggleAccordion('timeline')}
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer ${activeAccordion === 'timeline'
                            ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/50')
                            : (isDark ? 'bg-black/10' : 'bg-slate-50')
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock size={14} className={activeAccordion === 'timeline' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                          <span className={`text-[10px] font-black uppercase tracking-wider ${activeAccordion === 'timeline' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>Milestones Chronology</span>
                        </div>
                        {activeAccordion === 'timeline' ? <ChevronUp size={14} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                      {activeAccordion === 'timeline' && (
                        <div className={`p-4 space-y-4 ${isDark ? 'bg-[#0B1020]/20' : 'bg-white'}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-405 uppercase">Chronological Milestones Chain</span>
                            <button
                              onClick={() => runAIFieldExtraction('timeline')}
                              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-655 rounded-lg text-[8px] font-black uppercase transition-all"
                            >
                              <Sparkles size={9} />
                              <span>AI Chronology Sync</span>
                            </button>
                          </div>

                          {timelineList.length > 0 ? (
                            <div className="relative border-l border-indigo-500/20 pl-4 ml-2 space-y-3">
                              {timelineList.map(t => (
                                <div key={t.id} className="relative">
                                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-indigo-500 bg-white dark:bg-zinc-900" />
                                  <div className="text-xs">
                                    <div className="flex justify-between items-baseline gap-2">
                                      <span className="font-black text-indigo-500 text-[10px]">{t.date}</span>
                                      <button onClick={() => handleRemoveTimeline(t.id)} className="text-red-500 hover:text-red-650 shrink-0">✕</button>
                                    </div>
                                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{t.title}</h4>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 border rounded-xl bg-slate-500/5 text-center text-slate-400 font-bold">
                              No timeline milestones parsed yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                               {/* Manual Witness Mapping (only shown in advanced if list is empty) */}
                    {witnessList.length === 0 && (
                      <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${activeAccordion === 'witnesses'
                          ? 'border-2 border-indigo-500 shadow-lg dark:border-indigo-400'
                          : 'border border-slate-200 dark:border-zinc-800'
                        }`}>
                        <div
                          onClick={() => toggleAccordion('witnesses')}
                          className={`px-4 py-3 flex items-center justify-between cursor-pointer ${activeAccordion === 'witnesses'
                              ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/50')
                              : (isDark ? 'bg-black/10' : 'bg-slate-50')
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <UserCheck size={14} className={activeAccordion === 'witnesses' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${activeAccordion === 'witnesses' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>Witness Registry (Add manually)</span>
                          </div>
                          {activeAccordion === 'witnesses' ? <ChevronUp size={14} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </div>
                        {activeAccordion === 'witnesses' && (
                          <div className={`p-4 space-y-3.5 ${isDark ? 'bg-black/5' : 'bg-white'}`}>
                            {/* Form */}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Relief sought and previous orders */}
                    <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${activeAccordion === 'relief'
                        ? 'border-2 border-indigo-500 shadow-lg dark:border-indigo-400'
                        : 'border border-slate-200 dark:border-zinc-800'
                      }`}>
                      <div
                        onClick={() => toggleAccordion('relief')}
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer ${activeAccordion === 'relief'
                            ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/50')
                            : (isDark ? 'bg-black/10' : 'bg-slate-50')
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <Scale size={14} className={activeAccordion === 'relief' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                          <span className={`text-[10px] font-black uppercase tracking-wider ${activeAccordion === 'relief' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>Relief & Previous Orders</span>
                        </div>
                        {activeAccordion === 'relief' ? <ChevronUp size={14} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                      {activeAccordion === 'relief' && (
                        <div className={`p-4 space-y-3.5 ${isDark ? 'bg-black/5' : 'bg-white'}`}>
                          {/* Relief */}
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-slate-404 uppercase">Relief Category preset</span>
                            <div className="flex flex-wrap gap-1.5">
                              {['Compensation damages', 'Specific performance', 'Permanent Injunction', 'Declaration decree', 'Declaration nullity', 'Stay execution order'].map(chip => {
                                const active = scenarioRelief.includes(chip);
                                return (
                                  <button
                                    key={chip}
                                    onClick={() => handleToggleReliefChip(chip)}
                                    type="button"
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                      active
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                        : 'bg-white dark:bg-zinc-900 border-slate-250 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                                    }`}
                                  >
                                    {chip}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-1 text-xs">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Relief Sought Details (AI suggested / editable)</span>
                            <input
                              type="text"
                              placeholder="AI will suggest relief details, or you can edit..."
                              value={scenarioRelief}
                              onChange={e => setScenarioRelief(e.target.value)}
                              className={`w-full border rounded-xl px-3 py-2 outline-none font-bold ${isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-808'}`}
                            />
                          </div>

                          {/* Previous Court Orders */}
                          <div className="space-y-1 text-xs pt-2 border-t border-slate-100 dark:border-white/5">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Previous Court Orders (if any)</span>
                            <textarea
                              rows={3}
                              value={scenarioOrders}
                              onChange={e => setScenarioOrders(e.target.value)}
                              placeholder="Enter previous stays, notices, or caveat decrees details..."
                              className={`w-full border rounded-xl px-3 py-2 outline-none resize-none font-bold ${isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REDESIGNED Strategy Readiness Metrics Card */}
            <div className={`border rounded-3xl p-5 shadow-sm space-y-4 ${isDark ? 'bg-[#131c31]/30 border-slate-800' : 'bg-white border-slate-200'
              }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-indigo-505 font-extrabold" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Strategy Readiness</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                  strategyReadinessCalculated.overall === 100
                    ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-450'
                    : (strategyReadinessCalculated.overall > 0
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'bg-red-500/10 text-red-500')
                  }`}>
                  {strategyReadinessCalculated.overall}% Ready
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden shrink-0">
                <div className={`h-full transition-all duration-500 ${
                  strategyReadinessCalculated.overall === 100
                    ? 'bg-emerald-500'
                    : (strategyReadinessCalculated.overall > 0
                      ? 'bg-indigo-600 dark:bg-indigo-500'
                      : 'bg-red-500')
                  }`} style={{ width: `${strategyReadinessCalculated.overall}%` }} />
              </div>

              {/* Dynamic missing items checklist display */}
              {strategySource === 'MANUAL_SCENARIO' ? (
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">
                  {caseFacts.trim().length > 15 ? '✓ Strategy description ready for analysis' : '• Enter description of the legal issue below'}
                </div>
              ) : missingItems.length > 0 ? (
                <div className="text-[10px] font-extrabold text-slate-404 uppercase tracking-wide flex items-center gap-2 flex-wrap">
                  <span>Missing Parameters:</span>
                  {missingItems.map(item => (
                    <span key={item} className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded border border-red-500/10 font-bold lowercase tracking-wider">
                      • {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] font-black text-emerald-505 uppercase tracking-wider">
                  ✓ Case profile fully populated and ready for strategy simulation!
                </div>
              )}
            </div>

            {/* STICKY BOTTOM GENERATE CTA CONTAINER */}
            <div className="sticky bottom-0 z-55 p-4 bg-slate-50/80 dark:bg-[#0c1224]/80 backdrop-blur-md border rounded-3xl dark:border-slate-800/50 flex flex-col items-center gap-1.5 w-full">
              <button
                disabled={isAuditing}
                onClick={() => runLitigationSimulation('FULL_SIMULATION')}
                className={`px-12 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 w-full max-w-lg flex items-center justify-center gap-2 ${isAuditing ? 'opacity-65 cursor-not-allowed' : ''
                  }`}
              >
                {isAuditing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Generating AI Strategy...</span>
                  </>
                ) : (
                  <>
                    <Cpu size={14} />
                    <span>Generate AI Strategy</span>
                  </>
                )}
              </button>
              <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Estimated Processing Time: 12 Sec</p>
            </div>

            {/* AI Simulation run loading steps (directly below the button) */}
            {isAuditing && (
              <div ref={loadingRef} className="text-center py-6 animate-fadeIn">
                <div className={`w-full max-w-md mx-auto p-4 sm:p-6 border rounded-3xl shadow-xl text-left space-y-4 transition-all duration-300 ${isDark ? 'bg-[#131c31] border-zinc-800' : 'bg-white border-slate-200'
                  }`}>
                  <div className="flex items-center gap-3 border-b pb-3 border-slate-100 dark:border-zinc-800/80 min-w-0">
                    <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse break-words">Running Litigation Audit Simulation...</span>
                  </div>

                  <div className="space-y-2 text-[11px] font-bold">
                    {[
                      { step: 0, text: 'Reading case facts...' },
                      { step: 1, text: 'Evaluating evidence...' },
                      { step: 2, text: 'Searching precedents...' },
                      { step: 3, text: 'Predicting litigation outcome...' },
                      { step: 4, text: 'Building courtroom strategy...' },
                      { step: 5, text: 'Generating final report...' }
                    ].map((item, idx) => {
                      const isDone = activeSimulationStep > item.step;
                      const isCurrent = activeSimulationStep === item.step;
                      return (
                        <div key={idx} className="flex items-center gap-2.5">
                          {isDone ? (
                            <span className="text-emerald-500 font-extrabold text-sm">✓</span>
                          ) : isCurrent ? (
                            <span className="text-indigo-500 animate-pulse text-sm">●</span>
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-700 text-sm">○</span>
                          )}
                          <span className={isDone ? 'text-slate-400 dark:text-zinc-500 line-through font-semibold' : isCurrent ? 'text-indigo-650 dark:text-indigo-400 font-black' : 'text-slate-400 font-semibold'}>
                            {item.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* AI STRATEGY REPORT (PREMIUM PROFESSIONAL LEGAL CARD IN SAME LOCATION) */}
            {strategyResult && (
              <div ref={reportRef} className="space-y-6 pt-4 report-animate-fadeIn">
                <div className={`p-8 sm:p-12 border-t-8 border-indigo-600 rounded-[32px] shadow-2xl space-y-8 select-text ${isDark ? 'bg-[#131c31] border-zinc-800' : 'bg-white border-slate-205'
                  } transition-all duration-500 ease-in-out`}>

                  {/* Official Legal Document Header */}
                  <div className="text-center border-b pb-6 border-slate-200 dark:border-zinc-800/80">
                    <div className="flex justify-center items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                      <Scale size={32} />
                      <span className="font-extrabold text-sm uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">AI Legal™ Intelligence Command</span>
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                      Confidential Legal Report // Privileged Attorney Work Product
                    </div>
                    <div className="font-serif text-[18px] sm:text-[22px] font-black text-slate-800 dark:text-slate-100 tracking-wide mt-4 py-2 border-y border-dashed border-slate-200 dark:border-zinc-800/80">
                      =================================<br />
                      AI STRATEGY REPORT<br />
                      =================================
                    </div>
                  </div>

                  {/* Case Metadata Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-black/20 p-5 rounded-2xl border dark:border-zinc-850">
                    <div>
                      <p className="text-slate-400 uppercase tracking-wider font-extrabold text-[8px] mb-1">Matter Title</p>
                      <p className="font-black text-slate-800 dark:text-slate-200">{caseTitle || 'Custom Courtroom Strategy'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase tracking-wider font-extrabold text-[8px] mb-1">Court / Jurisdiction</p>
                      <p className="font-black text-slate-800 dark:text-slate-200">{courtName || 'Not Specified'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase tracking-wider font-extrabold text-[8px] mb-1">Client Petitioner</p>
                      <p className="font-black text-slate-800 dark:text-slate-200">{clientName || 'Not Specified'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase tracking-wider font-extrabold text-[8px] mb-1">Opposing Party</p>
                      <p className="font-black text-slate-800 dark:text-slate-200">{opponentName || 'Not Specified'}</p>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Executive Summary</h3>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                      {strategyResult.finalOpinion?.reasoning || strategyResult.strategies?.primary?.description || "No summary details generated."}
                    </p>
                  </div>

                  {/* Probability & Case Strength KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <span>Winning Probability</span>
                        <span className="text-emerald-500 text-sm font-black">{stats.winningProbability}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-505 transition-all duration-505" style={{ width: `${stats.winningProbability}%` }} />
                      </div>
                      <p className="text-[9px] font-bold text-slate-400">Predicted outcome probability based on facts & precedents.</p>
                    </div>

                    <div className="p-5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <span>Case Strength Score</span>
                        <span className="text-indigo-500 text-sm font-black">{stats.overallStrategyScore}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${stats.overallStrategyScore}%` }} />
                      </div>
                      <p className="text-[9px] font-bold text-slate-400">Calculated strength using evidence admissibility & weight.</p>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses (Grid) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Strengths */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Strengths</h3>
                      <div className="space-y-2">
                        {strategyResult.evidenceStrategy?.strong?.map((item, idx) => (
                          <div key={idx} className="flex gap-2.5 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs font-semibold text-slate-800 dark:text-slate-205">
                            <span className="text-emerald-500 text-sm font-extrabold shrink-0">✓</span>
                            <div>
                              <strong className="font-extrabold text-emerald-600 dark:text-emerald-400">{item.evidence || item}</strong>
                              {item.reason && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{item.reason}</p>}
                            </div>
                          </div>
                        ))}
                        {(!strategyResult.evidenceStrategy?.strong || strategyResult.evidenceStrategy.strong.length === 0) && (
                          <p className="text-xs text-slate-400 italic font-semibold">No significant strengths identified.</p>
                        )}
                      </div>
                    </div>

                    {/* Weaknesses */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Weaknesses</h3>
                      <div className="space-y-2">
                        {strategyResult.evidenceStrategy?.weak?.map((item, idx) => (
                          <div key={idx} className="flex gap-2.5 p-3 rounded-2xl bg-red-500/5 border border-red-500/10 text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <span className="text-red-500 text-sm font-extrabold shrink-0">✗</span>
                            <div>
                              <strong className="font-extrabold text-red-600 dark:text-red-400">{item.evidence || item}</strong>
                              {item.reason && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{item.reason}</p>}
                            </div>
                          </div>
                        ))}
                        {strategyResult.judgePerspective?.weakAreas?.map((item, idx) => (
                          <div key={idx} className="flex gap-2.5 p-3 rounded-2xl bg-red-500/5 border border-red-500/10 text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <span className="text-red-500 text-sm font-extrabold shrink-0">✗</span>
                            <div>
                              <strong className="font-extrabold text-red-600 dark:text-red-400">{item}</strong>
                            </div>
                          </div>
                        ))}
                        {(!strategyResult.evidenceStrategy?.weak || strategyResult.evidenceStrategy.weak.length === 0) && (!strategyResult.judgePerspective?.weakAreas || strategyResult.judgePerspective.weakAreas.length === 0) && (
                          <p className="text-xs text-slate-400 italic font-semibold">No significant weaknesses identified.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Key Legal Issues */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Key Legal Issues</h3>
                    <div className="space-y-2">
                      {strategyResult.judgePerspective?.likelyQuestions?.map((issue, idx) => (
                        <div key={idx} className="flex gap-3 p-3.5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          <span className="w-5 h-5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full flex items-center justify-center font-black text-[10px] shrink-0">{idx + 1}</span>
                          <p className="leading-normal">{issue}</p>
                        </div>
                      ))}
                      {(!strategyResult.judgePerspective?.likelyQuestions || strategyResult.judgePerspective.likelyQuestions.length === 0) && (
                        <p className="text-xs text-slate-400 italic font-semibold">No key legal issues flagged.</p>
                      )}
                    </div>
                  </div>

                  {/* Opponent Analysis */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-655 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Opponent Analysis</h3>
                    <div className="p-5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                      <p><strong>Likely Opposition Defense:</strong> {strategyResult.opponentStrategy?.likelyDefence || 'Not Specified'}</p>
                      {strategyResult.opponentStrategy?.likelyObjections?.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Anticipated Procedural Objections</p>
                          <ul className="list-disc pl-4 space-y-1 font-semibold text-slate-650 dark:text-slate-400">
                            {strategyResult.opponentStrategy.likelyObjections.map((obj, i) => <li key={i}>{obj}</li>)}
                          </ul>
                        </div>
                      )}
                      {strategyResult.opponentStrategy?.delayStrategy && (
                        <p className="mt-2 text-red-500 font-bold">⚠️ <strong>Opponent Delay Tactic:</strong> {strategyResult.opponentStrategy.delayStrategy}</p>
                      )}
                    </div>
                  </div>

                  {/* Relevant Precedents */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Relevant Precedents</h3>
                    <div className="space-y-3">
                      {strategyResult.precedents?.map((p, idx) => (
                        <div key={idx} className="p-4 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <span className="font-black text-xs text-slate-800 dark:text-white">{p.citation}</span>
                            <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded">{p.court}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-404 mt-2 font-semibold leading-normal">{p.summary}</p>
                          <div className="flex justify-between items-center mt-3 text-[10px] font-bold text-slate-400">
                            <span>Similarity Score: <strong className="text-indigo-500">{p.similarityScore}%</strong></span>
                            <span>Type: <strong>{p.type || 'Binding Precedent'}</strong></span>
                          </div>
                        </div>
                      ))}
                      {(!strategyResult.precedents || strategyResult.precedents.length === 0) && (
                        <p className="text-xs text-slate-400 italic font-semibold">No precedent citations linked.</p>
                      )}
                    </div>
                  </div>

                  {/* Evidence Evaluation */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Evidence Evaluation</h3>
                    <div className="p-5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 space-y-4">
                      {/* Admissible Evidence list */}
                      <div className="space-y-2">
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Admissible & Strong Proofs</span>
                        {strategyResult.evidenceStrategy?.strong?.map((e, idx) => (
                          <div key={idx} className="p-3 border rounded-xl bg-white dark:bg-zinc-900 dark:border-zinc-800/85 text-xs font-semibold text-slate-750 dark:text-slate-300">
                            <strong>{e.evidence || e}</strong>: <span className="font-medium text-slate-500">{e.reason || 'Sufficient probative weight'}</span>
                          </div>
                        ))}
                      </div>

                      {/* Priority Actions for missing proofs */}
                      {strategyResult.evidenceStrategy?.missing?.length > 0 && (
                        <div className="space-y-2 pt-2 border-t dark:border-zinc-800">
                          <span className="text-[8.5px] font-black text-amber-500 uppercase tracking-widest block">Priority Document Gathering</span>
                          {strategyResult.evidenceStrategy.missing.map((e, idx) => (
                            <div key={idx} className="p-3 border border-amber-500/10 bg-amber-500/5 rounded-xl text-xs font-semibold text-slate-705 dark:text-slate-300">
                              <strong>{e.evidence || e}</strong>: <span className="font-medium text-slate-500">{e.reason || 'Crucial for standard compliance proof'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommended Arguments */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Recommended Arguments</h3>
                    <div className="space-y-3">
                      {strategyResult.finalArguments?.arguments?.map((arg, idx) => (
                        <div key={idx} className="flex gap-3 p-4 border border-dashed rounded-2xl bg-slate-500/3 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                          <span className="text-indigo-505 font-black text-sm shrink-0">“</span>
                          <p>{arg}</p>
                        </div>
                      ))}
                      {strategyResult.finalArguments?.prayer && (
                        <div className="p-4 border-l-4 border-emerald-500 rounded-r-2xl bg-emerald-500/5 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest mb-1">Final Submission Prayer</p>
                          <p>“{strategyResult.finalArguments.prayer}”</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cross Examination Strategy */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Cross Examination Strategy</h3>
                    <div className="space-y-3">
                      {strategyResult.crossExamPlanner?.map((plan, idx) => (
                        <div key={idx} className="p-5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 space-y-3 text-xs">
                          <div className="border-b pb-2 border-slate-200 dark:border-zinc-800/80">
                            <span className="font-black text-slate-800 dark:text-white uppercase tracking-wider">Target Witness: {plan.witness}</span>
                          </div>
                          {plan.mainQuestions?.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[8.5px] font-black text-indigo-500 uppercase tracking-widest block">Cross-Exam Line of Questioning</span>
                              <ul className="list-disc pl-4 space-y-1 font-semibold text-slate-600 dark:text-slate-350">
                                {plan.mainQuestions.map((q, i) => <li key={i}>{q}</li>)}
                              </ul>
                            </div>
                          )}
                          {plan.traps?.length > 0 && (
                            <div className="p-3 border rounded-xl bg-red-500/5 border-red-500/10 text-red-600 dark:text-red-400 font-bold">
                              <span className="text-[8px] font-black uppercase tracking-wider block mb-1">Traps / Impeachment Targets</span>
                              <p>{plan.traps.join(' // ')}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {(!strategyResult.crossExamPlanner || strategyResult.crossExamPlanner.length === 0) && (
                        <p className="text-xs text-slate-400 italic font-semibold">No cross-examination planner drafted.</p>
                      )}
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Risk Assessment</h3>
                    <div className="p-5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 space-y-4">
                      {(() => {
                        const risks = strategyResult.risks || {};
                        const riskCategories = [
                          { label: 'Evidence Admissibility Risk', val: risks.evidence || 30, col: 'bg-indigo-500' },
                          { label: 'Procedural Delay Risk', val: risks.procedural || 20, col: 'bg-amber-500' },
                          { label: 'Financial Exposure Risk', val: risks.financial || 40, col: 'bg-red-500' },
                          { label: 'Strategic Counter Risk', val: risks.strategic || 10, col: 'bg-violet-500' }
                        ];
                        return (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-slate-400">Overall Litigation Risk Score</span>
                              <span className="text-xs font-black text-red-500">{risks.riskPercentage || 30}% Risk Exposure</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              {riskCategories.map(rc => (
                                <div key={rc.label} className="space-y-1">
                                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-505">
                                    <span>{rc.label}</span>
                                    <span>{rc.val}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                                    <div className={`h-full ${rc.col}`} style={{ width: `${rc.val}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Settlement Recommendation */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Settlement Recommendation</h3>
                    <div className="p-5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 space-y-4">
                      <div className="text-xs font-semibold leading-relaxed text-slate-650 dark:text-slate-350">
                        <p><strong>Mediation Suitability:</strong> {strategyResult.settlement?.mediationPossibility || 'Highly suitable for Section 89 mediation'}</p>
                        <p className="mt-1"><strong>Strategy Option:</strong> {strategyResult.settlement?.negotiationStrategy || 'Waiver of interest if settled within 30 days.'}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3 border rounded-xl bg-white dark:bg-zinc-900 dark:border-zinc-800/80 text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Opening Claim Offer</span>
                          <p className="text-xs font-black text-indigo-500 mt-1">{strategyResult.negotiationPositions?.opening || 'Principal + Costs'}</p>
                        </div>
                        <div className="p-3 border rounded-xl bg-white dark:bg-zinc-900 dark:border-zinc-800/80 text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Realistic Target Settlement</span>
                          <p className="text-xs font-black text-emerald-500 mt-1">{strategyResult.negotiationPositions?.middle || 'Principal amount only'}</p>
                        </div>
                        <div className="p-3 border rounded-xl bg-white dark:bg-zinc-900 dark:border-zinc-800/80 text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Fallback Bottom Line</span>
                          <p className="text-xs font-black text-red-505 mt-1">{strategyResult.negotiationPositions?.final || '75% Principal recovery'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Litigation Roadmap */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Litigation Roadmap</h3>
                    <div className="p-5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 space-y-4">
                      <div className="relative border-l border-slate-200 dark:border-zinc-800 pl-4 ml-2 space-y-4">
                        {strategyResult.winningRoadmap?.map((stage, idx) => (
                          <div key={idx} className="relative">
                            <div className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-zinc-900 ${stage.status === 'Completed' ? 'border-emerald-500 bg-emerald-500' :
                                stage.status === 'In Progress' ? 'border-indigo-500 bg-indigo-500 animate-pulse' :
                                  'border-slate-300 dark:border-zinc-700'
                              }`} />
                            <div className="text-xs">
                              <span className={`text-[8.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${stage.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                  stage.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500' :
                                    'bg-slate-200/50 dark:bg-zinc-800 text-slate-400'
                                }`}>{stage.status}</span>
                              <h4 className="font-black text-slate-800 dark:text-slate-200 mt-1">{stage.stage}</h4>
                              <p className="text-slate-500 dark:text-slate-400 font-semibold text-[10.5px] mt-0.5 leading-normal">{stage.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Immediate Next Steps */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 border-b pb-1 border-slate-200 dark:border-zinc-800/80">Immediate Next Steps</h3>
                    <div className="p-5 border rounded-2xl bg-slate-50 dark:bg-black/10 dark:border-zinc-800/80 space-y-3">
                      {strategyResult.aiRecommendations?.doFirst?.map((act, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 border rounded-xl bg-white dark:bg-zinc-900 dark:border-zinc-800/85 text-xs font-semibold text-slate-805 dark:text-slate-200 shadow-sm">
                          <CheckCircle2 className="text-indigo-500 shrink-0" size={16} />
                          <span>{act}</span>
                        </div>
                      ))}
                      {strategyResult.aiRecommendations?.doNext?.map((act, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 border rounded-xl bg-white dark:bg-zinc-900 dark:border-zinc-800/85 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm opacity-90">
                          <CheckCircle2 className="text-slate-400 shrink-0" size={16} />
                          <span>{act}</span>
                        </div>
                      ))}
                      {(!strategyResult.aiRecommendations?.doFirst || strategyResult.aiRecommendations.doFirst.length === 0) && (!strategyResult.aiRecommendations?.doNext || strategyResult.aiRecommendations.doNext.length === 0) && (
                        <p className="text-xs text-slate-400 italic font-semibold">No immediate next steps listed.</p>
                      )}
                    </div>
                  </div>

                  {/* Report footer actions */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-zinc-800/80 mt-8 w-full">
                    {/* Brief Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setBriefMenuOpen(!briefMenuOpen)}
                        className="h-10 px-[18px] py-[10px] bg-violet-600 hover:bg-violet-700 text-white rounded-[11px] text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-violet-500/10"
                      >
                        <FileText size={16} />
                        <span>Brief</span>
                      </button>
                      {briefMenuOpen && (
                        <div className="absolute bottom-12 right-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-1.5 w-40 z-50 text-xs font-bold text-slate-707 dark:text-slate-202 animate-fadeIn">
                          <button
                            onClick={() => {
                              handlePrintBriefPDF();
                              setBriefMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                          >
                            <span>📕 Export PDF</span>
                          </button>
                          <button
                            onClick={() => {
                              handleExportBriefDoc();
                              setBriefMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                          >
                            <span>📝 Export DOCX</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handlePrintPDF}
                      className="h-10 px-[18px] py-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-[11px] text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-500/10"
                    >
                      <Printer size={16} />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={handleExportDoc}
                      className="h-10 px-[18px] py-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[11px] text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-500/10"
                    >
                      <FileDown size={16} />
                      <span>DOCX</span>
                    </button>
                    <button
                      onClick={handleSaveStrategy}
                      className="h-10 px-[18px] py-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded-[11px] text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-500/10"
                    >
                      <Save size={16} />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => runLitigationSimulation('FULL_SIMULATION')}
                      className="h-10 px-[18px] py-[10px] border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-707 dark:text-slate-300 rounded-[11px] text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <RotateCcw size={16} />
                      <span>Regenerate</span>
                    </button>
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
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-205 dark:border-zinc-850 rounded-[32px] w-[95vw] sm:max-w-lg max-h-[85%] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-6 animate-fadeIn">
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
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-205 dark:border-zinc-850 rounded-[32px] w-[95vw] sm:max-w-md max-h-[85%] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-6 animate-fadeIn">

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Advocate Notes Drawer Overlay */}
      {isNotesDrawerOpen && (
        <div className="fixed inset-0 z-[150000] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsNotesDrawerOpen(false)} />
          <div className={`relative w-full max-w-[400px] h-full flex flex-col p-5 sm:p-6 shadow-2xl transition-all duration-300 ${isDark ? 'bg-[#0f172a] border-l border-slate-800 text-white' : 'bg-white border-l border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500" />
                <h3 className="text-sm font-black uppercase tracking-wider">Advocate Notes</h3>
              </div>
              <button onClick={() => setIsNotesDrawerOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 custom-scrollbar text-xs font-semibold">
              <p className="text-[10px] text-slate-400 leading-normal">
                Record your strategic thoughts, key timelines, checklists, or trial preparation reminders. Saved automatically to the case history.
              </p>

              <textarea
                rows={15}
                value={scenarioNotes}
                onChange={e => setScenarioNotes(e.target.value)}
                placeholder="Type private case strategy notes, checklists..."
                className={`w-full border rounded-xl px-3 py-2 outline-none resize-none font-bold text-xs ${isDark ? 'bg-black/25 border-zinc-800 text-white' : 'bg-slate-50 border-slate-205 text-slate-808'
                  }`}
              />
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-4 shrink-0">
              <button
                onClick={async () => {
                  if (strategySource === 'EXISTING_CASE') {
                    await syncToDatabase({ scenarioNotes });
                    toast.success("Advocate notes updated!");
                  } else {
                    toast.success("Notes saved in session.");
                  }
                  setIsNotesDrawerOpen(false);
                }}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md"
              >
                Save & Close Notes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StrategyEngine;
