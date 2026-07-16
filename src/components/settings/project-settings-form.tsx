"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateProjectAction } from "@/server/actions/project.actions";
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

/** Couleur d'accent par défaut (charte Rakoon, bordeaux) affichée quand aucune
 *  couleur personnalisée n'est définie. */
const DEFAULT_ACCENT = "#5f4ec2";

/**
 * Édition du projet (Admin) : nom + description + couleur d'accent. La mutation
 * passe par la Server Action `updateProjectAction` (autorisation imposée côté
 * serveur). `accentColor === null` réinitialise la couleur à la charte.
 */
export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const router = useRouter();
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
      toast.error("Le nom est requis.");
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
    toast.success("Projet mis à jour.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="project-name">Nom</Label>
        <Input
          id="project-name"
          name="name"
          defaultValue={project.name}
          maxLength={80}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="project-description">Description</Label>
        <Textarea
          id="project-description"
          name="description"
          defaultValue={project.description ?? ""}
          maxLength={500}
          rows={4}
          placeholder="Description du projet (optionnel)"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="project-accent">Couleur d&apos;accent</Label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="project-accent"
            type="color"
            value={accentColor ?? DEFAULT_ACCENT}
            onChange={(event) => setAccentColor(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
            aria-label="Couleur d'accent du projet"
          />
          <span className="font-mono text-xs uppercase text-muted-foreground">
            {accentColor ?? `${DEFAULT_ACCENT} (par défaut)`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={accentColor === null}
            onClick={() => setAccentColor(null)}
          >
            Réinitialiser
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Personnalise la couleur principale des boutons et surbrillances du
          projet. « Réinitialiser » rétablit la charte Rakoon.
        </p>
      </div>
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
