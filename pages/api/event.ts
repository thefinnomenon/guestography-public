import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import serviceAccount from "../../lib/serviceAccountKey.json";
import multer from "multer";
import { parse } from "csv-parse/sync";

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
  const { fields, files } = await parseFormData(req, res);
  if (files[0]) {
    fields["guest-list"] = await parse(files[0].buffer, { columns, from: 2 });
  }

  console.log(fields);

  try {
    await db.collection("events").doc().create(fields);
    console.log("Created record for event: ", fields);
  } catch (e) {
    console.error(e);
  }

  // TODO: Format for Firebase and create Firestore records
  // TODO: Validate user info, check if user with "email" exists and if not, create user entry
  // TODO: Validate event info and create event entry

  res.status(200).redirect("/success-page");
}
