import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { GuestEnrollSource, GuestEventRecord } from "../../types";
import { track } from "../../lib/mixpanel";
import { addGuest, updateGuestList } from "../../lib/firebase";

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
    newGuest,
    newGuests,
    source,
    guestPhoneNumberToRemove,
  }: {
    eventId: string;
    newGuest: Partial<GuestEventRecord>;
    guestList: Partial<GuestEventRecord>[];
    newGuests: Partial<GuestEventRecord>[];
    source: GuestEnrollSource;
    guestPhoneNumberToRemove: string;
  } = req.body;

  // Remove guest
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

  // Guest self-enrolled
  if (newGuest) {
    // Validate event info
    if (!eventId) {
      console.error("Invalid guest update: ", eventId);
      res.status(400).send(eventId);
      return;
    }

    console.log("Guest is self enrolling to event!", { eventId, newGuest });

    // Update guest in db
    try {
      await addGuest(eventId, newGuest);
      track("add guests", { eventId, count: 1, source });
      return res.status(200).json({ msg: "Guest added" });
    } catch (e) {
      console.error("Failed to self enroll guest", e);
      return res.status(400).send(e);
    }
  }

  // Updating guests from guest table

  // Validate event info
  if (!eventId || !guestList || !newGuests) {
    console.error("Invalid guest update: ", eventId);
    return res.status(400).send(eventId);
  }

  console.log("Updating guest list!", {
    eventId,
    guestList,
    newGuests,
    source,
  });

  // Update guests in db
  try {
    const newGuestList = await updateGuestList(eventId, guestList, newGuests);
    track("add guests", { eventId, count: newGuests.length, source });
    return res.status(200).json(newGuestList);
  } catch (e) {
    console.error("Failed to add guests", e);
    return res.status(400).send(e);
  }
}
