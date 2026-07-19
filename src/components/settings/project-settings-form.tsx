"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateProjectAction } from "@/server/actions/project.actions";
import { useDict } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ProjectSettingsFormProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    accentColor: string | null;
  };
}

/** Couleur d'accent par défaut (accent Artemis) affichée quand aucune
 *  couleur personnalisée n'est définie. */
const DEFAULT_ACCENT = "#5f4ec2";

/**
 * Édition du projet (Admin) : nom + description + couleur d'accent. La mutation
 * passe par la Server Action `updateProjectAction` (autorisation imposée côté
 * serveur). `accentColor === null` réinitialise la couleur à la charte.
 */
export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const router = useRouter();
  const t = useDict();
  const [submitting, setSubmitting] = useState(false);
  const [accentColor, setAccentColor] = useState<string | null>(
    project.accentColor,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) {
      toast.error(t.settings.form.nameRequired);
      return;
    }

    setSubmitting(true);
    const res = await updateProjectAction({
      id: project.id,
      name,
      description: description || null,
      accentColor,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.settings.form.updated);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="project-name">{t.settings.form.nameLabel}</Label>
        <Input
          id="project-name"
          name="name"
          defaultValue={project.name}
          maxLength={80}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="project-description">
          {t.settings.form.descriptionLabel}
        </Label>
        <Textarea
          id="project-description"
          name="description"
          defaultValue={project.description ?? ""}
          maxLength={500}
          rows={4}
          placeholder={t.settings.form.descriptionPlaceholder}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="project-accent">{t.settings.form.accentLabel}</Label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="project-accent"
            type="color"
            value={accentColor ?? DEFAULT_ACCENT}
            onChange={(event) => setAccentColor(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
            aria-label={t.settings.form.accentAriaLabel}
          />
          <span className="font-mono text-xs uppercase text-muted-foreground">
            {accentColor ??
              `${DEFAULT_ACCENT} ${t.settings.form.accentDefaultSuffix}`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={accentColor === null}
            onClick={() => setAccentColor(null)}
          >
            {t.settings.form.accentReset}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t.settings.form.accentHint}
        </p>
      </div>
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {t.common.save}
        </Button>
      </div>
    </form>
  );
}
