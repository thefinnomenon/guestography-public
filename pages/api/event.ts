import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { slugify } from "../../utils/format";
import ShortUniqueId from "short-unique-id";
import { Event } from "../../types";
import { track } from "../../lib/mixpanel";

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

if (!admin.apps.length)
  admin.initializeApp({
    /* @ts-ignore */
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const GALLERY_PRICE_CENTS = 4900;
const DISCOUNT_AMOUNT_CENTS = 1000;
const BLOG_DISCOUNT_CODE = "BLOG10";

async function getActivePromotionCode(code: string) {
  const promotionCodes = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
  });

  return promotionCodes.data[0];
}

async function createFixedDiscountPromotionCode(code: string, name: string) {
  const coupon = await stripe.coupons.create({
    amount_off: DISCOUNT_AMOUNT_CENTS,
    currency: "usd",
    duration: "once",
    name,
    metadata: {
      app: "guestography",
      code,
    },
  });

  return stripe.promotionCodes.create({
    coupon: coupon.id,
    code,
    active: true,
    metadata: {
      app: "guestography",
      code,
    },
  });
}

async function ensureBlogPromotionCode() {
  const existingPromotionCode = await getActivePromotionCode(BLOG_DISCOUNT_CODE);

  if (existingPromotionCode) {
    return existingPromotionCode;
  }

  try {
    return await createFixedDiscountPromotionCode(
      BLOG_DISCOUNT_CODE,
      "$10 off Guestography"
    );
  } catch (error) {
    const promotionCode = await getActivePromotionCode(BLOG_DISCOUNT_CODE);

    if (promotionCode) {
      return promotionCode;
    }

    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const db = admin.firestore();
    const event: Event = req.body;
    const { discountCode: providedDiscountCode } = req.body;

  // Validate event info
  if (
    !event ||
    !event.title ||
    !event.plan
  ) {
    console.error("Invalid event: ", event);
    res.status(400).send(event);
    return;
  }

  // Set initial event status
  event.status = "PENDING";

  // Generate and add event management key
  event.managementKey = new ShortUniqueId({
    length: 16,
  })();

  // Generate URL safe event ids
  const eventId = `${slugify(event.title)}-${new ShortUniqueId({
    length: 4,
  })()}`;

  // Generate a fixed discount code for this event's guests.
  const discountCode = `${eventId.toUpperCase()}-10OFF`;
  
  console.log("Generating Stripe Checkout Session for event ", eventId);
  console.log("Creating discount code:", discountCode);

  // Generate Stripe Checkout Session
  let checkoutSession: Stripe.Checkout.Session;
  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: event.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Guestography Gallery",
              description: "QR code event gallery with 100GB storage for 12 months",
            },
            unit_amount: GALLERY_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      metadata: { eventId },
      success_url: `${req.headers.origin}/success?type=event_created&eventId=${eventId}`,
      cancel_url: `${req.headers.origin}/event?eventId=${eventId}`,
    };

    // If a discount code is provided, try to apply it automatically
    let discountApplied = false;
    if (providedDiscountCode) {
      try {
        const promotionCode = providedDiscountCode === BLOG_DISCOUNT_CODE
          ? await ensureBlogPromotionCode()
          : await getActivePromotionCode(providedDiscountCode);

        if (promotionCode) {
          params.discounts = [{
            promotion_code: promotionCode.id,
          }];
          discountApplied = true;
          console.log("Applied discount code:", providedDiscountCode);
        } else {
          console.log("Discount code not found or inactive:", providedDiscountCode);
        }
      } catch (discountError) {
        console.error("Error applying discount code:", discountError);
        // Continue without discount if there's an error
      }
    }
    
    // Only allow promotion codes if no discount was automatically applied
    if (!discountApplied) {
      params.allow_promotion_codes = true;
    }

    console.log("Creating Stripe checkout session with params", params);

    checkoutSession = await stripe.checkout.sessions.create(params);
  } catch (e) {
    console.error("Failed to create Stripe checkout session", e);
    res.status(400).send("Failed to create Stripe checkout session");
    return;
  }

  // Create Stripe promotional code for $10 off
  let promoCodeId: string | undefined;
  try {
    // First create a coupon for $10 off
    const coupon = await stripe.coupons.create({
      amount_off: DISCOUNT_AMOUNT_CENTS,
      currency: "usd",
      duration: "once",
      id: `coupon-${eventId}`,
      name: `$10 off for ${event.title} guests`,
      metadata: {
        eventId: eventId,
        createdBy: event.email,
      }
    });

    // Then create a promotional code using the coupon
    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: discountCode,
      active: true,
      metadata: {
        eventId: eventId,
        createdBy: event.email,
      }
    });

    promoCodeId = promoCode.id;
    console.log("Created Stripe promotional code:", discountCode, "with ID:", promoCodeId);
  } catch (e) {
    console.error("Failed to create promotional code", e);
    // Don't fail the entire event creation if promo code fails
  }

  // Add discount code info to event data
  event.discountCode = discountCode;
  if (promoCodeId) {
    event.stripePromoCodeId = promoCodeId;
  }

  // Store event in db
  try {
    await db.collection("events").doc(eventId).create(event);
  } catch (e) {
    console.error("Failed to create event", e);
    res.status(400).send(e);
    return;
  }

  // Redirect to Stripe checkout page
  if (checkoutSession.url) {
    res.status(200).json({ checkoutUrl: checkoutSession.url });
    track("Event created", { eventId, plan: event.plan });
  } else {
    console.error("Failed to generate checkout session");
    throw Error("Failed to generate checkout session");
  }
  } catch (error) {
    console.error("Error in event creation handler:", error);
    res.status(500).json({ 
      error: "Failed to create event", 
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
