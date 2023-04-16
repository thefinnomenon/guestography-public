import { Twilio } from "twilio";
import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import serviceAccount from "../../lib/serviceAccountKey.json";
import { Event } from "../../types";

if (!admin.apps.length)
  admin.initializeApp({
    /* @ts-ignore */
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { type, eventId, guestId, secret } = JSON.parse(req.body || "{}");

  console.log(type, eventId, guestId);

  // Verify secret
  if (secret !== process.env.WEBHOOK_SECRET) {
    console.error("Invalid webhook secret");
    res.status(401).send("Invalid webhook secret");
    return;
  }

  // Verify body is valid
  if (!type || !eventId || !guestId) {
    console.error("Missing required params: type, eventId, and guestId");
    res.status(500).send("Missing required params: type, eventId, and guestId");
    return;
  }

  // Retrieve event from db
  const db = admin.firestore();
  let event;
  try {
    event = (await db.collection("events").doc(eventId).get()).data() as Event;
  } catch (e: any) {
    console.error(`Failed to retrieve event ${eventId}`);
    res.status(500).send(`Failed to retrieve event ${eventId}`);
    return;
  }

  // Grab guest from event
  const guest = event.guests.find((guest) => guest.id === guestId);
  if (!guest) {
    console.error(`Failed to find guest ${guestId} for event ${eventId}`);
    res
      .status(500)
      .send(`Failed to find guest ${guestId} for event ${eventId}`);
    return;
  }

  // Format message
  /* @ts-ignore */
  const firstName = guest["First Name"];
  const eventTitle = event.title;
  const interviewLink = `https://guestography.net/${eventId}/upload/interview?guestId=${guestId}`;
  const mediaLink = `https://guestography.net/${eventId}/upload/media?guestId=${guestId}`;
  const galleryLink = `https://guestography.net/${eventId}`;
  let msg;
  switch (type) {
    case "interviewInitialMessage":
      msg = `Hi ${firstName}! We're collecting video messages using Guestography for ${eventTitle} and it’s your turn!\n${interviewLink}`;
      break;
    case "interviewReminderMessage":
      msg = `Hi ${firstName}, Guestography again! Just a friendly reminder that there’s still time to record and submit a video message for ${eventTitle}.\n${interviewLink}`;
      break;
    case "mediaInitialMessage":
      msg = `Hi ${firstName}, we hope you are excited for ${eventTitle}! We wanted to let you know that we are using Guestography to collect photos and videos from everyone so please snap away and tomorrow you will recieve a message asking you to upload your best shots!`;
      break;
    case "mediaCollectionMessage":
      msg = `Good morning ${firstName}! Guestography here and we hope that you had fun at ${eventTitle} yesterday and invite you to share any photos and videos you took by uploading them using the link below.\n${mediaLink}`;
      break;
    case "galleryReadyMessage":
      msg = `Good news ${firstName}, the gallery for ${eventTitle} is ready! Take a look here,\n${galleryLink}`;
      break;
    default:
      console.error(`Unknown message type ${type}`);
      res.status(500).send(`Unknown message type ${type}`);
      return;
  }

  try {
    client.messages
      .create({
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        /* @ts-ignore */
        to: guest.Phone,
        body: msg,
      })
      .then((message) => console.log(message.sid));
  } catch (error) {
    console.error("Failed to send SMS", error);
    res.status(500).send("Failed to send SMS");
    return;
  }

  res.status(200).send("okay");
}
