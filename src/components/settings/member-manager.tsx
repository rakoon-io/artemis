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
  const admins = users.filter((u) => u.role === Role.ADMIN);
  const others = users.filter((u) => u.role !== Role.ADMIN);
  const memberCount = others.filter((u) => u.isMember).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {memberCount} rapporteur{memberCount > 1 ? "s" : ""} avec accès, plus{" "}
        {admins.length} administrateur{admins.length > 1 ? "s" : ""} (accès à tous
        les projets).
      </p>

      {others.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Rapporteurs</h3>
          <ul className="space-y-2">
            {others.map((u) => (
              <MemberRow key={u.id} projectId={projectId} user={u} />
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Administrateurs</h3>
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
                Accès total
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
        ? `Accès retiré à « ${displayName} ».`
        : `Accès accordé à « ${displayName} ».`,
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
          Membre
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
            ? `Retirer l'accès de ${displayName}`
            : `Donner l'accès à ${displayName}`
        }
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : user.isMember ? (
          "Retirer l'accès"
        ) : (
          <>
            <Plus />
            Donner l&apos;accès
          </>
        )}
      </Button>
    </li>
  );
}
