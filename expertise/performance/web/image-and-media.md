# Image & Media Optimization

> **Expertise Module** | Performance Engineering | Web Platform
> Last updated: 2026-03-08

---

## 1. Why This Matters: The Weight of Media on the Web

Images and media are the single largest contributor to page weight. Per the HTTP Archive Web Almanac 2024:

- The median desktop page loads **1,054 KB of images**; mobile loads **900 KB**.
- The median desktop page contains **18 images**; mobile contains **16 images**.
- Images account for **~50% of total page weight** on median pages, up to **63%** at the 90th percentile.
- YoY (Oct 2023-2024), desktop image weight grew **8.6%** (+210 KB); mobile grew **6.4%** (+140 KB).

Sources: [HTTP Archive 2024 - Page Weight](https://almanac.httparchive.org/en/2024/page-weight), [HTTP Archive 2024 - Media](https://almanac.httparchive.org/en/2024/media)

Unoptimized media directly degrades Core Web Vitals:

| Metric | How Media Impacts It |
|--------|---------------------|
| **LCP** | Hero images are the LCP element on ~80% of pages. Uncompressed/unpreloaded images delay LCP by seconds. |
| **CLS** | Images without explicit width/height cause layout shifts as they load. |
| **INP** | Heavy image decoding on the main thread blocks interaction responsiveness. |

**Business impact**: Vodafone improved LCP by 31% and saw an 8% increase in sales. Source: [web.dev - Optimize LCP](https://web.dev/articles/optimize-lcp)

---

## 2. Modern Image Formats: AVIF, WebP, and JPEG

### 2.1 Format Comparison Benchmarks

Real-world test on a 2000x2000 pixel product photo:

| Format | Quality Setting | File Size | Savings vs JPEG |
|--------|----------------|-----------|-----------------|
| JPEG   | Quality 80     | ~540 KB   | baseline        |
| WebP   | Lossy Q85      | ~350 KB   | **35% smaller** |
| AVIF   | CQ 28          | ~210 KB   | **61% smaller** |

90th percentile file sizes (HTTP Archive 2024):

| Format | P90 Size |
|--------|----------|
| JPEG   | 274 KB   |
| PNG    | 196 KB   |
| WebP   | 116 KB   |
| AVIF   | 45 KB    |

Sources: [SpeedVitals](https://speedvitals.com/blog/webp-vs-avif/), [ImageRobo](https://imagerobo.com/blogs/image-formats-comparison-jpeg-webp-avif)

### 2.2 Compression Efficiency Summary

- **WebP**: 25-34% smaller than JPEG at equivalent visual quality.
- **AVIF**: ~50% smaller than JPEG, 20-30% smaller than WebP.
- **AVIF** has a ~10% quality advantage over WebP at equal file sizes for photographic content.

### 2.3 Browser Support (September 2025)

| Format | Global Support | Notable Gaps |
|--------|---------------|--------------|
| JPEG   | 100%          | None         |
| WebP   | **95.29%**    | Older IE (irrelevant) |
| AVIF   | **93.8%**     | Older Safari, some older Android WebViews |

### 2.4 Encoding/Decoding Performance

- **WebP** encodes and decodes faster than AVIF -- relevant for on-the-fly server-side generation.
- **AVIF** encoding is 5-10x slower than WebP, but 2024-2025 algorithm improvements significantly reduced decoding overhead.
- The smaller file sizes of AVIF compensate for slightly slower decoding (network transfer time dominates).

### 2.5 Adoption Rates (HTTP Archive 2024)

| Format | Share of All Images | YoY Change |
|--------|-------------------|------------|
| JPEG   | 32.4%             | -7.6pp from 2022 |
| PNG    | 28.4%             | stable     |
| GIF    | 16.8%             | declining  |
| WebP   | 12.0%             | +3pp (+34% relative) |
| SVG    | 6.4%              | +2pp (+36% relative) |
| AVIF   | ~1.0%             | +0.75pp (+386% relative) |

Source: [HTTP Archive 2024 - Media](https://almanac.httparchive.org/en/2024/media)

---

## 3. Decision Tree: Which Image Format Should I Use?

```
START: What type of image?
|
+-- Photograph / complex image with gradients?
|   +-- Need transparency? YES --> AVIF (lossy + alpha) with WebP fallback
|   +-- Need transparency? NO  --> AVIF with WebP fallback, JPEG final fallback
|   +-- Encoding speed critical? YES --> WebP (5-10x faster encode than AVIF)
|   +-- Encoding speed critical? NO  --> AVIF (pre-encode at build time)
|
+-- Simple graphic / logo / icon with few colors?
|   +-- Needs to scale? YES --> SVG (vector, ~2-5 KB typical)
|   +-- Needs to scale? NO  --> WebP lossless or PNG
|   +-- UI icon set?    YES --> SVG sprite or icon font
|
+-- Animation?
|   +-- Short loop (< 5s)? --> Animated WebP (75% smaller than GIF) or AVIF animated
|   +-- Longer / needs controls? --> <video> with MP4/WebM (90%+ smaller than GIF)
|
+-- Screenshot / text-heavy image?
    +-- WebP lossless or PNG (AVIF lossless viable but less tooling support)
```

### Implementation with `<picture>` Element

```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Product hero image" width="1200" height="800"
       loading="eager" fetchpriority="high" decoding="async">
</picture>
```

---

## 4. Responsive Images with srcset and sizes

### 4.1 The Problem

Serving a single 2400px image to a 375px mobile screen wastes **~85% of transferred bytes**. A 2400px JPEG at quality 80 is ~540 KB; the same at 400px is ~30 KB.

### 4.2 Resolution Switching (Width Descriptors)

```html
<img srcset="product-400w.webp 400w, product-800w.webp 800w,
             product-1200w.webp 1200w, product-1600w.webp 1600w,
             product-2400w.webp 2400w"
     sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
     src="product-800w.webp" alt="Product photograph"
     width="1200" height="800" loading="lazy" decoding="async">
```

### 4.3 Pixel Density Switching (Fixed-Size Images)

```html
<img srcset="logo-1x.webp 1x, logo-2x.webp 2x, logo-3x.webp 3x"
     src="logo-1x.webp" alt="Company logo" width="200" height="60">
```

### 4.4 Best Practices

1. **Use 3-5 breakpoints**, not dozens. More breakpoints reduce CDN cache hit ratios.
2. **Use 800px as the fallback** `src` -- a middle-ground for non-srcset browsers.
3. **Maximum useful size is 2560px** (covers 2x on 1280px laptop displays).
4. **Always include `width` and `height`** to prevent CLS (browser computes aspect ratio before load).
5. **Match `sizes` to your CSS layout**. If CSS says 50% width on tablets, `sizes` should say `50vw`.

### 4.5 Art Direction with `<picture>`

Use `<picture>` when you need different crops at different viewport sizes (not just different resolutions):

```html
<picture>
  <source media="(max-width: 640px)"
          srcset="hero-mobile-400.avif 400w, hero-mobile-800.avif 800w"
          sizes="100vw" type="image/avif">
  <source media="(max-width: 1024px)"
          srcset="hero-tablet-800.avif 800w, hero-tablet-1200.avif 1200w"
          sizes="100vw" type="image/avif">
  <source srcset="hero-desktop-1600.avif 1600w, hero-desktop-2400.avif 2400w"
          sizes="100vw" type="image/avif">
  <img src="hero-desktop-1200.jpg" alt="Hero banner" width="2400" height="800">
</picture>
```

---

## 5. Lazy Loading Strategies

### 5.1 Native Lazy Loading (`loading="lazy"`)

```html
<img src="photo.webp" loading="lazy" alt="Below-fold photo"
     width="600" height="400" decoding="async">
```

The browser defers fetching until images are near the viewport (Chrome: ~1250px on fast connections, ~2500px on slow). Implementations show bandwidth savings of up to **200%** and initial payload reductions of **~740 KB** on image-heavy pages.

**Advantages**: Zero JS, browser-engine efficiency, **95%+** browser support.
**Limitations**: No control over distance threshold, no CSS background images, no visibility callbacks.

### 5.2 Intersection Observer API

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.srcset = img.dataset.srcset || '';
      observer.unobserve(img);
    }
  });
}, { rootMargin: '200px 0px', threshold: 0.01 });
document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
```

**When to use each**:

| Scenario | Recommended Approach |
|----------|---------------------|
| Standard below-fold images | Native `loading="lazy"` |
| CSS background images | Intersection Observer |
| Custom load distance / animation callbacks | Intersection Observer |

### 5.3 Critical Rule: Never Lazy-Load Above-the-Fold Images

```html
<!-- WRONG --> <img src="hero.webp" loading="lazy" alt="Hero">
<!-- RIGHT --> <img src="hero.webp" loading="eager" fetchpriority="high" alt="Hero"
                    decoding="async" width="1200" height="600">
```

Lazy loading above-fold images **delays LCP by 200-500ms** because the browser must lay out the page, determine visibility, then begin fetching -- instead of fetching immediately during HTML parsing.

---

## 6. Preloading and Priority Hints for LCP

### 6.1 fetchpriority="high"

**Measured improvements**:
- Google internal tests: LCP improved from **2.6s to 1.9s** (27% reduction).
- Etsy: LCP improved by **4%**.
- Typical: **5-10%** LCP reduction; up to **20-30%** in some cases.

Source: [Addy Osmani](https://addyosmani.com/blog/fetch-priority/), [web.dev](https://web.dev/articles/fetch-priority)

**Rule**: Only apply `fetchpriority="high"` to **1 image per page** (the LCP element). Multiple uses cause bandwidth competition that dilutes the benefit.

### 6.2 Preloading LCP Images Not in HTML

When the LCP image is set via CSS or JS (not discoverable in HTML):

```html
<link rel="preload" as="image" href="hero.avif" type="image/avif"
      imagesrcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
      imagesizes="100vw" fetchpriority="high">
```

Browsers ignore preloads for unsupported types, so AVIF and WebP preloads can coexist safely.

---

## 7. Image CDNs for On-the-Fly Optimization

### 7.1 Major Providers Comparison

| Feature | Cloudinary | imgix | Cloudflare Images | ImageKit |
|---------|-----------|-------|-------------------|----------|
| **Architecture** | Upload + store + CDN | Connect existing storage (S3, GCS) | Integrated with CF CDN (310+ PoPs) | Upload or URL-based |
| **Auto format** | Yes (f_auto) | Yes (auto=format) | Yes | Yes |
| **Auto quality** | Yes (q_auto) | Yes | Limited | Yes |
| **AVIF support** | Yes | Yes | Yes | Yes |
| **Video support** | Full | Limited | No | Yes |
| **Pricing (med site)** | $89+/mo | $79+/mo | Free <1,500 images | $49+/mo |

Source: [VisionFly](https://www.visionfly.ai/blog/best-image-cdn-comparison), [Scaleflex](https://blog.scaleflex.com/top-10-image-cdns/)

### 7.2 Key CDN Features

**Auto-format negotiation**: CDN detects the browser `Accept` header and serves AVIF/WebP/JPEG automatically -- no `<picture>` element needed.

```html
<!-- Cloudinary --> <img src="https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/hero.jpg">
<!-- imgix -->      <img src="https://example.imgix.net/hero.jpg?auto=format,compress">
```

### 7.3 When to Use an Image CDN

- **Always** if you have >50 images or user-generated content.
- Auto-format alone reduces image payload by **30-50%** without markup changes.
- Edge delivery reduces TTFB by **100-300ms** vs origin servers.

---

## 8. Video Optimization

### 8.1 Codec Selection Guide

| Codec | Compression vs H.264 | Browser Support | Best For |
|-------|----------------------|-----------------|----------|
| **H.264/AVC** | Baseline | ~98% | Universal compatibility |
| **H.265/HEVC** | **50% smaller** | ~75% (Safari, some Chrome) | iOS/Safari, live streaming |
| **VP9** | **~45% smaller** | ~93% (Chrome, Firefox, Edge) | YouTube-style platforms |
| **AV1** | **50-70% smaller** | ~88% (Chrome, Firefox, Edge) | Pre-encoded VOD |

**1080p bitrate comparison** (equivalent quality):
H.264: 5,000 kbps | H.265: 2,500 kbps | AV1: 2,000 kbps

Source: [FastPix](https://www.fastpix.io/blog/av1-vs-h-264-vs-h-265-best-codec-for-video-streaming), [Netflix Tech Blog](https://netflixtechblog.com/av1-now-powering-30-of-netflix-streaming-02f592242d80)

### 8.2 Adaptive Bitrate Streaming

Recommended VOD encoding ladder:

| Resolution | H.264 Bitrate | AV1 Bitrate |
|-----------|---------------|-------------|
| 360p      | 800 kbps      | 400 kbps    |
| 720p      | 2,800 kbps    | 1,400 kbps  |
| 1080p     | 5,000 kbps    | 2,000 kbps  |
| 4K        | 16,000 kbps   | 6,000 kbps  |

### 8.3 Poster Images and Preloading

```html
<link rel="preload" as="image" href="poster.avif" type="image/avif">
<video poster="poster.avif" preload="none" playsinline>
  <source src="video.mp4" type="video/mp4">
</video>
```

Using `preload="none"` on below-fold videos saves **2-10 MB** per video element.

### 8.4 Replace GIFs with Video

| Asset | File Size | Quality |
|-------|-----------|---------|
| Animated GIF (10s, 480p) | ~12 MB | 256 colors, dithered |
| MP4 H.264 equivalent | ~800 KB | Full color, sharp |
| WebM VP9 equivalent | ~500 KB | Full color, sharp |

**95% file size reduction**:

```html
<video autoplay muted loop playsinline width="480" height="270">
  <source src="animation.webm" type="video/webm">
  <source src="animation.mp4" type="video/mp4">
</video>
```

---

## 9. Font Optimization

### 9.1 Format: Use WOFF2

WOFF2 provides **~30% better compression** than WOFF, supported by **97%+** of browsers. Real-world: switching TTF to WOFF2 with subsetting reduced font payload from **399 KB to 54 KB** (86.4% reduction). Source: [web.dev](https://web.dev/learn/performance/optimize-web-fonts)

### 9.2 font-display Strategies

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0000-00FF;
}
```

| Value | Behavior | Best For |
|-------|----------|----------|
| `swap` | Shows fallback immediately, swaps when loaded | Body text |
| `optional` | Uses font only if cached; otherwise fallback | Non-critical/decorative fonts |
| `fallback` | Brief invisible (100ms), then fallback | Balance of flash vs invisibility |
| `block` | Invisible text up to 3s | Icon fonts only |

### 9.3 Font Subsetting

```bash
pyftsubset CustomFont.ttf --output-file=CustomFont-latin.woff2 \
  --flavor=woff2 --layout-features='kern,liga' \
  --unicodes="U+0000-00FF,U+2000-206F,U+2074,U+20AC"
```

Typical savings: Full Noto Sans **~450 KB** (WOFF2) vs Latin subset **~15 KB** -- **97% reduction**.

### 9.4 Variable Fonts

| Approach | Files | Total Size |
|----------|-------|------------|
| 4 separate weights | 4 requests | ~120 KB |
| 1 variable font | 1 request | ~80 KB |

**~33% size reduction + 3 fewer HTTP requests**.

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}
```

### 9.5 Preloading Critical Fonts

```html
<link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>
```

Reduces LCP by **100-200ms** by eliminating font discovery delay. Only preload **1-2 critical fonts**.

---

## 10. Common Bottlenecks and Solutions

| Bottleneck | Detection | Impact | Fix |
|-----------|-----------|--------|-----|
| Unoptimized images | Lighthouse "Efficiently encode images" | +500 KB to +5 MB | Compress quality 75-85, use WebP/AVIF |
| Wrong format (PNG for photos) | Audit file types | 2-5x larger | Use JPEG/WebP/AVIF for photographs |
| No responsive images | Missing srcset/sizes | Mobile downloads 4x excess | Add srcset with 3-5 breakpoints |
| Above-fold lazy loading | Lighthouse LCP audit | +200-500ms LCP | `loading="eager"` + `fetchpriority="high"` |
| Missing width/height | Lighthouse CLS audit | CLS > 0.1 | Always set width and height |
| No image CDN | Manual inspection | No auto-format/edge cache | Implement Cloudinary/imgix/CF Images |
| Render-blocking fonts | Lighthouse audit | +300-1000ms LCP | font-display: swap + preload |
| Animated GIFs | File size audit | 10-20x larger than video | Replace with `<video autoplay muted loop>` |

### The 80/20 Quick Wins

These five changes eliminate **60-80%** of media performance problems:

1. **Convert to WebP/AVIF** with `<picture>` fallback -- 30-50% payload reduction
2. **Add `fetchpriority="high"`** to LCP image -- 5-30% LCP improvement
3. **Add `loading="lazy"`** to below-fold images -- 20-40% initial payload reduction
4. **Add `width` and `height`** to all images -- CLS drops to near 0
5. **Compress to quality 75-85** -- 40-60% per-image reduction

---

## 11. Anti-Patterns to Avoid

### 11.1 Base64 Inlining Large Images

Base64 encoding increases file size by **~33%** (4/3 overhead). A 100 KB image becomes ~133 KB embedded in HTML/CSS. Additional penalties: blocks critical rendering path, cannot be cached independently, cannot be lazy-loaded, cannot benefit from HTTP/2 multiplexing.

**Rule**: Only base64-encode images **under 1-2 KB**. Everything else should be a separate file.

Source: [Bunny.net](https://bunny.net/blog/why-optimizing-your-images-with-base64-is-almost-always-a-bad-idea/), [PerfPlanet](https://calendar.perfplanet.com/2018/performance-anti-patterns-base64-encoding/)

### 11.2 CSS Sprites in 2025

With HTTP/2 multiplexing (unlimited concurrent streams over 1 connection), sprites are an anti-pattern: they prevent individual caching, responsive serving, lazy loading, and add CSS complexity.

**Modern alternative**: Individual SVG icons via HTTP/2, or SVG sprite using `<symbol>` + `<use>`:

```html
<svg style="display:none">
  <symbol id="icon-search" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27..."/></symbol>
</svg>
<svg width="24" height="24"><use href="#icon-search"/></svg>
```

### 11.3 Loading All Images Eagerly

On a product listing page with 40 images:

| Strategy | Initial Payload | Time to Interactive (3G) |
|----------|----------------|--------------------------|
| All eager (default) | ~8 MB | ~6.2s |
| Above-fold eager + rest lazy | ~1.2 MB | ~2.1s |

**85% payload reduction, 66% load time improvement**.

### 11.4 Using `decoding="sync"` Unnecessarily

Forces synchronous decoding on the main thread, blocking interactions for large images. Use `decoding="async"` for all images -- the browser still decodes synchronously when safe.

### 11.5 Serving Images Without a CDN

Origin servers have single-location latency, no auto-format negotiation, no on-the-fly resizing, no edge caching. A CDN adds **100-300ms TTFB improvement** and automatic optimization.

---

## 12. Before & After: Real-World Optimization Results

### 12.1 E-Commerce Product Page

**Before** (unoptimized):
- Page weight: 4.8 MB | Image payload: 3.6 MB (75%) | 42 image requests
- LCP: 4.2s (mobile 4G) | CLS: 0.18 | Format: 100% JPEG (uncompressed)

**Optimizations**: AVIF+WebP+JPEG fallback, responsive images (4 breakpoints), lazy loading (38 below-fold), fetchpriority on hero, width/height on all, GIFs replaced with video, font subsetting, Cloudinary f_auto/q_auto.

**After** (optimized):

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Page weight | 4.8 MB | 1.1 MB | **-77%** |
| Image payload | 3.6 MB | 620 KB | **-83%** |
| Initial requests | 42 | 8 | **-81%** |
| LCP (mobile 4G) | 4.2s | 1.8s | **-57%** |
| CLS | 0.18 | 0.02 | **-89%** |

### 12.2 Content Blog

**Before**: 3.2 MB page (2.1 MB images -- 12 full-res PNGs).
**After** (format conversion + responsive + lazy): Image payload **420 KB** (-80%), LCP **1.6s** (-58%), page load (3G) **3.5s** (-71%).

### 12.3 SaaS Dashboard

**Before**: 48 PNG icons + 6 chart screenshots = 1.8 MB.
**After**: SVG sprite (24 KB) + WebP charts with lazy loading = 180 KB. **90% reduction**.

---

## 13. Implementation Checklist

### Build Pipeline

```javascript
// vite.config.js
import viteImagemin from 'vite-plugin-imagemin';
export default defineConfig({
  plugins: [viteImagemin({
    mozjpeg: { quality: 80 }, pngquant: { quality: [0.7, 0.85] },
    webp: { quality: 80 }, avif: { quality: 50, speed: 5 },
  })],
});
```

### Server Configuration (Nginx)

```nginx
map $http_accept $img_suffix {
  default   "";
  "~*avif"  ".avif";
  "~*webp"  ".webp";
}
location ~* \.(jpg|jpeg|png)$ {
  try_files $uri$img_suffix $uri =404;
  add_header Vary Accept;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### Performance Budget

| Asset Type | Budget (Mobile) | Budget (Desktop) |
|-----------|----------------|-----------------|
| Total images | < 500 KB | < 1,000 KB |
| Hero/LCP image | < 100 KB | < 200 KB |
| Product image | < 50 KB | < 80 KB |
| Thumbnails | < 15 KB | < 20 KB |
| Icons (SVG) | < 3 KB each | < 3 KB each |

```javascript
// lighthouserc.js
module.exports = { ci: { assert: { assertions: {
  'resource-summary:image:size': ['error', { maxNumericValue: 500000 }],
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
}}}};
```

---

## 14. Monitoring and Measurement

| Metric | Tool | Target |
|--------|------|--------|
| LCP | CrUX, Lighthouse, WebPageTest | < 2.5s (p75) |
| CLS | CrUX, Lighthouse | < 0.1 (p75) |
| Total image weight | WebPageTest, DevTools | < 500 KB (mobile) |
| Image requests (initial) | DevTools Network | < 10 (above-fold) |
| Format adoption | HTTP Archive queries | > 80% modern formats |
| Cache hit ratio | CDN analytics | > 90% |

**RUM snippet for LCP tracking**:

```javascript
new PerformanceObserver((list) => {
  const entry = list.getEntries().at(-1);
  analytics.track('lcp', {
    time: entry.startTime, element: entry.element?.tagName, url: entry.url,
  });
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

**Field data** (CrUX July 2025): 62.3% mobile / 74.4% desktop visits score "good" LCP.
Source: [HTTP Archive 2025 - Performance](https://almanac.httparchive.org/en/2025/performance)

---

## 15. Quick Reference Cheat Sheet

```
ABOVE THE FOLD (LCP candidates)
  loading="eager" | fetchpriority="high" (1 per page) | decoding="async"
  <link rel="preload"> if not in HTML | Always set width + height
  Use AVIF > WebP > JPEG with <picture>

BELOW THE FOLD
  loading="lazy" | decoding="async" | Always set width + height
  Use AVIF > WebP > JPEG with <picture>

FORMAT SELECTION
  Photos/complex  --> AVIF (WebP fallback)
  Graphics/logos  --> SVG
  Screenshots     --> WebP lossless or PNG
  Animations      --> <video> (never GIF for >3s or >256px)
  Icons           --> SVG (inline or sprite)

QUALITY SETTINGS
  JPEG: 75-85 | WebP: 75-85 | AVIF: 50-65 (equiv to JPEG 80)

RESPONSIVE
  3-5 srcset breakpoints: 400, 800, 1200, 1600, 2400
  sizes must match CSS layout | Fallback src at 800px | Max useful: 2560px
```

---

## References

- [HTTP Archive Web Almanac 2024 - Page Weight](https://almanac.httparchive.org/en/2024/page-weight)
- [HTTP Archive Web Almanac 2024 - Media](https://almanac.httparchive.org/en/2024/media)
- [HTTP Archive Web Almanac 2025 - Performance](https://almanac.httparchive.org/en/2025/performance)
- [web.dev - Optimize LCP](https://web.dev/articles/optimize-lcp)
- [web.dev - Optimize Web Fonts](https://web.dev/learn/performance/optimize-web-fonts)
- [web.dev - Fetch Priority API](https://web.dev/articles/fetch-priority)
- [MDN - Responsive Images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- [MDN - Fix Image LCP](https://developer.mozilla.org/en-US/blog/fix-image-lcp/)
- [MDN - Lazy Loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading)
- [SpeedVitals - WebP vs AVIF](https://speedvitals.com/blog/webp-vs-avif/)
- [ImageRobo - Format Comparison](https://imagerobo.com/blogs/image-formats-comparison-jpeg-webp-avif)
- [Netflix Tech Blog - AV1 Powering 30% of Streaming](https://netflixtechblog.com/av1-now-powering-30-of-netflix-streaming-02f592242d80)
- [FastPix - AV1 vs H.264 vs H.265](https://www.fastpix.io/blog/av1-vs-h-264-vs-h-265-best-codec-for-video-streaming)
- [Addy Osmani - Fetch Priority](https://addyosmani.com/blog/fetch-priority/)
- [Bunny.net - Why Base64 is Almost Always Bad](https://bunny.net/blog/why-optimizing-your-images-with-base64-is-almost-always-a-bad-idea/)
- [PerfPlanet - Anti-Patterns: Base64](https://calendar.perfplanet.com/2018/performance-anti-patterns-base64-encoding/)
- [VisionFly - Best Image CDN](https://www.visionfly.ai/blog/best-image-cdn-comparison)
- [Scaleflex - Top 10 Image CDNs](https://blog.scaleflex.com/top-10-image-cdns/)
- [DebugBear - Responsive Images](https://www.debugbear.com/blog/responsive-images)
- [NitroPack - Font Loading Optimization](https://nitropack.io/blog/post/font-loading-optimization)
- [Cloudinary - Advanced Image Formats](https://cloudinary.com/blog/advanced-image-formats-and-when-to-use-them)
