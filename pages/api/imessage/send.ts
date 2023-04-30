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
  const { eventId, service } = req.query;
  console.log(`Sending iMessage for ${eventId}, ${service}!`);

  try {
    const res = await fetch(
      `https://server.loopmessage.com/api/v1/message/send/`,
      {
        method: "POST",
        headers: {
          Authorization: process.env.LOOPMESSAGE_AUTH_KEY || "",
          "Loop-Secret-Key": process.env.LOOPMESSAGE_SECRET_API_KEY || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: "+17817891371",
          text: "Hi!",
          sender_name: "guestography@imsg.tel",
          passthrough: JSON.stringify({ eventId, service }),
          status_callback:
            "https://0292-2601-19c-4e82-ce80-431-5075-a588-887a.ngrok.io/api/imessage/status",
          status_callback_header: "Bearer eyJhbGciOiJIUzI1NiJ9",
        }),
      }
    );
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.log(err);
  }

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
