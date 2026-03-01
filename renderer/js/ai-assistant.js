/* ============================================================
   AI ASSISTANT — SPL Advisor
   Zero-cost hybrid engine:
     1. Static knowledge base (always works, instant)
     2. Ollama local LLM (if running on localhost:11434)
   ============================================================ */

// ── Knowledge base cache ─────────────────────────────────────────────────
let KB = null;
let ollamaAvailable = null;   // null = not yet checked, true/false = result
let ollamaModel = null;       // detected model name

// Use import.meta.url so the path resolves relative to THIS script (renderer/js/),
// NOT relative to the document. fetch() resolves from the document base which would
// give the wrong path (../../ from project root goes outside the project in Electron).
const KB_PATH = new URL('../../assets/spl-knowledge.json', import.meta.url).href;
const OLLAMA_BASE = 'http://localhost:11434';

/* ── Load knowledge base ────────────────────────────────────────────────── */
export async function loadKnowledge() {
  if (KB) return KB;
  try {
    const res = await fetch(KB_PATH);
    KB = await res.json();
  } catch (_) {
    // Inline fallback — basic set so the app always works
    KB = { commands: [], optimization_rules: [], query_templates: [], field_reference: {}, common_errors: [] };
  }
  return KB;
}

/* ── Ollama availability check ──────────────────────────────────────────── */
export async function checkOllama() {
  if (ollamaAvailable !== null) return { available: ollamaAvailable, model: ollamaModel };
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) throw new Error('not ok');
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    // Prefer models best suited for SPL/code reasoning, smallest first.
    // Model name matching: prefix before ':' is used so any tag/quant variant matches.
    const preferred = [
      'qwen2.5-coder',   // 3b = 1.9 GB — best code model at this size
      'phi3.5',          // 3.8b = 2.2 GB — updated phi3 mini, 128K context
      'phi3',            // 3.8b = 2.3 GB — classic phi3 mini
      'smallthinker',    // 3b = 1.9 GB — reasoning-focused
      'llama3.2',        // 3b = 2.0 GB — solid general purpose
      'gemma3',          // 4b = 3.3 GB — Google, strong reasoning
      'gemma2',          // 9b fallback
      'mistral',         // 7b = 4.1 GB — reliable fallback
      'qwen2.5',         // 7b fallback
      'llama3',          // 8b fallback
      'codellama',       // code-specific fallback
    ];
    // Match: exact name OR exact prefix (before colon) OR starts-with prefix
    ollamaModel = preferred.find(p =>
      models.some(m => m === p || m.startsWith(p + ':') || m.startsWith(p + '-'))
    ) || models[0] || null;
    // Use the actual installed model tag, not just the prefix
    if (ollamaModel) {
      const match = models.find(m =>
        m === ollamaModel || m.startsWith(ollamaModel + ':') || m.startsWith(ollamaModel + '-')
      );
      if (match) ollamaModel = match;
    }
    ollamaAvailable = !!ollamaModel;
  } catch (_) {
    ollamaAvailable = false;
  }
  return { available: ollamaAvailable, model: ollamaModel };
}

/* ── Ask Ollama ─────────────────────────────────────────────────────────── */
export async function askOllama(userMessage, context = '') {
  const { available, model } = await checkOllama();
  if (!available) throw new Error('Ollama not available');

  const systemPrompt = `You are an expert Splunk SPL (Search Processing Language) assistant embedded in Splunk Query Studio.
You help analysts write, optimize, and understand SPL queries.
Rules:
- Provide concise, actionable answers
- Always show corrected SPL in a fenced code block (\`\`\`spl ... \`\`\`)
- Focus on performance optimization (earliest=, specific index/sourcetype, field filters before pipes)
- If the user's question isn't SPL-related, gently redirect to SPL topics

Current query context:
${context || 'No active query'}`;

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.message?.content || '';
}

/* ── Static SPL analysis ────────────────────────────────────────────────── */
/**
 * Analyse an SPL string against the optimization rules.
 * Returns an array of matched rules with severity and recommendation.
 */
export async function analyzeQuery(spl) {
  const kb = await loadKnowledge();
  const findings = [];

  if (!spl || spl.trim().length === 0) return findings;

  const splLower = spl.toLowerCase();

  // Check each optimization rule
  for (const rule of kb.optimization_rules) {
    let triggered = false;

    switch (rule.id) {
      case 'wildcard_index':
        triggered = /index=\S*\*/i.test(spl) && !/index=\S{4,}\*/i.test(spl); // short wildcard
        break;
      case 'no_time_bound':
        triggered = !/earliest=/i.test(spl) && !/latest=/i.test(spl);
        break;
      case 'broad_time_range':
        triggered = /earliest=-7d/i.test(spl) || /earliest=-30d/i.test(spl);
        break;
      case 'no_field_filter':
        // No field=value patterns beyond index/sourcetype/earliest
        triggered = !/\b(src_ip|dest_ip|user|username|host|hostname|action|status|NodeName|NodeDNS|SiteID|InterfaceAlias)\s*=/i.test(spl)
                 && !spl.includes('| where') && !spl.includes('| search');
        break;
      case 'wildcard_prefix':
        triggered = /=\*[a-zA-Z0-9]/.test(spl);
        break;
      case 'transaction_overuse':
        triggered = splLower.includes('| transaction');
        break;
      case 'raw_scan':
        triggered = splLower.includes('_raw') && !splLower.includes('rex');
        break;
      case 'no_sourcetype':
        triggered = !/sourcetype=/i.test(spl);
        break;
    }

    if (triggered) {
      findings.push({
        id:             rule.id,
        title:          rule.title,
        severity:       rule.severity,
        description:    rule.description,
        recommendation: rule.recommendation,
        example_fix:    rule.example_fix,
      });
    }
  }

  return findings;
}

/* ── Auto-suggestions based on wizard state ─────────────────────────────── */
/**
 * Generate contextual suggestions for the current query/state.
 * @param {string} spl         current SPL text
 * @param {object} opts        { category, techKey, queryType, customFields }
 * @returns {Promise<Array>}   array of { type, title, body, spl? }
 */
export async function getAutoSuggestions(spl, { category, techKey, queryType, customFields } = {}) {
  const kb      = await loadKnowledge();
  const findings = await analyzeQuery(spl);
  const results  = [];

  // 1. Optimization warnings from static rules
  for (const f of findings) {
    results.push({
      type:    f.severity === 'danger' ? 'danger' : 'warning',
      title:   f.title,
      body:    `${f.description} ${f.recommendation}`,
      fix:     f.example_fix,
    });
  }

  // 2. Suggest relevant query templates
  const templates = kb.query_templates.filter(t => t.category === category);
  if (templates.length > 0) {
    const qt = (queryType || '').toLowerCase();
    const bestMatch = templates.find(t =>
      t.name.toLowerCase().split(' ').some(w => qt.includes(w))
    ) || templates[0];

    if (bestMatch) {
      results.push({
        type:  'template',
        title: `Try: ${bestMatch.name}`,
        body:  bestMatch.description,
        spl:   bestMatch.spl,
      });
    }
  }

  // 3. SolarWinds-specific tip
  if (techKey === 'solarwinds') {
    const hasNodeName = customFields && customFields.NodeName;
    if (!hasNodeName) {
      results.push({
        type:  'tip',
        title: 'SolarWinds: Add Node Name filter',
        body:  'Filtering by NodeName dramatically reduces events. Use the Field Filters panel to add a NodeName value.',
      });
    }
  }

  // 4. General performance tip if no findings
  if (results.length === 0) {
    results.push({
      type:  'good',
      title: 'Query looks well-formed',
      body:  'Index, sourcetype, and time range are all specified. Consider adding | fields - _raw to drop raw event data for faster downstream commands.',
    });
  }

  return results;
}

/* ── Command lookup ─────────────────────────────────────────────────────── */
/**
 * Search the knowledge base for commands/templates matching a query string.
 * @param {string} query  free-text search
 * @returns {Array}       matching commands and templates
 */
export async function searchKnowledge(query) {
  const kb = await loadKnowledge();
  if (!query || query.trim().length === 0) return [];

  const q   = query.toLowerCase().trim();
  const out = [];

  // Commands
  for (const cmd of kb.commands) {
    const score = (
      (cmd.name.toLowerCase().includes(q)         ? 10 : 0) +
      (cmd.description.toLowerCase().includes(q)  ?  5 : 0) +
      (cmd.category.toLowerCase().includes(q)     ?  3 : 0) +
      ((cmd.examples || []).some(e => e.toLowerCase().includes(q)) ? 2 : 0)
    );
    if (score > 0) out.push({ kind: 'command', score, data: cmd });
  }

  // Templates
  for (const tpl of kb.query_templates) {
    const score = (
      (tpl.name.toLowerCase().includes(q)        ? 10 : 0) +
      (tpl.description.toLowerCase().includes(q) ?  5 : 0) +
      (tpl.category.toLowerCase().includes(q)    ?  3 : 0)
    );
    if (score > 0) out.push({ kind: 'template', score, data: tpl });
  }

  // Common errors
  for (const err of kb.common_errors) {
    if (err.error.toLowerCase().includes(q) || err.cause.toLowerCase().includes(q)) {
      out.push({ kind: 'error', score: 5, data: err });
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 8);
}

/* ── Field reference ────────────────────────────────────────────────────── */
export async function getFieldsForCategory(category) {
  const kb = await loadKnowledge();
  const common = kb.field_reference?.common || [];
  const catFields = kb.field_reference?.[category] || [];
  return [...new Set([...common, ...catFields])];
}
