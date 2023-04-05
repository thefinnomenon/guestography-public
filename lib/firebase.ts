import * as admin from "firebase-admin";
import serviceAccount from "../lib/serviceAccountKey.json";
import { Event, Interview, Media } from "../types";

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
    console.log(e);
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
    console.log(e);
    throw e;
  }
};

export const getInterviews = async (eventId: string) => {
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection(`events/${eventId}/interviews`)
      .orderBy("createdAt", "asc")
      .get();
    return snapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
      };
    });
  } catch (e) {
    console.log(e);
    throw e;
  }
};

export const getInterview = async (eventId: string) => {
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection(`events/${eventId}/interviews`)
      .doc("interview")
      .get();
    return snapshot.data();
  } catch (e) {
    console.log(e);
    throw e;
  }
};

export const getMedia = async (eventId: string) => {
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection(`events/${eventId}/media`)
      .orderBy("createdAt", "asc")
      .get();
    return snapshot.docs.map((doc) => {
      return {
        ...(doc.data() as Media),
        id: doc.id,
      };
    });
  } catch (e) {
    console.log(e);
    throw e;
  }
};
