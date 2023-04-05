import { Twilio } from "twilio";
import { NextApiRequest, NextApiResponse } from "next";

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { phoneNumber, message } = req.body;

  if (!phoneNumber || !message) {
    console.error("Missing required params: phoneNumber and message");
    res.status(500).send("Missing required params: phoneNumber and message");
    return;
  }

  try {
    client.messages
      .create({
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: phoneNumber,
        body: message,
      })
      .then((message) => console.log(message.sid));
  } catch (error) {
    console.error("Failed to send SMS", error);
    res.status(500).send("Failed to send SMS");
    return;
  }

  res.status(200).send("okay");
}
