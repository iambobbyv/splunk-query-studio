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
 * @returns {string}
 */
export function buildSPL({ index, sourcetype, timeRange, ips, queryType, category }) {
  const earliest = TIME_RANGE_MAP[timeRange] ?? '-1h';

  let lines = [];

  // Line 1: base search
  lines.push(`index=${index} sourcetype=${sourcetype} earliest=${earliest}`);

  // IP filter (network category or when IPs are provided)
  const parsedIPs = parseIPs(ips);
  if (parsedIPs.length > 0) {
    const ipList = parsedIPs.map(ip => `"${ip}"`).join(', ');
    lines.push(`(src_ip IN (${ipList}) OR dest_ip IN (${ipList}))`);
  }

  // Stats command based on query type and category
  const stats = buildStats(queryType, category, parsedIPs);
  lines = lines.concat(stats);

  return lines.join('\n');
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

function buildStats(queryType, category, ips) {
  const qt = queryType || '';

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
    // Default: IP lookup
    return [
      '| stats count, sum(bytes) as total_bytes by src_ip, dest_ip, protocol',
      '| sort -count'
    ];
  }

  // Server
  if (category === 'server') {
    if (qt.includes('Auth') || qt.includes('Login')) {
      return [
        '| stats count by user, src_ip, action',
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
      return [
        '| stats count by user, action, src_ip',
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
 * @param {object} opts  — { index, sourcetype, ips, timeRange }
 * @returns {Array<{label: string, status: 'good'|'warning'|'danger', detail: string}>}
 */
export function computeMetrics(spl, { index, sourcetype, ips, timeRange }) {
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

  // 4. IP filter / field filter
  const parsedIPs = ips ? ips.split(',').map(s => s.trim()).filter(Boolean) : [];
  const hasIPFilter = parsedIPs.length > 0;
  const hasFieldFilter = spl.includes('| where') || spl.includes('| search');
  metrics.push({
    label: hasIPFilter ? 'IP Indexed' : (hasFieldFilter ? 'Field Filtered' : 'No Field Filter'),
    status: (hasIPFilter || hasFieldFilter) ? 'good' : 'warning',
    detail: hasIPFilter ? `${parsedIPs.length} IP(s) specified` : (hasFieldFilter ? 'where/search applied' : 'Consider adding filters')
  });

  return metrics;
}
