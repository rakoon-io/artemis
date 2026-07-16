import type { SVGProps } from "react";

/**
 * Emblème d'Artemis : un arc bandé pointé vers le haut (45°), flèche prête à
 * décocher, et un croissant de lune - Artemis, déesse de la chasse et de la lune.
 * Monochrome via `currentColor` : s'adapte au thème (pas besoin de `dark:invert`).
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
      <g
        transform="rotate(-45 50 50)"
        stroke="currentColor"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Arc (branche) */}
        <path d="M42 16 Q78 50 42 84" />
        {/* Corde bandée, tirée jusqu'à l'encoche */}
        <path d="M42 16 L32 50 L42 84" />
        {/* Flèche : fût */}
        <path d="M24 50 H80" />
        {/* Flèche : pointe */}
        <path d="M70 41 L86 50 L70 59" />
        {/* Flèche : empennage (plumes) au talon */}
        <path d="M24 50 L33 43" />
        <path d="M24 50 L33 57" />
      </g>
      {/* Croissant de lune (en haut à gauche) */}
      <path d="M23 15 A9 9 0 0 0 23 33 A13.5 13.5 0 0 1 23 15 Z" fill="currentColor" />
    </svg>
  );
}
