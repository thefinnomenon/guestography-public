import { NextApiRequest, NextApiResponse } from "next";
import { render } from "@react-email/render";
import DiscountCodeEmail from "../../emails/DiscountCodeEmail";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    console.log("Attempting to render email preview...");
    
    const emailHtml = await render(DiscountCodeEmail({
      userName: "John Doe",
      eventTitle: "Sarah & Mike's Wedding",
      discountCode: "WEDDING-ABC123-10OFF",
      eventId: "wedding-abc123",
    }));

    console.log("Email rendered successfully, HTML length:", emailHtml.length);

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(emailHtml);
  } catch (error) {
    console.error("Error rendering email:", error);
    res.status(500).json({ 
      error: "Failed to render email", 
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
