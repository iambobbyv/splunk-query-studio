# Splunk Query Studio

> A desktop tool for SOC analysts and IT teams to quickly generate optimized Splunk SPL queries — without memorizing syntax.

Built with Electron · Vanilla JS ES Modules · Plain CSS · No framework

---

## Features

- **4-step guided wizard** — Category → Platform → Parameters → Generated SPL
- **20 data source profiles** across 4 domains (Network, Server, Data Center, Applications)
- **Live SPL preview** while configuring parameters
- **Syntax highlighting** with a positional tokenizer (no overlap artifacts)
- **Query history** (75 entries, localStorage) + **Saved Presets**
- **Keyboard shortcuts**: `Ctrl+Shift+C` copy · `Ctrl+Shift+N` reset · `Esc` dismiss
- **About / Privacy / Terms / Feedback** modals accessible from the header menu

## Supported Platforms

| Domain | Sources |
|--------|---------|
| **Network Operations** | Cisco IOS, Cisco ISE, Cisco Firepower, Palo Alto, SolarWinds, Generic FW |
| **Server Operations** | Linux Syslog, Windows WEC, Windows Sysmon, CrowdStrike |
| **Data Center** | VMware ESXi, VMware vCenter, NetApp, Pure Storage |
| **Applications** | Apache, IIS, Nginx, Okta, Microsoft 365 |

---

## Getting Started

```bash
# Install dependencies
npm install

# Launch the Electron app
npm start

# Verify project structure (run after any update)
node setup-check.js
```

## Build Windows Installer

```bash
# NSIS installer + portable exe (output → dist/)
npm run build

# NSIS installer only
npm run build:nsis

# Portable only
npm run build:portable
```

> **Icon:** Replace `assets/icon.ico` with a professionally branded icon before distributing.
> Regenerate placeholder: `node assets/generate-icon.js`

---

## Project Structure

```
index.html               ← HTML shell (no inline JS/CSS)
main.js                  ← Electron main process + IPC handlers
preload.js               ← contextBridge: clipboard + openExternal
devserver.js             ← Dev HTTP server (port 3737, preview tools only)
electron-builder.yml     ← Windows NSIS + portable build config
setup-check.js           ← Project verification & auto-fix script
assets/
  icon.ico               ← App icon (16, 32, 48 BMP · 256 PNG)
  generate-icon.js       ← Generates placeholder icon.ico
renderer/
  styles/
    variables.css        ← Design tokens
    layout.css           ← 3-column grid, header, sidebar, aside
    components.css       ← All UI components + modals + wizard
  js/
    app.js               ← Wizard state machine + event wiring
    profiles.js          ← Domain/platform profile definitions
    query-engine.js      ← buildSPL() + computeMetrics()
    highlighter.js       ← SPL syntax colorizer
    storage.js           ← localStorage: history + presets
    ui.js                ← Icons, showToast(), helpers
```

---

## Design System

| Token | Value |
|-------|-------|
| Background primary | `#0a0e1a` |
| Background secondary | `#111827` |
| Accent blue | `#3b82f6` |
| Accent emerald | `#10b981` |
| Accent orange | `#f59e0b` |

No `backdrop-filter` (removed for performance). No framework, no build pipeline.

---

## Legal

- **Contact:** [iambobbyv@icloud.com](mailto:iambobbyv@icloud.com)
- **Website:** [souriapps.net](https://souriapps.net/)
- **Privacy Policy:** [souriapps.net/privacy](https://souriapps.net/privacy)
- **Terms of Service:** [souriapps.net/terms](https://souriapps.net/terms)

Splunk® is a registered trademark of Splunk Inc. This project is not affiliated with or endorsed by Splunk Inc.

© 2026 Souri Apps — Bobby Vongchanh
