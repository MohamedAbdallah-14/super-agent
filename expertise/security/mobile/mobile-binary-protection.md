# Mobile Binary Protection

> Expertise module for AI agents protecting mobile app binaries from reverse engineering,
> tampering, and runtime exploitation. Covers Android and iOS platforms, cross-platform
> frameworks, and defense-in-depth strategies aligned with OWASP MASVS-RESILIENCE.

---

## 1. Threat Landscape

### 1.1 The Attack Surface

Mobile binaries ship to devices the attacker fully controls. Unlike server-side code,
every instruction, string literal, and resource is available for offline analysis with
unlimited time. The attack surface includes:

- **Static analysis** -- Decompiling APK (apktool, jadx, JADX-GUI) or IPA (Hopper,
  class-dump, otool) to read source-equivalent code.
- **Dynamic analysis** -- Attaching debuggers (lldb, gdb, IDA Pro) or instrumentation
  frameworks (Frida, Xposed, Cydia Substrate) at runtime.
- **Repackaging** -- Decompiling, modifying, re-signing, and redistributing tampered
  binaries through unofficial channels.
- **Hooking** -- Intercepting function calls at runtime to alter behavior, bypass
  security checks, or steal credentials (Frida, Xposed Framework, Substrate).
- **Credential extraction** -- Harvesting API keys, tokens, certificates, and secrets
  embedded in the binary or its resources.
- **Piracy and cloning** -- Removing license checks, DRM, or in-app purchase
  verification to distribute free copies.

### 1.2 Real-World Incidents

**GoldFactory Campaign (2024):** Targeted Southeast Asian users with modified banking
apps. Attackers decompiled legitimate banking applications, embedded trojans and
backdoors, and redistributed poisoned versions through phishing campaigns and counterfeit
Play Store websites. Over 11,000 infections were confirmed.
Source: Promon App Threat Report 2024.

**Snowblind Banking Trojan (2024):** Discovered in Southeast Asia, Snowblind exploited
the Linux kernel's seccomp (secure computing) feature to hook into an app's
anti-repackaging checks and redirect them away from tampered code. This allowed attackers
to repackage banking apps while neutralizing existing integrity verification.
Source: Promon mobile malware report 2025.

**FjordPhantom (2024):** Used virtualization to install a repackaged banking app
alongside the legitimate version on the same device. A virtualized layer between them
redirected anti-tampering checks so neither app detected the other, enabling credential
theft and transaction manipulation.
Source: Promon mobile malware report 2025.

**NGate NFC Relay Attack (Nov 2023 -- Mar 2024):** Targeted customers of three major
Czech banks. Attackers distributed phishing SMS messages linking to fake banking apps
that contained the open-source NFCGate tool. The malicious app relayed NFC payment card
data from victims' Android devices to attacker-controlled devices, enabling contactless
payment fraud.
Source: The Hacker News, August 2024.

**Chameleon Android Banking Trojan (2024):** New campaigns identified by ThreatFabric
targeted Canadian hospitality workers using a disguised CRM app. The trojan harvested
banking credentials through overlay attacks after bypassing Android 13 restricted
settings.
Source: ThreatFabric research, July 2024.

**Frida Hooking Detection Gap:** Promon's 2024 report tested 144 popular Android apps
and found that only 3 (roughly 2%) responded appropriately to Frida's presence. The
remaining 98% of top-tier apps had zero detection of unmodified Frida instrumentation.
Source: Promon App Threat Report 2024.

### 1.3 Attacker Toolchain

| Tool | Platform | Purpose |
|------|----------|---------|
| apktool | Android | APK decompilation/recompilation |
| jadx / JADX-GUI | Android | DEX to Java decompilation |
| Frida | Both | Dynamic instrumentation and hooking |
| Xposed Framework | Android | Runtime method hooking |
| Cydia Substrate | iOS | Runtime method swizzling |
| Hopper Disassembler | iOS | ARM binary disassembly |
| class-dump | iOS | ObjC class/method extraction |
| IDA Pro | Both | Professional disassembly/debugging |
| Ghidra | Both | NSA open-source reverse engineering |
| objection | Both | Frida-powered runtime exploration |
| MobSF | Both | Automated static/dynamic analysis |
| Liberty Lite / FlyJB | iOS | Jailbreak detection bypass |
| Magisk Hide / Zygisk | Android | Root detection bypass |

---

## 2. Core Security Principles

### 2.1 Defense in Depth

No single protection mechanism survives a determined attacker. Effective binary
protection layers multiple independent defenses:

```
Layer 1: Code Obfuscation        -- Raises static analysis cost
Layer 2: String/Resource Encryption -- Hides secrets from strings output
Layer 3: Integrity Verification   -- Detects binary modification
Layer 4: Anti-Debug / Anti-Hook   -- Blocks dynamic analysis
Layer 5: Environment Checks       -- Detects root/jailbreak/emulator
Layer 6: Server-Side Validation   -- Never trust client-only checks
Layer 7: RASP                     -- Runtime behavioral monitoring
```

Each layer increases the attacker's required skill level, time investment, and tooling
cost. The goal is not perfect protection (impossible on client devices) but raising the
cost of attack above the value of the target.

### 2.2 Code Signing and Binary Integrity

**iOS:** Apple enforces mandatory code signing. Every binary must be signed with a valid
Apple Developer certificate. The system verifies the signature at install time and
periodically at runtime. Modifying any signed binary invalidates the signature.

**Android:** APK Signature Scheme v2/v3/v4 covers the entire APK file. Google Play App
Signing manages keys server-side. Signature verification occurs at install time but NOT
at runtime by default -- apps must implement their own runtime signature checks.

### 2.3 The Client Trust Problem

All client-side protections share a fundamental limitation: they run on a device the
attacker controls. Therefore:

- Never rely solely on client-side checks for security-critical decisions.
- Always validate critical operations server-side.
- Treat client-side protections as cost-raisers, not guarantees.
- Use attestation APIs (Play Integrity, App Attest) to shift trust anchors to the
  platform vendor.

### 2.4 Anti-Tampering Philosophy

Effective anti-tampering follows three principles:

1. **Detect** -- Identify that tampering, hooking, or analysis is occurring.
2. **React** -- Respond appropriately (crash, degrade, report, wipe sensitive data).
3. **Scatter** -- Distribute detection checks throughout the codebase so removing one
   check does not disable all protection.

---

## 3. Implementation Patterns

### 3.1 iOS Protection Techniques

#### Code Signing and Entitlements

iOS code signing is enforced by the kernel. Key implementation points:

- Use **Hardened Runtime** with only necessary entitlements.
- Enable **App Attest** (DeviceCheck framework) to cryptographically prove binary
  integrity to your server.
- Strip **debug symbols** from release builds (STRIP_INSTALLED_PRODUCT = YES).
- Disable **Bitcode** submission if not needed (deprecated as of Xcode 14).

#### Anti-Debug Protection

```swift
// Deny debugger attachment via ptrace
import Foundation

func denyDebugger() {
    let PT_DENY_ATTACH: CInt = 31
    let handle = dlopen("/usr/lib/libc.dylib", RTLD_NOW)
    typealias PtraceType = @convention(c) (CInt, pid_t, CInt, CInt) -> CInt
    let ptracePtr = dlsym(handle, "ptrace")
    let ptrace = unsafeBitCast(ptracePtr, to: PtraceType.self)
    let _ = ptrace(PT_DENY_ATTACH, 0, 0, 0)
    dlclose(handle)
}
```

#### Jailbreak Detection (Swift)

```swift
import Foundation
import UIKit

struct JailbreakDetector {

    static func isJailbroken() -> Bool {
        return checkSuspiciousFiles()
            || checkSuspiciousURLSchemes()
            || checkWriteAccess()
            || checkFork()
            || checkDylibs()
    }

    // Check for known jailbreak artifacts
    private static func checkSuspiciousFiles() -> Bool {
        let paths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/usr/bin/ssh",
            "/private/var/lib/apt/",
            "/private/var/lib/cydia",
            "/private/var/stash",
            "/usr/libexec/sftp-server",
            "/var/cache/apt",
            "/var/lib/cydia",
            "/usr/sbin/frida-server",
            "/usr/bin/cycript",
            "/usr/local/bin/cycript",
            "/usr/lib/libcycript.dylib"
        ]
        return paths.contains { FileManager.default.fileExists(atPath: $0) }
    }

    // Check if Cydia URL scheme is registered
    private static func checkSuspiciousURLSchemes() -> Bool {
        let schemes = ["cydia://", "sileo://", "zbra://", "undecimus://"]
        return schemes.contains { scheme in
            guard let url = URL(string: scheme) else { return false }
            return UIApplication.shared.canOpenURL(url)
        }
    }

    // Attempt to write outside the sandbox
    private static func checkWriteAccess() -> Bool {
        let testPath = "/private/jailbreak_test_\(UUID().uuidString)"
        do {
            try "test".write(toFile: testPath, atomically: true, encoding: .utf8)
            try FileManager.default.removeItem(atPath: testPath)
            return true // Write succeeded = jailbroken
        } catch {
            return false
        }
    }

    // Sandbox denies fork() on non-jailbroken devices
    private static func checkFork() -> Bool {
        let pid = fork()
        if pid >= 0 {
            if pid > 0 { kill(pid, SIGTERM) }
            return true
        }
        return false
    }

    // Check for suspicious loaded dylibs (Frida, Substrate, etc.)
    private static func checkDylibs() -> Bool {
        let suspiciousLibs = [
            "FridaGadget", "frida-agent", "libcycript",
            "MobileSubstrate", "SubstrateLoader",
            "SSLKillSwitch", "SSLKillSwitch2"
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

#### App Attest Integration

```swift
import DeviceCheck

func attestKey(challenge: Data) async throws -> Data {
    let service = DCAppAttestService.shared
    guard service.isSupported else {
        throw AttestError.notSupported
    }
    let keyId = try await service.generateKey()
    let attestation = try await service.attestKey(keyId, clientDataHash: challenge)
    // Send attestation + keyId to your server for verification
    return attestation
}
```

### 3.2 Android Protection Techniques

#### ProGuard/R8 Configuration

R8 is the default code shrinker and obfuscator since Android Gradle Plugin 3.4.
ProGuard is deprecated. Key configuration:

```groovy
// build.gradle.kts (app module)
android {
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

**Critical ProGuard/R8 Rules:**

```proguard
# proguard-rules.pro

# Move all obfuscated classes into a single flat package
-repackageclasses

# Keep data models used with Gson/Moshi/Retrofit
-keep class com.example.app.data.model.** { *; }

# Keep Retrofit interfaces
-keep,allowobfuscation interface com.example.app.api.** { *; }

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# Never use these in release builds:
# -dontoptimize    (disables all R8 optimizations)
# -dontobfuscate   (disables renaming entirely)
```

**Important:** Starting with Android Gradle Plugin 9.0, the legacy `proguard-android.txt`
is no longer supported. Always use `proguard-android-optimize.txt`.

#### Root Detection (Kotlin)

```kotlin
object RootDetector {

    fun isRooted(): Boolean {
        return checkBuildTags()
            || checkSuBinary()
            || checkRootApps()
            || checkDangerousProps()
            || checkRWSystem()
    }

    // Test-keys in build tags indicate non-release firmware
    private fun checkBuildTags(): Boolean {
        return android.os.Build.TAGS?.contains("test-keys") == true
    }

    // Check for su binary in common locations
    private fun checkSuBinary(): Boolean {
        val paths = arrayOf(
            "/system/bin/su", "/system/xbin/su",
            "/sbin/su", "/data/local/xbin/su",
            "/data/local/bin/su", "/system/sd/xbin/su",
            "/system/bin/failsafe/su", "/data/local/su",
            "/su/bin/su", "/system/app/Superuser.apk",
            "/system/app/SuperSU.apk",
            "/data/adb/modules"  // Magisk modules directory
        )
        return paths.any { java.io.File(it).exists() }
    }

    // Check for known root management apps
    private fun checkRootApps(): Boolean {
        val packages = arrayOf(
            "com.topjohnwu.magisk",         // Magisk Manager
            "eu.chainfire.supersu",          // SuperSU
            "com.koushikdutta.superuser",    // Superuser
            "com.thirdparty.superuser",
            "com.noshufou.android.su",
            "com.yellowes.su",
            "com.kingroot.kinguser",
            "com.kingo.root"
        )
        val pm = Runtime.getRuntime()
        return packages.any { pkg ->
            try {
                pm.exec(arrayOf("pm", "list", "packages", pkg))
                    .inputStream.bufferedReader().readLine() != null
            } catch (e: Exception) { false }
        }
    }

    // Check dangerous system properties
    private fun checkDangerousProps(): Boolean {
        return try {
            val process = Runtime.getRuntime()
                .exec(arrayOf("getprop", "ro.debuggable"))
            val value = process.inputStream.bufferedReader().readLine()
            value?.trim() == "1"
        } catch (e: Exception) { false }
    }

    // Check if /system is mounted read-write
    private fun checkRWSystem(): Boolean {
        return try {
            val mounts = java.io.File("/proc/mounts").readText()
            mounts.lines().any { line ->
                line.contains("/system") && line.contains("rw,")
            }
        } catch (e: Exception) { false }
    }
}
```

#### Play Integrity API

Google's Play Integrity API (replacement for SafetyNet, fully transitioned May 2025)
provides device and app integrity attestation:

```kotlin
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest

suspend fun requestIntegrityToken(nonce: String): String {
    val integrityManager = IntegrityManagerFactory.create(applicationContext)
    val request = IntegrityTokenRequest.builder()
        .setNonce(nonce)       // Server-generated, one-time use
        .setCloudProjectNumber(PROJECT_NUMBER)
        .build()
    val response = integrityManager.requestIntegrityToken(request).await()
    return response.token()    // Send to YOUR server for verification
}

// Server-side: Decode and verify the token. Key verdicts:
// - MEETS_DEVICE_INTEGRITY: Genuine Android device
// - MEETS_BASIC_INTEGRITY: May be rooted but passes basic checks
// - MEETS_STRONG_INTEGRITY: Hardware-backed, recent security patch
// - App licensing verdict: Installed from Play Store
```

**Key change (May 2025):** Hardware-backed security signals are now required for
MEETS_STRONG_INTEGRITY. Devices running Android 13+ must have a security update from
the last 12 months to receive this verdict.

#### Emulator Detection

```kotlin
object EmulatorDetector {
    fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.startsWith("unknown")
            || Build.MODEL.contains("google_sdk")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for x86")
            || Build.MANUFACTURER.contains("Genymotion")
            || Build.BRAND.startsWith("generic")
                && Build.DEVICE.startsWith("generic")
            || "google_sdk" == Build.PRODUCT
            || Build.HARDWARE.contains("goldfish")
            || Build.HARDWARE.contains("ranchu"))
    }
}
```

#### Debugger Detection (Android)

```kotlin
object DebugDetector {
    fun isDebugged(): Boolean {
        return android.os.Debug.isDebuggerConnected()
            || android.os.Debug.waitingForDebugger()
            || isTracerPidSet()
            || isDebuggableBuild()
    }

    // /proc/self/status TracerPid != 0 means a debugger is attached
    private fun isTracerPidSet(): Boolean {
        return try {
            val status = java.io.File("/proc/self/status").readText()
            val tracerLine = status.lines()
                .find { it.startsWith("TracerPid:") }
            val pid = tracerLine?.split(":")?.get(1)?.trim()?.toIntOrNull() ?: 0
            pid != 0
        } catch (e: Exception) { false }
    }

    private fun isDebuggableBuild(): Boolean {
        return (applicationContext.applicationInfo.flags
            and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
    }
}
```

#### Frida Detection (Android)

```kotlin
object FridaDetector {

    fun isFridaPresent(): Boolean {
        return checkFridaPort()
            || checkFridaProcesses()
            || checkFridaLibraries()
            || checkFridaNamedPipes()
    }

    // Frida default port is 27042
    private fun checkFridaPort(): Boolean {
        return try {
            val socket = java.net.Socket()
            socket.connect(java.net.InetSocketAddress("127.0.0.1", 27042), 100)
            socket.close()
            true
        } catch (e: Exception) { false }
    }

    // Check /proc for frida-server process
    private fun checkFridaProcesses(): Boolean {
        return try {
            val process = Runtime.getRuntime().exec(arrayOf("ps", "-A"))
            val output = process.inputStream.bufferedReader().readText()
            output.contains("frida") || output.contains("gum-js-loop")
        } catch (e: Exception) { false }
    }

    // Check loaded libraries for Frida artifacts
    private fun checkFridaLibraries(): Boolean {
        return try {
            val maps = java.io.File("/proc/self/maps").readText()
            maps.contains("frida") || maps.contains("gadget")
        } catch (e: Exception) { false }
    }

    // Frida uses named pipes like linjector
    private fun checkFridaNamedPipes(): Boolean {
        val pipeDir = java.io.File("/proc/self/fd")
        return pipeDir.listFiles()?.any { fd ->
            try {
                val link = java.nio.file.Files.readSymbolicLink(fd.toPath())
                link.toString().contains("linjector")
            } catch (e: Exception) { false }
        } ?: false
    }
}
```

### 3.3 Native Code for Sensitive Logic (NDK)

Move critical security checks to native C/C++ code compiled with the NDK. Native code
is harder to decompile than Java/Kotlin bytecode:

```c
// native-lib.c
#include <jni.h>
#include <string.h>
#include <sys/ptrace.h>
#include <unistd.h>

// Anti-debug: call ptrace on self to prevent debugger attachment
JNIEXPORT jboolean JNICALL
Java_com_example_app_Security_isDebuggerAttached(JNIEnv *env, jobject obj) {
    if (ptrace(PTRACE_TRACEME, 0, NULL, NULL) == -1) {
        return JNI_TRUE;  // Already being traced
    }
    return JNI_FALSE;
}

// Verify APK signature at native level
JNIEXPORT jboolean JNICALL
Java_com_example_app_Security_verifySignature(
    JNIEnv *env, jobject obj, jbyteArray signature) {

    // Expected SHA-256 of release signing certificate
    const unsigned char expected[] = {
        0xAB, 0xCD, 0xEF, /* ... your cert hash ... */
    };

    jbyte *sig = (*env)->GetByteArrayElements(env, signature, NULL);
    jsize len = (*env)->GetArrayLength(env, signature);

    jboolean valid = (len == sizeof(expected)
        && memcmp(sig, expected, len) == 0) ? JNI_TRUE : JNI_FALSE;

    (*env)->ReleaseByteArrayElements(env, signature, sig, 0);
    return valid;
}
```

---

## 4. Vulnerability Catalog

### VULN-01: Hardcoded Secrets in Binary

**Risk:** Critical. API keys, tokens, and credentials compiled into the binary are
trivially extractable with `strings`, jadx, or Hopper.

```java
// VULNERABLE: Secret visible in decompiled code
public class ApiClient {
    private static final String API_KEY = "sk-live-a1b2c3d4e5f6";
    private static final String DB_PASSWORD = "SuperSecret123!";
}
```

```kotlin
// SECURE: Fetch secrets from server after authentication
class ApiClient(private val tokenProvider: TokenProvider) {
    suspend fun getApiKey(): String {
        return tokenProvider.fetchSecureToken(scope = "api-access")
    }
}
```

### VULN-02: No Code Obfuscation

**Risk:** High. Unobfuscated Java/Kotlin code decompiles to near-original source,
exposing business logic, algorithms, and security mechanisms.

```groovy
// VULNERABLE: Obfuscation disabled
android {
    buildTypes {
        release {
            isMinifyEnabled = false  // No shrinking or obfuscation
        }
    }
}
```

```groovy
// SECURE: Full R8 optimization enabled
android {
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

### VULN-03: Debuggable Release Build

**Risk:** Critical. A debuggable flag allows any user to attach a debugger, inspect
memory, and step through code.

```xml
<!-- VULNERABLE: AndroidManifest.xml -->
<application android:debuggable="true" ... >
```

```xml
<!-- SECURE: Never set debuggable in manifest; let build system handle it -->
<!-- build.gradle sets debuggable=false for release automatically -->
<application ... >
```

### VULN-04: Missing Runtime Integrity Checks

**Risk:** High. Without runtime verification, a repackaged app runs identically to the
original, enabling trojanized distribution.

### VULN-05: Exposed Debug Symbols

**Risk:** Medium. Debug symbols (DWARF, .dSYM) shipped in production binaries give
attackers a roadmap of every function name and variable.

- **iOS:** Ensure STRIP_INSTALLED_PRODUCT = YES and DEPLOYMENT_POSTPROCESSING = YES.
- **Android:** Ensure native libraries are stripped (default with release NDK builds).

### VULN-06: Unprotected Native Libraries

**Risk:** High. Shared libraries (.so files) shipped without symbol stripping or
integrity checks can be replaced or patched.

### VULN-07: Insecure Logging in Production

**Risk:** Medium. Verbose logging (Log.d, NSLog) in production reveals internal state,
API endpoints, tokens, and error details to any user with adb logcat or Console.app.

```kotlin
// VULNERABLE
Log.d("AUTH", "Token: $accessToken, User: $userId")
```

```kotlin
// SECURE: Use BuildConfig to gate logging; R8 strips Log calls via
// -assumenosideeffects rule
if (BuildConfig.DEBUG) {
    Log.d("AUTH", "Authentication flow started")
}
```

### VULN-08: No Certificate Pinning

**Risk:** High. Without certificate pinning, attackers with a proxy (mitmproxy, Charles)
can intercept all HTTPS traffic by installing a custom CA.

### VULN-09: Client-Only License Verification

**Risk:** Critical. License checks performed entirely on-device can be bypassed by
patching a single conditional branch.

### VULN-10: Unencrypted Local Storage of Secrets

**Risk:** Critical. Storing tokens, keys, or session data in SharedPreferences
(Android) or UserDefaults (iOS) in plaintext allows extraction on rooted/jailbroken
devices.

### VULN-11: Disabled ASLR or Stack Protections

**Risk:** Medium. Disabling Address Space Layout Randomization or stack canaries in
native code weakens exploit mitigations.

### VULN-12: Exposed WebView JavaScript Bridge

**Risk:** High. A WebView with addJavascriptInterface or unrestricted URL loading can
be exploited to call arbitrary native code through injected JavaScript.

### VULN-13: Backup Extraction of Sensitive Data

**Risk:** Medium. Android's allowBackup="true" (default) permits adb backup to extract
app data, including databases and preference files.

```xml
<!-- SECURE -->
<application android:allowBackup="false"
             android:fullBackupContent="false" ... >
```

### VULN-14: Weak or Missing Anti-Hook Protection

**Risk:** High. Without Frida/Xposed detection, attackers can hook any function at
runtime to bypass authentication, modify transactions, or extract encryption keys.

### VULN-15: Code Push Without Integrity Verification

**Risk:** High. Over-the-air code updates (React Native CodePush, Flutter Shorebird)
that lack signature verification allow attackers to push malicious updates via MITM.

---

## 5. Security Checklist

### Build-Time Protections

- [ ] R8/ProGuard enabled with `isMinifyEnabled = true` and `isShrinkResources = true`
- [ ] Custom ProGuard rules strip logging (`-assumenosideeffects`)
- [ ] `-repackageclasses` flattens package structure
- [ ] Debug symbols stripped from release builds
- [ ] `android:debuggable` is `false` in release (default behavior)
- [ ] `android:allowBackup="false"` set explicitly
- [ ] iOS: STRIP_INSTALLED_PRODUCT and DEPLOYMENT_POSTPROCESSING enabled
- [ ] No hardcoded secrets, API keys, or credentials in source code
- [ ] Sensitive strings encrypted or fetched from server at runtime

### Runtime Protections

- [ ] Root/jailbreak detection implemented with multiple checks
- [ ] Emulator detection active for sensitive features
- [ ] Debugger detection (isDebuggerConnected, TracerPid, ptrace denial)
- [ ] Frida/hooking framework detection (port scan, library scan, named pipes)
- [ ] Runtime signature/integrity verification of the APK/IPA
- [ ] Certificate pinning for all API connections
- [ ] Play Integrity API (Android) / App Attest (iOS) integrated

### Architecture Protections

- [ ] Sensitive logic moved to native code (NDK/C) where feasible
- [ ] Critical security decisions validated server-side
- [ ] RASP SDK integrated for comprehensive runtime monitoring
- [ ] Security checks scattered throughout codebase (not centralized)
- [ ] Graceful degradation on detection (not just crash -- report to server)

---

## 6. Tools and Automation

### 6.1 Obfuscation and Shielding

| Tool | Platform | Type | Key Features |
|------|----------|------|--------------|
| R8 | Android | Free (bundled) | Code shrinking, obfuscation, optimization |
| DexGuard | Android | Commercial | Polymorphic obfuscation, string encryption, RASP, class encryption |
| iXGuard | iOS | Commercial | Swift/ObjC obfuscation, control flow, RASP |

DexGuard and iXGuard, both from Guardsquare, apply polymorphic obfuscation so no two
protected builds look the same. They support native and cross-platform apps (Flutter,
React Native, Unity, Cordova, Ionic) and integrate into CI/CD pipelines as
post-processing steps.

### 6.2 RASP SDKs

| SDK | Vendor | Capabilities |
|-----|--------|-------------|
| freeRASP | Talsec | Root/jailbreak, hook, emulator, debug detection (open-source core) |
| Promon Shield | Promon | App shielding, code hardening, anti-repackaging |
| ThreatCast | Guardsquare | Real-time threat monitoring (pairs with DexGuard/iXGuard) |
| zDefend | Zimperium | On-device ML threat detection, RASP |
| Appdome | Appdome | No-code RASP integration, ML-based obfuscation |

### 6.3 Platform Attestation APIs

| API | Platform | Purpose |
|-----|----------|---------|
| Play Integrity API | Android | Device integrity, app licensing, account details |
| App Attest (DeviceCheck) | iOS | Binary integrity via Secure Enclave keypair |
| SafetyNet | Android | **Deprecated** -- fully removed May 2025 |

### 6.4 Analysis and Testing Tools

| Tool | Purpose |
|------|---------|
| MobSF | Automated mobile app security assessment (static + dynamic) |
| apktool | APK decompilation for testing your own protections |
| jadx | DEX decompilation -- verify obfuscation effectiveness |
| Frida | Test your own hooking defenses |
| objection | Automated runtime exploration -- verify RASP responses |

---

## 7. Platform-Specific Guidance

### 7.1 iOS (Xcode Build Settings)

Key Xcode build settings for binary hardening:

```
// Build Settings for Release
STRIP_INSTALLED_PRODUCT = YES
DEPLOYMENT_POSTPROCESSING = YES
GCC_GENERATE_DEBUGGING_SYMBOLS = NO
ENABLE_NS_ASSERTIONS = NO
DEBUG_INFORMATION_FORMAT = dwarf
SWIFT_COMPILATION_MODE = wholemodule
SWIFT_OPTIMIZATION_LEVEL = -Osize
GCC_OPTIMIZATION_LEVEL = s
ENABLE_BITCODE = NO                        // Deprecated since Xcode 14
```

**Entitlements hardening:**
- Remove `com.apple.security.get-task-allow` from release entitlements (allows
  debugger attachment if present).
- Use `com.apple.developer.devicecheck.appattest-environment = production` for
  App Attest.

**Swift/ObjC name mangling:** Swift naturally mangles symbol names more aggressively
than Objective-C. However, any method marked `@objc` or visible through the ObjC
runtime loses this protection. Minimize `@objc` exposure in security-critical code.

### 7.2 Android (Gradle and NDK)

```groovy
android {
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            ndk {
                debugSymbolLevel = "NONE"  // Strip native debug symbols
            }
        }
        debug {
            // Ensure debug builds are clearly distinguished
            applicationIdSuffix = ".debug"
        }
    }

    // Disable backup
    defaultConfig {
        manifestPlaceholders["allowBackup"] = "false"
    }

    // NDK: Use -O2 and stack protection for native code
    externalNativeBuild {
        cmake {
            cppFlags("-O2", "-fstack-protector-strong", "-D_FORTIFY_SOURCE=2")
        }
    }
}
```

### 7.3 Flutter

Flutter compiles Dart to native ARM code (AOT) for release builds, which provides
some inherent protection over interpreted code. However, additional steps are needed:

```bash
# Build with obfuscation enabled
flutter build apk \
  --release \
  --obfuscate \
  --split-debug-info=build/debug-info

flutter build ipa \
  --release \
  --obfuscate \
  --split-debug-info=build/debug-info
```

**Limitations of Flutter's built-in obfuscation:**
- Only renames Dart symbols (class names, method names, variable names).
- Does NOT encrypt string literals or resources.
- Does NOT provide control flow obfuscation.
- Dart snapshots can still be analyzed with tools like `darter` or `blutter`.

**Recommendations:**
- Use `--split-debug-info` to store symbol maps separately (never ship them).
- Combine with platform-level protection (R8 for Android, Xcode settings for iOS).
- Consider commercial tools like DexGuard/iXGuard or Appdome that support Flutter.
- Move sensitive logic to platform channels (Kotlin/Swift or C via dart:ffi).
- Use the `flutter_jailbreak_detection` or `freeRASP` package for environment checks.

### 7.4 React Native

React Native poses unique challenges because JavaScript source is bundled inside the
binary and can be extracted and read.

**Hermes Engine (recommended):**
```javascript
// android/app/build.gradle
project.ext.react = [
    enableHermes: true  // Compiles JS to Hermes bytecode
]
```

Hermes compiles JavaScript to bytecode, making casual reading harder. However, Hermes
bytecode can be decompiled with tools like `hbc-decompiler`.

**Additional protections:**
- Use `react-native-obfuscating-transformer` with Metro bundler for JS obfuscation.
- Never store secrets in JavaScript -- use native modules for sensitive operations.
- If using CodePush (OTA updates), enable code signing to verify update integrity.
- Apply R8/ProGuard to the Android native layer.
- Apply Xcode build hardening to the iOS native layer.
- Consider `jsi` (JavaScript Interface) for performance-sensitive code to reduce
  exposure of business logic in the JS bundle.

---

## 8. Incident Patterns

### 8.1 Repackaged App Detection

**Pattern:** Legitimate app is decompiled, modified (malware injected, ads replaced,
license checks removed), re-signed with attacker's certificate, distributed via
third-party stores or phishing.

**Detection signals:**
- APK/IPA signature does not match the developer's known certificate.
- Package hash differs from the version published on official stores.
- Server-side Play Integrity / App Attest validation fails.
- App reports a different signing certificate hash at startup.

**Response protocol:**
1. Server rejects API requests from unverified binaries.
2. Log device fingerprint and report to threat intelligence.
3. Notify affected users if credential compromise is suspected.
4. File takedown requests with hosting providers and stores.

### 8.2 Hooking Framework Detection

**Pattern:** Attacker uses Frida, Xposed, or Cydia Substrate to hook security-critical
functions at runtime (e.g., bypassing root detection, modifying transaction amounts,
extracting encryption keys from memory).

**Detection signals:**
- Frida server process running (port 27042 open, `frida-server` in process list).
- Suspicious libraries loaded (`frida-agent`, `MobileSubstrate`, `libcycript`).
- Xposed Framework installer app present on device.
- Named pipes associated with injection frameworks in /proc/self/fd.
- Method execution timing anomalies (hooked functions run slower).

**Response protocol:**
1. Terminate sensitive operations immediately.
2. Clear in-memory secrets (encryption keys, session tokens).
3. Report detection event to server with device fingerprint.
4. Degrade functionality (block transactions, require step-up authentication).
5. Do NOT simply crash -- attackers patch crash points. Instead, introduce subtle
   behavioral changes that corrupt results silently while reporting to server.

### 8.3 Emulator/Simulator Abuse

**Pattern:** Attackers run apps in emulators to automate exploitation, credential
stuffing, or bonus/reward farming at scale.

**Detection signals:**
- Build properties indicate emulator (generic fingerprint, goldfish/ranchu hardware).
- Sensor data anomalies (accelerometer returns constant values).
- Battery status always "charging" with no temperature variation.
- Missing telephony or Bluetooth hardware.

**Response protocol:**
1. Restrict sensitive features (payments, account changes) on detected emulators.
2. Allow emulator usage for development builds (debug variant) only.
3. Rate-limit or challenge requests from suspected emulator instances.

---

## 9. Compliance and Standards

### 9.1 OWASP MASVS-RESILIENCE

The OWASP Mobile Application Security Verification Standard (MASVS) version 2.0
defines the MASVS-RESILIENCE category with four control groups covering defense against
reverse engineering and tampering:

| Control | Description |
|---------|-------------|
| MASVS-RESILIENCE-1 | The app implements anti-tampering mechanisms |
| MASVS-RESILIENCE-2 | The app implements anti-static analysis mechanisms |
| MASVS-RESILIENCE-3 | The app implements anti-dynamic analysis mechanisms |
| MASVS-RESILIENCE-4 | The app implements device integrity verification |

**When MASVS-RESILIENCE applies:** The R (Resilience) requirements apply to apps where
the binary itself is a high-value target: DRM-protected content, payment/banking apps,
apps with proprietary algorithms, or apps where client-side logic bypass causes direct
financial harm.

**MASTG mapping:** The OWASP Mobile Application Security Testing Guide (MASTG) provides
specific test cases for each MASVS-RESILIENCE control, updated in June 2025 with new
MAS profile mappings.

### 9.2 Financial App Regulatory Requirements

Financial services apps face additional regulatory requirements for binary protection:

**PCI DSS 4.0 (Requirement 6):**
- Requirement 6.2.4: Software engineering techniques prevent common coding
  vulnerabilities.
- Requirement 6.3.2: Custom application code reviewed for vulnerabilities before
  release.
- Binary hardening is an expected control for apps handling cardholder data.

**PSD2 (EU Payment Services Directive):**
- Strong Customer Authentication (SCA) requirements mandate that authentication
  elements are protected against compromise.
- Mobile app integrity verification is expected for banking apps.

**DORA (Digital Operational Resilience Act, EU):**
- Financial entities must ensure ICT systems are resilient against tampering.
- Mobile banking apps are in scope for operational resilience testing.

**FFIEC (US) Mobile Banking Guidance:**
- Recommends application-level security controls including code obfuscation,
  jailbreak/root detection, and app integrity verification.

**MAS TRM (Monetary Authority of Singapore):**
- Technology Risk Management guidelines explicitly require mobile app hardening
  for financial institutions, including anti-tampering and anti-reverse engineering.

---

## 10. Code Examples: Vulnerable vs. Secure Pairs

### Example 1: APK Signature Verification

```kotlin
// VULNERABLE: No runtime signature verification
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        // App starts without verifying its own integrity
        initializeServices()
    }
}
```

```kotlin
// SECURE: Verify APK signature at startup
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        if (!verifySignature()) {
            reportTamperingToServer()
            exitProcess(1)
        }
        initializeServices()
    }

    private fun verifySignature(): Boolean {
        return try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageManager.getPackageInfo(
                    packageName,
                    PackageManager.GET_SIGNING_CERTIFICATES
                )
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(
                    packageName,
                    PackageManager.GET_SIGNATURES
                )
            }
            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                packageInfo.signatures
            }
            val md = java.security.MessageDigest.getInstance("SHA-256")
            val currentHash = android.util.Base64.encodeToString(
                md.digest(signatures[0].toByteArray()),
                android.util.Base64.NO_WRAP
            )
            currentHash == EXPECTED_SIGNATURE_HASH
        } catch (e: Exception) {
            false
        }
    }

    companion object {
        // Store this hash in native code for additional protection
        private const val EXPECTED_SIGNATURE_HASH = "your-base64-sha256-hash"
    }
}
```

### Example 2: Certificate Pinning

```kotlin
// VULNERABLE: No certificate pinning, trusts all CAs
val client = OkHttpClient.Builder().build()
```

```kotlin
// SECURE: Certificate pinning with OkHttp
val client = OkHttpClient.Builder()
    .certificatePinner(
        CertificatePinner.Builder()
            .add(
                "api.example.com",
                "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="
            )
            .build()
    )
    .build()
```

### Example 3: iOS Integrity Check at Launch

```swift
// VULNERABLE: No integrity checks
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
```

```swift
// SECURE: Multi-layer integrity checks at launch
@main
struct MyApp: App {
    init() {
        guard !JailbreakDetector.isJailbroken() else {
            reportCompromisedEnvironment()
            fatalError("Unsupported device configuration")
        }
        guard !isBeingDebugged() else {
            reportDebugAttempt()
            fatalError("Debug session detected")
        }
        denyDebugger()  // ptrace denial (see Section 3.1)
    }

    var body: some Scene {
        WindowGroup { ContentView() }
    }

    private func isBeingDebugged() -> Bool {
        var info = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.size
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        sysctl(&mib, 4, &info, &size, nil, 0)
        return (info.kp_proc.p_flag & P_TRACED) != 0
    }
}
```

### Example 4: Secure Storage of Sensitive Data

```kotlin
// VULNERABLE: Plaintext SharedPreferences
val prefs = getSharedPreferences("auth", MODE_PRIVATE)
prefs.edit().putString("token", accessToken).apply()
```

```kotlin
// SECURE: EncryptedSharedPreferences with AndroidX Security
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val securePrefs = EncryptedSharedPreferences.create(
    context,
    "secure_auth",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
securePrefs.edit().putString("token", accessToken).apply()
```

---

## References and Sources

- [OWASP MASVS-RESILIENCE](https://mas.owasp.org/MASVS/11-MASVS-RESILIENCE/)
- [OWASP MASVS Checklist](https://mas.owasp.org/checklists/MASVS-RESILIENCE/)
- [Promon App Threat Report: Hooking Framework Detection 2024](https://promon.io/resources/downloads/app-threat-report-hooking-framework-frida-2024)
- [Promon Mobile Malware Threats 2025](https://promon.io/security-news/mobile-malware-2025)
- [Guardsquare DexGuard](https://www.guardsquare.com/dexguard)
- [Guardsquare iXGuard](https://www.guardsquare.com/ixguard)
- [Android Play Integrity API](https://developer.android.com/google/play/integrity)
- [Apple App Attest Documentation](https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity)
- [Apple DeviceCheck](https://developer.apple.com/documentation/devicecheck)
- [Flutter: Obfuscate Dart Code](https://docs.flutter.dev/deployment/obfuscate)
- [R8 Keep Rules -- Android Developers Blog](https://android-developers.googleblog.com/2025/11/configure-and-troubleshoot-r8-keep-rules.html)
- [iOS Security Suite (GitHub)](https://github.com/securing/IOSSecuritySuite)
- [RootBeer (GitHub)](https://github.com/scottyab/rootbeer)
- [Talsec: Root Detection with Kotlin](https://docs.talsec.app/appsec-articles/articles/how-to-detect-root-using-kotlin)
- [Talsec: Detect Hooking (Frida) using Swift](https://docs.talsec.app/appsec-articles/articles/how-to-detect-hooking-frida-using-swift)
- [Czech Mobile Users NFC Attack -- The Hacker News](https://thehackernews.com/2024/08/czech-mobile-users-targeted-in-new.html)
- [Play Integrity API Limitations -- Approov](https://approov.io/blog/limitations-of-google-play-integrity-api-ex-safetynet)
- [Apple App Attest Limitations -- Approov](https://approov.io/blog/limitations-of-apple-devicecheck-and-apple-app-attest)
- [Verimatrix: Repackaging Attacks](https://www.verimatrix.com/cybersecurity/knowledge-base/what-is-a-repackaging-attack/)
- [Guardsquare: OWASP MASVS-RESILIENCE](https://help.guardsquare.com/en/articles/30268-the-role-of-mobile-app-protection-in-owasp-standards-masvs)
