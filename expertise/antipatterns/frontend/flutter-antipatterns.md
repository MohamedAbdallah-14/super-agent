# Flutter & Dart Anti-Patterns

> Flutter's reactive, widget-based architecture is powerful but unforgiving. A single misplaced `setState`, a forgotten `dispose`, or a monolithic widget can cascade into jank, memory leaks, and unmaintainable spaghetti. These anti-patterns are drawn from real production incidents, community post-mortems, and the collective pain of the Flutter ecosystem. Knowing them prevents more bugs than any amount of best-practice documentation.

> **Domain:** Frontend
> **Anti-patterns covered:** 21
> **Highest severity:** Critical

## Anti-Patterns

### AP-01: The God Widget

**Also known as:** Monolithic Widget, Kitchen Sink Widget, The 800-Line build()
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

A single widget file containing hundreds or thousands of lines, mixing layout, business logic, API calls, navigation, and state management in one `build()` method.

```dart
// BAD: 600-line widget doing everything
class DashboardScreen extends StatefulWidget {
  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<User> users = [];
  bool isLoading = true;
  String? error;
  int selectedTab = 0;

  @override
  void initState() {
    super.initState();
    fetchUsers();
  }

  Future<void> fetchUsers() async {
    final response = await http.get(Uri.parse('https://api.example.com/users'));
    // ... parsing logic here ...
    setState(() { users = parsed; isLoading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(/* 40 lines of app bar config */),
      body: Column(
        children: [
          // 50 lines of tab bar
          // 80 lines of search/filter UI
          // 100 lines of list rendering
          // 60 lines of bottom sheet logic
          // 40 lines of dialogs
        ],
      ),
    );
  }
}
```

**Why developers do it:**

Flutter makes it easy to keep adding widgets inline. When prototyping, developers add "just one more widget" to the build method. There is no compile-time warning for large widgets, and the app still runs fine, so the problem creeps up gradually. Beginners coming from imperative frameworks often do not think in terms of composition.

**What goes wrong:**

- The entire widget tree rebuilds on every `setState`, even parts that did not change.
- Testing any single piece of functionality requires instantiating the entire screen.
- Multiple developers editing the same file causes merge conflicts constantly.
- Performance degrades as the widget tree grows -- Flutter DevTools rebuild stats show hundreds of unnecessary rebuilds per frame in severe cases.
- Code reuse becomes impossible; similar UI sections get copy-pasted.

**The fix:**

Extract sub-trees into separate `StatelessWidget` or `StatefulWidget` classes. Move business logic into services, repositories, or state management classes (BLoC, Riverpod, etc.).

```dart
// GOOD: Composed from small, focused widgets
class DashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const DashboardAppBar(),
      body: Column(
        children: [
          const DashboardTabBar(),
          const UserSearchBar(),
          Expanded(child: UserListView()),
        ],
      ),
    );
  }
}

// Each sub-widget is its own class with focused responsibility
class UserListView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final users = context.watch<UserProvider>().users;
    return ListView.builder(
      itemCount: users.length,
      itemBuilder: (context, index) => UserCard(user: users[index]),
    );
  }
}
```

**Detection rule:**
If a single widget file exceeds 200 lines or its `build()` method exceeds 80 lines, suspect AP-01. If a widget imports HTTP clients, databases, or service classes directly, it is almost certainly a God Widget.

---

### AP-02: Splitting Widgets into Methods Instead of Classes

**Also known as:** Helper Method Anti-Pattern, The Private Build Method Trap
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Developers break up a large `build()` by extracting pieces into private methods like `_buildHeader()`, `_buildBody()`, `_buildFooter()` instead of creating separate widget classes.

```dart
// BAD: Methods instead of widgets
class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String name = 'User';

  Widget _buildAvatar() {
    return CircleAvatar(child: Text(name[0]));
  }

  Widget _buildStats() {
    return Row(
      children: [
        Text('Posts: 42'),
        Text('Followers: 100'),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _buildAvatar(),
        _buildStats(),  // Rebuilds every time even though data hasn't changed
      ],
    );
  }
}
```

**Why developers do it:**

It looks cleaner than one massive `build()`. In other frameworks (React class components, Android XML), extracting helper methods is standard practice. IDE refactoring tools offer "Extract Method" as the first option. Developers assume methods and classes are interchangeable for this purpose.

**What goes wrong:**

When the parent calls `setState`, Flutter rebuilds the entire widget subtree. Methods are re-invoked unconditionally because Flutter has no way to know whether a method's output has changed. In contrast, a separate `StatelessWidget` with `const` constructor can be skipped entirely during rebuilds. This was documented extensively by Iiro Krankka in his widely-cited article "Splitting widgets to methods is a performance anti-pattern" and confirmed by the Flutter team. In complex screens with animations, this can cause visible jank on lower-end devices.

**The fix:**

```dart
// GOOD: Separate widget classes
class ProfileAvatar extends StatelessWidget {
  final String name;
  const ProfileAvatar({required this.name});

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(child: Text(name[0]));
  }
}

class ProfileStats extends StatelessWidget {
  const ProfileStats();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Text('Posts: 42'),
        Text('Followers: 100'),
      ],
    );
  }
}
```

**Detection rule:**
If a `State` class contains private methods returning `Widget` (pattern: `Widget _build*(`), suspect AP-02. DCM lint rule `avoid-returning-widgets` catches this automatically.

---

### AP-03: Missing const Constructors

**Also known as:** The Rebuild Tax, Const Blindness
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

Widgets that could be `const` are instantiated without the `const` keyword, forcing Flutter to rebuild them on every parent rebuild.

```dart
// BAD: No const, rebuilds every time parent rebuilds
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('My App')),  // Not const
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(16.0),       // Not const
            child: Text('Hello World'),          // Not const
          ),
        ),
      ),
    );
  }
}
```

**Why developers do it:**

It still compiles and runs without `const`. Many developers coming from other languages are not accustomed to `const` at the expression level. Before Dart 2.12+ lints, there was no automated warning. Some developers believe `const` is only a style preference, not a performance mechanism.

**What goes wrong:**

Without `const`, Flutter allocates a new widget object on every rebuild and must diff it against the previous tree. With `const`, Flutter recognizes the widget as identical to the previous build via canonical instance comparison and skips the entire subtree. In apps with frequent rebuilds (animations, scrolling, real-time data), this compounds into measurable frame drops. The Dart VM also loses compile-time optimizations: constant folding, pre-allocated memory, and reduced garbage collection pressure.

**The fix:**

```dart
// GOOD: const everywhere possible
class MyApp extends StatelessWidget {
  const MyApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('My App')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(16.0),
            child: Text('Hello World'),
          ),
        ),
      ),
    );
  }
}
```

**Detection rule:**
Enable `prefer_const_constructors`, `prefer_const_declarations`, and `prefer_const_literals_to_create_immutables` lint rules. Any widget whose constructor arguments are all compile-time constants but is instantiated without `const` is AP-03.

---

### AP-04: setState for Everything

**Also known as:** setState Hell, Prop Drilling Nightmare, The Scalability Wall
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Using `setState` as the sole state management approach across the entire app, passing callbacks and data through multiple widget layers.

```dart
// BAD: setState cascading through the entire tree
class ShoppingApp extends StatefulWidget {
  @override
  _ShoppingAppState createState() => _ShoppingAppState();
}

class _ShoppingAppState extends State<ShoppingApp> {
  List<CartItem> cart = [];
  User? currentUser;
  String selectedCategory = 'all';
  bool isDarkMode = false;

  void addToCart(Product p) {
    setState(() { cart.add(CartItem(product: p, qty: 1)); });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: HomePage(
        cart: cart,
        user: currentUser,
        selectedCategory: selectedCategory,
        isDarkMode: isDarkMode,
        onAddToCart: addToCart,          // Drilled 3 levels deep
        onCategoryChange: (c) => setState(() => selectedCategory = c),
        onThemeToggle: () => setState(() => isDarkMode = !isDarkMode),
      ),
    );
  }
}
```

**Why developers do it:**

`setState` is the first state management tool taught in every Flutter tutorial. It works perfectly for simple apps and prototypes. Adding a state management library (Riverpod, BLoC, Provider) feels like over-engineering for small projects, so developers keep using `setState` as the app grows.

**What goes wrong:**

- Every `setState` rebuilds the entire subtree from that widget down, even if only one piece of data changed.
- Prop drilling (passing data through widgets that do not use it) makes the code brittle and hard to refactor.
- Business logic becomes entangled with UI code, making unit testing impossible without widget tests.
- When two distant widgets need the same state, the state must be lifted to a common ancestor, often the root, causing the entire app to rebuild on any state change.
- Teams report that apps using only `setState` beyond 15-20 screens become effectively unmaintainable.

**The fix:**

Use `setState` only for truly local UI state (a toggle, a text field focus, an animation). Use a state management solution for shared or complex state.

```dart
// GOOD: Riverpod for shared state, setState for local UI state
final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>(
  (ref) => CartNotifier(),
);

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

  void add(Product p) {
    state = [...state, CartItem(product: p, qty: 1)];
  }
}

// Widget only rebuilds when cart changes
class CartBadge extends ConsumerWidget {
  const CartBadge();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(cartProvider).length;
    return Badge(label: Text('$count'));
  }
}
```

**Detection rule:**
If `setState` is called more than 5 times in a single `State` class, or if callback functions are passed through more than 2 widget levels, suspect AP-04. If `setState` modifies data that conceptually belongs to the application (not the widget), it is AP-04.

---

### AP-05: Forgetting to Dispose Controllers and Streams

**Also known as:** The Silent Memory Leak, Zombie Subscriptions, Disposal Amnesia
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

Creating `TextEditingController`, `AnimationController`, `ScrollController`, `StreamSubscription`, or `Timer` in a `StatefulWidget` without calling `dispose()` or `cancel()`.

```dart
// BAD: Controllers never disposed
class SearchScreen extends StatefulWidget {
  @override
  _SearchScreenState createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen>
    with SingleTickerProviderStateMixin {
  final searchController = TextEditingController();
  final scrollController = ScrollController();
  late AnimationController animController;
  late StreamSubscription<LocationData> locationSub;

  @override
  void initState() {
    super.initState();
    animController = AnimationController(vsync: this, duration: Duration(seconds: 1));
    locationSub = locationService.stream.listen((data) {
      setState(() { /* update location */ });
    });
  }

  // No dispose() method!

  @override
  Widget build(BuildContext context) => /* ... */;
}
```

**Why developers do it:**

The app appears to work fine in development because the garbage collector eventually reclaims some objects, and short debugging sessions do not reveal the leak. Developers forget because `initState` and `dispose` are not symmetrically enforced by the compiler. Stream subscriptions are particularly easy to forget because `listen()` returns the subscription as a value that developers often ignore.

**What goes wrong:**

- `TextEditingController` and `ScrollController` leak native resources and listeners.
- `AnimationController` continues ticking after the widget is removed, consuming CPU and eventually crashing with "setState called after dispose."
- `StreamSubscription` keeps firing callbacks on a disposed widget, causing crashes or corrupted state.
- In navigation-heavy apps, every push/pop cycle leaks more memory. Users on low-end Android devices report apps slowing to a crawl after 10-15 minutes of use.
- DCM's blog on memory leaks documents cases where undisposed stream subscriptions caused apps to consume 500MB+ of memory within minutes of normal use.

**The fix:**

```dart
// GOOD: Always dispose in dispose()
class _SearchScreenState extends State<SearchScreen>
    with SingleTickerProviderStateMixin {
  final searchController = TextEditingController();
  final scrollController = ScrollController();
  late AnimationController animController;
  late StreamSubscription<LocationData> locationSub;

  @override
  void initState() {
    super.initState();
    animController = AnimationController(vsync: this, duration: Duration(seconds: 1));
    locationSub = locationService.stream.listen((data) {
      if (mounted) setState(() { /* update */ });
    });
  }

  @override
  void dispose() {
    searchController.dispose();
    scrollController.dispose();
    animController.dispose();
    locationSub.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => /* ... */;
}
```

**Detection rule:**
If a `State` class creates a `TextEditingController`, `AnimationController`, `ScrollController`, `FocusNode`, `StreamSubscription`, or `Timer` in `initState` or field initialization, but has no `dispose()` method (or the `dispose()` method does not reference that object), it is AP-05. Lint rule: `close_sinks`, `cancel_subscriptions`.

---

### AP-06: Blocking the UI Thread with Heavy Computation

**Also known as:** Main Thread Abuse, The Jank Generator, Synchronous Sin
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Running expensive computation, large JSON parsing, image processing, or file I/O directly in the `build()` method or in response to user interaction on the main isolate.

```dart
// BAD: Heavy computation on main thread
class ReportScreen extends StatefulWidget {
  @override
  _ReportScreenState createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  List<ChartData> chartData = [];

  void generateReport() {
    // This blocks the UI for 2-3 seconds
    final rawData = loadCsvSync('large_dataset.csv');  // 50MB file
    final parsed = rawData.split('\n').map((line) {
      final cols = line.split(',');
      return ChartData(
        x: double.parse(cols[0]),
        y: double.parse(cols[1]),
        label: cols[2],
      );
    }).toList();

    // Sort, filter, aggregate -- all on main thread
    parsed.sort((a, b) => a.x.compareTo(b.x));
    setState(() { chartData = parsed; });
  }

  @override
  Widget build(BuildContext context) => /* ... */;
}
```

**Why developers do it:**

Dart's `async`/`await` syntax looks like it solves concurrency, but `async` in Dart is cooperative concurrency on a single thread, not parallelism. A `Future` still runs on the main isolate. Developers assume `await` means "run in background" when it actually means "yield the event loop but still use the same thread." The distinction between concurrency and parallelism is not well understood.

**What goes wrong:**

- Flutter targets 60fps (16ms per frame). Any computation exceeding 16ms causes dropped frames visible as jank.
- On low-end Android devices, even 5ms of synchronous work in `build()` can cause visible stutter.
- Users perceive the app as frozen; if the main thread is blocked for more than 5 seconds on Android, the OS shows an ANR (Application Not Responding) dialog.
- Flutter GitHub issue #121720 documents cases where even isolate spawning can briefly block UI if not managed correctly.

**The fix:**

Use `Isolate.run()` (Dart 2.19+) or `compute()` for CPU-intensive work.

```dart
// GOOD: Heavy work in a separate isolate
Future<void> generateReport() async {
  setState(() { isLoading = true; });

  final chartData = await Isolate.run(() {
    final rawData = File('large_dataset.csv').readAsStringSync();
    final parsed = rawData.split('\n').map((line) {
      final cols = line.split(',');
      return ChartData(
        x: double.parse(cols[0]),
        y: double.parse(cols[1]),
        label: cols[2],
      );
    }).toList();
    parsed.sort((a, b) => a.x.compareTo(b.x));
    return parsed;
  });

  setState(() { this.chartData = chartData; isLoading = false; });
}
```

**Detection rule:**
If `build()` contains loops processing more than a trivial number of items, file I/O, JSON parsing of unbounded data, or sorting of large collections, suspect AP-06. If a synchronous method is called that could take >16ms, it is AP-06. Look for `readAsStringSync`, `jsonDecode` on large payloads, or nested loops inside widget methods.

---

### AP-07: Excessive GlobalKey Usage

**Also known as:** GlobalKey Overload, The Expensive Identity
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Using `GlobalKey` for tasks that could be accomplished with `ValueKey`, `UniqueKey`, or no key at all. Creating `GlobalKey` instances inside `build()`.

```dart
// BAD: GlobalKey created in build -- destroys and recreates subtree every build
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Form(
      key: GlobalKey<FormState>(),  // NEW key every build!
      child: Column(/* ... */),
    );
  }
}

// BAD: GlobalKey used just to read a value
class ParentWidget extends StatefulWidget {
  @override
  _ParentWidgetState createState() => _ParentWidgetState();
}

class _ParentWidgetState extends State<ParentWidget> {
  final _childKey = GlobalKey<_ChildWidgetState>();

  void doSomething() {
    // Reaching into child state via GlobalKey
    _childKey.currentState?.someValue;
  }

  @override
  Widget build(BuildContext context) {
    return ChildWidget(key: _childKey);
  }
}
```

**Why developers do it:**

`GlobalKey` provides direct access to a widget's `State`, which feels convenient for cross-widget communication. Tutorials for `Form` validation use `GlobalKey<FormState>()` prominently, leading developers to assume GlobalKey is the standard approach for all inter-widget communication.

**What goes wrong:**

- Creating `GlobalKey` in `build()` throws away the entire subtree state on every rebuild, as documented in Flutter's official API docs. A `GestureDetector` in that subtree loses ongoing gesture tracking. Text fields lose their content.
- Each `GlobalKey` is registered in a global lookup table, increasing memory consumption linearly with the number of keys.
- Flutter issue #35730 documents the performance overhead: GlobalKeys are more expensive than other keys because they require global uniqueness checks.
- Using GlobalKey to access child state creates tight coupling and makes refactoring dangerous.

**The fix:**

Instantiate GlobalKey in `initState` or as a field, never in `build()`. Prefer callbacks, state management, or `ValueKey`/`UniqueKey` where GlobalKey is not strictly needed.

```dart
// GOOD: GlobalKey created once, outside build
class _MyFormState extends State<MyForm> {
  final _formKey = GlobalKey<FormState>();  // Created once

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(/* ... */),
    );
  }
}

// BETTER: Use callbacks instead of reaching into child state
class ParentWidget extends StatefulWidget {
  @override
  _ParentWidgetState createState() => _ParentWidgetState();
}

class _ParentWidgetState extends State<ParentWidget> {
  String? childValue;

  @override
  Widget build(BuildContext context) {
    return ChildWidget(
      onValueChanged: (v) => setState(() => childValue = v),
    );
  }
}
```

**Detection rule:**
If `GlobalKey()` appears inside a `build()` method, it is always AP-07. If `GlobalKey` is used to access child state and a callback pattern could replace it, it is AP-07. Count GlobalKeys per screen: more than 2-3 is a code smell.

---

### AP-08: Missing Keys in Lists

**Also known as:** The Phantom Reorder, State Mismatch Bug, Keyless Lists
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

Building lists of stateful widgets without providing keys, or using the list index as the key.

```dart
// BAD: No keys -- state gets confused when items reorder
ListView.builder(
  itemCount: todos.length,
  itemBuilder: (context, index) {
    return TodoTile(todo: todos[index]);  // No key!
  },
);

// ALSO BAD: Index as key -- same problem when items are removed/reordered
ListView.builder(
  itemCount: todos.length,
  itemBuilder: (context, index) {
    return TodoTile(
      key: ValueKey(index),  // Index changes when items reorder!
      todo: todos[index],
    );
  },
);
```

**Why developers do it:**

Keys are not required by the compiler, and lists appear to work correctly until items are reordered, deleted, or inserted. The bug manifests as "the checkbox state moved to the wrong item," which developers blame on their state management rather than missing keys.

**What goes wrong:**

- Flutter matches old and new widgets by position in the list. When an item is removed from the middle, all subsequent widgets inherit the state of their predecessor.
- Checkboxes appear checked on wrong items, text fields show wrong content, animations play on wrong elements.
- This is one of the most frequently reported "unexplainable bugs" in the Flutter community, as noted on FlutterClutter and multiple Stack Overflow threads.
- Using index as key is equally broken: if item at index 2 is deleted, the old index-3 item now has key 2 and inherits index-2's state.

**The fix:**

```dart
// GOOD: Stable, unique key per item
ListView.builder(
  itemCount: todos.length,
  itemBuilder: (context, index) {
    return TodoTile(
      key: ValueKey(todos[index].id),  // Stable unique identifier
      todo: todos[index],
    );
  },
);
```

**Detection rule:**
If a `ListView.builder`, `Column`, or `Row` renders stateful widgets without a `key` parameter, suspect AP-08. If `ValueKey(index)` is used where the list supports reordering or deletion, it is AP-08.

---

### AP-09: Using BuildContext Across Async Gaps

**Also known as:** Stale Context, The Mounted Check Omission, Context After Dispose
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Using `BuildContext` after an `await` call without checking if the widget is still mounted.

```dart
// BAD: Context used after async gap
Future<void> _submit() async {
  final response = await api.submitForm(data);

  // Widget might be disposed by now!
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('Success!')),
  );
  Navigator.of(context).pushReplacementNamed('/home');
}
```

**Why developers do it:**

It works most of the time because the widget is usually still mounted when the `Future` completes. The bug only surfaces when users navigate away during the async operation (press back while a form is submitting), which is a race condition that rarely occurs during development but happens constantly in production.

**What goes wrong:**

- `BuildContext` references a widget that no longer exists in the tree, leading to "Looking up a deactivated widget's ancestor is unsafe" errors.
- On navigation-heavy apps, this causes crashes that are difficult to reproduce because they depend on timing.
- The Dart linter rule `use_build_context_synchronously` was created specifically because this pattern caused so many production crashes.
- Flutter GitHub issues #110694 and #122953 document extensive community frustration with this pattern.

**The fix:**

```dart
// GOOD: Check mounted before using context after await
Future<void> _submit() async {
  final response = await api.submitForm(data);

  if (!mounted) return;  // Widget was disposed during await

  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('Success!')),
  );
  Navigator.of(context).pushReplacementNamed('/home');
}

// BETTER: Use a callback pattern or state management
// so the widget doesn't need context after the async gap
```

**Detection rule:**
If any method calls `await` and then references `context` (including `Navigator.of(context)`, `ScaffoldMessenger.of(context)`, `Theme.of(context)`, `MediaQuery.of(context)`) without a `mounted` check between the `await` and the context usage, it is AP-09. Lint rule: `use_build_context_synchronously`.

---

### AP-10: FutureBuilder/StreamBuilder Without Handling All States

**Also known as:** The Missing Loading Screen, Partial Snapshot Handling, Optimistic Builder
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

Using `FutureBuilder` or `StreamBuilder` but only checking for the "done with data" case, ignoring loading, error, and null-data states.

```dart
// BAD: Only handles success case
FutureBuilder<User>(
  future: fetchUser(),
  builder: (context, snapshot) {
    // What about loading? Errors? Null data?
    return Text(snapshot.data!.name);  // Crashes if data is null
  },
);
```

**Why developers do it:**

During development, the API is fast and always succeeds. Developers focus on the happy path because that is what they see in the emulator. The `snapshot.data!` force-unwrap suppresses the null warning, making the code "work" in dev.

**What goes wrong:**

- `snapshot.data` is null during `ConnectionState.waiting`, causing null-pointer crashes on slow networks.
- API errors produce `snapshot.hasError == true` but no error UI is shown; users see a blank screen or crash.
- On rebuilds, the `FutureBuilder` briefly returns to `ConnectionState.waiting` before the data arrives again, causing screen flicker.
- A common secondary bug: creating the Future inside `build()` causes the request to fire on every rebuild (see AP-14).

**The fix:**

```dart
// GOOD: Handle all states
FutureBuilder<User>(
  future: _userFuture,  // Created in initState, not build!
  builder: (context, snapshot) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return const Center(child: CircularProgressIndicator());
    }
    if (snapshot.hasError) {
      return Center(child: Text('Error: ${snapshot.error}'));
    }
    if (!snapshot.hasData) {
      return const Center(child: Text('No user found'));
    }
    final user = snapshot.data!;
    return Text(user.name);
  },
);
```

**Detection rule:**
If a `FutureBuilder` or `StreamBuilder` builder function does not contain checks for `ConnectionState.waiting`, `snapshot.hasError`, and `snapshot.hasData`, it is AP-10. If `snapshot.data!` is used without a preceding null/error check, it is AP-10.

---

### AP-11: Hardcoded Dimensions

**Also known as:** Pixel-Perfect Fragility, The Single-Device Design, Magic Numbers
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**

Using fixed pixel values for widths, heights, padding, and font sizes instead of responsive sizing.

```dart
// BAD: Hardcoded dimensions
Container(
  width: 375,   // iPhone 8 width
  height: 812,  // iPhone X height
  padding: EdgeInsets.only(top: 44),  // iPhone X safe area, hardcoded
  child: Column(
    children: [
      SizedBox(height: 200),  // Fixed header height
      Container(
        width: 340,
        height: 50,
        child: TextField(),
      ),
    ],
  ),
);
```

**Why developers do it:**

The app looks perfect on the developer's test device. Flutter's hot reload makes it easy to tweak pixels until it looks right on one screen. Designers hand off specs in exact pixel values. Using `MediaQuery` or `LayoutBuilder` requires understanding constraints, which adds complexity.

**What goes wrong:**

- Overflow errors on smaller screens (the yellow-and-black striped bar that every Flutter developer recognizes).
- Wasted space on tablets and foldables.
- Text truncation on devices with larger system font sizes.
- Landscape mode becomes completely broken.
- Apps that look fine on a Pixel 6 break on Samsung Galaxy Fold, iPad, or budget Android devices with unusual aspect ratios.

**The fix:**

```dart
// GOOD: Responsive dimensions
LayoutBuilder(
  builder: (context, constraints) {
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: constraints.maxWidth * 0.05,
      ),
      child: Column(
        children: [
          SizedBox(height: constraints.maxHeight * 0.1),
          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: 600),
            child: const TextField(),
          ),
        ],
      ),
    );
  },
);

// Also: use MediaQuery.paddingOf(context) for safe area
// Also: use Flexible/Expanded instead of fixed SizedBox
```

**Detection rule:**
If a `Container`, `SizedBox`, `Padding`, or `Positioned` uses literal numeric values greater than 100 for width/height, suspect AP-11. If `EdgeInsets` uses literal values greater than 32, verify they are intentional. Exception: small spacing values (4, 8, 16) are usually fine.

---

### AP-12: Rebuilding Entire Widget Trees Unnecessarily

**Also known as:** The Rebuild Avalanche, Unscoped State, Overly Broad setState
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

A `setState` call or state change triggers a rebuild of the entire screen when only a small portion of the UI actually changed.

```dart
// BAD: Entire screen rebuilds when only the counter changes
class DashboardScreen extends StatefulWidget {
  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int notificationCount = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Dashboard'),
        actions: [
          Badge(
            label: Text('$notificationCount'),  // Only this changes
            child: Icon(Icons.notifications),
          ),
        ],
      ),
      body: Column(
        children: [
          ExpensiveChart(),       // Rebuilds unnecessarily
          ExpensiveUserList(),    // Rebuilds unnecessarily
          ExpensiveActivityFeed(),// Rebuilds unnecessarily
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => setState(() => notificationCount++),
      ),
    );
  }
}
```

**Why developers do it:**

`setState` is a blunt instrument -- it marks the entire `State` as dirty. Developers do not realize that every child widget's `build()` runs again. Flutter DevTools is not always used during development, so the rebuild count goes unnoticed.

**What goes wrong:**

- In the example above, every tap rebuilds `ExpensiveChart`, `ExpensiveUserList`, and `ExpensiveActivityFeed` even though their data has not changed.
- On screens with heavy widgets (charts, maps, video players), this causes visible stutter.
- Community reports document apps dropping from 60fps to 15fps due to a single poorly scoped `setState` on a complex dashboard.
- Calling `MediaQuery.of(context)` in the root widget creates an implicit dependency that rebuilds the entire tree when the keyboard opens or orientation changes.

**The fix:**

Push state down to the smallest widget that needs it, or use granular state management.

```dart
// GOOD: Only the badge rebuilds
class NotificationBadge extends StatelessWidget {
  const NotificationBadge();

  @override
  Widget build(BuildContext context) {
    final count = context.watch<NotificationProvider>().count;
    return Badge(
      label: Text('$count'),
      child: const Icon(Icons.notifications),
    );
  }
}

// Dashboard no longer rebuilds its expensive children
class DashboardScreen extends StatelessWidget {
  const DashboardScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [const NotificationBadge()],
      ),
      body: const Column(
        children: [
          ExpensiveChart(),
          ExpensiveUserList(),
          ExpensiveActivityFeed(),
        ],
      ),
    );
  }
}
```

**Detection rule:**
If `setState` modifies only one variable but the `build()` method constructs 5+ widgets, suspect AP-12. Use Flutter DevTools Rebuild Stats to verify: if widgets with unchanged data show rebuild counts >1, it is AP-12.

---

### AP-13: Mixing Business Logic in Widgets

**Also known as:** Fat Widget, Logic Leak, The Untestable Screen
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

API calls, data transformation, validation logic, and business rules living directly inside widget classes.

```dart
// BAD: Business logic embedded in widget
class OrderScreen extends StatefulWidget {
  @override
  _OrderScreenState createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  Future<void> placeOrder() async {
    // Validation logic in widget
    if (cart.isEmpty) { showError('Cart is empty'); return; }
    if (cart.total < 10.0) { showError('Minimum order: \$10'); return; }

    // Price calculation in widget
    final subtotal = cart.items.fold(0.0, (sum, i) => sum + i.price * i.qty);
    final tax = subtotal * 0.08;
    final shipping = subtotal > 50 ? 0 : 5.99;
    final total = subtotal + tax + shipping;

    // API call in widget
    final response = await http.post(
      Uri.parse('https://api.example.com/orders'),
      body: jsonEncode({'items': cart.items, 'total': total}),
    );

    // Navigation in response to API
    if (response.statusCode == 201) {
      Navigator.pushNamed(context, '/confirmation');
    }
  }

  @override
  Widget build(BuildContext context) => /* ... */;
}
```

**Why developers do it:**

It is the fastest way to get features working. During prototyping, separating layers feels like unnecessary abstraction. Small apps genuinely do not need separation. The problem is that developers never go back to refactor once the app grows.

**What goes wrong:**

- Business rules (minimum order amount, tax calculation, shipping thresholds) cannot be unit tested without instantiating a widget.
- Changing the API endpoint requires editing a UI file.
- The same business logic gets duplicated across multiple screens (order confirmation, order history, admin dashboard all recalculate totals).
- When business rules change (tax rate update), developers must find and update every widget that embedded the old rate.
- Flutter's official architecture guide explicitly warns against this: "Views should not contain any business logic."

**The fix:**

```dart
// GOOD: Separated layers
// domain/order_service.dart
class OrderService {
  final ApiClient _api;
  OrderService(this._api);

  double calculateTotal(Cart cart) {
    final subtotal = cart.items.fold(0.0, (sum, i) => sum + i.price * i.qty);
    final tax = subtotal * 0.08;
    final shipping = subtotal > 50 ? 0.0 : 5.99;
    return subtotal + tax + shipping;
  }

  String? validate(Cart cart) {
    if (cart.isEmpty) return 'Cart is empty';
    if (cart.total < 10.0) return 'Minimum order: \$10';
    return null;
  }

  Future<Order> placeOrder(Cart cart) async {
    final total = calculateTotal(cart);
    return _api.post('/orders', {'items': cart.items, 'total': total});
  }
}

// Widget is now thin -- only UI concerns
class OrderScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ElevatedButton(
      onPressed: () async {
        final service = ref.read(orderServiceProvider);
        final error = service.validate(cart);
        if (error != null) { showError(error); return; }
        await service.placeOrder(cart);
        if (context.mounted) Navigator.pushNamed(context, '/confirmation');
      },
      child: const Text('Place Order'),
    );
  }
}
```

**Detection rule:**
If a widget class imports `dart:convert`, `package:http`, or a database package, suspect AP-13. If a widget method contains conditional business logic (price calculation, validation rules, permission checks), it is AP-13.

---

### AP-14: Creating Futures/Streams Inside build()

**Also known as:** The Infinite Request Loop, Build-Time Side Effects
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Calling an API, creating a `Future`, or opening a `Stream` inside the `build()` method, often inside a `FutureBuilder` or `StreamBuilder`.

```dart
// BAD: API called on every rebuild
class UserProfile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: fetchUser(),  // Called on EVERY rebuild!
      builder: (context, snapshot) {
        if (snapshot.hasData) return Text(snapshot.data!.name);
        return CircularProgressIndicator();
      },
    );
  }
}
```

**Why developers do it:**

`FutureBuilder` accepts a `future` parameter, so developers naturally pass the function call directly. It works on the first render. The problem only appears when the widget rebuilds (parent setState, keyboard open/close, navigation) and fires the request again.

**What goes wrong:**

- Every rebuild triggers a new network request, potentially hundreds per second during animations or scrolling.
- The UI flickers between loading and loaded states as each new request starts.
- API rate limits are hit. Server costs spike.
- The Flutter `FutureBuilder` class documentation explicitly warns: "The future must not be created during the State.build or StatelessWidget.build method call."

**The fix:**

```dart
// GOOD: Future created once in initState
class UserProfile extends StatefulWidget {
  @override
  _UserProfileState createState() => _UserProfileState();
}

class _UserProfileState extends State<UserProfile> {
  late final Future<User> _userFuture;

  @override
  void initState() {
    super.initState();
    _userFuture = fetchUser();  // Created once
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: _userFuture,  // Same Future instance on every rebuild
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const CircularProgressIndicator();
        }
        if (snapshot.hasError) return Text('Error: ${snapshot.error}');
        return Text(snapshot.data!.name);
      },
    );
  }
}
```

**Detection rule:**
If a `FutureBuilder` or `StreamBuilder` has its `future:` or `stream:` parameter set to a function call (not a variable reference), it is AP-14. Pattern: `FutureBuilder(future: someFunctionCall(),` inside a `build()` method.

---

### AP-15: Overusing StatefulWidget

**Also known as:** Stateful by Default, The Unnecessary Lifecycle
**Frequency:** Common
**Severity:** Low
**Detection difficulty:** Easy

**What it looks like:**

Using `StatefulWidget` for widgets that have no mutable state, or that receive all their data from parent widgets or state management.

```dart
// BAD: StatefulWidget with no mutable state
class UserCard extends StatefulWidget {
  final User user;
  const UserCard({required this.user});

  @override
  _UserCardState createState() => _UserCardState();
}

class _UserCardState extends State<UserCard> {
  // No state variables!
  // No initState doing anything!
  // No dispose needed!

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(widget.user.name),
        subtitle: Text(widget.user.email),
      ),
    );
  }
}
```

**Why developers do it:**

Beginners are unsure whether they will need state later, so they default to `StatefulWidget` "just in case." Some tutorials use `StatefulWidget` for all examples. IDE templates sometimes generate `StatefulWidget` scaffolds.

**What goes wrong:**

- `StatefulWidget` allocates a `State` object with its own lifecycle, consuming more memory than `StatelessWidget`.
- It signals to other developers that this widget has mutable state, misleading code reviewers.
- It prevents the widget from being `const`, eliminating Flutter's rebuild optimization.
- While the performance impact per widget is small, in a list of hundreds of items (e.g., a chat app), the cumulative overhead is measurable.

**The fix:**

```dart
// GOOD: StatelessWidget when there's no state
class UserCard extends StatelessWidget {
  final User user;
  const UserCard({required this.user});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(user.name),
        subtitle: Text(user.email),
      ),
    );
  }
}
```

**Detection rule:**
If a `State` class has no mutable fields (no `late` variables, no non-final fields), no `initState` override, and no `dispose` override, the widget should be `StatelessWidget`. This is AP-15.

---

### AP-16: Abusing the Null Check Operator (!)

**Also known as:** Bang Operator Abuse, Force Unwrap Everywhere, The Lazy Null Fix
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Using the `!` operator to silence null safety warnings instead of handling nullable types properly.

```dart
// BAD: Force unwrapping everywhere
class UserProfile extends StatelessWidget {
  final User? user;
  const UserProfile({this.user});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(user!.name),            // Crashes if user is null
        Text(user!.email!),          // Double crash potential
        Text(user!.address!.city!),  // Triple crash potential
        Image.network(user!.avatar!),
      ],
    );
  }
}

// BAD: Using ! to "fix" migration warnings
String getUserName(Map<String, dynamic> json) {
  return json['name']! as String;  // Crashes on missing key
}
```

**Why developers do it:**

The `!` operator is the fastest way to make a null-safety error disappear. During the null safety migration, the `dart migrate` tool sometimes inserted `!` in places where proper null handling was needed. Developers see `!` used in official examples (e.g., `snapshot.data!` in FutureBuilder) and generalize its use.

**What goes wrong:**

- Every `!` is an implicit assertion that throws a runtime exception if the value is null, converting a compile-time safety feature into a runtime crash.
- In production, this manifests as `Null check operator used on a null value` -- one of the most common Flutter crash reports.
- The crash message gives no context about which `!` caused it when multiple are on the same line.
- It defeats the entire purpose of Dart's sound null safety, which was designed to eliminate null pointer exceptions at compile time.

**The fix:**

```dart
// GOOD: Proper null handling
class UserProfile extends StatelessWidget {
  final User? user;
  const UserProfile({this.user});

  @override
  Widget build(BuildContext context) {
    final currentUser = user;
    if (currentUser == null) {
      return const Center(child: Text('No user data'));
    }

    return Column(
      children: [
        Text(currentUser.name),
        Text(currentUser.email ?? 'No email'),
        Text(currentUser.address?.city ?? 'Unknown city'),
        if (currentUser.avatar != null)
          Image.network(currentUser.avatar!),
      ],
    );
  }
}
```

**Detection rule:**
If `!` appears more than 3 times in a single method, suspect AP-16. If `!` is used on a value that could legitimately be null at runtime (user input, API response, map lookup), it is AP-16. Pattern: `json['key']!`, `snapshot.data!` without preceding `hasData` check, chained `!` operators like `a!.b!.c!`.

---

### AP-17: Not Handling Platform Differences

**Also known as:** iOS-Only Development, Android Amnesia, The Platform Blindspot
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**

Assuming Flutter automatically handles all platform differences, ignoring iOS/Android behavioral differences, safe areas, navigation patterns, and permissions.

```dart
// BAD: Ignoring platform differences
class SettingsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Settings')),
      body: ListView(
        children: [
          ListTile(
            title: Text('Notifications'),
            onTap: () {
              // Only handles Android permission model
              requestNotificationPermission();
            },
          ),
          ListTile(
            title: Text('Share'),
            onTap: () {
              // Uses Android intent pattern, breaks on iOS
              shareViaIntent(data);
            },
          ),
        ],
      ),
    );
  }
}
```

**Why developers do it:**

Flutter's "write once, run anywhere" marketing creates a false sense of complete platform abstraction. Developers test on only one platform (usually the one their primary device runs). Platform-specific behavior is documented across multiple Flutter and platform-specific docs, making it easy to miss.

**What goes wrong:**

- iOS back navigation (swipe-from-edge) conflicts with horizontal scroll/drawer gestures if not handled.
- Android 13+ requires explicit notification permission requests; iOS has required this since iOS 10.
- `WillPopScope` (now `PopScope`) behaves differently with Android predictive back gestures (Android 13+), as documented in Flutter breaking changes and GitHub issue #140869.
- Status bar and notch/Dynamic Island handling differs between platforms.
- File paths, app lifecycle events, and deep linking all have platform-specific behaviors.

**The fix:**

```dart
// GOOD: Platform-aware code
import 'dart:io' show Platform;

class SettingsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: SafeArea(  // Handles notch, Dynamic Island, etc.
        child: ListView(
          children: [
            ListTile(
              title: const Text('Notifications'),
              onTap: () async {
                if (Platform.isIOS) {
                  await requestIOSNotificationPermission();
                } else {
                  await requestAndroidNotificationPermission();
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
```

**Detection rule:**
If a Flutter app targets both iOS and Android but contains no `Platform.isIOS` / `Platform.isAndroid` checks and no `SafeArea` widgets, suspect AP-17. If `PopScope` or navigation handling does not account for Android predictive back, it is AP-17.

---

### AP-18: Over-Relying on Packages for Simple Tasks

**Also known as:** Package Bloat, The pub.dev Reflex, Dependency Addiction
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Adding third-party packages for functionality that Dart or Flutter provide natively, or for trivial implementations.

```dart
# pubspec.yaml -- BAD: packages for trivial tasks
dependencies:
  flutter:
    sdk: flutter
  string_extensions: ^1.0.0    # For .capitalize() -- just write it
  date_formatter: ^2.0.0       # For date formatting -- intl is built-in
  device_info: ^3.0.0          # Used once to get platform name
  url_launcher: ^6.0.0         # Actually needed
  connectivity: ^3.0.0         # Actually needed
  random_color: ^1.0.0         # For generating random colors -- 3 lines of code
  validators: ^2.0.0           # For email validation -- one regex
  screen_size_util: ^1.0.0     # For screen breakpoints -- 10 lines of code
```

**Why developers do it:**

pub.dev makes it trivially easy to add packages. "There's a package for that" is a common response in the Flutter community. Developers overestimate the complexity of implementing simple utilities. Adding a package feels faster than writing 10 lines of code.

**What goes wrong:**

- Each package adds transitive dependencies, inflating binary size.
- Version conflicts between packages become frequent -- `flutter pub get` starts failing with "version solving failed" as documented in FlutterFlow community posts and Dart dependency management guides.
- Abandoned or unmaintained packages create security vulnerabilities and compatibility issues with new Flutter versions.
- Upgrading Flutter SDK often breaks multiple packages simultaneously.
- Debug builds become slow because Dart analyzes all dependency code.
- One popular left-pad-style incident: when a package author unpublished their package, multiple apps broke.

**The fix:**

Before adding a package, ask: "Can I implement this in under 20 lines?" If yes, write it yourself.

```dart
// Instead of string_extensions package:
extension StringCaps on String {
  String get capitalize =>
      isEmpty ? '' : '${this[0].toUpperCase()}${substring(1)}';
}

// Instead of random_color package:
Color randomColor() => Color((Random().nextDouble() * 0xFFFFFF).toInt())
    .withOpacity(1.0);

// Instead of validators package for email:
bool isValidEmail(String email) =>
    RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
```

**Detection rule:**
If `pubspec.yaml` has more than 15 direct dependencies, review each for necessity. If a package is imported in only one file and used for a single function call, suspect AP-18. Run `dart pub deps --no-dev` and check for deep transitive dependency trees.

---

### AP-19: Not Handling Navigation and Back Button Properly

**Also known as:** Navigation Amnesia, Double-Pop Bug, Exit-on-Accident
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Not intercepting the back button on critical screens (forms, payment flows), allowing accidental data loss. Not handling deep link navigation state. Using deprecated `WillPopScope` on Flutter 3.12+.

```dart
// BAD: No back button protection on a checkout flow
class CheckoutScreen extends StatefulWidget {
  @override
  _CheckoutScreenState createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  // User has filled in address, payment info, selected shipping...
  // But pressing back just pops the screen with no warning

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Checkout')),
      body: CheckoutForm(),  // No PopScope wrapper!
    );
  }
}
```

**Why developers do it:**

Navigation "just works" by default -- the back button pops the current route. Protecting against accidental back is seen as optional polish rather than critical UX. The migration from `WillPopScope` to `PopScope` in Flutter 3.12 confused many developers, and some skipped back-button handling entirely.

**What goes wrong:**

- Users accidentally lose form data, unsaved edits, or in-progress transactions.
- On Android 13+, the predictive back gesture animation plays even when the pop should be blocked, as documented in Flutter issue #140869 and #139050.
- Deep links that should navigate to a specific screen within a stack instead navigate to the screen with no back stack, trapping the user.
- Double-tapping back on the home screen exits the app without confirmation.

**The fix:**

```dart
// GOOD: PopScope with confirmation dialog (Flutter 3.12+)
class CheckoutScreen extends StatefulWidget {
  @override
  _CheckoutScreenState createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  bool _hasUnsavedChanges = true;

  Future<bool> _confirmDiscard() async {
    if (!_hasUnsavedChanges) return true;
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard changes?'),
        content: const Text('You have unsaved checkout information.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Discard')),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_hasUnsavedChanges,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await _confirmDiscard();
        if (shouldPop && mounted) Navigator.of(context).pop();
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: CheckoutForm(),
      ),
    );
  }
}
```

**Detection rule:**
If a screen handles user input (forms, editors, multi-step flows) but contains no `PopScope` or `WillPopScope` wrapper, suspect AP-19. If `WillPopScope` is used on Flutter 3.12+, it is deprecated and should be migrated to `PopScope`.

---

### AP-20: Using Strings for Everything (No Type Safety)

**Also known as:** Stringly-Typed Code, The Dynamic Map Plague, Type Erasure
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**

Passing data as `Map<String, dynamic>` throughout the app instead of defining typed model classes. Using string literals for routes, event names, and configuration keys.

```dart
// BAD: Stringly-typed data flow
Future<Map<String, dynamic>> fetchUser() async {
  final response = await http.get(Uri.parse('/api/user'));
  return jsonDecode(response.body) as Map<String, dynamic>;
}

// Later in a widget:
Text(userData['name'] as String),           // Typo-prone
Text(userData['adress'] as String),          // Misspelled key -- runtime crash
Text('${userData['age']}'),                  // No type checking

// BAD: String-based navigation
Navigator.pushNamed(context, '/usr/profile'); // Typo -- silent failure
```

**Why developers do it:**

`jsonDecode` returns `Map<String, dynamic>` by default, and it works immediately. Creating model classes for every API response feels like boilerplate. Dynamic typing is faster for prototyping. Coming from JavaScript/Python, developers are accustomed to working with maps and dictionaries.

**What goes wrong:**

- Typos in string keys cause runtime crashes, not compile-time errors: `userData['adress']` returns null silently.
- Refactoring is dangerous: renaming a field requires finding all string references manually; the compiler cannot help.
- No IDE autocomplete for map keys.
- No documentation of data shape -- new developers must read API docs or print the map to understand its structure.
- The `as String` casts sprinkled everywhere are each a potential `TypeError` at runtime.

**The fix:**

```dart
// GOOD: Typed model classes
class User {
  final String name;
  final String email;
  final int age;
  final Address address;

  const User({
    required this.name,
    required this.email,
    required this.age,
    required this.address,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      name: json['name'] as String,
      email: json['email'] as String,
      age: json['age'] as int,
      address: Address.fromJson(json['address'] as Map<String, dynamic>),
    );
  }
}

// Usage: compile-time safety
final user = User.fromJson(jsonData);
Text(user.name);       // Autocomplete, type-safe
Text(user.email);      // Cannot misspell
Text('${user.age}');   // Guaranteed int

// GOOD: Type-safe routing
enum AppRoute { home, profile, settings }
// Or use go_router with typed routes
```

**Detection rule:**
If `Map<String, dynamic>` appears as a parameter type or return type outside of JSON serialization boundaries, suspect AP-20. If string literals are used for route names and appear in more than one file, it is AP-20. If `as String`, `as int`, `as double` casts appear frequently outside `fromJson` factories, it is AP-20.

---

### AP-21: Not Testing Widgets

**Also known as:** The "It Works on My Phone" Syndrome, Test-Free UI, Manual-Only QA
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

An app with zero or near-zero widget tests, relying entirely on manual testing or only unit tests for business logic.

```
# Project structure -- BAD: no widget tests
lib/
  screens/
    home_screen.dart
    profile_screen.dart
    settings_screen.dart
  widgets/
    user_card.dart
    product_tile.dart
test/
  services/
    auth_service_test.dart     # Only service tests exist
    api_client_test.dart
  # No widget tests at all!
```

**Why developers do it:**

Widget tests require wrapping widgets in `MaterialApp`, providing mock dependencies, and calling `pumpAndSettle()` -- setup that feels heavyweight compared to unit tests. Developers assume "if the logic is tested and it looks right on the emulator, it works." Widget test documentation is extensive but intimidating for beginners.

**What goes wrong:**

- Overflow errors on different screen sizes are only caught when users report them.
- State management bugs (wrong widget rebuilding, stale state) are invisible without automated tests.
- Regression bugs appear silently: a refactored widget renders differently but no test catches it.
- Accessibility issues (missing semantics labels, broken screen reader order) are never detected.
- As documented on QuickCoder.org, common pitfalls include overflow errors only appearing in tests (different default test viewport size), animations not triggering without `pump()`, and incorrect finder usage with Material button named constructors.

**The fix:**

Write widget tests for every screen and every reusable widget.

```dart
// GOOD: Widget test
void main() {
  testWidgets('UserCard displays name and email', (tester) async {
    const user = User(name: 'Alice', email: 'alice@example.com');

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: UserCard(user: user)),
      ),
    );

    expect(find.text('Alice'), findsOneWidget);
    expect(find.text('alice@example.com'), findsOneWidget);
  });

  testWidgets('UserCard tap navigates to profile', (tester) async {
    const user = User(name: 'Alice', email: 'alice@example.com');

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: UserCard(user: user)),
        routes: {'/profile': (_) => const ProfileScreen()},
      ),
    );

    await tester.tap(find.byType(UserCard));
    await tester.pumpAndSettle();

    expect(find.byType(ProfileScreen), findsOneWidget);
  });
}
```

**Detection rule:**
If the `test/` directory contains no `*_test.dart` files that import `flutter_test`, suspect AP-21. If the ratio of widget test files to widget files (`lib/widgets/` + `lib/screens/`) is less than 0.3, it is AP-21. If `testWidgets` appears nowhere in the test directory, it is AP-21.

---

## Root Cause Analysis

| Anti-Pattern | Root Cause | Prevention |
|-------------|------------|------------|
| AP-01: God Widget | Laziness / Ignorance | Enforce max widget file length in linter; code review checklist |
| AP-02: Methods not Widgets | Cargo culting from other frameworks | DCM `avoid-returning-widgets` lint rule |
| AP-03: Missing const | Ignorance of Flutter internals | Enable `prefer_const_constructors` lint |
| AP-04: setState for everything | Laziness / Tutorial-driven development | Introduce state management early; architecture templates |
| AP-05: Missing dispose | Ignorance / Forgetfulness | `cancel_subscriptions` and `close_sinks` lints; code review |
| AP-06: Blocking UI thread | Ignorance (async != parallel) | Profile with DevTools; educate on isolates |
| AP-07: GlobalKey overuse | Cargo culting from Form tutorials | Code review; prefer callbacks and state management |
| AP-08: Missing list keys | Ignorance of Flutter reconciliation | Lint for missing keys in list builders |
| AP-09: Context across async | Ignorance / Race condition blindness | `use_build_context_synchronously` lint |
| AP-10: Partial snapshot handling | Laziness / Happy-path development | Template for FutureBuilder/StreamBuilder usage |
| AP-11: Hardcoded dimensions | Laziness / Single-device testing | Test on multiple screen sizes; design review |
| AP-12: Unnecessary rebuilds | Ignorance of rebuild mechanics | Flutter DevTools Rebuild Stats; const widgets |
| AP-13: Logic in widgets | Laziness / Premature shortcuts | Architecture templates; code review for imports |
| AP-14: Futures in build | Copy-paste from AI/Stack Overflow | FutureBuilder lint; code review |
| AP-15: Overusing StatefulWidget | Ignorance / "Just in case" thinking | Start StatelessWidget, convert when needed |
| AP-16: Bang operator abuse | Laziness / Migration shortcuts | Limit `!` per file; code review |
| AP-17: Ignoring platform diffs | Ignorance / Single-platform testing | Test on both platforms; platform checklist |
| AP-18: Package bloat | Laziness / "There's a package for that" | Review pubspec.yaml in PRs; 20-line rule |
| AP-19: Bad navigation handling | Ignorance / "It just works" assumption | Navigation checklist for forms and flows |
| AP-20: Stringly-typed code | Laziness / Prototype not refactored | Enforce model classes; ban `Map<String, dynamic>` outside serialization |
| AP-21: No widget tests | Laziness / "Looks right on emulator" | CI/CD coverage gates; widget test templates |

## Self-Check Questions

1. Does this widget file exceed 200 lines? Should I split it into composed sub-widgets?
2. Am I returning `Widget` from a private method? Should this be a separate `StatelessWidget` class instead?
3. Can I add `const` to this constructor or widget instantiation? If not, why not?
4. Am I using `setState` to manage data that other widgets also need? Should I use a state management solution?
5. For every controller, subscription, timer, or focus node I create in `initState`, do I have a corresponding cleanup in `dispose()`?
6. Will this computation take more than 16ms? Should it run in an `Isolate` instead of the main thread?
7. Am I using `BuildContext` after an `await`? Have I checked `mounted` first?
8. Does my `FutureBuilder`/`StreamBuilder` handle loading, error, and empty-data states, not just the success case?
9. Am I creating a `Future` or `Stream` inside `build()`? Should it be in `initState` instead?
10. Am I using `!` to silence a null warning? Can I handle the null case properly with `??`, `?.`, or a null check?
11. Have I tested this screen on both iOS and Android? On a small screen and a large screen?
12. Could I implement this package's functionality in under 20 lines of Dart?
13. Does this screen with user input have back-button protection (`PopScope`)?
14. Am I passing `Map<String, dynamic>` where a typed model class would provide compile-time safety?
15. Do I have at least one widget test for every screen in this app?

## Code Smell Quick Reference

| If you see... | Suspect... | Verify... |
|---------------|-----------|-----------|
| `build()` method > 80 lines | AP-01: God Widget | Can sub-trees be extracted to separate widget classes? |
| `Widget _build*()` private methods | AP-02: Method not Widget | Replace with `StatelessWidget` class for rebuild optimization |
| Widget constructor without `const` keyword when all args are constant | AP-03: Missing const | Add `const`; enable `prefer_const_constructors` lint |
| `setState` called 5+ times in one State class | AP-04: setState overload | Introduce Provider/Riverpod/BLoC for shared state |
| `TextEditingController()` / `StreamSubscription` without matching `dispose()` | AP-05: Missing dispose | Add `dispose()` with cleanup for every resource |
| Loops, JSON parsing, or file I/O inside `build()` | AP-06: UI thread blocked | Move to `Isolate.run()` or `compute()` |
| `GlobalKey()` inside `build()` | AP-07: GlobalKey in build | Move to field or `initState`; prefer callbacks |
| `ListView.builder` items without `key:` parameter | AP-08: Missing keys | Add `ValueKey(item.id)` with stable identifier |
| `context` used after `await` without `mounted` check | AP-09: Stale context | Add `if (!mounted) return;` after every `await` |
| `FutureBuilder` without `ConnectionState.waiting` check | AP-10: Partial state handling | Handle waiting, error, no-data, and success states |
| Literal numbers > 100 for width/height | AP-11: Hardcoded dimensions | Use `LayoutBuilder`, `MediaQuery`, or `Flexible` |
| `setState` modifies 1 field but `build()` creates 10+ widgets | AP-12: Rebuild avalanche | Push state down to smallest widget; use `const` children |
| Widget importing `http`, `dart:convert`, database packages | AP-13: Logic in widget | Extract to service/repository class |
| `FutureBuilder(future: fetchData(),` inside `build()` | AP-14: Future in build | Create Future in `initState`, reference it in builder |
| `StatefulWidget` with no mutable fields in State | AP-15: Unnecessary StatefulWidget | Convert to `StatelessWidget` |
| Multiple `!` operators on same line | AP-16: Bang abuse | Use `?.`, `??`, null checks, or early return |
| No `Platform.isIOS` / `SafeArea` in cross-platform app | AP-17: Platform blindness | Test on both platforms; add platform-specific handling |
| 15+ dependencies in `pubspec.yaml` | AP-18: Package bloat | Review each: can it be implemented in < 20 lines? |
| Form screen without `PopScope` wrapper | AP-19: Unprotected navigation | Add `PopScope` with confirmation dialog |
| `Map<String, dynamic>` passed between methods | AP-20: Stringly-typed | Create typed model class with `fromJson` factory |
| No `testWidgets` in test directory | AP-21: No widget tests | Add widget tests for screens and reusable widgets |

---

*Researched: 2026-03-08 | Sources: [Flutter Performance Best Practices](https://docs.flutter.dev/perf/best-practices), [DCM Anti-Patterns](https://dartcodemetrics.dev/docs/anti-patterns), [DCM: Memory Leaks in Dart and Flutter](https://dcm.dev/blog/2024/10/21/lets-talk-about-memory-leaks-in-dart-and-flutter/), [DCM: 15 Common Mistakes](https://dcm.dev/blog/2025/03/24/fifteen-common-mistakes-flutter-dart-development/), [Splitting Widgets to Methods is an Anti-Pattern (Iiro Krankka)](https://iiro.dev/splitting-widgets-to-methods-performance-antipattern/), [Flutter Widget Rebuild Optimization](https://763p.me/blog/2025/09/28/mastering-flutter-rebuild-optimization-eliminating-unnecessary-widget-rebuilds/), [Flutter Concurrency and Isolates](https://docs.flutter.dev/perf/isolates), [Flutter GlobalKey Documentation](https://api.flutter.dev/flutter/widgets/GlobalKey-class.html), [Flutter GlobalKey Performance Issue #35730](https://github.com/flutter/flutter/issues/35730), [FutureBuilder Common Mistakes](https://medium.com/@wartelski/futurebuilder-in-flutter-mistakes-you-might-be-making-e97209f66c2f), [BuildContext Across Async Gaps](https://dart.dev/tools/linter-rules/use_build_context_synchronously), [Flutter PopScope Breaking Changes](https://docs.flutter.dev/release/breaking-changes/android-predictive-back), [PopScope Issue #140869](https://github.com/flutter/flutter/issues/140869), [Flutter Architecture Guide](https://docs.flutter.dev/app-architecture/guide), [Effective Dart: Design](https://dart.dev/effective-dart/design), [Widget Testing Introduction](https://docs.flutter.dev/cookbook/testing/widget/introduction), [Widget Testing Pitfalls (QuickCoder)](https://quickcoder.org/a-short-excursion-into-the-pitfalls-of-flutter-widget-testing/), [Stop Doing These Flutter Performance Mistakes (2026)](https://medium.com/@tiger.chirag/stop-doing-these-flutter-performance-mistakes-2026-edition-79cae09d5f22), [Flutter State Management Guide (2026)](https://medium.com/@satishparmarparmar486/the-ultimate-guide-to-flutter-state-management-in-2026-from-setstate-to-bloc-riverpod-561192c31e1c), [Flutter Responsive Design](https://docs.flutter.dev/ui/adaptive-responsive/general)*
