# Mobile Startup Time — Performance Expertise Module

> App startup time is the first impression users have of your app. 53% of mobile users abandon apps that take longer than 3 seconds to load (Google). Cold start times above 2 seconds correlate with 25% higher Day-1 abandonment. Users form a lasting opinion of app quality within the first 3 seconds of interaction, and apps rated below 3.5 stars see significantly reduced store visibility.

> **Impact:** Critical
> **Applies to:** Mobile (iOS, Android, Flutter, React Native)
> **Key metrics:** Cold start time, Warm start time, Hot start time, Time to Initial Display (TTID), Time to Full Display (TTFD)

---

## Why This Matters

- **53% of mobile users** leave if an app does not load within 3 seconds (Google — "The Need for Mobile Speed").
- Load time 1s to 3s: bounce probability rises **32%**. 1s to 5s: **90%**. 1s to 10s: **123%** (Google/SOASTA).
- Sites loading within 5s see **25% higher ad viewability**, **70% longer sessions**, **35% lower bounce rate** vs 19s loads.
- **25% of users** abandon an app after one use. **77%** abandon within 3 days of install.
- Apps rated above **4.5 stars** receive **3x more installs** on average.
- Apps reducing crash rates from 2% to 0.5% jumped **dozens of ranking positions** in stores.

### Real Case Studies

| Company | Platform | Improvement | Key Technique |
|---------|----------|-------------|---------------|
| **Turo** | Android | **77% faster** cold start (84% at p50) | Removed splash animation, parallel async requests, Baseline Profiles (+15%) |
| **DoorDash** | iOS | **60% faster** launch | Optimized Swift protocol conformance checks, command hashing (29% faster alone) |
| **Zomato** | Android | **20% faster** cold start | Baseline Profiles (3.47s to 2.81s), AOT compilation of critical paths |
| **Fintech startup** | Flutter | **48% faster** (2.5s to 1.3s) | Tree-shaking, lazy loading, app size 45MB to 32MB |

---

## Performance Budgets & Targets

| Metric | Excellent | Acceptable | Poor | Unacceptable |
|--------|-----------|------------|------|--------------|
| **Cold start (flagship)** | < 800ms | < 1.5s | 1.5–3s | > 3s |
| **Cold start (mid-range)** | < 1.2s | < 2s | 2–4s | > 4s |
| **Cold start (low-end)** | < 2s | < 3s | 3–5s | > 5s |
| **Warm start** | < 400ms | < 800ms | 800ms–2s | > 2s |
| **Hot start** | < 150ms | < 300ms | 300ms–1s | > 1s |
| **TTID** | < 500ms | < 1s | 1–2s | > 2s |
| **TTFD** | < 1.5s | < 2.5s | 2.5–4s | > 4s |
| **iOS pre-main** | < 200ms | < 400ms | 400ms–1s | > 1s |

**Android Vitals thresholds:** Cold >= 5s excessive, Warm >= 2s, Hot >= 1.5s. Google recommends < 500ms cold start (aggressive ideal). Top-100 apps: **39%** achieve cold launch < 2s, **73%** < 3s.

**iOS:** Watchdog kills apps failing to launch within ~20s. Pre-main target < 400ms.

**Flutter:** Cold start target < 2s on mid-range. Engine init overhead: 300–800ms on first launch.

**React Native:** With Hermes, target cold TTI < 2s. Without Hermes: expect 30–50% slower.

---

## Understanding Startup States

**Cold Start** — App process not in memory. System must: load binary, create process, init runtime (ART/dyld/Dart VM), load dynamic libraries, run static initializers, create Application/AppDelegate, create first Activity/VC, render first frame. Always the slowest path.

**Warm Start** — Process in memory but UI destroyed. Recreates Activity/VC and restores state. Typically **40–60% faster** than cold.

**Hot Start** — App fully in memory, brought to foreground. Usually < 200ms on modern devices.

---

## Measurement & Profiling

### Android
```bash
# Cold start measurement
adb shell am force-stop com.example.app
adb shell am start-activity -W -n com.example.app/.MainActivity
# Output: TotalTime, WaitTime, LaunchState (COLD/WARM/HOT)
```

**Macrobenchmark (CI-ready):**
```kotlin
@Test
fun startupCold() = benchmarkRule.measureRepeated(
    packageName = "com.example.app",
    metrics = listOf(StartupTimingMetric()),
    iterations = 10,
    startupMode = StartupMode.COLD
) {
    pressHome()
    startActivityAndWait()
}
// Outputs: timeToInitialDisplayMs, timeToFullDisplayMs — JSON for CI
```

**Also use:** Android Vitals (real-user percentiles), Perfetto/Systrace (detailed traces).

### iOS
```
# Xcode scheme → Environment Variables:
DYLD_PRINT_STATISTICS = 1
# Shows: dylib loading, rebase/binding, ObjC setup, initializer time
```

**XCTest (CI-ready):**
```swift
func testColdLaunchTime() throws {
    measure(metrics: [XCTApplicationLaunchMetric()]) {
        XCUIApplication().launch()
    }
    // 10 iterations, set baselines in Xcode for regression detection
}
```

**Also use:** Instruments App Launch template, MetricKit (production, delivers daily reports).

### Flutter
```bash
flutter run --trace-startup --profile
# Outputs startup_info.json: engineEnterTimestampMicros, timeToFirstFrameMicros
```
```dart
import 'dart:developer';
Timeline.startSync('DI Setup');
setupDependencyInjection();
Timeline.finishSync();
```

### React Native
```javascript
performance.mark('app_start');
// ... init code ...
performance.mark('first_render');
performance.measure('startup', 'app_start', 'first_render');
```
**Also use:** Flipper Performance plugin, Hermes sampling profiler.

### CI Automation Strategy
```
1. Run startup benchmark on every PR (Macrobenchmark / XCTest)
2. Track p50, p90, p99 across device tiers
3. CI thresholds: p50 cold > 2s = warning, > 3s = failure, p90 cold > 5s = failure
4. Store in time-series DB, dashboard with trend lines and alerts
```

---

## Common Bottlenecks (Ranked by Impact)

**1. Too Many Initializations at Launch** (200–2000ms)
Detect: Profile Application.onCreate / didFinishLaunching for synchronous init calls.
Fix: Defer non-critical SDKs. Only init what the first screen needs.

**2. Synchronous Network Calls at Startup** (500–5000ms+)
Detect: Main thread blocked on network I/O in trace. Turo's primary bottleneck.
Fix: Async requests, show cached/skeleton content.

**3. Heavy Third-Party SDK Init** (100–800ms per SDK)
Detect: DYLD_PRINT_STATISTICS (iOS), ContentProvider init time (Android). Firebase, analytics, crash SDKs.
Fix: Defer analytics/crash init to after first frame. Remove unused SDKs.

**4. Dynamic Library Loading (iOS)** (10–50ms per framework)
Detect: DYLD_PRINT_STATISTICS → dylib loading. 100+ dynamic frameworks = 500ms+.
Fix: Convert to static libraries. Swift 6 `@StaticDependency` reduces dyld loading by **35%**.

**5. Dex/Class Loading (Android)** (200–1500ms)
Detect: Perfetto classloading time. Multidex on older Android especially affected.
Fix: Baseline Profiles (up to **30%** improvement), R8 full mode, App Startup library.

**6. Large Splash Screen Assets** (100–500ms)
Fix: Use vector drawables/PDF assets. System splash API (Android 12+).

**7. Main Thread Blocking I/O** (50–2000ms)
Fix: Background threads for all disk I/O. Async SharedPreferences/UserDefaults.

**8. Excessive DI Setup** (50–500ms)
Detect: Profile DI container init. Koin (runtime) > Dagger/Hilt (compile-time) overhead.
Fix: Compile-time DI for large graphs. Lazy-inject non-critical deps.

**9. Database Migrations on First Run** (100–3000ms)
Fix: Background thread migrations. Progress indicator for large migrations.

**10. Custom Font Loading** (50–300ms per family)
Fix: System fonts where possible. Preloaded fonts in manifest/Info.plist.

**11. ContentProvider Auto-Init (Android)** (50–200ms each)
Fix: App Startup library to replace ContentProvider-based initialization.

**12. Swift Protocol Conformance Checks (iOS)**
DoorDash found significant overhead. Fix: Reduce protocol abstractions in hot launch paths (**29% faster**).

**13. Unused Feature Module Loading** (100–500ms)
Fix: Dynamic feature modules loaded on-demand, not at startup.

**14. Image Preloading** (50–400ms)
Fix: Only load first-frame images. Async loading for rest.

**15. Analytics Event Queue Flush** (50–300ms)
Fix: Defer flush to after first frame. Background batch dispatch.

---

## Optimization Patterns

### 1. Lazy Initialization (Android)
```kotlin
// BEFORE: ~830ms blocking in onCreate
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)         // ~150ms
        CrashReporting.init(this)               // ~100ms
        AnalyticsSDK.init(this, config)         // ~200ms
        ImageLoader.init(this)                  // ~80ms
        DatabaseManager.init(this)              // ~120ms
        FeatureFlagService.init(this)           // ~180ms
    }
}

// AFTER: ~80ms blocking, rest deferred
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ImageLoader.init(this)  // Only what first frame needs
    }
}
object ServiceLocator {
    val analytics by lazy { AnalyticsSDK.init(appContext, config) }
    val crashReporting by lazy { CrashReporting.init(appContext) }
}
class MainActivity : AppCompatActivity() {
    override fun onResume() {
        super.onResume()
        window.decorView.post { // After first frame
            lifecycleScope.launch(Dispatchers.Default) {
                FirebaseApp.initializeApp(applicationContext)
                ServiceLocator.crashReporting
                ServiceLocator.analytics
            }
        }
    }
}
```

### 2. Parallel Initialization (iOS)
```swift
// BEFORE: ~600ms sequential
func application(_ app: UIApplication, didFinishLaunchingWithOptions opts: ...) -> Bool {
    FirebaseApp.configure()              // ~180ms
    Crashlytics.initialize()             // ~120ms
    Analytics.configure(with: config)    // ~150ms
    NetworkManager.shared.configure()    // ~90ms
    ThemeManager.apply()                 // ~60ms
    return true
}

// AFTER: ~60ms blocking, rest parallel
func application(_ app: UIApplication, didFinishLaunchingWithOptions opts: ...) -> Bool {
    ThemeManager.apply()  // Only critical-path
    let bgQueue = DispatchQueue.global(qos: .utility)
    bgQueue.async { FirebaseApp.configure() }
    bgQueue.async { Crashlytics.initialize(); Analytics.configure(with: config) }
    bgQueue.async { NetworkManager.shared.configure() }
    return true
}
```

### 3. Baseline Profile Generation (Android)
```kotlin
@Test
fun generateStartupProfile() {
    rule.collect(packageName = "com.example.app", maxIterations = 15) {
        pressHome()
        startActivityAndWait()
        device.findObject(By.res("home_feed")).wait(Until.hasObject(By.res("feed_item")), 5_000)
    }
}
// Place in src/main/baseline-prof.txt. Google Play AOT-compiles on install.
// Expected: 15–30% faster cold start.
```

### 4. Flutter Deferred Loading
```dart
// BEFORE: blocks first frame
void main() async {
    WidgetsFlutterBinding.ensureInitialized();
    await Firebase.initializeApp();         // ~200ms
    await Hive.initFlutter();               // ~150ms
    await loadRemoteConfig();               // ~500ms (network!)
    runApp(const MyApp());
}

// AFTER: near-instant first frame
void main() {
    WidgetsFlutterBinding.ensureInitialized();
    runApp(const MyApp());
}
class MyApp extends StatelessWidget {
    @override Widget build(BuildContext context) {
        return MaterialApp(home: FutureBuilder(
            future: Future.wait([Firebase.initializeApp(), Hive.initFlutter()]),
            builder: (ctx, snap) => snap.connectionState == ConnectionState.done
                ? const HomeScreen() : const ShimmerPlaceholder(),
        ));
    }
}
```

### 5. React Native Hermes + Inline Requires
```javascript
// metro.config.js
module.exports = {
    transformer: { getTransformOptions: async () => ({
        transform: { inlineRequires: true },
    })},
};

// App.js — defer non-critical init
useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
        const { initAnalytics } = require('./services/analytics');
        const { initCrashReporting } = require('./services/crashes');
        initAnalytics();
        initCrashReporting();
    });
}, []);
// Hermes + inlineRequires: cold TTI 3.6s → 2.1s (42% faster)
```

### 6. iOS Static Linking Migration
```ruby
# Podfile — convert dynamic to static
platform :ios, '16.0'
use_frameworks! :linkage => :static

# Result: dylib loading 850ms → 120ms (67% reduction)
# Apps with 50+ frameworks save 200–500ms pre-main
```

---

## Anti-Patterns

1. **"Initialize Everything at Startup Just in Case"** — Loading all SDKs synchronously adds 500–2000ms for services the user may never need that session. Categorize as critical/deferred/lazy.

2. **Synchronous Initialization Chains** — SDK A→B→C all sequential when some branches could parallelize. Map the dependency graph, parallelize independent branches.

3. **Network Calls Before Showing UI** — Adds full round-trip (200–5000ms). Cache last config locally, show cached content, update async.

4. **Heavy Custom Splash Animations** — Fixed delays that cannot be optimized. Turo saved time by removing their 1s splash. Use system splash, dismiss when content ready.

5. **Eager Feature Module Loading** — 100–500ms of class loading for unused screens. Use dynamic feature modules, init on navigation.

6. **Blocking on Remote Config** — `fetchAndActivate()` synchronous = 200–2000ms network delay. Use cached values, fetch in background, apply next launch.

7. **Unoptimized R8/ProGuard** — Broad keep rules = larger DEX, more classes to load. Use R8 full mode, precise keep rules.

---

## Architecture-Level Decisions

### Modular Initialization Pipeline
```
Phase 1: CRITICAL (main thread, sync, < 200ms)
  └── Core DI (minimal), theme, first-screen ViewModel + cached data

Phase 2: FIRST FRAME RENDERED — user sees content/skeleton

Phase 3: DEFERRED (background, < 2s after first frame)
  └── Analytics, crash reporting, push registration, network refresh

Phase 4: LAZY (on-demand, < 500ms when triggered)
  └── Social login, payments, camera, feature-specific libs
```

### DI Framework Impact

| Framework | Startup Overhead | Best For |
|-----------|-----------------|----------|
| **Dagger/Hilt** | Near-zero (compile-time) | Large apps, perf-critical |
| **Koin** | 50–300ms (runtime) | Small-medium apps |
| **GetIt (Flutter)** | 10–100ms | Flutter apps |
| **Manual DI** | Zero | Simple apps, max control |

### Splash vs. Skeleton Screens

Skeleton screens feel **20–30% faster** than spinners (research on perceived wait times). Use system splash to cover cold start gap, transition to skeleton for content loading. Never add artificial delays.

---

## Decision Tree: "My App Is Slow to Start"

```
Cold start issue?
├── YES → Pre-main or post-main?
│   ├── PRE-MAIN (iOS)
│   │   ├── dylib loading > 200ms → static linking
│   │   ├── initializer time > 500ms → audit +load, defer to didFinishLaunching
│   │   └── ObjC setup > 100ms → reduce ObjC classes, use Swift structs
│   └── POST-MAIN
│       ├── SDKs init synchronously → defer to after first frame
│       ├── Network blocking main thread → async + cached/skeleton
│       ├── DI setup > 200ms → compile-time DI, lazy inject
│       └── Complex first frame → simplify, skeleton, defer layouts
├── WARM start → optimize onCreateView/viewDidLoad, reduce saved state size
└── HOT start → remove non-UI work from onResume/viewWillAppear
```

---

## Testing & Regression Prevention

**CI Pipeline:**
```yaml
# Android: Macrobenchmark in GitHub Actions
- uses: reactivecircus/android-emulator-runner@v2
  with:
    script: ./gradlew :benchmark:connectedAndroidTest
- run: |
    COLD=$(jq '.benchmarks[0].metrics.timeToInitialDisplayMs.median' results.json)
    [ $(echo "$COLD > 2000" | bc) -eq 1 ] && exit 1

# iOS: XCTest performance
- run: xcodebuild test -scheme PerformanceTests -destination "platform=iOS Simulator,name=iPhone 15"
```

**Regression Strategy:**
1. Baseline on known-good build (p50, p90, p99)
2. Per-PR checks: flag > 10% regression as warning, > 20% as failure
3. Production: Android Vitals + MetricKit + custom telemetry
4. Quarterly review — startup time creeps up with new features

**Device Farm:** Firebase Test Lab / AWS Device Farm. Always include one low-end device (2GB RAM). Never rely only on emulator benchmarks.

---

## Quick Reference

### Optimization Impact Summary

| Technique | Improvement | Effort | Platform |
|-----------|------------|--------|----------|
| Defer SDK init | 200–800ms | Low | All |
| Baseline Profiles | 15–30% cold start | Medium | Android |
| Static linking | 200–500ms pre-main | Medium | iOS |
| Hermes engine | 30–50% cold start | Low | React Native |
| Inline requires | 10–20% cold start | Low | React Native |
| Parallel init | 30–60% of init time | Medium | All |
| App Startup library | 100–300ms | Low | Android |
| Remove splash delay | 500–2000ms | Low | All |
| Compile-time DI | 50–300ms vs runtime | High | Android |
| R8 full mode | 10–20% cold start | Low | Android |
| Isolate-based init | 100–500ms off main | Medium | Flutter |
| Skeleton screens | 20–30% perceived | Medium | All |

### Measurement Tools

| Tool | Platform | Use Case |
|------|----------|----------|
| `adb shell am start -W` | Android | Quick local measurement |
| Macrobenchmark | Android | CI regression testing |
| Android Vitals | Android | Production monitoring |
| Perfetto / Systrace | Android | Deep investigation |
| DYLD_PRINT_STATISTICS | iOS | Pre-main breakdown |
| Instruments App Launch | iOS | Deep investigation |
| MetricKit | iOS | Production monitoring |
| XCTApplicationLaunchMetric | iOS | CI regression testing |
| `flutter run --trace-startup` | Flutter | Quick measurement |
| Flipper Performance | React Native | Thread analysis |

### Startup Audit Checklist
```
[ ] Profile cold start on a mid-range device (not your dev phone)
[ ] Measure pre-main time (iOS) or process init time (Android)
[ ] List all initializations in Application.onCreate / didFinishLaunching
[ ] Categorize each as: Critical / Deferred / Lazy
[ ] Defer non-critical items to post-first-frame background thread
[ ] Audit third-party SDKs for ContentProvider auto-init (Android)
[ ] Check dynamic framework count (iOS) — consider static linking
[ ] Generate and ship Baseline Profiles (Android)
[ ] Enable Hermes engine (React Native)
[ ] Set up automated startup benchmark in CI
[ ] Configure production monitoring (Android Vitals / MetricKit)
[ ] Set performance budget and regression alerts
[ ] Test on lowest-tier target device
[ ] Review startup time quarterly
```

---

*Researched: 2026-03-08*

*Sources:*
- [App startup time — Android Developers](https://developer.android.com/topic/performance/vitals/launch-time)
- [Turo: 77% Android startup reduction](https://medium.com/turo-engineering/how-we-reduced-our-android-startup-time-by-77-650cc113c3dc)
- [DoorDash: 60% iOS launch time reduction](https://careersatdoordash.com/blog/how-we-reduced-our-ios-app-launch-time-by-60/)
- [Zomato: 20% improvement with Baseline Profiles](https://blog.zomato.com/how-we-improved-our-android-app-startup-time-by-over-20-with-baseline-profile)
- [Google: 53% abandon sites > 3s](https://www.thinkwithgoogle.com/marketing-strategies/app-and-mobile/page-load-time-statistics/)
- [Google: Page load bounce rate statistics](https://www.marketingdive.com/news/google-53-of-mobile-users-abandon-sites-that-take-over-3-seconds-to-load/426070/)
- [Reducing your app's launch time — Apple Developer](https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time)
- [Cut iOS Launch Time by 50% in 2025 — Static Linking, Swift 6](https://medium.com/@vrxrszsb/cut-ios-app-launch-time-by-50-in-2025-advanced-strategies-with-xcode-16-static-linking-and-bfb8997af3d0)
- [iOS App Launch time analysis — Globant](https://medium.com/globant/ios-app-launch-time-analysis-and-optimization-a219ee81447c)
- [Hermes in 2025 — React Native](https://medium.com/@devonmobile/hermes-in-2025-the-invisible-engine-powering-a-faster-react-native-955711815acd)
- [Hermes V1 in React Native 0.82](https://medium.com/react-native-journal/hermes-v1-in-react-native-0-82-unlocking-faster-startup-times-bfd0cf1b107c)
- [Macrobenchmark — Android Developers](https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview)
- [Baseline Profiles — Android Developers](https://developer.android.com/topic/performance/baselineprofiles/overview)
- [XCTApplicationLaunchMetric — Apple Developer](https://developer.apple.com/documentation/xctest/xctapplicationlaunchmetric)
- [MetricKit launch time — SwiftLee](https://www.avanderlee.com/swift/metrickit-launch-time/)
- [Skeleton screen design — LogRocket](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)
- [Benchmarking Koin vs Dagger Hilt 2024 — droidcon](https://www.droidcon.com/2024/12/03/benchmarking-koin-vs-dagger-hilt-in-modern-android-development-2024/)
- [Flutter Cold Start Optimization](https://writeflow.medium.com/flutter-cold-start-optimization-make-your-app-launch-2-faster-32d762af49c9)
- [Emerge Tools — Android Startup Performance](https://docs.emergetools.com/docs/android-startup-performance-testing-1)
