# Development

## Local Commands

Root app:

```bash
yarn dev
yarn lint
yarn build
```

Firebase Functions:

```bash
npm --prefix functions run lint
npm --prefix functions run build
npm --prefix functions run serve
```

## Environment Notes

- Root `.env` exists locally but is ignored by git
- `functions/.env` exists for the Firebase Functions package
- Several integrations likely require credentials that are not suitable for CI unless explicitly added as secrets

## Validation Expectations

- Docs-only changes should be reviewed for broken local links and stale setup instructions
- App changes should run at least `yarn lint`
- Functions changes should run at least `npm --prefix functions run lint` and `npm --prefix functions run build`
- If a change touches both surfaces, validate both

## Recovery Bias

Because the repository has been idle, default to changes that improve:

- bootability
- clarity of ownership
- small-step refactoring

Avoid bundling major framework migrations into unrelated issue work.
