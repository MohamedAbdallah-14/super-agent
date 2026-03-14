# Native Android -- Expertise Module

> A Native Android specialist designs, builds, and maintains Android applications using Kotlin and Jetpack Compose,
> applying modern architecture patterns (MVVM/MVI + Clean Architecture), optimizing for performance across diverse
> device configurations, and shipping through the Google Play ecosystem with robust CI/CD and quality tooling.

---

## Core Patterns & Conventions

### Project Structure (Multi-Module with Convention Plugins)

Follow the modularization strategy from Google's Now in Android reference app. Organize by feature and layer, using a `build-logic` composite build for convention plugins.

```
project-root/
  build-logic/convention/             # Shared Gradle convention plugins
  gradle/libs.versions.toml           # Single version catalog
  app/                                # Application module (thin shell)
  core/
    common/ | data/ | database/ | datastore/ | domain/ | model/ | network/ | ui/ | testing/
  feature/
    home/ | settings/ | profile/      # Feature modules: UI + ViewModel
```

Convention plugins replace 43+ lines of module config with a 3-line plugin application. Always use `build-logic/` composite build (not `buildSrc`) for better build cache performance.

**Current versions (early 2026):** Kotlin 2.1.x, AGP 8.7+ (9.0 alpha), Compose BOM 2025.01+, Gradle 8.6+ Kotlin DSL, Target SDK 35 (required by Play Store since Aug 2025).

### Naming Conventions & Code Style

- Follow [Kotlin coding conventions](https://kotlinlang.org/docs/coding-conventions.html).
- Composable functions emitting UI: `PascalCase` (`UserProfile`). Returning a value: `camelCase` (`rememberScrollState`).
- State holders: `*UiState`. ViewModels: `*ViewModel`. Use cases: verb-noun (`GetUserProfileUseCase`).
- Repository interfaces in `domain/`, implementations in `data/` suffixed `Impl` or prefixed `Offline`/`Network`.
- Test classes mirror source: `HomeViewModelTest`, `UserRepositoryTest`.

### Architecture Patterns

**MVVM with UDF** (Google-recommended default): View (Compose) observes `UiState` via `StateFlow` from ViewModel, which delegates to Use Cases and exposes immutable state.

**MVI** for complex screens: single sealed `UiEvent` type flows into ViewModel; reducer produces new immutable state; side effects via `Channel`/`SharedFlow`.

**Clean Architecture layers:** Presentation (`:feature:*`) -> Domain (`:core:domain`, pure Kotlin) <- Data (`:core:data/network/database`). Dependencies point inward.

### Jetpack Compose UI Patterns

- **State hoisting:** Stateless composables receive state as params, emit events via lambdas. Hoist to lowest common ancestor. Never pass `ViewModel` or `MutableState` down.
- **Slots API:** Use `@Composable` content lambdas for flexible layouts. Components handle decoration/interaction, not content.
- **Previews:** Every UI composable needs `@Preview`. Use `@PreviewParameter` for variants.

### State Management

```kotlin
sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Success(val items: List<Item>) : HomeUiState
    data class Error(val message: String) : HomeUiState
}

class HomeViewModel(private val getItemsUseCase: GetItemsUseCase) : ViewModel() {
    val uiState: StateFlow<HomeUiState> = getItemsUseCase()
        .map<List<Item>, HomeUiState> { HomeUiState.Success(it) }
        .catch { emit(HomeUiState.Error(it.message ?: "Unknown error")) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState.Loading)
}
```

- `StateFlow` for UI state, `SharedFlow` for one-time events. Collect with `collectAsStateWithLifecycle()`.

### Navigation (Type-Safe Routes, Navigation 2.8+)

```kotlin
@Serializable data object Home
@Serializable data class Detail(val id: String)

NavHost(navController, startDestination = Home) {
    composable<Home> { HomeScreen(onItemClick = { navController.navigate(Detail(it.id)) }) }
    composable<Detail> { it.toRoute<Detail>().let { route -> DetailScreen(id = route.id) } }
}
```

Replace all string-based routes with `@Serializable` types for compile-time safety. Extract in ViewModels via `SavedStateHandle.toRoute<T>()`.

### Data Flow, Error Handling, Logging

- **Repository pattern:** Interface in domain, implementation combines network + local cache. Returns `Flow<T>` for observable, `suspend fun` for one-shot. Offline-first: emit cached, then refresh.
- **Use Cases:** Single `operator fun invoke()`. Compose repositories or apply business rules.
- **Errors:** `kotlin.Result` for simple cases; sealed classes (`DataError.Network`, `DataError.NoConnection`) for domain errors. Never catch `CancellationException`. Map exceptions at the repository boundary.
- **Logging:** Timber (auto-tags, no-op in release). `StrictMode` in debug. Crashlytics tree for production error forwarding.

---

## Anti-Patterns & Pitfalls

### 1. Catching CancellationException in Coroutines
Creates zombie coroutines that break structured concurrency. Use `ensureActive()` or re-throw explicitly.

### 2. Overloading the ViewModel
ViewModels handling API calls, validation, analytics, permissions, and navigation become untestable monoliths. Delegate to Use Cases and Repositories.

### 3. Performing Side Effects in Composition
Composables recompose unpredictably. Side effects in composition cause duplicate API calls and analytics events. Use `LaunchedEffect` / `SideEffect`.

### 4. Modeling One-Time Events as State
A snackbar stored in `UiState` re-fires on config changes. Use `Channel` or `SharedFlow` for events.

### 5. Skipping `remember` / `derivedStateOf`
Expensive computations re-run on every recomposition. Cache with `remember`; throttle with `derivedStateOf`.

### 6. Passing Mutable Types Down Compose Tree
`MutableState`, `MutableList`, or `ViewModel` in child composables breaks UDF, prevents reuse, kills previews. Pass immutable state down, lambdas up.

### 7. Using GlobalScope for Background Work
Leaks coroutines beyond lifecycle. Use `viewModelScope`, `lifecycleScope`, or lifecycle-bound custom scopes.

### 8. Ignoring Compose Stability
Unstable parameters (stdlib `List`, `var` fields) force recomposition. Use `@Immutable`/`@Stable` or enable strong skipping mode (default since Compose compiler 1.5.4+).

### 9. Blocking the Main Thread
Synchronous I/O causes ANRs. Use `withContext(Dispatchers.IO)` for all network, DB, and file operations.

### 10. Hardcoding Secrets in Source Code
API keys in source are extractable from APKs. Use `local.properties` (gitignored), CI-injected BuildConfig, or Keystore.

### 11. Not Handling Process Death
Android kills background apps. Use `SavedStateHandle`, `rememberSaveable`, and persistent storage (Room/DataStore).

### 12. Leaking Activity Context
Static/long-lived references to Activity prevent GC. Use `applicationContext` for singletons and long-lived operations.

### 13. Skipping R8 Configuration
Missing keep rules cause runtime crashes when reflection-based libraries are stripped. Test release builds early.

### 14. Testing Flows Without Turbine
Raw `collect` in tests is timing-dependent and flaky. Turbine provides deterministic `awaitItem()` and timeout control.

---

## Testing Strategy

### Unit Testing (JUnit 5 + MockK + Turbine)

```kotlin
@ExtendWith(MainDispatcherExtension::class)
class HomeViewModelTest {
    private val getItemsUseCase = mockk<GetItemsUseCase>()

    @Test
    fun `emits success state when items load`() = runTest {
        every { getItemsUseCase() } returns flowOf(listOf(testItem))
        val viewModel = HomeViewModel(getItemsUseCase)
        viewModel.uiState.test {
            assertIs<HomeUiState.Loading>(awaitItem())
            assertIs<HomeUiState.Success>(awaitItem())
        }
    }
}
```

- **JUnit 5** (`@ExtendWith`, `@Nested`, `@ParameterizedTest`), **MockK** (`mockk`, `coEvery`, `verify`), **Turbine** 1.1+ for Flow testing, **kotlinx-coroutines-test** (`runTest`, `StandardTestDispatcher`).

### UI Testing (Compose Testing)

- `createComposeRule()` for pure Compose tests. Add `testTag` to interactive elements.
- Prefer semantic matchers (`onNodeWithText`) over test tags. Use `performScrollToNode` for lazy layouts.

### Integration & Screenshot Testing

- **Hilt**: `@HiltAndroidTest` + `@TestInstallIn` for module replacement. **Room**: in-memory DB. **Network**: `MockWebServer`.
- **Paparazzi** (JVM-only, no emulator) or **Roborazzi** (Robolectric-based) for screenshot tests. Test light/dark, font scales, screen sizes. Run on every PR.

### Test Organization

- Test pyramid: many unit, fewer integration, fewest UI/E2E.
- Shared fixtures in `:core:testing`. `test/` for JVM tests, `androidTest/` for instrumented.
- CI: unit tests on every commit, screenshot tests on PR, instrumented tests nightly.

---

## Performance Considerations

### Compose Performance
- **Stability:** `@Immutable`/`@Stable` annotations. Strong skipping mode (default 1.5.4+). Provide stable `key` to lazy layout items; use `contentType` for heterogeneous lists.
- **Defer reads:** Pass lambda `() -> State` to defer to draw phase. Use `derivedStateOf` for rapidly changing state.
- **Avoid allocations in composition:** No object creation or list mapping in composable bodies. Use `remember`.

### App Startup
- **Baseline Profiles:** Ship with APK/AAB for AOT compilation. Meta reports up to 40% improvement. Generate via `benchmark-macro-junit4`.
- **App Startup library** (`androidx.startup`) for ordered initialization. Minimize `Application.onCreate()`. Defer non-critical init.

### Memory & Battery
- **LeakCanary** (debug): auto-detects leaks. Use `LeakAssertions.assertNoLeaks()` in UI tests.
- `collectAsStateWithLifecycle()` stops collection when UI not visible. Unregister callbacks in lifecycle methods.
- **WorkManager** for deferrable work (respects Doze). Batch network requests. **Coil/Glide** with caching.

### R8 Optimization
- `isMinifyEnabled = true` + `isShrinkResources = true` for release. Use `proguard-android-optimize.txt` (non-optimizing deprecated from AGP 9.0).
- `-repackageclasses` saves DEX space. R8 full mode for deep whole-program optimization. Test release builds early; use mapping files for deobfuscation.

---

## Security Considerations

### Keystore & Encrypted Storage
- **Android Keystore**: hardware-backed, keys non-extractable even on rooted devices. **EncryptedSharedPreferences** or DataStore with encryption for sensitive data. `MasterKey.Builder` with `AES256_GCM`.

### Network Security
- `network_security_config.xml`: disable cleartext (`cleartextTrafficPermitted="false"`), pin certificates with backup pins, debug-only CAs for proxy tools.
- OkHttp `CertificatePinner` for programmatic pinning. Enforce TLS 1.2+.

### Biometric Authentication
- **BiometricPrompt API** with `CryptoObject` for crypto-bound biometric auth (not just UI gating). Check `BiometricManager.canAuthenticate()`. Handle fallback to device credential.

### Obfuscation & Provider Security
- R8 obfuscation + `-allowaccessmodification`. Google Play Integrity API for tamper detection.
- `android:exported="false"` on ContentProviders. Sanitize all provider inputs (SQL injection). Prefer `FileProvider` for file sharing.

---

## Integration Patterns

### Networking: Retrofit + OkHttp (or Ktor for KMP)

```kotlin
interface UserApi {
    @GET("users/{id}") suspend fun getUser(@Path("id") id: String): UserDto
    @POST("users") suspend fun createUser(@Body user: CreateUserRequest): UserDto
}

val okHttpClient = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor(tokenProvider))
    .addInterceptor(HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) Level.BODY else Level.NONE
    }).build()
```

Use **kotlinx.serialization** over Gson/Moshi (no reflection). **Ktor Client** for KMP projects.

### Dependency Injection: Hilt (or Koin)

```kotlin
@Module @InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun provideUserApi(client: OkHttpClient): UserApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL).client(client)
        .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
        .build().create()
}
```

Hilt for production apps (compile-time, scoped, testable). Koin for small projects or KMP.

### Room, WorkManager, Firebase

- **Room** with KSP (not KAPT). Return `Flow<T>` from DAOs. Encapsulate in `:core:database`. Migration tests with `MigrationTestHelper`.
- **WorkManager** for deferrable guaranteed work. `CoroutineWorker` + `@HiltWorker`. Constraints (network, battery). Not for immediate tasks.
- **Firebase:** Crashlytics (upload mapping files), Analytics, Remote Config, App Distribution, FCM. Use Firebase BOM.

---

## DevOps & Deployment

### Build System

```toml
# gradle/libs.versions.toml
[versions]
kotlin = "2.1.21"
agp = "8.7.3"
compose-bom = "2025.01.01"
[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
```

Gradle Kotlin DSL exclusively. Version catalogs + convention plugins in `build-logic/`. Enable Gradle configuration cache and build cache.

### CI/CD & Deployment

- **GitHub Actions**: cache Gradle, run `./gradlew check`, assemble, deploy to Firebase App Distribution (service account credentials; token auth deprecated).
- **Build variants**: `debug` (`.debug` suffix), `release` (minified), `benchmark` (baseline profiles). Product flavors for environment (dev/staging/prod).
- **Play Store**: publish AAB (not APK). Use Play-managed signing. Staged rollouts: 1% -> 5% -> 20% -> 100%.
- **Monitoring**: Crashlytics + mapping files, Firebase Performance, Android Vitals. Target 99.5%+ crash-free rate.

---

## Decision Trees

### Compose vs XML Views

```
New project or feature?
  YES -> Jetpack Compose (XML is in maintenance mode; Compose is Google's recommended toolkit)
  NO (brownfield with XML) -> Adopt incrementally via ComposeView; migrate screen by screen
Key: Compose reduces boilerplate ~50%. Team skill is the main blocker, not technical merit.
```

### Hilt vs Koin

```
Large / enterprise (50+ modules, multiple teams)?
  -> Hilt (compile-time validation, 15-20% faster startup, official testing APIs)
KMP requirement?
  -> Koin (KMP-compatible, no Android-specific codegen)
Small project / prototype?
  -> Koin (5-min setup) or either
Key: Hilt catches errors at compile time; Koin crashes at runtime.
```

### Which Architecture Pattern?

```
Simple CRUD?        -> MVVM + UDF (Google default, StateFlow + sealed UiState)
Complex interactions? -> MVI (single Intent type, Reducer, predictable state transitions)
Cross-platform logic? -> Clean Architecture + MVVM/MVI (pure Kotlin domain layer)
Key: Start simple. Add domain layer or MVI when complexity warrants it.
```

---

## Code Examples

### Example 1: Complete Screen (ViewModel + Compose)

```kotlin
@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val getUserUseCase: GetUserUseCase, savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val userId: String = savedStateHandle.toRoute<ProfileRoute>().userId
    val uiState: StateFlow<ProfileUiState> = getUserUseCase(userId)
        .map<User, ProfileUiState> { ProfileUiState.Success(it) }
        .catch { emit(ProfileUiState.Error(it.message ?: "Failed to load")) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ProfileUiState.Loading)
}

@Composable
fun ProfileScreen(viewModel: ProfileViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    when (uiState) {
        is ProfileUiState.Loading -> CircularProgressIndicator(Modifier.testTag("loading"))
        is ProfileUiState.Success -> Column(Modifier.padding(16.dp)) {
            Text((uiState as ProfileUiState.Success).user.name, style = MaterialTheme.typography.headlineMedium)
        }
        is ProfileUiState.Error -> Text((uiState as ProfileUiState.Error).message, color = MaterialTheme.colorScheme.error)
    }
}
```

### Example 2: Offline-First Repository

```kotlin
class UserRepositoryImpl @Inject constructor(
    private val api: UserApi, private val dao: UserDao, private val io: CoroutineDispatcher
) : UserRepository {
    override fun getUser(id: String): Flow<User> = dao.observeUser(id)
        .map { it.toDomain() }
        .onStart { runCatching { dao.upsert(api.getUser(id).toEntity()) }
            .onFailure { if (it is CancellationException) throw it; Timber.w(it) } }
        .flowOn(io)
}
```

### Example 3: Convention Plugin

```kotlin
// build-logic/convention/src/main/kotlin/AndroidFeatureConventionPlugin.kt
class AndroidFeatureConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply { apply("com.android.library"); apply("org.jetbrains.kotlin.android")
            apply("org.jetbrains.kotlin.plugin.compose"); apply("com.google.dagger.hilt.android") }
        extensions.configure<LibraryExtension> { defaultConfig.targetSdk = 35 }
        dependencies { add("implementation", project(":core:ui")); add("implementation", project(":core:domain")) }
    }
}
// Usage: plugins { id("myapp.android.feature") }
```

### Example 4: Room DAO with Flow

```kotlin
@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :id") fun observeUser(id: String): Flow<UserEntity>
    @Upsert suspend fun upsert(user: UserEntity)
    @Transaction @Query("SELECT * FROM users INNER JOIN teams ON users.team_id = teams.id WHERE teams.name = :teamName")
    fun getUsersWithTeam(teamName: String): Flow<List<UserWithTeam>>
}
```

### Example 5: WorkManager with Hilt

```kotlin
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context, @Assisted params: WorkerParameters,
    private val syncRepository: SyncRepository
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = try {
        syncRepository.syncAll(); Result.success()
    } catch (e: Exception) { if (runAttemptCount < 3) Result.retry() else Result.failure() }
}
```

---

*Researched: 2026-03-07 | Sources: [Android Developers - Compose](https://developer.android.com/compose), [Android Architecture Guide](https://developer.android.com/topic/architecture), [Now in Android (GitHub)](https://github.com/android/nowinandroid), [Compose Performance](https://developer.android.com/develop/ui/compose/performance), [Compose Stability](https://developer.android.com/develop/ui/compose/performance/stability), [Navigation Type Safety](https://developer.android.com/guide/navigation/design/type-safety), [Baseline Profiles](https://developer.android.com/topic/performance/baselineprofiles/overview), [R8 Shrinking](https://developer.android.com/build/shrink-code), [Meta Baseline Profiles](https://engineering.fb.com/2025/10/01/android/accelerating-our-android-apps-with-baseline-profiles/), [Hilt vs Koin (droidcon)](https://www.droidcon.com/2025/11/26/hilt-vs-koin-the-hidden-cost-of-runtime-injection-and-why-compile-time-di-wins/), [Room Database](https://developer.android.com/training/data-storage/room), [WorkManager](https://developer.android.com/topic/libraries/architecture/workmanager), [LeakCanary](https://square.github.io/leakcanary/), [Kotlin 2.1.20](https://kotlinlang.org/docs/whatsnew2120.html), [Android Security 2025](https://medium.com/@hiren6997/5-modern-android-security-practices-you-cant-ignore-in-2025-6560558be99e), [Android Networking 2025](https://medium.com/@hiren6997/the-state-of-android-networking-in-2025-retrofit-ktor-and-beyond-7a5a5317802c), [Gradle Version Catalogs](https://docs.gradle.org/current/userguide/version_catalogs.html), [Modularization Patterns](https://developer.android.com/topic/modularization/patterns), [Compose API Guidelines](https://developer.android.com/develop/ui/compose/api-guidelines)*
