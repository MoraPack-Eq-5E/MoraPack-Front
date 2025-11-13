/**
 * Utilidades para interpolar posiciones de vuelos en tiempo real
 * Sin dependencias externas - usa matemáticas geográficas básicas
 */

/**
 * Convierte grados a radianes
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convierte radianes a grados
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Interpola linealmente entre dos puntos geográficos
 * Usa interpolación esférica (Great Circle) para mayor precisión
 * 
 * @param lat1 Latitud origen
 * @param lon1 Longitud origen
 * @param lat2 Latitud destino
 * @param lon2 Longitud destino
 * @param progress Progreso (0 = origen, 1 = destino)
 * @returns [latitud, longitud] de la posición interpolada
 */
export function interpolatePosition(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  progress: number
): [number, number] {
  // Clamp progress entre 0 y 1
  progress = Math.max(0, Math.min(1, progress));
  
  // Convertir a radianes
  const φ1 = toRadians(lat1);
  const λ1 = toRadians(lon1);
  const φ2 = toRadians(lat2);
  const λ2 = toRadians(lon2);
  
  // Calcular distancia angular (usando fórmula haversine)
  const Δφ = φ2 - φ1;
  const Δλ = λ2 - λ1;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Interpolación esférica (SLERP - Spherical Linear Interpolation)
  const A = Math.sin((1 - progress) * δ) / Math.sin(δ);
  const B = Math.sin(progress * δ) / Math.sin(δ);
  
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  
  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);
  
  return [toDegrees(φi), toDegrees(λi)];
}

/**
 * Calcula el bearing (rumbo) entre dos puntos
 * 
 * @param lat1 Latitud origen
 * @param lon1 Longitud origen
 * @param lat2 Latitud destino
 * @param lon2 Longitud destino
 * @returns Bearing en grados (0-360, donde 0 = Norte)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);
  
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  const θ = Math.atan2(y, x);
  const bearing = (toDegrees(θ) + 360) % 360;
  
  return bearing;
}

/**
 * Genera una ruta curva (Bézier cuadrática) entre dos puntos
 * Para visualización de rutas de vuelo más realistas
 * 
 * @param lat1 Latitud origen
 * @param lon1 Longitud origen
 * @param lat2 Latitud destino  
 * @param lon2 Longitud destino
 * @param segments Número de segmentos (más = más suave)
 * @returns Array de [lat, lon] para dibujar la curva
 */
export function generateCurvedPath(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  segments: number = 60
): [number, number][] {
  const path: [number, number][] = [];
  
  // Punto de control (mitad del camino, elevado para crear curva)
  const midLat = (lat1 + lat2) / 2;
  const midLon = (lon1 + lon2) / 2;
  
  // Calcular offset perpendicular para crear la curva
  const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
  const offset = distance * 0.15; // 15% de offset para una curva suave
  
  // Punto de control elevado perpendicular a la línea recta
  const perpLat = -(lon2 - lon1);
  const perpLon = lat2 - lat1;
  const perpLength = Math.sqrt(perpLat * perpLat + perpLon * perpLon);
  
  const controlLat = midLat + (perpLat / perpLength) * offset;
  const controlLon = midLon + (perpLon / perpLength) * offset;
  
  // Generar puntos a lo largo de la curva Bézier cuadrática
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const t1 = 1 - t;
    
    // Fórmula de Bézier cuadrática: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const lat = t1 * t1 * lat1 + 2 * t1 * t * controlLat + t * t * lat2;
    const lon = t1 * t1 * lon1 + 2 * t1 * t * controlLon + t * t * lon2;
    
    path.push([lat, lon]);
  }
  
  return path;
}

/**
 * Calcula el progreso de un vuelo basado en tiempo
 * 
 * @param departureTime Hora de salida (Date)
 * @param arrivalTime Hora de llegada (Date)
 * @param currentTime Hora actual (Date)
 * @returns Progreso (0-1)
 */
export function calculateFlightProgress(
  departureTime: Date,
  arrivalTime: Date,
  currentTime: Date
): number {
  const totalDuration = arrivalTime.getTime() - departureTime.getTime();
  const elapsed = currentTime.getTime() - departureTime.getTime();
  
  return Math.max(0, Math.min(1, elapsed / totalDuration));
}

