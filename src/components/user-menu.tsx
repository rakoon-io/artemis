"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Mail, Users } from "lucide-react";
import type { Role } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useDict } from "@/i18n/provider";
import { initials } from "@/lib/utils";

export interface UserMenuProps {
  user: { name: string | null; email: string; role: Role };
}

/** Avatar (initiales) + menu : identité, rôle, langue, déconnexion. */
export function UserMenu({ user }: UserMenuProps) {
  const t = useDict();
  const displayName = user.name ?? user.email;
  const roleLabels: Record<Role, string> = {
    ADMIN: t.userMenu.roleAdmin,
    REPORTER: t.userMenu.roleReporter,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t.userMenu.menuLabel}
        >
          <Avatar className="size-8">
            <AvatarFallback>
              {initials(displayName).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-2 font-normal">
          <span className="truncate text-sm font-medium">{displayName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
          <Badge variant="secondary" className="w-fit">
            {roleLabels[user.role]}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === "ADMIN" && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/users">
                <Users />
                {t.userMenu.users}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/emails">
                <Mail />
                {t.userMenu.emails}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <LocaleSwitcher label={t.userMenu.language} />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ redirectTo: "/login" })}>
          <LogOut />
          {t.userMenu.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
