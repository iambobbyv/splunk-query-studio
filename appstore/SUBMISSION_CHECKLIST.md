# Splunk Query Studio — App Store Submission Checklist

## iOS / iPadOS — App Store Connect

### 1. One-Time Prerequisites
- [ ] Apple Developer Program enrollment ($99/yr) at developer.apple.com
- [ ] Xcode installed (latest stable from Mac App Store)
- [ ] iOS Distribution certificate in Keychain Access
- [ ] App record created in App Store Connect (appstoreconnect.apple.com)
  - Bundle ID: `com.souriapps.splunkquerystudio`
  - Name: **Splunk Query Studio**

### 2. Xcode Setup (first run only)
```bash
# Build web assets and sync to iOS
cd "/Users/bobbyv/Projects/splunk query studio"
npm run cap:open:ios
```
In Xcode:
- [ ] Select your **Development Team** under Signing & Capabilities
- [ ] Set **Bundle Identifier** to `com.souriapps.splunkquerystudio`
- [ ] Set **Version** to `1.0.0`, **Build** to `1`
- [ ] Confirm Deployment Target ≥ iOS 16.0
- [ ] Set **Supported Destinations** to iPhone + iPad

### 3. App Icons — iOS
Icon must be a 1024×1024 px PNG (no alpha channel) for the App Store slot.
The source icon already exists at `assets/icon-1024.png`. Set it in Xcode:
```bash
# Verify the icon
sips -g pixelHeight -g pixelWidth \
  "/Users/bobbyv/Projects/splunk query studio/assets/icon-1024.png"
# Expected: pixelHeight: 1024 / pixelWidth: 1024
```
- [ ] 1024×1024 icon confirmed in Xcode Assets → AppIcon

### 4. App Store Connect Metadata
Log in at appstoreconnect.apple.com → My Apps → Splunk Query Studio → iOS App → 1.0 Prepare for Submission:

- [ ] **App Name:** Splunk Query Studio
- [ ] **Subtitle:** SPL Query Builder for Splunk
- [ ] **Category:** Developer Tools
- [ ] **Secondary Category:** Utilities
- [ ] **Description:** (see `appstore/metadata.json` → description)
- [ ] **Promotional Text:** (see `appstore/metadata.json` → promotionalText)
- [ ] **Keywords:** `splunk,SPL,SIEM,SOC,query,security,analyst,log,network,threat,hunt,search,cisco,palo alto`
- [ ] **Support URL:** https://souriapps.net/support
- [ ] **Marketing URL:** https://souriapps.net
- [ ] **Privacy Policy URL:** https://souriapps.net/privacy
- [ ] **App Review Notes:** (see `appstore/metadata.json` → reviewNotes)
- [ ] **Content Rating:** 4+
- [ ] **Price:** Free
- [ ] **Age Rating questionnaire:** All fields set to None / No

### 5. Screenshots
Minimum 3 per required device size. Capture from Simulator:
**Simulator → Device → Screenshot (Cmd+S)**

| Device | Resolution | Simulator Target |
|---|---|---|
| iPhone 6.9" | 1320×2868 | iPhone 16 Pro Max |
| iPad 13" | 2064×2752 | iPad Pro 13-inch (M4) |

Suggested screens to capture:
1. Wizard home — domain selection (Network / Server / Data Center / Applications)
2. Data source picker — e.g. Palo Alto Networks or Cisco ISE selected
3. Generated SPL query — syntax-highlighted output with field filters filled
4. Query history / saved presets panel

Save to:
- `appstore/screenshots/` — iPhone
- `appstore/screenshots_ipad/` — iPad

- [ ] 4× iPhone 6.9" screenshots uploaded
- [ ] 4× iPad 13" screenshots uploaded

### 6. Privacy — App Privacy (Data Types)
In App Store Connect → App Privacy:
- [ ] **Data Not Collected** — select this option
  - No data types collected, linked to user, or used for tracking
  - Confirm: no analytics SDK, no crash reporter, no network calls

### 7. Export Compliance
- [ ] **Uses encryption:** No (select "No" — app does not use encryption)

### 8. Build & Archive in Xcode
```bash
# Sync latest web assets first
cd "/Users/bobbyv/Projects/splunk query studio"
npm run cap:sync
```
Then in Xcode:
- [ ] Select **Any iOS Device (arm64)** as destination (not a Simulator)
- [ ] `Product → Archive`
- [ ] Organizer opens automatically
- [ ] Click **Distribute App → App Store Connect → Upload**
- [ ] Wait for processing (~5–10 min) in App Store Connect → TestFlight

### 9. TestFlight Testing (Recommended)
- [ ] Add yourself as Internal Tester in App Store Connect
- [ ] Install via TestFlight on a real iPhone and iPad
- [ ] Verify:
  - [ ] All 4 domains load and display correct data sources
  - [ ] Query generation works for at least 3 different profiles
  - [ ] Copy to clipboard functions correctly
  - [ ] Query history saves and displays correctly
  - [ ] Saved presets can be created and recalled
  - [ ] App looks correct on both iPhone and iPad (layout adapts)

### 10. Submit for Review
- [ ] In App Store Connect, select the uploaded build
- [ ] Confirm all metadata, screenshots, and review notes are filled
- [ ] Click **Submit for Review**
- [ ] Review time: typically 24–48 hours (first submission may take longer)

---

## macOS — Direct Distribution (Developer ID + Notarization)

> The Mac App Store is **not targeted** for this release. Splunk Query Studio is
> distributed as a signed + notarized DMG (Gatekeeper-compliant), the same model
> used by NetAddy and macaddy-spoofer.

### 1. Prerequisites
- [ ] "Developer ID Application" certificate in Keychain (from developer.apple.com)
- [ ] App-Specific Password created at appleid.apple.com (for notarytool)
- [ ] `.env` file configured with signing credentials

```bash
cp "/Users/bobbyv/Projects/splunk query studio/.env.example" \
   "/Users/bobbyv/Projects/splunk query studio/.env"
# Edit .env — fill in APPLE_ID, APPLE_APP_PASSWORD, APPLE_TEAM_ID
```

### 2. Build + Sign + Notarize
```bash
cd "/Users/bobbyv/Projects/splunk query studio"

# Universal binary (Apple Silicon + Intel), auto-notarizes when .env is set
npm run build:mac

# Output in dist/:
#   Splunk Query Studio-1.0.0-arm64.dmg
#   Splunk Query Studio-1.0.0-x64.dmg
#   Splunk Query Studio-1.0.0-arm64-mac.zip
#   Splunk Query Studio-1.0.0-x64-mac.zip
```

### 3. Verify Notarization
```bash
spctl --assess --type exec --verbose \
  "/Users/bobbyv/Projects/splunk query studio/dist/mac-arm64/Splunk Query Studio.app"
# Expected: accepted  source=Notarized Developer ID
```

### 4. Distribute
- [ ] Share `Splunk Query Studio-1.0.0-arm64.dmg` (Apple Silicon)
- [ ] Share `Splunk Query Studio-1.0.0-x64.dmg` (Intel)
- [ ] Users can download and install without any Gatekeeper warning

---

## Quick Reference

| Platform    | Method                  | Command                          |
|-------------|-------------------------|----------------------------------|
| macOS arm64 | Notarized DMG           | `npm run build:mac`              |
| macOS x64   | Notarized DMG           | `npm run build:mac`              |
| iOS/iPadOS  | App Store (Xcode)       | `npm run cap:open:ios` → Archive |
| iOS sync    | Sync web assets to Xcode| `npm run cap:sync`               |
