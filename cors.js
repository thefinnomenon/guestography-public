import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: `${process.env.CLOUDFLARE_ACCESS_KEY_ID}`,
    secretAccessKey: `${process.env.CLOUDFLARE_SECRET_ACCESS_KEY}`,
  },
});

async function main() {
  console.log(process.env);
  const response = await r2.send(
    new PutBucketCorsCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: new Array({
          AllowedHeaders: ["content-type"],
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: [],
          MaxAgeSeconds: 3000,
        }),
      },
    })
  );
  console.dir(response);
}

main();
