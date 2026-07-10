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
  project: { id: string; name: string; description: string | null };
}

/**
 * Édition du projet (Admin) : nom + description. La mutation passe par la Server
 * Action `updateProjectAction` (autorisation imposée côté serveur).
 */
export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
