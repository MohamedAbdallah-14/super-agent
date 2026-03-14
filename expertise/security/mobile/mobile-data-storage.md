# Mobile Data Storage Security

> Expertise module for AI agents implementing secure local data storage on iOS, Android, and cross-platform mobile applications.

**OWASP References:** MASVS-STORAGE, Mobile Top 10 2024 M9 (Insecure Data Storage)
**Last Updated:** 2026-03-08
**Applies To:** iOS (Swift/ObjC), Android (Kotlin/Java), Flutter (Dart), React Native (JS/TS)

---

## 1. Threat Landscape

Mobile devices present a unique attack surface for data storage. Unlike server environments,
mobile devices are physically accessible, frequently lost or stolen, and run in environments
where other apps, malware, and forensic tools can access improperly stored data.

### 1.1 Primary Threat Vectors

| Threat | Description | Risk Level |
|--------|-------------|------------|
| Unencrypted local databases | SQLite databases stored as plaintext files readable by root/jailbreak | Critical |
| Plaintext credentials | Passwords, tokens, API keys stored in SharedPreferences/UserDefaults | Critical |
| Backup extraction | iTunes/iCloud/adb backups containing app data extractable on desktop | High |
| Forensic data recovery | Deleted data recoverable from flash storage via forensic tools | High |
| Screenshot/snapshot leakage | OS-generated app switcher snapshots capturing sensitive screens | Medium |
| Clipboard exposure | Sensitive data copied to system clipboard accessible by other apps | Medium |
| Log file exposure | Sensitive data written to system logs (NSLog, Logcat) | Medium |
| WebView cache/cookies | Authentication tokens persisted in WebView storage | Medium |
| SD card storage (Android) | External storage world-readable on older Android versions | High |
| Keyboard cache | Autocomplete dictionaries caching sensitive input | Low |

### 1.2 Real-World Incidents

**Strava Global Heatmap (2018, 2024)**
Strava published a heatmap visualizing fitness-tracking data from its global user base. In
January 2018, researchers discovered the heatmap exposed the locations of secret military
bases, including US forward operating bases in Syria and Afghanistan. In October 2024, Le
Monde revealed the app exposed movements of security teams protecting French President
Macron and US President Biden. The data was stored and aggregated from locally cached GPS
data that synced to Strava servers.
Source: https://en.wikipedia.org/wiki/Strava

**Uber Data Breaches (2022-2023)**
Uber suffered multiple breaches where driver and employee data was exfiltrated. In September
2022, an attacker compromised an employee's credentials and accessed internal systems. In
December 2022, data from 77,000 Uber employees surfaced on breach forums. In April 2023,
driver Social Security numbers and Tax IDs were stolen via a third-party law firm breach.
Hardcoded credentials and excessive local data retention contributed to the attack surface.
Source: https://firewalltimes.com/uber-data-breach-timeline/

**SK Telecom SIM Data Breach (2025)**
Attackers deployed a BPFDoor RAT on 28 internal servers, exfiltrating SIM management data,
IMSI numbers, and authentication keys for 27 million subscribers. The breach resulted in a
US$96.9 million fine. Mobile identity data stored without adequate encryption or access
controls was a contributing factor.
Source: https://www.pkware.com/blog/recent-data-breaches

**Catwatchful Spyware Data Leak (2025)**
An Android spyware app marketed as "child monitoring" leaked data from 26,000 victim
devices, including the email addresses and passwords of customers who purchased the app.
The locally collected data was stored without proper encryption on the backend.
Source: https://www.eff.org/deeplinks/2025/12/breachies-2025-worst-weirdest-most-impactful-data-breaches-year

**Industry-Wide: 76% of Mobile Apps Have Insecure Data Storage**
Research cited by OWASP and multiple security vendors indicates that as many as 76% of
mobile applications have insecure data storage vulnerabilities, making it one of the most
pervasive mobile security issues despite dropping from M2 to M9 in the 2024 OWASP
Mobile Top 10 ranking.
Source: https://approov.io/blog/2024-owasp-mobile-top-ten-risks

---

## 2. Core Security Principles

### 2.1 Encrypt Sensitive Data at Rest

All sensitive data persisted on the device MUST be encrypted. This includes databases, files,
preferences, and cached content. Never rely on OS-level full-disk encryption alone -- use
application-layer encryption for defense in depth.

**What counts as sensitive data:**
- Authentication tokens, session IDs, refresh tokens
- User credentials (passwords, PINs, biometric templates)
- Personal Identifiable Information (PII): names, emails, phone numbers, SSNs
- Financial data: card numbers, account details, transaction history
- Health data (PHI under HIPAA)
- Cryptographic keys and certificates
- Location data and movement patterns

### 2.2 Use Platform Secure Storage

Always prefer platform-provided secure storage mechanisms:
- **iOS:** Keychain Services with appropriate `kSecAttrAccessible` protection class
- **Android:** Android Keystore for keys, EncryptedSharedPreferences for small values
- **Cross-platform:** flutter_secure_storage, react-native-keychain

These systems provide hardware-backed security (Secure Enclave on iOS, TEE/StrongBox on
Android) that makes key extraction significantly harder than software-only solutions.

### 2.3 Minimize Local Data

Store only what is strictly necessary on the device. Prefer server-side storage for sensitive
data and fetch on demand. When local storage is required, enforce data retention policies
and automatic expiration.

### 2.4 Clear Sensitive Data on Logout

Implement secure logout that zeroes out all sensitive data from memory and persistent
storage. This includes tokens, cached PII, session data, cookies, and WebView state.

### 2.5 Disable Backups for Sensitive Data

Configure apps to exclude sensitive files from iTunes/iCloud backups (iOS) and adb backups
(Android). Backup extraction is a well-documented attack vector for credential theft.

### 2.6 Protect Against Screenshot Capture

Prevent the OS from capturing screenshots of sensitive screens in the app switcher. On
Android, use `FLAG_SECURE`. On iOS, overlay sensitive views during `applicationWillResignActive`.

### 2.7 Defense in Depth

Layer multiple protections. Even if one control fails (e.g., an attacker bypasses file
encryption), other controls (access restrictions, Keystore-backed keys, backup exclusion)
should limit the blast radius.

---

## 3. Implementation Patterns

### 3.1 iOS: Keychain Services

The iOS Keychain is an encrypted, OS-managed credential store backed by the Secure Enclave.

**Key attributes:**
- `kSecAttrService` -- identifies your app's service
- `kSecAttrAccount` -- identifies the specific credential
- `kSecAttrAccessible` -- defines when the item is accessible (protection class)

**Protection classes (kSecAttrAccessible):**

| Constant | Availability | Use Case |
|----------|-------------|----------|
| `kSecAttrAccessibleWhenUnlocked` | Only when device unlocked | Default for most data |
| `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` | Unlocked, no migration | High-security tokens |
| `kSecAttrAccessibleAfterFirstUnlock` | After first unlock until reboot | Background-accessible data |
| `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` | After first unlock, no migration | Background + non-migratable |
| `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` | Only with passcode set | Highest security items |

**Keychain Access Groups:**
Apps from the same developer team can share Keychain items via access groups configured
in the app's entitlements. Use `kSecAttrAccessGroup` to scope items. Items without an
explicit group default to the app's own bundle identifier group.

### 3.2 iOS: Data Protection API

iOS provides file-level encryption via Data Protection classes set on files and directories:

| Class | Constant | Behavior |
|-------|----------|----------|
| Complete Protection | `NSFileProtectionComplete` | Encrypted when locked; key wiped from memory |
| Complete Until First Auth | `NSFileProtectionCompleteUntilFirstUserAuthentication` | Available after first unlock |
| Complete Unless Open | `NSFileProtectionCompleteUnlessOpen` | Existing handles remain valid when locked |
| No Protection | `NSFileProtectionNone` | Always accessible (avoid for sensitive data) |

Set via `FileManager` attributes or `URLResourceValues`.

### 3.3 iOS: CoreData Encryption

CoreData does not natively encrypt its SQLite store. Options:
1. Use SQLCipher as the backing store via a custom `NSPersistentStoreCoordinator`
2. Apply `NSFileProtectionComplete` to the store file
3. Encrypt individual sensitive fields before storing
4. Use Apple's encrypted CoreData store (available in newer iOS versions with Data Protection)

### 3.4 Android: Keystore System

The Android Keystore provides hardware-backed key storage (TEE or StrongBox Secure Element).

**Key features:**
- Keys never leave the secure hardware
- Supports RSA, AES, HMAC, EC algorithms
- Biometric binding via `setUserAuthenticationRequired(true)`
- Key validity periods via `setKeyValidityStart()` / `setKeyValidityEnd()`
- Hardware attestation to verify keys are hardware-backed

**Verify hardware backing:**
```kotlin
val keyInfo = keyFactory.getKeySpec(key, KeyInfo::class.java)
val isHardwareBacked = keyInfo.isInsideSecureHardware
```

### 3.5 Android: EncryptedSharedPreferences

**Status (2025):** The original `androidx.security:security-crypto` library was deprecated at
version 1.1.0-alpha07. A community-maintained fork at
`io.github.nicholasgasior.android:encrypted-shared-preferences` continues development. The
API remains functional and is still widely used; the deprecation means no further official
patches from Google.

**Encryption details:**
- Key encryption: AES256-SIV (deterministic AEAD)
- Value encryption: AES256-GCM (authenticated encryption)
- Master key stored in Android Keystore
- Uses Google Tink cryptographic library internally

### 3.6 Android: EncryptedFile

For encrypting entire files on Android:
```kotlin
val encryptedFile = EncryptedFile.Builder(
    context,
    file,
    masterKey,
    EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
).build()
```

### 3.7 Cross-Platform: Flutter (flutter_secure_storage)

Uses Keychain on iOS and EncryptedSharedPreferences (with Tink) on Android. Provides a
simple key-value API. On iOS, configure accessibility via `IOSOptions`:

```dart
final storage = FlutterSecureStorage();
// Set iOS accessibility
const iOSOptions = IOSOptions(
  accessibility: KeychainAccessibility.first_unlock_this_device,
);
await storage.write(key: 'token', value: jwt, iOptions: iOSOptions);
```

**Important:** As of 2025, flutter_secure_storage on Android depends on the deprecated
`androidx.security:security-crypto`. Monitor for migration to the community fork or
alternative implementations.

### 3.8 Cross-Platform: React Native (react-native-keychain)

Wraps iOS Keychain and Android Keystore/EncryptedSharedPreferences:

```javascript
import * as Keychain from 'react-native-keychain';

// Store credentials
await Keychain.setGenericPassword('username', 'password', {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

// Retrieve credentials
const credentials = await Keychain.getGenericPassword();
```

**Alternative:** `react-native-encrypted-storage` provides a simpler key-value interface
backed by Keychain (iOS) and EncryptedSharedPreferences (Android).

**Critical rule:** Never use AsyncStorage for sensitive data. It provides zero encryption or
access control.

### 3.9 Secure Caching Strategies

- Cache sensitive data in memory only; never write to disk cache
- Use `URLCache` policies to prevent HTTP response caching for sensitive endpoints
- Clear `WKWebView` / `WebView` data stores on logout
- Set `Cache-Control: no-store` headers for sensitive API responses
- Disable autocomplete on sensitive text fields (`textContentType = .none` on iOS,
  `android:importantForAutofill="no"` on Android)

---

## 4. Vulnerability Catalog

### V01: Credentials in SharedPreferences / UserDefaults

**Risk:** Critical | **MASVS:** MASVS-STORAGE-1

Storing passwords, API keys, or tokens in plaintext SharedPreferences (Android) or
UserDefaults (iOS). These are XML/plist files readable on rooted/jailbroken devices or via
backup extraction.

**Detection:** Search for `getSharedPreferences()`, `UserDefaults.standard.set()` with
sensitive keys. MobSF flags this automatically in static analysis.

**Fix:** Use EncryptedSharedPreferences (Android) or Keychain (iOS).

### V02: SQLite Database Without Encryption

**Risk:** Critical | **MASVS:** MASVS-STORAGE-1

SQLite databases stored as plaintext `.db` files in the app sandbox. Extractable via backup,
root access, or forensic tools.

**Detection:** Check for `.db` files in app data directory. Open with `sqlite3` to verify no
encryption. Frida script: hook `sqlite3_open()` to log database paths.

**Fix:** Use SQLCipher with 256-bit AES. Store the encryption key in Keychain/Keystore.

### V03: Cache Files Containing Sensitive Data

**Risk:** High | **MASVS:** MASVS-STORAGE-1

HTTP response caches, image caches, and WebView caches storing sensitive data in the
app's cache directory. Persists even after user logs out.

**Detection:** Inspect `Library/Caches/` (iOS) and `cache/` directory (Android) after using
the app. Look for response bodies containing tokens, PII, or session data.

**Fix:** Set `Cache-Control: no-store` for sensitive endpoints. Clear caches on logout. Use
ephemeral URL sessions for sensitive requests.

### V04: Backup Including Credentials

**Risk:** High | **MASVS:** MASVS-STORAGE-2

App data included in iTunes/iCloud (iOS) or adb (Android) backups. Attackers with physical
access or paired-device lockdown certificates can extract full app sandboxes.

**Detection:** Create a backup and inspect contents. Use `iExplorer` (iOS) or Android Backup
Extractor to inspect `.ab` files.

**Fix:** iOS: Set `isExcludedFromBackup = true` on sensitive file URLs. Android: Set
`android:allowBackup="false"` in `AndroidManifest.xml` or use `android:fullBackupContent`
to exclude specific paths.

### V05: Screenshot Exposure in App Switcher

**Risk:** Medium | **MASVS:** MASVS-STORAGE-2

OS captures a screenshot of the current screen when the app enters background. Visible in
the app switcher and stored as a file. May capture passwords, financial data, medical info.

**Detection:** Open a sensitive screen, press Home, check recent apps. On iOS, inspect
`Library/SplashBoard/Snapshots/`. On Android, check task thumbnails.

**Fix:** Android: `window.setFlags(FLAG_SECURE, FLAG_SECURE)`. iOS: overlay a blur or
splash view in `applicationWillResignActive()` / `sceneWillResignActive()`.

### V06: Pasteboard / Clipboard Leaks

**Risk:** Medium | **MASVS:** MASVS-STORAGE-1

Sensitive data copied to the system clipboard is accessible to all apps. On iOS 14+, a
notification appears when another app reads the clipboard, but the data is still exposed.

**Detection:** Copy sensitive data from the app, then use a clipboard viewer app to confirm
accessibility.

**Fix:** Use `UIPasteboard.general.setItems(_, options: [.expirationDate: Date(...)])` on
iOS to set expiration. On Android, use `ClipboardManager` with auto-clear. Disable copy on
sensitive fields where possible.

### V07: Sensitive Data in Logs

**Risk:** Medium | **MASVS:** MASVS-STORAGE-1

Using `NSLog`, `print()`, `Log.d()`, or `debugPrint()` with sensitive values. System logs
are accessible via Xcode console, `adb logcat`, or crash reporting tools.

**Detection:** Search codebase for logging statements. Run `adb logcat` while using the app
and grep for tokens, passwords, PII. MobSF flags common patterns.

**Fix:** Use a logging framework with severity levels. Strip sensitive logs in release builds.
Never log tokens, passwords, or PII. Use `os_log` with `.private` redaction on iOS.

### V08: WebView Cache and Cookies

**Risk:** Medium | **MASVS:** MASVS-STORAGE-1

`WKWebView` (iOS) and `WebView` (Android) cache HTML, cookies, and `localStorage` in the
app sandbox. Authentication tokens in cookies persist after logout.

**Detection:** Inspect WebView cache directories after authentication. Check for
`Cookies.binarycookies` (iOS) or `WebView/` directory (Android).

**Fix:** Clear WebView data on logout. Use `WKWebsiteDataStore.nonPersistent()` for
sensitive sessions. Set `CookieManager.removeAllCookies()` on Android.

### V09: External Storage Exposure (Android)

**Risk:** High | **MASVS:** MASVS-STORAGE-1

Files written to external storage (`/sdcard/`) are world-readable on Android < 10. Even
with scoped storage (Android 10+), other apps with `READ_EXTERNAL_STORAGE` can access files.

**Detection:** Check for `getExternalStorageDirectory()`, `getExternalFilesDir()` usage
with sensitive data.

**Fix:** Always use internal storage (`getFilesDir()`, `getCacheDir()`) for sensitive data.
If external storage is required, encrypt files before writing.

### V10: Hardcoded Secrets in Application Binary

**Risk:** Critical | **MASVS:** MASVS-STORAGE-1

API keys, encryption keys, passwords, or signing secrets embedded directly in source code.
Extractable via reverse engineering (strings, class-dump, jadx).

**Detection:** Run `strings` on the binary. Use MobSF or Semgrep to scan for hardcoded
patterns. Decompile with jadx (Android) or class-dump (iOS).

**Fix:** Fetch secrets from secure backend at runtime. Use platform Keystore for
locally-generated keys. For API keys that must ship with the app, use obfuscation as a
secondary measure (not a substitute for server-side controls).

### V11: Insecure Key Storage

**Risk:** Critical | **MASVS:** MASVS-CRYPTO-1

Encryption keys stored alongside encrypted data, or in SharedPreferences/UserDefaults.
Defeats the purpose of encryption entirely.

**Detection:** Trace the key used for encryption. If it is in the same directory, in
preferences, or hardcoded, the encryption is worthless.

**Fix:** Store encryption keys exclusively in iOS Keychain or Android Keystore. Derive
keys using PBKDF2 with user input (password) when appropriate.

### V12: Residual Data After Deletion

**Risk:** Medium | **MASVS:** MASVS-STORAGE-1

Calling `delete()` or `removeItem()` does not zero out storage sectors. Data remains
recoverable via forensic tools until overwritten.

**Detection:** Delete sensitive data, then use forensic tools (Cellebrite, Oxygen) to
attempt recovery from a device image.

**Fix:** Overwrite data before deletion when feasible. Use encrypted storage so deleted
encrypted data is unrecoverable without the key. Destroy the encryption key on logout.

### V13: Keyboard Cache / Autocomplete Dictionary

**Risk:** Low | **MASVS:** MASVS-STORAGE-1

Custom keyboard dictionaries learn and cache user input, including passwords and sensitive
data entered in text fields.

**Detection:** Type sensitive data in text fields, then check if suggestions appear in
other apps.

**Fix:** Set `autocorrectionType = .no` and `textContentType = .none` on iOS. Set
`android:inputType="textNoSuggestions"` on Android for sensitive fields.

### V14: Temporary Files with Sensitive Data

**Risk:** Medium | **MASVS:** MASVS-STORAGE-1

Temp files created during processing (PDF generation, image manipulation, data export) may
contain sensitive data and persist after use.

**Detection:** Monitor the tmp directory during and after app operations involving
sensitive data.

**Fix:** Use secure temp file creation. Delete immediately after use. Apply file protection
attributes. Prefer in-memory processing where possible.

---

## 5. Security Checklist

### Data Classification and Storage

- [ ] All sensitive data types identified and classified (tokens, PII, PHI, financial)
- [ ] Sensitive data encrypted at rest using AES-256 or platform-equivalent
- [ ] Encryption keys stored in hardware-backed secure storage (Keychain/Keystore)
- [ ] No credentials stored in SharedPreferences, UserDefaults, or plist files (plaintext)
- [ ] No sensitive data stored on external storage (Android SD card)
- [ ] Database encryption enabled (SQLCipher or equivalent) for databases containing PII

### Platform Secure Storage

- [ ] iOS Keychain used for credentials with appropriate `kSecAttrAccessible` class
- [ ] Android Keystore used for cryptographic keys with hardware backing verified
- [ ] EncryptedSharedPreferences (or successor) used for encrypted key-value storage
- [ ] Keychain/Keystore items scoped to `ThisDeviceOnly` where migration is not needed
- [ ] Cross-platform: flutter_secure_storage / react-native-keychain configured correctly

### Backup and Export Protection

- [ ] Sensitive files excluded from iCloud/iTunes backup (`isExcludedFromBackup`)
- [ ] Android `android:allowBackup="false"` or `fullBackupContent` excludes sensitive paths
- [ ] No sensitive data in auto-generated backups verified by extraction test

### Screen and UI Protection

- [ ] `FLAG_SECURE` set on Android activities displaying sensitive data
- [ ] iOS app switcher snapshot obscured via blur/overlay in lifecycle callbacks
- [ ] Sensitive text fields disable autocomplete and autocorrection
- [ ] Copy/paste disabled or time-limited on sensitive fields
- [ ] Secure text entry (`isSecureTextEntry`) used for password fields

### Session and Lifecycle

- [ ] All sensitive data cleared from memory and storage on logout
- [ ] WebView cookies, cache, and localStorage cleared on logout
- [ ] Session tokens have expiration and are refreshed securely
- [ ] Inactive sessions time out and trigger secure data cleanup
- [ ] Clipboard cleared after timeout when sensitive data is copied

### Logging and Debugging

- [ ] No sensitive data in log output (NSLog, Logcat, print, debugPrint)
- [ ] Debug logging disabled in release builds
- [ ] Crash reports do not contain PII or credentials
- [ ] Analytics events do not include sensitive field values

### Network Cache

- [ ] HTTP response caching disabled for sensitive API endpoints
- [ ] URL cache cleared on logout
- [ ] Ephemeral URL sessions used for sensitive requests where supported

---

## 6. Tools and Automation

### 6.1 Static Analysis

**MobSF (Mobile Security Framework)**
- Open-source automated analysis for APK, IPA, and source code
- Detects hardcoded secrets, insecure storage patterns, missing encryption
- Flags `SharedPreferences` / `UserDefaults` usage with sensitive keys
- Identifies weak encryption algorithms and insecure file permissions
- URL: https://github.com/MobSF/Mobile-Security-Framework-MobSF

**Semgrep**
- Custom rules for detecting insecure storage patterns in source code
- Example rule: flag `UserDefaults.standard.set()` with keys matching `password|token|secret`
- Integrates into CI/CD pipelines

**Android Lint / SwiftLint**
- Custom lint rules for insecure storage usage
- Flag hardcoded strings matching credential patterns

### 6.2 Dynamic Analysis

**Frida**
- Runtime instrumentation for iOS and Android
- Hook `SecItemAdd` / `SecItemCopyMatching` to monitor Keychain operations
- Hook `sqlite3_open()` to identify unencrypted database access
- Hook `SharedPreferences.edit()` to log preference writes
- Hook `NSLog` / `Log.d()` to detect sensitive log output at runtime
- URL: https://frida.re

**Example Frida script -- monitor SharedPreferences writes:**
```javascript
Java.perform(function() {
    var SharedPrefsEditor = Java.use(
        'android.content.SharedPreferences$Editor'
    );
    SharedPrefsEditor.putString.implementation = function(key, value) {
        console.log('[SharedPrefs] putString: ' + key + ' = ' + value);
        return this.putString(key, value);
    };
});
```

**Objection**
- Built on Frida; provides pre-built commands for mobile pentesting
- `ios keychain dump` -- extract all Keychain items
- `ios cookies get` -- extract stored cookies
- `android sslpinning disable` -- bypass certificate pinning for traffic analysis
- `android keystore list` -- enumerate Keystore entries
- URL: https://github.com/sensepost/objection

### 6.3 Backup Extraction and Forensics

**iExplorer / iMazing (iOS)**
- Browse iOS app sandboxes without jailbreak (for paired devices)
- Extract databases, preferences, caches from iTunes backups

**Android Backup Extractor**
- Convert `.ab` backup files to `.tar` format
- Inspect SharedPreferences XML, SQLite databases, cached files
- Command: `java -jar abe.jar unpack backup.ab backup.tar`

**adb (Android Debug Bridge)**
- `adb backup -apk -shared com.example.app` -- create app backup
- `adb shell run-as com.example.app ls /data/data/com.example.app/`
- Inspect databases: `adb shell run-as com.example.app cat databases/app.db`

### 6.4 Automated CI/CD Integration

- Run MobSF static analysis on every build
- Integrate Semgrep rules for insecure storage patterns into PR checks
- Automate backup extraction tests as part of security regression suite
- Use Frida scripts in automated E2E security tests on emulators

---

## 7. Platform-Specific Guidance

### 7.1 iOS

**Keychain Best Practices:**
- Default to `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` for most credentials
- Use `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` for highest-security items (only
  available when device has a passcode set; item is deleted if passcode is removed)
- Scope items with `kSecAttrAccessGroup` only when cross-app sharing is genuinely needed
- Require biometric authentication via `SecAccessControl` with `.biometryCurrentSet`

**Data Protection API:**
- Set `NSFileProtectionComplete` on files containing sensitive data
- CoreData stores default to `NSFileProtectionCompleteUntilFirstUserAuthentication`; override
  to `Complete` for sensitive stores
- Background operations that need file access must use `CompleteUntilFirstUserAuthentication`
  or `CompleteUnlessOpen`

**Backup Exclusion:**
```swift
var url = fileURL
var resourceValues = URLResourceValues()
resourceValues.isExcludedFromBackup = true
try url.setResourceValues(resourceValues)
```

**App Transport Security (ATS):**
Enabled by default. Never disable globally. Any exceptions must be justified and documented.

### 7.2 Android

**Keystore Provider Types:**
- `AndroidKeyStore` -- default provider; uses TEE (Trusted Execution Environment)
- StrongBox (`setIsStrongBoxBacked(true)`) -- uses dedicated secure element; highest
  security but not available on all devices; fall back to TEE when unavailable
- Always verify hardware backing: `KeyInfo.isInsideSecureHardware`

**File-Based Encryption (FBE):**
Android 10+ uses file-based encryption by default. Files are encrypted with per-user
credentials. However, app-layer encryption remains essential because:
- FBE protects against offline attacks on powered-off devices only
- Root access on a running device bypasses FBE
- App-layer encryption protects against compromised OS components

**Manifest Hardening:**
```xml
<application
    android:allowBackup="false"
    android:fullBackupContent="false"
    android:dataExtractionRules="@xml/data_extraction_rules">
```

**data_extraction_rules.xml (Android 12+):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="sharedpref" path="."/>
        <exclude domain="database" path="."/>
    </cloud-backup>
    <device-transfer>
        <exclude domain="sharedpref" path="."/>
        <exclude domain="database" path="."/>
    </device-transfer>
</data-extraction-rules>
```

### 7.3 Flutter

**flutter_secure_storage:**
- Uses Keychain (iOS) and EncryptedSharedPreferences (Android)
- Set `IOSOptions.accessibility` for appropriate Keychain protection class
- On Android, consider setting `AndroidOptions(encryptedSharedPreferences: true)` explicitly
- Monitor the underlying `androidx.security:security-crypto` deprecation status

**Database Encryption:**
- Use `sqflite_sqlcipher` as a drop-in replacement for `sqflite`
- Store the SQLCipher encryption key in flutter_secure_storage
- `sqlcipher_flutter_libs` provides native SQLCipher libraries for all platforms
- SQLCipher v4 uses PBKDF2 with 256,000 iterations and 256-bit AES

**Secure Preferences Pattern:**
```dart
// DO NOT: store sensitive data with shared_preferences
// final prefs = await SharedPreferences.getInstance();
// prefs.setString('token', jwt);  // INSECURE: plaintext XML/plist

// DO: use flutter_secure_storage
final secureStorage = FlutterSecureStorage();
await secureStorage.write(key: 'token', value: jwt);
```

### 7.4 React Native

**react-native-keychain:**
- Maps to iOS Keychain and Android Keystore
- Supports biometric access control
- Set `accessible` to `WHEN_UNLOCKED_THIS_DEVICE_ONLY` for tokens
- Use `setGenericPassword` / `getGenericPassword` for credential pairs

**react-native-encrypted-storage:**
- Simpler key-value API over Keychain (iOS) and EncryptedSharedPreferences (Android)
- Good for encrypted settings, tokens, and configuration

**Critical: Never use AsyncStorage for sensitive data.** AsyncStorage is a plaintext
JSON-backed store with no encryption or access control. It is appropriate only for
non-sensitive user preferences and UI state.

**Expo SecureStore:**
- For Expo-managed projects, `expo-secure-store` wraps Keychain (iOS) and
  EncryptedSharedPreferences (Android)
- Provides `setItemAsync` / `getItemAsync` with size limit of 2048 bytes per value

---

## 8. Incident Patterns

### 8.1 Mobile Data Leak Discovery

**How mobile data leaks are typically discovered:**

1. **Security researcher disclosure** -- researcher examines app binary, finds plaintext
   database or credentials in backup, reports to vendor
2. **Breach forum data dump** -- stolen data appears on underground forums; forensic
   investigation traces source to mobile app local storage
3. **Automated scanning** -- MobSF or similar tools in CI/CD catch insecure storage patterns
   before release (prevention) or during audit (detection)
4. **User report** -- user discovers personal data visible in files, exported backups, or
   screenshots shared inadvertently
5. **Regulatory audit** -- HIPAA, PCI-DSS, or GDPR audit identifies non-compliant data
   storage practices in mobile apps

### 8.2 Backup Extraction Attack Pattern

**Attack sequence:**
1. Attacker gains physical access to device (theft, borrowed, corporate)
2. Creates backup via iTunes (iOS) or `adb backup` (Android)
3. If unencrypted, directly accesses app sandbox files
4. If encrypted (iOS), attempts password brute-force against backup keybag
5. Extracts SQLite databases, SharedPreferences, Keychain backup
6. Searches for tokens, passwords, PII, API keys
7. Uses extracted credentials for account takeover or lateral movement

**Detection indicators:**
- Unexpected iTunes pairing records on corporate devices
- USB debugging enabled on managed Android devices
- Backup files appearing on unauthorized machines (MDM can detect this)
- Credential reuse from data only present in mobile app local storage

### 8.3 Response Playbook

1. **Contain:** Force token revocation server-side for affected accounts
2. **Assess:** Determine what data was stored locally and potentially exposed
3. **Remediate:** Push app update with encrypted storage; rotate all affected credentials
4. **Notify:** If PII/PHI was exposed, follow breach notification requirements (72 hours
   under GDPR, "without unreasonable delay" under HIPAA)
5. **Prevent:** Add backup extraction and storage audit to security testing pipeline
6. **Verify:** Perform backup extraction test on updated app to confirm fix

---

## 9. Compliance and Standards

### 9.1 OWASP MASVS-STORAGE (v2.0)

The Mobile Application Security Verification Standard (MASVS) v2.0 simplified storage
requirements to two primary controls:

**MASVS-STORAGE-1: Secure Storage of Sensitive Data**
- Sensitive data is not stored in plaintext
- Appropriate platform secure storage mechanisms are used
- Data is encrypted at rest with strong algorithms
- Encryption keys are properly managed (not hardcoded or co-located with data)

**MASVS-STORAGE-2: Prevention of Data Leakage**
- App does not leak sensitive data via backups, logs, screenshots, clipboard, or caches
- Third-party libraries and SDKs do not store sensitive data insecurely
- Keyboard cache is disabled for sensitive input fields

### 9.2 OWASP Mobile Top 10 2024 -- M9: Insecure Data Storage

**Moved from M2 (2016) to M9 (2024)** -- not because the risk decreased, but because
other categories were reorganized. Insecure data storage remains one of the most prevalent
mobile vulnerabilities.

**M9 covers:**
- Plaintext storage of credentials and tokens
- Weak or absent encryption on local databases
- Failure to use platform-native secure storage
- Data leakage through logs, backups, and caches
- Sensitive data visible in app snapshots

### 9.3 HIPAA Mobile Data Requirements

For mobile apps handling Protected Health Information (PHI):

- **Encryption mandate:** PHI must be encrypted at rest using AES-128/192/256 (per NIST)
- **Access controls:** Biometric or strong PIN required to access PHI on device
- **Audit logging:** Record all access to PHI stored on device
- **Session timeout:** Auto-logout after configurable inactivity period
- **Remote wipe:** Capability to remotely delete PHI from lost/stolen devices
- **Business Associate Agreements (BAAs):** Required for all vendors with PHI access,
  including cloud storage, analytics, and crash reporting services
- **Backup encryption:** All backups containing PHI must be encrypted
- **No SMS/MMS:** PHI must not be transmitted via SMS or MMS
- **Breach notification:** Report breaches affecting 500+ individuals within 60 days to HHS

### 9.4 PCI-DSS Mobile Considerations

For apps handling payment card data:
- Never store full track data, CVV, or PIN on the device
- PAN (card number) must be rendered unreadable when stored (encryption, truncation, hashing)
- Encryption keys must be stored separately from encrypted data
- Periodic scanning for unprotected PANs in local storage

### 9.5 GDPR Data Minimization

- Store only data strictly necessary for the app's stated purpose
- Implement data retention policies with automatic purging
- Provide users the ability to export and delete their data from local storage
- Document legal basis for each category of locally stored personal data

---

## 10. Code Examples

### 10.1 iOS Keychain -- Store and Retrieve Credentials (Swift)

```swift
import Security
import Foundation

enum KeychainError: Error {
    case duplicateItem
    case itemNotFound
    case unexpectedStatus(OSStatus)
}

// SECURE: Store a token in Keychain
func storeToken(_ token: String, for account: String) throws {
    let data = Data(token.utf8)

    let query: [String: Any] = [
        kSecClass as String:            kSecClassGenericPassword,
        kSecAttrService as String:      "com.example.app.auth",
        kSecAttrAccount as String:      account,
        kSecValueData as String:        data,
        kSecAttrAccessible as String:   kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]

    let status = SecItemAdd(query as CFDictionary, nil)

    switch status {
    case errSecSuccess:
        return
    case errSecDuplicateItem:
        // Update existing item
        let updateQuery: [String: Any] = [
            kSecClass as String:       kSecClassGenericPassword,
            kSecAttrService as String: "com.example.app.auth",
            kSecAttrAccount as String: account
        ]
        let attributes: [String: Any] = [
            kSecValueData as String:   data
        ]
        let updateStatus = SecItemUpdate(
            updateQuery as CFDictionary,
            attributes as CFDictionary
        )
        guard updateStatus == errSecSuccess else {
            throw KeychainError.unexpectedStatus(updateStatus)
        }
    default:
        throw KeychainError.unexpectedStatus(status)
    }
}

// SECURE: Retrieve a token from Keychain
func retrieveToken(for account: String) throws -> String? {
    let query: [String: Any] = [
        kSecClass as String:       kSecClassGenericPassword,
        kSecAttrService as String: "com.example.app.auth",
        kSecAttrAccount as String: account,
        kSecReturnData as String:  true,
        kSecMatchLimit as String:  kSecMatchLimitOne
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    switch status {
    case errSecSuccess:
        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    case errSecItemNotFound:
        return nil
    default:
        throw KeychainError.unexpectedStatus(status)
    }
}

// SECURE: Delete token from Keychain
func deleteToken(for account: String) throws {
    let query: [String: Any] = [
        kSecClass as String:       kSecClassGenericPassword,
        kSecAttrService as String: "com.example.app.auth",
        kSecAttrAccount as String: account
    ]
    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
        throw KeychainError.unexpectedStatus(status)
    }
}
```

**INSECURE pattern (what NOT to do):**
```swift
// INSECURE: Never store tokens in UserDefaults
UserDefaults.standard.set(token, forKey: "auth_token")  // Plaintext plist!
UserDefaults.standard.set(password, forKey: "password")  // Extractable via backup!
```

### 10.2 Android EncryptedSharedPreferences (Kotlin)

```kotlin
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

// SECURE: Create encrypted preferences
fun getSecurePrefs(context: Context): SharedPreferences {
    val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .setUserAuthenticationRequired(false)
        .build()

    return EncryptedSharedPreferences.create(
        context,
        "secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
}

// SECURE: Store a token
fun storeToken(context: Context, token: String) {
    getSecurePrefs(context)
        .edit()
        .putString("auth_token", token)
        .apply()
}

// SECURE: Retrieve a token
fun retrieveToken(context: Context): String? {
    return getSecurePrefs(context)
        .getString("auth_token", null)
}

// SECURE: Clear all sensitive data on logout
fun secureLogout(context: Context) {
    getSecurePrefs(context).edit().clear().apply()
}
```

**INSECURE pattern (what NOT to do):**
```kotlin
// INSECURE: Never store tokens in plain SharedPreferences
val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
prefs.edit().putString("auth_token", token).apply()  // Plaintext XML!
prefs.edit().putString("password", password).apply()  // Readable via adb backup!
```

### 10.3 Flutter / Dart -- Secure Storage

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.unlocked_this_device,
    ),
  );

  // SECURE: Store authentication token
  Future<void> storeToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  // SECURE: Retrieve authentication token
  Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }

  // SECURE: Clear all data on logout
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  // SECURE: Check if token exists
  Future<bool> hasToken() async {
    return await _storage.containsKey(key: 'auth_token');
  }
}
```

**INSECURE pattern (what NOT to do):**
```dart
// INSECURE: Never use shared_preferences for sensitive data
import 'package:shared_preferences/shared_preferences.dart';

final prefs = await SharedPreferences.getInstance();
prefs.setString('auth_token', token);  // Plaintext! Extractable via backup!
prefs.setString('password', password);  // Never store passwords locally!
```

### 10.4 SQLCipher Setup (Flutter)

```dart
import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureDatabase {
  static Database? _db;
  static const _storage = FlutterSecureStorage();
  static const _dbKeyName = 'db_encryption_key';

  // Generate or retrieve the database encryption key
  static Future<String> _getOrCreateKey() async {
    String? key = await _storage.read(key: _dbKeyName);
    if (key == null) {
      // Generate a cryptographically random key
      final random = Random.secure();
      final bytes = List<int>.generate(32, (_) => random.nextInt(256));
      key = base64Url.encode(bytes);
      await _storage.write(key: _dbKeyName, value: key);
    }
    return key;
  }

  // SECURE: Open encrypted database
  static Future<Database> getDatabase() async {
    if (_db != null) return _db!;

    final dbKey = await _getOrCreateKey();
    final dbPath = await getDatabasesPath();
    final path = '$dbPath/secure_app.db';

    _db = await openDatabase(
      path,
      password: dbKey,  // SQLCipher encryption password
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL
          )
        ''');
      },
    );
    return _db!;
  }

  // SECURE: Destroy database and key on logout
  static Future<void> destroyDatabase() async {
    await _db?.close();
    _db = null;
    final dbPath = await getDatabasesPath();
    await deleteDatabase('$dbPath/secure_app.db');
    await _storage.delete(key: _dbKeyName);
  }
}
```

### 10.5 Screenshot Prevention

**Android (Kotlin):**
```kotlin
// SECURE: Prevent screenshots and app switcher preview
class SensitiveActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Set FLAG_SECURE to prevent screenshots and screen recording
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
        setContentView(R.layout.activity_sensitive)
    }
}
```

**iOS (Swift):**
```swift
// SECURE: Obscure sensitive content in app switcher
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var blurView: UIVisualEffectView?

    func sceneWillResignActive(_ scene: UIScene) {
        // Add blur overlay when entering background
        guard let window = window else { return }
        let blurEffect = UIBlurEffect(style: .light)
        let blurView = UIVisualEffectView(effect: blurEffect)
        blurView.frame = window.bounds
        blurView.tag = 999
        window.addSubview(blurView)
        self.blurView = blurView
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Remove blur overlay when returning to foreground
        window?.viewWithTag(999)?.removeFromSuperview()
        blurView = nil
    }
}
```

**Flutter (Dart):**
```dart
import 'package:flutter/services.dart';

// Android-only: prevent screenshots via platform channel
class ScreenshotPrevention {
  static const _channel = MethodChannel('com.example.app/security');

  static Future<void> enableSecureMode() async {
    if (Platform.isAndroid) {
      await _channel.invokeMethod('enableSecureMode');
    }
  }

  static Future<void> disableSecureMode() async {
    if (Platform.isAndroid) {
      await _channel.invokeMethod('disableSecureMode');
    }
  }
}

// In the corresponding Android MainActivity.kt:
// override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
//     MethodChannel(flutterEngine.dartExecutor.binaryMessenger,
//         "com.example.app/security").setMethodCallHandler { call, result ->
//         when (call.method) {
//             "enableSecureMode" -> {
//                 window.setFlags(FLAG_SECURE, FLAG_SECURE)
//                 result.success(null)
//             }
//             "disableSecureMode" -> {
//                 window.clearFlags(FLAG_SECURE)
//                 result.success(null)
//             }
//         }
//     }
// }
```

### 10.6 Secure Logout -- Clearing All Sensitive Data

```swift
// iOS: Comprehensive secure logout
func performSecureLogout() {
    // 1. Delete Keychain items
    let secClasses = [
        kSecClassGenericPassword,
        kSecClassInternetPassword,
        kSecClassCertificate,
        kSecClassKey,
        kSecClassIdentity
    ]
    for secClass in secClasses {
        let query: [String: Any] = [kSecClass as String: secClass]
        SecItemDelete(query as CFDictionary)
    }

    // 2. Clear UserDefaults (non-sensitive prefs)
    if let bundleId = Bundle.main.bundleIdentifier {
        UserDefaults.standard.removePersistentDomain(forName: bundleId)
    }

    // 3. Clear cookies
    if let cookies = HTTPCookieStorage.shared.cookies {
        for cookie in cookies {
            HTTPCookieStorage.shared.deleteCookie(cookie)
        }
    }

    // 4. Clear URL cache
    URLCache.shared.removeAllCachedResponses()

    // 5. Clear WebView data
    let dataStore = WKWebsiteDataStore.default()
    let dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
    dataStore.fetchDataRecords(ofTypes: dataTypes) { records in
        dataStore.removeData(
            ofTypes: dataTypes,
            for: records,
            completionHandler: {}
        )
    }

    // 6. Clear temp files
    let tmpDir = NSTemporaryDirectory()
    if let files = try? FileManager.default.contentsOfDirectory(atPath: tmpDir) {
        for file in files {
            try? FileManager.default.removeItem(atPath: tmpDir + file)
        }
    }
}
```

```kotlin
// Android: Comprehensive secure logout
fun performSecureLogout(context: Context) {
    // 1. Clear encrypted preferences
    getSecurePrefs(context).edit().clear().apply()

    // 2. Clear regular preferences
    context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        .edit().clear().apply()

    // 3. Clear cookies
    CookieManager.getInstance().removeAllCookies(null)
    CookieManager.getInstance().flush()

    // 4. Clear WebView cache and data
    WebView(context).apply {
        clearCache(true)
        clearHistory()
        clearFormData()
    }
    WebStorage.getInstance().deleteAllData()

    // 5. Clear app cache
    context.cacheDir.deleteRecursively()

    // 6. Delete databases
    context.databaseList().forEach { dbName ->
        context.deleteDatabase(dbName)
    }

    // 7. Clear clipboard
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE)
        as ClipboardManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        clipboard.clearPrimaryClip()
    } else {
        clipboard.setPrimaryClip(ClipData.newPlainText("", ""))
    }
}
```

---

## References

- OWASP MASVS v2.0: https://mas.owasp.org/MASVS/
- OWASP Mobile Top 10 (2024): https://owasp.org/www-project-mobile-top-10/
- OWASP MASTG (Mobile Application Security Testing Guide): https://mas.owasp.org/MASTG/
- Apple Keychain Services Documentation: https://developer.apple.com/documentation/security/keychain_services
- Apple Data Protection: https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web
- Android Keystore: https://developer.android.com/training/articles/keystore
- EncryptedSharedPreferences: https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences
- EncryptedSharedPreferences Community Fork: https://github.com/ed-george/encrypted-shared-preferences
- SQLCipher: https://www.zetetic.net/sqlcipher/
- flutter_secure_storage: https://pub.dev/packages/flutter_secure_storage
- react-native-keychain: https://github.com/oblador/react-native-keychain
- MobSF: https://github.com/MobSF/Mobile-Security-Framework-MobSF
- Frida: https://frida.re
- Objection: https://github.com/sensepost/objection
- NIST SP 800-175B (Encryption Guidance): https://csrc.nist.gov/publications/detail/sp/800-175b/rev-1/final
- Verizon 2025 DBIR: https://www.verizon.com/business/resources/reports/dbir/
