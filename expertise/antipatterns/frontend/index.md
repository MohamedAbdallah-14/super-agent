# Directory Purpose

The `frontend` antipatterns directory addresses common mistakes in client-side application development, covering web, mobile, and styling.

# Key Concepts

- SPA performance and rendering flaws
- CSS architecture and layout mistakes
- Framework-specific pitfalls (React, Flutter)

# File Map

- `css-layout-antipatterns.md` — global scope pollution, z-index wars, layout thrashing
- `flutter-antipatterns.md` — deeply nested widgets, poor state management
- `mobile-antipatterns.md` — non-native feeling interactions, blocked main threads
- `react-antipatterns.md` — prop drilling, overuse of effects, unnecessary re-renders
- `spa-antipatterns.md` — massive bundles, bad routing, memory leaks

# Reading Guide

If optimizing web UI → read `spa-antipatterns.md` and `react-antipatterns.md`
If styling an application → read `css-layout-antipatterns.md`
If building mobile UI → read `flutter-antipatterns.md` or `mobile-antipatterns.md`