# Splunk Query Studio — App Store Submission Checklist
> All metadata values live in `appstore/metadata.json`. Paste from there into App Store Connect.

---

## iOS & iPadOS — App Store Connect

### 1. Prerequisites
- [ ] Apple Developer Program ($99/yr) active at developer.apple.com
- [ ] iOS Distribution certificate in Keychain Access
- [ ] App record created in App Store Connect
  - Bundle ID: `com.souriapps.splunkquerystudio`
  - Platform: **iOS**

### 2. App Information (App Store Connect → App Information)
| Field | Value |
|---|---|
| Name | Splunk Query Studio |
| Subtitle | SPL Query Builder for Splunk |
| Bundle ID | com.souriapps.splunkquerystudio |
| SKU | souriapps-sqs-001 |
| Primary Category | Developer Tools |
| Secondary Category | Utilities |
| Privacy Policy URL | https://souriapps.net/privacy |
| Primary Language | English (U.S.) |

- [ ] All fields above entered

### 3. Pricing & Availability
| Field | Value |
|---|---|
| Price | Free (Tier 0) |
| Availability | All countries/regions |
| Release | Manual release after approval |

- [ ] Price set to Free
- [ ] Availability confirmed

### 4. App Privacy (App Store Connect → App Privacy)
- [ ] Select **"Data Not Collected"**
  - No analytics, no crash reporting, no external network calls
  - All processing is on-device

### 5. Version Information (1.0.0 → Prepare for Submission)

#### Description
```
Splunk Query Studio is the SPL query builder for Splunk professionals who need
to work fast. Whether you're in the middle of an incident response, running
threat hunts, or just tired of rewriting the same queries from scratch — Studio
puts every search pattern one tap away.

BUILD QUERIES INSTANTLY
Choose a data source, select a query type, fill in your parameters, and get a
complete, production-ready SPL query — syntax-highlighted and ready to paste
into Splunk.

20+ DATA SOURCE PROFILES
• Network: Cisco IOS/NX-OS, Cisco ISE, Cisco Firepower/FTD, Palo Alto Networks,
  SolarWinds, Generic Firewall
• Server: Linux Syslog, Windows WEC, Windows Sysmon, CrowdStrike
• Data Center: VMware ESXi, VMware vCenter, NetApp, Pure Storage
• Applications: Apache HTTP, Microsoft IIS, Nginx, Okta, Microsoft 365

QUERY LIBRARY
40 pre-built, production-tested SPL templates covering the most common SOC and
IT operations use cases. Browse, filter, and copy in one tap.

QUERY HISTORY & PRESETS
Never rewrite the same query twice. Studio keeps your last 75 searches and lets
you save unlimited named presets for one-tap recall.

AI-ASSISTED QUERY SUGGESTIONS
Optional on-device AI via Ollama (macOS) surfaces context-aware SPL improvements
and command explanations without sending any data off your device.

DESIGNED FOR THE FIELD
A distraction-free dark interface built for long shifts. Syntax highlighting,
copy-to-clipboard, and a clean 4-step wizard mean fewer mistakes under pressure.

PRIVACY FIRST
Splunk Query Studio works entirely on-device. No telemetry, no accounts, no
network calls. Your queries never leave your device.
```

#### Promotional Text (appears above description, changeable without new build)
```
Generate production-ready Splunk SPL queries for 20+ data sources in seconds.
Built for SOC analysts, threat hunters, and IT operations teams.
```

#### Keywords (100 chars max)
```
splunk,SPL,SIEM,SOC,query,security,analyst,log,network,threat,hunt,cisco,palo alto,search
```

#### Support URL
```
https://souriapps.net/support
```

#### Marketing URL
```
https://souriapps.net
```

#### What's New
```
Version 1.0.0 — Initial Release

• 4-step guided SPL query wizard
• 20+ data source profiles: Network, Server, Data Center, Applications
• 40-entry query library with one-tap copy
• Query history (75 entries) and unlimited saved presets
• Syntax-highlighted SPL output
• Full iPhone and iPad support with adaptive dark interface
```

- [ ] Description entered
- [ ] Promotional Text entered
- [ ] Keywords entered (≤100 chars)
- [ ] Support URL entered
- [ ] Marketing URL entered
- [ ] What's New entered

### 6. Screenshots
Upload from `appstore/` — all files are correct dimensions and have no alpha channel.

| Slot | Folder | Size | Files |
|---|---|---|---|
| iPhone 6.7" (required) | `screenshots_iphone/` | 1284×2778 | 6 files |
| iPad 12.9" / 13" (required) | `screenshots_ipad_12_9/` | 2732×2048 | 6 files |
| iPad 11" (optional) | `screenshots_ipad_11/` | 2388×1668 | 6 files |

- [ ] iPhone 6.7" screenshots uploaded (screenshots_iphone/)
- [ ] iPad 12.9" screenshots uploaded (screenshots_ipad_12_9/)
- [ ] iPad 11" screenshots uploaded (screenshots_ipad_11/) *(optional)*

### 7. Age Rating
Complete the questionnaire — all answers are **None / No**:
| Question | Answer |
|---|---|
| Alcohol, Tobacco, or Drug Use | None |
| Contests | None |
| Gambling | None |
| Horror / Fear Themes | None |
| Mature / Suggestive Themes | None |
| Medical / Treatment Info | None |
| Profanity or Crude Humor | None |
| Sexual Content or Nudity | None |
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Unrestricted Web Access | No |

- [ ] Age rating questionnaire completed → result: **4+**

### 8. Export Compliance
- [ ] **Uses encryption:** No
  - The app does not use or implement any encryption algorithms
  - Only standard HTTPS provided by iOS is used

### 9. App Review Information
#### Notes for Reviewer
```
Splunk Query Studio is a standalone, offline SPL query builder. It does NOT
connect to any Splunk instance — queries are generated locally from
user-selected parameters.

No Splunk login, API key, or backend is required to test the app.

To test core functionality:
1. Open the app — the 4-step wizard loads immediately
2. Step 1: Select a domain (e.g. Network Operations)
3. Step 2: Choose a data source (e.g. Palo Alto Networks)
4. Step 3: Select a query type and fill optional field filters
5. Step 4: The complete, syntax-highlighted SPL query appears — tap Copy SPL

Query Library: tap the Library button (top right) to browse 40 pre-built templates.
Presets: build a query, tap Save Preset, name it — it appears in the presets list.
```

#### Review Contact
| Field | Value |
|---|---|
| First Name | Bobby |
| Last Name | Vongchanh |
| Email | iambobbyv@icloud.com |
| Phone | +1-832-874-7234 |
| Demo Account Required | No |

- [ ] Review notes entered
- [ ] Review contact filled in
- [ ] Sign-in required: **No**

### 10. Build & Archive
```bash
cd /Users/bobbyv/Projects/splunk-query-studio
npm run build:web
npx cap sync ios
# Then in Xcode:
# • Destination: Any iOS Device (arm64)
# • Product → Archive
# • Organizer → Distribute App → App Store Connect → Upload
```
- [ ] Web assets built and synced
- [ ] Xcode Archive created
- [ ] Build uploaded to App Store Connect
- [ ] Build selected in version page

### 11. Submit
- [ ] All sections show green checkmark in ASC
- [ ] Click **Add for Review** then **Submit to App Review**
- [ ] Review time: 24–48 hrs (first submission may be longer)

---

## macOS — Mac App Store (Mac Catalyst via Xcode)

### 1. Prerequisites
- [ ] App record created in App Store Connect
  - Bundle ID: `com.souriapps.splunkquerystudio`
  - Platform: **macOS**
- [ ] Mac App Distribution certificate in Keychain Access
- [ ] Mac Installer Distribution certificate in Keychain Access

### 2. App Information
| Field | Value |
|---|---|
| Name | Splunk Query Studio |
| Subtitle | SPL Query Builder for Splunk |
| Bundle ID | com.souriapps.splunkquerystudio |
| SKU | souriapps-sqs-mac-001 |
| Primary Category | Developer Tools |
| Secondary Category | Utilities |
| Privacy Policy URL | https://souriapps.net/privacy |
| Primary Language | English (U.S.) |

- [ ] All fields above entered

### 3. Pricing & Availability
| Field | Value |
|---|---|
| Price | Free (Tier 0) |
| Availability | All countries/regions |
| Release | Manual release after approval |

- [ ] Price set to Free

### 4. App Privacy
- [ ] Select **"Data Not Collected"**
  - No analytics, no crash reporting
  - Ollama AI runs on localhost only — no external calls

### 5. Version Information (1.0.0 → Prepare for Submission)

#### Description
```
Splunk Query Studio is the SPL query builder for Splunk professionals who need
to work fast. Whether you're in the middle of an incident response, running
threat hunts, or just tired of rewriting the same queries from scratch — Studio
puts every search pattern one click away.

BUILD QUERIES INSTANTLY
Choose a data source, select a query type, fill in your parameters, and get a
complete, production-ready SPL query — syntax-highlighted and ready to paste
into Splunk.

20+ DATA SOURCE PROFILES
• Network: Cisco IOS/NX-OS, Cisco ISE, Cisco Firepower/FTD, Palo Alto Networks,
  SolarWinds, Generic Firewall
• Server: Linux Syslog, Windows WEC, Windows Sysmon, CrowdStrike
• Data Center: VMware ESXi, VMware vCenter, NetApp, Pure Storage
• Applications: Apache HTTP, Microsoft IIS, Nginx, Okta, Microsoft 365

QUERY LIBRARY
40 pre-built, production-tested SPL templates covering the most common SOC and
IT operations use cases. Browse, filter, and copy in one click.

QUERY HISTORY & PRESETS
Never rewrite the same query twice. Studio keeps your last 75 searches and lets
you save unlimited named presets for one-click recall.

AI-ASSISTED QUERY SUGGESTIONS
Optional on-device AI via Ollama surfaces context-aware SPL improvements and
command explanations without sending any data off your Mac.

DESIGNED FOR POWER USERS
A distraction-free dark interface with syntax highlighting, keyboard shortcuts,
and a clean 4-step wizard built for speed during incidents.

PRIVACY FIRST
Splunk Query Studio works entirely on-device. No telemetry, no accounts, no
external network calls. Your queries never leave your Mac.
```

#### Promotional Text
```
Generate production-ready Splunk SPL queries for 20+ data sources in seconds.
Native Mac experience for SOC analysts and IT teams.
```

#### Keywords (100 chars max)
```
splunk,SPL,SIEM,SOC,query,security,analyst,log,network,threat,hunt,cisco,palo alto,search
```

#### Support URL
```
https://souriapps.net/support
```

#### Marketing URL
```
https://souriapps.net
```

#### What's New
```
Version 1.0.0 — Initial Release

• 4-step guided SPL query wizard
• 20+ data source profiles: Network, Server, Data Center, Applications
• 40-entry query library with one-click copy
• Query history (75 entries) and unlimited saved presets
• Syntax-highlighted SPL output
• Optional on-device AI via Ollama for query suggestions
• Native Mac dark interface with keyboard navigation
```

- [ ] Description entered
- [ ] Promotional Text entered
- [ ] Keywords entered
- [ ] Support URL entered
- [ ] Marketing URL entered
- [ ] What's New entered

### 6. Screenshots
| Slot | Folder | Size | Files |
|---|---|---|---|
| Mac (required) | `screenshots_mac/` | 2560×1600 | 6 files |

- [ ] Mac screenshots uploaded (screenshots_mac/)

### 7. Age Rating
Same questionnaire as iOS — all **None / No** → result: **4+**
- [ ] Age rating questionnaire completed → **4+**

### 8. Export Compliance
- [ ] **Uses encryption:** No

### 9. App Review Information
#### Notes for Reviewer
```
Splunk Query Studio is a standalone, offline SPL query builder. It does NOT
connect to any Splunk instance — queries are generated locally from
user-selected parameters.

No Splunk login, API key, or backend is required to test the app.

To test core functionality:
1. Open the app — the 4-step wizard loads immediately
2. Step 1: Select a domain (e.g. Network Operations)
3. Step 2: Choose a data source (e.g. Palo Alto Networks)
4. Step 3: Select a query type and fill optional field filters
5. Step 4: The complete, syntax-highlighted SPL query appears — click Copy SPL

Query Library: click the Library button (top right) to browse 40 pre-built templates.
Presets: build a query, click Save Preset, name it — it appears in the presets list.

AI feature: only activates if the reviewer has Ollama running locally (ollama.ai).
It is not required — the app works fully without it.
```

#### Review Contact
| Field | Value |
|---|---|
| First Name | Bobby |
| Last Name | Vongchanh |
| Email | iambobbyv@icloud.com |
| Phone | +1-832-874-7234 |
| Demo Account Required | No |

- [ ] Review notes entered
- [ ] Review contact filled in

### 10. Build & Archive
```bash
cd /Users/bobbyv/Projects/splunk-query-studio
npm run build:web
npx cap sync ios
# Then in Xcode:
# • Destination: My Mac (Mac Catalyst)
# • Product → Archive
# • Organizer → Distribute App → App Store Connect → Upload
```
- [ ] Web assets built and synced
- [ ] Xcode Archive created (Mac Catalyst destination)
- [ ] Build uploaded to App Store Connect
- [ ] Build selected in macOS version page

### 11. Submit
- [ ] All sections show green checkmark in ASC
- [ ] Click **Add for Review** then **Submit to App Review**

---

## Quick Reference — Screenshot Folders

| Folder | Size | Platform Slot |
|---|---|---|
| `screenshots_iphone/` | 1284×2778 | iPhone 6.7" |
| `screenshots_ipad_12_9/` | 2732×2048 | iPad 12.9" / 13" |
| `screenshots_ipad_11/` | 2388×1668 | iPad 11" |
| `screenshots_mac/` | 2560×1600 | Mac |
