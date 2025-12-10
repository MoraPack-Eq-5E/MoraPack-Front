# Cambios en Sistema de Cancelación de Vuelos

## Fecha: 2025-12-08

## Problema Resuelto

Se resolvieron dos problemas críticos relacionados con la cancelación de vuelos:

### 1. Vuelos cancelados seguían apareciendo en la lista
**Problema**: Cuando se cancelaba un vuelo exitosamente, seguía apareciendo en el panel lateral de "Vuelos saliendo del aeropuerto seleccionado".

**Solución**: 
- Se agregó un estado `canceledFlightInstances` (Set<string>) que mantiene registro de los IDs de instancia de vuelos cancelados
- Se utiliza el `idInstancia` devuelto por el backend en `ResultadoCancelacionDTO` para identificar unívocamente cada vuelo
- El `useMemo` de `flightsFromSelectedAirport` ahora filtra vuelos cuyo `instanciaId` esté en el Set de cancelados

### 2. Vuelos de conexión mantenían cantidad de productos incorrecta
**Problema**: En rutas con escalas (origen→escala→destino), cuando se cancelaba el vuelo origen→escala, el vuelo escala→destino seguía mostrando la misma cantidad de productos inicial.

**Solución**:
- Se agregó un estado `flightProductReductions` (Map<string, number>) que registra la cantidad de productos que deben reducirse por instancia de vuelo
- Cuando se cancela un vuelo, se buscan automáticamente todos los vuelos de conexión posteriores que:
  - Partan del destino del vuelo cancelado
  - Contengan los mismos pedidos afectados
- Se registra la reducción de productos para cada vuelo de conexión
- Al renderizar vuelos, se ajusta `capacityUsed` restando la reducción registrada
- Si después de la reducción un vuelo queda en 0 productos, se oculta completamente

## Archivos Modificados

### `src/features/map/components/MapViewTemporal.tsx`

#### Nuevos Estados
```typescript
// Set de vuelos cancelados (usando idInstancia)
const [canceledFlightInstances, setCanceledFlightInstances] = useState<Set<string>>(new Set());

// Mapa de reducción de productos por vuelo (idInstancia -> cantidad reducida)
const [flightProductReductions, setFlightProductReductions] = useState<Map<string, number>>(new Map());
```

#### Nueva Interfaz
```typescript
// Interfaz extendida para eventos con ventanaIndex
interface EventoConVentana extends EventoLineaDeTiempoVueloDTO {
  ventanaIndex?: number;
}
```

#### Función `handleCancelarVuelo` - Mejoras
1. **Registro de vuelo cancelado**: Añade el `idInstancia` al Set de cancelados
2. **Identificación de vuelos de conexión**: Busca automáticamente vuelos posteriores que:
   - Inicien desde el destino del vuelo cancelado
   - Compartan pedidos afectados
3. **Registro de reducción**: Actualiza el Map con la cantidad de productos a reducir
4. **Mensaje mejorado**: Muestra información detallada del resultado (productos, pedidos, ruta)

#### `flightsFromSelectedAirport` - Mejoras
1. **Filtrado de cancelados**: 
   ```typescript
   if (canceledFlightInstances.has(instanciaId)) {
     return; // Saltar vuelos cancelados
   }
   ```

2. **Ajuste de capacidad**:
   ```typescript
   const baseCapacityUsed = event.cantidadProductos || 1;
   const reduction = flightProductReductions.get(instanciaId) || 0;
   const adjustedCapacityUsed = Math.max(0, baseCapacityUsed - reduction);
   ```

3. **Ocultamiento de vuelos vacíos**:
   ```typescript
   if (adjustedCapacityUsed === 0) {
     return; // No mostrar vuelos sin productos
   }
   ```

4. **Dependencias actualizadas**: Añadidas `canceledFlightInstances` y `flightProductReductions` al array de dependencias del `useMemo`

#### Panel de Vuelos - Mejoras
- **Indicador visual de reducción**: Muestra ⚠️ emoji cuando un vuelo tiene productos reducidos
- **Información de productos**: Muestra cantidad actual de productos ajustada
- **Tooltip informativo**: Indica que la cantidad fue reducida por cancelación de vuelo previo

## Flujo de Cancelación

```
1. Usuario hace clic en "Cancelar vuelo"
   ↓
2. Se llama a cancelarInstanciaVuelo() del backend
   ↓
3. Backend retorna ResultadoCancelacionDTO con:
   - idInstancia (ej: "FL-123-20251208-1430")
   - vueloBaseId
   - origen, destino
   - productosAfectados, pedidosAfectados
   ↓
4. Frontend registra vuelo cancelado:
   - Añade idInstancia a canceledFlightInstances
   ↓
5. Frontend busca vuelos de conexión:
   - Filtra eventos DEPARTURE posteriores
   - Que partan del destino del vuelo cancelado
   - Que compartan pedidos afectados
   ↓
6. Frontend registra reducción de productos:
   - Añade entrada en flightProductReductions
   - Key: instanciaId del vuelo de conexión
   - Value: cantidad de productos a reducir
   ↓
7. UI se actualiza automáticamente:
   - Vuelo cancelado desaparece de la lista
   - Vuelos de conexión muestran cantidad ajustada
   - Indicador ⚠️ aparece en vuelos afectados
```

## Formato de idInstancia

El formato del ID de instancia debe coincidir exactamente con el backend:
```
FL-{flightId}-{YYYYMMDD}-{HHMM}

Ejemplo: FL-123-20251208-1430
```

Función helper:
```typescript
function buildInstanciaIdFromFlight(
  flightId: number,
  departureTime: Date
): string {
  const yyyy = departureTime.getFullYear();
  const mm = String(departureTime.getMonth() + 1).padStart(2, '0');
  const dd = String(departureTime.getDate()).padStart(2, '0');
  const HH = String(departureTime.getHours()).padStart(2, '0');
  const MM = String(departureTime.getMinutes()).padStart(2, '0');

  return `FL-${flightId}-${yyyy}${mm}${dd}-${HH}${MM}`;
}
```

## Uso del ResultadoCancelacionDTO

```typescript
export interface ResultadoCancelacionDTO {
  exitoso: boolean;
  mensaje: string;
  vueloId: number; // Deprecado - no usar
  idInstancia: string; // ✅ USAR ESTE
  vueloBaseId: number; // ✅ ID base del vuelo
  origen: string;
  destino: string;
  productosAfectados: number;
  pedidosAfectados: number;
  productosSinAsignar: number; // No necesario
  requiereReoptimizacion: boolean;
  tiempoEstimadoReoptimizacion: number; // No usar
}
```

## Casos de Prueba Sugeridos

1. **Vuelo simple (sin escalas)**:
   - Cancelar vuelo LIM→MIA directo
   - Verificar que desaparece de la lista
   - Verificar que no afecta otros vuelos

2. **Vuelo con escala (2 tramos)**:
   - Cancelar primer tramo LIM→BOG de una ruta LIM→BOG→MIA
   - Verificar que primer vuelo desaparece
   - Verificar que segundo vuelo (BOG→MIA) reduce productos
   - Verificar indicador ⚠️ aparece

3. **Vuelo con múltiples escalas (3+ tramos)**:
   - Cancelar primer tramo de ruta LIM→BOG→MEX→MIA
   - Verificar cascada de reducciones en todos los tramos posteriores

4. **Cancelación cuando vuelo ya despegó**:
   - Intentar cancelar vuelo en progreso
   - Verificar mensaje de error del backend

5. **Reducción total (vuelo queda vacío)**:
   - Cancelar todos los pedidos de un vuelo de conexión
   - Verificar que el vuelo desaparece completamente

## Mejoras Futuras

1. **Persistencia**: Guardar cancelaciones en localStorage o backend
2. **Reoptimización automática**: Cuando `requiereReoptimizacion` es true, relanzar algoritmo
3. **Animación visual**: Fade out suave al cancelar vuelo
4. **Historial**: Panel de vuelos cancelados con opción de deshacer
5. **Notificaciones**: Toast notifications en lugar de alerts
6. **Validación previa**: Mostrar preview del impacto antes de cancelar

