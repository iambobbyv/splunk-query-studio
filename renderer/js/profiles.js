/* ============================================================
   PROFILES — Tech/category profiles for all 4 domains
   ============================================================ */

export const CATEGORY_PROFILES = {
  network: {
    cisco_ios: {
      label: 'Cisco IOS / NX-OS',
      index: 'netops',
      sourcetype: 'cisco:ios',
      queryTypes: ['IP Address Lookup', 'Traffic Analysis', 'Interface Errors', 'Routing Events'],
      fieldFilters: [
        { field: 'host',           label: 'Host',           placeholder: 'router-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'rtr-core.corp.local' },
        { field: 'InterfaceAlias', label: 'Interface',      placeholder: 'GigabitEthernet0/1' },
        { field: 'username',       label: 'Username',       placeholder: 'admin' },
      ]
    },
    cisco_ise: {
      label: 'Cisco ISE',
      index: 'netauth',
      sourcetype: 'cisco:ise:syslog',
      queryTypes: ['Auth Events', 'Failed Logins', 'Device Posture', 'Policy Violations'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'jsmith' },
        { field: 'username',       label: 'Username',       placeholder: 'CORP\\jsmith' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'endpoint.corp.local' },
        { field: 'host',           label: 'Host',           placeholder: 'ise-server-01' },
      ]
    },
    cisco_firepower: {
      label: 'Cisco Firepower / FTD',
      index: 'netfw',
      sourcetype: 'cisco:firepower:syslog',
      queryTypes: ['Firewall Blocks', 'Intrusion Alerts', 'Traffic Analysis', 'Policy Events'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'jsmith' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'ftd-sensor-01' },
        { field: 'InterfaceAlias', label: 'Interface',      placeholder: 'eth0' },
        { field: 'host',           label: 'Host',           placeholder: 'firepower-mgr' },
      ]
    },
    cisco_wildcard: {
      label: 'Cisco* (wildcard)',
      index: 'cisco*',
      sourcetype: 'cisco*',
      queryTypes: ['IP Address Lookup', 'Traffic Analysis', 'Firewall Events', 'Bandwidth Usage'],
      fieldFilters: [
        { field: 'host',           label: 'Host',           placeholder: 'cisco-device-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'device.corp.local' },
        { field: 'user',           label: 'User',           placeholder: 'admin' },
        { field: 'InterfaceAlias', label: 'Interface',      placeholder: 'Gi0/1' },
      ]
    },
    palo_alto: {
      label: 'Palo Alto Networks',
      index: 'pan_logs',
      sourcetype: 'pan:log',
      queryTypes: ['Traffic Analysis', 'Threat Events', 'URL Filtering', 'Firewall Blocks'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'CORP\\jsmith' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'fw-edge-01' },
        { field: 'InterfaceAlias', label: 'Interface',      placeholder: 'ethernet1/1' },
        { field: 'host',           label: 'Host',           placeholder: 'panorama-01' },
      ]
    },
    solarwinds: {
      label: 'SolarWinds / Orion',
      index: 'solarwinds*',
      sourcetype: 'solarwinds:orion',
      queryTypes: ['Node Status', 'Interface Traffic', 'Alert Events', 'Performance Data'],
      /* Orion Node Manager fields forwarded via syslog/API to Splunk */
      fieldFilters: [
        { field: 'NodeName',       label: 'Node Name',      placeholder: 'sw-core-01',          hint: 'Orion node name' },
        { field: 'NodeDNS',        label: 'Node DNS',       placeholder: 'switch.corp.local',    hint: 'Orion DNS hostname' },
        { field: 'InterfaceAlias', label: 'Interface Alias',placeholder: 'GigabitEthernet0/1',  hint: 'Port / interface name' },
        { field: 'SiteID',         label: 'Site ID',        placeholder: 'NYC-DC-01',            hint: 'Orion site identifier' },
        { field: 'host',           label: 'Host',           placeholder: 'orion-poller',         hint: 'Syslog source host' },
        { field: 'username',       label: 'Username',       placeholder: 'admin',                hint: 'User context' },
      ]
    },
    generic_fw: {
      label: 'Generic Firewall',
      index: 'netfw',
      sourcetype: 'cisco:asa',
      queryTypes: ['Firewall Blocks', 'Traffic Analysis', 'Connection Events', 'Denied Traffic'],
      fieldFilters: [
        { field: 'host',           label: 'Host',           placeholder: 'firewall-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'fw.corp.local' },
        { field: 'user',           label: 'User',           placeholder: 'jsmith' },
        { field: 'InterfaceAlias', label: 'Interface',      placeholder: 'inside' },
      ]
    }
  },

  server: {
    linux_syslog: {
      label: 'Linux / Syslog',
      index: 'os',
      sourcetype: 'linux_syslog',
      queryTypes: ['Auth Events', 'SSH Logins', 'Cron Jobs', 'Kernel Errors'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'root' },
        { field: 'host',           label: 'Host',           placeholder: 'web-server-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'server.corp.local' },
      ]
    },
    windows_wec: {
      label: 'Windows (WEC)',
      index: 'wineventlog',
      sourcetype: 'WinEventLog:*',
      queryTypes: ['Auth Events', 'Failed Logins', 'Process Creation', 'Service Changes'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'jsmith' },
        { field: 'username',       label: 'Username',       placeholder: 'CORP\\jsmith' },
        { field: 'host',           label: 'Host',           placeholder: 'ws-john-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'ws-john-01.corp.local' },
      ]
    },
    windows_sysmon: {
      label: 'Windows Sysmon',
      index: 'wineventlog',
      sourcetype: 'XmlWinEventLog:Microsoft-Windows-Sysmon/Operational',
      queryTypes: ['Process Creation', 'Network Connections', 'Registry Changes', 'File Events'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'CORP\\jsmith' },
        { field: 'host',           label: 'Host',           placeholder: 'ws-john-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'ws-john-01.corp.local' },
      ]
    },
    crowdstrike: {
      label: 'CrowdStrike FDR',
      index: 'crowdstrike',
      sourcetype: 'crowdstrike:fdr',
      queryTypes: ['Detection Events', 'Process Activity', 'Network Activity', 'Quarantined Files'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'jsmith' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'ws-john-01' },
        { field: 'host',           label: 'Host',           placeholder: 'endpoint-name' },
      ]
    }
  },

  datacenter: {
    vmware_esxi: {
      label: 'VMware ESXi',
      index: 'vmware',
      sourcetype: 'vmware:esxi:hostd',
      queryTypes: ['VM Events', 'Host Errors', 'Resource Usage', 'vMotion Events'],
      fieldFilters: [
        { field: 'host',           label: 'Host / ESXi',    placeholder: 'esxi-01.corp.local' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'esxi-01' },
        { field: 'user',           label: 'User',           placeholder: 'vsphere.local\\admin' },
      ]
    },
    vmware_vcenter: {
      label: 'VMware vCenter',
      index: 'vmware',
      sourcetype: 'vmware:vcenter',
      queryTypes: ['Cluster Events', 'VM Lifecycle', 'Alarm Events', 'Storage Events'],
      fieldFilters: [
        { field: 'host',           label: 'Host',           placeholder: 'vcenter-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'vcenter.corp.local' },
        { field: 'user',           label: 'User',           placeholder: 'vsphere.local\\admin' },
      ]
    },
    netapp: {
      label: 'NetApp ONTAP',
      index: 'storage',
      sourcetype: 'netapp:ontap:ems',
      queryTypes: ['EMS Events', 'Volume Status', 'Aggregate Health', 'CIFS/NFS Activity'],
      fieldFilters: [
        { field: 'host',           label: 'Host',           placeholder: 'netapp-cluster-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'cluster.corp.local' },
      ]
    },
    pure_storage: {
      label: 'Pure Storage',
      index: 'storage',
      sourcetype: 'pure:array:alert',
      queryTypes: ['Array Alerts', 'Volume Events', 'Performance Stats', 'Capacity Trends'],
      fieldFilters: [
        { field: 'host',           label: 'Host',           placeholder: 'pure-array-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'array.corp.local' },
      ]
    }
  },

  applications: {
    apache: {
      label: 'Apache HTTP',
      index: 'web',
      sourcetype: 'access_combined',
      queryTypes: ['Top URLs', 'Error Rates', 'Status Codes', 'Bandwidth Usage'],
      fieldFilters: [
        { field: 'host',           label: 'Host',           placeholder: 'web-server-01' },
        { field: 'user',           label: 'User',           placeholder: 'jsmith' },
      ]
    },
    iis: {
      label: 'Microsoft IIS',
      index: 'web',
      sourcetype: 'iis',
      queryTypes: ['Top URLs', 'Error Rates', 'Auth Failures', 'Response Times'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'CORP\\jsmith' },
        { field: 'host',           label: 'Host',           placeholder: 'iis-server-01' },
        { field: 'hostname',       label: 'Hostname',       placeholder: 'web.corp.local' },
      ]
    },
    nginx: {
      label: 'Nginx',
      index: 'web',
      sourcetype: 'nginx:access',
      queryTypes: ['Top URLs', 'Error Rates', 'Upstream Health', 'Bandwidth Usage'],
      fieldFilters: [
        { field: 'host',           label: 'Host',           placeholder: 'nginx-01' },
        { field: 'user',           label: 'User',           placeholder: 'jsmith' },
      ]
    },
    okta: {
      label: 'Okta',
      index: 'okta',
      sourcetype: 'OktaIM2:log',
      queryTypes: ['User Logins', 'MFA Events', 'Policy Changes', 'Suspicious Activity'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'jsmith@corp.com' },
        { field: 'username',       label: 'Username',       placeholder: 'jsmith' },
      ]
    },
    ms365: {
      label: 'Microsoft 365',
      index: 'o365',
      sourcetype: 'o365:management:activity',
      queryTypes: ['Login Events', 'SharePoint Activity', 'Teams Events', 'Admin Changes'],
      fieldFilters: [
        { field: 'user',           label: 'User',           placeholder: 'jsmith@corp.com' },
        { field: 'username',       label: 'Username',       placeholder: 'jsmith' },
      ]
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
