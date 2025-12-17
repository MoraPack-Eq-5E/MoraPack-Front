/**
 * pedido.service.ts
 *
 * Servicio para registrar pedidos manuales desde la vista En Vivo (operación día a día).
 * Usa el PedidoController del backend:
 *   POST /api/pedidos  -> crea un pedido y devuelve su ID.
 */

const API_URL = import.meta.env.VITE_API_URL || '/api';

export type EstadoPedido =
    | 'PENDIENTE'
    | 'EN_TRANSITO'
    | 'CANCELADO'
    | 'ENTREGADO'
    | 'RETRASADO';

export interface CrearPedidoRequest {
    aeropuertoDestinoCodigo: string;
    cantidadProductos: number;
    fechaPedido: string;
    clienteId: number;
    pedidoId: string;
    // Opcionales (por si luego quieres usarlos)
    //aeropuertoOrigenCodigo?: string | null;
    //fechaPedido?: string;        // ISO
    //fechaLimiteEntrega?: string; // ISO
    //prioridad?: number;
    //tipoData?: number;
}

/**
 * Registra un nuevo pedido "manual" usando el endpoint POST /api/pedidos.
 * El back completa campos faltantes (estado, fechas, cliente, etc.) si es necesario.
 */
export async function crearPedidoDiaADia(
    payload: CrearPedidoRequest
): Promise<number> {

    const body = {
        aeropuertoDestinoCodigo: payload.aeropuertoDestinoCodigo,
        cantidadProductos: payload.cantidadProductos,
        fechaPedido: payload.fechaPedido,
        tipoData: 1,          // Día a día
        clienteId: payload.clienteId,
        pedidoId: payload.pedidoId,
    };

    const response = await fetch(`${API_URL}/api/pedidos/en-vivo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        let msg = `Error al registrar pedido (${response.status})`;
        try {
            const data = await response.json();
            if (data?.mensaje) msg = data.mensaje;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    // PedidoController devuelve Integer (id).
    const id = await response.json();
    return typeof id === 'number' ? id : Number(id);
}

