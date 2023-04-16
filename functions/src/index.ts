import async from "async";
import admin from "firebase-admin";
import * as functions from "firebase-functions";
import { CloudTasksClient } from "@google-cloud/tasks";
import { limit } from "./parallel";

admin.initializeApp();

const client = new CloudTasksClient();

// Represents 30 days in seconds
const MAX_SCHEDULE_LIMIT = 30 * 60 * 60 * 24;

// Handle event status change
export const handleEventStatusChange = functions.firestore
  .document("events/{eventId}")
  .onUpdate(async (change, context) => {
    const { eventId } = context.params;
    const oldEvent = change.before.data() as any;
    const event = change.after.data() as any;

    // Ignore if no status change
    if (oldEvent.status === event.status) return;

    console.log(
      `Event ${eventId} status change ${oldEvent.status} to ${event.status}`
    );

    // Configure queue
    const parent = client.queuePath(
      "guestography-37df8",
      "us-east4",
      "guestography-tasks"
    );

    const db = admin.firestore();

    switch (event.status) {
      case "PAID":
        console.log(`Event ${eventId} has been paid. Scheduling...`);

        // If event is >30 days away (Google tasks limit),
        // set event status to WAITING to be scheduled later
        const nowSeconds = new Date().getTime() / 1000;
        const secondsTillEvent =
          new Date(event.date).getTime() / 1000 - nowSeconds;
        if (secondsTillEvent >= 60 * 60 * 24 * 30) {
          console.log(
            `Event ${eventId} is ${Math.floor(
              secondsTillEvent / (60 * 60 * 24)
            )} days away so setting to WAITING.`
          );

          try {
            await db
              .collection("events")
              .doc(eventId)
              .update({ status: "WAITING" });
            console.log(`Updated event ${eventId} with status WAITING`);
          } catch (e) {
            console.error(e);
          }
          return;
        }

        // For events within 30 days, we can just schedule them now
        await scheduleEvents([
          {
            eventId,
            event,
          },
        ]);
        break;
      default:
        console.log(`Event ${eventId} has unhandled status ${event.status}`);
    }
  });

// Every day at midnight find and schedule events with
// status WAITING and that start within 30 days
exports.scheduledWaitingEvents = functions.pubsub
  .schedule("* * * * *")
  // .schedule("0 0 * * *")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Scheduling waiting events...");
    const db = admin.firestore();

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const eventsToBeScheduledRes = await db
      .collection("events")
      .where("status", "==", "WAITING")
      .where("date", "<", thirtyDaysFromNow.toTimeString())
      .get();

    const events = eventsToBeScheduledRes.docs.map((event: any) => {
      console.log(event);
      return { eventId: event.id, event: event.data() };
    });

    console.log("events: ", events);

    const schedulingRes = await scheduleEvents(events);
    console.log("Scheduling results: ", schedulingRes);
  });

const scheduleEvents = async (events: any) => {
  const db = admin.firestore();
  console.log(
    "Scheduling events: ",
    events.map((event: any) => event.eventId)
  );

  const eventsFuncArr = await events.map((eventObj: any) => {
    return async () => {
      const tasks = createTasks(eventObj.eventId, eventObj.event);
      const tasksFuncArr = await tasks.map((task) => {
        // scheduleTask(parent, task)
        return () => console.log("Scheduled task: ", task);
      });
      const scheduleTasksRes = await limit(tasksFuncArr, 10);
      console.log("Tasks scheduling results: ", scheduleTasksRes);

      try {
        await db
          .collection("events")
          .doc(eventObj.eventId)
          .update({ status: "SCHEDULED" });
        console.log(`Updated event ${eventObj.eventId} with status SCHEDULED`);
      } catch (e) {
        console.error(e);
      }
    };
  });
  const scheduleEventsRes = await limit(eventsFuncArr, 10);

  console.log("Events Scheduling results: ", scheduleEventsRes);
};

const formatTime = (date: string) => {
  const convertedDate = new Date(date);
  const currentDate = new Date();

  // Schedule time can not be in the past.
  if (convertedDate < currentDate) {
    console.error("Scheduled date in the past.");
  } else if (convertedDate > currentDate) {
    const dateDiffInSeconds =
      convertedDate.getSeconds() - currentDate.getSeconds();
    // Restrict schedule time to the 30 day maximum.
    if (dateDiffInSeconds > MAX_SCHEDULE_LIMIT) {
      console.error("Schedule time is over 30 day maximum.");
    }
    // Construct future date in Unix time.
    const dateInSeconds =
      Math.min(dateDiffInSeconds, MAX_SCHEDULE_LIMIT) + Date.now() / 1000;
    // Add schedule time to request in Unix time using Timestamp structure.
    // https://googleapis.dev/nodejs/tasks/latest/google.protobuf.html#.Timestamp
    return {
      seconds: dateInSeconds,
    };
  }

  return {};
};

const createTasks = (eventId: string, event: any) => {
  // Iterate through guests & create tasks
  const tasks: any[] = [];

  // Add guest tasks
  event.guests.map((guest: any) => {
    // Interview Service Tasks
    if (event.interviews.enabled) {
      // Initial Message Task
      const interviewInitialMessageTask = {
        httpRequest: {
          headers: {
            "Content-Type": "text/json",
          },
          httpMethod: "POST",
          url: "https://guestography.net/api/sendSMS",
          body: formatBody({
            eventId,
            guest,
            type: "interviewInitialMessage",
          }),
          scheduleTime: {
            seconds: formatTime(event.interviews.initialMessage.schedule),
          },
        },
      };
      tasks.push(interviewInitialMessageTask);

      // Reminder Message Task
      const interviewReminderMessageTask = {
        httpRequest: {
          headers: {
            "Content-Type": "text/json",
          },
          httpMethod: "POST",
          url: "https://guestography.net/api/sendSMS",
          body: formatBody({
            eventId,
            guest,
            type: "interviewReminderMessage",
          }),
          scheduleTime: {
            seconds: formatTime(event.interviews.reminderMessage.schedule),
          },
        },
      };
      tasks.push(interviewReminderMessageTask);
    }

    // Media Service Tasks
    if (event.media.enabled) {
      // Initial Message Task
      const mediaInitialMessageTask = {
        httpRequest: {
          headers: {
            "Content-Type": "text/json",
          },
          httpMethod: "POST",
          url: "https://guestography.net/api/sendSMS",
          body: formatBody({
            eventId,
            guest,
            type: "mediaInitialMessage",
          }),
          scheduleTime: {
            seconds: formatTime(event.media.initialMessage.schedule),
          },
        },
      };
      tasks.push(mediaInitialMessageTask);

      // Collection Message Task
      const mediaCollectionMessageTask = {
        httpRequest: {
          headers: {
            "Content-Type": "text/json",
          },
          httpMethod: "POST",
          url: "https://guestography.net/api/sendSMS",
          body: formatBody({
            eventId,
            guest,
            type: "mediaCollectionMessage",
          }),
          scheduleTime: {
            seconds: formatTime(event.media.collectionMessage.schedule),
          },
        },
      };
      tasks.push(mediaCollectionMessageTask);
    }

    // Gallery Ready Message Task
    const galleryReadyMessageTask = {
      httpRequest: {
        headers: {
          "Content-Type": "text/json",
        },
        httpMethod: "POST",
        url: "https://guestography.net/api/sendSMS",
        body: formatBody({
          eventId,
          guest,
          type: "galleryReadyMessage",
        }),
        scheduleTime: {
          seconds: formatTime(getNextMorning(event.dateEnd)),
        },
      },
    };
    tasks.push(galleryReadyMessageTask);
  });

  // Add event tasks
  if (event.interviews.enabled) {
    // Video Generation Task
    const videoGenerationTask = {
      httpRequest: {
        headers: {
          "Content-Type": "text/json",
        },
        httpMethod: "POST",
        url: `https://guestography.net/api/createInterviewVideo?eventId=${eventId}`,
        body: "",
        scheduleTime: {
          seconds: formatTime(event.dateEnd),
        },
      },
    };
    tasks.push(videoGenerationTask);
  }

  return tasks;
};

const formatBody = (payload: { [key: string]: any }) => {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
};

const getNextMorning = (start: string) => {
  if (!start) return "";
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  d.setUTCHours(10);
  d.setMinutes(0);
  return d.toISOString().slice(0, -1);
};
