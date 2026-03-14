# Directory Purpose

The `mobile` performance directory focuses on optimizing apps for constrained environments (limited battery, CPU, and network).

# Key Concepts

- Ensuring smooth 60fps/120fps UI
- Minimizing battery drain
- Handling poor connectivity

# File Map

- `mobile-animations.md` — offloading animations to the GPU, avoiding layout passes
- `mobile-memory-battery.md` — wake locks, background limits, and memory warnings
- `mobile-network.md` — batching requests, exponential backoff, and compression
- `mobile-rendering.md` — view recycling, overdraw, and layout flattening
- `mobile-startup-time.md` — reducing TTI (Time to Interactive), lazy loading

# Reading Guide

If the app feels sluggish → read `mobile-rendering.md` and `mobile-animations.md`
If the app takes too long to open → read `mobile-startup-time.md`
If users complain about battery → read `mobile-memory-battery.md`