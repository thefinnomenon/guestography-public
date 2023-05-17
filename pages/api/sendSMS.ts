import { Twilio } from "twilio";
import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { Event } from "../../types";
import Mixpanel from 'mixpanel';

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '');

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

if (!admin.apps.length)
  admin.initializeApp({
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
  const { type, eventId, guestId, secret } = req.body;

  // Verify secret
  if (secret !== process.env.WEBHOOK_SECRET) {
    console.error("Invalid webhook secret");
    res.status(401).send("Invalid webhook secret");
    return;
  }

  // Verify body is valid
  if (!type || !eventId || !guestId) {
    console.error("Missing required body: type, eventId, and guestId");
    res.status(500).send("Missing required body: type, eventId, and guestId");
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
    throw Error(e);
  }

  // Grab guest from event
  const guest = event.guests.find((guest) => guest.id === guestId);
  if (!guest) {
    console.error(`Failed to find guest ${guestId} for event ${eventId}`);
    throw Error(`Failed to find guest ${guestId} for event ${eventId}`);
  }

  // Format message
  const firstName = guest.firstName;
  const eventTitle = event.title;
  const orientation = event.interviews.orientation;
  const interviewLink = `https://guestography.com/${eventId}/upload/interview?guestId=${guestId}`;
  const mediaLink = `https://guestography.com/${eventId}/upload/media?guestId=${guestId}`;
  const galleryLink = `https://guestography.com/${eventId}?guestId=${guestId}`;
  let msg;
  switch (type) {
    case "interviewInitialMessage":
      // msg = `Hi ${firstName}! We're collecting video messages using Guestography for ${eventTitle} and it’s your turn!\n${interviewLink}`;
      msg = `Hi ${firstName}! We're collecting guest interviews using Guestography for ${eventTitle} and it’s your turn!\nPlease record a short video message (<1 minute) using your smartphone (in ${
        orientation === "landscape" ? "landscape ↔️" : "portrait ↕️"
      }!) and upload it using the link below.\n${interviewLink}\nFeel free to include other guests in your video but please mark them in the participants list on the upload page so we know that we already got them!`;
      break;
    case "interviewReminderMessage":
      // Don't send reminder if guest already uploaded interview
      const guestUploadSnapshot = await db
        .collection(`events/${eventId}/interviews`)
        .doc(guestId)
        .get();
      if (guestUploadSnapshot.exists) {
        res.status(200).send("okay");
        return;
      }

      // Don't send reminder if guest is tagged in uploaded interview
      const guestTaggedQuerySnapshot = await db
        .collection(`events/${eventId}/interviews`)
        .where(`guests.${guestId}`, "!=", null)
        .get();
      console.log(guestTaggedQuerySnapshot.size);
      if (guestTaggedQuerySnapshot.size !== 0) {
        res.status(200).send("okay");
        return;
      }

      msg = `Hi ${firstName}, Guestography again! Just a friendly reminder that there’s still time to record and submit a video message for ${eventTitle}.\n${interviewLink}`;
      break;
    case "mediaInitialMessage":
      msg = `Hi ${firstName}! We hope you are excited for ${eventTitle}! We wanted to let you know that we are using Guestography to collect photos and videos from everyone so please snap away and tomorrow you will recieve a message asking you to upload your best shots!`;
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
      throw Error(`Unknown message type ${type}`);
  }

  try {
    const twilioMsgRes = await client.messages.create({
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: guest.phone,
      body: msg,
    });
    console.log("SMS sent: ", twilioMsgRes.sid);
    mixpanel.track('SMS sent', { eventId, guestId, type });
  } catch (error) {
    console.error("Failed to send SMS", error);
    mixpanel.track("SMS send failure", { eventId, guestId, type });
    throw(error);
  }

  res.status(200).send("okay");
}
