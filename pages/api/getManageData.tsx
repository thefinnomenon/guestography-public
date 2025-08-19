import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { Event } from "../../types";

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
  const { eventId, key } = req.query as { eventId: string; key: string };

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

    return res.status(200).json({ event });
  } catch (e) {
    console.log(e);
    throw e;
  }
}
