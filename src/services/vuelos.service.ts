// vuelos.service.ts

const API_URL = import.meta.env.VITE_API_URL || '/api';
export interface ResultadoCancelacionDTO {
    exitoso: boolean;
    mensaje: string;
    vueloId: number;//no usar, mejor vueloBaseId
    idInstancia: string;
    vueloBaseId: number;
    origen: string;
    destino: string;
    productosAfectados: number;
    pedidosAfectados: number;
    productosSinAsignar: number; //no usar, no necesario creo
    requiereReoptimizacion: boolean;
    tiempoEstimadoReoptimizacion:number; //no usar
}

export async function cancelarInstanciaVuelo(
    idInstancia: string,
    tiempoSimulacionActual: Date,
    tiempoSiguienteVentana?: Date
): Promise<ResultadoCancelacionDTO> {
    const params = new URLSearchParams({
        tiempoSimulacionActual: tiempoSimulacionActual.toISOString(),
    });

    // Si se proporciona el tiempo de la siguiente ventana, agregarlo a los parámetros
    if (tiempoSiguienteVentana) {
        const HORAS_PERU = 5;
        const adjusted = new Date(tiempoSiguienteVentana.getTime() - HORAS_PERU * 60 * 60 * 1000);
        params.append('tiempoSiguienteVentana', adjusted.toISOString());
    }

    const response = await fetch(
        `${API_URL}/api/vuelos/instancias/${encodeURIComponent(idInstancia)}/cancelar-y-reasignar?${params.toString()}`,
        { method: 'POST' }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.mensaje || 'Error al cancelar instancia de vuelo');
    }

    return data;
}
