import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import { parse } from "csv-parse/sync";

const client = new S3Client({ region: "us-east-1" });
const uploadFolderName = process.env.UPLOAD_FOLDER_NAME as string;
const parsedFolderName = process.env.PARSED_FOLDER_NAME as string;

export async function main(event: S3Event) {
  const record = event.Records[0];
  const bucketName = record.s3.bucket.name;
  const key = record.s3.object.key;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await client.send(command);

  if (!response.Body) {
    return;
  }
  const csvFile = await response.Body?.transformToString();

  const records = parse(csvFile, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ";",
  });

  console.log("Records:", records);

  const copyCommand = new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: `${bucketName}/${key}`,
    Key: record.s3.object.key.replace(uploadFolderName, parsedFolderName),
  });

  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await client.send(copyCommand);
  await client.send(deleteCommand);
}
