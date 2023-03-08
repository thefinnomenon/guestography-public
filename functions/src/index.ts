import admin from "firebase-admin";
import * as functions from "firebase-functions";
// Imports the Transcoder library
import { TranscoderServiceClient } from "@google-cloud/video-transcoder";

// Instantiates a client
const transcoderServiceClient = new TranscoderServiceClient();

admin.initializeApp();

const bucket = admin.storage().bucket("guestography");

// import { TranscoderServiceClient } from "@google-cloud/video-transcoder";
// const transcoderClient = new TranscoderServiceClient();

// Create interview video creation job
export const createInterviewVideo = functions.https.onRequest(
  async (request, response) => {
    const { eventId } = request.query;
    if (!eventId) {
      response.status(500).send("Missing eventId query parameter");
      return;
    }

    const videoUris = await (
      await bucket.getFiles({
        prefix: `events/${eventId}/interviews/`,
      })
    )[0].map((file) => `gs://guestography/${file.name}`);
    console.log(videoUris);

    const inputs = videoUris.map((uri, i) => {
      return {
        key: `input${i}`,
        uri,
      };
    });

    const editList = inputs.map((input, i) => {
      return {
        key: `atom${i}`,
        inputs: [input.key],
      };
    });

    console.log(inputs, editList);

    // TODO: Construct Transcode job to stitch videos together
    // cloud.google.com/transcoder/docs/how-to/concatenate-videos
    const parent = "projects/guestography-37df8/locations/us-east4";
    const job = {
      outputUri: `gs://guestography/events/${eventId}/`,
      inputs,
      editList,
    };

    const req = {
      parent,
      job,
    };

    const res = await transcoderServiceClient.createJob(req);
    console.log(res);

    response.send("Hello from Firebase!");
  }
);
