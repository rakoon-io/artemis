import Link from "next/link";
import { CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";
import type { ActivityState } from "@/lib/my-activity";
import { cn } from "@/lib/utils";
import type { AssignedTicket } from "@/server/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * MON ACTIVITÉ - ce que j'ai sur les bras, en tête de l'accueil.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI EN HAUT DE L'ACCUEIL
 *
 * L'accueil listait les PROJETS. Or on n'arrive pas au travail en se demandant
 * « quels projets existent ? » mais « qu'est-ce que j'ai à faire ? » - et il
 * fallait ouvrir chaque projet, puis filtrer sur soi, pour l'apprendre. Trois
 * colonnes y répondent d'un regard, tous projets confondus.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE REGROUPEMENT SITUE, LE LIBELLÉ PRÉCISE
 *
 * Les trois états sont déduits du RANG des colonnes (cf. `@/lib/my-activity`),
 * jamais de leur nom. Le nom réel de la colonne reste affiché sur chaque ligne :
 * un projet qui distingue « À faire », « En cours » et « En revue » se lit sans
 * ambiguïté, alors même que les trois tiennent dans la même colonne ici.
 *
 * Rendu SERVEUR, sans état : la date est mise en forme avec un fuseau fixe
 * (`formatDate`), il n'y a donc rien à faire concorder à l'hydratation.
 */

/** Au-delà, la zone cesse d'être un coup d'œil et devient une liste à dérouler. */
const MAX_PAR_COLONNE = 6;

interface Groupe {
  state: ActivityState;
  label: string;
  vide: string;
  tickets: AssignedTicket[];
  Icon: typeof CircleDot;
}

export async function MyActivity({
  activity,
}: {
  activity: { todo: AssignedTicket[]; doing: AssignedTicket[]; done: AssignedTicket[] };
}) {
  const t = await getDictionary();
  const total =
    activity.todo.length + activity.doing.length + activity.done.length;

  const groupes: Groupe[] = [
    {
      state: "todo",
      label: t.activity.todo,
      vide: t.activity.emptyTodo,
      tickets: activity.todo,
      Icon: CircleDashed,
    },
    {
      state: "doing",
      label: t.activity.doing,
      vide: t.activity.emptyDoing,
      tickets: activity.doing,
      Icon: CircleDot,
    },
    {
      state: "done",
      label: t.activity.done,
      vide: t.activity.emptyDone,
      tickets: activity.done,
      Icon: CircleCheck,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{t.activity.title}</CardTitle>
            <CardDescription>{t.activity.subtitle}</CardDescription>
          </div>
          {total > 0 && (
            <Badge variant="secondary">
              {total}{" "}
              {total > 1 ? t.projects.ticketOther : t.projects.ticketOne}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {t.activity.empty}
          </p>
        ) : (
          /* `items-start` : chaque colonne garde sa hauteur propre, sinon la
             plus fournie étirerait les deux autres et leurs bordures. */
          <div className="grid items-start gap-x-6 gap-y-5 sm:grid-cols-3">
            {groupes.map((groupe) => (
              <ColonneEtat key={groupe.state} groupe={groupe} more={t.activity.more} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Une colonne : son intitulé, son compte, puis ses tickets. */
function ColonneEtat({ groupe, more }: { groupe: Groupe; more: string }) {
  const { Icon, tickets } = groupe;
  const visibles = tickets.slice(0, MAX_PAR_COLONNE);
  const reste = tickets.length - visibles.length;

  return (
    <section className="min-w-0">
      <h3 className="flex items-center gap-1.5 border-b pb-2 text-sm font-medium">
        <Icon
          className={cn(
            "size-4 shrink-0",
            groupe.state === "done" ? "text-emerald-600" : "text-muted-foreground",
          )}
          aria-hidden
        />
        <span className="truncate">{groupe.label}</span>
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
          {tickets.length}
        </span>
      </h3>

      {visibles.length === 0 ? (
        <p className="pt-3 text-xs text-muted-foreground">{groupe.vide}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {visibles.map((ticket) => (
            <LigneTicket
              key={ticket.id}
              ticket={ticket}
              done={groupe.state === "done"}
            />
          ))}
        </ul>
      )}

      {reste > 0 && (
        <p className="pt-2 text-xs text-muted-foreground">
          {fmt(more, { count: reste })}
        </p>
      )}
    </section>
  );
}

/** Un ticket : sa clé, son titre, et le statut réel dont il relève. */
function LigneTicket({
  ticket,
  done,
}: {
  ticket: AssignedTicket;
  done: boolean;
}) {
  return (
    <li className="py-2">
      <Link
        href={`/projects/${ticket.project.key}/tickets/${ticket.id}`}
        className="group flex flex-col gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-1.5">
          {/* La couleur du type, comme partout ailleurs : un repère, pas une
              information - le nom du type reste dans l'infobulle. */}
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: ticket.type.color }}
            title={ticket.type.name}
            aria-hidden
          />
          <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
            {ticket.key}
          </span>
        </span>
        <span
          /* ACHEVÉ : barré et atténué, comme sur les sprints et les versions. */
          className={cn(
            "line-clamp-2 text-sm group-hover:underline",
            done && "text-muted-foreground line-through decoration-muted-foreground/60",
          )}
        >
          {ticket.title}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[11px] font-normal">
            {ticket.column.name}
          </Badge>
          {/* Le projet n'a de sens que parce que la zone les mélange tous. */}
          <span className="text-[11px] text-muted-foreground">
            {ticket.project.key}
          </span>
        </span>
      </Link>
    </li>
  );
}
