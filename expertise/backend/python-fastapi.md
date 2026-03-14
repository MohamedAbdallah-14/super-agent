# Python + FastAPI -- Expertise Module

> A Python/FastAPI backend specialist designs, builds, and maintains high-performance async REST and WebSocket APIs using FastAPI (0.115+), Pydantic v2, async SQLAlchemy 2.0, and modern Python (3.12+).
> Scope: API design, data modeling, authentication, background tasks, observability, containerized deployment, and production hardening of ASGI services.

---

## Core Patterns & Conventions

### Project Structure

Organize by **domain/feature**, not file type. Feature-based modules keep related code co-located and scale with team size.

```
src/app/
  main.py                  # App factory, lifespan events
  config.py                # Pydantic BaseSettings
  dependencies.py          # Shared cross-cutting deps
  features/
    users/
      router.py            # APIRouter with /users endpoints
      schemas.py           # Pydantic v2 request/response models
      models.py            # SQLAlchemy ORM models
      service.py           # Business logic
      repository.py        # Data access
    orders/ ...
  core/
    security.py            # OAuth2, JWT
    middleware.py           # Custom ASGI middleware
    logging.py             # structlog config
  db/
    session.py             # async engine, sessionmaker
    base.py                # DeclarativeBase
    migrations/            # Alembic
tests/
  conftest.py
  features/users/test_router.py, test_service.py
```

### Naming Conventions (PEP 8, PEP 257)

- Modules/packages: `snake_case` -- Functions/variables: `snake_case` -- Classes: `PascalCase` -- Constants: `UPPER_SNAKE_CASE`
- Pydantic models: suffix with purpose -- `UserCreate`, `UserRead`, `UserUpdate`
- SQLAlchemy models: singular noun matching the table -- `User`, `Order`
- Test files mirror source: `test_router.py`, `test_service.py`

### Architecture Patterns

**Layered architecture** (pragmatic default): Router (HTTP concerns) -> Service (business logic, transactions) -> Repository (data access, ORM) -> Schema (Pydantic validation). For complex domains, adopt **Clean/Hexagonal Architecture**: abstract repository interfaces as ports, SQLAlchemy implementations as adapters.

### Dependency Injection (FastAPI `Depends`)

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

async def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(UserRepository(db))

@router.get("/users/{user_id}")
async def read_user(user_id: int, svc: UserService = Depends(get_user_service)) -> UserRead:
    return await svc.get_by_id(user_id)
```

- Dependencies are **cached per-request** by default (called once even if used in multiple places)
- Chain small, focused dependencies -- avoid a single god-dependency
- Use `app.dependency_overrides` in tests to swap real deps with fakes

### Routing and API Versioning

Prefix routes with `/api/v1` via `APIRouter(prefix="/api/v1")`. When introducing breaking changes, mount `/api/v2` alongside v1. Mark deprecated endpoints with `deprecated=True`.

### Data Validation (Pydantic v2)

- Separate Create / Read / Update schemas (never reuse one model for all)
- `model_config = ConfigDict(strict=True)` for security-sensitive inputs
- `Field(min_length=1, max_length=255)` for constraints; `Annotated` types for reuse
- `model_validator(mode="after")` for cross-field validation

### Error Handling

- `HTTPException` for simple cases; custom exception handlers for domain errors
- Never leak stack traces in production -- global handler for unhandled exceptions
- Consistent error shape: `{"error": "<CODE>", "detail": "<message>"}`
- Correct status codes: 422 validation, 401/403 auth, 404 not found, 409 conflict

### Logging and Observability

- **structlog** for JSON logging (stdout in prod, colored console in dev)
- Attach `request_id` (UUID) via middleware for log correlation
- **OpenTelemetry** `FastAPIInstrumentor` for automatic per-request spans
- Export: traces to Jaeger/Tempo, metrics to Prometheus, logs to Loki
- Let the OTel Collector handle protocol conversion -- keep the app simple

### Async Patterns

- `async def` for I/O-bound routes (DB, HTTP, file I/O)
- Plain `def` for CPU-bound/trivial -- FastAPI auto-runs sync routes in a threadpool
- **Never** call blocking I/O inside `async def` -- freezes the event loop for all requests
- Use `asyncio.to_thread()` for unavoidable blocking; `httpx.AsyncClient` over `requests`
- Async drivers: `asyncpg` (Postgres), `aiomysql` (MySQL), `aiosqlite` (SQLite)

---

## Production Patterns

### Async Database Sessions (SQLAlchemy 2.x)

The session lifecycle pattern below handles commit-on-success and rollback-on-error automatically via the `get_db` dependency. Every request gets an isolated session from the connection pool.

```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,              # Concurrent connections held open
    max_overflow=10,           # Extra connections under burst load
    pool_pre_ping=True,        # Verify connections before checkout (detects stale)
    pool_recycle=3600,         # Recycle connections after 1 hour (prevents server-side timeout)
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Request-scoped session with auto commit/rollback."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

**Key decisions:**
- `expire_on_commit=False` — prevents lazy-load attempts after commit (which would fail in async context)
- `pool_pre_ping=True` — adds ~1ms overhead but prevents "connection reset" errors after DB restarts
- `pool_recycle=3600` — prevents connections from hitting PostgreSQL's `idle_in_transaction_session_timeout`
- Session is committed only if no exception is raised — no partial writes on error

### Pydantic Validation Patterns

Use Pydantic models as the single enforcement point for input constraints. Sanitize user-provided text fields to prevent stored XSS.

```python
from typing import Generic, TypeVar
from pydantic import BaseModel, Field, field_validator, model_validator
import bleach

T = TypeVar("T")


class CreateOrderRequest(BaseModel):
    product_id: int = Field(..., gt=0, description="Must reference existing product")
    quantity: int = Field(..., ge=1, le=100, description="1-100 items per order")
    notes: str = Field(default="", max_length=500)

    @field_validator("notes")
    @classmethod
    def sanitize_notes(cls, v: str) -> str:
        """Strip HTML tags from user input to prevent stored XSS."""
        return bleach.clean(v, strip=True)


class PaginatedResponse(BaseModel, Generic[T]):
    """Consistent pagination envelope for list endpoints."""
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool
```

**Pagination usage:**

```python
@router.get("/orders", response_model=PaginatedResponse[OrderRead])
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total = await db.scalar(select(func.count()).select_from(Order))
    result = await db.execute(
        select(Order).offset(offset).limit(page_size).order_by(Order.created_at.desc())
    )
    items = result.scalars().all()
    return PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, has_next=(offset + page_size < total),
    )
```

**Key decisions:**
- `bleach.clean` at the validator level — sanitization happens before any business logic sees the data
- Generic `PaginatedResponse[T]` — one envelope for all list endpoints, consistent client-side parsing
- `page_size` capped at 100 — prevents clients from requesting unbounded result sets

### Structured Logging

JSON-formatted logs with request correlation IDs are essential for production debugging. structlog provides zero-config structured output with context variable binding.

```python
import structlog
from uuid import uuid4
from starlette.requests import Request
from starlette.responses import Response

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)
logger = structlog.get_logger()


@app.middleware("http")
async def logging_middleware(request: Request, call_next) -> Response:
    """Bind request context for all log lines emitted during this request."""
    structlog.contextvars.bind_contextvars(
        request_id=request.headers.get("x-request-id", str(uuid4())),
        method=request.method,
        path=request.url.path,
    )
    response = await call_next(request)
    logger.info("request_completed", status=response.status_code)
    structlog.contextvars.unbind_contextvars("request_id", "method", "path")
    return response
```

**Key decisions:**
- `contextvars` — thread-safe and async-safe; every log line within a request includes `request_id` without explicit passing
- `unbind_contextvars` after response — prevents context leaking across requests in the same worker
- `JSONRenderer` in prod — machine-parseable for log aggregators (Loki, CloudWatch, Datadog)
- Honor incoming `x-request-id` header — enables end-to-end tracing when requests originate from other services

### Health Check Endpoints

Two-tier health checks: shallow (is the process alive?) and deep (are dependencies reachable?). Kubernetes probes, load balancers, and monitoring tools consume these.

```python
@app.get("/health", status_code=200)
async def health_check():
    """Shallow health check — process is alive and accepting requests."""
    return {"status": "ok"}


@app.get("/ready", status_code=200)
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Deep readiness check — verifies database connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "db": "connected"}
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "db": str(exc)},
        )
```

**Production checklist:**
- Map `/health` to Kubernetes `livenessProbe` — restart if unresponsive
- Map `/ready` to `readinessProbe` — stop sending traffic if deps are down
- Add Redis, external API, and queue connectivity checks to `/ready` as needed
- Keep `/health` dependency-free — it must respond even when the DB is down

---

## Anti-Patterns & Pitfalls

### 1. Blocking I/O Inside `async def`
`requests.get()` or sync DB drivers inside async endpoints block the event loop, halting all concurrent requests. **Fix:** async libs or `asyncio.to_thread()`.

### 2. One Endpoint Calling Another
Route-to-route calls bypass middleware/DI and create tight coupling. **Fix:** extract shared logic into a service layer.

### 3. Everything in `main.py`
Monolithic files prevent parallel development and make review painful. **Fix:** feature-based modules.

### 4. Creating DB Connections Per Request
Adds 5-20ms latency per request, can exhaust connection limits. **Fix:** connection pooling via `create_async_engine(pool_size=20)` + DI.

### 5. Mutable Global State
Module-level globals cause race conditions in async contexts. **Fix:** `app.state` for singletons, DI for request-scoped state.

### 6. Missing Response Models
Omitting `response_model` leaks sensitive fields (password hashes, internal IDs) and degrades OpenAPI docs. **Fix:** always declare response models.

### 7. Catching `Exception` Broadly
Hides bugs, swallows validation errors, can catch `asyncio.CancelledError` and prevent shutdown. **Fix:** catch specific types.

### 8. No Dependency Overrides in Tests
Tests hitting real DBs/APIs are slow and flaky. **Fix:** `app.dependency_overrides[get_db] = mock_db`.

### 9. Ignoring Pydantic v2 Migration
v1 patterns (`class Config`, `orm_mode`, `@validator`) trigger deprecation warnings and miss 5-50x Rust-core speedups. **Fix:** `ConfigDict(from_attributes=True)`, `@field_validator`.

### 10. Sync ORM Sessions in Async Routes
`sqlalchemy.orm.Session` in `async def` blocks the loop. **Fix:** `AsyncSession` with async engine.

### 11. No Authorization Beyond Pydantic
Pydantic validates shape, not business rules (user A editing user B's data). **Fix:** authorization checks in the service layer.

### 12. Hardcoded Configuration
Secrets in source code are insecure and inflexible. **Fix:** `pydantic-settings` + env vars.

### 13. No Timeouts on Outbound Calls
HTTP calls without timeouts hang forever, consuming workers. **Fix:** `httpx.Timeout(10.0)` on all clients.

### 14. Overly Broad CORS (`allow_origins=["*"]`)
Permits any website to make authenticated requests. **Fix:** whitelist specific origins; `allow_credentials=True` only with explicit lists.

---

## Testing Strategy

### Unit Testing (pytest + pytest-asyncio)

```python
@pytest.mark.asyncio
async def test_get_user_returns_user():
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = User(id=1, name="Alice")
    service = UserService(repo=mock_repo)
    result = await service.get_by_id(1)
    assert result.name == "Alice"
    mock_repo.get_by_id.assert_awaited_once_with(1)
```

### Integration Testing (httpx.AsyncClient)

```python
@pytest.mark.asyncio
async def test_create_user():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/users", json={"name": "Bob", "email": "bob@test.com"})
    assert resp.status_code == 201
```

Use `TestClient` (sync) for most tests; `AsyncClient` when testing async deps or DB rollback patterns.

### Fixture Organization

- `tests/conftest.py` -- app-level: test DB engine, async client, session rollback fixture
- `tests/features/users/conftest.py` -- domain-specific: user factory, auth headers
- Key fixtures: `db_session` (transaction + rollback), `client` (with overridden deps), `auth_headers`

### Factory Patterns

Use `factory_boy` + `faker` for realistic test data. Define one factory per model.

### Coverage

- **80%+ line coverage** enforced in CI (`pytest-cov --cov-fail-under=80`)
- 90%+ for service/repository layers; router layer: happy paths + errors + auth boundaries

---

## Performance Considerations

### Async vs Sync Tradeoffs

- Async excels at I/O concurrency: one worker handles thousands of concurrent DB/HTTP calls
- CPU-bound work gets no async benefit -- use `ProcessPoolExecutor` or task queues
- FastAPI: ~20,000+ req/s vs Django ~4,000-5,000 (2026 benchmarks)
- One blocking call in an async route negates all concurrency benefits

### Connection Pooling (SQLAlchemy Async)

```python
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@host/db",
    pool_size=20, max_overflow=10, pool_pre_ping=True, pool_recycle=3600,
)
```

Pool size should match expected concurrency, not worker count. This is the single biggest performance lever.

### Caching

- **Redis** (`redis.asyncio`): distributed cache for multi-instance deployments
- **In-memory** (`cachetools`, `lru_cache`): per-process only, not shared across workers
- Strategy: time-based TTL for most cases, event-based invalidation for critical consistency

### Background Tasks

| Feature | BackgroundTasks | ARQ | Celery |
|---|---|---|---|
| Persistence | None (in-process) | Redis-backed | Redis/RabbitMQ |
| Async native | Yes | Yes | No (sync default) |
| Retries | No | Yes | Yes |
| Monitoring | No | Basic | Flower, extensive |
| Best for | Fire-and-forget | Async job queues | Enterprise pipelines |

- **BackgroundTasks**: lightweight, non-critical (emails). Tasks lost on crash.
- **ARQ**: async-native, simple, Redis-backed. Best fit for modern FastAPI.
- **Celery**: battle-tested at scale (Instagram, Mozilla). Complex workflows, scheduling.

### Profiling

- **py-spy**: sampling profiler, attaches to running processes, near-zero overhead -- best for production
- **cProfile + snakeviz**: built-in, good for dev, too heavy for prod
- **OpenTelemetry traces**: identify which dependency (DB, API, compute) dominates latency

---

## Security Considerations

### Authentication (OAuth2 + JWT)

```python
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token",
    scopes={"users:read": "Read users", "users:write": "Write users"},
)

async def get_current_user(
    scopes: SecurityScopes, token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_jwt(token)
    check_scopes(scopes, payload.get("scopes", []))
    return await get_user_by_id(db, payload["sub"])
```

- **PyJWT** for token encode/decode; **Argon2** (via `pwdlib`) for password hashing (FastAPI 2025+ recommendation, replacing bcrypt)
- Short-lived access tokens (15-30 min) + refresh tokens (7-30 days) stored server-side for revocation

### Input Validation

- Pydantic `strict=True` for security-critical endpoints (prevents type coercion)
- Validate file uploads: MIME type checks, size limits
- Sanitize user input in logs (log injection prevention)

### CORS and Rate Limiting

```python
app.add_middleware(CORSMiddleware, allow_origins=["https://app.example.com"],
    allow_credentials=True, allow_methods=["GET","POST","PUT","DELETE"])
```

**SlowAPI** for rate limiting: aggressive on auth (5/min), moderate on writes (60/min), relaxed on reads (300/min).

### SQL Injection Prevention

Always use parameterized queries (SQLAlchemy default). Never f-string SQL. For raw SQL: `text("SELECT ... WHERE id = :id").bindparams(id=val)`.

### Secrets Management

`pydantic-settings` + env vars. Never commit `.env`. In production: AWS Secrets Manager, HashiCorp Vault, or GCP Secret Manager. Rotate JWT signing keys periodically.

---

## Integration Patterns

### Database (SQLAlchemy 2.0+ Async)

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase): pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
```

Use `alembic init -t async alembic` for async migration support.

### Message Queues

**Celery + Redis**: `celery_app.task` for sync heavy processing, call via `.delay()` from async routes.
**ARQ**: async-native, define tasks as `async def`, connect via `create_pool(RedisSettings())` in lifespan.

### API Design (OpenAPI)

- Always define `response_model` for docs and field filtering
- Use `tags` for grouping, `summary`/`description` on endpoints
- Schema examples via `ConfigDict(json_schema_extra={"examples": [...]})`
- `status_code=201` for creation, `204` for deletes

### File Uploads and Streaming

```python
@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    return {"filename": file.filename, "size": len(contents)}

@router.get("/export")
async def export_csv():
    async def generate():
        yield "id,name\n"
        async for row in fetch_rows():
            yield f"{row.id},{row.name}\n"
    return StreamingResponse(generate(), media_type="text/csv")
```

### WebSocket Patterns

Use a `ConnectionManager` class to track active connections. Implement heartbeat pings (30s intervals) to detect dead connections. Use `@app.websocket("/ws/{room}")` with `try/except WebSocketDisconnect` for cleanup.

---

## DevOps & Deployment

### Packaging

**uv** (2025-2026 standard, 10-100x faster than pip):

```toml
[project]
requires-python = ">=3.12"
dependencies = ["fastapi[standard]>=0.115.0", "sqlalchemy[asyncio]>=2.0", "asyncpg>=0.30.0",
    "pydantic-settings>=2.0", "alembic>=1.14"]
[tool.uv]
dev-dependencies = ["pytest>=8.0", "pytest-asyncio>=0.24", "httpx>=0.27", "pytest-cov>=5.0"]
```

Alternatives: **poetry** (mature), **pip-tools** (minimal).

### Docker (Multi-Stage Build)

```dockerfile
FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY src/ ./src/
ENV PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Use `python:3.12-slim` (not alpine -- musl libc issues). Copy deps first for layer caching. Run as non-root.

### CI/CD (GitHub Actions)

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: astral-sh/setup-uv@v4
  - run: uv sync
  - run: uv run pytest --cov --cov-fail-under=80
  - run: uv run ruff check src/
  - run: uv run mypy src/
```

### ASGI Servers

Production stack: **Nginx/Traefik** (TLS, load balancing) -> **Gunicorn** (process manager) -> **Uvicorn workers** (ASGI event loop).

```bash
gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker \
  --workers 4 --bind 0.0.0.0:8000 --timeout 120
```

Uvicorn 0.41+ supports `--workers` natively with dead-worker restart, making Gunicorn optional for simpler deployments.

### Monitoring

- **Prometheus**: `/metrics` via `prometheus-fastapi-instrumentator` (latency, error rates)
- **Sentry**: `sentry-sdk[fastapi]` for error capture with user context
- **Health checks**: `/health` (shallow) and `/ready` (deep -- DB, Redis reachable)

---

## Decision Trees

### FastAPI vs Django vs Flask

```
Full-stack web app with admin panel, ORM, auth built in?
  YES -> Django / Django REST Framework
  NO -> High-performance async API with auto-generated docs?
    YES -> FastAPI
    NO -> Maximum flexibility, minimal opinions, tiny footprint?
      YES -> Flask
      NO -> Microservices or AI/ML serving?
        YES -> FastAPI
        NO -> Django (batteries-included reliability)
```

FastAPI: 78k+ stars, fastest-growing Python framework, async-native, AI/ML ecosystem standard. Django: most mature, best full-stack. Flask: simplest, best for tiny services/serverless.

### SQLAlchemy vs SQLModel vs Tortoise ORM

```
Maximum control, complex queries, multi-DB?
  YES -> SQLAlchemy 2.0 async
  NO -> Unified Pydantic + ORM models (single source of truth)?
    YES -> SQLModel (built on SQLAlchemy + Pydantic, but pre-1.0 as of 2026)
    NO -> Django-like active-record API?
      YES -> Tortoise ORM
      NO -> Production-critical, large team?
        YES -> SQLAlchemy 2.0 (most mature, largest community)
        NO -> SQLModel (simpler, less boilerplate)
```

### Celery vs ARQ vs FastAPI BackgroundTasks

```
Task critical (must survive crashes)?
  NO -> FastAPI BackgroundTasks (simplest, in-process)
  YES -> Workload async-native?
    YES -> Need complex workflows (chains, schedules)?
      YES -> Celery
      NO -> ARQ (async-native, simpler, lower overhead)
    NO -> Need enterprise features (monitoring, multi-broker)?
      YES -> Celery
      NO -> ARQ
```

---

## Code Examples

### 1. App Factory with Lifespan

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await aioredis.from_url(settings.REDIS_URL)
    yield
    await app.state.redis.close()
    await engine.dispose()

app = FastAPI(title="My API", version="1.0.0", lifespan=lifespan)
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
```

### 2. Pydantic v2 Settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)
    DATABASE_URL: PostgresDsn
    JWT_SECRET: str = Field(min_length=32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEBUG: bool = False
```

### 3. Repository Pattern (Async SQLAlchemy)

```python
class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(self, data: UserCreate) -> User:
        user = User(**data.model_dump())
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user
```

### 4. Authenticated Endpoint with Scopes

```python
@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int, data: UserUpdate,
    current_user: User = Security(get_current_user, scopes=["users:write"]),
    service: UserService = Depends(get_user_service),
) -> UserRead:
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await service.update(user_id, data)
```

### 5. Async Test Fixture with DB Rollback

```python
@pytest.fixture
async def db_session():
    async with TestSessionLocal() as session:
        async with session.begin():
            yield session
            await session.rollback()

@pytest.fixture
async def client(db_session: AsyncSession):
    app.dependency_overrides[get_db] = lambda: db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

---

*Researched: 2026-03-07 | Sources: [FastAPI Official Docs](https://fastapi.tiangolo.com/), [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices), [FastAPI Best Practices for Production 2026](https://fastlaunchapi.dev/blog/fastapi-best-practices-production-2026), [12 FastAPI Anti-Patterns Killing Throughput (Modexa, 2025)](https://medium.com/@Modexa/12-fastapi-anti-patterns-quietly-killing-throughput-bddaa961634a), [FastAPI Production Patterns 2025](https://orchestrator.dev/blog/2025-1-30-fastapi-production-patterns/), [FastAPI + SQLAlchemy 2.0 Async Patterns (2025)](https://dev-faizan.medium.com/fastapi-sqlalchemy-2-0-modern-async-database-patterns-7879d39b6843), [Securing FastAPI with OAuth2/JWT (2025)](https://medium.com/@bhagyarana80/securing-fastapi-endpoints-with-oauth2-and-jwt-in-2025-2c31bb14cb58), [Practical FastAPI Security Guide](https://blog.greeden.me/en/2025/12/30/practical-fastapi-security-guide-designing-modern-apis-protected-by-jwt-auth-oauth2-scopes-and-api-keys/), [Definitive FastAPI Production Deployment](https://blog.greeden.me/en/2025/09/02/the-definitive-guide-to-fastapi-production-deployment-with-dockeryour-one-stop-reference-for-uvicorn-gunicorn-nginx-https-health-checks-and-observability-2025-edition/), [FastAPI vs Django vs Flask 2026](https://developersvoice.com/blog/python/fastapi_django_flask_architecture_guide/), [SQLModel in 2025](https://python.plainenglish.io/sqlmodel-in-2025-the-hidden-gem-of-fastapi-backends-20ee8c9bf8a6), [ARQ vs BackgroundTasks](https://davidmuraya.com/blog/fastapi-background-tasks-arq-vs-built-in/), [SlowAPI](https://github.com/laurentS/slowapi), [OpenTelemetry + FastAPI](https://signoz.io/blog/opentelemetry-fastapi/), [Structlog Guide](https://www.dash0.com/guides/python-logging-with-structlog)*
