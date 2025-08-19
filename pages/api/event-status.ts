import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";

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
  console.log("Event status update");

  const { eventId, status, secret } = JSON.parse(req.body);

  // Verify secret
  if (secret !== process.env.WEBHOOK_SECRET) {
    console.error("Invalid webhook secret");
    res.status(401).send("Invalid webhook secret");
    return;
  }

  // Verify body is valid
  if (!eventId || !status) {
    console.error("Missing required body: type, eventId, and guestId");
    res.status(400).send("Missing required body: type, eventId, and guestId");
    return;
  }

  const db = admin.firestore();
  const updatePromises = [];

  try {
    // Update event record
    console.log(`Updating event status to ${status}...`);
    updatePromises.push(
      db.collection("events").doc(eventId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );
  } catch (e) {
    console.error("Failed to update event status", e);
    res.status(500).send({});
  }

  res.status(200).send({});
}
