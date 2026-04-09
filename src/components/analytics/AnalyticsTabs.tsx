import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReactNode } from 'react';

export interface AnalyticsTab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface AnalyticsTabsProps {
  tabs: AnalyticsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

/**
 * Navigation par onglets pour la page Analyses
 * Gère la sélection d'onglet avec persistance dans l'URL
 */
export function AnalyticsTabs({
  tabs,
  activeTab,
  onTabChange,
  children,
}: AnalyticsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      {/* Navigation */}
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 h-auto p-1">
        {tabs.map((tab) => (
          <TabsTrigger 
            key={tab.id} 
            value={tab.id}
            className="text-xs sm:text-sm"
          >
            {tab.icon && <span className="mr-1">{tab.icon}</span>}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="inline sm:hidden">{tab.label.split(' ')[0]}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Contenu - rendu par le parent */}
      {children}
    </Tabs>
  );
}

interface AnalyticsTabContentProps {
  tabId: string;
  children: ReactNode;
}

export function AnalyticsTabContent({ tabId, children }: AnalyticsTabContentProps) {
  return (
    <TabsContent value={tabId} className="mt-6 space-y-6">
      {children}
    </TabsContent>
  );
}
