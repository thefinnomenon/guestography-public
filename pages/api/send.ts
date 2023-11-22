import { Twilio } from "twilio";
import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { Event, GuestEventRecord } from "../../types";
import Mixpanel from "mixpanel";
import { iMessageSend } from "../../lib/loop";

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "");

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
  const { type, eventId, guestId, secret } = JSON.parse(req.body);

  // Verify secret
  if (secret !== process.env.WEBHOOK_SECRET) {
    console.error("Invalid webhook secret");
    res.status(401).send("Invalid webhook secret");
    return;
  }

  // Verify body is valid
  if (!type || !eventId || !guestId) {
    console.error("Missing required body: type, eventId, and guestId");
    res.status(400).send("Missing required body: type, eventId, and guestId");
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

  let guest;
  if (guestId === "owner" && type === "galleryReadyMessage")
    guest = { firstName: event.firstName, phone: event.phone };
  else guest = event.guests.find((guest) => guest.id === guestId);

  if (!guest) {
    console.error(`Failed to find guest ${guestId} for event ${eventId}`);
    res
      .status(404)
      .send(`Failed to find guest ${guestId} for event ${eventId}`);
    return;
  }

  let guestRecord;
  try {
    // Find guest by phone number with most recent active event
    const guestQuery = (
      await db
        .collection("guests")
        .where("phone", "==", guest.phone)
        .where("eventStatus", "==", "ACTIVE")
        .orderBy("updatedAt", "desc")
        .get()
    ).docs;

    if (guestQuery.length === 0) throw Error("Failed to find guest record");

    guestRecord = guestQuery[0].data() as GuestEventRecord;
  } catch (e) {
    console.error(e);
    res.status(404).send(e);
  }

  if (!guestRecord) {
    console.error(`Failed to find guest record`, guest.phone);
    res.status(404).send(`Failed to find guest record`);
    return;
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
      msg = `Hi ${firstName}! We're collecting guest video messages using Guestography for ${eventTitle} and it’s your turn!\nPlease record a short video (<1 minute) (in ${
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

      msg = `Just a friendly reminder that there’s still time to record and submit a video message for ${eventTitle}.\n${interviewLink}`;
      break;
    case "mediaInitialMessage":
      msg = `Hi ${firstName}! Hope you are excited for ${eventTitle}! We are using Guestography to collect photos and videos from everyone so please snap away and after the event you will receive a message asking you to upload your best shots!`;
      break;
    case "mediaCollectionMessage":
      msg = `Hope that you had fun at ${eventTitle}! Share any photos and videos using the link below.\n${mediaLink}`;
      break;
    case "galleryReadyMessage":
      msg = `Good news ${firstName}, the gallery for ${eventTitle} is ready! Take a look here,\n${galleryLink}`;
      break;
    default:
      console.error(`Unknown message type ${type}`);
      res.status(500).send(`Unknown message type ${type}`);
      throw Error(`Unknown message type ${type}`);
  }

  // If iMessage -> send iMessage
  if (guestRecord?.iMessage) {
    try {
      if (type === "mediaInitialMessage")
        msg = `Hi ${firstName}! We're using Guestography to collect photos, videos, audios, & messages from everyone for ${event.title}.\n\nReply with 'join' to join`;

      // If not initial message and guest hasn't opted-in -> don't send message
      if (!guestRecord.optedIn && type !== "mediaInitialMessage") {
        res.status(200).send("okay");
        return;
      }

      await iMessageSend(guest.phone, event.title, msg);
      console.log("iMessage sent");
      mixpanel.track("iMessage sent", { eventId, guestId, type });

      res.status(200).send("okay");
      return;
    } catch (e) {
      console.error("Failed to send iMessage", e);
      mixpanel.track("iMessage send failure", { eventId, guestId, type });
      res.status(500).send(e);
    }
  }

  try {
    const twilioMsgRes = await client.messages.create({
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: guest.phone,
      body: msg,
    });
    console.log("SMS sent: ", twilioMsgRes.sid);
    mixpanel.track("SMS sent", { eventId, guestId, type });

    res.status(200).send("okay");
    return;
  } catch (e) {
    console.error("Failed to send SMS", e);
    mixpanel.track("SMS send failure", { eventId, guestId, type });
    res.status(500).send(e);
  }
}
