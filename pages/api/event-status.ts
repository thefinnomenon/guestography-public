import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { Event, GuestEventRecord } from "../../types";
import { iMessageLookup } from "../../lib/loop";

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
    // If event just became active, let's trigger iMessage lookups
    console.log("Initiating iMessage Lookups...");
    if (status === "ACTIVE") {
      const event = (
        await db.collection("events").doc(eventId).get()
      ).data() as Event;
      const guests = (
        await db.collection("guests").where("eventId", "==", eventId).get()
      ).docs.map((snap) => snap.data()) as Partial<GuestEventRecord>[];

      // Add organizer
      guests.push({
        id: "organizer",
        firstName: event.firstName,
        lastName: event.lastName,
        phone: event.phone,
      });
      //await iMessageLookup(eventId, guests);
    }
  } catch (e) {
    console.error("Failed to initiate iMessage lookups", e);
    res.status(500).send({});
  }

  try {
    // Update event record
    console.log(`Updating event status to ${status}...`);
    updatePromises.push(
      db.collection("events").doc(eventId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );

    // Update guest records for event
    console.log(`Updating guest records event statuses to ${status}...`);
    await (
      await db.collection("guests").where("eventId", "==", eventId).get()
    ).docs.map((snap) =>
      updatePromises.push(
        snap.ref.update({
          eventStatus: status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      )
    );

    await Promise.all(updatePromises);
  } catch (e) {
    console.error("Failed to update event status", e);
    res.status(500).send({});
  }

  res.status(200).send({});
}
