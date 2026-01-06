import { Card, CardContent } from '@/components/ui/card';
import { Users, UserPlus, UserCheck } from 'lucide-react';

interface CustomersCardProps {
  totalCovers: number;
  newCustomers: number;
  returningCustomers: number;
  satisfactionRate: number;
}

export const CustomersCard = ({
  totalCovers,
  newCustomers,
  returningCustomers,
}: CustomersCardProps) => {
  const total = newCustomers + returningCustomers;
  const newPercentage = total > 0 ? (newCustomers / total) * 100 : 0;
  const returningPercentage = total > 0 ? (returningCustomers / total) * 100 : 0;

  return (
    <Card className="shadow-card hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Clients
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-bold text-foreground">
                {totalCovers}
              </h2>
              <span className="text-lg text-muted-foreground">couverts</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-accent" />
              <span className="text-sm">
                <span className="font-bold text-foreground">{newCustomers}</span>
                <span className="text-muted-foreground"> Nouveaux</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-sm">
                <span className="font-bold text-foreground">{returningCustomers}</span>
                <span className="text-muted-foreground"> Revenus</span>
              </span>
            </div>
          </div>

          {/* Mini bar visualization */}
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            <div
              className="bg-accent transition-all"
              style={{ width: `${newPercentage}%` }}
            />
            <div
              className="bg-primary transition-all"
              style={{ width: `${returningPercentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
