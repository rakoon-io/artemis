import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { credentialsSchema } from "@/lib/validators";
import { clientIp, clearFailures, isRateLimited, recordFailure } from "@/lib/rate-limit";

/**
 * Instance complète Auth.js (runtime Node) : Credentials + bcrypt + Prisma.
 * Stratégie JWT (obligatoire avec Credentials) ; le rôle est porté par le token.
 */
/**
 * Condensat de comparaison à vide : bcrypt, coût 12, d'une valeur aléatoire.
 * Il ne correspond à aucun mot de passe utilisable.
 */
const REVALIDATION_MS = 60 * 1000;

/** Échecs tolérés sur la fenêtre : couple serré, origine large, compte en dernier recours. */
const ECHECS_PAR_COUPLE = 10;
const ECHECS_PAR_ORIGINE = 50;
const ECHECS_PAR_COMPTE = 200;
const FENETRE_MS = 15 * 60 * 1000;

const HASH_LEURRE = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.J0Q4nD8yqcAdU8ZH2mS/tSN3o8kY5aq";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw, request) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        /**
         * DEUX COMPTEURS, ET L'ON NE COMPTE QUE LES ÉCHECS.
         *
         * ─────────────────────────────────────────────────────────────────────
         * CE QUE L'ANCIEN COMPTAIT
         *
         * Un seul seau, indexé sur l'ADRESSE, incrémenté à chaque appel - donc
         * avant même de vérifier le mot de passe, et y compris sur les
         * connexions réussies. Deux conséquences opposées, toutes deux
         * fâcheuses :
         *
         * - dix requêtes portant l'adresse de quelqu'un l'empêchaient de se
         *   connecter pendant un quart d'heure. Verrouiller le compte d'un tiers
         *   ne demandait que de connaître son adresse, et la victime ne pouvait
         *   pas distinguer ce blocage d'un mot de passe erroné ;
         * - à l'inverse, essayer UN mot de passe courant sur dix mille comptes
         *   ne rencontrait aucun frein, chaque adresse ayant son propre seau.
         *
         * ─────────────────────────────────────────────────────────────────────
         * CE QU'ON COMPTE MAINTENANT : LE COUPLE, PAS LE COMPTE
         *
         * Ne compter que les échecs ne suffisait pas - mesuré : douze tentatives
         * ratées d'un tiers verrouillaient encore la victime. Tant que le seuil
         * porte sur le COMPTE SEUL, ce seuil est l'arme.
         *
         * Le compteur serré porte donc sur le couple (origine, compte). Celui qui
         * mitraille depuis chez lui se bloque lui-même, et la victime, qui vient
         * d'ailleurs, entre sans obstacle.
         *
         * Deux garde-fous l'entourent :
         * - par ORIGINE, plus large : borne le balayage d'un mot de passe courant
         *   sur des milliers de comptes, que le compteur par couple ne verrait pas ;
         * - par COMPTE, très haut : dernier recours contre une attaque répartie
         *   sur de nombreuses origines. Assez élevé pour qu'un tiers seul ne
         *   l'atteigne jamais, assez bas pour qu'une telle attaque reste vaine
         *   contre un bcrypt de coût 12.
         *
         * Le compromis est assumé, et il n'a pas de solution gratuite : durcir le
         * compte protège du devinement et offre le verrouillage ; le relâcher fait
         * l'inverse. On place le serrage là où l'attaquant ne choisit pas la clé.
         */
        /**
         * `credentialsSchema` rend l'adresse canonique - rognée, minuscules -
         * avant de la valider. Les compteurs et la recherche portent donc sur
         * la MÊME clé. Ils divergeaient : les seaux étaient abaissés à la main
         * ici, la recherche se faisait sur la saisie brute. Deux comptes ne
         * différant que par la casse partageaient donc leurs compteurs tout en
         * restant deux comptes.
         */
        const email = parsed.data.email;
        const ip = request ? clientIp(new Headers(request.headers)) : "unknown";
        const cleCouple = `login:${ip}:${email}`;
        const cleIp = `login:ip:${ip}`;
        const cleMail = `login:mail:${email}`;
        if (isRateLimited(cleCouple, ECHECS_PAR_COUPLE)) return null;
        if (isRateLimited(cleIp, ECHECS_PAR_ORIGINE)) return null;
        if (isRateLimited(cleMail, ECHECS_PAR_COMPTE)) return null;
        const user = await prisma.user.findUnique({
          where: { email },
        });
        /**
         * ON VÉRIFIE TOUJOURS UN CONDENSAT, même quand le compte n'existe pas.
         *
         * Les réponses étaient déjà identiques, mais pas les DÉLAIS : une adresse
         * inconnue repartait après une seule requête indexée, une adresse connue
         * après un bcrypt de coût 12 en JavaScript pur - des centaines de
         * millisecondes. L'écart se mesure au chronomètre et énumère les comptes.
         *
         * Le condensat de repli est celui d'un mot de passe qu'on ne connaît pas
         * et qui n'ouvre rien ; seul son coût nous intéresse.
         */
        const ok = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? HASH_LEURRE,
        );
        if (!user?.passwordHash || !ok) {
          recordFailure(cleCouple, FENETRE_MS);
          recordFailure(cleIp, FENETRE_MS);
          recordFailure(cleMail, FENETRE_MS);
          return null;
        }
        // Une réussite efface l'ardoise du couple : celui qui se trompe deux fois
        // avant de réussir ne traîne rien. Les garde-fous larges, eux, subsistent.
        clearFailures(cleCouple);
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          sessionEpoch: user.sessionEpoch,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * RELECTURE PÉRIODIQUE DU COMPTE, qui rend enfin la révocation effective.
     *
     * ─────────────────────────────────────────────────────────────────────────
     * CE QUI NE MARCHAIT PAS
     *
     * Le rôle était copié dans le jeton à la connexion et plus jamais relu.
     * Rétrograder quelqu'un, ou supprimer son compte, ne lui retirait donc rien :
     * il gardait ses pouvoirs jusqu'à l'expiration. Et réinitialiser un mot de
     * passe - le geste que l'on fait précisément quand on se croit compromis -
     * laissait le cookie volé parfaitement valide.
     *
     * ─────────────────────────────────────────────────────────────────────────
     * PÉRIODIQUE, ET NON À CHAQUE APPEL
     *
     * `auth()` est appelé plusieurs fois par affichage : relire la base à chaque
     * fois ajouterait autant de requêtes à chaque page. On borne donc la
     * fraîcheur à une minute. C'est le délai maximal d'une révocation, et le
     * prix d'une requête indexée par minute et par session ouverte.
     *
     * Ce rappel vit ICI et non dans `auth.config.ts` : cette dernière est la
     * configuration « edge » du middleware, qui ne peut pas parler à Prisma.
     * Le middleware ne tranche que « connecté ou non » ; les décisions qui
     * dépendent du rôle passent toutes par `auth()`, côté Node, donc par ici.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.epoch = user.sessionEpoch ?? 0;
        token.checkedAt = Date.now();
        return token;
      }
      const id = typeof token.id === "string" ? token.id : null;
      if (!id) return token;
      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (Date.now() - checkedAt < REVALIDATION_MS) return token;

      const compte = await prisma.user.findUnique({
        where: { id },
        select: { role: true, sessionEpoch: true },
      });
      // Compte supprimé, ou sessions révoquées depuis : `null` éteint la session.
      if (!compte || compte.sessionEpoch !== (token.epoch ?? 0)) return null;
      token.role = compte.role;
      token.checkedAt = Date.now();
      return token;
    },
  },
});
