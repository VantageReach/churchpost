import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(buffer, key, contentType) {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

// Extract the R2 object key from a public URL
export function r2KeyFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // Strip leading slash → the key is everything after the origin
    return parsed.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

export async function deleteFromR2(key) {
  if (!key) return;
  await r2.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}
