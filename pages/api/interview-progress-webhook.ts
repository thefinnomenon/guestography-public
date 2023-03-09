import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import serviceAccount from "../../lib/serviceAccountKey.json";
import {
  MediaConvertClient,
  CreateJobCommand,
} from "@aws-sdk/client-mediaconvert";

const ENDPOINT = {
  endpoint: "https://mqm13wgra.mediaconvert.us-east-2.amazonaws.com",
  region: "us-east-2",
};

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

  res.status(200).send("okay");
}
