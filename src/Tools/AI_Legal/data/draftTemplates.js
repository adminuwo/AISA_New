// ─────────────────────────────────────────────────────────────────────────────
// AISA Draft Template Registry
// Every draft type maps to: { fields[], systemPrompt, courtHeader, category }
// ─────────────────────────────────────────────────────────────────────────────

export const DRAFT_TEMPLATES = {

  // ══════════════════════ CRIMINAL LAW ══════════════════════
  'FIR Draft': {
    category: 'CRIMINAL LAW',
    courtHeader: 'BEFORE THE STATION HOUSE OFFICER',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true, placeholder: 'Full name of the complainant' },
      { key: 'complainantAddress', label: 'Complainant Address', type: 'text', required: true, placeholder: 'Full residential address' },
      { key: 'policeStation', label: 'Police Station', type: 'text', required: true, placeholder: 'Name of the Police Station' },
      { key: 'district', label: 'District', type: 'text', required: true, placeholder: 'District name' },
      { key: 'accusedName', label: 'Name of Accused', type: 'text', required: true, placeholder: 'Name(s) of accused person(s)' },
      { key: 'accusedAddress', label: 'Address of Accused', type: 'text', required: false, placeholder: 'Known address of accused' },
      { key: 'incidentDate', label: 'Date of Incident', type: 'date', required: true },
      { key: 'incidentPlace', label: 'Place of Incident', type: 'text', required: true, placeholder: 'Exact location where incident occurred' },
      { key: 'ipcSections', label: 'IPC Sections Applicable', type: 'text', required: false, placeholder: 'e.g., IPC 420, 406, 120B' },
      { key: 'incidentFacts', label: 'Facts of the Incident', type: 'textarea', required: true, placeholder: 'Describe the incident in detail — who, what, when, where, how...' },
      { key: 'evidenceAvailable', label: 'Evidence Available', type: 'textarea', required: false, placeholder: 'CCTV footage, messages, documents, witnesses...' },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true, placeholder: 'Registration of FIR, arrest of accused, investigation...' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: false, placeholder: 'Name of the Advocate (if any)' },
    ],
    systemPrompt: 'You are an expert criminal law advocate. Draft a formal FIR (First Information Report) complaint in professional legal format suitable for submission to the Police Station. Follow the format: Complainant details, Accused details, Facts, Offences committed, Evidence, Prayer for Registration of FIR.'
  },

  'Bail Application': {
    category: 'CRIMINAL LAW',
    courtHeader: 'IN THE HON\'BLE SESSIONS COURT',
    fields: [
      { key: 'caseTitle', label: 'Case Title', type: 'text', required: true, placeholder: 'State vs [Accused Name]' },
      { key: 'caseNumber', label: 'FIR/Case Number', type: 'text', required: true, placeholder: 'FIR No. / Case No.' },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true, placeholder: 'Sessions Court / High Court' },
      { key: 'judgeName', label: 'Judge Name (if known)', type: 'text', required: false, placeholder: 'Hon\'ble Judge Name' },
      { key: 'accusedName', label: 'Name of Accused', type: 'text', required: true, placeholder: 'Full name of the accused' },
      { key: 'accusedAge', label: 'Age of Accused', type: 'text', required: true, placeholder: 'Age in years' },
      { key: 'accusedAddress', label: 'Accused Address', type: 'text', required: true, placeholder: 'Permanent residential address' },
      { key: 'policeStation', label: 'Police Station', type: 'text', required: true, placeholder: 'Name of Police Station' },
      { key: 'arrestDate', label: 'Date of Arrest', type: 'date', required: true },
      { key: 'ipcSections', label: 'Sections Invoked', type: 'text', required: true, placeholder: 'IPC 420, 302 etc.' },
      { key: 'custodyDetails', label: 'Custody Details', type: 'textarea', required: true, placeholder: 'Details of custody, jail, remand orders...' },
      { key: 'groundsForBail', label: 'Grounds for Bail', type: 'textarea', required: true, placeholder: 'Elaborate grounds — no criminal record, cooperative, flight risk minimal, family dependent...' },
      { key: 'surety', label: 'Surety Details', type: 'text', required: false, placeholder: 'Name and address of surety person' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true, placeholder: 'Name of Advocate' },
    ],
    systemPrompt: 'You are a senior criminal defence advocate. Draft a formal regular bail application (under Section 437/439 CrPC or as applicable) for submission before the Sessions Court. Include: Case heading, FIR details, Grounds of bail (clean record, cooperative, family dependent, no flight risk), Precedents if relevant, and Prayer for bail.'
  },

  'Anticipatory Bail': {
    category: 'CRIMINAL LAW',
    courtHeader: 'IN THE HON\'BLE HIGH COURT',
    fields: [
      { key: 'applicantName', label: 'Applicant Name', type: 'text', required: true, placeholder: 'Full name of applicant' },
      { key: 'applicantAddress', label: 'Applicant Address', type: 'text', required: true, placeholder: 'Permanent address' },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true, placeholder: 'Sessions Court / High Court' },
      { key: 'policeStation', label: 'Police Station', type: 'text', required: true, placeholder: 'Concerned Police Station' },
      { key: 'ipcSections', label: 'Sections Alleged', type: 'text', required: true, placeholder: 'IPC Sections likely to be invoked' },
      { key: 'fearOfArrest', label: 'Reason for Fear of Arrest', type: 'textarea', required: true, placeholder: 'Why applicant apprehends arrest...' },
      { key: 'groundsForAnticipatoryBail', label: 'Grounds for Anticipatory Bail', type: 'textarea', required: true, placeholder: 'False implication, no criminal antecedents, cooperative...' },
      { key: 'previousComplaint', label: 'Previous Complaint/Case Details', type: 'textarea', required: false, placeholder: 'Any prior complaint or case details...' },
      { key: 'conditionsOffered', label: 'Conditions Offered', type: 'textarea', required: false, placeholder: 'Passport surrender, weekly reporting, not tampering evidence...' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true, placeholder: 'Name of Advocate' },
    ],
    systemPrompt: 'You are a senior criminal advocate. Draft a formal Anticipatory Bail Application under Section 438 CrPC for submission before the Sessions Court/High Court. Include: Applicant details, grounds of apprehension, absence of criminal antecedents, cooperative nature, prayer for pre-arrest bail with conditions.'
  },

  'Criminal Complaint': {
    category: 'CRIMINAL LAW',
    courtHeader: 'BEFORE THE HON\'BLE JUDICIAL MAGISTRATE',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true, placeholder: 'Full name' },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true, placeholder: 'Judicial Magistrate Court' },
      { key: 'accusedName', label: 'Accused Name(s)', type: 'text', required: true, placeholder: 'Name(s) of accused' },
      { key: 'accusedAddress', label: 'Accused Address', type: 'text', required: true, placeholder: 'Address of accused' },
      { key: 'offenceDate', label: 'Date of Offence', type: 'date', required: true },
      { key: 'offencePlace', label: 'Place of Offence', type: 'text', required: true, placeholder: 'Location of the offence' },
      { key: 'ipcSections', label: 'IPC/Penal Sections', type: 'text', required: true, placeholder: 'IPC 420, 406, 500 etc.' },
      { key: 'facts', label: 'Facts of the Case', type: 'textarea', required: true, placeholder: 'Detailed narration of the offence...' },
      { key: 'evidence', label: 'Evidence Details', type: 'textarea', required: false, placeholder: 'List of evidence available...' },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true, placeholder: 'Cognizance of offence, summoning accused, trial...' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: false, placeholder: 'Advocate name' },
    ],
    systemPrompt: 'Draft a formal criminal complaint for submission before the Judicial Magistrate under Section 200 CrPC. Include complainant details, accused details, offence particulars, grounds, evidence, and prayer for cognizance and summoning of accused.'
  },

  'Police Complaint': {
    category: 'CRIMINAL LAW',
    courtHeader: 'TO THE STATION HOUSE OFFICER',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'complainantPhone', label: 'Complainant Phone/Email', type: 'text', required: false },
      { key: 'policeStation', label: 'Police Station', type: 'text', required: true },
      { key: 'accusedName', label: 'Accused/Party Name', type: 'text', required: true },
      { key: 'incidentDate', label: 'Incident Date', type: 'date', required: true },
      { key: 'incidentPlace', label: 'Incident Location', type: 'text', required: true },
      { key: 'complaintSubject', label: 'Subject of Complaint', type: 'text', required: true, placeholder: 'e.g. Cheating, Harassment, Theft...' },
      { key: 'facts', label: 'Complete Facts', type: 'textarea', required: true, placeholder: 'Describe the incident in full detail' },
      { key: 'witnessDetails', label: 'Witness Details', type: 'text', required: false },
      { key: 'reliefRequested', label: 'Relief / Action Requested', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a formal police complaint letter addressed to the Station House Officer. Include complainant details, subject, facts, incident narration, witness information and request for appropriate police action including FIR registration and investigation.'
  },

  'Cyber Crime FIR': {
    category: 'CRIMINAL LAW',
    courtHeader: 'TO THE CYBER CRIME CELL',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'complainantPhone', label: 'Contact Number', type: 'text', required: true },
      { key: 'complainantEmail', label: 'Email Address', type: 'text', required: true },
      { key: 'cyberCrimeType', label: 'Type of Cyber Crime', type: 'select', required: true, options: ['Online Fraud', 'Identity Theft', 'Hacking', 'Phishing', 'Cyberbullying', 'Sextortion', 'Ransomware', 'Social Media Abuse', 'Other'] },
      { key: 'platformUsed', label: 'Platform/Website Used', type: 'text', required: true, placeholder: 'e.g. WhatsApp, Instagram, Email...' },
      { key: 'incidentDate', label: 'Date of Incident', type: 'date', required: true },
      { key: 'amountLost', label: 'Amount Lost (if any)', type: 'text', required: false, placeholder: '₹ amount' },
      { key: 'accusedProfile', label: 'Accused Profile/URL', type: 'text', required: false, placeholder: 'Profile URL, phone number, email of accused' },
      { key: 'incidentFacts', label: 'Detailed Incident Facts', type: 'textarea', required: true, placeholder: 'Step by step narration of how the crime occurred...' },
      { key: 'digitalEvidence', label: 'Digital Evidence', type: 'textarea', required: false, placeholder: 'Screenshots, transaction IDs, call logs, emails...' },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a formal Cyber Crime FIR/Complaint to be submitted to the Cyber Crime Cell under IT Act 2000 and relevant IPC sections. Include all digital evidence references, platform details, and prayer for blocking/freezing accounts and investigation.'
  },

  // ══════════════════════ CIVIL LAW ══════════════════════
  'Legal Notice': {
    category: 'CIVIL LAW',
    courtHeader: 'LEGAL NOTICE',
    fields: [
      { key: 'senderName', label: 'Sender / Client Name', type: 'text', required: true },
      { key: 'senderAddress', label: 'Sender Address', type: 'textarea', required: true },
      { key: 'receiverName', label: 'Receiver Name', type: 'text', required: true },
      { key: 'receiverAddress', label: 'Receiver Address', type: 'textarea', required: true },
      { key: 'noticeDate', label: 'Notice Date', type: 'date', required: true },
      { key: 'subject', label: 'Subject / Nature of Dispute', type: 'text', required: true, placeholder: 'e.g. Recovery of Dues, Breach of Contract' },
      { key: 'facts', label: 'Facts of the Dispute', type: 'textarea', required: true, placeholder: 'Chronological facts leading to this notice...' },
      { key: 'causeOfAction', label: 'Cause of Action', type: 'textarea', required: true, placeholder: 'Legal grounds, agreements breached, losses suffered...' },
      { key: 'amountDue', label: 'Amount Due (if applicable)', type: 'text', required: false, placeholder: '₹ Amount' },
      { key: 'reliefDemanded', label: 'Relief / Demand', type: 'textarea', required: true, placeholder: 'Payment demanded, action required, time limit given...' },
      { key: 'timeLimit', label: 'Time Limit Given', type: 'text', required: true, placeholder: 'e.g. 15 days, 30 days' },
      { key: 'advocateName', label: 'Issuing Advocate Name', type: 'text', required: true },
      { key: 'advocateAddress', label: 'Advocate Office Address', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal legal notice under signature of advocate. Include sender/client particulars, receiver details, subject, chronological facts, cause of action, demand/relief, time limit for compliance, and consequence of non-compliance (legal proceedings). Use formal legal language.'
  },

  'Recovery Notice': {
    category: 'CIVIL LAW',
    courtHeader: 'NOTICE FOR RECOVERY OF DUES',
    fields: [
      { key: 'creditorName', label: 'Creditor / Claimant Name', type: 'text', required: true },
      { key: 'creditorAddress', label: 'Creditor Address', type: 'textarea', required: true },
      { key: 'debtorName', label: 'Debtor / Respondent Name', type: 'text', required: true },
      { key: 'debtorAddress', label: 'Debtor Address', type: 'textarea', required: true },
      { key: 'transactionDate', label: 'Date of Transaction/Agreement', type: 'date', required: true },
      { key: 'principalAmount', label: 'Principal Amount (₹)', type: 'text', required: true },
      { key: 'interestRate', label: 'Interest Rate (if applicable)', type: 'text', required: false, placeholder: 'e.g. 18% p.a.' },
      { key: 'totalDue', label: 'Total Amount Due (₹)', type: 'text', required: true },
      { key: 'transactionFacts', label: 'Facts of Transaction', type: 'textarea', required: true },
      { key: 'previousReminders', label: 'Previous Reminders Given', type: 'textarea', required: false },
      { key: 'timeLimit', label: 'Time to Pay', type: 'text', required: true, placeholder: 'e.g. 7 days from receipt of this notice' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Recovery Notice demanding repayment of dues. Include creditor particulars, transaction history, amount breakdown (principal + interest), previous communication records, demand for payment within specified period, and warning of legal proceedings under Order 37 CPC and applicable laws.'
  },

  'Civil Suit': {
    category: 'CIVIL LAW',
    courtHeader: 'IN THE CIVIL COURT',
    fields: [
      { key: 'plaintiffName', label: 'Plaintiff Name', type: 'text', required: true },
      { key: 'plaintiffAddress', label: 'Plaintiff Address', type: 'textarea', required: true },
      { key: 'defendantName', label: 'Defendant Name', type: 'text', required: true },
      { key: 'defendantAddress', label: 'Defendant Address', type: 'textarea', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true },
      { key: 'suitValuation', label: 'Suit Valuation (₹)', type: 'text', required: true },
      { key: 'causeOfAction', label: 'Cause of Action', type: 'text', required: true, placeholder: 'e.g. Breach of Contract, Recovery of Money' },
      { key: 'facts', label: 'Statement of Facts', type: 'textarea', required: true },
      { key: 'legalGrounds', label: 'Legal Grounds', type: 'textarea', required: true, placeholder: 'Sections, Acts, case laws relied upon...' },
      { key: 'reliefClaimed', label: 'Relief Claimed', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Civil Suit plaint under CPC Order 7. Include plaintiff and defendant details, court jurisdiction, valuation, cause of action, statement of facts, legal grounds (sections/acts), prayer for relief, and verification clause.'
  },

  'Injunction Petition': {
    category: 'CIVIL LAW',
    courtHeader: 'IN THE HON\'BLE CIVIL COURT',
    fields: [
      { key: 'petitionerName', label: 'Petitioner Name', type: 'text', required: true },
      { key: 'respondentName', label: 'Respondent Name', type: 'text', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true },
      { key: 'injunctionType', label: 'Type of Injunction', type: 'select', required: true, options: ['Temporary Injunction', 'Permanent Injunction', 'Mandatory Injunction', 'Prohibitory Injunction', 'Ex-Parte Injunction'] },
      { key: 'subjectMatter', label: 'Subject Matter', type: 'text', required: true, placeholder: 'Property / Activity to be restrained' },
      { key: 'urgency', label: 'Urgency / Prima Facie Case', type: 'textarea', required: true, placeholder: 'Why immediate injunction is needed...' },
      { key: 'irreparableHarm', label: 'Irreparable Harm if Not Granted', type: 'textarea', required: true },
      { key: 'balanceOfConvenience', label: 'Balance of Convenience', type: 'textarea', required: true },
      { key: 'facts', label: 'Facts of the Case', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Injunction Petition under Order 39 CPC establishing prima facie case, balance of convenience, irreparable harm. Include urgency, supporting facts, and prayer for temporary/permanent injunction with or without notice.'
  },

  'Property Dispute': {
    category: 'CIVIL LAW',
    courtHeader: 'IN THE HON\'BLE CIVIL COURT',
    fields: [
      { key: 'plaintiffName', label: 'Plaintiff Name', type: 'text', required: true },
      { key: 'defendantName', label: 'Defendant Name', type: 'text', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true },
      { key: 'propertyDetails', label: 'Property Details', type: 'textarea', required: true, placeholder: 'Survey No., Address, Area, boundaries...' },
      { key: 'titleDocuments', label: 'Title Documents Available', type: 'text', required: false, placeholder: 'Sale deed, registry, mutation...' },
      { key: 'disputeNature', label: 'Nature of Dispute', type: 'select', required: true, options: ['Ownership Dispute', 'Possession Dispute', 'Boundary Dispute', 'Adverse Possession', 'Partition Suit', 'Encroachment', 'Other'] },
      { key: 'howDisposeArised', label: 'How Dispute Arose', type: 'textarea', required: true },
      { key: 'facts', label: 'Facts & Background', type: 'textarea', required: true },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal property dispute suit/petition. Include property description, title documents, chain of ownership, nature of encroachment/dispute, facts, legal grounds under TPA/CPC, and prayer for declaration of title, possession, or injunction.'
  },

  'Compensation Claim': {
    category: 'CIVIL LAW',
    courtHeader: 'IN THE HON\'BLE COURT',
    fields: [
      { key: 'claimantName', label: 'Claimant Name', type: 'text', required: true },
      { key: 'respondentName', label: 'Respondent/Opposite Party', type: 'text', required: true },
      { key: 'courtName', label: 'Court / Forum', type: 'text', required: true },
      { key: 'natureOfClaim', label: 'Nature of Claim', type: 'select', required: true, options: ['Accident Compensation', 'Wrongful Act Damages', 'Contract Breach Damages', 'Medical Negligence', 'Consumer Deficiency', 'Other'] },
      { key: 'incidentDate', label: 'Date of Incident', type: 'date', required: true },
      { key: 'incidentFacts', label: 'Incident Facts', type: 'textarea', required: true },
      { key: 'lossesIncurred', label: 'Losses / Damages Suffered', type: 'textarea', required: true, placeholder: 'Physical, financial, mental losses...' },
      { key: 'compensationAmount', label: 'Compensation Claimed (₹)', type: 'text', required: true },
      { key: 'legalBasis', label: 'Legal Basis', type: 'textarea', required: true, placeholder: 'Sections, negligence, breach...' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal compensation claim petition. Include claimant details, incident description, legal basis for compensation (negligence/breach/strict liability), loss assessment, quantum of damages, and prayer for compensation with interest.'
  },

  // ══════════════════════ FAMILY LAW ══════════════════════
  'Divorce Petition': {
    category: 'FAMILY LAW',
    courtHeader: 'IN THE HON\'BLE FAMILY COURT',
    fields: [
      { key: 'petitionerName', label: 'Petitioner Name', type: 'text', required: true },
      { key: 'respondentName', label: 'Respondent (Spouse) Name', type: 'text', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true, placeholder: 'Family Court, District...' },
      { key: 'marriageDate', label: 'Date of Marriage', type: 'date', required: true },
      { key: 'marriagePlace', label: 'Place of Marriage', type: 'text', required: true },
      { key: 'separationDate', label: 'Date of Separation', type: 'date', required: false },
      { key: 'childrenDetails', label: 'Children Details', type: 'textarea', required: false, placeholder: 'Names, ages, custody preference...' },
      { key: 'groundsForDivorce', label: 'Grounds for Divorce', type: 'select', required: true, options: ['Cruelty', 'Desertion', 'Adultery', 'Conversion', 'Mental Disorder', 'Communicable Disease', 'Mutual Consent', 'Irretrievable Breakdown', 'Other'] },
      { key: 'factsOfDivorce', label: 'Facts Supporting Grounds', type: 'textarea', required: true, placeholder: 'Detailed facts establishing grounds for divorce...' },
      { key: 'previousProceedings', label: 'Previous Proceedings', type: 'textarea', required: false },
      { key: 'matrimonialProperty', label: 'Matrimonial Property Details', type: 'textarea', required: false },
      { key: 'maintenanceClaim', label: 'Maintenance/Alimony Claim', type: 'text', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Divorce Petition under Hindu Marriage Act 1955 / Special Marriage Act / applicable personal law. Include marriage details, grounds, supporting facts, children details, property division, maintenance, and prayer for dissolution of marriage.'
  },

  'Mutual Divorce': {
    category: 'FAMILY LAW',
    courtHeader: 'IN THE HON\'BLE FAMILY COURT',
    fields: [
      { key: 'petitioner1Name', label: 'Petitioner 1 (Husband) Name', type: 'text', required: true },
      { key: 'petitioner2Name', label: 'Petitioner 2 (Wife) Name', type: 'text', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true },
      { key: 'marriageDate', label: 'Date of Marriage', type: 'date', required: true },
      { key: 'marriagePlace', label: 'Place of Marriage', type: 'text', required: true },
      { key: 'separationDate', label: 'Separation Date', type: 'date', required: true },
      { key: 'livingApartDuration', label: 'Living Apart Duration', type: 'text', required: true, placeholder: 'e.g. More than 1 year' },
      { key: 'childrenDetails', label: 'Children Details', type: 'textarea', required: false },
      { key: 'settledTerms', label: 'Terms Mutually Settled', type: 'textarea', required: true, placeholder: 'Custody, maintenance, alimony, property division...' },
      { key: 'alimonyAmount', label: 'Alimony / Settlement Amount (₹)', type: 'text', required: false },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a Mutual Consent Divorce Petition under Section 13B Hindu Marriage Act. Include joint petitioner details, marriage details, separation period (1 year+), mutually agreed terms (custody, alimony, property), and joint prayer for dissolution.'
  },

  'Child Custody': {
    category: 'FAMILY LAW',
    courtHeader: 'IN THE HON\'BLE FAMILY COURT',
    fields: [
      { key: 'petitionerName', label: 'Petitioner Name', type: 'text', required: true },
      { key: 'respondentName', label: 'Respondent Name', type: 'text', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true },
      { key: 'childName', label: 'Child\'s Name', type: 'text', required: true },
      { key: 'childAge', label: 'Child\'s Age', type: 'text', required: true },
      { key: 'childCurrentStatus', label: 'Child\'s Current Status', type: 'textarea', required: true, placeholder: 'With whom child is currently living, school, wellbeing...' },
      { key: 'relationshipToChild', label: 'Petitioner\'s Relationship to Child', type: 'text', required: true, placeholder: 'Mother / Father / Guardian' },
      { key: 'custodyType', label: 'Custody Sought', type: 'select', required: true, options: ['Sole Custody', 'Joint Custody', 'Physical Custody', 'Legal Custody', 'Temporary Custody'] },
      { key: 'groundsForCustody', label: 'Grounds for Custody', type: 'textarea', required: true, placeholder: 'Why petitioner is better suited for child\'s welfare...' },
      { key: 'childWelfareDetails', label: 'Child Welfare Considerations', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a Child Custody Petition under Guardian and Wards Act 1890 / Hindu Minority and Guardianship Act. Emphasize child\'s best interest as paramount consideration. Include petitioner qualifications for custody, living conditions, financial stability, emotional attachment, and prayer for custody.'
  },

  'Maintenance Petition': {
    category: 'FAMILY LAW',
    courtHeader: 'IN THE HON\'BLE FAMILY COURT',
    fields: [
      { key: 'petitionerName', label: 'Petitioner Name', type: 'text', required: true },
      { key: 'respondentName', label: 'Respondent Name', type: 'text', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true },
      { key: 'relationship', label: 'Relationship', type: 'select', required: true, options: ['Wife', 'Children', 'Parents', 'Divorced Wife', 'Other'] },
      { key: 'marriageDate', label: 'Date of Marriage', type: 'date', required: false },
      { key: 'separationDate', label: 'Date of Separation', type: 'date', required: false },
      { key: 'petitionerIncome', label: 'Petitioner\'s Income/Resources', type: 'text', required: true, placeholder: 'Monthly income or "Nil"' },
      { key: 'respondentIncome', label: 'Respondent\'s Estimated Income', type: 'text', required: true },
      { key: 'maintenanceRequired', label: 'Monthly Maintenance Required (₹)', type: 'text', required: true },
      { key: 'groundsForMaintenance', label: 'Grounds for Maintenance', type: 'textarea', required: true },
      { key: 'dependents', label: 'Dependent Children/Members', type: 'textarea', required: false },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a Maintenance Petition under Section 125 CrPC / Section 24 HMA / applicable law. Include petitioner\'s needs, respondent\'s capacity, marriage details, desertion/neglect, and prayer for monthly maintenance including interim maintenance.'
  },

  'Domestic Violence Case': {
    category: 'FAMILY LAW',
    courtHeader: 'BEFORE THE HON\'BLE MAGISTRATE',
    fields: [
      { key: 'aggrievedName', label: 'Aggrieved Person Name', type: 'text', required: true },
      { key: 'respondentName', label: 'Respondent Name', type: 'text', required: true },
      { key: 'magistrateCourt', label: 'Magistrate Court', type: 'text', required: true },
      { key: 'sharedHousehold', label: 'Shared Household Address', type: 'textarea', required: true },
      { key: 'relationshipToRespondent', label: 'Relationship to Respondent', type: 'select', required: true, options: ['Spouse', 'In-Laws', 'Live-in Partner', 'Family Member', 'Other'] },
      { key: 'dvActsCommitted', label: 'Acts of Domestic Violence', type: 'textarea', required: true, placeholder: 'Physical abuse, emotional abuse, economic abuse, sexual abuse — describe incidents with dates' },
      { key: 'medicalReports', label: 'Medical Reports / Injuries', type: 'textarea', required: false },
      { key: 'witnessDetails', label: 'Witnesses', type: 'text', required: false },
      { key: 'reliefSought', label: 'Relief Under DV Act', type: 'textarea', required: true, placeholder: 'Protection Order, Residence Order, Monetary Relief, Compensation...' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal complaint/application under Protection of Women from Domestic Violence Act 2005. Include aggrieved person details, acts of domestic violence (physical, mental, economic, sexual), shared household, prayer for Protection Order, Residence Order, monetary relief, and compensation.'
  },

  'Adoption Petition': {
    category: 'FAMILY LAW',
    courtHeader: 'IN THE HON\'BLE DISTRICT COURT',
    fields: [
      { key: 'adoptiveFatherName', label: 'Adoptive Father Name', type: 'text', required: true },
      { key: 'adoptiveMotherName', label: 'Adoptive Mother Name', type: 'text', required: false },
      { key: 'adoptiveParentsAddress', label: 'Adoptive Parents Address', type: 'textarea', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true },
      { key: 'childName', label: 'Child\'s Name', type: 'text', required: true },
      { key: 'childAge', label: 'Child\'s Age/DOB', type: 'text', required: true },
      { key: 'childBackground', label: 'Child\'s Background', type: 'textarea', required: true },
      { key: 'naturalParentsDetails', label: 'Natural/Biological Parents Details', type: 'textarea', required: false },
      { key: 'agencyName', label: 'Adoption Agency (if any)', type: 'text', required: false },
      { key: 'reasonForAdoption', label: 'Reason for Adoption', type: 'textarea', required: true },
      { key: 'financialStatus', label: 'Financial Status of Adoptive Parents', type: 'text', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Adoption Petition under Hindu Adoption and Maintenance Act / JJ Act. Include adoptive parent qualifications, child background, consent details, home study report reference, and prayer for adoption order.'
  },

  // ══════════════════════ PROPERTY LAW ══════════════════════
  'Sale Agreement': {
    category: 'PROPERTY LAW',
    courtHeader: 'AGREEMENT FOR SALE OF PROPERTY',
    fields: [
      { key: 'sellerName', label: 'Seller Name', type: 'text', required: true },
      { key: 'sellerAddress', label: 'Seller Address', type: 'textarea', required: true },
      { key: 'buyerName', label: 'Buyer Name', type: 'text', required: true },
      { key: 'buyerAddress', label: 'Buyer Address', type: 'textarea', required: true },
      { key: 'propertyDescription', label: 'Property Description', type: 'textarea', required: true, placeholder: 'Survey No., Plot No., Address, dimensions, boundaries...' },
      { key: 'saleConsideration', label: 'Sale Consideration (₹)', type: 'text', required: true },
      { key: 'advancePaid', label: 'Advance Amount Paid (₹)', type: 'text', required: true },
      { key: 'balanceAmount', label: 'Balance Amount (₹)', type: 'text', required: true },
      { key: 'registrationDate', label: 'Proposed Registration Date', type: 'date', required: true },
      { key: 'possessionDate', label: 'Possession Date', type: 'date', required: true },
      { key: 'encumbrance', label: 'Encumbrance Status', type: 'text', required: true, placeholder: 'Free from encumbrance / Loan details' },
      { key: 'specialConditions', label: 'Special Conditions', type: 'textarea', required: false },
    ],
    systemPrompt: 'Draft a formal Agreement for Sale of immovable property. Include seller/buyer details, property description (with boundaries), consideration amount, advance paid, payment schedule, encumbrance status, possession date, registration obligations, and penalty for breach.'
  },

  'Rent Agreement': {
    category: 'PROPERTY LAW',
    courtHeader: 'RENTAL AGREEMENT / LEAVE AND LICENSE',
    fields: [
      { key: 'landlordName', label: 'Landlord Name', type: 'text', required: true },
      { key: 'landlordAddress', label: 'Landlord Address', type: 'textarea', required: true },
      { key: 'tenantName', label: 'Tenant Name', type: 'text', required: true },
      { key: 'tenantAddress', label: 'Tenant Permanent Address', type: 'textarea', required: true },
      { key: 'propertyAddress', label: 'Property Address', type: 'textarea', required: true, placeholder: 'Full address of rented property' },
      { key: 'rentAmount', label: 'Monthly Rent (₹)', type: 'text', required: true },
      { key: 'securityDeposit', label: 'Security Deposit (₹)', type: 'text', required: true },
      { key: 'agreementStartDate', label: 'Agreement Start Date', type: 'date', required: true },
      { key: 'agreementDuration', label: 'Agreement Duration', type: 'text', required: true, placeholder: 'e.g. 11 months, 1 year' },
      { key: 'lockInPeriod', label: 'Lock-in Period', type: 'text', required: false, placeholder: 'e.g. 6 months' },
      { key: 'noticePeriod', label: 'Notice Period for Vacating', type: 'text', required: true, placeholder: 'e.g. 1 month' },
      { key: 'purposeOfUse', label: 'Purpose of Use', type: 'select', required: true, options: ['Residential', 'Commercial', 'Industrial', 'Mixed Use'] },
      { key: 'maintenanceTerms', label: 'Maintenance Terms', type: 'textarea', required: false },
      { key: 'witnessName', label: 'Witness Name(s)', type: 'text', required: false },
    ],
    systemPrompt: 'Draft a formal Rental Agreement / Leave and License Agreement. Include landlord/tenant details, property description, rent amount, security deposit, duration, lock-in period, notice period, permitted use, maintenance obligations, utility payments, termination conditions, and dispute resolution.'
  },

  'Lease Agreement': {
    category: 'PROPERTY LAW',
    courtHeader: 'DEED OF LEASE',
    fields: [
      { key: 'lessorName', label: 'Lessor (Owner) Name', type: 'text', required: true },
      { key: 'lesseeName', label: 'Lessee (Tenant) Name', type: 'text', required: true },
      { key: 'propertyDetails', label: 'Property Details', type: 'textarea', required: true },
      { key: 'leasePeriod', label: 'Lease Period', type: 'text', required: true, placeholder: 'e.g. 5 years from [date]' },
      { key: 'monthlyRent', label: 'Monthly Rent (₹)', type: 'text', required: true },
      { key: 'annualIncrement', label: 'Annual Increment (%)', type: 'text', required: false },
      { key: 'securityDeposit', label: 'Security Deposit (₹)', type: 'text', required: true },
      { key: 'leaseStartDate', label: 'Lease Start Date', type: 'date', required: true },
      { key: 'purposeOfLease', label: 'Purpose of Lease', type: 'text', required: true },
      { key: 'renewalTerms', label: 'Renewal Terms', type: 'textarea', required: false },
      { key: 'termination', label: 'Termination Clause', type: 'textarea', required: false },
      { key: 'stampDuty', label: 'Stamp Duty Reference', type: 'text', required: false },
    ],
    systemPrompt: 'Draft a formal Deed of Lease for immovable property. Include lessor/lessee details, property description, lease period, rent, security deposit, permitted use, maintenance, renewal options, sub-letting restrictions, termination conditions, and stamp duty compliance.'
  },

  'Tenant Eviction Notice': {
    category: 'PROPERTY LAW',
    courtHeader: 'NOTICE TO VACATE PREMISES',
    fields: [
      { key: 'landlordName', label: 'Landlord Name', type: 'text', required: true },
      { key: 'tenantName', label: 'Tenant Name', type: 'text', required: true },
      { key: 'propertyAddress', label: 'Property Address', type: 'textarea', required: true },
      { key: 'agreementDate', label: 'Rental Agreement Date', type: 'date', required: false },
      { key: 'reasonForEviction', label: 'Reason for Eviction', type: 'select', required: true, options: ['Non-Payment of Rent', 'Agreement Expiry', 'Personal Use Required', 'Illegal Subletting', 'Property Damage', 'Breach of Terms', 'Other'] },
      { key: 'rentDue', label: 'Rent Arrears (₹)', type: 'text', required: false },
      { key: 'evictionDetails', label: 'Details / Facts', type: 'textarea', required: true },
      { key: 'vacatingDeadline', label: 'Deadline to Vacate', type: 'date', required: true },
      { key: 'legalWarning', label: 'Legal Action if Not Vacated', type: 'textarea', required: false, placeholder: 'Eviction suit, recovery proceedings...' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: false },
    ],
    systemPrompt: 'Draft a formal Eviction/Vacate Notice under Rent Control Act / Transfer of Property Act. Include landlord/tenant details, property description, grounds for eviction, arrears, deadline to vacate, and warning of legal proceedings (eviction suit).'
  },

  'Registry Verification': {
    category: 'PROPERTY LAW',
    courtHeader: 'APPLICATION FOR PROPERTY TITLE VERIFICATION',
    fields: [
      { key: 'applicantName', label: 'Applicant Name', type: 'text', required: true },
      { key: 'propertyDetails', label: 'Property Details', type: 'textarea', required: true },
      { key: 'surveyNumber', label: 'Survey/Khasra Number', type: 'text', required: false },
      { key: 'registrationOffice', label: 'Registration Office', type: 'text', required: true },
      { key: 'previousOwners', label: 'Known Previous Owners', type: 'textarea', required: false },
      { key: 'purposeOfVerification', label: 'Purpose of Verification', type: 'text', required: true, placeholder: 'Purchase, Mortgage, Legal Due Diligence...' },
      { key: 'documentsAvailable', label: 'Documents Available', type: 'textarea', required: false },
    ],
    systemPrompt: 'Draft a formal application for property title/registry verification. Include property details, survey number, encumbrance certificate request, chain of title verification request, and certified copies of registered documents.'
  },

  'Property Transfer': {
    category: 'PROPERTY LAW',
    courtHeader: 'DEED OF TRANSFER / GIFT DEED / CONVEYANCE DEED',
    fields: [
      { key: 'transferorName', label: 'Transferor Name', type: 'text', required: true },
      { key: 'transfereeName', label: 'Transferee Name', type: 'text', required: true },
      { key: 'transferType', label: 'Type of Transfer', type: 'select', required: true, options: ['Sale', 'Gift', 'Inheritance', 'Exchange', 'Partition', 'Will Execution'] },
      { key: 'propertyDetails', label: 'Property Details', type: 'textarea', required: true },
      { key: 'propertyValue', label: 'Property Market Value (₹)', type: 'text', required: true },
      { key: 'consideration', label: 'Consideration (₹)', type: 'text', required: false, placeholder: 'Amount paid or "Love and Affection" for gift' },
      { key: 'transferDate', label: 'Date of Transfer', type: 'date', required: true },
      { key: 'witnessDetails', label: 'Witness Names', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Property Transfer Deed / Conveyance Deed / Gift Deed under Transfer of Property Act. Include transferor/transferee details, property description, consideration, transfer conditions, possession delivery, and registration compliance.'
  },

  // ══════════════════════ CORPORATE LAW ══════════════════════
  'NDA Draft': {
    category: 'CORPORATE LAW',
    courtHeader: 'NON-DISCLOSURE AGREEMENT',
    fields: [
      { key: 'disclosingParty', label: 'Disclosing Party Name', type: 'text', required: true },
      { key: 'receivingParty', label: 'Receiving Party Name', type: 'text', required: true },
      { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
      { key: 'ndaType', label: 'NDA Type', type: 'select', required: true, options: ['Unilateral', 'Mutual/Bilateral'] },
      { key: 'purposeOfDisclosure', label: 'Purpose of Disclosure', type: 'textarea', required: true, placeholder: 'Business discussion, partnership evaluation, due diligence...' },
      { key: 'confidentialInfoScope', label: 'Scope of Confidential Information', type: 'textarea', required: true },
      { key: 'duration', label: 'Duration of Confidentiality', type: 'text', required: true, placeholder: 'e.g. 2 years, 5 years, Indefinite' },
      { key: 'exclusions', label: 'Exclusions from Confidentiality', type: 'textarea', required: false },
      { key: 'jurisdiction', label: 'Governing Law & Jurisdiction', type: 'text', required: true, placeholder: 'e.g. Laws of India, Delhi Courts' },
      { key: 'penaltyForBreach', label: 'Remedy for Breach', type: 'text', required: false },
    ],
    systemPrompt: 'Draft a professional Non-Disclosure Agreement (NDA). Include parties, definition of confidential information, disclosure purpose, obligations, exceptions (public domain, prior knowledge, compelled disclosure), duration, injunctive relief remedy, governing law, and dispute resolution.'
  },

  'Contract Draft': {
    category: 'CORPORATE LAW',
    courtHeader: 'SERVICE AGREEMENT / CONTRACT',
    fields: [
      { key: 'party1Name', label: 'Party 1 Name', type: 'text', required: true },
      { key: 'party1Address', label: 'Party 1 Address', type: 'textarea', required: true },
      { key: 'party2Name', label: 'Party 2 Name', type: 'text', required: true },
      { key: 'party2Address', label: 'Party 2 Address', type: 'textarea', required: true },
      { key: 'contractType', label: 'Contract Type', type: 'text', required: true, placeholder: 'Service Agreement, Purchase Agreement, SLA...' },
      { key: 'scopeOfWork', label: 'Scope of Work / Services', type: 'textarea', required: true },
      { key: 'contractValue', label: 'Contract Value (₹)', type: 'text', required: true },
      { key: 'paymentTerms', label: 'Payment Terms', type: 'textarea', required: true },
      { key: 'contractDuration', label: 'Contract Duration', type: 'text', required: true },
      { key: 'liabilityClause', label: 'Liability Cap', type: 'text', required: false },
      { key: 'terminationClause', label: 'Termination Terms', type: 'textarea', required: false },
      { key: 'governingLaw', label: 'Governing Law & Jurisdiction', type: 'text', required: true },
      { key: 'disputeResolution', label: 'Dispute Resolution', type: 'select', required: true, options: ['Arbitration', 'Mediation', 'Court Litigation', 'Negotiation first then Arbitration'] },
    ],
    systemPrompt: 'Draft a comprehensive commercial contract/service agreement. Include parties, scope of services, deliverables, timelines, payment terms, IP ownership, representations and warranties, indemnification, limitation of liability, termination rights, governing law, and dispute resolution.'
  },

  'Employment Agreement': {
    category: 'CORPORATE LAW',
    courtHeader: 'EMPLOYMENT AGREEMENT',
    fields: [
      { key: 'employerName', label: 'Employer / Company Name', type: 'text', required: true },
      { key: 'employeeName', label: 'Employee Name', type: 'text', required: true },
      { key: 'designation', label: 'Designation / Role', type: 'text', required: true },
      { key: 'department', label: 'Department', type: 'text', required: false },
      { key: 'joiningDate', label: 'Date of Joining', type: 'date', required: true },
      { key: 'salary', label: 'CTC / Salary (₹ per annum)', type: 'text', required: true },
      { key: 'workLocation', label: 'Work Location', type: 'text', required: true },
      { key: 'probationPeriod', label: 'Probation Period', type: 'text', required: false, placeholder: 'e.g. 6 months' },
      { key: 'workingHours', label: 'Working Hours', type: 'text', required: false },
      { key: 'noticePeriod', label: 'Notice Period', type: 'text', required: true, placeholder: 'e.g. 90 days' },
      { key: 'nonCompete', label: 'Non-Compete Clause', type: 'textarea', required: false },
      { key: 'confidentiality', label: 'Confidentiality Obligation', type: 'textarea', required: false },
      { key: 'benefits', label: 'Benefits / Perks', type: 'textarea', required: false },
    ],
    systemPrompt: 'Draft a comprehensive Employment Agreement. Include employer/employee details, role, CTC, benefits, working hours, probation, notice period, IP assignment, confidentiality, non-compete/non-solicitation, code of conduct, termination conditions, and dispute resolution under Indian labour laws.'
  },

  'Partnership Agreement': {
    category: 'CORPORATE LAW',
    courtHeader: 'PARTNERSHIP DEED',
    fields: [
      { key: 'firmName', label: 'Partnership Firm Name', type: 'text', required: true },
      { key: 'partner1Name', label: 'Partner 1 Name', type: 'text', required: true },
      { key: 'partner2Name', label: 'Partner 2 Name', type: 'text', required: true },
      { key: 'additionalPartners', label: 'Other Partners', type: 'text', required: false },
      { key: 'firmAddress', label: 'Firm / Business Address', type: 'textarea', required: true },
      { key: 'businessNature', label: 'Nature of Business', type: 'text', required: true },
      { key: 'partnershipStartDate', label: 'Partnership Start Date', type: 'date', required: true },
      { key: 'capitalContribution', label: 'Capital Contribution', type: 'textarea', required: true, placeholder: 'Partner 1: ₹X, Partner 2: ₹Y...' },
      { key: 'profitSharingRatio', label: 'Profit Sharing Ratio', type: 'text', required: true, placeholder: 'e.g. 50:50, 60:40' },
      { key: 'managingPartner', label: 'Managing Partner', type: 'text', required: false },
      { key: 'bankAccount', label: 'Bank Account Details', type: 'text', required: false },
      { key: 'dissolutionTerms', label: 'Dissolution Terms', type: 'textarea', required: false },
    ],
    systemPrompt: 'Draft a formal Partnership Deed under Indian Partnership Act 1932. Include firm name, partners, business nature, capital, profit/loss sharing, management powers, banking, admission/retirement of partners, dissolution clause, and dispute resolution.'
  },

  'Vendor Agreement': {
    category: 'CORPORATE LAW',
    courtHeader: 'VENDOR / SUPPLIER AGREEMENT',
    fields: [
      { key: 'companyName', label: 'Company (Buyer) Name', type: 'text', required: true },
      { key: 'vendorName', label: 'Vendor / Supplier Name', type: 'text', required: true },
      { key: 'productsServices', label: 'Products / Services Supplied', type: 'textarea', required: true },
      { key: 'contractValue', label: 'Contract Value (₹)', type: 'text', required: true },
      { key: 'deliveryTerms', label: 'Delivery Terms', type: 'textarea', required: true, placeholder: 'Lead times, locations, frequency...' },
      { key: 'paymentTerms', label: 'Payment Terms', type: 'text', required: true, placeholder: 'Net 30, Net 60...' },
      { key: 'qualityStandards', label: 'Quality Standards', type: 'textarea', required: false },
      { key: 'penaltyForDelay', label: 'Penalty for Delay/Defect', type: 'text', required: false },
      { key: 'agreementDuration', label: 'Agreement Duration', type: 'text', required: true },
      { key: 'terminationClause', label: 'Termination Clause', type: 'textarea', required: false },
      { key: 'governingLaw', label: 'Governing Law', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a Vendor/Supplier Agreement covering supply terms, delivery obligations, quality specifications, price, payment terms, penalty for delays, force majeure, IP ownership of custom work, termination rights, indemnification, and dispute resolution.'
  },

  'Startup Compliance': {
    category: 'CORPORATE LAW',
    courtHeader: 'STARTUP INCORPORATION & COMPLIANCE DOCUMENT',
    fields: [
      { key: 'companyName', label: 'Company Name', type: 'text', required: true },
      { key: 'founders', label: 'Founder Names', type: 'textarea', required: true },
      { key: 'businessDescription', label: 'Business Description', type: 'textarea', required: true },
      { key: 'incorporationType', label: 'Incorporation Type', type: 'select', required: true, options: ['Private Limited Company', 'LLP', 'OPC', 'Partnership Firm', 'Sole Proprietorship'] },
      { key: 'registeredAddress', label: 'Registered Office Address', type: 'textarea', required: true },
      { key: 'authorizedCapital', label: 'Authorized Capital (₹)', type: 'text', required: false },
      { key: 'directors', label: 'Directors / Designated Partners', type: 'textarea', required: true },
      { key: 'shareholdingPattern', label: 'Shareholding Pattern', type: 'textarea', required: false },
      { key: 'startupIndiaCriteria', label: 'Startup India Registration Criteria', type: 'textarea', required: false },
      { key: 'complianceScope', label: 'Compliance Scope Required', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a Startup Compliance Document covering incorporation structure, founders agreement, IP assignment, ESOP policy, Startup India registration eligibility, GST registration, statutory compliance checklist (ROC filings, annual returns), and recommended legal framework.'
  },

  // ══════════════════════ BANKING & FINANCE ══════════════════════
  'Loan Dispute': {
    category: 'BANKING & FINANCE',
    courtHeader: 'BEFORE THE HON\'BLE DEBT RECOVERY TRIBUNAL / COURT',
    fields: [
      { key: 'borrowerName', label: 'Borrower / Petitioner Name', type: 'text', required: true },
      { key: 'bankName', label: 'Bank / NBFC Name', type: 'text', required: true },
      { key: 'loanAccountNumber', label: 'Loan Account Number', type: 'text', required: true },
      { key: 'loanType', label: 'Loan Type', type: 'select', required: true, options: ['Home Loan', 'Personal Loan', 'Business Loan', 'Vehicle Loan', 'Education Loan', 'Gold Loan', 'Other'] },
      { key: 'loanAmount', label: 'Original Loan Amount (₹)', type: 'text', required: true },
      { key: 'disputeNature', label: 'Nature of Dispute', type: 'select', required: true, options: ['Wrong Charges', 'Incorrect Interest Calculation', 'Illegal Repossession', 'Wrongful NPA Classification', 'SARFAESI Violation', 'Fraud by Bank', 'Other'] },
      { key: 'disputeFacts', label: 'Facts of Dispute', type: 'textarea', required: true },
      { key: 'amountInDispute', label: 'Amount in Dispute (₹)', type: 'text', required: false },
      { key: 'previousCorrespondence', label: 'Previous Communication with Bank', type: 'textarea', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Loan Dispute Petition/Complaint to DRT/Banking Ombudsman/Civil Court. Include loan details, nature of dispute, illegal charges/actions, RBI guidelines violated, prayer for stay of recovery proceedings, correction of records, and compensation.'
  },

  'Cheque Bounce Notice': {
    category: 'BANKING & FINANCE',
    courtHeader: 'LEGAL NOTICE UNDER SECTION 138 NEGOTIABLE INSTRUMENTS ACT',
    fields: [
      { key: 'payeeName', label: 'Payee (Complainant) Name', type: 'text', required: true },
      { key: 'payeeAddress', label: 'Payee Address', type: 'textarea', required: true },
      { key: 'drawerName', label: 'Drawer (Accused) Name', type: 'text', required: true },
      { key: 'drawerAddress', label: 'Drawer Address', type: 'textarea', required: true },
      { key: 'chequeNumber', label: 'Cheque Number', type: 'text', required: true },
      { key: 'chequeDate', label: 'Cheque Date', type: 'date', required: true },
      { key: 'chequeAmount', label: 'Cheque Amount (₹)', type: 'text', required: true },
      { key: 'bankName', label: 'Drawer\'s Bank Name', type: 'text', required: true },
      { key: 'dishonourDate', label: 'Date of Dishonour', type: 'date', required: true },
      { key: 'dishonourReason', label: 'Reason for Dishonour', type: 'text', required: true, placeholder: 'Insufficient funds, account closed, stop payment...' },
      { key: 'underlyingTransaction', label: 'Underlying Transaction', type: 'textarea', required: true, placeholder: 'Purpose for which cheque was given...' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal legal notice under Section 138 Negotiable Instruments Act 1881. This is mandatory 15-day demand notice before filing complaint. Include payee/drawer details, cheque particulars, dishonour details, legal demand within 15 days of receipt, and warning of criminal prosecution.'
  },

  'Banking Fraud Complaint': {
    category: 'BANKING & FINANCE',
    courtHeader: 'COMPLAINT OF BANKING FRAUD',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'bankName', label: 'Bank / Institution Name', type: 'text', required: true },
      { key: 'accountNumber', label: 'Account Number', type: 'text', required: true },
      { key: 'fraudType', label: 'Type of Fraud', type: 'select', required: true, options: ['Unauthorized Transaction', 'Identity Theft', 'Phishing', 'UPI Fraud', 'Card Cloning', 'KYC Fraud', 'Insider Fraud', 'Other'] },
      { key: 'fraudDate', label: 'Date of Fraud', type: 'date', required: true },
      { key: 'amountDefrauded', label: 'Amount Defrauded (₹)', type: 'text', required: true },
      { key: 'fraudFacts', label: 'How Fraud Occurred', type: 'textarea', required: true },
      { key: 'bankResponse', label: 'Bank\'s Response (if any)', type: 'textarea', required: false },
      { key: 'reliefSought', label: 'Relief / Refund Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a Banking Fraud complaint to be filed with Police Cyber Cell, Banking Ombudsman, and RBI. Include fraud details, transaction references, bank\'s failure to comply with RBI circular on liability in unauthorized transactions, and demand for refund with compensation.'
  },

  'EMI Settlement': {
    category: 'BANKING & FINANCE',
    courtHeader: 'ONE-TIME SETTLEMENT / EMI RESTRUCTURING PROPOSAL',
    fields: [
      { key: 'borrowerName', label: 'Borrower Name', type: 'text', required: true },
      { key: 'bankName', label: 'Bank/NBFC Name', type: 'text', required: true },
      { key: 'loanAccountNumber', label: 'Loan Account Number', type: 'text', required: true },
      { key: 'outstandingAmount', label: 'Outstanding Amount (₹)', type: 'text', required: true },
      { key: 'settlementAmountOffered', label: 'Settlement Amount Offered (₹)', type: 'text', required: true },
      { key: 'reasonForDefault', label: 'Reason for Default', type: 'textarea', required: true },
      { key: 'settlementTerms', label: 'Proposed Settlement Terms', type: 'textarea', required: true },
      { key: 'paymentTimeline', label: 'Payment Timeline', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal One-Time Settlement (OTS) / Loan Restructuring application to the bank. Include borrower hardship, outstanding dues, settlement offer with justification, payment plan, and request for NOC/closure letter upon settlement.'
  },

  'Debt Recovery': {
    category: 'BANKING & FINANCE',
    courtHeader: 'APPLICATION FOR DEBT RECOVERY',
    fields: [
      { key: 'creditorName', label: 'Creditor Name', type: 'text', required: true },
      { key: 'debtorName', label: 'Debtor Name', type: 'text', required: true },
      { key: 'debtorAddress', label: 'Debtor Address', type: 'textarea', required: true },
      { key: 'principalDebt', label: 'Principal Debt (₹)', type: 'text', required: true },
      { key: 'interestAccrued', label: 'Interest Accrued (₹)', type: 'text', required: false },
      { key: 'totalClaim', label: 'Total Claim (₹)', type: 'text', required: true },
      { key: 'transactionFacts', label: 'Transaction Facts', type: 'textarea', required: true },
      { key: 'documents', label: 'Supporting Documents', type: 'textarea', required: false },
      { key: 'courtOrForum', label: 'Court / DRT / NCLT', type: 'text', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a Debt Recovery application/suit. Include creditor/debtor details, debt origin, principal + interest calculation, previous demands, legal basis (Order 37 CPC / DRT Act / IBC), and prayer for recovery decree with interest and costs.'
  },

  'Financial Agreement': {
    category: 'BANKING & FINANCE',
    courtHeader: 'FINANCIAL AGREEMENT / LOAN AGREEMENT',
    fields: [
      { key: 'lenderName', label: 'Lender Name', type: 'text', required: true },
      { key: 'borrowerName', label: 'Borrower Name', type: 'text', required: true },
      { key: 'loanAmount', label: 'Loan Amount (₹)', type: 'text', required: true },
      { key: 'interestRate', label: 'Interest Rate (% p.a.)', type: 'text', required: true },
      { key: 'loanDuration', label: 'Loan Duration', type: 'text', required: true },
      { key: 'repaymentSchedule', label: 'Repayment Schedule', type: 'textarea', required: true },
      { key: 'securityProvided', label: 'Security / Collateral', type: 'textarea', required: false },
      { key: 'penaltyForDefault', label: 'Penalty for Default', type: 'text', required: false },
      { key: 'guarantorDetails', label: 'Guarantor Details (if any)', type: 'text', required: false },
      { key: 'disbursementDate', label: 'Disbursement Date', type: 'date', required: true },
    ],
    systemPrompt: 'Draft a formal Financial/Loan Agreement. Include lender/borrower details, loan amount, interest rate (reducing balance method), repayment schedule, security/collateral, guarantor obligations, default consequences, prepayment terms, and dispute resolution.'
  },

  // ══════════════════════ LABOUR LAW ══════════════════════
  'Employee Complaint': {
    category: 'LABOUR LAW',
    courtHeader: 'COMPLAINT TO LABOUR AUTHORITY',
    fields: [
      { key: 'employeeName', label: 'Employee Name', type: 'text', required: true },
      { key: 'employeeDesignation', label: 'Designation', type: 'text', required: true },
      { key: 'companyName', label: 'Employer / Company Name', type: 'text', required: true },
      { key: 'joiningDate', label: 'Date of Joining', type: 'date', required: false },
      { key: 'complaintType', label: 'Nature of Complaint', type: 'select', required: true, options: ['Salary Non-Payment', 'Wrongful Termination', 'Harassment', 'PF/ESI Non-Deposit', 'Leave Denial', 'Discrimination', 'Other'] },
      { key: 'complaintFacts', label: 'Facts of Complaint', type: 'textarea', required: true },
      { key: 'dateOfGrievance', label: 'Date Grievance Arose', type: 'date', required: true },
      { key: 'previousComplaints', label: 'Previous Internal Complaints', type: 'textarea', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
      { key: 'labourAuthority', label: 'Labour Authority', type: 'text', required: true, placeholder: 'Labour Commissioner / Industrial Tribunal / High Court' },
    ],
    systemPrompt: 'Draft a formal employee complaint to Labour Commissioner / Industrial Tribunal under Industrial Disputes Act / Payment of Wages Act / Factories Act. Include employment details, nature of grievance, facts, applicable labour law violations, and prayer for relief.'
  },

  'Salary Recovery': {
    category: 'LABOUR LAW',
    courtHeader: 'CLAIM FOR RECOVERY OF UNPAID WAGES',
    fields: [
      { key: 'employeeName', label: 'Employee Name', type: 'text', required: true },
      { key: 'employerName', label: 'Employer Name', type: 'text', required: true },
      { key: 'designation', label: 'Designation', type: 'text', required: true },
      { key: 'salaryDue', label: 'Total Salary Due (₹)', type: 'text', required: true },
      { key: 'duePeriod', label: 'Period for Which Salary is Due', type: 'text', required: true, placeholder: 'e.g. March to June 2024' },
      { key: 'lastSalaryReceived', label: 'Last Salary Received', type: 'text', required: false },
      { key: 'deductionDetails', label: 'Wrongful Deductions (if any)', type: 'textarea', required: false },
      { key: 'employerResponse', label: 'Employer\'s Response (if any)', type: 'textarea', required: false },
      { key: 'labourCourt', label: 'Labour Court / Authority', type: 'text', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: false },
    ],
    systemPrompt: 'Draft a salary recovery claim under Payment of Wages Act / Industrial Disputes Act. Include employment particulars, salary breakdown, period of non-payment, employer default, and prayer for payment of arrears with 15% interest and compensation under Section 15 Payment of Wages Act.'
  },

  'Wrongful Termination': {
    category: 'LABOUR LAW',
    courtHeader: 'COMPLAINT FOR WRONGFUL / ILLEGAL TERMINATION',
    fields: [
      { key: 'employeeName', label: 'Employee Name', type: 'text', required: true },
      { key: 'employerName', label: 'Employer / Company Name', type: 'text', required: true },
      { key: 'designation', label: 'Designation', type: 'text', required: true },
      { key: 'joiningDate', label: 'Date of Joining', type: 'date', required: true },
      { key: 'terminationDate', label: 'Date of Termination', type: 'date', required: true },
      { key: 'terminationBasis', label: 'Stated Reason for Termination', type: 'textarea', required: true },
      { key: 'groundsForChallenge', label: 'Grounds for Challenging Termination', type: 'textarea', required: true },
      { key: 'procedureViolated', label: 'Procedure Violated', type: 'textarea', required: true, placeholder: 'Show Cause Notice not given, natural justice violation...' },
      { key: 'settlementOffered', label: 'Settlement Offered by Employer', type: 'text', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true, placeholder: 'Reinstatement, back wages, compensation...' },
    ],
    systemPrompt: 'Draft an Industrial Dispute complaint for wrongful/illegal termination under Section 2A Industrial Disputes Act. Challenge retrenchment without retrenchment compensation, violation of natural justice, discriminatory termination, and pray for reinstatement with continuity of service and full back wages.'
  },

  'Workplace Harassment': {
    category: 'LABOUR LAW',
    courtHeader: 'COMPLAINT OF WORKPLACE HARASSMENT / POSH',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'respondentName', label: 'Respondent / Harasser Name', type: 'text', required: true },
      { key: 'companyName', label: 'Company / Employer Name', type: 'text', required: true },
      { key: 'harassmentType', label: 'Type of Harassment', type: 'select', required: true, options: ['Sexual Harassment (POSH)', 'Verbal/Mental Harassment', 'Physical Harassment', 'Caste-Based Discrimination', 'Gender Discrimination', 'Bullying', 'Other'] },
      { key: 'harassmentDates', label: 'Dates of Harassment Incidents', type: 'text', required: true },
      { key: 'harrassmentFacts', label: 'Detailed Facts', type: 'textarea', required: true },
      { key: 'witnesses', label: 'Witnesses (if any)', type: 'text', required: false },
      { key: 'evidenceAvailable', label: 'Evidence Available', type: 'textarea', required: false },
      { key: 'icComplaintFiled', label: 'Internal Committee Complaint Filed', type: 'select', required: false, options: ['Yes', 'No', 'Not Applicable'] },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a workplace harassment complaint under POSH Act 2013 / Industrial Disputes Act / IPC provisions. Include incidents, dates, pattern of harassment, witnesses, impact on work, complaint to Internal Committee, and prayer for inquiry, disciplinary action, and compensation.'
  },

  'PF Dispute': {
    category: 'LABOUR LAW',
    courtHeader: 'COMPLAINT REGARDING PF / ESIC NON-COMPLIANCE',
    fields: [
      { key: 'employeeName', label: 'Employee Name', type: 'text', required: true },
      { key: 'employerName', label: 'Employer Name', type: 'text', required: true },
      { key: 'pfAccountNumber', label: 'PF Account / UAN Number', type: 'text', required: false },
      { key: 'disputeType', label: 'Type of Dispute', type: 'select', required: true, options: ['PF Not Deposited', 'PF Deducted but Not Deposited', 'Wrong PF Amount', 'ESIC Not Provided', 'Withdrawal Issue', 'Transfer Issue'] },
      { key: 'amountInDispute', label: 'Amount in Dispute (₹)', type: 'text', required: false },
      { key: 'periodCovered', label: 'Period Covered', type: 'text', required: true },
      { key: 'complaintFacts', label: 'Facts of the Dispute', type: 'textarea', required: true },
      { key: 'pfOffice', label: 'EPFO Office', type: 'text', required: true, placeholder: 'Regional PF Office address' },
    ],
    systemPrompt: 'Draft a complaint/grievance to EPFO Regional Office regarding PF non-compliance under Employees Provident Fund and Miscellaneous Provisions Act 1952. Include employment details, PF violation, employer\'s default, and prayer for recovery + penalty against employer.'
  },

  'Labour Notice': {
    category: 'LABOUR LAW',
    courtHeader: 'LABOUR LAW NOTICE',
    fields: [
      { key: 'employeeName', label: 'Employee Name', type: 'text', required: true },
      { key: 'employerName', label: 'Employer Name', type: 'text', required: true },
      { key: 'noticeSubject', label: 'Subject of Notice', type: 'text', required: true },
      { key: 'labourViolations', label: 'Labour Law Violations', type: 'textarea', required: true },
      { key: 'reliefDemanded', label: 'Relief Demanded', type: 'textarea', required: true },
      { key: 'timeLimit', label: 'Time Limit', type: 'text', required: true, placeholder: 'e.g. 15 days' },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Labour Law Notice to employer citing violations of Payment of Wages Act, Factories Act, Minimum Wages Act, Shops and Establishments Act, or Industrial Disputes Act. Demand compliance within specified period, warning of complaint to Labour Commissioner and legal proceedings.'
  },

  // ══════════════════════ CONSUMER COURT ══════════════════════
  'Consumer Complaint': {
    category: 'CONSUMER COURT',
    courtHeader: 'BEFORE THE HON\'BLE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'complainantAddress', label: 'Complainant Address', type: 'textarea', required: true },
      { key: 'oppositeName', label: 'Opposite Party Name', type: 'text', required: true },
      { key: 'oppositeAddress', label: 'Opposite Party Address', type: 'textarea', required: true },
      { key: 'consumerForumLevel', label: 'Forum Level', type: 'select', required: true, options: ['District Commission (up to ₹50L)', 'State Commission (₹50L-₹2Cr)', 'National Commission (above ₹2Cr)'] },
      { key: 'productService', label: 'Product / Service Purchased', type: 'text', required: true },
      { key: 'purchaseDate', label: 'Date of Purchase', type: 'date', required: true },
      { key: 'amountPaid', label: 'Amount Paid (₹)', type: 'text', required: true },
      { key: 'deficiencyNature', label: 'Nature of Deficiency / Defect', type: 'textarea', required: true },
      { key: 'complaintFacts', label: 'Facts of the Complaint', type: 'textarea', required: true },
      { key: 'previousComplaints', label: 'Previous Complaints to Company', type: 'textarea', required: false },
      { key: 'compensationClaimed', label: 'Total Compensation Claimed (₹)', type: 'text', required: true },
      { key: 'advocateName', label: 'Advocate / Self Represented', type: 'text', required: false },
    ],
    systemPrompt: 'Draft a formal Consumer Complaint under Consumer Protection Act 2019. Include complainant/opposite party details, purchase details, nature of deficiency/unfair trade practice, facts, previous complaints, and prayer for refund + compensation + litigation costs under Section 35 CPA.'
  },

  'Refund Notice': {
    category: 'CONSUMER COURT',
    courtHeader: 'LEGAL NOTICE FOR REFUND',
    fields: [
      { key: 'consumerName', label: 'Consumer Name', type: 'text', required: true },
      { key: 'companyName', label: 'Company / Merchant Name', type: 'text', required: true },
      { key: 'productService', label: 'Product / Service', type: 'text', required: true },
      { key: 'purchaseDate', label: 'Date of Purchase', type: 'date', required: true },
      { key: 'amountPaid', label: 'Amount Paid (₹)', type: 'text', required: true },
      { key: 'reasonForRefund', label: 'Reason for Refund', type: 'textarea', required: true },
      { key: 'refundDemanded', label: 'Refund Amount Demanded (₹)', type: 'text', required: true },
      { key: 'previousRefundRequests', label: 'Previous Refund Requests', type: 'textarea', required: false },
      { key: 'timeLimit', label: 'Time Given for Refund', type: 'text', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: false },
    ],
    systemPrompt: 'Draft a formal Refund Notice under Consumer Protection Act 2019. Include purchase details, defect/deficiency facts, refund demand, previous requests ignored, time limit for compliance, and warning of consumer forum complaint with compensation claim.'
  },

  'Product Defect Case': {
    category: 'CONSUMER COURT',
    courtHeader: 'CONSUMER COMPLAINT — PRODUCT LIABILITY',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'companyName', label: 'Manufacturer / Seller', type: 'text', required: true },
      { key: 'productName', label: 'Product Name & Model', type: 'text', required: true },
      { key: 'purchaseDate', label: 'Purchase Date', type: 'date', required: true },
      { key: 'productPrice', label: 'Product Price (₹)', type: 'text', required: true },
      { key: 'defectDescription', label: 'Nature of Defect', type: 'textarea', required: true },
      { key: 'warrantyPeriod', label: 'Warranty Period', type: 'text', required: false },
      { key: 'harmCaused', label: 'Harm / Loss Caused', type: 'textarea', required: true },
      { key: 'companyResponse', label: 'Company\'s Response', type: 'textarea', required: false },
      { key: 'compensationClaimed', label: 'Compensation Claimed (₹)', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a Product Liability complaint under Consumer Protection Act 2019 Chapter VI. Include product details, defect description, injury/loss caused, manufacturer strict liability, and prayer for refund/replacement + compensation for injury, mental agony, litigation costs.'
  },

  'Online Shopping Fraud': {
    category: 'CONSUMER COURT',
    courtHeader: 'COMPLAINT — ONLINE SHOPPING FRAUD / E-COMMERCE DEFICIENCY',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'platformName', label: 'E-Commerce Platform', type: 'text', required: true, placeholder: 'Amazon, Flipkart, Meesho...' },
      { key: 'orderNumber', label: 'Order Number', type: 'text', required: true },
      { key: 'orderDate', label: 'Order Date', type: 'date', required: true },
      { key: 'productOrdered', label: 'Product Ordered', type: 'text', required: true },
      { key: 'amountPaid', label: 'Amount Paid (₹)', type: 'text', required: true },
      { key: 'fraudType', label: 'Type of Issue', type: 'select', required: true, options: ['Counterfeit Product', 'Non-Delivery', 'Wrong Product Delivered', 'Refund Not Processed', 'Fake Listing', 'OTP Fraud'] },
      { key: 'fraudFacts', label: 'Facts of the Issue', type: 'textarea', required: true },
      { key: 'platformResponse', label: 'Platform\'s Response', type: 'textarea', required: false },
      { key: 'compensationClaimed', label: 'Compensation Claimed (₹)', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a Consumer Complaint against e-commerce platform under Consumer Protection (E-Commerce) Rules 2020 and CPA 2019. Include order details, fraud/deficiency nature, platform\'s failure, and prayer for refund + e-commerce rule violation penalty + compensation.'
  },

  'Service Deficiency Complaint': {
    category: 'CONSUMER COURT',
    courtHeader: 'CONSUMER COMPLAINT — SERVICE DEFICIENCY',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'serviceName', label: 'Service Provider Name', type: 'text', required: true },
      { key: 'serviceType', label: 'Type of Service', type: 'text', required: true, placeholder: 'Hospital, Builder, Telecom, Insurance, Education...' },
      { key: 'serviceDate', label: 'Date of Service', type: 'date', required: true },
      { key: 'amountPaid', label: 'Amount Paid (₹)', type: 'text', required: true },
      { key: 'deficiencyFacts', label: 'Nature of Service Deficiency', type: 'textarea', required: true },
      { key: 'losses', label: 'Loss / Harm Suffered', type: 'textarea', required: true },
      { key: 'serviceProviderResponse', label: 'Service Provider\'s Response', type: 'textarea', required: false },
      { key: 'compensationClaimed', label: 'Compensation Claimed (₹)', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a Consumer Complaint for service deficiency under CPA 2019 Section 2(11). Include service details, contracted vs delivered service gap, deficiency facts, losses, and prayer for refund + compensation for mental agony + litigation costs.'
  },

  // ══════════════════════ CYBER LAW ══════════════════════
  'Social Media Harassment': {
    category: 'CYBER LAW',
    courtHeader: 'COMPLAINT — SOCIAL MEDIA HARASSMENT / CYBERBULLYING',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'harasser', label: 'Harasser\'s Name / Profile', type: 'text', required: true },
      { key: 'platform', label: 'Social Media Platform', type: 'select', required: true, options: ['Instagram', 'Facebook', 'Twitter/X', 'WhatsApp', 'Telegram', 'YouTube', 'Snapchat', 'LinkedIn', 'Other'] },
      { key: 'harassmentType', label: 'Type of Harassment', type: 'select', required: true, options: ['Abusive Messages', 'Stalking', 'Morphed Images', 'Fake Profile', 'Defamatory Content', 'Sextortion', 'Doxxing', 'Other'] },
      { key: 'startDate', label: 'Harassment Started From', type: 'date', required: true },
      { key: 'harassmentFacts', label: 'Detailed Facts', type: 'textarea', required: true },
      { key: 'digitalEvidence', label: 'Screenshots / Evidence', type: 'textarea', required: false },
      { key: 'platformAction', label: 'Platform\'s Action Taken', type: 'textarea', required: false },
      { key: 'ipcSections', label: 'Applicable Sections', type: 'text', required: false, placeholder: 'IT Act 66A, 67; IPC 354D, 507...' },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a cyber crime complaint for social media harassment under IT Act 2000 Section 66C, 67 and IPC 354D, 509, 507. Include platform details, harassment type, digital evidence, NCPCR/cybercrime portal reference, and prayer for account takedown, FIR registration, and compensation.'
  },

  'Online Scam Complaint': {
    category: 'CYBER LAW',
    courtHeader: 'COMPLAINT — ONLINE FRAUD / SCAM',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'scamType', label: 'Type of Online Scam', type: 'select', required: true, options: ['Job Fraud', 'Investment Fraud', 'Lottery Scam', 'Romance Scam', 'KYC Fraud', 'Tech Support Scam', 'Cryptocurrency Fraud', 'Other'] },
      { key: 'scamDate', label: 'Date of Scam', type: 'date', required: true },
      { key: 'amountLost', label: 'Amount Lost (₹)', type: 'text', required: true },
      { key: 'scammerContact', label: 'Scammer\'s Contact Details', type: 'text', required: false },
      { key: 'transactionDetails', label: 'Transaction / Payment Details', type: 'textarea', required: true },
      { key: 'scamFacts', label: 'How the Scam Occurred', type: 'textarea', required: true },
      { key: 'evidenceAvailable', label: 'Evidence Available', type: 'textarea', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a cyber crime FIR/complaint for online fraud under IT Act 2000 Section 66C, 66D and IPC 420, 419. Include cybercrime helpline (1930) filing reference, transaction details, modus operandi, and prayer for FIR, account freeze, and recovery of lost amount.'
  },

  'Data Privacy Complaint': {
    category: 'CYBER LAW',
    courtHeader: 'COMPLAINT — DATA PRIVACY VIOLATION',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'companyName', label: 'Data Controller / Company', type: 'text', required: true },
      { key: 'dataBreachDate', label: 'Date of Breach / Discovery', type: 'date', required: true },
      { key: 'dataExposed', label: 'Data Exposed', type: 'textarea', required: true, placeholder: 'Name, Aadhaar, financial data, health data...' },
      { key: 'howDiscovered', label: 'How Breach Was Discovered', type: 'textarea', required: true },
      { key: 'harmCaused', label: 'Harm Caused', type: 'textarea', required: true },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a Data Privacy Violation complaint under IT Act 2000 Section 43A, IT (Reasonable Security Practices) Rules 2011 and pending DPDP Act 2023. Include data breach details, company\'s failure to protect, harm suffered, and prayer for compensation and injunction to secure data.'
  },

  'Hacking Complaint': {
    category: 'CYBER LAW',
    courtHeader: 'COMPLAINT — COMPUTER HACKING / UNAUTHORIZED ACCESS',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'systemHacked', label: 'System / Account Hacked', type: 'text', required: true },
      { key: 'hackingDate', label: 'Date of Hacking', type: 'date', required: true },
      { key: 'hackingFacts', label: 'How Hacking Occurred', type: 'textarea', required: true },
      { key: 'dataStolen', label: 'Data / Files Stolen/Damaged', type: 'textarea', required: false },
      { key: 'financialLoss', label: 'Financial Loss (₹)', type: 'text', required: false },
      { key: 'suspectedHacker', label: 'Suspected Hacker Details', type: 'text', required: false },
      { key: 'evidenceAvailable', label: 'Digital Evidence', type: 'textarea', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a hacking complaint under IT Act 2000 Section 43, 66, 66B and IPC 379. Include system access details, unauthorized intrusion facts, data stolen, financial loss, and prayer for FIR, cyber forensic investigation, and compensation.'
  },

  'Fake Profile Complaint': {
    category: 'CYBER LAW',
    courtHeader: 'COMPLAINT — IMPERSONATION / FAKE PROFILE',
    fields: [
      { key: 'complainantName', label: 'Complainant (Victim) Name', type: 'text', required: true },
      { key: 'platform', label: 'Platform Where Fake Profile Exists', type: 'text', required: true },
      { key: 'fakeProfileURL', label: 'Fake Profile URL / ID', type: 'text', required: false },
      { key: 'profileCreatedDate', label: 'When Profile Was Created / Discovered', type: 'date', required: false },
      { key: 'impersonationFacts', label: 'How Impersonation Occurred', type: 'textarea', required: true },
      { key: 'harmCaused', label: 'Harm / Damage Caused', type: 'textarea', required: true },
      { key: 'evidenceScreenshots', label: 'Evidence / Screenshots', type: 'textarea', required: false },
      { key: 'platformAction', label: 'Platform\'s Action', type: 'text', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a complaint for identity theft/impersonation under IT Act 2000 Section 66C and IPC 419, 468. Include fake profile evidence, harm to reputation, financial damage, and prayer for FIR, profile takedown order, and compensation.'
  },

  'Cyber Defamation': {
    category: 'CYBER LAW',
    courtHeader: 'COMPLAINT — CYBER DEFAMATION',
    fields: [
      { key: 'complainantName', label: 'Complainant Name', type: 'text', required: true },
      { key: 'accusedName', label: 'Accused Name / Profile', type: 'text', required: true },
      { key: 'defamatoryContent', label: 'Nature of Defamatory Content', type: 'textarea', required: true },
      { key: 'platform', label: 'Platform / Website', type: 'text', required: true },
      { key: 'publicationDate', label: 'Date Published', type: 'date', required: true },
      { key: 'reputationDamage', label: 'Reputation / Business Damage', type: 'textarea', required: true },
      { key: 'evidenceLinks', label: 'URLs / Screenshot Evidence', type: 'textarea', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a cyber defamation complaint under IPC 499, 500 and IT Act Section 66A (principles still apply). Include defamatory publication details, falsity of statements, damage to reputation, and prayer for FIR, content removal order, and compensation.'
  },

  // ══════════════════════ TAX & GST ══════════════════════
  'GST Notice Reply': {
    category: 'TAX & GST',
    courtHeader: 'REPLY TO SHOW CAUSE NOTICE — GST DEPARTMENT',
    fields: [
      { key: 'taxpayerName', label: 'Taxpayer / Company Name', type: 'text', required: true },
      { key: 'gstin', label: 'GSTIN', type: 'text', required: true },
      { key: 'noticeNumber', label: 'Notice Number / DRC Reference', type: 'text', required: true },
      { key: 'noticeDate', label: 'Notice Date', type: 'date', required: true },
      { key: 'noticePeriod', label: 'Tax Period in Question', type: 'text', required: true },
      { key: 'taxDemanded', label: 'Tax / Penalty Demanded (₹)', type: 'text', required: true },
      { key: 'groundsOfDemand', label: 'Grounds Stated in Notice', type: 'textarea', required: true },
      { key: 'replyGrounds', label: 'Grounds of Reply / Defence', type: 'textarea', required: true, placeholder: 'Input tax credit entitlement, classification correct, exports properly documented...' },
      { key: 'documentsEnclosed', label: 'Documents to be Enclosed', type: 'textarea', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a comprehensive Reply to GST Show Cause Notice under CGST Act 2017. Include taxpayer details, GSTIN, notice reference, factual reply, legal grounds under relevant CGST sections, supporting evidence, and prayer for dropping/reducing the demand.'
  },

  'Income Tax Appeal': {
    category: 'TAX & GST',
    courtHeader: 'APPEAL BEFORE COMMISSIONER OF INCOME TAX (APPEALS)',
    fields: [
      { key: 'appellantName', label: 'Appellant Name', type: 'text', required: true },
      { key: 'pan', label: 'PAN Number', type: 'text', required: true },
      { key: 'assessmentYear', label: 'Assessment Year', type: 'text', required: true, placeholder: 'e.g. AY 2023-24' },
      { key: 'assessmentOrderDate', label: 'Date of Assessment Order', type: 'date', required: true },
      { key: 'taxDemand', label: 'Tax Demand (₹)', type: 'text', required: true },
      { key: 'groundsOfAppeal', label: 'Grounds of Appeal', type: 'textarea', required: true },
      { key: 'factsAndLaw', label: 'Facts & Legal Arguments', type: 'textarea', required: true },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
      { key: 'taxPaid', label: 'Tax Paid Under Protest (₹)', type: 'text', required: false },
    ],
    systemPrompt: 'Draft a formal Income Tax Appeal before CIT(A) under Section 246A of Income Tax Act 1961. Include grounds of appeal, legal arguments against additions/disallowances, case laws supporting appellant\'s position, and prayer for deletion/reduction of demand.'
  },

  'Tax Dispute': {
    category: 'TAX & GST',
    courtHeader: 'TAX DISPUTE PETITION / OBJECTION',
    fields: [
      { key: 'taxpayerName', label: 'Taxpayer Name', type: 'text', required: true },
      { key: 'pan_gstin', label: 'PAN / GSTIN', type: 'text', required: true },
      { key: 'taxType', label: 'Tax Type', type: 'select', required: true, options: ['Income Tax', 'GST', 'TDS', 'Corporate Tax', 'Customs', 'State Tax'] },
      { key: 'disputePeriod', label: 'Dispute Period', type: 'text', required: true },
      { key: 'amountInDispute', label: 'Amount in Dispute (₹)', type: 'text', required: true },
      { key: 'disputeFacts', label: 'Facts of the Dispute', type: 'textarea', required: true },
      { key: 'legalGrounds', label: 'Legal Grounds', type: 'textarea', required: true },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a Tax Dispute Petition / Rectification Application / Writ Petition against arbitrary tax assessment. Include taxpayer details, assessment facts, legal errors in assessment, applicable case laws, and prayer for reassessment or quashing of demand.'
  },

  'GST Registration Draft': {
    category: 'TAX & GST',
    courtHeader: 'GST REGISTRATION / COMPLIANCE DOCUMENT',
    fields: [
      { key: 'businessName', label: 'Business / Trade Name', type: 'text', required: true },
      { key: 'constitutionType', label: 'Constitution of Business', type: 'select', required: true, options: ['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'HUF', 'Trust', 'Other'] },
      { key: 'principalAddress', label: 'Principal Place of Business', type: 'textarea', required: true },
      { key: 'stateJurisdiction', label: 'State / Jurisdiction', type: 'text', required: true },
      { key: 'businessActivity', label: 'Business Activity / HSN/SAC', type: 'textarea', required: true },
      { key: 'turnoverEstimate', label: 'Estimated Annual Turnover (₹)', type: 'text', required: true },
      { key: 'applicantName', label: 'Authorized Signatory Name', type: 'text', required: true },
      { key: 'gstPurpose', label: 'Purpose (New / Amendment / Cancellation)', type: 'select', required: true, options: ['New Registration', 'Amendment', 'Cancellation', 'Voluntary Registration', 'Composition Scheme'] },
    ],
    systemPrompt: 'Draft a GST Registration Application covering business details, registration type, HSN/SAC codes, bank account particulars, authorized signatory, digital signature requirements, and compliance obligations post-registration under CGST Act 2017.'
  },

  // ══════════════════════ INTELLECTUAL PROPERTY ══════════════════════
  'Trademark Registration': {
    category: 'INTELLECTUAL PROPERTY',
    courtHeader: 'APPLICATION FOR TRADEMARK REGISTRATION',
    fields: [
      { key: 'applicantName', label: 'Applicant Name / Company', type: 'text', required: true },
      { key: 'trademarkName', label: 'Trademark / Brand Name', type: 'text', required: true },
      { key: 'trademarkClass', label: 'Trademark Class (1-45)', type: 'text', required: true, placeholder: 'e.g. Class 25 (Clothing), Class 42 (Software)' },
      { key: 'goodsServices', label: 'Goods / Services Description', type: 'textarea', required: true },
      { key: 'firstUseDate', label: 'Date of First Use in India', type: 'date', required: false },
      { key: 'trademarkType', label: 'Trademark Type', type: 'select', required: true, options: ['Word Mark', 'Logo/Device', 'Combined (Word+Logo)', 'Sound Mark', 'Colour Mark', 'Certification Mark'] },
      { key: 'existingRegistration', label: 'Existing Similar Marks (if known)', type: 'text', required: false },
      { key: 'priority', label: 'Priority Claim (Paris Convention)', type: 'text', required: false },
      { key: 'applicantAddress', label: 'Applicant Address', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a Trademark Registration Application under Trade Marks Act 1999. Include TM-A application format, applicant details, mark description, class specification, goods/services, user affidavit, and statement of distinctive character. Include examination procedure notes.'
  },

  'Copyright Complaint': {
    category: 'INTELLECTUAL PROPERTY',
    courtHeader: 'COMPLAINT FOR COPYRIGHT INFRINGEMENT',
    fields: [
      { key: 'authorName', label: 'Author / Copyright Owner Name', type: 'text', required: true },
      { key: 'workTitle', label: 'Title of Copyrighted Work', type: 'text', required: true },
      { key: 'workType', label: 'Type of Work', type: 'select', required: true, options: ['Literary Work', 'Musical Work', 'Artistic Work', 'Cinematograph Film', 'Sound Recording', 'Computer Program', 'Other'] },
      { key: 'creationDate', label: 'Date of Creation', type: 'date', required: false },
      { key: 'infringerName', label: 'Infringer Name / Entity', type: 'text', required: true },
      { key: 'infringementFacts', label: 'Nature of Infringement', type: 'textarea', required: true },
      { key: 'infringingWork', label: 'Infringing Work / URL', type: 'text', required: false },
      { key: 'damagesClaimed', label: 'Damages Claimed (₹)', type: 'text', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
    ],
    systemPrompt: 'Draft a Copyright Infringement Complaint/Suit under Copyright Act 1957. Include copyright ownership, originality of work, unauthorized copying/reproduction, defendant\'s act of infringement, damages, and prayer for injunction + damages + delivery-up + account of profits.'
  },

  'Patent Draft': {
    category: 'INTELLECTUAL PROPERTY',
    courtHeader: 'PATENT APPLICATION DRAFT',
    fields: [
      { key: 'inventorName', label: 'Inventor / Applicant Name', type: 'text', required: true },
      { key: 'inventionTitle', label: 'Title of Invention', type: 'text', required: true },
      { key: 'technicalField', label: 'Technical Field', type: 'text', required: true, placeholder: 'e.g. Mechanical Engineering, Software, Pharmaceuticals' },
      { key: 'inventionDescription', label: 'Invention Description', type: 'textarea', required: true, placeholder: 'What problem does it solve? How does it work?' },
      { key: 'novelty', label: 'Novelty / Innovation', type: 'textarea', required: true, placeholder: 'What is new and inventive about this?' },
      { key: 'priorArt', label: 'Prior Art (Existing Solutions)', type: 'textarea', required: false },
      { key: 'claims', label: 'Key Claims', type: 'textarea', required: true, placeholder: 'What you want patent protection for...' },
      { key: 'inventionDate', label: 'Date of Invention', type: 'date', required: false },
    ],
    systemPrompt: 'Draft a formal Patent Application specification under Patents Act 1970. Include title of invention, field, background/prior art, summary, detailed description, working mechanism, claims (independent + dependent), and abstract. Structure in proper patent specification format.'
  },

  'IP Infringement Notice': {
    category: 'INTELLECTUAL PROPERTY',
    courtHeader: 'CEASE AND DESIST / IP INFRINGEMENT NOTICE',
    fields: [
      { key: 'ipOwnerName', label: 'IP Owner Name', type: 'text', required: true },
      { key: 'infringerName', label: 'Infringer Name / Company', type: 'text', required: true },
      { key: 'ipType', label: 'Type of IP', type: 'select', required: true, options: ['Trademark', 'Copyright', 'Patent', 'Trade Secret', 'Design Rights'] },
      { key: 'ipRegistrationNo', label: 'IP Registration Number', type: 'text', required: false },
      { key: 'infringingActivity', label: 'Infringing Activity', type: 'textarea', required: true },
      { key: 'howDiscovered', label: 'When/How Infringement Discovered', type: 'textarea', required: true },
      { key: 'damagesSuffered', label: 'Damages Suffered', type: 'textarea', required: false },
      { key: 'demandsMade', label: 'Demands Made', type: 'textarea', required: true, placeholder: 'Cease use, destroy infringing goods, account for profits, pay damages...' },
      { key: 'timeLimit', label: 'Time Limit to Comply', type: 'text', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Cease and Desist / IP Infringement Notice. Include IP ownership proof, infringement details, legal rights under TM Act / Copyright Act / Patents Act, demand to immediately stop infringement + destroy infringing copies + pay damages, and warning of civil + criminal proceedings.'
  },

  // ══════════════════════ COURT & DOCUMENTS ══════════════════════
  'Affidavit': {
    category: 'COURT & DOCUMENTS',
    courtHeader: 'AFFIDAVIT',
    fields: [
      { key: 'deponentName', label: 'Deponent Name', type: 'text', required: true },
      { key: 'deponentAge', label: 'Age', type: 'text', required: true },
      { key: 'deponentAddress', label: 'Deponent Address', type: 'textarea', required: true },
      { key: 'courtPurpose', label: 'Purpose / Before Which Authority', type: 'text', required: true, placeholder: 'High Court, District Court, Notary, Government Office...' },
      { key: 'affidavitSubject', label: 'Subject of Affidavit', type: 'text', required: true },
      { key: 'statements', label: 'Statements / Declarations', type: 'textarea', required: true, placeholder: 'Numbered statements to be made under oath...' },
      { key: 'place', label: 'Place of Execution', type: 'text', required: true },
      { key: 'executionDate', label: 'Date of Execution', type: 'date', required: true },
      { key: 'witnessName', label: 'Witness Name', type: 'text', required: false },
    ],
    systemPrompt: 'Draft a formal Affidavit with proper header (Affidavit format), deponent identification, statement "I, the deponent above named, do hereby solemnly affirm and declare as under:", numbered statements, oath/affirmation clause, signature space, and notary/oath commissioner attestation space.'
  },

  'RTI Application': {
    category: 'COURT & DOCUMENTS',
    courtHeader: 'APPLICATION UNDER RIGHT TO INFORMATION ACT, 2005',
    fields: [
      { key: 'applicantName', label: 'Applicant Name', type: 'text', required: true },
      { key: 'applicantAddress', label: 'Applicant Address', type: 'textarea', required: true },
      { key: 'applicantContact', label: 'Contact / Email', type: 'text', required: false },
      { key: 'publicAuthority', label: 'Public Authority / Department', type: 'text', required: true, placeholder: 'Name of government department/office' },
      { key: 'pioName', label: 'Public Information Officer (if known)', type: 'text', required: false },
      { key: 'informationSought', label: 'Information Sought', type: 'textarea', required: true, placeholder: 'List specific information/documents needed — numbered points' },
      { key: 'periodCovered', label: 'Time Period Covered', type: 'text', required: false, placeholder: 'e.g. 2020-2024' },
      { key: 'preferredFormat', label: 'Preferred Format', type: 'select', required: false, options: ['Physical Copies', 'Electronic Copy', 'Inspection', 'Any available format'] },
      { key: 'feePaid', label: 'Application Fee', type: 'text', required: false, placeholder: '₹10 via IPO/DD/online' },
    ],
    systemPrompt: 'Draft a formal RTI Application under Section 6 of the Right to Information Act 2005. Include applicant details, clear numbered information points, specific document references, reasonable time period, request for waiver if BPL, and information for filing fee payment.'
  },

  'Writ Petition': {
    category: 'COURT & DOCUMENTS',
    courtHeader: 'IN THE HON\'BLE HIGH COURT',
    fields: [
      { key: 'petitionerName', label: 'Petitioner Name', type: 'text', required: true },
      { key: 'respondentName', label: 'Respondent (Government/Authority)', type: 'text', required: true },
      { key: 'courtName', label: 'High Court Name', type: 'text', required: true },
      { key: 'writType', label: 'Type of Writ', type: 'select', required: true, options: ['Writ of Mandamus', 'Writ of Certiorari', 'Writ of Habeas Corpus', 'Writ of Prohibition', 'Writ of Quo Warranto'] },
      { key: 'fundamentalRightsViolated', label: 'Fundamental Rights Violated', type: 'text', required: true, placeholder: 'Article 14, 19, 21...' },
      { key: 'challengedAction', label: 'Challenged Order / Action', type: 'textarea', required: true },
      { key: 'petitionFacts', label: 'Facts of the Case', type: 'textarea', required: true },
      { key: 'legalGrounds', label: 'Legal Grounds', type: 'textarea', required: true },
      { key: 'urgency', label: 'Urgency for Ad-Interim Relief', type: 'textarea', required: false },
      { key: 'reliefSought', label: 'Relief Sought', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a formal Writ Petition under Article 226 / 32 of the Constitution of India. Include petitioner/respondent details, constitutional rights violated, challenged government action, legal grounds, urgency for ad-interim stay/relief, and appropriate writ prayer (mandamus/certiorari/habeas corpus etc.).'
  },

  'Court Argument': {
    category: 'COURT & DOCUMENTS',
    courtHeader: 'WRITTEN ARGUMENTS / SYNOPSIS',
    fields: [
      { key: 'caseTitle', label: 'Case Title', type: 'text', required: true },
      { key: 'caseNumber', label: 'Case Number', type: 'text', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true },
      { key: 'clientSide', label: 'Arguments On Behalf Of', type: 'select', required: true, options: ['Plaintiff / Petitioner', 'Defendant / Respondent', 'Accused', 'Intervenor'] },
      { key: 'hearingDate', label: 'Date of Hearing', type: 'date', required: false },
      { key: 'issuesForDecision', label: 'Issues for Decision', type: 'textarea', required: true },
      { key: 'factualBackground', label: 'Factual Background', type: 'textarea', required: true },
      { key: 'legalArguments', label: 'Legal Arguments', type: 'textarea', required: true },
      { key: 'caseLawsCited', label: 'Case Laws / Precedents Cited', type: 'textarea', required: false },
      { key: 'conclusion', label: 'Conclusion / Prayer', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft comprehensive Written Arguments / Synopsis for submission before court. Include case identification, issues framed, factual synopsis, legal propositions with supporting case law citations, rebuttal of opponent\'s arguments, and conclusion with prayer.'
  },

  'Evidence Summary': {
    category: 'COURT & DOCUMENTS',
    courtHeader: 'EVIDENCE SUMMARY / EXHIBIT LIST',
    fields: [
      { key: 'caseTitle', label: 'Case Title', type: 'text', required: true },
      { key: 'caseNumber', label: 'Case Number', type: 'text', required: true },
      { key: 'courtName', label: 'Court Name', type: 'text', required: true },
      { key: 'documentaryEvidence', label: 'Documentary Evidence', type: 'textarea', required: true, placeholder: 'List all documents with Exhibit numbers — Ex. A, Ex. B...' },
      { key: 'witnessEvidence', label: 'Witness Evidence', type: 'textarea', required: false, placeholder: 'List witnesses and their testimony summary...' },
      { key: 'forensicEvidence', label: 'Forensic / Expert Evidence', type: 'textarea', required: false },
      { key: 'electronicEvidence', label: 'Electronic Evidence', type: 'textarea', required: false },
      { key: 'evidenceSummary', label: 'Evidence Analysis / How it Proves Case', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: true },
    ],
    systemPrompt: 'Draft a comprehensive Evidence Summary / Exhibit List for court submission. Organize evidence into categories (documentary, oral, forensic, electronic), number each exhibit, explain relevance and how each piece proves the case, and include chain of custody notes for key exhibits.'
  },

  'Legal Research': {
    category: 'COURT & DOCUMENTS',
    courtHeader: 'LEGAL RESEARCH MEMORANDUM',
    fields: [
      { key: 'researchTitle', label: 'Research Question / Topic', type: 'text', required: true },
      { key: 'contextFacts', label: 'Factual Context', type: 'textarea', required: true },
      { key: 'legalIssues', label: 'Legal Issues to Research', type: 'textarea', required: true },
      { key: 'applicableLaws', label: 'Applicable Laws / Acts', type: 'textarea', required: false },
      { key: 'jurisdiction', label: 'Jurisdiction', type: 'text', required: true, placeholder: 'Indian courts / Specific State / International' },
      { key: 'specificQuery', label: 'Specific Research Query', type: 'textarea', required: true },
      { key: 'purposeOfResearch', label: 'Purpose / Use Case', type: 'text', required: true },
    ],
    systemPrompt: 'Prepare a comprehensive Legal Research Memorandum. Include statement of issues, short answer, applicable legal framework, detailed analysis with case law citations (Supreme Court and High Court precedents), comparative analysis if relevant, and conclusion with practical recommendations. Format as professional legal memo.'
  },
};

// ─── Utility: Get template or return a generic fallback ───────────────────────
export function getTemplate(draftType) {
  return DRAFT_TEMPLATES[draftType] || {
    category: 'GENERAL',
    courtHeader: 'LEGAL DOCUMENT',
    fields: [
      { key: 'petitionerName', label: 'Party Name (Petitioner/Plaintiff)', type: 'text', required: true },
      { key: 'respondentName', label: 'Opposite Party Name', type: 'text', required: true },
      { key: 'courtName', label: 'Court / Forum Name', type: 'text', required: true },
      { key: 'caseNumber', label: 'Case / File Number', type: 'text', required: false },
      { key: 'incidentDate', label: 'Incident / Transaction Date', type: 'date', required: false },
      { key: 'facts', label: 'Facts of the Matter', type: 'textarea', required: true, placeholder: 'Detailed factual background...' },
      { key: 'legalGrounds', label: 'Legal Grounds / Sections', type: 'textarea', required: false },
      { key: 'reliefSought', label: 'Relief / Prayer Sought', type: 'textarea', required: true },
      { key: 'advocateName', label: 'Advocate Name', type: 'text', required: false },
    ],
    systemPrompt: `You are an expert Indian advocate. Draft a comprehensive, court-ready legal document for: ${draftType}. Include all standard sections: parties, facts, grounds, legal provisions, and prayer. Format professionally.`
  };
}

export const GENERATION_MODES = [
  { id: 'standard', label: 'Generate Draft', icon: '📄', description: 'Standard legal draft', color: 'indigo' },
  { id: 'enhanced', label: 'Enhanced Draft', icon: '⚡', description: 'Enhanced with case laws & precedents', color: 'violet' },
  { id: 'court_ready', label: 'Court-Ready Draft', icon: '⚖️', description: 'Full official court format', color: 'purple' },
  { id: 'hindi', label: 'Hindi Version', icon: '🇮🇳', description: 'Generate in Hindi', color: 'orange' },
  { id: 'english', label: 'English Version', icon: '🌐', description: 'Generate in English', color: 'blue' },
  { id: 'bilingual', label: 'Bilingual Version', icon: '🔀', description: 'Hindi + English both', color: 'green' },
];
