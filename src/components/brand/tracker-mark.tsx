import type { SVGProps } from "react";

/**
 * Emblème d'Artemis : un croissant de lune (en haut à droite, dos vers le coin),
 * un arc bandé et une flèche décochée vers la lune - Artemis, déesse de la chasse
 * et de la lune. Même motif que l'icône de l'application (marque unifiée).
 * Monochrome via `currentColor` : s'adapte au thème.
 */
export function TrackerMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Artemis"
      {...props}
    >
      {/* Croissant de lune en haut à droite, dos (bord convexe) vers le coin */}
      <path
        d="M50.31 13.66 A26 26 0 1 1 86.34 49.69 A27 27 0 0 0 50.31 13.66 Z"
        fill="currentColor"
      />
      {/* Arc bandé et flèche décochée vers la lune */}
      <g
        transform="rotate(-45 50 50)"
        stroke="currentColor"
        strokeWidth={8.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M38 20 Q62 50 38 80" />
        <path d="M38 20 L28 50 L38 80" />
        <path d="M24 50 H72" />
        <path d="M63 43 L76 50 L63 57" />
        <path d="M24 50 L33 44" />
        <path d="M24 50 L33 56" />
      </g>
    </svg>
  );
}
