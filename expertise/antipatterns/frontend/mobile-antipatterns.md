# Mobile Development Anti-Patterns

> Mobile apps run on constrained hardware with unreliable networks, limited battery, and impatient users who will uninstall after a single bad experience. Unlike web apps where you control the server, mobile code runs on thousands of device variants under conditions you cannot predict. These anti-patterns are distilled from OWASP mobile security reports, platform vendor post-mortems, app store rejection data, and production experience shipping apps across Android, iOS, React Native, and Flutter.

> **Domain:** Frontend
> **Anti-patterns covered:** 20
> **Highest severity:** Critical

---

## Anti-Patterns

### AP-01: Blocking the UI Thread

**Also known as:** Main Thread Abuse, Jank Factory, The Frozen Screen
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Medium

**What it looks like:**
Network requests, database queries, JSON parsing, or image decoding runs directly on the main/UI thread. The interface freezes, animations stutter, and on Android the system shows an ANR dialog after 5 seconds. React Native's single JS thread drops frames when expensive computations block the event loop -- 200ms of synchronous work means 12 dropped frames. Flutter's main isolate blocks rendering when heavy computation runs inline instead of in a separate isolate.

**Why developers do it:**
Synchronous code is simpler to reason about. On emulators with generous CPU and fast localhost networking, the delay is imperceptible. Developers from server-side backgrounds expect blocking I/O as default. React Native averages 8.34ms per frame with no safety margin for GC cycles, making it especially sensitive.

**What goes wrong:**
Android triggers ANR dialogs after 5s of main-thread blockage; Google Play flags apps with ANR rates above 0.47%. iOS watchdog kills apps that block the main thread during launch (termination code `0x8badf00d`). Frame drops below 60fps cause visible stutter users perceive as "broken."

**The fix:**
Move all I/O and computation off the main thread. Android: `Dispatchers.IO` with coroutines. iOS: `async/await` with `Task`. React Native: `InteractionManager.runAfterInteractions()` or move work to native modules. Flutter: `compute()` or `Isolate.run()` for CPU-intensive work. Profile with Xcode Time Profiler or Android Profiler to identify main-thread spikes exceeding 16ms.

**Detection rule:**
Flag any network, database, or file I/O call not wrapped in a background context. Enable Android `StrictMode` in debug builds. Lint for synchronous `URL().readText()`, `Data(contentsOf:)`, or `JSON.parse()` of large payloads on the main thread.

---

### AP-02: Not Handling Screen Sizes

**Also known as:** Fixed-Layout Syndrome, The One-Device App, Pixel Perfection Fallacy
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Hardcoded pixel values (`width: 375`, `height: 812`), fixed-size containers that overflow on small screens or leave empty space on tablets, text that truncates or overlaps on different font sizes. The app looks perfect on the developer's iPhone 15 Pro and breaks everywhere else.

**Why developers do it:**
Designers deliver one set of mockups at one resolution. Testing on a single device "works." Handling responsive layouts, foldables, split-screen, and Dynamic Type is time-consuming. Cross-platform frameworks tempt developers to ignore platform-specific layout behaviors.

**What goes wrong:**
Android has 24,000+ distinct device configurations. Foldable phones change aspect ratio mid-session. iPads in multitasking mode present window sizes the developer never anticipated. Users with accessibility font sizes see truncated or overlapping text. App Store reviewers reject apps that don't work on all supported devices.

**The fix:**
Use relative units (flex, `ConstraintLayout`, `MediaQuery`). Test on at least 5 screen sizes including a small phone, large phone, tablet, and foldable. Support Dynamic Type (iOS) and scalable sp units (Android). Use `LayoutBuilder` (Flutter) or `useWindowDimensions` (React Native) for responsive breakpoints.

**Detection rule:**
Search for hardcoded pixel values in layout files. Run the app in split-screen mode and with the largest accessibility font size. If any content is clipped, overflows, or is unreachable, AP-02 is present.

---

### AP-03: Ignoring Platform Conventions

**Also known as:** Cross-Platform Uncanny Valley, Platform Blindness
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
An iOS app with Material Design hamburger menus. An Android app with iOS-style segmented controls and back-swipe gestures. Navigation patterns, typography, and interaction models that feel alien to the platform's native users. Identical UI on both platforms, native to neither.

**Why developers do it:**
Cross-platform frameworks encourage code sharing. One UI for both platforms is faster. "Brand consistency matters more than platform conventions." Developers only know one platform and default to its patterns everywhere.

**What goes wrong:**
iOS users expect swipe-to-go-back, pull-to-refresh, and tab bars at the bottom. Android users expect the system back button, material ripple effects, and navigation drawers. Platform-specific accessibility features (VoiceOver, TalkBack) may not work with non-native components. App Store reviewers reject apps that don't "feel like an iOS app."

**The fix:**
Use platform-adaptive widgets. Flutter: `CupertinoNavigationBar` on iOS, `AppBar` on Android. React Native: `Platform.select()` for diverging UX. Follow Apple Human Interface Guidelines and Material Design guidelines as baseline requirements.

**Detection rule:**
Run the app side-by-side on both platforms. If navigation, back behavior, and system chrome look identical, suspect AP-03. Check for missing `Platform.select()` or platform checks in cross-platform codebases.

---

### AP-04: No Offline Mode

**Also known as:** Always-Online Assumption, The Blank Screen of Nothing
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Medium

**What it looks like:**
The app shows a blank screen, infinite spinner, or crashes when the network is unavailable. Previously loaded data disappears. Users in elevators, subways, or rural areas cannot use any feature. The fundamental flaw: treating the network as the single source of truth.

**Why developers do it:**
Development happens on fast Wi-Fi. Offline support requires local storage, sync logic, and conflict resolution -- real engineering that doesn't show up in demos. "Our users always have internet." Most apps still follow architecture that treats network failures as exceptional rather than the norm.

**What goes wrong:**
Google's Build for Billions guidelines note 60% of the world's population lives with intermittent connectivity. Apps showing blank screens on failure get 1-star reviews. Users lose unsaved work when connectivity drops mid-action. Without offline data invalidation, users see stale data that destroys trust.

**The fix:**
Implement offline-first architecture: local database as single source of truth, network as sync mechanism. Cache responses locally, show cached data when offline with a "last updated" indicator, queue mutations for later sync. Use the "cache with refresh" pattern so users see something immediately rather than staring at a spinner.

**Detection rule:**
Search for `fetch()` / `http.get()` calls without try/catch and cache fallback. Run every screen in airplane mode. If any screen is blank or shows an unhandled error, AP-04 is present.

---

### AP-05: Excessive Network Calls (Battery Drain)

**Also known as:** The Chatty App, Poll-Everything, Battery Vampire
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
Apps that poll servers every few seconds, sync data constantly, retry failed requests aggressively, or fire redundant requests on every screen transition. A network request every 15 seconds keeps the mobile radio on continuously. Facebook and Instagram are commonly cited examples of battery-draining sync behavior. 73% of users uninstall apps that drain battery excessively.

**Why developers do it:**
Real-time data feels premium. Polling is simpler than websockets or push. Developers don't measure battery impact. Multiple teams add their own sync logic independently, and nobody aggregates the total request volume.

**What goes wrong:**
Every network call activates the radio hardware, consuming battery. Redundant requests waste bandwidth on metered connections. Background network activity is the #1 cause of app-related battery drain. Android's Battery Historian and iOS's Energy Log flag offending apps, leading to OS-level throttling.

**The fix:**
Batch requests and process them together so the radio powers on once. Use push notifications or websockets for real-time needs instead of polling. Implement exponential backoff for retries. Respect `ConnectivityManager` (Android) and `NWPathMonitor` (iOS) to avoid requests on poor connections. Lazy-load non-critical data.

**Detection rule:**
Monitor total request count in first 60 seconds after launch with Charles Proxy or network profiler. Flag `setInterval`/`Timer.periodic` without cancellation. Check for duplicate API calls across screen transitions using network interceptor logs.

---

### AP-06: No Caching Strategy

**Also known as:** Fetch-Every-Time, The Redundant Loader, Amnesia App
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Medium

**What it looks like:**
Every screen visit triggers a fresh API call even when data hasn't changed. Profile screens re-fetch on every `viewWillAppear`/`onResume`. Images re-download on every scroll. The app shows loading spinners for data it already has in memory.

**Why developers do it:**
Caching adds complexity: invalidation, staleness, storage limits. Fetching fresh data feels "correct." Common implementation errors include caching GET responses based only on URL while ignoring query parameters. Shared preferences has edge cases, SQLite requires migration scripts.

**What goes wrong:**
Wasted bandwidth on metered connections. Unnecessary loading states frustrate users. Battery drain from redundant network calls. Server costs increase linearly with user base. Scrolling lists with images flicker as images re-download.

**The fix:**
Implement a layered cache: memory cache (LRU) for hot data, disk cache for persistence, HTTP cache headers for API responses. Use image caching libraries (Glide/Coil on Android, SDWebImage/Kingfisher on iOS, `cached_network_image` in Flutter). Set `staleTime` in query libraries to avoid redundant fetches.

**Detection rule:**
Search for API calls inside `viewWillAppear`/`onResume`/`useEffect` without dependency arrays. Monitor network traffic for duplicate identical requests within 30 seconds. Check if image URLs are re-fetched when scrolling back to previously visible cells.

---

### AP-07: Ignoring App Lifecycle

**Also known as:** The Zombie Listener, Leak-on-Background, State Amnesia
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
Listeners, timers, and subscriptions registered in `onCreate`/`viewDidLoad`/`initState` without cleanup in the corresponding destroy method. Location tracking continues in the background. The app crashes when returning from background because it assumes in-memory state that the OS reclaimed.

**Why developers do it:**
Lifecycle management is invisible when it works. Memory leaks manifest slowly and only under specific navigation patterns. Developers test the happy path of opening one screen and never backgrounding the app. React Native's GC-managed memory makes leaks harder to detect until the app crashes.

**What goes wrong:**
Memory leaks grow with each screen visit until the OS kills the app. Background listeners drain battery. GPS running in background triggers privacy warnings and app store rejection. On Android, the OS can kill background processes at any time; state that was only in memory is lost.

**The fix:**
Always pair `register` with `unregister` in matching lifecycle methods. Use `LifecycleObserver` (Android), combine publishers (iOS), or `dispose()` (Flutter). Save critical state in `onSaveInstanceState` (Android) or state restoration (iOS). Cancel in-flight network requests when the screen is no longer visible.

**Detection rule:**
Search for `addListener`/`subscribe`/`register` without matching `removeListener`/`unsubscribe`/`unregister` in the corresponding lifecycle method. Profile memory with LeakCanary (Android), Instruments (iOS), or DevTools (Flutter) after navigating 10 screens back and forth.

---

### AP-08: Bad Permission Handling

**Also known as:** The Permission Wall, Ask-Everything-Upfront, Crash-on-Deny
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
The app requests camera, location, contacts, microphone, and storage permissions at first launch before the user has any context. Denying a permission crashes the app or makes it unusable. No explanation of why the permission is needed. 87% of Android apps and 60% of iOS apps request permissions they don't need for core functionality.

**Why developers do it:**
Asking upfront is simpler than contextual requests. Developers test with all permissions granted. Error handling for denied permissions requires fallback UX for every feature. "We might need it later."

**What goes wrong:**
Users deny permissions they don't understand, then the app breaks. Google removed 1,400+ apps per month in 2024 for unnecessary permission requests. Apps requesting fewer than 5 permissions see up to 25% higher install rates. On iOS, once a user denies a permission, the system dialog never appears again -- the app must direct users to Settings.

**The fix:**
Request permissions contextually, at the moment the feature needs them. Show a pre-permission screen explaining why. Gracefully degrade when denied -- a chat app should still work without camera access. Handle the "permanently denied" state by directing users to Settings with a clear explanation.

**Detection rule:**
Check `AndroidManifest.xml` and `Info.plist` for permission count; flag more than 5. Search for permission requests in app startup code. Test denying every permission and verify no screen crashes or becomes blank.

---

### AP-09: Deep Linking Failures

**Also known as:** The Broken Link, Homepage Redirect, Link Rot
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Medium

**What it looks like:**
Deep links open the app but land on the home screen instead of the intended content. Universal Links/App Links are not verified because the AASA or `assetlinks.json` file is misconfigured. The app crashes on malformed deep link parameters. Authenticated deep links show login then lose the original destination.

**Why developers do it:**
Deep linking touches navigation, auth, and state management simultaneously. It's often added late as a "nice to have." The most common error on Android is a wrong SHA-256 fingerprint in `assetlinks.json`. On iOS, the AASA file must be at `.well-known/` with no redirects and no `.json` extension. Once the OS fails verification, it caches the failure.

**What goes wrong:**
Marketing campaigns with deep links land users on the homepage, destroying conversion. Push notifications that should navigate to specific content just open the app generically. Social media apps modify or open links in internal browsers, disrupting Universal Link functionality. App Clips and Instant Apps depend entirely on working deep links.

**The fix:**
Implement a centralized deep link router that validates parameters, handles auth gates (preserving the target destination), and falls back gracefully. Verify server-side configuration: `.well-known/assetlinks.json` (Android) and `apple-app-site-association` (iOS). Test all four states: app foregrounded, app killed, app not installed, user not authenticated.

**Detection rule:**
Test every advertised deep link across all four app states. Verify AASA and `assetlinks.json` are served with correct headers. Check that the deep link handler routes to specific screens rather than always opening `HomeScreen`.

---

### AP-10: Push Notification Abuse

**Also known as:** Notification Spam, The Annoying App, Permission Erosion
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
Notification permission requested at first launch with no context. Generic "Come back!" re-engagement pushes with no useful content. Multiple notifications per day for non-urgent updates. No notification categories or channels, so users can't selectively mute.

**Why developers do it:**
Product/marketing teams see push notifications as a free engagement lever. 95% of opt-in users who receive no push in the first 90 days churn, so teams over-correct by sending too many. A/B tests optimize for short-term open rates without measuring long-term uninstall impact.

**What goes wrong:**
71% of users uninstall apps due to annoying notifications. 32% uninstall after receiving more than 6 notifications per week. Users who disable notifications have no re-engagement channel. iOS 15+ Focus modes and Android notification channels let users silence entire apps. Poorly timed notifications (middle of the night) generate negative reviews.

**The fix:**
Delay notification permission requests until the user sees value (after first successful action). Use notification channels (Android) and categories (iOS) for granular control. Respect user timezone and quiet hours. Personalize content -- a notification about a specific item the user viewed converts far better than "We miss you!" Strategic use shows 3x higher 90-day retention vs. no notifications.

**Detection rule:**
Check if notification permission is requested in `didFinishLaunching`/`onCreate`. Audit notification frequency per user per day. Verify notification channels are configured on Android. Test that every notification deep links to the specific referenced content.

---

### AP-11: Emulator-Only Testing

**Also known as:** Simulator Tunnel Vision, The Works-On-My-Machine Mobile Edition
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
CI pipeline runs tests only on emulators. No physical device in the QA process. Bugs related to camera, GPS, Bluetooth, push notifications, biometrics, and battery behavior are never caught before production. Performance looks fine because the emulator runs on a desktop CPU with 16GB RAM.

**Why developers do it:**
Emulators are free, fast, and automatable. Physical device labs are expensive and require maintenance. Cloud device farms add CI time. "The emulator is close enough." Developers don't own devices covering the range of their user base.

**What goes wrong:**
Emulators cannot reproduce real-world radio behavior, thermal throttling, memory pressure from other apps, or actual GPS/camera/biometric hardware. Touch latency, scroll physics, and animation smoothness differ significantly. Apps that feel smooth on emulator stutter on a 3-year-old budget Android phone. Bluetooth and NFC features are untestable on emulators.

**The fix:**
Include at least one real-device stage in CI using cloud device farms (Firebase Test Lab, BrowserStack, AWS Device Farm). Maintain a physical device lab with: one low-end Android ($150 range), one mid-range, one flagship, one iPhone SE-class, and one current flagship iPhone. Test performance-sensitive features exclusively on real devices.

**Detection rule:**
Review CI configuration for device targets. If all targets are emulator/simulator images with no real-device stage, AP-11 is present. Check if performance benchmarks are captured on real hardware.

---

### AP-12: No Mobile Accessibility

**Also known as:** The Exclusion App, Screen Reader Blindspot
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Medium

**What it looks like:**
Images and icons without `accessibilityLabel`/`contentDescription`. Touch targets smaller than 44x44pt (iOS) or 48x48dp (Android). No support for Dynamic Type or font scaling. Custom UI components invisible to screen readers. Gesture-only interactions with no alternative. Apps that work visually but are completely unusable with VoiceOver or TalkBack.

**Why developers do it:**
Accessibility testing requires learning screen reader tools. Automated scanners catch only a fraction of real issues. "Our users don't use screen readers." Developers create custom alerts/notifications instead of using platform APIs, breaking screen reader support. QA teams report difficulty even setting up TalkBack.

**What goes wrong:**
15% of the global population has some form of disability. Legal liability under ADA, EAA, and equivalent legislation is increasing. Users who can't complete onboarding with a screen reader will never become customers. Platform accessibility features (VoiceOver, TalkBack, Switch Control) rely on semantic markup that custom components often omit.

**The fix:**
Add `accessibilityLabel` to every interactive element. Ensure minimum touch target sizes. Test with VoiceOver (iOS) and TalkBack (Android) on real devices through the complete onboarding flow. Use `Semantics` widget in Flutter. Support Dynamic Type and font scaling. Provide alternatives for gesture-only interactions.

**Detection rule:**
Search for interactive elements (`Button`, `TouchableOpacity`, `GestureDetector`) without accessibility labels. Run platform accessibility scanner (Xcode Accessibility Inspector, Android Accessibility Scanner). Attempt full app navigation using only a screen reader.

---

### AP-13: Unoptimized Images

**Also known as:** The 12MB Avatar, Full-Resolution Everywhere, Memory Balloon
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Medium

**What it looks like:**
Loading full 4000x3000 camera photos into a 100x100 avatar view. Downloading 12MB PNGs when a 50KB WebP would suffice. No placeholder or progressive loading -- the screen is blank until the full image arrives. Images are the largest performance bottleneck in React Native applications, consuming excessive bandwidth and causing memory leaks.

**Why developers do it:**
Image optimization is an infrastructure concern that falls between frontend and backend ownership. "The CDN handles it." Developers use the image URL as-is from the API without requesting a sized variant. Local testing with cached images hides the problem.

**What goes wrong:**
Each unresized image consumes width x height x 4 bytes of memory. A 4000x3000 image uses 48MB of RAM for a thumbnail. Scrolling lists of unoptimized images cause memory spikes that trigger OOM kills. Bandwidth waste on cellular connections. Battery drain from decoding oversized images.

**The fix:**
Request appropriately sized images from the server (use CDN image transformation parameters). Decode images at display size, not source size. Use platform image loading libraries (Glide/Coil for Android, SDWebImage/Kingfisher for iOS, `cached_network_image` for Flutter). Prefer WebP/AVIF over PNG/JPEG. Show shimmer placeholders during loading.

**Detection rule:**
Compare image download size vs. display size. Flag any image where source resolution exceeds 2x the display resolution. Profile memory during list scrolling with images. Check for `BitmapFactory.decodeFile()` or `UIImage(contentsOfFile:)` without resize parameters.

---

### AP-14: Keyboard Covering Inputs

**Also known as:** The Hidden Field, Keyboard Blindness, Type-and-Hope
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
The user taps a text field near the bottom of the screen, the keyboard slides up, and the field is now hidden behind it. The user types blindly, unable to see what they're entering. Login forms, address fields, and chat inputs are the most common victims.

**Why developers do it:**
On the developer's primary test device it often works by accident due to screen size. Keyboard behavior differs significantly between iOS and Android, and between portrait and landscape. React Native's cross-platform abstraction hides the underlying platform keyboard management complexity.

**What goes wrong:**
Users can't see what they're typing in critical fields (passwords, payment info). Form submission errors increase because users can't see validation messages. The "submit" button is hidden behind the keyboard with no way to reach it. Users abandon forms mid-completion.

**The fix:**
iOS: `UIScrollView` with `contentInset` adjustment or `IQKeyboardManager`. Android: `android:windowSoftInputMode="adjustResize"` in the manifest. React Native: `KeyboardAvoidingView` with `behavior="padding"` on iOS. Flutter: `Scaffold.resizeToAvoidBottomInset: true` (the default) plus `SingleChildScrollView` for long forms. Always test every text field in both portrait and landscape.

**Detection rule:**
Tap every text field on every screen and verify it remains visible when the keyboard appears. Test in landscape mode. Check for missing `KeyboardAvoidingView` (React Native) or `adjustResize` (Android). Automated UI tests should verify field visibility after keyboard presentation.

---

### AP-15: Insecure Data Storage

**Also known as:** Plaintext Secrets, The UserDefaults Token, OWASP M9
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Medium

**What it looks like:**
Auth tokens stored in `SharedPreferences` (Android) or `UserDefaults` (iOS) in plain text. API keys hardcoded in the app bundle. Sensitive user data in unencrypted SQLite databases. Passwords cached in `TextField` auto-fill without `secureTextEntry`. Ranked M9 in OWASP Mobile Top 10.

**Why developers do it:**
`SharedPreferences` and `UserDefaults` are the first storage APIs developers learn. They work, they're simple, and the data "looks hidden" because it's in the app's sandbox. Secure storage (Keystore/Keychain) has more complex APIs. "Nobody will root their phone to steal a token."

**What goes wrong:**
Snapchat (2014) suffered a breach exposing millions of usernames and phone numbers due to insecure storage. Dating apps (Tinder, OKCupid, Bumble) have been scrutinized for storing user data insecurely, exposing names, messages, and location data. A Philips HealthSuite vulnerability exposed users' heart rate, blood pressure, and sleep data through weak encryption. Rooted/jailbroken devices, device backups, and malware can all access plaintext storage.

**The fix:**
Store sensitive data in Android Keystore / iOS Keychain. Use `EncryptedSharedPreferences` (Android) or `flutter_secure_storage`. Never hardcode API keys -- use server-side proxying or runtime configuration. Enable `secureTextEntry` on password fields. Disable app data backup for sensitive files. Run MobSF in CI for automated security scanning.

**Detection rule:**
Search for `SharedPreferences.putString("token"` / `UserDefaults.set(token` in auth code. Check for hardcoded strings matching API key patterns. Verify sensitive database files use encryption. Flag any `TextField` handling passwords without `secureTextEntry`/`inputType="textPassword"`.

---

### AP-16: No Error States

**Also known as:** The Infinite Spinner, Crash-or-Nothing, Optimistic Blindness
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
Screens have only two states: loading and success. Network failures show infinite spinners. Empty lists show blank screens. Errors are swallowed silently. Force-unwrapped optionals (`snapshot.data!`) crash the app instead of showing a message. No retry button, no "something went wrong" screen, no way for the user to recover.

**Why developers do it:**
Designers deliver mockups for the happy path. Error states are "we'll handle that later" -- and later never comes. Developers test with working APIs and fast connections. Force-unwrapping is shorter than proper null checking.

**What goes wrong:**
Users see infinite spinners and assume the app is broken, then uninstall. Silent failures cause data loss (the user thinks their action succeeded). No retry mechanism means users must kill and restart the app. Empty states without guidance leave users confused about whether data will appear.

**The fix:**
Design every screen with four states: loading, success, empty, and error. Each error state must include: what went wrong (in user language), what the user can do (retry button, check connection), and a way to report the issue. Use sealed classes/enums for UI state to make missing states a compile error.

**Detection rule:**
Search for forced unwraps (`!`, `as!`) in UI code. Check `FutureBuilder`/`useQuery` for missing `hasError` handling. Review every screen for: does it have a loading state? An empty state? An error state with retry? If any of the four states is missing, AP-16 is present.

---

### AP-17: Ignoring Memory Pressure

**Also known as:** The Leaky App, OOM Surprise, Memory Hog
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**
No `onTrimMemory` (Android) or `didReceiveMemoryWarning` (iOS) handler. Image caches grow unbounded. Navigating back and forth between screens monotonically increases memory usage. The app is killed by the OS with no warning, appearing as a "random crash" to users.

**Why developers do it:**
Memory management is invisible during normal testing. Modern devices have enough RAM to mask leaks during short QA sessions. Memory profiling tools require setup and expertise. "The garbage collector handles it." Developers don't test with other memory-intensive apps running simultaneously.

**What goes wrong:**
The OS kills the highest-memory background app first -- that's often the app that doesn't manage its cache. Unclosed streams, retained references, and improper widget disposal cause Flutter memory leaks. React Native closures that capture parent scope variables cause leaks that GC cannot collect. On low-end Android devices with 2-3GB RAM shared across all apps, aggressive memory use means frequent kills.

**The fix:**
Implement memory pressure callbacks: `ComponentCallbacks2.onTrimMemory()` (Android), `applicationDidReceiveMemoryWarning` (iOS). Set maximum sizes on image and data caches. Use weak references for observers and delegates. Profile with LeakCanary (Android), Instruments Allocations (iOS), or DevTools Memory view (Flutter). Verify memory returns to baseline after navigating 10 screens and back.

**Detection rule:**
Check Application/AppDelegate subclass for memory pressure handlers. Profile memory over a 10-screen navigation cycle; if it doesn't return within 20% of baseline, suspect leaks. Search for retained `self` in closures (iOS), non-weak references in observers, and uncancelled streams.

---

### AP-18: No List Virtualization

**Also known as:** The Render-All List, ScrollView With Map, Infinite DOM
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Rendering all list items at once using `ScrollView` with `.map()` (React Native), `Column` with list-generated children (Flutter), or `LinearLayout` in a `ScrollView` (Android). A feed of 500 items renders 500 views simultaneously, consuming memory proportional to the full list rather than the visible window.

**Why developers do it:**
`ScrollView` + `map` is the most intuitive pattern. It works fine with 10 items during development. Virtualized list APIs have more complex configuration. Nesting a `FlatList` inside a `ScrollView` -- a critical anti-pattern -- causes the VirtualizedList to try rendering all items at once since the ScrollView doesn't constrain its content.

**What goes wrong:**
Memory usage scales with list length, not screen size. Initial render time grows linearly -- 5000 items means 5000 view instantiations before anything appears. FlatList destroys offscreen items but re-creates them on scroll-back, which can still cause jank. Android's RecyclerView recycles views efficiently, but only if actually used. LazyColumn (Compose) emits new composables on scroll rather than recycling, but is still far cheaper than rendering all at once.

**The fix:**
Use virtualized list components: `FlatList`/`FlashList` (React Native), `ListView.builder` (Flutter), `RecyclerView` (Android), `UICollectionView` with diffable data source (iOS), `LazyColumn` (Compose). Never nest virtualized lists inside `ScrollView`. Set `keyExtractor` and stable keys to minimize re-renders. For very long lists, consider `FlashList` (React Native) which recycles views like RecyclerView.

**Detection rule:**
Search for `ScrollView` containing `.map()`, `Column` with list-generated children, or `LinearLayout` inside `ScrollView`. Check for `VirtualizedList` nested inside `ScrollView` (React Native console warning). Profile initial render time with 1000+ items; if it exceeds 500ms, suspect missing virtualization.

---

### AP-19: Not Handling Interruptions

**Also known as:** The Fragile Flow, Phone-Call Crash, State Amnesia
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Medium

**What it looks like:**
A user fills out a multi-step checkout form, receives a phone call, returns to the app, and all progress is lost. The payment flow crashes after a system alert. Background-to-foreground transitions reset navigation state. The camera permission dialog interrupts a flow that doesn't resume.

**Why developers do it:**
Multi-step flows are tested linearly start-to-finish. Nobody calls the test phone mid-checkout. State persistence across interruptions requires explicit `onSaveInstanceState` (Android), state restoration (iOS), or equivalent mechanisms. Developers underestimate how often users switch apps mid-task.

**What goes wrong:**
Users lose partially completed forms and abandon the task. Payment flows that don't survive interruption cause double charges or lost orders. On Android, the OS can destroy and recreate an Activity at any time, wiping all in-memory state. iOS App Switcher previews can trigger `viewDidLoad` again if the app was purged from memory.

**The fix:**
Save form state on every field change, not just on submit. Use `onSaveInstanceState`/`onRestoreInstanceState` (Android) or state restoration (iOS). Persist multi-step flow progress to local storage. Test every critical flow by: receiving a phone call, triggering a system alert, switching to another app for 5 minutes, and returning.

**Detection rule:**
Check for `onSaveInstanceState` implementation in Activities with forms. Search for multi-step flows without intermediate state persistence. Automated test: start a flow, send the app to background for 30 seconds, return, and verify state is intact.

---

### AP-20: WebView for Everything

**Also known as:** The Browser-in-a-Box, HTML App in Disguise, Web Wrapper
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
The entire app is a `WebView` loading a mobile website. Core features run in embedded web pages. Navigation mixes native and web transitions. The app feels sluggish, doesn't match platform conventions, and is functionally a browser bookmark with an app icon. Google has explicitly forbidden WebView for OAuth sign-ins due to phishing risks.

**Why developers do it:**
"We already have a website." A WebView wrapper ships faster than a native rewrite. Code sharing between web and mobile seems cost-effective. The team has web developers but not mobile developers. WebViews offer rapid development speed and code reuse.

**What goes wrong:**
WebViews are slower, more memory-intensive, and offer worse scroll/animation performance than native views. Older `UIWebView` (iOS, now deprecated) shared the process with the native app, creating security vulnerabilities. WebViews expose apps to XSS and other web-based attacks that native UI is immune to. Debugging is harder with limited visibility into the WebView's internal workings. Platform accessibility features often don't reach inside WebView content. Profiling tools can't offer the same granularity as in native development.

**The fix:**
Use WebViews only for content that is genuinely web-native: terms of service, blog posts, third-party embedded content. For core features, build native or use cross-platform frameworks (React Native, Flutter) that compile to native components. If WebView is unavoidable, use `WKWebView` (iOS) which runs in a separate process, and enable only the minimum required JavaScript APIs. Never use WebView for authentication flows.

**Detection rule:**
Check if the root view controller or main activity hosts a full-screen `WebView`. Count native screens vs. WebView screens; if WebViews exceed 30% of the app's surface area, evaluate whether a native/cross-platform rebuild is justified. Flag any WebView-based login or payment flow.

---

## Root Cause Analysis

| Root Cause | Contributing Anti-Patterns | Mitigation Strategy |
|---|---|---|
| **Desktop development mindset** | AP-01, AP-04, AP-05, AP-11 | Treat mobile as a constrained environment by default; assume slow network, limited battery, small screen |
| **Emulator-centric development** | AP-01, AP-02, AP-05, AP-11, AP-14 | Require real-device testing every sprint; budget for device lab or cloud farm |
| **Happy path tunnel vision** | AP-04, AP-08, AP-09, AP-16, AP-19 | Design all four states (loading, success, empty, error) for every screen before marking complete |
| **Prototype-to-production pipeline** | AP-01, AP-06, AP-07, AP-13, AP-18 | Enforce performance budgets in CI: frame time < 16ms, memory < 200MB, list scroll jank = 0 |
| **Security as afterthought** | AP-08, AP-15, AP-20 | Include OWASP Mobile Top 10 checklist in code review; run MobSF in CI |
| **Missing design specs** | AP-02, AP-03, AP-12, AP-14, AP-16 | Require specs to include responsive breakpoints, error states, accessibility annotations, keyboard behavior |
| **"We already have a website" fallacy** | AP-03, AP-12, AP-20 | Evaluate native vs. cross-platform UX ROI before defaulting to WebView |
| **Measurement blindness** | AP-05, AP-06, AP-07, AP-13, AP-17 | Instrument production apps with Firebase Performance, Sentry, or New Relic Mobile; set alerting thresholds |
| **Incremental complexity creep** | AP-01, AP-07, AP-18 | Periodic architecture reviews; lint rules for synchronous I/O, unvirtualized lists, leaked listeners |
| **Cross-platform cost pressure** | AP-03, AP-09, AP-12, AP-20 | Budget platform-specific adaptations; "write once" does not mean "test once" |

---

## Self-Check Questions

Use these during code review, sprint planning, or post-mortem analysis to surface anti-patterns before they reach production.

1. **Can a user complete the core task with airplane mode enabled?** If not, which screens fail and what do they show? *(AP-04, AP-16)*

2. **What happens when the user rotates, folds their phone, or switches to split-screen during a multi-step flow?** Does state survive? *(AP-02, AP-07, AP-19)*

3. **Has anyone tested this feature on a physical device costing under $200?** What is the frame rate during scrolling? *(AP-01, AP-11, AP-13, AP-18)*

4. **If I deny every permission, can I still use any feature?** Does the app explain what I'm missing? *(AP-08)*

5. **How many network requests does the app make in the first 60 seconds?** How many are duplicates or could be batched? *(AP-05, AP-06)*

6. **Can a VoiceOver/TalkBack user complete the entire onboarding flow?** Tested on a real device? *(AP-12)*

7. **What is memory footprint after navigating 10 screens and back?** Does it return to baseline? *(AP-07, AP-17)*

8. **If I tap every deep link while not logged in, where do I land?** Does the app remember my destination after login? *(AP-09)*

9. **How many push notifications does the average user receive per day?** What percentage lead to specific referenced content? *(AP-10)*

10. **What does the list screen look like with 5,000 items?** Is it virtualized? What is the initial render time? *(AP-18)*

11. **Are auth tokens in SharedPreferences/UserDefaults or in Keystore/Keychain?** *(AP-15)*

12. **Does the keyboard cover any input field on any screen, including landscape mode?** *(AP-14)*

13. **Would an iOS user and an Android user both feel navigation is "natural" on their platform?** *(AP-03)*

14. **If I start a payment flow, receive a phone call, and return, does the flow resume?** *(AP-19)*

15. **What percentage of screens are WebViews vs. native? Is each justified?** *(AP-20)*

---

## Code Smell Quick Reference

| Code Smell | Likely Anti-Pattern | Where to Look | Severity |
|---|---|---|---|
| `URL().readText()` or synchronous `dataTask` without async wrapper | AP-01: Blocking UI Thread | `onCreate`/`viewDidLoad` | Critical |
| Hardcoded pixel values (`width: 375`, `height: 812`) | AP-02: Not Handling Screen Sizes | Layout XML, style objects | High |
| No `Platform.select()` or platform checks in cross-platform code | AP-03: Ignoring Platform Conventions | Navigation, UI chrome | Medium |
| `fetch()`/`http.get()` without try/catch and cache fallback | AP-04: No Offline Mode | API service layers | High |
| `setInterval`/`Timer.periodic` without cancellation logic | AP-05: Excessive Network Calls | Background services, polling | High |
| API calls in `viewWillAppear`/`onResume`/`useEffect` (no deps) | AP-06: No Caching | Lifecycle methods, hooks | Medium |
| `registerListener` without matching `unregisterListener` | AP-07: Ignoring Lifecycle | `onCreate`/`initState` without cleanup | High |
| More than 5 `<uses-permission>` in manifest | AP-08: Bad Permissions | `AndroidManifest.xml`, `Info.plist` | High |
| Deep link handler always opens `HomeScreen` | AP-09: Deep Linking Failures | App delegate, intent filters | Medium |
| Notification permission in `didFinishLaunching`/`onCreate` | AP-10: Push Notification Abuse | App startup code | Medium |
| CI config with only emulator targets, no real-device stage | AP-11: Emulator-Only Testing | `.github/workflows`, CI config | High |
| Interactive elements without `accessibilityLabel` | AP-12: No Accessibility | Custom buttons, icon-only controls | High |
| `UIImage(contentsOfFile:)`/`BitmapFactory.decodeFile()` without resize | AP-13: Unoptimized Images | Image loading, list cells | Medium |
| No `KeyboardAvoidingView`/`adjustResize`/`resizeToAvoidBottomInset` | AP-14: Keyboard Covering Inputs | Screens with text inputs | Medium |
| `SharedPreferences.putString("token")`/`UserDefaults.set(token)` | AP-15: Insecure Data Storage | Auth logic, session management | Critical |
| `snapshot.data!` or missing `hasError` check | AP-16: No Error States | Async UI builders | Medium |
| No `onTrimMemory`/`didReceiveMemoryWarning` handler | AP-17: Ignoring Memory Pressure | Application/AppDelegate class | High |
| `ScrollView` with `.map()` or `Column` with generated children | AP-18: No List Virtualization | List/feed screens | High |
| No `onSaveInstanceState`/state restoration in multi-step flows | AP-19: Not Handling Interruptions | Checkout, forms, wizards | Medium |
| Full-screen `WebView` as main content view | AP-20: WebView for Everything | Main activity/root view controller | High |

---

*Researched: 2026-03-08 | Sources: [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/), [OWASP M9: Insecure Data Storage](https://owasp.org/www-project-mobile-top-10/2023-risks/m9-insecure-data-storage), [Android Developers - Build for Billions](https://developer.android.com/docs/quality-guidelines/build-for-billions/connectivity), [Android Network Optimization](https://developer.android.com/develop/connectivity/network-ops/network-access-optimization), [React Native Performance](https://reactnative.dev/docs/performance), [React Native Virtualization](https://medium.com/@anisurrahmanbup/react-native-virtualization-performance-optimization-flatlist-sectionlist-virtualizedlist-8430da4c68b3), [React Native Nested Virtualization Anti-Pattern](https://medium.com/@anisurrahmanbup/react-native-nested-virtualization-anti-pattern-performance-optimization-958e98d4ea79), [Flutter Concurrency and Isolates](https://docs.flutter.dev/perf/isolates), [Flutter Jank and Memory Leaks](https://www.mindfulchase.com/explore/troubleshooting-tips/fixing-jank,-state-management-pitfalls,-and-memory-leaks-in-flutter.html), [React Native Memory Leak Fixes](https://instamobile.io/blog/react-native-memory-leak-fixes/), [Push Notification Statistics 2025](https://www.businessofapps.com/marketplace/push-notifications/research/push-notifications-statistics/), [Push Notification Uninstall Impact](https://www.mobiloud.com/blog/push-notification-statistics), [Mobile App Permission Best Practices](https://www.nngroup.com/articles/permission-requests/), [App Permission Install Rates](https://thisisglance.com/blog/best-practices-for-app-permissions-how-to-not-scare-away-users), [Mobile App Accessibility Guide 2026](https://www.accessibilitychecker.org/guides/mobile-apps-accessibility/), [Mobile Screen Readers](https://www.levelaccess.com/blog/part-1-mobile-screen-readers/), [Universal Links & App Links Guide 2026](https://dev.to/marko_boras_64fe51f7833a6/universal-deep-links-2026-complete-guide-36c4), [Deep Linking Failures](https://app.urlgeni.us/blog/why-doesnt-app-deep-linking-always-work), [WebView Security Pitfalls](https://www.zellic.io/blog/webview-security/), [WebView Usage and Challenges](https://webview-cg.github.io/usage-and-challenges/), [Battery Drain Best Practices](https://www.sidekickinteractive.com/uncategorized/best-practices-for-reducing-app-battery-drain/), [Background Task Battery Patterns](https://medium.com/@hiren6997/these-background-task-patterns-are-destroying-your-apps-battery-life-cc51318826ff), [Offline-First Architecture Android](https://androidengineers.substack.com/p/the-complete-guide-to-offline-first), [Offline Mobile App Design](https://leancode.co/blog/offline-mobile-app-design), [Android Development Anti-Patterns](https://mrkivan820.medium.com/5-common-android-development-anti-patterns-and-how-to-fix-or-avoid-them-ceac18ad175d), [Mobile App Mistakes 2026](https://iphtechnologies.com/deadly-mobile-app-development-mistakes-2026/), [UI Pitfalls 2026](https://www.webpronews.com/7-ui-pitfalls-mobile-app-developers-should-avoid-in-2026/), [Keyboard Handling React Native](https://docs.expo.dev/guides/keyboard-handling/), [Flutter Keyboard Overflow](https://www.dhiwise.com/post/flutter-keyboard-overflow-conquering-the-on-screen-keyboard), [Flutter vs React Native Benchmarks 2025](https://www.synergyboat.com/blog/flutter-vs-react-native-vs-native-performance-benchmark-2025)*
