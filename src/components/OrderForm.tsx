// src/components/OrderForm.tsx
import React from 'react';
import { type OperationalOrderPayload } from '@/services/operational-simulation.service';

type Props = {
    value: OperationalOrderPayload;
    onChange: (v: OperationalOrderPayload) => void;
    onSubmit?: () => void;
    disabled?: boolean;
};

const OrderForm: React.FC<Props> = ({ value, onChange, onSubmit, disabled }) => {
    return (
        <div className="space-y-2">
            <input
                className="border px-2 py-1 w-full"
                placeholder="Código (opcional)"
                value={value.codigo ?? ''}
                onChange={(e) => onChange({ ...value, codigo: e.target.value })}
                disabled={disabled}
            />
            <input
                className="border px-2 py-1 w-full"
                placeholder="Aeropuerto origen"
                value={value.aeropuertoOrigen}
                onChange={(e) =>
                    onChange({ ...value, aeropuertoOrigen: e.target.value })
                }
                disabled={disabled}
            />
            <input
                className="border px-2 py-1 w-full"
                placeholder="Aeropuerto destino"
                value={value.aeropuertoDestino}
                onChange={(e) =>
                    onChange({ ...value, aeropuertoDestino: e.target.value })
                }
                disabled={disabled}
            />
            <input
                type="number"
                className="border px-2 py-1 w-full"
                placeholder="Cantidad productos"
                value={value.cantidadProductos}
                onChange={(e) =>
                    onChange({
                        ...value,
                        cantidadProductos: Number(e.target.value),
                    })
                }
                disabled={disabled}
            />

            {onSubmit && (
                <button
                    onClick={onSubmit}
                    disabled={disabled}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                >
                    Enviar pedido
                </button>
            )}
        </div>
    );
};

export default OrderForm;
