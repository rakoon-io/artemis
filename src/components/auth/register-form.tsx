"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { useDict } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Formulaire d'inscription : crée le compte via /api/register puis connecte. */
export function RegisterForm() {
  const t = useDict();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setIsLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data: { ok?: boolean; error?: string } = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? t.account.register.errorFailed);
        return;
      }

      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        toast.success(t.account.register.successCreated);
        router.push("/login");
        return;
      }

      toast.success(t.account.register.successWelcome);
      router.push("/projects");
      router.refresh();
    } catch {
      toast.error(t.common.genericError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t.account.register.title}</CardTitle>
        <CardDescription>
          {t.account.register.description}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t.account.register.nameLabel}</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={80}
              placeholder={t.account.register.namePlaceholder}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t.account.emailLabel}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t.account.emailPlaceholder}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t.account.register.passwordLabel}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="text-xs text-muted-foreground">
              {t.account.passwordMinHint}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t.account.register.submitting : t.account.register.submit}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t.account.register.haveAccount}{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t.account.register.signIn}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
