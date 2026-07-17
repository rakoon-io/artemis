"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { Role } from "@prisma/client";
import {
  createUserAction,
  deleteUserAction,
  resendSetupLinkAction,
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

/** Etat d'un lien de première connexion à présenter (copie / envoi). */
interface SetupLink {
  url: string;
  email: string;
  emailSent: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "Administrateur",
  [Role.REPORTER]: "Rapporteur",
};

/**
 * Gestion des utilisateurs & rôles (Admin) : liste, changement de rôle,
 * suppression, et **lien de première connexion** (à la création ou relancé plus
 * tard). Les gardes serveur restent la source de vérité.
 */
export function UserManager({
  users,
  currentUserId,
}: {
  users: MemberRow[];
  currentUserId: string;
}) {
  const [link, setLink] = useState<SetupLink | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddUserDialog onLink={setLink} />
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
              onLink={setLink}
            />
          ))}
        </ul>
      )}

      <SetupLinkDialog link={link} onClose={() => setLink(null)} />
    </div>
  );
}

/** Une ligne : identité, badge rôle, sélecteur de rôle, lien de connexion, suppression. */
function UserRow({
  member,
  isSelf,
  onLink,
}: {
  member: MemberRow;
  isSelf: boolean;
  onLink: (link: SetupLink) => void;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [sending, setSending] = useState(false);
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

  async function handleResend() {
    setSending(true);
    const res = await resendSetupLinkAction(member.id);
    setSending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onLink({
      url: res.data!.setupUrl,
      email: res.data!.email,
      emailSent: res.data!.emailSent,
    });
    toast.success(
      res.data!.emailSent
        ? "Lien envoyé par e-mail."
        : "Lien généré (à copier).",
    );
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
        <SelectTrigger className="w-44" aria-label={`Rôle de ${displayName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={Role.REPORTER}>Rapporteur</SelectItem>
          <SelectItem value={Role.ADMIN}>Administrateur</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleResend}
        disabled={sending}
        aria-label={`Lien de connexion pour ${displayName}`}
        title="Envoyer un lien de première connexion / réinitialisation"
      >
        {sending ? <Loader2 className="animate-spin" /> : <KeyRound />}
      </Button>

      <DeleteUserDialog
        userId={member.id}
        displayName={displayName}
        isSelf={isSelf}
      />
    </li>
  );
}

/** Dialogue affichant un lien de première connexion (copie + statut d'envoi). */
function SetupLinkDialog({
  link,
  onClose,
}: {
  link: SetupLink | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible. Sélectionnez le lien manuellement.");
    }
  }

  return (
    <Dialog open={!!link} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lien de première connexion</DialogTitle>
          <DialogDescription>
            {link?.emailSent
              ? `Un e-mail a été envoyé à ${link.email}. Vous pouvez aussi copier le lien.`
              : `Copiez ce lien et transmettez-le à ${link?.email}. L'envoi d'e-mail n'est pas configuré.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={link?.url ?? ""}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-xs"
          />
          <Button type="button" variant="outline" onClick={copy} className="shrink-0">
            {copied ? <Check /> : <Copy />}
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ce lien est valable 7 jours et à usage unique.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Fermer
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            Artemis.
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

/** Dialogue de création d'un utilisateur (mot de passe optionnel = lien de connexion). */
function AddUserDialog({ onLink }: { onLink: (link: SetupLink) => void }) {
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
    if (!name || !email) {
      toast.error("Renseignez un nom et un e-mail.");
      return;
    }
    if (password && password.length < 8) {
      toast.error("Le mot de passe doit faire 8 caractères minimum.");
      return;
    }

    setSubmitting(true);
    const res = await createUserAction({
      name,
      email,
      role,
      ...(password ? { password } : {}),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    form.reset();
    setRole(Role.REPORTER);
    setOpen(false);
    if (res.data?.setupUrl) {
      onLink({
        url: res.data.setupUrl,
        email: res.data.email,
        emailSent: !!res.data.emailSent,
      });
      toast.success(`« ${name} » créé. Lien de première connexion généré.`);
    } else {
      toast.success(`Utilisateur « ${name} » créé.`);
    }
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
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour envoyer un lien de première connexion (l&apos;utilisateur
              choisit son mot de passe).
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
