import { NextApiRequest, NextApiResponse } from "next";

import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { guestCount, interviewService, mediaService } = req.body.amount;

    const line_items = [];
    if (interviewService)
      line_items.push({
        price: "price_1MtNwGJ7SSLr30C7xnaIg6Kc",
        quantity: guestCount,
      });
    if (mediaService)
      line_items.push({
        price: "price_1MtNzNJ7SSLr30C7KH87YHgA",
        quantity: guestCount,
      });

    try {
      const params: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        line_items,
        allow_promotion_codes: true,
        success_url: `${req.headers.origin}/result?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/event`,
      };

      const checkoutSession: Stripe.Checkout.Session =
        await stripe.checkout.sessions.create(params);

      res.status(200).json(checkoutSession);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ statusCode: 500, message: errorMessage });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
