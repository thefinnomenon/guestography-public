import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import serviceAccount from "../../lib/serviceAccountKey.json";

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
  console.log("Received MediaConvert interview progress update!");
  console.log(req.body);

  const status = req.body.detail.status;

  if (status === "ERROR") {
    res.status(500).send("Failed to create interview video");
    return;
  }

  const outputDetails = req.body.detail.outputGroupDetails[0].outputDetails[0];
  const videoWidth = outputDetails.videoDetails.widthInPx;
  const videoHeight = outputDetails.videoDetails.heightInPx;
  const filePath = outputDetails.outputFilePaths[0];
  const eventId = filePath.split("/")[4];

  // Download interview video
  // Upload to R2
  // Create database record
  // Delete from S3

  res.status(200).send("okay");
}
