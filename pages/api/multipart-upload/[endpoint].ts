import type { NextApiRequest, NextApiResponse } from "next";
import {
  UploadPartCommand,
  S3Client,
  ListPartsCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as admin from "firebase-admin";
import Mixpanel from "mixpanel";

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "");

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

if (!admin.apps.length)
  admin.initializeApp({
    /* @ts-ignore */
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

const R2_BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME;

const R2 = new S3Client({
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
  const { endpoint } = req.query as {
    endpoint: string;
  };

  switch (endpoint) {
    case "create-multipart-upload":
      return createMultipartUpload(req, res);
    case "prepare-upload-parts":
      return prepareUploadParts(req, res);
    case "complete-multipart-upload":
      return completeMultipartUpload(req, res);
    case "list-parts":
      return listParts(req, res);
    case "abort-multipart-upload":
      return abortMultipartUpload(req, res);
  }

  return res.status(404).end();
}

export async function createMultipartUpload(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { uploadType, fileName, eventId, guestId, fileExt, contentType } =
    req.body;

  const Key =
    uploadType === "interview"
      ? `events/${eventId}/${uploadType}/${guestId}.${fileExt || ""}`
      : `events/${eventId}/media/${guestId}-${fileName}`;

  try {
    const params = {
      Bucket: R2_BUCKET_NAME,
      Key,
      ContentType: contentType,
    };

    const command = new CreateMultipartUploadCommand({ ...params });
    const response = await R2.send(command);

    return res.status(200).json({
      uploadId: response.UploadId,
      key: response.Key,
    });
  } catch (err) {
    console.error("Error", err);
    return res.status(500).json({ source: { status: 500 } });
  }
}

export async function prepareUploadParts(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { partData } = req.body;

  const parts = partData.parts;

  const response = {
    presignedUrls: {},
  };

  for (let part of parts) {
    try {
      const params = {
        Bucket: R2_BUCKET_NAME,
        Key: partData.key,
        PartNumber: part.number,
        UploadId: partData.uploadId,
      };
      const command = new UploadPartCommand({ ...params });
      const url = await getSignedUrl(R2, command, { expiresIn: 3600 });

      /* @ts-ignore */
      response.presignedUrls[part.number] = url;
    } catch (err) {
      console.error("Error", err);
      return res.status(500).json(err);
    }
  }

  return res.status(200).json(response);
}

export async function listParts(req: NextApiRequest, res: NextApiResponse) {
  const { key, uploadId } = req.body;

  try {
    const params = {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    };
    const command = new ListPartsCommand({ ...params });
    const response = await R2.send(command);

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error", err);
    return res.status(500).json(err);
  }
}

export async function completeMultipartUpload(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { uploadType, key, uploadId, parts, eventId, guestId, guests } =
    req.body;

  try {
    const params = {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    };
    const command = new CompleteMultipartUploadCommand({ ...params });
    const response = await R2.send(command);

    const url = `https://${process.env.CLOUDFLARE_BUCKET_NAME}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
    const publicUrl = `${process.env.CLOUDFLARE_PUBLIC_BUCKET_URL}/${key}`;

    const db = admin.firestore();
    if (uploadType === "interview") {
      // Remap guest array to map so it is queryable
      let guestMap: { [key: string]: any } = {};
      guests.forEach((guest: any) => {
        guestMap[guest.id as string] = { id: guest.id, name: guest.name };
      });

      await db
        .collection("events")
        .doc(eventId)
        .collection("interviews")
        .doc(guestId)
        .set({
          guestId,
          url,
          publicUrl,
          guests: guestMap,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      mixpanel.track("Interview uploaded", {
        eventId,
        guestId,
        guests: guests.length,
      });
    } else {
      const filename = key.split("/").pop();

      await db
        .collection("events")
        .doc(eventId)
        .collection("media")
        .doc(filename)
        .set({
          guestId,
          url,
          publicUrl,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      mixpanel.track("Media uploaded", {
        eventId,
        guestId,
      });
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error", err);
    return res.status(500).json(err);
  }
}

export async function abortMultipartUpload(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { key, uploadId } = req.body;

  try {
    const params = {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    };
    const command = new AbortMultipartUploadCommand({ ...params });
    const response = await R2.send(command);

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error", err);
    return res.status(500).json(err);
  }
}
