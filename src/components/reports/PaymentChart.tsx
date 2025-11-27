import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PaymentDayData } from '@/services/financialReportsService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentChartProps {
  data: PaymentDayData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value / 100);
};

export const PaymentChart = ({ data }: PaymentChartProps) => {
  // Transform data for stacked bar chart
  const chartData = data.map(day => {
    const dayData: any = {
      date: format(new Date(day.date), 'dd MMM', { locale: fr })
    };
    
    day.payments.forEach(payment => {
      dayData[payment.label] = payment.amount / 100; // Convert to euros
    });
    
    return dayData;
  });

  // Get unique payment methods for bars
  const paymentMethods = Array.from(
    new Set(data.flatMap(day => day.payments.map(p => p.label)))
  );

  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--secondary))',
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(value) => `${value}€`}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value * 100)}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <Legend />
        {paymentMethods.map((method, index) => (
          <Bar
            key={method}
            dataKey={method}
            stackId="a"
            fill={colors[index % colors.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
