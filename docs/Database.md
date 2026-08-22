# Database

This document describes the PostgreSQL / Supabase database used by **Nomue**.

The goal of this file is to provide a clear reference for:

- table naming conventions;
- primary keys and foreign keys;
- important constraints;
- table relationships;
- special-purpose columns;
- how backend repositories should use each table.

---

## 1. Naming Conventions

### Table names are singular

All database table names use the **singular form**.

Use:

```text
dish
dish_type
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

Do **not** use plural suffixes such as `s` or `es`.

Avoid:

```text
dishes
provinces
local_areas
users
subscriptions
usage_events
```

This is a project-level convention and should remain consistent across Supabase, repositories, services, SQL, migrations, and documentation.

> API routes do not have to follow this database naming rule.  
> For example, the database table can be `dish` while the REST endpoint is `/api/v1/dishes`.

### Column names use snake_case

Examples:

```text
province_id
local_area_id
google_place_id
important_score
created_at
updated_at
```

Avoid:

```text
provinceId
localAreaId
GooglePlaceID
```

### ID convention

Most application tables use a UUID column named:

```text
id
```

The `id` column is normally the table's **Primary Key (PK)**.

Example:

```text
dish.id
province.id
local_area.id
```

### Foreign-key convention

A foreign key uses:

```text
<referenced_table>_id
```

Examples:

```text
local_area.province_id
dish_province.dish_id
dish_province.province_id
restaurant_dish.local_area_id
```

This makes relationships easy to recognize directly from the schema.

### Timestamp convention

Tables that need lifecycle/audit information should normally use:

```text
created_at
updated_at
```

Some domain-specific tables may also contain timestamps such as:

```text
last_verified_at
started_at
expires_at
cancelled_at
last_synced_at
```

These are different from the generic `created_at` / `updated_at` fields.

---

# 2. Core Food & Location Tables

## `dish`

Stores the canonical information for a Vietnamese dish.

| Column              | Role     | Description                                                                                       |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `id`                | PK       | Unique UUID identifying the dish.                                                                 |
| `dish_type_id`      | FK → `dish_type.id`, nullable | Optional category assigned to the dish. A null value means the dish has not been categorized yet. |
| `name`              | Data     | Display name of the dish.                                                                         |
| `description`       | Data     | Human-readable description of the dish. May be nullable if data is incomplete.                    |
| `spice_level`       | Data     | Relative spice score, normally `0-5`.                                                             |
| `sweetness_level`   | Data     | Relative sweetness score, normally `0-5`.                                                         |
| `sourness_level`    | Data     | Relative sourness score, normally `0-5`.                                                          |
| `bitterness_level`  | Data     | Relative bitterness score, normally `0-5`.                                                        |
| `adventurous_level` | Data     | How unfamiliar/adventurous the dish may feel to a typical international traveler, normally `0-5`. |
| `typical_price`     | Data     | Typical price of the dish in VND. Should be non-negative.                                         |
| `created_at`        | Metadata | Time the record was created.                                                                      |
| `updated_at`        | Metadata | Time the record was last updated.                                                                 |

### Important notes

`id` is the canonical identity of the dish and should be used by other tables instead of repeating the dish name.

`dish_type_id` is nullable so the new taxonomy can be introduced without requiring every existing dish to be categorized immediately. When present, it must reference an existing `dish_type.id`.

Example:

```text
dish
id: 014d50ef-...
name: Phở
```

Other tables should reference:

```text
dish_id = 014d50ef-...
```

rather than storing `"Phở"` again.

The level columns should ideally be protected at two layers:

```text
PostgreSQL CHECK constraint
0 <= value <= 5

+

Pydantic validation
Field(ge=0, le=5)
```

Pydantic validation protects the API from invalid database data, while a PostgreSQL constraint prevents invalid values from being stored in the first place.

`created_at` and `updated_at` do not have to be exposed by `DishResponse` unless the frontend actually needs them.

---

## `dish_type`

Stores the canonical dish categories used to classify dishes. Examples may include noodle dishes, soups, rice dishes, breads, desserts, and drinks.

| Column | Role | Description                                      |
| ------ | ---- | ------------------------------------------------ |
| `id`   | PK   | Unique UUID identifying the dish type.           |
| `name` | Data | Human-readable, unique name of the dish category. |

Relationship:

```text
dish_type
   1
   │
   └──── many dish
```

A dish may have zero or one dish type:

```text
dish.dish_type_id → dish_type.id
```

Recommended constraints and indexes:

```text
dish_type.name UNIQUE
INDEX dish(dish_type_id)
```

Create and populate `dish_type` before assigning `dish.dish_type_id`. Because the foreign key is nullable, existing dish records remain valid until they are categorized.

---

## `province`

Stores the province-level geographical entities used by Nomue.

| Column | Role | Description                                           |
| ------ | ---- | ----------------------------------------------------- |
| `id`   | PK   | Unique UUID identifying the province.                 |
| `name` | Data | Province / municipality name used by the application. |

Example:

```text
province
id: <uuid>
name: Nghệ An
```

The province ID should be used for filtering dishes and local areas.

Relationships:

```text
province.id
   ├── local_area.province_id
   ├── dish_province.province_id
   └── restaurant_dish.province_id
```

---

## `local_area`

Stores smaller geographical areas that belong to a province.

Examples include districts, cities, towns, and other local administrative areas.

| Column        | Role               | Description                                            |
| ------------- | ------------------ | ------------------------------------------------------ |
| `id`          | PK                 | Unique UUID identifying the local area.                |
| `province_id` | FK → `province.id` | Province containing this local area.                   |
| `name`        | Data               | Local-area name.                                       |
| `area_type`   | Data               | Administrative type such as city, district, town, etc. |
| `latitude`    | Data               | Representative latitude for location matching.         |
| `longitude`   | Data               | Representative longitude for location matching.        |

Relationship:

```text
province
   1
   │
   └──── many local_area
```

Example:

```text
province
Nghệ An

    ↓

local_area
Vinh
```

`latitude` and `longitude` are used by the location service for operations such as:

```text
GPS
→ nearest local_area
→ province
→ local dishes
```

They should represent a useful central/representative point for the local area, not necessarily a restaurant location.

---

## `dish_province`

Association table connecting dishes to provinces.

This is a **many-to-many relationship table**.

A dish may belong to several provinces, and a province may have many dishes.

| Column            | Role                  | Description                                                  |
| ----------------- | --------------------- | ------------------------------------------------------------ |
| `id`              | PK                    | Unique UUID for the relationship row.                        |
| `dish_id`         | FK → `dish.id`        | Dish in this relationship.                                   |
| `province_id`     | FK → `province.id`    | Province in this relationship.                               |
| `important_score` | Relationship metadata | Relative importance/relevance of this dish to this province. |

Relationship:

```text
dish
  many
    │
    └── dish_province ── many province
```

Example:

```text
Phở
  ↓
dish_province
  ↓
Hà Nội
```

### `important_score`

`important_score` belongs on the relationship, not on `dish`.

That is important because the same dish can have different regional importance.

Example:

```text
Dish A + Province X → important_score = 5
Dish A + Province Y → important_score = 2
```

For the Phase 1 dashboard, this value can be used to order dishes:

```text
important_score DESC
```

A secondary deterministic ordering should also be used, for example:

```text
important_score DESC
dish_id ASC
```

This prevents equal-scoring rows from appearing in an unpredictable order.

A unique constraint should eventually prevent duplicate relationships:

```text
UNIQUE (dish_id, province_id)
```

---

# 3. Restaurant Data

## `restaurant_dish`

Stores the relationship between a known Google place / restaurant and a Nomue dish.

| Column             | Role                           | Description                                               |
| ------------------ | ------------------------------ | --------------------------------------------------------- |
| `id`               | PK                             | Unique UUID identifying this relationship.                |
| `google_place_id`  | External ID                    | Stable Google Places identifier for the restaurant/place. |
| `dish_id`          | FK → `dish.id`                 | Dish associated with the restaurant.                      |
| `province_id`      | FK → `province.id`             | Province where the restaurant belongs.                    |
| `local_area_id`    | FK → `local_area.id`, nullable | More specific local area when known.                      |
| `last_verified_at` | Metadata                       | Last time the relationship/place was checked or verified. |

This table intentionally stores the Google `place_id`, rather than trying to permanently copy all dynamic Google Maps data.

Typical flow:

```text
dish selected
→ query restaurant_dish
→ obtain google_place_id
→ FastAPI calls Google Places
→ current name/rating/address/opening/location data
→ return fresh data to frontend
```

`local_area_id` is nullable because a restaurant may be known at province level before a reliable local-area mapping exists.

A useful uniqueness constraint may eventually be:

```text
UNIQUE (google_place_id, dish_id)
```

depending on the final ingestion rules.

---

# 4. User & Preference Tables

## `user`

Application-level user profile linked to authentication.

> If the deployed database currently uses another exact name for this table, keep the real Supabase name as the source of truth. The project convention itself remains singular.

| Column               | Role             | Description                                |
| -------------------- | ---------------- | ------------------------------------------ |
| `id`                 | PK               | Internal Nomue user UUID.                  |
| `username`           | Unique, nullable | Optional unique username.                  |
| `email`              | Data             | User email.                                |
| `display_name`       | Data             | Name displayed by the app.                 |
| `country_code`       | Data             | User's country/region code when available. |
| `preferred_language` | Data             | Preferred application language.            |
| `status`             | Data             | Application account status.                |

Authentication identity should remain separate from application business data where practical.

The backend should determine the authenticated user from the verified Supabase JWT and then map that identity to this application record.

---

## `user_preference`

Stores food preferences for one user.

| Column                   | Role                   | Description                                                       |
| ------------------------ | ---------------------- | ----------------------------------------------------------------- |
| `id`                     | PK                     | Unique preference-record UUID.                                    |
| `user_id`                | FK → `user.id`, UNIQUE | User that owns these preferences.                                 |
| `spice_preference`       | Data                   | Preferred spice level.                                            |
| `sweetness_preference`   | Data                   | Preferred sweetness level.                                        |
| `sourness_preference`    | Data                   | Preferred sourness level.                                         |
| `adventurous_preference` | Data                   | Preference for adventurous/unfamiliar dishes.                     |
| `max_price`              | Planned, nullable      | Optional user price ceiling. Not deployed in the current Supabase table yet. |
| `vegetarian`             | Data                   | Vegetarian preference/restriction.                                |
| `vegan`                  | Data                   | Vegan preference/restriction.                                     |
| `no_pork`                | Data                   | Avoid pork.                                                       |
| `no_beef`                | Data                   | Avoid beef.                                                       |
| `no_seafood`             | Data                   | Avoid seafood.                                                    |
| `halal_preference`       | Data                   | Halal-related preference.                                         |
| `allergy_preference`     | Data                   | Allergy information/preferences used by the recommendation layer. |
| `created_at`             | Metadata               | Creation time.                                                    |
| `updated_at`             | Metadata               | Last update time.                                                 |

`user_id` should be unique because the intended relationship is:

```text
one user
   ↓
one user_preference row
```

rather than multiple active preference rows for the same user.

Self-service preference endpoints must derive `user_id` from the verified
Supabase JWT. They must not trust a user ID supplied in a query parameter or
request body. The backend uses a privileged Supabase secret key that bypasses
Row Level Security, so the repository's authenticated-user filter is mandatory.
RLS should still enforce the same ownership rule for any direct access made
with publishable/authenticated client credentials.

---

# 5. Subscription & Usage Tables

## `subscription_plan`

Defines subscription products/plans understood by the backend.

| Column                      | Role                  | Description                                      |
| --------------------------- | --------------------- | ------------------------------------------------ |
| `id`                        | PK                    | Internal plan UUID.                              |
| `name`                      | Data                  | Internal/display plan name.                      |
| `revenuecat_entitlement_id` | Unique external ID    | RevenueCat entitlement associated with the plan. |
| `revenuecat_offering_id`    | External ID, nullable | RevenueCat offering when applicable.             |
| `price`                     | Data                  | Plan price used by the application.              |
| `duration_days`             | Data                  | Duration represented in days when applicable.    |
| `daily_token_limit`         | Data                  | Daily AI usage allowance.                        |
| `weekly_token_limit`        | Data                  | Weekly AI usage allowance.                       |
| `monthly_token_limit`       | Data                  | Monthly AI usage allowance.                      |
| `is_active`                 | Data                  | Whether the plan is currently offered/usable.    |
| `created_at`                | Metadata              | Creation time.                                   |
| `updated_at`                | Metadata              | Last modification time.                          |

RevenueCat remains the subscription source of truth for entitlement/payment state; this table defines how Nomue interprets plans and usage limits.

---

## `user_subscription`

Stores Nomue's synchronized subscription state for a user.

| Column                   | Role                        | Description                                      |
| ------------------------ | --------------------------- | ------------------------------------------------ |
| `id`                     | PK                          | Unique subscription-record UUID.                 |
| `user_id`                | FK → `user.id`              | User who owns the subscription.                  |
| `plan_id`                | FK → `subscription_plan.id` | Nomue plan associated with the subscription.     |
| `revenuecat_app_user_id` | External ID                 | RevenueCat user identifier.                      |
| `entitlement_id`         | External ID                 | Entitlement reported by RevenueCat.              |
| `status`                 | Data                        | Current subscription status.                     |
| `started_at`             | Metadata                    | Subscription start time.                         |
| `expires_at`             | Metadata, nullable          | Expiration time if applicable.                   |
| `cancelled_at`           | Metadata, nullable          | Cancellation time if applicable.                 |
| `last_synced_at`         | Metadata                    | Last successful synchronization with RevenueCat. |
| `created_at`             | Metadata                    | Local row creation time.                         |
| `updated_at`             | Metadata                    | Local row update time.                           |

Do not trust frontend-provided subscription status.

Expected flow:

```text
RevenueCat
→ webhook / API verification
→ FastAPI
→ user_subscription
```

---

## `usage_event`

Append-oriented table for recording metered usage.

| Column       | Role           | Description                                      |
| ------------ | -------------- | ------------------------------------------------ |
| `id`         | PK             | Unique usage-event UUID.                         |
| `user_id`    | FK → `user.id` | User responsible for the usage.                  |
| `usage_type` | Data           | Type of usage, for example an AI chat request.   |
| `amount`     | Data           | Number of usage units represented by this event. |
| `created_at` | Metadata       | Time the usage occurred.                         |

Example:

```text
user asks Gemini question
→ verify plan
→ count relevant usage_event rows
→ enforce limit
→ perform request
→ record usage_event
```

This table should normally behave like an event log rather than a mutable counter table.

---

# 6. Food History

## `food_history`

Stores a user's interaction/history with dishes.

The exact final columns can evolve as the product behavior is finalized.

Typical responsibilities include recording:

```text
viewed dish
selected dish
liked dish
tried dish
saved dish
```

At minimum, this table will normally need relationships similar to:

| Column       | Role           | Description                     |
| ------------ | -------------- | ------------------------------- |
| `id`         | PK             | Unique history/event UUID.      |
| `user_id`    | FK → `user.id` | User associated with the event. |
| `dish_id`    | FK → `dish.id` | Dish associated with the event. |
| `created_at` | Metadata       | Time the event occurred.        |

Additional columns should only be added when the exact product behavior is defined.

---

# 7. Relationship Overview

High-level relationship map:

```text
province
   │
   ├──────────────< local_area
   │
   ├──────────────< dish_province >────────────── dish
   │                                               │
   │                                               │
   └──────────────< restaurant_dish >─────────────┘
                            │
                            └──── local_area (nullable)


user
   │
   ├────────────── user_preference
   │
   ├────────────── user_subscription >──── subscription_plan
   │
   ├────────────── usage_event
   │
   └────────────── food_history >────────── dish
```

Legend:

```text
PK = Primary Key
FK = Foreign Key
UNIQUE = duplicate values are not allowed
nullable = value may be NULL
1 → many = one parent row may be referenced by many child rows
```

---

# 8. Backend Repository Mapping

Each repository should normally access only its corresponding table or closely related persistence concern.

```text
dish_repository.py
→ dish

province_repository.py
→ province

local_area_repository.py
→ local_area

dish_province_repository.py
→ dish_province

restaurant_dish_repository.py
→ restaurant_dish

user_repository.py
→ user

preference_repository.py
→ user_preference

subscription_repository.py
→ subscription_plan / user_subscription

usage_event_repository.py
→ usage_event

food_history_repository.py
→ food_history
```

Repositories perform **data access only**.

They should not contain business logic such as:

```text
recommend dishes
decide whether a user can use Gemini
resolve subscription entitlement
rank restaurants
interpret user preferences
```

Those rules belong in the service layer.

---

# 9. Database vs API Naming

Database naming and REST endpoint naming serve different purposes.

Database:

```text
dish
province
local_area
dish_province
```

REST API:

```text
GET /api/v1/dishes
GET /api/v1/dishes/{dish_id}
GET /api/v1/locations/resolve
GET /api/v1/restaurants
```

Therefore this is correct:

```text
database table = dish
API resource    = /dishes
```

Do not rename a Supabase table to `dishes` merely because the API endpoint is plural.

---

# 10. Constraints Worth Adding

As the schema becomes production-ready, important invariants should be enforced at the database layer as well as in Pydantic.

Examples:

```text
dish.spice_level           BETWEEN 0 AND 5
dish.sweetness_level       BETWEEN 0 AND 5
dish.sourness_level        BETWEEN 0 AND 5
dish.bitterness_level      BETWEEN 0 AND 5
dish.adventurous_level     BETWEEN 0 AND 5
dish.typical_price         >= 0
dish.dish_type_id          REFERENCES dish_type(id)
dish_type.name             UNIQUE
dish_province              UNIQUE (dish_id, province_id)
user_preference.user_id    UNIQUE
```

Foreign-key indexes should also be considered for columns frequently used for joins/filtering, especially:

```text
local_area.province_id
dish.dish_type_id
dish_province.province_id
dish_province.dish_id
restaurant_dish.dish_id
restaurant_dish.province_id
restaurant_dish.local_area_id
user_preference.user_id
user_subscription.user_id
usage_event.user_id
food_history.user_id
food_history.dish_id
```

These become increasingly important as data volume grows.

---

# 11. Source of Truth

When this documentation and Supabase differ, the actual deployed Supabase schema is the immediate technical source of truth.

However, schema changes should be reflected back into this file so that:

```text
Supabase schema
Database.md
Pydantic schemas
repositories
service assumptions
frontend types
```

remain synchronized.
