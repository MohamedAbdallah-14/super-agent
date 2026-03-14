# Mobile Memory & Battery — Performance Expertise Module

> Memory and battery are the most constrained resources on mobile devices. Apps that consume excessive memory get killed by the OS; apps that drain battery get uninstalled. On Android, the Low Memory Killer Daemon (lmkd) terminates background apps based on oom_adj_score thresholds — processes using more than ~200MB in the background are prime candidates. iOS is even more aggressive — the Jetsam watchdog enforces per-process hard memory limits (e.g., ~2098MB on 4GB iPhones) and terminates apps immediately with no warning.

> **Impact:** Critical
> **Applies to:** Mobile (iOS, Android, Flutter, React Native)
> **Key metrics:** Peak memory usage (MB), Memory leak rate (KB/min), Battery consumption (mAh/hour), CPU wake-ups per hour, Partial wake lock duration (hours/24h)

---

## 1. Why This Matters

**Android lmkd** assigns each process an `oom_adj_score`. When free RAM drops below thresholds, lmkd kills highest-scored processes first. Since Android 11, PSI (Pressure Stall Information) provides more accurate pressure detection. Each memory page = 4KB; a 50MB threshold = 12,800 pages.

**iOS Jetsam** enforces hard per-process limits. When exceeded, the app is killed immediately — no `didReceiveMemoryWarning`, no grace period. Background limits are ~50-80MB; foreground limits scale with device RAM.

**Google Play Store (March 2026):** If >5% of user sessions hold >2 cumulative hours of non-exempt wake locks in 24 hours, the app is excluded from recommendations and may show a battery drain warning on its listing.

| Factor | Statistic |
|--------|-----------|
| Users who stop using battery-draining apps | 36% (TestDevLab/Pcloudy) |
| Users who uninstall after 2 crashes | 71% (App Annie) |
| Cold start abandonment threshold | > 2 seconds (Scalosoft 2025) |
| 1-star reviews citing battery | ~18% of negative reviews |
| #1 crash cause on iOS | Memory (OOM) terminations (Apple WWDC) |

Apps in the "Restricted" Android Standby Bucket get near-zero background execution. Users who disable Background App Refresh eliminate push-driven re-engagement entirely.

---

## 2. Performance Budgets & Targets

### Memory Budgets by Device Tier

| Device Tier | RAM | Foreground Budget | Background Budget | Image Cache |
|-------------|-----|-------------------|-------------------|-------------|
| Low-end Android (2GB) | 2GB | 80-120MB | 30-50MB | 20MB |
| Mid-range Android (4GB) | 4GB | 150-200MB | 50-80MB | 40MB |
| High-end Android (8GB+) | 8-12GB | 250-350MB | 80-120MB | 80MB |
| iPhone SE/older (3GB) | 3GB | 120-180MB | 40-55MB | 30MB |
| iPhone 15/16 (6GB) | 6GB | 250-400MB | 55-80MB | 60MB |

### Battery Drain Targets

| Scenario | Target | Unacceptable |
|----------|--------|-------------|
| Active foreground | < 5%/hr | > 10%/hr |
| Background sync | < 0.5%/hr | > 2%/hr |
| Idle | < 0.1%/hr | > 1%/hr |
| Wake locks per 24h | < 30 min cumulative | > 2 hours |
| GPS active | < 8%/hr | > 15%/hr |

### Memory Leak Thresholds

| Metric | Acceptable | Warning | Critical |
|--------|-----------|---------|----------|
| Leak rate | < 5 KB/min | 5-20 KB/min | > 20 KB/min |
| Retained objects after nav | 0 | 1-3 | > 3 |
| Heap growth per session | < 10% | 10-30% | > 30% |

---

## 3. Measurement & Profiling

**Android Studio Memory Profiler:** Live allocation tracking, heap dumps, GC event visualization, native memory tracking (API 26+). CLI: `adb shell dumpsys meminfo com.example.app` shows PSS, Private Dirty, Heap Alloc.

**LeakCanary 2.14 (Square):** Auto-detects leaks of Activity, Fragment, View, ViewModel, Service. Zero code changes — auto-initializes via classpath. For CI: `leakcanary-android-instrumentation` artifact provides `FailTestOnLeakRunListener` that fails tests on confirmed leaks.

```kotlin
// Debug-only: debugImplementation("com.squareup.leakcanary:leakcanary-android:2.14")
// CI tests: androidTestImplementation("com.squareup.leakcanary:leakcanary-android-instrumentation:2.14")
```

**Xcode Instruments (iOS):** Allocations (object lifetimes, "Mark Generation" for delta analysis), Leaks (retain cycle detection), Zombies (use-after-free). Memory Graph Debugger shows visual reference graphs with purple marks on retain cycles. CLI: `leaks`, `heap`, `vmmap` for `.memgraph` analysis.

**iOS Energy Impact:** Xcode gauge shows CPU, GPU, network, location, background cost (Low/High/Very High). MetricKit delivers daily production diagnostics (memory peak, CPU time, hang rate).

**Battery Historian (Android):** `adb bugreport bugreport.zip` — timeline of wake locks, jobs, alarms, network, GPS, screen, CPU state.

**Flutter DevTools:** Memory tab shows Dart heap, external allocations, RSS, GC events. "Diff Snapshots" identifies accumulated objects between actions. Dart 3.5 (2025) optimized GC further.

**React Native / Hermes:** Chrome DevTools heap snapshots. Hermes provides ~30% cold-start improvement over JSC via bytecode precompilation. Flipper for real-time monitoring.

---

## 4. Common Bottlenecks

### Memory (8 critical bottlenecks)

1. **Bitmap blowout:** One uncompressed 12MP photo = 48MB. Ten images without downsampling = 480MB = OOM. Glide auto-downsamples: 1000px image in 200px view = 0.15MB vs 3.8MB.
2. **Activity/Context leaks:** Static or singleton references prevent GC of the entire Activity tree (5-50MB per leak). The #1 Android memory leak source.
3. **Retain cycles (iOS):** Two objects with mutual strong references prevent ARC deallocation. Common in delegates, closures, parent-child VCs.
4. **Unbounded caches:** `HashMap`/`Dictionary` without size limits grows indefinitely. Always use `LruCache`/`NSCache`.
5. **Navigation stack accumulation:** 20+ screens deep = 200-400MB. Use `popUpTo(inclusive=true)` or limit stack depth.
6. **WebView:** 30-80MB per instance. Explicit `destroy()` required on Android — not released when removed from hierarchy.
7. **Subscription leaks:** RxJava Disposable, Flow collectors, Combine AnyCancellable not cancelled on lifecycle events.
8. **Uncompressed asset loading:** A 50MB JSON parsed into objects expands to 200-300MB due to object overhead.

### Battery (9 critical bottlenecks)

9. **Excessive wake locks:** `PARTIAL_WAKE_LOCK` keeps CPU running. Google threshold: >2h/24h = "excessive" = Play Store warning.
10. **Continuous GPS:** HIGH_ACCURACY = 30-50mA. At 1s intervals = ~10% battery/hr. BALANCED_POWER at 30s = ~2%/hr.
11. **Polling vs push:** 30s polling keeps radio perpetually active (20s tail time per request). FCM/APNs use 5-10x less power.
12. **Fragmented network requests:** Each request wakes radio from idle (50ms, 2W) + 20s high-power tail. 100 small requests/min = radio never idles. Batching into 5-10 requests saves 80%.
13. **Sensor oversampling:** Accelerometer at FASTEST (~200Hz) = 10-15mA. SENSOR_DELAY_NORMAL (~5Hz) = 2-3mA (70% reduction).
14. **Background video/audio processing:** Full CPU core = 500-1500mA. Defer to charging state.
15. **GPU overdraw:** 3x overdraw = GPU processes each pixel 3 times. Reducing 3x to 1x cuts GPU power 50-60%.
16. **Foreground service abuse:** Prevents Doze; 3-5% battery/hr even when idle.
17. **Unthrottled analytics:** Each event = radio wake. Batch 20 events or flush every 60s.

---

## 5. Optimization Patterns

### Memory

**Object pooling** — Reuse bitmaps, buffers, view holders instead of allocating new ones. Eliminates GC pressure.

**Image right-sizing** — Decode at target display size: `inSampleSize=16` reduces 48MB image to 0.19MB (99.6% reduction).

**Weak references** — Break retain cycles: `[weak self]` in Swift closures, `WeakReference<T>` in Kotlin.

**Bounded caches** — Android: `LruCache` at 1/8 of `Runtime.maxMemory()`. iOS: `NSCache` with `totalCostLimit` (auto-evicts under memory pressure).

**Lazy loading** — Defer heavy initialization with `by lazy` (Kotlin), lazy properties (Swift). Feature modules loaded on demand.

**Struct vs class (iOS)** — Small structs (<16 bytes) pass in registers with zero ARC overhead. Large shared state belongs in classes.

### Battery

**Batch network requests** — Group small requests into fewer transfers. Reduces radio active time from 33 min/hr to 2 min/hr (94% reduction).

**Doze/App Standby compliance** — Use `WorkManager` with constraints (`setRequiresBatteryNotLow`, `setRequiredNetworkType`). Minimum interval: 15 minutes.

**Location optimization** — Use `BALANCED_POWER_ACCURACY` with 30s intervals (Android), `significantLocationChanges` (iOS). Switch to HIGH_ACCURACY only during active navigation.

**Sensor management** — Use `SENSOR_DELAY_NORMAL`; unregister all sensors in `onPause`/`onStop`.

**Background scheduling** — iOS: `BGTaskScheduler` with `requiresExternalPower = true` for heavy work. Android: `WorkManager` replaces AlarmManager and JobScheduler.

---

## 6. Anti-Patterns

### Memory Anti-Patterns

| # | Anti-Pattern | Impact | Fix |
|---|-------------|--------|-----|
| 1 | Caching everything in HashMap | Unbounded growth to 500MB+ | `LruCache`/`NSCache` at 1/8 heap |
| 2 | Not releasing resources in onPause | Camera, sensors, bitmaps held while backgrounded | Release in onPause, re-acquire in onResume |
| 3 | Static Activity/Context references | 5-50MB leaked per instance | Use ApplicationContext or WeakReference |
| 4 | Loading full-resolution images | 48MB per 12MP image | Downsample with Glide/Coil size targets |
| 5 | Anonymous inner classes capturing outer | Implicit strong reference to Activity | Static inner class + WeakReference |
| 6 | Not cancelling async operations | Coroutines/Rx/Combine keep references alive | viewModelScope, CompositeDisposable, lifecycle |
| 7 | Deep navigation stacks | 200-400MB for 20+ screens | popUpTo with inclusive=true |
| 8 | String concatenation in loops | N iterations = N String objects | StringBuilder or joinToString |
| 9 | Autoboxing in collections | List<Integer> = 16 bytes/element overhead | SparseIntArray, IntArray |
| 10 | Not calling WebView.destroy() | 30-80MB retained after removal | Explicit destroy() and null reference |

### Battery Anti-Patterns

| # | Anti-Pattern | Impact | Fix |
|---|-------------|--------|-----|
| 1 | Polling every N seconds | Radio never idles; 5-10x waste | FCM/APNs push notifications |
| 2 | GPS at HIGH_ACCURACY always | ~10% battery/hr | BALANCED_POWER; stop when not navigating |
| 3 | Wake locks without timeout | CPU never sleeps on exception | acquire(timeoutMs) + try/finally |
| 4 | AlarmManager for periodic work | Bypasses Doze | Migrate to WorkManager |
| 5 | Foreground service for non-essential work | Prevents Doze; 3-5%/hr idle drain | WorkManager for deferrable tasks |
| 6 | Animations while backgrounded | CPU/GPU active for invisible UI | Pause in onPause/viewDidDisappear |
| 7 | Unthrottled analytics | Each event = radio wake | Batch 20 events or flush every 60s |
| 8 | Continuous BT/WiFi scanning | 50-100mA | Scan every 30-60s; stop when found |
| 9 | setExactRepeating for syncs | Prevents OS batching | setInexactRepeating |
| 10 | Downloading on cellular | 200-800mA vs WiFi 50-200mA | NetworkType.UNMETERED constraint |

---

## 7. Architecture-Level Decisions

**On-demand loading:** Shell app (8-15MB) with lazy feature modules. Register for `onTrimMemory(TRIM_MEMORY_RUNNING_LOW)` / `didReceiveMemoryWarning` to proactively release caches. Dynamic Feature Modules (Android) and on-demand resources (iOS) report 30-50% base memory reduction.

**Data lifecycle:** Parse API responses into models, immediately release raw buffers. Keep only current screen's data in memory; persist rest to database. Use cursor pagination (LIMIT/OFFSET). Set TTL on all cache entries. On memory warning: drop all caches, keep only nav state.

**WorkManager vs AlarmManager:** WorkManager is the default choice — Doze-compatible, full constraint support, task chaining, guaranteed execution, 15-min minimum interval. AlarmManager only for exact-time requirements (alarms, reminders). Never use AlarmManager for syncing.

**Image pipeline:** Request -> Memory LRU (1/8 heap) -> Disk cache (50-100MB) -> Network fetch + downsample -> Store in both caches. Libraries: Coil/Glide (Android), Kingfisher/SDWebImage (iOS), cached_network_image (Flutter), react-native-fast-image (RN).

**Flutter architecture:** Dart's generational GC: New Generation (short-lived, frequent collection) and Old Generation (long-lived, infrequent). Dispose all controllers in `dispose()`. Cancel all StreamSubscriptions and Timers. Use `compute()` for heavy work (isolate). Dart 3.5 (2025) optimizes allocation and GC.

**React Native new architecture:** JSI eliminates bridge serialization (~1ms -> ~0.01ms per call). TurboModules lazy-load (save 10-30MB startup memory). Hermes bytecode precompilation reduces memory baseline 20-30% vs JSC.

---

## 8. Testing & Regression Prevention

**Android Macrobenchmark:** `MemoryUsageMetric(Mode.Max)` captures peak memory during instrumented user flows. Run in CI against baseline.

**iOS XCTest:** `XCTMemoryMetric` and `XCTCPUMetric` in `measure(metrics:)` blocks. Assert peak memory stays within budget.

**LeakCanary in CI:** `FailTestOnLeakRunListener` fails instrumentation tests on confirmed leaks. Catches regressions before production.

**iOS MetricKit:** `MXMetricManagerSubscriber` delivers daily production payloads — memory peak, CPU time, hang rate. Track Jetsam terminations via `MXDiagnosticPayload.crashDiagnostics`.

**Android Vitals:** Tracks excessive wake locks, background WiFi scans, stuck partial wake locks, background cellular usage. Alerts at bad-behavior thresholds.

### Regression Thresholds

| Metric | Warning | Fail |
|--------|---------|------|
| Peak memory vs baseline | +15% | +30% |
| Memory after GC vs baseline | +10% | +20% |
| Leaked objects per test | 1 | 3+ |
| Battery drain vs baseline | +20% | +40% |
| Wake lock duration vs baseline | +25% | +50% |

---

## 9. Decision Trees

### "My App Uses Too Much Memory"

```
Is peak memory high on fresh launch?
  YES -> Loading all features at startup? -> Lazy loading / dynamic features (30-50% savings)
       -> Large assets at startup? -> Defer loading; use placeholders (20-40MB savings)
  NO  -> Memory grows during usage?
         Does memory recover after navigating back?
           NO  -> MEMORY LEAK:
                   Android: LeakCanary -> static refs, uncancelled coroutines, inner classes
                   iOS: Memory Graph -> retain cycles (purple !), uncancelled Combine
                   Flutter: DevTools Diff -> undisposed controllers, active streams
           YES -> High transient usage:
                   Images? -> Downsample + LRU cache (90%+ reduction per image)
                   Data objects? -> Pagination; reduce page size (60-80% reduction)
                   WebView? -> Limit to 1; call destroy() on dismiss (30-80MB savings)
         Memory stable but too high?
           -> Check cache sizes (image > 1/8 heap?), duplicate data across caches
```

### "My App Drains Battery"

```
Foreground or background drain?
  FOREGROUND:
    CPU > 30% sustained? -> Profile hot functions; offload to background thread
    CPU < 30%? -> Check GPU overdraw (Debug GPU Overdraw: target blue/1x, no red/4x)
    Network: many small requests? -> Batch. Polling? -> WebSocket/push.
    Location: HIGH_ACCURACY always? -> BALANCED_POWER when not navigating
  BACKGROUND:
    Wake locks > 2h/24h? -> Add timeout: acquire(10*60*1000L), use try/finally
    Using AlarmManager for sync? -> Migrate to WorkManager
    Foreground service without user task? -> Convert to WorkManager
    GPS in background? -> significantLocationChanges (iOS) / geofencing (Android)
    Sensors polling? -> Unregister all in onPause/onStop
```

---

## 10. Code Examples

### Ex 1: Image Loading (Android) — 960MB -> 45MB

```kotlin
// BEFORE: Full-resolution decode. 48MB/image x 20 = 960MB -> OOM
holder.imageView.setImageBitmap(BitmapFactory.decodeFile(path))

// AFTER: Coil with size constraints. 0.2MB/image x 20 = 4MB
holder.imageView.load(path) { size(200, 200); memoryCachePolicy(CachePolicy.ENABLED) }
```

### Ex 2: Coroutine Leak (Kotlin) — 750MB leaked -> 0

```kotlin
// BEFORE: GlobalScope survives ViewModel destruction — 15MB leaked per recreation
GlobalScope.launch { repository.dataFlow.collect { _uiState.value = it } }

// AFTER: Auto-cancelled on onCleared()
viewModelScope.launch { repository.dataFlow.collect { _uiState.value = it } }
```

### Ex 3: Retain Cycle (Swift) — 240MB leaked -> 0

```swift
// BEFORE: Strong capture creates retain cycle — 12MB leaked per dismiss
networkManager.onDataReceived = { data in self.updateUI(with: data) }

// AFTER: Weak capture breaks cycle
networkManager.onDataReceived = { [weak self] data in self?.updateUI(with: data) }
```

### Ex 4: Wake Lock Safety (Android) — 45min/day -> 8min/day

```kotlin
// BEFORE: No timeout, no guaranteed release. CPU never sleeps on exception.
wakeLock.acquire(); doWork(); wakeLock.release()

// AFTER: Timeout + try/finally
wakeLock.acquire(10 * 60 * 1000L)  // 10-min max
try { doWork() } finally { if (wakeLock.isHeld) wakeLock.release() }
```

### Ex 5: Network Batching (Android) — 33min radio/hr -> 2min/hr

```kotlin
// BEFORE: 100 individual events/hr = radio never idles
fun trackEvent(event: Event) { api.sendEvent(event) }

// AFTER: Batch 20 events, flush via WorkManager every 15 min
fun trackEvent(event: Event) {
    synchronized(buffer) { buffer.add(event); if (buffer.size >= 20) flush() }
}
```

### Ex 6: Flutter Controller Disposal — 100MB leaked -> 0

```dart
// BEFORE: Missing dispose() — controllers, streams, timers all leak
// AFTER: Explicit cleanup
@override
void dispose() {
    _animController.dispose();  // Native animation resources
    _dataSub.cancel();          // Stream listener
    _pollingTimer?.cancel();    // Timer
    super.dispose();
}
```

### Ex 7: iOS autoreleasepool — 4.8GB peak -> 2MB

```swift
// BEFORE: 10,000 images in loop — all temporaries retained until function returns
for path in imagePaths { let img = UIImage(contentsOfFile: path)!; process(img) }

// AFTER: autoreleasepool drains each iteration
for path in imagePaths { autoreleasepool { let img = UIImage(contentsOfFile: path)!; process(img) } }
```

### Ex 8: React Native FlatList — OOM at 500 items -> stable at 10,000+

```javascript
// BEFORE: ScrollView renders ALL items (1000 x 2MB = 2GB -> crash)
<ScrollView>{items.map(i => <Card key={i.id} data={i} />)}</ScrollView>

// AFTER: FlatList virtualizes — only visible items rendered (~20-30MB stable)
<FlatList data={items} renderItem={({item}) => <Card data={item} />}
  windowSize={5} maxToRenderPerBatch={10} removeClippedSubviews={true} />
```

### Ex 9: Location Power (iOS) — 10%/hr -> 1%/hr

```swift
// BEFORE: Continuous HIGH_ACCURACY — 30-50mA
manager.desiredAccuracy = kCLLocationAccuracyBest; manager.startUpdatingLocation()

// AFTER: Significant-change monitoring — cell tower based, very low power
manager.startMonitoringSignificantLocationChanges()
manager.desiredAccuracy = kCLLocationAccuracyHundredMeters; manager.distanceFilter = 50
```

---

## 11. Quick Reference

| Action | Android | iOS | Flutter | React Native |
|--------|---------|-----|---------|-------------|
| **Profiler** | Studio Memory Profiler | Instruments Allocations | DevTools Memory | Flipper / Hermes |
| **Leak detector** | LeakCanary 2.14 | Memory Graph Debugger | DevTools Diff | Chrome DevTools heap |
| **Bounded cache** | `LruCache` (1/8 heap) | `NSCache` (auto-evict) | Cache with maxSize | WeakMap + manual LRU |
| **Image loader** | Coil / Glide | Kingfisher / SDWebImage | cached_network_image | fast-image |
| **Lifecycle cleanup** | onCleared / onDestroy | deinit / viewDidDisappear | dispose() | useEffect cleanup |
| **Weak ref** | WeakReference\<T\> | weak var / unowned | N/A (GC handles) | WeakRef / WeakMap |
| **Memory warning** | onTrimMemory(level) | didReceiveMemoryWarning | didHaveMemoryPressure | AppState + native |
| **Bg scheduler** | WorkManager | BGTaskScheduler | — | — |
| **Push** | FCM | APNs | firebase_messaging | @react-native-firebase |
| **Location (efficient)** | BALANCED_POWER + 30s | significantLocationChanges | geolocator | react-native-geolocation |

### Critical Thresholds

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Foreground memory | < budget | +20% | +50% |
| Leak rate | 0 KB/min | < 10 KB/min | > 20 KB/min |
| Battery (active) | < 5%/hr | 5-10%/hr | > 10%/hr |
| Battery (background) | < 0.5%/hr | 0.5-2%/hr | > 2%/hr |
| Wake locks (24h) | < 30 min | 30min-2hr | > 2 hr |
| Radio active time | < 5 min/hr | 5-15 min/hr | > 15 min/hr |
| Retained objects post-nav | 0 | 1-3 | > 3 |

---

## Sources

- [Android — Manage your app's memory](https://developer.android.com/topic/performance/memory)
- [Android — Low Memory Killer](https://developer.android.com/topic/performance/vitals/lmk)
- [Android — Excessive partial wake locks](https://developer.android.com/topic/performance/vitals/excessive-wakelock)
- [Android — Doze and App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)
- [Android — App Standby Buckets](https://developer.android.com/topic/performance/appstandby)
- [Android — WorkManager](https://developer.android.com/topic/libraries/architecture/workmanager)
- [Android Blog — Battery Technical Quality Enforcement (March 2026)](https://android-developers.googleblog.com/2026/03/battery-technical-quality-enforcement.html)
- [Android Blog — Wake Lock Usage Guide](https://android-developers.googleblog.com/2025/09/guide-to-excessive-wake-lock-usage.html)
- [Apple — Jetsam event reports](https://developer.apple.com/documentation/xcode/identifying-high-memory-use-with-jetsam-event-reports)
- [Apple — iOS Memory Deep Dive (WWDC18)](https://developer.apple.com/videos/play/wwdc2018/416/)
- [Apple — Detect and diagnose memory issues (WWDC21)](https://developer.apple.com/videos/play/wwdc2021/10180/)
- [Apple — Analyze heap memory (WWDC24)](https://developer.apple.com/videos/play/wwdc2024/10173/)
- [LeakCanary — Official Documentation](https://square.github.io/leakcanary/)
- [Dropbox — Detecting memory leaks in Android](https://dropbox.tech/mobile/detecting-memory-leaks-in-android-applications)
- [iOS Memory Management 2025](https://www.alimertgulec.com/en/blog/ios-memory-management-performance-2025)
- [Flutter Memory Management Guide 2025](https://devalflutterdev.in/blog/flutter-memory-management-guide/)
- [Dart Garbage Collection](https://fluttermasterylibrary.com/6/11/4/4/)
- [React Native Performance 2025](https://danielsarney.com/blog/react-native-performance-optimization-2025-making-mobile-apps-fast/)
- [React Native New Architecture Performance](https://dev.to/amazonappdev/how-does-react-natives-new-architecture-affect-performance-1dkf)
- [BrowserStack — Battery Usage Metric](https://www.browserstack.com/docs/app-performance/app-performance-guides/android/battery-usage)
- [TestDevLab — Battery Consumption Testing](https://www.testdevlab.com/blog/how-we-test-mobile-app-battery-usage)
- [Pcloudy — Battery Drain Testing](https://www.pcloudy.com/blogs/battery-drain-testing-for-mobile-apps/)
- [Android Image Loaders 2025](https://redwerk.com/blog/android-image-loaders-in-2025-picasso-vs-glide-vs-fresco/)
- [Scalosoft — Mobile Performance 2025](https://www.scalosoft.com/blog/mobile-app-performance-optimization-best-practices-for-2025/)
- [Bugfender — Android Performance](https://bugfender.com/blog/android-app-performance/)
