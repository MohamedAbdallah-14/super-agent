# Mobile iOS Security — Expertise Module

> This module equips AI agents with deep knowledge of iOS application security:
> threat landscape, platform security model, secure implementation patterns,
> vulnerability catalog, tooling, and compliance standards. All guidance targets
> iOS 16+ / Swift 5.9+ and reflects OWASP MASVS v2, OWASP Mobile Top 10 (2024),
> and Apple Platform Security Guide (January 2026 edition).

---

## 1. Threat Landscape

### 1.1 iOS-Specific Attack Vectors

**Jailbreak Exploitation**
Jailbreaking removes iOS sandbox restrictions, granting root access and enabling
unsigned code execution. Tools like unc0ver, checkra1n, and Dopamine exploit
kernel vulnerabilities to disable code signing enforcement. On a jailbroken
device, attackers can inspect Keychain contents, hook Objective-C methods via
Cydia Substrate, bypass SSL pinning, and extract decrypted IPA binaries.

**Insecure Data Storage**
Data stored in UserDefaults, plist files, SQLite databases, or the app's
Documents directory without Data Protection is accessible via device backups,
forensic tools, or jailbroken file managers. Sensitive data in Core Data stores
without NSFileProtectionComplete can be read when the device is locked.

**IPC Attacks (URL Scheme Hijacking)**
Custom URL schemes lack ownership verification. Any app can register the same
scheme, leading to URL scheme hijacking where a malicious app intercepts
deep links meant for a legitimate app. Since Apple documentation states "if
more than one third-party app registers to handle the same URL scheme, there
is currently no process for determining which app will be given that scheme,"
this creates a race condition exploitable for credential theft and session
hijacking.

**Reverse Engineering**
Despite Mach-O binary compilation, iOS apps can be decrypted (using tools like
Clutch or frida-ios-dump), decompiled (Hopper, IDA Pro, Ghidra), and analyzed.
Hardcoded API keys, encryption keys, and business logic become exposed.
Objective-C runtime metadata makes method swizzling trivial; pure Swift is
harder to instrument but not immune.

**Side-Loading Risks (EU DMA)**
Since iOS 17.4 (March 2024), the EU Digital Markets Act requires Apple to allow
alternative app marketplaces and sideloading. Apps distributed outside the App
Store undergo Apple Notarization (a baseline integrity check) but bypass the
full App Review process. This opens vectors for:
- Malware distribution through less-vetted marketplaces
- Modified apps with injected payloads
- Phishing apps mimicking legitimate services
- Reduced user trust signals compared to App Store verification

Source: Apple Newsroom, "Apple announces changes to iOS in the European Union"
(January 2024); Apple, "Complying with the DMA" developer documentation.

### 1.2 Real-World Incidents

**NSO Pegasus / FORCEDENTRY (2021-2025)**
The FORCEDENTRY exploit chain (CVE-2021-30860) used a zero-click iMessage
vulnerability to deploy NSO Group's Pegasus spyware. It bypassed Apple's
BlastDoor sandbox by exploiting an integer overflow in CoreGraphics PDF
parsing. Google Project Zero called it "one of the most technically
sophisticated exploits ever seen." The exploit required zero user interaction —
receiving a crafted iMessage was sufficient for full device compromise.

In December 2024, a US court ruled NSO Group liable for hacking 1,400 WhatsApp
users. In May 2025, NSO was ordered to pay $167 million in damages.

Source: Citizen Lab, "BLASTPASS" (September 2023); Google Project Zero deep
dive (December 2021).

**BLASTPASS (September 2023)**
Another NSO exploit chain (CVE-2023-41064, CVE-2023-41061) used PassKit
attachments with malicious images to achieve zero-click code execution on
iOS 16.6. Apple patched in iOS 16.6.1 and introduced Lockdown Mode hardening.

**XcodeGhost Supply Chain Attack (2015)**
A trojanized Xcode IDE distributed through Chinese cloud services injected
malicious code into 2,500+ apps, affecting 128 million users. The malware
collected device info, prompted fake authentication dialogs, and hijacked URL
schemes. This incident led to OWASP Mobile Top 10 2024 elevating "Inadequate
Supply Chain Security" to M2.

Source: Palo Alto Networks Unit 42; Apple Epic v. Apple trial documents (2021).

**App Store Malware (Ongoing)**
Despite App Review, malware periodically reaches the App Store:
- 2024: Cryptocurrency drainer apps mimicking legitimate wallets
- 2023: VPN apps exfiltrating user data to unauthorized servers
- 2022: Fleeceware apps using misleading subscriptions
- Clipboard-reading apps exploiting pre-iOS 14 lack of paste notifications

Source: Kaspersky Mobile Threat Report 2024; Apple Transparency Report.

**Operation Triangulation (2023)**
Kaspersky discovered an advanced iOS attack chain exploiting four zero-day
vulnerabilities (including CVE-2023-41990 in the TrueType font processor).
The attack used invisible iMessage attachments to achieve code execution,
escalate privileges, and deploy spyware — all without user interaction.

Source: Kaspersky, "Operation Triangulation" (December 2023).

---

## 2. Core Security Principles

### 2.1 iOS Security Model

**App Sandbox**
Every third-party iOS app runs in a sandboxed process with a unique filesystem
container. Apps cannot access other apps' data, system files, or hardware
directly. The sandbox enforces:
- Filesystem isolation (each app has private Documents, Library, tmp)
- IPC restrictions (only via system-mediated mechanisms)
- Hardware access gating (camera, microphone, location require entitlements)
- Network socket restrictions

**Code Signing**
All executable code on iOS must be signed by a trusted certificate:
- App Store apps: signed by Apple after review
- Enterprise apps: signed with enterprise distribution certificate
- Development: signed with developer certificate + provisioning profile
Runtime enforcement (via AMFI — Apple Mobile File Integrity) kills processes
with invalid signatures. This prevents code injection and unauthorized
binary modification at the kernel level.

**Entitlements**
Entitlements are key-value pairs embedded in the code signature that declare
app capabilities (push notifications, Keychain access groups, HealthKit, etc.).
Since they are cryptographically signed, they cannot be modified post-signing.
The kernel and system daemons check entitlements before granting access to
protected resources.

**Address Space Layout Randomization (ASLR)**
iOS randomizes the memory layout of processes at launch, making exploitation
of memory corruption vulnerabilities significantly harder. Combined with
Pointer Authentication Codes (PAC) on A12+ chips, this provides strong
runtime exploit mitigation.

### 2.2 Data Protection API

iOS Data Protection encrypts files using per-file keys derived from the
device passcode and hardware UID. Four protection classes exist:

| Class | Constant | Availability | Use Case |
|-------|----------|--------------|----------|
| Complete Protection | `NSFileProtectionComplete` | Only when unlocked | Highly sensitive data (health, financial) |
| Complete Unless Open | `NSFileProtectionCompleteUnlessOpen` | Open files accessible while locked | Background file transfers |
| Until First Auth | `NSFileProtectionCompleteUntilFirstUserAuthentication` | After first unlock (default) | Data needed by background services |
| No Protection | `NSFileProtectionNone` | Always accessible | Non-sensitive cached data only |

**Best practice:** Set `NSFileProtectionComplete` as the default for the entire
app via the entitlements file, then downgrade individual files only when
background access is genuinely required.

### 2.3 Keychain Services

The iOS Keychain provides hardware-backed encrypted storage for small secrets
(passwords, tokens, keys). Items are encrypted using AES-256-GCM with keys
derived from the Secure Enclave.

**Keychain Accessibility Classes:**

| Class | Constant | Security Level |
|-------|----------|----------------|
| When Passcode Set, This Device | `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` | Highest — requires passcode; no backup migration |
| When Unlocked, This Device | `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` | High — no backup migration |
| When Unlocked | `kSecAttrAccessibleWhenUnlocked` | Medium — migrates to new device via backup |
| After First Unlock, This Device | `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` | Lower — accessible while locked after boot |
| After First Unlock | `kSecAttrAccessibleAfterFirstUnlock` | Lowest recommended — background access + migration |

**Best practice:** Use `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` for
authentication tokens and sensitive credentials. This ensures the item is
only accessible when the device has a passcode set, is unlocked, and cannot
be extracted via backup or device migration.

### 2.4 App Transport Security (ATS)

ATS enforces HTTPS for all network connections made via URLSession. Since
iOS 9, ATS is enabled by default and requires:
- TLS 1.2 or later
- Forward secrecy cipher suites (ECDHE)
- Certificates with SHA-256+ signatures and RSA 2048+ / ECC 256+ keys

ATS exceptions must be declared in Info.plist and are scrutinized during
App Review. Apple rejects apps with `NSAllowsArbitraryLoads = YES` without
valid justification.

### 2.5 Certificate Pinning

Certificate pinning restricts which TLS certificates the app trusts beyond
the system trust store. Two approaches:

- **Public key pinning:** Pin the Subject Public Key Info (SPKI) hash.
  Survives certificate rotation if the same key pair is reused.
- **Certificate pinning:** Pin the full leaf or intermediate certificate.
  Requires app update when certificates rotate.

Apple's recommendation: Pin CA public keys rather than leaf certificates, and
always include a backup pin. iOS requires at least two SPKI hashes when using
the Info.plist-based `NSPinnedDomains` configuration.

### 2.6 Biometric Authentication

Face ID and Touch ID are mediated by the Secure Enclave, which stores
biometric templates in encrypted form inaccessible to the application
processor. The LocalAuthentication framework provides:

- `LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)` —
  biometric-only verification
- `LAContext.evaluatePolicy(.deviceOwnerAuthentication)` — biometric with
  device passcode fallback

**Critical principle:** Biometric checks alone are a UX convenience, not a
security boundary. True security requires binding Keychain items to biometric
access controls so the Secure Enclave gates key release:

```
Access control flag: .biometryCurrentSet + .privateKeyUsage
```

This ensures that if biometric enrollment changes (e.g., new fingerprint
added), the Keychain item becomes inaccessible, forcing re-authentication.

---

## 3. Implementation Patterns

### 3.1 Secure Keychain Wrapper (Swift)

```swift
import Security
import Foundation

enum KeychainError: Error {
    case duplicateItem
    case itemNotFound
    case unexpectedStatus(OSStatus)
    case encodingError
}

struct KeychainManager {

    // MARK: - Save

    static func save(
        key: String,
        data: Data,
        accessibility: CFString = kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly
    ) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: accessibility
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        switch status {
        case errSecSuccess:
            return
        case errSecDuplicateItem:
            // Update existing item
            let updateQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: key
            ]
            let updateAttributes: [String: Any] = [
                kSecValueData as String: data,
                kSecAttrAccessible as String: accessibility
            ]
            let updateStatus = SecItemUpdate(
                updateQuery as CFDictionary,
                updateAttributes as CFDictionary
            )
            guard updateStatus == errSecSuccess else {
                throw KeychainError.unexpectedStatus(updateStatus)
            }
        default:
            throw KeychainError.unexpectedStatus(status)
        }
    }

    // MARK: - Retrieve

    static func retrieve(key: String) throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            if status == errSecItemNotFound {
                throw KeychainError.itemNotFound
            }
            throw KeychainError.unexpectedStatus(status)
        }
        return data
    }

    // MARK: - Delete

    static func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
```

### 3.2 Biometric-Protected Keychain Item

```swift
import Security
import LocalAuthentication

func saveBiometricProtectedToken(_ token: Data, account: String) throws {
    let access = SecAccessControlCreateWithFlags(
        kCFAllocatorDefault,
        kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
        [.biometryCurrentSet, .privateKeyUsage],
        nil
    )

    guard let accessControl = access else {
        throw KeychainError.unexpectedStatus(errSecParam)
    }

    let context = LAContext()
    context.touchIDAuthenticationAllowableReuseDuration = 0 // Force fresh auth

    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecValueData as String: token,
        kSecAttrAccessControl as String: accessControl,
        kSecUseAuthenticationContext as String: context
    ]

    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else {
        throw KeychainError.unexpectedStatus(status)
    }
}

func retrieveBiometricProtectedToken(account: String) throws -> Data {
    let context = LAContext()
    context.localizedReason = "Authenticate to access your secure token"

    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecReturnData as String: true,
        kSecMatchLimit as String: kSecMatchLimitOne,
        kSecUseAuthenticationContext as String: context
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    guard status == errSecSuccess, let data = result as? Data else {
        throw KeychainError.unexpectedStatus(status)
    }
    return data
}
```

### 3.3 Certificate Pinning (URLSession)

```swift
import Foundation
import CryptoKit

class PinnedSessionDelegate: NSObject, URLSessionDelegate {

    // SHA-256 hashes of Subject Public Key Info (SPKI)
    private let pinnedHashes: Set<String> = [
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", // Primary
        "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="  // Backup
    ]

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (
            URLSession.AuthChallengeDisposition, URLCredential?
        ) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod
                == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust
        else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        // Evaluate standard trust
        var error: CFError?
        guard SecTrustEvaluateWithError(serverTrust, &error) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        // Extract and verify public key hash
        guard let serverCertificate = SecTrustGetCertificateAtIndex(
            serverTrust, 0
        ) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        guard let serverPublicKey = SecCertificateCopyKey(serverCertificate),
              let serverPublicKeyData = SecKeyCopyExternalRepresentation(
                  serverPublicKey, nil
              ) as Data?
        else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let hash = SHA256.hash(data: serverPublicKeyData)
        let hashBase64 = Data(hash).base64EncodedString()

        if pinnedHashes.contains(hashBase64) {
            completionHandler(
                .useCredential,
                URLCredential(trust: serverTrust)
            )
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}

// Usage
let session = URLSession(
    configuration: .default,
    delegate: PinnedSessionDelegate(),
    delegateQueue: nil
)
```

**Info.plist Alternative (NSPinnedDomains — iOS 14+):**
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSPinnedDomains</key>
    <dict>
        <key>api.example.com</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSPinnedCAIdentity</key>
            <array>
                <dict>
                    <key>SPKI-SHA256-BASE64</key>
                    <string>AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</string>
                </dict>
                <dict>
                    <key>SPKI-SHA256-BASE64</key>
                    <string>BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</string>
                </dict>
            </array>
        </dict>
    </dict>
</dict>
```

### 3.4 Secure WKWebView Configuration

```swift
import WebKit

func createSecureWebView() -> WKWebView {
    let config = WKWebViewConfiguration()
    let prefs = WKWebpagePreferences()

    // Disable JavaScript unless explicitly needed
    prefs.allowsContentJavaScript = false
    config.defaultWebpagePreferences = prefs

    // Prevent file:// access
    config.preferences.setValue(false, forKey: "allowFileAccessFromFileURLs")

    // Disable universal file access
    config.preferences.setValue(
        false, forKey: "allowUniversalAccessFromFileURLs"
    )

    // Restrict media playback
    config.allowsInlineMediaPlayback = false
    config.mediaTypesRequiringUserActionForPlayback = .all

    let webView = WKWebView(frame: .zero, configuration: config)

    // Set navigation delegate for URL validation
    webView.navigationDelegate = self
    return webView
}

// MARK: - WKNavigationDelegate — URL allowlisting

extension SecureWebViewController: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url,
              let scheme = url.scheme,
              ["https"].contains(scheme),
              allowedHosts.contains(url.host ?? "")
        else {
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }
}
```

### 3.5 Jailbreak Detection

```swift
import Foundation
import UIKit
import Darwin

struct JailbreakDetector {

    static func isJailbroken() -> Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        return checkSuspiciousPaths()
            || checkSuspiciousURLSchemes()
            || checkWriteOutsideSandbox()
            || checkFork()
            || checkDylibs()
        #endif
    }

    // MARK: - Check 1: Suspicious file paths

    private static func checkSuspiciousPaths() -> Bool {
        let paths = [
            "/Applications/Cydia.app",
            "/Applications/Sileo.app",
            "/Applications/Zebra.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/usr/sbin/sshd",
            "/usr/bin/ssh",
            "/etc/apt",
            "/var/lib/cydia",
            "/private/var/stash",
            "/usr/libexec/cydia",
            "/var/jb"  // rootless jailbreak path
        ]
        return paths.contains { FileManager.default.fileExists(atPath: $0) }
    }

    // MARK: - Check 2: URL schemes for jailbreak tools

    private static func checkSuspiciousURLSchemes() -> Bool {
        let schemes = [
            "cydia://package/com.example",
            "sileo://package/com.example",
            "zbra://packages/com.example",
            "filza://view"
        ]
        return schemes.contains { urlString in
            guard let url = URL(string: urlString) else { return false }
            return UIApplication.shared.canOpenURL(url)
        }
    }

    // MARK: - Check 3: Write outside sandbox

    private static func checkWriteOutsideSandbox() -> Bool {
        let testPath = "/private/jailbreak_test_\(UUID().uuidString)"
        do {
            try "test".write(
                toFile: testPath,
                atomically: true,
                encoding: .utf8
            )
            try FileManager.default.removeItem(atPath: testPath)
            return true // Should not succeed on non-jailbroken device
        } catch {
            return false
        }
    }

    // MARK: - Check 4: Fork availability

    private static func checkFork() -> Bool {
        let pid = fork()
        if pid >= 0 {
            // fork succeeded — jailbroken (sandbox should prevent fork)
            if pid > 0 { kill(pid, SIGTERM) }
            return true
        }
        return false
    }

    // MARK: - Check 5: Suspicious dynamic libraries

    private static func checkDylibs() -> Bool {
        let suspiciousLibs = [
            "SubstrateLoader", "SSLKillSwitch", "MobileSubstrate",
            "TweakInject", "CydiaSubstrate", "FridaGadget",
            "libcycript", "frida-agent"
        ]
        let count = _dyld_image_count()
        for i in 0..<count {
            guard let name = _dyld_get_image_name(i) else { continue }
            let imageName = String(cString: name)
            if suspiciousLibs.contains(where: { imageName.contains($0) }) {
                return true
            }
        }
        return false
    }
}
```

**Important caveat:** All client-side jailbreak detection can be bypassed by a
determined attacker (e.g., using Liberty Lite, Shadow, or A-Bypass). Jailbreak
detection raises the cost of attack but is not a security guarantee. Critical
security decisions should be validated server-side.

### 3.6 App Attest / DeviceCheck

```swift
import DeviceCheck

// MARK: - App Attest (iOS 14+)

func attestKey() async throws -> String {
    let service = DCAppAttestService.shared

    guard service.isSupported else {
        throw AppAttestError.unsupported
    }

    // Generate a new cryptographic key
    let keyId = try await service.generateKey()

    // Create attestation with server-generated challenge
    let challenge = try await fetchChallengeFromServer()
    let challengeHash = Data(SHA256.hash(data: challenge))
    let attestation = try await service.attestKey(
        keyId, clientDataHash: challengeHash
    )

    // Send attestation to server for verification
    try await sendAttestationToServer(
        keyId: keyId,
        attestation: attestation
    )
    return keyId
}

// MARK: - Assert Request Integrity

func assertRequest(
    keyId: String, requestData: Data
) async throws -> Data {
    let service = DCAppAttestService.shared
    let requestHash = Data(SHA256.hash(data: requestData))
    let assertion = try await service.generateAssertion(
        keyId, clientDataHash: requestHash
    )
    return assertion
}

// MARK: - DeviceCheck (per-device flags)

func setDeviceFlag() async throws {
    let device = DCDevice.current

    guard device.isSupported else { return }

    let token = try await device.generateToken()
    // Send token to your server; server calls Apple's API
    // to query/update two bits of per-device state
    try await sendDeviceTokenToServer(token)
}
```

### 3.7 Secure Enclave Key Generation

```swift
import Security
import CryptoKit

func generateSecureEnclaveKey(tag: String) throws -> SecKey {
    let access = SecAccessControlCreateWithFlags(
        kCFAllocatorDefault,
        kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        [.privateKeyUsage, .biometryCurrentSet],
        nil
    )!

    let attributes: [String: Any] = [
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeySizeInBits as String: 256,
        kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
        kSecPrivateKeyAttrs as String: [
            kSecAttrIsPermanent as String: true,
            kSecAttrApplicationTag as String: tag.data(using: .utf8)!,
            kSecAttrAccessControl as String: access
        ]
    ]

    var error: Unmanaged<CFError>?
    guard let privateKey = SecKeyCreateRandomKey(
        attributes as CFDictionary, &error
    ) else {
        throw error!.takeRetainedValue() as Error
    }
    return privateKey
}

// Sign data with Secure Enclave key
func signWithSecureEnclave(key: SecKey, data: Data) throws -> Data {
    var error: Unmanaged<CFError>?
    guard let signature = SecKeyCreateSignature(
        key,
        .ecdsaSignatureMessageX962SHA256,
        data as CFData,
        &error
    ) as Data? else {
        throw error!.takeRetainedValue() as Error
    }
    return signature
}
```

---

## 4. Vulnerability Catalog

### V01: Sensitive Data in UserDefaults
- **Risk:** UserDefaults stores data in plaintext plist files within the app
  sandbox. Accessible via device backups, forensic extraction, or jailbreak.
- **Impact:** Exposure of tokens, PII, session identifiers.
- **Fix:** Store secrets in Keychain with appropriate accessibility class.
- **MASVS:** MASVS-STORAGE

### V02: Screenshots Exposing Sensitive Data
- **Risk:** iOS captures a screenshot when the app enters background
  (for the app switcher). Sensitive screens (banking, health data) are
  stored as images in the app sandbox.
- **Impact:** Visual exposure of confidential information.
- **Fix:** Implement `applicationWillResignActive` to overlay a blur or
  placeholder view. Use `UITextField.isSecureTextEntry` for sensitive fields.
- **MASVS:** MASVS-STORAGE

### V03: Pasteboard / Clipboard Leaks
- **Risk:** Data copied to `UIPasteboard.general` is accessible to all apps.
  Pre-iOS 14, clipboard reads were silent. Research by Mysk (2020) documented
  dozens of popular apps silently reading clipboard contents.
- **Impact:** Credential theft, location tracking via photo GPS metadata.
- **Fix:** Use app-specific `UIPasteboard(name:create:)` for internal copy.
  Mark items as `localOnly` and set expiration. For sensitive fields, disable
  copy via `UIMenuController` customization.
- **MASVS:** MASVS-STORAGE, MASVS-PRIVACY

### V04: Insecure IPC via Custom URL Schemes
- **Risk:** URL scheme hijacking (see Section 1.1). Sensitive data passed
  via URL query parameters is logged in system logs and accessible to
  intercepting apps.
- **Impact:** Authentication token theft, session hijacking.
- **Fix:** Migrate to Universal Links (HTTPS-based, verified via
  apple-app-site-association file). If URL schemes are required, validate
  the `sourceApplication` parameter and never pass secrets in URLs.
- **MASVS:** MASVS-PLATFORM

### V05: Missing or Misconfigured ATS
- **Risk:** `NSAllowsArbitraryLoads = YES` disables ATS globally,
  permitting plaintext HTTP. Per-domain exceptions
  (`NSExceptionAllowsInsecureHTTPLoads`) weaken specific connections.
- **Impact:** Man-in-the-middle attacks, credential interception.
- **Fix:** Remove all ATS exceptions. If exceptions are required (e.g.,
  third-party CDN), use the narrowest scope (`NSExceptionDomains` with
  specific domains). Apple App Review scrutinizes blanket ATS exemptions.
- **MASVS:** MASVS-NETWORK

### V06: Weak Keychain Accessibility
- **Risk:** Using `kSecAttrAccessibleAlways` (deprecated) or
  `kSecAttrAccessibleAfterFirstUnlock` makes Keychain items accessible
  when the device is locked and extractable via backups.
- **Impact:** Token theft from device backups or locked-device attacks.
- **Fix:** Use `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` for
  credentials. Add `kSecAttrAccessControl` with `.biometryCurrentSet`
  for high-value secrets.
- **MASVS:** MASVS-STORAGE

### V07: Missing Jailbreak Detection
- **Risk:** Jailbroken devices bypass sandbox, code signing, and Data
  Protection. Apps running on jailbroken devices are vulnerable to
  runtime manipulation, Keychain dumping, and method hooking.
- **Impact:** Complete compromise of client-side security controls.
- **Fix:** Implement layered jailbreak detection (Section 3.5). Combine
  with server-side risk scoring. For high-security apps, refuse to
  operate on jailbroken devices.
- **MASVS:** MASVS-RESILIENCE

### V08: Debug Logging in Production
- **Risk:** `NSLog`, `print`, and `os_log` output is readable via
  Console.app on connected Mac or via syslog on jailbroken devices.
  Sensitive data (tokens, user input, API responses) in logs leaks
  to anyone with device access.
- **Impact:** Credential exposure, PII leakage.
- **Fix:** Use a logging framework with log levels (os_log with
  `.private` redaction). Wrap sensitive logging in `#if DEBUG`.
  Strip NSLog calls in release builds via compiler flags.
- **MASVS:** MASVS-STORAGE

### V09: Hardcoded Secrets and API Keys
- **Risk:** API keys, encryption keys, and credentials embedded in
  source code are extractable via binary analysis (strings, class-dump,
  Hopper). Even obfuscation only slows extraction.
- **Impact:** Backend compromise, unauthorized API access.
- **Fix:** Fetch secrets from a secure backend at runtime. Use
  configuration endpoints with App Attest. For required embedded keys,
  use xcconfig files excluded from VCS and obfuscation.
- **MASVS:** MASVS-CRYPTO, MASVS-RESILIENCE

### V10: Insecure WebView Configuration
- **Risk:** WKWebView with JavaScript enabled and permissive file access
  can be exploited for cross-site scripting, local file exfiltration,
  or JavaScript bridge abuse.
- **Impact:** Data theft, phishing within app context.
- **Fix:** Follow Section 3.4 pattern. Restrict to HTTPS URLs.
  Implement Content Security Policy headers. Use
  `WKScriptMessageHandler` with strict input validation for
  JavaScript-to-native bridges.
- **MASVS:** MASVS-PLATFORM

### V11: Insufficient Certificate Validation
- **Risk:** Not implementing certificate pinning allows MITM attacks
  with rogue certificates (e.g., corporate proxy, compromised CA).
  Trusting self-signed certificates in production bypasses the entire
  TLS trust model.
- **Impact:** Complete interception of API traffic.
- **Fix:** Implement SPKI pinning (Section 3.3) or use NSPinnedDomains.
  Never override `URLAuthenticationChallenge` to blindly trust all
  certificates in production builds.
- **MASVS:** MASVS-NETWORK

### V12: Unprotected Biometric Authentication
- **Risk:** Using `evaluatePolicy` alone without Keychain access
  control provides only a boolean result that can be bypassed via
  method swizzling or Frida hooking (`LAContext.evaluatePolicy` → true).
- **Impact:** Authentication bypass on jailbroken or instrumented devices.
- **Fix:** Bind Keychain items to biometric access control (Section 3.2)
  so the Secure Enclave gates key release. Never rely solely on the
  boolean result of `evaluatePolicy`.
- **MASVS:** MASVS-AUTH

### V13: Improper Credential Storage
- **Risk:** Storing OAuth tokens in app files, Core Data, or Realm
  without encryption. Using symmetric encryption with hardcoded keys.
- **Impact:** Token theft, account takeover.
- **Fix:** Store all credentials in Keychain. Use refresh token rotation.
  Implement token binding to device identity via App Attest.
- **MASVS:** MASVS-STORAGE, MASVS-AUTH

### V14: Missing Binary Protections
- **Risk:** Without obfuscation, stripped symbols, and anti-tampering
  checks, the app binary is easily reverse-engineered. Attackers can
  patch logic, disable security checks, or clone the app.
- **Impact:** IP theft, circumvention of licensing/payment logic.
- **Fix:** Enable bitcode. Strip debug symbols in release. Use
  commercial obfuscators (SwiftShield, iXGuard). Implement integrity
  checks on binary hash at runtime. Use App Attest for server-side
  app integrity verification.
- **MASVS:** MASVS-RESILIENCE

### V15: Insecure Backup Data
- **Risk:** iTunes/Finder backups include app sandbox contents.
  Unencrypted backups on a computer expose all files without Data
  Protection. iCloud backup may include Keychain items with permissive
  accessibility.
- **Impact:** Offline extraction of app data and credentials.
- **Fix:** Exclude sensitive files with
  `URLResourceValues.isExcludedFromBackup = true`. Use
  `ThisDeviceOnly` Keychain accessibility. Apply NSFileProtectionComplete
  to sensitive files.
- **MASVS:** MASVS-STORAGE

---

## 5. Security Checklist

### Data Protection
- [ ] All secrets stored in Keychain (never UserDefaults, plist, or files)
- [ ] Keychain items use `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`
- [ ] NSFileProtectionComplete set as default file protection level
- [ ] Sensitive files excluded from device backups
- [ ] Background screenshot protection implemented (blur/placeholder)
- [ ] Pasteboard usage restricted (local-only, expiring, or disabled)
- [ ] No sensitive data in debug/production logs

### Network Security
- [ ] ATS enabled with no blanket exceptions
- [ ] Certificate pinning implemented for critical API endpoints
- [ ] At least two SPKI pins configured (primary + backup)
- [ ] Certificate rotation plan documented and tested
- [ ] No hardcoded API endpoints — use server-driven configuration

### Authentication
- [ ] Biometric auth bound to Keychain access controls (not boolean-only)
- [ ] Session tokens use short expiry with refresh token rotation
- [ ] OAuth PKCE flow for authorization code exchange
- [ ] Re-authentication required for sensitive operations
- [ ] Face ID usage description present in Info.plist

### Platform Security
- [ ] Universal Links preferred over custom URL schemes
- [ ] URL scheme handlers validate `sourceApplication`
- [ ] WKWebView configured with minimal privileges (JS disabled if unused)
- [ ] WebView navigation restricted to allowlisted HTTPS domains
- [ ] Inter-app data sharing uses App Groups with minimal scope

### Binary Protection
- [ ] Jailbreak detection implemented with multiple checks
- [ ] Debug detection (ptrace anti-attach) in release builds
- [ ] App Attest / DeviceCheck integrated for server-side integrity
- [ ] Debug symbols stripped from release binaries
- [ ] No hardcoded secrets in source code or binaries

### Build & Release
- [ ] Xcode "Validate App" run before every submission
- [ ] Compiler stack protector enabled (`-fstack-protector-all`)
- [ ] Position Independent Executable (PIE) enabled (default for iOS)
- [ ] Automatic Reference Counting (ARC) enabled (prevents use-after-free)
- [ ] Third-party dependencies audited and version-pinned
- [ ] SBOM generated for supply chain tracking

---

## 6. Tools & Automation

### Static Analysis

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Semgrep** (with Swift rules) | SAST for Swift — detects insecure storage, missing pinning, hardcoded secrets | CI/CD pipeline, pre-commit hooks |
| **SwiftLint** | Code style + custom security rules | Xcode build phase, CI |
| **DeepSource** | Automated code review with Swift security analyzers | GitHub/GitLab integration |
| **Snyk** | Dependency vulnerability scanning (CocoaPods, SPM) | CI/CD, IDE plugin |
| **Xcode Analyzer** | Static analysis built into Xcode (Cmd+Shift+B with analysis) | IDE-integrated |

### Dynamic Analysis

| Tool | Purpose | Requirement |
|------|---------|-------------|
| **MobSF** | Automated static + dynamic analysis of IPA files | Docker or local install |
| **Frida** | Dynamic instrumentation — hook functions, bypass checks, inspect runtime | Jailbroken device or Frida gadget injection |
| **Objection** | Runtime exploration powered by Frida — Keychain dump, SSL bypass, jailbreak bypass | Jailbroken device recommended |
| **Burp Suite** | HTTP/S traffic interception and manipulation | Proxy configuration |
| **Charles Proxy** | HTTPS debugging proxy with SSL proxying | Certificate trust on device |

### Apple-Provided Tools

| Tool | Purpose |
|------|---------|
| **Xcode Instruments** | Memory leak detection, performance profiling, network inspection |
| **App Attest** | Cryptographic device/app integrity verification |
| **DeviceCheck** | Per-device state flags (2 bits) persisted by Apple |
| **Xcode Organizer** | Crash reports, energy diagnostics, disk usage |
| **Managed App Configuration** | MDM-based secure configuration delivery |

### Recommended CI/CD Security Pipeline

```
Build → SwiftLint → Semgrep SAST → Snyk SCA → Unit Tests
  → Archive IPA → MobSF Static Scan → App Attest Integration Test
  → TestFlight / App Store Connect
```

---

## 7. Platform-Specific Guidance

### 7.1 Swift Security Patterns

**Value Types Over Reference Types:**
Prefer structs for sensitive data models. Value types are stack-allocated
(short-lived in memory) and copied on assignment, reducing the window for
memory inspection attacks compared to heap-allocated class instances.

**Access Control:**
Use `private` and `fileprivate` aggressively for security-sensitive
properties. Mark security classes as `final` to prevent subclass overrides.

**Secure String Handling:**
```swift
// INSECURE: String persists in memory
let password = "secret123"

// SECURE: Use Data, zero out after use
var sensitiveData = "secret123".data(using: .utf8)!
defer {
    sensitiveData.resetBytes(in: 0..<sensitiveData.count)
}
// Use sensitiveData for authentication, then it is zeroed
```

**Result Type for Security Operations:**
```swift
enum AuthResult {
    case authenticated(token: String)
    case biometricFailed(LAError)
    case keychainError(OSStatus)
    case jailbreakDetected
}
// Exhaustive switch forces handling all security-relevant outcomes
```

### 7.2 SwiftUI Security

**Redacted Content in App Switcher:**
```swift
struct ContentView: View {
    @Environment(\.scenePhase) var scenePhase
    @State private var isBlurred = false

    var body: some View {
        SensitiveContentView()
            .blur(radius: isBlurred ? 30 : 0)
            .onChange(of: scenePhase) { _, newPhase in
                isBlurred = (newPhase != .active)
            }
    }
}
```

**Secure Text Input:**
```swift
SecureField("Password", text: $password)
    .textContentType(.password)
    .autocorrectionDisabled()
    .textInputAutocapitalization(.never)
```

**Preventing Screenshot Capture (iOS 17+):**
```swift
// Leverage UITextField.isSecureTextEntry behavior
// by embedding a secure text field technique in SwiftUI
struct ScreenshotProtectedView<Content: View>: UIViewRepresentable {
    let content: Content

    func makeUIView(context: Context) -> UIView {
        let secureField = UITextField()
        secureField.isSecureTextEntry = true
        // The secure field's layer prevents screenshots
        let containerView = secureField.layer.sublayers?.first?.delegate
            as? UIView ?? UIView()
        return containerView
    }
}
```

### 7.3 UIKit Security

**Secure View Controller Lifecycle:**
```swift
class SecureViewController: UIViewController {
    private let blurView = UIVisualEffectView(
        effect: UIBlurEffect(style: .systemUltraThinMaterial)
    )

    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(willResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(didBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    @objc private func willResignActive() {
        blurView.frame = view.bounds
        view.addSubview(blurView)
    }

    @objc private func didBecomeActive() {
        blurView.removeFromSuperview()
    }
}
```

### 7.4 Xcode Build Settings for Security

| Setting | Value | Purpose |
|---------|-------|---------|
| `ENABLE_BITCODE` | `YES` (deprecated iOS 16+) | App thinning, additional optimization |
| `GCC_GENERATE_DEBUGGING_SYMBOLS` | `NO` (Release) | Strip debug symbols |
| `STRIP_INSTALLED_PRODUCT` | `YES` | Remove symbol tables from release binary |
| `DEPLOYMENT_POSTPROCESSING` | `YES` | Enable post-processing including stripping |
| `DEBUG_INFORMATION_FORMAT` | `dwarf` (Release) | No dSYM in final binary |
| `GCC_PREPROCESSOR_DEFINITIONS` | `NDEBUG=1` (Release) | Disable assert() in release |
| `SWIFT_OPTIMIZATION_LEVEL` | `-O` or `-Osize` | Optimized code, harder to reverse-engineer |
| `ENABLE_TESTABILITY` | `NO` (Release) | Prevent internal access from test bundles |
| `OTHER_LDFLAGS` | `-Wl,-sectcreate,__RESTRICT,__restrict,/dev/null` | Mark binary as restricted (anti-DYLD_INSERT) |

### 7.5 App Store Review Security Requirements

Apple App Review enforces these security requirements:
- **ATS compliance:** Justified exceptions only; blanket disabling rejected
- **Privacy manifest:** Required since Spring 2024 for apps using tracking
  APIs, required reason APIs (UserDefaults timestamps, file attributes, etc.)
- **Privacy nutrition labels:** Accurate data collection declarations
- **Login with Apple:** Required if app offers third-party social login
- **Minimum permissions:** Camera, location, contacts — must justify each
- **Data deletion:** Apps collecting user data must offer account deletion
- **Encryption declarations:** Export compliance documentation for custom crypto

---

## 8. Incident Patterns

### 8.1 Data Leak Detection

**Indicators of data exposure:**
- Unexplained increase in account takeover attempts
- User reports of personalized phishing targeting app-specific data
- API traffic from unexpected geographic locations or device profiles
- Anomalous Keychain access patterns in security logs
- Backup files appearing on unauthorized services

**Investigation steps:**
1. Enable App Attest to verify app integrity on API requests
2. Check server logs for requests missing valid attestation assertions
3. Audit Keychain accessibility classes in production builds
4. Review Data Protection levels on all files in app sandbox
5. Scan for sensitive data in device backups using iMazing or
   libimobiledevice tools
6. Check if debug logging was inadvertently enabled in release

### 8.2 Unauthorized Access via IPC

**Attack scenario:** Malicious app registers the same URL scheme as the
target app, intercepting OAuth callbacks containing authorization codes.

**Detection:**
- Monitor for duplicate URL scheme registrations on user devices
- Server-side correlation of authorization code redemption with expected
  redirect URIs (Universal Links eliminate this attack)
- App Attest-based client identity verification

**Response:**
1. Immediately migrate from custom URL schemes to Universal Links
2. Invalidate all active sessions / tokens issued during compromise window
3. Implement PKCE (which binds the authorization code to the requesting app)
4. Deploy App Attest for API authentication
5. Notify affected users and require password reset

### 8.3 Jailbreak-Based Exploitation Response

**Detection signals:**
- Server receives requests from apps with tampered signatures
- App Attest assertions fail validation
- Unusual API call patterns (automated scraping, rate limit violations)

**Response:**
1. Flag device via DeviceCheck (set fraud bit)
2. Restrict access from flagged devices (read-only, degraded functionality)
3. Require step-up authentication for sensitive operations
4. Log and analyze the attack patterns for future detection rules
5. Consider reporting to Apple if it involves App Store policy violations

---

## 9. Compliance & Standards

### 9.1 OWASP MASVS v2 (2023-2024)

The Mobile Application Security Verification Standard defines eight control
categories. Key requirements for iOS:

| Category | Key Controls |
|----------|--------------|
| **MASVS-STORAGE** | No sensitive data in logs, backups, clipboard; Keychain for secrets; Data Protection on files |
| **MASVS-CRYPTO** | No hardcoded keys; use platform crypto (CryptoKit, Security.framework); minimum AES-256 |
| **MASVS-AUTH** | Biometric bound to Keychain; session management server-side; re-auth for sensitive ops |
| **MASVS-NETWORK** | TLS 1.2+; certificate pinning; no cleartext HTTP; ATS enforced |
| **MASVS-PLATFORM** | Universal Links over URL schemes; secure WebView; input validation on IPC |
| **MASVS-CODE** | Dependency management; no debug code in release; stack canaries; binary integrity |
| **MASVS-RESILIENCE** | Jailbreak detection; anti-debugging; obfuscation; App Attest |
| **MASVS-PRIVACY** | Privacy manifest; minimal data collection; consent management; data deletion |

Source: https://mas.owasp.org/MASVS/

### 9.2 OWASP Mobile Top 10 (2024)

| # | Risk | iOS Relevance |
|---|------|---------------|
| M1 | Improper Credential Usage | Hardcoded keys, insecure Keychain accessibility |
| M2 | Inadequate Supply Chain Security | Untrusted CocoaPods/SPM dependencies, XcodeGhost-type attacks |
| M3 | Insecure Authentication/Authorization | Boolean-only biometric checks, missing server-side validation |
| M4 | Insufficient Input/Output Validation | WebView JavaScript injection, URL scheme parameter injection |
| M5 | Insecure Communication | Missing ATS, no certificate pinning, cleartext fallback |
| M6 | Inadequate Privacy Controls | Excessive permissions, missing privacy manifest, tracking without consent |
| M7 | Insufficient Binary Protections | No obfuscation, debug symbols in release, no integrity checks |
| M8 | Security Misconfiguration | ATS exceptions, permissive entitlements, debug flags |
| M9 | Insecure Data Storage | UserDefaults for secrets, unprotected SQLite, background screenshots |
| M10 | Insufficient Cryptography | Custom crypto implementations, weak algorithms, hardcoded IVs |

Source: https://owasp.org/www-project-mobile-top-10/

### 9.3 Apple Platform Security Guide

Apple publishes the Apple Platform Security guide (updated January 2026),
covering:
- Hardware security (Secure Enclave, Secure Boot, hardware key storage)
- System security (kernel integrity protection, signed system volume)
- Data protection (per-file encryption, Keychain architecture)
- App security (code signing, sandboxing, entitlements)
- Network security (ATS, VPN, Wi-Fi security)
- Biometric security (Face ID / Touch ID architecture)

Source: https://support.apple.com/guide/security/welcome/web

### 9.4 Regulatory Compliance

| Regulation | iOS Requirements |
|-----------|------------------|
| **GDPR** | Privacy manifest, data minimization, right to deletion, consent before tracking |
| **CCPA/CPRA** | Opt-out of data sale, data access/deletion API, privacy policy |
| **HIPAA** | NSFileProtectionComplete, encrypted Keychain, audit logging, BAA with Apple |
| **PCI DSS** | No card data in logs/screenshots, encrypted storage, certificate pinning |
| **SOC 2** | Access controls, encryption at rest and in transit, incident response |

---

## 10. Insecure vs. Secure Code Examples

### Example 1: Token Storage

```swift
// INSECURE — token in UserDefaults (plaintext plist)
UserDefaults.standard.set(authToken, forKey: "auth_token")
let token = UserDefaults.standard.string(forKey: "auth_token")

// SECURE — token in Keychain with strong protection
try KeychainManager.save(
    key: "auth_token",
    data: authToken.data(using: .utf8)!,
    accessibility: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly
)
let tokenData = try KeychainManager.retrieve(key: "auth_token")
```

### Example 2: Network Request

```swift
// INSECURE — HTTP, no pinning, ATS disabled
// Info.plist: NSAllowsArbitraryLoads = YES
let url = URL(string: "http://api.example.com/login")!
URLSession.shared.dataTask(with: url) { data, _, _ in
    // Process response
}

// SECURE — HTTPS, pinned session, ATS enforced
let url = URL(string: "https://api.example.com/login")!
let session = URLSession(
    configuration: .default,
    delegate: PinnedSessionDelegate(),
    delegateQueue: nil
)
session.dataTask(with: url) { data, response, error in
    guard let httpResponse = response as? HTTPURLResponse,
          (200...299).contains(httpResponse.statusCode)
    else { return }
    // Process response
}
```

### Example 3: Biometric Authentication

```swift
// INSECURE — boolean-only check, bypassable via Frida
let context = LAContext()
context.evaluatePolicy(
    .deviceOwnerAuthenticationWithBiometrics,
    localizedReason: "Authenticate"
) { success, error in
    if success {
        self.grantAccess() // Attacker hooks this to always execute
    }
}

// SECURE — biometric gates Keychain key release via Secure Enclave
do {
    let tokenData = try retrieveBiometricProtectedToken(
        account: "session_token"
    )
    // Token only available after successful biometric verification
    // by the Secure Enclave — cannot be bypassed by hooking
    grantAccess(with: tokenData)
} catch {
    handleAuthenticationFailure(error)
}
```

### Example 4: Logging

```swift
// INSECURE — sensitive data in production logs
NSLog("User login: email=\(email), token=\(authToken)")
print("API Response: \(responseBody)")

// SECURE — private redaction, debug-only logging
import os.log

private let logger = Logger(
    subsystem: Bundle.main.bundleIdentifier!,
    category: "auth"
)

logger.info("User login: email=\(email, privacy: .private)")
#if DEBUG
logger.debug("API Response: \(responseBody, privacy: .private)")
#endif
```

### Example 5: Deep Linking

```swift
// INSECURE — custom URL scheme with sensitive data
// myapp://auth?token=eyJhbGciOiJIUzI1NiIs...
func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any]
) -> Bool {
    let token = url.queryParameters["token"]  // Token exposed in URL
    authenticate(with: token)
    return true
}

// SECURE — Universal Links with server-side validation
// https://example.com/auth/callback?code=TEMP_CODE
func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
) -> Bool {
    guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
          let url = userActivity.webpageURL,
          url.host == "example.com"
    else { return false }

    // Exchange temporary code for token server-side (PKCE)
    let code = url.queryParameters["code"]
    exchangeCodeForToken(code, codeVerifier: storedCodeVerifier)
    return true
}
```

---

## References

- OWASP Mobile Top 10 (2024): https://owasp.org/www-project-mobile-top-10/
- OWASP MASVS v2: https://mas.owasp.org/MASVS/
- OWASP MASTG: https://mas.owasp.org/MASTG/
- Apple Platform Security Guide: https://support.apple.com/guide/security/welcome/web
- Apple Developer — App Attest: https://developer.apple.com/documentation/devicecheck
- Apple Developer — Keychain Services: https://developer.apple.com/documentation/security/keychain_services
- Apple Developer — LocalAuthentication: https://developer.apple.com/documentation/localauthentication
- Apple Developer — Certificate Pinning: https://developer.apple.com/news/?id=g9ejcf8y
- Google Project Zero — NSO Zero-Click: https://projectzero.google/2021/12/a-deep-dive-into-nso-zero-click.html
- Citizen Lab — BLASTPASS: https://citizenlab.ca/2023/09/blastpass-nso-group-iphone-zero-click-zero-day-exploit-captured-in-the-wild/
- NowSecure — Keychain Best Practices: https://books.nowsecure.com/secure-mobile-development/en/ios/use-the-keychain-carefully.html
- HackTricks — iOS Pentesting: https://book.hacktricks.xyz/mobile-pentesting/ios-pentesting
- MobSF: https://github.com/MobSF/Mobile-Security-Framework-MobSF
