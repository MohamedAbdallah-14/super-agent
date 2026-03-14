# Mobile Rendering Performance — Performance Expertise Module

> Mobile rendering must hit 60fps (16.67ms per frame) or 120fps (8.33ms) on ProMotion/high-refresh displays. Dropped frames (jank) are immediately perceptible to users and create a perception of poor quality. Mobile rendering is constrained by thermal throttling, limited GPU memory, and variable device capabilities spanning a 10x performance range from low-end to flagship.

> **Impact:** Critical
> **Applies to:** Mobile (iOS, Android, Flutter, React Native)
> **Key metrics:** Frame render time, Jank rate (% dropped frames), GPU overdraw ratio, View hierarchy depth, CPU/GPU utilization per frame

---

## Why This Matters

Every frame has a hard deadline. At 60fps you get 16.67ms; at 120fps only 8.33ms. Miss by 1ms and the Choreographer (Android) or CADisplayLink (iOS) drops the frame entirely. The pipeline is deeply parallel -- when the display shows frame N, SurfaceFlinger composites N+1, RenderThread prepares N+2, and the UI thread builds N+3. A stall anywhere cascades forward.

**User perception:** A single dropped frame during scroll is perceptible as "stutter." Two to three consecutive drops (33-50ms gap) register as "laggy." Frames exceeding 700ms are classified as frozen -- users assume the app has crashed.

**Business impact:** Amazon found every 100ms of latency costs 1% in sales. Google research shows 53% of mobile users abandon experiences taking >3s. Akamai measured a 7% conversion drop per 100ms of delay. Moving from a 3-star to 4-star app rating increases download conversions by 89%, and rendering jank is a leading driver of poor ratings.

**Google Play Vitals thresholds** that affect store ranking:

| Metric | Threshold | Consequence |
|--------|-----------|-------------|
| Slow rendering | >50% of frames exceed 16ms in a session | Flagged in Play Vitals |
| Frozen frames | >0.1% of frames exceed 700ms | Flagged as excessive |
| Slow game sessions | >25% slow frames at <20 FPS | Flagged for games |

Apps exceeding these thresholds receive reduced visibility in the Play Store. Apple does not publish equivalent thresholds but MetricKit and Xcode Organizer surface comparable hitch-rate data.

**Thermal throttling** compounds the problem: mobile devices sustain 30-50% performance degradation under load. Research shows frame rates dropping from 35 FPS to 23 FPS (34% degradation) with frequency capping increasing frame defects by up to 146%. Compact form factors with passive cooling mean throttling begins within 2-5 minutes of sustained rendering, making initial benchmarks misleading.

---

## Performance Budgets & Targets

### Frame Time Budgets

| Refresh Rate | Frame Budget | Realistic App Budget* | GPU Budget |
|-------------|-------------|----------------------|------------|
| 60 Hz | 16.67ms | ~12ms | ~6ms |
| 90 Hz | 11.11ms | ~8ms | ~4ms |
| 120 Hz | 8.33ms | ~6ms | ~3ms |

*Realistic budget accounts for ~3-4ms system overhead (vsync scheduling, compositor, OS services).

### Acceptable Jank Rates

| Rating | Jank Rate | Dropped Frames/min (60fps) |
|--------|-----------|---------------------------|
| Excellent | <1% | <36 |
| Good | 1-3% | 36-108 |
| Acceptable | 3-5% | 108-180 |
| Poor | 5-10% | 180-360 |
| Unacceptable | >10% | >360 |

### GPU Overdraw Limits

| Overdraw | Debug Color | Target |
|----------|-------------|--------|
| None (1x) | True color | Ideal |
| 1x (2x draw) | Blue | Acceptable |
| 2x (3x draw) | Green | Maximum for most areas |
| 3x (4x draw) | Pink | Needs optimization |
| 4x+ (5x+ draw) | Red | Immediate fix required |

### View Hierarchy Depth Targets

| Platform | Maximum Recommended | Ideal |
|----------|-------------------|-------|
| Android XML Views | 10 levels | 5-7 levels |
| Jetpack Compose | N/A (flat by design) | Minimize recomposition scope |
| iOS UIKit | 8 levels | 4-6 levels |
| SwiftUI | N/A (flat by design) | Minimize body recomputation |
| Flutter | N/A (widget tree) | Minimize rebuild scope |

---

## Measurement & Profiling

### Android

- **GPU Rendering Profiler:** On-device bars via Developer Options > "Profile GPU rendering." Blue=draw, Purple=upload, Red=GPU execute, Orange=CPU wait. Green line marks 16ms threshold.
- **Perfetto (replaces Systrace):** Google's primary trace tool. Key tracks: `Choreographer#doFrame` (frame start), `RenderThread` (syncAndDrawFrame, queueBuffer), `FrameTimeline` (Expected vs Actual with JankType classification), `SurfaceFlinger` (composition timing, present fences), `GPU Completion` (actual GPU work duration).
- **JankStats API (AndroidX):** Production jank measurement. Auto-adjusts thresholds for 60fps vs 120fps devices. Tags frames with UI state via `PerformanceMetricsState` for correlating jank with user actions. Android 16 adds `AppJankStats` with `RelativeFrameTimeHistogram` for runtime analysis without third-party libraries.
- **Layout Inspector:** Live view hierarchy with recomposition counts (Compose) or measure/layout/draw timing (Views). Identifies deep nesting and unnecessary recompositions.

### iOS

- **Core Animation Instrument:** FPS gauge, Color Blended Layers (red=blended/green=opaque), Color Offscreen-Rendered (yellow overlay marks off-screen renders costing 2-5ms context switch each), Color Hits Green and Misses Red (shouldRasterize cache hit rate).
- **GPU Driver Instrument:** Measures GPU utilization, tiler utilization, renderer utilization. Above 70% sustained utilization risks thermal throttling.
- **MetricKit (MXSignpostMetric):** Production hitch rate measured as ms of hitch per second of scroll, delivered in 24-hour payloads. Available iOS 14+.
- **Xcode View Debugger:** 3D visualization of view hierarchy. Identifies unexpected layers and depth issues. Debug > View Debugging > Capture View Hierarchy.

### Flutter

- **Performance Overlay:** Two graphs -- UI thread (build+layout+paint) and Raster thread (GPU rasterization). Red bars indicate janky frames exceeding budget. Enable via DevTools or programmatically.
- **DevTools Timeline:** Frame-by-frame analysis showing Build, Layout, Paint, Compositing, and Rasterization phases. Selecting a janky (red) frame surfaces diagnostic hints identifying expensive operations.
- **Widget Rebuild Indicators:** IDE plugin shows rebuild counts per widget. `debugProfileBuildsEnabled` and `debugProfilePaintsEnabled` flags add granular Timeline events for every build/paint call.

### React Native

- **Performance Monitor (in-app):** Shows JS FPS (business logic) and UI FPS (native rendering). JS drop without UI drop = JS-side bottleneck. Both dropping = rendering bottleneck.
- **Flipper:** Plugin ecosystem -- React DevTools for component render timing, Network inspector for blocking requests, Layout Inspector for native view hierarchy.
- **New Architecture (Fabric + JSI):** JSI enables direct synchronous JS-to-native communication, reducing bridge serialization overhead from 5-15ms per crossing to <1ms.

---

## Common Bottlenecks

1. **Expensive layout passes** (2-15ms): Nested `LinearLayout` with `layout_weight` triggers double measure. Complex Auto Layout constraint systems scale O(n^2) in worst cases. Deep `Column`/`Row` with `weight` modifiers causes multi-pass measurement.
2. **GPU overdraw** (linear GPU cost): Stacked backgrounds on nested views, full-screen semi-transparent overlays, default backgrounds on containers fully covered by children.
3. **Large bitmap decoding on main thread** (10-200ms): A 12MP image at ARGB_8888 consumes 48MB of memory. Must decode off-thread and downsample to display size.
4. **Main thread blocking** (any >4ms operation): Database queries, JSON parsing, file I/O steal from frame budget. At 120fps, even a 3ms disk read drops a frame.
5. **Deep view hierarchies**: A 15-level hierarchy consumes 8-12ms in layout alone. Flat hierarchies with ConstraintLayout or Compose reduce this to 2-4ms.
6. **Unnecessary invalidations** (1-5ms each): Calling `invalidate()`/`requestLayout()` when no visual change occurred. In Compose, reading state at a wider scope than necessary recomposes entire subtrees.
7. **Off-screen rendering (iOS)** (2-8ms per layer): `cornerRadius` + `masksToBounds`, shadows without `shadowPath`, `mask` layers, `shouldRasterize` on frequently changing views. Each requires a temporary framebuffer allocation.
8. **Transparency and alpha blending** (1-3ms): Semi-transparent views force the GPU to read-blend-write vs. opaque skip-read.
9. **Excessive recomposition** (2-20ms): State change at high scope triggers full-tree rebuild in declarative frameworks. Compose Layout Inspector shows recomposition counts per composable.
10. **Unoptimized RecyclerView**: Missing `setHasFixedSize(true)`, using `notifyDataSetChanged()` instead of DiffUtil, performing heavy work in `onBindViewHolder`.
11. **Shadow without cached path** (1-5ms/frame/shadow iOS; 0.5-2ms Android): Core Animation ray-casts the layer's alpha channel every frame without an explicit `shadowPath`.
12. **Synchronous JS bridge calls (RN old arch)** (5-15ms per crossing): JSON serialization saturates the bridge on high-frequency events like scroll position updates.
13. **Unbounded lists without recycling**: Using `ScrollView` with hundreds of children creates all views upfront. A list of 1000 moderate-complexity items can consume 200-500MB.
14. **Texture upload stalls** (2-10ms): Large textures uploaded on the render thread. Use compressed formats (ASTC, ETC2), pre-upload, and limit texture sizes.
15. **Animating layout properties**: Animating width/height/margin triggers full layout passes (5-15ms/frame). Animating translationX/scaleX/alpha requires draw only (<1ms with hardware layers).

---

## Optimization Patterns

### View Recycling and List Virtualization

**Android RecyclerView:**
```kotlin
recyclerView.apply {
    setHasFixedSize(true)                           // Skip measure on data change
    setItemViewCacheSize(20)                        // Cache 20 views for fast re-bind
    recycledViewPool.setMaxRecycledViews(0, 30)     // Pool 30 type-0 views
    adapter = MyListAdapter(differ)                 // ListAdapter with DiffUtil
}
```
DiffUtil reduces rebind operations by 60-90% compared to `notifyDataSetChanged()`.

**Compose LazyColumn:** Use stable `key = { it.id }`, extract composables with narrow state scope, paginate data layer (Compose is lazy but the data layer is eager -- 10,000 items in memory defeats the purpose).

**iOS UICollectionView:** Cell reuse with `dequeueReusableCell`, prefetching via `UICollectionViewDataSourcePrefetching` (iOS 10+). iOS 15 improved prefetching to prepare the next cell in spare time after short commits. Cache cell heights for dynamic sizing to avoid recalculating during layout passes.

**SwiftUI:** `List` (backed by UICollectionView) outperforms `LazyVStack` for large datasets -- 5.53s vs 52.3s to scroll to bottom in benchmarks. As of iOS 18, both have good recycling but List edges ahead on stability with dynamically-sized content.

**React Native FlashList v2 (2025):** Complete rewrite by Shopify. Eliminates item size estimates, delivers pixel-perfect scrolling. Use `React.memo()` on list items. Set `windowSize` to 10-15 for optimal memory/performance balance.

### Flat View Hierarchies

Replace nested `LinearLayout` (12 levels, 3 measure passes) with `ConstraintLayout` (2 levels, 1 measure pass). **Impact:** 4-8ms saved per layout pass. In Compose, avoid deeply nested `Column`/`Row` with `weight`; use `Modifier.weight()` at a single level.

### Hardware Layers for Animation (Android)

```kotlin
// Enable hardware layer for duration of animation only
view.animate()
    .translationX(300f)
    .withLayer()           // Manages hardware layer lifecycle automatically (API 16+)
    .setDuration(300)
    .start()
```
Caches view as GPU texture -- transform/alpha animations become nearly free (GPU just repositions the texture). **Saves 3-10ms/frame** on complex views. Critical caveat: calling `invalidate()` during animation forces re-rendering the layer cache, negating all benefit and adding overhead.

### Shadow Path Optimization (iOS)

```swift
// Explicit path: computed once, cached by Core Animation (<0.1ms/frame)
cell.layer.shadowPath = UIBezierPath(
    roundedRect: cell.bounds, cornerRadius: 12
).cgPath
```
Without this, Core Animation ray-casts the alpha channel every frame (2-5ms per shadow). **Saves 20-50ms/frame** for a list with 10 visible cells with shadows.

### RepaintBoundary (Flutter)

Wrap static widgets adjacent to animated ones. Creates a separate GPU layer, isolating paint work. **Reduces paint time 40-80%** for complex static subtrees. Does NOT help with build or layout bottlenecks -- only painting. Overuse increases GPU memory consumption.

### Bitmap Optimization

Downsample before decode: a 4000x3000 ARGB_8888 image (48MB) at 4x downsample to RGB_565 becomes 500x375 at 366KB -- a **130x memory reduction**. Always decode on a background thread. Use image loading libraries (Glide, Coil, Kingfisher, Nuke, `cached_network_image`) that handle this automatically.

### Overdraw Reduction

Remove unnecessary backgrounds on intermediate containers. Remove the window default background when your layout covers the entire screen:
```kotlin
window.setBackgroundDrawable(null)
// Or in theme: <item name="android:windowBackground">@null</item>
```
**30-50% GPU fragment shader savings** reducing from 3x to 1x overdraw.

### Batching Property Updates (iOS)

```swift
CATransaction.begin()
CATransaction.setDisableActions(true)       // Suppress implicit animations
layer.cornerRadius = 8
layer.shadowOpacity = 0.5
layer.backgroundColor = UIColor.white.cgColor
CATransaction.commit()                      // Single render pass for all changes
```
Reduces implicit animation overhead by ~20% CPU and batches GPU work.

---

## Anti-Patterns

1. **Nested ScrollViews** -- defeats virtualization; a 500-item inner list creates all views upfront.
2. **Full-screen transparent overlays** -- adds 1x overdraw to every pixel on screen.
3. **Complex clip paths/masks** -- trigger off-screen rendering with per-layer framebuffer allocation.
4. **`notifyDataSetChanged()` on large lists** -- full rebind, no animation. Use DiffUtil for 60-80% improvement.
5. **Synchronous image loading in list items** -- blocks main thread 10-200ms per image.
6. **Reading scroll position at composition root** -- recomposes entire screen 60x/second during scroll. Use `derivedStateOf` and read at the narrowest possible scope.
7. **`shouldRasterize` on dynamic content (iOS)** -- re-rasterizes every frame, slower than no rasterization. Only use for static or rarely-changing complex layer trees.
8. **Missing `key` in lazy lists** -- causes unnecessary recomposition, state loss, and animation glitches when list order changes.
9. **Object allocation in `draw()`/`onDraw()`** -- runs 60-120x/second, triggers GC pauses visible as frame drops. Pre-allocate Paint objects and paths.
10. **`elevation` on every list item (Android)** -- 20 visible elevated items generate 20 shadow computations per frame. Use elevation sparingly; consider container-level shadows.
11. **Animating layout properties (width/height/margin)** -- triggers full layout pass (5-15ms/frame) vs transform animations (<1ms with hardware layers).
12. **Unbounded `Column`/`Row` for large data** -- creates all items at once; always use `LazyColumn`/`LazyRow`/`LazyVStack`.

---

## Architecture-Level Decisions

### Declarative vs. Imperative UI

- **Declarative (Compose, SwiftUI, Flutter):** Automatic diffing, flat-by-design hierarchies, simplified state management. Recomposition/rebuild scope management is critical -- naive implementations are 20-40% slower than optimized imperative code. Compose skips unchanged composables; SwiftUI diffs the body; Flutter diffs the element tree.
- **Imperative (UIKit, Android Views):** Fine-grained control over exactly what updates. No diffing overhead. Manual invalidation management is error-prone -- forgetting to invalidate causes stale UI; over-invalidating causes jank.

### State Management Impact on Rendering

| Pattern | Rendering Impact |
|---------|-----------------|
| Global store (Redux-style) | Any state change can trigger full re-render without granular selectors |
| Scoped state (Provider, Riverpod) | Updates limited to the subtree that reads the state |
| Observable per-field (MobX, LiveData) | Most granular; only widgets reading the changed field update |
| Unidirectional data flow | Predictable but requires careful mapping to avoid cascading updates |

**Key principle:** Observation granularity determines minimum recomposition scope. Coarse observation (reading an entire model) causes wider rebuilds than fine observation (reading a single field).

### Rendering Thread Architecture

| Framework | Architecture | Implication |
|-----------|-------------|-------------|
| Android Views/Compose | UI Thread + RenderThread | Layout on UI thread; GPU commands on RenderThread. Heavy layout blocks input. |
| iOS UIKit | Main Thread only | All layout, drawing, and compositing on main thread. GPU work via Core Animation. |
| Flutter | UI Thread + Raster Thread | Widget build/layout on UI thread; Skia/Impeller rasterization on separate thread. |
| React Native (New Arch) | JS + UI + Render Thread | JSI removes bridge; Fabric renders on native threads. |

---

## Testing & Regression Prevention

### Automated Frame Rate Testing

**Android Macrobenchmark:**
```kotlin
@get:Rule val benchmarkRule = MacrobenchmarkRule()

@Test fun scrollPerformance() {
    benchmarkRule.measureRepeated(
        packageName = "com.example.app",
        metrics = listOf(FrameTimingMetric()),
        iterations = 5,
        startupMode = StartupMode.WARM,
    ) {
        val list = device.findObject(By.res("item_list"))
        list.setGestureMargin(device.displayWidth / 5)
        list.fling(Direction.DOWN)
        device.waitForIdle()
    }
}
// Assert: P50 <12ms, P95 <16ms, P99 <32ms
```

**iOS XCTest Performance Metrics:**
```swift
func testScrollPerformance() throws {
    let app = XCUIApplication()
    app.launch()
    measure(metrics: [XCTOSSignpostMetric.scrollDecelerationMetric]) {
        app.collectionViews.firstMatch.swipeUp(velocity: .fast)
    }
}
```

**Flutter Integration Test:**
```dart
testWidgets('scroll performance', (tester) async {
    await tester.pumpWidget(MyApp());
    final timeline = await tester.traceAction(() async {
        await tester.fling(find.byType(ListView), Offset(0, -500), 10000);
        await tester.pumpAndSettle();
    });
    final summary = TimelineSummary.summarize(timeline);
    expect(summary.computeMissedFrameBuildBudgetCount(), lessThan(5));
});
```

### CI Strategy

1. **Baseline:** Run frame timing benchmarks on a reference device; record P50/P95/P99 frame times.
2. **Regression gate:** Fail the build if P95 regresses by >20% or jank rate exceeds 5%.
3. **Device matrix:** Test on at least one low-end device (Pixel 3a, Galaxy A13) and one flagship. Low-end devices expose bottlenecks that flagships mask with raw power.
4. **Thermal conditioning:** Run benchmarks after a 30-second warm-up period to capture thermally-throttled performance, which reflects real-world conditions.

### Production Monitoring

Deploy JankStats to production builds with sampling (10% of sessions):
```kotlin
val jankStats = JankStats.createAndTrack(window) { frameData ->
    if (frameData.isJank) {
        analytics.report(
            frameDurationMs = frameData.frameDurationUiNanos / 1_000_000.0,
            states = frameData.states  // e.g., "Screen:ProductList", "Action:Scrolling"
        )
    }
}
metricsState.putState("Screen", "ProductList")
metricsState.putState("Action", "Scrolling")
```
Correlate jank reports with screen names and user actions to prioritize optimization efforts.

---

## Decision Trees

### "My App Is Janky During Scroll"

```
START: Identify which thread is over budget
  |
  +-- Is UI/main thread over budget?
  |     +-- Layout >8ms?
  |     |     --> Flatten hierarchy (ConstraintLayout / Compose / SwiftUI)
  |     +-- onBind / cellForRow expensive?
  |     |     --> Move work off main thread; cache computed values
  |     +-- Synchronous image loading?
  |     |     --> Use async library (Glide/Coil/Kingfisher/cached_network_image)
  |     +-- GC pauses visible in trace?
  |     |     --> Eliminate allocations in draw/bind; pre-allocate objects
  |     +-- None of the above?
  |           --> Profile with Perfetto / Instruments for unexpected work
  |
  +-- Is GPU/raster thread over budget?
  |     +-- Overdraw >2x?
  |     |     --> Remove unnecessary backgrounds; flatten hierarchy
  |     +-- Shadows without explicit path?
  |     |     --> Add shadowPath (iOS) or reduce elevation count (Android)
  |     +-- Large bitmap uploads (purple bars)?
  |     |     --> Downsample; use compressed textures (ASTC/ETC2); pre-upload
  |     +-- Off-screen rendering (yellow in Instruments)?
  |           --> Eliminate masks/complex clips; use optimized cornerRadius
  |
  +-- Both threads fine but still janky?
        --> Check vsync alignment (Choreographer scheduling issues)
        --> Check thermal throttling (run sustained-load benchmark)
        --> Check background thread contention (lock contention on main thread)
```

### "Should I Use a Hardware Layer?"

```
START: What property are you animating?
  |
  +-- Translation, Scale, Rotation, or Alpha?
  |     +-- Is the view complex (>20 child views or custom drawing)?
  |     |     +-- Will view content change during animation (invalidate called)?
  |     |     |     --> NO: layer re-render negates caching benefit
  |     |     |     --> YES (content static): USE hardware layer (saves 3-10ms/frame)
  |     |     +-- View is simple (<20 children)?
  |     |           --> Benefit is <1ms; measure before adding
  |     |
  |     +-- Using ViewPropertyAnimator?
  |           --> Use .withLayer() for automatic lifecycle management
  |
  +-- Layout properties (width, height, margin, padding)?
        --> CANNOT use hardware layer (layout change invalidates it)
        --> Refactor: animate scaleX/scaleY or translationX/Y instead
        --> If layout animation is truly required: keep view hierarchy minimal
```

### "When to Use RepaintBoundary (Flutter)"

```
START: Is a subtree repainting unnecessarily?
  |
  +-- Widget is static while a sibling animates?
  |     +-- Static widget is expensive to paint (custom paint, many children)?
  |     |     --> YES: Wrap with RepaintBoundary (saves 2-15ms/frame)
  |     +-- Static widget is cheap to paint?
  |           --> Benefit is marginal; measure with debugProfilePaintsEnabled first
  |
  +-- Widget animates independently?
  |     +-- Other widgets repainting because of this animation?
  |     |     --> Wrap the ANIMATED widget with RepaintBoundary
  |     +-- Already isolated (no sibling repaints)?
  |           --> No benefit from RepaintBoundary
  |
  NOTE: RepaintBoundary only affects PAINT phase.
  If build() or layout is the bottleneck, use const constructors,
  stable keys, and narrower state scoping instead.
```

---

## Code Examples

### 1. Overdraw Elimination (Android)

```xml
<!-- BEFORE: 4x overdraw, 22ms frame time on Pixel 4a -->
<FrameLayout android:background="@color/gray_bg">          <!-- Draw 1 -->
  <CardView android:background="@color/white"               <!-- Draw 2 -->
            app:cardBackgroundColor="@color/white">          <!-- Draw 3 -->
    <LinearLayout android:background="@color/white">        <!-- Draw 4 -->
      <TextView android:text="Title" />
    </LinearLayout>
  </CardView>
</FrameLayout>

<!-- AFTER: 1x overdraw, 11ms frame time on Pixel 4a (50% improvement) -->
<CardView app:cardBackgroundColor="@color/white">
  <TextView android:text="Title" />
</CardView>
```

### 2. iOS Shadow Performance

```swift
// BEFORE: 38ms with 8 visible cells (per-frame ray-casting, no shadowPath)
cell.layer.shadowColor = UIColor.black.cgColor
cell.layer.shadowOffset = CGSize(width: 0, height: 2)
cell.layer.shadowOpacity = 0.15
cell.layer.shadowRadius = 8
// Core Animation computes shadow shape every frame: 4-5ms per cell

// AFTER: 9ms with 8 visible cells (76% improvement)
cell.layer.shadowColor = UIColor.black.cgColor
cell.layer.shadowOffset = CGSize(width: 0, height: 2)
cell.layer.shadowOpacity = 0.15
cell.layer.shadowRadius = 8
cell.layer.shadowPath = UIBezierPath(
    roundedRect: cell.bounds, cornerRadius: 12
).cgPath  // Computed once, cached: <0.1ms per cell
```

### 3. Compose Recomposition Scoping

```kotlin
// BEFORE: 45ms frame time -- entire list recomposes on every timer tick
@Composable fun ProductScreen(vm: ProductViewModel) {
    val countdown by vm.countdown.collectAsState()  // Read at root scope
    Column {
        Text("Sale ends in: $countdown")
        LazyColumn {
            items(products, key = { it.id }) { ProductCard(it) }  // ALL recompose
        }
    }
}

// AFTER: 4ms frame time (91% improvement) -- only banner recomposes
@Composable fun ProductScreen(vm: ProductViewModel) {
    Column {
        CountdownBanner(vm)  // Isolated recomposition scope
        LazyColumn {
            items(products, key = { it.id }) { ProductCard(it) }  // Stable, skipped
        }
    }
}

@Composable private fun CountdownBanner(vm: ProductViewModel) {
    val countdown by vm.countdown.collectAsState()  // Only this scope recomposes
    Text("Sale ends in: $countdown")
}
```

### 4. Flutter RepaintBoundary + const Optimization

```dart
// BEFORE: 24ms frame time -- full repaint on scroll
ListView.builder(
  itemCount: items.length,
  itemBuilder: (ctx, i) => Card(
    child: Column(children: [
      Image.network(items[i].imageUrl),   // Triggers repaint
      Text(items[i].title),
      Icon(Icons.arrow_forward),          // Rebuilds every time
    ]),
  ),
)

// AFTER: 8ms frame time (67% improvement)
ListView.builder(
  itemCount: items.length,
  itemBuilder: (ctx, i) => RepaintBoundary(
    child: Card(
      child: Column(children: [
        CachedNetworkImage(imageUrl: items[i].imageUrl),  // Cached loading
        Text(items[i].title),
        const Icon(Icons.arrow_forward),                  // const = never rebuilds
      ]),
    ),
  ),
)
```

### 5. React Native FlatList to FlashList v2 Migration

```typescript
// BEFORE: 18ms JS frame time with default FlatList
<FlatList
  data={items}
  renderItem={({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text>{item.title}</Text>
    </View>
  )}
/>

// AFTER: 6ms JS frame time (67% improvement) with FlashList v2 + memoization
import { FlashList } from "@shopify/flash-list";

const MemoizedCard = React.memo(({ item }) => (
  <View style={styles.card}>
    <FastImage source={{ uri: item.image }} style={styles.image} />
    <Text>{item.title}</Text>
  </View>
));

<FlashList
  data={items}
  renderItem={({ item }) => <MemoizedCard item={item} />}
  estimatedItemSize={100}
  keyExtractor={(item) => item.id}
/>
```

### 6. Android Bitmap Optimization

```kotlin
// BEFORE: 48MB allocation, 150ms main-thread block for 12MP image
val bitmap = BitmapFactory.decodeFile(path)  // Full resolution, main thread

// AFTER: 366KB allocation, 0ms main-thread block
withContext(Dispatchers.IO) {
    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, options)
    options.inSampleSize = calculateInSampleSize(options, targetWidth = 400)
    options.inJustDecodeBounds = false
    options.inPreferredConfig = Bitmap.Config.RGB_565  // 2 bytes vs 4 bytes/pixel
    val bitmap = BitmapFactory.decodeFile(path, options)
    withContext(Dispatchers.Main) { imageView.setImageBitmap(bitmap) }
}
```

---

## Quick Reference

| Metric | Excellent | Good | Acceptable | Needs Work | Critical |
|--------|-----------|------|------------|------------|----------|
| P50 frame time (60fps) | <10ms | <12ms | <14ms | <16ms | >16ms |
| P95 frame time (60fps) | <14ms | <16ms | <20ms | <32ms | >32ms |
| P99 frame time (60fps) | <16ms | <24ms | <32ms | <50ms | >50ms |
| Jank rate | <1% | <3% | <5% | <10% | >10% |
| Frozen frames (>700ms) | 0% | <0.05% | <0.1% | <0.5% | >0.5% |
| GPU overdraw (avg) | 1.0x | 1.5x | 2.0x | 2.5x | >3.0x |
| View hierarchy depth | <5 | <8 | <10 | <12 | >15 |

### Platform Profiling Quick Reference

| Task | Android | iOS | Flutter | React Native |
|------|---------|-----|---------|--------------|
| Frame timing | Perfetto FrameTimeline | Core Animation Instrument | Performance Overlay | Perf Monitor |
| View hierarchy | Layout Inspector | View Debugger (3D) | Widget Inspector | Flipper Layout |
| GPU overdraw | Dev Options debug | Color Blended Layers | N/A (native layer) | N/A (native layer) |
| Memory | Android Profiler | Instruments Allocations | Observatory | Flipper + Hermes |
| Production | JankStats + Play Vitals | MetricKit + Organizer | Custom (Sentry) | Sentry / custom |
| Jank detection | JankStats / AppJankStats | MXSignpostMetric | Timeline janky frames | JS/UI FPS monitor |

### Optimization Priority Order

1. Remove main thread blocking (I/O, network, heavy computation) -- highest impact, easiest fix
2. Enable view recycling (RecyclerView, LazyColumn, UICollectionView, FlashList)
3. Flatten view hierarchy -- reduces layout time 40-70%
4. Eliminate overdraw -- reduces GPU work 30-50%
5. Add explicit shadow paths (iOS) -- eliminates off-screen rendering
6. Optimize images (async loading, downsampling, caching) -- prevents 10-200ms stalls
7. Scope state/recomposition -- prevents unnecessary UI rebuilds
8. Use hardware layers for animations (Android) -- saves 3-10ms/frame
9. Add RepaintBoundary (Flutter) / drawingGroup (SwiftUI) -- isolates paint work
10. Profile and optimize custom drawing -- last resort, highest expertise required

---

*Researched: 2026-03-08 | Sources: [Android -- Slow Rendering](https://developer.android.com/topic/performance/vitals/render), [Android -- Reduce Overdraw](https://developer.android.com/topic/performance/rendering/overdraw), [Android -- JankStats](https://developer.android.com/topic/performance/jankstats), [Android -- Hardware Acceleration](https://developer.android.com/develop/ui/views/graphics/hardware-accel), [Perfetto -- Vsync Mechanism](https://androidperformance.com/en/2025/08/05/Android-Perfetto-08-Vsync/), [Perfetto -- MainThread & RenderThread](https://androidperformance.com/en/2025/08/02/Android-Perfetto-07-MainThread-And-RenderThread/), [Perfetto -- FrameTimeline Jank Detection](https://perfetto.dev/docs/data-sources/frametimeline), [Apple -- Improving Animation Performance](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CoreAnimation_guide/ImprovingAnimationPerformance/ImprovingAnimationPerformance.html), [Apple -- Performant Scrollable Stacks](https://developer.apple.com/documentation/swiftui/creating-performant-scrollable-stacks), [Apple WWDC21 -- Blazing Fast Lists](https://developer.apple.com/videos/play/wwdc2021/10252/), [Flutter -- Performance Best Practices](https://docs.flutter.dev/perf/best-practices), [Flutter -- RepaintBoundary](https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html), [React Native -- FlatList Optimization](https://reactnative.dev/docs/optimizing-flatlist-configuration), [Shopify -- FlashList v2](https://shopify.engineering/flashlist-v2), [Dan Lew -- Hardware Layers](https://blog.danlew.net/2015/10/20/using-hardware-layers-to-improve-animation-performance/), [SwiftUI 120FPS Challenge](https://blog.jacobstechtavern.com/p/swiftui-scroll-performance-the-120fps), [iOS Off-Screen Rendering](https://github.com/seedante/OptimizationForOffscreenRender), [Amazon Latency Study](https://www.gigaspaces.com/blog/amazon-found-every-100ms-of-latency-cost-them-1-in-sales/), [Google -- Mobile Speed](https://blog.google/products/admanager/the-need-for-mobile-speed/), [XDA -- Thermal Throttling](https://www.xda-developers.com/silent-killer-of-your-phones-performance-thermal-throttling/), [Bitdrift -- JankStats Integration](https://blog.bitdrift.io/post/jank-stats-integration), [Play Console -- Android Vitals](https://support.google.com/googleplay/android-developer/answer/9844486)*
