"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Zone de saisie qui ÉPOUSE SON CONTENU : elle grandit à mesure qu'on écrit,
 * rétrécit quand on efface, et ne montre jamais d'ascenseur.
 *
 * Une hauteur fixe oblige, dès la quatrième ligne, à faire défiler à l'intérieur
 * d'un champ de trois lignes ou à saisir la poignée de redimensionnement. Deux
 * gestes que personne ne fait au fil d'une réunion : on écrit, et le texte
 * disparaît par le haut.
 *
 * Mesure en JavaScript plutôt que `field-sizing: content` : la propriété CSS
 * n'est pas encore servie par tous les navigateurs, et un champ qui ne grandit
 * que sur certains est plus déroutant qu'un champ qui ne grandit jamais.
 */
function fit(el: HTMLTextAreaElement | null) {
  if (!el) return;
  // Remise à `auto` INDISPENSABLE avant la mesure : `scrollHeight` ne redescend
  // jamais sous la hauteur déjà posée, et le champ ne rétrécirait plus.
  el.style.height = "auto";
  // `scrollHeight` ignore les bordures là où `height` les compte
  // (`box-sizing: border-box`) : sans ce rattrapage, le champ ampute deux
  // pixels et la dernière ligne vacille à chaque frappe.
  const borders = el.offsetHeight - el.clientHeight;
  el.style.height = `${el.scrollHeight + borders}px`;
}

export function AutoTextarea({
  className,
  value,
  onChange,
  ref,
  ...props
}: React.ComponentProps<"textarea">) {
  const own = React.useRef<HTMLTextAreaElement | null>(null);

  const attach = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      own.current = node;
      fit(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Une valeur posée d'ailleurs - un brouillon rendu par l'IA, une remise à
  // zéro - doit ajuster la hauteur elle aussi : elle ne passe par aucune frappe.
  React.useLayoutEffect(() => {
    fit(own.current);
  }, [value]);

  return (
    <textarea
      ref={attach}
      value={value}
      rows={1}
      onChange={(event) => {
        fit(event.currentTarget);
        onChange?.(event);
      }}
      className={cn(
        "flex w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
