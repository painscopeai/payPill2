import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Activity, Heart, Pill, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

export default function HealthRiskOverviewCard() {
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const records = await pb.collection('health_dashboard_metrics').getFullList({
          filter: `userId="${currentUser.id}"`,
          $autoCancel: false
        });
        if (records.length > 0) {
          setMetrics(records[0]);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchMetrics();
  }, [currentUser]);

  const getRiskColor = (score) => {
    if (score < 30) return 'text-success';
    if (score < 60) return 'text-warning';
    if (score < 80) return 'text-orange-500';
    return 'text-error';
  };

  const getRiskBadge = (score) => {
    if (score < 30) return <span className="risk-indicator-low">Low</span>;
    if (score < 60) return <span className="risk-indicator-moderate">Moderate</span>;
    if (score < 80) return <span className="risk-indicator-high bg-orange-500/10 text-orange-500 border-orange-500/20">High</span>;
    return <span className="risk-indicator-high">Critical</span>;
  };

  const adherenceData = [
    { name: 'Adherent', value: metrics?.adherence_score || 0 },
    { name: 'Missed', value: 100 - (metrics?.adherence_score || 0) }
  ];
  const COLORS = ['hsl(152 69% 31%)', 'hsl(214 32% 91%)'];

  if (loading) return <div className="h-32 animate-pulse bg-muted rounded-xl"></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-2">
          <CardDescription>Relative Risk Score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-4xl font-bold ${getRiskColor(metrics?.relative_risk_score || 0)}`}>
                {metrics?.relative_risk_score || 0}
              </div>
              <span className="text-sm text-muted-foreground">out of 100</span>
            </div>
            <Activity className={`h-8 w-8 ${getRiskColor(metrics?.relative_risk_score || 0)} opacity-20`} />
          </div>
          <Progress value={metrics?.relative_risk_score || 0} className="mt-4 h-2" />
        </CardContent>
      </Card>

      <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-2">
          <CardDescription>Chronic Disease Risk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold mb-1">
                {metrics?.chronic_disease_risk || 0}%
              </div>
              {getRiskBadge(metrics?.chronic_disease_risk || 0)}
            </div>
            <Heart className="h-8 w-8 text-secondary/20" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-2">
          <CardDescription>Medication Adherence</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-success">
              {metrics?.adherence_score || 0}%
            </div>
            <span className="text-sm text-muted-foreground">Last 30 days</span>
          </div>
          <div className="h-16 w-16">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={adherenceData}
                  innerRadius={20}
                  outerRadius={30}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {adherenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-2">
          <CardDescription>Vital Status Trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold capitalize">
                {metrics?.vital_status_trend || 'Stable'}
              </div>
              <span className="text-sm text-muted-foreground">Overall trajectory</span>
            </div>
            {metrics?.vital_status_trend === 'improving' ? (
              <TrendingUp className="h-8 w-8 text-success" />
            ) : metrics?.vital_status_trend === 'declining' ? (
              <TrendingDown className="h-8 w-8 text-error" />
            ) : (
              <Minus className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}