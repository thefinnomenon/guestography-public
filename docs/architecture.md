# Architecture

This file captures the current architecture as inferred from the checked-in code. Some details may be incomplete because the project was dormant before this harness refresh.

## Application Shape

- Frontend: Next.js 13 application using the `pages/` router
- Backend in app: Next.js API routes under `pages/api/`
- Background and media processing: Firebase Functions in `functions/src/`
- Persistence and auth-adjacent plumbing: Firebase client and admin SDK usage in `lib/`
- Third-party integrations: Stripe, AWS S3 and MediaConvert, Google Cloud Tasks, Mixpanel, Sentry, Resend, Twilio

## Main Modules

### Web app

- `pages/index.tsx`: landing and primary entry
- `pages/event.tsx`: event creation and flow setup
- `pages/[eventId]/index.tsx`: event-specific management or viewing surface
- `pages/[eventId]/upload/media.tsx`: media upload flow
- `components/`: UI building blocks such as navigation and location search

### API routes

- `pages/api/event.ts`: event creation or lookup flow
- `pages/api/event-status*.ts`: event progress and status endpoints
- `pages/api/checkout/*`: Stripe checkout initiation and webhook handling
- `pages/api/multipart-upload/[endpoint].ts`: upload orchestration
- `pages/api/qr*`: QR generation and template preview endpoints
- `pages/api/preview*` and `pages/api/send-completion-email-test.ts`: email and QR preview utilities

### Shared libraries

- `lib/firebase.ts`: Firebase initialization
- `lib/email.ts` and `lib/send-completion-email.ts`: email sending and event completion notifications
- `lib/qr-templates.ts`: QR template definitions
- `lib/mixpanel.ts`: analytics

### Firebase Functions

- `functions/src/index.ts`: functions entrypoint
- Functions package uses its own TypeScript build and lint process
- Firebase emulators are configured in [`firebase.json`](../firebase.json)

## Cross-Cutting Concerns

- Observability: Sentry is configured for client, edge, and server usage
- Analytics: Mixpanel is proxied through Next.js rewrites
- Media handling: uploads rely on multipart and media tooling; image and video processing appear split across app and functions code
- Email: React Email templates live in `emails/`

## Known Constraints

- The app uses the legacy `pages/` router and older dependency versions
- The README had been left at the default Next.js template before this harness work
- There is no existing CI or GitHub automation in the repository history visible from this checkout

## Preferred Change Strategy

- Preserve the `pages/` router unless a task explicitly funds migration work
- Keep app and functions changes separable when possible
- Record rediscovered domain knowledge in docs instead of leaving it only in issue or PR text
