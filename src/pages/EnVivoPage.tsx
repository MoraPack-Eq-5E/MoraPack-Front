// src/pages/EnVivoPage.tsx
import { useEffect, useState } from 'react';
import { MapView } from '@/features/map/components';
import {
    startOperationalSimulation,
    createOperationalOrder,
    uploadOperationalOrders,
    type OperationalOrderPayload,
} from '@/services/operational-simulation.service';
import OrderForm from '@/components/OrderForm';

export function EnVivoPage() {
    const [simulationId, setSimulationId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // estado del pedido que se está llenando en el form
    const [order, setOrder] = useState<OperationalOrderPayload>({
        codigo: '',
        aeropuertoOrigen: '',
        aeropuertoDestino: '',
        cantidadProductos: 1,
    });

    useEffect(() => {
        // al montar la página creamos la sim día a día
        (async () => {
            const id = await startOperationalSimulation(120);
            setSimulationId(id);
            setLoading(false);
        })();
    }, []);

    const handleSubmitOrder = async () => {
        if (!simulationId) {
            alert('Primero inicia la simulación');
            return;
        }
        await createOperationalOrder(simulationId, order);
        alert('Pedido enviado');
    };

    const handleSendBatch = async () => {
        if (!simulationId) {
            alert('Primero inicia la simulación');
            return;
        }
        // aquí luego metes el archivo que suban;
        // por ahora mando un lote de ejemplo
        const batch: OperationalOrderPayload[] = [
            order, // puedes duplicar o generar
        ];
        await uploadOperationalOrders(simulationId, batch);
        alert('Lote enviado');
    };

    if (loading || !simulationId) {
        return <div className="p-6">Creando simulación operacional...</div>;
    }

    return (
        <div className="h-full flex">
            <div className="flex-1">
                <MapView simulationId={simulationId} />
            </div>

            {/* panel lateral para que los estudiantes registren pedidos */}
            <div className="w-80 border-l bg-white p-4 space-y-4">
                <h2 className="font-semibold text-lg">Registrar pedido</h2>

                <OrderForm
                    value={order}
                    onChange={setOrder}
                    onSubmit={handleSubmitOrder}   // 👈 ahora sí: () => void
                    disabled={loading}
                />

                <button
                    onClick={handleSendBatch}
                    className="px-4 py-2 bg-purple-600 text-white rounded w-full"
                >
                    Enviar lote de ejemplo
                </button>
            </div>
        </div>
    );
}
