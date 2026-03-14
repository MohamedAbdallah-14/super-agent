# Directory Purpose

The `frontend` directory provides framework-specific guidelines, best practices, and architectural standards for client-side applications (web, mobile, and desktop).

# Key Concepts

- Framework-specific state management and rendering
- Organizing client-side codebases
- Native vs cross-platform development paradigms

# File Map

- `index.md` — semantic map of the frontend directory
- `angular.md` — RxJS, modules, and Angular CLI standards
- `desktop-electron.md` — IPC communication, security, and main/renderer processes
- `flutter.md` — widget trees, BLoC/Provider, and performance
- `native-android.md` — Kotlin, Jetpack Compose, and Android SDK guidelines
- `native-ios.md` — Swift, SwiftUI, and iOS SDK guidelines
- `react-native.md` — TypeScript architecture, Expo, state management, navigation, performance, EAS
- `react.md` — hooks, context, Next.js, and functional components
- `vue.md` — Composition API, Pinia, and Nuxt.js guidelines

# Reading Guide

If building a web app → read `react.md`, `vue.md`, or `angular.md`
If building a mobile app → read `flutter.md`, `native-ios.md`, `native-android.md`, or `react-native.md`
If building a desktop app → read `desktop-electron.md`