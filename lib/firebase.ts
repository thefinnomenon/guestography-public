import * as admin from "firebase-admin";
// import serviceAccount from "../lib/serviceAccountKey.json";
import { Event, Interview, Media } from "../types";

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

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

    // Query for media in ascending order by createdAt
    const snapshot = await db
      .collection(`events/${eventId}/media`)
      .where("metadata.createdAt", "!=", null)
      .orderBy("metadata.createdAt", "asc")
      .get();
    let media = snapshot.docs.map((doc) => {
      return {
        ...(doc.data() as Media),
        id: doc.id,
      };
    });

    // Query for unsorted media (media without createdAt)
    const snapshot2 = await db
      .collection(`events/${eventId}/media`)
      .where("metadata.createdAt", "==", null)
      .get();
    let unsortedMedia = snapshot2.docs.map((doc) => {
      return {
        ...(doc.data() as Media),
        id: doc.id,
      };
    });

    // Filter out any media that doesn't have height & widths
    media = media.filter((m) => m.metadata.height && m.metadata.width);
    unsortedMedia = unsortedMedia.filter(
      (m) => m.metadata.height && m.metadata.width
    );

    return { media, unsortedMedia };
  } catch (e) {
    console.log(e);
    throw e;
  }
};
