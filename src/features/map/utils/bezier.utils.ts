/**
 * Utilidades para calcular curvas Bézier cuadráticas
 * Usadas para rutas de vuelo realistas
 */

/**
 * Calcula la distancia aproximada entre dos puntos en grados
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Calcula el punto de control para la curva Bézier
 * El punto está desplazado perpendicularmente a la línea recta
 * para simular la curvatura de la Tierra
 */
export function calculateControlPoint(
  latOrigen: number,
  lngOrigen: number,
  latDestino: number,
  lngDestino: number
): [number, number] {
  // Punto medio
  const midLat = (latOrigen + latDestino) / 2;
  const midLng = (lngOrigen + lngDestino) / 2;

  // Distancia entre origen y destino
  const distance = calculateDistance(latOrigen, lngOrigen, latDestino, lngDestino);

  // Vector de dirección
  const dirLat = latDestino - latOrigen;
  const dirLng = lngDestino - lngOrigen;

  // Vector perpendicular (rotado 90 grados)
  // En 2D: perpendicular de (x, y) es (-y, x)
  const perpLat = -dirLng;
  const perpLng = dirLat;

  // Normalizar el vector perpendicular
  const perpLength = Math.sqrt(perpLat * perpLat + perpLng * perpLng);
  const normPerpLat = perpLength > 0 ? perpLat / perpLength : 0;
  const normPerpLng = perpLength > 0 ? perpLng / perpLength : 0;

  // Desplazamiento basado en la distancia (más distancia = más curvatura)
  // Usamos 15% de la distancia como altura de la curva
  const curvatureHeight = distance * 0.15;

  // Punto de control desplazado perpendicularmente
  const controlLat = midLat + normPerpLat * curvatureHeight;
  const controlLng = midLng + normPerpLng * curvatureHeight;

  return [controlLat, controlLng];
}

/**
 * Interpola un punto en una curva Bézier cuadrática
 * P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
 * donde P0 = origen, P1 = control, P2 = destino
 * 
 * @param t - Parámetro de interpolación (0 = inicio, 1 = fin)
 * @param p0 - Punto de inicio [lat, lng]
 * @param p1 - Punto de control [lat, lng]
 * @param p2 - Punto final [lat, lng]
 * @returns Punto interpolado [lat, lng]
 */
export function bezierQuadratic(
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number]
): [number, number] {
  const t2 = t * t;
  const mt = 1 - t;
  const mt2 = mt * mt;

  const lat = mt2 * p0[0] + 2 * mt * t * p1[0] + t2 * p2[0];
  const lng = mt2 * p0[1] + 2 * mt * t * p1[1] + t2 * p2[1];

  return [lat, lng];
}

/**
 * Genera una serie de puntos a lo largo de una curva Bézier cuadrática
 * 
 * @param latOrigen - Latitud de origen
 * @param lngOrigen - Longitud de origen
 * @param latDestino - Latitud de destino
 * @param lngDestino - Longitud de destino
 * @param segments - Número de segmentos (más segmentos = curva más suave)
 * @returns Array de puntos [lat, lng]
 */
export function generateBezierPath(
  latOrigen: number,
  lngOrigen: number,
  latDestino: number,
  lngDestino: number,
  segments: number = 60
): [number, number][] {
  const points: [number, number][] = [];

  const p0: [number, number] = [latOrigen, lngOrigen];
  const p2: [number, number] = [latDestino, lngDestino];
  const p1 = calculateControlPoint(latOrigen, lngOrigen, latDestino, lngDestino);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = bezierQuadratic(t, p0, p1, p2);
    points.push(point);
  }

  return points;
}

/**
 * Calcula la posición exacta en una curva Bézier dado un progreso (0-100)
 * 
 * @param progreso - Progreso del vuelo (0-100)
 * @param latOrigen - Latitud de origen
 * @param lngOrigen - Longitud de origen
 * @param latDestino - Latitud de destino
 * @param lngDestino - Longitud de destino
 * @returns Posición actual [lat, lng]
 */
export function getPositionOnBezierCurve(
  progreso: number,
  latOrigen: number,
  lngOrigen: number,
  latDestino: number,
  lngDestino: number
): [number, number] {
  // Convertir progreso de 0-100 a 0-1
  const t = Math.max(0, Math.min(1, progreso / 100));

  const p0: [number, number] = [latOrigen, lngOrigen];
  const p2: [number, number] = [latDestino, lngDestino];
  const p1 = calculateControlPoint(latOrigen, lngOrigen, latDestino, lngDestino);

  return bezierQuadratic(t, p0, p1, p2);
}

