# Directory Purpose

The `mobile` security directory covers the unique threat models of distributing code directly to user devices via app stores.

# Key Concepts

- Protecting code from reverse engineering
- Securing local device storage
- Preventing Man-in-the-Middle (MitM) attacks

# File Map

- `mobile-android-security.md` — ProGuard, keystore, and intents
- `mobile-binary-protection.md` — obfuscation, anti-tampering, and jailbreak detection
- `mobile-data-storage.md` — Keychain, SharedPreferences, and avoiding SQLite leaks
- `mobile-ios-security.md` — ATS, entitlements, and secure enclaves
- `mobile-network-security.md` — certificate pinning and secure websockets

# Reading Guide

If storing user tokens on a device → read `mobile-data-storage.md`
If releasing an app to production → read `mobile-binary-protection.md`
If securing mobile API calls → read `mobile-network-security.md`