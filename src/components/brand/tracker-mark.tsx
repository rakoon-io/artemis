import type { SVGProps } from "react";

/**
 * Emblème de Rakoon Tracker : un arc bandé, flèche encochée prête à décocher,
 * clin d'oeil a la traque / au suivi (tracking). Monochrome via `currentColor`,
 * il s'adapte donc automatiquement au thème (pas besoin de `dark:invert`).
 */
export function TrackerMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Rakoon Tracker"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Arc (branche), convexe vers la cible (droite) */}
        <path d="M42 16 Q78 50 42 84" />
        {/* Corde bandée, tirée jusqu'a l'encoche (a gauche) */}
        <path d="M42 16 L32 50 L42 84" />
        {/* Flèche : fût, encoché sur la corde, pointé vers la droite */}
        <path d="M24 50 H80" />
        {/* Flèche : pointe */}
        <path d="M70 41 L86 50 L70 59" />
        {/* Flèche : empennage (plumes) au talon */}
        <path d="M24 50 L33 43" />
        <path d="M24 50 L33 57" />
      </g>
    </svg>
  );
}
