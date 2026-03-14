# Mobile App Architecture — Architecture Expertise Module

> Mobile app architecture encompasses the structural patterns for building iOS and Android applications, including the native vs cross-platform decision, state management approaches, and UI architecture patterns. The choice between native (Swift/Kotlin), cross-platform (Flutter/React Native), or hybrid significantly impacts team structure, performance, and long-term maintenance. As of 2025, cross-platform frameworks deliver 80-90% of native performance, and Flutter holds 42% market share compared to React Native's 38% (Statista), making this a genuine engineering decision rather than an obvious default.

> **Category:** Mobile Architecture
> **Complexity:** Moderate
> **Applies when:** Building mobile applications for iOS, Android, or both platforms

---

## What This Is

### The Platform Spectrum

Mobile app development exists on a spectrum from fully native to fully abstracted, with meaningful trade-offs at every point.

**Native Development** means writing platform-specific code: Swift/SwiftUI for iOS, Kotlin/Jetpack Compose for Android. Each platform gets its own codebase, its own team (or at least its own expertise), and its own deployment pipeline. The app has unmediated access to every platform API, every hardware capability, and every new OS feature on day one. The cost is maintaining two codebases that must stay functionally equivalent.

**Cross-Platform Development** uses a single codebase that compiles to (or runs on) both platforms. Flutter compiles Dart to native ARM code and renders its own widget tree via Skia/Impeller — it does not use platform UI components at all. React Native executes JavaScript and maps React components to native platform views through its bridge (legacy) or JSI (new architecture). The cost is an abstraction layer that may not expose every platform capability and introduces its own performance characteristics.

**Hybrid Development** wraps a web application (HTML/CSS/JS) in a native container (Capacitor, formerly Cordova/PhoneGap). The app is essentially a WebView with native API bridges. Performance and UX are noticeably inferior to both native and cross-platform approaches. In 2025, hybrid is rarely recommended for new projects — it persists mainly in legacy codebases and internal enterprise tools where web skills are the only option.

**Kotlin Multiplatform (KMP)** occupies a distinct position: shared business logic in Kotlin with native UI on each platform. Google endorsed KMP at I/O 2024 as the recommended approach for sharing business logic between Android and iOS. Companies like McDonald's, Shopify, Forbes, and Cash App run KMP in production. KMP is not a UI framework — it shares networking, data, storage, and domain logic while leaving UI to SwiftUI and Jetpack Compose respectively.

### UI Architecture Patterns

These patterns govern how data flows between the model (business logic/state) and the view (UI). They are framework-agnostic concepts, though each framework has natural affinities.

**MVC (Model-View-Controller)** — The original pattern. The Controller mediates between Model and View. In practice, iOS's UIKit-era MVC devolved into "Massive View Controller" because Apple's UIViewController combined controller and view responsibilities. Android's Activity-based MVC had similar problems. MVC is largely abandoned for new mobile projects but persists in legacy codebases.

**MVP (Model-View-Presenter)** — The View is passive and delegates all user actions to the Presenter, which updates the Model and tells the View what to render. Popular in pre-Compose Android development. Testable (the Presenter has no Android dependencies), but the Presenter tends to accumulate responsibilities and the View interface becomes bloated.

**MVVM (Model-View-ViewModel)** — The ViewModel exposes observable state that the View binds to. The View never calls methods on the ViewModel to update UI — it observes state changes reactively. MVVM is the dominant pattern in modern mobile development: SwiftUI uses it natively via `@Observable`/`@StateObject`, Android Architecture Components were built around it, and 46% of Android developers favor it (JetBrains survey). Works well for medium-complexity apps but can suffer from ViewModel bloat and ambiguous state transitions in complex workflows.

**MVI (Model-View-Intent)** — Unidirectional data flow with immutable state. The View emits Intents (user actions), a Reducer processes them against the current State, and a new State is emitted. The View renders the new State. This is essentially Redux for mobile. MVI naturally aligns with Jetpack Compose's declarative, state-driven rendering model. More boilerplate than MVVM but dramatically more predictable state management. Preferred for apps with complex state transitions — multi-step forms, real-time data, collaborative editing.

**BLoC (Business Logic Component)** — Flutter-specific pattern. Events flow in, States flow out, mediated by Streams. Conceptually identical to MVI but uses Dart's Stream primitives. BLoC enforces strict separation: widgets emit Events, the BLoC processes them, and new States are emitted. The `flutter_bloc` package is the de facto standard. BLoC Cubits are a simplified variant where you call methods directly instead of adding events to a stream — appropriate for simpler state transitions.

**TCA (The Composable Architecture)** — Point-Free's opinionated architecture for SwiftUI. State, Action, Reducer, and Store form the core. Features compose via the `Scope` reducer, enabling large apps to be built from small, testable feature modules. TCA uses Swift's `@ObservableState` (as of 2025) for seamless SwiftUI integration. Powerful for large apps but has a significant learning curve and performance overhead from the reducer chain. Some in the Swift community argue TCA over-engineers what SwiftUI handles natively.

**Redux/Flux Variants** — React Native inherits the React ecosystem's state management: Redux, Zustand, MobX, Recoil, Jotai. Redux is the most established but adds significant boilerplate. Zustand has gained rapid adoption for its simplicity. The choice often depends on the team's existing React experience rather than mobile-specific considerations.

### State Management Approaches

State management is the central challenge of mobile architecture. Mobile apps face unique state challenges: background/foreground transitions, unreliable network, platform lifecycle events (rotation, memory pressure), and navigation state that must survive process death.

**Local Component State** — State owned by a single widget/view. Appropriate for UI-only concerns: animation state, form field focus, scroll position. Every framework supports this natively (SwiftUI `@State`, Compose `remember`, React Native `useState`, Flutter `StatefulWidget`).

**Scoped State** — State shared across a subtree of the component hierarchy. Flutter's `Provider`/`InheritedWidget`, React's Context, SwiftUI's `@EnvironmentObject`. Appropriate for theme data, authentication status, feature flags — things needed by many widgets but not truly global.

**Global Application State** — State that lives outside the component tree and is accessible anywhere. Redux stores, BLoC instances provided at the app root, Riverpod providers. Appropriate for user session, cart contents, cached API responses. The danger is making everything global — this is the "god state" antipattern.

**Server State** — State that originates from and is owned by a remote server. React Query/TanStack Query (React Native), Riverpod's `FutureProvider`/`StreamProvider` (Flutter), and similar libraries specialize in caching, invalidation, optimistic updates, and background refetching. Treating server state separately from UI state is a major architectural insight — they have different lifecycles, different staleness semantics, and different error modes.

---

## When to Use Native

### The Qualifying Conditions

Build natively (Swift/Kotlin, separate codebases) when **two or more** of these are true:

**Maximum performance is non-negotiable.** Real-time audio/video processing, 3D rendering, AR experiences (ARKit/ARCore), computationally intensive ML inference on-device, or games requiring consistent 120fps. The abstraction layer of any cross-platform framework introduces overhead that matters in these domains. Instagram's camera pipeline, Snapchat's AR lenses, and Pokemon Go are native for performance reasons.

**Deep platform integration is a core feature.** System-level integrations like HealthKit/Health Connect, CallKit, SiriKit/Google Assistant routines, Widgets (iOS WidgetKit, Android App Widgets), Live Activities, Dynamic Island, or Watch connectivity. Cross-platform frameworks expose these through community plugins that may lag months behind OS releases and may not cover the full API surface.

**Single-platform app.** If you only need iOS or only need Android, there is no cost argument for cross-platform. Use SwiftUI or Jetpack Compose respectively. The tooling, documentation, and community support are superior to any cross-platform alternative for single-platform development.

**Team has deep platform expertise.** If your team has senior iOS and Android engineers who think in platform idioms, forcing them into Flutter/Dart or React Native/JavaScript may reduce velocity rather than increase it. The "write once" savings are offset by fighting the framework when platform-specific behavior is needed.

**App Store discoverability and review sensitivity.** Some categories (finance, health, government) face stricter App Store review. Native apps have fewer rejection vectors because they do not bundle a runtime or use non-standard rendering pipelines.

### Real-World Native Architecture: SwiftUI + MVVM

SwiftUI's declarative paradigm naturally supports MVVM. Views are pure functions of state, ViewModels are `@Observable` classes, and the framework handles reactivity:

```swift
// Domain Layer
struct Transaction: Identifiable {
    let id: UUID
    let amount: Decimal
    let category: TransactionCategory
    let date: Date
}

// Data Layer
protocol TransactionRepository {
    func fetchRecent(limit: Int) async throws -> [Transaction]
    func save(_ transaction: Transaction) async throws
}

// Presentation Layer
@Observable
class TransactionListViewModel {
    private let repository: TransactionRepository
    var transactions: [Transaction] = []
    var isLoading = false
    var error: AppError?

    init(repository: TransactionRepository) {
        self.repository = repository
    }

    func loadTransactions() async {
        isLoading = true
        defer { isLoading = false }
        do {
            transactions = try await repository.fetchRecent(limit: 50)
        } catch {
            self.error = .network(error)
        }
    }
}
```

### Real-World Native Architecture: Jetpack Compose + MVI

MVI aligns naturally with Compose's state-driven rendering:

```kotlin
// State
data class TransactionListState(
    val transactions: List<Transaction> = emptyList(),
    val isLoading: Boolean = false,
    val error: AppError? = null
)

// Intent (user actions)
sealed interface TransactionListIntent {
    data object LoadTransactions : TransactionListIntent
    data class DeleteTransaction(val id: String) : TransactionListIntent
    data object RetryLoad : TransactionListIntent
}

// ViewModel as state machine
class TransactionListViewModel(
    private val repository: TransactionRepository
) : ViewModel() {

    private val _state = MutableStateFlow(TransactionListState())
    val state: StateFlow<TransactionListState> = _state.asStateFlow()

    fun onIntent(intent: TransactionListIntent) {
        when (intent) {
            is TransactionListIntent.LoadTransactions -> loadTransactions()
            is TransactionListIntent.DeleteTransaction -> deleteTransaction(intent.id)
            is TransactionListIntent.RetryLoad -> loadTransactions()
        }
    }

    private fun loadTransactions() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            repository.fetchRecent(limit = 50)
                .onSuccess { txns ->
                    _state.update { it.copy(transactions = txns, isLoading = false) }
                }
                .onFailure { err ->
                    _state.update { it.copy(error = err.toAppError(), isLoading = false) }
                }
        }
    }
}
```

---

## When to Use Cross-Platform

### Flutter: The 80% Solution

Flutter is appropriate for the majority of mobile applications — content-driven apps, e-commerce, social, productivity, internal tools, and CRUD-centric business apps. Use Flutter when:

**Small team, both platforms required.** A team of 3-5 engineers can ship and maintain both iOS and Android with Flutter. The same team doing native would need to double (or accept that one platform lags). This is the single most common reason teams choose Flutter.

**Pixel-perfect custom UI across platforms.** Flutter renders its own widget tree — it does not use platform UI components. This means the app looks identical on iOS and Android (or can be themed per platform). For brands that want exact visual consistency, Flutter delivers this by default. The trade-off is that Flutter apps do not automatically adopt platform conventions (iOS back-swipe gesture, Android material ripple effects) — these must be explicitly implemented.

**Rapid iteration and prototyping.** Flutter's hot reload is genuinely faster than any native development cycle. Stateful hot reload preserves app state while injecting code changes, enabling sub-second iteration on UI. This is a meaningful productivity advantage for UI-heavy development.

**Content-heavy and form-heavy applications.** News readers, e-commerce catalogs, social feeds, multi-step forms, dashboards — these are Flutter's sweet spot. The business logic is in the data layer, the UI is presentation, and there is minimal platform-specific integration needed.

### React Native: The JavaScript Ecosystem Play

**Team has strong React/JavaScript expertise.** If your engineering organization is built on React, React Native leverages that investment. Engineers can move between web and mobile projects. Shared libraries (validation logic, API clients, design tokens) work across platforms.

**Brownfield integration.** React Native was designed to integrate into existing native apps. You can add React Native screens to an existing Swift/Kotlin app incrementally. Flutter's add-to-app story exists but is less mature.

**New Architecture (JSI) changes the calculus.** With React Native 0.76+, the New Architecture is enabled by default. JSI replaces the asynchronous bridge with synchronous C++ interop, Fabric replaces the old renderer, and TurboModules replace the old native module system. Meta reports that performance in production apps is now comparable to native in most scenarios. Hermes is the default JavaScript engine, replacing JavaScriptCore with better startup performance and lower memory usage.

### Kotlin Multiplatform: Shared Logic, Native UI

**Existing native apps that want to reduce duplication.** KMP's strength is sharing business logic (networking, data processing, validation, domain rules) while keeping UI fully native. This is not a rewrite — it is an incremental adoption path. McDonald's expanded KMP across their entire application, reducing crashes and enabling a unified mobile team.

**Teams that refuse to compromise on native UI.** Some teams (and some designers) insist on platform-native UI behavior. KMP allows shared logic with SwiftUI on iOS and Jetpack Compose on Android. Each platform gets its native navigation, transitions, and interaction patterns.

**Strong Kotlin expertise.** KMP requires Kotlin expertise and comfort with Gradle. The iOS integration story improved significantly with Swift Export in 2025, which generates pure Swift APIs instead of going through Objective-C interop.

---

## When NOT to Use Cross-Platform

**Games and heavy 3D rendering.** Use Unity, Unreal, or native Metal/Vulkan. Cross-platform frameworks are not game engines. Flutter's Flame engine handles 2D games adequately but is not comparable to Unity for anything beyond casual games.

**AR/VR experiences.** ARKit and ARCore have deep platform integration. Cross-platform wrappers exist but lag behind native SDKs and do not expose the full API surface. If AR is a core feature (not a gimmick), go native.

**Platform-specific deep integrations.** Building a keyboard extension, a share extension, a custom camera pipeline, a CallKit-based VoIP app, or an Apple Watch companion requires native code. You can use cross-platform for the main app and native for extensions, but the extension itself must be native.

**Strict performance requirements.** Audio processing apps (DAWs, music instruments), video editing, real-time communication with custom codecs — these need direct access to platform audio/video pipelines without framework overhead.

**Regulated industries with native SDK requirements.** Some banking and healthcare SDKs are only distributed as native iOS/Android libraries. Integrating them into cross-platform frameworks is possible but adds friction, and the SDK vendor may not support cross-platform configurations.

---

## How It Works

### Flutter: Widget Tree + State Management

Flutter's architecture is layered: Framework (Dart) -> Engine (C/C++, Skia/Impeller) -> Embedder (platform-specific).

The widget tree is the fundamental building block. Everything is a widget — layout, styling, gesture detection, animation. Widgets are immutable descriptions of UI. When state changes, Flutter rebuilds the widget tree, diffs it against the previous tree (via the Element tree), and only repaints what changed (via the RenderObject tree).

**Clean Architecture with BLoC** is the most common production Flutter architecture:

```
lib/
  core/
    error/
      failures.dart           # Domain failure types
      exceptions.dart         # Infrastructure exceptions
    network/
      network_info.dart       # Connectivity abstraction
    usecases/
      usecase.dart            # Base UseCase interface
  features/
    transactions/
      data/
        datasources/
          transaction_remote_datasource.dart
          transaction_local_datasource.dart
        models/
          transaction_model.dart      # DTO with fromJson/toJson
        repositories/
          transaction_repository_impl.dart
      domain/
        entities/
          transaction.dart            # Pure domain entity
        repositories/
          transaction_repository.dart  # Abstract contract
        usecases/
          get_recent_transactions.dart
          create_transaction.dart
      presentation/
        bloc/
          transaction_bloc.dart
          transaction_event.dart
          transaction_state.dart
        pages/
          transaction_list_page.dart
        widgets/
          transaction_card.dart
  injection_container.dart   # Dependency injection setup
```

**BLoC implementation:**

```dart
// Events
abstract class TransactionEvent {}
class LoadTransactions extends TransactionEvent {}
class DeleteTransaction extends TransactionEvent {
  final String id;
  DeleteTransaction(this.id);
}

// States
abstract class TransactionState {}
class TransactionInitial extends TransactionState {}
class TransactionLoading extends TransactionState {}
class TransactionLoaded extends TransactionState {
  final List<Transaction> transactions;
  TransactionLoaded(this.transactions);
}
class TransactionError extends TransactionState {
  final String message;
  TransactionError(this.message);
}

// BLoC
class TransactionBloc extends Bloc<TransactionEvent, TransactionState> {
  final GetRecentTransactions getRecentTransactions;

  TransactionBloc({required this.getRecentTransactions})
      : super(TransactionInitial()) {
    on<LoadTransactions>((event, emit) async {
      emit(TransactionLoading());
      final result = await getRecentTransactions(Params(limit: 50));
      result.fold(
        (failure) => emit(TransactionError(failure.message)),
        (transactions) => emit(TransactionLoaded(transactions)),
      );
    });
  }
}
```

### React Native: JSI and the New Architecture

React Native's new architecture (default since 0.76) eliminates the asynchronous bridge:

**JSI (JavaScript Interface)** — JavaScript holds direct references to C++ host objects. Native methods are called synchronously without JSON serialization. This is the foundation that enables the performance improvements.

**Fabric** — The new rendering system. React components map to native views through a C++ layer instead of the old bridge. Layout calculation (Yoga) happens synchronously, eliminating the layout "flickering" that plagued the old architecture.

**TurboModules** — Native modules are loaded lazily (only when first accessed) and communicate via JSI instead of the bridge. This improves startup time and reduces memory usage.

**Hermes** — The default JavaScript engine, purpose-built for React Native. Ahead-of-time compilation of JavaScript to bytecode reduces startup time. Lower memory footprint than JavaScriptCore.

A typical React Native architecture in 2025 uses feature-based organization with a state management library:

```
src/
  features/
    transactions/
      api/
        transactionApi.ts        # API calls (React Query)
      components/
        TransactionCard.tsx
        TransactionList.tsx
      hooks/
        useTransactions.ts       # Custom hooks
      screens/
        TransactionListScreen.tsx
      types/
        transaction.ts
  shared/
    components/
    hooks/
    services/
      api.ts                     # Axios/fetch configuration
      storage.ts                 # AsyncStorage abstraction
    navigation/
      AppNavigator.tsx
      types.ts
  store/                         # Global state (Zustand/Redux)
    authStore.ts
    appStore.ts
```

### Navigation Patterns

Navigation is one of the most architecturally significant decisions in mobile apps because it determines how screens are composed, how deep links work, and how state is preserved across the back stack.

**Stack Navigation** — Screens push onto and pop off a stack. The fundamental navigation pattern. Every framework supports this: `NavigationStack` (SwiftUI), `NavHost` (Compose), `Navigator` (Flutter), `Stack.Navigator` (React Navigation).

**Tab Navigation** — Bottom tab bar with independent navigation stacks per tab. Standard for most consumer apps. Each tab maintains its own navigation state — switching tabs preserves scroll position and back stack.

**Declarative/State-Driven Navigation** — The navigation state is a data structure that the framework renders. SwiftUI's `NavigationPath`, Flutter's Router/GoRouter, Compose Navigation's type-safe routes. This approach makes deep linking natural (a deep link is just a state) and simplifies testing (assert on navigation state, not UI).

**Coordinator/Router Pattern** — Navigation logic is extracted from individual screens into a coordinator object. Screens do not know about other screens — they emit navigation events that the coordinator handles. This decouples screens and makes the navigation graph explicitly visible. Popular in UIKit (pre-SwiftUI) and recommended for complex Flutter apps.

### Dependency Injection

**Flutter:** `get_it` (service locator) + `injectable` (code generation) is the most common DI approach. Riverpod acts as both state management and DI. Flutter does not have a framework-level DI container.

**Android (Native):** Hilt (built on Dagger) is the standard. Koin is a lighter alternative that uses Kotlin DSL instead of annotation processing. Compose's `LocalCompositionProvider` handles scoped dependencies.

**iOS (Native):** Swift lacks a standard DI framework. Constructor injection is the most common approach. Swinject and Factory are popular third-party options. SwiftUI's `@Environment` handles framework-level injection.

**React Native:** No framework-level DI. Module imports serve as the dependency mechanism. Libraries like `tsyringe` or `inversify` exist but are rarely used. React Context is the primary injection mechanism for components.

### Repository Pattern for Data

The repository pattern is nearly universal in mobile architecture because mobile apps typically consume data from multiple sources (remote API, local database, cache) and must handle connectivity gracefully.

```
RemoteDataSource (API) ──┐
                          ├── Repository ── UseCase ── ViewModel/BLoC
LocalDataSource (DB)  ───┘
```

The repository decides whether to fetch from network or local storage, handles caching strategies, and maps data transfer objects (DTOs) to domain entities. This is the foundation of offline-first architecture.

### Offline-First Considerations

Mobile apps operate in fundamentally unreliable network conditions. Offline-first architecture treats the local database as the single source of truth and synchronizes with the server in the background.

**Core principles:**
- All reads come from local storage. The UI never waits for a network call to display data.
- Writes are saved locally first and marked as "pending sync."
- A background sync mechanism (WorkManager on Android, BGTaskScheduler on iOS, or framework-level equivalents) reconciles local and remote state.
- Conflict resolution must be explicit: last-write-wins, server-wins, or manual merge.

**The Outbox Pattern** for writes: when the user creates or modifies data offline, the change is written to a local outbox table. A background worker processes the outbox when connectivity is available, sending changes to the server and removing them from the outbox on success.

**Optimistic UI** — the UI immediately reflects the user's action (as if it succeeded) while the actual network call happens asynchronously. If the call fails, the UI rolls back. This is essential for perceived performance on mobile.

---

## Trade-Offs Matrix

| Dimension | Native (Swift/Kotlin) | Flutter | React Native | KMP |
|---|---|---|---|---|
| **Performance** | Best. Direct platform access, no abstraction overhead | Near-native. Own rendering engine bypasses platform views | Good with New Architecture (JSI). Bridge overhead eliminated | Native. Shared logic compiles to native, UI is fully native |
| **Team cost** | 2x — separate iOS and Android teams required | 1x — single team, single codebase | 1x — single team, leverages React/JS skills | 1.5x — shared logic team + platform UI expertise |
| **Time to market** | Slowest. Two codebases, two review cycles | Fast. Single codebase, hot reload, one CI pipeline | Fast. Single codebase, fast refresh, large package ecosystem | Medium. Shared logic accelerates, but UI is still per-platform |
| **Platform API access** | Immediate. Day-one access to new OS features | Delayed. Depends on plugin ecosystem (1-6 month lag typical) | Delayed. Similar plugin lag, community-driven | Immediate for UI, shared logic may need `expect`/`actual` |
| **UI fidelity** | Perfect platform-native look and feel | Custom rendering — identical across platforms, not platform-native by default | Uses native platform views — natural platform feel | Fully platform-native (SwiftUI/Compose) |
| **Ecosystem maturity** | Most mature. Apple/Google first-party tooling | Mature. 200k+ packages on pub.dev, Google-backed | Mature. npm ecosystem, Meta-backed, large community | Growing rapidly. Google-endorsed, JetBrains-backed |
| **Hot reload/refresh** | SwiftUI Previews (limited), no true hot reload | Best-in-class hot reload with state preservation | Fast Refresh — good, though occasionally requires full reload | Native tooling — Compose previews, SwiftUI previews |
| **Long-term maintenance** | Stable. Platform SDKs have strong backward compatibility | Moderate. Flutter major versions occasionally require migration effort | Improving. New Architecture is stable, but upgrade path historically painful | Good. Kotlin is stable, shared logic evolves independently |
| **Hiring** | Separate iOS (Swift) and Android (Kotlin) pools | Growing Dart/Flutter pool, smaller than native | Large JavaScript/React pool, easiest to hire | Kotlin developers (plentiful), iOS devs need KMP training |
| **App size** | Smallest. No bundled runtime | Larger. Includes Flutter engine (~5-8 MB overhead) | Medium. Includes Hermes engine and runtime | Smallest. No bundled runtime (native compilation) |
| **Testing** | Platform-specific test frameworks, XCTest/JUnit | Single test framework, excellent widget testing, `bloc_test` | Jest for logic, Detox/Maestro for E2E | Shared logic testable with kotlin.test, UI tested per-platform |

---

## Evolution Path

### Maturity Stages

**Stage 1: Single Platform MVP**
Start with one platform (whichever your users are on). Use the simplest architecture that works — MVVM with a repository layer. Do not over-engineer. Ship, learn, iterate. Most startups should launch on one platform and validate before investing in the second.

**Stage 2: Second Platform Decision**
When you need the second platform, evaluate: How much platform-specific integration do you need? How large is your team? How different should iOS and Android experiences be? This is where the native vs cross-platform decision is made. If you choose cross-platform, this is the point to rewrite — do not attempt to wrap the native app in a cross-platform framework.

**Stage 3: Feature-Based Modularization**
As the app grows beyond 10-15 screens, decompose into feature modules. Each feature owns its screens, state management, data sources, and navigation. Features communicate through well-defined interfaces, not direct imports. This enables parallel team development and faster build times.

**Stage 4: Shared Architecture Conventions**
Establish and enforce architectural conventions: where business logic lives, how errors propagate, how navigation works, how features are tested. Create project templates and linters that enforce these conventions. Without this, a 20-person mobile team will produce 20 different architectures.

**Stage 5: Platform Abstraction Layer**
For large teams (15+ mobile engineers), create an internal platform layer that handles cross-cutting concerns: analytics, feature flags, A/B testing, crash reporting, authentication, deep linking. Individual feature teams consume this platform layer and focus on their feature domain.

### Migration Patterns

**Native to Cross-Platform:** Do not attempt an incremental migration. Cross-platform frameworks have fundamentally different rendering models. Plan a parallel rewrite, feature by feature, with a feature flag to route users between old and new implementations. Strangler Fig pattern applied to mobile.

**Cross-Platform to Native:** More feasible incrementally. React Native's brownfield support allows replacing screens one at a time. Flutter's add-to-app enables embedding native screens. KMP is purpose-built for gradual adoption — start by sharing one module (networking), expand from there.

**Architecture Pattern Migration (MVC to MVVM/MVI):** Migrate screen by screen. Create the new architecture for new features. Migrate existing screens during planned refactoring, not as a dedicated "architecture migration" project that competes with feature work.

---

## Failure Modes

### Massive ViewModels / God BLoCs

**What happens:** All business logic for a screen accumulates in a single ViewModel or BLoC. A ViewModel with 500+ lines, 15 observable properties, and 20 methods is unreadable, untestable, and unmaintainable.

**Why it happens:** Developers treat the ViewModel as the dumping ground for "everything that is not UI." No use case layer exists to decompose operations. The repository returns raw data and the ViewModel does all transformation, validation, and orchestration.

**How to prevent:** Extract use cases (interactors) that encapsulate single operations. A ViewModel should orchestrate use cases, not implement business logic. Apply the single-responsibility principle: one BLoC per user-facing concern (not one per screen — a screen may have multiple BLoCs).

### Tight Platform Coupling

**What happens:** Cross-platform code is littered with `Platform.isIOS` / `Platform.isAndroid` conditionals. Platform-specific behavior is scattered throughout the codebase instead of isolated behind abstractions.

**Why it happens:** No platform abstraction layer. Developers solve platform differences ad hoc as they encounter them.

**How to prevent:** Create platform interface abstractions (the `expect`/`actual` pattern in KMP, platform channels in Flutter with a Dart-side interface, `NativeModules` in React Native behind a TypeScript interface). Platform-specific code lives in exactly one place per concern.

### Navigation Spaghetti

**What happens:** Screens navigate to other screens by direct reference. Deep links are broken or handled inconsistently. The back button behavior is unpredictable. Screen A knows about Screen B, which knows about Screen C, creating a tightly coupled navigation graph.

**Why it happens:** Navigation is treated as a UI concern instead of an architectural concern. No centralized navigation graph exists. Deep links are added as afterthoughts.

**How to prevent:** Use declarative navigation with a centralized route configuration. Implement the Coordinator pattern for complex flows. Define navigation contracts — a screen declares what navigation events it can emit, not what screen comes next. Test navigation independently from screen UI.

### State Management Chaos

**What happens:** Some screens use BLoC, others use Provider, others use setState. State is duplicated across multiple managers. The same data exists in three different state containers with no synchronization. Race conditions between competing state updates cause UI flickering.

**Why it happens:** No team-level decision on state management. Each developer uses what they know. No architecture documentation or enforcement.

**How to prevent:** Pick one primary state management approach and document it. Allow a secondary approach for simple cases (e.g., BLoC for features, Riverpod for app-level state). Create code review checklists that enforce the decision. Use a dependency injection container to make state dependencies explicit.

### Over-Engineering for Scale That Never Comes

**What happens:** A 5-screen app has a domain layer, a data layer, a presentation layer, use cases for every operation, repository interfaces with single implementations, and a full DI container. The architecture adds 3x the code for zero benefit at current scale.

**Why it happens:** Developers apply "clean architecture" patterns they read about without evaluating whether the complexity is justified. The app has no complex domain logic — it is a thin client over a REST API.

**How to prevent:** Match architecture complexity to app complexity. A CRUD app that fetches and displays data does not need use cases — the repository can serve the ViewModel directly. Add architectural layers when you feel pain from their absence, not preemptively. The repository pattern is almost always worth it (because data source switching is common in mobile). Use case objects are worth it when business logic is complex or shared across multiple ViewModels.

### Ignoring Platform Lifecycle

**What happens:** State is lost on rotation (Android), the app crashes when restored from background (iOS memory pressure), background tasks are killed by the OS, or the app enters an inconsistent state after process death.

**Why it happens:** Developers test exclusively in happy-path scenarios — foreground, connected, no interruptions. Platform lifecycle management is treated as an edge case.

**How to prevent:** Test with "Don't Keep Activities" enabled on Android. Test background restoration on iOS. Use `SavedStateHandle` (Android) or state restoration APIs. Design state management to survive process death. Use platform-aware background task APIs (WorkManager, BGTaskScheduler) instead of raw threads.

---

## Technology Landscape (2025)

### Cross-Platform Frameworks

| Framework | Language | Rendering | Market Share | Backed By | Maturity |
|---|---|---|---|---|---|
| **Flutter** | Dart | Own engine (Skia/Impeller) | 42% | Stable, 6 years in production |
| **React Native** | JavaScript/TypeScript | Native platform views via JSI | 38% | Meta | Stable, New Architecture default |
| **Kotlin Multiplatform** | Kotlin | Native (shared logic only) | Growing | Google + JetBrains | Stable for logic, Compose Multiplatform maturing |
| **.NET MAUI** | C# | Platform views via handlers | ~5% | Microsoft | Stable but limited adoption |
| **Capacitor/Ionic** | HTML/CSS/JS | WebView | Declining | Ionic | Stable but hybrid model shows its age |

### Native Frameworks

| Framework | Platform | UI Paradigm | Status |
|---|---|---|---|
| **SwiftUI** | iOS/macOS/watchOS/tvOS | Declarative, state-driven | Primary for new iOS development (2025) |
| **UIKit** | iOS | Imperative, delegate-based | Maintenance mode, vast existing codebase |
| **Jetpack Compose** | Android | Declarative, state-driven | Primary for new Android development |
| **Android Views (XML)** | Android | Imperative, XML layouts | Legacy, new projects use Compose |

### State Management Libraries

| Library | Framework | Pattern | When to Use |
|---|---|---|---|
| **flutter_bloc** | Flutter | BLoC/Cubit | Complex state, strict separation, large teams |
| **Riverpod** | Flutter | Provider-based, compile-safe | Medium complexity, type-safe DI, flexible |
| **Provider** | Flutter | InheritedWidget wrapper | Simple apps, Flutter team's recommendation for beginners |
| **GetX** | Flutter | Reactive controller | Rapid prototyping (controversial — encourages anti-patterns) |
| **Redux/Zustand** | React Native | Flux/store-based | Complex global state (Redux), simple global state (Zustand) |
| **MobX** | React Native | Observable/reactive | Teams preferring reactive programming |
| **TCA** | SwiftUI | Reducer/Store | Large apps needing composable features, heavy testing |
| **@Observable** | SwiftUI | MVVM (native) | Default for new SwiftUI apps |
| **StateFlow + MVI** | Compose | Unidirectional flow | Default for new Compose apps with complex state |

---

## Decision Tree

```
Need mobile app?
├── Single platform only?
│   ├── iOS only → SwiftUI + MVVM (@Observable)
│   └── Android only → Jetpack Compose + MVI (StateFlow)
│
├── Both platforms needed
│   ├── Team size < 8 engineers?
│   │   ├── Team knows React/JavaScript well?
│   │   │   └── → React Native + Zustand/Redux
│   │   ├── Team knows Dart or is language-agnostic?
│   │   │   └── → Flutter + BLoC or Riverpod
│   │   └── Team knows Kotlin well?
│   │       └── → KMP (shared logic) + SwiftUI/Compose (UI)
│   │
│   ├── Team size 8-20 engineers?
│   │   ├── Need pixel-perfect custom UI across platforms?
│   │   │   └── → Flutter + Clean Architecture + BLoC
│   │   ├── Need platform-native look and feel?
│   │   │   └── → KMP (shared logic) + native UI per platform
│   │   └── Heavy platform integration (AR, HealthKit, etc.)?
│   │       └── → Native (separate codebases)
│   │
│   └── Team size > 20 engineers?
│       ├── Mostly CRUD / content app?
│       │   └── → Flutter or KMP with platform team + feature teams
│       └── Deep platform features per platform?
│           └── → Native with shared backend-for-frontend
│
├── Performance-critical (games, AR, video)?
│   └── → Native or specialized engine (Unity, Unreal)
│
└── Internal enterprise tool?
    ├── Web skills only? → Capacitor/Ionic (hybrid)
    └── Mobile skills available? → Flutter (fastest cross-platform delivery)
```

---

## Implementation Sketch: Flutter Clean Architecture with BLoC

### Project Setup

```yaml
# pubspec.yaml — key dependencies
dependencies:
  flutter_bloc: ^8.1.0
  get_it: ^7.6.0        # Service locator for DI
  injectable: ^2.3.0     # Code-gen DI
  dartz: ^0.10.1         # Functional programming (Either type)
  dio: ^5.4.0            # HTTP client
  floor: ^1.4.0          # SQLite abstraction (or drift/sqflite)
  connectivity_plus: ^5.0.0
  equatable: ^2.0.0      # Value equality for states

dev_dependencies:
  bloc_test: ^9.1.0
  mockito: ^5.4.0
  build_runner: ^2.4.0
  injectable_generator: ^2.4.0
```

### Dependency Injection

```dart
// injection_container.dart
final sl = GetIt.instance;

Future<void> initDependencies() async {
  // BLoCs
  sl.registerFactory(() => TransactionBloc(
    getRecentTransactions: sl(),
    createTransaction: sl(),
  ));

  // Use Cases
  sl.registerLazySingleton(() => GetRecentTransactions(sl()));
  sl.registerLazySingleton(() => CreateTransaction(sl()));

  // Repositories
  sl.registerLazySingleton<TransactionRepository>(
    () => TransactionRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
      networkInfo: sl(),
    ),
  );

  // Data Sources
  sl.registerLazySingleton<TransactionRemoteDataSource>(
    () => TransactionRemoteDataSourceImpl(client: sl()),
  );
  sl.registerLazySingleton<TransactionLocalDataSource>(
    () => TransactionLocalDataSourceImpl(database: sl()),
  );

  // Core
  sl.registerLazySingleton<NetworkInfo>(
    () => NetworkInfoImpl(sl()),
  );
  sl.registerLazySingleton(() => Dio());
}
```

### Repository with Offline Support

```dart
class TransactionRepositoryImpl implements TransactionRepository {
  final TransactionRemoteDataSource remoteDataSource;
  final TransactionLocalDataSource localDataSource;
  final NetworkInfo networkInfo;

  TransactionRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<Transaction>>> getRecentTransactions({
    required int limit,
  }) async {
    if (await networkInfo.isConnected) {
      try {
        final remoteTransactions = await remoteDataSource.getRecent(limit);
        await localDataSource.cacheTransactions(remoteTransactions);
        return Right(remoteTransactions.map((m) => m.toEntity()).toList());
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message));
      }
    } else {
      try {
        final localTransactions = await localDataSource.getCachedTransactions();
        return Right(localTransactions.map((m) => m.toEntity()).toList());
      } on CacheException {
        return Left(CacheFailure('No cached data available'));
      }
    }
  }

  @override
  Future<Either<Failure, Transaction>> createTransaction(
    TransactionParams params,
  ) async {
    // Offline-first: save locally, sync later
    final model = TransactionModel.fromParams(params);
    await localDataSource.saveTransaction(model, pendingSync: true);

    if (await networkInfo.isConnected) {
      try {
        final remote = await remoteDataSource.create(model);
        await localDataSource.markSynced(remote.id);
        return Right(remote.toEntity());
      } on ServerException {
        // Saved locally, will sync later
        return Right(model.toEntity());
      }
    }
    return Right(model.toEntity());
  }
}
```

### Testing the BLoC

```dart
void main() {
  late TransactionBloc bloc;
  late MockGetRecentTransactions mockGetRecentTransactions;

  setUp(() {
    mockGetRecentTransactions = MockGetRecentTransactions();
    bloc = TransactionBloc(
      getRecentTransactions: mockGetRecentTransactions,
    );
  });

  tearDown(() => bloc.close());

  blocTest<TransactionBloc, TransactionState>(
    'emits [Loading, Loaded] when LoadTransactions succeeds',
    build: () {
      when(mockGetRecentTransactions(any))
          .thenAnswer((_) async => Right(testTransactions));
      return bloc;
    },
    act: (bloc) => bloc.add(LoadTransactions()),
    expect: () => [
      TransactionLoading(),
      TransactionLoaded(testTransactions),
    ],
  );

  blocTest<TransactionBloc, TransactionState>(
    'emits [Loading, Error] when LoadTransactions fails',
    build: () {
      when(mockGetRecentTransactions(any))
          .thenAnswer((_) async => Left(ServerFailure('Network error')));
      return bloc;
    },
    act: (bloc) => bloc.add(LoadTransactions()),
    expect: () => [
      TransactionLoading(),
      TransactionError('Network error'),
    ],
  );
}
```

---

## Cross-References

- **[Offline-First Architecture](../../patterns/offline-first.md)** — Deep dive into local-first data synchronization patterns, conflict resolution strategies, and the outbox pattern for mobile apps.
- **[Backend-for-Frontend (BFF)](../../patterns/backend-for-frontend.md)** — API gateway pattern that aggregates and transforms backend services for mobile consumption, reducing round trips and tailoring payloads to mobile screen needs.
- **[Hexagonal / Clean Architecture](../patterns/hexagonal-clean-architecture.md)** — The foundational pattern that underpins mobile clean architecture. Mobile implementations adapt the port/adapter concept with repositories as driven adapters and UI frameworks as driving adapters.
- **[Push and Sync](../../patterns/push-and-sync.md)** — Real-time data synchronization between server and mobile clients using WebSockets, Server-Sent Events, or push notifications combined with background sync.

---

## Sources

- [Comprehensive Guide to Mobile App Architecture 2025](https://www.einfochips.com/blog/mobile-app-architecture-a-comprehensive-guide-for-2025/)
- [9 Essential Mobile App Architecture Best Practices for 2025](https://nextnative.dev/blog/mobile-app-architecture-best-practices)
- [Modern Flutter Architecture Patterns](https://medium.com/@sharmapraveen91/modern-flutter-architecture-patterns-ed6882a11b7c)
- [Flutter 3.38 Clean Architecture: Modern Project Structure for 2025](https://medium.com/@flutter-app/flutter-3-38-clean-architecture-project-structure-for-2025-f6155ac40d87)
- [Building a Scalable Folder Structure in Flutter Using Clean Architecture + BLoC/Cubit](https://dev.to/alaminkarno/building-a-scalable-folder-structure-in-flutter-using-clean-architecture-bloccubit-530c)
- [React Native Architecture in 2025: What's New and What Matters](https://globaldev.tech/blog/react-native-architecture)
- [React Native's New Architecture in 2025: Fabric, TurboModules & JSI Explained](https://medium.com/react-native-journal/react-natives-new-architecture-in-2025-fabric-turbomodules-jsi-explained-bf84c446e5cd)
- [About the New Architecture — React Native](https://reactnative.dev/architecture/landing-page)
- [Native vs Cross-Platform Mobile Development in 2024](https://addjam.com/blog/2024-08-14/native-vs-cross-platform-mobile-development-2024/)
- [Native vs Cross-Platform Mobile Apps in 2025: CTO Guide](https://mobisoftinfotech.com/resources/blog/mobile/native-vs-cross-platform-apps-2025-ctos-guide)
- [Android Architecture Patterns: Comparing MVC, MVP, MVVM, and MVI](https://medium.com/@YodgorbekKomilo/android-architecture-patterns-comparing-mvc-mvp-mvvm-and-mvi-b282712cfb46)
- [Architecture Patterns in Mobile Development (2026): MVVM, MVI, and Clean Architecture](https://medium.com/@jyc.dev/architecture-patterns-in-mobile-development-2026-mvvm-mvi-and-clean-architecture-f26583f53522)
- [MVVM and MVI Explained: Key Differences for Android Developers](https://medium.com/@cabanas.ignacio/mvvm-and-mvi-explained-key-differences-for-android-developers-6ca09df77b21)
- [Composable Architecture in 2025: Building Scalable SwiftUI Apps the Right Way](https://commitstudiogs.medium.com/composable-architecture-in-2025-building-scalable-swiftui-apps-the-right-way-134199aff811)
- [GitHub — pointfreeco/swift-composable-architecture](https://github.com/pointfreeco/swift-composable-architecture)
- [Is Kotlin Multiplatform Ready for Production 2025?](https://guarana-technologies.com/blog/kotlin-multiplatform-production)
- [Top Apps Built with Kotlin Multiplatform (2025 Update)](https://www.netguru.com/blog/top-apps-built-with-kotlin-multiplatform)
- [Offline-First Support — Flutter](https://docs.flutter.dev/app-architecture/design-patterns/offline-first)
- [The Complete Guide to Offline-First Architecture in Android](https://androidengineers.substack.com/p/the-complete-guide-to-offline-first)
- [Build an Offline-First App — Android Developers](https://developer.android.com/topic/architecture/data-layer/offline-first)
- [Modern Android App Architecture in 2025: MVVM, MVI, and Clean Architecture with Jetpack Compose](https://medium.com/@androidlab/modern-android-app-architecture-in-2025-mvvm-mvi-and-clean-architecture-with-jetpack-compose-c0df3c727334)
- [Guide to App Architecture — Android Developers](https://developer.android.com/topic/architecture)
