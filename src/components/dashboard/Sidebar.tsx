import { NavLink } from '@/components/NavLink';
import { Home, ShoppingBag, Menu as MenuIcon, Users, Settings } from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', icon: Home, path: '/' },
  { title: 'Commandes', icon: ShoppingBag, path: '/commandes' },
  { title: 'Menu', icon: MenuIcon, path: '/menu' },
  { title: 'Clients', icon: Users, path: '/clients' },
  { title: 'Paramètres', icon: Settings, path: '/parametres' },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border shadow-soft flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Wello Resto
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            activeClassName="bg-gradient-primary text-white font-medium shadow-soft"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
