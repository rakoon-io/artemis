import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { DemoCredentialsCard } from "@/components/demo/demo-credentials-card";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Connexion · Artemis" };
// Sans quoi la page est pré-rendue statiquement au build (placeholders d'env
// Docker) : `DEMO_MODE` figerait alors sa valeur de build, pas celle du runtime
// (cf. DEPLOY.md / correctif équivalent sur rakoon-tasker).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const isDemo = env.DEMO_MODE === "true";
  return (
    <>
      {isDemo && <DemoCredentialsCard />}
      <LoginForm />
    </>
  );
}
