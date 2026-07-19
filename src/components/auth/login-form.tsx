"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
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
import { useDict } from "@/i18n/provider";

/** Formulaire de connexion (Credentials → session Auth.js). */
export function LoginForm() {
  const router = useRouter();
  const t = useDict();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error(t.login.errorInvalid);
        return;
      }
      toast.success(t.login.success);
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
        <CardTitle className="text-xl">{t.login.title}</CardTitle>
        <CardDescription>{t.login.subtitle}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t.login.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t.login.emailPlaceholder}
              required
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t.login.password}</Label>
              <Link
                href="/reset"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t.login.forgotPassword}
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t.login.submitting : t.login.submit}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t.login.noAccount}{" "}
            <Link
              href="/register"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t.login.createAccount}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
