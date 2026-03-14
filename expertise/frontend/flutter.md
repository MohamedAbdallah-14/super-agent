# Flutter — Expertise Module

> A Flutter specialist builds cross-platform mobile, web, and desktop applications using Dart and the Flutter SDK (currently Flutter 3.41 / Dart 3.11). The scope covers UI composition, state management, platform integration, performance tuning, testing, CI/CD, and deployment to iOS App Store, Google Play, web, and desktop targets.

---

## Core Patterns & Conventions

### Project Structure

Use **feature-first** organization for apps beyond a single feature. Each feature owns its UI, state, data, and domain logic. Shared code lives in `core/` or `shared/`.

```
lib/
  core/               # shared utilities, theme, constants, extensions
    network/           # dio client, interceptors, api_endpoints
    theme/             # app_theme.dart, colors, typography
    utils/             # formatters, validators, helpers
    error/             # failure classes, error handler
  features/
    auth/
      data/            # repositories_impl, data_sources, models (DTOs)
      domain/          # entities, repositories (abstract), use_cases
      presentation/    # screens, widgets, controllers/providers
    home/
      data/
      domain/
      presentation/
  app.dart             # MaterialApp / GoRouter setup
  main.dart            # entry point, dependency init
  bootstrap.dart       # environment config, provider scope
test/
  features/
    auth/
      unit/
      widget/
  integration/
  goldens/
```

### Naming Conventions (Effective Dart)

| Element          | Convention         | Example                          |
|------------------|--------------------|----------------------------------|
| Files/folders    | `snake_case`       | `user_profile_screen.dart`       |
| Classes/enums    | `UpperCamelCase`   | `UserProfileScreen`              |
| Variables/funcs  | `lowerCamelCase`   | `fetchUserData()`                |
| Constants        | `lowerCamelCase`   | `const defaultPadding = 16.0`    |
| Private members  | `_prefixed`        | `_internalState`                 |
| Boolean getters  | `is/has/can` prefix| `isLoading`, `hasError`          |

File naming: suffix with purpose — `*_screen.dart`, `*_widget.dart`, `*_repository.dart`, `*_provider.dart`, `*_model.dart`, `*_test.dart`.

### Architecture Patterns

**MVVM + Clean Architecture** (Flutter team recommended as of 2025):

- **View (Widget):** Renders UI, delegates events to ViewModel/Controller. No business logic.
- **ViewModel / Controller:** Holds UI state, calls use cases, exposes state streams/notifiers.
- **Repository (abstract in domain, impl in data):** Single source of truth for data operations.
- **Data Sources:** Remote (API) and local (DB/cache) implementations.

The official Flutter architecture guide (`docs.flutter.dev/app-architecture`) endorses layered architecture with unidirectional data flow (UDF): state flows down from data layer through logic to UI; events flow up from UI through logic to data.

### State Management

**Riverpod 3.x** (released September 2025) is the current recommended choice for most apps:

- Use `@riverpod` annotation with code generation (`riverpod_generator` + `build_runner`).
- Prefer `Notifier` / `AsyncNotifier` over legacy `StateNotifier`.
- Use `ref.watch()` in build methods, `ref.read()` in callbacks only.
- Use `ref.select()` to minimize rebuilds by watching specific fields.
- Keep providers small and focused — one responsibility per provider.

**BLoC 9.x** remains strong for enterprise apps requiring strict event-driven patterns with full traceability. Prefer `Cubit` for simpler cases, full `Bloc` when you need event logging and replay.

**Provider** is acceptable for small apps (<10k LOC) but is effectively superseded by Riverpod for new projects.

### Routing & Navigation

**GoRouter** (official Flutter package) is the standard for declarative routing:

- Define routes declaratively with `GoRoute` and `ShellRoute`.
- Use `StatefulShellRoute` for persistent bottom navigation with maintained state.
- Deep linking works automatically — GoRouter parses URIs to corresponding routes.
- Use redirect guards for auth flows.
- Typed routes via `go_router_builder` for compile-time safety.

**AutoRoute** is preferred for large apps with complex nested flows and route guards when you want generated route classes and strong typing out of the box.

### Data Flow

Follow unidirectional data flow (UDF):

1. UI dispatches **events** (user taps, lifecycle).
2. Controller/ViewModel processes events, calls **use cases**.
3. Use cases interact with **repositories**.
4. Repositories coordinate **data sources** (remote + local).
5. State updates flow back to UI through reactive streams/notifiers.

### Error Handling

- Define a sealed `Failure` class hierarchy (or use `freezed` unions) for typed errors.
- Use the `Result` pattern (or `Either` from `fpdart`) to return success/failure without exceptions in business logic.
- Reserve `try/catch` for infrastructure boundaries (network, platform channels).
- Centralize crash reporting with `FlutterError.onError` and `PlatformDispatcher.instance.onError` for uncaught async errors.
- Never silently swallow errors with empty `catch` blocks.

### Logging & Observability

- Use the `logger` package for structured, leveled console output (debug/info/warning/error).
- In production, route logs through Sentry SDK 9.x or Firebase Crashlytics.
- Sentry's Flutter SDK correlates logs with crashes and performance traces automatically.
- Add context to logs: screen name, user ID, request ID — avoid bare `print()` statements.
- Use `BlocObserver` (if using BLoC) or Riverpod's `ProviderObserver` to log state transitions.

---

## Anti-Patterns & Pitfalls

### 1. Overusing `setState()` for Everything
**Why it's a problem:** `setState()` rebuilds the entire widget subtree. In complex screens, this causes unnecessary rebuilds, jank, and makes state hard to share across widgets. **Instead:** Use Riverpod, BLoC, or another state management solution. Reserve `setState()` for truly local, ephemeral UI state (e.g., a toggle animation).

### 2. God Widgets (Monolithic Build Methods)
**Why it's a problem:** A single widget with 300+ lines in `build()` is untestable, hard to read, and forces full rebuilds for any state change. **Instead:** Extract sub-widgets into separate classes. Each widget should have a single responsibility. Composition over inheritance.

### 3. Not Disposing Controllers and Subscriptions
**Why it's a problem:** Undisposed `TextEditingController`, `AnimationController`, `StreamSubscription`, and `ScrollController` cause memory leaks that accumulate over navigation, leading to laggy UX and eventual OOM crashes. **Instead:** Always override `dispose()` in `State` classes. Use `ref.onDispose()` in Riverpod providers.

### 4. Hardcoded Dimensions and Ignoring Responsiveness
**Why it's a problem:** UIs break on tablets, foldables, landscape mode, and varying text scale factors. **Instead:** Use `MediaQuery`, `LayoutBuilder`, `Flex` widgets, and relative sizing. Test on multiple screen sizes. Consider packages like `flutter_screenutil` or `responsive_framework`.

### 5. Business Logic in Widgets
**Why it's a problem:** Mixing API calls, data transformation, and validation into widget code makes it untestable and tightly coupled. **Instead:** Move logic to controllers/view models/use cases. Widgets should only render state and dispatch events.

### 6. Ignoring `const` Constructors
**Why it's a problem:** Without `const`, Flutter recreates widget instances on every rebuild even when nothing changed, wasting CPU cycles. **Instead:** Mark widgets and their constructors `const` whenever possible. Use `dart fix --apply` to auto-add missing `const`.

### 7. Catching Errors Silently
**Why it's a problem:** `catch (e) {}` or `catch (e) { print(e); }` hides bugs in development and causes silent failures in production that are impossible to diagnose. **Instead:** Log errors with full stack traces to Sentry/Crashlytics. Use typed catches. Surface user-facing errors via snackbars or error screens.

### 8. Over-Relying on Third-Party Packages
**Why it's a problem:** Every package is a dependency risk — abandoned packages, version conflicts, bloated app size. Using a package for trivial tasks (e.g., a package just for padding) adds unnecessary coupling. **Instead:** Evaluate necessity before adding. Check pub.dev scores, maintenance status, and last update date. Write simple utilities yourself.

### 9. Not Using Keys Correctly
**Why it's a problem:** Without proper keys, Flutter's diffing algorithm cannot distinguish list items, causing incorrect state preservation during reorders, insertions, or deletions. **Instead:** Use `ValueKey` or `ObjectKey` on list items. Use `UniqueKey` only when you want to force recreation. Never use `Key(index.toString())` on reorderable lists.

### 10. Blocking the UI Thread with Heavy Computation
**Why it's a problem:** Dart is single-threaded. JSON parsing of large payloads, image processing, or complex calculations on the main isolate cause dropped frames (jank). **Instead:** Use `compute()` or `Isolate.run()` for heavy work. For ongoing background work, use long-lived isolates.

### 11. Nesting `FutureBuilder` / `StreamBuilder` Deeply
**Why it's a problem:** Deeply nested builders become unreadable, rebuild excessively, and make error/loading state handling inconsistent. **Instead:** Use Riverpod `AsyncNotifier` or BLoC to manage async state. Consume final state in a single widget.

### 12. Ignoring Platform Differences
**Why it's a problem:** iOS and Android have different UX conventions (back gestures, scroll physics, haptics). Treating them identically frustrates users on both platforms. **Instead:** Use `Platform.isIOS` or adaptive widgets (`Switch.adaptive`, `Cupertino` widgets) where platform fidelity matters.

### 13. Storing Sensitive Data in SharedPreferences
**Why it's a problem:** SharedPreferences is unencrypted plain text on both platforms. Tokens, passwords, and API keys are trivially extractable. **Instead:** Use `flutter_secure_storage` (Keychain on iOS, EncryptedSharedPreferences on Android).

### 14. Not Handling Loading and Error States in Async UI
**Why it's a problem:** Showing nothing during loading or crashing on error creates a broken user experience. **Instead:** Always handle three states: loading, data, error. Use Riverpod's `.when()` or pattern matching on `AsyncValue`. Show shimmer/skeleton loaders, not just spinners.

---

## Testing Strategy

### Testing Pyramid

| Layer              | Speed   | Quantity | Purpose                                      |
|--------------------|---------|----------|----------------------------------------------|
| Unit tests         | ~ms     | Many     | Business logic, use cases, repositories       |
| Widget tests       | ~100ms  | Moderate | UI rendering, interaction, state transitions  |
| Golden tests       | ~200ms  | Selective| Visual regression detection                   |
| Integration tests  | ~seconds| Few      | Full user flows on real/emulated devices      |

### Frameworks & Tools

- **flutter_test** — built-in, used for unit + widget tests.
- **mocktail** — preferred mocking library (no codegen, simpler than mockito).
- **bloc_test** — for testing BLoC/Cubit state transitions.
- **alchemist** — current standard for golden tests (replaced `golden_toolkit` which is discontinued).
- **patrol** — native-level integration testing with access to system dialogs, permissions, notifications.
- **integration_test** — official package for on-device integration tests.

### What to Test

**Always test:**
- Business logic and use cases (unit).
- State management controllers/notifiers (unit).
- Repository data transformations (unit).
- Complex widget interactions — forms, lists, conditional rendering (widget).
- Critical user flows — login, checkout, onboarding (integration).
- Visually complex or branded components (golden).

**Skip or deprioritize:**
- Framework-provided widget behavior (e.g., testing that `Text` renders text).
- Trivial getters/setters.
- Third-party package internals.
- Platform-level rendering (covered by Flutter engine tests).

### Mocking Patterns

```dart
// Using mocktail
class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late MockUserRepository mockRepo;
  late GetUserUseCase useCase;

  setUp(() {
    mockRepo = MockUserRepository();
    useCase = GetUserUseCase(mockRepo);
  });

  test('returns user on success', () async {
    when(() => mockRepo.getUser('123'))
        .thenAnswer((_) async => User(id: '123', name: 'Ali'));

    final result = await useCase.execute('123');

    expect(result, isA<User>());
    verify(() => mockRepo.getUser('123')).called(1);
  });
}
```

### Test File Organization

Mirror the `lib/` structure under `test/`:
```
test/
  features/
    auth/
      data/
        repositories/
          auth_repository_impl_test.dart
      domain/
        use_cases/
          login_use_case_test.dart
      presentation/
        screens/
          login_screen_test.dart
        controllers/
          login_controller_test.dart
  core/
    network/
      api_client_test.dart
  integration/
    auth_flow_test.dart
  goldens/
    login_screen_golden_test.dart
  helpers/               # shared test utilities, fakes, fixtures
    test_app.dart
    mock_providers.dart
```

### Coverage Expectations

- **Core business logic:** 90%+ (use cases, repositories, controllers).
- **UI widgets:** 70%+ for interactive/complex widgets.
- **Overall project:** 80%+ is a reasonable target.
- Run coverage: `flutter test --coverage && genhtml coverage/lcov.info -o coverage/html`.
- Enforce in CI with `--min-coverage` thresholds via `very_good_cli` or custom scripts.

---

## Performance

### Common Bottlenecks

1. **Excessive rebuilds:** Widgets rebuilding when their inputs haven't changed. Use `const`, `select()`, and granular state splitting.
2. **Shader compilation jank (legacy):** On Skia, first-time shader compilation caused frame drops. Impeller (default since Flutter 3.27 on iOS/Android API 29+) precompiles all shaders at engine build time, eliminating this class of jank entirely.
3. **Large list rendering:** Using `Column` + `SingleChildScrollView` instead of `ListView.builder` materializes all children at once. Always use `ListView.builder` or `SliverList` for dynamic lists.
4. **Unoptimized images:** Loading full-resolution images without caching or resizing. Use `cached_network_image`, specify `cacheWidth`/`cacheHeight`, and serve appropriately sized assets.
5. **Main isolate heavy computation:** JSON parsing, encryption, or image manipulation on the UI thread causes jank.

### Profiling Tools

- **Flutter DevTools Performance view:** Timeline, frame rendering chart, CPU profiler, memory profiler.
- **Performance overlay:** `MaterialApp(showPerformanceOverlay: true)` — shows GPU and UI thread frame times.
- **Widget rebuild tracker:** DevTools "Widget Rebuild Stats" to identify over-rebuilding widgets.
- **`dart:developer` Timeline:** Custom trace events for measuring specific code paths.

### Optimization Patterns

- **`const` widgets:** Mark stateless widgets and their constructors `const` to enable canonical instance reuse.
- **`RepaintBoundary`:** Wrap expensive-to-paint subtrees to isolate their repaint from the rest of the tree.
- **`AutomaticKeepAliveClientMixin`:** Preserve state in `TabBarView` / `PageView` children without rebuilding.
- **`Isolate.run()` / `compute()`:** Offload CPU-heavy work (JSON decode >1MB, image processing) to background isolates.
- **Lazy loading:** Use `ListView.builder`, paginated APIs, and deferred widget initialization.
- **Image optimization:** Use WebP format, specify decode size, leverage `precacheImage()` for critical images.

### Metrics & Thresholds

| Metric                  | Target         |
|-------------------------|----------------|
| Frame render time       | <16ms (60fps) or <8ms (120fps) |
| App startup (cold)      | <2s to first meaningful paint |
| App size (APK)          | <30MB base (varies by assets) |
| Memory (idle)           | <150MB |
| Jank rate               | <1% dropped frames |

---

## Security

### Secure Storage

- **Never** store tokens, passwords, or secrets in `SharedPreferences` (unencrypted).
- Use `flutter_secure_storage` — backed by Keychain (iOS) and EncryptedSharedPreferences/AES (Android).
- For larger encrypted datasets, use `sqflite` with SQLCipher encryption via `sqflite_sqlcipher`.

### Certificate Pinning

- Use `dio` with a custom `SecurityContext` or the `dio_http2_adapter` for pinning.
- Alternatively, `flutter_ssl_pinning` or `http_certificate_pinning` packages verify server certificates against embedded public keys.
- Always pin to the leaf or intermediate certificate, not the root CA.
- Implement pin rotation strategy — ship backup pins and update OTA.

### Code Obfuscation

Build release binaries with obfuscation:
```bash
flutter build apk --release --obfuscate --split-debug-info=build/debug-info
flutter build ipa --release --obfuscate --split-debug-info=build/debug-info
```
Upload `debug-info/` symbols to Sentry/Crashlytics for deobfuscated crash reports.

### Input Validation

- Validate all user input on the client AND server. Client-side validation is UX, not security.
- Sanitize inputs before rendering in `WebView` to prevent XSS.
- Use parameterized queries in local databases — never concatenate user input into SQL.

### API Key Management

- Never hardcode API keys in Dart source — they are trivially extractable from APK/IPA.
- Use `--dart-define` or `--dart-define-from-file` to inject secrets at build time.
- For maximum security, proxy sensitive API calls through your backend.
- Use `.env` files with `envied` package (code-generated, obfuscated access) rather than `flutter_dotenv` (plain text in assets).

### Additional Security Measures

- Enable **ProGuard/R8** on Android release builds for additional code shrinking and obfuscation.
- Implement **root/jailbreak detection** with `flutter_jailbreak_detection` for sensitive apps.
- Use **biometric authentication** via `local_auth` for sensitive operations.
- Implement **app attestation** (DeviceCheck on iOS, SafetyNet/Play Integrity on Android).

---

## Integration Patterns

### REST API Integration

**Dio** is the standard HTTP client for Flutter:
- Configure base URL, timeouts, and interceptors (auth token injection, retry, logging) centrally.
- Use `retrofit` or `chopper` for type-safe, generated API clients from annotated abstract classes.
- Implement request/response interceptors for token refresh, error mapping, and analytics.
- Use `freezed` + `json_serializable` for immutable, generated data models (DTOs).

### GraphQL

- **graphql_flutter** or **ferry** for type-safe GraphQL with code generation.
- Use `gql_build` for generating typed query/mutation classes from `.graphql` files.
- Leverage normalized caching for offline-first patterns.

### gRPC

- Use `grpc` package with Protocol Buffers.
- Generate Dart client stubs from `.proto` files via `protoc` with `protoc_plugin`.
- Ideal for real-time bidirectional streaming and microservice communication.
- 2-10x faster serialization than JSON over REST.

### Platform Channels

- Use **MethodChannel** for async Dart-to-native calls (e.g., accessing native SDKs).
- Use **EventChannel** for streaming native events to Dart (e.g., sensor data, Bluetooth).
- Use **BasicMessageChannel** for custom codecs.
- In Flutter 3.x, prefer **Pigeon** for type-safe, generated platform channel code — eliminates manual serialization.

### FFI (Foreign Function Interface)

- `dart:ffi` for calling C/C++ libraries directly — no platform channel overhead.
- Use `ffigen` to auto-generate Dart bindings from C headers.
- Suitable for compute-heavy native libraries (image processing, crypto, ML inference).

### Local Databases

| Database     | Type       | Best For                          | Web Support |
|-------------|------------|-----------------------------------|-------------|
| **Drift**   | SQL (SQLite)| Relational data, complex queries, migrations | Yes |
| **Isar**    | NoSQL      | High-speed indexed queries, large datasets   | Yes |
| **Hive**    | Key-Value  | Simple settings, small caches                | Yes |
| **ObjectBox**| NoSQL     | Object-oriented storage, edge sync           | No  |
| **sqflite** | SQL        | Direct SQLite access, legacy projects        | No  |

### Firebase Integration

- Use `firebase_core` + specific packages (`cloud_firestore`, `firebase_auth`, `firebase_storage`).
- Initialize with `Firebase.initializeApp()` before `runApp()`.
- Use `FlutterFire CLI` (`flutterfire configure`) to generate platform configs automatically.
- Prefer Firestore's offline persistence for offline-first apps.
- Use Firebase Remote Config for feature flags and A/B testing.

---

## DevOps & Deployment

### Build Flavors / Environments

Define separate environments (dev, staging, production) using Dart defines:

```bash
# Development
flutter run --dart-define-from-file=config/dev.json

# Production
flutter build apk --release --dart-define-from-file=config/prod.json
```

On Android, configure `productFlavors` in `android/app/build.gradle`. On iOS, use Xcode schemes and xcconfig files. Use `flutter_flavorizr` to scaffold multi-flavor setup automatically.

### CI/CD Pipelines

**GitHub Actions** (most common):
- Workflow: checkout -> setup Flutter -> `flutter pub get` -> `flutter analyze` -> `flutter test --coverage` -> `flutter build` -> deploy.
- Use `subosito/flutter-action` for Flutter setup.
- Cache `pub-cache` and build artifacts for faster runs.
- Separate workflows for PR validation vs. release builds.

**Codemagic** (Flutter-native CI/CD):
- Preconfigured Flutter workflows with automatic code signing.
- Built-in distribution to App Store Connect and Google Play.
- Supports `codemagic.yaml` for pipeline-as-code.

**Fastlane** (release automation):
- `fastlane match` for iOS certificate management.
- `fastlane deliver` / `fastlane supply` for store uploads.
- Integrates with both GitHub Actions and Codemagic.

### App Signing

- **Android:** Generate keystore, configure `key.properties`, reference in `build.gradle`. Never commit keystores or signing credentials to version control.
- **iOS:** Use automatic signing in Xcode or `fastlane match` for team-shared certificates. Manage provisioning profiles via Apple Developer portal or Codemagic.

### Environment Configuration

```
config/
  dev.json      # {"API_URL": "https://dev.api.example.com", "LOG_LEVEL": "debug"}
  staging.json
  prod.json
```

Access in code via `const apiUrl = String.fromEnvironment('API_URL')`.

### Store Deployment

- **Android:** Generate signed AAB (not APK) for Play Store. Use `flutter build appbundle --release`.
- **iOS:** Build IPA via `flutter build ipa --release --export-options-plist=ExportOptions.plist`. Upload via Xcode, Transporter, or `fastlane deliver`.

### Monitoring

- **Crashlytics:** `firebase_crashlytics` — real-time crash reporting, automatic breadcrumbs, custom keys.
- **Sentry SDK 9.x:** Session replay (GA for mobile), correlated logs + traces, feature flag context, performance monitoring. Preferred for non-Firebase stacks.
- **Firebase Performance Monitoring:** Network request timing, custom traces, screen rendering metrics.
- Configure `FlutterError.onError` and `PlatformDispatcher.instance.onError` to route all uncaught errors to your monitoring platform.

---

## Decision Trees

### Which State Management?

```
START: How large/complex is the app?
  |
  +-- Small app (<10k LOC, 1-3 devs, simple state)
  |     --> Provider or setState + InheritedWidget
  |
  +-- Medium app (10k-100k LOC, 2-6 devs)
  |     |
  |     +-- Team prefers reactive/declarative?
  |     |     --> Riverpod 3.x (recommended default)
  |     |
  |     +-- Team has BLoC experience / needs strict event tracing?
  |           --> BLoC/Cubit
  |
  +-- Large enterprise app (100k+ LOC, 6+ devs, strict audit needs)
        |
        +-- Need event sourcing / full state replay / devtools tracing?
        |     --> BLoC (events provide full audit trail)
        |
        +-- Need modularity / code generation / testability?
              --> Riverpod 3.x with generated providers
```

### Which Navigation Approach?

```
START: What type of app?
  |
  +-- Simple app (5-10 screens, no deep linking needed)
  |     --> Navigator 2.0 with GoRouter
  |
  +-- Web app or PWA (URL-based routing critical)
  |     --> GoRouter (official, deep link support built-in)
  |
  +-- Large app with complex nested navigation
  |     |
  |     +-- Want generated route classes + strong typing?
  |     |     --> AutoRoute
  |     |
  |     +-- Want official Flutter support + simplicity?
  |           --> GoRouter with StatefulShellRoute
  |
  +-- App with persistent bottom nav + independent stacks
        --> GoRouter + StatefulShellRoute (maintains per-tab state)
```

### Which Local Storage Solution?

```
START: What kind of data?
  |
  +-- Simple key-value (settings, flags, preferences)
  |     |
  |     +-- Sensitive data (tokens, credentials)?
  |     |     --> flutter_secure_storage
  |     |
  |     +-- Non-sensitive data?
  |           --> SharedPreferences (trivial) or Hive (fast, typed)
  |
  +-- Structured / relational data
  |     |
  |     +-- Need complex queries, joins, migrations?
  |     |     --> Drift (compile-time safe SQL, reactive)
  |     |
  |     +-- Need maximum read/write speed on large datasets?
  |           --> Isar (NoSQL, indexed queries, ~10x faster than Hive)
  |
  +-- Object-oriented data with sync requirements
  |     --> ObjectBox (built-in data sync, no web support)
  |
  +-- Web support required?
        --> Drift or Isar or Hive (all support web)
```

---

## Code Examples

### 1. Riverpod AsyncNotifier with Code Generation

The modern, idiomatic way to manage async state in Riverpod 3.x:

```dart
// user_controller.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_controller.g.dart';

@riverpod
class UserController extends _$UserController {
  @override
  Future<User> build(String userId) async {
    // Automatically handles loading/error/data states
    final repo = ref.watch(userRepositoryProvider);
    return repo.getUser(userId);
  }

  Future<void> updateName(String newName) async {
    final repo = ref.read(userRepositoryProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => repo.updateUser(state.requireValue.copyWith(name: newName)),
    );
  }
}

// In the widget — pattern matching on AsyncValue
class UserScreen extends ConsumerWidget {
  const UserScreen({required this.userId, super.key});
  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(userControllerProvider(userId));
    return switch (userAsync) {
      AsyncData(:final value) => UserProfileView(user: value),
      AsyncError(:final error) => ErrorView(message: '$error'),
      _ => const Center(child: CircularProgressIndicator()),
    };
  }
}
```

### 2. Result Pattern for Error Handling

Avoid exceptions in business logic — use sealed types:

```dart
// result.dart
sealed class Result<T> {
  const Result();
}

final class Success<T> extends Result<T> {
  const Success(this.value);
  final T value;
}

final class Failure<T> extends Result<T> {
  const Failure(this.error, [this.stackTrace]);
  final AppException error;
  final StackTrace? stackTrace;
}

// repository usage
class AuthRepositoryImpl implements AuthRepository {
  @override
  Future<Result<User>> login(String email, String password) async {
    try {
      final response = await _apiClient.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      return Success(UserModel.fromJson(response.data).toEntity());
    } on DioException catch (e, st) {
      return Failure(e.toAppException(), st);
    }
  }
}

// consuming in controller
final result = await ref.read(authRepositoryProvider).login(email, password);
switch (result) {
  case Success(:final value):
    state = AsyncData(value);
  case Failure(:final error):
    state = AsyncError(error, StackTrace.current);
}
```

### 3. GoRouter Setup with Auth Redirect

Declarative routing with authentication guards:

```dart
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: authState,
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      if (!isLoggedIn && !isAuthRoute) return '/auth/login';
      if (isLoggedIn && isAuthRoute) return '/';
      return null; // no redirect
    },
    routes: [
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          ]),
        ],
      ),
    ],
  );
});
```

### 4. Dio Client with Interceptors

Production-ready HTTP client setup:

```dart
@riverpod
Dio dioClient(Ref ref) {
  final dio = Dio(BaseOptions(
    baseUrl: const String.fromEnvironment('API_URL'),
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.addAll([
    // Auth token injection
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await ref.read(secureStorageProvider).read(key: 'token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Attempt token refresh, then retry
          final refreshed = await ref.read(authControllerProvider.notifier).refreshToken();
          if (refreshed) {
            handler.resolve(await dio.fetch(error.requestOptions));
            return;
          }
        }
        handler.next(error);
      },
    ),
    // Logging (debug only)
    if (kDebugMode) LogInterceptor(requestBody: true, responseBody: true),
  ]);

  return dio;
}
```

### 5. Responsive Layout with LayoutBuilder

Adaptive UI without hardcoded breakpoints scattered through code:

```dart
// breakpoints.dart
abstract final class Breakpoints {
  static const double mobile = 600;
  static const double tablet = 900;
  static const double desktop = 1200;
}

// responsive_layout.dart
class ResponsiveLayout extends StatelessWidget {
  const ResponsiveLayout({
    required this.mobile,
    this.tablet,
    this.desktop,
    super.key,
  });

  final Widget mobile;
  final Widget? tablet;
  final Widget? desktop;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= Breakpoints.desktop) {
          return desktop ?? tablet ?? mobile;
        }
        if (constraints.maxWidth >= Breakpoints.tablet) {
          return tablet ?? mobile;
        }
        return mobile;
      },
    );
  }
}

// Usage
ResponsiveLayout(
  mobile: const ProductListView(),
  tablet: const ProductGridView(crossAxisCount: 2),
  desktop: const ProductGridView(crossAxisCount: 4),
)
```

---

*Researched: 2026-03-07 | Sources: [Flutter Architecture Guide](https://docs.flutter.dev/app-architecture/guide), [Flutter Architecture Recommendations](https://docs.flutter.dev/app-architecture/recommendations), [Flutter State Management Comparison 2025](https://dev.to/bestaoui_aymen/state-management-in-flutter-riverpod-20-vs-bloc-vs-provider-1ogh), [Flutter 3.41 Release](https://blog.flutter.dev/whats-new-in-flutter-3-41-302ec140e632), [Impeller Rendering Engine 2026](https://dev.to/eira-wexford/how-impeller-is-transforming-flutter-ui-rendering-in-2026-3dpd), [DCM: 15 Common Flutter Mistakes](https://dcm.dev/blog/2025/03/24/fifteen-common-mistakes-flutter-dart-development/), [Flutter Testing Best Practices](https://dev.to/misterankit/the-comprehensive-guide-to-flutter-app-testing-best-practices-and-proven-strategies-51m8), [Golden Tests with Alchemist](https://vibe-studio.ai/insights/flutter-widget-testing-best-practices-golden-tests-and-screenshot-diffs), [Flutter Security Best Practices](https://hackernoon.com/10-best-practices-for-securing-your-flutter-mobile-app-in-2025), [Sentry Flutter SDK 9.0](https://blog.sentry.io/introducing-sentrys-flutter-sdk-9-0/), [GoRouter Navigation](https://docs.flutter.dev/ui/navigation), [Flutter Local Databases 2025](https://quashbugs.com/blog/hive-vs-drift-vs-floor-vs-isar-2025), [Riverpod 3.x Guide](https://codewithandrea.com/articles/flutter-state-management-riverpod/), [Flutter CI/CD with Codemagic](https://blog.codemagic.io/ci-cd-for-flutter-with-fastlane-codemagic/), [Flutter Performance DevTools](https://docs.flutter.dev/tools/devtools/performance), [State of Flutter 2026](https://devnewsletter.com/p/state-of-flutter-2026/)*
