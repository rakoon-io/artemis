"use client";

import Link from "next/link";
import { FileDown, FileText, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * EXPORT d'une page : elle seule, ou elle et tout ce qui pend sous elle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX ENTRÉES, ET LEUR PORTÉE ANNONCÉE
 *
 * La différence entre les deux commandes n'est pas de degré mais de nature :
 * l'une produit une page, l'autre un document de trente. Une personne qui
 * découvre le menu ne peut pas le deviner du seul intitulé - d'où la ligne
 * d'explication sous chacune, et surtout le NOMBRE de pages annoncé avant le
 * clic. Un document dont on ne mesure l'ampleur qu'une fois engendré se
 * découvre trop tard, et l'on a déjà attendu.
 *
 * La seconde entrée disparaît pour une feuille : proposer d'exporter « cette
 * page et ses sous-pages » quand il n'y en a aucune serait proposer deux fois
 * la même chose.
 */
export function ExportPageMenu({
  projectKey,
  handle,
  subpageCount,
}: {
  projectKey: string;
  /** Slug (ou identifiant) de la page, tel qu'il voyage dans l'URL. */
  handle: string;
  /** Nombre de descendants ; zéro masque la seconde entrée. */
  subpageCount: number;
}) {
  const t = useDict();
  const base = `/projects/${projectKey}/wiki/imprimer?page=${encodeURIComponent(handle)}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown />
          {t.wiki.export.action}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuItem asChild>
          <Link href={base} className="flex items-start gap-2">
            <FileText className="mt-0.5 shrink-0" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm">{t.wiki.export.page}</span>
              <span className="text-xs text-muted-foreground">
                {t.wiki.export.pageHint}
              </span>
            </span>
          </Link>
        </DropdownMenuItem>
        {subpageCount > 0 && (
          <DropdownMenuItem asChild>
            <Link href={`${base}&sousPages=1`} className="flex items-start gap-2">
              <Files className="mt-0.5 shrink-0" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm">{t.wiki.export.subtree}</span>
                <span className="text-xs text-muted-foreground">
                  {/* La page elle-même compte : le document en contient bien
                      `subpageCount + 1`. */}
                  {fmt(t.wiki.export.subtreeHint, { count: subpageCount + 1 })}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
