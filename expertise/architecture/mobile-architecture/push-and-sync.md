# Push and Sync — Architecture Expertise Module

> Push and Sync covers two related mobile concerns: push notifications (server-initiated messages to devices) and data synchronization (keeping local and remote data consistent). Both are fundamental to mobile UX — push drives re-engagement and real-time awareness, sync enables offline capability and fast local reads. They are complementary but distinct: push is a one-way signaling mechanism from server to device, sync is a bidirectional data consistency protocol. They often work together (a silent push triggers a sync), but conflating them leads to poor architecture.

> **Category:** Mobile Architecture
> **Complexity:** Moderate
> **Applies when:** Mobile applications that need to notify users of events or keep local data synchronized with a remote backend

---

## What This Is (and What It Isn't)

### Push Notifications

Push notifications are server-initiated messages delivered to a user's device through platform-specific relay services — Apple Push Notification service (APNs) for iOS and Firebase Cloud Messaging (FCM) for Android. The device does not poll for these messages. Instead, each device maintains a persistent encrypted connection to the platform's relay service, and the server sends messages through this relay.

There are three categories of push notification:

**Alert/Display notifications.** These produce a visible banner, badge, or sound. The user sees them. They are the "push notification" that product managers discuss — the thing that appears on the lock screen. On iOS, these require explicit user opt-in (with opt-in rates averaging 56% as of 2025). On Android, they are enabled by default but users can revoke per-channel (opt-in rates have dropped from 85% to 67% in a single year).

**Silent/Data notifications.** These wake the app in the background without showing anything to the user. iOS calls them "content-available" pushes. Android calls them "data messages." They exist to trigger background processing — typically a data sync. iOS throttles them aggressively: a few per hour at most, and the system may delay or drop them based on battery level and app usage patterns. The app gets roughly 30 seconds of background execution time. If the user has force-killed the app, silent pushes are not delivered on iOS at all until the user reopens the app.

**Topic/Channel notifications.** Both APNs and FCM support subscribing devices to named topics. A server publishes to a topic, and all subscribed devices receive the message. This is efficient for broadcast scenarios (news alerts, sports scores) where the same message goes to many devices. FCM also supports condition-based targeting (e.g., send to devices subscribed to topic A AND topic B).

### Data Synchronization

Data sync is the process of keeping local (on-device) data consistent with remote (server-side) data. Unlike push, sync is fundamentally about data, not signals. The local database is treated as the primary source of truth for UI rendering, and the sync process reconciles it with the server.

There are three sync directions:

**Pull-based (client-initiated).** The client polls the server at intervals or on user action. Simple to implement. Wastes bandwidth when nothing has changed. Introduces latency equal to the polling interval. Appropriate for low-frequency data (settings, profile information).

**Push-based (server-initiated).** The server notifies the client when data changes, either via a persistent connection (WebSocket, SSE) or via a silent push notification that triggers a fetch. Minimizes latency and bandwidth waste. Requires infrastructure for connection management or push delivery. WebSockets provide full-duplex communication but require reconnection logic on mobile (the OS will kill background connections). SSE offers automatic reconnection but lacks native mobile SDK support and is unidirectional.

**Bidirectional (conflict-prone).** Both client and server can modify data, and changes propagate in both directions. This is the architecture of collaborative apps, offline-first apps, and any system where the user creates or modifies data while offline. It requires a conflict resolution strategy because two parties can modify the same record independently.

### What They Are Not

**Push is not sync.** A push notification tells the device "something happened." It does not deliver the data itself (payloads are limited to 4 KB on APNs, 4 KB on FCM). A common anti-pattern is trying to encode meaningful data in push payloads instead of using push as a trigger for a proper sync fetch.

**Sync is not real-time messaging.** Sync ensures eventual consistency between local and remote data stores. Real-time messaging (chat, live cursors, collaborative editing) requires sub-second delivery with ordering guarantees. Sync tolerates seconds or minutes of delay. Conflating the two leads to overengineering sync infrastructure or underengineering messaging infrastructure.

**Push is not reliable delivery.** APNs and FCM provide best-effort delivery, not guaranteed delivery. APNs stores only the most recent notification per device if the device is offline. FCM stores up to 100 pending messages per device for up to 28 days. Neither guarantees order of delivery. Applications that require guaranteed delivery must implement their own acknowledgment and retry logic on top of push.

---

## When to Use It

### Push Notifications — The Qualifying Conditions

**Real-time user awareness is a product requirement.** Chat applications (new message), e-commerce (order status updates), ride-sharing (driver arriving), social media (new follower, comment). The user needs to know something happened without opening the app. WhatsApp delivers message notifications instantly by combining WebSocket connections in the foreground with push notifications when the app is backgrounded or closed.

**Re-engagement is a measured business metric.** The product team tracks DAU/MAU ratios and push notifications are a lever. News apps, social platforms, and marketplace apps use push to bring users back. Airbnb sends push notifications when a host responds to an inquiry, and the notification links directly to the conversation — reducing time-to-booking.

**Time-sensitive actions require user response.** Two-factor authentication codes, appointment reminders, delivery windows, payment confirmations. The value of the notification degrades rapidly with delay.

**Background data refresh improves perceived performance.** Silent push triggers a background sync so that when the user opens the app, fresh data is already loaded. Email clients use this pattern — a silent push arrives, the client fetches new mail in the background, and the inbox appears current when opened. This creates the perception of instant loading.

### Data Sync — The Qualifying Conditions

**Offline capability is a hard requirement.** Field service apps (technicians in areas without connectivity), note-taking apps (Notion, Bear, Apple Notes), healthcare apps (clinicians in hospital dead zones). The user must be able to read and write data without network access, and changes must reconcile when connectivity returns.

**Local-first rendering for performance.** Even apps that are always online benefit from reading from a local database and syncing in the background. This eliminates loading spinners on app launch and makes the UI feel instant. Linear uses this pattern — the entire workspace is synced locally, and the UI reads from a local store. Queries are instant regardless of network latency.

**Multi-device consistency.** A user's data must be consistent across their phone, tablet, and web browser. iCloud sync, Google Drive sync, and cross-device bookmark sync are canonical examples. The sync engine must handle the same user modifying data on two devices simultaneously.

**Collaborative data modification.** Multiple users editing the same data — shared documents (Google Docs, Figma), shared task boards (Trello, Asana), shared shopping lists. This is the hardest sync problem because conflicts between different users are common and must be resolved without data loss.

---

## When NOT to Use It

This section is as important as the previous one. Both push notifications and data sync carry significant complexity, platform constraints, and user-facing consequences when misapplied.

### Push Notifications — The Disqualifying Conditions

**Over-notification drives uninstalls.** This is not hypothetical — it is measured and substantial. Sending 3-6 push notifications per week causes 40% of users to disable notifications entirely. Sending just one push notification per week leads to 6% of users uninstalling the app outright. 46% of users opt out after receiving 2-5 messages in a single week. The marginal re-engagement value of one more notification must be weighed against permanent user loss. Many product teams treat push as free — it is not. Every notification is a withdrawal from a finite trust account.

**The notification has no clear user value.** "We haven't seen you in a while!" notifications are the canonical anti-pattern. They serve the business, not the user. Users recognize this and it erodes trust. Notifications should communicate something the user cares about and cannot easily discover on their own. If the user would not be disappointed to miss the information, it should not be a push notification.

**The content is not time-sensitive.** Marketing promotions, weekly digests, feature announcements — these belong in in-app messages, email, or app badges, not push. Push notifications interrupt the user's current activity. The interruption is justified only when the information is time-bounded (your ride is arriving, your food is ready, your flight is delayed).

**You cannot segment or personalize.** Broadcasting the same notification to all users is almost always wrong. A sports app that sends every score update to all users will annoy anyone who does not follow that sport. Segmentation by user preferences, behavior, and context is a prerequisite for push, not an optimization.

**Platform restrictions make delivery unreliable for your use case.** On iOS, if the user has denied notification permission, you cannot send any push (including silent push on some configurations). On Android, starting with Android 13, notification permission requires explicit opt-in. If your target audience has low opt-in rates (fitness apps average 45% opt-in on iOS), push cannot be your primary communication channel.

**You lack analytics infrastructure to measure impact.** Without delivery confirmation, open rate tracking, and conversion attribution, you cannot distinguish valuable notifications from noise. Sending push without measurement is spending a finite resource (user attention) without knowing the return.

### Data Sync — The Disqualifying Conditions

**The app is read-only or write-rarely.** A news reader, weather app, or stock ticker consumes server data but rarely or never writes back. Full bidirectional sync is unnecessary overhead. Simple API fetching with local caching (HTTP cache headers, ETag-based conditional requests) achieves the same UX with a fraction of the complexity.

**Data volume makes local replication impractical.** If the server holds 50 GB of data per user and the user typically accesses 1% of it on mobile, syncing everything locally is wasteful. Instead, cache recently accessed data and fetch on demand. A media streaming app does not sync its entire catalog locally.

**Background sync drains battery disproportionately to value.** Apps that sync frequently in the background — particularly those using GPS, network polling, or continuous WebSocket connections — consume significant battery. Users notice. Facebook, Instagram, and Snapchat are consistently cited as top battery-draining apps precisely because of aggressive background sync and data fetching. If your sync frequency exceeds what the data freshness actually requires, you are trading battery life for data that nobody will look at before the next foreground sync.

**Conflict resolution complexity exceeds team capacity.** Bidirectional sync with conflict resolution is genuinely hard. If the team does not have experience with CRDTs, operational transforms, or at minimum vector clocks, implementing a custom sync engine is a high-risk endeavor. Using a managed solution (Firebase Realtime Database, Realm Sync, AWS AppSync) is preferable to a half-implemented custom sync that silently loses data.

**Regulatory constraints on local data storage.** Healthcare (HIPAA), financial (PCI-DSS), and government applications may prohibit storing certain data on the device or require encryption at rest with specific key management. Sync engines that cache data locally must comply with these constraints, adding implementation cost that may not be justified.

---

## How It Works

### Push Notification Architecture

#### Platform Relay Services

Both iOS and Android use a relay service model. The app server never connects directly to the device. Instead:

1. **Device registration.** On app launch, the app requests a device token from the OS. On iOS, the app calls `UIApplication.registerForRemoteNotifications()`, which returns a device token from APNs. On Android, the app calls `FirebaseMessaging.getInstance().getToken()`, which returns a registration token from FCM. These tokens are opaque, platform-specific identifiers.

2. **Token storage.** The app sends the device token to the app server, which stores it in a device registry associated with the user account. A single user may have multiple tokens (phone + tablet). Tokens can change at any time — the app must re-register on every launch and send updated tokens to the server.

3. **Message submission.** The app server sends a message to the platform relay service (APNs or FCM), specifying the target device token(s) and the payload. The relay service delivers the message to the device over its persistent connection.

4. **Device delivery.** The OS receives the message, wakes the app (for data messages) or displays the notification (for alert messages), and the app handles the payload.

#### APNs Architecture (iOS)

APNs uses HTTP/2 with TLS 1.2+ for server-to-APNs communication. The app server authenticates using either a TLS certificate (per-app) or a JWT token (per-team, recommended). Each request is a POST to `api.push.apple.com` (production) or `api.sandbox.push.apple.com` (development).

Key constraints:
- Maximum payload size: 4 KB (4096 bytes)
- APNs stores only the most recent notification per device per app if the device is offline
- Token-based authentication JWTs must be refreshed every 20-60 minutes; APNs rejects tokens older than one hour
- Device tokens are environment-specific — a sandbox token will not work in production
- APNs returns a 410 status code for invalidated tokens; the server must remove these from its registry

Notification channels on iOS are managed through `UNNotificationCategory` and `UNNotificationAction`, allowing the app to define interactive notification types with custom buttons.

#### FCM Architecture (Android)

FCM acts as a unified relay. On Android, the device maintains a single persistent TCP/IP connection to FCM servers, established at device boot. This connection is shared across all apps on the device — only one socket is needed regardless of how many FCM-enabled apps are installed.

FCM also brokers iOS notifications. By uploading APNs credentials to Firebase, developers can use FCM's API to target both Android and iOS with a single API call. FCM translates the message and forwards it to APNs for iOS delivery.

Key constraints:
- Maximum payload: 4 KB for notification messages, 4 KB for data messages
- FCM stores up to 100 pending messages per device for up to 28 days
- High-priority messages bypass Android's Doze mode and deliver immediately, waking the device if necessary
- Normal-priority messages are batched and delivered during Doze maintenance windows
- Starting Android 13, apps must request `POST_NOTIFICATIONS` runtime permission

Notification channels on Android (API 26+) allow users to control notification behavior per channel — sound, vibration, importance level, and whether the channel is enabled at all. The app defines channels; the user controls them.

#### Silent Push as Sync Trigger

The most architecturally significant push pattern is using silent push to trigger background data sync:

```
Server detects data change
  → Server sends silent push (content-available: 1 on iOS, data-only message on FCM)
    → OS wakes app in background
      → App fetches changed data from server API
        → App updates local database
          → UI reflects changes when user opens app
```

This pattern combines the efficiency of push (no polling) with the reliability of a proper API fetch (full data, not limited to 4 KB). However, it inherits all the unreliability of silent push — iOS throttles delivery, force-killed apps do not receive them, and there is no delivery guarantee.

A robust implementation combines silent push with periodic background fetch as a fallback:

```
Primary:   Silent push → immediate background sync
Fallback:  BGTaskScheduler (iOS) / WorkManager (Android) → periodic sync
Last resort: Foreground fetch on app open
```

### Data Sync Architecture

#### Pull-Based Sync (Polling)

The simplest sync model. The client requests data from the server at regular intervals or on specific triggers (app open, pull-to-refresh, timer).

**Delta sync** is essential for pull-based models at scale. Instead of fetching all data on every poll, the client sends a `lastSyncTimestamp` or `syncToken`, and the server returns only records that changed since that point. This reduces bandwidth from O(total data) to O(changed data) per sync cycle.

```
Client: GET /api/items?since=2025-03-07T10:00:00Z
Server: returns [{id: 42, title: "updated", updated_at: "2025-03-07T14:30:00Z"}, ...]
Client: stores items, updates lastSyncTimestamp to max(updated_at)
```

**Cursor-based pagination** handles large delta sets. The server returns a page of changes plus a cursor for the next page. The client pages through all changes before updating its sync checkpoint.

#### Push-Based Sync (Persistent Connections)

For apps that need sub-second data freshness while in the foreground, a persistent connection delivers changes as they occur.

**WebSockets** provide full-duplex communication. The client opens a WebSocket connection on app foreground and receives real-time updates. The client can also send changes through the same connection. WhatsApp, Slack, and Discord use WebSocket connections for real-time message delivery while the app is in the foreground.

Mobile-specific WebSocket concerns:
- The OS kills background WebSocket connections to conserve battery — WebSockets are foreground-only on mobile
- Network transitions (Wi-Fi to cellular) break the connection — reconnection with exponential backoff is mandatory
- The client must handle message ordering across reconnections — missed messages during disconnection must be fetched via a catch-up API call
- Connection keepalive pings prevent intermediate proxies from closing idle connections (typical interval: 30 seconds)

**Server-Sent Events (SSE)** are simpler than WebSockets (unidirectional, server-to-client only) and offer built-in automatic reconnection via the `Last-Event-ID` header. However, native SSE support on mobile platforms is limited — both iOS and Android require custom HTTP streaming implementations or third-party libraries.

#### Conflict Resolution Strategies

When two parties modify the same data independently (user edits on two devices while offline, or user edits while another user edits the same record), conflicts arise during sync. There are five primary resolution strategies:

**Last Write Wins (LWW).** The most recent write (by timestamp) overwrites the earlier one. Simple to implement but silently discards data. Appropriate for user preferences, settings, and single-user data where conflicts are rare and the most recent value is almost always correct. Figma uses a variant of LWW at the property level — if two users change the same property on the same object, the last value sent to the server wins.

**Server Wins / Client Wins.** A fixed precedence rule. Server-wins is appropriate when the server is authoritative (e.g., pricing data, inventory counts). Client-wins is rare but occasionally used in personal-device scenarios where the local state is always considered correct.

**Field-Level Merge.** Instead of treating the entire record as the unit of conflict, merge at the field level. If user A changes the `title` and user B changes the `description` of the same record, both changes are preserved because they affected different fields. This works well for structured records with independent fields. Linear uses this approach for issue metadata — status, assignee, and labels can be changed independently without conflict.

**CRDTs (Conflict-free Replicated Data Types).** Mathematical data structures that guarantee convergence without coordination. Two replicas can be modified independently and merged deterministically — the result is the same regardless of merge order. CRDTs come in two varieties:
- **State-based (CvRDTs):** Replicas exchange their full state and merge using a defined join operation. Simple but bandwidth-heavy.
- **Operation-based (CmRDTs):** Replicas exchange operations (insert, delete) and apply them commutatively. More bandwidth-efficient but requires reliable delivery of all operations.

Figma uses a CRDT-inspired approach for its collaborative design tool. Each document is a tree of objects, and conflict resolution operates at the property level. However, Figma discovered that CRDTs at scale produce tombstone bloat — documents accumulated 10+ million tombstones from deleted shapes, each 32 bytes, inflating files to gigabytes. They implemented aggressive compaction: when a document exceeds 1 million tombstones, the server creates a new snapshot and discards history older than 7 days.

**Operational Transform (OT).** Transforms concurrent operations so they can be applied in any order and produce the same result. Google Docs uses OT for text editing. Each character insertion or deletion is an operation with a position. When two users type at the same position simultaneously, OT transforms the positions so both insertions are preserved. OT requires a central server to determine operation ordering, making it less suitable for offline-first mobile apps.

**Manual Resolution.** Present the conflict to the user and let them choose. Git uses this for merge conflicts. Some mobile apps use it for critical data (e.g., medical records) where automated resolution could be dangerous. This should be a last resort — users find conflict resolution dialogs confusing and annoying.

#### Background Sync APIs

**iOS — BGTaskScheduler.** Starting iOS 13, `BGTaskScheduler` is the primary API for background work. It offers two task types:
- `BGAppRefreshTask`: Short tasks (up to 30 seconds) for fetching small amounts of data. iOS determines when to execute based on user usage patterns, battery level, and network availability.
- `BGProcessingTask`: Longer tasks (minutes) for significant work like database maintenance or large sync operations. Can require power connection and network availability.

The OS controls execution timing — you register a task and the OS runs it when conditions are favorable. There is no guaranteed schedule. Apps that the user opens frequently get more background time. Apps the user ignores get less.

**Android — WorkManager.** WorkManager is the recommended API for deferrable, guaranteed background work on Android. It survives app exits and device reboots. Key capabilities:
- Constraints: require network, require charging, require device idle
- Backoff policies: linear or exponential
- Chaining: sequential or parallel work chains
- Unique work: ensure only one instance of a named task runs
- WorkManager respects Doze mode and App Standby — it schedules work during maintenance windows

**Cross-platform — Silent push + periodic fallback.** The most robust background sync strategy combines silent push for immediate updates with periodic background tasks as a fallback. The silent push provides low-latency sync for critical changes, while the periodic task catches anything the push missed (due to throttling, delivery failure, or the app being force-killed).

### Sync Status Tracking

Every locally stored record needs sync metadata:

```
Record {
  id: string              // Server-assigned ID (null if created offline)
  localId: string         // Client-assigned ID (UUID, always present)
  data: {...}             // The actual record data
  syncStatus: enum        // 'synced' | 'pending_create' | 'pending_update' | 'pending_delete' | 'conflicted'
  localModifiedAt: Date   // When the client last modified this record
  serverModifiedAt: Date  // Last known server modification timestamp
  version: number         // Optimistic concurrency version (optional)
  conflictData: {...}     // Server version of data when conflict detected (optional)
}
```

The UI reads from the local store regardless of sync status. Pending changes are displayed immediately (optimistic UI). A sync indicator shows the user when changes are still uploading. Conflicted records are flagged for resolution.

---

## Trade-Offs Matrix

| Dimension | Push Notifications | Data Sync (Pull) | Data Sync (Push/WebSocket) | Data Sync (Bidirectional/Offline) |
|---|---|---|---|---|
| **Latency** | Seconds (best-effort) | Polling interval (seconds to minutes) | Sub-second (while connected) | Eventually consistent (seconds to hours) |
| **Battery impact** | Minimal (uses OS relay) | Proportional to poll frequency | High while connected (foreground only) | Moderate (background sync bursts) |
| **Bandwidth** | Minimal (< 4 KB per message) | Proportional to poll frequency and data size | Efficient (delta only) | Efficient with delta sync, expensive with full sync |
| **Offline support** | Platform queues 1 (APNs) to 100 (FCM) messages | No (requires connectivity) | No (connection required) | Yes (full offline read/write) |
| **Implementation complexity** | Low (platform SDKs handle delivery) | Low (HTTP polling) | Moderate (connection management, reconnection) | High (conflict resolution, sync engine) |
| **Reliability** | Best-effort, no guarantee | Reliable (client controls retry) | Connection-dependent | High with proper retry/queue |
| **Server infrastructure** | Platform relay (APNs/FCM) + token registry | Standard REST API | WebSocket server with connection state | Sync engine, conflict resolution, change tracking |
| **User permission required** | Yes (iOS alert notifications) | No | No | No |
| **Scalability concern** | Token registry size, topic fanout | Server load from polling | Concurrent WebSocket connections | Sync computation per client, conflict resolution load |
| **Data freshness guarantee** | None (delivery not guaranteed) | Bounded by poll interval | Real-time while connected | Eventual consistency |

---

## Evolution Path

### Stage 1: Simple Fetch + Basic Push

The app fetches data on launch via REST API. Push notifications are alert-only (user-visible) for critical events. No local database — data lives in memory and is re-fetched on every app open.

**When this breaks:** App launch feels slow on poor networks. Users complain about stale data. Product wants "instant" updates.

### Stage 2: Local Cache + Silent Push

Introduce a local database (SQLite/Room on Android, Core Data/SQLite on iOS, Hive/Drift on Flutter). Fetch data on launch and cache it. Use silent push to trigger background refresh so data is fresh when the user opens the app.

**When this breaks:** Users start creating/editing data on mobile. You need to handle local writes, upload queue, and retry logic. Two devices editing the same data creates conflicts.

### Stage 3: Delta Sync + Upload Queue

Implement delta sync — the client sends `lastSyncTimestamp` and receives only changed records. Local writes go into an upload queue (WorkManager on Android, BGTaskScheduler on iOS) that retries with exponential backoff. Conflict detection via server version numbers (optimistic concurrency).

**When this breaks:** Real-time collaboration is needed. Poll-based sync introduces unacceptable latency. Users expect to see each other's changes in seconds.

### Stage 4: Real-Time Sync + Conflict Resolution

Add WebSocket connections for foreground real-time updates. Implement field-level conflict resolution or CRDTs for collaborative data. Silent push + periodic background sync handles background updates. The local database is the single source of truth — all UI reads from local, sync handles consistency.

**When this breaks:** Scale. Thousands of concurrent WebSocket connections per server. CRDT tombstone bloat. Sync computation becomes a server bottleneck. You need a dedicated sync infrastructure team.

### Stage 5: Managed Sync Infrastructure

Adopt a managed sync platform (Firebase Realtime Database, Realm Sync, AWS AppSync, PowerSync, ElectricSQL) or build a dedicated sync service with its own team. The sync engine becomes infrastructure, not application code.

---

## Failure Modes

### Push Notification Failures

**Token management failures.** Device tokens change without warning. APNs invalidates tokens when the user reinstalls the app, restores from backup, or upgrades the OS. FCM tokens can be rotated by the SDK at any time. If the server sends to a stale token, APNs returns a 410 status; FCM returns a `NotRegistered` error. The server must handle these responses and remove the invalid token from its registry. Failure to do so means the token registry grows with dead tokens, wasting API calls and skewing delivery metrics. A common incident: a server accumulates millions of stale tokens over months, sending push requests that all fail, consuming API quota and server resources.

**Notification fatigue and user attrition.** The data is clear: 40% of users disable notifications after receiving 3-6 per week. 6% uninstall the app after just one notification per week. 95% of users who opt in but receive no notification in 90 days churn. The sweet spot is narrow — too few and you lose engagement, too many and you lose the user permanently. Apps that treat push as a free engagement channel without measuring opt-out rates and uninstall correlation are on a predictable path to declining DAU.

**Delivery unreliability.** APNs stores only the last notification per app if the device is offline. If you send three notifications while the user's phone is in airplane mode, they receive only the last one. FCM is more generous (up to 100 messages, 28 days) but still not guaranteed. High-priority FCM messages bypass Doze mode, but Android deprioritizes apps that abuse high-priority messaging. Silent push on iOS is throttled to a few per hour and is not delivered to force-killed apps. Any architecture that depends on guaranteed push delivery will fail intermittently and silently.

**Platform-specific behavioral differences.** The same notification behaves differently on iOS and Android. iOS groups notifications by thread identifier; Android groups by channel. iOS collapses notifications with the same `apns-collapse-id`; FCM uses `collapse_key`. Foreground handling differs — on iOS the app must explicitly handle foreground notifications via `UNUserNotificationCenterDelegate`; on Android, FCM notification messages are handled by the system tray automatically in the background but delivered to the app's `onMessageReceived` in the foreground. These differences create bugs that only appear on one platform.

### Data Sync Failures

**Conflict data loss.** The most dangerous sync failure is silent data loss during conflict resolution. A Last-Write-Wins policy silently discards the earlier write. If the discarded write was a 30-minute form entry that the user completed on a plane, that data is gone. The user discovers the loss hours or days later and has no recourse. Mitigation: for user-generated content, never use LWW without preserving the overwritten version in a conflict log that the user can access.

**Sync loop / infinite sync.** A bug in sync logic causes the client to mark a record as modified during the sync process itself (e.g., a computed field updates when the record is written to the local DB). This triggers another sync cycle, which writes again, triggering another sync. The app burns battery and bandwidth in an infinite loop. Mitigation: distinguish between user modifications (trigger sync) and sync-applied modifications (do not trigger sync) using a flag or separate write path.

**Partial sync corruption.** A sync operation fetches 500 records but the network drops at record 300. If the client committed the first 300 and updated its sync checkpoint, it will never re-fetch those 300 — but it also missed 200. If it did not commit, it must re-fetch all 500. The solution is transactional sync: fetch all changes, apply them in a single database transaction, and update the sync checkpoint atomically. If any step fails, the entire batch is rolled back and retried.

**Background sync battery drain.** Aggressive background sync is the primary reason users uninstall "battery drain" apps. Each background sync wakes the radio (200-600 ms ramp-up on cellular), transfers data, and processes it. On cellular networks, the radio stays in a high-power state for 10-20 seconds after the last transmission (tail energy). An app that syncs every 5 minutes creates 288 radio wake cycles per day, each with tail energy. Mitigation: batch sync operations, use platform-provided constraints (require Wi-Fi, require charging), and respect OS throttling.

**Clock skew in timestamp-based sync.** Delta sync relies on timestamps. If the client clock is wrong (common — users change time zones, device clocks drift), the `lastSyncTimestamp` may be in the future (missing new data) or in the past (re-fetching old data). Server-generated timestamps for sync checkpoints are safer than client timestamps. Using monotonically increasing sequence numbers instead of timestamps eliminates clock skew entirely.

**Tombstone accumulation.** Deleted records cannot simply be removed from the server because clients that have not yet synced need to know the record was deleted. Instead, deleted records are marked with a `deleted_at` timestamp (tombstoned). Over time, tombstones accumulate. Figma encountered documents with 10+ million tombstones consuming gigabytes. Mitigation: implement tombstone compaction — after all known clients have synced past the deletion timestamp, the tombstone can be permanently removed. This requires tracking per-client sync checkpoints.

---

## Technology Landscape

### Push Notification Services

**Apple Push Notification service (APNs).** Apple's proprietary relay. Required for all iOS push. HTTP/2 API with JWT or certificate authentication. Free to use (included with Apple Developer Program). No third-party alternative exists — all iOS push goes through APNs, even when using FCM or OneSignal (they proxy through APNs).

**Firebase Cloud Messaging (FCM).** Google's cross-platform push service. Handles Android natively and proxies to APNs for iOS. Free tier with no message limits. Supports topics, device groups, and conditional targeting. Provides delivery analytics via the FCM Aggregate Delivery Data API. The dominant choice for Android push and a common choice for unified cross-platform push.

**OneSignal.** A push notification platform built on top of APNs and FCM. Adds segmentation, A/B testing, automation, and analytics that FCM lacks out of the box. Free tier supports up to 10,000 subscribers. Maintains 99.95% uptime. Preferred by product and marketing teams who need engagement tools beyond raw push delivery. More feature-rich for notification management but adds a dependency and potential single point of failure.

**Amazon SNS (Simple Notification Service).** AWS's pub/sub messaging service that supports mobile push to APNs, FCM, and ADM (Amazon Device Messaging). Integrates with the AWS ecosystem. Pricing is per-million messages. Suitable for teams already on AWS who want push integrated with their existing infrastructure.

**Pusher Beams.** Push notification service from Pusher. Simpler API surface than OneSignal. Supports APNs and FCM. Limited free tier. Less feature-rich than OneSignal but simpler to integrate for developers who just need reliable delivery.

### Real-Time Sync and Messaging

**Firebase Realtime Database / Cloud Firestore.** Google's managed real-time database with built-in sync. Data changes propagate to all connected clients in milliseconds. Offline support with local persistence. Conflict resolution is LWW by default. Firestore adds document-based structure, queries, and better scaling. The fastest path from zero to synced mobile app. Limitations: vendor lock-in, limited query expressiveness, cost unpredictability at scale.

**Realm Sync (MongoDB Atlas Device Sync).** Object database with automatic bidirectional sync. Conflict resolution uses operational transform with field-level granularity. Strong offline support. Integrates with MongoDB Atlas on the backend. More expressive data model than Firestore. Limitations: tied to MongoDB ecosystem, Realm SDK must be used as the local database.

**AWS AppSync.** Managed GraphQL API with real-time subscriptions and offline support. Uses DynamoDB, Aurora, or Lambda as data sources. Conflict resolution configurable: auto-merge, optimistic concurrency, or custom Lambda resolvers. Good fit for teams on AWS who want GraphQL. Limitations: GraphQL complexity, AWS vendor lock-in.

**PowerSync.** Open-source sync engine for Postgres-backed apps. Syncs a subset of Postgres data to SQLite on the device. Supports partial replication (sync rules define which data each user gets). Handles conflict resolution via server-side rules. Good fit for existing Postgres backends that want to add offline-capable mobile clients without replacing the database.

**ElectricSQL.** Open-source active-active replication from Postgres to SQLite. Uses CRDTs for conflict-free sync. Designed for local-first applications. Early-stage but promising for teams who want true local-first with Postgres as the backend.

**Ably.** Managed real-time messaging platform. WebSocket-based with automatic fallback to long-polling. Guarantees message ordering and exactly-once delivery (unlike raw WebSockets). Provides presence detection (who is online). Suitable for chat, live updates, and collaborative features. Pricing is per-message and per-connection.

**Pusher Channels.** Real-time messaging via WebSockets. Simpler than Ably with fewer guarantees (at-least-once delivery, not exactly-once). Presence channels for tracking online users. Private channels for authenticated access. Suitable for live dashboards, notifications, and simple real-time features. More affordable than Ably at moderate scale.

### Background Sync APIs (Platform-Native)

| Platform | API | Purpose | Constraints |
|---|---|---|---|
| iOS 13+ | `BGTaskScheduler` | Register background refresh and processing tasks | OS controls timing; no guaranteed schedule |
| iOS | `URLSession` background transfers | Large file uploads/downloads that survive app termination | System-managed, completes even if app is killed |
| Android | `WorkManager` | Deferrable, guaranteed background work | Survives reboot; respects Doze; supports constraints |
| Android | `JobScheduler` (API 21+) | Predecessor to WorkManager, lower-level | WorkManager is preferred; JobScheduler is legacy |
| Flutter | `workmanager` plugin | Cross-platform background task scheduling | Wraps WorkManager (Android) and BGTaskScheduler (iOS) |
| React Native | `react-native-background-fetch` | Cross-platform background fetch | Wraps platform APIs with unified interface |

---

## Decision Tree

```
START: Does your app need to communicate with users when the app is closed?
│
├─ YES → Push Notifications
│   │
│   ├─ Are messages time-sensitive and user-specific?
│   │   ├─ YES → Targeted alert push (APNs + FCM)
│   │   └─ NO → Consider in-app messaging or email instead
│   │
│   ├─ Do you need to broadcast to many users simultaneously?
│   │   ├─ YES → Topic-based push (FCM topics, APNs topic)
│   │   └─ NO → Targeted push with device tokens
│   │
│   └─ Do you need to trigger background data refresh?
│       ├─ YES → Silent push + background fetch fallback
│       └─ NO → Alert push only
│
├─ NO → Skip push notifications entirely
│
└─ Does your app need to keep local data in sync with a server?
    │
    ├─ NO → Simple API fetch on demand, no sync needed
    │
    └─ YES → Data Sync
        │
        ├─ Is the app read-only (no user writes)?
        │   ├─ YES → Pull-based sync (polling or silent push trigger)
        │   └─ NO → Continue
        │
        ├─ Does the app need to work offline?
        │   ├─ YES → Offline-first with bidirectional sync
        │   │   │
        │   │   ├─ Can you use a managed sync solution?
        │   │   │   ├─ YES → Firebase Firestore / Realm Sync / PowerSync
        │   │   │   └─ NO → Custom sync engine with conflict resolution
        │   │   │
        │   │   └─ What conflict resolution do you need?
        │   │       ├─ Single-user, rare conflicts → Last Write Wins
        │   │       ├─ Multi-user, structured data → Field-level merge
        │   │       ├─ Multi-user, collaborative editing → CRDTs or OT
        │   │       └─ Critical data, no tolerance for loss → Manual resolution
        │   │
        │   └─ NO → Continue
        │
        ├─ Does the app need real-time updates (< 1 second)?
        │   ├─ YES → WebSocket (foreground) + silent push (background)
        │   └─ NO → Delta sync on app open + silent push trigger
        │
        └─ How large is the dataset per user?
            ├─ Small (< 10 MB) → Full local replication with delta sync
            ├─ Medium (10-100 MB) → Partial replication (sync rules / subscriptions)
            └─ Large (> 100 MB) → On-demand fetch with LRU cache, no full sync
```

---

## Implementation Sketch

### Push Notification Server (Node.js / TypeScript)

```typescript
// Push notification service with token management and multi-platform delivery

interface DeviceToken {
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  createdAt: Date;
  lastUsedAt: Date;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  collapseKey?: string;   // Group/replace notifications
  priority: 'high' | 'normal';
  silent?: boolean;        // Data-only, no visible notification
}

class PushNotificationService {
  private tokenRegistry: TokenRegistry;
  private apnsClient: APNsClient;
  private fcmClient: FCMClient;

  async send(userId: string, payload: PushPayload): Promise<DeliveryResult[]> {
    const tokens = await this.tokenRegistry.getTokensForUser(userId);
    const results: DeliveryResult[] = [];

    for (const token of tokens) {
      try {
        if (token.platform === 'ios') {
          const result = await this.apnsClient.send(token.token, {
            aps: payload.silent
              ? { 'content-available': 1 }
              : { alert: { title: payload.title, body: payload.body }, sound: 'default' },
            ...payload.data,
          });
          results.push({ token: token.token, status: 'delivered' });
        } else {
          const result = await this.fcmClient.send({
            token: token.token,
            ...(payload.silent
              ? { data: payload.data }
              : {
                  notification: { title: payload.title, body: payload.body },
                  data: payload.data,
                }),
            android: {
              priority: payload.priority,
              ...(payload.collapseKey && { collapseKey: payload.collapseKey }),
            },
          });
          results.push({ token: token.token, status: 'delivered' });
        }

        await this.tokenRegistry.updateLastUsed(token.token);
      } catch (error) {
        if (this.isInvalidTokenError(error)) {
          // Token is stale — remove from registry
          await this.tokenRegistry.removeToken(token.token);
          results.push({ token: token.token, status: 'token_removed' });
        } else {
          results.push({ token: token.token, status: 'failed', error });
        }
      }
    }

    return results;
  }

  // Periodic cleanup: remove tokens not seen in 60 days
  async pruneStaleTokens(): Promise<number> {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    return this.tokenRegistry.removeTokensOlderThan(cutoff);
  }

  private isInvalidTokenError(error: any): boolean {
    // APNs: 410 Gone, FCM: NotRegistered
    return error.statusCode === 410 || error.code === 'messaging/registration-token-not-registered';
  }
}
```

### Sync Engine (Mobile Client — Pseudocode)

```
class SyncEngine {
  localDB: LocalDatabase
  remoteAPI: RemoteAPI
  syncCheckpoint: SyncCheckpoint   // Persisted lastSyncTimestamp or sequence number

  // Called on app open, after silent push, or by periodic background task
  async performSync():
    // 1. UPLOAD: Push local changes to server
    pendingChanges = localDB.getRecordsBySyncStatus(['pending_create', 'pending_update', 'pending_delete'])

    for change in pendingChanges:
      try:
        if change.syncStatus == 'pending_create':
          serverRecord = remoteAPI.create(change.data)
          localDB.updateRecord(change.localId, {
            id: serverRecord.id,
            syncStatus: 'synced',
            serverModifiedAt: serverRecord.updatedAt
          })

        elif change.syncStatus == 'pending_update':
          serverRecord = remoteAPI.update(change.id, change.data, change.version)
          localDB.updateRecord(change.localId, {
            syncStatus: 'synced',
            serverModifiedAt: serverRecord.updatedAt,
            version: serverRecord.version
          })

        elif change.syncStatus == 'pending_delete':
          remoteAPI.delete(change.id)
          localDB.hardDelete(change.localId)

      catch ConflictError as e:
        // Server has a newer version — conflict detected
        serverVersion = e.serverRecord
        localDB.updateRecord(change.localId, {
          syncStatus: 'conflicted',
          conflictData: serverVersion
        })
        // Notify UI to show conflict resolution dialog or auto-resolve

      catch NetworkError:
        // Leave as pending, will retry on next sync
        break  // Stop upload, no point trying more if network is down

    // 2. DOWNLOAD: Pull server changes since last sync
    cursor = syncCheckpoint.get()

    while true:
      response = remoteAPI.getChanges(since: cursor, limit: 100)

      localDB.transaction {
        for record in response.changes:
          existingLocal = localDB.getByServerId(record.id)

          if existingLocal == null:
            // New record from server
            localDB.insert({
              id: record.id,
              localId: generateUUID(),
              data: record.data,
              syncStatus: 'synced',
              serverModifiedAt: record.updatedAt
            })

          elif existingLocal.syncStatus == 'synced':
            // No local changes — safe to overwrite
            localDB.updateRecord(existingLocal.localId, {
              data: record.data,
              serverModifiedAt: record.updatedAt,
              version: record.version
            })

          elif existingLocal.syncStatus in ['pending_update', 'pending_delete']:
            // Local has unsynced changes — conflict
            localDB.updateRecord(existingLocal.localId, {
              syncStatus: 'conflicted',
              conflictData: record.data
            })

        syncCheckpoint.set(response.cursor)
      }

      if not response.hasMore:
        break

  // Called when user modifies a record
  onUserModify(localId, newData):
    localDB.updateRecord(localId, {
      data: newData,
      syncStatus: 'pending_update',
      localModifiedAt: now()
    })
    scheduleSyncDebounced(delay: 2_seconds)

  // Called when user creates a record
  onUserCreate(data):
    localId = generateUUID()
    localDB.insert({
      id: null,  // No server ID yet
      localId: localId,
      data: data,
      syncStatus: 'pending_create',
      localModifiedAt: now()
    })
    scheduleSyncDebounced(delay: 2_seconds)
}
```

### Background Sync Registration (iOS — Swift)

```swift
// AppDelegate — register background tasks
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    // Register periodic sync task
    BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.app.sync", using: nil) { task in
        self.handleBackgroundSync(task: task as! BGAppRefreshTask)
    }

    return true
}

func applicationDidEnterBackground(_ application: UIApplication) {
    scheduleBackgroundSync()
}

func scheduleBackgroundSync() {
    let request = BGAppRefreshTaskRequest(identifier: "com.app.sync")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // No sooner than 15 min
    try? BGTaskScheduler.shared.submit(request)
}

func handleBackgroundSync(task: BGAppRefreshTask) {
    // Schedule the next sync before starting this one
    scheduleBackgroundSync()

    let syncOperation = SyncEngine.shared.performSync()

    task.expirationHandler = {
        syncOperation.cancel()
    }

    syncOperation.onComplete { success in
        task.setTaskCompleted(success: success)
    }
}

// Handle silent push
func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {

    SyncEngine.shared.performSync { result in
        switch result {
        case .newData:    completionHandler(.newData)
        case .noData:     completionHandler(.noData)
        case .failed:     completionHandler(.failed)
        }
    }
}
```

### Background Sync Registration (Android — Kotlin)

```kotlin
// Schedule periodic sync with WorkManager
class SyncScheduler {
    fun schedulePeriodicSync(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            repeatInterval = 15, repeatIntervalTimeUnit = TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "data_sync",
            ExistingPeriodicWorkPolicy.KEEP, // Don't replace if already scheduled
            syncRequest
        )
    }
}

// SyncWorker — performs the actual sync
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val syncEngine = SyncEngine.getInstance(applicationContext)
            syncEngine.performSync()
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}

// Handle FCM data message (silent push)
class SyncMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        if (message.data.containsKey("sync_trigger")) {
            // Enqueue one-time sync
            val syncRequest = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build())
                .build()
            WorkManager.getInstance(this).enqueue(syncRequest)
        }
    }

    override fun onNewToken(token: String) {
        // Token refreshed — send to server
        CoroutineScope(Dispatchers.IO).launch {
            ApiClient.registerDeviceToken(token, platform = "android")
        }
    }
}
```

---

## Cross-References

- **[offline-first](../patterns/offline-first.md)** — Offline-first architecture patterns that build on the sync foundations described here
- **[mobile-app-architecture](./mobile-app-architecture.md)** — Broader mobile architecture patterns including the data layer where sync engines live
- **[websockets-realtime](../integration/websockets-realtime.md)** — Deep dive into WebSocket connection management, scaling, and protocol details
- **[mobile-backend-for-frontend](./mobile-backend-for-frontend.md)** — BFF pattern for mobile APIs, including how sync endpoints are designed differently from standard REST

---

## Sources

- [FCM Architectural Overview — Firebase](https://firebase.google.com/docs/cloud-messaging/fcm-architecture)
- [How Push Notification Delivery Works Internally — Clix](https://blog.clix.so/how-push-notification-delivery-works-internally/)
- [Push Notifications Deep Dive: APNs & FCM — Spritle](https://www.spritle.com/blog/push-notifications-deep-dive-the-ultimate-technical-guide-to-apns-fcm/)
- [How to Design a Notification System — System Design Handbook](https://www.systemdesignhandbook.com/guides/design-a-notification-system/)
- [Push Notification Statistics 2025 — Business of Apps](https://www.businessofapps.com/marketplace/push-notifications/research/push-notifications-statistics/)
- [50+ Push Notification Statistics 2025 — MobiLoud](https://www.mobiloud.com/blog/push-notification-statistics)
- [Why People Are Turning Off Push — Andrew Chen](https://andrewchen.com/why-people-are-turning-off-push/)
- [How Figma's Multiplayer Technology Works — Figma Blog](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [Understanding Sync Engines: Figma, Linear, Google Docs — Liveblocks](https://liveblocks.io/blog/understanding-sync-engines-how-figma-linear-and-google-docs-work)
- [Offline-First Architecture: Syncing, Caching, and Conflict Resolution — Medium](https://medium.com/@dadaodunayo6/offline-first-mobile-app-architecture-syncing-caching-and-conflict-resolution-27a4e7b10162)
- [Complete Guide to Offline-First Architecture in Android — droidcon](https://www.droidcon.com/2025/12/16/the-complete-guide-to-offline-first-architecture-in-android/)
- [Firebase vs OneSignal Comparison — Ably](https://ably.com/compare/firebase-vs-onesignal)
- [FCM vs OneSignal Push Comparison — Courier](https://www.courier.com/integrations/compare/firebase-fcm-vs-onesignal-push)
- [BGTaskScheduler — Apple Developer Documentation](https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler)
- [WorkManager Background Task Scheduling — Android Developers](https://developer.android.com/topic/libraries/architecture/workmanager)
- [WebSockets vs SSE — Ably](https://ably.com/blog/websockets-vs-sse)
- [Best Practices for FCM Token Management — Firebase](https://firebase.google.com/docs/cloud-messaging/manage-tokens)
- [Understanding FCM Message Delivery on Android — Firebase Blog](https://firebase.blog/posts/2024/07/understand-fcm-delivery-rates/)
- [Designing a Real-Time Chat App — Design Gurus](https://www.designgurus.io/blog/design-chat-application)
- [Real-Time Data Synchronization in Mobile Apps — Zetaton](https://www.zetaton.com/blogs/real-time-data-synchronization-in-mobile-apps)
