import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { Event, Guest, GuestEventRecord } from "../../types";
import { track } from "../../lib/mixpanel";

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventId, key } = req.body;
  const db = admin.firestore();

  console.log("Scheduling gallery ready message send", eventId, key);

  // Verify parameters
  if (!eventId || !key) {
    console.error("Missing parameters");
    res.status(404).send(`Missing parameters`);
    return;
  }

  // Verify valid request
  try {
    const event =
      ((await db.collection("events").doc(eventId).get()).data() as Event) ||
      null;
    if (!event) throw Error("No event found");
    if (event.managementKey !== key) throw Error("Invalid key");
    if (event.hasSentGalleryMessage) throw Error("Already sent");
  } catch (e) {
    console.error(`Failed to update event ${eventId}, ${e}`);
    res.status(400).send(`Failed to update event ${eventId}, ${e}`);
    return;
  }

  // Update hasSentGalleryMessage to trigger Firebase function to schedule send
  try {
    await db.collection("events").doc(eventId).update({
      hasSentGalleryMessage: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error(`Failed to update event ${eventId}`);
    res.status(400).send(`Failed to update event ${eventId}`);
    return;
  }

  res.send({});
}
