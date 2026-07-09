import type { ReactNode } from "react";
import Image from "next/image";

/** Layout des écrans d'authentification : carte centrée sur fond atténué. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <Image
            src="/rakoon-mark.png"
            alt="Rakoon"
            width={26}
            height={26}
            className="dark:invert"
            priority
          />
          <span>Rakoon Tracker</span>
        </div>
        {children}
      </div>
    </div>
  );
}
