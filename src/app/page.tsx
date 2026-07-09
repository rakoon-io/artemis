import { redirect } from "next/navigation";

/** Redirige la racine vers la liste des projets. */
export default function HomePage() {
  redirect("/projects");
}
