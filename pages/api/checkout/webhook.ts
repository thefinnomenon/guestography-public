import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { buffer } from "micro";
import Stripe from "stripe";
import Mixpanel from "mixpanel";
import { sendEventCompletionEmail } from "../../../lib/send-completion-email";

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16",
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

async function sendCompletionEmailForEvent(eventId: string, db: any) {
  try {
    // Get event details from Firestore
    const eventDoc = await db.collection("events").doc(eventId).get();
    
    if (!eventDoc.exists) {
      console.error(`Event ${eventId} not found in database`);
      mixpanel.track("Completion Email Failed", {
        eventId,
        reason: "Event not found in database",
        stage: "database_lookup"
      });
      return;
    }

    const eventData = eventDoc.data();
    const { title, ownerEmail, ownerName } = eventData;

    if (!ownerEmail) {
      console.error(`No owner email found for event ${eventId}`);
      mixpanel.track("Completion Email Failed", {
        eventId,
        eventTitle: title,
        reason: "No owner email",
        stage: "validation"
      });
      return;
    }

    console.log(`Sending completion email for event ${eventId} to ${ownerEmail}`);

    // Determine base URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://guestography.com' 
      : 'http://localhost:3000';

    // Send the completion email with QR template attachments
    const result = await sendEventCompletionEmail({
      eventTitle: title || 'Your Event',
      eventId,
      eventOwnerName: ownerName || 'Event Host',
      eventOwnerEmail: ownerEmail,
      baseUrl
    });

    console.log(`Successfully sent completion email for event ${eventId}`);
    
    // Track successful email
    mixpanel.track("Completion Email Sent", {
      eventId,
      eventTitle: title,
      ownerEmail,
      provider: result?.provider || 'unknown',
      templatesIncluded: 5 // We send all 5 templates
    });

    // Update event with email sent flag
    await db.collection("events").doc(eventId).set(
      { 
        completionEmailSent: true,
        completionEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

  } catch (error) {
    console.error(`Failed to send completion email for event ${eventId}:`, error);
    
    // Track email failure
    mixpanel.track("Completion Email Failed", {
      eventId,
      reason: error instanceof Error ? error.message : "Unknown error",
      stage: "email_sending",
      errorDetails: error
    });
    
    // Don't throw - we don't want to fail the webhook for email issues
  }
}

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

        // Send completion email if payment was successful
        if (status === "PAID") {
          await sendCompletionEmailForEvent(eventId, db);
        }
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

        // Send completion email for async payment success
        await sendCompletionEmailForEvent(eventId, db);
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
