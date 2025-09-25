import { NextApiRequest, NextApiResponse } from "next";
import { getEvent } from "../../../lib/firebase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { eventId } = req.query;

  if (!eventId || typeof eventId !== "string") {
    return res.status(400).json({ error: "Event ID is required" });
  }

  try {
    const event = await getEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.status(200).json({ 
      status: event.status,
      exists: true 
    });
  } catch (error) {
    console.error("Error fetching event status:", error);
    return res.status(500).json({ error: "Failed to fetch event status" });
  }
}