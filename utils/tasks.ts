import { CloudTasksClient } from "@google-cloud/tasks";
const client = new CloudTasksClient();
const parent = client.queuePath(
  "guestography-37df8",
  "us-east4",
  "guestography-tasks"
);

// Schedule an immediate message send task
export async function scheduleSendTask(
  eventId: string,
  guestId: string,
  type: string
) {
  try {
    const [response] = await client.createTask({
      parent,
      task: {
        httpRequest: {
          headers: {
            "Content-Type": "text/json",
          },
          httpMethod: "POST",
          url: "https://guestography.com/api/send",
          body: formatBody({
            secret: process.env.WEBHOOK_SECRET,
            eventId,
            guestId,
            type,
          }),
        },
      },
    });
    console.log(`Scheduled task ${response.name}`);
  } catch (e) {
    console.error("Failed to schedule task", e);
  }
}

const formatBody = (payload: { [key: string]: any }) => {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
};
