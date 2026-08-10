"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTicketLinkAction,
  deleteTicketLinkAction,
} from "@/server/actions/ticket-link.actions";
import type { LinkLabelKey } from "@/lib/ticket-links";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";

/**
 * TICKETS LIÉS - « bloque », « doublon de », « lié à ».
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE LECTEUR VOIT
 *
 * Une seule liste, jamais deux. Le lien est stocké orienté, mais un lecteur ne
 * se demande pas « de quel côté la ligne a-t-elle été écrite » : il veut savoir
 * ce qui, depuis CE ticket, bloque ou ressemble. Le serveur a déjà retourné
 * chaque lien du bon bout (cf. `resolveLinks`), l'affichage n'a plus qu'à le
 * rendre.
 *
 * Ce qui BLOQUE est en tête et se distingue : c'est la seule catégorie qui
 * conditionne le travail. Noyée au milieu de voisinages, la contrainte se
 * découvrirait le jour où elle fait mal.
 */

export interface TicketLinkView {
  id: string;
  labelKey: LinkLabelKey;
  blocking: boolean;
  other: {
    id: string;
    key: string;
    title: string;
    columnName: string;
  };
}

export interface LinkCandidate {
  id: string;
  key: string;
  title: string;
}

type LinkType = "BLOCKS" | "DUPLICATES" | "RELATES";

export function TicketLinks({
  ticketId,
  projectKey,
  links,
  candidates,
  canEdit,
}: {
  ticketId: string;
  projectKey: string;
  links: TicketLinkView[];
  /** Tickets du projet non encore liés. Vide = plus rien à proposer. */
  candidates: LinkCandidate[];
  canEdit: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const [type, setType] = useState<LinkType>("BLOCKS");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  /**
   * Recherche sur la clef ET le titre : on cite un ticket par sa clef quand on
   * la connaît, par ses mots sinon. Bornée à huit résultats - une liste plus
   * longue qu'un écran ne se choisit pas, elle se relit.
   */
  const trouves = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates.slice(0, 8);
    return candidates
      .filter(
        (c) =>
          c.key.toLowerCase().includes(q) || c.title.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [candidates, query]);

  async function lier(targetId: string) {
    setPending(targetId);
    const res = await createTicketLinkAction(ticketId, targetId, type);
    setPending(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setQuery("");
    toast.success(t.ticketDetail.links.added);
    router.refresh();
  }

  async function delier(id: string) {
    setPending(id);
    const res = await deleteTicketLinkAction(id);
    setPending(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.ticketDetail.links.removed);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {links.length > 0 ? (
        <ul className="space-y-1.5">
          {links.map((l) => (
            <li key={l.id} className="group/link flex items-center gap-2">
              <Badge
                variant={l.blocking ? "destructive" : "secondary"}
                className="shrink-0"
              >
                {t.ticketDetail.links.labels[l.labelKey]}
              </Badge>
              <Link
                href={`/projects/${projectKey}/tickets/${l.other.id}`}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {l.other.key}
                </span>
                <span className="min-w-0 flex-1 truncate">{l.other.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {l.other.columnName}
                </span>
              </Link>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending === l.id}
                  onClick={() => void delier(l.id)}
                  title={t.ticketDetail.links.remove}
                  aria-label={t.ticketDetail.links.remove}
                  // Révélé au survol, toujours visible au doigt et au clavier.
                  className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/link:opacity-100 pointer-coarse:opacity-100"
                >
                  {pending === l.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <X />
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !canEdit && (
          <p className="text-sm text-muted-foreground">
            {t.ticketDetail.links.empty}
          </p>
        )
      )}

      {canEdit && candidates.length > 0 && (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={type}
              onValueChange={(v) => setType(v as LinkType)}
            >
              <SelectTrigger
                className="w-[13rem]"
                aria-label={t.ticketDetail.links.typeLabel}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BLOCKS">
                  {t.ticketDetail.links.labels.blocks}
                </SelectItem>
                <SelectItem value="DUPLICATES">
                  {t.ticketDetail.links.labels.duplicates}
                </SelectItem>
                <SelectItem value="RELATES">
                  {t.ticketDetail.links.labels.relates}
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.ticketDetail.links.searchPlaceholder}
              aria-label={t.ticketDetail.links.searchPlaceholder}
              className="min-w-[12rem] flex-1"
            />
          </div>

          {trouves.length > 0 ? (
            <ul className="space-y-1">
              {trouves.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => void lier(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted/60",
                      pending !== null && "opacity-50",
                    )}
                  >
                    {pending === c.id ? (
                      <Loader2 className="size-3.5 shrink-0 animate-spin" />
                    ) : (
                      <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {c.key}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 text-xs text-muted-foreground">
              {t.ticketDetail.links.noMatch}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
