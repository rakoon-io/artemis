"use client";

import { useTheme } from "next-themes";
import { Check, Monitor, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DARK_THEMES, LIGHT_THEMES, type ThemeDef } from "@/lib/themes";

/**
 * APERÇU d'une palette : une miniature de l'application.
 *
 * L'ancienne vignette donnait le plus de place à la BARRE D'ACCENT - la seule
 * couleur identique d'un thème à l'autre, l'indigo d'Artemis - et réduisait à
 * deux pixels la surface teintée, qui est précisément ce qui distingue « Sable »
 * de « Brume » ou de « Menthe ». Les quatre palettes claires paraissaient donc
 * identiques, et l'on ne pouvait choisir qu'en appliquant.
 *
 * La vignette montre désormais, du plus grand au plus petit, ce qui varie le
 * plus : le fond, la surface d'une carte avec sa bordure, une ligne de texte, et
 * la pastille d'accent en dernier.
 */
function Swatch({ swatch }: { swatch: ThemeDef["swatch"] }) {
  return (
    <span
      className="relative block h-8 w-11 shrink-0 overflow-hidden rounded-[6px] border shadow-sm"
      style={{ background: swatch.bg, borderColor: swatch.border }}
      aria-hidden
    >
      {/* La « carte » : c'est elle qui porte la teinte de la palette. */}
      <span
        className="absolute inset-x-1 bottom-1 top-3 rounded-[3px] border"
        style={{ background: swatch.surface, borderColor: swatch.border }}
      >
        {/* Deux lignes de texte, à l'échelle. */}
        <span
          className="absolute left-1 right-2 top-1 h-[3px] rounded-full opacity-70"
          style={{ background: swatch.fg }}
        />
        <span
          className="absolute bottom-1 left-1 right-4 h-[3px] rounded-full opacity-40"
          style={{ background: swatch.fg }}
        />
      </span>
      {/* Pastille d'accent, en dernier : c'est la seule couleur que les palettes
          d'un même mode ont en commun. */}
      <span
        className="absolute right-1 top-1 size-2 rounded-full"
        style={{ background: swatch.primary }}
      />
    </span>
  );
}

function ThemeRow({
  theme,
  active,
  onSelect,
}: {
  theme: ThemeDef;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className={cn("gap-2.5", active && "bg-accent/60")}
    >
      <Swatch swatch={theme.swatch} />
      <span className="flex-1">{theme.label}</span>
      {active && <Check className="size-4 text-primary" />}
    </DropdownMenuItem>
  );
}

/**
 * Sélecteur de thème - « Système » + plusieurs palettes claires et sombres, avec
 * aperçu de chaque palette. Le choix est mémorisé (next-themes / localStorage) et
 * appliqué immédiatement à toute l'application, sans rechargement.
 */
export function ThemePicker() {
  const { theme: current, setTheme } = useTheme();
  // Le contenu du menu (et donc la lecture de `current`) n'est monté par Radix qu'à
  // l'ouverture, côté client : aucun risque d'écart d'hydratation, pas de garde `mounted`.

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Choisir un thème">
          <Palette />
          <span className="sr-only">Choisir un thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onSelect={() => setTheme("system")}
          className={cn("gap-2.5", current === "system" && "bg-accent/60")}
        >
          <span className="flex h-6 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-gradient-to-br from-background to-muted-foreground/40 text-foreground shadow-sm">
            <Monitor className="size-3.5" />
          </span>
          <span className="flex-1">Système</span>
          {current === "system" && <Check className="size-4 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Clair
        </DropdownMenuLabel>
        {LIGHT_THEMES.map((t) => (
          <ThemeRow
            key={t.id}
            theme={t}
            active={current === t.id}
            onSelect={() => setTheme(t.id)}
          />
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Sombre
        </DropdownMenuLabel>
        {DARK_THEMES.map((t) => (
          <ThemeRow
            key={t.id}
            theme={t}
            active={current === t.id}
            onSelect={() => setTheme(t.id)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
