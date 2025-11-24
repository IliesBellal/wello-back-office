import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { Home, ShoppingBag, Menu as MenuIcon, Users, Settings, Store, User, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const menuItems = [
  { title: 'Dashboard', icon: Home, path: '/' },
  { title: 'Commandes', icon: ShoppingBag, path: '/commandes' },
  { title: 'Menu', icon: MenuIcon, path: '/menu' },
  { title: 'Clients', icon: Users, path: '/clients' },
];

const settingsSubItems = [
  { title: 'Établissement', icon: Store, path: '/settings/establishment' },
  { title: 'Mon Profil', icon: User, path: '/settings/profile' },
];

export const Sidebar = () => {
  const [settingsOpen, setSettingsOpen] = useState(true);

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

        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full gap-3 px-4 py-3 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5" />
              <span>Paramètres</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {settingsSubItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-2 ml-6 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                activeClassName="bg-gradient-primary text-white font-medium shadow-soft"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </nav>
    </aside>
  );
};
