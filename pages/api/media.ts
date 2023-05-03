import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
//import serviceAccount from "../../lib/serviceAccountKey.json";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  if (req.method === "PUT") {
    const { eventId, guestId } = req.query;
    const { fileList } = JSON.parse(req.body);

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

    const urls = await Promise.all(
      keys.map(async (key: string) => {
        return getSignedUrl(
          r2,
          new PutObjectCommand({ Bucket: bucket, Key: key }),
          {
            expiresIn: 3600 * 24 * 7,
          }
        );
      })
    );

    res.status(200).json({ urls });
    return;
  }

  if (req.method === "POST") {
    const { eventId, guestId, media } = req.body;

    const db = admin.firestore();
    const bulkWriter = db.bulkWriter();

    media.map((m: any) => {
      const path = new URL(m.url).pathname;
      const fileName = path.slice(path.lastIndexOf("/") + 1);
      const docRef = db.doc(`events/${eventId}/media/${fileName}`);
      const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_BUCKET_URL}${path}`;
      bulkWriter.set(docRef, {
        guestId,
        url: m.url,
        publicUrl,
        metadata: m.metadata,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    try {
      await bulkWriter.close();
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
