# Nomue Subscription Plan

This document is the implementation blueprint for Nomue subscriptions, AI
permissions, RevenueCat, and Supabase synchronization. It does not mean that
subscriptions are currently active.

## 1. Product Decisions

Nomue presents four commercial choices. All access, including the seven-day
trial, starts through an App Store subscription purchase managed by RevenueCat.
The trial is an introductory offer attached to the Short Trip weekly product.

| Plan code     | Display name     | Duration | Suggested price | Renewal              | AI policy |
| ------------- | ---------------- | -------: | --------------: | -------------------- | --------- |
| `free_offer`  | Claim Free Offer |   7 days |            Free | Then USD 9.99 weekly | Trial     |
| `short_trip`  | Short Trip       |   1 week |        USD 9.99 | Weekly               | Premium   |
| `long_trip`   | Long Trip        |  1 month |       USD 20.99 | Monthly              | Premium   |
| `annual_trip` | Annual Trip      |   1 year |      USD 100.99 | Yearly               | Premium   |

Claim Free Offer and Short Trip use the same weekly App Store product. An
eligible customer receives seven days free and then the subscription renews at
USD 9.99 per week unless cancelled. The App Store requires the customer to
confirm the subscription with an Apple Account payment method; Nomue and
RevenueCat never receive or store raw card details.

The paid plans provide the same product capabilities. They differ only in
billing period and effective price. Prices must be confirmed in App Store
Connect before launch.

The first release is iOS-only. The schema and product mapping remain
platform-aware so Android can be added without redesigning subscription logic.

### What remains free

Subscription access gates only operations that call Gemini:

- AI food chat;
- AI restaurant discovery;
- Google Maps grounding performed through Gemini.

Home, Map, Profile, dish browsing, location resolution, and restaurants already
stored in Nomue's database remain available without an active AI plan.

### Access precedence

The backend resolves access in this order:

1. Active RevenueCat entitlement in a normal paid period.
2. Active RevenueCat entitlement whose verified period type is `TRIAL`.
3. No AI access.

The trial is not a locally granted Nomue entitlement. RevenueCat and the App
Store determine introductory-offer eligibility and supply the verified trial
expiration. Cancelling auto-renewal does not end access early: access remains
active until the verified expiration time. A refund or revocation can remove
access immediately. A billing grace period remains active only while
RevenueCat reports the entitlement as active.

## 2. AI Permission System

Gemini keys and model selection must remain entirely in FastAPI. The frontend
must never receive, select, or submit a Gemini key, model, quota, or trusted
permission value.

Use two separate Google projects, both with paid Gemini billing:

- `trial`: handles users during the seven-day free offer;
- `premium`: handles Short Trip, Long Trip, and Annual Trip users.

This separation must occur at the Google project level because Gemini rate
limits are applied per project, not per API key. Each project needs its own
budget, quota, alerts, and backend secret. See the official
[Gemini rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits).

Start both profiles with the stable `gemini-3.6-flash` model. Keep model IDs in
server configuration so a model can be replaced without an app update. Model
availability and pricing must be rechecked before launch using the official
[Gemini model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash)
and [pricing page](https://ai.google.dev/gemini-api/docs/pricing).

### Suggested initial permissions

| Permission                           |         Free Offer |         Short Trip |          Long Trip |        Annual Trip |
| ------------------------------------ | -----------------: | -----------------: | -----------------: | -----------------: |
| Gemini profile                       |            `trial` |          `premium` |          `premium` |          `premium` |
| Model                                | `gemini-3.6-flash` | `gemini-3.6-flash` | `gemini-3.6-flash` | `gemini-3.6-flash` |
| Chat requests per UTC day            |                  5 |                 30 |                 30 |                 30 |
| Restaurant discoveries per UTC day   |                  2 |                  5 |                  5 |                  5 |
| Maps-grounded operations per UTC day |                  2 |                  5 |                  5 |                  5 |
| Concurrent AI operations             |                  1 |                  2 |                  2 |                  2 |

These values are initial safeguards, not hardcoded application constants. Store
them as server-managed plan policy so they can be tuned without releasing a new
mobile build.

### Enforcement flow

Every Gemini-backed operation follows the same flow:

```text
verified Supabase JWT
        ↓
resolve verified RevenueCat entitlement and period type
        ↓
atomically reserve permitted usage
        ↓
select server-side Gemini profile and model
        ↓
perform Gemini operation
        ↓
finalize usage with outcome and token metadata
```

Use an atomic database operation to check the quota and reserve a usage unit in
one transaction. A separate `count` followed by `insert` is unsafe because
parallel requests can pass the same check. Failed AI operations should be
marked failed and excluded from the successful daily allowance, while separate
attempt rate limits continue to prevent retry abuse.

Enforce both plan limits and abuse limits:

- per-user AI attempts per minute;
- per-IP attempts as a secondary signal;
- daily plan allowances;
- concurrent-operation limits;
- Google project quotas and spend caps;
- a server-side emergency AI kill switch.

## 3. Supabase Design

All subscription and usage tables must have Row Level Security enabled. Normal
frontend clients receive no write policies for these tables. FastAPI performs
authorized operations with its server-only Supabase credential and must filter
every user operation using the UUID from the verified JWT.

### `subscription_plan`

Defines the four internal access/presentation policies. `free_offer` is a trial
period of the Short Trip product rather than an independently purchasable
product.

Suggested columns:

| Column                     | Requirement                                     |
| -------------------------- | ----------------------------------------------- |
| `id`                       | UUID primary key                                |
| `code`                     | Unique stable code from the product table above |
| `display_name`             | User-facing plan name                           |
| `duration_unit`            | `day`, `week`, `month`, or `year`               |
| `duration_count`           | Positive integer                                |
| `is_paid`                  | False only for the `free_offer` trial period    |
| `priority`                 | Used for deterministic access resolution        |
| `is_active`                | Allows a plan to be withdrawn without deletion  |
| `created_at`, `updated_at` | Server timestamps                               |

The plan code is the stable application identity. Do not use a display name or
App Store price as an authorization key.

### `subscription_product`

Maps store products to internal paid plans.

Suggested columns:

| Column                      | Requirement                                  |
| --------------------------- | -------------------------------------------- |
| `id`                        | UUID primary key                             |
| `plan_id`                   | Foreign key to `subscription_plan.id`        |
| `platform`                  | Initially `ios`; reserve `android` and `web` |
| `revenuecat_app_id`         | RevenueCat app identifier                    |
| `revenuecat_product_id`     | Unique within the platform/app               |
| `revenuecat_entitlement_id` | Expected entitlement                         |
| `is_active`                 | Controls accepted product mappings           |

The weekly product maps normally to `short_trip`. When RevenueCat verifies that
the active weekly subscription has `period_type = TRIAL`, the resolver uses the
`free_offer` AI policy until the trial expires. Do not create a second App Store
product for the free offer.

### `plan_ai_policy`

Stores strongly typed server permissions rather than an unrestricted JSON
permission object.

Suggested columns:

| Column                             | Requirement                                           |
| ---------------------------------- | ----------------------------------------------------- |
| `plan_id`                          | Primary key and foreign key to `subscription_plan.id` |
| `gemini_profile`                   | `trial` or `premium`                                  |
| `model`                            | Approved Gemini model ID                              |
| `chat_daily_limit`                 | Non-negative integer                                  |
| `restaurant_discovery_daily_limit` | Non-negative integer                                  |
| `maps_grounding_daily_limit`       | Non-negative integer                                  |
| `concurrent_ai_limit`              | Positive integer                                      |
| `is_ai_enabled`                    | Emergency per-plan switch                             |
| `updated_at`                       | Server timestamp                                      |

Only an administrative backend process may update this table.

### `user_subscription`

Stores the current synchronized projection of a RevenueCat entitlement,
including introductory trial periods.
RevenueCat and the App Store remain the payment source of truth.

Suggested columns:

| Column                                           | Requirement                            |
| ------------------------------------------------ | -------------------------------------- |
| `id`                                             | UUID primary key                       |
| `user_id`                                        | Unique foreign key to `user.id`        |
| `plan_id`                                        | Foreign key to `subscription_plan.id`  |
| `revenuecat_app_user_id`                         | Supabase user UUID as text             |
| `revenuecat_product_id`                          | Verified store product                 |
| `entitlement_id`                                 | Verified entitlement                   |
| `period_type`                                    | `trial`, `intro`, `normal`, or prepaid |
| `status`                                         | Normalized current state               |
| `environment`                                    | `sandbox` or `production`              |
| `started_at`, `expires_at`                       | Verified entitlement period            |
| `will_renew`                                     | RevenueCat-derived value               |
| `billing_issue_at`, `cancelled_at`, `revoked_at` | Nullable lifecycle data                |
| `last_verified_at`                               | Last successful RevenueCat lookup      |
| `created_at`, `updated_at`                       | Server timestamps                      |

Never grant access from a product ID, entitlement, expiration, or purchase
result supplied by the frontend.

### `revenuecat_webhook_event`

Provides webhook idempotency and a minimal processing audit.

Suggested columns include RevenueCat event ID as the primary/unique key,
event type, environment, event timestamp, processing state, attempt count,
processed time, and a sanitized error code. Retain a full payload only if an
explicit retention and privacy policy approves it.

### `usage_event`

Stores append-oriented AI reservations and outcomes.

Suggested columns include UUID, unique request ID, user ID, resolved plan ID,
operation type, Gemini profile, model, state (`reserved`, `succeeded`, or
`failed`), input/output token counts, reserved time, and finalized time. Index
`(user_id, operation, reserved_at)` for time-bounded quota checks.

## 4. Backend Interfaces

Implement the normal Nomue schema → repository → service → endpoint flow.

### Planned endpoints

```http
GET  /api/v1/subscriptions/plans
GET  /api/v1/subscriptions/me
POST /api/v1/subscriptions/sync
POST /api/v1/subscriptions/webhooks/revenuecat
```

`GET /subscriptions/plans` returns safe display information and feature
summaries. Store-localized prices still come from RevenueCat Offerings rather
than Supabase.

`GET /subscriptions/me` requires authentication and returns:

- resolved plan code and display name;
- access state and verified period (`trial`, `paid`, or `none`);
- expiration and renewal state;
- allowed feature flags;
- remaining daily allowances and their UTC reset time.

It must not return Gemini keys, RevenueCat secrets, internal Google project
identifiers, raw webhook data, or another user's identifiers.

`POST /subscriptions/sync` requires authentication. It looks up the
authenticated Supabase UUID through RevenueCat's server API and replaces the
local paid subscription projection with verified current data. The request
must not accept client entitlement data.

`POST /subscriptions/webhooks/revenuecat` does not use a user's JWT. It uses
RevenueCat webhook verification, deduplication, product mapping, and a
server-to-server subscriber lookup.

### AI guards

Insert one shared entitlement/usage guard before both current expensive routes:

```http
POST /api/v1/chat
POST /api/v1/chat/restaurants/discover
```

Resolve permissions once per request and pass the selected Gemini client into
the existing chat or discovery service. Do not put subscription queries or key
selection directly inside endpoint functions.

Suggested stable errors:

| HTTP | Error code                              | Meaning                              |
| ---: | --------------------------------------- | ------------------------------------ |
|  402 | `subscription_required`                 | No active paid or trial entitlement  |
|  429 | `ai_quota_exceeded`                     | A plan allowance is exhausted        |
|  429 | `ai_concurrency_exceeded`               | Too many active AI operations        |
|  503 | `subscription_verification_unavailable` | Trusted status cannot be established |

Quota errors should include safe `retry_after` and `reset_at` values so the
frontend can show a useful message.

### Gemini configuration

Replace the single-client assumption with named server profiles, conceptually:

```text
GEMINI_TRIAL_API_KEY
GEMINI_TRIAL_MODEL=gemini-3.6-flash
GEMINI_PREMIUM_API_KEY
GEMINI_PREMIUM_MODEL=gemini-3.6-flash
GEMINI_TIMEOUT_SECONDS
AI_ENABLED
```

Secrets belong in the deployment secret manager, never committed `.env`
examples with real values. Cache one client per approved profile; never create
a new SDK client per request.

## 5. RevenueCat Setup

### Dashboard identifiers

Use the following initial structure:

| RevenueCat object | Identifier                          |
| ----------------- | ----------------------------------- |
| Project           | `Nomue`                             |
| iOS bundle ID     | `com.foun.nomue`                    |
| Entitlement       | `nomue_ai_premium`                  |
| Current offering  | `default`                           |
| Weekly product    | `com.foun.nomue.short_trip.weekly`  |
| Monthly product   | `com.foun.nomue.long_trip.monthly`  |
| Annual product    | `com.foun.nomue.annual_trip.yearly` |

Attach all three products to `nomue_ai_premium` and place them in one App Store
subscription group. Use weekly, monthly, and annual RevenueCat packages in the
`default` offering.

Configure a seven-day free introductory offer on the Short Trip weekly product
in App Store Connect. Claim Free Offer is the eligible-user presentation of
that weekly package, not a fourth RevenueCat product. Apple and RevenueCat
apply the trial during StoreKit checkout when the Apple Account is eligible.
The checkout requires an Apple Account payment method and clearly discloses
that billing starts at USD 9.99 per week after seven days unless cancelled.

Do not attempt to collect, validate, transmit, or store card details inside
Nomue. StoreKit owns payment confirmation and introductory-offer eligibility.

Use `Keep with original App User ID` as the initial RevenueCat transfer policy.
This favors protection against restoring one Apple receipt into a different
Nomue account. Provide a customer-support process for legitimate account
recovery.

### Customer identity

Use the authenticated Supabase UUID as the RevenueCat App User ID. It is unique,
non-email, and stable across the user's devices. Never use an email, shared
constant, or frontend-generated account ID. RevenueCat documents these identity
requirements in [Identifying Customers](https://www.revenuecat.com/docs/customers/identifying-customers).

The subscription SDK is configured only after Supabase authentication is
known. Log in with `user.id`, and log out of RevenueCat when the Supabase session
ends. Do not allow anonymous purchases in v1 because every purchase must map to
a verified Nomue account.

### Purchase and restore flow

```text
authenticated user opens paywall
        ↓
RevenueCat Offering supplies localized products/prices
        ↓
user purchases or restores through StoreKit
        ↓
SDK result updates temporary UI state only
        ↓
frontend calls POST /subscriptions/sync
        ↓
FastAPI queries RevenueCat with its secret key
        ↓
FastAPI updates Supabase and returns trusted access
```

The app may use a custom Nomue paywall while obtaining products and localized
prices from RevenueCat. It must provide purchase, restore purchases, manage
subscription, terms, and privacy actions.

Install `react-native-purchases` for the SDK. RevenueCat requires an Expo
development build for native purchase testing; Expo Go is insufficient. Follow
the official [RevenueCat Expo integration guide](https://www.revenuecat.com/docs/getting-started/installation/expo).

Only the platform-specific RevenueCat public SDK key may exist in Expo public
configuration. RevenueCat secret API keys remain on the backend, as required by
the [RevenueCat API-key guidance](https://www.revenuecat.com/docs/projects/authentication).

### Webhook verification and processing

Configure a production HTTPS webhook with both an authorization value and HMAC
signing. RevenueCat webhooks currently require its Pro integration tier.

For every delivery:

1. Read the raw request body before JSON parsing.
2. Parse `X-RevenueCat-Webhook-Signature` as `t=<timestamp>,v1=<signature>`.
3. Compute HMAC-SHA256 over `"<timestamp>.<raw body>"`.
4. Compare signatures using constant-time comparison.
5. Reject timestamps outside a five-minute tolerance.
6. Insert or find the unique RevenueCat event ID.
7. Validate that the App User ID maps to an existing Nomue UUID.
8. Query RevenueCat's subscriber API for current state instead of trusting
   lifecycle event ordering.
9. Transactionally synchronize `user_subscription` and mark the event handled.

Repeated deliveries of a successfully processed event return success without
applying the event twice. Failed events remain retryable. Unknown event fields
or future event types must not break JSON parsing. Keep sandbox and production
state isolated.

See RevenueCat's official documentation for
[HMAC verification, retries, idempotency, and subscriber synchronization](https://www.revenuecat.com/docs/integrations/webhooks).

## 6. Frontend Integration Plan

Add a subscription provider beside the existing authentication architecture;
do not replace Supabase auth. Its responsibilities are:

- configure RevenueCat for the authenticated user;
- load `/subscriptions/me`;
- refresh after login, app foregrounding, purchase, restore, and manual retry;
- expose safe access/loading/error state;
- clear user-scoped state on logout;
- never act as the backend authorization source.

The existing subscription screen becomes the Nomue paywall. It may visually
present Claim Free Offer separately, but both that CTA and Short Trip purchase
the RevenueCat weekly package. The free-offer treatment is shown only when
RevenueCat reports introductory-offer eligibility. Eligible customers cannot
bypass the store trial when choosing Short Trip because the store applies the
introductory offer to the same product.

Chat and restaurant discovery should handle subscription errors explicitly:

- no access → explain that free browsing remains available and open paywall;
- daily quota reached → show reset time rather than a generic error;
- subscription sync pending → provide retry/restore actions;
- purchase cancelled by user → remain on paywall without showing a failure;
- RevenueCat unavailable → preserve browsing and show a recoverable message.

Profile should later display the current plan, expiration/renewal status,
remaining AI allowance, restore purchases, and manage subscription actions.

## 7. Owner Checklist Before Building

### Apple

- [ ] Active Apple Developer membership.
- [ ] Paid Apps agreement accepted.
- [ ] Banking and tax information completed.
- [ ] App Store Connect app exists for `com.foun.nomue`.
- [ ] One subscription group is created.
- [ ] Weekly, monthly, and annual product IDs are created exactly as documented.
- [ ] USD prices and regional localization are confirmed.
- [ ] Product display names and descriptions are localized.
- [ ] Privacy Policy, Terms of Use, and support URLs are public.
- [ ] Auto-renewal and cancellation language is approved for the paywall.
- [ ] A seven-day free introductory offer is configured on the weekly product.
- [ ] The weekly product clearly discloses USD 9.99 weekly renewal after trial.

### RevenueCat

- [ ] RevenueCat project and iOS app are created.
- [ ] RevenueCat plan supports webhooks.
- [ ] App Store credentials are connected.
- [ ] Products are imported and attached to `nomue_ai_premium`.
- [ ] `default` offering contains weekly, monthly, and annual packages.
- [ ] Public iOS SDK key is available for Expo configuration.
- [ ] Least-privilege server secret key is stored in backend secrets.
- [ ] Webhook authorization value and HMAC signing secret are stored securely.
- [ ] Separate sandbox and production webhook behavior is confirmed.
- [ ] `Keep with original App User ID` transfer behavior is accepted.

### Google Gemini

- [ ] Trial and premium Google projects are created separately.
- [ ] Paid Gemini billing is enabled on both.
- [ ] Project spend caps, quota limits, and alerts are configured.
- [ ] Separate server API keys are stored in the backend secret manager.
- [ ] `gemini-3.6-flash` availability is reconfirmed before implementation.
- [ ] Suggested per-user limits fit the intended AI budget.
- [ ] A monthly total AI budget and emergency shutdown owner are assigned.

### Supabase and backend hosting

- [ ] Database migrations, constraints, indexes, functions, and RLS changes are approved.
- [ ] Purchases require a verified, non-anonymous Nomue account.
- [ ] Production FastAPI has a stable public HTTPS URL.
- [ ] Production secret management and secret rotation procedures exist.
- [ ] Database backups and recovery behavior are confirmed.
- [ ] System clocks are synchronized for webhook replay protection and expiry checks.
- [ ] Subscription audit and usage retention/deletion policy is written.
- [ ] Account deletion behavior for local subscription records is decided.

### Commercial and support

- [ ] USD 9.99 weekly, USD 20.99 monthly, and USD 100.99 annual are accepted or replaced.
- [ ] Suggested AI quotas are accepted or replaced.
- [ ] Refund and billing-support process is documented.
- [ ] Customer support can locate a user by RevenueCat App User ID.
- [ ] Cancellation keeps access until expiration.
- [ ] RevenueCat-reported grace periods keep access while active.
- [ ] App Store subscription-group eligibility is accepted as the trial eligibility source.

## 8. Implementation Phases

### Phase 1: Configuration and schema

1. Finalize identifiers, prices, quotas, and policies.
2. Configure App Store Connect and RevenueCat Test Store.
3. Add reviewed Supabase migrations, constraints, indexes, RLS, and atomic
   usage functions.
4. Seed the four plans, three product mappings, and two AI policies.

### Phase 2: Backend subscription foundation

1. Add RevenueCat client, schemas, repositories, service, and dependencies.
2. Implement plan listing, current status, and authenticated RevenueCat sync.
3. Implement HMAC-verified, idempotent webhook synchronization.
4. Add structured logs and metrics without secrets or sensitive payloads.

### Phase 3: AI enforcement

1. Add trial and premium Gemini client profiles.
2. Add atomic usage reservation and finalization.
3. Guard chat and restaurant discovery before every Gemini operation.
4. Add subscription/quota error responses and global spend protection.

### Phase 4: iOS frontend

1. Install RevenueCat packages and create a new Expo development build.
2. Add subscription provider synchronized with Supabase auth.
3. Build the Nomue paywall using RevenueCat Offerings.
4. Connect trial checkout, purchase, restore, manage, and sync flows.
5. Add Chat, restaurant-discovery, and Profile subscription states.

### Phase 5: Sandbox, review, and rollout

1. Run automated backend, frontend, database, and security tests.
2. Test RevenueCat Test Store and App Store sandbox lifecycle events.
3. Test on small and large iPhones and a physical sandbox device.
4. Launch behind `AI_ENABLED` and a controlled rollout flag.
5. Monitor subscription sync failures, denied AI calls, Gemini spend, webhook
   latency, duplicate events, refunds, and restore failures.

## 9. Test and Acceptance Plan

### Permission and trial tests

- Resolve normal paid periods and introductory trial periods from RevenueCat.
- Reject expired, revoked, or unknown plans.
- Accept access until the exact verified expiration boundary, then deny it.
- Reject anonymous, unverified, missing, and forged identities.
- Ignore all client-provided user IDs, timestamps, plans, and permissions.

### Usage tests

- Enforce each plan's daily chat, discovery, and grounding limits.
- Reset allowances at the documented UTC boundary.
- Prevent parallel requests from exceeding the limit.
- Make repeated request IDs idempotent.
- Finalize successful requests with usage metadata.
- Mark provider failures without granting reusable concurrent reservations.
- Enforce attempt rate limits even when Gemini calls fail.

### RevenueCat tests

- Reject missing, malformed, invalid, and stale webhook signatures.
- Accept the exact raw-body HMAC format.
- Ignore a previously processed event ID.
- Safely retry a previously failed event.
- Handle unknown future fields and event types.
- Synchronize purchase, renewal, cancellation, expiration, refund, billing
  issue, grace period, product change, and revocation.
- Keep sandbox purchases out of production entitlement state.
- Restore on reinstall and a second device for the same Nomue account.
- Reject restoration into another Nomue account under the chosen transfer rule.
- Verify an eligible weekly purchase enters a seven-day `TRIAL` period.
- Verify an ineligible weekly purchase starts at the normal paid price.
- Verify trial cancellation preserves access only until trial expiration.
- Verify an uncancelled trial renews into Short Trip weekly access.

### Frontend tests

- Render three RevenueCat packages plus the eligible Claim Free Offer treatment,
  using the weekly product's localized post-trial price in its disclosure.
- Open StoreKit for Claim Free Offer and require Apple payment confirmation.
- Never request or render custom card-number fields inside Nomue.
- Purchase and restore every paid package in sandbox.
- Handle user-cancelled purchases without a false error.
- Refresh trusted backend status after purchase and restore.
- Route subscription-required errors to the paywall.
- Show quota reset time and preserve all free browsing features.
- Clear RevenueCat and subscription state after Supabase logout.

### Security and release acceptance

- No Gemini or RevenueCat server secret exists in the Expo bundle, public
  configuration, API response, logs, crash reports, or repository.
- Direct Supabase client attempts cannot modify subscription, policy, webhook,
  or usage records.
- A frontend-modified plan or entitlement never changes backend authorization.
- TypeScript, ESLint, Expo configuration validation, backend tests, migration
  tests, RevenueCat Test Store, and App Store sandbox all pass.
- Production launch is blocked until owner checklist items and legal text are
  complete.

## 10. Explicit Non-Goals for the First Release

- Android or web purchases.
- Subscription-based access to ordinary dish/map/profile features.
- Anonymous purchases.
- A Nomue-controlled trial that bypasses StoreKit.
- A separate fourth App Store product for Claim Free Offer.
- Multiple introductory trials in the same subscription group.
- Client-controlled Gemini selection.
- Lifetime purchases, consumable token packs, family sharing, or subscriptions
  managed outside RevenueCat.
- Custom Nomue trial eligibility rules that disagree with App Store eligibility.
