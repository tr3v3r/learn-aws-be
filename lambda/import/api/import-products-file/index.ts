import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({ region: "us-east-1" });

const bucketName = process.env.BUCKET_NAME;
const uploadFolderName = process.env.UPLOAD_FOLDER_NAME;

export async function main(event: { fileName: string }) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${uploadFolderName}/${event.fileName}`,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 60 });

    return { url };
  } catch (e) {
    console.log(e);
    return Promise.reject("Internal server error");
  }
}
