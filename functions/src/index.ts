import * as functions from "firebase-functions";

// Create interview video creation job
export const createInterviewVideo = functions.https.onRequest(
  (request, response) => {
    functions.logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");
  }
);
