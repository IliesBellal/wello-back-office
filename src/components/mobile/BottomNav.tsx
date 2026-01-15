import { NavLink } from '@/components/NavLink';
import { Home, ShoppingBag, Menu as MenuIcon, Users, Settings } from 'lucide-react';

const bottomNavItems = [
  { title: 'Tableau', icon: Home, path: '/', end: true },
  { title: 'Commandes', icon: ShoppingBag, path: '/orders', end: false },
  { title: 'Menu', icon: MenuIcon, path: '/menu', end: true },
  { title: 'Équipe', icon: Users, path: '/users', end: false },
  { title: 'Réglages', icon: Settings, path: '/settings', end: false },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-soft safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className="flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] px-3 py-2 text-muted-foreground transition-colors touch-target"
            activeClassName="text-primary"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
