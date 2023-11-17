import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import Mixpanel from "mixpanel";
import { Event } from "../../../../types";

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "");

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
  const { eventId } = req.query as { eventId: string };

  // Verify secret
  if (!process.env.LOOP_WEBHOOK_SECRET) {
    console.error("LOOP_WEBHOOK_SECRET not defined");
    res.status(500).send("LOOP_WEBHOOK_SECRET not defined");
    return;
  }
  if (req.headers.authorization !== process.env.LOOP_WEBHOOK_SECRET) {
    console.error("Invalid Authorization header");
    res.status(401).send("Invalid Authorization header");
    return;
  }

  // https://docs.loopmessage.com/lookup-api/lookup/webhooks#response-format
  const phoneDetails = req.body;
  const phone = phoneDetails.contact;
  const iMessage =
    phoneDetails.result_v1.apple_services.imessage.status === "available";

  console.log(phoneDetails, phone, iMessage);

  if (iMessage) {
    try {
      const db = admin.firestore();
      const event = (
        await db.collection("events").doc(eventId).get()
      ).data() as Event;

      const guest = event.guests.find((g) => g.phone === phone);
      if (!guest) throw Error(`No guest found for ${phone}`);

      // Update guest record with iMessage = true
      // Firestore doesn't allow updating an array index so we must remove the element & then add the updated one
      await db
        .collection("events")
        .doc(eventId)
        .update({ guests: admin.firestore.FieldValue.arrayRemove(guest) });
      guest.iMessage = true;
      await db
        .collection("events")
        .doc(eventId)
        .update({ guests: admin.firestore.FieldValue.arrayUnion(guest) });

      console.log("Found iMessage user and updated record", guest);

      mixpanel.track("iMessage user found", {
        eventId,
      });
    } catch (error: any) {
      console.error("Failed to process Lookup callback", error);
      res
        .status(500)
        .send("Failed to process Lookup callback " + error.message);
    }
  }

  res.status(200).end();
}
