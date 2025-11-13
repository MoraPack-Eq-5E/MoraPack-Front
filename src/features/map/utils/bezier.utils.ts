/**
 * Utilidades de curvas Bezier para animaciones de vuelos realistas
 * Portado desde morapack-frontend para generar rutas curvas suaves
 */

export type LatLngTuple = [number, number];

/**
 * Calcula el punto de control para una curva Bezier cuadrática
 * que conecta dos puntos de manera realista
 * 
 * @param a - Punto inicial [lat, lng]
 * @param b - Punto final [lat, lng]
 * @param curvature - Factor de curvatura (0.2-0.3 recomendado)
 * @returns Punto de control [lat, lng]
 */
export function computeControlPoint(
  a: LatLngTuple, 
  b: LatLngTuple, 
  curvature = 0.25
): LatLngTuple {
  const lat1 = a[0];
  const lng1 = a[1];
  const lat2 = b[0];
  const lng2 = b[1];
  
  // Punto medio
  const latMid = (lat1 + lat2) / 2;
  const lngMid = (lng1 + lng2) / 2;
  
  // Escala por latitud para compensar proyección Mercator
  const scale = Math.cos(((lat1 + lat2) * Math.PI) / 360);
  
  // Vector de dirección
  const dx = (lng2 - lng1) * scale;
  const dy = lat2 - lat1;
  
  // Longitud del vector
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  
  // Vector normal (perpendicular)
  const nx = -dy / len;
  const ny = dx / len;
  
  // Offset para el punto de control
  const offset = curvature * len;
  
  // Aplicar offset perpendicular al punto medio
  const ctrlLng = lngMid + (nx * offset) / (scale || 1e-6);
  const ctrlLat = latMid + ny * offset;
  
  return [ctrlLat, ctrlLng];
}

/**
 * Calcula un punto en una curva Bezier cuadrática
 * 
 * @param t - Parámetro de interpolación (0-1)
 * @param p0 - Punto inicial
 * @param p1 - Punto de control
 * @param p2 - Punto final
 * @returns Punto interpolado [lat, lng]
 */
export function bezierPoint(
  t: number, 
  p0: LatLngTuple, 
  p1: LatLngTuple, 
  p2: LatLngTuple
): LatLngTuple {
  const oneMinusT = 1 - t;
  
  // Fórmula de Bezier cuadrática: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
  const lat = 
    oneMinusT * oneMinusT * p0[0] + 
    2 * oneMinusT * t * p1[0] + 
    t * t * p2[0];
    
  const lng = 
    oneMinusT * oneMinusT * p0[1] + 
    2 * oneMinusT * t * p1[1] + 
    t * t * p2[1];
    
  return [lat, lng];
}

/**
 * Calcula la tangente (derivada) de una curva Bezier en un punto
 * Usado para calcular la dirección/rotación del avión
 * 
 * @param t - Parámetro de interpolación (0-1)
 * @param p0 - Punto inicial
 * @param p1 - Punto de control
 * @param p2 - Punto final
 * @returns Vector tangente [dLat, dLng]
 */
export function bezierTangent(
  t: number, 
  p0: LatLngTuple, 
  p1: LatLngTuple, 
  p2: LatLngTuple
): LatLngTuple {
  // Derivada de Bezier: B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
  const lat = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const lng = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  
  return [lat, lng];
}

/**
 * Calcula el bearing (ángulo de rotación) entre dos puntos
 * en grados, donde 0° es Norte
 * 
 * @param lat1 - Latitud inicial
 * @param lon1 - Longitud inicial
 * @param lat2 - Latitud final
 * @param lon2 - Longitud final
 * @returns Ángulo en grados (0-360)
 */
export function calculateBearing(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;
  
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);
  
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - 
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  const θ = Math.atan2(y, x);
  
  // Convertir a grados y normalizar a 0-360
  return (toDegrees(θ) + 360) % 360;
}

/**
 * Calcula el bearing desde un vector tangente
 * Más preciso para curvas Bezier
 * 
 * @param tangent - Vector tangente [dLat, dLng]
 * @returns Ángulo en grados (0-360)
 */
export function bearingFromTangent(tangent: LatLngTuple): number {
  const [dLat, dLng] = tangent;
  const angle = Math.atan2(dLng, dLat);
  return (angle * 180 / Math.PI + 360) % 360;
}

/**
 * Genera una ruta completa usando curvas Bezier
 * 
 * @param start - Punto inicial [lat, lng]
 * @param end - Punto final [lat, lng]
 * @param samples - Número de puntos a generar (más = más suave)
 * @param curvature - Factor de curvatura
 * @returns Array de puntos [lat, lng]
 */
export function generateBezierRoute(
  start: LatLngTuple,
  end: LatLngTuple,
  samples = 30,
  curvature = 0.25
): LatLngTuple[] {
  const ctrl = computeControlPoint(start, end, curvature);
  const route: LatLngTuple[] = [];
  
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    route.push(bezierPoint(t, start, ctrl, end));
  }
  
  return route;
}

/**
 * Interpola la posición y rotación de un avión en una curva Bezier
 * 
 * @param progress - Progreso del vuelo (0-1)
 * @param start - Punto inicial [lat, lng]
 * @param end - Punto final [lat, lng]
 * @param curvature - Factor de curvatura
 * @returns Objeto con posición y bearing
 */
export function interpolateFlightPosition(
  progress: number,
  start: LatLngTuple,
  end: LatLngTuple,
  curvature = 0.25
): { position: LatLngTuple; bearing: number } {
  const ctrl = computeControlPoint(start, end, curvature);
  const position = bezierPoint(progress, start, ctrl, end);
  const tangent = bezierTangent(progress, start, ctrl, end);
  const bearing = bearingFromTangent(tangent);
  
  return { position, bearing };
}

/**
 * Genera una ruta curva usando coordenadas individuales (compatibilidad con FlightRoute)
 * 
 * @param lat1 - Latitud inicial
 * @param lon1 - Longitud inicial
 * @param lat2 - Latitud final
 * @param lon2 - Longitud final
 * @param segments - Número de puntos a generar
 * @returns Array de puntos [lat, lng]
 */
export function generateBezierPath(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  segments = 30
): LatLngTuple[] {
  const start: LatLngTuple = [lat1, lon1];
  const end: LatLngTuple = [lat2, lon2];
  return generateBezierRoute(start, end, segments);
}
