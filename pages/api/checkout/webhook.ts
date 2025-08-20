import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { buffer } from "micro";
import Stripe from "stripe";
import Mixpanel from "mixpanel";

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "");

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
    throw Error("Webhook Error: Missing webhook signature secret");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig || "", endpointSecret);
  } catch (error: any) {
    console.error("Webhook Error: ", error.message);
    throw error;
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

        // Track discount code usage if applied
        if (session.discount) {
          const discountCode = session.discount.promotion_code;
          const amountSaved = session.discount.coupon?.amount_off || 
                             (session.amount_total && session.discount.coupon?.percent_off ? 
                              session.amount_total * (session.discount.coupon.percent_off / 100) : 0);
          
          console.log("Discount code used:", discountCode, "for event:", eventId);
          
          mixpanel.track("Discount Code Used", {
            discountCode: discountCode,
            eventId: eventId,
            customerEmail: session.customer_email,
            amountSaved: amountSaved,
            percentOff: session.discount.coupon?.percent_off,
            sessionId: session.id,
            eventStatus: status,
          });
        }

        mixpanel.track(`Event ${status === "PAID" ? "paid" : "unpaid"}`, {
          eventId,
          total: session.amount_total,
          subtotal: session.amount_subtotal,
          discountApplied: !!session.discount,
          discountCode: session.discount?.promotion_code || null,
        });
      } catch (error) {
        console.error("Failed to update event status", error);
        throw error;
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

        // Track discount code usage if applied
        if (session.discount) {
          const discountCode = session.discount.promotion_code;
          const amountSaved = session.discount.coupon?.amount_off || 
                             (session.amount_total && session.discount.coupon?.percent_off ? 
                              session.amount_total * (session.discount.coupon.percent_off / 100) : 0);
          
          console.log("Discount code used (async payment):", discountCode, "for event:", eventId);
          
          mixpanel.track("Discount Code Used", {
            discountCode: discountCode,
            eventId: eventId,
            customerEmail: session.customer_email,
            amountSaved: amountSaved,
            percentOff: session.discount.coupon?.percent_off,
            sessionId: session.id,
            eventStatus: "PAID",
            paymentType: "async",
          });
        }

        mixpanel.track("Event paid", {
          eventId,
          total: session.amount_total,
          subtotal: session.amount_subtotal,
          discountApplied: !!session.discount,
          discountCode: session.discount?.promotion_code || null,
        });
      } catch (error) {
        console.error("Failed to update event");
        throw error;
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
        mixpanel.track("Event payment failure", {
          eventId,
          total: session.amount_total,
          subtotal: session.amount_subtotal,
        });
      } catch (error) {
        console.error("Failed to update event", error);
        throw error;
      }
      break;
    }

    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }

  res.status(200).end();
}
