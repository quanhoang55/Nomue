# Nomue Authentication Architecture and Implementation Plan

**Prepared:** 2026-08-18  
**Updated:** 2026-08-19  
**Status:** Email and Google PKCE foundation implemented; onboarding, paywall,
Apple enablement, deletion, rate limiting, and production device validation remain.

## 1. Executive decision

Nomue should use **Supabase Auth as the only identity and session authority** for:

- email and password accounts;
- Google sign-in on iOS and Android;
- Sign in with Apple on iOS;
- identity linking when Supabase can safely match verified email addresses.

The Expo application should authenticate directly with Supabase using only the
project URL and publishable key. It must never contain the Supabase secret key,
Google client secret, Apple private key, or Apple client secret. FastAPI remains
the trusted application-data boundary and accepts Supabase access tokens through
`Authorization: Bearer <access-token>`.

Nomue should not build custom password storage, custom JWT issuance, or custom
Google/Apple token verification. Supabase should exchange provider credentials,
issue the Nomue session, refresh it, and maintain `auth.users` and
`auth.identities`.

### Product access policy

- Keep public catalog features available without an account: dish browsing,
  dish details, location resolution, and database-backed restaurant browsing.
- Require an authenticated, active application user for personal data:
  profile, preferences, history, saved dishes, subscriptions, and usage data.
- Require authentication for cost-bearing AI operations (`POST /chat` and
  `POST /chat/restaurants/discover`) before public launch. This provides a
  reliable per-user quota key and prevents anonymous abuse of Gemini/Maps.
- Do not enable Supabase anonymous users in the first release. They create
  extra account-conversion, cleanup, and abuse-control complexity.

## 2. Current-state audit

### Frontend (pre-implementation audit)

- `AuthProvider` is only an in-memory boolean. It does not represent a real
  user, session, token, refresh state, or initialization state.
- Development mode bypasses protected navigation entirely.
- Sign-in and sign-up pages navigate to tabs without authenticating.
- `frontend/services/auth.ts` is empty.
- `apiFetch()` does not attach an access token and currently logs every URL and
  status unconditionally.
- Supabase JS, SecureStore, Apple Authentication, and a native Google sign-in
  package are not installed.
- The iOS bundle ID is `com.quanhoang55.frontend`, the URL scheme is
  `frontend`, and no Android package identifier is configured. These must be
  finalized before provider credentials are created.

### Backend (pre-implementation audit)

- `core/security.py` already contains useful bearer-token shape checks and
  Supabase claim validation for issuer, audience, role, timestamps, and
  algorithm.
- The token verifier is not exposed as a FastAPI `get_current_user` dependency.
- Auth, user, preference, subscription, and usage endpoints/services are empty
  or not connected to the API router.
- The backend uses a privileged Supabase secret key. Therefore every
  user-owned query must derive its user ID from the verified JWT; service-role
  access bypasses RLS.
- The rate-limit middleware is empty, so expensive public endpoints currently
  lack production-grade abuse controls.

### Database compatibility probe

A read-only PostgREST probe was run without returning any rows or values.

| Check | Result |
| --- | --- |
| `user` table | Exists |
| `user.id`, `username`, `display_name`, `country_code`, `preferred_language`, `status` | Exist |
| `user.email` | Does not exist |
| `user_preference.id`, `user_id` | Exist |
| `user_subscription.id`, `user_id` | Exist |
| `usage_event.id`, `user_id` | Exist |
| `food_history.id`, `user_id`, `dish_id` | Exist |

This probe cannot prove foreign keys, unique constraints, defaults, triggers,
grants, or RLS policies. The repository also has no Supabase migration folder
or SQL schema dump, so the deployed database is not reproducible from source.

### Database verdict

The database is **structurally close but not yet proven safe for production
authentication**.

The missing public `email` column is not a defect. Email should remain an auth
identity attribute in `auth.users` and verified JWT claims, not a duplicated
authorization source in `public.user`. The current Pydantic `UserCreate` and
`UserResponse` models must be corrected because they require a database column
that does not exist and because Apple users may use a private relay address or
provide incomplete profile metadata.

The database fits the design only after confirming or adding all of these:

1. `public.user.id` is both its primary key and a foreign key to
   `auth.users.id ON DELETE CASCADE`.
2. Every child `user_id` references `public.user.id` with the intended delete
   policy and has an index.
3. `user_preference.user_id` is unique.
4. RLS is enabled on every user-owned table and client grants are restricted.
5. Safe defaults allow profile bootstrap when Apple does not return a name.
6. Database changes are captured in reviewed, repeatable migrations.

## 3. Target database model

Keep the existing singular `public.user` table to avoid an unnecessary rename,
but always qualify or quote it in SQL because `user` is a PostgreSQL keyword.

Recommended profile shape:

```text
public.user
  id uuid primary key references auth.users(id) on delete cascade
  username text null
  display_name text not null default 'Traveler'
  country_code text null
  preferred_language text not null default 'en'
  status text not null default 'active'
  onboarding_completed boolean not null default false
  avatar_url text null
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

Required constraints and indexes:

- case-insensitive unique username when non-null;
- `status IN ('active', 'suspended', 'deletion_pending')`;
- ISO-style validation for `country_code` and supported-language validation;
- unique `user_preference(user_id)`;
- indexes on all `user_id` foreign keys;
- no password, provider access token, provider refresh token, or Apple private
  key in any public profile table.

`auth.users` owns the login identity and email. `auth.identities` owns Google,
Apple, and email provider associations. Do not add boolean columns such as
`is_google_user` or `is_apple_user` to `public.user`.

### Profile creation policy

Use an authenticated, idempotent backend bootstrap operation instead of a
complex database trigger:

```text
valid Supabase session
  -> POST /api/v1/auth/bootstrap
  -> verify JWT
  -> insert public.user with id = JWT sub if absent
  -> apply server defaults
  -> return profile
```

This follows the existing service/repository architecture and avoids a broken
profile trigger blocking all Supabase sign-ups. Concurrent calls must use an
upsert or conflict-safe insert on the profile primary key.

### RLS and grants

The Expo client will use Supabase only for Auth, not direct application-table
queries. Therefore the safest initial policy is:

- enable RLS on `user`, `user_preference`, `user_subscription`, `usage_event`,
  and `food_history`;
- revoke direct `anon` access to all user-owned tables;
- do not add authenticated-client policies until a direct Supabase data use
  case exists;
- let FastAPI use its server-only secret key, while enforcing ownership in
  services with `current_user.id`.

If direct client access is introduced later, add narrow policies based on
`auth.uid() = id` or `auth.uid() = user_id`; do not grant blanket authenticated
access.

## 4. Provider and session flows

### Email account

1. Sign up with normalized email and password through Supabase Auth.
2. Require email confirmation in staging and production.
3. Deep-link the confirmation back to a dedicated callback screen.
4. Establish the Supabase session, then call `/auth/bootstrap`.
5. Route incomplete profiles to onboarding and completed profiles to tabs.
6. Support sign-in, resend confirmation, forgot password, recovery callback,
   and password update.

User-facing responses for sign-up and recovery must be generic so the UI does
not reveal whether an email already exists. Supabase should hash passwords;
FastAPI and the application database must never receive or log them.

### Google sign-in

Use Supabase browser OAuth with PKCE on iOS and Android. Start the flow with
`signInWithOAuth({ provider: 'google', skipBrowserRedirect: true })`, open the
authorization URL with `expo-web-browser`, and exchange the returned one-time
code with `exchangeCodeForSession`. Request only `openid`, `email`, and
`profile` through the Supabase Google provider configuration.

Configure the Web OAuth client ID and secret in Supabase. The native Google
SDK, native Google Expo config plugin, and platform ID-token exchange are not
part of this PKCE implementation. The stable bundle/package identifiers still
matter for app links, store delivery, and any future native-provider migration.

Do not store Google provider tokens because Nomue does not need to call Google
APIs on behalf of the user.

### Sign in with Apple

Use Expo Apple Authentication on iOS and the official native Apple button.
Generate a random raw nonce, send its SHA-256 hash to Apple, and send the raw
nonce with the Apple identity token to Supabase
`signInWithIdToken({ provider: 'apple' })`.

Request name and email, but treat both as optional. Apple supplies the full
name only on the first authorization, so capture it immediately and use it as
an onboarding suggestion. Never overwrite a user-edited display name during a
later login.

The first mobile release will show Apple sign-in on iOS only. Android keeps
Google and email. Apple-on-Android/web requires the browser OAuth flow,
Services ID, redirect handling, and six-month client-secret rotation; add that
only as a separately tested follow-up if product requirements demand it.

### Identity linking

Allow Supabase's verified-email automatic linking. Do not build custom
"same email means same account" logic. Apple private-relay addresses may create
a separate identity because they are intentionally different.

Manual identity linking should be deferred until an account-settings screen
can require a fresh session and clearly show the identities being linked.
Never link an unverified email identity.

### Session storage and refresh

- Store Supabase session material in `expo-secure-store` on native platforms
  through a dedicated storage adapter.
- Use `SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY` unless background refresh
  proves it needs `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`.
- Let Supabase serialize refresh-token rotation; do not implement a second
  custom refresh loop.
- Start/stop auto-refresh with React Native `AppState`.
- Keep access tokens only as part of the Supabase session and never log them.
- Use a one-hour access-token lifetime unless a measured requirement justifies
  another value.
- On sign-out, revoke the current or all sessions according to the user's
  choice, clear SecureStore state, clear user-scoped caches, and return to the
  auth stack.

## 5. Frontend implementation plan

### Dependencies and configuration

Install Expo 56-compatible versions of:

- `@supabase/supabase-js`;
- `react-native-url-polyfill`;
- `expo-secure-store`;
- `expo-crypto`;
- `expo-web-browser`.

`expo-apple-authentication` is intentionally not installed until Apple is
enabled. Its implementation scaffold remains commented so current builds do
not require Apple credentials or capabilities.

Add only public client configuration:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
```

The current PKCE client does not read Google client IDs directly; Google
credentials are configured in Supabase. Keep the existing values only if they
are useful for provider administration or a future native flow.

The active mobile redirect URLs are:

```text
nomue://callback
nomue://reset-password
```

Add both exact URLs to the Supabase Auth redirect allow list. App configuration
uses the stable `nomue` scheme and `com.foun.nomue` bundle/package identifiers.
Development-build and physical-device testing is still required; Expo Go is
not the release-validation environment.

### Auth client and provider

Replace the boolean provider with these explicit states:

```text
status: initializing | anonymous | authenticated
session: Supabase Session | null
authUser: Supabase User | null
profile: Nomue profile | null
isOnboardingComplete: boolean
```

The provider must:

- restore the session before rendering protected routes;
- subscribe to `onAuthStateChange` and unsubscribe on unmount;
- bootstrap/fetch the profile after authentication;
- expose email sign-up/sign-in, Google, Apple, recovery, sign-out, refresh, and
  delete-account actions;
- distinguish user cancellation from provider/network errors;
- prevent duplicate login requests;
- never print session objects, tokens, passwords, or provider credentials.

Remove the development authentication bypass. Development may use dedicated
test accounts, but navigation protection must behave the same as production.

### Navigation and screens

- Consolidate login methods on one accessible sign-in screen.
- Keep a separate email registration screen.
- Add `verify-email`, `forgot-password`, `reset-password`, and auth callback
  routes.
- Use the existing question screen as authenticated first-run onboarding.
- Use `Stack.Protected` only after auth initialization finishes, preventing a
  flash of the wrong route.
- After login: bootstrap profile -> onboarding if incomplete -> tabs.
- After logout/deletion: clear user state -> replace navigation with sign-in.

### Authenticated API client

Extend `apiFetch()` to obtain the current Supabase access token immediately
before each protected request and attach it as a bearer token. Public requests
remain tokenless unless optional authentication is explicitly useful.

On `401`, attempt at most one Supabase session refresh and retry once. If that
fails, clear the invalid session and route to sign-in. Never retry `403`, and
never use an unbounded retry loop.

Remove unconditional production request logging. Development logs may include
route, status, and request ID, but never authorization headers, auth callback
URLs containing credentials, request passwords, or session payloads.

## 6. Backend implementation plan

### Dependencies and authorization

Add:

```text
get_current_user
  -> extract Authorization header
  -> verify Supabase token
  -> return AuthenticatedUser

get_optional_current_user
  -> no header means None
  -> an invalid supplied credential still returns 401
```

Continue using Supabase `get_claims()` initially. Migrate the Supabase project
to an asymmetric ES256 or RS256 signing key, verify rotation behavior, then
remove HS256 from the backend allowed algorithms after all legacy tokens have
expired.

Every protected service must receive `AuthenticatedUser` or its UUID from the
dependency. Never accept `user_id`, email, status, role, quota, or subscription
state from a normal frontend body.

### Endpoints

Supabase owns credential endpoints. FastAPI should add only application-level
operations:

```http
POST   /api/v1/auth/bootstrap
GET    /api/v1/users/me
PATCH  /api/v1/users/me
POST   /api/v1/users/me/delete
```

- `bootstrap` idempotently creates/returns the application profile from the
  verified `sub` and server-controlled defaults.
- `GET /users/me` combines profile data with safe verified identity fields;
  email is nullable and comes from the verified auth identity, not the public
  table.
- `PATCH /users/me` permits only profile fields such as display name, username,
  language, country, avatar, and onboarding status.
- account deletion requires recent reauthentication and returns a generic
  success response after deleting the Supabase Auth identity and cascading or
  anonymizing application data according to retention policy.

Correct the user schemas so there is no public `UserCreate.email`. Constrain
all profile strings, normalize usernames, and make identity email nullable in
responses.

### Account deletion and Apple revocation

Apple requires in-app account deletion when the app supports account creation.
For an account with an Apple identity:

1. Require the user to reauthenticate with Apple during deletion.
2. Send the short-lived Apple authorization code to FastAPI over TLS.
3. Exchange/revoke it server-side using the Apple App ID, Team ID, Key ID, and
   private signing key; never persist the `.p8` key in the repository.
4. Mark the application profile `deletion_pending` to stop further protected
   use.
5. Remove/anonymize retained application records according to policy.
6. Delete the Supabase Auth user using the server admin client.
7. Clear the local session and user-scoped cache.

If revocation is temporarily unavailable, keep the account disabled and retry
the revocation job; do not silently claim complete deletion while leaving an
active Apple authorization.

For all deleted users, checking that an active `public.user` row exists on
protected operations prevents an already-issued access token from continuing
to use the application until its JWT naturally expires.

### Abuse protection

- Implement rate limiting before exposing email and AI flows publicly.
- Use verified user ID as the primary key for authenticated AI quotas and IP as
  a secondary abuse signal.
- Configure Supabase Auth rate limits and CAPTCHA/Turnstile for email sign-up,
  sign-in, and recovery where supported by the mobile flow.
- Apply tighter limits to failed authentication/bootstrap requests.
- Return generic auth errors; keep detailed provider errors only in redacted
  server logs.
- Add request IDs and security event logging without PII or tokens.

## 7. Security requirements

- Production traffic must use HTTPS only.
- Use separate Supabase and provider projects for local/staging and production.
- Store backend secrets in the deployment secret manager, not `.env` in a
  release image and never `EXPO_PUBLIC_*`.
- Use a Supabase publishable key in Expo, never a secret/service-role key.
- Enable email confirmation; do not disable it to solve delivery problems.
- Set a user-friendly strong password policy: at least 10-12 characters,
  permit long passphrases, and enable leaked-password blocking when the
  Supabase plan supports it.
- Configure custom SMTP with a dedicated auth subdomain plus SPF, DKIM, and
  DMARC before production; the built-in sender has low limits.
- Use exact production redirect allow-list entries. Wildcards are acceptable
  only for controlled local/development URLs.
- Do not place access/refresh tokens in analytics, crash reports, URL query
  logs, or application logs.
- Do not authorize using mutable email or provider metadata; authorize using
  the verified immutable Supabase `sub` UUID.
- Require recent authentication for password changes, email changes, identity
  linking/unlinking, and account deletion.
- Add MFA as a later account-security option; it is not required for the first
  public consumer release.

## 8. Remaining preparation and launch work

### Product and legal

- Final production app name, domain, support email, privacy-policy URL, and
  terms URL.
- Written retention/deletion policy for profile, history, subscription, usage,
  logs, and backups.
- In-app account deletion UX and App Store privacy disclosures.
- Decision on whether one account may link multiple providers; default for v1
  is safe Supabase automatic linking only.

### Stable application identifiers (completed)

- Keep `com.foun.nomue` stable for iOS and Android.
- Keep the `nomue` URL scheme stable.
- Add and verify `nomue://callback` and `nomue://reset-password` in Supabase.
- Record separate staging and production web redirect URLs when web ships.
- Obtain EAS iOS and Android signing credentials and their Android SHA-1 and
  SHA-256 fingerprints.

Do this before creating OAuth credentials; changing identifiers later requires
new provider configuration and can break existing logins.

### Supabase

- A separate staging Supabase project.
- Project URL and publishable key for Expo; secret key only for FastAPI.
- Email/password and Google providers enabled in staging; Apple stays disabled.
- Exact Site URL and mobile redirect allow list.
- Email confirmation, secure templates, custom SMTP, rate limits, CAPTCHA,
  and session settings configured.
- Asymmetric JWT signing key migration planned and tested.
- A database backup plus a checked-in migration baseline.
- SQL audit results for PK/FK/delete rules, indexes, grants, RLS, defaults, and
  constraints on every user table.

### Google

- Google Cloud project and configured OAuth consent screen.
- Verified application domain, branding, support contact, privacy policy, and
  only the `openid`, `email`, and `profile` scopes.
- Web OAuth client ID/secret for Supabase.
- Exact `nomue://callback` redirect allowed by Supabase Auth.
- Test users while the Google consent screen remains in testing mode.

### Apple

- Paid Apple Developer Program membership.
- Final App ID/bundle ID with Sign in with Apple capability.
- Team ID, Key ID, and Sign in with Apple `.p8` private key stored in a secret
  manager with restricted access and backup.
- Services ID and Supabase callback configuration if web/Android Apple OAuth
  will ever be supported.
- Private email relay domain registration if Nomue sends mail to Apple relay
  addresses.
- A rotation reminder/automation for Apple OAuth client secrets when the
  browser OAuth flow is enabled.
- Physical iOS devices and Apple sandbox/test accounts.

### Delivery and operations

- Ability to create Expo development builds; native auth cannot be validated
  solely in Expo Go.
- Staging API HTTPS hostname, trusted-host configuration, and exact web CORS
  origins if the web build is supported.
- Monitoring for login success/failure rate, provider errors, token validation
  failures, profile bootstrap failures, email delivery, rate limiting, and
  account deletion jobs.
- A provider outage/support playbook and secret/key rotation owner.

## 9. Implementation phases and gates

### Phase A — Database and configuration foundation

1. Export the live schema and commit an initial migration baseline.
2. Back up staging/production before changing constraints.
3. Add/verify the `auth.users` profile FK, child FKs, indexes, defaults, RLS,
   grants, timestamps, status check, and onboarding flag.
4. Configure staging providers, SMTP, redirects, and asymmetric signing keys.

**Gate:** SQL tests prove ownership isolation and deleting a test auth user has
the intended cascade/anonymization behavior.

### Phase B — Backend authentication boundary

1. Add current-user dependencies and tests for every rejected-token case.
2. Implement profile repository/service, bootstrap, `/users/me`, and safe
   update endpoints.
3. Protect all user-owned and cost-bearing routes.
4. Implement user/IP rate limiting and redacted auth observability.

**Gate:** no protected endpoint accepts a client-provided owner ID; public
endpoints remain accessible as defined in the endpoint matrix.

### Phase C — Expo session and email flow

1. Add Supabase/SecureStore client and session-aware `AuthProvider`.
2. Add bearer-token API integration and remove the development bypass.
3. Implement email registration, confirmation, login, logout, recovery, and
   onboarding.

**Gate:** cold start, background/foreground refresh, expired token, offline
start, confirmation deep link, recovery deep link, and logout work on iOS and
Android development builds.

### Phase D — Google and Apple

1. Validate Google browser OAuth PKCE on iOS and Android development builds.
2. After Apple Developer enrollment, uncomment and enable native Apple sign-in
   with nonce and first-login name capture on iOS.
3. Verify safe identity linking and cancellation/error handling.

**Gate:** new account, returning account, same verified email, Apple private
relay, cancelled consent, revoked provider access, and provider outage cases
all produce correct sessions and profiles.

### Phase E — Deletion, hardening, and launch

1. Implement recent-auth account deletion and Apple token revocation.
2. Add deletion retry/monitoring and verify data-retention behavior.
3. Run security, abuse, accessibility, device, and App Store checks.
4. Rotate any development credentials accidentally used during setup.

**Gate:** an in-app deletion test removes access immediately, revokes Apple
authorization when applicable, and produces no sensitive log output.

## 10. Required test matrix

### Authentication lifecycle

- Email registration with valid, weak, duplicate, malformed, and unconfirmed
  addresses.
- Confirmation and recovery deep links from cold, background, and running app
  states.
- Correct and incorrect password without user enumeration.
- Google/Apple new user, returning user, cancellation, missing token, invalid
  nonce, revoked consent, and provider outage.
- Apple first login returns a name; subsequent login does not.
- Identity collision with verified email and Apple private-relay email.
- Cold-start session restore, refresh rotation, expired/revoked token, logout,
  and multiple devices.

### Backend authorization

- Missing, malformed, oversized, wrong-issuer, wrong-audience, wrong-role,
  expired, not-yet-valid, and unsupported-algorithm JWTs.
- A user cannot read or mutate another user's profile, preferences, history,
  usage, or subscription.
- A suspended/deletion-pending/missing application profile cannot call
  protected or costly endpoints even with an unexpired JWT.
- System endpoints remain protected only by the system credential and are not
  exposed by normal user sessions.

### Database

- Profile bootstrap is idempotent under concurrency.
- All user-owned FKs reject invalid owners.
- RLS/grants prevent `anon` and direct authenticated client access as designed.
- Auth-user deletion cascades or anonymizes every dependent table according to
  policy.
- Username uniqueness is case-insensitive and preference ownership is unique.

### Security and operations

- No token, password, authorization code, private key, or full auth callback
  URL appears in frontend logs, backend logs, analytics, or crash reports.
- Auth and AI rate limits return stable `429` responses and recover correctly.
- Provider keys can be rotated without shipping a new client when only
  server-side secrets change.
- Account deletion is recoverable while pending, observable on failure, and
  final only after required provider revocation and data cleanup succeed.

## 11. Official references

- [Supabase Expo React Native social-auth guide](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth)
- [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Apple login](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase user/profile management](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)
- [Supabase auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase CAPTCHA protection](https://supabase.com/docs/guides/auth/auth-captcha)
- [Supabase JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Expo SDK 56 Apple Authentication](https://docs.expo.dev/versions/v56.0.0/sdk/apple-authentication/)
- [Expo SDK 56 SecureStore](https://docs.expo.dev/versions/v56.0.0/sdk/securestore/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion and token revocation](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple)
