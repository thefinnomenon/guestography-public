import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
//import serviceAccount from "../../../lib/serviceAccountKey.json";
import { buffer } from "micro";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

if (!admin.apps.length)
  admin.initializeApp({
    /* @ts-ignore */
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const payload = await buffer(req);
  const sig = req.headers["stripe-signature"];

  if (!endpointSecret) {
    console.error("Webhook Error: Missing webhook signature secret");
    res.status(500).send(`Webhook Error: Missing webhook signature secret`);
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig || "", endpointSecret);
  } catch (err: any) {
    console.error("Webhook Error: ", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = admin.firestore();
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const { eventId } = session.metadata;

      console.log("Checkout completed for event ", eventId);

      let status;
      if (session.payment_status === "paid") {
        status = "PAID";
        console.log("Payment received");
      } else {
        status = "UNPAID";
        console.log("Payment not received");
      }

      try {
        await db.collection("events").doc(eventId).set(
          {
            status,
          },
          { merge: true }
        );
        console.log(`Updated event ${eventId} status to ${status}`);
      } catch (e) {
        console.error(e);
        res.status(500).json(e);
        return;
      }

      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as any;
      const { eventId } = session.metadata;
      console.log("Payment received for event ", eventId);

      try {
        await db.collection("events").doc(eventId).set(
          {
            status: "PAID",
          },
          { merge: true }
        );
        console.log(`Updated event ${eventId} status to PAID`);
      } catch (e) {
        console.error(e);
        res.status(500).json(e);
        return;
      }

      break;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as any;
      const { eventId } = session.metadata;

      console.log("Payment failed for event ", eventId);
      try {
        await db.collection("events").doc(eventId).set(
          {
            status: "PAYMENT_FAILURE",
          },
          { merge: true }
        );
        console.log(`Updated event ${eventId} status to PAYMENT_FAILURE`);
      } catch (e) {
        console.error(e);
        res.status(500).json(e);
        return;
      }
      break;
    }

    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }

  res.status(200).end();
}
