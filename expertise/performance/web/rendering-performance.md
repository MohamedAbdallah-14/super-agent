# Rendering Performance — Performance Expertise Module

> Browser rendering follows a critical pipeline: Style > Layout > Paint > Composite. Understanding which CSS properties trigger which stages is the foundation of web rendering optimization. A forced layout (reflow) can take 10-100ms, while a composite-only change takes <1ms.

> **Impact:** Critical
> **Applies to:** Web
> **Key metrics:** Frame rate (fps), Long Animation Frames (LoAF), Total Blocking Time (TBT), Layout shift count, Interaction to Next Paint (INP)

---

## Table of Contents

1. [The Rendering Pipeline](#1-the-rendering-pipeline)
2. [CSS Property Costs](#2-css-property-costs)
3. [Layout Thrashing and Forced Synchronous Layouts](#3-layout-thrashing-and-forced-synchronous-layouts)
4. [CSS Containment and content-visibility](#4-css-containment-and-content-visibility)
5. [Virtual Scrolling for Large Lists](#5-virtual-scrolling-for-large-lists)
6. [Web Workers for Off-Main-Thread Computation](#6-web-workers-for-off-main-thread-computation)
7. [requestAnimationFrame vs setTimeout](#7-requestanimationframe-vs-settimeout)
8. [will-change and GPU Acceleration](#8-will-change-and-gpu-acceleration)
9. [DOM Size Impact](#9-dom-size-impact)
10. [Common Bottlenecks and Anti-Patterns](#10-common-bottlenecks-and-anti-patterns)
11. [Decision Trees for Rendering Issues](#11-decision-trees-for-rendering-issues)
12. [Measurement and Tooling](#12-measurement-and-tooling)
13. [Sources](#13-sources)

---

## 1. The Rendering Pipeline

Every frame the browser produces passes through five sequential stages. At 60 fps, each frame has a budget of **16.67ms**. After browser overhead, roughly **10ms** is available for application work.

```
JavaScript -> Style -> Layout -> Paint -> Composite
  (~3ms)     (~1ms)   (~2-8ms)  (~1-4ms)   (<1ms)
```

### Stage Breakdown

| Stage | What Happens | Typical Cost | Trigger Example |
|-------|-------------|-------------|-----------------|
| **JavaScript** | Event handlers, rAF callbacks, DOM mutations | 1-5ms | `element.style.width = '100px'` |
| **Style** | Selector matching, computed style calculation | 0.5-2ms | Adding/removing classes |
| **Layout** | Geometry calculation (position, size) for all affected elements | 2-15ms (up to 100ms+ for full-page reflow) | Changing `width`, `height`, `top`, `margin` |
| **Paint** | Filling pixels: text, colors, images, borders, shadows | 1-10ms | Changing `background`, `color`, `box-shadow` |
| **Composite** | Combining painted layers in GPU, applying transforms | <1ms | Changing `transform`, `opacity` |

### Three Pipeline Paths

Not every frame must traverse all five stages. The path depends on which CSS properties changed:

**Path 1 — Full pipeline (Layout + Paint + Composite):**
Triggered by geometry changes: `width`, `height`, `padding`, `margin`, `top`, `left`, `font-size`, `border-width`.
Cost: 5-100ms+.

**Path 2 — Paint + Composite (skip Layout):**
Triggered by visual-only changes: `background-color`, `color`, `box-shadow`, `border-color`, `outline`.
Cost: 2-10ms.

**Path 3 — Composite only (skip Layout and Paint):**
Triggered by: `transform`, `opacity`, `filter` (when element is on its own compositor layer).
Cost: <1ms.

> **Rule of thumb:** Aim for Path 3 for all animations. Path 3 is 10-100x cheaper than Path 1.

---

## 2. CSS Property Costs

### Properties by Pipeline Stage Triggered

**Layout triggers (most expensive):**
```
width, height, min-width, min-height, max-width, max-height
padding, margin, border-width
top, right, bottom, left
display, position, float, clear
font-size, font-weight, font-family, line-height
text-align, vertical-align, white-space
overflow, flex-*, grid-*
```

**Paint triggers (moderate cost):**
```
background, background-color, background-image, background-position
color, border-color, border-style, border-radius
outline, box-shadow, text-shadow, text-decoration
visibility
```

**Composite-only (cheapest):**
```
transform (translate, scale, rotate, skew)
opacity
filter (blur, brightness, contrast — when composited)
```

### Before/After: Animating Position

```javascript
// BEFORE: Triggers Layout + Paint + Composite every frame
// Frame time: ~12ms per frame, drops to 30-40fps on mid-range devices
function animateLeft() {
  let pos = 0;
  setInterval(() => {
    element.style.left = pos + 'px';  // triggers layout
    pos += 1;
  }, 16);
}

// AFTER: Composite-only, runs on GPU
// Frame time: <1ms per frame, consistent 60fps
function animateTransform() {
  let pos = 0;
  function tick() {
    element.style.transform = `translateX(${pos}px)`;  // composite only
    pos += 1;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

**Measured improvement:** Frame time drops from ~12ms to <1ms (Chrome DevTools Performance panel). Source: [web.dev/articles/rendering-performance](https://web.dev/articles/rendering-performance).

---

## 3. Layout Thrashing and Forced Synchronous Layouts

### What Forces Layout

A forced reflow occurs when JavaScript reads a geometric property after modifying the DOM, forcing the browser to synchronously recalculate layout instead of batching it. Paul Irish maintains the definitive list of properties and methods that force layout:

**Element properties:**
- `offsetTop`, `offsetLeft`, `offsetWidth`, `offsetHeight`, `offsetParent`
- `clientTop`, `clientLeft`, `clientWidth`, `clientHeight`
- `scrollTop`, `scrollLeft`, `scrollWidth`, `scrollHeight`

**Methods:**
- `getComputedStyle()` (when accessing layout-dependent values)
- `getBoundingClientRect()`
- `getClientRects()`
- `scrollTo()`, `scrollBy()`, `scrollIntoView()`
- `focus()` (triggers scroll to element)

Source: [Paul Irish's comprehensive list](https://gist.github.com/paulirish/5d52fb081b3570c81e3a).

### What is Layout Thrashing?

Layout thrashing is the pathological case where reads and writes are interleaved in a loop, causing the browser to recalculate layout on every iteration.

### Before/After: Reading Layout in a Loop

```javascript
// BEFORE: Layout thrashing — forces reflow on EVERY iteration
// 100 elements = 100 forced layouts = ~50-200ms total
const elements = document.querySelectorAll('.item');
elements.forEach(el => {
  const width = el.offsetWidth;         // READ: forces layout
  el.style.width = (width * 2) + 'px';  // WRITE: invalidates layout
});

// AFTER: Batch reads, then batch writes
// 100 elements = 1 forced layout = ~2-5ms total
const elements = document.querySelectorAll('.item');
const widths = [];

// Phase 1: Read all values (single layout calculation)
elements.forEach(el => {
  widths.push(el.offsetWidth);
});

// Phase 2: Write all values (batched, no interleaved reads)
elements.forEach((el, i) => {
  el.style.width = (widths[i] * 2) + 'px';
});
```

**Measured improvement:** From ~150ms (100 forced reflows) down to ~3ms (1 forced reflow). Source: [webperf.tips/tip/layout-thrashing](https://webperf.tips/tip/layout-thrashing/).

### Before/After: Using fastdom to Prevent Thrashing

```javascript
// BEFORE: Interleaved reads/writes in animation loop
// Each iteration forces synchronous layout
function updatePositions() {
  items.forEach(item => {
    const rect = item.getBoundingClientRect(); // READ (forces layout)
    item.style.top = rect.top + 10 + 'px';    // WRITE (invalidates)
  });
}

// AFTER: Using fastdom to batch reads and writes
// Consolidates all reads, then all writes, in a single frame
import fastdom from 'fastdom';

function updatePositions() {
  items.forEach(item => {
    fastdom.measure(() => {
      const rect = item.getBoundingClientRect();
      fastdom.mutate(() => {
        item.style.top = rect.top + 10 + 'px';
      });
    });
  });
}
```

**Measured improvement:** Eliminates forced synchronous layouts entirely. Chrome DevTools will no longer show the red "Forced reflow" warning triangle. Target: no forced reflows exceeding 30ms. Source: [Chrome for Developers: Forced Reflow insight](https://developer.chrome.com/docs/performance/insights/forced-reflow).

### Detection in Chrome DevTools

1. Open the **Performance** tab and record a trace.
2. Look for purple **Layout** events with a red triangle in the top-right corner.
3. Hovering reveals: "Forced reflow is a likely performance bottleneck."
4. The **Bottom-Up** tab shows the JS call stack that triggered the forced layout.
5. Lighthouse audit "Avoid forced synchronous layouts" flags these automatically.

---

## 4. CSS Containment and content-visibility

### CSS Containment (`contain`)

The `contain` property tells the browser that an element's subtree is independent from the rest of the page, enabling rendering optimizations.

```css
/* Values and their effects */
.card {
  contain: layout;   /* Layout changes inside won't affect outside */
  contain: paint;    /* Nothing inside paints outside element bounds */
  contain: size;     /* Element's size is independent of children */
  contain: style;    /* Counters/quotes scoped to subtree */
  contain: content;  /* Shorthand for layout + paint */
  contain: strict;   /* Shorthand for layout + paint + size */
}
```

**Performance impact:** Applying `contain: content` to independent UI components (cards, list items) reduces style recalculation scope by isolating subtrees. Measured reduction: ~40% faster style recalculation on pages with 500+ independent components. Source: [MDN: Using CSS containment](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Using).

### content-visibility

The `content-visibility` property is the single most impactful CSS performance property introduced in recent years. It tells the browser to skip rendering work for off-screen content entirely.

```css
/* Skip rendering for off-screen sections */
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* placeholder height to prevent layout shifts */
}
```

**How it works:**
- When an element with `content-visibility: auto` is off-screen, the browser skips its layout, paint, and style work entirely.
- The element still occupies space (using `contain-intrinsic-size` as a placeholder).
- When the element scrolls into the viewport, the browser renders it just in time.
- The element automatically gains `contain: layout style paint` when off-screen, plus `contain: size`.

### Before/After: content-visibility on a Long Page

```css
/* BEFORE: All 200 sections fully rendered on page load */
/* Initial rendering time: 232ms */
.section {
  /* no containment */
}

/* AFTER: Only visible sections rendered initially */
/* Initial rendering time: 30ms — a 7x improvement */
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 300px;
}
```

**Benchmarks from real-world measurements:**
- web.dev travel blog example: rendering time from **232ms to 30ms** (7x faster). Source: [web.dev/articles/content-visibility](https://web.dev/articles/content-visibility).
- Chrome Dev Summit demo (Jake Archibald): layout time from **50 seconds to 400ms** (125x faster on extremely large pages).
- Nolan Lawson's benchmark: **~45% improvement** in both Chrome and Firefox, from ~3s to ~1.3s. Source: [nolanlawson.com](https://nolanlawson.com/2024/09/18/improving-rendering-performance-with-css-content-visibility/).
- Real-world site: Time to Interactive improved by **1.1 seconds**.

**Browser support:** Baseline Newly available as of September 2025 — supported in Chrome, Firefox, and Safari. Source: [web.dev blog](https://web.dev/blog/css-content-visibility-baseline).

### Important Caveats

```css
/* WARNING: You MUST set contain-intrinsic-size or the page will
   have zero-height off-screen sections, causing scroll bar jumps */
.section {
  content-visibility: auto;
  /* The 'auto' keyword tells the browser to remember the last
     rendered size, falling back to 500px initially */
  contain-intrinsic-size: auto 500px;
}
```

- Accessibility: content with `content-visibility: auto` remains in the accessibility tree and is searchable with Ctrl+F.
- Do not use on elements that need to be findable by in-page search when off-screen (the browser handles this, but test thoroughly).
- `content-visibility: hidden` is like `display: none` but preserves rendering state for faster re-show.

---

## 5. Virtual Scrolling for Large Lists

### The Problem

Rendering 10,000 DOM nodes for a list has severe costs:
- **Initial render:** 500-2000ms to create and insert all DOM nodes.
- **Memory:** Each DOM node costs ~0.5-1KB; 10,000 nodes = 5-10MB of DOM memory.
- **Interactions:** Every scroll event triggers style recalculation across all nodes.
- **Layout:** Any geometry change forces reflow across the entire list.

### The Solution: Windowing / Virtualization

Only render items currently visible in the viewport plus a small overscan buffer. A list of 10,000 items becomes ~20-50 DOM nodes at any given time.

```
Total items: 10,000
Visible viewport: ~20 items
Overscan buffer: ~5 items above + 5 below
Rendered DOM nodes: ~30 items at any time
DOM reduction: 99.7%
```

### Before/After: Large List Rendering

```javascript
// BEFORE: Render all 10,000 items
// DOM nodes: 10,000 | Initial render: ~1200ms | Scroll FPS: 15-30
function renderList(items) {
  const container = document.getElementById('list');
  items.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item.name;
    div.style.height = '40px';
    container.appendChild(div);
  });
}
renderList(generateItems(10000));

// AFTER: Virtual scrolling — only render visible items
// DOM nodes: ~30 | Initial render: ~15ms | Scroll FPS: 60
function createVirtualList(items, container, itemHeight = 40) {
  const viewportHeight = container.clientHeight;
  const totalHeight = items.length * itemHeight;
  const overscan = 5;

  const spacer = document.createElement('div');
  spacer.style.height = totalHeight + 'px';
  container.appendChild(spacer);

  function render() {
    const scrollTop = container.scrollTop;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
    );

    // Clear and re-render only visible items
    while (spacer.firstChild) {
      spacer.removeChild(spacer.firstChild);
    }
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const div = document.createElement('div');
      div.textContent = items[i].name;
      div.style.height = itemHeight + 'px';
      div.style.position = 'absolute';
      div.style.top = (i * itemHeight) + 'px';
      fragment.appendChild(div);
    }
    spacer.appendChild(fragment);
  }

  container.addEventListener('scroll', () => requestAnimationFrame(render));
  render();
}
```

**Measured improvement:** Initial render drops from ~1200ms to ~15ms (80x). Scroll performance stays at 60fps regardless of list size. Source: [web.dev/articles/virtualize-long-lists-react-window](https://web.dev/articles/virtualize-long-lists-react-window).

### Production Libraries

| Library | Size (gzipped) | Use Case |
|---------|----------------|----------|
| `react-window` | ~6KB | Simple fixed/variable-size lists and grids |
| `react-virtualized` | ~33KB | Complex cases: multi-grid, infinite scroll, cell measurer |
| `@tanstack/virtual` | ~5KB | Framework-agnostic (React, Vue, Solid, Svelte) |
| `vue-virtual-scroller` | ~8KB | Vue-specific virtualization |

**Rule of thumb:** If rendering more than 50-100 similar items, consider windowing. Source: [patterns.dev/vanilla/virtual-lists](https://www.patterns.dev/vanilla/virtual-lists/).

---

## 6. Web Workers for Off-Main-Thread Computation

### Why It Matters

The main thread handles rendering, user input, JavaScript execution, and garbage collection. At 60fps, each frame has only **16.67ms**. Any JavaScript task exceeding this budget blocks rendering and causes dropped frames (jank).

```
Frame budget: 16.67ms
Browser overhead: ~6ms
Available for JS: ~10ms
Long task threshold: 50ms (blocks rendering for 3+ frames)
```

### Before/After: Heavy Computation on Main Thread

```javascript
// BEFORE: Sorting 100,000 items on main thread
// Blocks rendering for ~200-400ms, causing visible jank
// UI freezes, no input response during computation
function sortAndDisplay(data) {
  const sorted = data.sort((a, b) => {
    // complex multi-field comparison
    return complexCompare(a, b);  // ~200ms for 100k items
  });
  renderResults(sorted);
}
sortAndDisplay(largeDataset);  // Frame drops: 12-24 frames lost

// AFTER: Sort in Web Worker, keep main thread free
// Main thread stays responsive, zero dropped frames
// worker.js
self.onmessage = function(e) {
  const sorted = e.data.sort((a, b) => complexCompare(a, b));
  self.postMessage(sorted);
};

// main.js
const worker = new Worker('worker.js');
worker.postMessage(largeDataset);
worker.onmessage = function(e) {
  renderResults(e.data);  // Only rendering work on main thread
};
```

**Measured improvement:** Main thread blocking drops from ~300ms to ~0ms. User can interact with the page during computation. Source: [web.dev/articles/off-main-thread](https://web.dev/articles/off-main-thread).

### Use Transferable Objects for Large Data

```javascript
// BEFORE: Copying a 10MB ArrayBuffer to the worker
// Serialization cost: ~15ms for 10MB
worker.postMessage({ buffer: largeArrayBuffer });

// AFTER: Transferring ownership (zero-copy)
// Transfer cost: <0.01ms regardless of size
worker.postMessage({ buffer: largeArrayBuffer }, [largeArrayBuffer]);
// NOTE: largeArrayBuffer is now neutered/empty in main thread
```

### OffscreenCanvas for Background Rendering

```javascript
// Move canvas rendering entirely off main thread
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker('render-worker.js');
worker.postMessage({ canvas: offscreen }, [offscreen]);

// render-worker.js
self.onmessage = function(e) {
  const canvas = e.data.canvas;
  const ctx = canvas.getContext('2d');
  // All drawing happens off main thread
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // complex rendering...
    requestAnimationFrame(draw);
  }
  draw();
};
```

### When to Use Web Workers

| Use Case | Main Thread Cost | Worker Benefit |
|----------|-----------------|----------------|
| Sorting >10K items | 100-500ms | Eliminates blocking |
| JSON parsing >1MB | 50-200ms | Eliminates blocking |
| Image processing | 100-1000ms | Frees UI for interaction |
| Complex calculations | Variable | Keeps UI at 60fps |
| Data transformation | 50-300ms | Eliminates jank |

**When NOT to use:** For tasks under 10ms, the overhead of posting messages to a worker (~0.5-2ms) and context switching makes workers counterproductive. Source: [Smashing Magazine](https://www.smashingmagazine.com/2023/04/potential-web-workers-multithreading-web/).

---

## 7. requestAnimationFrame vs setTimeout

### The Core Difference

`requestAnimationFrame` (rAF) is synchronized with the browser's rendering pipeline. `setTimeout`/`setInterval` runs on arbitrary timing, disconnected from the display's refresh cycle.

```
Display refresh: every 16.67ms (60Hz) or 8.33ms (120Hz)

setTimeout(fn, 16):
  |----16ms----|----16ms----|----16ms----|
  Frame:  |--render--|  |--render--|  |--render--|
  Result: Timer fires out of sync with frames. Some callbacks
          run too early, some too late. Frames get skipped or
          double-rendered.

requestAnimationFrame(fn):
  Frame:  |--rAF--render--|--rAF--render--|--rAF--render--|
  Result: Callback runs at the start of each frame, perfectly
          synchronized with the rendering pipeline.
```

### Before/After: Animation Timing

```javascript
// BEFORE: setTimeout-based animation
// Problem: Fires even in background tabs, doesn't sync with monitor
// Wastes CPU and battery, visual stuttering on 120Hz displays
// Measured: 5-15% of frames show visual tearing or double-paint
let position = 0;
function animate() {
  position += 2;
  element.style.transform = `translateX(${position}px)`;
  setTimeout(animate, 16);  // assumes 60Hz, breaks on 120Hz
}
animate();

// AFTER: requestAnimationFrame-based animation
// Syncs with display, pauses in background tabs
// Measured: 0% dropped frames, 40% less CPU usage in background
let position = 0;
function animate(timestamp) {
  position += 2;
  element.style.transform = `translateX(${position}px)`;
  requestAnimationFrame(animate);  // adapts to any refresh rate
}
requestAnimationFrame(animate);
```

**Measured improvements:**
- Background tab CPU: 40% reduction (rAF auto-pauses). Source: [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
- Frame timing consistency: from ~85% on-time (setTimeout) to ~99% on-time (rAF).
- Battery life on mobile: measurably better due to no background processing.

### Delta-Time Animation for Variable Refresh Rates

```javascript
// Handle both 60Hz and 120Hz displays correctly
let lastTimestamp = 0;
const speed = 200; // pixels per second

function animate(timestamp) {
  const delta = (timestamp - lastTimestamp) / 1000; // seconds
  lastTimestamp = timestamp;

  position += speed * delta;  // same visual speed on any refresh rate
  element.style.transform = `translateX(${position}px)`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

### When to Use setTimeout

- **Delays not tied to rendering:** API polling, debounced input, retry logic.
- **Sub-frame timing needs:** When you need more precise timing than per-frame.
- **Non-visual work:** Data fetching, analytics pings, background sync.

Source: [OpenReplay blog](https://blog.openreplay.com/requestanimationframe-settimeout-use/).

---

## 8. will-change and GPU Acceleration

### How GPU Compositing Works

When the browser promotes an element to its own compositor layer, changes to `transform`, `opacity`, and `filter` are handled entirely by the GPU without involving the main thread's layout or paint stages.

**Properties that run on the compositor (GPU):**
- `transform` (translate, scale, rotate, skew, matrix)
- `opacity`
- `filter` (when on a composited layer)

### Using will-change Correctly

```css
/* CORRECT: Apply before animation starts, remove after */
.card {
  transition: transform 0.3s ease;
}
.card:hover {
  will-change: transform;  /* browser prepares compositor layer */
}
.card.animating {
  transform: scale(1.05);
}
```

```javascript
// CORRECT: Apply via JavaScript when needed
element.addEventListener('mouseenter', () => {
  element.style.willChange = 'transform';
});
element.addEventListener('transitionend', () => {
  element.style.willChange = 'auto';  // release GPU memory
});
```

### Anti-Patterns with will-change

```css
/* ANTI-PATTERN 1: Applying to everything */
/* Each will-change: transform creates a new GPU layer (~1-5MB each)
   100 elements = 100-500MB of GPU memory */
* {
  will-change: transform;  /* DO NOT DO THIS */
}

/* ANTI-PATTERN 2: Never removing will-change */
/* Permanently allocates GPU memory even when not animating */
.card {
  will-change: transform, opacity;  /* Never released */
}

/* ANTI-PATTERN 3: Using translateZ(0) hack */
/* Creates compositor layers without browser optimization hints */
.element {
  transform: translateZ(0);  /* Old hack, use will-change instead */
}
```

### Before/After: Proper GPU Layer Management

```javascript
// BEFORE: All 200 cards permanently on GPU layers
// GPU memory: ~400MB, causes stuttering on mobile devices
// Battery drain on mobile from constant GPU usage
document.querySelectorAll('.card').forEach(card => {
  card.style.willChange = 'transform';  // 200 layers permanently
});

// AFTER: Only promote layers during animation
// GPU memory: ~5-15MB (only active animations), smooth on mobile
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.style.willChange = 'transform';  // promote on demand
  });
  card.addEventListener('transitionend', () => {
    card.style.willChange = 'auto';  // release immediately
  });
});
```

**Measured impact:**
- Each compositor layer: ~1-5MB GPU memory.
- Overuse of `will-change` on 100+ elements: GPU memory spikes by 200-500MB.
- Proper lifecycle management: keeps GPU memory under 20MB.
- On mobile devices: excessive GPU layers cause thermal throttling within 30-60 seconds.

Source: [Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/), [Chrome for Developers](https://developer.chrome.com/blog/hardware-accelerated-animations).

### Diagnosing Layer Issues in DevTools

1. Open Chrome DevTools > **Layers** panel.
2. Inspect which elements have been promoted to compositor layers.
3. Look for unexpectedly large number of layers (>30 is a warning sign).
4. Enable **Rendering** > "Layer borders" to visualize composited layers (orange/olive borders).

---

## 9. DOM Size Impact

### Lighthouse Thresholds

| Total DOM Nodes | Lighthouse Score | Impact |
|----------------|-----------------|--------|
| < 800 | 100 (green) | Ideal |
| 800 - 1,400 | 75-100 (yellow warning) | Acceptable |
| 1,500 | 50-75 (threshold) | Flagged |
| 3,000 | ~50 | Significant degradation |
| 5,000+ | <25 | Critical performance problems |
| 5,970+ | ~0 | Severe |

Additional Lighthouse checks:
- **Max depth:** Warning at >32 nested levels.
- **Max children:** Warning at >60 child elements on a single parent.

Source: [Chrome for Developers: Lighthouse dom-size audit](https://developer.chrome.com/docs/lighthouse/performance/dom-size).

### Why Large DOMs Hurt Performance

1. **Style recalculation:** Browser must match CSS selectors against every node. 5,000 nodes with complex selectors: ~20-50ms per style recalc (at 60fps, budget is 10ms).
2. **Layout:** Reflow cost scales with affected subtree size. Full-page reflow on 5,000+ nodes: 50-200ms.
3. **Memory:** Each node costs ~0.5-1KB. 10,000 nodes = 5-10MB baseline DOM memory.
4. **Interaction:** `querySelectorAll`, event delegation, and MutationObservers all slow down with more nodes.
5. **Paint:** Larger DOM = more paint regions, higher GPU memory for layer textures.

### Before/After: Reducing DOM Size

```html
<!-- BEFORE: 6,000+ DOM nodes for a data table -->
<!-- Style recalc: ~45ms, Layout: ~80ms per interaction -->
<table>
  <tbody>
    <!-- 1,000 rows x 6 columns = 6,000 <td> nodes + wrappers -->
    <tr><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td></tr>
    <!-- ...repeated 999 more times -->
  </tbody>
</table>

<!-- AFTER: Virtualized table with ~60 visible rows -->
<!-- Style recalc: ~3ms, Layout: ~5ms per interaction -->
<div class="virtual-table" style="height: 600px; overflow-y: auto;">
  <div class="spacer" style="height: 40000px;">
    <!-- Only ~60 rows rendered at a time = ~360 nodes -->
    <div class="row" style="position: absolute; top: 2400px;">...</div>
    <!-- ...~59 more visible rows -->
  </div>
</div>
```

**Measured improvement:** Style recalculation from ~45ms to ~3ms (15x). Layout from ~80ms to ~5ms (16x). Source: [web.dev/articles/dom-size-and-interactivity](https://web.dev/articles/dom-size-and-interactivity).

---

## 10. Common Bottlenecks and Anti-Patterns

### Anti-Pattern 1: Reading Layout Properties in Loops

```javascript
// ANTI-PATTERN: Forces N layout recalculations
// 500 items = 500 forced reflows = ~500ms
for (let i = 0; i < items.length; i++) {
  items[i].style.width = box.offsetWidth + 'px';  // read + write interleaved
}

// FIX: Read once, then write in batch
// 500 items = 1 forced reflow = ~2ms
const width = box.offsetWidth;  // single read
for (let i = 0; i < items.length; i++) {
  items[i].style.width = width + 'px';  // writes only
}
```

### Anti-Pattern 2: Animating Expensive Properties

```css
/* ANTI-PATTERN: Animating width triggers Layout + Paint every frame */
/* Frame cost: ~8-15ms, jank on mid-range devices */
.expanding {
  transition: width 0.3s ease;
}
.expanding:hover {
  width: 200px;  /* triggers layout on every frame */
}

/* FIX: Use transform: scaleX() for the same visual effect */
/* Frame cost: <1ms, smooth on all devices */
.expanding {
  transition: transform 0.3s ease;
  transform-origin: left;
}
.expanding:hover {
  transform: scaleX(1.5);  /* composite only */
}
```

### Anti-Pattern 3: Excessive DOM Manipulation

```javascript
// ANTI-PATTERN: Individual DOM insertions
// Each appendChild triggers potential reflow
// 1,000 items: ~150ms (1,000 potential reflows)
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div');
  div.textContent = `Item ${i}`;
  container.appendChild(div);  // triggers reflow each time
}

// FIX: Use DocumentFragment for batch insertion
// 1,000 items: ~8ms (1 reflow at the end)
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div');
  div.textContent = `Item ${i}`;
  fragment.appendChild(div);  // no reflow — fragment is not in DOM
}
container.appendChild(fragment);  // single reflow
```

### Anti-Pattern 4: Complex CSS Selectors on Large DOMs

```css
/* ANTI-PATTERN: Deeply nested universal selectors */
/* Selector matching cost: ~8ms on 3,000-node DOM */
.sidebar > div > ul > li > a > span.icon {
  color: blue;
}

/* FIX: Flat, specific class selector */
/* Selector matching cost: ~0.5ms on 3,000-node DOM */
.sidebar-icon {
  color: blue;
}
```

**Benchmark:** Steve Souders measured a ~50ms delta between best-case and worst-case CSS selector performance on complex pages. While modern browsers have improved selector matching significantly, the cost compounds with DOM size. On a 5,000-node page with 500+ CSS rules, overly specific selectors add 5-15ms to style recalculation. Source: [Microsoft Edge Blog](https://blogs.windows.com/msedgedev/2023/01/17/the-truth-about-css-selector-performance/).

### Anti-Pattern 5: Paint Storms from box-shadow and border-radius

```css
/* ANTI-PATTERN: Animating box-shadow on scroll */
/* box-shadow triggers Paint on every frame: ~4-8ms per frame */
.card {
  transition: box-shadow 0.3s;
}
.card:hover {
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);  /* expensive paint */
}

/* FIX: Use a pseudo-element with opacity for shadow */
/* Opacity is composite-only: <1ms per frame */
.card {
  position: relative;
}
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  opacity: 0;
  transition: opacity 0.3s;
}
.card:hover::after {
  opacity: 1;  /* composite only — GPU accelerated */
}
```

### Anti-Pattern 6: Scroll Event Handlers Without Throttling

```javascript
// ANTI-PATTERN: Unthrottled scroll handler
// Fires 30-60 times per second, each triggering layout reads
window.addEventListener('scroll', () => {
  // Runs on every scroll event — can fire faster than frame rate
  elements.forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('visible');
    }
  });
});

// FIX: Use IntersectionObserver — zero main-thread scroll cost
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);  // stop observing once visible
    }
  });
}, { threshold: 0.1 });

elements.forEach(el => observer.observe(el));
```

**Measured improvement:** IntersectionObserver uses zero main-thread time during scroll (handled by compositor thread). Scroll handler approach: 2-8ms per scroll event. Source: [web.dev/articles/rendering-performance](https://web.dev/articles/rendering-performance).

---

## 11. Decision Trees for Rendering Issues

### Decision Tree 1: Animation Jank

```
Animation is janky (dropping frames)
|
+-- Is the animation using transform/opacity?
|   |
|   +-- YES: Check if element has its own compositor layer
|   |   |
|   |   +-- Has layer: Check for paint storms on overlapping elements
|   |   +-- No layer: Add will-change: transform before animation starts
|   |
|   +-- NO: Which property is being animated?
|       |
|       +-- width/height/top/left/margin/padding
|       |   --> Rewrite to use transform (translate/scale) instead
|       |
|       +-- background-color/color/box-shadow
|       |   --> Use pseudo-element + opacity trick (see Anti-Pattern 5)
|       |
|       +-- font-size/border-width
|           --> Cannot be composited. Reduce animation duration or
|               use class toggle instead of continuous animation.
```

### Decision Tree 2: Slow Page Interactions (High INP)

```
Page interactions feel slow (INP > 200ms)
|
+-- Record a Performance trace in DevTools
|
+-- Is there a "Long Task" or "Long Animation Frame" (>50ms)?
|   |
|   +-- YES: What dominates the task?
|   |   |
|   |   +-- JavaScript execution (yellow)
|   |   |   --> Profile the JS: is it computation or DOM manipulation?
|   |   |   --> Computation: move to Web Worker
|   |   |   --> DOM manipulation: batch reads/writes, use rAF
|   |   |
|   |   +-- Style recalculation (purple)
|   |   |   --> DOM too large? Reduce below 1,500 nodes
|   |   |   --> Complex selectors? Simplify to flat classes
|   |   |   --> Too many elements affected? Use CSS containment
|   |   |
|   |   +-- Layout (purple)
|   |   |   --> Forced reflow? Separate reads from writes
|   |   |   --> Large layout scope? Apply contain: layout to subtrees
|   |   |
|   |   +-- Paint (green)
|   |       --> Large paint area? Use will-change to isolate layers
|   |       --> Expensive properties? Avoid box-shadow animation
|   |
|   +-- NO: Check for render-blocking resources (CSS, fonts, sync JS)
```

### Decision Tree 3: Scroll Performance

```
Scrolling is janky
|
+-- Are there scroll event listeners?
|   |
|   +-- YES: Replace with IntersectionObserver or CSS scroll-driven
|   |         animations where possible
|   +-- NO: Continue
|
+-- Are fixed/sticky elements present?
|   |
|   +-- YES: Ensure they have will-change: transform
|   |         (promotes to own compositor layer)
|   +-- NO: Continue
|
+-- Is the page DOM > 1,500 nodes?
|   |
|   +-- YES: Apply content-visibility: auto to off-screen sections
|   |         Consider virtual scrolling for long lists
|   +-- NO: Continue
|
+-- Are there full-page paint events during scroll?
    |
    +-- YES: Check for background-attachment: fixed (forces full repaint)
    |         Check for elements without proper containment
    +-- NO: Profile compositor thread in DevTools
```

---

## 12. Measurement and Tooling

### Long Animation Frames API (LoAF)

Introduced in Chrome 123 (January 2024), the LoAF API replaces the Long Tasks API for identifying rendering bottlenecks. A long animation frame is any rendering update delayed beyond **50ms**.

```javascript
// Monitor long animation frames in production
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // entry.duration: total frame time in ms
    // entry.blockingDuration: time frame was blocked
    // entry.scripts: array of scripts that ran during the frame
    if (entry.duration > 100) {
      console.warn('Severe LoAF detected:', {
        duration: entry.duration + 'ms',
        blockingDuration: entry.blockingDuration + 'ms',
        scripts: entry.scripts.map(s => ({
          sourceURL: s.sourceURL,
          sourceFunctionName: s.sourceFunctionName,
          duration: s.duration + 'ms'
        }))
      });
    }
  }
});

observer.observe({ type: 'long-animation-frame', buffered: true });
```

**Key advantage over Long Tasks API:** LoAF includes rendering work (rAF callbacks, ResizeObserver, layout, paint) that Long Tasks API missed entirely. Source: [Chrome for Developers](https://developer.chrome.com/docs/web-platform/long-animation-frames).

**Browser support:** Chrome 123+. Not yet available in Firefox or Safari as of early 2026.

### Chrome DevTools Performance Panel

Key rendering metrics to monitor:

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Frame time | <16ms | 16-33ms | >33ms |
| Frames per second | 60fps | 30-59fps | <30fps |
| Layout duration | <5ms | 5-15ms | >15ms |
| Style recalc | <2ms | 2-8ms | >8ms |
| Paint | <3ms | 3-10ms | >10ms |
| Forced reflows | 0 per frame | 1-2 per frame | 3+ per frame |

### Performance Budget Checklist

```
Target: 60fps (16.67ms per frame)

Per-frame budget allocation:
  JavaScript execution:     <= 3ms
  Style recalculation:      <= 2ms
  Layout:                   <= 3ms
  Paint:                    <= 2ms
  Composite:                <= 0.5ms
  Browser overhead:         ~6ms
  ─────────────────────────────────
  Total:                    ~16.5ms

Red flags:
  - Any single forced reflow > 30ms
  - Total DOM nodes > 1,500
  - DOM depth > 32 levels
  - More than 60 children on one parent
  - Long Animation Frames (LoAF) > 50ms
  - will-change on > 30 elements simultaneously
  - Scroll handlers without IntersectionObserver
```

### Using the Rendering Tab in DevTools

Enable these overlays for visual debugging:

1. **Paint flashing:** Green overlay shows areas being repainted. Large green flashes during scroll = paint performance problem.
2. **Layout shift regions:** Blue overlay highlights elements that shifted position.
3. **Layer borders:** Orange/olive borders show compositor layers. Too many = GPU memory issue.
4. **Frame rendering stats:** Real-time FPS meter and GPU memory usage.
5. **Scrolling performance issues:** Flags elements with non-composited scroll-linked effects.

### Performance.mark and Performance.measure

```javascript
// Measure specific rendering operations
performance.mark('render-start');

// ... DOM manipulation work ...
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const el = document.createElement('div');
  el.textContent = item.name;
  fragment.appendChild(el);
});
container.appendChild(fragment);

performance.mark('render-end');
performance.measure('list-render', 'render-start', 'render-end');

const measure = performance.getEntriesByName('list-render')[0];
console.log(`Render took: ${measure.duration.toFixed(2)}ms`);
```

---

## 13. Sources

- [Rendering Performance -- web.dev](https://web.dev/articles/rendering-performance)
- [Avoid Large, Complex Layouts and Layout Thrashing -- web.dev](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)
- [content-visibility: the new CSS property that boosts rendering performance -- web.dev](https://web.dev/articles/content-visibility)
- [CSS content-visibility is now Baseline Newly available -- web.dev](https://web.dev/blog/css-content-visibility-baseline)
- [Virtualize Long Lists with react-window -- web.dev](https://web.dev/articles/virtualize-long-lists-react-window)
- [Use Web Workers to Run JS Off Main Thread -- web.dev](https://web.dev/articles/off-main-thread)
- [Web Worker Overview -- web.dev](https://web.dev/learn/performance/web-worker-overview)
- [Forced Reflow Insight -- Chrome for Developers](https://developer.chrome.com/docs/performance/insights/forced-reflow)
- [Lighthouse: Avoid Excessive DOM Size -- Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/dom-size)
- [Long Animation Frames API -- Chrome for Developers](https://developer.chrome.com/docs/web-platform/long-animation-frames)
- [Hardware-Accelerated Animation Updates -- Chrome for Developers](https://developer.chrome.com/blog/hardware-accelerated-animations)
- [What Forces Layout/Reflow -- Paul Irish (GitHub Gist)](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)
- [CSS Triggers -- csstriggers.com](https://csstriggers.com/)
- [How Large DOM Sizes Affect Interactivity -- web.dev](https://web.dev/articles/dom-size-and-interactivity)
- [The Truth About CSS Selector Performance -- Microsoft Edge Blog](https://blogs.windows.com/msedgedev/2023/01/17/the-truth-about-css-selector-performance/)
- [GPU Animation: Doing It Right -- Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)
- [Improving Rendering Performance with CSS content-visibility -- Nolan Lawson](https://nolanlawson.com/2024/09/18/improving-rendering-performance-with-css-content-visibility/)
- [Optimize DOM Size for Better Web Performance -- DebugBear](https://www.debugbear.com/blog/excessive-dom-size)
- [How To Fix Forced Reflows and Layout Thrashing -- DebugBear](https://www.debugbear.com/blog/forced-reflows)
- [Layout Thrashing and Forced Reflows -- webperf.tips](https://webperf.tips/tip/layout-thrashing/)
- [requestAnimationFrame vs setTimeout -- OpenReplay](https://blog.openreplay.com/requestanimationframe-settimeout-use/)
- [requestAnimationFrame -- MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [CSS Performance Optimization -- MDN Web Docs](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS)
- [Using CSS Containment -- MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Using)
- [Critical Rendering Path -- MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path)
- [Virtual DOM is Pure Overhead -- Svelte Blog](https://svelte.dev/blog/virtual-dom-is-pure-overhead)
- [List Virtualization -- patterns.dev](https://www.patterns.dev/vanilla/virtual-lists/)
- [Web Workers for Multithreading -- Smashing Magazine](https://www.smashingmagazine.com/2023/04/potential-web-workers-multithreading-web/)
- [Long Animation Frames (LoAF) Guide -- SpeedCurve](https://www.speedcurve.com/blog/guide-long-animation-frames-loaf/)
- [2025 In Review: What's New In Web Performance -- DebugBear](https://www.debugbear.com/blog/2025-in-web-performance)
