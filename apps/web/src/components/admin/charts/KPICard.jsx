
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KPICard({ title, value, trend, trendLabel, icon: Icon, className }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const isNeutral = trend === 0 || !trend;

  return (
    <Card className={cn("border-none admin-card-shadow overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            {Icon && <Icon className="w-5 h-5" />}
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center text-sm font-medium px-2 py-1 rounded-full",
              isPositive ? "text-success bg-success/10" : 
              isNegative ? "text-error bg-error/10" : 
              "text-muted-foreground bg-muted"
            )}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : 
               isNegative ? <TrendingDown className="w-3 h-3 mr-1" /> : 
               <Minus className="w-3 h-3 mr-1" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
        <div className="text-3xl font-bold font-display tracking-tight">{value}</div>
        {trendLabel && (
          <p className="text-xs text-muted-foreground mt-2">{trendLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
