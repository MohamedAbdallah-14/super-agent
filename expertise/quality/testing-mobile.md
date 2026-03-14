# Mobile Testing -- Expertise Module

> A mobile testing specialist designs, implements, and maintains test strategies across iOS, Android, and cross-platform applications to ensure functional correctness, performance, security, and usability across a fragmented ecosystem of 25,000+ device variants, multiple OS versions, and variable network conditions. Scope spans unit tests through E2E automation, device farm orchestration, CI/CD integration, accessibility compliance, and production crash analysis.

---

## Core Patterns & Conventions

### Mobile Testing Pyramid

The mobile testing pyramid (Kwo Ding, 2017) structures test investment. The base is widest (most tests), narrowing toward the top:

```
        /  E2E / UI  \          ~10% -- real user flows on real/cloud devices
       /  Integration  \        ~20% -- API contracts, navigation, state
      /  Widget/Component \     ~30% -- isolated UI component rendering
     /     Unit Tests      \    ~40% -- pure logic, ViewModels, repositories
```

| Layer | What to Test | Tools | Speed |
|-------|-------------|-------|-------|
| Unit | Business logic, data transforms, state management | XCTest, JUnit 5, flutter_test, Jest | <1ms/test |
| Widget/Component | UI rendering, widget state, layout constraints | Compose Testing, Flutter widget tests | 10-100ms |
| Integration | Navigation flows, API integration, DB operations | Espresso, XCUITest, integration_test | 1-10s |
| E2E | Full user journeys, cross-feature flows | Maestro, Appium, Detox, Patrol | 10-60s |

### Platform-Specific Testing Patterns

**iOS -- XCUITest:** Apple's first-party UI testing framework. Tests run in a separate process via accessibility APIs. Use `accessibilityIdentifier` for stable locators. Supports SwiftUI and UIKit. UI tests only work with XCTest, not Swift Testing.

**Android -- Espresso + Compose Testing:** Espresso runs synchronously on the main thread with automatic UI sync. Compose Testing uses semantic tree instead of view hierarchy; elements identified by `testTag()`. Use `IdlingResource` for async synchronization.

**Flutter -- flutter_test + integration_test:** `testWidgets()` for widget tests. `pumpWidget()` builds the tree; `pump()` advances one frame; `pumpAndSettle()` waits for animations. Golden tests via `matchesGoldenFile()` for pixel-perfect comparison.

### Cross-Platform Testing Frameworks

| Framework | Version | Approach | Speed | Best For |
|-----------|---------|----------|-------|----------|
| Maestro | v1.39+ | YAML declarative, black-box | 2-3x faster than Appium | New initiatives, non-technical QA |
| Appium | v2.x | WebDriver protocol, multi-language | Baseline | Established programs, broad platform coverage |
| Detox | v20.x | Gray-box, React Native native | 2-3x faster than Appium | React Native teams |
| Patrol | v3.x | Flutter-first, native automation | Comparable to integration_test | Flutter teams needing native interactions |

**Maestro** uses YAML exclusively, requires no programming, includes Maestro Studio Desktop for visual test creation. Setup: minutes. **Appium** supports Java/Python/JS/Ruby/C#, covers Android/iOS/Web/Hybrid/Windows. Setup: 1-2 days; maintenance: 30-40% of engineer time. **Detox** completes login flows in 8-12s vs Appium's 20-30s but is React Native only. **Patrol** handles permission dialogs, notifications, WebView from Dart code with hot-restart support.

### Device Farm Strategies

| Platform | Strengths | Pricing Model |
|----------|-----------|---------------|
| BrowserStack | 3,500+ real devices, fastest setup, highest satisfaction | Subscription, unlimited access |
| Firebase Test Lab | AI-powered Robo tests, deep Android/Google integration | Free tier + $1-5/hr per device |
| AWS Device Farm | AWS ecosystem integration, custom environments | Pay-per-minute |
| LambdaTest | Best value, HyperExecute speed | Subscription tiers |
| Sauce Labs | Enterprise compliance, extensive reporting | Enterprise pricing |

### Test Data Management

- **Factory pattern**: generate data programmatically per test run (no stale fixtures).
- **Backend seeding**: dedicated test API routes (`/test/seed`, `/test/reset`) for known state.
- **Local DB fixtures**: pre-populate SQLite/Realm/Hive for offline-first testing.
- **State reset**: always reset between tests (`adb pm clear`, reinstall, or reset APIs).
- **Sensitive data**: never use production PII; use synthetic data generators (Faker).

### Deep Link Testing

Test universal links (iOS) and app links (Android) across surfaces: email, SMS, QR codes, social platforms, push notifications. Verify AASA/DAL files, deferred deep links (store redirect then content), parameter preservation, and behavior across app states (foreground/background/killed).
- Android: `adb shell am start -a android.intent.action.VIEW -d "scheme://path"`
- iOS: `xcrun simctl openurl booted "scheme://path"`

### Push Notification Testing

Test delivery when app is foreground, background, killed, and offline. Cover rich content (images, action buttons, deep links), silent notifications, priority levels, permission flows, and offline queue deduplication. Tools: Firebase Console, FCM/APNS test APIs.

### Offline / Network Condition Testing

- **Airplane mode**: full offline behavior, local persistence, sync queue.
- **Network transitions**: Wi-Fi to cellular, cellular to offline, reconnection.
- **Throttling**: simulate 2G/3G via Charles Proxy, Network Link Conditioner (iOS), or `adb emu network` (Android).
- **Sync conflicts**: test offline edits conflicting with server state.

### Gesture and Accessibility Testing

**Gestures**: multi-touch (pinch-to-zoom, rotation), edge swipes (iOS back gesture), scroll (momentum, pull-to-refresh, infinite scroll). Espresso: `ViewActions.swipeUp()`. XCUITest: `pinch(withScale:velocity:)`.

**Accessibility**: screen reader compatibility (VoiceOver/TalkBack), semantic labels on all interactive elements, touch targets (44x44pt iOS, 48x48dp Android), WCAG 2.1 AA color contrast (4.5:1). Tools: Accessibility Inspector (Xcode), Accessibility Scanner (Android).

---

## Anti-Patterns & Pitfalls

### 1. Testing Only on Emulators/Simulators
Emulators miss hardware bugs: thermal throttling, real GPU rendering, biometrics, battery drain, Bluetooth/NFC. UI scaling and gesture response differ from real hardware. Always validate on real devices before release.

### 2. Hardcoding Test Data
Hardcoded credentials/IDs create brittle tests coupled to specific backend state. Parallel tests sharing data cause flaky failures. Use factories and per-test data generation.

### 3. Inverting the Pyramid (Ice Cream Cone)
Many E2E tests + few unit tests = slow, expensive, flaky suite. E2E tests are 100-1000x slower than unit tests. Teams waste hours debugging flaky E2E instead of catching logic bugs in milliseconds at unit level.

### 4. No Test Isolation Between Runs
Shared state (DB, sessions, server data) produces order-dependent results. Test A passes alone but fails after Test B. Always reset state and use independent test data.

### 5. Using `sleep()` Instead of Explicit Waits
Fixed delays are the leading cause of flaky mobile tests. They either wait too long (slow) or not enough (random failures). Use: Espresso `IdlingResource`, XCUITest `waitForExistence(timeout:)`, Maestro auto-wait, Detox synchronization.

### 6. Testing Only the Happy Path
Production crashes come from edge cases: network timeouts, permission denials, low storage, interrupted flows (incoming call during payment), background/foreground transitions, malformed API responses.

### 7. Neglecting Device Fragmentation
An app working on Pixel 9 / Android 15 may crash on Samsung Galaxy A13 / Android 12 due to manufacturer overlays, custom ROMs, or different WebView versions. Build a device matrix from production analytics.

### 8. Coupling Tests to UI Implementation Details
Tests relying on view hierarchy positions (`//LinearLayout[2]/Button[1]`) break with every UI refactor. Use stable identifiers: `accessibilityIdentifier`, `testTag`, `resource-id`.

### 9. No CI Integration for Mobile Tests
Tests only on developer machines run inconsistently. Regressions merge undetected, discovered days later (10-100x higher fix cost). Integrate into PR checks with pass/fail gates.

### 10. Skipping Accessibility Testing
15-20% of users have disabilities. Beyond ethics: inaccessible apps face ADA lawsuits, App Store rejection (Apple requires VoiceOver support), and lost market share.

### 11. Manual-Only Testing Without Automation
A 30-minute manual regression across 10 devices = 5 hours per release. Biweekly releases = 130 hours/year on regression alone. Automate stable flows; reserve manual for exploratory/UX.

### 12. Not Testing App Update / Migration Paths
Users update from v2.3 to v2.5, not from clean install. DB migrations, cached data, keychain entries must survive. Install-over-existing tests catch data corruption that clean-install tests miss.

### 13. Ignoring Background/Foreground Lifecycle
Apps interrupted by calls, notifications, multitasking, memory pressure. Test suspend/resume, process death, low-memory kill scenarios for state preservation.

### 14. Over-Mocking Native APIs
Mocking camera/GPS/biometrics gives false confidence. Real implementations have edge cases (permission timing, hardware unavailability, OS version differences). Mock for unit tests only; use real APIs for integration/E2E.

### 15. No Crash Monitoring Feedback Loop
Without connecting Crashlytics/Sentry data to test planning, teams test stable features while production crashes concentrate in untested areas. Use crash data to prioritize test coverage.

---

## Testing Strategy

### Automate vs Manual

| Automate | Keep Manual |
|----------|------------|
| Login/auth, purchase/payment flows | Exploratory testing, UX evaluation |
| Regression suite, API contract validation | Visual design review, OS beta testing |
| Accessibility audits, performance benchmarks | Hardware interactions (NFC, Bluetooth pairing) |
| Deep link routing verification | Competitor comparison, App Store screenshot QA |

### Device Coverage Matrix

Build from production analytics. Example:

| Tier | Device | OS | Screen | Notes |
|------|--------|----|--------|-------|
| P1 | iPhone 16 Pro | iOS 18.x | 6.3" | Latest flagship |
| P1 | Samsung Galaxy S25 | Android 15 | 6.2" | Top Android |
| P1 | Google Pixel 9 | Android 15 | 6.3" | Stock Android |
| P2 | iPhone SE 3 | iOS 17.x | 4.7" | Small screen edge |
| P2 | Samsung Galaxy A54 | Android 14 | 6.4" | Mid-range popular |
| P3 | Xiaomi Redmi Note 12 | Android 13 | 6.67" | Budget segment |

### Beta Testing Programs

| Platform | Tool | Key Features |
|----------|------|--------------|
| iOS | TestFlight | 10,000 external testers, 90-day expiry, crash reports |
| Android | Firebase App Distribution | No Play Store review, tester groups, Fastlane integration |
| Android | Play Console Internal/Closed | Staged rollout %, ANR monitoring, pre-launch reports |

Stagger rollouts: internal -> closed beta -> open beta -> production. Do not proceed below 99% crash-free rate.

### Performance Testing

**Key metrics:** 60 FPS sustained (jank = any frame >16ms), cold start <2s, no memory leaks, monitor battery mAh/session, app size <100MB.

**Tools:** Android Profiler (CPU/memory/energy), Xcode Instruments (Time Profiler, Allocations, Energy Log), PerfDog/Apptim (cross-platform), BrowserStack App Performance.

### Crash Reporting

**Tools:** Firebase Crashlytics, Sentry, Bugsnag. Triage by crash-free user rate (target >99.5%), not raw count. Alert on >0.5% drop within 1 hour of release. Top 10 crash signatures should each have a regression test within 1 sprint.

---

## Performance Considerations

### Test Execution Speed Targets
Unit: <30s full suite. Widget: <2 min. Integration: <10 min/device. E2E: <30 min full, <10 min smoke. If suite >15 min, developers stop waiting.

### Parallel Device Testing
Maestro: `--shard-all` across devices. Firebase Test Lab: sharding flags. BrowserStack: parallel sessions (5+ on paid plans). Typical speedup: 4 devices = 3.5x (orchestration overhead).

### Emulator vs Real Device vs Cloud

| Factor | Emulator | Real Device | Cloud Farm |
|--------|----------|-------------|------------|
| Cost | Free | $200-1,500/device | $29-299/month |
| Hardware fidelity | No biometrics/thermal | Full access | Real hardware, remote |
| CI suitability | Excellent for unit/widget | Requires physical lab | Excellent, scales on demand |
| Use case | Dev + unit/widget/integration | Performance profiling, final validation | Regression, device matrix |

**Hybrid approach:** Emulators in dev/CI for fast tests -> cloud farm for E2E regression -> real devices for performance profiling and final sign-off.

### CI/CD Pipeline Optimization
- Run unit tests first (fast fail); E2E only if unit tests pass.
- Cache Gradle/CocoaPods/pub dependencies (saves 2-5 min).
- Build app once, test on artifact (no rebuild per device).
- On PR: run only tests affected by changed files.
- Retry failed tests once (infra flakiness); if retry fails, it is real.

---

## Security Considerations

### OWASP Mobile Top 10 (2024 -- first major update since 2016)

| # | Risk | Testing Approach |
|---|------|-----------------|
| M1 | Improper Credential Usage | Check for hardcoded keys in APK/IPA, strings.xml/Info.plist |
| M2 | Inadequate Supply Chain Security | Audit SDKs; `npm audit`, `pub outdated`, CodeQL |
| M3 | Insecure Authentication/Authorization | Test session mgmt, token expiry, role-based access |
| M4 | Insufficient Input/Output Validation | Fuzz inputs, test injection via deep links/intents |
| M5 | Insecure Communication | Verify TLS 1.2+, test certificate pinning |
| M6 | Inadequate Privacy Controls | Audit data collection, verify GDPR/CCPA consent |
| M7 | Insufficient Binary Protections | Decompile (jadx/Hopper); verify obfuscation |
| M8 | Security Misconfiguration | `android:debuggable=false`, ATS enabled (iOS) |
| M9 | Insecure Data Storage | Inspect SharedPreferences/UserDefaults for plaintext secrets |
| M10 | Insufficient Cryptography | No MD5/SHA1 for security; verify KeyStore/Keychain usage |

### SSL Pinning Testing
1. Configure proxy (Burp Suite, Charles, mitmproxy) as MITM on test device.
2. Install proxy CA as trusted root.
3. Launch app -- **expected**: app refuses connection. If traffic flows, pinning is broken.
4. Advanced: use Frida scripts to attempt runtime bypass; success = weak implementation.

Libraries: OkHttp `CertificatePinner` (Android), TrustKit (iOS/Android), Alamofire `ServerTrustManager` (iOS).

### Local Storage Security
- **Android**: inspect `/data/data/<pkg>/shared_prefs/`, SQLite. Use EncryptedSharedPreferences/KeyStore.
- **iOS**: inspect NSUserDefaults plist, Keychain. Use Keychain for tokens/passwords.
- **Flutter**: `shared_preferences` stores plaintext; use `flutter_secure_storage` (Keychain/KeyStore).
- **Tools**: `adb shell`, Objection (Frida-based), `jadx`, `dex2jar`.

### Reverse Engineering Protection
Decompile with `jadx`/`apktool` (Android) or `class-dump`/`Hopper` (iOS). Verify: obfuscation (ProGuard/R8), no debug symbols in release, root/jailbreak detection, debugger detection, integrity checks.

---

## Integration Patterns

### CI/CD Platform Comparison

| Platform | Strengths | Limitation | Best For |
|----------|-----------|------------|----------|
| Bitrise | Mobile-optimized, pre-built steps, managed macOS VMs | Credits-based cost | Teams wanting zero infra management |
| GitHub Actions | Broad ecosystem, `macos-latest` runners | No native real-device testing | Teams on GitHub wanting unified CI |
| Codemagic | Flutter-first, auto code signing, M2 Macs | Smaller ecosystem | Flutter-first teams |

### API Mocking

| Tool | Type | Best For |
|------|------|----------|
| WireMock | Standalone server (Java) | Complex stateful mocking |
| MockWebServer | In-process (OkHttp) | Espresso/JUnit integration |
| OHHTTPStubs | In-process (iOS) | XCUITest, URLSession interception |
| Mockoon | Desktop app + CLI | Visual API mocking, no code |

Use in-process mocks for unit/widget tests (fast). Standalone servers for integration/E2E (realistic). Never mock in E2E tests validating real backend integration.

### Test Reporting
- **JUnit XML**: universal format for all CI systems.
- **Allure**: rich HTML with screenshots, steps, history, flakiness detection.
- **Track**: pass rate, flaky test rate, execution time trend, coverage by feature area.

---

## DevOps & Deployment

### Mobile CI/CD Test Gates

```
PR Created
  -> Lint + Static Analysis (SwiftLint, detekt, dart analyze)   [< 2 min]
  -> Unit Tests                                                   [< 2 min]
  -> Widget/Component Tests                                       [< 5 min]
  -> Build APK/IPA                                                [< 10 min]
  -> E2E Smoke (cloud farm, top 3 devices)                        [< 15 min]
Merge to main
  -> Full E2E Regression (full device matrix)                     [< 45 min]
  -> Performance Benchmark vs baseline                            [< 15 min]
Release
  -> Beta distribution (TestFlight / Firebase App Dist)
  -> Monitor crash-free rate 24-48 hours
  -> Staged rollout: 1% -> 10% -> 50% -> 100%
```

### Screenshot/Video Capture in CI
Maestro: `--format junit` generates XML + video. Firebase Test Lab: auto-records everything. Espresso: `spoon` library. XCUITest: `XCUIScreen.main.screenshot()` on failure. Store artifacts with build number + git SHA; retain 30 days minimum.

### Automated Store Submission
**Fastlane**: automate screenshots (`snapshot`/`screengrab`), metadata upload, binary submission. Pre-submission checks: app size limits, privacy manifests (iOS), target API level (Android: API 34+ for 2025). Smoke test submitted binary on TestFlight/Internal testing before promoting.

### Production Crash Monitoring
Firebase Crashlytics / Sentry / Bugsnag for real-time reporting. Target: >99.5% crash-free users, ANR <0.47% (Android). Alert via PagerDuty/Slack on spikes within 1 hour. Compare crash rates between versions. Every P0/P1 crash gets a regression test within the same sprint.

---

## Decision Trees

### Decision Tree 1: Which Mobile Testing Framework?

```
React Native app?
  YES -> Experienced team? -> YES: Detox | NO: Maestro
  NO
Flutter app?
  YES -> Need native interactions (permissions, notifications)?
         YES: Patrol | NO: integration_test + flutter_test
  NO
Native iOS/Android?
  YES -> Need cross-platform test reuse?
         YES -> Need programming flexibility? -> YES: Appium | NO: Maestro
         NO  -> Platform-native (XCUITest / Espresso+Compose Testing)
  NO (Hybrid/PWA) -> Appium (broadest support)
```

### Decision Tree 2: Emulator vs Real Device vs Cloud?

```
Development (writing/debugging tests)?
  -> LOCAL EMULATOR: instant feedback, free, debugger access

CI/CD (automated regression)?
  -> Budget > $100/month? -> YES: CLOUD FARM (BrowserStack, Firebase Test Lab)
                           -> NO:  CI-hosted emulators (GitHub Actions)

Pre-release validation?
  -> Uses hardware features (camera, biometrics, NFC)?
     YES: REAL DEVICES | NO: Cloud farm sufficient

Performance profiling (FPS, battery, memory)?
  -> ALWAYS REAL DEVICES: emulators cannot measure real thermal/battery behavior
```

### Decision Tree 3: UI Tests vs Unit Tests?

```
Pure business logic (calculations, state machines)?        -> UNIT TEST
Data layer (API calls, DB queries, repositories)?          -> UNIT TEST + mocks
Single widget/component rendering?                          -> WIDGET TEST
Navigation between screens?                                 -> INTEGRATION TEST
Multi-screen user journey (login -> browse -> purchase)?   -> E2E / UI TEST
Visual appearance (colors, spacing, layout)?                -> SCREENSHOT / GOLDEN TEST
Native platform interaction (permissions, deep links)?      -> E2E on real device/cloud
```

---

## Code Examples

### Example 1: Maestro YAML -- Login Flow

```yaml
# login-flow.yaml
appId: com.example.myapp
tags:
  - smoke
  - auth
---
- launchApp:
    clearState: true
- assertVisible: "Welcome"
- tapOn: "Log In"
- tapOn:
    id: "email_input"
- inputText: "test@example.com"
- tapOn:
    id: "password_input"
- inputText: "SecurePass123!"
- tapOn: "Sign In"
- assertVisible:
    text: "Dashboard"
    timeout: 10000
- screenshot: "dashboard_after_login"
```

### Example 2: Flutter Widget Test

```dart
// test/counter_widget_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/counter_page.dart';

void main() {
  testWidgets('increments count when FAB is tapped', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: CounterPage()));
    expect(find.text('0'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    expect(find.text('1'), findsOneWidget);
    expect(find.text('0'), findsNothing);
  });
}
```

### Example 3: XCUITest (Swift)

```swift
// LoginUITests.swift
import XCTest

final class LoginUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    func testSuccessfulLogin() throws {
        app.buttons["loginNavButton"].tap()

        let emailField = app.textFields["emailTextField"]
        emailField.tap()
        emailField.typeText("user@example.com")

        app.secureTextFields["passwordTextField"].tap()
        app.secureTextFields["passwordTextField"].typeText("password123")

        app.buttons["signInButton"].tap()

        let dashboard = app.staticTexts["welcomeLabel"]
        XCTAssertTrue(dashboard.waitForExistence(timeout: 10),
                      "Dashboard should appear after login")
    }
}
```

### Example 4: Jetpack Compose Test

```kotlin
// LoginScreenTest.kt
class LoginScreenTest {
    @get:Rule val composeTestRule = createComposeRule()

    @Test
    fun loginButton_enablesAfterInput_andShowsWelcome() {
        composeTestRule.setContent { LoginScreen(onLoginSuccess = {}) }

        composeTestRule.onNodeWithTag("login_button").assertIsNotEnabled()

        composeTestRule.onNodeWithTag("email_field")
            .performTextInput("test@example.com")
        composeTestRule.onNodeWithTag("password_field")
            .performTextInput("password123")

        composeTestRule.onNodeWithTag("login_button")
            .assertIsEnabled()
            .performClick()

        composeTestRule.onNodeWithText("Welcome Back!").assertIsDisplayed()
    }
}
```

### Example 5: Patrol (Flutter) -- Native Permission Handling

```dart
// integration_test/permission_test.dart
import 'package:patrol/patrol.dart';
import 'package:my_app/main.dart' as app;

void main() {
  patrolTest('grants notification permission', ($) async {
    await app.main();
    await $.pumpAndSettle();

    await $(#requestNotificationButton).tap();

    if (await $.native.isPermissionDialogVisible(
        timeout: Duration(seconds: 5))) {
      await $.native.grantPermissionWhenInUse();
    }
    await $.pumpAndSettle();

    expect($('Notifications Enabled'), findsOneWidget);
  });
}
```

---

*Researched: 2026-03-07 | Sources: [Sauce Labs - Mobile Testing Pyramid](https://saucelabs.com/resources/blog/mobile-automated-testing-pyramid), [Bitrise - Mobile Testing Pyramid](https://bitrise.io/blog/post/mastering-the-mobile-testing-pyramid), [BrowserStack - Mobile Testing Pyramid](https://www.browserstack.com/guide/mobile-testing-pyramid), [Maestro vs Appium](https://maestro.dev/insights/maestro-vs-appium-choosing-the-right-mobile-testing-framework), [Detox vs Appium vs Maestro](https://www.getpanto.ai/blog/detox-vs-appium-vs-maestro), [Patrol GitHub](https://github.com/leancodepl/patrol), [OWASP Mobile Top 10 2024](https://owasp.org/www-project-mobile-top-10/2023-risks/), [BrowserStack - Performance Tools](https://www.browserstack.com/guide/android-app-performance-testing-tools), [Device Farms 2026](https://www.getpanto.ai/blog/device-farms-for-mobile-testing), [Bitrise vs GitHub Actions](https://bitrise.io/resources/compare/bitrise-vs-github), [Codemagic vs Bitrise](https://blog.codemagic.io/codemagic-vs-bitrise/), [SSL Pinning Testing](https://medium.com/globant/testing-ssl-pinning-in-a-mobile-application-2dcac9ab3d0c), [HeadSpin - Emulator vs Real Device](https://www.headspin.io/blog/real-device-cloud-vs-emulator-mobile-app-testing), [Flutter Docs - Widget Testing](https://docs.flutter.dev/cookbook/testing/widget/introduction), [Maestro Docs](https://docs.maestro.dev/getting-started/writing-your-first-flow), [XCUITest Guide](https://www.swiftyplace.com/blog/xcuitest-ui-testing-swiftui), [Compose Testing - Android](https://developer.android.com/develop/ui/compose/testing), [Testing Anti-Patterns](https://blog.codepipes.com/testing/software-testing-antipatterns.html), [OWASP Mobile Security Guide](https://www.getastra.com/blog/mobile/owasp-mobile-top-10-2024-a-security-guide/)*
