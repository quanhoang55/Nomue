# Phase 1 — Dish Dashboard

Goal: display real dishes from Supabase for a hardcoded default province, proving the complete database → API → UI flow.

## Backend

### Dish schema

- [x] Create `backend/app/schemas/dish.py`.
- [x] Define the dish response fields used by the API.
- [x] Validate level fields and `typical_price`.
- [x] Add or confirm every field required by `FoodCard`, especially a usable image field or fallback strategy.

### Dish repository

- [x] Create `backend/app/repositories/dish_repository.py`.
- [x] Implement fetching one dish by its ID.
- [x] Validate Supabase dish data with `DishResponse`.
- [ ] Implement fetching multiple dishes by a collection of dish IDs, or another query suitable for province filtering.
- [ ] Define deterministic ordering for the returned dishes.

### Province repository

- [x] Create `backend/app/repositories/province_repository.py`.
- [ ] Implement the province repository interface and concrete Supabase repository.
- [ ] Implement fetching a province by ID.
- [ ] Return a clear not-found result for an unknown province.

### Dish-province repository

- [x] Create `backend/app/repositories/dish_province_repository.py`.
- [ ] Implement the dish-province repository interface and concrete Supabase repository.
- [ ] Query dish-province relationships by `province_id`.
- [ ] Return the related dish IDs or joined dish records.

### Dish service

- [x] Create `backend/app/services/dish_service.py`.
- [x] Implement fetching one dish by ID.
- [ ] Inject the province and dish-province repositories where needed.
- [ ] Implement listing dishes for a province.
- [ ] Decide how an unknown province should be reported.
- [ ] Return an empty list when a valid province has no dishes.

### Dish endpoint and wiring

- [x] Create and register a dish router.
- [x] Implement `GET /api/v1/dish/{dish_id}` for a single dish.
- [ ] Implement the Phase 1 collection endpoint: `GET /api/v1/dishes?province_id=<uuid>`.
- [ ] Add a list response model to the collection endpoint.
- [ ] Validate `province_id` and return an appropriate client error when invalid.
- [ ] Update `backend/app/api/dependencies.py` to construct the service with all required repositories.
- [ ] Register the collection endpoint in the API router.
- [ ] Confirm the endpoint appears in Swagger/OpenAPI.

## Frontend

### API integration

- [x] Configure `EXPO_PUBLIC_API_BASE_URL`.
- [x] Create the reusable `frontend/lib/api.ts` fetch wrapper.
- [x] Define the frontend `Dish` type.
- [x] Implement fetching one dish by ID.
- [ ] Add `getDishes(provinceId)` to request the province-filtered collection endpoint.
- [ ] Ensure API errors can be displayed to the user or retried.

### Dashboard

- [x] Create the dashboard screen at `frontend/app/(tabs)/index.tsx`.
- [x] Create and render the `FoodCard` component.
- [x] Map a fetched single-dish response into the current `FoodCard` shape.
- [ ] Replace the initial mock `Phở` card with API-backed state.
- [ ] Define a hardcoded default province ID for Phase 1.
- [ ] Fetch the province's dishes automatically when the dashboard mounts.
- [ ] Store and render a list of dishes instead of one dish.
- [ ] Remove the temporary `Find` button and hardcoded dish ID.
- [ ] Render a loading state while the request is in progress.
- [ ] Render an empty state when the province has no dishes.
- [ ] Render an error state when the request fails.
- [ ] Format `typical_price` consistently as Vietnamese currency.
- [ ] Provide a valid dish image or a visible fallback instead of the `"none"` URI.
- [ ] Confirm each `FoodCard` receives only real API data.

## Tests and verification

- [x] Confirm the backend Python source compiles.
- [x] Confirm the frontend TypeScript check passes with `npx tsc --noEmit`.
- [ ] Add repository tests for province-based dish lookup.
- [ ] Add service tests for populated, empty, and unknown-province results.
- [ ] Add an API test for `GET /api/v1/dishes?province_id=`.
- [ ] Add a frontend test for loading, populated, empty, and error states.
- [ ] Fix the existing frontend lint errors from generated Firebase Data Connect imports, or exclude generated files from linting.
- [ ] Run the backend test suite successfully.
- [ ] Run frontend lint successfully with no errors.
- [ ] Start the backend and verify the collection endpoint against real Supabase data.
- [ ] Open the Expo app and verify real dishes appear automatically as FoodCards.
- [ ] Verify a province with no dishes displays the empty state.
- [ ] Complete the Phase 1 demo: open the app and see real Supabase dishes without pressing a manual fetch button.

## Phase 1 completion gate

Phase 1 is complete only when all of the following are true:

- [ ] The province-filtered dish collection endpoint works against Supabase.
- [ ] The dashboard automatically fetches a hardcoded province on mount.
- [ ] Real dishes are rendered as a list of `FoodCard` components.
- [ ] Loading, empty, and error states are visible and tested.
- [ ] Backend tests, TypeScript checking, and frontend lint all pass.
- [ ] The end-to-end demo succeeds on an Expo device or simulator.
