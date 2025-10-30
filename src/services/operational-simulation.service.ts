// src/services/operational-simulation.service.ts

// tomamos la URL del .env y si no hay, usamos localhost
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// --- tipos que usa este módulo ---
export interface OperationalOrderPayload {
    codigo?: string;              // opcional, porque en tu back a veces lo generan
    aeropuertoOrigen: string;
    aeropuertoDestino: string;
    cantidadProductos: number;
}

// 1. crear / iniciar la simulación OPERACIONAL (día a día)
export async function startOperationalSimulation(
    timeScale: number = 120
): Promise<number> {
    const res = await fetch(
        `${API_BASE}/api/operacional/start?timeScale=${timeScale}`,
        {
            method: 'POST',
        }
    );

    if (!res.ok) {
        throw new Error('No se pudo iniciar la simulación operacional');
    }

    const data = await res.json();
    // asumo que el back responde { simulationId: 123 }
    return data.simulationId as number;
}

// 2. registrar UN pedido (1ra parte de la prueba)
export async function createOperationalOrder(
    simulationId: number,
    payload: OperationalOrderPayload
): Promise<void> {
    const res = await fetch(
        `${API_BASE}/api/operacional/${simulationId}/orders`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }
    );

    if (!res.ok) {
        throw new Error('No se pudo registrar el pedido operacional');
    }
}

// 3. cargar LOTE de pedidos (2da parte de la prueba)
export async function uploadOperationalOrders(
    simulationId: number,
    orders: OperationalOrderPayload[]
): Promise<void> {
    const res = await fetch(
        `${API_BASE}/api/operacional/${simulationId}/orders/batch`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orders),
        }
    );

    if (!res.ok) {
        throw new Error('No se pudo cargar el lote de pedidos');
    }
}
