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

  // Validate event info
  try {
    if (event.endDate < event.date)
      throw Error("End date must be after start date");
    if (event.interviews.enabled) {
      if (
        event.interviews.initialMessage.schedule < event.date ||
        event.interviews.initialMessage.schedule > event.endDate ||
        event.interviews.initialMessage.schedule >
          event.interviews.reminderMessage.schedule
      )
        throw Error("Invalid interview initial message schedule");

      if (
        event.interviews.reminderMessage.schedule < event.date ||
        event.interviews.reminderMessage.schedule > event.endDate
      )
        throw Error("Invalid interview reminder message schedule");
    }
    if (event.media.enabled) {
      if (
        event.media.initialMessage.schedule > event.endDate ||
        event.media.initialMessage.schedule >
          event.media.collectionMessage.schedule
      )
        throw Error("Invalid media initial message schedule");

      if (
        event.media.collectionMessage.schedule < event.date ||
        event.media.collectionMessage.schedule > event.endDate
      )
        throw Error("Invalid media collection message schedule");
    }
  } catch (e) {
    console.error("Invalid event: ", e);
    res.status(400).send(e);
    return;
  }

  // Map over guest list & add unique guest ids
  const uid = new ShortUniqueId();
  event.guests = event.guests.map((guest: any) => {
    return {
      ...guest,
      // Add +1 country code if no country code & remove ()'s, -'s, and spaces
      phone:
        guest.phone.indexOf("+") === -1
          ? `+1${guest.phone.replace(/[^+\d]+/g, "")}`
          : guest.phone.replace(/[^+\d]+/g, ""),
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
      price: process.env.STRIPE_MEDIA_SERVICE_PRICE_ID,
      quantity: event.guests.length,
    });

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: event.email,
      line_items,
      allow_promotion_codes: true,
      metadata: { eventId },
      success_url: `${req.headers.origin}/checkout/success?eventId=${eventId}&type=schedule`,
      cancel_url: `${req.headers.origin}/event?eventId=${eventId}`,
    };

    checkoutSession = await stripe.checkout.sessions.create(params);
  } catch (e) {
    console.error("Failed to create Stripe checkout session", e);
    res.status(400).send("Failed to create Stripe checkout session");
    return;
  }

  // Store guests in db
  try {
    const guestRecordPromises = event.guests.map((g) => {
      return db.collection("guests").add({
        ...g,
        eventId: eventId,
        eventState: "inactive",
        iMessage: false,
        optedIn: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await Promise.all(guestRecordPromises);
  } catch (e) {
    console.error("Failed to create guest records", e);
    res.status(400).send(e);
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
    mixpanel.track("Event created", { eventId });
  } else {
    console.error("Failed to generate checkout session");
    mixpanel.track("Failed to create event", { eventId });
    throw Error("Failed to generate checkout session");
  }
}
