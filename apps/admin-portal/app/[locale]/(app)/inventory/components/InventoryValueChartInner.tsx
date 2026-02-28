'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAUD } from '@joho-erp/shared';

interface InventoryValueDataPoint {
  period: string;
  value: number;
}

interface InventoryValueChartInnerProps {
  data: InventoryValueDataPoint[];
}

export function InventoryValueChartInner({ data }: InventoryValueChartInnerProps) {
  // Custom tooltip formatter for currency
  const formatTooltipValue = (value: number | undefined) => {
    if (value === undefined) return '';
    return formatAUD(value);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="period"
          className="text-xs"
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          className="text-xs"
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => formatAUD(value)}
          width={80}
        />
        <Tooltip
          formatter={formatTooltipValue}
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          fill="rgba(59, 130, 246, 0.2)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
