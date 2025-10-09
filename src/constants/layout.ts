/**
 * Layout Constants
 * 
 * Constantes compartidas para el layout de la aplicación.
 * Centraliza dimensiones y valores reutilizables.
 */

export const LAYOUT = {
  TOPBAR_HEIGHT: 64,      // 64px (h-16 en Tailwind)
  SIDEBAR_WIDTH: 165,     // 165px
} as const;

export type LayoutConstants = typeof LAYOUT;

