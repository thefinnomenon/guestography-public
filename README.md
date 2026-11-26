# Guestography

Guestography is a Next.js and Firebase event-media application for creating event galleries, collecting guest uploads, and sharing QR-code upload links.

Built by [Chris Finn](https://finnternet.com). The original service is inactive. This repository preserves its application source for reference and portfolio review; running it requires your own service accounts and configuration.

[Try the interactive portfolio demo](https://finnternet.com/projects/guestography/).

## Features

- Shared photo and video galleries with guest uploads through a QR code
- Responsive media grids with placeholders and lazy loading
- Background media processing, gallery downloads, and organizer emails
- Stripe payments and printable QR-code cards
- An earlier version collected video responses by text message to create interview videos

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

## License

Application source and documentation are available under the [MIT License](./LICENSE). Bundled photographs and product imagery are excluded from the MIT license grant. Roboto fonts and MediaInfo binaries retain their upstream licenses; see [third-party notices](./THIRD_PARTY_NOTICES.md).
