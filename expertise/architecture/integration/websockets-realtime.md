# WebSockets and Real-Time — Architecture Expertise Module

> WebSockets provide full-duplex, persistent connections between client and server, enabling real-time bidirectional communication. They solve the fundamental limitation of HTTP's request-response model but introduce significant complexity in scaling, connection management, and state handling. Every open WebSocket is a piece of server state — and stateful services are inherently harder to scale, deploy, and reason about.

> **Category:** Integration
> **Complexity:** Complex
> **Applies when:** Applications requiring real-time bidirectional communication — chat, collaborative editing, live dashboards, gaming, trading platforms

---

## What This Is (and What It Isn't)

### The WebSocket Protocol

WebSocket (RFC 6455) is a communication protocol that provides full-duplex communication channels over a single TCP connection. It is **not HTTP**. It begins life as an HTTP request — the client sends an `Upgrade: websocket` header — but after the server accepts the handshake, the protocol switches entirely. From that point forward, both sides can send messages at any time without waiting for a request. The connection stays open until one side closes it.

The handshake looks like HTTP:

```
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

The server responds with `101 Switching Protocols`, and from that moment on, the connection speaks WebSocket framing — not HTTP. This distinction matters: HTTP middleware, caching proxies, and CDNs that do not understand WebSocket will break the connection. Load balancers must be configured for WebSocket-aware routing.

### Full-Duplex vs Half-Duplex

**Full-duplex** means both client and server can send data simultaneously and independently. Neither side waits for the other. This is fundamentally different from HTTP's request-response model (half-duplex), where the client sends a request and waits for a response before sending another.

This matters for interactive applications. In a collaborative editor, User A types a character, and User B types a character at the same time. Both changes must reach the server and propagate to the other client without either waiting. HTTP cannot do this without hacks — you would need two separate connections or multiplex over HTTP/2 streams.

### What WebSocket Is Not

WebSocket is not a message broker. It does not provide pub/sub, rooms, presence, message persistence, delivery guarantees, or ordering guarantees across multiple connections. It is a raw bidirectional pipe. Everything else — reconnection, authentication, rooms, fan-out — must be built on top or provided by a library like Socket.IO.

WebSocket is not a replacement for REST. Request-response APIs that fetch data on demand are perfectly served by HTTP. Adding WebSocket to an application that makes ten API calls per page load and updates once a minute is overengineering.

WebSocket is not fire-and-forget. Every open connection consumes server memory (typically 20-50 KB per connection with application-level buffers). Ten thousand connections means 200-500 MB of memory just for connection state, before any application logic. A million connections means 20-50 GB. You pay for every connection whether or not it is actively sending data.

---

## The Alternatives Landscape

WebSocket is one of several real-time communication technologies. Choosing the wrong one is a common and expensive mistake.

### Server-Sent Events (SSE)

SSE is a simple, HTTP-based protocol where the server pushes events to the client over a single long-lived HTTP connection. The client opens a standard HTTP request; the server keeps the response stream open and writes events as they occur.

```
GET /events HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"type": "price", "value": 142.50}

data: {"type": "price", "value": 143.10}
```

**Key properties:**
- Server-to-client only (unidirectional). The client cannot send data back over the same connection.
- Built on standard HTTP — works with all existing infrastructure: CDNs, proxies, load balancers, HTTP/2 multiplexing.
- Automatic reconnection built into the browser API with `Last-Event-ID` for resumption.
- Text-only (no binary frames), though you can Base64-encode binary data.
- Limited to ~6 concurrent connections per domain in HTTP/1.1 (browser limit). HTTP/2 removes this limit via multiplexing.

**When SSE wins over WebSocket:** Notification feeds, live dashboards, stock tickers, news feeds, server log streaming — any scenario where data flows in one direction (server to client) and the client sends requests via normal HTTP endpoints. SSE is dramatically simpler to operate because the connection is standard HTTP.

### Long Polling

The client sends an HTTP request. The server holds the request open until it has new data (or a timeout expires), then responds. The client immediately sends another request. This simulates server push using standard HTTP.

**Key properties:**
- Works everywhere — no special protocol support required.
- High overhead: full HTTP headers on every exchange (hundreds of bytes per round trip).
- Latency floor equals one round trip — the client must receive the response and send a new request before it can receive the next update.
- Simple to implement, simple to debug, simple to scale (stateless servers).

**When long polling wins:** Legacy environments, very low update frequency (once per 5-30 seconds), situations where simplicity and debuggability outweigh latency, or when WebSocket/SSE are blocked by corporate proxies.

### HTTP/2 Server Push and Streams

HTTP/2 server push allows the server to proactively send resources to the client before the client requests them. However, this was designed for preloading assets (CSS, JS), not for real-time data streams. Major browsers have deprecated or removed HTTP/2 push support. It is not a viable real-time solution.

HTTP/2 streams, combined with SSE, are more relevant. HTTP/2 multiplexes multiple streams over a single TCP connection, eliminating the 6-connection limit that hampered SSE over HTTP/1.1. This makes SSE + HTTP/2 a strong combination for many real-time use cases.

### WebTransport

WebTransport is an emerging protocol built on HTTP/3 (QUIC). It provides bidirectional streams and unreliable datagrams over a single connection, avoiding TCP's head-of-line blocking.

**Current state (2025-2026):** Available in Chrome, Edge, and partially Firefox. Safari support is in development. Server infrastructure is limited. The specification is still evolving. WebTransport is the likely long-term successor to WebSocket for latency-sensitive applications (gaming, video), but it is not production-ready for most teams today. Plan for it; do not depend on it yet.

---

## When to Use WebSockets

### Chat and Messaging

Chat requires bidirectional communication with low latency. Users send messages (client-to-server) and receive messages from others (server-to-client) simultaneously. Typing indicators, read receipts, and presence updates all demand real-time bidirectional flow.

**Real-world example — Slack:** Slack maintains a WebSocket connection per active client. Messages, reactions, typing indicators, presence changes, and channel updates all flow over this connection. When Slack scaled from thousands to millions of concurrent users, they moved from a monolithic WebSocket gateway to a sharded architecture with a message fanout service backed by a distributed pub/sub layer. The WebSocket gateway handles connection management; the fanout service handles message routing.

**Real-world example — Discord:** Discord handles over 300 million WebSocket connections. Their gateway infrastructure is built in Elixir, leveraging the BEAM VM's ability to manage millions of lightweight concurrent processes. Discord shards its gateway — each shard handles approximately 5,000 guilds (servers). When a message is sent in a guild, the gateway shard responsible for that guild broadcasts the event to all connected members via their WebSocket connections. Discord can serve nearly two million concurrent users on a single backend server through aggressive optimization of their Elixir services.

### Collaborative Editing

Real-time collaborative editing (Google Docs, Figma, Notion) requires sub-100ms propagation of changes between users editing the same document simultaneously. WebSocket connections carry operational transforms or CRDT operations between clients and the server.

**Real-world example — Figma:** Figma models every document as a tree of objects (similar to the HTML DOM), where each object has an ID and a collection of properties. Figma clients connect to a "multiplayer" service via WebSocket. When a user modifies an element, the operation is sent immediately to the server, which validates it and broadcasts the change to all other connected clients. Figma evaluated CRDTs and Operational Transformations but chose a simplified approach: last-writer-wins on a per-property, per-object basis. This avoids the complexity of full CRDT/OT implementations while handling the vast majority of real-world conflicts in a design tool (two users rarely edit the same property of the same object at the same instant).

### Multiplayer Games

Games require bidirectional, low-latency communication. Player inputs flow client-to-server; game state updates flow server-to-client. Frame rates of 30-60 updates per second mean each message must arrive within 16-33ms. WebSocket (over TCP) works for turn-based and strategy games. For fast-paced action games, WebRTC data channels (over UDP) or the forthcoming WebTransport (over QUIC) are often preferred to avoid TCP's head-of-line blocking.

### Live Trading Platforms

Financial trading dashboards display real-time price feeds (server-to-client) and allow order placement (client-to-server). Latency directly affects profitability. WebSocket connections carry streaming market data from the exchange to the client. Order submissions flow back over the same connection. The bidirectional nature eliminates the round-trip overhead of REST calls for time-sensitive operations.

### Live Dashboards and Monitoring

Operations dashboards, analytics platforms, and monitoring tools that display metrics updating every 1-5 seconds. The server pushes metric updates; the client may send filter or query changes.

**Note:** If the dashboard only displays data and the user does not interact in real time, SSE is usually sufficient and simpler. Use WebSocket only when the client needs to send frequent updates back (e.g., adjusting query parameters, subscribing to different metric streams dynamically).

---

## When to Use SSE Instead

SSE should be the default choice when communication is predominantly server-to-client. The rule of thumb cited by practitioners: **in 80% of cases where teams reach for WebSocket, SSE would have been sufficient.**

### Notification Feeds

Push notifications, activity streams, social media feeds. The server has new data; the client displays it. The client never needs to send data back over this channel — normal HTTP POST/PUT handles user actions.

### Live Scores and Tickers

Sports scores, stock prices, election results. Data flows one direction: server to client. Update frequency is typically 1-10 times per second. SSE handles this with zero protocol complexity.

### Server Log and Build Output Streaming

CI/CD pipelines streaming build logs, server log tailing, deployment status updates. The client watches; it does not send data back.

### AI/LLM Response Streaming

Streaming responses from large language models token-by-token to the client. This is inherently unidirectional — the server generates tokens, the client displays them. SSE is the standard approach used by OpenAI, Anthropic, and most LLM API providers.

### Why SSE Wins in These Cases

- **Infrastructure compatibility:** SSE is plain HTTP. Every CDN, load balancer, reverse proxy, and monitoring tool works with it out of the box. WebSocket requires explicit support at every layer.
- **Automatic reconnection:** The `EventSource` browser API reconnects automatically with `Last-Event-ID`, enabling seamless resumption. WebSocket reconnection must be implemented manually.
- **HTTP/2 multiplexing:** Multiple SSE streams share a single TCP connection, eliminating the per-stream connection overhead.
- **Simpler scaling:** SSE connections are stateless from the server's perspective (the server writes to an HTTP response stream). Standard HTTP load balancing works. No sticky sessions required.

---

## When NOT to Use WebSockets

This section is equally important as the "when to use" section. WebSocket complexity has overwhelmed more teams than it has helped.

### Request-Response Patterns

If your application's communication pattern is "client asks, server answers," you do not need WebSocket. REST or GraphQL over HTTP handles this with better tooling, caching, and observability. Adding WebSocket to avoid "the latency of HTTP" for normal API calls is premature optimization that introduces operational complexity far exceeding any latency savings.

### Low-Frequency Updates

If data changes once per minute or less, simple polling (a GET request every 30-60 seconds) is simpler, cheaper, and more reliable than maintaining a persistent connection. The overhead of an HTTP request every 30 seconds is negligible. The overhead of keeping 100,000 WebSocket connections alive 24/7 for data that updates once a minute is substantial.

**The break-even point:** WebSocket becomes more efficient than polling when update frequency exceeds roughly one update every 1-2 seconds. Below that threshold, polling or long polling is usually the better choice.

### Mobile Applications with Background Restrictions

iOS and Android aggressively kill background connections to conserve battery. A WebSocket connection that works perfectly in the foreground will be terminated within seconds to minutes of the app going to the background. You must implement reconnection logic, state reconciliation on reconnect, and push notification fallback for background delivery.

This means you need WebSocket AND push notifications AND reconciliation logic — three systems instead of one. Many mobile-first teams have discovered that push notifications plus periodic polling provides better user experience with far less complexity than WebSocket on mobile.

### When You Cannot Afford the Scaling Complexity

Scaling WebSocket is fundamentally harder than scaling stateless HTTP services. Each WebSocket connection is a piece of server state pinned to a specific server instance. You cannot simply add more servers behind a load balancer — you need sticky sessions or a pub/sub fanout layer. Deploying new versions requires draining connections gracefully. Monitoring must track per-connection metrics. Memory usage grows linearly with connection count.

**Real cost of WebSocket at scale:** Teams that underestimate this complexity routinely spend months building connection management infrastructure that they expected to take weeks. If your team does not have experience operating stateful services, consider managed real-time services (Ably, Pusher, Supabase Realtime) before building your own WebSocket infrastructure.

### When Corporate Firewalls Block WebSocket

Some enterprise networks, corporate proxies, and older network infrastructure block WebSocket connections or terminate them after a timeout. If your users are behind such networks, WebSocket connections will fail silently or disconnect repeatedly. SSE over HTTP typically passes through these environments without issue.

---

## How It Works: Connection Lifecycle and Scaling

### Connection Lifecycle

```
Client                          Server
  |                               |
  |--- HTTP GET /ws Upgrade --->  |   1. Handshake (HTTP)
  |<-- 101 Switching Protocols -- |   2. Protocol switch
  |                               |
  |<== WebSocket Frame (text) ==> |   3. Bidirectional messages
  |<== WebSocket Frame (binary) =>|      (either side, any time)
  |<== Ping ===================>  |   4. Heartbeat (keep-alive)
  |<== Pong <==================== |
  |                               |
  |--- Close Frame (1000) ------> |   5. Graceful close
  |<-- Close Frame (1000) ------- |
  |          [TCP FIN]            |   6. TCP teardown
```

**Key lifecycle points:**

1. **Handshake:** Standard HTTP request with `Upgrade: websocket`. This is the only point where HTTP authentication headers, cookies, and query parameters are available. After the upgrade, HTTP headers are gone.

2. **Message framing:** WebSocket frames are lightweight — 2-14 bytes of overhead per frame depending on payload size and masking. Compare to HTTP headers at 200-800 bytes per request.

3. **Ping/Pong (heartbeat):** The protocol includes built-in ping/pong frames for keep-alive. The server sends a ping; the client must respond with a pong. If no pong arrives within a timeout, the server considers the connection dead. This is essential for detecting zombie connections — connections where the client has disconnected (phone in a tunnel, browser tab closed on a crashed OS) but the TCP connection has not been properly closed.

4. **Close handshake:** Either side initiates a close by sending a close frame with a status code. The other side responds with a close frame. Then TCP is torn down. Status codes include 1000 (normal), 1001 (going away), 1008 (policy violation), 1011 (server error).

### Heartbeat and Dead Connection Detection

Without heartbeats, dead connections accumulate silently. A server that does not implement ping/pong will hold connections to clients that disconnected hours ago, leaking memory and file descriptors.

```javascript
// Server-side heartbeat (Node.js with ws library)
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});
```

Heartbeat interval is a trade-off: too frequent wastes bandwidth on mobile networks; too infrequent delays dead connection detection. 15-30 seconds is a common production interval.

### Reconnection Strategies

Connections will drop. Networks are unreliable. Servers restart during deployments. Clients move between WiFi and cellular. Reconnection logic is not optional — it is a core requirement.

**Exponential backoff with jitter** is the standard approach:

```javascript
function reconnect(attempt = 0) {
  const baseDelay = 1000;  // 1 second
  const maxDelay = 30000;  // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = delay * (0.5 + Math.random() * 0.5);

  setTimeout(() => {
    const ws = new WebSocket(url);
    ws.onopen = () => { attempt = 0; /* reset on success */ };
    ws.onclose = () => reconnect(attempt + 1);
  }, jitter);
}
```

**Why jitter is critical:** Without jitter, if a server restarts and 50,000 clients reconnect, they all use the same backoff schedule and hit the server in synchronized waves (1s, 2s, 4s, 8s...). Jitter randomizes the reconnection time within each backoff window, spreading the load. This prevents the **reconnection storm** (also called the thundering herd problem), which can take down a server that was otherwise healthy enough to accept connections.

**Graceful draining during deployments:** When deploying a new server version, do not kill connections abruptly. Send a close frame with status 1001 (going away) and a retry hint. Drain connections in batches (e.g., 10% of connections every 5 seconds) rather than all at once. This is sometimes called the "funnel strategy" — gradually offboarding clients to prevent a sudden reconnection storm against the new instances.

### Authentication on WebSocket

WebSocket authentication is awkward because the protocol provides no built-in mechanism after the initial handshake. There are four common approaches, each with trade-offs:

**1. Token in query parameter (common but flawed):**
```javascript
new WebSocket('wss://api.example.com/ws?token=eyJhbGci...')
```
Simple to implement. But the token appears in server logs, proxy logs, and browser history. Not suitable for sensitive tokens. Acceptable for short-lived, single-use tokens.

**2. Cookie-based (most transparent):**
If the WebSocket endpoint is on the same domain as the web application, cookies are sent automatically with the upgrade request. The server validates the session cookie during the handshake. This works seamlessly but is vulnerable to CSRF if you do not validate the `Origin` header.

**3. First-message authentication (most secure):**
Open the connection without credentials. Send a JWT or token as the first message. The server validates the token before accepting any other messages. If validation fails, the server sends an error and closes the connection. This keeps credentials out of URLs and logs.

```javascript
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'auth', token: jwt }));
};
```

**4. Ticket-based (hybrid):**
The client first calls a REST endpoint to obtain a short-lived, single-use WebSocket ticket. Then connects with that ticket. The server validates the ticket during the handshake and invalidates it immediately. This combines the simplicity of query-parameter auth with the security of short-lived tokens.

**Token refresh on long-lived connections:** JWTs expire. A WebSocket connection may outlive the token that authenticated it. Implement token refresh over the WebSocket channel — the server requests a new token before the current one expires, or the client proactively sends a refreshed token.

### Horizontal Scaling: The Core Challenge

A single WebSocket server can handle 10,000-100,000 concurrent connections depending on hardware, message volume, and application logic. When you need more, you scale horizontally — multiple server instances behind a load balancer. This is where WebSocket's statefulness creates real problems.

**The problem:** User A is connected to Server 1. User B is connected to Server 2. User A sends a message to User B. Server 1 has no knowledge of User B's connection — that state lives on Server 2.

**Solution 1: Sticky sessions (simple but fragile)**

Configure the load balancer to route all requests from the same client to the same server (via IP hash, cookie, or connection ID). This ensures a client's WebSocket connection always reaches the same server.

- **Limitation:** If Server 1 goes down, all its clients must reconnect to different servers, losing any in-memory state. Scaling up (adding Server 3) does not redistribute existing connections. Sticky sessions create uneven load distribution over time.

**Solution 2: Pub/Sub fanout (production standard)**

Use a message bus (Redis Pub/Sub, NATS, Kafka) to broadcast messages between server instances. When Server 1 receives a message for a chat room, it publishes to a Redis channel. All servers subscribe to that channel and forward the message to their locally connected clients who are in that room.

```
Client A ──→ WS Server 1 ──→ Redis Pub/Sub ──→ WS Server 2 ──→ Client B
                                    │
                                    └──→ WS Server 3 ──→ Client C
```

This is the standard architecture used by Socket.IO (with its Redis adapter), Discord, Slack, and most production real-time systems.

**Redis Pub/Sub specifics:**
- Fire-and-forget delivery — if a server is down when a message is published, that server's clients miss the message. Acceptable for ephemeral data (typing indicators, presence). Not acceptable for chat messages (use a persistent store as the source of truth).
- Single Redis instance handles approximately 500,000 messages/second. Redis Cluster can scale further.
- No message persistence. If you need replay, use Redis Streams or Kafka instead.

**NATS specifics:**
- Higher throughput than Redis Pub/Sub (millions of messages/second per node).
- Built-in clustering and subject-based routing.
- JetStream provides persistence and replay when needed.
- Increasingly popular as a WebSocket fanout layer in Go-based systems.

**Solution 3: Consistent hashing (for room-based systems)**

Route all connections for a given room/channel to the same server using consistent hashing. This eliminates the need for cross-server fanout within a room but requires a routing layer and re-balancing logic when servers are added or removed.

Discord uses a variant of this: each gateway shard is responsible for a specific set of guilds, and all connections for a guild route to the same shard.

### Presence and Room Management

**Rooms/channels:** Group connections by topic, conversation, or entity. A client subscribes to rooms; messages sent to a room are broadcast to all room members. This is application-level logic built on top of WebSocket — the protocol itself has no concept of rooms.

**Presence:** Tracking which users are currently online. This requires aggregating connection state across all server instances. Common approaches:
- **Heartbeat-based:** Each server periodically publishes its connected user list to a shared store (Redis). A user is "online" if any server reports them connected. A user goes "offline" when no server reports them for N heartbeat intervals.
- **Event-based:** Servers publish connect/disconnect events to a pub/sub channel. A central presence service aggregates these events.

Presence at scale is deceptively hard. Users have multiple devices (phone, laptop, tablet). Each device is a separate connection, possibly to a different server. "Online" means at least one connection exists. "Offline" means zero connections — but you must account for brief disconnects during network switches (a user walking from WiFi to cellular should not appear offline for 5 seconds).

### Message Ordering

WebSocket guarantees message ordering within a single connection (TCP provides this). But in a distributed system with multiple servers and a pub/sub layer, global ordering is not guaranteed. Two messages published to Redis from different servers may arrive at a third server in either order.

If ordering matters (chat messages in a conversation), use a monotonically increasing sequence number assigned by a single authoritative source (e.g., the database insert ID or a centralized sequence service). Clients reorder messages by sequence number, not by arrival order.

---

## Trade-Offs Matrix

| Dimension | WebSocket | SSE | Long Polling | WebTransport |
|---|---|---|---|---|
| **Direction** | Bidirectional | Server → Client | Simulated bidirectional | Bidirectional + datagrams |
| **Protocol overhead** | 2-14 bytes/frame | ~5 bytes/event | 200-800 bytes/exchange | Similar to WebSocket |
| **Connection setup** | HTTP upgrade handshake | Standard HTTP GET | Standard HTTP GET | QUIC handshake |
| **Browser support** | Universal (98%+) | Universal except IE (97%+) | Universal (100%) | Chrome, Edge, partial Firefox (~75%) |
| **Infrastructure compat** | Requires WS-aware proxies | Works everywhere (HTTP) | Works everywhere (HTTP) | Requires HTTP/3 infrastructure |
| **Reconnection** | Manual implementation | Built-in with Last-Event-ID | Implicit (each request is new) | Manual implementation |
| **Scaling difficulty** | High (stateful) | Medium (HTTP-based) | Low (stateless) | High (stateful) |
| **Head-of-line blocking** | Yes (TCP) | Yes (TCP) | N/A (discrete requests) | No (QUIC streams) |
| **Binary data** | Native support | Base64 encoding needed | Base64 encoding needed | Native support |
| **Multiplexing** | One stream per connection | Multiple via HTTP/2 | N/A | Multiple streams per connection |
| **Latency** | Lowest (persistent conn) | Low (persistent conn) | High (per-request overhead) | Lowest (no HOL blocking) |
| **Mobile battery impact** | High (persistent conn) | Moderate | Low (periodic) | TBD |

---

## Evolution Path

Start simple. Escalate only when the simpler approach becomes a bottleneck. This is not theoretical advice — it is the path that successful production systems have followed.

### Level 1: Polling (Start Here)

```
Client ──GET /api/messages?since=timestamp──→ Server
         every 5-30 seconds
```

Works for: dashboards updating every 30 seconds, notification badges, status pages. Zero infrastructure complexity. Stateless servers. Standard HTTP caching. You can serve millions of users with a CDN in front if the data is not user-specific.

**Move to Level 2 when:** Update latency must be under 5 seconds, or polling frequency exceeds once per 2 seconds (at which point the HTTP overhead becomes significant).

### Level 2: SSE (Server-Sent Events)

```
Client ──GET /events──→ Server (keeps connection open, pushes events)
```

Works for: live feeds, notifications, streaming responses, real-time dashboards. Standard HTTP infrastructure. Automatic reconnection. HTTP/2 multiplexing eliminates connection limits.

**Move to Level 3 when:** The client must send frequent real-time data to the server (not just occasional HTTP requests), or you need binary data frames, or you need sub-50ms latency.

### Level 3: WebSocket (Self-Managed)

```
Client ←═══ WebSocket ═══→ Server
```

Works for: chat, collaborative editing, multiplayer games, trading platforms. Full bidirectional communication. Requires connection management, heartbeat, reconnection, and horizontal scaling infrastructure.

**Move to Level 4 when:** You need to scale beyond what your team can comfortably operate, or you need global edge distribution, or you are spending more engineering time on WebSocket infrastructure than on your product.

### Level 4: Managed Real-Time Service

```
Client ←═══ Ably / Pusher / Supabase Realtime ═══→ Your Server
```

Works for: teams that need real-time without the operational burden. The managed service handles connection management, global distribution, scaling, presence, and message guarantees. You publish messages via an API; the service delivers them to connected clients.

**Trade-off:** Vendor lock-in, per-message pricing, less control over protocol details. But you get global edge infrastructure, guaranteed uptime, and zero operational burden for the real-time layer.

---

## Failure Modes

### Connection Leaks (Memory Exhaustion)

**Symptom:** Server memory grows linearly over hours/days. Eventual OOM kill.

**Cause:** Connections that the client has abandoned but the server has not detected. The client closed the browser tab, the phone entered a tunnel, the laptop lid was closed — but no TCP FIN was sent. Without heartbeat/ping-pong, the server holds these zombie connections indefinitely.

**Prevention:** Implement server-side ping/pong with a strict timeout (e.g., ping every 30s, terminate if no pong within 10s). Monitor `connections_active` vs `connections_established` — a growing gap indicates leaks. Set file descriptor limits and connection caps per server. Log connection duration distributions; connections lasting >24 hours in most applications are likely zombies.

### Reconnection Storms (Thundering Herd)

**Symptom:** Server restarts or network blip causes all clients to reconnect simultaneously, overloading the server.

**Cause:** All clients detect the disconnect at the same time and retry immediately or with the same backoff schedule (no jitter).

**Prevention:** Always use exponential backoff with random jitter. During deployments, drain connections in batches (funnel strategy). Over-provision capacity to handle the reconnection surge. Consider a "connection queue" that rate-limits new WebSocket handshakes during high-load periods.

**Real cost:** A team at a mid-size startup reported that a single server restart caused 80,000 simultaneous reconnection attempts, taking down all three backup servers in a cascade. The root cause was missing jitter in their reconnection logic.

### Message Ordering Violations

**Symptom:** Chat messages appear in the wrong order. Collaborative edits produce incorrect state.

**Cause:** Messages routed through different pub/sub paths or server instances arrive out of order. TCP guarantees ordering within a single connection, but the pub/sub fanout layer does not.

**Prevention:** Assign monotonically increasing sequence numbers at the authoritative source (typically the database or a sequence service). Clients buffer and reorder by sequence number. For collaborative editing, use vector clocks or lamport timestamps.

### Mobile Background Disconnects

**Symptom:** Mobile users report missed messages or delayed notifications when the app is backgrounded.

**Cause:** iOS terminates background network connections within ~30 seconds. Android is similarly aggressive with Doze mode. The WebSocket connection dies silently when the app is backgrounded.

**Prevention:** Implement a dual-channel strategy: WebSocket for foreground real-time delivery, push notifications (APNs/FCM) for background delivery. On app foreground, reconnect the WebSocket and reconcile state by fetching missed messages from the server (using a "since" cursor or sequence number).

### Backpressure and Slow Consumers

**Symptom:** Server memory spikes when a client on a slow connection cannot consume messages fast enough.

**Cause:** The server queues outbound messages in memory for each client connection. If a client's network is slow (mobile on 2G), messages accumulate faster than they can be sent. With thousands of such clients, memory explodes.

**Prevention:** Set per-connection outbound buffer limits. When the buffer exceeds the limit, either drop messages (acceptable for ephemeral data like cursor positions), send a "catch up from server" signal and disconnect the client, or downgrade to sending only the latest state (conflation). Monitor per-connection send queue depth.

### Split-Brain in Presence

**Symptom:** Users appear online/offline incorrectly, or presence updates are delayed by minutes.

**Cause:** Presence aggregation across multiple servers is eventually consistent. Server 1 reports User A as connected; Server 2 has not received the heartbeat yet. During network partitions between servers, presence can diverge.

**Prevention:** Use a TTL-based presence model — a user is online if their presence record in Redis has not expired. Set TTL to 2-3x the heartbeat interval. Accept that presence is inherently approximate (not strongly consistent) and design the UX accordingly.

---

## Technology Landscape

### Raw WebSocket Libraries

**`ws` (Node.js):** The most popular Node.js WebSocket library. Minimal abstraction — gives you a raw WebSocket server with no opinions about rooms, auth, or reconnection. Handles 50,000+ connections per server. Use this when you want full control and minimal overhead.

**`gorilla/websocket` (Go, now archived) / `nhooyr.io/websocket` (Go):** High-performance Go WebSocket libraries. Go's goroutine model handles massive concurrency well — a single Go server can manage hundreds of thousands of connections. `nhooyr.io/websocket` is the actively maintained choice as of 2025.

**`tokio-tungstenite` (Rust):** For the highest performance requirements. Rust's zero-cost abstractions and lack of garbage collection make it suitable for systems targeting millions of connections per server.

### Frameworks with Built-in Real-Time

**Socket.IO (Node.js):** The most widely used real-time framework. Provides rooms, namespaces, automatic reconnection, fallback to long polling, and a Redis adapter for horizontal scaling. Socket.IO adds approximately 5-10% overhead compared to raw `ws` due to its protocol wrapper, but the developer experience improvements are significant for most teams.

**Caution:** Socket.IO uses its own protocol on top of WebSocket. Socket.IO clients cannot connect to raw WebSocket servers and vice versa. This is a one-way door — choosing Socket.IO means your clients must use the Socket.IO client library. If you need interoperability with third-party WebSocket clients, use raw WebSocket.

**Phoenix Channels (Elixir):** Built on the BEAM VM, Phoenix Channels provide real-time communication with built-in presence tracking and pub/sub. The BEAM's process model — millions of lightweight processes with isolated memory — makes Phoenix exceptionally well-suited for WebSocket workloads. Discord's gateway is built on this foundation. Phoenix Channels handle connection management, heartbeat, reconnection, topic-based routing, and presence out of the box.

**ActionCable (Rails):** Rails' built-in WebSocket framework. Integrates with Redis for pub/sub. Convenient for Rails applications but limited in performance compared to dedicated WebSocket servers. Suitable for applications with thousands, not hundreds of thousands, of concurrent connections.

**Django Channels (Python):** Adds WebSocket support to Django via ASGI. Uses a channel layer (typically Redis) for cross-process communication. Python's GIL limits per-process concurrency, so scaling requires multiple worker processes.

### Managed Real-Time Services

**Ably:** Enterprise-grade managed real-time messaging. Global edge network, message guarantees (exactly-once delivery), presence, history/replay, and connection state recovery. Pricing is per-message and per-connection.

**Pusher:** One of the original managed real-time services. Simple API, good documentation, generous free tier. Primarily targets pub/sub use cases (channels with publish/subscribe). Less feature-rich than Ably for complex use cases.

**Supabase Realtime:** Built on Elixir/Phoenix. Provides real-time subscriptions to Postgres changes — when a row changes in your database, connected clients receive the update automatically. Particularly compelling for applications already using Supabase for their backend.

**PubNub:** Global real-time messaging infrastructure. Focus on IoT and mobile messaging. Provides message persistence, access control, and push notification integration.

### Backend Fanout Infrastructure

**Redis Pub/Sub:** The default choice for cross-server message fanout. Simple, fast (~500K messages/sec per instance), widely supported. No persistence — messages are fire-and-forget.

**Redis Streams:** Persistent, ordered log with consumer groups. Use when you need message replay and guaranteed delivery, not just fire-and-forget fanout.

**NATS:** High-performance messaging system. Higher throughput than Redis Pub/Sub (millions of messages/sec). JetStream adds persistence. Excellent for Go-based systems. Supports subject-based routing with wildcards.

**Kafka:** Overkill for most WebSocket fanout use cases (designed for event streaming, not ephemeral pub/sub). Consider Kafka when your fanout layer also needs to feed analytics pipelines, audit logs, or stream processing.

---

## Decision Tree

```
Do you need real-time updates?
├── No → Standard REST/GraphQL. Stop here.
└── Yes
    ├── How frequent are updates?
    │   ├── Less than once per 30 seconds → Polling. Stop here.
    │   └── More frequent → Continue
    │
    ├── Does the client need to send real-time data to the server?
    │   ├── No (server → client only)
    │   │   ├── Text data? → SSE. Stop here.
    │   │   └── Binary data or need multiplexing? → WebSocket or WebTransport.
    │   │
    │   └── Yes (bidirectional)
    │       ├── Can your team operate stateful infrastructure?
    │       │   ├── No → Use managed service (Ably, Pusher, Supabase Realtime).
    │       │   └── Yes
    │       │       ├── Scale: < 10K connections → Single WebSocket server.
    │       │       ├── Scale: 10K-500K connections → WebSocket + Redis Pub/Sub.
    │       │       ├── Scale: 500K-5M connections → Sharded WebSocket + NATS/Redis Cluster.
    │       │       └── Scale: > 5M connections → Custom gateway (Elixir/Go/Rust) or managed service.
    │       │
    │       └── Is latency critical (<10ms) and TCP HOL blocking unacceptable?
    │           ├── Yes → WebTransport (if browser support sufficient) or WebRTC data channels.
    │           └── No → WebSocket.
    │
    └── Special case: Database change notifications?
        └── Supabase Realtime, Hasura Subscriptions, or CDC + SSE.
```

---

## Implementation Sketch

A minimal but production-aware WebSocket server in Node.js with `ws`, illustrating the patterns discussed above:

```javascript
// server.js — WebSocket server with heartbeat, auth, rooms, and Redis fanout
import { WebSocketServer } from 'ws';
import { createClient } from 'redis';
import { verify } from 'jsonwebtoken';

const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map(); // roomId -> Set<ws>

// Redis pub/sub for horizontal scaling
const redisSub = createClient();
const redisPub = createClient();
await redisSub.connect();
await redisPub.connect();

// Subscribe to cross-server messages
await redisSub.subscribe('chat:broadcast', (message) => {
  const { roomId, data, originServer } = JSON.parse(message);
  if (originServer === SERVER_ID) return; // Skip own messages
  broadcastToRoom(roomId, data);
});

// Heartbeat: detect dead connections
const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_TIMEOUT = 10_000;

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.isAuthenticated = false;
  ws.rooms = new Set();

  ws.on('pong', () => { ws.isAlive = true; });

  // Authentication: first message must be auth token
  const authTimeout = setTimeout(() => {
    if (!ws.isAuthenticated) {
      ws.close(4001, 'Authentication timeout');
    }
  }, 5000);

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);

    // First message must authenticate
    if (!ws.isAuthenticated) {
      if (msg.type !== 'auth') {
        return ws.close(4002, 'First message must be auth');
      }
      try {
        ws.user = verify(msg.token, process.env.JWT_SECRET);
        ws.isAuthenticated = true;
        clearTimeout(authTimeout);
        ws.send(JSON.stringify({ type: 'auth:ok' }));
      } catch {
        ws.close(4003, 'Invalid token');
      }
      return;
    }

    // Handle authenticated messages
    switch (msg.type) {
      case 'join':
        joinRoom(ws, msg.roomId);
        break;
      case 'leave':
        leaveRoom(ws, msg.roomId);
        break;
      case 'message':
        handleMessage(ws, msg);
        break;
    }
  });

  ws.on('close', () => {
    clearTimeout(authTimeout);
    ws.rooms.forEach((roomId) => leaveRoom(ws, roomId));
  });
});

function joinRoom(ws, roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(ws);
  ws.rooms.add(roomId);
}

function leaveRoom(ws, roomId) {
  rooms.get(roomId)?.delete(ws);
  if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
  ws.rooms.delete(roomId);
}

function handleMessage(ws, msg) {
  const data = JSON.stringify({
    type: 'message',
    from: ws.user.id,
    roomId: msg.roomId,
    body: msg.body,
    ts: Date.now(),
  });

  // Broadcast locally
  broadcastToRoom(msg.roomId, data);

  // Broadcast to other servers via Redis
  redisPub.publish('chat:broadcast', JSON.stringify({
    roomId: msg.roomId,
    data,
    originServer: SERVER_ID,
  }));
}

function broadcastToRoom(roomId, data) {
  const members = rooms.get(roomId);
  if (!members) return;
  for (const client of members) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  }
}

// Graceful shutdown: drain connections
process.on('SIGTERM', () => {
  clearInterval(heartbeat);
  wss.clients.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });
  setTimeout(() => process.exit(0), 5000);
});
```

**Client-side reconnection with exponential backoff:**

```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.maxRetries = options.maxRetries ?? 10;
    this.baseDelay = options.baseDelay ?? 1000;
    this.maxDelay = options.maxDelay ?? 30000;
    this.attempt = 0;
    this.handlers = new Map();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.attempt = 0; // Reset on successful connection
      this.authenticate();
      this.emit('open');
    };

    this.ws.onclose = (event) => {
      if (event.code === 1000) return; // Normal close, don't reconnect
      this.scheduleReconnect();
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.emit(msg.type, msg);
    };
  }

  scheduleReconnect() {
    if (this.attempt >= this.maxRetries) {
      this.emit('maxRetriesReached');
      return;
    }
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempt),
      this.maxDelay
    );
    const jitter = delay * (0.5 + Math.random() * 0.5);
    this.attempt++;
    setTimeout(() => this.connect(), jitter);
  }

  send(type, payload) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
  }

  emit(event, data) {
    this.handlers.get(event)?.forEach((h) => h(data));
  }
}
```

---

## Cross-References

- **[push-and-sync](../patterns/push-and-sync.md)** — Patterns for synchronizing state between client and server after reconnection; essential complement to WebSocket reconnection logic.
- **[api-design-rest](../integration/api-design-rest.md)** — REST remains the right choice for request-response patterns; WebSocket should complement REST, not replace it.
- **[event-driven](../patterns/event-driven.md)** — WebSocket is often the client-facing delivery mechanism for an event-driven backend architecture.
- **[horizontal-vs-vertical](../scaling/horizontal-vs-vertical.md)** — WebSocket's statefulness creates unique horizontal scaling challenges covered in depth here.
- **[stateless-design](../foundations/stateless-design.md)** — WebSocket is inherently stateful; understanding stateless design principles helps minimize the stateful surface area.

---

## Sources

- [Ably: WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices)
- [Ably: WebSockets vs SSE](https://ably.com/blog/websockets-vs-sse)
- [Ably: Scaling Pub/Sub with WebSockets and Redis](https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis)
- [Ably: Can WebTransport Replace WebSockets?](https://ably.com/blog/can-webtransport-replace-websockets)
- [Ably: Socket.IO vs WebSocket](https://ably.com/topic/socketio-vs-websocket)
- [How Figma's Multiplayer Technology Works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [Figma: Making Multiplayer More Reliable](https://www.figma.com/blog/making-multiplayer-more-reliable/)
- [How Discord Handles Two and Half Million Concurrent Voice Users](https://discord.com/blog/how-discord-handles-two-and-half-million-concurrent-voice-users-using-webrtc)
- [Discord: Architecting for Hyperscale](https://d4dummies.com/architecting-for-hyperscale-an-in-depth-analysis-of-discords-billion-message-per-day-infrastructure/)
- [7 WebSocket Scaling Patterns for 1M Connections](https://dev.to/jsgurujobs/7-websocket-scaling-patterns-that-let-nodejs-handle-1m-real-time-connections-2gf2)
- [Deal with Reconnection Storm — Two Strategies](https://amirsoleimani.medium.com/deal-with-reconnection-storm-two-strategies-4a835d0457f6)
- [WebSocket.org: The Future of WebSockets — HTTP/3 and WebTransport](https://websocket.org/guides/future-of-websockets/)
- [Heroku: WebSocket Security](https://devcenter.heroku.com/articles/websocket-security)
- [Horizontally Scaling Node.js and WebSockets with Redis](https://goldfirestudios.com/horizontally-scaling-node-js-and-websockets-with-redis)
- [ByteByteGo: Short/Long Polling, SSE, WebSocket](https://bytebytego.com/guides/shortlong-polling-sse-websocket/)
