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
import { fmt } from "@/i18n";
import { useDict } from "@/i18n/provider";
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
  const t = useDict();
  const [link, setLink] = useState<SetupLink | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddUserDialog onLink={setLink} />
      </div>

      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.admin.users.empty}
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
  const t = useDict();
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [sending, setSending] = useState(false);
  const displayName = member.name?.trim() || member.email;
  const roleLabels: Record<Role, string> = {
    [Role.ADMIN]: t.admin.users.roleAdmin,
    [Role.REPORTER]: t.admin.users.roleReporter,
  };

  async function handleRoleChange(next: string) {
    if (next === member.role) return;
    setUpdating(true);
    const res = await updateUserRoleAction(member.id, next as Role);
    setUpdating(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.admin.users.roleUpdated);
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
        ? t.admin.users.setupLinkSentToast
        : t.admin.users.setupLinkGeneratedToast,
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
        {roleLabels[member.role]}
      </Badge>

      <Select
        value={member.role}
        onValueChange={handleRoleChange}
        disabled={updating}
      >
        <SelectTrigger
          className="w-44"
          aria-label={fmt(t.admin.users.roleSelectLabel, { name: displayName })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={Role.REPORTER}>
            {roleLabels[Role.REPORTER]}
          </SelectItem>
          <SelectItem value={Role.ADMIN}>{roleLabels[Role.ADMIN]}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleResend}
        disabled={sending}
        aria-label={fmt(t.admin.users.setupLinkAria, { name: displayName })}
        title={t.admin.users.setupLinkTitle}
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
  const t = useDict();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t.admin.users.copyError);
    }
  }

  return (
    <Dialog open={!!link} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.admin.users.setupTitle}</DialogTitle>
          <DialogDescription>
            {link?.emailSent
              ? fmt(t.admin.users.setupDescriptionSent, { email: link.email })
              : fmt(t.admin.users.setupDescriptionManual, {
                  email: link?.email ?? "",
                })}
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
            {copied ? t.admin.users.copied : t.admin.users.copy}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t.admin.users.setupHint}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t.admin.users.close}
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
  const t = useDict();
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
    toast.success(fmt(t.admin.users.deletedToast, { name: displayName }));
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
          aria-label={fmt(t.admin.users.deleteAria, { name: displayName })}
          title={isSelf ? t.admin.users.deleteSelfTitle : undefined}
        >
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {fmt(t.admin.users.deleteTitle, { name: displayName })}
          </DialogTitle>
          <DialogDescription>
            {t.admin.users.deleteDescription}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting && <Loader2 className="animate-spin" />}
            {t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Dialogue de création d'un utilisateur (mot de passe optionnel = lien de connexion). */
function AddUserDialog({ onLink }: { onLink: (link: SetupLink) => void }) {
  const t = useDict();
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
      toast.error(t.admin.users.validationMissing);
      return;
    }
    if (password && password.length < 8) {
      toast.error(t.admin.users.validationPasswordShort);
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
      toast.success(fmt(t.admin.users.createdWithLinkToast, { name }));
    } else {
      toast.success(fmt(t.admin.users.createdToast, { name }));
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button">
          <UserPlus />
          {t.admin.users.addUser}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.admin.users.addUser}</DialogTitle>
          <DialogDescription>
            {t.admin.users.addUserDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new-user-name">{t.admin.users.nameLabel}</Label>
            <Input id="new-user-name" name="name" maxLength={80} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-user-email">{t.admin.users.emailLabel}</Label>
            <Input
              id="new-user-email"
              name="email"
              type="email"
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-user-password">
              {t.admin.users.passwordLabel}
            </Label>
            <Input
              id="new-user-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {t.admin.users.passwordHint}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-user-role">{t.admin.users.roleLabel}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="new-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.REPORTER}>
                  {t.admin.users.roleReporter}
                </SelectItem>
                <SelectItem value={Role.ADMIN}>
                  {t.admin.users.roleAdmin}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                {t.common.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
              {t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
