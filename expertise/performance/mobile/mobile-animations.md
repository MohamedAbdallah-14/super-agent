# Mobile Animations -- Performance Expertise Module

> Smooth animations at 60/120fps are essential for perceived app quality. Animation jank is the most noticeable performance problem -- users can perceive a single dropped frame during animation. The key is keeping all animation work off the main thread and within the frame budget of 16.67ms (60fps) or 8.33ms (120fps).

> **Impact:** High
> **Applies to:** Mobile (iOS, Android, Flutter, React Native), Mobile Web
> **Key metrics:** Frame time during animation, Animation start latency, Dropped frame percentage during animation

---

## Why This Matters

### Human Perception Thresholds

- **16ms frame budget (60fps):** The minimum for perceived smooth motion. Any frame exceeding 16.67ms causes a visible hitch. Source: [MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)
- **8.33ms frame budget (120fps):** ProMotion (iPhone 13 Pro+, iPad Pro) and high-refresh Android devices demand half the frame time. Source: [Apple WWDC 2021](https://developer.apple.com/videos/play/wwdc2021/10147/)
- **Single-frame drops are noticeable:** Users detect a single dropped frame during smooth animation. Source: [web.dev Smoothness](https://web.dev/articles/smoothness)
- **27% retention impact:** Drops below 60fps reduce user retention by 27%. Source: [Algolia](https://www.algolia.com/blog/engineering/60-fps-performant-web-animations-for-optimal-ux)

### Business Impact

- **Booking.com A/B test:** Cutting elaborate entry animations reduced time-to-interaction by 22% with no loss of delight.
- **Material Design studies:** 85% higher task completion with minimal, purposeful motion vs. decorative animation.
- **Perceived latency:** 23% reduction using minimal progress cues vs. full-screen spinners (Smashing Magazine).

Source: [MoldStud](https://moldstud.com/articles/p-exploring-the-impact-of-animation-on-performance-essential-insights-for-developers)

When an animation drops frames, users experience a **violation of expectation** -- the brain predicts the next frame position based on the easing curve. A missed frame creates a perceptual "jump" that feels broken, not just slow.

---

## Performance Budgets and Targets

### Frame Time Budgets

| Refresh Rate | Frame Budget | Effective (after OS overhead) | Devices |
|---|---|---|---|
| 60Hz | 16.67ms | ~10-12ms | Standard mobile |
| 90Hz | 11.11ms | ~7-8ms | Some Android flagships |
| 120Hz | 8.33ms | ~5-6ms | iPhone Pro, iPad Pro, Android flagships |

The OS compositor, GPU driver, and display pipeline consume 4-6ms per frame, leaving 10-12ms of effective budget at 60Hz.

### Animation Duration Guidelines (Material Design 3 / NN/G)

| Animation Type | Duration | Notes |
|---|---|---|
| Micro-interactions (button, toggle) | 100-200ms | Must feel instant |
| Small transitions (fade, scale) | 150-250ms | Keep snappy |
| Screen transitions | 250-350ms | 300ms standard on mobile |
| Large/complex transitions | 300-400ms | Full-screen, shared element |
| Maximum reasonable | 500ms | Longer feels sluggish |
| Minimum perceptible | 100ms | Below this, invisible |

Source: [Material Design 3](https://m3.material.io/styles/motion/easing-and-duration), [NN/G](https://www.nngroup.com/articles/animation-duration/)

### Target Thresholds

| Metric | Good | Needs Work | Poor |
|---|---|---|---|
| P95 frame time (60fps) | < 16ms | 16-20ms | > 20ms |
| Dropped frame % during animation | < 1% | 1-5% | > 5% |
| Animation start latency | < 100ms | 100-200ms | > 200ms |
| Jank count per session | 0-2 | 3-10 | > 10 |

---

## Measurement and Profiling

### iOS

- **Instruments > Core Animation:** FPS, GPU utilization, offscreen rendering, blending
- **Time Profiler:** CPU time per frame -- identify main thread work during animation
- **CADisplayLink timing:** Exact frame delivery intervals; on ProMotion, system adjusts between 10-120Hz. Source: [Apple](https://developer.apple.com/documentation/quartzcore/cadisplaylink)
- **MetricKit:** Production frame drop metrics

### Android

- **`adb shell dumpsys gfxinfo <pkg> framestats`:** Per-frame timestamps for last 120 frames
- **Systrace / Perfetto:** System-wide rendering pipeline trace
- **GPU Rendering Profile (on-device):** Per-frame bar chart overlay
- **FrameMetrics API:** Per-frame timing in production
- **Macrobenchmark:** Frame timing during automated UI tests for CI/CD

### Flutter

- **DevTools > Performance:** Frame build time vs. raster time (both must fit budget)
- **`flutter run --profile`:** Required for accurate profiling (debug mode is misleading)
- **Timeline events:** Widget rebuild count, paint operations
- **Impeller diagnostics:** Shader compilation, rasterization time

Source: [Flutter Rendering Performance](https://docs.flutter.dev/perf/rendering-performance)

### React Native

- **Performance Monitor:** JS thread FPS + UI thread FPS simultaneously
- **Flipper Performance Plugin:** Bridge traffic, frame times
- Monitor **both** threads: with `useNativeDriver` or Reanimated, UI stays at 60fps even when JS is blocked.

Source: [React Native Blog](https://reactnative.dev/blog/2017/02/14/using-native-driver-for-animated)

### Mobile Web

- **Chrome DevTools > Performance:** Frame timeline with paint/layout/composite breakdown
- **Layers panel:** Compositor layer count, GPU memory per layer
- **`PerformanceObserver` (long-animation-frames):** Field monitoring

---

## Common Bottlenecks

### 1. Layout Recalculation During Animation
**Impact: Very High.** Animating `width`, `height`, `margin`, `top`, `left` forces layout recalc that can push frame times from 2-3ms to 30ms+. Source: [Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)

### 2. Main Thread Blocking
**Impact: Very High.** Any synchronous work (JSON parsing, large state updates) during animation steals frame budget. On React Native without native driver, JS thread blocking freezes animations entirely.

### 3. Garbage Collection Pauses
**Impact: High.** GC pauses of 5-15ms cause frame drops. Android minor GC: 2-5ms; major: 50ms+. Excessive short-lived allocations in animation loops are the primary trigger.

### 4. Shader Compilation Jank (Flutter/GPU)
**Impact: High.** Skia compiled shaders JIT, causing first-run jank of 50-200ms. Impeller (Flutter 3.27+) precompiles AOT, reducing frame drops from ~12% to ~1.5%. Source: [Impeller](https://dev.to/eira-wexford/how-impeller-is-transforming-flutter-ui-rendering-in-2026-3dpd)

### 5. Excessive Widget Rebuilds (Flutter)
**Impact: High.** `setState()` in animation listener rebuilds entire subtree 60x/second. `AnimatedBuilder` with `child` limits rebuilds to the animated portion only.

### 6. Bridge Overhead (React Native)
**Impact: High.** Without native driver, 60 bridge crossings/second, each adding 1-5ms serialization overhead.

### 7. Offscreen Rendering (iOS)
**Impact: High.** `cornerRadius` + `masksToBounds`, shadow without `shadowPath`, group opacity -- each triggers offscreen render passes, doubling GPU work. Source: [Apple](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CoreAnimation_guide/ImprovingAnimationPerformance/ImprovingAnimationPerformance.html)

### 8. Overdraw
**Impact: Medium-High.** Multiple overlapping transparent layers force GPU to blend pixels repeatedly. On mid-range Android, 4x overdraw consumes the entire GPU frame budget.

### 9. Complex Bezier Paths
**Impact: Medium.** `CAShapeLayer` with hundreds of control points renders on CPU. Breaking into simpler layered shapes leverages GPU compositing instead. Source: [Realm Academy](https://academy.realm.io/posts/tryswift-tim-oliver-advanced-graphics-with-core-animation/)

### 10. Shadow Without shadowPath (iOS)
**Impact: Medium-High.** Without explicit `shadowPath`, Core Animation ray-traces the layer alpha channel every frame. Setting `shadowPath` improves shadow rendering by 10x+.

### 11. Unnecessary Recomposition (Compose)
**Impact: Medium-High.** Reading animated values during composition triggers recomposition every frame. Lambda modifiers (`Modifier.graphicsLayer { }`) defer to draw phase, skipping recomposition. Source: [Android Developers](https://developer.android.com/develop/ui/compose/performance/bestpractices)

### 12. Layer Explosion (Web/Hybrid)
**Impact: Medium.** Each compositor layer consumes ~900KB GPU memory (at 360x640). On mobile with limited GPU RAM, hundreds of layers can crash the browser. Source: [Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)

### 13. Image Decoding During Animation
**Impact: Medium.** Loading/decoding images on main thread during animation steals frame budget. Predecode before animation starts.

### 14. Auto Layout Constraint Churn (iOS)
**Impact: Medium.** Complex constraint graphs (50+ constraints) can take 5-15ms per frame when constraints are animated directly.

### 15. JavaScript Long Tasks (Mobile Web)
**Impact: Medium.** Tasks >50ms block the main thread, preventing `requestAnimationFrame` callbacks from firing on time.

### 16. Font Loading During Text Animation
**Impact: Low-Medium.** Animating text while a web font loads causes layout shift when the font swaps in mid-animation.

---

## Optimization Patterns

### GPU-Accelerated Properties (Web/Hybrid)
Only these run on the GPU compositor without layout or paint:
1. **`transform`** (translate, scale, rotate)
2. **`opacity`**
3. **`filter`** (modern browsers)
4. **`backdrop-filter`** (modern browsers)

Everything else (`width`, `height`, `top`, `left`, `margin`, `background-color`) triggers layout or paint. Source: [Chrome Developers](https://developer.chrome.com/blog/hardware-accelerated-animations)

### Layer Promotion with will-change (Web)
Use `will-change: transform` before animation starts to pre-promote to compositor layer. Remove after animation completes. Never apply to >10-15 elements simultaneously -- each layer costs ~900KB GPU memory. Source: [Lexo](https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/)

### Native Driver (React Native)
`useNativeDriver: true` serializes the animation graph to native once, then runs on UI thread with zero bridge calls. Supports only `transform` and `opacity`. For layout properties, use Reanimated worklets. Source: [React Native Blog](https://reactnative.dev/blog/2017/02/14/using-native-driver-for-animated)

### Reanimated Worklets (React Native)
Reanimated 4 runs animation logic on UI thread via worklets, supporting all properties. Benchmarks: 37fps with 1500 elements (2023) improved to 60fps with 3000 elements (2024). Source: [Medium](https://medium.com/@islamrustamov/how-react-native-improved-from-2023-to-2025-animation-stress-testing-and-a-little-bit-of-flutter-edd44297b815)

### Impeller (Flutter)
Default renderer since Flutter 3.27 (2025). AOT shader compilation eliminates first-run jank. 50% faster rasterization vs. Skia. Real-world: e-commerce apps dropped from 12% to 1.5% frame drops. Source: [ITNEXT](https://itnext.io/flutter-performance-optimization-10-techniques-that-actually-work-in-2025-4def9e5bbd2d)

### AnimatedBuilder with Child (Flutter)
Pass static subtrees as `child` to avoid rebuilding 60x/second. Builder function runs per frame but `child` is built once and reused.

### Core Animation Layer Properties (iOS)
Animate `transform`, `opacity`, `shadowOpacity` (with explicit `shadowPath`) on CALayer. CALayer for heavy graphical tasks boosts performance by up to 30% vs. UIView. Source: [MoldStud](https://moldstud.com/articles/p-leveraging-core-animation-for-interactive-app-experiences)

### Compose graphicsLayer (Android)
`Modifier.graphicsLayer { }` lambda defers animated value reads to draw phase, skipping recomposition entirely. Source: [Android Developers](https://developer.android.com/develop/ui/compose/performance/bestpractices)

### RepaintBoundary (Flutter)
Wrapping animated widgets isolates them into a separate render layer, preventing unrelated subtree repaints. Source: [Medium](https://ms3byoussef.medium.com/optimizing-flutter-ui-with-repaintboundary-2402052224c7)

### requestAnimationFrame (Web)
Always use instead of `setTimeout`/`setInterval`. Syncs with vsync, pauses in background tabs. Source: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

---

## Anti-Patterns

1. **Animating width/height instead of transform: scale** -- triggers layout recalc every frame (2ms -> 15-30ms).
2. **Animating top/left instead of transform: translate** -- layout properties force reflow of all siblings.
3. **setTimeout/setInterval for animations (Web)** -- not synced with display refresh, runs in background tabs.
4. **Missing useNativeDriver (React Native)** -- every frame crosses bridge (~1-5ms). JS blocking drops animation to 0fps.
5. **setState() in animation listeners (Flutter)** -- rebuilds entire subtree 60x/sec (5-20ms each).
6. **will-change on every element (Web)** -- layer explosion. 100+ layers at ~900KB each can crash browser.
7. **Shadow without shadowPath (iOS)** -- ray-traces alpha channel every frame (10-50ms).
8. **Reading animated state during composition (Compose)** -- triggers recomposition cascade every frame.
9. **Animating constraints directly (iOS)** -- Auto Layout solver runs per frame; 50+ constraints = 5-15ms per solve.
10. **Blocking JS thread during animation (React Native)** -- use `InteractionManager.runAfterInteractions()`.
11. **Missing vsync in AnimationController (Flutter)** -- fires ticks even when widget is invisible, wastes CPU.
12. **Animating during data loads** -- concurrent fetch + animation = guaranteed frame drops. Prefetch first.
13. **Ignoring accessibilityReduceMotion** -- check platform APIs: `UIAccessibility.isReduceMotionEnabled` (iOS), `ANIMATOR_DURATION_SCALE` (Android), `MediaQuery.disableAnimations` (Flutter), `prefers-reduced-motion` (Web).

---

## Architecture-Level Decisions

### Declarative vs. Imperative Animation

| Approach | Platforms | When to Use |
|---|---|---|
| **Declarative** | SwiftUI, Compose, Flutter implicit, CSS | Simple state-driven (fade, scale on toggle) |
| **Imperative** | UIKit, Android Views, Flutter explicit, JS | Gesture-driven, physics, choreographed sequences |

### Gesture-Driven Animations
Require < 16ms latency tracking, velocity-based completion on release, and interruptibility (grab in-flight animation):
- **iOS:** `UIViewPropertyAnimator` (interruptible, reversible, scrubbable)
- **Android:** `SpringAnimation` from AndroidX DynamicAnimation
- **Flutter:** `GestureDetector` + `AnimationController` + `SpringSimulation`
- **React Native:** Reanimated `useAnimatedGestureHandler` + `withSpring`
- **Web:** Pointer events + `requestAnimationFrame` + spring physics

### Physics-Based Animations
Springs provide natural motion and are inherently interruptible -- changing target mid-flight adjusts naturally without jarring restart. Key parameters: damping ratio 0.7-0.9 (lower = bouncier), stiffness 100-300 (higher = snappier), mass 1.0.

### Shared Element Transitions
Both source and destination screens render simultaneously during animation. Budget for 2x normal rendering cost.
- **iOS:** `matchedGeometryEffect` (SwiftUI) / `UIViewControllerAnimatedTransitioning`
- **Android:** Compose `AnimatedContent` with `Modifier.sharedElement`
- **Flutter:** `Hero` widget
- **React Native:** Reanimated shared transitions

### Animation Orchestration
Stagger list item entrances by 30-50ms per element. Total choreographed duration should not exceed 600-800ms -- users tap through longer sequences.

---

## Testing and Regression Prevention

### Automated Benchmarks

**iOS (XCTest):**
```swift
func testScrollPerformance() {
    measure(metrics: [XCTOSSignpostMetric.scrollDecelerationMetric]) {
        XCUIApplication().swipeUp()
    }
}
```

**Android (Macrobenchmark):**
```kotlin
@Test
fun transitionAnimation() = benchmarkRule.measureRepeated(
    packageName = "com.example.app",
    metrics = listOf(FrameTimingMetric()),
    iterations = 5,
) {
    device.findObject(By.res("nav_button")).click()
    device.waitForIdle()
}
// Assert: P99 frameDurationCpuMs < 16
```

**Flutter (integration_test):**
```dart
final timeline = await tester.traceAction(() async {
    await tester.tap(find.byKey(const Key('navigate')));
    await tester.pumpAndSettle();
});
final summary = TimelineSummary.summarize(timeline);
summary.writeSummaryToFile('transition_perf', pretty: true);
// Assert: average build time < 8ms, missed frames == 0
```

### CI/CD Guidelines

1. Run benchmarks on **physical devices** -- emulators misrepresent GPU performance
2. Set absolute thresholds -- fail build if P95 frame time > 16ms
3. Track trends -- plot over time to catch gradual regressions
4. Test on **low-end devices** (Samsung Galaxy A14, iPhone SE 2nd gen)
5. Test under **thermal throttling** -- run after warm-up period
6. Monitor production via MetricKit (iOS), FrameMetrics API (Android), Firebase Performance

---

## Decision Trees

### "My Animation Is Janky"

```
Animation dropping frames
  |
  +-- Main thread busy?
  |     +-- Layout/reflow? -> Switch to transform/opacity
  |     +-- JS execution? (RN/Web) -> Native driver / worklet / break tasks < 50ms
  |     +-- Widget rebuilds? (Flutter) -> AnimatedBuilder + RepaintBoundary
  |     +-- Recomposition? (Compose) -> graphicsLayer {} lambda + derivedStateOf
  |     +-- GC pauses? -> Reduce allocation in animation loop, preallocate
  |
  +-- GPU/render thread busy?
  |     +-- Offscreen render? (iOS) -> Set shadowPath, avoid cornerRadius+mask
  |     +-- Overdraw? -> Reduce transparent layers, use opaque backgrounds
  |     +-- Shader compilation? (Flutter) -> Enable Impeller (3.27+)
  |     +-- Complex paths? -> Simplify, break into layers, pre-rasterize
  |     +-- Layer explosion? (Web) -> Audit will-change, check Layers panel
  |
  +-- First-run only?
        +-- YES -> Shader warmup / preload assets / pre-render layers
        +-- NO -> Profile with platform tools, check all categories above
```

### "Which Animation API?"

```
Need to animate something
  |
  +-- Simple state toggle? -> SwiftUI .animation / Compose animateAsState
  |                           Flutter AnimatedOpacity / CSS transition
  +-- Gesture-driven? ------> UIViewPropertyAnimator / SpringAnimation
  |                           Flutter AnimationController / Reanimated gesture
  +-- Choreographed? -------> CAAnimationGroup / Compose updateTransition
  |                           Flutter staggered Interval / Reanimated withSequence
  +-- Shared element? ------> matchedGeometryEffect / Compose sharedElement
                              Flutter Hero / Reanimated shared transitions
```

---

## Code Examples

### 1. Transform vs. Layout (Web) -- frame time 18-25ms -> 1-2ms

```css
/* BAD: 'left' triggers layout recalc every frame */
.panel { position: absolute; left: 0; transition: left 300ms ease-out; }
.panel.open { left: 250px; }

/* GOOD: 'transform' runs on GPU compositor */
.panel { position: absolute; transition: transform 300ms ease-out;
         will-change: transform; }
.panel.open { transform: translateX(250px); }
```
Source: [Viget](https://www.viget.com/articles/animation-performance-101-browser-under-the-hood)

### 2. Native Driver (React Native) -- 15-30fps -> 60fps under JS load

```javascript
// BAD: useNativeDriver: false -- every frame crosses bridge
Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();

// GOOD: serialized to native, runs on UI thread
Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
```
Source: [React Native Blog](https://reactnative.dev/blog/2017/02/14/using-native-driver-for-animated)

### 3. AnimatedBuilder vs. setState (Flutter) -- 12-18ms -> 0.3-0.5ms per frame

```dart
// BAD: setState rebuilds entire tree 60x/sec
_controller.addListener(() { setState(() {}); });
// In build(): Transform.rotate(angle: _controller.value, child: ExpensiveWidget())

// GOOD: only Transform rebuilds; child built once
AnimatedBuilder(
  animation: _controller,
  child: const ExpensiveWidget(), // built once, reused
  builder: (context, child) => Transform.rotate(
    angle: _controller.value * 2 * pi, child: child,
  ),
)
```
Source: [Plugfox](https://plugfox.dev/effective-animations-in-flutter/), [Digia](https://www.digia.tech/post/flutter-animation-performance-guide)

### 4. Compose graphicsLayer vs. Recomposition -- 8-15ms overhead -> ~0.5ms

```kotlin
// BAD: alpha read during composition triggers recomposition every frame
val alpha by animateFloatAsState(if (visible) 1f else 0f)
Card(modifier = Modifier.alpha(alpha)) { ExpensiveContent() }

// GOOD: lambda defers read to draw phase, no recomposition
Card(modifier = Modifier.graphicsLayer { this.alpha = alpha }) { ExpensiveContent() }
```
Source: [Android Developers](https://developer.android.com/develop/ui/compose/performance/bestpractices)

### 5. iOS Shadow Path -- 5-15ms -> ~0.1ms per frame

```swift
// BAD: no shadowPath, ray-traces alpha channel each frame
card.layer.shadowOpacity = 0.3; card.layer.shadowRadius = 8
UIView.animate(withDuration: 0.3) { card.frame.origin.y += 200 } // layout + shadow

// GOOD: precomputed path + transform animation
card.layer.shadowPath = UIBezierPath(roundedRect: card.bounds, cornerRadius: 12).cgPath
UIView.animate(withDuration: 0.3) {
    card.transform = CGAffineTransform(translationX: 0, y: 200) // GPU only
}
```
Source: [Apple](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CoreAnimation_guide/ImprovingAnimationPerformance/ImprovingAnimationPerformance.html)

### 6. Reanimated Gesture (React Native) -- 30-45fps -> 60fps

```javascript
// BAD: PanResponder + Animated, every touch crosses bridge
onPanResponderMove: (e, g) => { pan.setValue({ x: g.dx, y: g.dy }); }

// GOOD: Reanimated worklets on UI thread
const gesture = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX; // no bridge
    translateY.value = e.translationY;
  })
  .onEnd(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  });
const style = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
}));
```
Source: [Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/), [Callstack](https://www.callstack.com/blog/60fps-animations-in-react-native)

### 7. Reduce Motion Compliance (SwiftUI)

```swift
// BAD: always animates
.animation(.spring(response: 0.4, dampingFraction: 0.7), value: isExpanded)

// GOOD: respects user preference
@Environment(\.accessibilityReduceMotion) var reduceMotion
.animation(reduceMotion ? .none : .spring(response: 0.4, dampingFraction: 0.7), value: isExpanded)
```

### 8. Flutter CustomPainter with Impeller -- first-run 200ms -> 0ms, steady 8-12ms -> 3-5ms

```dart
// BAD: new Paint per particle per frame (GC pressure + Skia shader jank)
void paint(Canvas canvas, Size size) {
    for (int i = 0; i < 500; i++) {
      final paint = Paint()..color = Colors.blue..maskFilter = blur;
      canvas.drawCircle(offset, 4.0, paint);
    }
}

// GOOD: static Paint, Impeller AOT shaders, zero GC pressure
static final _paint = Paint()..color = Colors.blue..maskFilter = blur;
void paint(Canvas canvas, Size size) {
    for (int i = 0; i < 500; i++) {
      canvas.drawCircle(offset, 4.0, _paint); // reused, no allocation
    }
}
```
Source: [Flutter Best Practices](https://docs.flutter.dev/perf/best-practices), [Impeller](https://differ.blog/p/advanced-performance-optimization-with-the-impeller-rendering-engine-d3b2c5)

---

## Quick Reference

### GPU-Accelerated Properties by Platform

| Platform | GPU-Only (Animate These) | Layout-Triggering (Avoid) |
|---|---|---|
| **Web** | `transform`, `opacity`, `filter` | `width`, `height`, `top`, `left`, `margin` |
| **iOS** | `transform`, `opacity`, `shadowOpacity` | `frame`, `bounds`, `center` (w/ Auto Layout) |
| **Compose** | `graphicsLayer { alpha, translationX/Y, scaleX/Y }` | `size`, `offset`, `padding` |
| **Flutter** | `Transform`, `Opacity`, `CustomPainter` | `Container` size, `Padding` changes |
| **React Native** | `transform`, `opacity` (useNativeDriver) | `width`, `height`, `margin` (bridge) |

### Animation Duration Cheat Sheet

| Type | Duration | Easing |
|---|---|---|
| Button feedback | 100-150ms | ease-out |
| Fade in/out | 200-250ms | ease-out / ease-in |
| Screen transition | 300-375ms | ease-in-out or spring |
| Shared element | 300-400ms | spring (damping 0.8-0.9) |

### Platform Profiling Tools

| Task | iOS | Android | Flutter | React Native | Web |
|---|---|---|---|---|---|
| FPS | Instruments | `dumpsys gfxinfo` | DevTools | Perf Monitor | DevTools |
| Jank source | Time Profiler | Perfetto | Timeline | Flipper | Flame chart |
| CI benchmark | XCTest metrics | Macrobenchmark | integration_test | Detox | Lighthouse CI |
| Production | MetricKit | FrameMetrics | timingsCallback | Custom | PerfObserver |

### Key Thresholds

| Metric | Target |
|---|---|
| Frame time P95 | < 16ms (60Hz) / < 8ms (120Hz) |
| Dropped frames during animation | < 1% |
| Animation start latency | < 100ms |
| Total animation duration | 200-500ms |
| Max compositor layers (web) | 10-15 |

---

## Sources

- [MDN Animation Performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)
- [Algolia: 60 FPS Web Animations](https://www.algolia.com/blog/engineering/60-fps-performant-web-animations-for-optimal-ux)
- [web.dev: Smoothness Metric](https://web.dev/articles/smoothness)
- [Smashing Magazine: CSS GPU Animation](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)
- [Chrome: Hardware-Accelerated Animations](https://developer.chrome.com/blog/hardware-accelerated-animations)
- [Material Design 3: Easing and Duration](https://m3.material.io/styles/motion/easing-and-duration)
- [NN/G: Animation Duration](https://www.nngroup.com/articles/animation-duration/)
- [Apple: Core Animation Performance](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CoreAnimation_guide/ImprovingAnimationPerformance/ImprovingAnimationPerformance.html)
- [Apple: CADisplayLink](https://developer.apple.com/documentation/quartzcore/cadisplaylink)
- [Apple WWDC 2021: Variable Refresh Rate](https://developer.apple.com/videos/play/wwdc2021/10147/)
- [Android: Compose Performance](https://developer.android.com/develop/ui/compose/performance/bestpractices)
- [Flutter: Rendering Performance](https://docs.flutter.dev/perf/rendering-performance)
- [Flutter: Performance Best Practices](https://docs.flutter.dev/perf/best-practices)
- [ITNEXT: Flutter Performance 2025](https://itnext.io/flutter-performance-optimization-10-techniques-that-actually-work-in-2025-4def9e5bbd2d)
- [Impeller Rendering 2026](https://dev.to/eira-wexford/how-impeller-is-transforming-flutter-ui-rendering-in-2026-3dpd)
- [Plugfox: Effective Flutter Animations](https://plugfox.dev/effective-animations-in-flutter/)
- [Digia: Flutter Animation Guide](https://www.digia.tech/post/flutter-animation-performance-guide)
- [Impeller Optimization (Differ)](https://differ.blog/p/advanced-performance-optimization-with-the-impeller-rendering-engine-d3b2c5)
- [React Native: Native Driver](https://reactnative.dev/blog/2017/02/14/using-native-driver-for-animated)
- [Reanimated Performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [Reanimated 3 Guide](https://dev.to/erenelagz/react-native-reanimated-3-the-ultimate-guide-to-high-performance-animations-in-2025-4ae4)
- [Callstack: 60fps in React Native](https://www.callstack.com/blog/60fps-animations-in-react-native)
- [RN Stress Testing 2023-2025](https://medium.com/@islamrustamov/how-react-native-improved-from-2023-to-2025-animation-stress-testing-and-a-little-bit-of-flutter-edd44297b815)
- [Viget: Animation Performance 101](https://www.viget.com/articles/animation-performance-101-browser-under-the-hood)
- [Lexo: CSS GPU Acceleration](https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/)
- [MoldStud: Animation Impact](https://moldstud.com/articles/p-exploring-the-impact-of-animation-on-performance-essential-insights-for-developers)
- [Compose Animation Performance](https://10x-programming.com/jetpack-compose-animation-performance)
- [RepaintBoundary (Medium)](https://ms3byoussef.medium.com/optimizing-flutter-ui-with-repaintboundary-2402052224c7)
- [Realm Academy: Core Animation](https://academy.realm.io/posts/tryswift-tim-oliver-advanced-graphics-with-core-animation/)
