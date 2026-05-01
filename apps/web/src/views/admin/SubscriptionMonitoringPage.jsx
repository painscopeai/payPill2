
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, DollarSign, Users, AlertTriangle } from 'lucide-react';

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--error))'];

export default function SubscriptionMonitoringPage() {
  const pieData = [{ name: 'Active', value: 850 }, { name: 'Paused', value: 50 }, { name: 'Expired', value: 100 }];
  const revenueData = [{ name: 'Jan', val: 4000 }, { name: 'Feb', val: 5000 }, { name: 'Mar', val: 4800 }, { name: 'Apr', val: 6000 }];

  const KpiCard = ({ title, value, icon: Icon, trend }) => (
    <Card className="border-none admin-card-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary"><Icon className="w-5 h-5" /></div>
          <span className={`text-sm font-medium ${trend > 0 ? 'text-success' : 'text-error'}`}>{trend > 0 ? '+' : ''}{trend}%</span>
        </div>
        <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
        <div className="text-3xl font-bold font-display">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Subscription Monitoring</h1>
        <p className="text-muted-foreground">Track MRR, churn, and overall subscription health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Monthly Recurring Revenue" value="$42,500" icon={DollarSign} trend={8.4} />
        <KpiCard title="Active Subscriptions" value="850" icon={Activity} trend={5.2} />
        <KpiCard title="Upcoming Renewals (30d)" value="124" icon={Users} trend={-2.1} />
        <KpiCard title="Failed Payments" value="12" icon={AlertTriangle} trend={-15.0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Line type="monotone" dataKey="val" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
