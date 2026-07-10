"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL,
  type LabelOption,
  type Member,
  type PriorityOption,
  type SprintOption,
  type TicketTypeOption,
} from "./ticket-fields";

/**
 * Barre de filtres de la vue liste : recherche `q` + selects (assigné / type /
 * priorité / label / sprint). Chaque changement met à jour les searchParams
 * (source de vérité côté serveur) et réinitialise la pagination.
 */
export function TicketFilters({
  members,
  sprints,
  labels,
  types,
  priorities,
}: {
  members: Member[];
  sprints: SprintOption[];
  labels: LabelOption[];
  types: TicketTypeOption[];
  priorities: PriorityOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function pushWith(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page"); // tout changement de filtre revient à la page 1
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setParam(key: string, value: string) {
    pushWith((params) => {
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
    });
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setParam("q", q.trim());
  }

  function resetAll() {
    setQ("");
    router.push(pathname);
  }

  const currentType = searchParams.get("typeId") ?? ALL;
  const currentPriority = searchParams.get("priorityId") ?? ALL;
  const currentAssignee = searchParams.get("assigneeId") ?? ALL;
  const currentSprint = searchParams.get("sprintId") ?? ALL;
  const currentLabel = searchParams.get("labelId") ?? ALL;
  const hasFilters =
    searchParams.toString().length > 0 && [...searchParams.keys()].some((k) => k !== "page");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <form onSubmit={submitSearch} className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="ticket-search">Recherche</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ticket-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Titre ou description…"
              className="w-56 pl-8"
            />
          </div>
        </div>
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
      </form>

      <div className="space-y-1.5">
        <Label htmlFor="filter-type">Type</Label>
        <Select value={currentType} onValueChange={(v) => setParam("typeId", v)}>
          <SelectTrigger id="filter-type" className="w-40" aria-label="Filtrer par type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les types</SelectItem>
            {types.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: o.color }}
                    aria-hidden
                  />
                  {o.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-priority">Priorité</Label>
        <Select
          value={currentPriority}
          onValueChange={(v) => setParam("priorityId", v)}
        >
          <SelectTrigger id="filter-priority" className="w-40" aria-label="Filtrer par priorité">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes priorités</SelectItem>
            {priorities.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: o.color }}
                    aria-hidden
                  />
                  {o.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-assignee">Assigné</Label>
        <Select
          value={currentAssignee}
          onValueChange={(v) => setParam("assigneeId", v)}
        >
          <SelectTrigger id="filter-assignee" className="w-44" aria-label="Filtrer par assigné">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les assignés</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name ?? m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-sprint">Sprint</Label>
        <Select
          value={currentSprint}
          onValueChange={(v) => setParam("sprintId", v)}
        >
          <SelectTrigger id="filter-sprint" className="w-44" aria-label="Filtrer par sprint">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les sprints</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-label">Label</Label>
        <Select
          value={currentLabel}
          onValueChange={(v) => setParam("labelId", v)}
        >
          <SelectTrigger id="filter-label" className="w-44" aria-label="Filtrer par label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les labels</SelectItem>
            {labels.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button type="button" variant="ghost" onClick={resetAll}>
          <X />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
