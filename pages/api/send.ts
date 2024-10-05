import { Twilio } from "twilio";
import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { Event, Guest, GuestEventRecord } from "../../types";
import { track } from "../../lib/mixpanel";
import { iMessageSend } from "../../lib/loop";

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

  console.log("Sending message", { type, eventId, guestId });

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
    event = (
      await db.collection("events").doc(eventId).get()
    ).data() as Event | null;
  } catch (e: any) {
    console.error(`Failed to retrieve event ${eventId}`);
    res.status(400).send(`Failed to retrieve event ${eventId}`);
    return;
  }

  if (!event) {
    console.error(`Failed to find event ${eventId}`);
    res.status(400).send(`Failed to find event ${eventId}`);
    return;
  }

  console.log("Found event", event.title);

  let guest: Guest | undefined;
  if (
    guestId === "organizer" &&
    (type === "galleryReadyMessage" || type === "organizerScheduledEvent")
  )
    guest = {
      id: "organizer",
      firstName: event.firstName,
      lastName: event.lastName,
      phone: event.phone,
    };
  else
    guest = (
      await db.collection("guests").doc(guestId).get()
    ).data() as GuestEventRecord;

  if (!guest) {
    console.error(`Failed to find guest ${guestId} for event ${eventId}`);
    res
      .status(400)
      .send(`Failed to find guest ${guestId} for event ${eventId}`);
    return;
  }

  // let guestRecord;
  // try {
  //   // Find guest by phone number with most recent active event
  //   const guestQuery = (
  //     await db
  //       .collection("guests")
  //       .where("phone", "==", guest.phone)
  //       .where("eventStatus", "==", "ACTIVE")
  //       .orderBy("updatedAt", "desc")
  //       .get()
  //   ).docs;

  //   if (guestQuery.length === 0) throw Error("Failed to find guest record");

  //   guestRecord = guestQuery[0].data() as GuestEventRecord;
  // } catch (e) {
  //   console.error(e);
  //   res.status(404).send(e);
  // }

  // if (!guestRecord) {
  //   console.error(`Failed to find guest record`, guest.phone);
  //   res.status(404).send(`Failed to find guest record`);
  //   return;
  // }

  console.log("Found guest", guest.id);

  // Format message
  let msg;
  try {
    msg = formatMessage(type, eventId, event, guest);
  } catch (e) {
    console.error("Failed to format message", e);
    res.status(400).send(e);
    return;
  }

  // If iMessage -> Send iMessage
  // if (guestRecord.iMessage) {
  //   console.log("Sending iMessage to ", guest.phone);
  //   try {
  //     // If not initial message and guest hasn't opted-in -> don't send message
  //     if (!guestRecord.optedIn && type !== "mediaInitialMessage") {
  //       res.status(200).send("okay");
  //       return;
  //     }

  //     await iMessageSend(guest.phone, event.title, msg);
  //     console.log("iMessage sent");
  //     track("iMessage sent", { eventId, guestId, type });

  //     res.status(200).send("okay");
  //     return;
  //   } catch (e) {
  //     console.error("Failed to send iMessage", e);
  //     track("iMessage send failure", { eventId, guestId, type });
  //     res.status(500).send(e);
  //     return;
  //   }
  // }

  // Send SMS
  try {
    console.log("Sending SMS to ", guest.phone);
    const twilioMsgRes = await client.messages.create({
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: guest.phone,
      body: msg,
    });
    console.log("SMS sent: ", twilioMsgRes.sid);
    track("SMS sent", { eventId, guestId, type });

    res.status(200).send("okay");
    return;
  } catch (e) {
    console.error("Failed to send SMS", e);
    track("SMS send failure", { eventId, guestId, type });
    res.status(500).send(e);
  }
}

const formatMessage = (
  type: string,
  eventId: string,
  event: Event,
  guest: Guest
  //guestRecord: GuestEventRecord
) => {
  const firstName = guest.firstName;
  const eventTitle = event.title;
  const mediaLink = `https://guestography.com/${eventId}/upload/media?guestId=${guest.id}`;
  const galleryLink = `https://guestography.com/${eventId}?guestId=${guest.id}`;
  const managementLink = `https://guestography.com/${eventId}/manage&key=${event.managementKey}`;

  if (false) {
    // iMessage
    switch (type) {
      case "organizerEventStart":
        return `Hi ${firstName}! Thanks for choosing Guestography. I hope you are excited for your event ${eventTitle}!\n\nReply 'join' to get started.`;
      case "mediaInitialMessage":
        return `Hi ${firstName}! Hope you're excited for ${eventTitle}! This event is using Guestography to collect photos, videos, and text and audio messages from everyone.\n\n Reply 'join' to join the event!`;
      case "optedIn":
        let msg = `Okay, you're in! Any photos, videos, texts, & audios you send in this chat will be added to the event gallery. Enjoy the event and don't forget to share here!`;
        // If organizer, include management link
        if (guest.id === "organizer")
          msg += `\n\n Also, since you are the organizer, use this link to manage the event,\n\n${managementLink}.`;
        return msg;
      case "galleryReadyMessage":
        return `Good news ${firstName}, the gallery is ready! Take a look here,\n\n${galleryLink}`;
      default:
        throw Error(`Unknown message type ${type}`);
    }
  } else {
    // SMS
    switch (type) {
      case "organizerScheduledEvent":
        return `Hi ${firstName}! Thanks for choosing Guestography. Use this link to manage the event,\n\n${managementLink}.`;
      case "organizerEventStart":
        return `Hi ${firstName}! I hope you are excited for your event ${eventTitle}! Use this link to manage the event,\n\n${managementLink}.`;
      case "mediaInitialMessage":
        return `Hi ${firstName}! Hope you're excited for ${eventTitle}! This event is using Guestography to collect photos and videos from everyone. Use this link to share to the event gallery,\n\n${mediaLink}`;
      // This really shouldn't happen but I suppose there is a chance an iMessage user gets downgraded to SMS after the initial message so we should handle it
      case "optedIn":
        let msg = `Okay, you're in! Share any photos, videos, texts, & audios to the event gallery using this link,\n\n${mediaLink}.`;
        // If organizer, include management link
        if (guest.id === "organizer")
          msg += `\n\n Also, since you are the organizer, use this link to manage the event,\n\n${managementLink}.`;
        return msg;
      case "galleryReadyMessage":
        return `Good news ${firstName}, the gallery for ${eventTitle} is ready! Take a look,\n\n${galleryLink}`;
      default:
        throw Error(`Unknown message type ${type}`);
    }
  }
};
