import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";

/**
 * Stockage des pièces jointes.
 * - Variables `S3_*` configurées ⇒ **stockage S3-compatible** (MinIO/S3).
 * - Sinon ⇒ **repli disque local** (dossier `.uploads`), pratique en dev sans MinIO,
 *   et REFUSÉ en production : le conteneur n'a pas de volume (cf. `writeStored`).
 *
 * Dans les deux cas, les octets transitent par le SERVEUR : dépôt et service se
 * font depuis l'origine de l'application. Le navigateur ne joint jamais le
 * stockage, ce qui permet de garder celui-ci hors d'atteinte depuis Internet et
 * rend le fournisseur interchangeable sans toucher au client.
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

/**
 * Écrit un objet. Le SERVEUR dépose les octets : le navigateur ne joint jamais
 * le stockage, et n'a donc pas à savoir qu'il existe.
 *
 * C'est ce qui remplace l'URL presignée. Celle-ci supposait un endpoint joignable
 * depuis le poste de l'utilisateur ; l'adresse configurée est un alias du réseau
 * Docker, que le serveur résout et que le navigateur ne résoudra jamais. Le dépôt
 * échouait donc entièrement côté client, sans laisser la moindre trace serveur.
 */
export async function writeObject(
  key: string,
  data: Uint8Array,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
    }),
  );
}

/** Lit un objet entier. Pendant de `writeObject` pour le service des fichiers. */
export async function readObject(key: string): Promise<Buffer> {
  const res = await client().send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
  );
  if (!res.Body) throw new Error("Objet introuvable.");
  return Buffer.from(await res.Body.transformToByteArray());
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

/**
 * Écrit dans le stockage en vigueur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI LE REPLI DISQUE EST INTERDIT EN PRODUCTION
 *
 * Le repli écrit dans `.uploads`, à l'intérieur du conteneur. Or le conteneur
 * applicatif n'a AUCUN volume : ce qui y est écrit disparaît au déploiement
 * suivant. Une variable `S3_*` oubliée ou mal orthographiée ferait donc basculer
 * le dépôt sur un disque éphémère, sans erreur, et les fichiers s'évanouiraient
 * plus tard - au pire moment, et sans que personne puisse dire quand.
 *
 * On refuse donc d'écrire plutôt que d'écrire là où ça ne tient pas. En
 * développement, le repli reste commode et sans enjeu.
 */
export async function writeStored(
  key: string,
  data: Uint8Array,
  contentType: string,
): Promise<void> {
  if (isStorageConfigured()) {
    await writeObject(key, data, contentType);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Stockage objet non configuré : le dépôt local n'est pas persistant en production. Renseignez S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY.",
    );
  }
  await writeLocal(key, data);
}

/** Lit depuis le stockage en vigueur. */
export async function readStored(key: string): Promise<Buffer> {
  return isStorageConfigured() ? readObject(key) : readLocal(key);
}

/** Clé objet dédiée pour une pièce jointe. */
export function attachmentKey(ticketId: string, filename: string): string {
  return `attachments/${ticketId}/${safeSuffix(filename)}`;
}

/**
 * Clé objet d'une pièce jointe de PAGE DE WIKI. Préfixe distinct de celui des
 * tickets : c'est lui que les routes vérifient pour savoir à qui appartient
 * l'objet, et deux espaces séparés interdisent qu'une clé forgée de l'un serve
 * à écrire dans l'autre.
 */
export function wikiFileKey(pageId: string, filename: string): string {
  return `wiki/${pageId}/${safeSuffix(filename)}`;
}

/**
 * Nom de fichier assaini, préfixé d'un aléa pour éviter les collisions.
 *
 * `randomUUID` et non `Math.random` : ce préfixe n'évite pas seulement les
 * collisions, il est la seule chose qui empêche de DEVINER la clé d'un objet
 * déjà déposé - donc de l'écraser. Le générateur de `Math.random` est prévisible
 * à partir de quelques sorties observées, et l'appelant observe les siennes à
 * chaque dépôt. Un aléa cryptographique coûte ici exactement rien.
 */
function safeSuffix(filename: string): string {
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(-100);
  return `${crypto.randomUUID().slice(0, 12)}-${safe}`;
}
