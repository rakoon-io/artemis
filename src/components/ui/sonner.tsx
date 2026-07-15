"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { themeMode } from "@/lib/themes";

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  // Les palettes (« midnight », « sable »…) ne sont pas « light »/« dark » : on mappe
  // vers le mode réel pour que Sonner applique le bon style de toast.
  const theme: ToasterProps["theme"] = resolvedTheme
    ? themeMode(resolvedTheme)
    : "system";

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
