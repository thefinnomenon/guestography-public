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
  const db = admin.firestore();
  const event: Event = req.body;

  // Validate event info
  if (
    !event ||
    !event.firstName ||
    !event.lastName ||
    !event.title ||
    !event.startAt ||
    new Date(event.startAt) <=
      new Date(new Date().getTime() + 60 * 60 * 1000) ||
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

  console.log("Generating Stripe Checkout Session for event ", eventId);

  const price = process.env.STRIPE_STANDARD_PRICE_ID;
  if (!price) {
    console.error("Standard price ID not set");
    res.status(400).send("Standard price ID not set");
    return;
  }

  // If shindig, add free year discount
  // let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined =
  //   undefined;
  // if (event.plan === "shindig") {
  //   discounts = [{ coupon: process.env.STRIPE_SHINDIG_YEAR_FREE_DISCOUNT }];
  // }

  // Generate Stripe Checkout Session
  let checkoutSession: Stripe.Checkout.Session;
  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: event.email,
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      metadata: { eventId },
      success_url: `${req.headers.origin}/${eventId}/manage?key=${event.managementKey}`,
      cancel_url: `${req.headers.origin}/event?eventId=${eventId}`,
    };

    console.log("Creating Stripe checkout session with params", params);

    checkoutSession = await stripe.checkout.sessions.create(params);
  } catch (e) {
    console.error("Failed to create Stripe checkout session", e);
    res.status(400).send("Failed to create Stripe checkout session");
    return;
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
}
