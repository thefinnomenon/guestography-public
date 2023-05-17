import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
// import serviceAccount from "../../lib/serviceAccountKey.json";
import ShortUniqueId from "short-unique-id";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Guest } from "../../types";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "",
  },
});

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
  if (req.method === "GET") {
    const { eventId, guestId, fileExt } = req.query;

    if (typeof eventId != "string") {
      res.status(400).json({ error: "Invalid eventId" });
      return;
    }

    if (typeof guestId != "string") {
      res.status(400).json({ error: "Invalid guestId" });
      return;
    }

    const bucket = process.env.CLOUDFLARE_BUCKET_NAME;
    const key = `events/${eventId}/interviews/${guestId}.${fileExt || ""}`;

    try {
      const url = await getSignedUrl(
        r2,
        new PutObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: 3600 * 24 * 7 }
      );
      res.status(200).json({ url });
      return;
    } catch (error) {
      console.error('Failed to create signed interview url');
      throw error;
    }
  }

  if (req.method === "POST") {
    const { eventId, guestId, url, metadata, guests } = req.body;

    const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_BUCKET_URL}${
      new URL(url).pathname
    }`;

    // Remap guest array to map so it is queryable
    let guestMap: { [key: string]: any } = {};
    guests.forEach((guest: any) => {
      guestMap[guest.id as string] = { id: guest.id, name: guest.name };
    });

    const db = admin.firestore();

    try {
      await db
        .collection("events")
        .doc(eventId)
        .collection("interviews")
        .doc(guestId)
        .set({
          guestId,
          url,
          metadata,
          publicUrl,
          guests: guestMap,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      res.status(200).send("Success");
      return;
    } catch (e) {
      console.error(e);
      throw (e);
    }
  }

  res.status(404).send("Invalid action");
}
