import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { BottomNav } from '@/components/mobile/BottomNav';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { authData } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!authData) {
      navigate('/login');
    }
  }, [authData, navigate]);

  if (!authData) {
    return null;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <OfflineIndicator />
      
      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header or Desktop Header */}
        {isMobile ? <MobileHeader /> : <Header />}
        
        <main className="flex-1 overflow-auto scroll-smooth-mobile pb-20 md:pb-0">
          {children}
        </main>
        
        {/* Mobile Bottom Navigation */}
        {isMobile && <BottomNav />}
      </div>
    </div>
  );
};
