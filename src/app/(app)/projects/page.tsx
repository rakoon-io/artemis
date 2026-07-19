import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, CircleCheck, Ticket } from "lucide-react";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { getDictionary } from "@/i18n/server";
import { getAccessibleProjectsWithStats } from "@/server/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";

export const metadata: Metadata = { title: "Projets · Artemis" };

export default async function ProjectsPage() {
  const session = await auth();
  const projects = await getAccessibleProjectsWithStats(session?.user);
  const admin = isAdmin(session?.user);
  const t = await getDictionary();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.projects.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.projects.subtitle}</p>
        </div>
        {admin ? <CreateProjectDialog /> : null}
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 border-dashed py-16 text-center">
          <div className="flex flex-col gap-1">
            <p className="text-lg font-medium">{t.projects.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">
              {admin ? t.projects.emptyAdmin : t.projects.emptyReporter}
            </p>
          </div>
          {admin ? <CreateProjectDialog /> : null}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const pct = project.ticketCount
              ? Math.round((project.doneCount / project.ticketCount) * 100)
              : 0;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.key}/board`}
                className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="flex h-full flex-col transition-colors hover:border-primary/50">
                  <CardHeader className="flex-1">
                    <Badge variant="secondary" className="w-fit">
                      {project.key}
                    </Badge>
                    <CardTitle className="mt-2">{project.name}</CardTitle>
                    {project.description ? (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CircleCheck className="size-3.5" />
                          {project.doneCount} / {project.ticketCount}{" "}
                          {t.projects.done}
                        </span>
                        <span className="font-medium text-foreground">{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Ticket className="size-3.5" />
                        {project.ticketCount}{" "}
                        {project.ticketCount > 1
                          ? t.projects.ticketOther
                          : t.projects.ticketOne}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarRange className="size-3.5" />
                        {project.sprintCount}{" "}
                        {project.sprintCount > 1
                          ? t.projects.sprintOther
                          : t.projects.sprintOne}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
