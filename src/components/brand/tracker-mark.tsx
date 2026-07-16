import type { SVGProps } from "react";

/**
 * Emblème d'Artemis : un croissant de lune (en haut à droite, dos vers le coin)
 * et une flèche de la chasse décochée vers la lune - Artemis, déesse de la chasse
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
      {/* Flèche de la chasse, décochée vers la lune */}
      <g
        transform="rotate(-45 50 50)"
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M30 50 H78" />
        <path d="M68 42 L84 50 L68 58" />
      </g>
    </svg>
  );
}
