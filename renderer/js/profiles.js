/* ============================================================
   PROFILES — Tech/category profiles for all 4 domains
   ============================================================ */

export const CATEGORY_PROFILES = {
  network: {
    cisco_ios: {
      label: 'Cisco IOS / NX-OS',
      index: 'netops',
      sourcetype: 'cisco:ios',
      queryTypes: ['IP Address Lookup', 'Traffic Analysis', 'Interface Errors', 'Routing Events']
    },
    cisco_ise: {
      label: 'Cisco ISE',
      index: 'netauth',
      sourcetype: 'cisco:ise:syslog',
      queryTypes: ['Auth Events', 'Failed Logins', 'Device Posture', 'Policy Violations']
    },
    cisco_firepower: {
      label: 'Cisco Firepower / FTD',
      index: 'netfw',
      sourcetype: 'cisco:firepower:syslog',
      queryTypes: ['Firewall Blocks', 'Intrusion Alerts', 'Traffic Analysis', 'Policy Events']
    },
    cisco_wildcard: {
      label: 'Cisco* (wildcard)',
      index: 'cisco*',
      sourcetype: 'cisco*',
      queryTypes: ['IP Address Lookup', 'Traffic Analysis', 'Firewall Events', 'Bandwidth Usage']
    },
    palo_alto: {
      label: 'Palo Alto Networks',
      index: 'pan_logs',
      sourcetype: 'pan:log',
      queryTypes: ['Traffic Analysis', 'Threat Events', 'URL Filtering', 'Firewall Blocks']
    },
    solarwinds: {
      label: 'SolarWinds / Orion',
      index: 'solarwinds*',
      sourcetype: 'solarwinds:orion',
      queryTypes: ['Node Status', 'Interface Traffic', 'Alert Events', 'Performance Data']
    },
    generic_fw: {
      label: 'Generic Firewall',
      index: 'netfw',
      sourcetype: 'cisco:asa',
      queryTypes: ['Firewall Blocks', 'Traffic Analysis', 'Connection Events', 'Denied Traffic']
    }
  },

  server: {
    linux_syslog: {
      label: 'Linux / Syslog',
      index: 'os',
      sourcetype: 'linux_syslog',
      queryTypes: ['Auth Events', 'SSH Logins', 'Cron Jobs', 'Kernel Errors']
    },
    windows_wec: {
      label: 'Windows (WEC)',
      index: 'wineventlog',
      sourcetype: 'WinEventLog:*',
      queryTypes: ['Auth Events', 'Failed Logins', 'Process Creation', 'Service Changes']
    },
    windows_sysmon: {
      label: 'Windows Sysmon',
      index: 'wineventlog',
      sourcetype: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational',
      queryTypes: ['Process Creation', 'Network Connections', 'Registry Changes', 'File Events']
    },
    crowdstrike: {
      label: 'CrowdStrike FDR',
      index: 'crowdstrike',
      sourcetype: 'crowdstrike:fdr',
      queryTypes: ['Detection Events', 'Process Activity', 'Network Activity', 'Quarantined Files']
    }
  },

  datacenter: {
    vmware_esxi: {
      label: 'VMware ESXi',
      index: 'vmware',
      sourcetype: 'vmware:esxi:hostd',
      queryTypes: ['VM Events', 'Host Errors', 'Resource Usage', 'vMotion Events']
    },
    vmware_vcenter: {
      label: 'VMware vCenter',
      index: 'vmware',
      sourcetype: 'vmware:vcenter',
      queryTypes: ['Cluster Events', 'VM Lifecycle', 'Alarm Events', 'Storage Events']
    },
    netapp: {
      label: 'NetApp ONTAP',
      index: 'storage',
      sourcetype: 'netapp:ontap:ems',
      queryTypes: ['EMS Events', 'Volume Status', 'Aggregate Health', 'CIFS/NFS Activity']
    },
    pure_storage: {
      label: 'Pure Storage',
      index: 'storage',
      sourcetype: 'pure:array:alert',
      queryTypes: ['Array Alerts', 'Volume Events', 'Performance Stats', 'Capacity Trends']
    }
  },

  applications: {
    apache: {
      label: 'Apache HTTP',
      index: 'web',
      sourcetype: 'access_combined',
      queryTypes: ['Top URLs', 'Error Rates', 'Status Codes', 'Bandwidth Usage']
    },
    iis: {
      label: 'Microsoft IIS',
      index: 'web',
      sourcetype: 'iis',
      queryTypes: ['Top URLs', 'Error Rates', 'Auth Failures', 'Response Times']
    },
    nginx: {
      label: 'Nginx',
      index: 'web',
      sourcetype: 'nginx:access',
      queryTypes: ['Top URLs', 'Error Rates', 'Upstream Health', 'Bandwidth Usage']
    },
    okta: {
      label: 'Okta',
      index: 'okta',
      sourcetype: 'OktaIM2:log',
      queryTypes: ['User Logins', 'MFA Events', 'Policy Changes', 'Suspicious Activity']
    },
    ms365: {
      label: 'Microsoft 365',
      index: 'o365',
      sourcetype: 'o365:management:activity',
      queryTypes: ['Login Events', 'SharePoint Activity', 'Teams Events', 'Admin Changes']
    }
  }
};

export const CATEGORY_META = {
  network: {
    label: 'Network Operations',
    iconKey: 'network',
    badge: 7,
    defaultTech: 'cisco_wildcard',
    ipFilterVisible: true
  },
  server: {
    label: 'Server Operations',
    iconKey: 'server',
    badge: 4,
    defaultTech: 'linux_syslog',
    ipFilterVisible: false
  },
  datacenter: {
    label: 'Data Center',
    iconKey: 'datacenter',
    badge: 4,
    defaultTech: 'vmware_esxi',
    ipFilterVisible: false
  },
  applications: {
    label: 'Applications',
    iconKey: 'apps',
    badge: 5,
    defaultTech: 'apache',
    ipFilterVisible: false
  }
};

export const TIME_RANGE_MAP = {
  'Last 15m':   '-15m',
  'Last 1h':    '-1h',
  'Last 4h':    '-4h',
  'Last 24h':   '-24h',
  'Last 7d':    '-7d'
};
