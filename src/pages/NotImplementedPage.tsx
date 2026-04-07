import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const NotImplementedPage = ({ title }: { title: string }) => (
  <DashboardLayout>
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">Page en cours de développement...</p>
      </div>
    </div>
  </DashboardLayout>
);

export default NotImplementedPage;
