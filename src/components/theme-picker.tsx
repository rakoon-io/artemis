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

/** Vignette d'aperçu d'une palette : fond + trait de texte + pastille d'accent. */
function Swatch({ swatch }: { swatch: ThemeDef["swatch"] }) {
  return (
    <span
      className="relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 dark:border-white/15"
      style={{ background: swatch.bg }}
      aria-hidden
    >
      <span
        className="absolute inset-x-1 bottom-1 h-[2px] rounded-full"
        style={{ background: swatch.fg, opacity: 0.4 }}
      />
      <span className="size-2 rounded-full" style={{ background: swatch.primary }} />
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
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-gradient-to-br from-background to-muted-foreground/40 text-foreground">
            <Monitor className="size-3" />
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
