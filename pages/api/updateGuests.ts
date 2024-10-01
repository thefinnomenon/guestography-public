import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { GuestEventRecord } from "../../types";
import { track } from "../../lib/mixpanel";
import { updateGuestList } from "../../lib/firebase";

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

if (!admin.apps.length)
  admin.initializeApp({
    /* @ts-ignore */
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    eventId,
    guestList,
    newGuests,
  }: {
    eventId: string;
    guestList: Partial<GuestEventRecord>[];
    newGuests: Partial<GuestEventRecord>[];
  } = req.body;

  // Validate event info
  if (!eventId || !guestList || !newGuests) {
    console.error("Invalid guest update: ", eventId);
    res.status(400).send(eventId);
    return;
  }

  console.log("Updating guest list!", { eventId, guestList, newGuests });

  track("add guests", { eventId, count: newGuests.length });

  // Update guests in db
  try {
    const newGuestList = await updateGuestList(eventId, guestList, newGuests);
    return res.status(200).json(newGuestList);
  } catch (e) {
    console.error("Failed to create event", e);
    res.status(400).send(e);
    return;
  }
}
