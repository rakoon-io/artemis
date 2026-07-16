/**
 * Envoi d'e-mails via l'API Mailjet Send (v3.1), en `fetch` (aucune dependance).
 * Convention alignee sur les autres applications Rakoon.
 *
 * Configuration (variables d'environnement serveur) :
 *   MAILJET_API_KEY     cle publique Mailjet
 *   MAILJET_API_SECRET  cle privee Mailjet
 *   EMAIL_FROM          adresse expeditrice validee (ex. "noreply@rakoon.io")
 *   EMAIL_FROM_NAME     nom affiche de l'expediteur (defaut "Artemis")
 *   MAILJET_API_URL     surcharge de l'endpoint (tests ; defaut API Mailjet)
 *
 * Non configure : `sendEmail` devient un no-op silencieux et renvoie
 * { sent:false, error:"email_not_configured" }. L'application continue de
 * fonctionner (les notifications sont simplement desactivees).
 */

const MAILJET_URL = "https://api.mailjet.com/v3.1/send";

export interface SendEmailArgs {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

/** Vrai si l'envoi d'e-mails est configure (cles + expediteur presents). */
export function isEmailConfigured(): boolean {
  return !!(
    process.env.MAILJET_API_KEY &&
    process.env.MAILJET_API_SECRET &&
    process.env.EMAIL_FROM
  );
}

/** Version texte grossiere d'un HTML (repli quand `text` n'est pas fourni). */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function sendEmail(
  args: SendEmailArgs,
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !apiSecret || !from) {
    return { sent: false, error: "email_not_configured" };
  }

  try {
    const res = await fetch(process.env.MAILJET_API_URL || MAILJET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64"),
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: from,
              Name: process.env.EMAIL_FROM_NAME || "Artemis",
            },
            To: [{ Email: args.to, Name: args.toName || args.to }],
            Subject: args.subject,
            HTMLPart: args.html,
            TextPart: args.text || stripHtml(args.html),
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, error: `mailjet_${res.status}: ${body.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send_failed" };
  }
}

/** Echappe le texte insere dans le HTML de l'e-mail. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface TicketEmailArgs {
  heading: string; // titre de l'e-mail (ex. "Nouveau commentaire")
  intro: string; // phrase d'introduction
  ticketKey: string; // "RKN-3"
  ticketTitle: string;
  url: string; // lien vers le ticket
  /** Bloc cite optionnel (corps d'un commentaire). */
  quote?: string;
}

/** Gabarit HTML de marque Artemis pour une notification de ticket. */
export function ticketEmailHtml(args: TicketEmailArgs): string {
  const quoteBlock = args.quote
    ? `<blockquote style="margin:16px 0 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #5f4ec2;border-radius:6px;font-size:14px;color:#334155;white-space:pre-wrap;">${esc(args.quote)}</blockquote>`
    : "";
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;background:#f1f5f9;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:540px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;">
      <p style="font-size:18px;font-weight:700;margin:0 0 2px;color:#5f4ec2;">Artemis</p>
      <h1 style="font-size:18px;margin:16px 0 6px;">${esc(args.heading)}</h1>
      <p style="font-size:15px;line-height:1.5;margin:0 0 14px;color:#334155;">${esc(args.intro)}</p>
      <p style="font-size:15px;margin:0;"><span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#64748b;">${esc(args.ticketKey)}</span> <strong>${esc(args.ticketTitle)}</strong></p>
      ${quoteBlock}
      <p style="margin:24px 0 0;">
        <a href="${esc(args.url)}" style="display:inline-block;background:#5f4ec2;color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:9px;font-size:14px;">Ouvrir le ticket</a>
      </p>
      <p style="font-size:12px;color:#94a3b8;margin:22px 0 0;line-height:1.5;">Vous recevez cet e-mail car vous etes concerne par ce ticket sur Artemis.</p>
    </div>
  </div></body></html>`;
}

/** URL de base de l'application, pour construire les liens des e-mails. */
export function appBaseUrl(): string {
  const base =
    process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000";
  return base.replace(/\/+$/, "");
}
