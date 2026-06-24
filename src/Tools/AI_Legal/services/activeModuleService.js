// ─── Active Module Service ────────────────────────────────────────────────────
// Manages which AI Legal module is currently ACTIVE for a given case.
// Persists to database (API call) for cross-device sync.

let inMemoryActiveModule = null;
let inMemoryPrefillIntent = null;

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE MODULE STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the currently active module state.
 * @returns {{ caseId, caseTitle, moduleId, moduleName, mode, setAt } | null}
 */
export const getActiveModule = () => {
  return inMemoryActiveModule;
};

/**
 * Set the active module when a user opens a case in a specific module.
 * Also persists to the database project record.
 * @param {string} caseId
 * @param {string} caseTitle
 * @param {string} moduleId  e.g. 'legal_argument_builder'
 * @param {string} moduleName e.g. 'Argument Builder'
 * @param {'case'|'manual'} mode
 */
export const setActiveModule = async (caseId, caseTitle, moduleId, moduleName, mode = 'case') => {
  const state = {
    caseId,
    caseTitle: caseTitle || 'Untitled Case',
    moduleId,
    moduleName,
    mode,
    setAt: new Date().toISOString(),
  };

  inMemoryActiveModule = state;

  // Persist to database (background)
  if (caseId) {
    try {
      const { apiService } = await import('../../../services/apiService');
      await apiService.updateProject(caseId, {
        activeModule: moduleId,
        activeModuleName: moduleName,
        activeModuleMode: mode,
        activeModuleSetAt: state.setAt,
      });
    } catch (e) {
      console.warn('[ActiveModuleService] DB sync failed:', e.message);
    }
  }

  return state;
};

/**
 * Clear the active module (e.g. when case is closed or user resets).
 */
export const clearActiveModule = async () => {
  const current = inMemoryActiveModule;
  inMemoryActiveModule = null;

  if (current?.caseId) {
    try {
      const { apiService } = await import('../../../services/apiService');
      await apiService.updateProject(current.caseId, {
        activeModule: null,
        activeModuleName: null,
        activeModuleMode: null,
        activeModuleSetAt: null,
      });
    } catch {}
  }
};

/**
 * Check if a specific module is currently active.
 */
export const isModuleActive = (moduleId) => {
  const state = getActiveModule();
  return state?.moduleId === moduleId;
};

// ─────────────────────────────────────────────────────────────────────────────
// PREFILL INTENT — "Use Active Case" auto-fill system
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Store a one-time prefill intent when user clicks "Use Active Case".
 * Each module reads this on mount, uses it, then clears it.
 *
 * @param {object} caseData  - Full case record from the database
 * @param {string} moduleId  - Target module to prefill
 */
export const setPrefillIntent = (caseData, moduleId) => {
  inMemoryPrefillIntent = {
    caseData,
    moduleId,
    setAt: Date.now(),
  };
};

/**
 * Read and consume the prefill intent (one-time use).
 * Returns the intent object, or null if none/stale.
 *
 * @param {string} expectedModuleId - Only return if module matches
 */
export const consumePrefillIntent = (expectedModuleId) => {
  if (!inMemoryPrefillIntent) return null;
  const intent = inMemoryPrefillIntent;
  // Only valid for 60 seconds after setting (ensures it's from this navigation)
  if (Date.now() - intent.setAt > 60_000) {
    inMemoryPrefillIntent = null;
    return null;
  }
  if (expectedModuleId && intent.moduleId !== expectedModuleId) return null;
  // Consume (delete after read)
  inMemoryPrefillIntent = null;
  return intent;
};

/**
 * Peek at the prefill intent without consuming it.
 */
export const peekPrefillIntent = (expectedModuleId) => {
  if (!inMemoryPrefillIntent) return null;
  const intent = inMemoryPrefillIntent;
  if (Date.now() - intent.setAt > 60_000) {
    inMemoryPrefillIntent = null;
    return null;
  }
  if (expectedModuleId && intent.moduleId !== expectedModuleId) return null;
  return intent;
};

// ─────────────────────────────────────────────────────────────────────────────
// SMART FIELD MAPPING — maps a case record to module-specific field values
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a case database record to flat form values usable by any module.
 * Keys match what each module's form expects.
 *
 * @param {object} c - Case/project record from the database
 * @returns {object} Normalized prefill values
 */
export const mapCaseToForm = (c) => {
  if (!c) return {};

  // Documents grouped by type
  const docs      = c.documents || [];
  const images    = docs.filter(d => /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(d.name || ''));
  const audios    = docs.filter(d => /\.(mp3|wav|ogg|m4a|aac)/i.test(d.name || ''));
  const videos    = docs.filter(d => /\.(mp4|mov|avi|mkv|webm)/i.test(d.name || ''));
  const pdfs      = docs.filter(d => /\.pdf$/i.test(d.name || ''));
  const contracts = docs.filter(d => /\.(docx?|pdf)$/i.test(d.name || '') && /contract|agreement|nda|deed/i.test(d.name || ''));

  // Previous built arguments
  const builtArgs  = c.builtArguments || [];
  const prevArgStr = builtArgs.map((a, i) => `${i + 1}. [${a.type || 'Argument'}] ${(a.text || '').slice(0, 300)}`).join('\n\n');

  // Timeline facts
  const facts      = c.facts || [];
  const factsStr   = facts.map(f => `• ${f.event || ''} (${f.date ? new Date(f.date).toLocaleDateString('en-IN') : 'N/A'}): ${f.description || ''}`).join('\n');

  return {
    // ── Core identifiers ────────────────────────────────────────────
    caseTitle:     c.title || c.name || '',
    caseNumber:    c.caseNumber || c.caseNo || c.registrationNo || '',
    courtName:     c.courtName || c.court || '',
    judgeName:     c.judgeName || c.judge || '',
    caseType:      c.caseType || '',

    // ── Parties ─────────────────────────────────────────────────────
    petitioner:    c.clientName   || c.petitioner  || c.plaintiff  || '',
    respondent:    c.accused      || c.respondent  || c.defendant  || c.opponentName || '',
    advocateName:  c.advocateName || c.advocate    || '',
    advocateSide:  c.advocateSide || '',

    // ── Narrative fields ────────────────────────────────────────────
    caseFacts:     [
      c.description  || '',
      c.summary      || '',
      c.caseSummary  || '',
      factsStr
    ].filter(Boolean).join('\n\n') || '',
    issues:        c.legalIssues  || c.issues      || '',
    provisions:    c.sections     || c.legalSections || c.applicableProvisions || '',
    evidenceSummary: c.evidenceSummary || docs.map(d => d.name).join(', ') || '',
    caseLaws:      c.caseLaws     || c.precedents  || c.citations  || '',
    previousArgs:  prevArgStr,
    notes:         c.notes        || c.privateNotes || '',

    // ── Documents by type ───────────────────────────────────────────
    allDocuments:  docs,
    imageFiles:    images,
    audioFiles:    audios,
    videoFiles:    videos,
    pdfFiles:      pdfs,
    contractFiles: contracts,
    hasContract:   contracts.length > 0,

    // ── For Evidence Analysis ────────────────────────────────────────
    evidenceNotes: [
      c.description  ? `Case Facts: ${c.description}` : '',
      c.clientName   ? `Client: ${c.clientName}` : '',
      c.accused      ? `Opponent: ${c.accused || c.opponentName || ''}` : '',
      c.courtName    ? `Court: ${c.courtName}` : '',
      docs.length    ? `Uploaded Evidence: ${docs.map(d => d.name).join(', ')}` : '',
    ].filter(Boolean).join('\n'),

    // ── Raw case object (for modules that need full access) ──────────
    _raw: c,
  };
};

/**
 * Human-readable module names.
 */
export const MODULE_NAMES = {
  legal_argument_builder:  'Argument Builder',
  legal_precedents:        'Legal Precedent',
  legal_draft_maker:       'Draft Maker',
  legal_evidence_checker:  'Evidence Analysis',
  legal_case_predictor:    'Case Predictor',
  legal_contract_analyzer: 'Contract Review',
  legal_strategy_engine:   'Strategy Engine',
};
