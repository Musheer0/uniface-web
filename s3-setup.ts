import { PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { s3 ,bucket} from "./src/s3/client.ts";
console.log({bucket})
await s3.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [
            "http://localhost:3000",
          ],
          AllowedMethods: ["POST", "PUT", "GET", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 36000,
        },
      ],
    },
  })
);