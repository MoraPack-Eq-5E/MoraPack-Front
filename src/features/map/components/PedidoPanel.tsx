// src/features/map/components/PedidoPanel.tsx

import React, { useState } from 'react';

// Definir un Cliente hardcodeado para ser usado en todos los pedidos
const clienteHardcodeado = {
    id: 7,
    nombres: "Cliente 7",
    apellidos: null,
    tipoDocumento: "ID_NACIONAL",
    numeroDocumento: null,
    correo: "cliente7@morapack.com",
    telefono: null,
    ciudadRecojo: {
        id: 14,
        codigo: "brus",
        nombre: "Bruselas",
        pais: "Bélgica",
        continente: "EUROPA"
    }
};

const PedidoPanel: React.FC = () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

    const [aeropuertoDestino, setAeropuertoDestino] = useState('');
    const [aeropuertoOrigen, setAeropuertoOrigen] = useState('');
    const [cantidad, setCantidad] = useState(0);
    const [prioridad, setPrioridad] = useState('');
    const [mensaje, setMensaje] = useState<string | null>(null); // Para mostrar mensajes de éxito/error

    // Lógica para calcular las fechas
    const obtenerFechaActual = () => {
        const fecha = new Date();
        return fecha.toISOString(); // Formato ISO 8601
    };

    const obtenerFechaEntrega = () => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + 2); // Sumar 2 días
        return fecha.toISOString(); // Formato ISO 8601
    };

    // Lógica para la creación del pedido y la llamada al backend
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validación básica para asegurarnos de que todos los campos estén llenos
        if (!aeropuertoDestino || !aeropuertoOrigen || !cantidad || !prioridad) {
            setMensaje('Por favor, completa todos los campos.');
            return;
        }

        // Construimos el objeto del pedido con el cliente hardcodeado
        const nuevoPedido = {
            cliente: clienteHardcodeado,  // Enviamos el cliente hardcodeado completo
            aeropuertoDestinoCodigo: aeropuertoDestino,
            aeropuertoOrigenCodigo: aeropuertoOrigen,
            fechaPedido: obtenerFechaActual(),
            fechaLimiteEntrega: obtenerFechaEntrega(),
            estado: 'PENDIENTE', // Estado fijo
            prioridad: parseFloat(prioridad),
            cantidadProductos: cantidad,
            productos: [], // Si no hay productos, enviamos un array vacío
            rutasIds: [] // Si no hay rutas, enviamos un array vacío
        };

        console.log('Nuevo Pedido:', nuevoPedido);  // Para depurar el contenido del pedido antes de enviarlo

        try {
            // Hacemos la solicitud al backend para crear el pedido
            const response = await fetch(`${API_BASE_URL}/pedidos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(nuevoPedido),
            });

            const data = await response.json();

            if (response.ok) {
                setMensaje('Pedido creado exitosamente');
                // Limpiar el formulario si es necesario
                setAeropuertoDestino('');
                setAeropuertoOrigen('');
                setCantidad(0);
                setPrioridad('');
            } else {
                setMensaje(`Error: ${data.message || 'No se pudo crear el pedido'}`);
            }
        } catch (error) {
            setMensaje('Error al conectar con el servidor');
        }
    };

    return (
        <div className="pedido-panel h-full w-[300px] p-4 bg-white shadow-lg">
            <h3 className="text-xl mb-4">Nueva Entrada de Pedido</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group mb-4">
                    <label>Aeropuerto Destino</label>
                    <input
                        type="text"
                        value={aeropuertoDestino}
                        onChange={(e) => setAeropuertoDestino(e.target.value)}
                        placeholder="Ingrese aeropuerto de destino"
                        className="border p-2 w-full"
                    />
                </div>

                <div className="form-group mb-4">
                    <label>Aeropuerto Origen</label>
                    <input
                        type="text"
                        value={aeropuertoOrigen}
                        onChange={(e) => setAeropuertoOrigen(e.target.value)}
                        placeholder="Ingrese aeropuerto de origen"
                        className="border p-2 w-full"
                    />
                </div>

                <div className="form-group mb-4">
                    <label>Cantidad de productos</label>
                    <input
                        type="number"
                        value={cantidad}
                        onChange={(e) => setCantidad(Number(e.target.value))}
                        placeholder="Ingrese cantidad"
                        className="border p-2 w-full"
                    />
                </div>

                <div className="form-group mb-4">
                    <label>Prioridad</label>
                    <input
                        type="text"
                        value={prioridad}
                        onChange={(e) => setPrioridad(e.target.value)}
                        placeholder="Ingrese prioridad"
                        className="border p-2 w-full"
                    />
                </div>

                <button type="submit" className="w-full bg-blue-500 text-white p-2 mt-4">
                    Generar Pedido
                </button>
            </form>

            {mensaje && (
                <div className="mt-4 text-center text-green-600">
                    <p>{mensaje}</p>
                </div>
            )}
        </div>
    );
};

export default PedidoPanel;
