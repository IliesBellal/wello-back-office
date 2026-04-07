import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import { navigationConfig } from '@/config/navigationConfig';
import { SidebarItem } from './SidebarItem';
import { CollapsibleItem } from './CollapsibleItem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

/**
 * Main Sidebar Component
 * 
 * Features:
 * - Smooth collapse/expand animation (300ms)
 * - Persistent state in localStorage
 * - Hierarchical navigation with sub-items
 * - Active page highlighting with left border
 * - Popover sub-items when collapsed
 * - Responsive design (hidden on mobile)
 * - Accessibility features (ARIA labels, keyboard nav)
 */
export const Sidebar: React.FC = () => {
  const { isExpanded, toggleExpanded } = useSidebar();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        // Layout & Size
        'h-screen overflow-hidden flex flex-col',
        'bg-sidebar border-r border-sidebar-border',
        'transition-all duration-300 ease-in-out',
        // Animation & width
        isExpanded ? 'w-64' : 'w-16',
        // Shadow
        'shadow-soft flex-shrink-0'
      )}
      aria-label="Navigation principale"
    >
      {/* ═══ HEADER ═══ */}
      <div
        className={cn(
          'flex items-center justify-between h-20 px-4 border-b border-sidebar-border',
          'shrink-0 bg-gradient-to-r from-sidebar/50 to-sidebar',
          'transition-all duration-300'
        )}
      >
        {/* Logo */}
        {isExpanded && (
          <div className="animate-in fade-in duration-300">
            <button
              onClick={() => navigate('/')}
              className={cn(
                'text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-500',
                'bg-clip-text text-transparent hover:opacity-80 transition-opacity',
                'truncate'
              )}
              title="Aller au tableau de bord"
            >
              Wello Resto
            </button>
          </div>
        )}

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleExpanded}
          className={cn(
            'h-8 w-8 shrink-0',
            'hover:bg-sidebar-accent/50 transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
          )}
          title={isExpanded ? 'Réduire le menu' : 'Agrandir le menu'}
          aria-label={isExpanded ? 'Réduire le menu' : 'Agrandir le menu'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* ═══ NAVIGATION SECTIONS ═══ */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          'py-4 space-y-6',
          'transition-all duration-300',
          isExpanded ? 'px-3' : 'px-2 flex flex-col items-center'
        )}
      >
        {navigationConfig.map((section) => (
          <div key={section.id} className="space-y-2 w-full">
            {/* Section Label (only when expanded) */}
            {section.label && isExpanded && (
              <div className="px-3 py-2 animate-in fade-in duration-300">
                <p className="text-xs font-bold text-sidebar-foreground/50 uppercase tracking-widest">
                  {section.label}
                </p>
              </div>
            )}

            {/* Section Items */}
            <div
              className={cn(
                'space-y-1.5',
                isExpanded && 'animate-in fade-in slide-in-from-left-4 duration-300'
              )}
            >
              {section.items.map((item) => (
                // Items without sub-items
                <SidebarItem key={item.id} item={item} isCollapsed={!isExpanded} />
              ))}

              {/* Items with sub-items */}
              {section.items.map((item) => (
                <CollapsibleItem key={item.id} item={item} isCollapsed={!isExpanded} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ═══ FOOTER - USER MENU ═══ */}
      <div
        className={cn(
          'border-t border-sidebar-border p-3 shrink-0',
          'bg-gradient-to-t from-sidebar/50 to-sidebar',
          'transition-all duration-300'
        )}
      >
        <Button
          variant="ghost"
          className={cn(
            'w-full text-sm font-medium transition-all duration-200',
            'text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            'group relative',
            isExpanded ? 'justify-start gap-3 px-3 py-2.5' : 'justify-center w-11 h-11 p-0'
          )}
          onClick={handleLogout}
          title={isExpanded ? 'Déconnexion' : 'Déconnexion'}
          aria-label="Se déconnecter"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isExpanded && (
            <span className="truncate animate-in fade-in duration-300">Déconnexion</span>
          )}
        </Button>
      </div>
    </aside>
  );
};
