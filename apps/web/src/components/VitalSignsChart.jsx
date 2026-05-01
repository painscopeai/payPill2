import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Download, AlertCircle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Papa from 'papaparse';
import { format, subDays } from 'date-fns';

export default function VitalSignsChart() {
  const { currentUser } = useAuth();
  const [vitals, setVitals] = useState([]);
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVitals = async () => {
      try {
        const dateLimit = format(subDays(new Date(), parseInt(days)), 'yyyy-MM-dd');
        const records = await pb.collection('vitals').getList(1, 100, {
          filter: `userId="${currentUser.id}" && date_recorded >= "${dateLimit}"`,
          sort: 'date_recorded',
          $autoCancel: false
        });
        
        const formattedData = records.items.map(r => ({
          ...r,
          date: format(new Date(r.date_recorded), 'MMM dd')
        }));
        setVitals(formattedData);
      } catch (error) {
        console.error('Error fetching vitals:', error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchVitals();
  }, [currentUser, days]);

  const exportCSV = () => {
    const csv = Papa.unparse(vitals.map(v => ({
      Date: v.date_recorded,
      'Systolic BP': v.systolic_bp,
      'Diastolic BP': v.diastolic_bp,
      'Heart Rate': v.heart_rate,
      'Blood Sugar': v.blood_sugar,
      'Weight': v.weight,
      'O2 Saturation': v.oxygen_saturation
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vitals_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const hasAlerts = vitals.some(v => v.systolic_bp > 140 || v.diastolic_bp > 90 || v.heart_rate > 100 || v.oxygen_saturation < 95);

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            Vital Signs Trends
            {hasAlerts && <AlertCircle className="h-5 w-5 text-error" />}
          </CardTitle>
          <CardDescription>Monitor your key health metrics</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 px-2">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : vitals.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vitals} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="date" className="text-xs text-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" className="text-xs text-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" className="text-xs text-muted-foreground" tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              <ReferenceLine yAxisId="left" y={120} stroke="hsl(var(--success))" strokeDasharray="3 3" opacity={0.5} />
              <ReferenceLine yAxisId="left" y={80} stroke="hsl(var(--success))" strokeDasharray="3 3" opacity={0.5} />
              
              <Line yAxisId="left" type="monotone" dataKey="systolic_bp" name="Systolic BP" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line yAxisId="left" type="monotone" dataKey="diastolic_bp" name="Diastolic BP" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line yAxisId="right" type="monotone" dataKey="heart_rate" name="Heart Rate" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No vital signs recorded in this period.
          </div>
        )}
      </CardContent>
    </Card>
  );
}