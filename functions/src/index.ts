import dotenv from "dotenv";
dotenv.config();
import admin from "firebase-admin";
import * as functions from "firebase-functions";
const Sentry = require("@sentry/serverless");
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
import { Event } from "../../types.js";

const webhookSecret = defineSecret("WEBHOOK_SECRET");
const cloudflareAccessKeyId = defineSecret("CLOUDFLARE_ACCESS_KEY_ID");
const cloudflareSecretAccessKey = defineSecret("CLOUDFLARE_SECRET_ACCESS_KEY");
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

admin.initializeApp();

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN || "");

Sentry.GCPFunction.init({
  dsn: "https://52517b2e72d642219339750bae5900eb@o371187.ingest.sentry.io/4505183181733888",
  enabled: !process.env.FUNCTIONS_EMULATOR,
  tracesSampleRate: 1.0,
});

// Handle event status change
export const handleEventStatusChange = functions
  .runWith({ secrets: [webhookSecret] })
  .firestore.document("events/{eventId}")
  .onUpdate(async (change, context) => {
    const { eventId } = context.params;
    const oldEvent = change.before.data() as Event;
    const event = change.after.data() as Event;

    console.log(`handleEventStatusChange for ${eventId}`, { oldEvent, event });

    // Ignore if no status change
    if (oldEvent.status === event.status) return;

    console.log(
      `Event ${eventId} status change ${oldEvent.status} to ${event.status}`
    );

    switch (event.status) {
      case "PAID":
        console.log("Event paid!", eventId);
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

          // Update event storage amount
          if (metadata.filesize)
            await db.doc(`events/${eventId}`).update({
              storageInBytes: admin.firestore.FieldValue.increment(
                metadata.filesize
              ),
            });
          else
            mixpanel.track("Failed to get media filesize", {
              eventId,
              guestId: media.guestId,
              mediaId,
              publicUrl: media.publicUrl,
              privateUrl: media.privateUrl,
              type: "image",
              ...flattenObject(metadata),
            });

          mixpanel.track("Media uploaded", {
            eventId,
            guestId: media.guestId,
            mediaId,
            publicUrl: media.publicUrl,
            privateUrl: media.privateUrl,
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
            CacheControl: IMMUTABLE_CACHE_CONTROL,
            Body: poster,
          });
          console.log(`Uploaded poster to R2 with key: ${r2Key}`);

          // Update media entry with poster and placeholder
          const posterUrl = `${process.env.CLOUDFLARE_PUBLIC_BUCKET_URL}/${r2Key}`;
          console.log("Updating db with: ", { metadata, base64, posterUrl });
          await db
            .doc(`events/${eventId}/media/${mediaId}`)
            .update({ metadata, blurDataURL: base64, posterUrl });

          // Update event storage amount
          if (metadata.filesize)
            await db.doc(`events/${eventId}`).update({
              storageInBytes: admin.firestore.FieldValue.increment(
                metadata.filesize
              ),
            });
          else
            mixpanel.track("Failed to get media filesize", {
              eventId,
              guestId: media.guestId,
              mediaId,
              publicUrl: media.publicUrl,
              privateUrl: media.privateUrl,
              type: "video",
              ...flattenObject(metadata),
            });

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

  let fileSizeInBytes;
  try {
    const response = await fetch(file, { method: "HEAD" });

    // Check if the Content-Length header exists
    const contentLength = response.headers.get("Content-Length");

    if (contentLength) fileSizeInBytes = parseInt(contentLength, 10);
  } catch (error) {
    console.error("Error fetching the file size:", error);
  }

  // Track if we failed to get the dimensions
  if (!height || !width)
    mixpanel.track("Failed to get media dimensions", {
      type: "image",
      url: file,
      ...flattenObject(metadata),
    });

  // Track if we failed to get createdAt
  if (!createdAt)
    mixpanel.track("Failed to get media createdAt", {
      type: "image",
      url,
      ...flattenObject(metadata),
    });

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
  if (fileSizeInBytes) md.filesize = fileSizeInBytes;
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

  // Track if we failed to get the dimensions
  if (!height || !width)
    mixpanel.track("Failed to get media dimensions", {
      type: "video",
      url,
      ...flattenObject(metadata),
    });

  // Track if we failed to get createdAt
  if (!createdAt)
    mixpanel.track("Failed to get media createdAt", {
      type: "video",
      url,
      ...flattenObject(metadata),
    });

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
  if (fileSize) md.filesize = fileSize;

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
