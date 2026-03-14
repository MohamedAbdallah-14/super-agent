# Observability for Performance Engineering

> **Expertise Module** | Domain: Performance / Infrastructure
> Last updated: 2026-03-08

---

## Table of Contents

1. [Overview](#overview)
2. [The Three Pillars: Metrics, Logs, Traces](#the-three-pillars-metrics-logs-traces)
3. [When to Use Each Pillar for Performance](#when-to-use-each-pillar-for-performance)
4. [OpenTelemetry](#opentelemetry)
5. [Distributed Tracing Systems](#distributed-tracing-systems)
6. [Metrics Systems: Prometheus and Datadog](#metrics-systems-prometheus-and-datadog)
7. [RED and USE Methods](#red-and-use-methods)
8. [SLOs, SLIs, and Error Budgets](#slos-slis-and-error-budgets)
9. [Sampling Strategies](#sampling-strategies)
10. [Alerting on Performance](#alerting-on-performance)
11. [Cost Management and Optimization](#cost-management-and-optimization)
12. [Common Bottlenecks](#common-bottlenecks)
13. [Anti-Patterns](#anti-patterns)
14. [Before/After: Observability-Driven Performance Fixes](#beforeafter-observability-driven-performance-fixes)
15. [Decision Tree: What Should I Monitor?](#decision-tree-what-should-i-monitor)
16. [Quick Reference](#quick-reference)
17. [Sources](#sources)

---

## Overview

Observability is the ability to understand a system's internal state from its external outputs.
For performance engineering, observability answers: "Why is my system slow, and where?"

**Key industry numbers:**

- The global observability market reached $28.5 billion in 2025 (Gartner/Research Nester).
- 15-25% of infrastructure budgets are allocated to observability (Gartner).
- Over 50% of observability spend goes to logs alone (ClickHouse TCO Report).
- 97% of organizations have experienced unexpected observability cost surprises (Grepr AI, 2026).
- 36% of enterprise clients spend over $1M/year on observability; 4% exceed $10M (Gartner).

Observability is not monitoring. Monitoring tells you *what* is broken. Observability tells you *why*.

---

## The Three Pillars: Metrics, Logs, Traces

### Metrics

Numeric measurements of system behavior over time. Stored as time series.

| Property         | Detail                                                    |
|------------------|-----------------------------------------------------------|
| **Data type**    | Counters, gauges, histograms, summaries                   |
| **Storage cost** | Low (~8 bytes per data point in Prometheus TSDB)          |
| **Query speed**  | Fast (pre-aggregated, indexed by label)                   |
| **Best for**     | Dashboards, alerting, trend analysis, capacity planning   |
| **Cardinality**  | Must be bounded (unbounded labels destroy performance)    |

Typical performance metrics: request rate, error rate, p50/p95/p99 latency, CPU utilization,
memory usage, queue depth, connection pool saturation.

### Logs

Discrete events with structured or unstructured text.

| Property         | Detail                                                    |
|------------------|-----------------------------------------------------------|
| **Data type**    | Text records with timestamps and metadata                 |
| **Storage cost** | High (can be 10-100x more than metrics at scale)          |
| **Query speed**  | Slow without indexing; fast with structured/indexed logs   |
| **Best for**     | Debugging, audit trails, error details, forensic analysis |
| **Volume risk**  | Easily grows to TB/day in production systems              |

Performance-relevant log patterns: slow query logs (>100ms), garbage collection pauses,
connection timeouts, circuit breaker state changes, retry exhaustion events.

### Traces

End-to-end records of a request's journey through distributed services.

| Property         | Detail                                                    |
|------------------|-----------------------------------------------------------|
| **Data type**    | Directed acyclic graphs (DAGs) of spans with timing data  |
| **Storage cost** | Medium-high (each trace can contain 10-100+ spans)        |
| **Query speed**  | Moderate (requires trace ID lookup or attribute search)    |
| **Best for**     | Latency analysis, dependency mapping, bottleneck finding   |
| **Sampling**     | Almost always required at scale (1-10% typical)           |

A single trace through a microservices system might contain 20-50 spans, each recording
service name, operation, duration, status, and custom attributes.

---

## When to Use Each Pillar for Performance

```
Question You're Asking               --> Pillar to Use
──────────────────────────────────────────────────────────────
"Is latency increasing over time?"    --> Metrics (histogram)
"What's the p99 latency right now?"   --> Metrics (histogram quantile)
"Why was THIS request slow?"          --> Traces (span waterfall)
"What error did the DB return?"       --> Logs (structured error log)
"Which service is the bottleneck?"    --> Traces (critical path analysis)
"Is CPU saturated?"                   --> Metrics (USE method)
"What happened during the outage?"    --> Logs + Traces (correlated)
"Are we meeting our latency SLO?"     --> Metrics (SLI tracking)
"What changed between deployments?"   --> Metrics (before/after comparison)
"Why did GC pause spike?"            --> Logs (GC log analysis)
```

**Rule of thumb:** Metrics for *detecting*, traces for *diagnosing*, logs for *explaining*.

---

## OpenTelemetry

OpenTelemetry (OTel) is the CNCF standard for telemetry collection. It provides vendor-neutral
APIs, SDKs, and a Collector for metrics, logs, and traces.

### Auto-Instrumentation

Auto-instrumentation injects telemetry collection without code changes. Available for:
Java (agent), Python (sitecustomize), Node.js (require hooks), .NET (startup hooks), Go (eBPF).

**Overhead benchmarks (from OTel official benchmarks and academic research):**

| Language | CPU Overhead       | Latency Impact (p95) | Memory Overhead   | Source                                |
|----------|--------------------|----------------------|-------------------|---------------------------------------|
| Java     | 3-20% typical      | 9-16% increase       | 50-150 MB heap    | OTel Java Instrumentation benchmarks  |
| Go       | 7-35% (varies)     | 5-15% increase       | 20-60 MB          | Coroot OTel Go overhead study         |
| Python   | 5-15%              | 10-25% increase      | 30-80 MB          | OTel Python SDK benchmarks            |
| Node.js  | 3-10%              | 5-15% increase       | 20-50 MB          | OTel JS community benchmarks          |

**Key findings from benchmarks:**

- Java agent: CPU overhead ranges from 3.6% (10% sampling) to 17.8% (100% sampling) of
  additional CPU usage (Umea University research, 2024).
- Go: ~35% CPU increase under full tracing load; ~7% CPU overhead for Redis operations
  specifically (Coroot benchmark, 2024).
- Batch size impact: CPU overhead increases from 18.4% to 49.0% as batch size decreases,
  making batch configuration critical (OTel specification benchmarks).
- Manual tracing consistently causes less overhead than automatic tracing (TechRxiv, 2024).

### Custom Spans

When auto-instrumentation is insufficient, create custom spans for business-critical paths:

```python
from opentelemetry import trace

tracer = trace.get_tracer("payment-service")

def process_payment(order):
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("order.amount", order.amount)
        span.set_attribute("order.currency", order.currency)

        with tracer.start_as_current_span("validate_card"):
            validate(order.card)  # creates child span

        with tracer.start_as_current_span("charge_provider"):
            result = charge(order)  # creates child span
            span.set_attribute("payment.provider_latency_ms", result.latency)

        return result
```

**Guidelines for custom spans:**

- Instrument operations taking >1ms that cross boundaries (network, disk, queue).
- Add business attributes (order value, customer tier) for filtering.
- Avoid spans inside tight loops (creating a span costs ~1 microsecond, but at 1M iterations
  that adds 1 second of pure overhead).
- Use span events for lightweight annotations instead of child spans.

### The OTel Collector

The Collector sits between instrumented applications and backends, providing:

- **Receivers**: Accept data via OTLP, Jaeger, Zipkin, Prometheus, and 80+ formats.
- **Processors**: Batch, filter, sample, transform, and enrich telemetry.
- **Exporters**: Send to any backend (Jaeger, Tempo, Prometheus, Datadog, etc.).

**Performance characteristics of the Collector:**

- Batching processor: groups spans into batches of 8192 (default), reducing export overhead
  by 10-50x compared to per-span export.
- Memory limiter processor: prevents OOM by dropping data when memory exceeds threshold
  (recommended: set to 80% of available memory).
- Typical resource usage: 0.5-2 CPU cores and 512 MB-2 GB RAM for 50,000 spans/second
  throughput (OTel Collector benchmarks).

### Reducing OTel Overhead

Strategies that reduce CPU overhead by 50-70% (OneUptime, 2026):

1. **Selective instrumentation**: Disable instrumentations you don't need
   (e.g., `OTEL_INSTRUMENTATION_HTTP_ENABLED=false`).
2. **Increase batch size**: Larger batches amortize export cost; 8192+ spans per batch.
3. **Use sampling**: Even 10% sampling reduces CPU overhead by ~80% (Umea research).
4. **Async exporters**: Never block the application thread on telemetry export.
5. **Filter at the Collector**: Drop low-value spans before export to reduce backend load.

---

## Distributed Tracing Systems

### Jaeger

Originally developed by Uber, now a CNCF graduated project.

- **Jaeger 2.0** (November 2024): Rebuilt on the OpenTelemetry Collector framework.
  Single binary reduced image size from 40 MB to 30 MB. Native OTLP support eliminates
  translation overhead. Adds tail-based sampling via OTel sampler (CNCF, 2024).
- **Architecture**: Agent (sidecar) buffers traces locally, preventing app slowdown if
  the collector is unavailable. Collector handles ingestion and indexing.
- **Storage backends**: Cassandra, Elasticsearch, Kafka, Badger (local), ClickHouse.
- **Adaptive sampling**: Adjusts sampling rate per-service based on traffic volume.
- **Scale**: Uber processes billions of spans/day with Jaeger in production.

### Zipkin

The original open-source distributed tracing system (from Twitter's Dapper paper implementation).

- **Architecture**: Direct reporting from services to Zipkin server (no sidecar agent).
  Lower latency for trace visibility but higher risk of app impact if Zipkin is unavailable.
- **Overhead**: Slightly higher CPU and memory usage than OTel-based alternatives in
  comparative benchmarks (Umea University, 2024).
- **Storage**: Cassandra, Elasticsearch, MySQL.
- **Consideration**: Jaeger now supports Zipkin format, so migration path is clear.

### Grafana Tempo

Purpose-built for cost-effective trace storage.

- **Key differentiator**: Uses object storage (S3, GCS, Azure Blob) instead of databases,
  reducing operational complexity and storage cost by 10-100x vs. Elasticsearch-backed
  solutions for large trace volumes.
- **TraceQL**: Query language for searching traces by attributes, duration, and structure.
- **Integration**: Native integration with Grafana, Loki (logs), and Mimir (metrics) for
  correlated observability.
- **Scale**: Designed for petabyte-scale trace storage with minimal indexing overhead.

### Choosing a Tracing Backend

```
Evaluation Criteria          Jaeger 2.0        Zipkin          Tempo
─────────────────────────────────────────────────────────────────────
OTel native                  Yes (v2 core)     Via collector   Yes
Storage cost at scale        Medium            Medium          Low (object storage)
Operational complexity       Medium            Low             Low
Tail-based sampling          Yes (v2)          No              Via Collector
Query capability             Good              Basic           TraceQL (powerful)
Ecosystem integration        Broad             Broad           Grafana stack
Production maturity          Very high         Very high       High
```

---

## Metrics Systems: Prometheus and Datadog

### Prometheus

Open-source, pull-based metrics system. De facto standard for Kubernetes monitoring.

- **Data model**: Multi-dimensional time series identified by metric name and key/value labels.
- **Query language**: PromQL -- powerful, expressive, but steep learning curve.
- **Storage**: Local TSDB with ~1.3 bytes per sample (compressed). Retention typically 15-90 days.
- **Scrape interval**: Default 15 seconds. Lower intervals increase storage and CPU linearly.
- **Scalability limit**: Single Prometheus instance handles ~10M active time series;
  beyond that, use Thanos or Cortex for federation.
- **Cost**: Free (open source). Infrastructure cost ~$0.03-0.06 per node/hour for managed
  services (e.g., Grafana Cloud, Amazon Managed Prometheus).
- **Metric types**: Counter, Gauge, Histogram, Summary.

**Performance-relevant PromQL examples:**

```promql
# p99 latency over 5 minutes
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Error rate as percentage
sum(rate(http_requests_total{status=~"5.."}[5m]))
/ sum(rate(http_requests_total[5m])) * 100

# CPU saturation (runnable threads waiting)
rate(node_schedstat_waiting_seconds_total[5m])
```

### Datadog

Commercial full-stack observability platform.

- **Data model**: Push-based with 600+ pre-built integrations.
- **Custom metrics**: $0.05 per custom metric per month (at scale). Costs escalate rapidly
  with high-cardinality metrics.
- **Strengths**: Anomaly detection, forecast monitoring, composite alerts, APM correlation.
- **APM pricing**: Based on traced hosts ($31-40/host/month) plus ingested spans
  ($0.10 per million after included volume).
- **Real-time**: 1-second granularity for infrastructure metrics (vs. 15s for Prometheus default).

### Prometheus vs. Datadog: Decision Factors

| Factor                  | Prometheus                        | Datadog                            |
|-------------------------|-----------------------------------|------------------------------------|
| Cost at 100 hosts       | $0 (self-hosted) + infra          | ~$3,100-4,000/month                |
| Cost at 1000 hosts      | $0 + significant infra            | ~$31,000-40,000/month              |
| Setup time              | Hours (with Helm chart)           | Minutes (agent install)            |
| Custom metrics cost     | Free                              | $0.05/metric/month                 |
| Vendor lock-in          | None                              | High                               |
| Operational overhead    | High (you manage everything)      | Low (fully managed)                |
| AI/ML features          | None built-in                     | Anomaly detection, forecasting     |
| Query language          | PromQL (powerful, open)           | DQL (proprietary)                  |

---

## RED and USE Methods

### RED Method (for Services)

Developed by Tom Wilkie (Grafana Labs). Measures the user-facing behavior of every service.

**R**ate -- requests per second served by the service.
**E**rrors -- failed requests per second (HTTP 5xx, gRPC errors, exceptions).
**D**uration -- distribution of request latencies (p50, p95, p99).

```
Apply RED to:
  - API gateways and load balancers
  - Microservice endpoints
  - Message queue consumers
  - Database query paths
  - External API calls
```

**Implementation example (Prometheus metrics):**

```
# Rate
sum(rate(http_requests_total[5m])) by (service)

# Errors
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)

# Duration (p99)
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

### USE Method (for Resources)

Developed by Brendan Gregg. Measures the health of every physical/virtual resource.

**U**tilization -- percentage of resource capacity in use (0-100%).
**S**aturation -- work that cannot be served (queue depth, runnable threads waiting).
**E**rrors -- count of error events on the resource.

```
Apply USE to:
  - CPU (utilization, run queue, hardware errors)
  - Memory (usage %, swap activity, OOM events)
  - Disk I/O (bandwidth utilization, I/O wait queue, read/write errors)
  - Network (bandwidth %, TCP retransmits, dropped packets)
  - Connection pools (active/max, waiters, timeouts)
  - Thread pools (active/max, queue depth, rejections)
```

### RED + USE Together

```
                    USE Method                    RED Method
                    (Resources)                   (Services)
                    ┌─────────────────┐          ┌─────────────────┐
                    │ CPU utilization  │          │ Request rate     │
  Infrastructure    │ Memory saturat.  │   App    │ Error rate       │
  Layer             │ Disk I/O errors  │   Layer  │ Latency p99      │
                    └────────┬────────┘          └────────┬────────┘
                             │                            │
                             └──────────┬─────────────────┘
                                        │
                              ┌─────────▼─────────┐
                              │ Correlated View    │
                              │ "p99 latency spiked│
                              │  because CPU hit   │
                              │  95% utilization"  │
                              └────────────────────┘
```

---

## SLOs, SLIs, and Error Budgets

### Service Level Indicators (SLIs)

An SLI is a quantitative measure of a specific aspect of service performance. For performance
engineering, the most critical SLIs are:

| SLI Type          | Example Measurement                      | Typical Target      |
|-------------------|------------------------------------------|----------------------|
| Availability      | Successful requests / total requests     | 99.9% - 99.99%      |
| Latency           | % requests completing within threshold   | 99.9% < 200ms       |
| Throughput        | Requests processed per second            | > 10,000 rps        |
| Error rate        | Failed requests / total requests         | < 0.1%              |
| Saturation        | Resource utilization below threshold     | < 80% CPU           |

**Best practice:** Measure SLIs at the load balancer or API gateway, not internally. The user's
experience is what matters, not what the server thinks happened.

### Service Level Objectives (SLOs)

An SLO is the target value for an SLI over a rolling time window.

**Common performance SLOs:**

```
SLO: 99.9% of HTTP requests complete in < 200ms over a 30-day window.

Meaning:
  - Total requests in 30 days:  ~130 million (at 50 rps)
  - Allowed slow requests:      ~130,000 (0.1% error budget)
  - That's ~4,333 slow requests per day
  - Or ~180 slow requests per hour
```

**SLO target selection guide:**

| SLO Target | Monthly Error Budget | Use Case                                |
|------------|----------------------|-----------------------------------------|
| 99%        | 7.3 hours            | Internal tools, batch processing        |
| 99.5%      | 3.6 hours            | Non-critical customer-facing services   |
| 99.9%      | 43.8 minutes         | Most production APIs and web apps       |
| 99.95%     | 21.9 minutes         | Payment processing, auth services       |
| 99.99%     | 4.3 minutes          | Core infrastructure, DNS, load balancer |

### Error Budgets

The error budget is the inverse of the SLO: `error_budget = 1 - SLO_target`.

**How error budgets drive performance decisions:**

```
Error Budget State          Action
───────────────────────────────────────────────────────────────
Budget > 50% remaining      Ship features freely. Performance
                            improvements are optional.

Budget 20-50% remaining     Increase caution. Require performance
                            review for risky deployments.

Budget < 20% remaining      Freeze feature releases. All engineering
                            effort directed at reliability/performance.

Budget exhausted (0%)       Full stop on deploys. Incident-level
                            response. Postmortem required.
```

**Error budget calculation example:**

```
SLO: 99.9% availability over 30 days
Total minutes: 43,200
Error budget: 43,200 * 0.001 = 43.2 minutes of downtime allowed

Day 15: 20 minutes of downtime consumed
Remaining budget: 23.2 minutes (53.7% remaining)
Status: CAUTION -- increase deployment scrutiny
```

**73% of organizations experienced an outage costing over $100,000 in the past year** (Nobl9
error budget guide, 2024). Error budgets provide a framework to balance feature velocity
against these risks.

---

## Sampling Strategies

At scale, collecting 100% of traces is neither affordable nor necessary. Sampling strategies
determine which traces to keep.

### Head-Based Sampling

Decision made at trace creation time (the "head" of the trace).

- **How it works**: A random number determines if the trace is sampled. The decision
  propagates to all downstream services via trace context headers.
- **Pros**: Simple, low overhead, predictable cost, no buffering required.
- **Cons**: Cannot make decisions based on trace outcome (errors, latency). May miss
  rare but important events.
- **Overhead**: Minimal -- just a random number comparison at span creation.
- **Typical rate**: 1-10% for high-throughput services (>1000 rps).

```
# OpenTelemetry head-based sampling configuration
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.01  # 1% sampling
```

### Tail-Based Sampling

Decision made after the entire trace completes (the "tail").

- **How it works**: All spans are buffered in a collector. After a timeout (typically
  30-60 seconds), the complete trace is evaluated against policies.
- **Pros**: Can keep traces with errors, high latency, or specific attributes.
  Dramatically improves signal-to-noise ratio for debugging.
- **Cons**: Requires buffering all spans (high memory: 2-8 GB per collector typical).
  All spans of a trace must reach the same collector instance (routing complexity).
  During incidents, resource usage spikes as more traces match "keep" criteria.
- **Overhead**: 2-5x more infrastructure than head-based sampling.

```yaml
# OTel Collector tail sampling processor configuration
processors:
  tail_sampling:
    decision_wait: 30s
    policies:
      - name: errors
        type: status_code
        status_code: {status_codes: [ERROR]}  # Keep all error traces
      - name: slow-requests
        type: latency
        latency: {threshold_ms: 500}          # Keep traces > 500ms
      - name: baseline
        type: probabilistic
        probabilistic: {sampling_percentage: 1}  # 1% of normal traces
```

### Adaptive Sampling

Dynamically adjusts sampling rate based on system conditions.

- **Normal traffic**: Low sampling rate (0.1-1%) to minimize cost.
- **During incidents**: Automatically increases to 10-100% to capture diagnostic data.
- **Per-service**: Higher-throughput services sampled less; lower-traffic services at 100%.
- **Implementation**: Jaeger's adaptive sampling adjusts rates every 60 seconds based on
  observed traffic per service/endpoint.

### Sampling Strategy Comparison

| Strategy       | Cost Reduction | Diagnostic Quality | Complexity | Best For                       |
|----------------|----------------|--------------------|------------|--------------------------------|
| None (100%)    | 0%             | Perfect            | None       | <100 rps total                 |
| Head 10%       | ~90%           | Poor (misses rare) | Low        | >1,000 rps, cost-sensitive     |
| Head 1%        | ~99%           | Very poor           | Low        | >10,000 rps, cost-critical     |
| Tail (errors)  | 70-95%         | Good for errors    | High       | Debugging-focused teams        |
| Tail (latency) | 70-95%         | Good for perf      | High       | Performance-focused teams      |
| Adaptive       | 80-99%         | Good               | Very high  | Large-scale production systems |

---

## Alerting on Performance

### The Alert Fatigue Problem

Teams that alert on raw thresholds (e.g., "p99 > 200ms") generate excessive alerts.
A brief spike during a deployment is not the same as a sustained degradation.

**Symptom of alert fatigue:**

- Teams start ignoring alerts (>50% of alerts are false positives in many organizations).
- Mean time to acknowledge (MTTA) increases from minutes to hours.
- Real incidents get lost in noise.

### Burn Rate Alerts (Recommended)

Instead of alerting on instantaneous threshold breaches, alert on the *rate at which you're
consuming your error budget*. This is the approach recommended by Google SRE.

**How burn rate works:**

A burn rate of 1 means you will exactly exhaust your error budget at the end of the SLO window.
A burn rate of 10 means you will exhaust it in 1/10th of the window.

```
Burn Rate = (observed error rate) / (SLO error rate)

Example:
  SLO: 99.9% over 30 days (error rate allowed: 0.1%)
  Observed error rate in last hour: 1%
  Burn rate = 1% / 0.1% = 10x

  At this rate, the 30-day error budget will be consumed in 3 days.
```

### Multi-Window, Multi-Burn-Rate Alerts

Google SRE recommends combining multiple windows for different severity levels.
The short window should be 1/12th of the long window.

| Severity | Burn Rate | Long Window | Short Window | Budget Consumed | Response    |
|----------|-----------|-------------|--------------|-----------------|-------------|
| P1       | 14.4x     | 1 hour      | 5 minutes    | 2% in 1 hour   | Page (5 min)|
| P2       | 6x        | 6 hours     | 30 minutes   | 5% in 6 hours  | Page (30 min)|
| P3       | 3x        | 1 day       | 2 hours      | 10% in 1 day   | Ticket      |
| P4       | 1x        | 3 days      | 6 hours      | 10% in 3 days  | Review      |

**Implementation in Prometheus:**

```promql
# Fast burn rate alert (P1): 2% of budget consumed in 1 hour
# For 99.9% SLO (0.1% allowed error rate), burn rate 14.4x threshold
(
  sum(rate(http_requests_total{status=~"5.."}[1h]))
  / sum(rate(http_requests_total[1h]))
) > (14.4 * 0.001)
AND
(
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))
) > (14.4 * 0.001)
```

### Performance-Specific Alert Rules

```
Alert Type                    Threshold                   Window
─────────────────────────────────────────────────────────────────
Latency SLO burn             >6x burn rate                6h + 30m
Error rate SLO burn          >14.4x burn rate             1h + 5m
CPU saturation               >90% sustained               15m
Memory approaching OOM       >85% usage                   5m
Disk I/O saturation          >80% utilization             10m
Connection pool exhaustion   >90% active connections      5m
GC pause time                >500ms pause                 Immediate
Queue depth growth           Monotonic increase >10min    10m
Deployment regression        p99 >20% increase post-deploy 15m post-deploy
```

---

## Cost Management and Optimization

### Where Observability Cost Comes From

```
Cost Breakdown (typical enterprise):

  Logs:    50-60% of total observability spend
  Metrics: 15-25% of total observability spend
  Traces:  15-25% of total observability spend
  APM:     5-10% of total observability spend

  Primary cost drivers:
    1. Data ingestion volume (GB/day)
    2. Data retention duration
    3. Metric cardinality (unique time series)
    4. Query/dashboard compute
```

### Cardinality Reduction

High-cardinality metrics are the single largest cost amplifier. Each unique combination of
label values creates a new time series.

**Example of cardinality explosion:**

```
Metric: http_request_duration_seconds
Labels: method, endpoint, status_code, user_id

Cardinality calculation:
  methods:      5 (GET, POST, PUT, DELETE, PATCH)
  endpoints:   50
  status_codes: 10
  user_ids:    100,000

  Total series: 5 * 50 * 10 * 100,000 = 250,000,000 time series

  After removing user_id:
  Total series: 5 * 50 * 10 = 2,500 time series

  Reduction: 99.999%
```

**Cardinality rules (denylist for metric labels):**

Never use as metric labels:
- `user_id`, `session_id`, `request_id` (unbounded)
- `container_id`, `pod_uid` (ephemeral, high churn)
- `url` with query strings (effectively unbounded)
- `trace_id` (belongs in traces, not metrics)
- `error_message` (use error codes instead)
- `timestamp` (already implicit in time series)

These identifiers belong in traces or logs, where they aid debugging without
overwhelming the metrics system.

### Log Volume Reduction

Strategies that achieve 20-40% log volume reduction (ClickHouse TCO Report):

1. **Structured logging**: JSON format enables selective field indexing. Parse and drop
   fields you never query against.
2. **Log levels in production**: WARN and above only for most services. DEBUG/TRACE
   only enabled dynamically during incidents.
3. **Log aggregation**: Collapse repeated events. "Connection refused" occurring 10,000
   times in 1 minute should be 1 log entry with `count=10000`.
4. **Sampling verbose logs**: Sample DEBUG logs at 1% in production.
5. **Edge filtering**: Filter at the agent/collector level before data leaves the host.

### Trace Cost Optimization

Strategies that achieve 25-50% lower storage costs:

1. **Head-based sampling at 1-5%** for high-throughput services.
2. **Tail-based sampling** to keep only errors and slow traces.
3. **Span attribute trimming**: Remove large attributes (SQL queries > 500 chars, request
   bodies) or replace with hashes.
4. **Short retention**: 7-14 days for traces (vs. 30-90 for metrics).
5. **Object storage backends**: Tempo's S3-based storage is 10-100x cheaper per GB than
   Elasticsearch for trace data.

### Retention by Service Tier

```
Service Tier     Metrics Retention    Log Retention    Trace Retention
──────────────────────────────────────────────────────────────────────
Tier 1 (critical)    90 days           30 days          14 days
Tier 2 (standard)    30 days           14 days           7 days
Tier 3 (internal)    14 days            7 days           3 days
Tier 4 (dev/test)     7 days            3 days           1 day
```

---

## Common Bottlenecks

### 1. Observability Overhead Itself

The instrumentation meant to detect performance issues can *cause* them.

| Bottleneck                    | Impact                          | Mitigation                         |
|-------------------------------|----------------------------------|------------------------------------|
| OTel auto-instrumentation     | 3-20% CPU overhead (Java)       | Selective instrumentation          |
| Synchronous span export       | Blocks request processing        | Use async batch exporters          |
| High-frequency log writes     | Disk I/O contention              | Buffer + batch, async writes       |
| Collector as bottleneck       | Backpressure causes data loss    | Scale collectors horizontally      |
| Sidecar agent memory          | 50-200 MB per pod                | Right-size resource limits         |

### 2. High-Cardinality Metrics

- Prometheus: query latency increases linearly with series count. At >10M series,
  simple queries can take >10 seconds.
- Datadog: custom metric pricing means cardinality directly increases cost.
  100K custom metrics = $5,000/month on Datadog.
- Cortex/Mimir: ingestion rate drops when series cardinality causes index churn.

### 3. Log Volume

- At 1 TB/day ingestion, Elasticsearch clusters require 3-5 TB storage (with replication).
- Log search latency degrades from <1s to >30s as daily volume crosses 500 GB
  without proper index management.
- Splunk pricing at scale: $2-4 per GB ingested/day, making 1 TB/day = $730K-1.46M/year.

### 4. Trace Storage

- A single trace with 50 spans averages 5-15 KB.
- At 10,000 rps with 1% sampling: 100 traces/sec = 50-150 KB/sec = 4-13 GB/day.
- At 10,000 rps with 100% sampling: 500-1500 KB/sec = 43-130 GB/day.
- Elasticsearch storage for traces: ~$0.10-0.30/GB/month.
- S3 (Tempo): ~$0.023/GB/month (4-10x cheaper).

---

## Anti-Patterns

### 1. Logging in Hot Paths

```
ANTI-PATTERN:
  for item in million_items:
      logger.debug(f"Processing item {item.id}")  # 1M log lines
      process(item)

FIX:
  logger.info(f"Processing {len(million_items)} items")
  for item in million_items:
      process(item)
  logger.info(f"Completed processing {len(million_items)} items")
```

**Impact**: Synchronous logging in tight loops can add 10-100x overhead. A `logger.debug()`
call costs ~1-5 microseconds even when DEBUG is disabled (due to string formatting and
level check). At 1M iterations, that's 1-5 seconds of pure logging overhead.

### 2. Unbounded Cardinality Labels

```
ANTI-PATTERN:
  http_requests_total{user_id="12345", path="/api/users/12345/orders"}

FIX:
  http_requests_total{user_tier="premium", path="/api/users/{id}/orders"}
```

**Impact**: Prometheus documentation explicitly warns against this. A single metric with
a `user_id` label creates one time series per user. At 1M users, that's 1M series from
one metric -- causing memory exhaustion, slow queries, and potential TSDB corruption.

### 3. Not Sampling Traces

```
ANTI-PATTERN:
  # Collecting 100% of traces at 10,000 rps
  # = 864 million spans/day
  # = 4-12 TB/day storage
  # = $146K-438K/month on Elasticsearch

FIX:
  # Tail-based sampling: errors + slow + 1% baseline
  # = ~10-20 million spans/day (97-99% reduction)
  # = 50-300 GB/day storage
  # = $1.5K-9K/month on Elasticsearch
  # Or $345-2,070/month on S3/Tempo
```

### 4. Alerting on Raw Thresholds

```
ANTI-PATTERN:
  alert: HighLatency
  expr: histogram_quantile(0.99, rate(http_duration_seconds_bucket[5m])) > 0.2
  # Fires on every brief spike, creating alert fatigue

FIX:
  alert: LatencySLOBurnRateHigh
  expr: |
    (error_rate_1h / slo_error_rate) > 6
    AND
    (error_rate_30m / slo_error_rate) > 6
  # Only fires when error budget is being consumed at 6x rate
```

### 5. Correlating Telemetry Without Shared Context

```
ANTI-PATTERN:
  # Logs, metrics, and traces with no shared identifiers
  # Debugging requires manual timestamp correlation across 3 systems

FIX:
  # Inject trace_id and span_id into log records
  # Use exemplars to link metrics to traces
  # Use OTel resource attributes for service identity
  log.info("Payment processed",
    extra={"trace_id": span.get_span_context().trace_id,
           "order_id": order.id,
           "duration_ms": elapsed})
```

### 6. Over-Instrumenting Everything

```
ANTI-PATTERN:
  # Spans for every function call, including utility functions
  with tracer.start_span("string_format"):
      result = f"{first} {last}"
  with tracer.start_span("list_append"):
      items.append(result)

FIX:
  # Spans only for meaningful operations (>1ms, I/O, cross-service)
  with tracer.start_span("fetch_user_profile"):
      profile = await db.query("SELECT * FROM users WHERE id = ?", user_id)
```

---

## Before/After: Observability-Driven Performance Fixes

### Case 1: Mystery Latency Spikes

**Before observability:**
- p99 latency: 2.3 seconds (SLO: 500ms)
- Team suspects "the database is slow" but cannot prove it
- Random restarts as mitigation strategy
- Mean time to resolution (MTTR): 4-8 hours

**After adding distributed tracing:**
- Trace waterfall reveals: 1.8 seconds spent in a downstream auth service
- Auth service making 3 sequential calls to a token validation endpoint
- Each call: 600ms (includes 400ms DNS resolution due to misconfigured resolver)
- Fix: Cache DNS + parallelize token validation
- p99 latency: 180ms (92% reduction)
- MTTR for similar issues: 15-30 minutes

### Case 2: Gradual Throughput Degradation

**Before observability:**
- Throughput drops from 5,000 rps to 2,000 rps over 2 weeks
- No clear correlation with any deployment
- Team adds more instances (cost +60%)

**After adding USE method metrics:**
- CPU utilization: 45% (not the bottleneck)
- Memory: 70% (not the bottleneck)
- Connection pool saturation: 98% (FOUND IT)
- Database connection pool of 20 connections shared across 50 threads
- Fix: Increase pool to 50, add connection pool metrics to dashboard
- Throughput restored to 5,000 rps. Removed extra instances (cost -38%)

### Case 3: Intermittent Error Spikes

**Before observability:**
- 0.5% error rate (SLO: 0.1%) but only during peak hours
- Errors appear random across services
- No correlation found in application logs

**After adding RED method + correlated logs/traces:**
- RED metrics show errors correlate with request rate > 3,000 rps
- Traces reveal: payment service timeout at exactly 30 seconds (default HTTP timeout)
- Correlated logs show: connection pool exhaustion in payment provider SDK
- Fix: Increase timeout, add circuit breaker, add bulkhead isolation
- Error rate: 0.02% (80% below SLO target)

---

## Decision Tree: What Should I Monitor?

```
START: "I need to monitor my system for performance"
│
├── Q1: "What type of system component?"
│   │
│   ├── Infrastructure (CPU, memory, disk, network)
│   │   └── USE Method
│   │       ├── Utilization: cpu_usage_percent, memory_used_bytes
│   │       ├── Saturation: cpu_runqueue_length, disk_io_queue
│   │       └── Errors: disk_errors_total, network_drops_total
│   │
│   ├── Service / API endpoint
│   │   └── RED Method
│   │       ├── Rate: http_requests_total (counter)
│   │       ├── Errors: http_errors_total or status 5xx rate
│   │       └── Duration: http_request_duration_seconds (histogram)
│   │
│   ├── Database
│   │   ├── Query latency (p50, p95, p99)
│   │   ├── Connection pool (active, idle, waiting, timeouts)
│   │   ├── Slow query log (queries > 100ms)
│   │   ├── Lock contention (lock wait time, deadlocks)
│   │   └── Replication lag (seconds behind primary)
│   │
│   ├── Message Queue (Kafka, RabbitMQ, SQS)
│   │   ├── Consumer lag (messages behind)
│   │   ├── Produce/consume rate (messages/sec)
│   │   ├── Processing duration per message
│   │   └── Dead letter queue depth
│   │
│   └── External Dependency
│       ├── Availability (success rate of outbound calls)
│       ├── Latency (p99 of outbound call duration)
│       ├── Circuit breaker state (open/closed/half-open)
│       └── Retry rate and exhaustion count
│
├── Q2: "What's my traffic volume?"
│   │
│   ├── < 100 rps    → Trace 100%, basic metrics, structured logs
│   ├── 100-1K rps   → Trace 10-50%, RED+USE metrics, warn+ logs
│   ├── 1K-10K rps   → Trace 1-10%, full metrics, aggregated logs
│   └── > 10K rps    → Trace 0.1-1% (tail-based), metrics only, sampled logs
│
├── Q3: "Do I have SLOs defined?"
│   │
│   ├── No  → Define SLOs first:
│   │         - Availability SLO (99.9% typical)
│   │         - Latency SLO (99% of requests < Xms)
│   │         - Set up error budget tracking
│   │         - Configure burn rate alerts
│   │
│   └── Yes → Monitor SLI metrics continuously
│             - Track error budget consumption
│             - Set multi-window burn rate alerts
│             - Review SLOs quarterly
│
└── Q4: "What's my observability budget?"
    │
    ├── Minimal ($0-500/mo)
    │   └── Prometheus + Grafana + Loki (self-hosted)
    │       Tempo for traces, head-based sampling
    │
    ├── Moderate ($500-5K/mo)
    │   └── Grafana Cloud or self-hosted with Thanos
    │       Tail-based sampling, 14-day retention
    │
    └── Enterprise ($5K+/mo)
        └── Datadog, New Relic, or Splunk
            Full APM, anomaly detection, 30+ day retention
            Or: self-hosted OTel + ClickHouse at scale
```

---

## Quick Reference

### Observability Stack Recommendations by Scale

| Scale              | Metrics           | Logs              | Traces           | Cost/mo (approx)  |
|--------------------|-------------------|-------------------|------------------|--------------------|
| Startup (<10 svcs) | Prometheus+Grafana| Loki              | Jaeger           | $0-200 (self-host) |
| Growth (10-50 svcs)| Grafana Cloud     | Grafana Cloud Logs| Tempo            | $500-3,000         |
| Scale (50-200 svcs)| Mimir/Thanos      | Loki/Elasticsearch| Tempo            | $3,000-15,000      |
| Enterprise (200+)  | Datadog/Mimir     | Splunk/Elasticsearch| Tempo/Datadog  | $15,000-100,000+   |

### Performance Monitoring Checklist

```
[ ] RED metrics on every service endpoint
[ ] USE metrics on every infrastructure resource
[ ] SLOs defined for latency, availability, and throughput
[ ] Error budget tracking with burn rate alerts
[ ] Distributed tracing with appropriate sampling
[ ] Structured logging with trace ID correlation
[ ] Dashboards: service overview, resource saturation, SLO status
[ ] Runbooks linked to every alert
[ ] Cardinality review (quarterly)
[ ] Observability cost review (monthly)
```

### Key Thresholds

```
Metric                      Warning         Critical
──────────────────────────────────────────────────────
CPU utilization              >70%            >90%
Memory utilization           >80%            >90%
Disk I/O utilization         >70%            >85%
Connection pool usage        >75%            >90%
Error budget burn rate       >3x             >14.4x
p99 latency vs SLO           >80% of target  >100% of target
GC pause time (JVM)          >200ms          >500ms
Thread pool queue depth      >100            >1000
```

---

## Sources

- [OpenTelemetry Performance Benchmark Specification](https://opentelemetry.io/docs/specs/otel/performance-benchmark/)
- [OTel Component Performance Benchmarks](https://opentelemetry.io/blog/2023/perf-testing/)
- [OpenTelemetry Java Agent Performance](https://opentelemetry.io/docs/zero-code/java/agent/performance/)
- [OpenTelemetry for Go: Measuring the Overhead (Coroot)](https://coroot.com/blog/opentelemetry-for-go-measuring-the-overhead/)
- [Evaluating OpenTelemetry's Impact on Performance in Microservice Architectures (Umea University)](https://umu.diva-portal.org/smash/get/diva2:1877027/FULLTEXT01.pdf)
- [Performance Overhead and Optimization Strategies in OpenTelemetry (TechRxiv)](https://www.techrxiv.org/users/937157/articles/1334227-performance-overhead-and-optimization-strategies-in-opentelemetry)
- [How to Reduce OpenTelemetry Performance Overhead by 50% (OneUptime)](https://oneuptime.com/blog/post/2026-02-06-reduce-opentelemetry-performance-overhead-production/view)
- [OTelBench: Benchmark OpenTelemetry Infrastructure (Quesma/InfoQ)](https://www.infoq.com/news/2026/02/quesma-otel-bench-performance-ai/)
- [Jaeger v2 Released: OpenTelemetry in the Core (CNCF)](https://www.cncf.io/blog/2024/11/12/jaeger-v2-released-opentelemetry-in-the-core/)
- [Jaeger vs Zipkin vs Grafana Tempo (CoderSociety)](https://codersociety.com/blog/articles/jaeger-vs-zipkin-vs-tempo)
- [Grafana Tempo vs Jaeger (Last9)](https://last9.io/blog/grafana-tempo-vs-jaeger/)
- [The RED Method: How to Instrument Your Services (Grafana Labs)](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/)
- [RED and USE Metrics for Monitoring (Better Stack)](https://betterstack.com/community/guides/monitoring/red-use-metrics/)
- [Monitoring Methodologies: RED and USE (The New Stack)](https://thenewstack.io/monitoring-methodologies-red-and-use/)
- [Three Pillars of Observability (IBM)](https://www.ibm.com/think/insights/observability-pillars)
- [Three Pillars of Observability (CrowdStrike)](https://www.crowdstrike.com/en-us/cybersecurity-101/observability/three-pillars-of-observability/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [A Complete Guide to Error Budgets (Nobl9)](https://www.nobl9.com/resources/a-complete-guide-to-error-budgets-setting-up-slos-slis-and-slas-to-maintain-reliability)
- [Burn Rate Alerts (Datadog)](https://docs.datadoghq.com/service_management/service_level_objectives/burn_rate/)
- [Multi-Window Multi-Burn-Rate Alerts (Grafana Labs)](https://grafana.com/blog/how-to-implement-multi-window-multi-burn-rate-alerts-with-grafana-cloud/)
- [Alerting on SLOs Like Pros (SoundCloud)](https://developers.soundcloud.com/blog/alerting-on-slos/)
- [SLO/SLA-Driven Monitoring Requirements 2025 (Uptrace)](https://uptrace.dev/blog/sla-slo-monitoring-requirements)
- [OpenTelemetry Sampling Concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [Tail Sampling with OpenTelemetry](https://opentelemetry.io/blog/2022/tail-sampling/)
- [Head-Based vs Tail-Based Sampling (CubeAPM)](https://cubeapm.com/blog/head-based-vs-tail-based-sampling/)
- [Mastering Distributed Tracing Sampling (Datadog)](https://www.datadoghq.com/architecture/mastering-distributed-tracing-data-volume-challenges-and-datadogs-approach-to-efficient-sampling/)
- [Observability TCO and Cost Reduction (ClickHouse)](https://clickhouse.com/resources/engineering/observability-tco-cost-reduction)
- [The High-Cardinality Trap (ClickHouse)](https://clickhouse.com/resources/engineering/high-cardinality-slow-observability-challenge)
- [Three Observability Anti-Patterns (Chronosphere)](https://chronosphere.io/learn/three-pesky-observability-anti-patterns-that-impact-developer-efficiency/)
- [Metric Cardinality Explained (Groundcover)](https://www.groundcover.com/learn/observability/metric-cardinality)
- [Prometheus vs Datadog Comparison 2024 (Squadcast)](https://medium.com/@squadcast/prometheus-vs-datadog-a-complete-comparison-guide-for-2024-7713d87d34a5)
- [Datadog vs Prometheus Comparison 2026 (Better Stack)](https://betterstack.com/community/comparisons/datadog-vs-prometheus/)
- [Hidden Costs in Observability 2026 (Grepr AI)](https://www.grepr.ai/blog/the-hidden-cost-in-observability)
- [How Much Should Observability Cost (Honeycomb)](https://www.honeycomb.io/blog/how-much-should-i-spend-on-observability-pt1)
- [Observability Trends 2026 (Elastic)](https://www.elastic.co/blog/2026-observability-trends-costs-business-impact)
- [OpenTelemetry Java Metrics Performance Comparison](https://opentelemetry.io/blog/2024/java-metric-systems-compared/)
- [OpenTelemetry and Grafana Labs 2025](https://grafana.com/blog/opentelemetry-and-grafana-labs-whats-new-and-whats-next-in-2025/)
