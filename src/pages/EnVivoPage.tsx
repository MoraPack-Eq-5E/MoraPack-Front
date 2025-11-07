/** * EnVivoPage *
 * * Página de visualización en tiempo real
 * * Muestra la última simulación activa
 * */
import {DiaView} from '@/features/map/components';

export function EnVivoPage() {
    return (
        <div className="h-full">
            <DiaView />
        </div>
    );
}