import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

/**
 * Stockage S3-compatible des pièces jointes (voir ADR-0004).
 * Se désactive proprement si les variables S3_* ne sont pas configurées.
 */

export function isStorageConfigured(): boolean {
  return Boolean(
    env.S3_ENDPOINT &&
      env.S3_BUCKET &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY,
  );
}

let cached: S3Client | null = null;

function client(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error(
      "Stockage S3 non configuré : renseignez S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.",
    );
  }
  if (!cached) {
    cached = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true, // requis pour MinIO
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return cached;
}

/** URL presignée d'upload (PUT), à durée limitée. */
export function presignUpload(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
}

/** URL presignée de téléchargement (GET), à durée limitée. */
export function presignDownload(key: string): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    { expiresIn: 300 },
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

/** Clé objet dédiée pour une pièce jointe. */
export function attachmentKey(ticketId: string, filename: string): string {
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(-100);
  const rand = Math.random().toString(36).slice(2, 10);
  return `attachments/${ticketId}/${rand}-${safe}`;
}
