/**
 * Hook para manejar paginación del lado del cliente
 */

import { useMemo } from 'react';

export interface UsePaginationProps<T> {
  items: T[];
  currentPage: number;
  itemsPerPage: number;
}

export function usePagination<T>({ items, currentPage, itemsPerPage }: UsePaginationProps<T>) {
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(items.length / itemsPerPage);
  }, [items.length, itemsPerPage]);

  return {
    paginatedData,
    totalPages,
    totalItems: items.length,
  };
}

