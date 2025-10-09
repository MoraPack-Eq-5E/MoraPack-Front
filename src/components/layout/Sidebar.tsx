/**
 * Sidebar Component
 * Barra lateral de navegación
 */

import { LayoutDashboard, Eye, Play, Plane } from 'lucide-react';
import { useLocation, useNavigate } from '@tanstack/react-router';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={24} />,
    path: '/dashboard',
  },
  {
    id: 'en-vivo',
    label: 'En vivo',
    icon: <Eye size={24} />,
    path: '/en-vivo',
  },
  {
    id: 'simulacion',
    label: 'Simulación',
    icon: <Play size={24} />,
    path: '/simulacion',
  },
  {
    id: 'aeropuertos',
    label: 'Aereopuertos',
    icon: <Plane size={24} />,
    path: '/aeropuertos',
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isSelected = (path: string) => location.pathname === path;

  const handleItemClick = (path: string) => {
    navigate({ to: path });
  };

  return (
    <aside 
      className="fixed left-0 top-16 bottom-0 border-r border-gray-200 z-40"
      style={{ backgroundColor: '#FAFAFB', width: '165px' }}
    >
      <nav className="h-full overflow-y-auto">
        <div className="flex flex-col" style={{ paddingTop: '14px', paddingLeft: '1px' }}>
          {menuItems.map((item) => {
            const selected = isSelected(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.path)}
                className="flex items-center justify-start gap-2 whitespace-nowrap cursor-pointer transition-colors"
                style={{
                  padding: '16px',
                  fontSize: '14px',
                  lineHeight: '22px',
                  fontWeight: selected ? 700 : 400,
                  color: selected ? '#026FD7' : '#565D6D',
                  backgroundColor: selected ? '#E8F4FE' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

