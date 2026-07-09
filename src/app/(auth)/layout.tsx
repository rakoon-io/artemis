import type { ReactNode } from "react";

/** Layout des écrans d'authentification : carte centrée sur fond atténué. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <span aria-hidden>🦝</span>
          <span>Rakoon Tracker</span>
        </div>
        {children}
      </div>
    </div>
  );
}
