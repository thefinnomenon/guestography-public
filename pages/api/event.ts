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
  apiVersion: "2022-11-15",
});

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

  // Generate discount code for this event (50% off)
  const discountCode = `${eventId.toUpperCase()}-50OFF`;
  
  console.log("Generating Stripe Checkout Session for event ", eventId);
  console.log("Creating discount code:", discountCode);

  // Use test price ID in development, production price ID in production
  const price = process.env.NODE_ENV === 'development' 
    ? process.env.STRIPE_TEST_GALLERY_PRICE_ID 
    : process.env.STRIPE_GALLERY_PRICE_ID;
    
  if (!price) {
    console.error("Stripe price ID not set for environment:", process.env.NODE_ENV);
    res.status(400).send(`Stripe price ID not set for ${process.env.NODE_ENV} environment`);
    return;
  }

  // Generate Stripe Checkout Session
  let checkoutSession: Stripe.Checkout.Session;
  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: event.email,
      line_items: [
        {
          price,
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
        // Find the promotion code in Stripe
        const promotionCodes = await stripe.promotionCodes.list({
          code: providedDiscountCode,
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          params.discounts = [{
            promotion_code: promotionCodes.data[0].id,
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

  // Create Stripe promotional code for 50% off
  let promoCodeId: string | undefined;
  try {
    // First create a coupon for 50% off
    const coupon = await stripe.coupons.create({
      percent_off: 50,
      duration: 'forever',
      id: `coupon-${eventId}`,
      name: `50% off for ${event.title} guests`,
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
