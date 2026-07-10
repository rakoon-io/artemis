"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { Role } from "@prisma/client";
import {
  createUserAction,
  deleteUserAction,
  updateUserRoleAction,
} from "@/server/actions/user.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Utilisateur listé (jamais de `passwordHash` côté client). */
export interface MemberRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
}

const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "Administrateur",
  [Role.REPORTER]: "Rapporteur",
};

/**
 * Gestion des utilisateurs & rôles (Admin) : liste (nom, e-mail, badge rôle),
 * changement de rôle et suppression par ligne, ajout via un dialogue. Les gardes
 * (dernier admin, auto-suppression) sont reflétées en UI mais imposées serveur.
 */
export function UserManager({
  users,
  currentUserId,
}: {
  users: MemberRow[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddUserDialog />
      </div>

      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun utilisateur.
        </p>
      ) : (
        <ul className="space-y-2">
          {users.map((member) => (
            <UserRow
              key={member.id}
              member={member}
              isSelf={member.id === currentUserId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Une ligne : identité, badge rôle, sélecteur de rôle et suppression. */
function UserRow({ member, isSelf }: { member: MemberRow; isSelf: boolean }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const displayName = member.name?.trim() || member.email;

  async function handleRoleChange(next: string) {
    if (next === member.role) return;
    setUpdating(true);
    const res = await updateUserRoleAction(member.id, next as Role);
    setUpdating(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Rôle mis à jour.");
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{displayName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {member.email}
        </span>
      </div>

      <Badge variant={member.role === Role.ADMIN ? "default" : "secondary"}>
        {ROLE_LABELS[member.role]}
      </Badge>

      <Select
        value={member.role}
        onValueChange={handleRoleChange}
        disabled={updating}
      >
        <SelectTrigger
          className="w-44"
          aria-label={`Rôle de ${displayName}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={Role.REPORTER}>Rapporteur</SelectItem>
          <SelectItem value={Role.ADMIN}>Administrateur</SelectItem>
        </SelectContent>
      </Select>

      <DeleteUserDialog
        userId={member.id}
        displayName={displayName}
        isSelf={isSelf}
      />
    </li>
  );
}

/** Confirmation de suppression (désactivée pour son propre compte). */
function DeleteUserDialog({
  userId,
  displayName,
  isSelf,
}: {
  userId: string;
  displayName: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    const res = await deleteUserAction(userId);
    if (!res.ok) {
      toast.error(res.error);
      setSubmitting(false);
      return;
    }
    toast.success(`Utilisateur « ${displayName} » supprimé.`);
    setOpen(false);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          disabled={isSelf}
          aria-label={`Supprimer ${displayName}`}
          title={
            isSelf
              ? "Vous ne pouvez pas supprimer votre propre compte."
              : undefined
          }
        >
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer « {displayName} » ?</DialogTitle>
          <DialogDescription>
            Cette action est définitive : l&apos;utilisateur perdra l&apos;accès à
            Rakoon Tracker.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting && <Loader2 className="animate-spin" />}
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Dialogue de création d'un utilisateur (nom, e-mail, mot de passe, rôle). */
function AddUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<Role>(Role.REPORTER);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!name || !email || password.length < 8) {
      toast.error(
        "Renseignez un nom, un e-mail et un mot de passe (8 caractères minimum).",
      );
      return;
    }

    setSubmitting(true);
    const res = await createUserAction({ name, email, password, role });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Utilisateur « ${name} » créé.`);
    form.reset();
    setRole(Role.REPORTER);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button">
          <UserPlus />
          Ajouter un utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un utilisateur</DialogTitle>
          <DialogDescription>
            Créez un compte et attribuez-lui un rôle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new-user-name">Nom</Label>
            <Input id="new-user-name" name="name" maxLength={80} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-user-email">E-mail</Label>
            <Input
              id="new-user-email"
              name="email"
              type="email"
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-user-password">Mot de passe</Label>
            <Input
              id="new-user-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              8 caractères minimum.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-user-role">Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="new-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.REPORTER}>Rapporteur</SelectItem>
                <SelectItem value={Role.ADMIN}>Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
