"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { setLocaleAction } from "@/i18n/set-locale.action";
import { useLocale } from "@/i18n/provider";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

/**
 * Choix de la langue, a placer dans un menu deroulant (ex. le menu utilisateur).
 * Bascule la langue via un cookie puis rafraichit le rendu.
 */
export function LocaleSwitcher({ label }: { label: string }) {
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === active || pending) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Languages className="size-3.5" />
        {label}
      </DropdownMenuLabel>
      {locales.map((locale) => (
        <DropdownMenuItem
          key={locale}
          onSelect={(event) => {
            event.preventDefault();
            choose(locale);
          }}
          disabled={pending}
          className="gap-2 pl-8"
        >
          <span className="flex-1">{localeNames[locale]}</span>
          {locale === active && <Check className="size-4 text-primary" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}
