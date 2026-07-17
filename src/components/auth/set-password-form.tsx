"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { setPasswordAction } from "@/server/actions/account.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Formulaire de définition du mot de passe via un jeton de première connexion. */
export function SetPasswordForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (password.length < 8) {
      setError("8 caractères minimum.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const res = await setPasswordAction({ token, password });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success("Mot de passe défini. Vous pouvez vous connecter.");
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {/* Aide les gestionnaires de mots de passe à associer le compte. */}
      <input type="hidden" name="email" value={email} autoComplete="username" />
      <div className="grid gap-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={200}
          required
          autoFocus
        />
        <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirmer le mot de passe</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={200}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="animate-spin" />}
        Définir le mot de passe
      </Button>
    </form>
  );
}
