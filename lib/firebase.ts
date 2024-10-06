import * as admin from "firebase-admin";
// import serviceAccount from "../lib/serviceAccountKey.json";
import { Event, GuestEventRecord, Interview, Media } from "../types";
import { determineValidGuests } from "../utils/contacts";

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

export const getGuests = async (eventId: string) => {
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection("guests")
      .where("eventId", "==", eventId)
      .get();
    return snapshot.docs.map((doc) => {
      return doc.data() as GuestEventRecord;
    });
  } catch (e) {
    console.log(e);
    throw e;
  }
};

export const updateGuestList = async (
  eventId: string,
  guestList: Partial<GuestEventRecord>[],
  newGuests: Partial<GuestEventRecord>[]
) => {
  const db = admin.firestore();
  const event = (
    await db.collection("events").doc(eventId).get()
  ).data() as Event;

  console.log("Determining unique guests", { eventId, guestList, newGuests });
  const uniqueGuests = determineValidGuests(guestList, newGuests);
  const batch = db.batch();
  console.log("Adding unique guests", uniqueGuests);
  uniqueGuests.map((guest) =>
    batch.create(db.collection("guests").doc(), {
      eventId: eventId,
      eventStatus: event.status,
      iMessage: false,
      optedIn: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone,
    })
  );
  await batch.commit();
  return [...uniqueGuests, ...guestList];
};

export const addGuest = async (
  eventId: string,
  guest: Partial<GuestEventRecord>
) => {
  console.log("Checking if guest is already enrolled", { eventId, guest });
  const db = admin.firestore();
  const alreadyEnrolled =
    (
      await db
        .collection("guests")
        .where("eventId", "==", eventId)
        .where("phone", "==", guest.phone)
        .get()
    ).size !== 0;
  if (alreadyEnrolled) {
    console.log("Guest already enrolled", { eventId, guest });
    return;
  }

  const event = (
    await db.collection("events").doc(eventId).get()
  ).data() as Event;

  console.log("Adding guest", { eventId, guest });
  db.collection("guests").doc().create({
    eventId: eventId,
    eventStatus: event.status,
    iMessage: false,
    optedIn: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    firstName: guest.firstName,
    lastName: guest.lastName,
    phone: guest.phone,
  });
};
