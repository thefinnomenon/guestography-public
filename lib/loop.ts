import { Guest } from "../types";

type Effect =
  | "slam"
  | "loud"
  | "gentle"
  | "invisibleInk"
  | "echo"
  | "spotlight"
  | "balloons"
  | "confetti"
  | "love"
  | "lasers"
  | "fireworks"
  | "shootingStar"
  | "celebration";

const loopHeaders: HeadersInit = new Headers();

if (!process.env.LOOP_AUTH_KEY || !process.env.LOOP_SECRET_API_KEY)
  throw Error("Missing Loop credentials");

loopHeaders.set("Authorization", process.env.LOOP_AUTH_KEY);
loopHeaders.set("Loop-Secret-Key", process.env.LOOP_SECRET_API_KEY),
  loopHeaders.set("Content-Type", "application/json");

const webhookUrl = (eventId: string) =>
  `${
    process.env.NODE_ENV === "production"
      ? process.env.DOMAIN
      : process.env.REMOTE_DEV_DOMAIN
  }/api/imessage/${eventId}`;

// Send iMessage lookup request for all the guests in the event
export const iMessageLookup = async (eventId: string, guests: Guest[]) => {
  const res = await fetch(
    "https://lookup.loopmessage.com/api/v1/contact/lookup/",
    {
      method: "POST",
      headers: loopHeaders,
      body: JSON.stringify({
        contacts: guests.map((g) => g.phone),
        status_callback: `${webhookUrl(eventId)}/lookup`,
        status_callback_header: process.env.LOOP_WEBHOOK_SECRET,
      }),
    }
  );

  const resJson = await res.json();
  console.log("iMessage Lookup: ", resJson);

  if (!resJson.success) {
    console.error("iMessage Lookup request failed", resJson);
    throw Error(
      `iMessage Lookup request failed: ${resJson.code} ${resJson.message}`
    );
  }
};

export const iMessageSend = async (
  eventId: string,
  recipient: string,
  subject: string,
  text: string,
  attachments?: string[],
  effect?: Effect
) => {
  const res = await fetch(
    "https://lookup.loopmessage.com/api/v1/message/send/",
    {
      method: "POST",
      headers: loopHeaders,
      body: JSON.stringify({
        recipient,
        subject: subject ? subject : undefined,
        text,
        sender_name: process.env.LOOP_SENDER_NAME,
        attachments,
        effect,
        passthrough: JSON.stringify({ eventId }),
        status_callback: `${webhookUrl("")}messaging`,
        status_callback_header: process.env.LOOP_WEBHOOK_SECRET,
      }),
    }
  );

  const resJson = await res.json();
  console.log("iMessage send: ", resJson);

  if (!resJson.success) {
    console.error("iMessage Send request failed", resJson);
    throw Error(
      `iMessage Send request failed: ${resJson.code} ${resJson.message}`
    );
  }
};
