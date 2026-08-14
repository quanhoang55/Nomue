# Build Roadmap — Vietnamese Food Recommender

Order: each phase = backend files + frontend wiring + a visible result. Auth is deliberately
placed in Phase 6 (not first) so you can build/demo the core product with a hardcoded test
user first — this matches what you originally described, and it's the right call: auth adds
friction to every manual test cycle, so defer it until the core flows already work.

---

## Phase 0 — Skeleton (half a day, not a "feature")

Just enough to boot the server and prove Expo can reach it.

**Backend**

- `main.py`, `core/config.py`, `core/logging.py`, `core/exceptions.py`
- `clients/supabase_client.py`
- `api/v1/router.py` + one throwaway `GET /health` endpoint
- All `__init__.py` files

**Frontend**

- Add `API_BASE_URL` to an `.env`/`app.config.ts`
- One `lib/api.ts` fetch wrapper (base URL, JSON parsing, error handling) — every screen
  after this reuses it

**Demo:** Expo app calls `/health`, shows "connected" somewhere on `index.tsx`.

---

## Phase 1 — Dish dashboard (core loop, no location logic yet)

Hardcode a default province so you can prove the DB → API → UI pipe works before adding
location complexity.

**Backend**

- `repositories/dish_repository.py`, `province_repository.py`, `dish_province_repository.py`
- `services/dish_service.py`
- `schemas/dish.py`
- `endpoints/dishes.py` → `GET /dishes?province_id=`

**Frontend — `app/(tabs)/index.tsx`**

- Fetch dishes for a hardcoded province on mount
- Build/wire the `FoodCard` component to real API shape (not mock data)
- Loading + empty states

**Demo:** open the app, see real dishes from Supabase rendered as FoodCards.

---

## Phase 2 — Location resolution (GPS + text)

**Backend**

- `repositories/local_area_repository.py`
- `utils/geo.py` (haversine, nearest local_area from lat/lng)
- `utils/text_location.py` (fuzzy match "Vinh, Nghệ An" → local_area/province)
- `services/location_service.py` (resolve_from_gps, resolve_from_text)
- `schemas/location.py`
- `endpoints/locations.py` → `POST /locations/resolve`

**Frontend — `app/(tabs)/index.tsx`**

- GPS permission prompt + "use my location" button
- Text search input as fallback/override
- On resolve, re-fetch Phase 1's dish list using the returned `province_id`

**Demo:** switch location by GPS or by typing "Vinh, Nghệ An" → dish list updates live.

_(OSM/Nominatim geocoding slots into `location_service.py` here, as we discussed — only add
it if your local fuzzy-match misses often enough to need a fallback. Don't add it speculatively.)_

---

## Phase 3 — Dish detail + restaurants (Google Places)

**Backend**

- `repositories/restaurant_dish_repository.py`
- `clients/google_places_client.py` (get_place_details, search_nearby)
- `services/restaurant_service.py` (DB-first, fallback to Places, filter/merge)
- `schemas/restaurant.py`
- `endpoints/restaurants.py` → `GET /restaurants?dish_id=&lat=&lng=`

**Frontend — `app/locations/[dishId].tsx`**

- Dish detail header (from Phase 1 data, passed via route param or refetched)
- Restaurant list: name, rating, address, opening status
- Tap FoodCard on `index.tsx` → navigates here

**Demo:** tap a dish → see real restaurants serving it, sourced from your DB or live Google
Places if your DB has nothing stored yet.

---

## Phase 4 — Map screen

Not in your current file tree — you'll need to add one. Two reasonable options:

- `app/locations/map.tsx` (separate screen, navigated to from `[dishId].tsx`)
- A map view toggled inline within `[dishId].tsx`

**Backend**

- `endpoints/map.py` → `GET /map/pins?dish_id=` (reuses `restaurant_service.py`, just
  reshapes lat/lng into pin format)
- `schemas/restaurant.py` gets a lightweight `MapPin` variant if the full restaurant
  payload is heavier than the map needs

**Frontend**

- `react-native-maps` (or Expo's maps module) rendering pins from `/map/pins`
- Tap pin → show the same restaurant card info from Phase 3

**Demo:** see restaurant pins plotted on a real map for the selected dish/location.

---

## Phase 5 — Gemini chat

**Backend**

- `clients/gemini_client.py`
- `gemini_tools/tool_schemas.py`, `tool_registry.py`, `tool_handlers.py`
  (search_dishes, get_restaurants, get_place_details — wired to Phase 1–3 services, not
  repositories directly)
- `services/gemini_service.py` (prompt building, response validation)
- `services/chat_orchestrator.py` (context gathering + tool dispatch loop)
- `schemas/chat.py`
- `endpoints/chat.py` → `POST /chat`

**Frontend — `app/(tabs)/chat.tsx`**

- Message list + input
- Render structured Gemini replies as inline FoodCards/restaurant cards, not raw text

**Demo:** ask "something not too spicy near me" in chat → get back real dish
recommendations rendered as cards, not plain text.

_(`user_preferences` context here can stay hardcoded/mocked until Phase 6 — don't block
chat on auth.)_

---

## Phase 6 — Auth

Now wire the screens you already have stubbed.

**Backend**

- `core/security.py` (Supabase JWT verification via JWKS)
- `services/auth_service.py` (sync `user` row on first login)
- `endpoints/auth.py`
- `api/deps.py::get_current_user` — retrofit into Phases 1–5's endpoints

**Frontend**

- `app/(auth)/sign-in.tsx`, `sign-up.tsx` → real Supabase auth calls
- `app/(auth)/question.tsx` → onboarding form writes to `user_preference`
  (needs `repositories/preference_repository.py`, `services/preference_service.py`,
  `endpoints/preferences.py` — pull these in now)
- `lib/api.ts` — attach JWT to every request from here on

**Demo:** sign up → answer onboarding questions → dashboard/chat now use your real
preferences instead of the Phase 5 mock.

---

## Phase 7 — Profile + history

**Backend**

- `repositories/food_history_repository.py`
- `services` additions for reading/updating preferences and history

**Frontend — `app/(tabs)/profile.tsx`**

- Show user info, editable preferences, past `food_history`

**Demo:** edit spice preference in profile → next chat/dashboard request reflects it.

---

## Phase 8 — RevenueCat + usage limits

**Backend**

- `clients/revenuecat_client.py` (webhook signature verification!)
- `repositories/subscription_repository.py`, `usage_event_repository.py`
- `services/subscription_service.py`, `usage_service.py`
- `endpoints/subscriptions.py` (webhook receiver), `endpoints/usage.py`
- Guard clause inserted into `chat_orchestrator.py`: check usage before calling Gemini

**Frontend — `app/(auth)/subscription.tsx`**

- Paywall UI, RevenueCat SDK purchase flow
- Chat screen shows remaining usage / upgrade prompt when limit hit

**Demo:** hit the free-tier chat limit → see upgrade prompt → subscribe → limit resets.

---

## Why this order

- Phases 1–4 have zero dependency on auth or Gemini, so you get a fully working,
  demoable dish/location/restaurant/map app fast.
- Gemini (Phase 5) comes before auth (Phase 6) on purpose — it's your riskiest/most
  novel integration, worth de-risking early while auth is still a known, low-risk pattern.
- Auth is inserted _after_ the core loop works, then retrofitted into existing endpoints
  via `api/deps.py` — one dependency added to each router, not a rewrite.
- Billing (Phase 8) is last because it's pure gating logic around something that already
  works; building it first would give you nothing to gate.

## Suggested working rhythm per phase

1. Backend: repository → service → schema → endpoint (test with `/docs` Swagger UI first)
2. Frontend: wire the one screen this phase touches
3. Manual test on device/simulator end-to-end
4. Commit, move to next phase

Don't start Phase N+1 backend until Phase N is visible and working in the app — that's the
whole point of doing it this way.
