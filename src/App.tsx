/**
 * App Component
 * Componente raíz de la aplicación
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { LoginPage } from '@/pages';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Página principal - TODO: Implementar router */}
      <LoginPage />
    </QueryClientProvider>
  );
}

export default App;
