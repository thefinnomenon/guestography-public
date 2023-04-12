import { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const { eventId } = session.metadata;

      console.log("Checkout completed for event ", eventId);

      if (session.payment_status === "paid") {
        // TODO: Update event to paid
        console.log("Payment received");
      } else {
        // TODO: Update event to unpaid
        console.log("Payment not received");
      }

      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as any;
      const { eventId } = session.metadata;
      // TODO: Update event to paid
      console.log("Payment received for event ", eventId);
      break;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as any;
      const { eventId } = session.metadata;
      // TODO: Send email to customer about payment failure
      console.log("Payment failed for event ", eventId);
      break;
    }

    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }

  res.status(200).end();
}
