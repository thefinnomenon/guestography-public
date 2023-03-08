import admin from "firebase-admin";
import * as functions from "firebase-functions";

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

    const videoFilePaths = await (
      await bucket.getFiles({
        prefix: `events/${eventId}/interviews/`,
      })
    )[0].map((file) => `guestography/${file.name}`);
    console.log(videoFilePaths);

    /**
     *  Required. The parent location to create and process this job.
     *  Format: `projects/{project}/locations/{location}`
     */
    // const parent = "abc123";

    /**
     *  Required. Parameters for creating transcoding job.
     */
    // const job = {};

    // const req = {
    //   parent,
    //   job,
    // };

    // const res = await transcoderClient.createJob(req);
    // console.log(res);

    response.send("Hello from Firebase!");
  }
);
