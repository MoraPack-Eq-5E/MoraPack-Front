/**
 * Export de todos los servicios
 */

// Servicios de algoritmo - Export específico para evitar conflictos
export { ejecutarAlgoritmo, type ResultadoAlgoritmoDTO, type RutaDTO, type VueloSimpleDTO, type RutaProductoDTO } from './algoritmo.service';
export { ejecutarAlgoritmoSemanal, type AlgoritmoRequest, type AlgoritmoResponse } from './algoritmoSemanal.service';

// Re-export de tipos compartidos desde algoritmo.service (fuente canónica)
export type { EventoLineaDeTiempoVueloDTO, LineaDeTiempoSimulacionDTO } from './algoritmo.service';

// Servicios de datos
export * from './cargaDatos.service';
export * from './consultas.service';
export * from './dataImport.service';

// Servicios de simulación
export * from './simulation.service';
export * from './simulation-player.service';
export * from './simulacionDiaria.service';

// Servicios de almacenes
export * from './almacen.service';

// Servicios de archivos
export * from './fileUpload.service';

