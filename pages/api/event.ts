import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import Stripe from "stripe";
//import serviceAccount from "../../lib/serviceAccountKey.json";
import { slugify } from "../../utils/format";
import ShortUniqueId from "short-unique-id";
import { Event } from "../../types";
import Mixpanel from "mixpanel";

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "");

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

  // TODO: Validate event info

  // Map over guest list & add unique guest ids
  const uid = new ShortUniqueId();
  event.guests = event.guests.map((guest: any) => {
    return {
      ...guest,
      id: `${guest.firstName}-${guest.lastName}-${uid()}`,
    };
  });

  event.status = "PENDING";

  // Generate URL safe event ids
  const eventId = `${slugify(event.title)}-${new ShortUniqueId({
    length: 4,
  })()}`;

  console.log("Generating Stripe Checkout Session for event ", eventId);

  // Generate Stripe Checkout Session
  let checkoutSession: Stripe.Checkout.Session;
  const line_items = [];
  if (event.interviews.enabled)
    line_items.push({
      price: process.env.STRIPE_INTERVIEW_SERVICE_PRICE_ID,
      quantity: event.guests.length,
    });
  if (event.media.enabled)
    line_items.push({
      price: process.env.STRIPE_INTERVIEW_SERVICE_PRICE_ID,
      quantity: event.guests.length,
    });

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: event.email,
      line_items,
      metadata: { eventId },
      success_url: `${req.headers.origin}/checkout/success?eventId=${eventId}&type=schedule`,
      cancel_url: `${req.headers.origin}/event?eventId=${eventId}`,
    };

    checkoutSession = await stripe.checkout.sessions.create(params);
  } catch (e) {
    console.error("Failed to create Stripe checkout session", e);
    throw(e);
  }

  // Store event in db
  try {
    await db.collection("events").doc(eventId).create(event);
  } catch (e) {
    console.error('Failed to create event', e);
    throw e;
  }

  // Redirect to Stripe checkout page
  if (checkoutSession.url) {
    res.status(200).json({ checkoutUrl: checkoutSession.url });
    mixpanel.track('Event created', { eventId })
  } else {
    console.error("Failed to generate checkout session");
    mixpanel.track("Failed to create event", { eventId });
    throw Error("Failed to generate checkout session");
  }
}
