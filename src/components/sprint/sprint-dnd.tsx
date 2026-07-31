"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { setTicketSprintAction } from "@/server/actions/ticket.actions";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * GLISSER-DÉPOSER DE LA PLANIFICATION : du backlog vers un sprint, et retour.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ON DÉPOSE DANS UN SPRINT, PAS À UNE PLACE
 *
 * Le tableau Kanban déplace un ticket ET l'ordonne : la position dans la colonne
 * y est un classement qu'on tient à la main, et chaque dépôt calcule un rang
 * entre deux voisins. Ici, non : un sprint est un ENSEMBLE. « Ce ticket entre
 * dans l'itération » est la seule question posée, et l'ordre d'affichage n'a
 * jamais été un choix de l'utilisateur.
 *
 * D'où de simples zones de dépôt plutôt qu'une liste triable : rien à calculer,
 * rien à faire glisser au bon endroit, et une cible large - le sprint entier -
 * au lieu d'une fente entre deux lignes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE MENU RESTE
 *
 * Le menu « Déplacer vers » de chaque ligne n'est pas remplacé : c'est le chemin
 * du clavier, et le seul qui marche quand le sprint visé est à trois écrans plus
 * bas. Le glisser-déposer est un raccourci pour ce qui est visible, pas la seule
 * porte.
 */

/** Cible de dépôt du backlog. Un sprint est désigné par son identifiant. */
export const BACKLOG_DROP_ID = "backlog";

/**
 * LE TICKET QUI VIENT DE PARTIR.
 *
 * Entre le lâcher et l'arrivée des données du serveur, il s'écoule cent
 * cinquante millisecondes - mesurées - pendant lesquelles la ligne est encore
 * affichée à SA PLACE D'ORIGINE. Ajoutée à l'animation de dépôt, cela donnait
 * l'impression que le ticket revenait d'où il venait, alors qu'il était déjà
 * parti (cf. `SprintDndProvider`).
 *
 * On retient donc, le temps de l'aller-retour, d'où le ticket s'en va ; sa
 * ligne d'origine s'efface aussitôt.
 *
 * RIEN À NETTOYER : la condition porte sur la liste de DÉPART. Une fois les
 * données rafraîchies, le ticket n'est plus rendu là - et à sa nouvelle place,
 * la liste ne correspond plus, donc il s'affiche. Un souvenir périmé est sans
 * effet, ce qui évite d'avoir à l'effacer au bon moment.
 */
const PartiContext = createContext<{
  ticketId: string;
  from: string | null;
} | null>(null);

/** Vrai si ce ticket vient d'être déplacé HORS de cette liste. */
export function useJustLeft(ticketId: string, bucketId: string | null): boolean {
  const parti = useContext(PartiContext);
  return parti?.ticketId === ticketId && parti.from === bucketId;
}

/** Ce qu'une ligne emporte avec elle pendant le déplacement. */
export interface DraggedTicket {
  key: string;
  title: string;
  sprintId: string | null;
}

/**
 * Contexte de déplacement + calque de survol, autour des deux colonnes.
 *
 * `id` FIXE : dnd-kit numérote sinon ses identifiants d'accessibilité au fil des
 * montages, et le serveur ne compte pas comme le navigateur - l'hydratation
 * signalait une divergence (leçon déjà payée sur le tableau, cf. `kanban-board`).
 */
export function SprintDndProvider({
  sprintNames,
  children,
}: {
  /** Nom de chaque sprint, pour ce qu'annonce le lecteur d'écran. */
  sprintNames: Record<string, string>;
  children: ReactNode;
}) {
  const t = useDict();
  const router = useRouter();
  const [dragged, setDragged] = useState<DraggedTicket | null>(null);
  const [parti, setParti] = useState<{ ticketId: string; from: string | null } | null>(
    null,
  );

  const sensors = useSensors(
    // Huit pixels avant de considérer que l'on déplace : sans ce seuil, le
    // moindre frémissement de souris sur la poignée avalerait le clic.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const targetName = useMemo(
    () => (id: string) => sprintNames[id] ?? t.sprints.backlog,
    [sprintNames, t],
  );

  const announcements: Announcements = useMemo(() => {
    const ticketOf = (event: { active: { data: { current?: unknown } } }) => {
      const data = event.active.data.current as DraggedTicket | undefined;
      return data ? `${data.key} ${data.title}` : "";
    };
    return {
      onDragStart: (event) =>
        fmt(t.sprints.announceDragStart, { ticket: ticketOf(event) }),
      onDragOver: (event) =>
        event.over
          ? fmt(t.sprints.announceDragOver, {
              ticket: ticketOf(event),
              over: targetName(String(event.over.id)),
            })
          : fmt(t.sprints.announceDragOverNone, { ticket: ticketOf(event) }),
      onDragEnd: (event) =>
        event.over
          ? fmt(t.sprints.announceDragEnd, {
              ticket: ticketOf(event),
              over: targetName(String(event.over.id)),
            })
          : fmt(t.sprints.announceDragEndNone, { ticket: ticketOf(event) }),
      onDragCancel: (event) =>
        fmt(t.sprints.announceDragCancel, { ticket: ticketOf(event) }),
    };
  }, [t, targetName]);

  function handleDragStart(event: DragStartEvent) {
    setDragged((event.active.data.current as DraggedTicket) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const data = event.active.data.current as DraggedTicket | undefined;
    setDragged(null);
    if (!event.over || !data) return;

    const over = String(event.over.id);
    const target = over === BACKLOG_DROP_ID ? null : over;
    // Reposé d'où il vient : rien à écrire. Un aller-retour serveur pour
    // n'aboutir à aucun changement afficherait une notification mensongère.
    if (target === data.sprintId) return;

    // La ligne d'origine s'efface AVANT l'aller-retour, pas après : c'est cette
    // attente-là qui donnait l'impression d'un retour à la case départ.
    const ticketId = String(event.active.id);
    setParti({ ticketId, from: data.sprintId });

    const res = await setTicketSprintAction(ticketId, target);
    if (!res.ok) {
      // Le serveur a refusé : le ticket n'a jamais bougé, sa ligne revient.
      setParti(null);
      toast.error(res.error);
      return;
    }
    toast.success(
      target ? t.sprints.ticketAddedToSprint : t.sprints.ticketMovedToBacklog,
    );
    router.refresh();
  }

  return (
    <DndContext
      id="sprints"
      sensors={sensors}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragEnd={(event) => void handleDragEnd(event)}
      onDragCancel={() => setDragged(null)}
    >
      <PartiContext.Provider value={parti}>{children}</PartiContext.Provider>
      {/**
       * PAS D'ANIMATION DE DÉPÔT.
       *
       * Par défaut, dnd-kit ramène le calque à la position du nœud d'origine en
       * deux cent cinquante millisecondes. Comme ce nœud est resté dans la liste
       * de départ le temps de l'aller-retour, le calque volait EN ARRIÈRE - vers
       * le backlog - juste après un dépôt réussi. On lisait un refus là où il y
       * avait un succès.
       *
       * Le calque disparaît donc là où on l'a lâché, pendant que la ligne
       * d'origine s'efface : le ticket est parti dans la direction où on l'a
       * poussé, et rien ne le contredit.
       */}
      <DragOverlay dropAnimation={null}>
        {dragged && (
          <div className="flex max-w-sm items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm shadow-lg">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {dragged.key}
            </span>
            <span className="truncate">{dragged.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Zone de dépôt d'un sprint (ou du backlog).
 *
 * Elle enveloppe la liste PLUTÔT que d'être la liste : un sprint vide n'affiche
 * pas de `<ul>` mais une phrase, et c'est précisément le sprint sur lequel on a
 * le plus envie de déposer quelque chose. Une cible qui n'existerait qu'une fois
 * remplie serait inutile là où elle sert le plus.
 */
export function TicketDropZone({
  sprintId,
  children,
  className,
}: {
  /** `null` = le backlog. */
  sprintId: string | null;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: sprintId ?? BACKLOG_DROP_ID,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md transition-colors",
        // Un liseré, pas un aplat : la liste survolée garde ses couleurs de
        // ticket, qui disent le type et la priorité.
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className,
      )}
    >
      {children}
    </div>
  );
}
