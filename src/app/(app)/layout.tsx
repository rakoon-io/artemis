import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TrackerMark } from "@/components/brand/tracker-mark";
import { ThemePicker } from "@/components/theme-picker";
import { UserMenu } from "@/components/user-menu";

/** Shell global de l'espace connecté : barre du haut + conteneur principal. */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    role: session.user.role,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 w-full items-center gap-4 px-4 md:px-6">
          <Link
            href="/projects"
            className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
          >
            <TrackerMark className="size-7 shrink-0 text-primary" />
            <span>Rakoon Tracker</span>
          </Link>
          <div className="flex-1" />
          <ThemePicker />
          <UserMenu user={user} />
        </div>
      </header>
      <main className="w-full flex-1">{children}</main>
    </div>
  );
}
