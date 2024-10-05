import dotenv from "dotenv";
dotenv.config();
import admin from "firebase-admin";
import * as functions from "firebase-functions";
import { CloudTasksClient } from "@google-cloud/tasks";
const Sentry = require("@sentry/serverless");
import { limit } from "./parallel.js";
import { defineSecret } from "firebase-functions/params";
import path from "path";
import os from "os";
const fs = require("fs").promises;
const fetch = require("cross-fetch");
const util = require("node:util");
const sanitize = require("sanitize-filename");
const exec = util.promisify(require("node:child_process").exec);
import { getPlaiceholder } from "plaiceholder";
import * as ExifReader from "exifreader";
import sizeOf from "image-size";
import { S3 } from "@aws-sdk/client-s3";
import Mixpanel from "mixpanel";
const got = require("got");
import { fromStream } from "file-type";
// eslint-disable-next-line import/default
import MediaInfo from "mediainfo.js";
import { createHash } from "crypto";
const url = require("url");
const https = require("https");
import { Event, Guest, GuestEventRecord } from "../../types.js";

const webhookSecret = defineSecret("WEBHOOK_SECRET");
const cloudflareAccessKeyId = defineSecret("CLOUDFLARE_ACCESS_KEY_ID");
const cloudflareSecretAccessKey = defineSecret("CLOUDFLARE_SECRET_ACCESS_KEY");

admin.initializeApp();

const client = new CloudTasksClient();
const parent = client.queuePath(
  "guestography-37df8",
  "us-east4",
  "guestography-tasks"
);

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN || "");

Sentry.GCPFunction.init({
  dsn: "https://52517b2e72d642219339750bae5900eb@o371187.ingest.sentry.io/4505183181733888",
  enabled: !process.env.FUNCTIONS_EMULATOR,
  tracesSampleRate: 1.0,
});

// Represents 20 days in seconds
const MAX_SCHEDULE_LIMIT = 20 * 60 * 60 * 24;

// Get random offset into message window
const MESSAGE_WINDOW_SECONDS = 5 * 60;
const getSecondsOffsetInMessageWindow = () =>
  Math.floor(Math.random() * (MESSAGE_WINDOW_SECONDS + 1));

// Handle event status change
export const handleEventStatusChange = functions
  .runWith({ secrets: [webhookSecret] })
  .firestore.document("events/{eventId}")
  .onUpdate(async (change, context) => {
    const { eventId } = context.params;
    const oldEvent = change.before.data() as Event;
    const event = change.after.data() as Event;

    console.log(`handleEventStatusChange for ${eventId}`, { oldEvent, event });

    // If change in hasSentGalleryMessage, schedule gallery message send for event
    if (
      oldEvent.hasSentGalleryMessage !== event.hasSentGalleryMessage &&
      event.hasSentGalleryMessage
    ) {
      await scheduleGalleryMessageSendTasks(eventId, webhookSecret.value());
      return;
    }

    // Ignore if no status change
    if (oldEvent.status === event.status) return;

    console.log(
      `Event ${eventId} status change ${oldEvent.status} to ${event.status}`
    );

    switch (event.status) {
      case "PAID":
        console.log("Event paid!", eventId);

        // Organizer Manage Event Text
        // Send intial message to event organizer after scheduling (immediate)
        const setOrganizerScheduledEvent = {
          httpRequest: {
            headers: {
              "Content-Type": "text/json",
            },
            httpMethod: "POST",
            url: "https://guestography.com/api/send",
            body: formatBody({
              secret: webhookSecret.value(),
              eventId,
              guestId: "organizer",
              type: "organizerScheduledEvent",
            }),
          },
        };
        await scheduleTask(parent, setOrganizerScheduledEvent);
        console.log("Scheduled organizerScheduledEvent for now", eventId);
        break;
      case "SCHEDULED":
        console.log("Event scheduled!", eventId);
        break;
      case "ACTIVE":
        console.log("Event active!", eventId);
        break;
      case "COMPLETED":
        console.log("Event completed!", eventId);
        break;
      default:
        console.error(`Event ${eventId} has unhandled status ${event.status}`);
        Sentry.captureException(
          `Event ${eventId} has unhandled status ${event.status}`
        );
        await Sentry.flush(2000);
        throw new Error(
          `Event ${eventId} has unhandled status ${event.status}`
        );
    }
  });

// Every hour schedule events within two hours
exports.scheduledWaitingEvents = functions
  .runWith({ secrets: [webhookSecret] })
  .pubsub.schedule("0 * * * *")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Scheduling events starting within two hours...");

    try {
      const db = admin.firestore();

      const twoHoursFromNow = new Date();
      twoHoursFromNow.setDate(twoHoursFromNow.getTime() + 2 * 60 * 60 * 1000);

      // Query for PAID events that start within 2 hours
      const eventsToBeScheduledRes = await db
        .collection("events")
        .where("status", "==", "PAID")
        .where("date", "<", twoHoursFromNow.toISOString())
        .get();

      console.log(
        `Found ${eventsToBeScheduledRes.size} events that need to be scheduled.`
      );

      // Format events
      const events = eventsToBeScheduledRes.docs.map((event: any) => {
        return { eventId: event.id, event: event.data() };
      });

      // Schedule events
      await scheduleEvents(webhookSecret.value(), events);
      console.log("Scheduled events");
    } catch (error) {
      console.error("Failed to schedule waiting events", error);
      Sentry.captureException(error);
      await Sentry.flush(2000);
      throw error;
    }
  });

const scheduleEvents = async (
  webhookSecret: string,
  events: { eventId: string; event: Event }[]
) => {
  console.log(
    "Scheduling events: ",
    events.map((event: any) => event.eventId)
  );

  const db = admin.firestore();

  // Create event scheduling function array
  const eventsFuncArr = await events.map((eventObj) => {
    return async () => {
      try {
        // Create tasks
        const tasks = await createTasks(
          webhookSecret,
          eventObj.eventId,
          eventObj.event
        );
        console.log(`Created ${tasks.length} tasks`);

        // Schedule tasks in parallel
        const tasksFuncArr = await tasks.map((task) => {
          return async () => await scheduleTask(parent, task);
        });
        const scheduleTasksRes = await limit(tasksFuncArr, 10);
        console.log(
          `Scheduled ${scheduleTasksRes.filter((res: any) => res)}/${
            tasks.length
          } tasks`
        );

        // Update event status to scheduled
        await db
          .collection("events")
          .doc(eventObj.eventId)
          .update({ status: "SCHEDULED" });
        console.log(`Updated event ${eventObj.eventId} with status SCHEDULED`);

        const eventForAnalytics = {
          ...eventObj.event,
          phone: null,
          email: null,
        };
        mixpanel.track("Event scheduled", { event: eventForAnalytics });

        return true;
      } catch (error) {
        console.error("Failed to schedule event", error);
        Sentry.captureException(error);
        await Sentry.flush(2000);

        return false;
      }
    };
  });

  // Schedule events in parallel
  const scheduleEventsRes = await limit(eventsFuncArr, 10);
  console.log(
    `Scheduled ${scheduleEventsRes.filter((res: any) => res)}/${
      events.length
    } events`
  );
};

const scheduleTask = async (parent: any, task: any) => {
  try {
    const [response] = await client.createTask({ parent, task });
    console.log(`Scheduled task ${response.name}`);
    return true;
  } catch (error) {
    console.error("Failed to schedule task", error);
    Sentry.captureException(error);
    await Sentry.flush(2000);
    return false;
  }
};

const createTasks = async (secret: string, eventId: string, event: Event) => {
  const db = admin.firestore();
  // Iterate through guests & create tasks
  const tasks: any[] = [];

  // Event Status Update Tasks
  // Set active 2 hours before event
  // - Updates event record to active
  // - Updates all guest records for event to active
  // - Triggers iMessage lookups for all event guests
  const setEventActiveTask = {
    httpRequest: {
      headers: {
        "Content-Type": "text/json",
      },
      httpMethod: "POST",
      url: "https://guestography.com/api/event-status",
      body: formatBody({
        secret,
        eventId,
        status: "ACTIVE",
      }),
    },
  };
  tasks.push(setEventActiveTask);

  // Organizer Event Start
  // Send intial message to event organizer at event startAt
  const setOrganizerEventStart = {
    httpRequest: {
      headers: {
        "Content-Type": "text/json",
      },
      httpMethod: "POST",
      url: "https://guestography.com/api/send",
      body: formatBody({
        secret,
        eventId,
        guestId: "organizer",
        type: "organizerEventStart",
      }),
    },
    scheduleTime: {
      seconds: formatTime(event.startAt),
    },
  };
  tasks.push(setOrganizerEventStart);

  const guests = (
    await db.collection("guests").where("eventId", "==", eventId).get()
  ).docs.map((doc) => doc.data()) as GuestEventRecord[];

  // Add guest tasks
  guests.map((guest: any) => {
    const guestId = guest.id;

    // Initial Message Task
    // Send initial message (Hi, this event is using Guestography...) at event startAt
    const mediaInitialMessageTask = {
      httpRequest: {
        headers: {
          "Content-Type": "text/json",
        },
        httpMethod: "POST",
        url: "https://guestography.com/api/send",
        body: formatBody({
          secret,
          eventId,
          guestId,
          type: "mediaInitialMessage",
        }),
      },
      scheduleTime: {
        seconds: formatTime(event.startAt),
      },
    };
    tasks.push(mediaInitialMessageTask);
  });

  return tasks;
};

const scheduleGalleryMessageSendTasks = async (
  eventId: string,
  secret: string
) => {
  const db = admin.firestore();
  const guests = (
    await db.collection("guests").where("eventId", "==", eventId).get()
  ).docs.map((doc) => doc.data()) as GuestEventRecord[];

  const scheduleTasksPromises = guests.map((guest) => {
    const task = {
      httpRequest: {
        headers: {
          "Content-Type": "text/json",
        },
        httpMethod: "POST",
        url: "https://guestography.com/api/send",
        body: formatBody({
          secret,
          eventId,
          guestId: guest.id,
          type: "galleryReadyMessage",
        }),
      },
    };
    return async () => scheduleTask(parent, task);
  });

  const res = await limit(scheduleTasksPromises, 100);
  console.log(`Scheduled galleryReadyMessage for Event ${eventId}`, res);
};

const formatTime = (date: string) => {
  const convertedDate = new Date(date);
  const currentDate = new Date();

  // Schedule time can not be in the past.
  if (convertedDate <= currentDate)
    throw new Error("Scheduled date in the past.");

  const dateDiffInSeconds =
    (convertedDate.getTime() - currentDate.getTime()) / 1000;

  // Restrict schedule time to the 20 day maximum.
  if (dateDiffInSeconds > MAX_SCHEDULE_LIMIT)
    throw new Error("Schedule time is over 20 day maximum.");

  return (
    dateDiffInSeconds + Date.now() / 1000 + getSecondsOffsetInMessageWindow()
  );
};

const formatBody = (payload: { [key: string]: any }) => {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
};

// On media upload, extract metadata and create placeholders
export const handleMediaUpload = functions
  .runWith({
    secrets: [cloudflareAccessKeyId, cloudflareSecretAccessKey],
    timeoutSeconds: 540,
    memory: "1GB",
  })
  .firestore.document("events/{eventId}/media/{mediaId}")
  .onCreate(async (mediaSnapshot, context) => {
    const { eventId, mediaId } = context.params;
    const media = mediaSnapshot.data() as any;

    console.log(`New media ${mediaId} created for event ${eventId}`, media);

    const stream = got.stream(media.publicUrl);
    let mime;
    try {
      const fileType = await fromStream(stream);
      if (!fileType?.mime) throw Error("Failed to determine file type");
      mime = fileType.mime;
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
      await Sentry.flush(2000);
      throw error;
    }

    switch (mime.split("/")[0]) {
      case "image":
        console.log(
          "New media is an image. Extracting metadata and creating base64 placeholder"
        );
        try {
          // Extract metadata for image
          const metadata = await getImageMetadata(media.publicUrl);
          if (!metadata.height || !metadata.width)
            throw Error("Failed to determine image height & width");

          metadata.mimeType = mime;
          console.log("Extracted image metadata", { metadata });

          // Generate base64 placeholder for image
          const { base64 } = await getPlaiceholder(media.publicUrl);
          console.log(`Generated base64 placeholder ${base64}`);

          // Add metadata and base64 placeholder to media db entry
          const db = admin.firestore();
          await db
            .doc(`events/${eventId}/media/${mediaId}`)
            .update({ metadata, blurDataURL: base64 });
          console.log("Updated media entry with metadata and blurDataURL", {
            metadata,
            blurDataUrl: base64,
          });
          mixpanel.track("Media uploaded", {
            eventId,
            guestId: media.guestId,
            type: "image",
            ...flattenObject(metadata),
          });
        } catch (error) {
          console.log("Failed to generate blur placeholder for image", error);
          Sentry.captureException(error);
          await Sentry.flush(2000);
          throw error;
        }
        break;
      case "video":
        console.log(
          "New media is a video. Extracting metadata and generating poster and base64 placeholder."
        );
        try {
          const db = admin.firestore();
          const posterFilename = `${media.guestId}-${hash(mediaId)}-poster.jpg`;
          const tempFilePath = path.join(os.tmpdir(), posterFilename);

          // Extract metadata
          const mediaInfo = await getMediaInfoJS();
          const metadata = await getVideoMetadata(
            mediaInfo,
            mediaId,
            media.publicUrl
          );
          console.log("Generated metadata", { metadata });

          // Generate poster from first frame of video
          // and save to tempFilePath
          await exec(`ffmpeg -i ${media.publicUrl} -vframes 1 ${tempFilePath}`);
          console.log(`Generated poster at ${tempFilePath}`);

          // Generate base64 placeholder for poster
          const { base64 } = await getPlaiceholder(tempFilePath, { dir: "/" });
          console.log(`Generated poster placeholder: ${base64}`);

          // Load poster from filesystem
          const poster = await fs.readFile(tempFilePath);
          console.log("Retrieved poster from filesystem");

          // Initiaize R2 client
          const r2 = new S3({
            region: "auto",
            endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: cloudflareAccessKeyId.value(),
              secretAccessKey: cloudflareSecretAccessKey.value(),
            },
          });

          // Upload poster to R2
          const r2Key = `events/${eventId}/posters/${posterFilename}`;
          await r2.putObject({
            Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
            Key: r2Key,
            ContentType: "image/jpeg",
            Body: poster,
          });
          console.log(`Uploaded poster to R2 with key: ${r2Key}`);

          // Update media entry with poster and placeholder
          const posterUrl = `${process.env.CLOUDFLARE_PUBLIC_BUCKET_URL}/${r2Key}`;
          console.log("Updating db with: ", { metadata, base64, posterUrl });
          await db
            .doc(`events/${eventId}/media/${mediaId}`)
            .update({ metadata, blurDataURL: base64, posterUrl });

          console.log("Updated db entry", {
            metadata,
            blurDataUrl: base64,
            posterUrl,
          });

          mixpanel.track("Media uploaded", {
            eventId,
            guestId: media.guestId,
            type: "video",
            ...flattenObject(metadata),
          });

          // Delete temp file
          await fs.unlink(tempFilePath);
          console.log("Cleaned up temp file");
        } catch (error) {
          console.error("Failed to process video", error);
          Sentry.captureException(error);
          await Sentry.flush(2000);
          throw error;
        }
        break;
      default:
        console.error("Unhandled media type");
    }
  });

// On interview video upload (including generated one (i.e. interviewId = interview)),
// extract metadata, and create poster and placeholder
export const handleInterviewUpload = functions
  .runWith({
    secrets: [cloudflareAccessKeyId, cloudflareSecretAccessKey],
    timeoutSeconds: 540,
    memory: "1GB",
  })
  .firestore.document("events/{eventId}/interviews/{interviewId}")
  .onCreate(async (interviewSnapshot, context) => {
    const { eventId, interviewId } = context.params;
    const interview = interviewSnapshot.data() as any;

    if (interviewId === "interview")
      console.log(`Interview video generated for event ${eventId}`, interview);
    else
      console.log(`Interview video uploaded for event ${eventId}`, interview);

    try {
      const db = admin.firestore();
      const posterFilename = `${interviewId}-poster.jpg`;
      const tempFilePath = path.join(os.tmpdir(), posterFilename);

      const mediaInfo = await getMediaInfoJS();
      const metadata = await getVideoMetadata(
        mediaInfo,
        interviewId,
        interview.publicUrl
      );
      console.log("Extracted metadata", { metadata });

      if (!metadata)
        throw Error(`Failed to extract metadata for interview ${interviewId}`);

      // Generate poster from first frame of interview video (via publicUrl)
      // and save to tempFilePath
      await exec(`ffmpeg -i ${interview.publicUrl} -vframes 1 ${tempFilePath}`);
      console.log(`Generated poster at ${tempFilePath}`);

      // Generate base64 placeholder for poster
      const { base64 } = await getPlaiceholder(tempFilePath, { dir: "/" });
      console.log(`Generated poster placeholder: ${base64}`);

      // Load poster from filesystem
      const poster = await fs.readFile(tempFilePath);
      console.log("Retrieved poster from filesystem");

      // Initiaize R2 client
      const r2 = new S3({
        region: "auto",
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: cloudflareAccessKeyId.value(),
          secretAccessKey: cloudflareSecretAccessKey.value(),
        },
      });

      // Upload poster to R2
      const r2Key = `events/${eventId}/posters/${posterFilename}`;
      await r2.putObject({
        Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
        Key: r2Key,
        ContentType: "image/jpeg",
        Body: poster,
      });
      console.log(`Uploaded poster to R2 with key: ${r2Key}`);

      // Update interview entry with poster, placeholder, & metadata
      const posterUrl = `${process.env.CLOUDFLARE_PUBLIC_BUCKET_URL}/${r2Key}`;
      await db
        .doc(`events/${eventId}/interviews/${interviewId}`)
        .update({ blurDataURL: base64, posterUrl, metadata });
      console.log(
        `Updated db entry with blurDataUrl: ${base64} and posterUrl: ${posterUrl}`
      );
      mixpanel.track("Interview uploaded", {
        eventId,
        guestId: interview.guestId,
        metadata,
      });

      // Delete temp file
      await fs.unlink(tempFilePath);
      console.log("Cleaned up temp file");
    } catch (error) {
      console.error("Failed to process interview", interviewId, error);
      Sentry.captureException(error);
      await Sentry.flush(2000);
      throw error;
    }
  });

const getImageMetadata = async (file: string) => {
  const metadata = await ExifReader.load(file, {
    includeUnknown: true,
    expanded: true,
  });

  console.log("Image Metadata: ", { metadata });

  const location = {
    lat: metadata.gps?.Latitude,
    long: metadata.gps?.Longitude,
    alt: metadata.gps?.Altitude,
  };

  const device = {
    make: metadata.exif?.Make?.description,
    model: metadata.exif?.Model?.description,
  };

  const mimeType = metadata.exif?.["File Format"]?.value;
  const camera = metadata.exif?.LensModel?.description;
  const rotation = metadata.exif?.Orientation?.description;
  const createdDateTime = metadata.exif?.DateTime?.description;
  const createdDateTimeOffset = metadata.exif?.OffsetTime?.description;

  let createdAt;
  if (createdDateTime && createdDateTimeOffset) {
    let [date, time] = createdDateTime.split(" ");
    date = date.replaceAll(":", "-");
    createdAt = createdDateTimeOffset
      ? new Date(`${date}T${time}${createdDateTimeOffset}`).toISOString()
      : null;
  }

  let height =
    metadata.file?.["Image Height"]?.value ||
    metadata.png?.["Image Height"]?.value ||
    null;
  let width =
    metadata.file?.["Image Width"]?.value ||
    metadata.png?.["Image Width"]?.value ||
    null;

  // If failed to get height and width from metadata, we need to get it from the file buffer
  if (!height || !width) {
    const options = url.parse(file);
    await https.get(options, async (stream: any) => {
      const { height, width } = await getStreamImageSize(stream);
      if (!height || !width)
        throw Error("Failed to extract height and width using sizeOf");
    });
  }

  console.log("Rotation: ", rotation);

  // If portrait, switch height & width
  // http://nsiteful.com/wp-content/uploads/exif-orientation-examples-2016-05-05_10-52-32.png
  let tmp;
  switch (rotation) {
    case "left-top":
    case "right-top":
    case "left-bottom":
    case "right-bottom":
      tmp = height;
      height = width;
      width = tmp;
  }

  const orientation: "portrait" | "landscape" | null =
    height && width ? (height > width ? "portrait" : "landscape") : null;

  const md: any = {};
  if (location.lat && location.long) md.location = location;
  if (device.make) md.device = device;
  if (mimeType) md.mimeType = mimeType;
  if (rotation) md.rotation = rotation;
  if (camera) md.camera = camera;
  md.createdAt = createdAt || null;
  if (height) md.height = height;
  if (width) md.width = width;
  if (orientation) md.orientation = orientation;

  return md;
};

async function getMediaInfoJS() {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line new-cap
    MediaInfo(
      {
        chunkSize: 5 * 1024 * 1024,
        coverData: false,
        format: "object",
        locateFile: () => "./src//MediaInfoModule.wasm",
        full: true,
      },
      (mediainfo: any) => {
        resolve(mediainfo);
      },
      (error: any) => {
        console.error("[mediainfo.js] failed instantiate", error);
        reject(error);
      }
    );
  });
}

const getVideoMetadata = async (
  mediainfo: any,
  mediaId: string,
  url: string
) => {
  // Unfortunately with the WASM version of MediaInfo we need to download the file
  // TODO: Switch to using the mediainfo binary and the publicUrl or
  // stream the file chunks straight to mediainfo to avoid creating a tmp file
  const res = await fetch(url);
  const fileWriteHandle = await fs.open(
    `/tmp/${sanitize(mediaId).replaceAll("%", "")}`,
    "w"
  );
  const fileStream = fileWriteHandle.createWriteStream();
  await new Promise((resolve, reject) => {
    /* @ts-ignore */
    res.body.pipe(fileStream);
    /* @ts-ignore */
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
  const fileReadHandle = await fs.open(
    `/tmp/${sanitize(mediaId).replaceAll("%", "")}`,
    "r"
  );
  const fileSize = (await fileReadHandle.stat()).size;
  const readChunk = async (size: any, offset: any) => {
    const buffer = new Uint8Array(size);
    await fileReadHandle.read(buffer, 0, size, offset);
    return buffer;
  };

  const metadata = await mediainfo.analyzeData(() => fileSize, readChunk);

  console.log("Video metadata: ", { metadata });

  const {
    Duration_String3,
    InternetMediaType: mimeType,
    Tagged_Date,
    extra,
  } = metadata.media.track[0];

  const { Height, Width, Rotation } = metadata.media.track[1];
  let height = Number(Height);
  let width = Number(Width);
  const rotation = Number(Rotation);

  // Fix height & width based on rotation
  if (rotation === 90 || rotation === 270) [height, width] = [width, height];

  // Apple specific metadata
  let device, location;
  if (extra) {
    const {
      com_apple_quicktime_location_ISO6709,
      com_apple_quicktime_make,
      com_apple_quicktime_model,
      com_apple_quicktime_software,
    } = extra;

    device = {
      make: com_apple_quicktime_make,
      model: com_apple_quicktime_model,
      version: com_apple_quicktime_software,
    };

    location = parseIso6709(com_apple_quicktime_location_ISO6709);
  }

  const duration = parseVideoDuration(Duration_String3);
  const createdAt = Tagged_Date ? new Date(Tagged_Date).toISOString() : null;
  const orientation: "portrait" | "landscape" =
    height > width ? "portrait" : "landscape";

  fileWriteHandle && (await fileWriteHandle.close());
  fileReadHandle && (await fileReadHandle.close());
  mediainfo && mediainfo.close();

  const md: any = {};
  if (location && location.lat && location.long) md.location = location;
  if (device && device.make) md.device = device;
  if (mimeType) md.mimeType = mimeType;
  if (rotation) md.rotation = rotation;
  if (duration) md.duration = duration;
  md.createdAt = createdAt || null;
  if (height) md.height = height;
  if (width) md.width = width;
  if (orientation) md.orientation = orientation;

  return md;
};

// Format "HH:MM:SS.MS" -> Seconds
const parseVideoDuration = (durationStr: string) => {
  const [hours, minutes, seconds] = durationStr.split(":");
  return (
    Number(hours) * 60 * 60 + Number(minutes) * 60 + Math.round(Number(seconds))
  );
};

// Format latlongalt/ -> { lat, long, alt }
const parseIso6709 = (loc?: string) => {
  if (!loc) return;
  const [_, lat, long, alt] =
    loc.match(/([-+][^-+]*)([-+][^-+]*)([^-+]*[^/]*)/) || [];
  return { lat: Number(lat), long: Number(long), alt: Number(alt) };
};

// Flatten Javascript Object
export const flattenObject = (obj: object, parentKey?: string) => {
  let result: { [key: string]: any } = {};

  Object.entries(obj).forEach(([key, value]) => {
    const _key = parentKey ? parentKey + "." + key : key;
    if (value && typeof value === "object")
      result = { ...result, ...flattenObject(value, _key) };
    else result[_key] = value;
  });

  return result;
};

function hash(str: string) {
  return createHash("sha256").update(str).digest("hex");
}

async function getStreamImageSize(stream: any) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
    try {
      return sizeOf(Buffer.concat(chunks));
    } catch (error) {
      /* Not ready yet */
    }
  }

  return sizeOf(Buffer.concat(chunks));
}
