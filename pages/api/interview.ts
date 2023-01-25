import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import serviceAccount from "../../lib/serviceAccountKey.json";
import multer from "multer";
import ShortUniqueId from "short-unique-id";
import {
  S3Client,
  PutObjectCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "",
  },
});

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
    const key = `events/${eventId}/interviews/${guestId}-${new ShortUniqueId({
      length: 4,
    })()}.${fileExt || ""}`;

    console.log(
      `Generating presigned post for storing interview from guest ${guestId} for event ${eventId}\nBucket: ${bucket}\nKey: ${key}`
    );

    const url = await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 3600 * 24 }
    );

    res.status(200).json({ url });
    return;
  }

  if (req.method === "POST") {
    const { eventId, guestId, url, metadata, guests } = req.body;

    const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_BUCKET_URL}${
      new URL(url).pathname
    }`;

    const db = admin.firestore();

    try {
      await db.collection("events").doc(eventId).collection("interviews").add({
        guestId,
        url,
        metadata,
        publicUrl,
        guests,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.status(200).send("Success");
      return;
    } catch (e) {
      console.error(e);
      res.status(400).send(e);
      return;
    }
  }

  res.status(404).send("Invalid action");
}
