import AWS from "aws-sdk";
import { NextApiRequest, NextApiResponse } from "next";
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventId } = req.query;

  var params = {
    Bucket: process.env.S3_BUCKET || "",
  };

  let s3Objects;
  try {
    s3Objects = await s3.listObjects(params).promise();
    console.log(s3Objects);
  } catch (e) {
    console.log(e);
  }

  res
    .status(200)
    .send(
      JSON.stringify(s3Objects || { message: "No objects found in s3 bucket" })
    );
}
