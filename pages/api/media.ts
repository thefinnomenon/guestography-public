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
  if (req.method === "PUT") {
    const { eventId, guestId } = req.query;
    const { fileList } = JSON.parse(req.body);

    console.log("fileList", fileList);

    if (typeof eventId != "string") {
      res.status(400).json({ error: "Invalid eventId" });
      return;
    }

    if (typeof guestId != "string") {
      res.status(400).json({ error: "Invalid guestId" });
      return;
    }

    const bucket = process.env.CLOUDFLARE_BUCKET_NAME;
    const keys = fileList.map(
      (fileName: string) => `events/${eventId}/media/${guestId}-${fileName}`
    );

    console.log(
      `Generating presigned post for storing media from guest ${guestId} for event ${eventId}\nBucket: ${bucket}\Keys:\n ${keys}`
    );

    const urls = await Promise.all(
      keys.map(async (key: string) => {
        return getSignedUrl(
          r2,
          new PutObjectCommand({ Bucket: bucket, Key: key }),
          {
            expiresIn: 3600 * 24,
          }
        );
      })
    );

    console.log("Presigned Urls: ", urls);

    res.status(200).json({ urls });
    return;
  }

  // TODO: Loop through URLS & batch write records
  if (req.method === "POST") {
    const { eventId, guestId, urls } = req.body;

    const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_BUCKET_URL}${
      new URL(url).pathname
    }`;
    console.log(
      `Storing metadata for interview from guest ${guestId} for ${eventId}\nUrl: ${url}\nPublic Url: ${publicUrl}\nGuests in video: ${guests}`
    );

    const db = admin.firestore();

    try {
      await db
        .collection("events")
        .doc(eventId)
        .collection("interviews")
        .add({ guestId, url, publicUrl, guests });
      console.log("Created record for interview");
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
