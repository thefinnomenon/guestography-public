import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import Mixpanel from "mixpanel";
import { Event, GuestEventRecord } from "../../../../types";

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
  // Sometimes iMessage says unavailable so let's also check the Facetime status
  const iMessage =
    phoneDetails.result_v1.apple_services.imessage.status === "available" ||
    phoneDetails.result_v1.apple_services.facetime.status === "available";

  console.log(phoneDetails, phone, iMessage);

  if (iMessage) {
    try {
      const db = admin.firestore();

      // Find guest by phone number with most recent active event
      const guestQuery = (
        await db
          .collection("guests")
          .where("phone", "==", phone)
          .where("eventStatus", "==", "ACTIVE")
          .orderBy("updatedAt", "desc")
          .get()
      ).docs;

      if (guestQuery.length === 0) throw Error("Failed to find guest record");

      console.log(
        `Found iMessage user for phone ${phone}. Updating record...`,
        { ...guestQuery[0].data(), iMessage: true }
      );

      // Update iMessage flag
      await guestQuery[0].ref.update({ iMessage: true });

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
