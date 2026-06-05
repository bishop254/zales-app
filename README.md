# Zales Sales Agent App

This React Native app now starts from a simple, production-minded foundation:

- landing
- login
- register
- dashboard

The current implementation is intentionally small, but the structure is designed so we can add real authentication, API calls, and richer sales workflows without rewriting the app shell.

As of April 30, 2026, the login screen is wired to the Nest backend in `E:\ZALES\NESTS-BACKEND-BOILERPLATE`.

## Design direction

The UI direction follows the sample you shared:

- dark teal primary surfaces
- orange action color for strong calls to action
- bright neutral backgrounds
- compact enterprise cards instead of marketing-heavy layouts
- clear hierarchy for auth and dashboard workflows

The implementation also uses the logic-building guard rails from Tushar Kumar's Medium article on efficient React Native development:

- keep UI components focused on presentation
- centralize auth/session logic
- separate validation from screen rendering
- make navigation flow easy to reason about

Reference:
- https://medium.com/@tusharkumar27864/logic-building-tips-tricks-for-efficient-react-native-development-1af84e83c78b

## Current flow

1. `app/index.tsx` is the landing screen.
2. `app/login.tsx` handles sign-in validation and routes to the dashboard.
3. `app/register.tsx` handles simple account creation validation and routes to the dashboard.
4. `app/dashboard.tsx` shows a lightweight authenticated experience.

## Backend login integration

The mobile app now calls the backend login endpoint:

- `POST /auth/login`
- request body:
  - `email`
  - `password`
- success payload:
  - `data.access_token`
  - `data.isFirstLogin`

The backend wraps responses in a shared envelope, so the app reads both success and error messages from that shape.

### Base URL behavior

The app resolves the API base URL in this order:

1. `EXPO_PUBLIC_API_BASE_URL`
2. current Expo host machine on port `3000`
3. Android emulator fallback `http://10.0.2.2:3000`
4. default localhost fallback `http://localhost:3000`

The resolver lives in `constants/api.ts`.

## Architecture notes

This starter keeps a clean separation between screen UI and logic:

- `providers/auth-provider.tsx`
  - owns temporary session state and auth actions
- `features/auth/auth-api.ts`
  - owns backend auth requests and response parsing
- `features/auth/validation.ts`
  - owns form validation rules
- `features/dashboard/data.ts`
  - owns dashboard seed data
- `components/app/*`, `components/auth/*`, `components/dashboard/*`
  - shared presentational building blocks
- `constants/app-theme.ts`
  - design tokens for color, spacing, radius, and type sizing

## Security and maintainability

This version keeps access tokens in memory only.

- no credentials are persisted
- no tokens are stored on device yet
- route protection is handled at the dashboard entry point
- validation is explicit and separated from rendering
- backend errors are surfaced to the user from the API response envelope

Before production, the next sensible steps are:

1. Store tokens with secure device storage.
2. Add session refresh and sign-out invalidation.
3. Implement the backend `change-password` flow for first-login accounts.
4. Move dashboard data to typed API hooks.
5. Add tests for auth validation and route behavior.

## Running the app

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm run start
```

Useful scripts:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## What we can build next

Good next slices after this starter:

1. forgot password flow
2. persistent authenticated sessions
3. lead list and lead detail screens
4. activity timeline
5. KPI filters and territory switching


```eas build --platform android --profile preview```