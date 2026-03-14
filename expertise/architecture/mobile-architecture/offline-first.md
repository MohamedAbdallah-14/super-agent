# Offline-First Architecture — Architecture Expertise Module

> Offline-first design treats network connectivity as an enhancement, not a requirement. The app works fully offline with local data, syncing when connectivity is available. Critical for mobile apps in areas with poor connectivity, field service apps, and any app where users expect instant response regardless of network state.

> **Category:** Mobile Architecture
> **Complexity:** Complex
> **Applies when:** Mobile or web apps that must work without network connectivity, apps used in low-connectivity environments, apps where instant response time is critical

---

## What This Is (and What It Isn't)

### The Spectrum of Offline Support

Offline capability is not binary. There is a spectrum of approaches, each with different tradeoffs, and conflating them is the root of most confusion in this space.

**Online-with-cache** — The app is designed for online use. A cache (in-memory, disk, or HTTP cache) stores recent responses so that if the network disappears briefly, the user sees stale data instead of a blank screen. The cache is a performance optimization, not a design principle. Writes fail when offline. Examples: most REST-consuming mobile apps with HTTP caching enabled, apps that show "last loaded 5 minutes ago" banners.

**Offline-capable** — The app is designed for online use but has explicit provisions for offline scenarios. A local database stores a working subset of data. Writes are queued when offline and replayed when connectivity returns. The local store is not the source of truth — the server is. The local store is a staging area. Conflict resolution is typically simple (last-write-wins or server-wins). Examples: Gmail offline mode, Slack's message queue, most enterprise mobile apps.

**Offline-first** — The app is designed to work without a network from day one. The local database is the primary source of truth for the user's device. The network is a synchronization mechanism, not a data source. Reads and writes always hit the local store first. Sync happens in the background when connectivity is available. The UI never shows a loading spinner for local data. Conflict resolution is a first-class architectural concern, not an edge case. Examples: Notion (post-2024 offline rewrite), Linear, Apple Notes, Things 3.

**Local-first** — A philosophical extension of offline-first articulated by Ink & Switch in their 2019 essay "Local-first software: you own your data, in spite of the cloud." Local-first adds ownership and longevity guarantees: the user's data is stored in open formats on their device, collaboration happens via CRDTs or similar mechanisms, and the software's death does not mean the data's death. The seven ideals defined by Ink & Switch are: no spinners (instant reads/writes against local DB), data is not trapped (exportable, open formats), network is optional (full functionality offline), seamless collaboration (real-time co-editing when online), long-term preservation (data survives the software), security and privacy (encryption at rest on client), and user control (you decide what syncs and when). Examples: Obsidian, Excalidraw, Linear, apps built on Automerge or Yjs.

### Core Mechanisms

**Local storage as primary.** Every read and write operation hits the local database first. The UI renders from local state. There is no "loading" state for local data — it is always available, always fast. The local database is SQLite, Isar, Hive, Realm, IndexedDB, or a similar embedded store. The choice matters — see the Technology Landscape section.

**Sync queue.** Writes made while offline (or while online, for optimistic UI) are recorded in a persistent queue. Each entry captures the operation type, the entity, the payload, a timestamp, and a unique operation ID. When connectivity returns, the queue is drained in order. Failed syncs are retried with exponential backoff. The queue must survive app restarts — it is persisted alongside the local database.

**Conflict resolution.** When two devices (or a device and the server) modify the same entity independently, the system must decide what the final state is. This is the hardest problem in offline-first architecture by a wide margin. Strategies range from trivially simple (last-write-wins) to mathematically guaranteed (CRDTs). The right choice depends on the domain. See "How It Works" for a detailed breakdown.

**Optimistic UI.** The user interface reflects local changes immediately, before sync confirms them. The user taps "complete task" and sees it completed instantly. If sync later fails or reveals a conflict, the UI updates to reflect the resolved state. This requires careful design: the user must understand that what they see is the local state, and that corrections may occur. Poorly implemented optimistic UI creates a sense of unreliability when the UI "jumps" after sync.

**Connectivity awareness.** The app monitors network state and adjusts behavior accordingly. Online: sync immediately, prefetch data, resolve pending conflicts. Offline: queue writes, serve from local store, suppress features that require the network (e.g., sharing, invitations). Transitioning: drain the sync queue, reconcile state, update UI with any server-side changes.

### What It Is Not

**Not a caching strategy.** Caching is a performance optimization that stores copies of server data. Offline-first is an architectural paradigm where the local store is the authority. The distinction matters: a cache can be invalidated and rebuilt from the server. An offline-first local store contains data that may not exist anywhere else until sync completes.

**Not just "save to local DB."** Storing data locally is necessary but insufficient. Without a sync queue, conflict resolution, connectivity awareness, and careful state management, you have offline storage, not offline-first architecture.

**Not free of server-side concerns.** The server still matters. It is the reconciliation point, the backup, the collaboration hub, and the access control authority. Offline-first shifts complexity from "how do I make the server respond fast" to "how do I reconcile divergent states."

---

## When to Use It

### The Qualifying Conditions

Apply offline-first architecture when **two or more** of these conditions hold:

**Users operate in unreliable network environments.** Field service workers, construction site inspectors, healthcare professionals in rural clinics, delivery drivers, agricultural workers — anyone who routinely enters areas with no cellular coverage or unreliable Wi-Fi. An online-only app is a non-functional app for these users. A 2024 study found that globally, 37% of mobile usage occurs in environments with intermittent or absent connectivity.

**Instant response time is a hard requirement.** Users expect sub-100ms response to every interaction. Network round-trips — even on fast connections — add 50-300ms of latency. Offline-first eliminates this entirely for reads and writes against local data. Linear's IndexedDB-first architecture achieves consistent sub-100ms interaction times because every operation hits local storage before the network.

**Data must not be lost due to connectivity failure.** A field inspector completes a 30-minute inspection form, walks to a basement with no signal, and taps "submit." If that data is lost, the inspection must be repeated. Offline-first guarantees that writes are persisted locally first and synced later. The sync queue ensures no operation is lost.

**The app is used across multiple devices.** A user edits a document on their laptop, closes it, and opens it on their phone. Both devices have local copies. Offline-first with proper sync ensures both devices converge to the same state. Without offline-first, one device's changes may overwrite the other's.

**Users work in long sessions without connectivity.** A researcher on a ship, a geologist in the field, a pilot on a long-haul flight. These users need full app functionality for hours or days without connectivity, then sync when they return.

### Real-World Examples

**Notion's offline rewrite (2024).** Notion spent years building offline support because their data model — a graph of interconnected blocks rather than simple page documents — made offline exceptionally complex. Their solution uses SQLite to cache records locally, a push-based update system wired into their page version snapshot mechanism, and a forest of offline page trees that track why each page is kept available offline. Each client tracks a `lastDownloadedTimestamp` per page, and on reconnect, only pages where the server version is newer are fetched. This is a textbook example of how online-first apps can be retrofitted with offline support, and how painful that retrofit is — it took years.

**Linear's local-first architecture.** Linear stores all data in IndexedDB on the client. The UI renders from local state. Changes are synced to the server via a custom sync protocol. The result is an app that feels instantaneous regardless of network conditions. Linear's architecture influenced the broader local-first movement and demonstrated that complex project management tools could work offline without sacrificing collaboration.

**Google Docs offline mode.** Google Docs uses a combination of Service Workers and IndexedDB to enable offline editing. Changes made offline are stored as operations (operational transformation) and replayed when connectivity returns. The conflict resolution uses operational transformation (OT) rather than CRDTs, which requires a central server to linearize operations — making it offline-capable rather than truly offline-first.

**Apple Notes and Reminders.** Apple's built-in apps are fully offline-first. Data is stored in a local SQLite database. iCloud sync happens in the background using CloudKit. Conflict resolution uses a combination of last-write-wins for simple fields and field-level merging for structured data. The user never sees a loading spinner for their own notes.

**Field service applications.** Apps like ServiceMax, Salesforce Field Service, and custom-built inspection tools are canonical offline-first use cases. A field technician downloads their work orders before leaving the office, completes inspections in areas with no connectivity, captures photos and signatures, and syncs everything when they return to coverage. The sync queue for these apps can contain hundreds of operations accumulated over an 8-hour shift.

**PouchDB/CouchDB ecosystem.** PouchDB (a JavaScript clone of CouchDB) popularized offline-first in web apps. The bidirectional replication protocol between PouchDB (client) and CouchDB (server) handles sync automatically: continuous, live replication propagates changes as they occur, and the retry option handles network failures gracefully. Healthcare apps, logistics tools, and humanitarian aid apps in developing regions have used this stack extensively.

---

## When NOT to Use It

This section is equally important. Offline-first architecture introduces substantial complexity that is unjustified for many applications. Most teams underestimate the cost of conflict resolution by a factor of 10.

### The Disqualifying Conditions

**Real-time collaborative editing without CRDTs is nearly impossible offline.** If your app requires multiple users to simultaneously edit the same document or entity in real-time, and you are not using CRDTs or Operational Transformation, offline-first will produce irreconcilable conflicts. Two users editing the same paragraph offline will produce two divergent versions that no simple merge strategy can reconcile without data loss. Even with CRDTs, real-time collaborative text editing is a deeply specialized problem — Yjs and Automerge exist precisely because building this from scratch takes years. If you are building a collaborative editor, use an existing CRDT library or do not go offline-first.

**Financial transactions requiring strong consistency.** A payment processor cannot optimistically accept a payment offline and hope it succeeds later. Double-spending, insufficient funds, and fraud detection all require server-side validation before the transaction is confirmed. Banking apps can show cached balances offline, but they cannot process transfers. Offline-first is wrong for the write path of financial transactions. Showing stale read data with clear "as of" timestamps is acceptable; executing financial operations offline is not.

**Applications with tiny datasets that change infrequently.** A settings screen with 5 toggles does not need offline-first architecture. A simple HTTP cache or SharedPreferences/UserDefaults store is sufficient. If the entire dataset fits in a single API response and changes once a week, the machinery of sync queues, conflict resolution, and connectivity monitoring is pure overhead.

**Apps where server-side validation is the core value.** A fraud detection dashboard, a real-time stock trading platform, a live auction system — these apps exist to show the latest server-side state. Showing stale data is worse than showing nothing. Offline-first would display data that is not just stale but actively misleading.

**Applications where data sovereignty prevents local storage.** Some healthcare, government, and financial applications are subject to regulations that prohibit storing sensitive data on user devices. HIPAA, GDPR right-to-deletion, and certain defense regulations may conflict with local-first data storage. If the data cannot legally reside on the device, offline-first is not an option without additional encryption and compliance infrastructure.

**Teams without the engineering capacity for conflict resolution.** This is the most honest disqualifying condition. Conflict resolution is hard. Not "we'll figure it out" hard — "this is a research-level problem that PhD theses are written about" hard. Cinapse, a note-taking app, publicly documented why they moved away from CRDTs for sync: the complexity of handling edge cases, the difficulty of debugging merge behavior, and the cognitive overhead of reasoning about concurrent state were unsustainable for their team size. If your team cannot dedicate sustained engineering effort to conflict resolution, use an offline-capable approach (server-wins, simple queue) rather than a full offline-first architecture.

**Prototypes and MVPs.** The complexity overhead of offline-first can triple development time for early-stage products. Validate the product idea online-first, then add offline support when the product-market fit is proven and the offline use case is validated with real users.

### The Complexity Tax

Teams consistently underestimate the ongoing cost of offline-first:

- **Testing is exponentially harder.** You must test every feature in online mode, offline mode, transitioning-to-offline mode, transitioning-to-online mode, and conflicting-edits mode. The test matrix grows multiplicatively.
- **Debugging is non-local.** A bug may only manifest when device A edits offline, device B edits online, device A comes back online, and the merge produces an unexpected state. Reproducing this requires multi-device orchestration.
- **Schema migrations affect both server and client.** Adding a field requires migrating the server database, the client database, the sync protocol, and the conflict resolution logic. A single schema change touches four subsystems.
- **User expectations are hard to set.** Users do not naturally understand that their device may show a different state than another device. "I edited this on my phone but my laptop shows the old version" is a support ticket that no amount of UI design fully prevents.

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                       │
│         (renders from local state only)          │
└──────────────────────┬──────────────────────────┘
                       │ reads / writes
                       ▼
┌─────────────────────────────────────────────────┐
│              Repository Layer                    │
│     (abstracts local + remote data sources)      │
└────────┬─────────────────────────────┬──────────┘
         │                             │
         ▼                             ▼
┌─────────────────┐          ┌─────────────────────┐
│  Local Database  │          │    Sync Engine       │
│  (SQLite/Isar/   │          │  ┌───────────────┐   │
│   Hive/IndexedDB)│          │  │  Sync Queue    │   │
│                  │◄────────►│  │  (persistent)  │   │
│  Source of truth │          │  └───────────────┘   │
│  for this device │          │  ┌───────────────┐   │
│                  │          │  │  Conflict      │   │
│                  │          │  │  Resolver      │   │
│                  │          │  └───────────────┘   │
│                  │          │  ┌───────────────┐   │
│                  │          │  │  Connectivity  │   │
│                  │          │  │  Monitor       │   │
│                  │          │  └───────────────┘   │
└─────────────────┘          └──────────┬──────────┘
                                        │
                                        ▼
                             ┌─────────────────────┐
                             │   Remote Server      │
                             │   (API + Database)   │
                             │   Central truth for  │
                             │   reconciliation     │
                             └─────────────────────┘
```

### Local Storage Layer

The local database is the foundation. Every read and write hits this store first. The choice of database technology depends on the platform and data complexity.

**SQLite** is the most battle-tested option. It handles relational data, complex queries, transactions, and large datasets. On mobile, it is the default for structured data (via `sqflite` on Flutter, Room on Android, Core Data on iOS). On web, it runs via WebAssembly (sql.js, wa-sqlite). Drift (formerly Moor) provides a type-safe Dart wrapper for SQLite on Flutter with reactive streams, migrations, and compile-time query verification.

**Isar** is a high-performance NoSQL database for Flutter. It supports complex queries, indexes, full-text search, and relationships. Writing 1000 objects in a batch takes approximately 8ms. Isar is ideal for apps with complex query patterns that do not need relational integrity. Note: as of 2025, Isar's maintenance status should be verified before adoption in new projects.

**Hive** is a lightweight pure-Dart key-value store. It is fast for simple reads/writes, has minimal setup, and works across all Flutter platforms. It is not suitable for complex queries, relationships, or large datasets. Use Hive for user preferences, session data, and cached API responses — not as the primary store for a complex offline-first app.

**IndexedDB** is the standard for web-based offline-first apps. Linear, Notion, and Figma all use IndexedDB as their local store. It is a NoSQL object store with indexes, transactions, and large storage capacity (typically hundreds of MB to GB depending on browser). The API is callback-based and awkward; libraries like Dexie.js provide a cleaner interface.

**A hybrid approach** is common in production: use SQLite/Drift for structured business data and Hive for lightweight caches and preferences. This avoids forcing all data through a single storage paradigm.

### Sync Queue

The sync queue is the mechanism that ensures no write is lost. Every mutation (create, update, delete) is recorded in the queue before being applied to the local database.

```
┌──────────────────────────────────────────────────────┐
│                    Sync Queue Entry                   │
├──────────────────────────────────────────────────────┤
│  id:           UUID (unique per operation)            │
│  entity_type:  "task" | "document" | "inspection"    │
│  entity_id:    UUID of the affected entity            │
│  operation:    "create" | "update" | "delete"         │
│  payload:      JSON of the changed fields             │
│  timestamp:    ISO 8601 with device clock              │
│  logical_clock: Lamport timestamp or vector clock      │
│  retry_count:  Number of failed sync attempts          │
│  status:       "pending" | "syncing" | "failed"       │
│  device_id:    UUID identifying this device            │
└──────────────────────────────────────────────────────┘
```

**Queue processing rules:**

1. Operations are processed in FIFO order per entity. Global ordering is not required — operations on unrelated entities can sync in parallel.
2. Failed operations are retried with exponential backoff: 1s, 2s, 4s, 8s, up to a maximum of 5 minutes.
3. After N consecutive failures (typically 5-10), the operation is moved to a "dead letter" queue for manual resolution or user notification.
4. The queue must be durable — persisted in the same local database as the application data, within a transaction. If the app crashes after a write but before queuing the sync, the write and the queue entry must both roll back.
5. Compaction: if the same entity is updated multiple times while offline, the queue can compact intermediate updates into a single operation. This reduces sync traffic but loses the intermediate history. Whether to compact depends on whether the server needs the full operation history.

### Conflict Resolution Strategies

This is the core intellectual challenge of offline-first. When two devices modify the same entity independently, the system must produce a deterministic, sensible result.

**Last-Write-Wins (LWW).** The operation with the latest timestamp wins. Simple to implement, easy to reason about, and acceptable for many use cases. The critical weakness: it silently discards data. If device A sets a task title to "Fix bug" and device B sets it to "Fix critical bug," LWW keeps one and discards the other without telling anyone. LWW requires synchronized clocks — if device A's clock is 5 minutes ahead, its writes always win regardless of actual chronology. Use LWW for non-critical fields where the latest value is genuinely the "right" one: user preferences, status fields, toggles.

**Server-Wins.** The server's version always takes precedence. Client changes are proposals, not facts. Simple, predictable, and appropriate when the server has more context (e.g., it has validated the data, applied business rules, or received input from an authoritative source). The downside: the user's local changes may be silently overwritten after sync, which feels like data loss.

**Client-Wins.** The local change always takes precedence. The server accepts whatever the client sends. Simple, but dangerous in multi-device scenarios — the last device to sync wins, which may not be the device with the most recent intentional edit.

**Field-Level Merge.** Instead of treating the entire entity as the unit of conflict, merge at the field level. If device A changes the title and device B changes the description, keep both changes. Conflicts only arise when two devices change the same field. This is substantially better than entity-level LWW and is the sweet spot for most business applications. Implementation: track changed fields per operation in the sync queue, and merge non-conflicting field changes on the server.

**Three-Way Merge.** Compare both versions against the common ancestor (the last synced state). Changes relative to the ancestor are identified for each device, and non-conflicting changes are merged automatically. Conflicting changes (same field changed differently relative to ancestor) are flagged for manual resolution or LWW fallback. This is how Git merge works, and it is effective for structured data.

**CRDTs (Conflict-Free Replicated Data Types).** CRDTs are data structures that are mathematically guaranteed to converge to the same state when all operations are applied, regardless of the order in which they are received. No central coordinator is required. Operations can be applied offline, concurrently, out of order — convergence is guaranteed by the data structure's algebraic properties.

Key CRDT types:
- **G-Counter** (Grow-only counter): Each node maintains its own counter; the merged value is the sum of all nodes. Used for: view counts, like counts.
- **PN-Counter** (Positive-Negative counter): Two G-Counters — one for increments, one for decrements. The value is the difference. Used for: inventory counts, vote tallies.
- **LWW-Register**: A single value with a timestamp. Last write wins. The simplest CRDT — effectively LWW with formal guarantees.
- **OR-Set** (Observed-Remove Set): Elements can be added and removed. Concurrent add and remove of the same element resolves in favor of the add (add-wins semantics). Used for: tag sets, member lists.
- **RGA** (Replicated Growable Array): An ordered sequence that supports concurrent inserts and deletes. Used by Automerge for text and list data.
- **YATA** (Yet Another Transformation Approach): Yjs's algorithm for concurrent text editing. Each peer maintains its own monotonically incrementing counter. More performant than RGA for large documents.

CRDT tradeoffs: guaranteed convergence, no coordination required, works offline and in peer-to-peer scenarios. But: increased memory usage (metadata overhead), eventual consistency only (no strong consistency), limited data model expressiveness (not everything maps naturally to a CRDT), and debugging merged state is notoriously difficult.

**Manual resolution.** Present conflicting versions to the user and let them choose. This is the "nuclear option" — it always produces the correct result (the user decides) but destroys the seamless experience. Use manual resolution as the fallback when automated strategies cannot produce a sensible result, typically for high-value entities like documents or contracts.

### Sync Protocols

**Full sync** downloads the entire dataset on every sync. Simple, but scales poorly. Acceptable for small datasets (< 1000 entities, < 1MB total) or initial sync after a fresh install.

**Delta sync** only transfers changes since the last sync point. The client sends its last sync timestamp or version token; the server returns only entities modified after that point. This is the standard approach for production offline-first apps. Implementation requires the server to track modification timestamps or version numbers for every entity, and to support a "changes since" query pattern. AWS AppSync's Delta Sync is a well-documented implementation of this pattern.

**Version vectors** extend delta sync to multi-device scenarios. Instead of a single timestamp, each device maintains a vector of `{device_id: last_known_version}` pairs. When syncing, the device sends its version vector; the server computes the set difference and returns only the operations the device has not seen. Version vectors correctly handle the case where device A syncs with the server, then device B syncs, then device A syncs again — each device receives exactly the updates it missed.

**Operation-based sync (event sourcing)** transmits the operations themselves rather than the resulting state. The client sends "user changed title from X to Y" rather than "the current title is Y." The server applies operations in causal order to reconstruct the state. This preserves the full history of changes and enables sophisticated conflict resolution (e.g., rebasing operations on top of concurrent changes). This is how Google Docs (via OT), Figma, and Linear handle sync. The tradeoff is increased complexity and storage for the operation log.

**CouchDB replication protocol** is a purpose-built sync protocol for offline-first. PouchDB implements it in JavaScript. The protocol handles bidirectional, continuous, incremental replication between a local and remote database. It tracks changes via a sequence number, transfers only modified documents, and includes built-in conflict detection (though resolution is left to the application). It is the most mature, battle-tested offline sync protocol available.

### Connectivity Monitoring

```
enum ConnectivityState {
  online,        // Full connectivity, sync active
  degraded,      // Connectivity present but slow/unreliable
  offline,       // No connectivity, queuing all writes
  syncing,       // Transitioning: draining sync queue
}
```

The app must react to connectivity changes:

- **Online -> Offline:** Stop sync attempts, begin queuing writes, notify the user (subtly — a small banner, not a modal).
- **Offline -> Online:** Begin draining the sync queue, fetch server-side changes, reconcile state, update UI reactively.
- **Degraded:** Reduce sync frequency, increase timeouts, prioritize critical operations (creates over updates).

Platform-specific connectivity APIs: `connectivity_plus` on Flutter, `ConnectivityManager` on Android, `NWPathMonitor` on iOS, `navigator.onLine` + Service Worker on web. None of these are fully reliable — `navigator.onLine` only detects whether the device has a network interface, not whether it can reach the server. Production apps should supplement platform APIs with periodic server pings.

---

## Trade-Offs Matrix

| Dimension | Offline-First Benefit | Offline-First Cost |
|---|---|---|
| **Response time** | Sub-100ms for all local operations. No spinners for reads/writes. | Initial sync can be slow for large datasets (seconds to minutes). |
| **Data availability** | Full functionality without network. Users are never blocked. | Local storage limits (mobile typically 50-500MB practical). Stale data risk. |
| **User experience** | Instant, responsive, feels "native." No network-dependent loading states. | Optimistic UI can "jump" when sync corrects local state. Confusing for users. |
| **Data integrity** | Writes never lost — persisted locally before sync. | Conflict resolution can silently discard data (LWW) or produce unexpected merges. |
| **Development cost** | Forces clean data layer separation. Repository pattern is well-structured. | 2-5x development time vs. online-only. Sync engine is a product unto itself. |
| **Testing burden** | Local-only tests are fast and deterministic. | Must test online/offline/transitioning/conflicting states. Test matrix explodes. |
| **Server simplicity** | Server can be simpler (no real-time requirements if sync is batch). | Server must support delta queries, conflict detection, version tracking. |
| **Multi-device sync** | Seamless cross-device experience when working. | Conflicts between devices are the hardest class of bugs to debug. |
| **Scalability** | Reduced server load — clients self-serve from local store. | Each client carries storage and compute overhead. Migration affects all clients. |
| **Schema evolution** | N/A | Schema changes require coordinated migration of server DB, client DB, sync protocol, and conflict resolution logic. |
| **Onboarding** | N/A | New developers must understand the sync engine, conflict resolution, and dual-database architecture. Steep learning curve. |
| **Operational cost** | Fewer API calls reduce server infrastructure cost. | Client-side bugs are harder to diagnose remotely. Sync failures require per-device investigation. |

---

## Evolution Path

### Level 0: Online-Only

The app requires network for all operations. No local persistence beyond ephemeral in-memory state.

```
UI → API → Server DB
```

Move to Level 1 when: users complain about loading times, the app is unusable on slow networks, or basic data should be viewable without waiting.

### Level 1: Cache Layer

Add HTTP caching or a simple local cache. Reads can be served from cache when the network is unavailable. Writes still require the network.

```
UI → Cache? → API → Server DB
```

Technologies: HTTP cache headers, `shared_preferences`, simple key-value stores.
Move to Level 2 when: users need to perform writes offline, or the cache invalidation logic becomes complex.

### Level 2: Offline-Capable (Queue + Simple Sync)

Add a local database and a sync queue. Reads and writes hit the local store. Writes are queued and synced when online. Conflict resolution is server-wins or LWW.

```
UI → Repository → Local DB ←→ Sync Queue ←→ API → Server DB
```

Technologies: SQLite/Drift, simple REST-based sync, timestamp-based delta queries.
Move to Level 3 when: multi-device conflicts are causing data loss, users need guaranteed convergence, or the app requires real-time collaboration.

### Level 3: Offline-First (Full Sync Engine)

A dedicated sync engine handles bidirectional synchronization, field-level conflict resolution, version vectors, and optimistic UI with rollback. The local database is the device's source of truth.

```
UI → Repository → Local DB ←→ Sync Engine (queue + resolver + monitor) ←→ API → Server DB
```

Technologies: Custom sync engine or PowerSync/ElectricSQL, field-level merge, three-way merge.
Move to Level 4 when: peer-to-peer sync is needed, the app requires guaranteed convergence without a central server, or the team wants to eliminate server-side conflict resolution entirely.

### Level 4: Local-First (CRDTs + P2P)

Data is stored in CRDT structures that merge automatically. Sync can happen peer-to-peer or via a server. No central authority is required for conflict resolution. The server is optional — it serves as a backup and relay, not an authority.

```
UI → CRDT Document → Local Store ←→ Sync (P2P / Server) ←→ Other Devices
```

Technologies: Automerge, Yjs, Loro, custom CRDTs.

---

## Failure Modes

These are the ways offline-first architectures break in production. Each is drawn from real incidents.

### Sync Conflicts Destroying Data

**The scenario:** Two users edit the same entity offline. User A changes the title to "Q4 Report." User B changes the title to "Q4 Report — FINAL." Both sync. LWW keeps one title and silently discards the other. Neither user is notified. User A's title disappears.

**Why it happens:** LWW is the default because it is easy to implement. Teams ship it intending to "improve later" and never do.

**Mitigation:** Use field-level merge at minimum. Log all conflict resolutions with both versions. Provide a conflict history UI for high-value entities. Alert users when their changes were overridden by a sync.

### Storage Limits Exceeded

**The scenario:** A field worker's app downloads inspection templates, photos, and historical data. After two weeks of offline use, the local database exceeds the device's storage allocation. The app crashes. Queued sync operations are lost if the queue was in the same database that exceeded its limit.

**Why it happens:** Mobile storage is finite. iOS aggressively reclaims storage from apps under pressure. Browser storage (IndexedDB) has quotas that vary by browser and can be evicted without warning in some contexts (Safari private browsing).

**Mitigation:** Implement storage budgets with LRU eviction for non-essential data. Separate the sync queue from the main data store so that sync operations survive data eviction. Monitor storage usage and warn users before limits are reached. Compress stored data. Implement a tiered storage strategy: keep critical data (sync queue, active entities) in guaranteed storage; keep historical data in evictable cache.

### Stale Data Displayed as Current

**The scenario:** A user checks inventory levels offline. The display shows 50 units available — but another user sold 40 units while the first user was offline. The first user promises a customer 45 units. The inventory is actually 10.

**Why it happens:** Offline-first shows local state, which may be arbitrarily stale. The staleness is invisible unless the UI explicitly communicates it.

**Mitigation:** Always display "last synced" timestamps on data that may be stale. For critical data (inventory, pricing, availability), add prominent staleness warnings when data is older than a threshold. Consider making some data read-only when offline to prevent decisions based on stale information.

### Sync Queue Growing Unbounded

**The scenario:** A user works offline for a week. The sync queue accumulates 10,000 operations. When connectivity returns, draining the queue takes 30 minutes, during which the app is sluggish. Some operations fail because the server-side entities they reference were deleted by another user. The failure handling for 500 operations blocks the queue.

**Why it happens:** Sync queues are designed for minutes of offline use, not days. Queue processing is typically sequential and blocking.

**Mitigation:** Implement queue compaction (collapse multiple updates to the same entity into one). Process the queue in parallel for independent entities. Set queue size limits with user warnings. Implement "soft delete" on the server so that references to deleted entities can be resolved gracefully. Add progress UI for long sync operations.

### Clock Skew Breaking LWW

**The scenario:** Device A's clock is set 10 minutes into the future (common on devices with manual clock settings or poor NTP sync). Every edit from device A appears to be 10 minutes "newer" than edits from device B, even when device B's edit was made later in real time. Device A's edits always win in LWW resolution.

**Why it happens:** LWW depends on synchronized clocks. Device clocks are not reliably synchronized.

**Mitigation:** Use logical clocks (Lamport timestamps or vector clocks) instead of wall-clock time. If wall-clock time is used, include a server-assigned timestamp as a tiebreaker. Hybrid Logical Clocks (HLCs) combine wall-clock time with logical counters to provide causally consistent ordering even with clock skew.

### Partial Sync Corruption

**The scenario:** The sync process is interrupted (app backgrounded, network drops mid-request). Half of the pending operations were synced; half were not. The server has a partially updated state. The client retries, but some operations are now duplicates.

**Why it happens:** Sync operations are not atomic across client and server.

**Mitigation:** Make every sync operation idempotent using unique operation IDs. The server must check whether an operation ID has already been processed before applying it. Use transactional batches when possible — sync a group of related operations atomically. Implement a sync checkpoint that both client and server agree on, so that interrupted syncs can resume from the last checkpoint.

---

## Technology Landscape

### Local Databases

| Technology | Platform | Type | Query Capability | Best For |
|---|---|---|---|---|
| **SQLite** (via sqflite/Drift) | Flutter, Android, iOS, Web (WASM) | Relational | Full SQL, joins, transactions | Complex relational data, large datasets |
| **Isar** | Flutter | NoSQL | Indexes, composite queries, full-text search | High-performance Flutter apps with complex queries |
| **Hive** | Flutter (pure Dart) | Key-Value | Basic key lookup | Preferences, caches, simple data |
| **Realm** | Android, iOS, React Native, Flutter | Object DB | Object queries, relationships | Cross-platform apps needing built-in sync (MongoDB Atlas) |
| **IndexedDB** | Web | NoSQL Object Store | Indexes, key ranges, cursors | Web offline-first (Linear, Notion, Figma) |
| **WatermelonDB** | React Native | Relational (SQLite-backed) | Reactive queries, lazy loading | Large React Native apps with 10K+ records |
| **ObjectBox** | Flutter, Android, iOS | Object DB | Dart/Kotlin/Swift-native queries | Edge/IoT apps, very fast CRUD |

### Sync Frameworks

| Technology | Approach | Conflict Resolution | Platform | Maturity |
|---|---|---|---|---|
| **PowerSync** | Server-authoritative, SQLite on client | Server-wins with client rollback | Flutter, React Native, Web | Production (2024+) |
| **ElectricSQL** | Local-first, Postgres-backed | CRDT-inspired (finality of writes) | Web, React Native | Rebuilt in 2024, growing |
| **CouchDB/PouchDB** | Multi-master replication | Revision tree, app-defined resolution | Web, Node.js | Mature (10+ years) |
| **Realm Sync** (MongoDB Atlas) | Object-level sync | Field-level LWW | React Native, Flutter, native | Mature |
| **Firebase/Firestore** | Cloud-first with offline cache | Server-wins (last write) | Flutter, Web, native | Mature but not truly offline-first |
| **Supabase** | Postgres with real-time | No built-in offline sync (community solutions) | Web, Flutter | Limited offline support |

### CRDT Libraries

| Library | Language | Algorithm | Best For | Considerations |
|---|---|---|---|---|
| **Automerge** | JS/Rust (WASM) | RGA for sequences, LWW for registers | Document-based apps, JSON data | WASM memory limits for very large docs |
| **Yjs** | JavaScript | YATA for text, custom for other types | Collaborative text editing, real-time | Fastest for text; large community |
| **Loro** | Rust (WASM) | Fugue for text, custom for tree/list | Next-gen CRDT apps, rich data structures | Newer but promising (2024+) |
| **Synk** | Kotlin Multiplatform | Various | Kotlin/Android offline-first | Emerging, KMP-focused |
| **RxDB** | JavaScript | CRDT plugin + various backends | Reactive web/mobile apps | Combines CRDT with reactive queries |
| **diamond-types** | Rust | Fugue | High-performance text editing | Research-quality, very fast |

---

## Decision Tree

```
START: Does your app need to work without network?
│
├─ NO → Do users complain about latency?
│        ├─ NO → Stay online-only (Level 0)
│        └─ YES → Add a cache layer (Level 1)
│
└─ YES → Do users need to WRITE data offline?
          │
          ├─ NO → Cache layer + stale data UI (Level 1)
          │
          └─ YES → How many users edit the same entity?
                    │
                    ├─ ONE (single user, multiple devices)
                    │   → Do conflicts need per-field resolution?
                    │     ├─ NO → LWW + sync queue (Level 2)
                    │     └─ YES → Field-level merge + sync engine (Level 3)
                    │
                    └─ MULTIPLE (collaborative editing)
                        → Is real-time co-editing required?
                          │
                          ├─ NO → Field-level merge + sync engine (Level 3)
                          │       (resolve on next sync, not in real-time)
                          │
                          └─ YES → Does your team have CRDT expertise?
                                   │
                                   ├─ NO → Use Yjs/Automerge (Level 4)
                                   │       (do NOT build your own CRDT)
                                   │
                                   └─ YES → Custom CRDT or existing library
                                            based on data model (Level 4)
```

**Secondary decision: choosing a sync framework.**

```
What is your backend database?
│
├─ PostgreSQL → PowerSync or ElectricSQL
│   PowerSync: server-authoritative, schemaless client, wider platform support
│   ElectricSQL: local-first with write finality, Postgres-native
│
├─ CouchDB → PouchDB (built-in replication protocol)
│
├─ MongoDB → Realm Sync (Atlas Device Sync)
│
├─ Firebase/Firestore → Built-in offline (but server-authoritative, not truly offline-first)
│
└─ Custom backend → Build sync engine with:
    - Delta sync (timestamp or version-based)
    - Idempotent operations (UUID per operation)
    - Conflict resolution (field-level merge recommended)
    - Queue with exponential backoff
```

---

## Implementation Sketch

### Flutter: Local DB + Sync Queue + Conflict Resolver

This sketch demonstrates the core pattern using Drift (SQLite) for local storage. The pattern is portable to any platform and database.

```dart
// ── Local Database (Drift/SQLite) ──────────────────────────────

@DriftDatabase(tables: [Tasks, SyncQueue])
class AppDatabase extends _$AppDatabase {
  AppDatabase(QueryExecutor e) : super(e);

  @override
  int get schemaVersion => 1;

  // Read from local DB — always instant, never hits network
  Stream<List<Task>> watchTasks() => select(tasks).watch();

  Future<Task?> getTask(String id) =>
      (select(tasks)..where((t) => t.id.equals(id))).getSingleOrNull();

  // Write to local DB + enqueue sync operation (single transaction)
  Future<void> upsertTaskWithSync(TaskCompanion task, String operationType) {
    return transaction(() async {
      await into(tasks).insertOnConflictUpdate(task);
      await into(syncQueue).insert(SyncQueueCompanion(
        id: Value(const Uuid().v4()),
        entityType: const Value('task'),
        entityId: task.id,
        operation: Value(operationType),
        payload: Value(jsonEncode(task.toJson())),
        timestamp: Value(DateTime.now().toIso8601String()),
        retryCount: const Value(0),
        status: const Value('pending'),
      ));
    });
  }

  // Get pending sync operations in FIFO order
  Future<List<SyncQueueEntry>> getPendingOperations() =>
      (select(syncQueue)
            ..where((s) => s.status.equals('pending'))
            ..orderBy([(s) => OrderingTerm.asc(s.timestamp)]))
          .get();

  // Mark operation as synced and remove from queue
  Future<void> markSynced(String operationId) =>
      (delete(syncQueue)..where((s) => s.id.equals(operationId))).go();
}
```

```dart
// ── Sync Engine ────────────────────────────────────────────────

class SyncEngine {
  final AppDatabase _db;
  final ApiClient _api;
  final ConnectivityMonitor _connectivity;
  Timer? _syncTimer;

  SyncEngine(this._db, this._api, this._connectivity);

  void start() {
    // React to connectivity changes
    _connectivity.onStatusChange.listen((status) {
      if (status == ConnectivityState.online) {
        _drainQueue();
        _pullServerChanges();
      }
    });

    // Periodic sync when online (every 30 seconds)
    _syncTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) {
        if (_connectivity.isOnline) {
          _drainQueue();
          _pullServerChanges();
        }
      },
    );
  }

  Future<void> _drainQueue() async {
    final pending = await _db.getPendingOperations();

    for (final op in pending) {
      try {
        final serverResponse = await _api.sync(op);

        if (serverResponse.hasConflict) {
          await _resolveConflict(op, serverResponse.serverVersion);
        }

        await _db.markSynced(op.id);
      } on NetworkException {
        // Will retry on next cycle — operation stays in queue
        break; // Stop processing queue, network is down
      } on ServerException catch (e) {
        await _handleSyncFailure(op, e);
      }
    }
  }

  Future<void> _pullServerChanges() async {
    final lastSync = await _db.getLastSyncTimestamp();
    final changes = await _api.getChangesSince(lastSync);

    for (final change in changes) {
      await _db.applyServerChange(change);
    }

    await _db.setLastSyncTimestamp(DateTime.now());
  }

  void dispose() {
    _syncTimer?.cancel();
  }
}
```

```dart
// ── Conflict Resolver ──────────────────────────────────────────

class ConflictResolver {
  /// Field-level merge: compare local and server versions against
  /// the common ancestor to determine non-conflicting changes.
  TaskData resolve(TaskData ancestor, TaskData local, TaskData server) {
    return TaskData(
      id: local.id,
      title: _mergeField(ancestor.title, local.title, server.title),
      description: _mergeField(
          ancestor.description, local.description, server.description),
      status: _mergeField(ancestor.status, local.status, server.status),
      updatedAt: DateTime.now(),
    );
  }

  /// Three-way merge for a single field:
  /// - If only one side changed, take that change.
  /// - If both sides changed to the same value, take it.
  /// - If both sides changed to different values, apply LWW as fallback.
  T _mergeField<T>(T ancestor, T local, T server) {
    final localChanged = local != ancestor;
    final serverChanged = server != ancestor;

    if (!localChanged && !serverChanged) return ancestor; // No change
    if (localChanged && !serverChanged) return local;     // Only local changed
    if (!localChanged && serverChanged) return server;    // Only server changed
    // Both changed — true conflict. Fallback to server-wins for safety.
    // Log this for monitoring.
    _logConflict(ancestor, local, server);
    return server;
  }
}
```

```dart
// ── Repository (single access point for UI) ───────────────────

class TaskRepository {
  final AppDatabase _db;
  final SyncEngine _syncEngine;

  TaskRepository(this._db, this._syncEngine);

  /// UI calls this — always returns instantly from local DB.
  Stream<List<Task>> watchAllTasks() => _db.watchTasks();

  /// UI calls this — writes to local DB + enqueues sync.
  /// Returns immediately. Sync happens in background.
  Future<void> createTask(String title, String description) async {
    final task = TaskCompanion(
      id: Value(const Uuid().v4()),
      title: Value(title),
      description: Value(description),
      status: const Value('todo'),
      createdAt: Value(DateTime.now()),
      updatedAt: Value(DateTime.now()),
      syncVersion: const Value(0),
    );
    await _db.upsertTaskWithSync(task, 'create');
  }

  /// UI calls this — updates local DB + enqueues sync.
  Future<void> updateTask(String id, {String? title, String? status}) async {
    final existing = await _db.getTask(id);
    if (existing == null) return;

    final updated = TaskCompanion(
      id: Value(id),
      title: Value(title ?? existing.title),
      status: Value(status ?? existing.status),
      updatedAt: Value(DateTime.now()),
      syncVersion: Value(existing.syncVersion + 1),
    );
    await _db.upsertTaskWithSync(updated, 'update');
  }
}
```

### Key Implementation Principles

1. **Every write is a transaction** that includes both the local DB mutation and the sync queue entry. If either fails, both roll back.
2. **The UI only reads from the local DB.** It never makes network calls directly. The Repository exposes streams (reactive) from the local database.
3. **The sync engine runs independently** of the UI. It drains the queue when online, pulls server changes, and resolves conflicts — all in the background.
4. **Conflict resolution is a separate, testable component.** The `ConflictResolver` is a pure function with no dependencies. It takes three versions (ancestor, local, server) and returns the merged result. Test it exhaustively.
5. **Idempotency is enforced via operation IDs.** Every sync queue entry has a UUID. The server must check this UUID before applying the operation. If the UUID already exists, the operation is skipped (not re-applied).

---

## Cross-References

- **[mobile-app-architecture](../mobile-architecture/)** — Offline-first is one of several architectural concerns for mobile apps. The broader mobile architecture module covers navigation, state management, and platform integration.
- **[push-and-sync](../../integration/)** — Push notifications can trigger sync operations, reducing the need for polling and ensuring timely data updates across devices.
- **[data-consistency](../../data/)** — Offline-first relaxes consistency guarantees from strong (linearizable) to eventual. Understanding the consistency spectrum is essential for choosing the right conflict resolution strategy.
- **[mobile-backend-for-frontend](../../integration/)** — A BFF can simplify offline-first by providing a sync-optimized API that returns delta payloads, handles conflict resolution server-side, and provides compact data formats for mobile bandwidth constraints.

---

## Sources

- [Ink & Switch — Local-first software: You own your data, in spite of the cloud](https://www.inkandswitch.com/local-first/)
- [Flutter Docs — Offline-first support](https://docs.flutter.dev/app-architecture/design-patterns/offline-first)
- [Android Developers — Build an offline-first app](https://developer.android.com/topic/architecture/data-layer/offline-first)
- [Notion — How we made Notion available offline](https://www.notion.com/blog/how-we-made-notion-available-offline)
- [PowerSync — Local-First Software: Origins and Evolution](https://www.powersync.com/blog/local-first-software-origins-and-evolution)
- [PowerSync — Why Cinapse Moved Away from CRDTs for Sync](https://www.powersync.com/blog/why-cinapse-moved-away-from-crdts-for-sync)
- [PowerSync — ElectricSQL vs PowerSync](https://www.powersync.com/blog/electricsql-vs-powersync)
- [Neighbourhoodie — Offline-First with CouchDB and PouchDB in 2025](https://neighbourhood.ie/blog/2025/03/26/offline-first-with-couchdb-and-pouchdb-in-2025)
- [PouchDB — Replication Guide](https://pouchdb.com/guides/replication.html)
- [Yjs Documentation](https://docs.yjs.dev/)
- [GeekyAnts — Offline-First Flutter: Implementation Blueprint](https://geekyants.com/blog/offline-first-flutter-implementation-blueprint-for-real-world-apps)
- [droidcon — The Complete Guide to Offline-First Architecture in Android](https://www.droidcon.com/2025/12/16/the-complete-guide-to-offline-first-architecture-in-android/)
- [ElectricSQL — Alternatives](https://electric-sql.com/docs/reference/alternatives)
- [CRDT.tech — Implementations](https://crdt.tech/implementations)
