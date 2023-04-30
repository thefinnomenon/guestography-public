import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
// import serviceAccount from "../../lib/serviceAccountKey.json";

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

if (!admin.apps.length)
  admin.initializeApp({
    /* @ts-ignore */
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

import { S3, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3({ region: "us-east-1" });

const r2 = new S3({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "",
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const status = req.body.detail.status;
  if (status === "ERROR") {
    res.status(500).send("Failed to create interview video");
    return;
  }

  const outputDetails = req.body.detail.outputGroupDetails[0].outputDetails[0];
  const videoWidth = outputDetails.videoDetails.widthInPx;
  const videoHeight = outputDetails.videoDetails.heightInPx;
  const filePath = outputDetails.outputFilePaths[0];
  const Bucket = filePath.split("/")[2];
  const Key = filePath.replace(`s3://${Bucket}/`, "");
  const eventId = filePath.split("/")[4];

  // Download interview from s3
  let interviewVideo;
  try {
    interviewVideo = await (
      await s3.getObject({ Bucket, Key })
    ).Body?.transformToByteArray();
  } catch (error) {
    console.error("Error while downloading object from S3", error);
    res.status(500).send("Failed to download object from s3");
    return;
  }

  // Upload interview to r2
  let r2Key = `events/${eventId}/interviews/interview.mp4`;
  try {
    await r2.putObject({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: r2Key,
      ContentType: "video/mp4",
      Body: interviewVideo,
    });
  } catch (error) {
    console.error("Failed to upload to R2", error);
    res.status(500).send("Failed to upload to R2");
    return;
  }

  // Add firebase record for interview
  try {
    const db = admin.firestore();
    const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_BUCKET_URL}/${r2Key}`;
    await db
      .collection("events")
      .doc(eventId)
      .collection("interviews")
      .doc("interview")
      .set({
        guestId: "",
        url: "",
        metadata: {
          width: videoWidth,
          height: videoHeight,
          type: "video",
          fileExt: "mp4",
        },
        publicUrl,
        guests: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error("Failed to create Firebase record", error);
    res.status(500).send("Failed to create Firebase record");
    return;
  }

  // Delete interview from S3
  try {
    await s3.deleteObject({ Bucket, Key });
  } catch (error) {
    console.error("Failed to delete from S3", error);
    res.status(500).send("Failed to delete from S3");
    return;
  }

  res.status(200).send("okay");
}
