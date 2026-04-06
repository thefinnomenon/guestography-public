# Product Notes

This document records the product intent that can be inferred from the current codebase.

## Current Product Model

Guestography appears to be an event-focused media collection product where hosts create an event, distribute a QR code or upload link, and gather guest photos or videos. The codebase suggests supporting flows for:

- event creation and configuration
- guest upload journeys
- upload status tracking
- QR code generation and templating
- checkout and payment-related flows
- completion notifications by email

## Operational Assumptions

- Reliability of media upload and processing matters more than rapid UI churn
- Event-specific routes are central to the product
- Notifications and analytics are already part of the operating model

## Open Questions

- Which event-management flows are still actively used
- Whether Stripe checkout is still the live monetization path
- Whether AWS media infrastructure and Firebase Functions are both still required

When future work resolves one of these unknowns, update this file instead of leaving the answer only in a closed issue.
