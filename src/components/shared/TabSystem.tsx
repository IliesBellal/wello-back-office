import React, { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabSystemProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  renderContent?: (tabId: string) => ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * TabSystem - Composant d'onglets réutilisable
 * Utilise le même style que le composant de DashboardAnalysis
 * pour une cohérence visuelle à travers l'application
 * 
 * Supporte deux modes :
 * 1. Mode render prop: passer une fonction renderContent
 * 2. Mode children: passer directement du contenu React
 */
export const TabSystem: React.FC<TabSystemProps> = ({
  tabs,
  activeTab,
  onTabChange,
  renderContent,
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      {/* Barre d'onglets */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto border-b border-border pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu du tab actif */}
      <div className="tab-content">
        {renderContent ? renderContent(activeTab) : children}
      </div>
    </div>
  );
};

export default TabSystem;
