# Native iOS — Expertise Module

> A Native iOS specialist designs, builds, and ships applications for Apple's iOS platform using Swift and Apple frameworks (SwiftUI, UIKit). The role spans UI implementation, data management, platform API integration, performance tuning, accessibility, and App Store delivery. Scope includes iPhone, iPad, Apple Watch, and platform extensions (widgets, intents, share extensions).

---

## Core Patterns & Conventions

### Project Structure

Modern iOS projects (2025-2026) use modular architecture with SPM local packages, optionally managed by Tuist (v4+) or XcodeGen for `.xcodeproj` generation.

```
MyApp/
  App/                      # App target (@main entry point)
  Packages/
    Core/                   # Shared utilities, extensions, logging
    Networking/             # API client, DTOs, endpoint definitions
    DesignSystem/           # Reusable UI components, tokens, colors
    FeatureHome/            # Feature module (one per feature)
    FeatureSettings/
  Tests/                    # Mirror of Packages/ with test targets
  UITests/
```

- Each feature module is a local SPM package with its own `Package.swift`.
- Feature modules depend on `Core` and `DesignSystem` but never on each other.
- Tuist/XcodeGen generates `.xcodeproj` from declarative manifests, eliminating merge conflicts.
- Minimum deployment: iOS 17 for new projects (unlocks SwiftData, `@Observable`). iOS 16 if broad coverage required.

### Naming Conventions (Swift API Design Guidelines)

- **Types**: `UpperCamelCase` -- `UserProfileView`, `NetworkClient`.
- **Functions/properties**: `lowerCamelCase` -- `fetchUserProfile()`, `isAuthenticated`.
- **Protocols**: capabilities use `-able`/`-ible` (`Sendable`); descriptions use nouns (`DataStore`).
- **Booleans**: read as assertions -- `isEmpty`, `hasUnsavedChanges`.
- **Factory methods**: prefix with `make` -- `makeURLRequest()`.
- **File naming**: one primary type per file, filename matches type.

### Architecture Patterns

**MVVM (Recommended Default)** -- aligns naturally with SwiftUI's declarative model. View observes ViewModel via `@Observable`; ViewModel mediates between View and Service layers.

**TCA (The Composable Architecture)** -- unidirectional data flow (State -> Action -> Reducer -> Effect -> State). Best for complex state-heavy apps. Built-in DI via `@Dependency`, exhaustive testability via `TestStore`. Steep learning curve; use when >20 screens with complex state interactions.

**VIPER** -- legacy enterprise pattern. High ceremony. Largely superseded by MVVM+Coordinator or TCA for SwiftUI projects. Consider only for existing UIKit codebases.

### SwiftUI Patterns

- Break views into small subviews (each `body` < 50 lines) -- smaller invalidation scope.
- Use `ViewModifier` for cross-cutting styling; `View` extensions for convenience wrappers.
- `@Observable` (iOS 17+): SwiftUI tracks property access per-view -- only read properties trigger re-renders (unlike `ObservableObject` which fires on any `@Published` change).
- Use `@Entry` on `EnvironmentValues` for custom environment keys.

### State Management

| Scope | Tool | When to Use |
|-------|------|-------------|
| View-local | `@State` | Toggle, text field, sheet presentation |
| Shared reference | `@Observable` class | ViewModel, shared state across views |
| Global / app-wide | `@Observable` + `.environment()` | Auth state, theme, feature flags |
| Complex / deterministic | TCA `Store` | Exhaustive testing, time-travel debugging |
| Legacy | `ObservableObject` + `@Published` | Pre-iOS 17 codebases only |

### Navigation (NavigationStack + NavigationPath, iOS 16+)

- Use `@Observable` Router class holding a `NavigationPath`.
- Define destinations as `Hashable` enums; use `.navigationDestination(for:)` for type-safe routing.
- Each `TabView` tab gets its own `NavigationStack` and `Router`.
- Never mutate path during a view update -- trigger changes from actions, `onAppear`, or `.task`.
- Deep links: append destinations to path in `onOpenURL`.

### Data Flow & Concurrency (Swift 6 / 6.2)

- Prefer `async/await` over Combine for new async work; use `TaskGroup` for parallel work.
- Mark all UI-bound `@Observable` classes with `@MainActor`.
- Swift 6 enforces `Sendable` at compile time -- value types and actors are inherently `Sendable`.
- Swift 6.2 (WWDC 2025): `@concurrent` attribute for explicit concurrent execution opt-in.
- **Combine** remains valid for reactive streams (`NotificationCenter`, KVO bridging). Avoid mixing Combine and async/await in the same pipeline.

### Error Handling (Typed Throws, Swift 6)

```swift
enum NetworkError: Error, LocalizedError {
    case unauthorized, notFound
    case serverError(statusCode: Int)
    case decodingFailed(underlying: Error)
}

func fetchUser(id: String) async throws(NetworkError) -> User { ... }
// Callers know exactly which errors to handle
```

### Logging (os.Logger)

```swift
extension Logger {
    static let networking = Logger(subsystem: Bundle.main.bundleIdentifier!, category: "Networking")
}
Logger.networking.info("Fetching user \(userId, privacy: .private)")
```

Use `.private` for PII (redacted in production). Prefer `Logger` over `print()` -- zero cost when not collected.

---

## Anti-Patterns & Pitfalls

**1. Force unwrapping everywhere** -- `!` crashes on nil. Use `guard let`, `if let`, `??`. Reserve `!` for IBOutlets and compile-time-guaranteed literals.

**2. Massive View / Massive ViewModel** -- a 500-line `body` re-evaluates entirely on any state change. Break into subviews for localized invalidation.

**3. Using @State for shared state** -- `@State` is view-local. Sharing via bindings creates fragile coupling. Use `@Observable` classes with `.environment()`.

**4. Using ObservableObject when @Observable is available** -- `ObservableObject`+`@Published` fires updates for any property change. `@Observable` tracks per-property access, rendering only what changed.

**5. Blocking main thread** -- work >16ms causes dropped frames. Network, parsing, image processing must use async/await or background queues.

**6. Retain cycles in closures** -- closures capture `self` strongly by default. Use `[weak self]` in escaping closures. Async/await's structured concurrency eliminates most closure-based cycles.

**7. Ignoring Sendable/actor isolation (Swift 6)** -- disabling strict concurrency masks data races. Fix by making types `Sendable`, using actors, or restructuring data flow.

**8. Eager stacks for large lists** -- `VStack`/`HStack` instantiate all children. Use `LazyVStack`/`LazyHStack`/`List` for >20 items.

**9. Secrets in UserDefaults** -- UserDefaults is an unencrypted plist. Tokens, passwords, API keys belong in Keychain.

**10. Ignoring memory leaks** -- leaked VCs and VMs accumulate until OS kills the app. Use Instruments Leaks + Xcode Memory Graph Debugger during development.

**11. `DispatchQueue.main.async` in SwiftUI** -- causes double renders. Use `@MainActor` on ViewModels instead.

**12. Overusing singletons** -- hidden global state, untestable. Use dependency injection (initializer or `@Environment`).

**13. Unstable ForEach identifiers** -- index or `\.self` on non-unique values causes animation glitches and state corruption. Conform models to `Identifiable` with stable IDs.

**14. Disabling ATS globally** -- `NSAllowsArbitraryLoads = true` exposes all traffic. Add per-domain exceptions only.

**15. Skipping accessibility** -- ~15-20% of users rely on VoiceOver. Add `.accessibilityLabel()`, `.accessibilityHint()`. Apple rejects apps with major a11y issues.

---

## Testing Strategy

### Unit Testing (Swift Testing Framework, Xcode 16+)

```swift
import Testing

@Suite("UserProfileViewModel Tests")
struct UserProfileViewModelTests {
    @Test("loads user successfully")
    func loadUser() async throws {
        let vm = UserProfileViewModel(userService: MockUserService(result: .success(.stub)))
        await vm.loadUser(id: "123")
        #expect(vm.user?.name == "Jane Doe")
        #expect(vm.errorMessage == nil)
    }

    @Test("throws on server error", arguments: [500, 502, 503])
    func serverError(statusCode: Int) async { ... }
}
```

XCTest remains valid for existing suites and UI tests. Both coexist in the same target.

### UI Testing (XCUITest)

- Use `.accessibilityIdentifier("loginButton")` as stable anchors (not text).
- Focus on critical flows (login, purchase, onboarding) -- UI tests are slow.
- Page Object pattern encapsulates screen interactions for reuse.

### Snapshot Testing (swift-snapshot-testing by Point-Free)

- `assertSnapshot(of: view, as: .image(layout: .device(config: .iPhone13)))`.
- Pin to a single simulator to avoid pixel differences. Store reference images in repo.

### Mock Patterns

Protocol-based mocking preferred. Define protocol (`UserServiceProtocol`), create lightweight `MockUserService` conforming to it. For DI frameworks: `swift-dependencies` (`@Dependency`) or Factory (`@Injected`).

### Test Plans

Separate plans for Unit, Integration, UI. CI runs unit on every PR; UI on merge to main. Target: ~70% unit, ~20% integration, ~10% UI/E2E.

---

## Performance Considerations

### SwiftUI Performance

- **Lazy stacks**: `LazyVStack`/`LazyHStack` for scrollable content >20 items.
- **Small views**: each subview = own invalidation scope. Extract components.
- **Stable IDs**: `Identifiable` with persistent IDs in `ForEach`.
- **Equatable views**: conform to `Equatable` + `.equatable()` modifier to skip unnecessary body evaluations.
- **Instruments 26**: new SwiftUI instrument traces body evaluations and slow state updates.

### App Launch Optimization

- Minimize work in `@main` App `init()`. Defer analytics/remote config to `.task {}`.
- Consolidate SPM packages to reduce dynamic library loads. Measure with `DYLD_PRINT_STATISTICS=1`.

### Memory Management (ARC)

- **Strong** (default): keeps object alive. **Weak** (`weak var`): nils on dealloc. **Unowned**: crashes on access after dealloc.
- Common cycle: `self` captured in closure stored on `self`. Fix: `[weak self]`.
- Tools: Xcode Memory Graph Debugger, Instruments Leaks/Allocations.

### Instruments Profiling

| Instrument | Finds |
|------------|-------|
| Time Profiler | Main-thread hangs, slow functions |
| Allocations | Memory growth, abandoned memory |
| Leaks | Retain cycles |
| Network | Redundant/slow API calls |
| Core Animation | Off-screen rendering, blending |
| SwiftUI (Instruments 26) | Excessive body evaluations |

### SwiftData / Core Data Performance

- Use `@Query` with `#Predicate` and `fetchLimit`. Batch inserts, single `save()`.
- For Core Data: `NSFetchedResultsController` for incremental UI updates.
- Core Data outperforms SwiftData for >10,000 rows (as of 2025).

---

## Security Considerations

### Keychain Services

Use `SecItemAdd`/`SecItemCopyMatching` with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`. Never store secrets in UserDefaults. Use a wrapper (KeychainAccess) for ergonomic API.

### App Transport Security (ATS)

ATS enforces HTTPS by default. Do not disable globally. Per-domain exceptions only. Use certificate pinning for banking/healthcare apps.

### Biometric Authentication (Face ID / Touch ID)

Use `LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)`. Add `NSFaceIDUsageDescription` to Info.plist. Always provide fallback (passcode/password). Combine with Keychain access controls (`.biometryCurrentSet`).

### Code Signing & Entitlements

Automatic signing for dev; Fastlane Match or Xcode Cloud for CI. Never commit `.p12` or profiles to source control. Entitlements define capabilities (push, Keychain sharing, App Groups).

### Data Protection Classes

| Class | Accessible | Use Case |
|-------|-----------|----------|
| `completeProtection` | Only when unlocked | Most sensitive data |
| `completeUnlessOpen` | Until first lock | Background downloads |
| `afterFirstUnlock` | After first unlock | Background fetch |
| `none` | Always | Non-sensitive cache |

---

## Integration Patterns

### Networking

Prefer `URLSession` with async/await over Alamofire for new projects. Define `Endpoint` structs for URL/method/headers/body. Implement retry with exponential backoff. Use `URLCache` for HTTP caching.

```swift
protocol APIClient: Sendable {
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T
}
```

### Persistence

| Solution | Best For | Min iOS |
|----------|----------|---------|
| **SwiftData** | New SwiftUI apps, simple-moderate models | iOS 17 |
| **Core Data** | Complex queries, large datasets, migrations | iOS 13 |
| **Realm** | Cross-platform, real-time sync | iOS 13 |
| **UserDefaults** | Small preferences, feature flags | Any |
| **Keychain** | Secrets, tokens, passwords | Any |

### Dependency Injection

- **Initializer injection** (default): pass dependencies through `init()`.
- **Factory** (container-based): compile-time safe, `@Injected(\.userService)` property wrapper.
- **swift-dependencies** (TCA): `@Dependency(\.userService)`, test/preview/live values.

### Push Notifications (APNs)

Use token-based auth (`.p8` key, no expiry) over certificates. Handle in `UNUserNotificationCenterDelegate`. Use `apns-priority: 5` for non-urgent. Live Activities: `liveactivity` push type with `ActivityKit`.

### WidgetKit & App Intents

Widgets use `TimelineProvider`. Share data via App Groups. App Intents (iOS 16+) for Siri, Shortcuts, interactive widget buttons. Widget refresh budgets are limited -- use push-based updates for real-time data.

---

## DevOps & Deployment

### CI/CD Options

| Tool | Pros | Cons |
|------|------|------|
| **Xcode Cloud** | Zero-config signing, Apple-native, free tier | Limited customization |
| **GitHub Actions + Fastlane** | Flexible, community plugins | macOS runners expensive |
| **Bitrise / Codemagic** | iOS-first, managed VMs | Cost scales with team |

### Code Signing Automation

- **Fastlane Match**: certs/profiles in private Git repo, shared across CI and devs.
- **Xcode Cloud**: automatic signing, no manual cert management.
- Never commit `.p12` or provisioning profiles to main repo.

### TestFlight Distribution

Upload via Fastlane `upload_to_testflight` or `xcrun altool`. Segment testers into groups. External testing requires App Store Review (~24h). Include `What to Test` notes.

### Crash Reporting

- **Crashlytics**: free, real-time, breadcrumbs. **Sentry**: richer context, paid tiers.
- **Xcode Organizer**: free App Store crash logs (24-48h delay).
- Upload dSYM files on every release for symbolicated stack traces.

---

## Decision Trees

### SwiftUI vs UIKit?

```
New project targeting iOS 16+?
  Yes --> SwiftUI primary + UIKit via UIViewRepresentable where needed
  No  --> UIKit primary + SwiftUI for new screens via UIHostingController

Existing UIKit app?
  --> Keep UIKit for existing screens, add new features in SwiftUI, migrate incrementally

UIKit still required for:
  - Custom compositional layouts, complex TextKit 2, AVFoundation camera UI
```

### Which Architecture?

```
Solo/small team, simple-medium app --> MVVM with @Observable
Medium team, complex state, high test coverage --> TCA (Composable Architecture)
Large enterprise, UIKit-heavy, strict boundaries --> VIPER or Clean Architecture
Middle ground --> MVVM + Coordinator (centralized navigation, MVVM simplicity)
```

### Which Persistence?

```
New app, iOS 17+, simple-moderate model --> SwiftData
New app, complex migrations/large datasets --> Core Data
Cross-platform (iOS + Android) --> Realm or SQLite (GRDB.swift)
Existing Core Data app --> Keep Core Data; evaluate SwiftData when raising min to iOS 17
Performance-critical (>50k records) --> Core Data or Realm (SwiftData still maturing)
```

---

## Code Examples

### 1. Async Data Loading with State Enum

```swift
@Observable @MainActor
final class BookListViewModel {
    private(set) var books: [Book] = []
    private(set) var state: ViewState = .idle
    enum ViewState: Equatable { case idle, loading, loaded, error(String) }
    private let api: APIClient
    init(api: APIClient) { self.api = api }

    func loadBooks() async {
        state = .loading
        do { books = try await api.request(.books); state = .loaded }
        catch { state = .error(error.localizedDescription) }
    }
}

struct BookListView: View {
    @State private var viewModel: BookListViewModel
    init(api: APIClient) { _viewModel = State(initialValue: BookListViewModel(api: api)) }

    var body: some View {
        Group {
            switch viewModel.state {
            case .idle, .loading: ProgressView()
            case .loaded: List(viewModel.books) { BookRow(book: $0) }
            case .error(let msg): ContentUnavailableView("Failed", systemImage: "exclamationmark.triangle", description: Text(msg))
            }
        }
        .task { await viewModel.loadBooks() }
        .refreshable { await viewModel.loadBooks() }
    }
}
```

### 2. NavigationStack Router

```swift
@Observable
final class Router {
    var path = NavigationPath()
    func navigate(to dest: AppDestination) { path.append(dest) }
    func popToRoot() { path = NavigationPath() }
}

enum AppDestination: Hashable {
    case userProfile(userId: String), settings, orderDetail(orderId: String)
}

struct RootView: View {
    @State private var router = Router()
    var body: some View {
        NavigationStack(path: $router.path) {
            HomeView()
                .navigationDestination(for: AppDestination.self) { dest in
                    switch dest {
                    case .userProfile(let id): UserProfileView(userId: id)
                    case .settings: SettingsView()
                    case .orderDetail(let id): OrderDetailView(orderId: id)
                    }
                }
        }
        .environment(router)
    }
}
```

### 3. Parallel Fetching with async let

```swift
func loadDashboard() async throws -> Dashboard {
    async let profile = api.request(.userProfile) as UserProfile
    async let orders = api.request(.recentOrders) as [Order]
    async let notifs = api.request(.notifications) as [AppNotification]
    return try await Dashboard(profile: profile, orders: orders, notifications: notifs)
}
```

### 4. SwiftData Model with Relationships

```swift
import SwiftData

@Model final class Recipe {
    var title: String
    var prepTimeMinutes: Int
    @Relationship(deleteRule: .cascade) var ingredients: [Ingredient]
    init(title: String, prepTimeMinutes: Int) {
        self.title = title; self.prepTimeMinutes = prepTimeMinutes; self.ingredients = []
    }
}

struct RecipeListView: View {
    @Query(sort: \Recipe.createdAt, order: .reverse) private var recipes: [Recipe]
    var body: some View {
        List(recipes) { recipe in
            Text(recipe.title)
        }
    }
}
```

### 5. Swift Testing with Parameterized Arguments

```swift
import Testing
@testable import MyApp

@Suite("NetworkClient")
struct NetworkClientTests {
    @Test("decodes valid response")
    func decode() async throws {
        let client = LiveAPIClient(session: MockURLSession(data: validJSON, statusCode: 200))
        let user: User = try await client.request(.userProfile(id: "1"))
        #expect(user.name == "Test User")
    }

    @Test("throws on server error", arguments: [500, 502, 503])
    func serverError(code: Int) async {
        let client = LiveAPIClient(session: MockURLSession(data: Data(), statusCode: code))
        await #expect(throws: NetworkError.self) {
            let _: User = try await client.request(.userProfile(id: "1"))
        }
    }
}
```

---

*Researched: 2026-03-07 | Sources: [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/), [Apple SwiftUI Performance Docs](https://developer.apple.com/documentation/Xcode/understanding-and-improving-swiftui-performance), [MVVM vs VIPER vs TCA](https://medium.com/@rashadsh/mvvm-vs-viper-vs-tca-best-architecture-for-your-next-app-159e11e333e9), [Modern iOS Architecture 2025](https://medium.com/@csmax/the-ultimate-guide-to-modern-ios-architecture-in-2025-9f0d5fdc892f), [SwiftData vs Core Data vs Realm](https://hackernoon.com/swift-data-vs-core-data-vs-realm-ios-data-persistence-overview-and-analysis), [swift-snapshot-testing](https://github.com/pointfreeco/swift-snapshot-testing), [Factory DI](https://github.com/hmlongco/Factory), [Fastlane Match](https://docs.fastlane.tools/actions/sync_code_signing/), [iOS Security Checklist 2025](https://mobisoftinfotech.com/resources/blog/app-security/ios-app-security-checklist-best-practices), [NavigationStack Patterns](https://buczel.com/blog/swift-navigation-stack-patterns/), [Swift 6.2 Concurrency](https://www.avanderlee.com/concurrency/approachable-concurrency-in-swift-6-2-a-clear-guide/), [Tuist for Xcode](https://www.runway.team/blog/getting-started-with-tuist-for-xcode-project-generation-and-modularization-on-ios), [Modern iOS Architecture 2026](https://7span.com/blog/mvvm-vs-clean-architecture-vs-tca), [DI Patterns in Swift](https://michalcichon.github.io/software-development/2025/11/25/dependency-injection-patterns-in-swift.html)*
