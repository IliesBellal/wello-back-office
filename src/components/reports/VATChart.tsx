import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { VATDayData } from '@/services/financialReportsService';

interface VATChartProps {
  data: VATDayData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value / 100);
};

export const VATChart = ({ data }: VATChartProps) => {
  // Aggregate VAT by title
  const vatByTitle = new Map<string, number>();
  
  data.forEach(day => {
    day.VAT_data.forEach(vat => {
      const title = vat.tva_title || 'Autre';
      const current = vatByTitle.get(title) || 0;
      vatByTitle.set(title, current + (vat.tva || 0));
    });
  });

  const chartData = Array.from(vatByTitle.entries())
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value: value / 100 // Convert to euros
    }));

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--secondary))',
    'hsl(var(--muted))',
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={80}
          fill="hsl(var(--primary))"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value * 100)}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
