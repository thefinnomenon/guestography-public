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

async function parseFormData(
  req: NextApiRequest & { files?: any },
  res: NextApiResponse
) {
  const storage = multer.memoryStorage();
  const multerUpload = multer({ storage });
  const multerFiles = multerUpload.any();
  await new Promise((resolve, reject) => {
    multerFiles(req as any, res as any, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
  return {
    fields: req.body,
    files: req.files,
  };
}

// IMPORTANT: Prevents next from trying to parse the form
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    const key = `${eventId}/interviews/${guestId}-${new ShortUniqueId({
      length: 4,
    })()}.${fileExt || ""}`;

    console.log(
      `Generating presigned post for storing interview from guest ${guestId} for event ${eventId}\nBucket: ${bucket}\nKey: ${key}`
    );

    const url = await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: bucket, Key: key, ACL: "public-read" }),
      { expiresIn: 3600 * 24 }
    );

    res.status(200).json({ url });
    return;
  }

  if (req.method === "POST") {
    const { eventId, guestId, url, guests } = req.body;
    console.log(
      `Storing metadata for interview from guest ${guestId} for ${eventId}\n Url: ${url}\n Guests in video: ${guests}`
    );

    //const db = admin.firestore();
  }

  const db = admin.firestore();
  const { fields, files } = await parseFormData(req, res);

  // Map over guest list & add unique guest ids
  const uid = new ShortUniqueId();

  // Store event in db
  // try {
  //   await db.collection("events").doc(eventId).create(event);
  //   console.log("Created record for event: ", event);
  // } catch (e) {
  //   console.error(e);
  // }

  res.status(200).redirect("/success-page");
}
