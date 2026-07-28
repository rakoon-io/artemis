import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dépôt source public du projet (voir DEPLOY.md). */
const GITHUB_URL = "https://github.com/rakoon-io/artemis";

/** Lien vers le dépôt GitHub - affiché dans les pieds de page (auth + shell app). */
export function GithubLink({ className }: { className?: string }) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground hover:underline",
        className,
      )}
    >
      <ExternalLink className="size-3" />
      Code source
    </a>
  );
}
