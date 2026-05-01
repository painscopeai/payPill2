
import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function PieChart({ data, nameKey = 'name', dataKey = 'value', height = 300, donut = false }) {
  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={donut ? "60%" : 0}
            outerRadius="80%"
            paddingAngle={donut ? 5 : 0}
            dataKey={dataKey}
            nameKey={nameKey}
            label={!donut}
          >
            {data?.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
