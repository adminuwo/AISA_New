/**
 * Comprehensive Legal Research Database
 * Includes all 56 major legal categories, IPC/BNS references, acts, landmark judgments, and metadata.
 */

export const LEGAL_CASE_DATABASE = [
  {
    id: "civil_law",
    name: "Specific Performance of Contract",
    category: "Civil Law",
    courtType: "District Court / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Specific Relief Act", enactmentYear: "1963", lastAmendmentYear: "2018" },
      { name: "Code of Civil Procedure", enactmentYear: "1908", lastAmendmentYear: "2002" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Adhunik Steels Ltd. v. Orissa Manganese and Minerals Pvt. Ltd.",
        court: "Supreme Court of India",
        year: "2007",
        citation: "AIR 2007 SC 2563",
        legalPrinciple: "Injunctions under the Specific Relief Act should follow settled principles of the Code of Civil Procedure.",
        landmarkStatus: true
      }
    ],
    summary: "Civil dispute seeking execution of contract terms and specific performance where monetary compensation is inadequate.",
    keywords: ["specific performance", "civil contract", "specific relief", "injunction", "breach of contract"]
  },
  {
    id: "criminal_law",
    name: "Culpable Homicide and Murder",
    category: "Criminal Law",
    courtType: "Sessions Court / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Code of Criminal Procedure (CrPC)", enactmentYear: "1973", lastAmendmentYear: "2018" },
      { name: "Indian Penal Code (IPC) / Bharatiya Nyaya Sanhita (BNS)", enactmentYear: "1860 / 2023", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [
      {
        ipcSection: "Section 302",
        bnsSection: "Section 103",
        punishment: "Death penalty or imprisonment for life, and liability to fine.",
        applicability: "Murder cases where intention and knowledge of causing death are proved."
      },
      {
        ipcSection: "Section 300",
        bnsSection: "Section 101",
        punishment: "Definition of Murder.",
        applicability: "Establishes acts amounting to murder and exceptions."
      }
    ],
    landmarkJudgments: [
      {
        caseName: "Bachan Singh v. State of Punjab",
        court: "Supreme Court of India",
        year: "1980",
        citation: "AIR 1980 SC 898",
        legalPrinciple: "Established the 'rarest of rare cases' doctrine for awarding death sentence in murder cases.",
        landmarkStatus: true
      },
      {
        caseName: "K.M. Nanavati v. State of Maharashtra",
        court: "Supreme Court of India",
        year: "1961",
        citation: "AIR 1962 SC 605",
        legalPrinciple: "Defined gravity and sudden provocation in cases of culpable homicide.",
        landmarkStatus: true
      }
    ],
    summary: "Prosecution for commission of murder, homicide definitions, and statutory punishments under criminal code.",
    keywords: ["murder", "homicide", "death penalty", "bns 103", "ipc 302", "criminal offense"]
  },
  {
    id: "constitutional_law",
    name: "Right to Privacy under Article 21",
    category: "Constitutional Law",
    courtType: "High Court / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Constitution of India", enactmentYear: "1950", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "K.S. Puttaswamy v. Union of India",
        court: "Supreme Court of India",
        year: "2017",
        citation: "(2017) 10 SCC 1",
        legalPrinciple: "Right to privacy is a fundamental right under Article 21 of the Constitution.",
        landmarkStatus: true
      },
      {
        caseName: "Kesavananda Bharati v. State of Kerala",
        court: "Supreme Court of India",
        year: "1973",
        citation: "AIR 1973 SC 1461",
        legalPrinciple: "Established the 'Basic Structure Doctrine' limiting amendments to the Constitution.",
        landmarkStatus: true
      }
    ],
    summary: "Constitutional writ petition enforcement, violation of fundamental rights, and interpretation of state powers.",
    keywords: ["fundamental rights", "privacy", "article 21", "basic structure", "writ petition"]
  },
  {
    id: "family_law",
    name: "Restitution of Conjugal Rights and Maintenance",
    category: "Family Law",
    courtType: "Family Court / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Hindu Marriage Act", enactmentYear: "1955", lastAmendmentYear: "2015" },
      { name: "Special Marriage Act", enactmentYear: "1954", lastAmendmentYear: "2015" },
      { name: "Indian Christian Marriage Act", enactmentYear: "1872", lastAmendmentYear: "2001" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Saroj Rani v. Sudarshan Kumar Chadha",
        court: "Supreme Court of India",
        year: "1984",
        citation: "AIR 1984 SC 1562",
        legalPrinciple: "Upheld constitutionality of Section 9 of the Hindu Marriage Act regarding conjugal rights.",
        landmarkStatus: true
      }
    ],
    summary: "Matrimonial dispute involving restoration of cohabitation and claim of financial support for dependents.",
    keywords: ["marriage", "maintenance", "conjugal rights", "divorce", "spousal support"]
  },
  {
    id: "property_law",
    name: "Partition Suit of Coparcenary Property",
    category: "Property Law",
    courtType: "Civil Court / District Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Transfer of Property Act", enactmentYear: "1882", lastAmendmentYear: "2019" },
      { name: "Hindu Succession Act", enactmentYear: "1956", lastAmendmentYear: "2005" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Vineeta Sharma v. Rakesh Sharma",
        court: "Supreme Court of India",
        year: "2020",
        citation: "(2020) 9 SCC 1",
        legalPrinciple: "Daughters have equal coparcenary rights in joint Hindu family property by birth.",
        landmarkStatus: true
      }
    ],
    summary: "Civil suit claiming partition and individual possession share of ancestral or inherited coparcenary property.",
    keywords: ["partition suit", "ancestral property", "coparcener", "daughter property rights", "transfer of property"]
  },
  {
    id: "corporate_law",
    name: "Insolvency and Corporate Debt Resolution",
    category: "Corporate Law",
    courtType: "NCLT / NCLAT / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Insolvency and Bankruptcy Code (IBC)", enactmentYear: "2016", lastAmendmentYear: "2023" },
      { name: "Companies Act", enactmentYear: "2013", lastAmendmentYear: "2020" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Swiss Ribbons Pvt. Ltd. v. Union of India",
        court: "Supreme Court of India",
        year: "2019",
        citation: "AIR 2019 SC 739",
        legalPrinciple: "Upheld the validity of the Insolvency and Bankruptcy Code, prioritizing creditor resolution.",
        landmarkStatus: true
      }
    ],
    summary: "Resolution process initiated by financial or operational creditors for recovery of unpaid corporate debts.",
    keywords: ["bankruptcy", "nclt", "insolvency", "ibc", "corporate creditor", "debt recovery"]
  },
  {
    id: "commercial_law",
    name: "Enforcement of Arbitral Award",
    category: "Commercial Law",
    courtType: "Commercial Court / High Court",
    jurisdiction: "Union of India / International",
    applicableActs: [
      { name: "Arbitration and Conciliation Act", enactmentYear: "1996", lastAmendmentYear: "2021" },
      { name: "Commercial Courts Act", enactmentYear: "2015", lastAmendmentYear: "2018" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "BALCO v. Kaiser Aluminium Technical Services Inc.",
        court: "Supreme Court of India",
        year: "2012",
        citation: "AIR 2012 SC 546",
        legalPrinciple: "Seat of arbitration determines the supervisory jurisdiction of courts.",
        landmarkStatus: true
      }
    ],
    summary: "Commercial litigation seeking execution of an domestic or foreign arbitral award under civil procedure norms.",
    keywords: ["arbitration", "commercial dispute", "arbitral award", "balco", "conciliation"]
  },
  {
    id: "labour_law",
    name: "Industrial Dispute and Unfair Dismissal",
    category: "Labour Law",
    courtType: "Labour Court / Industrial Tribunal",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Industrial Disputes Act", enactmentYear: "1947", lastAmendmentYear: "2016" },
      { name: "Labour Code on Industrial Relations", enactmentYear: "2020", lastAmendmentYear: "2020" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Bangalore Water Supply v. A. Rajappa",
        court: "Supreme Court of India",
        year: "1978",
        citation: "AIR 1978 SC 548",
        legalPrinciple: "Wide interpretation of the term 'Industry' to include municipal utilities and education bodies.",
        landmarkStatus: true
      }
    ],
    summary: "Tribunal petition challenging retaliatory termination or unfair trade practices by management.",
    keywords: ["industry", "labour dispute", "retrenchment", "dismissal", "trade union"]
  },
  {
    id: "consumer_law",
    name: "Product Defect Liability and Compensation",
    category: "Consumer Law",
    courtType: "District / State / National Commission",
    jurisdiction: "National Jurisdiction",
    applicableActs: [
      { name: "Consumer Protection Act", enactmentYear: "2019", lastAmendmentYear: "2019" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Indian Medical Association v. V.P. Shantha",
        court: "Supreme Court of India",
        year: "1995",
        citation: "AIR 1996 SC 550",
        legalPrinciple: "Medical services fall under the scope of 'service' defined in Consumer Protection laws.",
        landmarkStatus: true
      }
    ],
    summary: "Consumer grievance regarding supply of defective merchandise or deficient warranty services.",
    keywords: ["consumer protection", "medical negligence", "deficiency of service", "compensation"]
  },
  {
    id: "taxation_law",
    name: "Direct Tax Assessment Challenge",
    category: "Taxation Law",
    courtType: "ITAT / High Court / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Income Tax Act", enactmentYear: "1961", lastAmendmentYear: "2024" },
      { name: "Central Goods and Services Tax Act", enactmentYear: "2017", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Vodafone International Holdings v. Union of India",
        court: "Supreme Court of India",
        year: "2012",
        citation: "(2012) 6 SCC 613",
        legalPrinciple: "Transfer of shares between offshore holding companies is not subject to tax withholding in India.",
        landmarkStatus: true
      }
    ],
    summary: "Challenge against arbitrary tax assessment orders, capital gains claims, and statutory exemptions.",
    keywords: ["income tax", "capital gains", "tax assessment", "vodafone tax", "gst challenge"]
  },
  {
    id: "cyber_law",
    name: "Identity Theft and Phishing",
    category: "Cyber Law",
    courtType: "Cyber Cell Tribunal / Magistrate Court",
    jurisdiction: "National Jurisdiction",
    applicableActs: [
      { name: "Information Technology Act", enactmentYear: "2000", lastAmendmentYear: "2008" },
      { name: "Indian Penal Code (IPC)", enactmentYear: "1860", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [
      {
        ipcSection: "Section 66C IT Act",
        bnsSection: "Section 319 (BNS Cheat by Personation)",
        punishment: "Imprisonment up to 3 years and fine up to 1 Lakh rupees.",
        applicability: "Unauthorized use of electronic signatures, passwords, or identification features."
      }
    ],
    landmarkJudgments: [
      {
        caseName: "Shreya Singhal v. Union of India",
        court: "Supreme Court of India",
        year: "2015",
        citation: "AIR 2015 SC 1523",
        legalPrinciple: "Struck down Section 66A of the IT Act, upholding freedom of speech in cyberspace.",
        landmarkStatus: true
      }
    ],
    summary: "Offenses relating to hacking, unauthorized access, identity impersonation, and phishing scams.",
    keywords: ["cyber crime", "hacking", "phishing", "identity theft", "section 66c", "it act"]
  },
  {
    id: "banking_law",
    name: "Recovery of Financial Debts (DRT Suit)",
    category: "Banking Law",
    courtType: "DRT / DRAT / High Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "SARFAESI Act", enactmentYear: "2002", lastAmendmentYear: "2016" },
      { name: "Recovery of Debts Due to Banks Act", enactmentYear: "1993", lastAmendmentYear: "2018" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Mardia Chemicals Ltd. v. Union of India",
        court: "Supreme Court of India",
        year: "2004",
        citation: "AIR 2004 SC 2371",
        legalPrinciple: "Upheld SARFAESI provisions but permitted borrowers to approach Debt Recovery Tribunals.",
        landmarkStatus: true
      }
    ],
    summary: "Proceedings initiated by banks for attachment and auction of mortgaged assets of defaulting borrowers.",
    keywords: ["drt", "sarfaesi", "default borrower", "non-performing asset", "banking recovery"]
  },
  {
    id: "insurance_law",
    name: "Repudiation of Third-Party Liability Claim",
    category: "Insurance Law",
    courtType: "District Commission / Ombudsman",
    jurisdiction: "National Jurisdiction",
    applicableActs: [
      { name: "Insurance Act", enactmentYear: "1938", lastAmendmentYear: "2021" },
      { name: "IRDAI Act", enactmentYear: "1999", lastAmendmentYear: "2015" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Biman Krishna Bose v. United India Insurance",
        court: "Supreme Court of India",
        year: "2001",
        citation: "(2001) 6 SCC 477",
        legalPrinciple: "Insurance companies cannot arbitrarily refuse renewal of policies or repudiate claims.",
        landmarkStatus: true
      }
    ],
    summary: "Dispute over arbitrary rejection of claims by insurance providers citing exclusion clauses.",
    keywords: ["insurance claim", "claim repudiation", "policy exclusion", "third party liability"]
  },
  {
    id: "environmental_law",
    name: "Industrial Pollution and Polluter Pays Policy",
    category: "Environmental Law",
    courtType: "National Green Tribunal (NGT)",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "National Green Tribunal Act", enactmentYear: "2010", lastAmendmentYear: "2010" },
      { name: "Environment Protection Act", enactmentYear: "1986", lastAmendmentYear: "2016" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "M.C. Mehta v. Union of India (Oleum Gas Leak)",
        court: "Supreme Court of India",
        year: "1986",
        citation: "AIR 1987 SC 1086",
        legalPrinciple: "Introduced the concept of 'Absolute Liability' for hazardous industrial units.",
        landmarkStatus: true
      },
      {
        caseName: "Vellore Citizens Welfare Forum v. Union of India",
        court: "Supreme Court of India",
        year: "1996",
        citation: "AIR 1996 SC 2715",
        legalPrinciple: "Uphold 'Precautionary Principle' and 'Polluter Pays Principle' as part of environmental law.",
        landmarkStatus: true
      }
    ],
    summary: "Petitions seeking closure of polluting industrial zones and compensation for local ecological damages.",
    keywords: ["ngt", "oleum gas leak", "absolute liability", "polluter pays", "pollution", "hazardous waste"]
  },
  {
    id: "intellectual_property_law",
    name: "Trademark Infringement and Deceptive Similarity",
    category: "Intellectual Property Law",
    courtType: "District Court / High Court",
    jurisdiction: "All India Jurisdiction",
    applicableActs: [
      { name: "Trademarks Act", enactmentYear: "1999", lastAmendmentYear: "2010" },
      { name: "Copyright Act", enactmentYear: "1957", lastAmendmentYear: "2012" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Cadila Healthcare Ltd. v. Cadila Pharmaceuticals Ltd.",
        court: "Supreme Court of India",
        year: "2001",
        citation: "AIR 2001 SC 1952",
        legalPrinciple: "Higher burden of protection against deceptive similarity in medicinal products.",
        landmarkStatus: true
      }
    ],
    summary: "Infringement suit seeking permanent injunction against counterfeit products copying a brand.",
    keywords: ["trademark infringement", "copyright pass-off", "deceptive similarity", "intellectual property", "injunction"]
  },
  {
    id: "real_estate_law",
    name: "Delay in Handover of Residential Possession",
    category: "Real Estate Law",
    courtType: "RERA Tribunal / Consumer Commission",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Real Estate (Regulation and Development) Act", enactmentYear: "2016", lastAmendmentYear: "2016" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Newtech Promoters and Developers v. State of UP",
        court: "Supreme Court of India",
        year: "2021",
        citation: "2021 LL (SC) 641",
        legalPrinciple: "Homebuyers have absolute right to claim refund of principal with interest for delays.",
        landmarkStatus: true
      }
    ],
    summary: "Action filed by flat owners seeking interest refunds for default in construction timelines by builder.",
    keywords: ["rera", "homebuyer refund", "possession delay", "real estate builder"]
  },
  {
    id: "arbitration_law",
    name: "Challenging Arbitral Award for Public Policy Violation",
    category: "Arbitration Law",
    courtType: "Commercial Division of High Court",
    jurisdiction: "Union of India / Commercial",
    applicableActs: [
      { name: "Arbitration and Conciliation Act", enactmentYear: "1996", lastAmendmentYear: "2021" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "ONGC Ltd. v. Saw Pipes Ltd.",
        court: "Supreme Court of India",
        year: "2003",
        citation: "AIR 2003 SC 2629",
        legalPrinciple: "Expanded 'public policy of India' to include patent illegality as a ground to challenge awards.",
        landmarkStatus: true
      }
    ],
    summary: "Petition under Section 34 challenging arbitrator's decision for patent errors or natural justice issues.",
    keywords: ["section 34", "arbitration award challenge", "patent illegality", "public policy"]
  },
  {
    id: "human_rights_law",
    name: "Enforcement against Custodial Violence",
    category: "Human Rights Law",
    courtType: "High Court / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Protection of Human Rights Act", enactmentYear: "1993", lastAmendmentYear: "2019" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "D.K. Basu v. State of West Bengal",
        court: "Supreme Court of India",
        year: "1997",
        citation: "AIR 1997 SC 610",
        legalPrinciple: "Prescribed strict guidelines to prevent custodial torture and protect rights of detainees.",
        landmarkStatus: true
      }
    ],
    summary: "Public interest petition demanding accountability, judicial enquiry, and damages for police brutality.",
    keywords: ["custodial torture", "human rights", "d.k. basu guidelines", "police violence"]
  },
  {
    id: "education_law",
    name: "Admission Under Right to Education quota",
    category: "Education Law",
    courtType: "High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Right of Children to Free and Compulsory Education Act", enactmentYear: "2009", lastAmendmentYear: "2019" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Society for Unaided Private Schools of Rajasthan v. UOI",
        court: "Supreme Court of India",
        year: "2012",
        citation: "(2012) 6 SCC 1",
        legalPrinciple: "Upheld validity of 25% free seats reservation for weaker sections in private schools.",
        landmarkStatus: true
      }
    ],
    summary: "Writ seeking directives to private academies failing to fill mandated free seats for underprivileged children.",
    keywords: ["rte act", "school admission", "weaker sections", "educational quota"]
  },
  {
    id: "election_law",
    name: "Disqualification on Election Malpractice",
    category: "Election Law",
    courtType: "High Court / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Representation of the People Act", enactmentYear: "1951", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Lily Thomas v. Union of India",
        court: "Supreme Court of India",
        year: "2013",
        citation: "(2013) 7 SCC 653",
        legalPrinciple: "Immediate disqualification of elected representatives convicted of offenses with 2+ years jail.",
        landmarkStatus: true
      }
    ],
    summary: "Challenge of legislative poll results alleging cash for votes or hidden asset disclosures.",
    keywords: ["poll malpractice", "disqualification", "lily thomas", "representation of people act"]
  },
  {
    id: "immigration_law",
    name: "Refugee Protection and De-portation Stay",
    category: "Immigration Law",
    courtType: "High Court / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Passports Act", enactmentYear: "1967", lastAmendmentYear: "2002" },
      { name: "Foreigners Act", enactmentYear: "1946", lastAmendmentYear: "2004" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Hans Muller of Nuremberg v. Superintendent, Presidency Jail",
        court: "Supreme Court of India",
        year: "1955",
        citation: "AIR 1955 SC 367",
        legalPrinciple: "Absolute power of Union government to deport foreign nationals subject to due procedure.",
        landmarkStatus: true
      }
    ],
    summary: "Petition seeking stay on extradition or deportation order of asylum seekers claiming threat in home nation.",
    keywords: ["deportation", "foreign national", "passport", "asylum visa", "extradition"]
  },
  {
    id: "international_law",
    name: "Sovereign Immunity and Consular Access Disputes",
    category: "International Law",
    courtType: "International Court of Justice / Supreme Court",
    jurisdiction: "International",
    applicableActs: [
      { name: "Geneva Conventions Act", enactmentYear: "1960", lastAmendmentYear: "1960" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Kulbhushan Jadhav Case (India v. Pakistan)",
        court: "International Court of Justice",
        year: "2019",
        citation: "ICJ Reports 2019",
        legalPrinciple: "Affirmed the mandatory right to consular access under Vienna Convention on Consular Relations.",
        landmarkStatus: true
      }
    ],
    summary: "Legal actions before international organs involving state boundaries, bilateral treaties, or consular access.",
    keywords: ["consular access", "icj", "vienna convention", "diplomatic immunity"]
  },
  {
    id: "competition_law",
    name: "Abuse of Dominant Position and Cartelization",
    category: "Competition Law",
    courtType: "CCI / NCLAT / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Competition Act", enactmentYear: "2002", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Excel Crop Care Ltd. v. Competition Commission of India",
        court: "Supreme Court of India",
        year: "2017",
        citation: "AIR 2017 SC 2734",
        legalPrinciple: "Established relevant turnover doctrine for imposing penalties under antitrust laws.",
        landmarkStatus: true
      }
    ],
    summary: "Investigation into anti-competitive agreements, price-fixing collusions, or predatory market practices.",
    keywords: ["competition commission", "cartel", "abuse of dominance", "antitrust", "cci"]
  },
  {
    id: "media_law",
    name: "Pre-broadcast Censorship and Press Freedom",
    category: "Media Law",
    courtType: "High Court / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Cable Television Networks (Regulation) Act", enactmentYear: "1995", lastAmendmentYear: "2023" },
      { name: "Cinematograph Act", enactmentYear: "1952", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Romesh Thappar v. State of Madras",
        court: "Supreme Court of India",
        year: "1950",
        citation: "AIR 1950 SC 124",
        legalPrinciple: "Freedom of speech includes the right to circulate and publish views without pre-censorship.",
        landmarkStatus: true
      }
    ],
    summary: "Challenge of executive gag orders or state bans restricting telecasts or print publications.",
    keywords: ["press freedom", "censorship", "defamation media", "speech block"]
  },
  {
    id: "it_law",
    name: "Data Interception and Surveillance Challenge",
    category: "IT Law",
    courtType: "Cyber Appellate Tribunal / High Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Information Technology Act", enactmentYear: "2000", lastAmendmentYear: "2008" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "People's Union for Civil Liberties v. Union of India",
        court: "Supreme Court of India",
        year: "1996",
        citation: "AIR 1997 SC 568",
        legalPrinciple: "Wiretapping violates privacy unless justified by strict statutory procedures and authorization.",
        landmarkStatus: true
      }
    ],
    summary: "Petitions arguing excessive or unauthorized traffic surveillance and data seizure by central agencies.",
    keywords: ["wiretap", "surveillance", "data intercept", "privacy violation", "it act 69"]
  },
  {
    id: "healthcare_law",
    name: "Ethical Standards and Patient Data Protection",
    category: "Healthcare Law",
    courtType: "NMC / Consumer Commission / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Clinical Establishments Act", enactmentYear: "2010", lastAmendmentYear: "2010" },
      { name: "National Medical Commission Act", enactmentYear: "2019", lastAmendmentYear: "2019" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Aruna Ramchandra Shanbaug v. Union of India",
        court: "Supreme Court of India",
        year: "2011",
        citation: "(2011) 4 SCC 454",
        legalPrinciple: "Allowed passive euthanasia under strict guidelines set by High Courts.",
        landmarkStatus: true
      }
    ],
    summary: "Action alleging organ donation protocol violations or leaking of sensitive clinical histories.",
    keywords: ["euthanasia", "patient confidentiality", "medical ethics", "clinical guidelines"]
  },
  {
    id: "motor_vehicle_law",
    name: "Accident Compensation Claim",
    category: "Motor Vehicle Law",
    courtType: "Motor Accident Claims Tribunal (MACT)",
    jurisdiction: "District Jurisdiction",
    applicableActs: [
      { name: "Motor Vehicles Act", enactmentYear: "1988", lastAmendmentYear: "2019" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "National Insurance Co. Ltd. v. Pranay Sethi",
        court: "Supreme Court of India",
        year: "2017",
        citation: "(2017) 16 SCC 680",
        legalPrinciple: "Standardized guidelines for calculation of future prospects in motor accident deaths.",
        landmarkStatus: true
      }
    ],
    summary: "Action before MACT claiming insurance payoffs for death/injury resulting from reckless commercial transport.",
    keywords: ["mact", "accident claim", "motor vehicle", "third party compensation"]
  },
  {
    id: "agricultural_law",
    name: "Contract Farming Disputes and MSP Challenges",
    category: "Agricultural Law",
    courtType: "Sub-Divisional Magistrate / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "State APMC Acts", enactmentYear: "Various", lastAmendmentYear: "2020" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "State of Rajasthan v. Rajasthan Agricultural Board",
        court: "Supreme Court of India",
        year: "1990",
        citation: "AIR 1990 SC 156",
        legalPrinciple: "Upheld APMC authority to levy market fees on agricultural transactions.",
        landmarkStatus: true
      }
    ],
    summary: "Contested sales under contract farming, crop quality rejections, or defaults by wholesale buyers.",
    keywords: ["apmc", "msp dispute", "contract farming", "agricultural trade", "crop payment"]
  },
  {
    id: "cooperative_law",
    name: "Electoral Fraud in Cooperative Banks",
    category: "Cooperative Law",
    courtType: "Cooperative Court / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Multi-State Co-operative Societies Act", enactmentYear: "2002", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Thalappalam Ser. Coop. Bank Ltd. v. State of Kerala",
        court: "Supreme Court of India",
        year: "2013",
        citation: "(2013) 16 SCC 82",
        legalPrinciple: "Cooperative societies are not public authorities under the Right to Information (RTI) Act unless state-funded.",
        landmarkStatus: true
      }
    ],
    summary: "Petition challenging manipulation of voter lists or mis-appropriations of assets by committee heads.",
    keywords: ["cooperative bank", "electoral dispute", "cooperative society", "rti cooperative"]
  },
  {
    id: "public_interest_litigation",
    name: "Enforcement of Right to Food and Livelihood",
    category: "Public Interest Litigation",
    courtType: "High Court / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Constitution of India (Article 32 & 226)", enactmentYear: "1950", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "PUCL v. Union of India (Right to Food)",
        court: "Supreme Court of India",
        year: "2001",
        citation: "Writ Petition (Civil) 196 of 2001",
        legalPrinciple: "Converted food security schemes into legal entitlements under Article 21.",
        landmarkStatus: true
      },
      {
        caseName: "Bandhua Mukti Morcha v. Union of India",
        court: "Supreme Court of India",
        year: "1984",
        citation: "AIR 1984 SC 802",
        legalPrinciple: "Liberation of bonded laborers under public interest writ jurisdiction.",
        landmarkStatus: true
      }
    ],
    summary: "Social action petition filed on behalf of vulnerable classes seeking basic services and survival support.",
    keywords: ["pil", "right to food", "public interest", "bonded labour", "social action"]
  },
  {
    id: "service_matters",
    name: "Retrospective Seniority and Pension Claims",
    category: "Service Matters",
    courtType: "Central Administrative Tribunal (CAT) / High Court",
    jurisdiction: "State / Central Gov",
    applicableActs: [
      { name: "Administrative Tribunals Act", enactmentYear: "1985", lastAmendmentYear: "2016" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "L. Chandra Kumar v. Union of India",
        court: "Supreme Court of India",
        year: "1997",
        citation: "AIR 1997 SC 1125",
        legalPrinciple: "Decisions of Administrative Tribunals are subject to judicial review by High Courts under Article 226.",
        landmarkStatus: true
      }
    ],
    summary: "Challenge of arbitrary transfer policies, demotion orders, or withholding of retirement funds.",
    keywords: ["cat tribunal", "demotion", "seniority dispute", "pension claim", "service dispute"]
  },
  {
    id: "administrative_law",
    name: "Excess of Jurisdiction and Natural Justice Violations",
    category: "Administrative Law",
    courtType: "High Court / Supreme Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Constitution of India", enactmentYear: "1950", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "A.K. Kraipak v. Union of India",
        court: "Supreme Court of India",
        year: "1969",
        citation: "AIR 1970 SC 150",
        legalPrinciple: "Natural justice rules apply to administrative as well as quasi-judicial actions.",
        landmarkStatus: true
      },
      {
        caseName: "Maneka Gandhi v. Union of India",
        court: "Supreme Court of India",
        year: "1978",
        citation: "AIR 1978 SC 597",
        legalPrinciple: "Administrative orders affecting life or liberty must be just, fair, and reasonable.",
        landmarkStatus: true
      }
    ],
    summary: "Petition seeking review of executive agency orders violating basic tenets of fair hearing.",
    keywords: ["natural justice", "ultra vires", "administrative discretion", "fair hearing"]
  },
  {
    id: "municipal_law",
    name: "Demolition of Alleged Unauthorized Structures",
    category: "Municipal Law",
    courtType: "Appellate Tribunal MCD / High Court",
    jurisdiction: "Local Corporation",
    applicableActs: [
      { name: "Municipal Corporation Acts", enactmentYear: "Various", lastAmendmentYear: "2022" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Olga Tellis v. Bombay Municipal Corporation",
        court: "Supreme Court of India",
        year: "1985",
        citation: "AIR 1986 SC 180",
        legalPrinciple: "Right to livelihood is part of Article 21, requiring fair notice before evictions/demolitions.",
        landmarkStatus: true
      }
    ],
    summary: "Dispute over arbitrary building demolition notices issued without prior opportunity to reply.",
    keywords: ["municipal corporation", "encroachment", "demolition", "eviction notice"]
  },
  {
    id: "revenue_law",
    name: "Mutation of Land Records and Khata Challenges",
    category: "Revenue Law",
    courtType: "Revenue Court / Collector",
    jurisdiction: "District Jurisdiction",
    applicableActs: [
      { name: "Land Revenue Codes", enactmentYear: "Various", lastAmendmentYear: "2021" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Suraj Bhan v. Financial Commissioner",
        court: "Supreme Court of India",
        year: "2007",
        citation: "(2007) 6 SCC 186",
        legalPrinciple: "Mutation entries are only for tax collection and do not confer title or ownership rights.",
        landmarkStatus: true
      }
    ],
    summary: "Appeal against mutation corrections or entries based on contested wills or partition titles.",
    keywords: ["khata mutation", "revenue court", "land record correction", "suraj bhan"]
  },
  {
    id: "land_acquisition_law",
    name: "Fair Compensation for Highway Projects",
    category: "Land Acquisition Law",
    courtType: "Land Acquisition Authority / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Right to Fair Compensation in Land Acquisition Act", enactmentYear: "2013", lastAmendmentYear: "2018" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Indore Development Authority v. Manoharlal",
        court: "Supreme Court of India",
        year: "2020",
        citation: "(2020) 8 SCC 129",
        legalPrinciple: "Clarified conditions for lapse of land acquisition under Section 24 of the 2013 Act.",
        landmarkStatus: true
      }
    ],
    summary: "Suit claiming enhanced payouts for ancestral holdings forcibly acquired for state development.",
    keywords: ["land acquisition", "fair compensation", "rehabilitation", "lapse of acquisition"]
  },
  {
    id: "defamation_law",
    name: "Criminal and Civil Defamation via Social Media",
    category: "Defamation Law",
    courtType: "Magistrate Court / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Indian Penal Code (IPC) / Bharatiya Nyaya Sanhita (BNS)", enactmentYear: "1860 / 2023", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [
      {
        ipcSection: "Section 499 & 500",
        bnsSection: "Section 356",
        punishment: "Simple imprisonment up to 2 years, or with fine, or both (under BNS, community service is added).",
        applicability: "Imputations made with intention to harm the reputation of a person."
      }
    ],
    landmarkJudgments: [
      {
        caseName: "Subramanian Swamy v. Union of India",
        court: "Supreme Court of India",
        year: "2016",
        citation: "(2016) 7 SCC 221",
        legalPrinciple: "Upheld constitutional validity of criminal defamation provisions in Section 499/500 IPC.",
        landmarkStatus: true
      }
    ],
    summary: "Claim for damages or criminal prosecution over defamatory claims published online.",
    keywords: ["libel", "defamation", "bns 356", "ipc 499", "reputation", "slander"]
  },
  {
    id: "white_collar_crime",
    name: "Corporate Embezzlement and Serious Fraud",
    category: "White Collar Crime",
    courtType: "Special CBI Court / High Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Companies Act", enactmentYear: "2013", lastAmendmentYear: "2020" },
      { name: "Prevention of Corruption Act", enactmentYear: "1988", lastAmendmentYear: "2018" }
    ],
    ipcBnsReferences: [
      {
        ipcSection: "Section 409 (Criminal Breach of Trust)",
        bnsSection: "Section 316 (BNS Breach of Trust)",
        punishment: "Life imprisonment or imprisonment up to 10 years, and fine.",
        applicability: "Breach of trust by public servant, banker, merchant or agent."
      }
    ],
    landmarkJudgments: [
      {
        caseName: "State of CBI v. A. Raja",
        court: "Special CBI Court",
        year: "2017",
        citation: "2017 SCC Online Del 1234",
        legalPrinciple: "Prosecution must present concrete proof of criminal conspiracy and illegal enrichment in administrative awards.",
        landmarkStatus: true
      }
    ],
    summary: "Investigation into company fund diversions and shell entities run by senior officials.",
    keywords: ["breach of trust", "cbi", "corporate fraud", "sfoi", "bns 316", "embezzlement"]
  },
  {
    id: "anti_corruption_cases",
    name: "Demand and Acceptance of Illegal Gratuity",
    category: "Anti-Corruption Cases",
    courtType: "Special Anti-Corruption Court",
    jurisdiction: "State / Central Gov",
    applicableActs: [
      { name: "Prevention of Corruption Act", enactmentYear: "1988", lastAmendmentYear: "2018" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "P. Chidambaram v. Directorate of Enforcement",
        court: "Supreme Court of India",
        year: "2019",
        citation: "(2019) 9 SCC 24",
        legalPrinciple: "Bail considerations in economic/corruption offenses should balance liberty with risk of investigation tampering.",
        landmarkStatus: true
      }
    ],
    summary: "Trap cases where officials are caught receiving bribes for granting public approvals.",
    keywords: ["corruption", "prevention of corruption act", "bribe trap", "cbi court"]
  },
  {
    id: "economic_offences",
    name: "Willful Default and Bank Credit Fraud",
    category: "Economic Offences",
    courtType: "Special Court / High Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Fugitive Economic Offenders Act", enactmentYear: "2018", lastAmendmentYear: "2018" }
    ],
    ipcBnsReferences: [
      {
        ipcSection: "Section 420 (Cheating)",
        bnsSection: "Section 318 (BNS Cheating)",
        punishment: "Imprisonment up to 7 years and fine.",
        applicability: "Dishonestly inducing delivery of property or alteration of valuable security."
      }
    ],
    landmarkJudgments: [
      {
        caseName: "State of Maharashtra v. Balakrishna Dattatrya",
        court: "Supreme Court of India",
        year: "2012",
        citation: "AIR 2013 SC 412",
        legalPrinciple: "Economic offenses require strict interpretation of penal provisions due to societal impact.",
        landmarkStatus: true
      }
    ],
    summary: "Prosecution of corporate officers who divert commercial credit abroad and abscond.",
    keywords: ["willful default", "cheating", "economic offence", "bns 318", "credit fraud"]
  },
  {
    id: "financial_crimes",
    name: "Systemic Ponzi Schemes and Public Deposit Fraud",
    category: "Financial Crimes",
    courtType: "Special Court under Depositors Act",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Banning of Unregulated Deposit Schemes Act", enactmentYear: "2019", lastAmendmentYear: "2019" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Sahara India Real Estate v. SEBI",
        court: "Supreme Court of India",
        year: "2012",
        citation: "(2012) 10 SCC 603",
        legalPrinciple: "Affirmed SEBI's jurisdiction to regulate public debt offerings and order refunds for unauthorized deposits.",
        landmarkStatus: true
      }
    ],
    summary: "Investigation into multi-crore investment funds claiming high returns without licenses.",
    keywords: ["ponzi scheme", "sebi regulator", "unregulated deposits", "investor fraud"]
  },
  {
    id: "money_laundering",
    name: "Attachment of Proceeds of Crime",
    category: "Money Laundering",
    courtType: "PMLA Appellate Tribunal / High Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Prevention of Money Laundering Act (PMLA)", enactmentYear: "2002", lastAmendmentYear: "2019" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Vijay Madanlal Choudhary v. Union of India",
        court: "Supreme Court of India",
        year: "2022",
        citation: "2022 SCC OnLine SC 929",
        legalPrinciple: "Upheld the validity of PMLA provisions including ED powers of arrest, search, and reverse burden of proof.",
        landmarkStatus: true
      }
    ],
    summary: "Enforcement Directorate attachment actions over assets traced to criminal source origins.",
    keywords: ["pmla", "enforcement directorate", "proceeds of crime", "laundering", "vijay madanlal"]
  },
  {
    id: "ndps_cases",
    name: "Possession of Commercial Quantity of Contraband",
    category: "NDPS Cases",
    courtType: "Special NDPS Court / High Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Narcotic Drugs and Psychotropic Substances Act", enactmentYear: "1985", lastAmendmentYear: "2021" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "State of Punjab v. Baldev Singh",
        court: "Supreme Court of India",
        year: "1999",
        citation: "AIR 1999 SC 2378",
        legalPrinciple: "Section 50 search directives of NDPS are mandatory; failure vitiates the recovery trial.",
        landmarkStatus: true
      }
    ],
    summary: "Trial for trafficking illegal drugs where bail is barred due to commercial weight requirements.",
    keywords: ["ndps", "drug search", "contraband possession", "commercial quantity", "section 50"]
  },
  {
    id: "posh_cases",
    name: "Failure to Form Internal Complaints Committee",
    category: "POSH Cases",
    courtType: "POSH Local Authority / High Court",
    jurisdiction: "Union of India",
    applicableActs: [
      { name: "Sexual Harassment of Women at Workplace Act", enactmentYear: "2013", lastAmendmentYear: "2013" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Vishaka v. State of Rajasthan",
        court: "Supreme Court of India",
        year: "1997",
        citation: "AIR 1997 SC 3011",
        legalPrinciple: "Formulated initial guidelines to combat workplace sexual harassment, leading to the POSH Act.",
        landmarkStatus: true
      }
    ],
    summary: "Action filed against corporate entity failing to construct inquiry organs for gender disputes.",
    keywords: ["posh act", "workplace harassment", "vishaka guidelines", "internal complaints committee"]
  },
  {
    id: "pocso_cases",
    name: "Aggravated Penetrative Sexual Assault",
    category: "POCSO Cases",
    courtType: "Special POCSO Court / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Protection of Children from Sexual Offences Act", enactmentYear: "2012", lastAmendmentYear: "2019" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Alakh Alok Srivastava v. Union of India",
        court: "Supreme Court of India",
        year: "2018",
        citation: "(2018) 17 SCC 291",
        legalPrinciple: "Advocated swift investigations and dedicated fast track court procedures in child assault trials.",
        landmarkStatus: true
      }
    ],
    summary: "Criminal trial involving serious offenses against minor children where reverse onus rules apply.",
    keywords: ["pocso", "child safety", "sexual assault", "juvenile victim"]
  },
  {
    id: "domestic_violence_cases",
    name: "Enforcement of Shared Household and Protection Orders",
    category: "Domestic Violence Cases",
    courtType: "Magistrate Court / Family Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Protection of Women from Domestic Violence Act", enactmentYear: "2005", lastAmendmentYear: "2005" }
    ],
    ipcBnsReferences: [
      {
        ipcSection: "Section 498A (Husband's family cruelty)",
        bnsSection: "Section 85 & 86 (Cruelty definition)",
        punishment: "Imprisonment up to 3 years and fine.",
        applicability: "Subjecting a married woman to cruelty for dowry demands or otherwise."
      }
    ],
    landmarkJudgments: [
      {
        caseName: "Lalita Toppo v. State of Jharkhand",
        court: "Supreme Court of India",
        year: "2018",
        citation: "(2019) 13 SCC 796",
        legalPrinciple: "Live-in partners can claim maintenance under the Domestic Violence Act, 2005.",
        landmarkStatus: true
      }
    ],
    summary: "Application seeking residential safety, restraint orders against spouse, and monthly maintenance.",
    keywords: ["domestic violence", "cruelty", "dowry harassment", "shared household", "bns 85", "ipc 498a"]
  },
  {
    id: "juvenile_justice_cases",
    name: "Determination of Juvenile Delinquency",
    category: "Juvenile Justice Cases",
    courtType: "Juvenile Justice Board (JJB)",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Juvenile Justice (Care and Protection) Act", enactmentYear: "2015", lastAmendmentYear: "2021" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Salil Bali v. Union of India",
        court: "Supreme Court of India",
        year: "2013",
        citation: "(2013) 7 SCC 705",
        legalPrinciple: "Upheld the age limit of 18 years for juvenile offender categorization under rehabilitation law.",
        landmarkStatus: true
      }
    ],
    summary: "Enquiry to determine age of offender and eligibility for reformation programs instead of prison.",
    keywords: ["juvenile justice board", "minor rehabilitation", "delinquency age", "reform home"]
  },
  {
    id: "matrimonial_cases",
    name: "Mutual Consent Divorce Seeking Waiver",
    category: "Matrimonial Cases",
    courtType: "Family Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Hindu Marriage Act", enactmentYear: "1955", lastAmendmentYear: "2015" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Amardeep Singh v. Harveen Kaur",
        court: "Supreme Court of India",
        year: "2017",
        citation: "(2017) 8 SCC 746",
        legalPrinciple: "The 6-month statutory waiting period in mutual consent divorce can be waived by family courts.",
        landmarkStatus: true
      }
    ],
    summary: "Joint petition seeking decree of divorce with waiver of cooling period under HMA Section 13B(2).",
    keywords: ["mutual consent divorce", "family court waiver", "cooling period HMA", "marriage dissolution"]
  },
  {
    id: "succession_cases",
    name: "Grant of Succession Certificate",
    category: "Succession Cases",
    courtType: "District Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Indian Succession Act", enactmentYear: "1925", lastAmendmentYear: "2002" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Sheela Devi v. Lal Chand",
        court: "Supreme Court of India",
        year: "2006",
        citation: "(2006) 8 SCC 581",
        legalPrinciple: "Succession laws clarify that coparcenary assets pass to heirs according to prevailing statutory rules.",
        landmarkStatus: true
      }
    ],
    summary: "Petition claiming certificate for recovery of debts and securities of a person who died intestate.",
    keywords: ["succession certificate", "heir recovery", "intestate succession", "estate assets"]
  },
  {
    id: "wills_probate",
    name: "Probate Petition for Executor Validation",
    category: "Wills & Probate",
    courtType: "District Court / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Indian Succession Act", enactmentYear: "1925", lastAmendmentYear: "2002" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "H. Venkatachala Iyengar v. B.N. Thimmajamma",
        court: "Supreme Court of India",
        year: "1959",
        citation: "AIR 1959 SC 443",
        legalPrinciple: "Established standard rules of proof for establishing the execution of a valid will.",
        landmarkStatus: true
      }
    ],
    summary: "Suit to validate execution of a last testament and grant administration authority to executor.",
    keywords: ["will probate", "executor certificate", "testamentary case", "attesting witnesses"]
  },
  {
    id: "contract_disputes",
    name: "Commercial Contract Breach Claiming Damages",
    category: "Contract Disputes",
    courtType: "Commercial Court / District Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Indian Contract Act", enactmentYear: "1872", lastAmendmentYear: "1997" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Maula Bux v. Union of India",
        court: "Supreme Court of India",
        year: "1969",
        citation: "AIR 1970 SC 1955",
        legalPrinciple: "Earnest money forfeiture requires proof of actual loss unless genuine liquid damage is pre-agreed.",
        landmarkStatus: true
      }
    ],
    summary: "Litigation for recovery of security deposits and losses from non-performance of supply orders.",
    keywords: ["liquidated damages", "breach contract", "security deposit forfeiture", "performance default"]
  },
  {
    id: "consumer_complaints",
    name: "Deficient Telecom Services Claim",
    category: "Consumer Complaints",
    courtType: "District Consumer Disputes Redressal Forum",
    jurisdiction: "District Jurisdiction",
    applicableActs: [
      { name: "Consumer Protection Act", enactmentYear: "2019", lastAmendmentYear: "2019" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Lucknow Development Authority v. M.K. Gupta",
        court: "Supreme Court of India",
        year: "1993",
        citation: "1994 AIR 787",
        legalPrinciple: "Housing construction services fall under consumer laws; authorities can be penalised for harassment.",
        landmarkStatus: true
      }
    ],
    summary: "Claim seeking compensation for billing issues and disconnected phone lines.",
    keywords: ["telecom deficiency", "billing dispute", "consumer forum", "service compensation"]
  },
  {
    id: "builder_disputes",
    name: "Arbitrary Increase in Super Area Charges",
    category: "Builder Disputes",
    courtType: "RERA Tribunal / State Commission",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Real Estate (Regulation and Development) Act", enactmentYear: "2016", lastAmendmentYear: "2016" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Pioneer Urban Land and Infrastructure v. Govindan Raghavan",
        court: "Supreme Court of India",
        year: "2019",
        citation: "(2019) 5 SCC 725",
        legalPrinciple: "One-sided clauses in builder-buyer agreements constitute unfair trade practices.",
        landmarkStatus: true
      }
    ],
    summary: "Flat buyers challenging builder demand notes seeking extra payments for non-sanctioned area alterations.",
    keywords: ["builder agreement", "super area charge", "rera dispute", "flat buyer rights"]
  },
  {
    id: "employment_disputes",
    name: "Enforcement of Non-Compete Covenants",
    category: "Employment Disputes",
    courtType: "Civil Court / High Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Indian Contract Act", enactmentYear: "1872", lastAmendmentYear: "1997" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Percept D'Mark v. Zaheer Khan",
        court: "Supreme Court of India",
        year: "2006",
        citation: "AIR 2006 SC 3426",
        legalPrinciple: "Non-compete covenants extending past the employment term are void under Section 27 of the Contract Act.",
        landmarkStatus: true
      }
    ],
    summary: "Suit seeking injunction against former employees taking roles with competitors.",
    keywords: ["non-compete clause", "trade restraint", "employee covenant", "injunction suit"]
  },
  {
    id: "cyber_fraud",
    name: "UPI Sim-Swap Financial Extortion",
    category: "Cyber Fraud",
    courtType: "Adjudicating Officer IT / Magistrate Court",
    jurisdiction: "National Jurisdiction",
    applicableActs: [
      { name: "Information Technology Act", enactmentYear: "2000", lastAmendmentYear: "2008" }
    ],
    ipcBnsReferences: [
      {
        ipcSection: "Section 66D IT Act",
        bnsSection: "Section 318 (BNS Cheating)",
        punishment: "Imprisonment up to 3 years and fine up to 1 Lakh rupees.",
        applicability: "Cheating by personation by using computer resource."
      }
    ],
    landmarkJudgments: [
      {
        caseName: "SMC Pneumatics v. Jogesh Kwatra",
        court: "Delhi High Court",
        year: "2001",
        citation: "2001 Del HC Online",
        legalPrinciple: "Corporate liability can be invoked to seek stays on cyber harassment campaigns originating internally.",
        landmarkStatus: true
      }
    ],
    summary: "Criminal action against syndicates deploying sim clone strategies to transfer bank balances.",
    keywords: ["sim swap scam", "upi fraud", "it act 66d", "bns 318", "identity cheat"]
  },
  {
    id: "online_scam_cases",
    name: "Phishing via Fake E-Commerce Interfaces",
    category: "Online Scam Cases",
    courtType: "Special Cyber Court",
    jurisdiction: "State Jurisdiction",
    applicableActs: [
      { name: "Information Technology Act", enactmentYear: "2000", lastAmendmentYear: "2008" }
    ],
    ipcBnsReferences: [
      {
        ipcSection: "Section 66 (Computer Damage)",
        bnsSection: "Section 330 (BNS Mischief Damage)",
        punishment: "Imprisonment up to 3 years and fine up to 5 Lakh rupees.",
        applicability: "Dishonestly or fraudulently doing acts specified in Section 43 IT Act."
      }
    ],
    landmarkJudgments: [
      {
        caseName: "Avnish Bajaj v. State (Bazee.com)",
        court: "Supreme Court of India",
        year: "2008",
        citation: "(2008) 12 SCC 636",
        legalPrinciple: "Addressed director liability for obscene/scam materials hosted on online retail portals.",
        landmarkStatus: true
      }
    ],
    summary: "Prosecution of domain aggregators hosting cloned websites to obtain user card numbers.",
    keywords: ["fake shopping website", "phishing portal", "bazee case", "bns 330", "card clone"]
  },
  {
    id: "data_privacy_cases",
    name: "Unauthorized Transfer of Customer Personal Records",
    category: "Data Privacy Cases",
    courtType: "Data Protection Board / High Court",
    jurisdiction: "National Jurisdiction",
    applicableActs: [
      { name: "Digital Personal Data Protection Act", enactmentYear: "2023", lastAmendmentYear: "2023" }
    ],
    ipcBnsReferences: [],
    landmarkJudgments: [
      {
        caseName: "Justice K.S. Puttaswamy v. Union of India",
        court: "Supreme Court of India",
        year: "2017",
        citation: "AIR 2017 SC 4161",
        legalPrinciple: "Laid the foundation for data sovereignty, mandating consent frameworks for data processing.",
        landmarkStatus: true
      }
    ],
    summary: "Regulatory complaint against telecom provider selling phone subscriber details without consent.",
    keywords: ["dpdp act 2023", "consent framework", "privacy violation", "data fiduciary"]
  }
];

// Fallback search and indexing utility
export const searchAndFilterCases = (query = "", filters = {}, page = 1, pageSize = 8) => {
  const normQuery = query.toLowerCase().trim();
  
  let result = LEGAL_CASE_DATABASE;

  // 1. Text Search Indexing (matches Case Name, Laws, Acts, Sections, Categories, Keywords)
  if (normQuery) {
    result = result.filter(c => {
      const matchName = c.name?.toLowerCase().includes(normQuery);
      const matchCat = c.category?.toLowerCase().includes(normQuery);
      const matchCourt = c.courtType?.toLowerCase().includes(normQuery);
      const matchSummary = c.summary?.toLowerCase().includes(normQuery);
      
      const matchActs = c.applicableActs?.some(act => 
        act.name?.toLowerCase().includes(normQuery) || 
        act.enactmentYear?.includes(normQuery)
      );

      const matchIpcBns = c.ipcBnsReferences?.some(ref => 
        ref.ipcSection?.toLowerCase().includes(normQuery) || 
        ref.bnsSection?.toLowerCase().includes(normQuery) ||
        ref.punishment?.toLowerCase().includes(normQuery)
      );

      const matchLandmark = c.landmarkJudgments?.some(j => 
        j.caseName?.toLowerCase().includes(normQuery) || 
        j.court?.toLowerCase().includes(normQuery) ||
        j.citation?.toLowerCase().includes(normQuery) ||
        j.legalPrinciple?.toLowerCase().includes(normQuery)
      );

      const matchKeywords = c.keywords?.some(kw => kw.toLowerCase().includes(normQuery));

      return matchName || matchCat || matchCourt || matchSummary || matchActs || matchIpcBns || matchLandmark || matchKeywords;
    });
  }

  // 2. Filter Operations
  if (filters) {
    if (filters.category) {
      result = result.filter(c => c.category === filters.category);
    }
    if (filters.court) {
      result = result.filter(c => c.courtType?.toLowerCase().includes(filters.court.toLowerCase()));
    }
    if (filters.act) {
      result = result.filter(c => c.applicableActs?.some(act => act.name?.toLowerCase().includes(filters.act.toLowerCase())));
    }
    if (filters.jurisdiction) {
      result = result.filter(c => c.jurisdiction?.toLowerCase().includes(filters.jurisdiction.toLowerCase()));
    }
    if (filters.state) {
      result = result.filter(c => c.state?.toLowerCase() === filters.state.toLowerCase() || c.jurisdiction?.toLowerCase().includes("state"));
    }
    if (filters.ipcBns) {
      result = result.filter(c => c.ipcBnsReferences?.some(ref => 
        ref.ipcSection?.toLowerCase().includes(filters.ipcBns.toLowerCase()) || 
        ref.bnsSection?.toLowerCase().includes(filters.ipcBns.toLowerCase())
      ));
    }
    if (filters.year) {
      result = result.filter(c => 
        c.applicableActs?.some(act => act.enactmentYear === filters.year) ||
        c.landmarkJudgments?.some(j => j.year === filters.year)
      );
    }
  }

  // 3. Pagination Logic
  const total = result.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedResult = result.slice(startIndex, startIndex + pageSize);
  
  return {
    cases: paginatedResult,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page
  };
};

// Returns lists of categories, courts, etc. for filters dynamically
export const getFilterOptions = () => {
  const categories = [...new Set(LEGAL_CASE_DATABASE.map(c => c.category))];
  const courts = ["Supreme Court of India", "High Court", "District Court", "NCLT", "RERA Tribunal", "Family Court", "Special CBI Court", "Special Cyber Court", "National Green Tribunal (NGT)"];
  
  const acts = [];
  LEGAL_CASE_DATABASE.forEach(c => {
    c.applicableActs?.forEach(act => {
      if (!acts.includes(act.name)) acts.push(act.name);
    });
  });

  return {
    categories,
    courts,
    acts
  };
};
