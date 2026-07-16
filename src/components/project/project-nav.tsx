"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface ProjectNavProps {
  projectKey: string;
  isAdmin: boolean;
}

/** Onglets de navigation d'un projet (l'actif est déduit de l'URL courante). */
export function ProjectNav({ projectKey, isAdmin }: ProjectNavProps) {
  const pathname = usePathname();
  const base = `/projects/${projectKey}`;

  const tabs = [
    { href: `${base}/board`, label: "Tableau" },
    { href: `${base}/tickets`, label: "Tickets" },
    { href: `${base}/sprints`, label: "Sprints" },
    { href: `${base}/wiki`, label: "Wiki" },
    ...(isAdmin ? [{ href: `${base}/settings`, label: "Paramètres" }] : []),
  ];

  return (
    <nav
      className="flex items-center gap-1 border-b"
      aria-label="Navigation du projet"
    >
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
