# Mobile Network Security

> Expertise module for AI agents implementing secure network communication in mobile applications.
> Covers iOS, Android, Flutter, and React Native platforms with defense-in-depth strategies.

---

## 1. Threat Landscape

Mobile applications transmit sensitive data over networks that are inherently hostile. Unlike
desktop applications operating behind corporate firewalls, mobile apps routinely connect through
untrusted public WiFi, cellular networks subject to interception, and compromised network
infrastructure. The attack surface includes every hop between the device and the backend.

### 1.1 Man-in-the-Middle (MITM) on Public WiFi

Public WiFi networks are the most common attack vector for mobile traffic interception. Attackers
deploy evil twin access points -- rogue hotspots mimicking legitimate network names such as
"StarbucksFreeWiFi" or "Airport_Free_WiFi" -- to lure users into connecting. Once connected,
all unencrypted traffic is visible to the attacker.

**Attack flow:**
1. Attacker sets up a rogue access point with a familiar SSID.
2. Victim device auto-connects (many devices rejoin known SSIDs automatically).
3. Attacker runs ARP spoofing to position themselves between the victim and the gateway.
4. All HTTP traffic is captured; HTTPS traffic is targeted via SSL stripping or certificate forgery.

### 1.2 SSL Stripping

SSL stripping downgrades HTTPS connections to HTTP by intercepting the initial HTTP request
before the TLS handshake occurs. Tools like `sslstrip` automate this attack. The attacker proxies
the connection, maintaining HTTPS to the server but serving HTTP to the victim.

**Impact:** Users see no padlock icon but rarely notice on mobile browsers where the address bar
is minimal. Apps using HTTP fallback are silently downgraded.

### 1.3 Certificate Pinning Bypass

Even apps implementing certificate pinning can be compromised on rooted/jailbroken devices.
Attackers use dynamic instrumentation frameworks:

- **Frida**: Injects JavaScript into running processes to hook SSL validation functions.
- **Objection**: Built on Frida, automates SSL pinning bypass with a single command.
- **Xposed Framework**: Android module-based hooking of TrustManager implementations.

Bypass techniques include modifying the app's TrustManager validation logic, replacing pinned
certificates stored in `res/raw/` or `assets/`, and altering or removing pins in Android's
Network Security Configuration XML.

### 1.4 Insecure API Calls

Common API security failures in mobile apps:
- Hardcoded API keys in client code (extractable via reverse engineering).
- Bearer tokens transmitted over HTTP instead of HTTPS.
- API endpoints accepting requests without mutual TLS or token validation.
- Lack of request signing allowing replay attacks.

### 1.5 Data Leakage Through Analytics SDKs

Third-party analytics SDKs are a significant and often overlooked source of data leakage:

- **Glassbox SDK incident**: Airlines, hotels, banks, and carriers used Glassbox for "session
  replays," which recorded user screens including passwords, credit card numbers, and taps
  without disclosure in privacy policies.
- **Baidu Push SDK**: Palo Alto Networks Unit 42 discovered Android apps (Baidu Search Box,
  Baidu Maps -- 6 million US downloads combined) leaking MAC addresses, carrier information,
  and IMSI numbers through the SDK.
- **FTC enforcement (2024)**: The FTC took action against X-Mode and InMarket for SDKs that
  unfairly collected and used personal information obtained through host apps.

**Risk:** SDK network traffic often bypasses the app's own security controls, using separate
TLS configurations or even transmitting data in cleartext.

### 1.6 Real-World Incidents

| Year | Incident | Impact |
|------|----------|--------|
| 2017 | Banking apps (HSBC, NatWest, Co-op, Santander) found vulnerable to MITM due to improper hostname verification despite certificate pinning | Credentials of millions of users at risk |
| 2019 | Glassbox analytics SDK recording user screens in major apps (Air Canada, Expedia, Hotels.com) | Passwords and credit card data exposed |
| 2020 | Baidu SDK data exfiltration in Google Play apps | Device identifiers leaked to third parties |
| 2024 | AT&T breach -- hackers extracted call and messaging metadata for 110M customers | Massive metadata exposure |
| 2024 | FTC enforcement against X-Mode/InMarket SDKs for unauthorized location data collection | Regulatory action, consent requirements |
| 2024 | Multiple banking apps discovered transmitting session tokens over unencrypted WebSocket connections | Session hijacking risk |

---

## 2. Core Security Principles

### 2.1 TLS Everywhere

Every network connection from a mobile app must use TLS 1.2 at minimum, with TLS 1.3 strongly
preferred. There are zero valid exceptions for production apps.

**Non-negotiable rules:**
- No HTTP connections, even for seemingly non-sensitive resources (images, configs).
- No TLS fallback to older versions (SSLv3, TLS 1.0, TLS 1.1 are deprecated).
- Strong cipher suites only: AES-256-GCM, ChaCha20-Poly1305.
- Forward secrecy via ECDHE key exchange.

### 2.2 Certificate Pinning

Certificate pinning restricts which certificates the app trusts, preventing MITM attacks even
when an attacker has installed a rogue CA on the device.

**Pinning strategies (ordered by recommendation):**
1. **SPKI (Subject Public Key Info) pinning** -- Pin the hash of the public key. Survives
   certificate renewal as long as the same key pair is used. Recommended approach.
2. **Certificate pinning** -- Pin the entire leaf certificate. Requires app update on every
   certificate rotation. Brittle but simple.
3. **CA pinning** -- Pin the intermediate or root CA certificate. Broadest trust, least
   protection, but most operationally resilient.

**Best practice:** Pin at least two SPKI hashes (current + backup key) and include the
intermediate CA pin as a fallback. Store pins outside the binary where possible (remote config
with integrity verification).

### 2.3 Certificate Transparency

Certificate Transparency (CT) is a public logging framework that enables detection of
misissued or rogue certificates.

**Platform enforcement status (2024-2025):**
- **Apple (iOS/macOS)**: All publicly trusted TLS certificates must comply with Apple's CT
  policy. Non-compliant certificates cause TLS connection failure. Enforced system-wide.
- **Android**: CT support rolling out in Android 16+. Apps can opt in to CT enforcement for
  all connections or specific domains.
- **Chrome/Firefox**: Chrome requires CT for all certificates. Firefox 135+ (Feb 2025) began
  requiring CT for certificates in Mozilla's Root CA Program.

**Scale:** Over 17 billion certificates have been logged in CT logs. CT was awarded the
Levchin Prize in 2024 for its critical role in internet security.

### 2.4 No Cleartext Traffic

Both iOS and Android provide platform-level mechanisms to block cleartext HTTP:
- **iOS**: App Transport Security (ATS) blocks HTTP by default since iOS 9.
- **Android**: `android:usesCleartextTraffic="false"` in the manifest (default `false` for
  apps targeting API 28+).

**Rule:** Never add ATS exceptions or enable cleartext traffic in production builds.

### 2.5 Secure WebSocket Connections

WebSocket connections must use `wss://` (WebSocket Secure) exclusively. Apply the same TLS
and pinning requirements as HTTPS connections. WebSocket libraries often have separate TLS
configuration that must be explicitly set -- do not assume they inherit the app's HTTP client
settings.

### 2.6 DNS-over-HTTPS (DoH)

Traditional DNS queries are sent in cleartext, enabling DNS spoofing and surveillance.
DNS-over-HTTPS encrypts DNS resolution within HTTPS.

**Implementation considerations for mobile:**
- Use trusted DoH resolvers: Cloudflare (1.1.1.1), Google (8.8.8.8), Quad9 (9.9.9.9).
- DoH adds TLS overhead; use HTTP/2 connection reuse to amortize cost.
- Mobile devices may experience increased battery drain from encryption overhead.
- Enterprise environments may conflict with DoH -- provide configuration options.
- Over 90% of Firefox users in the US use DoH by default as of 2024.

---

## 3. Implementation Patterns

### 3.1 iOS: App Transport Security (ATS) Configuration

ATS is enabled by default. The correct approach is to NOT add exceptions.

**Info.plist -- Production (secure, no exceptions needed):**
```xml
<!-- ATS is enabled by default. No NSAppTransportSecurity key needed. -->
<!-- Adding this key with exceptions WEAKENS security. -->
```

**Info.plist -- If exceptions are absolutely required (e.g., third-party SDK):**
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <!-- Never set NSAllowsArbitraryLoads to true in production -->
    <key>NSExceptionDomains</key>
    <dict>
        <key>legacy-api.example.com</key>
        <dict>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.2</string>
            <key>NSExceptionRequiresForwardSecrecy</key>
            <true/>
        </dict>
    </dict>
</dict>
```

**Critical ATS rules:**
- `NSAllowsArbitraryLoads = true` disables ATS entirely. Apple rejects apps using this
  without justification.
- `NSAllowsLocalNetworking` can be set to `true` for development but must be removed in
  production.
- Each exception domain must have documented justification for App Store review.

### 3.2 Android: Network Security Configuration

**res/xml/network_security_config.xml -- Production:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Block all cleartext traffic -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <!-- Certificate pinning for your API domain -->
    <domain-config>
        <domain includeSubdomains="true">api.example.com</domain>
        <pin-set expiration="2025-06-01">
            <!-- Primary leaf certificate SPKI hash -->
            <pin digest="SHA-256">k1LOS/oeay2ibJkR7mFhHGTCXMxrjKgmbn2OhQBYz9E=</pin>
            <!-- Backup key SPKI hash -->
            <pin digest="SHA-256">VjLZe/p3W/PJnd6lL8JVNBCGQBZynFLdZSTIqcO0SJ8=</pin>
        </pin-set>
    </domain-config>

    <!-- Debug overrides - ONLY for debug builds -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

**AndroidManifest.xml reference:**
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="false"
    ... >
```

**Critical rules:**
- Always set `cleartextTrafficPermitted="false"` in the base config.
- Pin expiration dates should align with certificate rotation schedules.
- Debug overrides with user certificates are acceptable for testing but must be in
  `<debug-overrides>` only (never in `<base-config>`).
- Targeting API level 28+ sets `usesCleartextTraffic` to `false` by default.

### 3.3 Certificate Pinning -- Native Implementations

#### OkHttp (Android/Kotlin)
```kotlin
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient

val certificatePinner = CertificatePinner.Builder()
    .add(
        "api.example.com",
        "sha256/k1LOS/oeay2ibJkR7mFhHGTCXMxrjKgmbn2OhQBYz9E=", // leaf
        "sha256/VjLZe/p3W/PJnd6lL8JVNBCGQBZynFLdZSTIqcO0SJ8="  // backup
    )
    .build()

val client = OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .connectionSpecs(listOf(ConnectionSpec.MODERN_TLS)) // TLS 1.2+ only
    .build()
```

#### URLSession (iOS/Swift)
```swift
import Foundation
import CryptoKit

class PinnedSessionDelegate: NSObject, URLSessionDelegate {
    // SHA-256 hashes of expected SPKI (Subject Public Key Info)
    private let pinnedHashes: Set<String> = [
        "k1LOS/oeay2ibJkR7mFhHGTCXMxrjKgmbn2OhQBYz9E=", // leaf
        "VjLZe/p3W/PJnd6lL8JVNBCGQBZynFLdZSTIqcO0SJ8="  // backup
    ]

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod ==
              NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        // Evaluate server trust
        let policies = [SecPolicyCreateSSL(true, challenge.protectionSpace.host as CFString)]
        SecTrustSetPolicies(serverTrust, policies as CFTypeRef)

        var error: CFError?
        guard SecTrustEvaluateWithError(serverTrust, &error) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        // Extract and verify public key hash
        let certificateCount = SecTrustGetCertificateCount(serverTrust)
        var pinVerified = false

        for i in 0..<certificateCount {
            guard let certificate = SecTrustCopyCertificateChain(serverTrust)
                    .map({ $0 as! [SecCertificate] })?[safe: i],
                  let publicKey = SecCertificateCopyKey(certificate),
                  let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) else {
                continue
            }

            let keyHash = SHA256.hash(data: publicKeyData as Data)
            let hashString = Data(keyHash).base64EncodedString()

            if pinnedHashes.contains(hashString) {
                pinVerified = true
                break
            }
        }

        if pinVerified {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
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

### 3.4 TLS Version Enforcement

#### Android (OkHttp)
```kotlin
val restrictedSpec = ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
    .tlsVersions(TlsVersion.TLS_1_2, TlsVersion.TLS_1_3)
    .cipherSuites(
        CipherSuite.TLS_AES_128_GCM_SHA256,
        CipherSuite.TLS_AES_256_GCM_SHA384,
        CipherSuite.TLS_CHACHA20_POLY1305_SHA256,
        CipherSuite.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
        CipherSuite.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    )
    .build()

val client = OkHttpClient.Builder()
    .connectionSpecs(listOf(restrictedSpec))
    .build()
```

#### iOS (URLSession)
TLS version is controlled via ATS. Programmatic enforcement:
```swift
let config = URLSessionConfiguration.default
config.tlsMinimumSupportedProtocolVersion = .TLSv12
config.tlsMaximumSupportedProtocolVersion = .TLSv13
```

### 3.5 Proxy Detection

Detect if the device is configured to route traffic through a proxy (potential interception):

#### Android (Kotlin)
```kotlin
fun isProxyConfigured(): Boolean {
    val proxyHost = System.getProperty("http.proxyHost")
    val proxyPort = System.getProperty("http.proxyPort")
    return !proxyHost.isNullOrEmpty() && !proxyPort.isNullOrEmpty()
}

fun getWifiProxyInfo(context: Context): Boolean {
    val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE)
        as ConnectivityManager
    val network = connectivityManager.activeNetwork ?: return false
    val linkProperties = connectivityManager.getLinkProperties(network) ?: return false
    return linkProperties.httpProxy != null
}
```

#### iOS (Swift)
```swift
func isProxyConfigured() -> Bool {
    guard let proxySettings = CFNetworkCopySystemProxySettings()?.takeRetainedValue()
            as? [String: Any] else {
        return false
    }
    if let httpProxy = proxySettings["HTTPProxy"] as? String, !httpProxy.isEmpty {
        return true
    }
    if let httpsProxy = proxySettings["HTTPSProxy"] as? String, !httpsProxy.isEmpty {
        return true
    }
    return false
}
```

**Warning:** Proxy detection should be used for risk assessment and telemetry, not as a hard
block. Legitimate users may use VPNs or corporate proxies. Combine with other signals.

### 3.6 VPN Detection

#### Android (Kotlin)
```kotlin
fun isVpnActive(context: Context): Boolean {
    val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE)
        as ConnectivityManager
    val activeNetwork = connectivityManager.activeNetwork ?: return false
    val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return false
    return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
}
```

#### iOS (Swift)
```swift
func isVpnActive() -> Bool {
    guard let proxySettings = CFNetworkCopySystemProxySettings()?.takeRetainedValue()
            as? [String: Any],
          let scoped = proxySettings["__SCOPED__"] as? [String: Any] else {
        return false
    }
    return scoped.keys.contains { key in
        key.contains("tap") || key.contains("tun") || key.contains("ppp") ||
        key.contains("ipsec") || key.contains("utun")
    }
}
```

### 3.7 Network Traffic Monitoring Prevention

To make it harder for attackers to intercept and analyze traffic:

- **Disable debugging in release builds**: Remove all logging of network requests/responses.
- **Obfuscate API endpoints**: Do not store full URLs as string literals.
- **Implement request signing**: HMAC-based request signing prevents tampering.
- **Use binary protocols**: Protocol Buffers or MessagePack instead of JSON reduce readability
  of intercepted traffic (security through obscurity -- supplementary only).
- **Detect Frida/instrumentation**: Check for Frida artifacts on Android (frida-server port
  27042, Frida libraries in `/proc/self/maps`).

---

## 4. Vulnerability Catalog

### V-01: Cleartext HTTP Traffic

**Severity:** Critical
**OWASP:** M5 - Insecure Communication
**Description:** App transmits data over unencrypted HTTP connections.

```kotlin
// INSECURE - cleartext HTTP
val url = "http://api.example.com/login"
val request = Request.Builder().url(url).build()
```

```kotlin
// SECURE - HTTPS only
val url = "https://api.example.com/login"
val request = Request.Builder().url(url).build()
```

**Detection:** Network traffic analysis with mitmproxy or Wireshark. Android lint rule
`UsingHttp`.

### V-02: Disabled Certificate Validation

**Severity:** Critical
**OWASP:** M5 - Insecure Communication
**Description:** App accepts any certificate, including self-signed or expired.

```kotlin
// INSECURE - trusts all certificates (common in debug code left in production)
val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
    override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
    override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
    override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
})
val sslContext = SSLContext.getInstance("TLS")
sslContext.init(null, trustAllCerts, SecureRandom())
```

```kotlin
// SECURE - use system trust manager with certificate pinning
val client = OkHttpClient.Builder()
    .certificatePinner(
        CertificatePinner.Builder()
            .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
            .build()
    )
    .build()
```

### V-03: Weak TLS Versions

**Severity:** High
**Description:** App allows TLS 1.0 or 1.1, which have known vulnerabilities (BEAST, POODLE).

```swift
// INSECURE - allows TLS 1.0
let config = URLSessionConfiguration.default
config.tlsMinimumSupportedProtocolVersion = .TLSv10
```

```swift
// SECURE - TLS 1.2 minimum
let config = URLSessionConfiguration.default
config.tlsMinimumSupportedProtocolVersion = .TLSv12
config.tlsMaximumSupportedProtocolVersion = .TLSv13
```

### V-04: Missing Certificate Pinning

**Severity:** High
**OWASP:** M5 - Insecure Communication
**Description:** App relies solely on the system trust store, which can be compromised by
user-installed CA certificates.

**Impact:** Attackers on the same network can install a proxy CA certificate and intercept
all HTTPS traffic.

**Fix:** Implement SPKI pinning with backup pins (see Section 3.3).

### V-05: MITM via HTTP Proxy

**Severity:** High
**Description:** App does not detect or respond to proxy configurations that could indicate
traffic interception.

**Mitigation:** Implement proxy detection (Section 3.5) and increase security posture when
a proxy is detected (additional token validation, reduced session lifetime).

### V-06: DNS Spoofing

**Severity:** Medium-High
**Description:** DNS queries are sent in cleartext, allowing attackers to redirect the app
to malicious servers.

**Mitigation:** Implement DNS-over-HTTPS (Section 2.6). Validate server identity through
certificate pinning regardless of DNS resolution.

### V-07: Insecure WebSocket Connections

**Severity:** High
**Description:** App uses `ws://` instead of `wss://` for WebSocket connections, or uses
`wss://` without certificate pinning.

```javascript
// INSECURE - unencrypted WebSocket
const ws = new WebSocket('ws://api.example.com/stream');
```

```javascript
// SECURE - encrypted WebSocket
const ws = new WebSocket('wss://api.example.com/stream');
```

**Note:** WebSocket libraries often have separate TLS configuration. Verify that pinning
applies to WebSocket connections, not just HTTP.

### V-08: Analytics SDK Data Leakage

**Severity:** High
**Description:** Third-party analytics SDKs transmit user data (PII, device identifiers,
screen recordings) without adequate encryption or user consent.

**Mitigation:**
- Audit all SDK network traffic before integration.
- Use SDK proxy configurations to route through your security controls.
- Implement data loss prevention rules for outbound traffic.
- Review SDK privacy policies and data handling practices.
- Prefer privacy-focused analytics (Plausible, Matomo) over invasive SDKs.

### V-09: Hardcoded API Keys and Secrets

**Severity:** High
**Description:** API keys, tokens, or secrets embedded in app binary are extractable
through reverse engineering.

```kotlin
// INSECURE - hardcoded API key
val apiKey = "REDACTED_STRIPE_KEY"
```

```kotlin
// SECURE - fetch from secure backend, store in encrypted storage
val apiKey = SecureTokenStore.getApiKey() // Retrieved from server, stored in Keystore
```

### V-10: Missing Hostname Verification

**Severity:** Critical
**Description:** App validates the certificate but does not verify the hostname matches
the certificate's Common Name or Subject Alternative Name.

This was the exact vulnerability found in banking apps for HSBC, NatWest, Co-op, Santander,
and Allied Irish Bank in 2017 -- apps pinned certificates but accepted them for any hostname.

```kotlin
// INSECURE - disabled hostname verification
val client = OkHttpClient.Builder()
    .hostnameVerifier { _, _ -> true }
    .build()
```

```kotlin
// SECURE - default hostname verification (OkHttp does this by default)
val client = OkHttpClient.Builder()
    .build() // Default OkHostnameVerifier is used
```

### V-11: Improper Certificate Rotation Handling

**Severity:** Medium
**Description:** Certificate pinning with a single pin and no backup causes app outage
when the certificate is rotated.

**Mitigation:** Always pin multiple keys (current + backup). Set reasonable pin expiration
dates. Implement graceful degradation with enhanced monitoring when pins expire.

### V-12: Sensitive Data in URL Parameters

**Severity:** Medium
**Description:** Tokens, credentials, or PII passed as URL query parameters are logged in
server access logs, proxy logs, browser history, and referrer headers.

```kotlin
// INSECURE - token in URL
val url = "https://api.example.com/user?token=abc123&ssn=123-45-6789"
```

```kotlin
// SECURE - sensitive data in headers or POST body
val request = Request.Builder()
    .url("https://api.example.com/user")
    .header("Authorization", "Bearer abc123")
    .build()
```

### V-13: Insufficient Network Error Handling

**Severity:** Medium
**Description:** App displays detailed TLS error messages to users, revealing implementation
details. Or worse, falls back to insecure connections on TLS failure.

**Mitigation:** Show generic error messages. Never fall back to HTTP. Log detailed errors
to secure server-side telemetry only.

### V-14: Unprotected Backup Channel Communication

**Severity:** Medium
**Description:** App uses a secondary communication channel (e.g., for crash reporting or
push notifications) that does not have the same security controls as the primary API channel.

**Mitigation:** Apply the same TLS, pinning, and monitoring requirements to all network
channels, including crash reporters, analytics, push registration, and CDN connections.

---

## 5. Security Checklist

Use this checklist during development, code review, and security testing.

### Transport Layer
- [ ] All connections use HTTPS/WSS -- no cleartext HTTP/WS anywhere
- [ ] TLS 1.2 is the minimum version; TLS 1.3 is preferred
- [ ] Only strong cipher suites are enabled (AES-GCM, ChaCha20-Poly1305)
- [ ] Forward secrecy is enforced (ECDHE key exchange)
- [ ] HSTS headers are configured on all API endpoints

### Certificate Security
- [ ] SPKI certificate pinning is implemented for all API domains
- [ ] At least two pins are configured (current + backup key)
- [ ] Pin expiration aligns with certificate rotation schedule
- [ ] Certificate Transparency is enforced where platform supports it
- [ ] Hostname verification is not disabled anywhere in the codebase

### Platform Configuration
- [ ] iOS: ATS is enabled with no `NSAllowsArbitraryLoads` exception
- [ ] Android: `network_security_config.xml` blocks cleartext traffic
- [ ] Android: Debug-only trust anchors are in `<debug-overrides>` only
- [ ] No `TrustAllCerts` or `ALLOW_ALL_HOSTNAME_VERIFIER` in codebase

### Data Protection
- [ ] No sensitive data in URL query parameters
- [ ] API keys and secrets are not hardcoded in the app binary
- [ ] Request/response logging is disabled in release builds
- [ ] Error messages do not reveal implementation details

### Third-Party SDKs
- [ ] All SDK network traffic has been audited with a proxy tool
- [ ] SDKs do not transmit PII without user consent
- [ ] SDK TLS configurations meet the same standards as app code
- [ ] SDK privacy policies are reviewed and compliant

### Monitoring & Detection
- [ ] Proxy detection is implemented with appropriate risk response
- [ ] Certificate pinning failures are reported to server-side telemetry
- [ ] Network anomalies trigger alerts (unexpected endpoints, protocols)

---

## 6. Tools & Automation

### 6.1 Burp Suite (Mobile Testing)

The industry-standard proxy for mobile security testing.

**Setup for mobile testing:**
1. Configure Burp as proxy on the testing machine.
2. Install Burp CA certificate on the mobile device.
3. Configure device WiFi to use Burp proxy.
4. For apps with certificate pinning: use Frida to bypass pinning during testing.

**Key features:**
- Intercept and modify HTTPS traffic in real time.
- Scanner module identifies TLS misconfigurations automatically.
- Repeater for replaying and modifying API requests.
- Intruder for automated parameter fuzzing.
- Extensions: Mobile Assistant for automated device setup.

**Command -- extract Burp CA for Android:**
```bash
# Export DER certificate and convert for Android system trust store
openssl x509 -inform DER -in cacert.der -out cacert.pem
HASH=$(openssl x509 -inform PEM -subject_hash_old -in cacert.pem | head -1)
cp cacert.pem "$HASH.0"
adb push "$HASH.0" /system/etc/security/cacerts/
```

### 6.2 mitmproxy

Open-source TLS-intercepting proxy, scriptable with Python.

```bash
# Start mitmproxy in transparent mode
mitmproxy --mode transparent --showhost

# Dump all requests to a file for analysis
mitmdump -w traffic.flow

# Filter for specific domains
mitmproxy --mode regular --set block_global=false \
  --set upstream_cert=true -k

# Script to detect cleartext credentials
# save as detect_cleartext.py
# mitmdump -s detect_cleartext.py
```

```python
# detect_cleartext.py - mitmproxy addon
from mitmproxy import http

SENSITIVE_KEYS = ["password", "token", "secret", "api_key", "credit_card", "ssn"]

def request(flow: http.HTTPFlow):
    if flow.request.scheme == "http":
        print(f"[ALERT] Cleartext HTTP: {flow.request.url}")

    content = flow.request.get_text()
    for key in SENSITIVE_KEYS:
        if key in content.lower():
            print(f"[ALERT] Sensitive data '{key}' in request to {flow.request.url}")
```

### 6.3 Charles Proxy

GUI-based proxy popular with iOS/macOS developers.

**Mobile testing workflow:**
1. Enable SSL Proxying for target domains (Proxy > SSL Proxying Settings).
2. Install Charles root certificate on device (chls.pro/ssl).
3. Map device proxy to Charles (same WiFi network).
4. Inspect requests, responses, timing, and TLS details.
5. Use Rewrite tool to test security controls (downgrade attacks, header removal).

### 6.4 Wireshark

Network protocol analyzer for deep packet inspection.

**Mobile capture approaches:**
- **Android**: Use `tcpdump` on rooted device, pull pcap file for Wireshark analysis.
- **iOS**: Use `rvictl` to create a virtual interface for a connected iOS device.

```bash
# iOS remote virtual interface capture
rvictl -s <UDID>          # Create virtual interface
tcpdump -i rvi0 -w capture.pcap   # Capture traffic
rvictl -x <UDID>          # Remove interface when done
```

**Wireshark filters for mobile security analysis:**
```
# Find cleartext HTTP traffic
http && !ssl

# Find weak TLS versions
ssl.handshake.version < 0x0303

# Find certificate issues
ssl.alert.message

# Find DNS queries (potential spoofing targets)
dns && dns.flags.response == 0
```

### 6.5 SSL Labs / sslyze

Server-side TLS configuration testing.

```bash
# sslyze - test server TLS configuration
sslyze --regular api.example.com

# Check for specific vulnerabilities
sslyze --heartbleed --openssl_ccs --robot api.example.com

# JSON output for CI/CD integration
sslyze --json_out=results.json api.example.com
```

### 6.6 Frida (Dynamic Instrumentation)

Used both offensively (to test pinning) and defensively (to detect instrumentation).

```bash
# Bypass certificate pinning for testing (Android)
frida -U -f com.example.app -l ssl_pinning_bypass.js --no-pause

# Common Frida script targets:
# - javax.net.ssl.X509TrustManager
# - okhttp3.CertificatePinner
# - com.android.org.conscrypt.TrustManagerImpl
```

### 6.7 Automated CI/CD Security Checks

```yaml
# GitHub Actions - mobile network security checks
- name: Check for cleartext traffic
  run: |
    # Android: Verify network security config
    grep -r "cleartextTrafficPermitted=\"true\"" app/src/main/res/ && exit 1 || true

    # Check for disabled certificate validation
    grep -rn "TrustAllCerts\|ALLOW_ALL\|trustAllCerts\|setHostnameVerifier" \
      app/src/main/java/ && exit 1 || true

    # Check for HTTP URLs (should be HTTPS)
    grep -rn "\"http://" app/src/main/java/ | grep -v "https://" && exit 1 || true
```

---

## 7. Platform-Specific Guidance

### 7.1 iOS

**URLSession with pinning:**
See Section 3.3 for the complete `PinnedSessionDelegate` implementation.

**TrustKit (recommended library):**
```swift
// AppDelegate.swift
import TrustKit

let trustKitConfig: [String: Any] = [
    kTSKSwizzleNetworkDelegates: false,
    kTSKPinnedDomains: [
        "api.example.com": [
            kTSKEnforcePinning: true,
            kTSKIncludeSubdomains: true,
            kTSKPublicKeyHashes: [
                "k1LOS/oeay2ibJkR7mFhHGTCXMxrjKgmbn2OhQBYz9E=",
                "VjLZe/p3W/PJnd6lL8JVNBCGQBZynFLdZSTIqcO0SJ8="
            ],
            kTSKReportUris: ["https://reporting.example.com/pin-failure"]
        ]
    ]
]
TrustKit.initSharedInstance(withConfiguration: trustKitConfig)
```

**Alamofire with server trust evaluation:**
```swift
let evaluators: [String: ServerTrustEvaluating] = [
    "api.example.com": PinnedCertificatesTrustEvaluator(
        certificates: Bundle.main.af.certificates,
        acceptSelfSignedCertificates: false,
        performDefaultValidation: true,
        validateHost: true
    )
]
let manager = ServerTrustManager(evaluators: evaluators)
let session = Session(serverTrustManager: manager)
```

**iOS-specific considerations:**
- ATS handles TLS version enforcement automatically.
- WKWebView inherits ATS settings; UIWebView (deprecated) does not.
- Background URLSession tasks maintain pinning through the delegate.
- Extensions (widgets, notification services) have separate ATS configurations.

### 7.2 Android

**Retrofit + OkHttp with comprehensive security:**
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideCertificatePinner(): CertificatePinner =
        CertificatePinner.Builder()
            .add("api.example.com",
                "sha256/k1LOS/oeay2ibJkR7mFhHGTCXMxrjKgmbn2OhQBYz9E=",
                "sha256/VjLZe/p3W/PJnd6lL8JVNBCGQBZynFLdZSTIqcO0SJ8="
            )
            .build()

    @Provides
    @Singleton
    fun provideOkHttpClient(pinner: CertificatePinner): OkHttpClient =
        OkHttpClient.Builder()
            .certificatePinner(pinner)
            .connectionSpecs(listOf(ConnectionSpec.MODERN_TLS))
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                // Enforce HTTPS
                val request = chain.request()
                require(request.url.scheme == "https") {
                    "Cleartext traffic not allowed: ${request.url}"
                }
                chain.proceed(request)
            }
            .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl("https://api.example.com/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
}
```

**Android-specific considerations:**
- Network Security Config is the preferred declarative approach.
- Apps targeting API 24+ no longer trust user-installed CAs by default.
- Apps targeting API 28+ block cleartext traffic by default.
- Android 16+ supports Certificate Transparency opt-in.
- WorkManager and JobScheduler network requests inherit app-level security config.

### 7.3 Flutter (Dart)

**Using dart:io SecurityContext:**
```dart
import 'dart:io';
import 'package:flutter/services.dart';

class SecureHttpClient {
  static Future<HttpClient> create() async {
    final securityContext = SecurityContext(withTrustedRoots: false);

    // Load pinned certificate from assets
    final certData = await rootBundle.load('assets/certs/api_cert.pem');
    securityContext.setTrustedCertificatesBytes(certData.buffer.asUint8List());

    final client = HttpClient(context: securityContext);

    // Enforce TLS 1.2+
    client.badCertificateCallback = (cert, host, port) => false;

    return client;
  }
}
```

**Using Dio with certificate pinning:**
```dart
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'dart:io';

Dio createSecureDio() {
  final dio = Dio(BaseOptions(
    baseUrl: 'https://api.example.com',
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));

  (dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () {
    final client = HttpClient();

    // Certificate pinning callback
    client.badCertificateCallback = (X509Certificate cert, String host, int port) {
      // Compare certificate fingerprint
      final expectedFingerprint = 'AB:CD:EF:...'; // SHA-256 fingerprint
      return cert.sha256Fingerprint == expectedFingerprint;
    };

    return client;
  };

  return dio;
}
```

**Flutter-specific considerations:**
- Dart's `HttpClient` has its own TLS stack, separate from platform defaults.
- Certificate pinning must be configured in Dart code; platform configs (ATS, NSC) do not
  apply to dart:io connections.
- Use `http_certificate_pinning` or `trustpin_sdk` packages for simplified implementation.
- Pin SPKI hashes from leaf and intermediate certificates.
- Test on both iOS and Android -- TLS behavior may differ across platforms.

### 7.4 React Native

**react-native-ssl-public-key-pinning:**
```typescript
import { fetch as pinnedFetch } from 'react-native-ssl-public-key-pinning';

// Configure pinning at app startup
import { initializeSslPinning } from 'react-native-ssl-public-key-pinning';

await initializeSslPinning({
  'api.example.com': {
    includeSubdomains: true,
    publicKeyHashes: [
      'k1LOS/oeay2ibJkR7mFhHGTCXMxrjKgmbn2OhQBYz9E=',
      'VjLZe/p3W/PJnd6lL8JVNBCGQBZynFLdZSTIqcO0SJ8=',
    ],
  },
});

// Use the pinned fetch instead of global fetch
const response = await pinnedFetch('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
});
```

**react-native-ssl-pinning (OkHttp/AFNetworking based):**
```typescript
import { fetch } from 'react-native-ssl-pinning';

const response = await fetch('https://api.example.com/data', {
  method: 'GET',
  timeoutInterval: 10000,
  sslPinning: {
    certs: ['api_cert'],  // .cer files in android/app/src/main/assets/
  },
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json',
  },
});
```

**React Native-specific considerations:**
- JavaScript `fetch()` does not support certificate pinning natively.
- Native modules bridge pinning to OkHttp (Android) and AFNetworking/TrustKit (iOS).
- Ensure pinning applies to all network libraries used (Axios, Apollo, etc.).
- Debug builds should use a separate configuration that allows proxy certificates.
- Hermes engine does not affect network security but obfuscates JS for reverse engineering.

---

## 8. Incident Patterns

### 8.1 MITM Detection

**Server-side indicators:**
- Sudden changes in client TLS fingerprints (JA3/JA4 hashes) for the same user.
- Requests arriving from unexpected IP ranges or geolocations.
- API calls with inconsistent User-Agent strings vs. device attestation.
- Certificate pinning failure reports from client telemetry.
- Multiple authentication failures from a single IP with different user accounts.

**Client-side indicators:**
- Certificate validation failures (pin mismatch).
- Unexpected proxy configuration detected.
- Network latency anomalies (proxy adds measurable latency).
- DNS resolution returning unexpected IP addresses.

**Detection implementation:**
```kotlin
// Report pinning failures to server
class PinningFailureReporter : CertificatePinner.EventListener {
    fun onPinningFailure(
        hostname: String,
        certificateChain: List<Certificate>,
        expectedPins: List<String>
    ) {
        // Send report via a secondary channel (different domain/pinning config)
        SecurityReportingService.report(
            PinningFailure(
                hostname = hostname,
                actualFingerprint = certificateChain.first().sha256(),
                expectedPins = expectedPins,
                timestamp = System.currentTimeMillis(),
                deviceInfo = DeviceInfo.collect()
            )
        )
    }
}
```

### 8.2 Traffic Interception Response Playbook

1. **Detection**: Pinning failure alert or anomalous traffic pattern identified.
2. **Triage**: Determine if the failure is due to certificate rotation (benign) or interception.
3. **Containment**: If interception confirmed, force re-authentication for affected sessions.
4. **Investigation**: Analyze server logs for the scope of compromised sessions.
5. **Remediation**: Rotate affected API keys/tokens. Issue forced app update if pinning
   configuration needs changing.
6. **Communication**: Notify affected users per incident response policy and regulatory
   requirements.
7. **Post-incident**: Review pinning configuration, add additional detection signals.

### 8.3 Common False Positives

- Corporate proxy/firewall performing TLS inspection (legitimate but triggers pinning failure).
- Antivirus software on the device intercepting TLS (e.g., Kaspersky, Norton).
- CDN or load balancer certificate rotation not reflected in pinning config.
- Development/staging builds accidentally using production pinning config.
- User traveling internationally with captive portal WiFi.

---

## 9. Compliance & Standards

### 9.1 OWASP MASVS-NETWORK

The OWASP Mobile Application Security Verification Standard (MASVS) defines the
MASVS-NETWORK control group for secure network communication (data-in-transit).

**Key requirements:**
- **MASVS-NETWORK-1**: The app secures all network traffic according to current best
  practices. TLS is used for all connections. No cleartext HTTP traffic.
- **MASVS-NETWORK-2**: The app performs identity pinning for its remote endpoints. Certificate
  or public key pinning is implemented and enforced.

**Testing guidance (MASTG):**
- MASTG-TEST-0019: Testing Data Encryption on the Network
- MASTG-TEST-0020: Testing the TLS Settings
- MASTG-TEST-0021: Testing Endpoint Identity Verification
- MASTG-TEST-0022: Testing Custom Certificate Stores and Certificate Pinning

### 9.2 OWASP Mobile Top 10 (2024)

**M5: Insecure Communication** covers:
- Failure to use TLS for all network traffic.
- Use of deprecated TLS versions or weak cipher suites.
- Failure to validate server certificates.
- Missing certificate pinning.
- Cleartext fallback on TLS failure.

This risk was previously ranked M3 in the 2016 list and moved to M5 in the 2024 update,
reflecting improved platform defaults (ATS, NSC) but continued developer misconfigurations.

### 9.3 PCI DSS v4.0.1 (Mobile Requirements)

Released June 2024, PCI DSS v4.0.1 includes specific mobile requirements:

- **Requirement 4**: Protect cardholder data with strong cryptography during transmission
  over open, public networks. TLS 1.2 minimum, TLS 1.3 recommended.
- **Requirement 6**: Develop and maintain secure systems and software. Includes secure coding
  practices, vulnerability management, and code review for mobile apps.
- **Requirement 8**: Identify users and authenticate access. MFA is now mandatory for all
  access to cardholder data.

**Mobile-specific guidance:**
- All payment API calls must use TLS 1.2+ with certificate pinning.
- Tokenization (Stripe, Braintree) or wallet payments (Apple Pay/Google Pay) reduce PCI scope
  by ensuring the app never handles raw card data.
- Network segmentation applies to mobile backend APIs handling cardholder data.

### 9.4 NIST SP 800-163 (Vetting Mobile Applications)

Provides guidelines for vetting the security of mobile applications, including:
- Network communication analysis.
- TLS implementation verification.
- Data leakage assessment through network channels.

### 9.5 CISA Encrypted DNS Implementation Guidance (2024)

CISA published guidance on encrypted DNS (DoH/DoT) implementation in May 2024, recommending:
- Organizations evaluate encrypted DNS for mobile fleet management.
- Balance between privacy (DoH) and network visibility (enterprise monitoring).
- Use trusted resolvers with DNSSEC validation.

---

## 10. Code Examples

### 10.1 Complete Certificate Pinning -- Swift (iOS)

```swift
import Foundation
import CryptoKit

/// Production-ready certificate pinning delegate for URLSession.
/// Pins SPKI hashes to prevent MITM even with compromised CAs.
final class SecureNetworkDelegate: NSObject, URLSessionDelegate {

    struct PinConfiguration {
        let domain: String
        let spkiHashes: Set<String>  // Base64-encoded SHA-256 of SPKI
        let includeSubdomains: Bool
        let reportURI: URL?
    }

    private let pins: [PinConfiguration]

    init(pins: [PinConfiguration]) {
        self.pins = pins
        super.init()
    }

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod ==
              NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let host = challenge.protectionSpace.host

        // Find matching pin configuration
        guard let pinConfig = pins.first(where: { config in
            if config.includeSubdomains {
                return host == config.domain || host.hasSuffix(".\(config.domain)")
            }
            return host == config.domain
        }) else {
            // No pin configured for this domain -- use default validation
            completionHandler(.performDefaultHandling, nil)
            return
        }

        // Perform standard trust evaluation first
        let policy = SecPolicyCreateSSL(true, host as CFString)
        SecTrustSetPolicies(serverTrust, policy)

        var error: CFError?
        guard SecTrustEvaluateWithError(serverTrust, &error) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        // Verify SPKI hash against pins
        guard let certChain = SecTrustCopyCertificateChain(serverTrust) as? [SecCertificate] else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        for cert in certChain {
            if let publicKey = SecCertificateCopyKey(cert),
               let keyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? {
                let hash = SHA256.hash(data: keyData)
                let hashString = Data(hash).base64EncodedString()

                if pinConfig.spkiHashes.contains(hashString) {
                    completionHandler(.useCredential, URLCredential(trust: serverTrust))
                    return
                }
            }
        }

        // Pin verification failed -- report and reject
        reportPinningFailure(host: host, reportURI: pinConfig.reportURI)
        completionHandler(.cancelAuthenticationChallenge, nil)
    }

    private func reportPinningFailure(host: String, reportURI: URL?) {
        guard let reportURI = reportURI else { return }
        // Send failure report via a separate, independently pinned channel
        let report: [String: Any] = [
            "hostname": host,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] ?? ""
        ]
        // Fire-and-forget report (use a separate URLSession without pinning to this domain)
        var request = URLRequest(url: reportURI)
        request.httpMethod = "POST"
        request.httpBody = try? JSONSerialization.data(withJSONObject: report)
        URLSession.shared.dataTask(with: request).resume()
    }
}
```

### 10.2 Complete Certificate Pinning -- Kotlin (Android)

```kotlin
import okhttp3.*
import java.security.MessageDigest
import java.security.cert.X509Certificate
import javax.net.ssl.*

/**
 * Production-ready OkHttp client with certificate pinning,
 * TLS enforcement, and security monitoring.
 */
object SecureNetworkClient {

    private val PINS = mapOf(
        "api.example.com" to listOf(
            "sha256/k1LOS/oeay2ibJkR7mFhHGTCXMxrjKgmbn2OhQBYz9E=",
            "sha256/VjLZe/p3W/PJnd6lL8JVNBCGQBZynFLdZSTIqcO0SJ8="
        )
    )

    fun create(): OkHttpClient {
        val pinnerBuilder = CertificatePinner.Builder()
        PINS.forEach { (domain, pins) ->
            pinnerBuilder.add(domain, *pins.toTypedArray())
        }

        return OkHttpClient.Builder()
            .certificatePinner(pinnerBuilder.build())
            .connectionSpecs(listOf(
                ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
                    .tlsVersions(TlsVersion.TLS_1_2, TlsVersion.TLS_1_3)
                    .cipherSuites(
                        CipherSuite.TLS_AES_128_GCM_SHA256,
                        CipherSuite.TLS_AES_256_GCM_SHA384,
                        CipherSuite.TLS_CHACHA20_POLY1305_SHA256,
                        CipherSuite.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
                        CipherSuite.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
                    )
                    .build()
            ))
            .addInterceptor(HttpsEnforcementInterceptor())
            .addInterceptor(SecurityHeaderInterceptor())
            .build()
    }

    /** Rejects any non-HTTPS request at the interceptor level. */
    private class HttpsEnforcementInterceptor : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val request = chain.request()
            check(request.url.scheme == "https") {
                "SECURITY: Cleartext HTTP request blocked: ${request.url}"
            }
            return chain.proceed(request)
        }
    }

    /** Adds security headers to all outgoing requests. */
    private class SecurityHeaderInterceptor : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val request = chain.request().newBuilder()
                .header("X-Content-Type-Options", "nosniff")
                .header("X-Request-Id", java.util.UUID.randomUUID().toString())
                .build()
            return chain.proceed(request)
        }
    }
}
```

### 10.3 Complete Certificate Pinning -- Dart (Flutter)

```dart
import 'dart:io';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:crypto/crypto.dart';

/// Production-ready HTTP client with SPKI certificate pinning for Flutter.
class SecureApiClient {
  static const _pinnedHashes = {
    'api.example.com': [
      'k1LOS/oeay2ibJkR7mFhHGTCXMxrjKgmbn2OhQBYz9E=', // current
      'VjLZe/p3W/PJnd6lL8JVNBCGQBZynFLdZSTIqcO0SJ8=', // backup
    ],
  };

  late final HttpClient _client;

  Future<void> initialize() async {
    final context = SecurityContext(withTrustedRoots: true);

    _client = HttpClient(context: context)
      ..badCertificateCallback = _validateCertificate;
  }

  bool _validateCertificate(X509Certificate cert, String host, int port) {
    // Reject any certificate not matching our pins
    final domainPins = _pinnedHashes[host];
    if (domainPins == null) return false;

    final certBytes = cert.der;
    final digest = sha256.convert(certBytes);
    final hashString = base64.encode(digest.bytes);

    return domainPins.contains(hashString);
  }

  Future<Map<String, dynamic>> get(String path) async {
    final uri = Uri.https('api.example.com', path);
    final request = await _client.getUrl(uri);
    request.headers.set('Accept', 'application/json');

    final response = await request.close();
    final body = await response.transform(utf8.decoder).join();
    return jsonDecode(body) as Map<String, dynamic>;
  }

  void dispose() {
    _client.close();
  }
}
```

### 10.4 Network Security Config -- Complete XML (Android)

```xml
<?xml version="1.0" encoding="utf-8"?>
<!--
  Production network security configuration.
  Enforces HTTPS, certificate pinning, and CT compliance.
  Reference: https://developer.android.com/privacy-and-security/security-config
-->
<network-security-config>

    <!-- Global: block all cleartext traffic -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <!-- Primary API domain with certificate pinning -->
    <domain-config>
        <domain includeSubdomains="true">api.example.com</domain>
        <pin-set expiration="2025-12-31">
            <pin digest="SHA-256">k1LOS/oeay2ibJkR7mFhHGTCXMxrjKgmbn2OhQBYz9E=</pin>
            <pin digest="SHA-256">VjLZe/p3W/PJnd6lL8JVNBCGQBZynFLdZSTIqcO0SJ8=</pin>
        </pin-set>
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </domain-config>

    <!-- CDN domain (pinning optional but cleartext still blocked) -->
    <domain-config>
        <domain includeSubdomains="true">cdn.example.com</domain>
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </domain-config>

    <!-- Debug overrides: allow user-installed CAs for proxy testing -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" />
            <certificates src="system" />
        </trust-anchors>
    </debug-overrides>

</network-security-config>
```

### 10.5 Insecure vs. Secure Comparison Table

| Pattern | Insecure | Secure |
|---------|----------|--------|
| Protocol | `http://api.example.com` | `https://api.example.com` |
| TLS version | `TLSv10`, `TLSv11` | `TLSv12`, `TLSv13` |
| Cert validation | `trustAllCerts`, `ALLOW_ALL` | System trust + SPKI pinning |
| Hostname check | `hostnameVerifier { _, _ -> true }` | Default OkHostnameVerifier |
| API keys | Hardcoded in source | Fetched from server, stored in Keystore/Keychain |
| Sensitive params | In URL query string | In Authorization header or POST body |
| WebSocket | `ws://` | `wss://` with pinning |
| DNS | System resolver (cleartext) | DNS-over-HTTPS |
| Error handling | Show TLS errors to user | Generic message, server-side logging |
| Debug code | `if (DEBUG) trustAll()` left in release | Build-variant configs, no debug code in release |

---

## References

- [OWASP Mobile Top 10 (2024)](https://owasp.org/www-project-mobile-top-10/)
- [OWASP MASVS - Network Requirements](https://mas.owasp.org/MASVS/)
- [OWASP MASTG - Certificate Pinning](https://mas.owasp.org/MASTG/knowledge/android/MASVS-NETWORK/MASTG-KNOW-0015/)
- [OWASP MASTG - Bypassing Certificate Pinning](https://mas.owasp.org/MASTG/techniques/android/MASTG-TECH-0012/)
- [Android Network Security Configuration](https://developer.android.com/privacy-and-security/security-config)
- [Android Certificate Transparency Policy](https://developer.android.com/privacy-and-security/certificate-transparency-policy)
- [Apple App Transport Security](https://developer.apple.com/news/?id=jxky8h89)
- [Apple Certificate Transparency Policy](https://support.apple.com/en-us/103214)
- [Apple Identity Pinning Guide](https://developer.apple.com/news/?id=g9ejcf8y)
- [OkHttp HTTPS Configuration](https://square.github.io/okhttp/features/https/)
- [PCI DSS v4.0.1 Requirements](https://www.pcisecuritystandards.org/)
- [CISA Encrypted DNS Implementation Guidance (2024)](https://www.cisa.gov/sites/default/files/2024-05/Encrypted%20DNS%20Implementation%20Guidance_508c.pdf)
- [Zimperium - Mobile App Data Leakage Research](https://zimperium.com/blog/your-apps-are-leaking-the-hidden-data-risks-on-your-phone)
- [NowSecure - Top Mobile App Security Breaches](https://www.nowsecure.com/)
- [8kSec - SSL Pinning in Mobile Apps (2025)](https://8ksec.io/why-you-should-remove-ssl-pinning-from-your-mobile-apps-in-2025/)
- [Verizon 2025 Data Breach Investigations Report](https://www.verizon.com/business/resources/reports/dbir/)
- [Banking Apps MITM Vulnerability (Threatpost)](https://threatpost.com/banking-apps-found-vulnerable-to-mitm-attacks/129105/)
- [Unit 42 - Android Apps Data Leakage](https://unit42.paloaltonetworks.com/android-apps-data-leakage/)
