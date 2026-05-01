import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MetricCard({ title, value, trend, trendLabel, icon: Icon, className }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const isNeutral = trend === 0;

  return (
    <Card className={cn("border-border/60 shadow-sm rounded-2xl overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
          {trend !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <span className={cn(
                "flex items-center font-medium",
                isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"
              )}>
                {isPositive && <ArrowUpRight className="h-4 w-4 mr-1" />}
                {isNegative && <ArrowDownRight className="h-4 w-4 mr-1" />}
                {isNeutral && <Minus className="h-4 w-4 mr-1" />}
                {Math.abs(trend)}%
              </span>
              <span className="text-muted-foreground">{trendLabel || 'vs last month'}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}