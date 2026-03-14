# Flutter Performance — Performance Expertise Module

> Flutter renders at 60/120fps using its own rendering engine (Impeller/Skia). Performance issues manifest as dropped frames (jank), excessive memory usage, slow startup, and shader compilation stutters. Understanding Flutter's rendering pipeline — build, layout, paint, composite — is key to building smooth apps.

> **Impact:** Critical
> **Applies to:** Mobile (iOS, Android), Web, Desktop
> **Key metrics:** Frame render time (<16ms for 60fps, <8.3ms for 120fps), Startup time, Memory usage, Shader compilation time

---

## Why This Matters

Flutter owns the entire rendering pipeline — every pixel is drawn by its engine, not platform widgets. Performance mistakes translate directly to visible jank.

- At 60fps each frame must complete in **16.67ms**; at 120fps the budget is **8.33ms**.
- Users perceive jank at as few as 3-5 dropped frames in sequence.
- Shader compilation on first run can spike frame time from 16ms to **90-300ms**, dropping FPS to 6.
- Cold startup >4s correlates with 25% higher abandonment on mobile.
- A production e-commerce app cut frame drops from 12% (Skia) to 1.5% (Impeller).
- One startup reduced app size from 45MB to 32MB and startup from 2.5s to 1.3s via tree-shaking.

Flutter's four rendering phases each have distinct performance characteristics:
1. **Build** — constructs widget tree (Dart, UI thread)
2. **Layout** — calculates sizes and positions (RenderObject tree)
3. **Paint** — records drawing commands (Layer tree)
4. **Composite** — sends layers to GPU (Raster thread)

Profiling must distinguish build-phase bottlenecks (CPU, UI thread) from paint/raster bottlenecks (GPU, raster thread).

---

## Performance Budgets & Targets

| Display Rate | Frame Budget | Build Target | Paint Target |
|-------------|-------------|-------------|-------------|
| 60 Hz | 16.67ms | <8ms | <8ms |
| 90 Hz | 11.11ms | <6ms | <5ms |
| 120 Hz | 8.33ms | <4ms | <4ms |

| Metric | Good | Acceptable | Needs Work |
|--------|------|------------|------------|
| Cold start (release) | <2s | 2-4s | >4s |
| Warm start | <1s | 1-2s | >2s |
| Memory (typical) | <150MB | 150-300MB | >300MB |
| Memory (low-end 2GB) | <80MB | 80-120MB | >120MB |
| App size Android APK | <20MB | 20-40MB | >40MB |
| App size iOS IPA | <30MB | 30-60MB | >60MB |

---

## Measurement & Profiling

**Golden rule:** Always profile in **profile mode** (`flutter run --profile`). Debug mode includes assertions and disables AOT — its numbers are meaningless.

**Performance Overlay** — fastest check. Two graphs: UI thread (top) and Raster thread (bottom). Green = within budget, Red = over budget.
```dart
MaterialApp(showPerformanceOverlay: true);
```

**DevTools Timeline** — frame-by-frame build/layout/paint durations. Enable "Track Widget Builds" for widget-level granularity. Flame chart shows exact rebuild hierarchy.

**CPU Profiler** — bottom-up view finds hottest functions; call-tree view traces the call hierarchy.

**Memory View** — heap snapshots, allocation tracking, GC timeline. Diff two snapshots to find leaks (objects persisting when they should not).

**Programmatic tracing:**
```dart
import 'dart:developer';
Timeline.startSync('ExpensiveOp');
// ... work ...
Timeline.finishSync();
```

**Integration test profiling** produces `timeline_summary.json` with `average_frame_build_time_millis`, `worst_frame_build_time_millis`, `missed_frame_build_budget_count`:
```bash
flutter test integration_test/perf_test.dart --profile
```
Gate CI on `average_frame_build_time_millis < 16`.

---

## Common Bottlenecks

### 1. Missing const Constructors
Without `const`, every child is reconstructed on parent rebuild even if unchanged. Adding const where applicable reduces rebuild work by **40-60%** in a typical 50-widget screen.

### 2. setState at Too High a Level
Calling `setState()` on a Scaffold-level widget rebuilds hundreds of descendants. Push state to the smallest widget that needs it. Reducing scope from full-screen to single counter: **12ms to <1ms** rebuild.

### 3. Expensive build() Methods
Computation, sorting, filtering inside `build()` is amplified 60x/second during animations. Move to `initState()` or state management layer.

### 4. ListView Instead of ListView.builder
Default `ListView` instantiates all children eagerly. 10,000 items: **~2,000ms** initial build. `ListView.builder`: **~16ms** (only visible items constructed).

### 5. Shader Compilation Jank
First-use shader compilation costs **90-300ms** on older devices. SkSL warmup reduced worst-frame on Moto G4 from ~90ms to ~40ms, iPhone 4s from ~300ms to ~80ms. **Impeller** (default since Flutter 3.22+) eliminates this entirely by pre-compiling all shaders at build time.

### 6. Large Unresized Images
A 4000x3000 image decoded at full resolution uses **~48MB**. At display size (400x300) it uses **~480KB** — 100x reduction. Use `cacheWidth`/`cacheHeight`.

### 7. Blocking Main Isolate
JSON parsing of 2MB response takes ~50-200ms synchronously. On background isolate: zero frame drops.

### 8. Platform Channel Overhead
Each MethodChannel call has ~0.01-0.1ms serialization overhead. Fine for <10 calls/second; for >100/second use Dart FFI (~0.001ms per call).

### 9. FutureBuilder Without Cached Future
Creating a Future inside `build()` restarts the async operation on every rebuild — observed 4x duplicate API calls per screen. Store the Future in `initState()`.

### 10. Unoptimized Animations
Using `setState()` in animation ticks rebuilds entire subtrees 60x/second. Use `AnimatedBuilder` with `child` parameter.

### 11. Excessive Widget Nesting
Trees >30 levels deep increase traversal cost for build, layout, and hit-testing. Flatten with `Container` (combines padding/decoration/alignment).

### 12. Undisposed Controllers
AnimationControllers, StreamSubscriptions, Timers not disposed in `dispose()` leak memory and consume CPU after widget removal.

### 13. Helper Methods Instead of Widget Extraction
Helper methods (`Widget _buildHeader()`) cannot use `const`, always rebuild with parent, and prevent framework optimizations. Extract to separate widget classes.

### 14. Opacity Widget for Hiding
`Opacity` forces painting into an intermediate buffer even at 0.0. Use `Visibility` or conditionally remove from tree.

### 15. Monolithic State Subscriptions
Single giant Provider where every widget listens to entire state. A change to any field rebuilds all listeners. Split into granular providers; use `select()`.

---

## Optimization Patterns

### 1. const Constructors
```dart
// BEFORE: Rebuilt every parent rebuild
Icon(Icons.star, color: Colors.yellow, size: 24),
// AFTER: Instantiated once, reused
const Icon(Icons.star, color: Colors.yellow, size: 24),
```
**Impact:** 50-widget screen rebuild: **8ms to 3ms** (62% reduction). Zero downside. Enable `prefer_const_constructors` lint.

### 2. Widget Extraction over Method Extraction
```dart
// ANTI-PATTERN: Helper method — rebuilds with parent
Widget _buildHeader() => Container(child: const Text('Header'));

// PATTERN: Extracted widget — const, independent rebuild cycle
class _Header extends StatelessWidget {
  const _Header();
  @override
  Widget build(BuildContext context) => Container(child: const Text('Header'));
}
```
**Impact:** 5 extracted sections: rebuild **6ms to 2ms**. Trade-off: more boilerplate per widget.

### 3. Isolate.run for Compute
```dart
// BEFORE: Blocks UI thread
final data = jsonDecode(response.body); // ~120ms, 7+ dropped frames

// AFTER: Background isolate
final data = await Isolate.run(() => jsonDecode(response.body)); // 0 dropped frames
```
**Threshold rule:** offload if task takes >16ms. Spawn overhead is ~5-20ms. For repeated tasks, use long-lived isolates.

### 4. ListView.builder with itemExtent
```dart
ListView.builder(
  itemCount: items.length,
  itemExtent: 72.0, // Skips per-item layout measurement
  itemBuilder: (context, index) => ListTile(title: Text(items[index].name)),
);
```
**Impact:** Reduces scroll jank by skipping layout calculation. Trade-off: requires uniform item height. Use `prototypeItem` for measured-once approach.

### 5. RepaintBoundary Placement
```dart
Column(children: [
  const Header(),
  RepaintBoundary(child: LiveChart()), // Repaints at 60fps without affecting Header
  const Footer(),
]);
```
**Impact:** Paint time **8ms to 2ms** for surrounding static widgets. Trade-off: each boundary allocates ~50-200KB GPU memory. Profile first; only use where paint frequency genuinely differs.

### 6. Image Optimization
```dart
CachedNetworkImage(
  imageUrl: url,
  memCacheWidth: 400, memCacheHeight: 300, // Decode at display size
);
```
**Impact:** 20-image grid memory: **960MB to 9.6MB** (100x reduction). No OOM crashes on 2GB devices.

### 7. AnimatedBuilder with child
```dart
AnimatedBuilder(
  animation: _controller,
  child: const Column(children: [Icon(Icons.refresh), Text('Loading')]), // Built once
  builder: (context, child) => Transform.rotate(
    angle: _controller.value * 2 * pi, child: child, // Reused each frame
  ),
);
```
**Impact:** Per-frame build: **4ms to 0.3ms**. Over 1-second animation: **222ms saved**.

### 8. Shader Warmup / Impeller
```bash
# Legacy (Skia): capture and bundle shaders
flutter run --profile --cache-sksl  # Press M to save
flutter build apk --bundle-sksl-path=flutter_01.sksl.json

# Modern: Impeller (default Flutter 3.22+) — no warmup needed
flutter run --enable-impeller  # Explicit opt-in on older versions
```
**Impact:** Impeller: 50% faster rasterization, consistent 120fps, frame drops 12% to 1.5%.

### 9. Selective State Rebuilds
```dart
// BEFORE: All 3 widgets rebuild when any field changes
Consumer<AppState>(builder: (_, state, __) => Column(children: [
  Text('${state.count}'), Text(state.name), UserAvatar(url: state.avatar),
]));

// AFTER (Riverpod): Each rebuilds only when its data changes
Text('${ref.watch(appStateProvider.select((s) => s.count))}'),
```
**Impact:** Dashboard with 20 fields: **10-20x rebuild reduction** with selectors.

### 10. Deferred Loading
```dart
import 'package:my_app/analytics.dart' deferred as analytics;
Future<void> openAnalytics() async {
  await analytics.loadLibrary(); // ~100-500ms first access
  navigator.push(MaterialPageRoute(builder: (_) => analytics.AnalyticsPage()));
}
```
**Impact:** Web initial bundle 3.2MB to 1.1MB. Cold startup decreased ~40%.

---

## Anti-Patterns

| Anti-Pattern | Why Wrong | Fix |
|-------------|-----------|-----|
| `Opacity(opacity: 0)` to hide | Forces intermediate buffer paint; child still in layout/hit-test | `Visibility` or conditional removal |
| Future created in `build()` for FutureBuilder | Restarts async op every rebuild; 4x duplicate API calls | Create Future in `initState()`, store as field |
| Helper methods instead of widgets | Cannot use const; always rebuild with parent | Extract to `StatelessWidget` classes |
| AnimatedBuilder without `child` | Entire subtree rebuilt 60x/second | Pass static subtree as `child` parameter |
| Missing Keys in dynamic lists | State jumps between items on reorder; forced full rebuilds | `ValueKey(item.id)` with stable identifier |
| Monolithic global state | Every change rebuilds every listener | Split providers; use `select()` |
| Excessive RepaintBoundary | Each allocates GPU layer (~50-200KB); overhead if parent/child always repaint together | Profile first; verify improvement in DevTools |
| Undisposed controllers | Memory leaks, phantom state updates, CPU waste | Call `.dispose()` / `.cancel()` in `dispose()` |
| Sync I/O in `build()` | Blocks UI thread; even 5ms pushes frame over budget | Load async in `initState()`, cache results |
| `setState()` as blunt-force rebuild | Rebuilds entire subtree when only small part changed | Push state down; use ValueListenableBuilder |

---

## Architecture-Level Decisions

### State Management Performance

| Solution | Rebuild Granularity | Overhead | Best For |
|----------|-------------------|----------|----------|
| Provider | Medium (manual Selector) | Low | Simple apps |
| Riverpod | High (compile-safe, lazy, auto-dispose) | Low | Most apps (best default) |
| Bloc | High (buildWhen, BlocSelector) | Medium (streams) | Complex, strict architecture |
| GetX | Low (hard to scope) | Low | Prototypes only |

Riverpod and Bloc both achieve fine-grained rebuilds. Riverpod has lower overhead (lazy evaluation). Bloc has more predictable state transitions but more stream management overhead.

### Platform Channels vs FFI

| Approach | Overhead/call | Use when |
|----------|--------------|----------|
| MethodChannel/Pigeon | ~0.01-0.1ms | Occasional calls (<10/s) |
| EventChannel | Same per msg | Continuous streams (sensors) |
| Dart FFI | ~0.001ms | High-frequency (>100/s), compute-heavy |

---

## Testing & Regression Prevention

### Integration Test Profiling
```dart
final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
testWidgets('scroll perf', (tester) async {
  await tester.pumpWidget(const MyApp());
  await binding.traceAction(() async {
    await tester.fling(find.byType(ListView), const Offset(0, -3000), 5000);
    await tester.pumpAndSettle();
  }, reportKey: 'scroll_timeline');
});
```

### CI Performance Gates
```yaml
# Extract metrics from timeline_summary.json
- run: |
    AVG=$(jq '.average_frame_build_time_millis' build/timeline_summary.json)
    WORST=$(jq '.worst_frame_build_time_millis' build/timeline_summary.json)
    if (( $(echo "$AVG > 8" | bc -l) )); then echo "FAIL: avg ${AVG}ms > 8ms"; exit 1; fi
    if (( $(echo "$WORST > 32" | bc -l) )); then echo "FAIL: worst ${WORST}ms > 32ms"; exit 1; fi
```

### Memory Leak Testing
```dart
testWidgets('no leaks', experimentalLeakTesting: LeakTesting.settings, (tester) async {
  await tester.pumpWidget(const MaterialApp(home: ProductPage()));
  await tester.pumpWidget(const MaterialApp(home: SizedBox())); // triggers dispose
  // leak_tracker asserts no retained objects
});
```

---

## Decision Trees

### "My App is Janky"
```
First run only? → Shader jank → Use Impeller (or SkSL warmup for Skia)
Persistent? → Enable performance overlay →
  Top graph red (UI thread)? → Build/layout issue →
    Many widgets rebuilding? → Add const, extract widgets, scope setState
    build() doing computation? → Move to initState/Isolate
    Layout slow? → Simplify nesting, add itemExtent
  Bottom graph red (Raster thread)? → Paint/GPU issue →
    Using Opacity with fractional values? → Use FadeTransition
    Large images? → Add cacheWidth/cacheHeight
    Complex CustomPaint? → Add RepaintBoundary
    saveLayer calls? → Minimize ClipRRect, BackdropFilter
  Neither red? → Not rendering issue →
    Check main isolate blocking (network, DB, file I/O)
    Check excessive platform channel calls
```

### "Should I Use an Isolate?"
```
Task duration <1ms? → No, overhead not justified
1-16ms? → Only if it pushes total frame time over budget
16-100ms? → Yes, use Isolate.run()
>100ms? → Yes, Isolate.run() or long-lived isolate

Repeated operation? → One-off: Isolate.run(). Frequent (>1/s): long-lived isolate
Large data transfer? → >1MB: use TransferableTypedData for zero-copy
```

---

## Code Examples

### 1. setState Scope Reduction
```dart
// BEFORE: setState rebuilds entire screen (~12ms build time)
class ProductScreen extends StatefulWidget {
  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  int _qty = 1;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(children: [
        const ProductImage(),       // Rebuilt unnecessarily
        const ProductDescription(), // Rebuilt unnecessarily
        Text('Qty: $_qty'),
        ElevatedButton(
          onPressed: () => setState(() => _qty++),
          child: const Text('Add'),
        ),
      ]),
    );
  }
}

// AFTER: Only _QuantitySelector rebuilds (~0.5ms, 96% reduction)
class ProductScreen extends StatelessWidget {
  const ProductScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Column(children: [
        ProductImage(),
        ProductDescription(),
        _QuantitySelector(), // Isolated state — only this rebuilds
      ]),
    );
  }
}

class _QuantitySelector extends StatefulWidget {
  const _QuantitySelector();
  @override
  State<_QuantitySelector> createState() => _QuantitySelectorState();
}

class _QuantitySelectorState extends State<_QuantitySelector> {
  int _qty = 1;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Text('Qty: $_qty'),
      ElevatedButton(
        onPressed: () => setState(() => _qty++),
        child: const Text('Add'),
      ),
    ]);
  }
}
```
**Measured:** Build time per setState: **12ms to 0.5ms** (96% reduction).

### 2. Proper FutureBuilder Usage
```dart
// BEFORE: Future created in build() — 4x duplicate API calls, flickering UI
class UserProfile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: fetchUser(), // NEW Future every rebuild — triggers re-fetch
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const CircularProgressIndicator();
        return Text(snapshot.data!.name);
      },
    );
  }
}

// AFTER: Future cached in initState — 1 API call, stable UI
class UserProfile extends StatefulWidget {
  const UserProfile();
  @override
  State<UserProfile> createState() => _UserProfileState();
}

class _UserProfileState extends State<UserProfile> {
  late final Future<User> _userFuture;

  @override
  void initState() {
    super.initState();
    _userFuture = fetchUser(); // Called exactly once
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: _userFuture, // Same instance across all rebuilds
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const CircularProgressIndicator();
        return Text(snapshot.data!.name);
      },
    );
  }
}
```
**Measured:** API calls per screen: **4 to 1** (75% network reduction). Eliminates loading indicator flicker.

### 3. ListView.builder with itemExtent
```dart
// BEFORE: All 10,000 items built eagerly (~2,000ms initial render)
ListView(
  children: items.map((item) => ListTile(title: Text(item.name))).toList(),
);

// AFTER: Only visible items built (~16ms initial render)
ListView.builder(
  itemCount: items.length,
  itemExtent: 72.0, // Known height — framework skips per-item measurement
  itemBuilder: (context, index) {
    return ListTile(
      key: ValueKey(items[index].id), // Stable identity for reorder
      title: Text(items[index].name),
    );
  },
);
```
**Measured:** Initial build: **2,000ms to 16ms**. Scroll jank reduced by removing layout measurement per item.

### 4. Image Grid Optimization
```dart
// BEFORE: 20 full-resolution images = ~960MB (OOM crash on 2GB devices)
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2),
  itemCount: images.length,
  itemBuilder: (context, index) => Image.network(images[index].url),
);

// AFTER: Right-sized images with caching = ~9.6MB (100x reduction)
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2),
  itemCount: images.length,
  itemBuilder: (context, index) => CachedNetworkImage(
    imageUrl: images[index].url,
    memCacheWidth: 200,
    memCacheHeight: 200,
    placeholder: (_, __) => const ColoredBox(color: Colors.grey),
  ),
);
```
**Measured:** Memory for 20 images: **960MB to 9.6MB**. No OOM on low-end devices.

### 5. Isolate.run for JSON Parsing
```dart
// BEFORE: Main isolate blocked (~120ms for 2MB JSON, 7+ dropped frames)
Future<List<Product>> loadProducts() async {
  final response = await http.get(Uri.parse(apiUrl));
  final List<dynamic> data = jsonDecode(response.body); // Blocks UI thread
  return data.map((e) => Product.fromJson(e)).toList();
}

// AFTER: Background isolate — 0 dropped frames
Future<List<Product>> loadProducts() async {
  final response = await http.get(Uri.parse(apiUrl));
  return Isolate.run(() {
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => Product.fromJson(e)).toList();
  });
}
```
**Measured:** UI thread block: **120ms to 0ms**. Total time similar but entirely off the UI thread.

### 6. AnimatedBuilder with child Parameter
```dart
// BEFORE: Static subtree rebuilt 60x/second (~4ms per frame)
AnimatedBuilder(
  animation: _controller,
  builder: (context, child) {
    return Transform.rotate(
      angle: _controller.value * 2 * pi,
      child: Column(children: [
        const Icon(Icons.refresh, size: 48),
        const Text('Loading...'),
        const SizedBox(height: 16),
        const LinearProgressIndicator(),
      ]),
    );
  },
);

// AFTER: Static subtree built once, reused across frames (~0.3ms per frame)
AnimatedBuilder(
  animation: _controller,
  child: const Column(children: [
    Icon(Icons.refresh, size: 48),
    Text('Loading...'),
    SizedBox(height: 16),
    LinearProgressIndicator(),
  ]),
  builder: (context, child) {
    return Transform.rotate(
      angle: _controller.value * 2 * pi,
      child: child, // Reused — not rebuilt
    );
  },
);
```
**Measured:** Per-frame build: **4ms to 0.3ms**. Over a 1-second 60fps animation: **222ms total savings**.

### 7. Proper dispose() for Controllers
```dart
class AnimatedCard extends StatefulWidget {
  const AnimatedCard();
  @override
  State<AnimatedCard> createState() => _AnimatedCardState();
}

class _AnimatedCardState extends State<AnimatedCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final StreamSubscription<Data> _subscription;
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 1));
    _scrollController = ScrollController();
    _subscription = dataStream.listen((_) => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();       // Stop ticker, free resources
    _scrollController.dispose(); // Remove scroll listeners
    _subscription.cancel();      // Stop stream listener
    super.dispose();
  }

  @override
  Widget build(BuildContext context) { /* ... */ }
}
```
**Impact:** Prevents memory leaks, phantom state updates, and ticker-after-dispose crashes. Every controller/subscription/timer must have a matching dispose/cancel.

### 8. Shader Warmup and Impeller Migration
```bash
# LEGACY (Skia): Capture shaders during manual testing
flutter run --profile --cache-sksl
# Exercise all animations, transitions, and complex UI paths
# Press 'M' in terminal to save captured shaders

# Bundle captured shaders into release build
flutter build apk --bundle-sksl-path=flutter_01.sksl.json

# MODERN (Impeller, default Flutter 3.22+): No warmup needed
# All shaders pre-compiled at engine build time
# Verify Impeller is active — no --enable-impeller flag needed on latest Flutter
flutter run --profile
```
**Measured (SkSL):** Moto G4 worst-frame: **90ms to 40ms**. iPhone 4s: **300ms to 80ms**.
**Measured (Impeller):** Frame drops: **12% to 1.5%**. Rasterization **50% faster**. Consistent 120fps.

---

## Quick Reference

| Metric | Good | Acceptable | Needs Work |
|--------|------|------------|------------|
| Frame build time (60fps) | <8ms | 8-16ms | >16ms |
| Frame build time (120fps) | <4ms | 4-8ms | >8ms |
| Frame raster time | <8ms | 8-16ms | >16ms |
| Cold startup (release) | <2s | 2-4s | >4s |
| Memory (typical) | <150MB | 150-300MB | >300MB |
| App size (Android) | <20MB | 20-40MB | >40MB |
| Missed frames / 1000 | <5 | 5-20 | >20 |
| Shader compile | 0ms (Impeller) | <40ms (SkSL) | >80ms |

### Optimization Priority Order
1. **Measure first** — profile, do not guess
2. **Add const constructors** — highest ROI, zero downside
3. **Scope setState** — push state to smallest widget
4. **Use ListView.builder** — for lists >20 items
5. **Cache Futures** — never create in build()
6. **Offload to Isolates** — for tasks >16ms
7. **Optimize images** — cacheWidth/cacheHeight
8. **Use Impeller** — eliminates shader jank
9. **Extract widgets** — replace helper methods
10. **RepaintBoundary** — only where profiling confirms paint bottleneck

---
*Researched: 2026-03-08 | Sources: [flutter.dev/perf/best-practices](https://docs.flutter.dev/perf/best-practices), [flutter.dev/perf/impeller](https://docs.flutter.dev/perf/impeller), [flutter.dev/perf/shader](https://docs.flutter.dev/perf/rendering/shader), [flutter.dev/tools/devtools](https://docs.flutter.dev/tools/devtools/performance), [flutter.dev/perf/isolates](https://docs.flutter.dev/perf/isolates), [dart.dev/language/isolates](https://dart.dev/language/isolates), [ITNEXT: 10 Techniques](https://itnext.io/flutter-performance-optimization-10-techniques-that-actually-work-in-2025-4def9e5bbd2d), [DEV: Impeller 2026](https://dev.to/eira-wexford/how-impeller-is-transforming-flutter-ui-rendering-in-2026-3dpd), [DCM: Memory Leaks](https://dcm.dev/blog/2024/10/21/lets-talk-about-memory-leaks-in-dart-and-flutter/), [Flutter API: Opacity](https://api.flutter.dev/flutter/widgets/Opacity-class.html), [Flutter API: RepaintBoundary](https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html), [iiro.dev: Widget Methods Anti-pattern](https://iirokrankka.com/2018/12/11/splitting-widgets-to-methods-performance-antipattern/), [Digia: Animation Performance](https://www.digia.tech/post/flutter-animation-performance-guide), [Superformula: Optimizing Rebuilds](https://www.superformula.com/articles/optimizing-rebuilds-with-flutter/)*
