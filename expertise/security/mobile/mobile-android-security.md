# Mobile Android Security

> Expertise module for AI agents building secure Android applications.
> Covers threat landscape, implementation patterns, vulnerability catalog, and compliance.
> Last updated: 2026-03-08 | Sources: OWASP MASVS v2.1, OWASP Mobile Top 10 2024, Android Security Bulletins, NowSecure, Google Android Developer Docs.

---

## 1. Threat Landscape

### 1.1 Android-Specific Attack Surface

Android's open ecosystem creates a broader attack surface than closed platforms:

- **APK Reverse Engineering** -- Android apps compile to Dalvik bytecode (DEX), which is significantly easier to decompile than native ARM binaries. Tools like jadx, APKTool, and dex2jar can reconstruct near-source-quality Java/Kotlin code in seconds. Attackers extract API keys, authentication logic, encryption routines, and server endpoints from decompiled APKs.

- **Rooting** -- Rooting grants superuser access, bypassing the Android sandbox. Rooted devices allow attackers to: read any app's private data directory (`/data/data/<package>`), hook method calls at runtime via Frida, bypass SSL pinning and root detection, extract keys from the app's memory.

- **Component Exposure** -- Android's inter-process communication (IPC) model exposes Activities, Services, BroadcastReceivers, and ContentProviders. Exported components (explicit `android:exported="true"` or implicit via intent-filters) are accessible to any app on the device. Attackers craft malicious intents to invoke unprotected components.

- **Intent Injection** -- Malicious apps send crafted intents to vulnerable components, triggering unauthorized actions. Implicit intents can be intercepted by attacker-installed apps that register matching intent-filters. Pending intents with mutable flags can be modified by receiving apps.

- **WebView Attacks** -- WebViews that enable JavaScript and use `addJavascriptInterface()` expose native Java methods to web content. Attackers inject scripts via XSS or man-in-the-middle attacks to call native methods with the host app's permissions. `postWebMessage()` without origin validation allows cross-origin message injection.

- **Sideloading Malware** -- Android permits APK installation from unknown sources. Malicious apps masquerade as legitimate tools, banking apps, or games. Google Play Protect catches some threats, but sideloaded apps bypass store-level scanning entirely.

- **Clipboard Data Exposure** -- Prior to Android 13, any app could silently read clipboard contents. Sensitive data (passwords, OTPs, account numbers) copied to clipboard was accessible to all running apps.

### 1.2 Real-World Incidents

**SharkBot Banking Trojan (2021-2024)**
SharkBot initiates money transfers from compromised devices using Automatic Transfer Systems (ATS). It abuses Android Accessibility Services to overlay fake login screens, intercept SMS-based 2FA codes, and perform actions without user awareness. Distributed through Google Play Store as "file manager" and "antivirus" apps that passed initial review then downloaded the payload post-install. Targeted banking apps across Europe and the US. (Source: Cleafy Labs, NCC Group)

**Vultur Banking Trojan (2021-2025)**
Vultur uses VNC-based screen recording and remote control via Android Accessibility Services. The 2024 variant added encrypted C2 communication, file management capabilities (download/upload/delete/install), and improved anti-analysis with native code obfuscation. Distributed via smishing campaigns that direct victims to sideload a trojanized app. (Source: ThreatFabric, The Hacker News)

**Pegasus Spyware (2016-present)**
Developed by NSO Group, Pegasus exploits zero-click vulnerabilities to install itself without user interaction on both iOS and Android. Capabilities include microphone/camera control, message extraction, location tracking, and keylogging. In 2024, iVerify researchers found 2.5 infected devices per 1,000 scans -- significantly higher than previously estimated. In May 2025, NSO Group was ordered to pay $167 million in damages to WhatsApp. (Source: iVerify, Citizen Lab)

**Predator Spyware (2022-2024)**
Developed by Cytrox/Intellexa, Predator targets Android and iOS using exploit chains delivered via one-click links. Capabilities mirror Pegasus. The EU Parliament investigated its use against European politicians and journalists. (Source: Google TAG, Lookout)

**Joker/Bread Malware Family**
Persistent malware family that subscribes users to premium services via WAP billing fraud. Continually evolves to bypass Play Store defenses, with over 1,700 infected apps removed since 2017. Uses a combination of obfuscation, code loading, and delayed payload execution. (Source: Google, Kaspersky)

---

## 2. Core Security Principles

### 2.1 Android Security Model

**Application Sandbox** -- Each app runs in its own Linux process with a unique UID. Apps cannot access each other's files unless explicitly shared via ContentProviders or file-sharing mechanisms. SELinux enforces mandatory access control policies on all processes.

**Permission Model** -- Runtime permissions (dangerous permissions) require explicit user consent at runtime. Android 14+ requires apps to declare exact foreground service types and request corresponding permissions. Android 15 introduced temporary permission settings for camera/microphone that auto-expire.

**Android Keystore System** -- Hardware-backed (TEE/SE) cryptographic key storage. Key material never enters the application process -- crypto operations are performed in the secure environment. Keys can be bound to user authentication (biometric/PIN), requiring re-authentication before use.

### 2.2 Component Security

Every component must explicitly declare its export status (mandatory since Android 12/targetSdk 31):

```xml
<!-- SECURE: Explicitly not exported -->
<activity
    android:name=".InternalActivity"
    android:exported="false" />

<!-- SECURE: Exported with permission guard -->
<service
    android:name=".DataSyncService"
    android:exported="true"
    android:permission="com.example.SYNC_PERMISSION" />

<!-- INSECURE: Exported without protection -->
<receiver
    android:name=".AdminReceiver"
    android:exported="true" />
```

**Intent Filter Security** -- Components with intent-filters are implicitly exported (pre-Android 12). Always set `android:exported="false"` explicitly for internal components. Use custom permissions with `signature` protection level for inter-app communication between your own apps.

### 2.3 Data Storage Security

| Storage Type | Security Level | When to Use |
|---|---|---|
| Internal storage (`/data/data/<pkg>`) | App-sandbox protected | Non-sensitive app data |
| EncryptedSharedPreferences / Keystore+SharedPrefs | AES-256-GCM encrypted | Tokens, user preferences with sensitive values |
| Android Keystore | Hardware-backed | Cryptographic keys, biometric-bound secrets |
| External storage | World-readable | Never for sensitive data |
| SQLCipher / Room + encryption | AES-256 | Encrypted local databases |

### 2.4 Network Security Configuration

Android's `network_security_config.xml` controls network behavior declaratively:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Block all cleartext (HTTP) traffic -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <!-- Certificate pinning for API domain -->
    <domain-config>
        <domain includeSubdomains="true">api.example.com</domain>
        <pin-set expiration="2026-06-01">
            <pin digest="SHA-256">base64EncodedSPKIHash=</pin>
            <!-- Backup pin (REQUIRED -- use a different CA) -->
            <pin digest="SHA-256">backupBase64EncodedSPKIHash=</pin>
        </pin-set>
    </domain-config>

    <!-- Debug-only: trust user-installed CAs for testing -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

### 2.5 Code Obfuscation (R8/ProGuard)

R8 (the default Android code shrinker since AGP 3.4) performs:
- **Code shrinking** -- removes unused classes, methods, fields
- **Obfuscation** -- renames classes/methods to short meaningless names
- **Optimization** -- inlines methods, removes dead branches

```groovy
// build.gradle.kts
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

R8 makes reverse engineering harder but is NOT a security boundary. Determined attackers can still analyze the bytecode. Combine with additional protections (integrity checks, server-side validation).

---

## 3. Implementation Patterns

### 3.1 Android Keystore -- Key Generation and Usage

```kotlin
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

object KeystoreManager {

    private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
    private const val KEY_ALIAS = "app_secret_key"
    private const val AES_GCM_NOPADDING = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH = 128

    fun generateKey(): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            KEYSTORE_PROVIDER
        )
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationParameters(
                300, KeyProperties.AUTH_BIOMETRIC_STRONG
            )
            .setInvalidatedByBiometricEnrollment(true)
            .setIsStrongBoxBacked(false) // Set true if StrongBox available
            .build()
        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    fun getKey(): SecretKey? {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
            .apply { load(null) }
        return keyStore.getKey(KEY_ALIAS, null) as? SecretKey
    }

    fun encrypt(plaintext: ByteArray): Pair<ByteArray, ByteArray> {
        val key = getKey() ?: generateKey()
        val cipher = Cipher.getInstance(AES_GCM_NOPADDING)
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        val ciphertext = cipher.doFinal(plaintext)
        return Pair(iv, ciphertext)
    }

    fun decrypt(iv: ByteArray, ciphertext: ByteArray): ByteArray {
        val key = getKey()
            ?: throw IllegalStateException("Key not found")
        val cipher = Cipher.getInstance(AES_GCM_NOPADDING)
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.DECRYPT_MODE, key, spec)
        return cipher.doFinal(ciphertext)
    }
}
```

### 3.2 EncryptedSharedPreferences (Secure Token Storage)

> Note: `androidx.security:security-crypto` was deprecated in April 2025.
> Google recommends direct Android Keystore usage. Community forks
> (e.g., ed-george/encrypted-shared-preferences) continue maintenance.
> The pattern below remains valid for existing codebases or via the fork.

```kotlin
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

// SECURE: Encrypted storage for sensitive values
fun getSecurePrefs(context: Context): SharedPreferences {
    val masterKeyAlias = MasterKeys.getOrCreate(
        MasterKeys.AES256_GCM_SPEC
    )
    return EncryptedSharedPreferences.create(
        "secure_prefs",
        masterKeyAlias,
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
}

// Usage
val prefs = getSecurePrefs(context)
prefs.edit().putString("auth_token", token).apply()
val storedToken = prefs.getString("auth_token", null)
```

**Post-deprecation alternative using Keystore + Tink directly:**

```kotlin
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeysetHandle
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager

object SecureStorage {
    private const val KEYSET_NAME = "app_keyset"
    private const val PREF_FILE = "app_keyset_prefs"
    private const val MASTER_KEY_URI = "android-keystore://master_key"

    fun getAead(context: Context): Aead {
        AeadConfig.register()
        val keysetHandle: KeysetHandle = AndroidKeysetManager.Builder()
            .withSharedPref(context, KEYSET_NAME, PREF_FILE)
            .withKeyTemplate(
                com.google.crypto.tink.aead.AeadKeyTemplates.AES256_GCM
            )
            .withMasterKeyUri(MASTER_KEY_URI)
            .build()
            .keysetHandle
        return keysetHandle.getPrimitive(Aead::class.java)
    }

    fun encrypt(
        context: Context,
        plaintext: ByteArray,
        aad: ByteArray = byteArrayOf()
    ): ByteArray {
        return getAead(context).encrypt(plaintext, aad)
    }

    fun decrypt(
        context: Context,
        ciphertext: ByteArray,
        aad: ByteArray = byteArrayOf()
    ): ByteArray {
        return getAead(context).decrypt(ciphertext, aad)
    }
}
```

### 3.3 BiometricPrompt Authentication

```kotlin
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

class BiometricAuthManager(private val activity: FragmentActivity) {

    fun canAuthenticate(): Boolean {
        val biometricManager = BiometricManager.from(activity)
        return biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        ) == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun authenticate(
        onSuccess: (BiometricPrompt.AuthenticationResult) -> Unit,
        onError: (Int, CharSequence) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(
                result: BiometricPrompt.AuthenticationResult
            ) {
                super.onAuthenticationSucceeded(result)
                onSuccess(result)
            }

            override fun onAuthenticationError(
                errorCode: Int, errString: CharSequence
            ) {
                super.onAuthenticationError(errorCode, errString)
                onError(errorCode, errString)
            }
        }

        val biometricPrompt = BiometricPrompt(
            activity, executor, callback
        )
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Authentication Required")
            .setSubtitle("Verify your identity to continue")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG
            )
            .setNegativeButtonText("Cancel")
            .build()

        biometricPrompt.authenticate(promptInfo)
    }

    /** Authenticate with a Keystore-bound CryptoObject */
    fun authenticateWithCrypto(
        cipher: javax.crypto.Cipher,
        onSuccess: (BiometricPrompt.AuthenticationResult) -> Unit,
        onError: (Int, CharSequence) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)
        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(
                result: BiometricPrompt.AuthenticationResult
            ) {
                onSuccess(result)
            }
            override fun onAuthenticationError(
                errorCode: Int, errString: CharSequence
            ) {
                onError(errorCode, errString)
            }
        }
        val biometricPrompt = BiometricPrompt(
            activity, executor, callback
        )
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock Secure Data")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG
            )
            .setNegativeButtonText("Cancel")
            .build()
        biometricPrompt.authenticate(
            promptInfo, BiometricPrompt.CryptoObject(cipher)
        )
    }
}
```

### 3.4 Play Integrity API (SafetyNet Replacement)

SafetyNet was fully shut down on May 20, 2025. Play Integrity API is the mandatory replacement.

```kotlin
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest

class IntegrityChecker(private val context: Context) {

    fun requestIntegrityToken(
        nonce: String,
        onResult: (String) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val integrityManager =
            IntegrityManagerFactory.create(context)
        val request = IntegrityTokenRequest.builder()
            .setNonce(nonce) // Server-generated, one-time nonce
            .build()

        integrityManager.requestIntegrityToken(request)
            .addOnSuccessListener { response ->
                // Send token to YOUR server for verification
                // NEVER verify on-device -- server-side only
                onResult(response.token())
            }
            .addOnFailureListener { exception ->
                onError(exception)
            }
    }
}

// Server-side verdict fields:
// - requestDetails: nonce, package name, timestamp
// - appIntegrity: PLAY_RECOGNIZED | UNRECOGNIZED_VERSION
// - deviceIntegrity: MEETS_DEVICE_INTEGRITY | MEETS_BASIC_INTEGRITY
// - accountDetails: LICENSED | UNLICENSED
```

Key points:
- Always generate nonces server-side to prevent replay attacks
- Verify the integrity token server-side, never on-device
- Cache verdicts with short TTLs (minutes, not hours)
- Handle UNEVALUATED gracefully -- it does not mean compromised

### 3.5 Secure WebView Configuration

```kotlin
// INSECURE: Default WebView with dangerous settings
fun createInsecureWebView(context: Context): WebView {
    return WebView(context).apply {
        settings.javaScriptEnabled = true
        settings.allowFileAccess = true              // BAD
        settings.allowUniversalAccessFromFileURLs = true // BAD
        addJavascriptInterface(BridgeObject(), "bridge") // BAD
    }
}

// SECURE: Hardened WebView
fun createSecureWebView(context: Context): WebView {
    return WebView(context).apply {
        settings.apply {
            javaScriptEnabled = true // Only if truly required
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            domStorageEnabled = false
            databaseEnabled = false
            setGeolocationEnabled(false)
            mixedContentMode =
                WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_NO_CACHE
        }

        // Restrict navigation to trusted domains
        webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val host = request?.url?.host ?: return true
                val allowedHosts = setOf(
                    "app.example.com", "cdn.example.com"
                )
                return host !in allowedHosts
            }
        }

        // Expose ONLY specific methods via @JavascriptInterface
        addJavascriptInterface(SecureBridge(), "appBridge")
    }
}

class SecureBridge {
    @android.webkit.JavascriptInterface
    fun getPublicData(): String {
        // Only non-sensitive, read-only data
        return "{\"version\": \"1.0\"}"
    }
}
```

### 3.6 Content Provider Security

```kotlin
// INSECURE manifest declaration:
// <provider android:authorities="com.example.data"
//          android:exported="true"
//          android:grantUriPermissions="true" />

// SECURE manifest declaration:
// <provider
//     android:authorities="com.example.data"
//     android:exported="true"
//     android:readPermission="com.example.READ_DATA"
//     android:writePermission="com.example.WRITE_DATA"
//     android:grantUriPermissions="false" />
//
// <permission
//     android:name="com.example.READ_DATA"
//     android:protectionLevel="signature" />

class SecureProvider : ContentProvider() {
    override fun query(
        uri: Uri, projection: Array<String>?,
        selection: String?, selectionArgs: Array<String>?,
        sortOrder: String?
    ): Cursor? {
        // Validate caller identity
        val callingPackage = callingPackage
            ?: throw SecurityException("Unknown caller")

        // Prevent path traversal
        val pathSegments = uri.pathSegments
        if (pathSegments.any { it.contains("..") }) {
            throw SecurityException("Path traversal detected")
        }

        // Use parameterized queries only
        return database.query(
            getTableName(uri), projection,
            selection, selectionArgs, sortOrder
        )
    }
}
```

### 3.7 Root Detection

```kotlin
object RootDetector {

    fun isDeviceRooted(): Boolean {
        return checkSuBinary() ||
               checkRootManagementApps() ||
               checkDangerousProps() ||
               checkRWPaths() ||
               checkTestKeys()
    }

    private fun checkSuBinary(): Boolean {
        val paths = arrayOf(
            "/system/bin/su", "/system/xbin/su",
            "/sbin/su", "/data/local/xbin/su",
            "/data/local/bin/su", "/system/sd/xbin/su",
            "/system/bin/failsafe/su", "/data/local/su",
            "/su/bin/su"
        )
        return paths.any { java.io.File(it).exists() }
    }

    private fun checkRootManagementApps(): Boolean {
        val packages = arrayOf(
            "com.topjohnwu.magisk",
            "eu.chainfire.supersu",
            "com.koushikdutta.superuser",
            "com.thirdparty.superuser",
            "com.noshufou.android.su"
        )
        // Check via packageManager.getPackageInfo()
        return false
    }

    private fun checkDangerousProps(): Boolean {
        return try {
            val process = Runtime.getRuntime()
                .exec(arrayOf("getprop", "ro.debuggable"))
            val result = process.inputStream
                .bufferedReader().readLine()
            result == "1"
        } catch (e: Exception) { false }
    }

    private fun checkRWPaths(): Boolean {
        return try {
            val process = Runtime.getRuntime()
                .exec(arrayOf("mount"))
            val output = process.inputStream
                .bufferedReader().readText()
            output.contains("/system") && output.contains("rw,")
        } catch (e: Exception) { false }
    }

    private fun checkTestKeys(): Boolean {
        val buildTags = android.os.Build.TAGS
        return buildTags != null && buildTags.contains("test-keys")
    }
}
```

**Important caveat:** Client-side root detection can always be bypassed by a determined attacker using Frida or similar instrumentation tools. Root detection is a speed bump, not a security boundary. Critical security decisions must be validated server-side using Play Integrity API verdicts.

---

## 4. Vulnerability Catalog

### V-AND-01: Plaintext Data in SharedPreferences
- **Risk:** HIGH | **OWASP:** M9 (Insecure Data Storage) | **MASVS:** MASVS-STORAGE
- **Description:** Standard `SharedPreferences` stores data as plaintext XML in `/data/data/<pkg>/shared_prefs/`. On rooted devices or via backup extraction, all stored tokens, passwords, and PII are exposed.
- **Fix:** Use EncryptedSharedPreferences (or Keystore + Tink) for sensitive values. Never store passwords or long-lived tokens in plaintext SharedPreferences.

### V-AND-02: Exported Components Without Permission Guards
- **Risk:** HIGH | **OWASP:** M8 (Security Misconfiguration) | **MASVS:** MASVS-PLATFORM
- **Description:** Activities, Services, BroadcastReceivers, or ContentProviders with `android:exported="true"` and no `android:permission` attribute are accessible to any app on the device. Attackers can trigger privileged actions, extract data, or inject malicious input.
- **Fix:** Set `android:exported="false"` for internal components. For exported components, require custom `signature`-level permissions.

### V-AND-03: Intent Sniffing and Injection
- **Risk:** MEDIUM-HIGH | **OWASP:** M8 (Security Misconfiguration) | **MASVS:** MASVS-PLATFORM
- **Description:** Implicit intents can be intercepted by any app that registers a matching intent-filter. Sensitive data passed via intent extras (user IDs, tokens, file URIs) is exposed. Mutable PendingIntents (`FLAG_MUTABLE`) can be modified by the receiving app.
- **Fix:** Use explicit intents for internal communication. Use `FLAG_IMMUTABLE` for PendingIntents (required for targetSdk 31+). Validate all incoming intent data.

### V-AND-04: WebView JavaScript Bridge Exploitation
- **Risk:** HIGH | **OWASP:** M4 (Insufficient Input/Output Validation) | **MASVS:** MASVS-PLATFORM
- **Description:** `addJavascriptInterface()` injects Java objects into every frame of the WebView including iframes. Post-Android 4.2, only `@JavascriptInterface`-annotated methods are exposed, but if those methods access sensitive resources, attackers exploit them via injected scripts.
- **Fix:** Minimize exposed bridge methods. Never expose methods that modify state or return sensitive data. Validate WebView URL origins. Prefer `postWebMessage()` with strict origin matching.

### V-AND-05: Backup Data Exposure (allowBackup)
- **Risk:** MEDIUM | **OWASP:** M9 (Insecure Data Storage) | **MASVS:** MASVS-STORAGE
- **Description:** `android:allowBackup="true"` (the default) enables `adb backup` to extract the app's entire private data directory. An attacker with physical or ADB access can extract all local data.
- **Fix:** Set `android:allowBackup="false"` or use `fullBackupContent` to exclude sensitive files.

```xml
<application
    android:allowBackup="true"
    android:fullBackupContent="@xml/backup_rules">
</application>

<!-- res/xml/backup_rules.xml -->
<full-backup-content>
    <exclude domain="sharedpref" path="secure_prefs.xml" />
    <exclude domain="database" path="credentials.db" />
    <exclude domain="file" path="auth/" />
</full-backup-content>
```

### V-AND-06: Debug Mode in Production
- **Risk:** HIGH | **OWASP:** M8 (Security Misconfiguration) | **MASVS:** MASVS-CODE
- **Description:** `android:debuggable="true"` in a release build enables JDWP debugger attachment, `run-as` data access, and verbose logging. R8/ProGuard may not fully strip debug symbols.
- **Fix:** Never manually set `android:debuggable`. Let the build system set it automatically. Add CI checks to verify debuggable is false in release APKs.

### V-AND-07: Hardcoded API Keys and Secrets in APK
- **Risk:** HIGH | **OWASP:** M1 (Improper Credential Usage) | **MASVS:** MASVS-STORAGE
- **Description:** API keys, client secrets, or credentials embedded in source code, `strings.xml`, or `BuildConfig` are trivially extracted by decompiling the APK with jadx or APKTool.
- **Fix:** Store secrets server-side. For keys that must exist on-device (e.g., Maps API key), use API key restrictions. Use NDK for obfuscated key storage (speed bump only).

### V-AND-08: Clipboard Data Exposure
- **Risk:** MEDIUM | **OWASP:** M9 (Insecure Data Storage) | **MASVS:** MASVS-STORAGE
- **Description:** Pre-Android 13, any app could read clipboard contents silently. Users who copy passwords or OTPs expose them to all running apps.
- **Fix:** Disable copy on sensitive fields. Auto-clear clipboard. Use `ClipDescription.EXTRA_IS_SENSITIVE` (Android 13+).

### V-AND-09: Insecure Network Communication
- **Risk:** HIGH | **OWASP:** M5 (Insecure Communication) | **MASVS:** MASVS-NETWORK
- **Description:** Apps that permit cleartext traffic, lack certificate pinning, or trust user-installed CAs are vulnerable to man-in-the-middle attacks.
- **Fix:** Block cleartext traffic via network security config. Implement certificate pinning with backup pins. Do not trust user-installed CAs in production.

### V-AND-10: SQL Injection in ContentProviders
- **Risk:** HIGH | **OWASP:** M4 (Insufficient Input/Output Validation) | **MASVS:** MASVS-CODE
- **Description:** ContentProviders that concatenate user input into SQL queries are vulnerable to injection. Attackers with access to exported providers can read, modify, or delete data.
- **Fix:** Use parameterized queries with `selectionArgs`. Use Room DAO pattern. Validate `uri`, `projection`, and `sortOrder` parameters.

### V-AND-11: Insecure Broadcast Receivers
- **Risk:** MEDIUM | **OWASP:** M8 (Security Misconfiguration) | **MASVS:** MASVS-PLATFORM
- **Description:** Exported BroadcastReceivers that perform privileged actions without sender validation allow any app to trigger those actions. Ordered broadcasts can be intercepted.
- **Fix:** Use `registerReceiver()` with `RECEIVER_NOT_EXPORTED` flag (Android 14+). Require sender permissions. Validate broadcast data.

### V-AND-12: Insecure Logging
- **Risk:** MEDIUM | **OWASP:** M9 (Insecure Data Storage) | **MASVS:** MASVS-STORAGE
- **Description:** Logging sensitive data via `Log.d()` / `Log.v()` exposes it via `adb logcat`. Never log tokens, passwords, or PII.
- **Fix:** Strip all logging in release builds using R8 rules or Timber with a no-op tree.

```proguard
# proguard-rules.pro -- Strip Log calls in release
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
```

### V-AND-13: Task Hijacking (StrandHogg)
- **Risk:** MEDIUM | **OWASP:** M8 (Security Misconfiguration) | **MASVS:** MASVS-PLATFORM
- **Description:** Malicious apps hijack the task stack and overlay phishing activities over legitimate apps.
- **Fix:** Set `android:taskAffinity=""` on activities. Use `singleTask` or `singleInstance` launch mode for sensitive activities.

### V-AND-14: Tapjacking / Overlay Attacks
- **Risk:** MEDIUM | **OWASP:** M8 (Security Misconfiguration) | **MASVS:** MASVS-PLATFORM
- **Description:** Apps with `SYSTEM_ALERT_WINDOW` overlay transparent views to intercept touches or obscure security prompts.
- **Fix:** Set `android:filterTouchesWhenObscured="true"`. Check `MotionEvent.FLAG_WINDOW_IS_OBSCURED` in touch handlers.

### V-AND-15: Improper Certificate Validation
- **Risk:** CRITICAL | **OWASP:** M5 (Insecure Communication) | **MASVS:** MASVS-NETWORK
- **Description:** Custom `TrustManager` implementations that accept all certificates or `HostnameVerifier` that always returns true completely disable TLS verification.
- **Fix:** Never implement custom TrustManagers. Use platform defaults or network security config for pinning.

---

## 5. Security Checklist

### Build and Configuration
- [ ] `android:debuggable` is NOT manually set (auto-managed by build variant)
- [ ] `android:allowBackup="false"` or restricted via `fullBackupContent`
- [ ] `android:usesCleartextTraffic="false"` or blocked via network security config
- [ ] R8/ProGuard enabled with `isMinifyEnabled = true` for release builds
- [ ] `isShrinkResources = true` to remove unused resources
- [ ] No hardcoded API keys, secrets, or credentials in source code or resources
- [ ] `targetSdk` set to the latest stable API level
- [ ] Release signing uses a strong key (RSA 2048+ or EC P-256+)

### Component Security
- [ ] All components explicitly declare `android:exported` (required targetSdk 31+)
- [ ] Internal components set `android:exported="false"`
- [ ] Exported components protected by `signature`-level permissions
- [ ] PendingIntents use `FLAG_IMMUTABLE` unless mutability is required
- [ ] ContentProviders use parameterized queries and validate URIs
- [ ] BroadcastReceivers validate sender, use `RECEIVER_NOT_EXPORTED` (Android 14+)

### Data Protection
- [ ] Sensitive data stored with EncryptedSharedPreferences or Keystore + Tink
- [ ] No sensitive data written to external storage
- [ ] No sensitive data in application logs (stripped via R8 rules)
- [ ] Clipboard auto-cleared for sensitive fields, `EXTRA_IS_SENSITIVE` flag set
- [ ] Database encryption (SQLCipher) for sensitive local data
- [ ] Cache directories cleared of sensitive data on logout

### Network Security
- [ ] Network security config blocks cleartext traffic
- [ ] Certificate pinning configured with backup pins and expiration
- [ ] No custom TrustManager or HostnameVerifier implementations
- [ ] API communication uses TLS 1.2+ exclusively
- [ ] Tokens transmitted only in headers, never in URLs

### Authentication and Authorization
- [ ] BiometricPrompt with `BIOMETRIC_STRONG` for sensitive operations
- [ ] Keystore keys bound to user authentication with timeout
- [ ] Session tokens have server-enforced expiration
- [ ] Re-authentication required for sensitive actions

### Runtime Protection
- [ ] Root/emulator detection implemented (defense-in-depth, not sole control)
- [ ] Play Integrity API verdict checked server-side
- [ ] Tamper detection (APK signature verification at runtime)
- [ ] Anti-debugging checks (detect JDWP attachment)
- [ ] WebViews hardened (no file access, restricted domains, minimal bridge)

---

## 6. Tools and Automation

### Static Analysis

| Tool | Purpose | Usage |
|---|---|---|
| **MobSF** | Automated static + dynamic analysis | `docker run -p 8000:8000 opensecurity/mobile-security-framework-mobsf` -- upload APK for report |
| **jadx** | DEX/APK to Java decompiler | `jadx -d output/ app.apk` -- review for hardcoded secrets |
| **APKTool** | APK decompilation/recompilation | `apktool d app.apk` -- inspect manifest, resources, smali |
| **Android Lint** | IDE-integrated static checks | `./gradlew lint` -- flags insecure WebView, exported components |
| **semgrep** | Pattern-based code scanning | Custom rules for Android vulnerabilities |
| **QARK** | Quick Android Review Kit | Automated source/APK vulnerability analysis |

### Dynamic Analysis

| Tool | Purpose | Usage |
|---|---|---|
| **Frida** | Runtime instrumentation/hooking | `frida -U -f com.example.app -l script.js` -- hook methods, bypass pinning |
| **drozer** | IPC attack framework | `drozer console connect` -- enumerate exported components, test injection |
| **Objection** | Frida-powered exploration | `objection -g com.example.app explore` -- SSL bypass, keychain dump |
| **Burp Suite / mitmproxy** | HTTPS traffic interception | Configure device proxy, install CA, intercept API traffic |

### Google Play Security

| Check | Description |
|---|---|
| **Play Protect** | Automated malware scanning for published and sideloaded apps |
| **Pre-launch reports** | Automated testing before publication (crashes, vulnerabilities) |
| **App signing by Google Play** | Google manages release signing keys |
| **Play Integrity API** | Device/app attestation for server-side verification |
| **Data Safety section** | Required data collection and security practices disclosure |

### CI/CD Integration

```yaml
# GitHub Actions security checks
- name: Run Android Lint
  run: ./gradlew lint

- name: Check for hardcoded secrets
  run: |
    if grep -rn "api_key\|secret\|password\|token" \
       app/src/main/res/values/strings.xml; then
      echo "Potential secrets found in strings.xml"
      exit 1
    fi

- name: Verify release config
  run: |
    if grep -q 'android:debuggable="true"' \
       app/src/main/AndroidManifest.xml; then
      echo "debuggable=true found in manifest"
      exit 1
    fi

- name: MobSF Static Analysis
  run: |
    curl -F "file=@app/build/outputs/apk/release/app-release.apk" \
         http://localhost:8000/api/v1/upload \
         -H "Authorization: ${MOBSF_API_KEY}"
```

---

## 7. Platform-Specific Guidance

### 7.1 Kotlin-Specific Security Patterns

```kotlin
// Sealed classes for security-sensitive state machines
sealed class AuthState {
    object Unauthenticated : AuthState()
    data class Authenticated(
        val token: String, val expiresAt: Long
    ) : AuthState()
    object BiometricRequired : AuthState()
    data class Error(val code: Int) : AuthState()
}

// Value classes prevent type confusion with sensitive strings
@JvmInline
value class AuthToken(val value: String) {
    // Prevent accidental logging
    override fun toString(): String = "AuthToken[REDACTED]"
}

@JvmInline
value class UserId(val value: String)

// Scope functions for secure cleanup
fun processSecret(secretBytes: ByteArray) {
    try {
        performCryptoOperation(secretBytes)
    } finally {
        secretBytes.fill(0) // Zero out secret from memory
    }
}

// Constant-time string comparison
fun String.secureEquals(other: String): Boolean {
    return java.security.MessageDigest.isEqual(
        this.toByteArray(Charsets.UTF_8),
        other.toByteArray(Charsets.UTF_8)
    )
}
```

### 7.2 Jetpack Security Library Status

As of April 2025, `androidx.security:security-crypto` (v1.1.0-alpha07) is deprecated. Official recommendation:

1. **Use Android Keystore directly** for key management
2. **Use Google Tink** for encryption primitives (AES-GCM, AEAD)
3. **Community fork** (`ed-george/encrypted-shared-preferences`) provides continued maintenance

```kotlin
// OLD (deprecated): EncryptedSharedPreferences
val masterKey = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
val prefs = EncryptedSharedPreferences.create(...)

// NEW (recommended): Keystore + Tink
val aead = SecureStorage.getAead(context) // See Section 3.2
val encrypted = aead.encrypt(plaintext, associatedData)
// Store encrypted bytes in SharedPreferences or DataStore
```

### 7.3 Android Gradle Plugin Security Configuration

```kotlin
// build.gradle.kts (app module)
android {
    namespace = "com.example.secureapp"
    compileSdk = 35

    defaultConfig {
        minSdk = 26   // Android 8.0+ for strong crypto defaults
        targetSdk = 35
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile(
                    "proguard-android-optimize.txt"
                ),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            buildConfigField(
                "String", "API_BASE_URL",
                "\"https://dev-api.example.com\""
            )
        }
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "DebugProbesKt.bin"
        }
    }
}

dependencies {
    implementation("com.google.crypto.tink:tink-android:1.12.0")
    implementation("androidx.biometric:biometric:1.2.0-alpha05")
    implementation("com.google.android.play:integrity:1.5.0")
    debugImplementation(
        "com.squareup.leakcanary:leakcanary-android:2.14"
    )
}
```

### 7.4 Play Store Security Requirements (2025)

- **Target SDK:** New apps must target Android 14 (API 34) or higher
- **Data Safety section:** Mandatory disclosure of data practices
- **App signing:** Play App Signing enrollment required for new apps
- **Privacy Policy:** Required for apps accessing sensitive permissions
- **Foreground service types:** Must declare exact service types
- **Photo/video permissions:** Must use photo picker or specific media permissions
- **Credential Manager:** Recommended for sign-in flows (replaces Smart Lock)

### 7.5 Android Version-Specific Security Features

| Version | API | Key Security Features |
|---|---|---|
| Android 10 | 29 | Scoped storage, TLS 1.3 default, background location restrictions |
| Android 11 | 30 | One-time permissions, auto-reset permissions, scoped storage enforcement |
| Android 12 | 31 | Explicit export required, approximate location, clipboard notifications |
| Android 13 | 33 | Photo picker, notification permissions, clipboard auto-clear, `EXTRA_IS_SENSITIVE` |
| Android 14 | 34 | Selected photo access, screenshot detection API, credential manager, foreground service types |
| Android 15 | 35 | Partial screen sharing, E2EE contact keys API, Play Protect live threat detection, temporary permissions |

---

## 8. Incident Patterns

### 8.1 Malware Detection and Response

**Detection Indicators:**
- Unusual battery drain or data usage (C2 communication)
- Apps requesting excessive permissions (accessibility, device admin)
- Unknown apps installed from outside Play Store
- Unexpected overlay prompts or login screens
- Device performance degradation

**Response Playbook:**
1. **Identify** -- Run Play Protect scan; review installed apps for unrecognized entries
2. **Contain** -- Enable airplane mode to cut C2 communication; revoke accessibility and device admin permissions
3. **Eradicate** -- Uninstall malicious app; factory reset if rootkit suspected; change all credentials
4. **Recover** -- Restore from known-good backup; re-enable accounts with new credentials; enable 2FA
5. **Lessons Learned** -- Determine infection vector; update MDM policies

### 8.2 Data Leak via Exported Components

**Scenario:** A fintech app's `TransactionHistoryProvider` is exported without permission protection. An attacker's app queries it to extract complete transaction history.

**Detection:**
- drozer: `drozer run app.provider.info -a com.example.fintech`
- MobSF flags unprotected exported components
- Android Lint: "Exported ContentProvider without required permission"

**Response:**
1. Hotfix: add `android:readPermission` with `signature` protection
2. Audit all exported components across modules
3. Add CI check: fail build on unprotected exported components
4. Review server logs for unusual access during exposure window
5. Notify affected users per data breach requirements

### 8.3 Supply Chain Attack via Malicious SDK

**Scenario:** A third-party analytics SDK is compromised and exfiltrates user data.

**Detection:**
- Network analysis reveals unexpected outbound connections
- Dependency scanning (OWASP Dependency-Check, Snyk) flags vulnerable versions
- Hash verification fails against known-good values

**Response:**
1. Pin dependency versions and verify checksums via `gradle.lockfile`
2. Remove compromised SDK; roll back to last known-good version
3. Audit network traffic for data exfiltration
4. Implement SBOM tracking
5. Enable Gradle dependency verification

---

## 9. Compliance and Standards

### 9.1 OWASP MASVS v2.1 -- Android Focus

| Control Area | Android Considerations |
|---|---|
| **MASVS-STORAGE** | Keystore+Tink encryption, backup restrictions, no external storage for secrets, log stripping |
| **MASVS-CRYPTO** | Android Keystore for keys, AES-256-GCM symmetric, avoid custom crypto |
| **MASVS-AUTH** | BiometricPrompt with BIOMETRIC_STRONG, Credential Manager, session mgmt |
| **MASVS-NETWORK** | Network security config, certificate pinning, TLS 1.2+ |
| **MASVS-PLATFORM** | Component export controls, intent validation, WebView hardening, PendingIntent immutability |
| **MASVS-CODE** | R8 obfuscation, anti-tampering, input validation, dependency management |
| **MASVS-RESILIENCE** | Root detection, Play Integrity, debugger detection, emulator detection |
| **MASVS-PRIVACY** | Scoped permissions, data minimization, privacy dashboard compliance |

### 9.2 OWASP Mobile Top 10 (2024) -- Android Mitigations

| # | Risk | Android Mitigation |
|---|---|---|
| M1 | Improper Credential Usage | Keystore for secrets, no hardcoded keys, server-side token management |
| M2 | Inadequate Supply Chain Security | Dependency verification, SBOM, version pinning, Gradle lockfiles |
| M3 | Insecure Authentication/Authorization | BiometricPrompt, Credential Manager, server-enforced authorization |
| M4 | Insufficient Input/Output Validation | Parameterized queries, intent validation, WebView URL filtering |
| M5 | Insecure Communication | Network security config, certificate pinning, no cleartext |
| M6 | Inadequate Privacy Controls | Scoped permissions, photo picker, data minimization |
| M7 | Insufficient Binary Protections | R8/ProGuard, Play Integrity, tamper detection |
| M8 | Security Misconfiguration | Explicit exports, backup restrictions, debug mode checks |
| M9 | Insecure Data Storage | Keystore+Tink, SQLCipher, log stripping |
| M10 | Insufficient Cryptography | Hardware-backed Keystore, AES-256-GCM, Tink |

### 9.3 Additional Compliance Frameworks

- **PCI DSS v4.0** -- Payment apps: encrypted storage, secure communication, access controls
- **HIPAA** -- Health apps: encryption at rest/transit, audit logging, access controls
- **GDPR** -- EU user data: data minimization, right to erasure, consent management
- **Google MASA** -- App Defense Alliance validation against MASVS Level 1; passing apps get Play Store security badge

---

## 10. Code Examples -- Insecure vs. Secure Pairs

### Example 1: Storing Authentication Tokens

```kotlin
// --- INSECURE ---
fun saveToken(context: Context, token: String) {
    val prefs = context.getSharedPreferences(
        "auth", Context.MODE_PRIVATE
    )
    prefs.edit().putString("access_token", token).apply()
    // Plaintext in /data/data/<pkg>/shared_prefs/auth.xml
}

// --- SECURE ---
fun saveTokenSecurely(context: Context, token: String) {
    val aead = SecureStorage.getAead(context)
    val encrypted = aead.encrypt(
        token.toByteArray(Charsets.UTF_8),
        "auth_token".toByteArray()
    )
    val prefs = context.getSharedPreferences(
        "auth_enc", Context.MODE_PRIVATE
    )
    prefs.edit().putString(
        "access_token",
        android.util.Base64.encodeToString(
            encrypted, android.util.Base64.NO_WRAP
        )
    ).apply()
}
```

### Example 2: Network Configuration

```xml
<!-- INSECURE: Cleartext allowed -->
<application android:usesCleartextTraffic="true" />

<!-- SECURE: Strict network security config -->
<application
    android:networkSecurityConfig="@xml/network_security_config" />
```

```xml
<!-- res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config>
        <domain includeSubdomains="true">api.example.com</domain>
        <pin-set expiration="2026-12-31">
            <pin digest="SHA-256">SPKI_HASH_PRIMARY=</pin>
            <pin digest="SHA-256">SPKI_HASH_BACKUP=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

### Example 3: Secure Activity for Payments

```kotlin
// --- INSECURE ---
// Exported implicitly via intent-filter, no protections
// <activity android:name=".PaymentActivity">
//     <intent-filter>
//         <action android:name="com.example.PAY" />
//     </intent-filter>
// </activity>

// --- SECURE ---
// <activity
//     android:name=".PaymentActivity"
//     android:exported="false"
//     android:taskAffinity=""
//     android:excludeFromRecents="true" />

class PaymentActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Prevent screenshots and screen recording
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
        verifyAppIntegrity()
    }

    override fun onTouchEvent(event: MotionEvent?): Boolean {
        // Tapjacking protection
        if (event?.flags?.and(
            MotionEvent.FLAG_WINDOW_IS_OBSCURED) != 0
        ) {
            return false
        }
        return super.onTouchEvent(event)
    }

    private fun verifyAppIntegrity() {
        val expectedSig = "expected_sha256_of_signing_cert"
        val packageInfo = packageManager.getPackageInfo(
            packageName,
            PackageManager.GET_SIGNING_CERTIFICATES
        )
        val signatures = packageInfo.signingInfo
            ?.apkContentsSigners ?: return finish()
        val currentSig = signatures.first().toByteArray()
        val digest = java.security.MessageDigest
            .getInstance("SHA-256").digest(currentSig)
        val hash = digest.joinToString("") { "%02x".format(it) }
        if (hash != expectedSig) { finish() }
    }
}
```

### Example 4: Intent Handling

```kotlin
// --- INSECURE ---
class DeepLinkActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val url = intent.getStringExtra("url")
        webView.loadUrl(url!!) // Arbitrary URL -- XSS risk
    }
}

// --- SECURE ---
class DeepLinkActivity : AppCompatActivity() {
    private val ALLOWED_HOSTS = setOf(
        "app.example.com", "help.example.com"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val url = intent.getStringExtra("url")
        if (url == null || !isUrlAllowed(url)) {
            finish()
            return
        }
        webView.loadUrl(url)
    }

    private fun isUrlAllowed(url: String): Boolean {
        return try {
            val uri = android.net.Uri.parse(url)
            uri.scheme == "https" && uri.host in ALLOWED_HOSTS
        } catch (e: Exception) { false }
    }
}
```

---

## References

- [OWASP Mobile Top 10 2024](https://owasp.org/www-project-mobile-top-10/2023-risks/)
- [OWASP MASVS v2.1](https://mas.owasp.org/MASVS/)
- [OWASP MASTG](https://mas.owasp.org/)
- [Android Developer Security Docs](https://developer.android.com/privacy-and-security)
- [Android Keystore System](https://developer.android.com/privacy-and-security/keystore)
- [Android Network Security Config](https://developer.android.com/privacy-and-security/security-config)
- [Play Integrity API](https://developer.android.com/google/play/integrity)
- [NowSecure: Android 15 Security](https://www.nowsecure.com/blog/2024/07/31/comprehensive-guide-to-android-15-security-and-privacy-improvements/)
- [Cleafy Labs: SharkBot](https://www.cleafy.com/cleafy-labs/sharkbot-a-new-generation-of-android-trojan-is-targeting-banks-in-europe)
- [ThreatFabric: Vultur](https://thehackernews.com/2024/04/vultur-android-banking-trojan-returns.html)
- [iVerify: Pegasus 2024](https://iverify.io/blog/iverify-mobile-threat-investigation-uncovers-new-pegasus-samples)
- [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF)
- [Jetpack Security Deprecation](https://marcobrador.medium.com/on-the-deprecation-of-jetsec-crypto-dea9205d5076)
- [App Defense Alliance MASA](https://appdefensealliance.dev/masa)
