# Guestography

Guestography is a Next.js and Firebase event-media application for creating event galleries, collecting guest uploads, and sharing QR-code upload links.

## Stack

- Next.js 13 with the `pages/` router
- Firebase Functions for backend and scheduled or background logic
- Firebase, Stripe, AWS media services, Mixpanel, Sentry, Resend, and Twilio integrations

## Local Development

Install dependencies:

```bash
yarn install --frozen-lockfile
npm install --prefix functions
```

Run the app:

```bash
yarn dev
```

Run validations:

```bash
yarn lint
npm --prefix functions run lint
npm --prefix functions run build
```

## Repository Docs

- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/development.md`](./docs/development.md)
- [`docs/product.md`](./docs/product.md)
