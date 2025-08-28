import { NextApiRequest, NextApiResponse } from "next";
import { render } from "@react-email/render";
import EventCompletionEmail from "../../emails/EventCompletionEmail";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    console.log("Attempting to render event completion email preview...");
    
    // Get query parameters for customization
    const {
      eventTitle = "Sarah & Mike's Wedding",
      eventId = "wedding-abc123",
      eventOwnerName = "Sarah"
    } = req.query;

    const emailHtml = await render(EventCompletionEmail({
      eventTitle: eventTitle as string,
      eventId: eventId as string,
      eventOwnerName: eventOwnerName as string,
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