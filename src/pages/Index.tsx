import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';

const Index = () => {
  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de votre activité
          </p>
        </div>

        <Tabs defaultValue="day" className="w-full">
          <TabsList className="bg-card shadow-soft">
            <TabsTrigger value="day">Aujourd'hui</TabsTrigger>
            <TabsTrigger value="week">Cette semaine</TabsTrigger>
            <TabsTrigger value="month">Ce mois</TabsTrigger>
          </TabsList>

          <TabsContent value="day" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Chiffre d'affaires"
                value="2 847€"
                subtitle="Aujourd'hui"
                icon={DollarSign}
                trend="+12.5% vs hier"
              />
              <StatCard
                title="Commandes"
                value="67"
                subtitle="Commandes du jour"
                icon={ShoppingCart}
                trend="+8 commandes"
                isHighlighted
              />
              <StatCard
                title="Panier moyen"
                value="42.50€"
                subtitle="Moyenne"
                icon={TrendingUp}
                trend="+5.2% vs hier"
              />
              <StatCard
                title="Clients"
                value="54"
                subtitle="Clients servis"
                icon={Users}
                trend="12 nouveaux"
              />
            </div>
          </TabsContent>

          <TabsContent value="week" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Chiffre d'affaires"
                value="18 425€"
                subtitle="Cette semaine"
                icon={DollarSign}
                trend="+15.8% vs semaine dernière"
              />
              <StatCard
                title="Commandes"
                value="428"
                subtitle="Commandes de la semaine"
                icon={ShoppingCart}
                trend="+42 commandes"
                isHighlighted
              />
              <StatCard
                title="Panier moyen"
                value="43.04€"
                subtitle="Moyenne"
                icon={TrendingUp}
                trend="+3.1% vs semaine dernière"
              />
              <StatCard
                title="Clients"
                value="312"
                subtitle="Clients servis"
                icon={Users}
                trend="68 nouveaux"
              />
            </div>
          </TabsContent>

          <TabsContent value="month" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Chiffre d'affaires"
                value="78 940€"
                subtitle="Ce mois"
                icon={DollarSign}
                trend="+22.3% vs mois dernier"
              />
              <StatCard
                title="Commandes"
                value="1 847"
                subtitle="Commandes du mois"
                icon={ShoppingCart}
                trend="+186 commandes"
                isHighlighted
              />
              <StatCard
                title="Panier moyen"
                value="42.75€"
                subtitle="Moyenne"
                icon={TrendingUp}
                trend="+4.8% vs mois dernier"
              />
              <StatCard
                title="Clients"
                value="1 284"
                subtitle="Clients servis"
                icon={Users}
                trend="247 nouveaux"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Index;
