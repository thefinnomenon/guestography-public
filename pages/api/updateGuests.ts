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
    guestPhoneNumberToRemove,
  }: {
    eventId: string;
    guestList: Partial<GuestEventRecord>[];
    newGuests: Partial<GuestEventRecord>[];
    guestPhoneNumberToRemove: string;
  } = req.body;

  if (req.method === "PUT") {
    console.log("Deleting guest", {
      eventId,
      guestList,
      guestPhoneNumberToRemove,
    });
    if (!guestPhoneNumberToRemove || !eventId || !guestList) {
      console.error("Invalid guest removal: ", eventId);
      res.status(400).send(eventId);
      return;
    }

    try {
      const db = admin.firestore();
      const guestToRemove = (
        await db
          .collection("guests")
          .where("eventId", "==", eventId)
          .where("phone", "==", guestPhoneNumberToRemove)
          .get()
      ).docs[0];
      await guestToRemove.ref.delete();
      track("remove guest", { eventId });
      return res
        .status(200)
        .json(guestList.filter((g) => g.phone !== guestPhoneNumberToRemove));
    } catch (e) {
      console.error("Failed to delete guest", e);
      return res.status(400).send(e);
    }
  }

  // Validate event info
  if (!eventId || !guestList || !newGuests) {
    console.error("Invalid guest update: ", eventId);
    res.status(400).send(eventId);
    return;
  }

  console.log("Updating guest list!", { eventId, guestList, newGuests });

  // Update guests in db
  try {
    const newGuestList = await updateGuestList(eventId, guestList, newGuests);
    track("add guests", { eventId, count: newGuests.length });
    return res.status(200).json(newGuestList);
  } catch (e) {
    console.error("Failed to create event", e);
    res.status(400).send(e);
    return;
  }
}
