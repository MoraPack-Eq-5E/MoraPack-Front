/**
 * Layout Constants
 * 
 * Constantes compartidas para el layout de la aplicación.
 * Centraliza dimensiones y valores reutilizables.
 */

export const LAYOUT = {
  TOPBAR_HEIGHT: 64,           // 64px (h-16 en Tailwind)
  SIDEBAR_WIDTH: 165,          // 165px
  DASHBOARD_MARGIN_LEFT: 13,   // 13px - Espacio extra a la izquierda del dashboard
} as const;

export type LayoutConstants = typeof LAYOUT;

