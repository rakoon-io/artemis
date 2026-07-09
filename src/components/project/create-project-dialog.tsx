"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createProjectAction } from "@/server/actions/project.actions";
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
import { Textarea } from "@/components/ui/textarea";

/** Boîte de dialogue de création de projet (réservée aux admins côté UI). */
export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [key, setKey] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    setIsSubmitting(true);
    const res = await createProjectAction({
      name,
      key,
      description: description || undefined,
    });
    setIsSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success(`Projet ${res.data?.key ?? key} créé.`);
    setOpen(false);
    setKey("");
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nouveau projet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
          <DialogDescription>
            La clé préfixe les tickets du projet (ex : RKN-1).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Nom</Label>
            <Input
              id="project-name"
              name="name"
              maxLength={80}
              placeholder="Rakoon Tracker"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-key">Clé</Label>
            <Input
              id="project-key"
              name="key"
              value={key}
              onChange={(event) =>
                setKey(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "")
                    .slice(0, 6),
                )
              }
              className="uppercase"
              placeholder="RKN"
              autoCapitalize="characters"
              autoComplete="off"
              aria-describedby="project-key-hint"
              required
            />
            <p id="project-key-hint" className="text-xs text-muted-foreground">
              2 à 6 lettres majuscules.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-description">Description (optionnel)</Label>
            <Textarea
              id="project-description"
              name="description"
              maxLength={500}
              placeholder="Objet du projet…"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || key.length < 2}>
              {isSubmitting ? "Création…" : "Créer le projet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
