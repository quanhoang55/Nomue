# API Endpoints

Base path: `${EXPO_PUBLIC_API_BASE_URL}` (normally ending in `/api/v1`). Stage 1 is public and requires no authorization header.

## Dishes

### `GET /dishes/{dish_id}`

Returns one dish by UUID.

```json
{
  "id": "uuid",
  "name": "Phở",
  "description": "Noodle soup",
  "spice_level": 1,
  "sweetness_level": 2,
  "sourness_level": 1,
  "bitterness_level": 0,
  "adventurous_level": 1,
  "typical_price": 50000
}
```

Data comes from the Supabase `dish` table through the async Supabase client. An unknown dish returns `404`.

### `GET /dishes?province_id=<uuid>`

Returns up to 100 dishes for a valid province. Results are ordered by the `dish_province` importance score descending, then dish UUID ascending. A valid province without dishes returns `[]`; an unknown province returns `404`.

```json
[
  {
    "id": "uuid",
    "name": "Bánh chưng",
    "description": "Square sticky-rice cake",
    "spice_level": 0,
    "sweetness_level": 1,
    "sourness_level": 0,
    "bitterness_level": 0,
    "adventurous_level": 2,
    "typical_price": 60000
  }
]
```

Data comes from Supabase tables `province`, `dish_province`, and `dish` through the async Supabase client. No Google Places, Gemini, or RevenueCat client is used.

Application errors use:

```json
{ "detail": "Province not found", "error_code": "not_found" }
```

Invalid UUID parameters return FastAPI's standard `422` validation response.

## Locations

### `GET /locations/{province_id}/dish-ids`

Returns the deterministically ordered dish UUIDs related to a province.

```json
[
  "10e018ac-9bec-4118-ac86-f9564de16fc4",
  "d1c7ceab-89d8-4812-a724-783e2cf08793"
]
```

Data comes from the Supabase `province` and `dish_province` tables through the async Supabase client. A valid province without dishes returns `[]`; an unknown province returns `404`.
