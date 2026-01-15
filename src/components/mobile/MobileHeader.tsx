import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Building2 } from 'lucide-react';
import { MobileSidebar } from './MobileSidebar';

export const MobileHeader = () => {
  const { authData } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!authData) return null;

  return (
    <header className="h-14 bg-card border-b border-border shadow-soft flex items-center justify-between px-3 safe-area-top md:hidden">
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 safe-area-left">
          <MobileSidebar onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2 text-sm">
        <Building2 className="w-4 h-4 text-primary" />
        <span className="font-medium truncate max-w-[150px]">{authData.merchantName}</span>
      </div>

      <div className="w-11" /> {/* Spacer for balance */}
    </header>
  );
};
