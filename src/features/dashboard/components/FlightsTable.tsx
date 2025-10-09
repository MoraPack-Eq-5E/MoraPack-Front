import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { type FlightSchedule } from '@/types';
import { FlightStatusBadge } from './FlightStatusBadge';
import { CapacityBadge } from './CapacityBadge';
import { ArrowUpDown } from 'lucide-react';

export interface FlightsTableProps {
  flights: FlightSchedule[];
}

const columns: ColumnDef<FlightSchedule>[] = [
  {
    accessorKey: 'departureDate',
    header: 'SALIDA',
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.original.departureDate}</div>
        <div className="text-gray-500">{row.original.departureTime}</div>
      </div>
    ),
  },
  {
    accessorKey: 'arrivalDate',
    header: 'LLEGADA ESTIMADA',
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.original.arrivalDate}</div>
        <div className="text-gray-500">{row.original.arrivalTime}</div>
      </div>
    ),
  },
  {
    accessorKey: 'route',
    header: 'RUTA',
    cell: ({ row }) => (
      <div className="text-sm font-medium">{row.getValue('route')}</div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'ESTADO',
    cell: ({ row }) => (
      <FlightStatusBadge status={row.getValue('status')} />
    ),
  },
  {
    accessorKey: 'capacityUsed',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-gray-900"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        CAPACIDAD USADA
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.capacityUsed}
      </div>
    ),
  },
  {
    accessorKey: 'totalCapacity',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-gray-900"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        CAPACIDAD USADA (%)
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => {
      const percentage = Math.round(
        (row.original.capacityUsed / row.original.totalCapacity) * 100
      );
      return <CapacityBadge percentage={percentage} />;
    },
  },
  {
    accessorKey: 'stops',
    header: 'ESCALAS',
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue('stops')}</div>
    ),
  },
  {
    accessorKey: 'delays',
    header: 'RETRASOS ASOCIADOS',
    cell: ({ row }) => {
      const delays = row.getValue('delays') as string;
      const hasDelay = delays !== 'Ninguno';
      return (
        <div className="text-sm">
          {hasDelay ? (
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
              {delays}
            </span>
          ) : (
            <span className="text-gray-500">{delays}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'impactOnDeliveries',
    header: 'IMPACTO EN ENTREGAS',
    cell: ({ row }) => (
      <div className="text-sm text-gray-600 max-w-[200px]">
        {row.getValue('impactOnDeliveries')}
      </div>
    ),
  },
];

export function FlightsTable({ flights }: FlightsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: flights,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-gray-200">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

