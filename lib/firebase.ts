import * as admin from "firebase-admin";
import serviceAccount from "../lib/serviceAccountKey.json";
import { Event } from "../types";

if (!admin.apps.length)
  admin.initializeApp({
    /* @ts-ignore */
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

export const getEvents = async () => {
  try {
    const db = admin.firestore();
    return await (
      await db.collection("events").get()
    ).docs;
  } catch (e) {
    throw e;
  }
};

export const getEvent = async (eventId: string) => {
  try {
    const db = admin.firestore();
    return (await (
      await db.collection("events").doc(eventId).get()
    ).data()) as Event;
  } catch (e) {
    throw e;
  }
};
