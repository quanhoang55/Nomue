# API Endpoints

Base path: `${EXPO_PUBLIC_API_BASE_URL}` (normally ending in `/api/v1`). The
currently implemented Stage 1, 2, 3, and 5 endpoints are public and require no
authorization header.

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

### `POST /locations/resolve`

Resolves exactly one input mode: location text or GPS coordinates.

```json
{ "text": "Vinh, Nghệ An" }
```

```json
{ "latitude": 18.6796, "longitude": 105.6813 }
```

Response:

```json
{
  "province": { "id": "uuid", "name": "Nghệ An" },
  "local_area": {
    "id": "uuid",
    "province_id": "uuid",
    "name": "Vinh",
    "area_type": "Thành phố",
    "latitude": 18.6796,
    "longitude": 105.6813
  }
}
```

When text identifies only a province, `local_area` contains the first area for
that province, ordered by name and then UUID, so the response still provides
map coordinates. It remains nullable only when the province has no local-area
records. Data comes from Supabase `province` and `local_area`; matching and
distance calculations run locally in the backend. GPS matches beyond
`LOCATION_MAX_MATCH_DISTANCE_KM` (default `75`) are rejected. No Google,
Gemini, or geocoding client is used. Unknown locations return `404`, while
mixed or incomplete input returns `422`.

### `GET /locations/{province_id}/dish-ids`

Returns the deterministically ordered dish UUIDs related to a province.

```json
[
  "10e018ac-9bec-4118-ac86-f9564de16fc4",
  "d1c7ceab-89d8-4812-a724-783e2cf08793"
]
```

Data comes from the Supabase `province` and `dish_province` tables through the async Supabase client. A valid province without dishes returns `[]`; an unknown province returns `404`.

## Restaurants

### `GET /restaurants?dish_id=<uuid>&province_id=<uuid>`

Returns the stored restaurant references associated with both a dish and a
province. Both query parameters are required.

```json
[
  {
    "id": "66666666-6666-4666-8666-666666666666",
    "google_place_id": "ChIJ-example-place-id",
    "dish_id": "11111111-1111-4111-8111-111111111111",
    "province_id": "33333333-3333-4333-8333-333333333333",
    "local_area_id": null,
    "last_verified_at": "2026-08-17T00:00:00Z"
  }
]
```

Data comes only from the Supabase `dish`, `province`, and `restaurant_dish`
tables. The restaurant relationship query is limited to 100 rows, ordered by
Google place ID and relationship UUID, and deduplicated by Google place ID. A
valid dish and province without stored restaurant relationships returns `[]`.

At Stage 3, the response intentionally contains only data stored in
`restaurant_dish`. It does not contain a restaurant name, address, rating,
opening status, or coordinates because those fields are not stored in the
current table. No Gemini, Google Places, Google Maps, or OSM API is called.
Restaurant detail enrichment and fallback lookup belong to a later stage.

An unknown dish or province returns `404`. Missing or invalid UUID query
parameters return FastAPI's standard `422` validation response. A Supabase
failure returns the application's safe `503` database error response.

## Chat

### `POST /chat`

Builds a concise Vietnamese food recommendation from location-relevant backend
data and Gemini structured output. The model is configurable through
`GEMINI_MODEL` and currently defaults to `gemini-3.6-flash`. Location is
optional and accepts exactly one of text or GPS coordinates. Gemini calls use
the separately configurable `GEMINI_TIMEOUT_SECONDS` setting (default `60`).
The optional `location_source` identifies whether this is an explicit app
selection or automatic device context. Existing clients may omit it.

Text-location request:

```json
{
  "message": "What local food should I try, and where can I eat it?",
  "location": { "text": "Vinh, Nghệ An" },
  "location_source": "user_selected"
}
```

GPS request:

```json
{
  "message": "Recommend a nearby restaurant for a local dish",
  "location": { "latitude": 18.6796, "longitude": 105.6813 },
  "location_source": "device_gps"
}
```

Location may be omitted:

```json
{ "message": "Explain what phở is" }
```

Response shape:

```json
{
  "summary": "Try a comforting bowl of phở",
  "paragraph": "Phở is an approachable local classic with aromatic broth.",
  "recommended_dishes": [
    {
      "dish": {
        "id": "11111111-1111-4111-8111-111111111111",
        "name": "Phở",
        "description": "Vietnamese noodle soup",
        "spice_level": 1,
        "sweetness_level": 2,
        "sourness_level": 1,
        "bitterness_level": 0,
        "adventurous_level": 1,
        "typical_price": 50000
      },
      "reason": "A traveler-friendly regional classic"
    }
  ],
  "recommended_restaurants": [
    {
      "google_place_id": "ChIJ-example-place-id",
      "name": "Example Phở Restaurant",
      "address": "Vinh, Nghệ An",
      "latitude": 18.68,
      "longitude": 105.68,
      "rating": 4.5,
      "google_maps_uri": "https://maps.google.com/?cid=example",
      "related_dish_ids": ["11111111-1111-4111-8111-111111111111"],
      "reason": "A nearby grounded result"
    }
  ],
  "location": {
    "province": {
      "id": "33333333-3333-4333-8333-333333333333",
      "name": "Nghệ An"
    },
    "local_area": {
      "id": "44444444-4444-4444-8444-444444444444",
      "province_id": "33333333-3333-4333-8333-333333333333",
      "name": "Vinh",
      "area_type": "Thành phố",
      "latitude": 18.6796,
      "longitude": 105.6813
    },
    "latitude": 18.6796,
    "longitude": 105.6813,
    "coordinate_source": "resolved_local_area",
    "selection_source": "message"
  },
  "maps_grounding": {
    "sources": [
      {
        "title": "Example Phở Restaurant",
        "uri": "https://maps.google.com/?cid=example",
        "google_place_id": "ChIJ-example-place-id",
        "review_id": null
      }
    ],
    "widget_context_tokens": ["maps-widget-context-token"],
    "grounding_signatures": ["maps-grounding-signature"]
  }
}
```

Before resolving the supplied app context, the backend runs a structured
semantic interpretation of the user message. An explicit location in the
message overrides app context without requiring frontend phrase matching. If
the message has no location, selection priority is explicit app location,
automatic device GPS, then no location. The response `selection_source` is one
of `message`, `user_selected`, `device_gps`, or `legacy_request`.

The backend then resolves the selected location with the existing location
service, retrieves at most 20 province-ranked candidate dishes, and sends only
that compact context to Gemini. When usable coordinates exist and current
place information is needed, the backend first makes a Maps-only grounding
call without a structured response schema. It extracts grounded places and
attribution metadata, adds them to `BACKEND_CONTEXT.maps_context`, and then
makes the final call using the structured `ChatGeminiResponse` schema without
Maps tools.

If Maps grounding fails or is not applicable, the structured food response
still runs and `recommended_restaurants` is `[]`. Successful Maps responses
include source URLs, place IDs, widget context tokens, and grounding signatures
under `maps_grounding` for attribution.

Unknown optional location text does not block general food chat. Invalid or
mixed location input returns `422`. Missing Gemini configuration returns the
safe configuration error response, while Gemini API or structured-output
failures return the safe `502` Gemini error response.
