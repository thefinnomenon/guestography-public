import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import Mixpanel from "mixpanel";
import { GuestEventRecord } from "../../../types";
import { scheduleSendTask } from "../../../utils/tasks";

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "");

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
  // Verify secret
  if (!process.env.LOOP_WEBHOOK_SECRET) {
    console.error("LOOP_WEBHOOK_SECRET not defined");
    res.status(500).send("LOOP_WEBHOOK_SECRET not defined");
    return;
  }
  if (req.headers.authorization !== process.env.LOOP_WEBHOOK_SECRET) {
    console.error("Invalid Authorization header");
    res.status(401).send("Invalid Authorization header");
    return;
  }

  try {
    // https://docs.loopmessage.com/imessage-conversation-api/messaging/webhooks#webhook-events
    const webhook = req.body;

    const db = admin.firestore();

    // Find guest by phone number with most recent active event
    const guestQuery = (
      await db
        .collection("guests")
        .where("phone", "==", webhook.recipient)
        .where("eventStatus", "==", "ACTIVE")
        .orderBy("updatedAt", "desc")
        .get()
    ).docs;

    if (guestQuery.length === 0) throw Error("Failed to find guest record");

    const guestRecord = guestQuery[0].data() as GuestEventRecord;

    console.log(
      `Found iMessage user for phone ${webhook.recipient}`,
      guestRecord
    );

    switch (webhook.alert_type) {
      case "message_inbound":
        console.log(
          `Inbound ${webhook.message_type} message received from ${guestRecord.firstName} ${guestRecord.lastName} for event ${guestRecord.eventId}: ${webhook.text} ${webhook.attachments}`,
          webhook
        );

        const guest = {
          id: guestRecord.id,
          phone: guestRecord.phone,
          firstName: guestRecord.firstName,
          lastName: guestRecord.lastName,
        };

        // Set optedIn if not set already & send follow-up message
        if (!guestRecord.optedIn) {
          console.log("User opted in", guest, webhook);

          await guestQuery[0].ref.update({ optedIn: true });

          mixpanel.track("guest opt-in", { eventId: guestRecord.eventId });

          // Add opted-in follow-up message task for guest to queue
          await scheduleSendTask(guestRecord.eventId, guest.id, "optedIn");

          // If it is a any text message (besides stop) let's assume it is the opt-in and early return
          if (webhook.text && webhook.text.toLowercase() !== "stop") {
            res.status(200).end();
            return;
          }
        }

        // If a text message -> Add to event message collection
        if (!webhook.attachments && webhook.text) {
          await db
            .collection("events")
            .doc(guestRecord.eventId)
            .collection("messages")
            .add({
              guest,
              type: "text",
              content: webhook.text,
            });

          res.status(200).end();
          return;
        }

        // If attachment -> Add
        console.log("Need to handle attachments...", webhook);

        break;
      case "message_scheduled":
        console.log("Message sent", webhook);
        break;
      case "message_sent":
        console.log("Message sent", webhook);
        break;
      case "message_reaction":
        console.log(`Recieved reaction: ${webhook.reaction}`, webhook);
        break;
      case "group_created":
        console.warn("Not doing anything with groups currently.", webhook);
        break;
      // https://docs.loopmessage.com/imessage-conversation-api/messaging/send-message#handling-failed-cases
      case "message_failed":
        console.warn("Message send failed", webhook);
        break;
      case "message_timeout":
        console.warn("Message timed out", webhook);
        break;
      default:
        console.warn("Unknown alert_type", webhook);
    }

    res.status(200).end();
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
}
