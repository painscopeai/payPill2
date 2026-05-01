
import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

export function BarChart({ data, xKey = 'name', series = [], height = 300, stacked = false, layout = 'horizontal' }) {
  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} layout={layout} margin={{ top: 10, right: 10, left: layout === 'vertical' ? 20 : -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={layout === 'horizontal'} vertical={layout === 'vertical'} stroke="hsl(var(--border))" />
          <XAxis 
            type={layout === 'horizontal' ? 'category' : 'number'}
            dataKey={layout === 'horizontal' ? xKey : undefined} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
          />
          <YAxis 
            type={layout === 'vertical' ? 'category' : 'number'}
            dataKey={layout === 'vertical' ? xKey : undefined}
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
          />
          <Tooltip 
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          {series.length > 1 && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
          {series.map((s, i) => (
            <Bar 
              key={s.key}
              dataKey={s.key} 
              name={s.name || s.key}
              stackId={stacked ? "a" : undefined}
              fill={s.color || `hsl(var(--chart-${(i % 5) + 1}))`} 
              radius={stacked ? [0, 0, 0, 0] : (layout === 'horizontal' ? [4, 4, 0, 0] : [0, 4, 4, 0])}
            >
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={s.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
              ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
