import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import serviceAccount from "../../lib/serviceAccountKey.json";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { slugify } from "../../utils/format";
import ShortUniqueId from "short-unique-id";

if (!admin.apps.length)
  admin.initializeApp({
    /* @ts-ignore */
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

type Event = {
  firstName: string;
  lastName: string;
};

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

const columns = [
  "firstName",
  "lastName",
  null,
  "phone",
  "email",
  "address1",
  "address2",
  "city",
  "state",
  "zipcode",
  "country",
  null,
  "rsvp",
  null,
  null,
  null,
  null,
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = admin.firestore();
  const { fields: event, files } = await parseFormData(req, res);

  // TODO: Validate event info and create event entry

  // Parse guest list CSV and add to event
  if (files[0])
    event["guest-list"] = await parse(files[0].buffer, { columns, from: 2 });

  // Map over guest list & add unique guest ids
  const uid = new ShortUniqueId();
  event["guest-list"] = event["guest-list"].map((guest: any) => {
    return { ...guest, id: uid() };
  });

  // Generate URL safe event ids
  const eventId = `${slugify(event.title)}-${new ShortUniqueId({
    length: 4,
  })()}`;

  // Store event in db
  try {
    await db.collection("events").doc(eventId).create(event);
    console.log("Created record for event: ", event);
  } catch (e) {
    console.error(e);
  }

  res.status(200).redirect("/success-page");
}
