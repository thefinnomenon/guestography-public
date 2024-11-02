import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { Event, GuestEventRecord } from "../../types";

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
  const { eventId, key } = req.query as { eventId: string, key: string};

  // Verify parameters
  if (!eventId || !key) {
    console.error("Missing parameters");
    res.status(404).send(`Missing parameters`);
    return;
  }

  try {
    const db = admin.firestore();
    const event = (await (
      await db.collection("events").doc(eventId).get()
    ).data()) as Event;

    if (!event) throw Error("No event found");
    if (event.managementKey !== key) throw Error("Invalid key");

    const snapshot = await db
      .collection("guests")
      .where("eventId", "==", eventId)
      .get();
    const guestList = snapshot.docs.map((doc) => {
      return doc.data() as GuestEventRecord[];
    });

    return res.status(200).json({ event, guestList });
  } catch (e) {
    console.log(e);
    throw e;
  }

  // Verify valid request
  try {
    const event =
      ((await db.collection("events").doc(eventId).get()).data() as Event) ||
      null;
    if (!event) throw Error("No event found");
    if (event.managementKey !== key) throw Error("Invalid key");
    if (event.status === "COMPLETED") throw Error("Event already closed");
  } catch (e) {
    console.error(`Failed to update event ${eventId}, ${e}`);
    res.status(400).send(`Failed to update event ${eventId}, ${e}`);
    return;
  }

  // Update status to trigger Firebase function to handle close
  try {
    await db.collection("events").doc(eventId).update({
      status: "COMPLETED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error(`Failed to update event ${eventId}`);
    res.status(400).send(`Failed to update event ${eventId}`);
    return;
  }

  res.send({});
}
