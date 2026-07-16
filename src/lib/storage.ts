import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";

/**
 * Stockage des pièces jointes (voir ADR-0004).
 * - Variables `S3_*` configurées ⇒ **stockage S3-compatible** (MinIO/S3), upload direct via URL presignée.
 * - Sinon ⇒ **fallback disque local** (dossier `.uploads`), pratique en dev sans MinIO.
 *   En conteneur, le disque n'est pas persistant : configurer S3 en production.
 */

export function isStorageConfigured(): boolean {
  return Boolean(
    env.S3_ENDPOINT &&
      env.S3_BUCKET &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY,
  );
}

export type StorageMode = "s3" | "local";
export function storageMode(): StorageMode {
  return isStorageConfigured() ? "s3" : "local";
}

// ─── S3 ────────────────────────────────────────────────────────────────────
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

// ─── Disque local (fallback) ─────────────────────────────────────────────────
const LOCAL_DIR = process.env.LOCAL_UPLOAD_DIR
  ? path.resolve(process.env.LOCAL_UPLOAD_DIR)
  : path.join(process.cwd(), ".uploads");

/** Résout une clé objet en chemin disque, en empêchant toute traversée de répertoire. */
function localPathForKey(key: string): string {
  const rel = key
    .replace(/\\/g, "/")
    .split("/")
    .filter((s) => s && s !== "." && s !== "..")
    .map((s) => s.replace(/[^\w.\-]/g, "_"))
    .join("/");
  const full = path.resolve(LOCAL_DIR, rel);
  if (full !== LOCAL_DIR && !full.startsWith(LOCAL_DIR + path.sep)) {
    throw new Error("Chemin de stockage invalide.");
  }
  return full;
}

export async function writeLocal(key: string, data: Uint8Array): Promise<void> {
  const p = localPathForKey(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, data);
}

export async function readLocal(key: string): Promise<Buffer> {
  return fs.readFile(localPathForKey(key));
}

export async function deleteLocal(key: string): Promise<void> {
  await fs.rm(localPathForKey(key), { force: true });
}

/** Supprime l'objet stocké, quel que soit le mode. */
export async function deleteStored(key: string): Promise<void> {
  if (isStorageConfigured()) await deleteObject(key);
  else await deleteLocal(key).catch(() => {});
}

/** Clé objet dédiée pour une pièce jointe. */
export function attachmentKey(ticketId: string, filename: string): string {
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(-100);
  const rand = Math.random().toString(36).slice(2, 10);
  return `attachments/${ticketId}/${rand}-${safe}`;
}
