import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RevenueCard } from '@/components/dashboard/RevenueCard';
import { ServiceCard } from '@/components/dashboard/ServiceCard';
import { CustomersCard } from '@/components/dashboard/CustomersCard';
import { AlertsCard } from '@/components/dashboard/AlertsCard';
import { HourlyChart } from '@/components/dashboard/HourlyChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickProductSheet } from '@/components/dashboard/QuickProductSheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getDashboardRealtime,
  getDashboardHourly,
  getDashboardActivity,
  type DashboardRealtime,
  type HourlyData,
  type ActivityEvent,
} from '@/services/dashboardService';

const Index = () => {
  const [realtimeData, setRealtimeData] = useState<DashboardRealtime | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [activityData, setActivityData] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSheetOpen, setProductSheetOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [realtime, hourly, activity] = await Promise.all([
          getDashboardRealtime(),
          getDashboardHourly(),
          getDashboardActivity(),
        ]);
        setRealtimeData(realtime);
        setHourlyData(hourly);
        setActivityData(activity);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {getGreeting()} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Voici l'état de votre activité en temps réel
            </p>
          </div>
          <QuickActions onNewProduct={() => setProductSheetOpen(true)} />
        </div>

        {/* KPI Cards Section */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px] rounded-2xl" />
            ))}
          </div>
        ) : realtimeData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <RevenueCard
              current={realtimeData.revenue.current}
              currency={realtimeData.revenue.currency}
              trendPercentage={realtimeData.revenue.trend_percentage}
              trendDirection={realtimeData.revenue.trend_direction}
              comparisons={realtimeData.revenue.comparisons}
              progressTarget={realtimeData.revenue.progress_target}
            />
            <ServiceCard
              avgTimeMinutes={realtimeData.service.avg_time_minutes}
              status={realtimeData.service.status}
              ordersPerHour={realtimeData.service.orders_per_hour}
            />
            <CustomersCard
              totalCovers={realtimeData.customers.total_covers}
              newCustomers={realtimeData.customers.new_customers}
              returningCustomers={realtimeData.customers.returning_customers}
              satisfactionRate={realtimeData.customers.satisfaction_rate}
            />
            <AlertsCard
              lowStockCount={realtimeData.alerts.low_stock_count}
              voidedOrders={realtimeData.alerts.voided_orders}
              pendingDeliveries={realtimeData.alerts.pending_deliveries}
            />
          </div>
        ) : null}

        {/* Chart & Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {loading ? (
              <Skeleton className="h-[360px] rounded-2xl" />
            ) : (
              <HourlyChart data={hourlyData} />
            )}
          </div>
          <div className="lg:col-span-1">
            {loading ? (
              <Skeleton className="h-[360px] rounded-2xl" />
            ) : (
              <ActivityFeed events={activityData} />
            )}
          </div>
        </div>
      </div>

      {/* Quick Product Creation Sheet */}
      <QuickProductSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
      />
    </DashboardLayout>
  );
};

export default Index;
