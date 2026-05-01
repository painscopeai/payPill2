import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Heart, Thermometer, Scale, Plus } from 'lucide-react';

export default function HealthOverviewWidget({ vitals }) {
  const getStatusColor = (status) => {
    if (status === 'normal') return 'text-emerald-500';
    if (status === 'warning') return 'text-orange-500';
    if (status === 'critical') return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Health Overview</CardTitle>
        <Button variant="outline" size="sm" className="h-8">
          <Plus className="h-4 w-4 mr-1" /> Update Vitals
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" /> BP
            </div>
            <div className={`text-xl font-bold ${getStatusColor('normal')}`}>
              {vitals?.systolic_bp || '--'}/{vitals?.diastolic_bp || '--'}
            </div>
          </div>
          <div className="space-y-1 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" /> Heart Rate
            </div>
            <div className={`text-xl font-bold ${getStatusColor('normal')}`}>
              {vitals?.heart_rate || '--'} <span className="text-sm font-normal text-muted-foreground">bpm</span>
            </div>
          </div>
          <div className="space-y-1 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scale className="h-4 w-4" /> BMI
            </div>
            <div className={`text-xl font-bold ${getStatusColor('warning')}`}>
              {vitals?.bmi || '--'}
            </div>
          </div>
          <div className="space-y-1 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Thermometer className="h-4 w-4" /> Temp
            </div>
            <div className={`text-xl font-bold ${getStatusColor('normal')}`}>
              {vitals?.body_temperature || '--'}°
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}