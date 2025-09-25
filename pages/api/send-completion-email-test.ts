import { NextApiRequest, NextApiResponse } from "next";
import { sendEventCompletionEmail } from "../../lib/send-completion-email";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    eventId = "test-event-123",
    eventTitle = "Test Event Gallery",
    eventOwnerName = "Test Owner",
    eventOwnerEmail = "test@example.com"
  } = req.body;

  try {
    console.log("Sending test completion email...");

    const baseUrl = (process.env.NODE_ENV as string) === 'production' 
      ? 'https://guestography.com' 
      : 'http://localhost:3000';

    const result = await sendEventCompletionEmail({
      eventTitle,
      eventId,
      eventOwnerName,
      eventOwnerEmail,
      baseUrl
    });

    console.log("Test completion email sent successfully");

    res.status(200).json({ 
      success: true, 
      message: "Completion email sent successfully",
      eventId,
      eventTitle,
      ownerEmail: eventOwnerEmail,
      result
    });

  } catch (error) {
    console.error("Failed to send test completion email:", error);
    res.status(500).json({ 
      error: "Failed to send completion email",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}