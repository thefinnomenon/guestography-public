import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
//import serviceAccount from "../../../lib/serviceAccountKey.json";

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
  console.log("iMessage status webhook!");
  console.log("Bearer token: ", req.headers.authorization);
  console.log("Data: ", req.body);

  if (req.headers.authorization !== "Bearer eyJhbGciOiJIUzI1NiJ9") {
    res.status(401).send({ error: "Invalid Bearer token" });
    return;
  }

  console.log("Handling Status...");
  const { eventId, service, recipient, alert_type, success, text } =
    req.body.Dat;

  const db = admin.firestore();

  // Store event in db
  // try {
  //   await db.collection("events").doc(eventId).create(event);
  //   console.log("Created record for event: ", event);
  // } catch (e) {
  //   console.error(e);
  // }

  res.status(200).send({});
}
