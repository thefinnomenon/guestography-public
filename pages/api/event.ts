import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import Stripe from "stripe";
//import serviceAccount from "../../lib/serviceAccountKey.json";
import { slugify } from "../../utils/format";
import ShortUniqueId from "short-unique-id";
import { Event } from "../../types";

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

  console.log("Line items: ", line_items);

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: event.email,
      line_items,
      metadata: { eventId },
      success_url: `${req.headers.origin}/checkout/success?eventId=${eventId}`,
      cancel_url: `${req.headers.origin}/event?eventId=${eventId}`,
    };

    checkoutSession = await stripe.checkout.sessions.create(params);
  } catch (e: any) {
    res.status(500).json(e.message);
    return;
  }

  console.log("Created checkout session: ", checkoutSession.id);

  // Store event in db
  try {
    await db.collection("events").doc(eventId).create(event);
    console.log("Created record for event: ", eventId);
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
    return;
  }

  // Redirect to Stripe checkout page
  if (checkoutSession.url)
    res.status(200).json({ checkoutUrl: checkoutSession.url });
  else
    res.status(500).json({
      message: "Failed to generate checkout session",
    });
}
