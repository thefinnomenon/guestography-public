import admin from "firebase-admin";
import * as functions from "firebase-functions";
// import * as async from "async";
const { CloudTasksClient } = require("@google-cloud/tasks");

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
    /* @ts-ignore */
    const parent = client.queuePath(
      "guestography-37df8",
      "us-east4",
      "guestography"
    );

    switch (event.status) {
      case "PAID":
        console.log(`Event ${eventId} has been paid. Scheduling...`);

        const now = new Date();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (
          new Date(event.date).getMilliseconds() - now.getTime() >=
          thirtyDaysInMs
        ) {
          console.log(
            `Event ${eventId} is ${
              (new Date(event.date).getMilliseconds() - now.getTime()) /
              (1000 * 60 * 60 * 24)
            } days away so setting to WAITING.`
          );
          // TODO: if event is >30 days away, update event status to WAITING and return
          return;
        }

        // TODO: schedule events
        const tasks = createTasks(eventId, event);
        console.log("Tasks: ", tasks);
        // const schedulingRes = await async.eachLimit(
        //   tasks,
        //   20,
        //   (task) => console.log("Scheduled task: ", task)
        //   //scheduleTask(parent, task)
        // );
        // console.log("Scheduling results: ", schedulingRes);

        // TODO: update event status to SCHEDULED
        break;
      default:
        console.log(`Event ${eventId} has unhandled status ${event.status}`);
    }
  });

/* @ts-ignore */
const scheduleTask = async (parent: any, task: any) => {
  try {
    const [response] = await client.createTask({ parent, task });
    console.log(`Created task ${response.name}`);
    return { error: false, data: response.name };
  } catch (error: any) {
    console.error(Error(error.message));
    return { error: true, message: error.message };
  }
};

const formatTime = (date: string) => {
  const convertedDate = new Date(date);
  const currentDate = new Date();

  // Schedule time can not be in the past.
  if (convertedDate < currentDate) {
    console.error("Scheduled date in the past.");
  } else if (convertedDate > currentDate) {
    const date_diff_in_seconds =
      convertedDate.getSeconds() - currentDate.getSeconds();
    // Restrict schedule time to the 30 day maximum.
    if (date_diff_in_seconds > MAX_SCHEDULE_LIMIT) {
      console.error("Schedule time is over 30 day maximum.");
    }
    // Construct future date in Unix time.
    const date_in_seconds =
      Math.min(date_diff_in_seconds, MAX_SCHEDULE_LIMIT) + Date.now() / 1000;
    // Add schedule time to request in Unix time using Timestamp structure.
    // https://googleapis.dev/nodejs/tasks/latest/google.protobuf.html#.Timestamp
    return {
      seconds: date_in_seconds,
    };
  }

  return {};
};

const createTasks = (eventId: string, event: any) => {
  // Iterate through guests & create tasks
  const tasks: any[] = [];
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
          url: `https://guestography.net/api/sendSMS`,
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
          url: `https://guestography.net/api/sendSMS`,
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
            seconds: formatTime(event.endDate),
          },
        },
      };
      tasks.push(videoGenerationTask);
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
          url: `https://guestography.net/api/sendSMS`,
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
          url: `https://guestography.net/api/sendSMS`,
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
        url: `https://guestography.net/api/sendSMS`,
        body: formatBody({
          eventId,
          guest,
          type: "galleryReadyMessage",
        }),
        scheduleTime: {
          seconds: formatTime(getNextMorning(event.endDate)),
        },
      },
    };
    tasks.push(galleryReadyMessageTask);
  });

  return tasks;
};

const formatBody = (payload: { [key: string]: any }) => {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
};

const getNextMorning = (start: string) => {
  if (!start) return "";
  let d = new Date(start);
  d.setDate(d.getDate() + 1);
  d.setUTCHours(10);
  d.setMinutes(0);
  return d.toISOString().slice(0, -1);
};
