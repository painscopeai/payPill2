import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function ChartCard({ title, description, children, className, action }) {
  return (
    <Card className={cn("border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px] w-full">
        {children}
      </CardContent>
    </Card>
  );
}