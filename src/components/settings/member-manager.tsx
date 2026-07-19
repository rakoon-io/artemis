"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Plus, ShieldCheck } from "lucide-react";
import { Role } from "@prisma/client";
import {
  addProjectMemberAction,
  removeProjectMemberAction,
} from "@/server/actions/membership.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/** Utilisateur listé avec son appartenance au projet. */
export interface MemberViewRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isMember: boolean;
}

/**
 * Gestion des membres d'un projet (Admin) : chaque utilisateur peut se voir
 * accorder ou retirer l'accès. Les administrateurs accèdent à tous les projets ;
 * ils sont affichés comme tels, sans bascule.
 */
export function MemberManager({
  projectId,
  users,
}: {
  projectId: string;
  users: MemberViewRow[];
}) {
  const t = useDict();
  const admins = users.filter((u) => u.role === Role.ADMIN);
  const others = users.filter((u) => u.role !== Role.ADMIN);
  const memberCount = others.filter((u) => u.isMember).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {fmt(t.taxonomy.members.summary, {
          reporters: memberCount,
          rs: memberCount > 1 ? "s" : "",
          admins: admins.length,
          as: admins.length > 1 ? "s" : "",
        })}
      </p>

      {others.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            {t.taxonomy.members.reportersHeading}
          </h3>
          <ul className="space-y-2">
            {others.map((u) => (
              <MemberRow key={u.id} projectId={projectId} user={u} />
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          {t.taxonomy.members.adminsHeading}
        </h3>
        <ul className="space-y-2">
          {admins.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {u.name?.trim() || u.email}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {u.email}
                </span>
              </div>
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="size-3.5" />
                {t.taxonomy.members.fullAccess}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Une ligne rapporteur : identité + bouton d'accès (membre / non membre). */
function MemberRow({
  projectId,
  user,
}: {
  projectId: string;
  user: MemberViewRow;
}) {
  const router = useRouter();
  const t = useDict();
  const [pending, setPending] = useState(false);
  const displayName = user.name?.trim() || user.email;

  async function toggle() {
    setPending(true);
    const res = user.isMember
      ? await removeProjectMemberAction(projectId, user.id)
      : await addProjectMemberAction(projectId, user.id);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      user.isMember
        ? fmt(t.taxonomy.members.accessRevoked, { name: displayName })
        : fmt(t.taxonomy.members.accessGranted, { name: displayName }),
    );
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{displayName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      </div>

      {user.isMember && (
        <Badge variant="secondary" className="gap-1">
          <Check className="size-3.5" />
          {t.taxonomy.members.member}
        </Badge>
      )}

      <Button
        type="button"
        size="sm"
        variant={user.isMember ? "outline" : "default"}
        onClick={toggle}
        disabled={pending}
        className="w-32"
        aria-label={
          user.isMember
            ? fmt(t.taxonomy.members.revokeAria, { name: displayName })
            : fmt(t.taxonomy.members.grantAria, { name: displayName })
        }
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : user.isMember ? (
          t.taxonomy.members.revoke
        ) : (
          <>
            <Plus />
            {t.taxonomy.members.grant}
          </>
        )}
      </Button>
    </li>
  );
}
