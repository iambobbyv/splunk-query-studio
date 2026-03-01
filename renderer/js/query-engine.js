/* ============================================================
   QUERY ENGINE — SPL generation and optimization metrics
   ============================================================ */

import { TIME_RANGE_MAP } from './profiles.js';

/**
 * Build a Splunk SPL query from the current form state.
 * @param {object} opts
 * @param {string} opts.index
 * @param {string} opts.sourcetype
 * @param {string} opts.timeRange   — human label e.g. "Last 1h"
 * @param {string} opts.ips         — comma-separated IP string
 * @param {string} opts.queryType
 * @param {string} opts.category
 * @param {object} [opts.customFields] — map of fieldName → value string
 * @returns {string}
 */
export function buildSPL({ index, sourcetype, timeRange, ips, queryType, category, customFields }) {
  const earliest = TIME_RANGE_MAP[timeRange] ?? '-1h';

  let lines = [];

  // Line 1: base search — index, sourcetype, time
  let baseLine = `index=${index} sourcetype=${sourcetype} earliest=${earliest}`;

  // Inline custom field filters (most efficient — evaluated at search time before pipe)
  const activeFields = buildFieldFilters(customFields);
  if (activeFields.length > 0) {
    baseLine += '\n' + activeFields.join('\n');
  }
  lines.push(baseLine);

  // IP filter (network category or when IPs are provided)
  const parsedIPs = parseIPs(ips);
  if (parsedIPs.length > 0) {
    const ipList = parsedIPs.map(ip => `"${ip}"`).join(', ');
    lines.push(`(src_ip IN (${ipList}) OR dest_ip IN (${ipList}))`);
  }

  // Stats command based on query type and category
  const stats = buildStats(queryType, category, parsedIPs, customFields);
  lines = lines.concat(stats);

  return lines.join('\n');
}

/**
 * Convert the customFields map into SPL field=value filter tokens.
 * Multi-word values are quoted. Wildcards are preserved.
 * @param {object} customFields
 * @returns {string[]}  — array of "field=value" strings (one per non-empty field)
 */
function buildFieldFilters(customFields) {
  if (!customFields || typeof customFields !== 'object') return [];
  return Object.entries(customFields)
    .filter(([, v]) => v && String(v).trim().length > 0)
    .map(([k, v]) => {
      const val = String(v).trim();
      // If value contains spaces and isn't already quoted → wrap in quotes
      const quoted = val.includes(' ') && !val.startsWith('"') ? `"${val}"` : val;
      return `${k}=${quoted}`;
    });
}

function parseIPs(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && isValidIPOrCIDR(s));
}

function isValidIPOrCIDR(s) {
  // Allow IPs, CIDR, hostnames — basic filter to avoid empty strings
  return /^[\d.:/a-zA-Z0-9\-]+$/.test(s);
}

function buildStats(queryType, category, ips, customFields) {
  const qt = queryType || '';

  // Determine if a user/hostname field is already being filtered (for smarter stats)
  const hasUserFilter   = customFields && (customFields.user || customFields.username);
  const hasHostFilter   = customFields && (customFields.host || customFields.hostname ||
                          customFields.NodeName || customFields.NodeDNS);

  // Network
  if (category === 'network') {
    if (qt.includes('Traffic')) {
      return [
        '| stats count, sum(bytes) as total_bytes by src_ip, dest_ip, protocol',
        '| sort -total_bytes'
      ];
    }
    if (qt.includes('Firewall') || qt.includes('Block')) {
      return [
        '| stats count by src_ip, dest_ip, action, protocol',
        '| where action="denied"',
        '| sort -count'
      ];
    }
    if (qt.includes('Bandwidth')) {
      return [
        '| eval mb=round(bytes/1048576, 2)',
        '| stats sum(mb) as total_mb by src_ip, dest_ip',
        '| sort -total_mb'
      ];
    }
    if (qt.includes('Interface')) {
      return [
        '| stats count, sum(bytes) as total_bytes by host, InterfaceAlias, ifInOctets, ifOutOctets',
        '| sort -total_bytes'
      ];
    }
    if (qt.includes('Node Status')) {
      return [
        '| stats latest(Status) as Status, latest(NodeName) as NodeName by host, NodeDNS, SiteID',
        '| sort NodeName'
      ];
    }
    if (qt.includes('Alert')) {
      return [
        '| stats count by NodeName, NodeDNS, SiteID, AlertMessage',
        '| sort -count'
      ];
    }
    if (qt.includes('Performance')) {
      return [
        '| stats avg(cpu_load) as avg_cpu, avg(mem_used) as avg_mem, avg(ifInOctets) as avg_in by NodeName, NodeDNS',
        '| sort -avg_cpu'
      ];
    }
    // Default: IP lookup
    return [
      '| stats count, sum(bytes) as total_bytes by src_ip, dest_ip, protocol',
      '| sort -count'
    ];
  }

  // Server
  if (category === 'server') {
    if (qt.includes('Auth') || qt.includes('Login')) {
      const groupBy = hasUserFilter ? 'user, src_ip, action, host' : 'user, src_ip, action';
      return [
        `| stats count by ${groupBy}`,
        '| where action="failure" OR action="failed"',
        '| sort -count'
      ];
    }
    if (qt.includes('Process')) {
      return [
        '| stats count by user, process_name, parent_process',
        '| sort -count'
      ];
    }
    return [
      '| stats count by host, source, sourcetype',
      '| sort -count'
    ];
  }

  // Data center
  if (category === 'datacenter') {
    if (qt.includes('VM') || qt.includes('vMotion')) {
      return [
        '| stats count by vm_name, event_type, host',
        '| sort -count'
      ];
    }
    if (qt.includes('Resource') || qt.includes('Performance')) {
      return [
        '| stats avg(cpu_usage) as avg_cpu, avg(mem_usage) as avg_mem by host',
        '| sort -avg_cpu'
      ];
    }
    return [
      '| stats count by host, event_type, severity',
      '| sort -count'
    ];
  }

  // Applications
  if (category === 'applications') {
    if (qt.includes('URL') || qt.includes('Top')) {
      return [
        '| stats count by uri_path, status',
        '| sort -count'
      ];
    }
    if (qt.includes('Error')) {
      return [
        '| where status >= 400',
        '| stats count by status, uri_path',
        '| sort -count'
      ];
    }
    if (qt.includes('Auth') || qt.includes('Login')) {
      const groupBy = hasUserFilter ? 'user, action, src_ip, host' : 'user, action, src_ip';
      return [
        `| stats count by ${groupBy}`,
        '| sort -count'
      ];
    }
    return [
      '| stats count by status, uri_path, clientip',
      '| sort -count'
    ];
  }

  return ['| stats count by host, source', '| sort -count'];
}

/**
 * Compute optimization metric cards for the current SPL.
 * @param {string} spl
 * @param {object} opts  — { index, sourcetype, ips, timeRange, customFields }
 * @returns {Array<{label: string, status: 'good'|'warning'|'danger', detail: string}>}
 */
export function computeMetrics(spl, { index, sourcetype, ips, timeRange, customFields }) {
  const metrics = [];

  // 1. Index scope
  const isWildcardIndex = index.endsWith('*') && index.length < 4;
  metrics.push({
    label: isWildcardIndex ? 'Wildcard Index' : 'Index Scoped',
    status: isWildcardIndex ? 'warning' : 'good',
    detail: `index=${index}`
  });

  // 2. Sourcetype scope
  const isWildcardST = sourcetype === '*' || (sourcetype.endsWith('*') && sourcetype.length <= 2);
  metrics.push({
    label: isWildcardST ? 'Wildcard Sourcetype' : 'Sourcetype Scoped',
    status: isWildcardST ? 'warning' : 'good',
    detail: `sourcetype=${sourcetype}`
  });

  // 3. Time range
  const earliest = TIME_RANGE_MAP[timeRange] ?? '-1h';
  const isDangerousTime = earliest === '-7d';
  metrics.push({
    label: isDangerousTime ? 'Wide Time Range' : 'Time Scoped',
    status: isDangerousTime ? 'warning' : 'good',
    detail: `earliest=${earliest}`
  });

  // 4. Field filter coverage (IP + custom fields)
  const parsedIPs = ips ? ips.split(',').map(s => s.trim()).filter(Boolean) : [];
  const hasIPFilter = parsedIPs.length > 0;

  const activeCustomFields = customFields
    ? Object.entries(customFields).filter(([, v]) => v && String(v).trim())
    : [];
  const hasCustomFields = activeCustomFields.length > 0;

  const hasFieldFilter = spl.includes('| where') || spl.includes('| search');

  let filterLabel, filterStatus, filterDetail;
  if (hasIPFilter && hasCustomFields) {
    filterLabel  = 'IP + Field Filtered';
    filterStatus = 'good';
    filterDetail = `${parsedIPs.length} IP(s) + ${activeCustomFields.length} field(s)`;
  } else if (hasIPFilter) {
    filterLabel  = 'IP Indexed';
    filterStatus = 'good';
    filterDetail = `${parsedIPs.length} IP(s) specified`;
  } else if (hasCustomFields) {
    filterLabel  = 'Field Filtered';
    filterStatus = 'good';
    filterDetail = activeCustomFields.map(([k]) => k).join(', ');
  } else if (hasFieldFilter) {
    filterLabel  = 'Field Filtered';
    filterStatus = 'good';
    filterDetail = 'where/search applied';
  } else {
    filterLabel  = 'No Field Filter';
    filterStatus = 'warning';
    filterDetail = 'Consider adding filters';
  }

  metrics.push({ label: filterLabel, status: filterStatus, detail: filterDetail });

  return metrics;
}
