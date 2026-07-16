"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Barre de recherche du wiki : soumet vers `?q=...` (recherche titre + contenu). */
export function WikiSearch({
  projectKey,
  initialQuery,
}: {
  projectKey: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const base = `/projects/${projectKey}/wiki`;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = q.trim();
    router.push(query ? `${base}?q=${encodeURIComponent(query)}` : base);
  }

  function clear() {
    setQ("");
    router.push(base);
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher..."
        aria-label="Rechercher dans le wiki"
        className="pl-8 pr-8"
      />
      {q && (
        <button
          type="button"
          onClick={clear}
          aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}
