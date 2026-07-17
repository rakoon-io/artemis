"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { requestPasswordResetAction } from "@/server/actions/account.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Demande de réinitialisation : saisie de l'e-mail. La réponse est toujours
 * générique (on ne révèle pas si le compte existe).
 */
export function RequestResetForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setSubmitting(true);
    await requestPasswordResetAction({ email });
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          Si un compte existe avec cet e-mail, un lien de réinitialisation vient
          d&apos;être envoyé. Pensez à vérifier vos indésirables.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Retour à la connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="animate-spin" />}
        Envoyer le lien
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
