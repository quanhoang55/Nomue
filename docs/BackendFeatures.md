# Nomue Backend Implementation Guide for Codex

> Purpose: give Codex enough product, architecture, security, and dependency context to implement the Nomue backend **step by step** without guessing how repositories, services, routers, external clients, or feature boundaries should work.

---

# 1. Product Summary

**Nomue** is a mobile food companion for international travelers in Vietnam.

The application recommends Vietnamese dishes and nearby restaurants based on:

- the user's current or manually entered location;
- province/local-area food relevance;
- food preferences;
- dietary restrictions;
- price preference;
- restaurant availability/details;
- AI conversation context.

The current client is:

```text
Expo + React Native + TypeScript
```

The backend is:

```text
FastAPI + Python
```

The production database is:

```text
Supabase PostgreSQL
```

External systems are introduced gradually:

```text
Supabase
GPS input
OpenStreetMap map display
Google Places
Gemini
Supabase Auth
RevenueCat
```

The backend must be designed for **long-term production use**, not as a disposable prototype.

Important priorities:

```text
security
correctness
async / non-blocking I/O
low API cost
bounded database queries
clear dependency injection
testability
observability
clean separation of responsibilities
future scalability
```

---

# 2. High-Level System Flow

The normal application flow is:

```text
Expo frontend
    ↓
FastAPI router
    ↓
service layer
    ↓
repository and/or external API client
    ↓
Supabase / Google Places / Gemini / RevenueCat
    ↓
validated Pydantic response
    ↓
Expo frontend
```

The frontend must **not** directly use privileged backend credentials.

The backend is the trusted application boundary.

---

# 4. Non-Negotiable Architecture Rules

Codex must follow these rules unless explicitly instructed otherwise.

## 4.1 Router responsibilities

Routers/endpoints are responsible for:

```text
HTTP method
path/query/body parameters
FastAPI dependencies
calling a service
declaring response models
```

Routers must remain thin.

Do not place:

```text
Supabase queries
Gemini prompts
Google Places requests
ranking algorithms
subscription rules
business decisions
```

directly inside endpoint functions.

## 4.2 Service responsibilities

Services own business logic and orchestration.

Examples:

```text
validate that a province exists
resolve GPS to local area
rank dishes for a province
enforce user preference rules
choose DB-first vs Google Places fallback
enforce AI usage limits
combine Gemini tool output
```

Services may depend on repository interfaces, other services, and external API clients.

Services should not know about FastAPI request objects.

## 4.3 Repository responsibilities

Repositories perform **data access only**.

Examples:

```text
select dish by ID
select dish IDs for a province
select local areas
insert usage event
update preferences
read subscription rows
```

Repositories must not contain business logic.

Repository methods should generally:

```text
accept typed values
perform one persistence concern
use async Supabase I/O
validate raw DB rows into Pydantic/application DTOs where appropriate
raise database/application errors instead of swallowing failures
```

Never convert a real database outage into a false "not found".

```text
no row
→ None

database unavailable
→ DatabaseError
```

## 4.4 Client responsibilities

External clients are thin wrappers around third-party APIs.

Examples:

```text
google_places_client.get_place_details()
gemini_client.send_message()
revenuecat_client.get_subscriber()
```

Clients handle:

```text
HTTP transport
timeouts
authentication headers
third-party response parsing at the transport boundary
third-party-specific exceptions
```

Clients do not decide business policy.

## 4.5 Dependency injection

Construct services through:

```text
app/api/dependencies.py
```

Preferred pattern:

```text
FastAPI Depends
    ↓
shared async client
    ↓
repositories
    ↓
service
```

Example:

```python
async def get_dish_service() -> DishService:
    db = await get_supabase()

    dish_repo = DishRepository(db)
    province_repo = ProvinceRepository(db)
    relation_repo = DishProvinceRepository(db)

    return DishService(
        dish_repo=dish_repo,
        province_repo=province_repo,
        dish_province_repo=relation_repo,
    )
```

Do not instantiate a service as a global endpoint variable if FastAPI dependency injection can manage it.

---

# 5. Async and Performance Rules

Use real asynchronous I/O when the underlying dependency supports it.

Prefer async for:

```text
Supabase
Google Places
Gemini
RevenueCat
other HTTP APIs
```

Do not mark CPU-only helpers `async` unless they actually await I/O.

Examples that should normally remain synchronous:

```text
Pydantic validation
Haversine calculation
small string normalization
configuration loading
pure ranking calculations
```

Avoid N+1 database request patterns.

Bad:

```text
get relation IDs
→ query dish 1
→ query dish 2
→ query dish 3
```

Preferred:

```text
query related IDs
→ query all dishes using IN (...)
→ restore deterministic ordering in service
```

All collection queries must eventually have a bounded result strategy:

```text
limit
pagination
range
or another explicit upper bound
```

Do not fetch unbounded tables.

---

# 6. Security Rules

## 6.1 Secrets

The following values are backend-only:

```text
SUPABASE_SECRET_KEY
GEMINI_API_KEY
GOOGLE_PLACES_API_KEY
REVENUECAT_API_KEY
REVENUECAT_WEBHOOK_SECRET
```

Never expose them through `EXPO_PUBLIC_*`.

The frontend may contain only public configuration such as:

```text
EXPO_PUBLIC_API_BASE_URL
```

## 6.2 Privileged Supabase client

The backend uses a privileged server-side Supabase client.

Therefore the backend must not rely on frontend-provided identity for authorization.

Bad for authenticated self-service operations:

```json
{
    "user_id": "some-user-id"
}
```

Preferred:

```text
JWT
→ verify token
→ current_user.id
→ service/repository operation
```

Examples:

```text
FoodHistoryCreate should not trust user_id from the client.
UsageEvent creation should not trust user_id from the client.
Preference updates should apply to current_user.id.
```

## 6.3 Validation

Requests should derive from `RequestModel` with `extra="forbid"`.

Responses should derive from `ResponseModel` with controlled response fields.

Database rows may contain more columns than an API response.

The API should expose only what the frontend needs.

## 6.4 Errors

Use application exceptions from `core/exceptions.py`.

Examples:

```text
NotFoundError
AuthenticationError
AuthorizationError
RateLimitError
DatabaseError
GeminiError
GooglePlacesError
```

Do not leak API keys, JWTs, database connection details, raw stack traces, or internal third-party response bodies to the frontend.

---

# 7. Database Naming Rules

Supabase table names are **singular**.

Use:

```text
dish
province
local_area
dish_province
restaurant_dish
user
user_preference
subscription_plan
user_subscription
usage_event
food_history
```

Do not assume plural table names.

API resources may still use plural paths.

Example:

```text
database table:
dish

API:
GET /api/v1/dishes
GET /api/v1/dishes/{dish_id}
```

Column naming uses `snake_case`.

Foreign keys use `<table>_id`.

---

# 8. Core Database Relationships

## `dish`

```text
id                    PK
name
description
spice_level           0-5
sweetness_level       0-5
sourness_level        0-5
bitterness_level      0-5
adventurous_level     0-5
typical_price         >= 0
created_at
updated_at
```

## `province`

```text
id                    PK
name
```

## `local_area`

```text
id                    PK
province_id           FK → province.id
name
area_type
latitude
longitude
```

## `dish_province`

Many-to-many relationship between dishes and provinces.

```text
id                    PK
dish_id               FK → dish.id
province_id           FK → province.id
important_score
```

Preferred uniqueness:

```text
UNIQUE(dish_id, province_id)
```

## `restaurant_dish`

```text
id                    PK
google_place_id
dish_id               FK → dish.id
province_id           FK → province.id
local_area_id          FK → local_area.id, nullable
last_verified_at       nullable if not yet verified
```

## `user`

Application user profile. Authenticated identity comes from Supabase Auth/JWT.

## `user_preference`

One preference record per user.

```text
user_id               FK → user.id
```

## `subscription_plan`

Backend interpretation of available subscription plans.

## `user_subscription`

Synchronized subscription state. RevenueCat is the external subscription source.

## `usage_event`

Append-style usage records used for metering AI usage.

## `food_history`

User-to-dish interaction/history records.

---

# 9. Implementation Stages by Dependency

The system should be built in the following dependency order.

This allows development to pause after each stage and add required API keys only when necessary.

---

# Stage 0 — Infrastructure Only

## External requirements

```text
Supabase URL
Supabase secret key
```

No Gemini key. No Google Places key. No RevenueCat key.

## Build

```text
core/config.py
core/logging.py
core/exceptions.py
core/constants.py
clients/supabase_client.py
api/v1/router.py
api/v1/endpoints/health.py
```

## Endpoint

```http
GET /api/v1/health
```

Optional development-only database check:

```http
GET /api/v1/health/supabase
```

## Definition of done

```text
Expo can reach FastAPI
FastAPI can query Supabase
secrets remain backend-only
```

---

# Stage 1 — Supabase-Only Dish Dashboard

## External requirements

```text
Supabase only
```

## Features

```text
get one dish
get dishes for a province
deterministically order province dishes
render real FoodCards
```

## Repositories

### `dish_repository.py`

Required methods:

```text
get_by_id(dish_id)
get_by_ids(dish_ids)
```

### `province_repository.py`

Required methods:

```text
get_by_id(province_id)
```

### `dish_province_repository.py`

Required methods:

```text
get_dish_ids_by_province(province_id)
```

Recommended order:

```text
important_score DESC
dish_id ASC
```

## Service

### `dish_service.py`

Required behavior:

```text
get_by_id()
get_by_province()
```

Semantics:

```text
unknown province
→ not found

valid province with no related dishes
→ []

valid province with dishes
→ ordered list[DishResponse]
```

## Router

```http
GET /api/v1/dishes/{dish_id}
GET /api/v1/dishes?province_id=<uuid>
```

## Frontend result

Dashboard automatically renders real dishes for a temporary hardcoded province.

---

# Stage 2 — Supabase-Only Location Resolution

This stage does **not** require Google Places or Gemini.

GPS coordinates are provided by the Expo frontend. The backend does not need a GPS API key merely to receive latitude/longitude.

## External requirements

```text
Supabase only
Expo location permission on frontend
```

## Features

Two input modes:

```text
text location
OR
GPS coordinates
```

Examples:

```text
"Vinh, Nghệ An"

or

latitude=18.6796
longitude=105.6813
```

## Repositories

### `local_area_repository.py`

Possible methods:

```text
get_by_id(local_area_id)
list_for_province(province_id)
search_by_name(normalized_text)
list_candidate_areas(...)
```

### `province_repository.py`

May add:

```text
search_by_name(...)
```

## Utilities

### `utils/geo.py`

Pure synchronous helpers:

```text
haversine distance
nearest-area calculations
```

### `utils/text_location.py`

Pure/local normalization and fuzzy matching logic. Do not perform HTTP requests here.

## Service

### `location_service.py`

Responsibilities:

```text
GPS
→ find nearest suitable local_area
→ province

text
→ normalize/fuzzy match
→ local_area and/or province
```

## Endpoint

```http
POST /api/v1/locations/resolve
```

Request accepts exactly one mode:

```text
text

or

latitude + longitude
```

Response:

```text
province
local_area (nullable)
```

## Result

```text
location
→ province_id
→ DishService.get_by_province()
→ dashboard dishes
```

---

# Stage 3 — Map Pins from Existing Database Data

This stage provides backend data required for a map.

The frontend may render an OpenStreetMap-based map.

The backend does **not** need an OSM API dependency merely to return known pins already stored in Nomue.

## External requirements

```text
Supabase
frontend OSM map implementation (Already)
```

No Google Places key required yet if only stored restaurant/location data is used.

## Repository

### `restaurant_dish_repository.py`

Possible methods:

```text
get_by_dish_id(...)
get_by_province_id(...)
get_by_dish_and_province(...)
```

## Service

### `restaurant_service.py`

At this stage:

```text
DB-only
```

## Endpoint

Possible route:

```http
GET /api/v1/map/pins?dish_id=<uuid>&province_id=<uuid>
```

Or reuse restaurant collection output if it already contains everything needed for pins. Avoid duplicate endpoints if one response cleanly serves the UI.

---

# Stage 4 — Google Places Integration

Do not implement this stage until `GOOGLE_PLACES_API_KEY` is available in the backend `.env`.

## Goal

Nomue remains database-first.

Typical flow:

```text
selected dish
→ query restaurant_dish
→ obtain stored google_place_id values
→ request current details from Google Places
→ validate/normalize
→ return RestaurantResponse
```

Possible fallback:

```text
no useful stored place IDs
→ controlled Google Places search
→ return candidates
```

Fallback behavior must be explicit and cost-aware.

## Client

### `google_places_client.py`

Possible methods:

```text
get_place_details(google_place_id)
search_nearby(...)
```

Must implement:

```text
async HTTP
timeout
controlled requested fields
third-party error mapping
no raw API key in logs
```

## Repository

`restaurant_dish_repository.py` still owns only Supabase relationship access. It does not call Google.

## Service

### `restaurant_service.py`

Owns:

```text
DB-first policy
Google fallback decision
merging normalized data
deduplication
ordering
validation
cost-aware behavior
```

## Endpoint

```http
GET /api/v1/restaurants?dish_id=<uuid>&province_id=<uuid>
```

Response:

```text
list[RestaurantResponse]
```

Frontend uses restaurant coordinates for OSM map pins.

---

# Stage 5 — Gemini Chat and Recommendation Orchestration

Do not implement this stage until `GEMINI_API_KEY` is available.

Use the configurable `GEMINI_MODEL`. The current default is
`gemini-3.6-flash` because the Gemini API no longer makes
`gemini-2.5-flash` available to new users.

Gemini uses the separate `GEMINI_TIMEOUT_SECONDS` setting, which defaults to
`60` seconds because grounded and structured interactions can exceed the
shorter timeout used for ordinary backend requests.

Stage 5 uses `thinking_level="low"` because responses are concise mobile
recommendations and do not require long-form model reasoning.

Google Maps grounding is optional and should only be enabled when the request needs nearby/current place information.

## Goal

Build the backend flow:

```text
POST /api/v1/chat
        ↓
chat_orchestrator
        ↓
location + relevant dish data
        ↓
BACKEND_CONTEXT
        ↓
gemini_service
        ↓
gemini_client
        ↓
Gemini + optional Google Maps grounding
        ↓
structured Pydantic response
```

Do not modify the frontend in this stage. Only prepare the API response for later frontend integration.

## Response

The chat response should support the planned UI:

```text
ChatResponse
├── reply_text
├── recommended_dishes
├── recommended_restaurants
├── extracted_preferences
└── explanation
```

Use `recommended_dishes` later for:

```text
FoodCards
```

Use `recommended_restaurants` later for:

```text
MapView
```

Restaurant models may contain `dish_ids` when useful for connecting restaurant pins to recommended dishes.

Do not expose model chain-of-thought or internal reasoning.

`explanation` must only contain a short user-facing explanation.

## Request

Support:

```text
message
optional location text
optional GPS latitude
optional GPS longitude
```

Location may come from user GPS or from the existing location resolver.

## BACKEND_CONTEXT

Do not send only the user message to Gemini.

Build compact context from backend data:

```python
context = {
    "location": ...,
    "candidate_dishes": ...,
    "user_preferences": ...,
}
```

Then:

```python
input_text = f"""
BACKEND_CONTEXT:
{json.dumps(context, ensure_ascii=False)}

USER_MESSAGE:
{user_message}
"""
```

Only retrieve dishes relevant to the resolved location. Never send the complete dish database.

`user_preferences` is optional for now because user preference functionality is not implemented yet.

## `gemini_client.py`

Owns only Gemini SDK/API communication:

```text
Gemini client initialization
model configuration
timeouts
system instruction transport
Google Maps tool transport
structured-output transport
Gemini API errors
```

It must not query Supabase or contain application business logic.

Use the existing `GEMINI_API_KEY` configuration.

## `gemini_service.py`

Owns Gemini-facing application logic:

```text
system prompt
prompt/input construction
BACKEND_CONTEXT serialization
structured response schema
Pydantic validation
model output parsing
```

Gemini structured output must use a Pydantic schema, conceptually:

```python
response_format={
    "type": "text",
    "mime_type": "application/json",
    "schema": ChatGeminiResponse.model_json_schema(),
}
```

Keep permanent system instructions separate from dynamic `BACKEND_CONTEXT`.

## `chat_orchestrator.py`

Owns the complete chat workflow:

```text
request
↓
location service
↓
dish service
↓
optional user preference service later
↓
build application context
↓
gemini_service
↓
ChatResponse
```

The orchestrator may coordinate:

```text
Gemini
dish service
location service
restaurant service
Gemini tool handlers
```

It must reuse existing services/repositories rather than querying Supabase directly.

## Google Maps Grounding

When coordinates are available and nearby/current restaurant information is needed, enable Gemini Google Maps grounding:

```python
tools=[
    {
        "type": "google_maps",
        "latitude": latitude,
        "longitude": longitude,
    }
]
```

Coordinates must come from:

```text
GPS
or
resolved text location
```

Never hard-code them.

Requests that do not require current place information should not unnecessarily use Maps grounding.

If Maps grounding is unavailable, normal food-oriented chat should still work when enough backend context exists.

## Gemini Tools

### `tool_schemas.py`

Defines only controlled tool contracts, for example:

```text
search_dishes
get_restaurants
get_place_details
get_user_preferences
```

Only implement tools actually required by Stage 5.

### `tool_registry.py`

Maps approved Gemini tool names to approved handlers.

### `tool_handlers.py`

Handlers call application services.

Correct:

```text
Gemini tool
→ handler
→ service
→ repository/client
```

Never:

```text
Gemini tool
→ Supabase directly
```

## Security

Gemini must never receive unrestricted database access.

Do not expose:

```text
arbitrary SQL
insert
update
delete
administrative database operations
```

through normal user chat tools.

Any future administrative AI capability must be separate and explicitly authorized.

## Efficiency

For Stage 5:

- use the configured Gemini model (`gemini-3.6-flash` by default);
- send only relevant dishes;
- keep `BACKEND_CONTEXT` compact;
- keep system instructions concise;
- avoid unnecessary Maps grounding;
- avoid unnecessary Gemini calls;
- preserve async/non-blocking behavior where supported;
- do not add Semantic Router;
- do not add semantic caching;
- do not add vector databases or RAG frameworks;
- do not add prompt-compression infrastructure yet.

## Endpoint

```http
POST /api/v1/chat
```

Keep the endpoint thin:

```text
validate request
→ call chat_orchestrator
→ return ChatResponse
```

Do not place Gemini, Maps, or Supabase orchestration directly inside the endpoint.

## Documentation

After implementation, update:

```text
docs/endpoints.md
```

Document the chat endpoint with:

- endpoint path and method;
- purpose;
- request fields;
- optional text/GPS location;
- response fields;
- example request;
- example response;
- relevant errors.

Also briefly document the flow:

```text
POST /api/v1/chat
→ chat_orchestrator
→ location/dish services
→ BACKEND_CONTEXT
→ Gemini
→ optional Google Maps grounding
→ structured response
```

Do not mention Semantic Router because it is not part of the architecture.

## Scope

Do not:

- modify frontend code;
- implement user preference persistence yet;
- implement subscription-based model switching yet;
- implement conversation memory yet;
- redesign unrelated backend architecture;
- duplicate existing schemas/services/repositories.

Reuse existing location, dish, restaurant, and common schemas/services whenever possible.

---

# Stage 6 — Supabase Authentication

Authentication is deliberately introduced after the core product flow works.

## Core

### `core/security.py`

Responsibilities:

```text
extract bearer token
validate shape
verify claims using Supabase/JWKS-capable mechanism
validate issuer/audience/role/expiry
return AuthenticatedUser
```

Prefer verified claims/JWKS-style verification rather than performing a remote user lookup for every request.

## Dependency

Add `get_current_user` to `api/dependencies.py`.

## Service

### `auth_service.py`

Responsibilities:

```text
sync verified Supabase identity with application user row
apply server-controlled defaults
```

## Security

Never trust these from a normal frontend body when they can be derived from JWT:

```text
user_id
email identity
account status
role
```

---

# Stage 7 — User Preferences and Food History

Requires authentication from Stage 6.

## Preference repository

### `preference_repository.py`

Possible methods:

```text
get_by_user_id(...)
create(...)
update(...)
```

## Preference service

Always operate on `current_user.id`.

## Endpoints

```http
GET /api/v1/preferences
PUT /api/v1/preferences
```

No `user_id` query/body parameter for normal self-service operations.

## Food history

`food_history_repository.py` may provide:

```text
create(...)
list_for_user(...)
```

Public request DTO should normally contain `dish_id`, not `user_id`.

---

# Stage 8 — RevenueCat Subscription Integration

Do not implement until both server credentials are available:

```text
REVENUECAT_API_KEY
REVENUECAT_WEBHOOK_SECRET
```

## Client

### `revenuecat_client.py`

Responsibilities:

```text
server API calls
webhook signature verification
timeouts
third-party error normalization
```

## Repository

### `subscription_repository.py`

Owns Supabase data for:

```text
subscription_plan
user_subscription
```

## Service

### `subscription_service.py`

Owns:

```text
entitlement interpretation
plan mapping
subscription synchronization
status rules
```

Never trust client-provided subscription status.

Flow:

```text
RevenueCat
→ verified backend webhook/API
→ subscription service
→ Supabase
```

## Endpoints

```http
GET /api/v1/subscriptions/status
POST /api/v1/subscriptions/webhook
```

The webhook route uses RevenueCat server-side verification, not the user's JWT.

---

# Stage 9 — AI Usage Limits

Requires authentication, subscription logic, and Gemini.

## Repository

### `usage_event_repository.py`

Append-oriented usage records.

Possible methods:

```text
record(...)
count_since(...)
aggregate_for_period(...)
```

Use indexed/time-bounded queries.

## Service

### `usage_service.py`

Responsibilities:

```text
resolve current plan
calculate daily limit
calculate weekly limit
calculate monthly limit
reject over-limit usage
record successful usage
```

Do not let the frontend directly decide or increment usage.

Preferred flow:

```text
POST /chat
→ current user
→ usage_service.check_allowed()
→ Gemini call
→ usage_service.record_success()
```

---

# Stage 10 — Controlled Administrative Data Updates

Optional future feature.

Potential use:

```text
Gemini-assisted internal data maintenance
```

Examples:

```text
suggest dish metadata update
suggest restaurant relationship
normalize collected data
```

This must **not** reuse normal user chat for unrestricted writes.

Required controls:

```text
explicit admin/service authorization
strict allowed operations
validated schemas
audit logging
no arbitrary SQL
no arbitrary table selection
no arbitrary delete/update commands from model text
human approval where appropriate
```

Preferred pattern:

```text
AI proposes structured change
→ backend validates
→ authorization check
→ controlled service method
→ repository
→ audit record
```

---

# 10. Feature-to-Dependency Matrix

| Feature                  | Supabase | GPS input | OSM frontend | Google Places key | Gemini key |               Auth | RevenueCat |
| ------------------------ | -------: | --------: | -----------: | ----------------: | ---------: | -----------------: | ---------: |
| Health                   | optional |        no |           no |                no |         no |                 no |         no |
| Dish by ID               |      yes |        no |           no |                no |         no |                 no |         no |
| Dishes by province       |      yes |        no |           no |                no |         no |                 no |         no |
| Text location resolution |      yes |        no |           no |                no |         no |                 no |         no |
| GPS location resolution  |      yes |       yes |           no |                no |         no |                 no |         no |
| DB-only map pins         |      yes |  optional |          yes |                no |         no |                 no |         no |
| Live restaurant details  |      yes |  optional |          yes |               yes |         no |                 no |         no |
| AI chat recommendations  |      yes |  optional |          yes |          optional |        yes | optional initially |         no |
| User preferences         |      yes |        no |           no |                no |         no |                yes |         no |
| Food history             |      yes |        no |           no |                no |         no |                yes |         no |
| Subscription status      |      yes |        no |           no |                no |         no |                yes |        yes |
| AI usage enforcement     |      yes |        no |           no |                no |        yes |                yes |        yes |

---

# 11. Environment Variables by Stage

Root backend environment file currently lives at:

```text
nomue/.env
```

Backend configuration must resolve that exact location.

## Stage 0-3

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

## Stage 4

Add:

```env
GOOGLE_PLACES_API_KEY=
```

## Stage 5

Add:

```env
GEMINI_API_KEY=
```

## Stage 8

Add:

```env
REVENUECAT_API_KEY=
REVENUECAT_WEBHOOK_SECRET=
```

Frontend environment is separate and public-safe:

```text
nomue/frontend/.env
```

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:8000/api/v1
```

Never copy backend secrets into the frontend environment.

---

# 12. Error Semantics

## Repository

```text
record does not exist
→ None

valid collection with no rows
→ []

database failure
→ raise DatabaseError
```

## Service

Example province dish lookup:

```text
province does not exist
→ NotFoundError

province exists but has no dishes
→ []

province exists and has dishes
→ list[DishResponse]
```

## Router

Routers should not invent a different semantic contract if the service already defines one.

Global error middleware should convert `AppError` subclasses into consistent API responses.

---

# 13. Ordering Rules

Any user-visible collection that may have equal ranking values needs deterministic ordering.

Example:

```text
dish_province
ORDER BY important_score DESC, dish_id ASC
```

If data is fetched in two queries:

```text
dish IDs in ranked order
→ dish table IN (...)
```

the database may not preserve input-ID ordering. Restore the ranking order in the service.

---

# 14. Caching Strategy

Do not introduce caching before there is a demonstrated repeated-cost path, but preserve clean boundaries so caching can be added later.

Good candidates:

```text
province lookup
local_area lookup
static dish metadata
Google Places details with controlled TTL
JWKS/verified auth key material
subscription status with careful freshness rules
```

Do not cache user-sensitive data globally without a user-specific key.

Do not let stale cache bypass authorization, subscription expiration, or usage limits.

---

# 15. Logging and Observability

Use central logging.

Every request should eventually have a `request_id`.

Do not log:

```text
JWT
Supabase secret
Gemini key
Google Places key
RevenueCat secret
password
authorization header
full sensitive user data
```

Useful production logging fields include:

```text
request_id
route
status
latency
service name
external dependency name
error code
```

Avoid logging entire third-party payloads by default.

---

# 16. Testing Expectations

## Repository tests

Verify:

```text
raw Supabase response handling
None vs [] semantics
Pydantic validation
database-error propagation
ordering where repository owns ordering
```

Avoid overly brittle mocks tied to internal query-builder implementation if a cleaner fake boundary can be used.

## Service tests

Use fake repository interfaces.

Test:

```text
populated result
empty result
not-found result
external dependency failure
ordering
business rules
```

Services should be testable without real Supabase.

## API tests

Override FastAPI dependencies.

Test:

```text
valid request
invalid UUID
404/not found
empty collection
success response model
authentication when enabled
```

## External client tests

Mock HTTP/SDK transport.

Test:

```text
success
timeout
rate limit
malformed payload
upstream 4xx/5xx
```

---

# 17. Codex Implementation Rules

When asked to implement one stage, Codex should:

1. Read this file first.
2. Implement **only the requested stage and its required dependencies**.
3. Reuse existing schemas/core code instead of duplicating them.
4. Preserve singular Supabase table names.
5. Use async I/O for Supabase and external HTTP clients.
6. Use FastAPI dependency injection.
7. Keep routers thin.
8. Keep repositories business-logic free.
9. Keep clients business-logic free.
10. Validate database/external data before exposing it.
11. Do not expose server secrets.
12. Do not trust client-provided user identity.
13. Avoid N+1 queries.
14. Add deterministic ordering.
15. Keep collection queries bounded when data can grow.
16. Raise explicit application errors instead of swallowing exceptions.
17. Add tests for the new stage.
18. Do not implement future API-key-dependent integrations before the required key is supplied.
19. Do not add compatibility aliases or unnecessary abstraction unless current code requires them.
20. Prefer the simplest production-safe implementation that fits the existing architecture.

---

# 18. Example Instructions to Give Codex

## Build only Supabase dish dashboard

```text
Read BackendFeatures.md.

Implement Stage 1 only.
Do not add Google Places, Gemini, auth, or RevenueCat yet.
Use the existing async Supabase client and current schemas.
Implement repositories, DishService province listing, dependencies, endpoints, and tests.
Preserve singular table names.
```

## Add GPS/text location

```text
Read BackendFeatures.md.

Implement Stage 2 only.
GPS coordinates come from the Expo frontend.
Do not add Google geocoding or Google Places.
Use Supabase local_area/province data plus local geo/text utilities.
Add tests for text input, GPS input, invalid mixed input, and no-match behavior.
```

## Add Google Places

```text
Read BackendFeatures.md.

GOOGLE_PLACES_API_KEY is now available.

Implement Stage 4.
Use DB-first restaurant lookup via restaurant_dish.
Google Places is a client dependency, not a repository.
Keep restaurant_service responsible for fallback/merge/dedup/order policy.
Use async I/O, timeout handling, and cost-conscious field selection.
```

## Add Gemini

```text
Read BackendFeatures.md.

GEMINI_API_KEY is now available.

Implement Stage 5.
Do not allow Gemini direct Supabase access.
Tool handlers must call services.
ChatResponse should return reply_text, recommended_dishes, recommended_restaurants, optional extracted_preferences, and user-facing explanation.
Do not expose internal reasoning.
```

## Add authentication

```text
Read BackendFeatures.md.

Implement Stage 6.
Verify Supabase access tokens and create get_current_user.
Do not trust user_id/email/status supplied by the frontend when those values should come from verified auth context.
Add dependency-overridden API tests.
```

---

# 19. Current Product Flow Target

```text
User opens Nomue
    ↓
location from GPS or text
    ↓
FastAPI resolves local_area + province
    ↓
Supabase returns important local dishes
    ↓
FoodCards appear

User chooses a dish
    ↓
FastAPI checks restaurant_dish
    ↓
stored google_place_id values
    ↓
Google Places current restaurant details
    ↓
OSM map renders nearby restaurant pins

User chats with Nomue
    ↓
Gemini receives controlled context/tools
    ↓
tool handlers call Nomue services
    ↓
ChatResponse:
    reply_text
    recommended_dishes
    recommended_restaurants
    explanation
    ↓
chat text + OSM map + FoodCards

Authenticated user
    ↓
preferences/history/subscription/usage
    ↓
backend applies personalization and entitlement limits
```

---

# 20. Long-Term Design Principle

Nomue should not become:

```text
router → random Supabase calls → third-party APIs → frontend
```

It should remain:

```text
HTTP
↓
router
↓
service/business rules
↓
repository / external client
↓
validated data
```

This architecture is intentional because Nomue is expected to grow.

Optimize for:

```text
clear boundaries
safe credentials
predictable behavior
async I/O
bounded queries
low external API cost
testable services
explicit authorization
easy future replacement of providers
```

Do not sacrifice those properties for short-term convenience unless explicitly instructed.
