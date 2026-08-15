Here's a clean layered architecture that maps directly to your flow (Expo → FastAPI → Supabase/Google Places/Gemini/RevenueCat), with clear separation between routing, business logic, and data access — so you can add auth and billing later without restructuring anything.

```
app/
├── main.py                          # FastAPI app instance, router mounting, middleware, startup/shutdown
│
├── core/
│   ├── config.py                    # env vars: Supabase URL/key, Gemini key, Google Places key, RevenueCat key
│   ├── security.py                  # Supabase JWT verification, current_user dependency
│   ├── logging.py
│   ├── exceptions.py                # custom exceptions (NotFound, RateLimited, InvalidGeminiResponse, etc.)
│   └── constants.py
│
├── api/
│   ├── deps.py                      # shared Depends(): get_current_user, get_repo, rate-limit check
│   └── v1/
│       ├── router.py                # aggregates all endpoint routers
│       └── endpoints/
│           ├── dishes.py            # GET /dishes, /dishes/{id}
│           ├── locations.py         # POST /locations/resolve (GPS or text -> local_area/province)
│           ├── restaurants.py       # GET /restaurants?dish_id=&province_id=
│           ├── map.py               # GET /map/pins?...
│           ├── chat.py              # POST /chat  (Gemini orchestration)
│           ├── auth.py              # POST /auth/session (verify Supabase JWT, sync user)
│           ├── users.py
│           ├── preferences.py       # GET/PUT /preferences
│           ├── subscriptions.py     # RevenueCat webhook + status
│           └── usage.py             # AI usage check/report
│
├── schemas/                         # Pydantic request/response DTOs (never expose raw DB rows)
│   ├── dish.py
│   ├── location.py
│   ├── restaurant.py
│   ├── chat.py                      # ChatRequest, ChatResponse, GeminiToolCall, GeminiStructuredReply
│   ├── user.py
│   ├── preference.py
│   ├── subscription.py
│   └── common.py                    # pagination, error envelope
│
├── services/                        # BUSINESS LOGIC — orchestrates repos + clients, enforces rules
│   ├── dish_service.py
│   ├── location_service.py          # text/GPS -> local_area/province resolution logic
│   ├── restaurant_service.py        # DB-first, fallback to Google Places, merge/validate
│   ├── gemini_service.py            # builds prompt+context, calls Gemini client, parses/validates JSON
│   ├── chat_orchestrator.py         # ties gemini_service + tool handlers + dish/restaurant services together
│   ├── auth_service.py
│   ├── preference_service.py
│   ├── subscription_service.py      # RevenueCat entitlement checks
│   └── usage_service.py             # daily/weekly/monthly AI limit enforcement
│
├── repositories/                    # DATA ACCESS ONLY — talks to Supabase, no business logic
│   ├── base_repository.py
│   ├── dish_repository.py
│   ├── province_repository.py
│   ├── local_area_repository.py
│   ├── dish_province_repository.py
│   ├── restaurant_dish_repository.py
│   ├── user_repository.py
│   ├── preference_repository.py
│   ├── subscription_repository.py
│   ├── food_history_repository.py
│   └── usage_event_repository.py
│
├── clients/                         # thin wrappers around external APIs, no business logic
│   ├── supabase_client.py           # singleton Supabase client (service-role key, server-side only)
│   ├── google_places_client.py      # get_place_details(), search_nearby()
│   ├── osm_client.py                # Nominatim geocode/reverse-geocode, Overpass queries
│   ├── gemini_client.py             # send_message(), handles function-calling protocol
│   └── revenuecat_client.py         # get_subscriber(), webhook signature check
│
├── gemini_tools/                    # controlled function-calling surface exposed TO Gemini
│   ├── tool_schemas.py              # JSON schemas: search_dishes, get_restaurants, get_place_details, get_user_preferences
│   ├── tool_registry.py             # maps tool name -> handler function
│   └── tool_handlers.py             # each handler calls a service (never Supabase directly)
│
├── middleware/
│   ├── rate_limit_middleware.py
│   └── error_handler.py             # converts custom exceptions -> HTTP responses
│
└── utils/
    ├── geo.py                       # haversine distance, GPS -> nearest local_area
    ├── text_location.py             # fuzzy match "Vinh, Nghệ An" -> local_area/province
    └── validators.py

tests/
├── unit/            # services + utils, mocked repos/clients
├── integration/     # endpoint tests with test Supabase project
└── conftest.py

.env
```
