import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/supabaseMappedCollections';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Pill, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '@/components/Header.jsx';

const HealthDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [medications, setMedications] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    try {
      const metricsRecords = await pb.collection('health_dashboard_metrics').getFullList({
        filter: `userId = "${currentUser.id}"`,
        $autoCancel: false
      });

      if (metricsRecords.length === 0) {
        await calculateRiskAssessment();
      } else {
        setDashboardMetrics(metricsRecords[0]);
      }

      const profileRecords = await pb.collection('health_profile').getFullList({
        filter: `userId = "${currentUser.id}"`,
        $autoCancel: false
      });
      if (profileRecords.length > 0) setHealthProfile(profileRecords[0]);

      const conditionsRecords = await pb.collection('pre_existing_conditions').getFullList({
        filter: `userId = "${currentUser.id}"`,
        $autoCancel: false
      });
      setConditions(conditionsRecords);

      const medicationsRecords = await pb.collection('current_medications').getFullList({
        filter: `userId = "${currentUser.id}"`,
        $autoCancel: false
      });
      setMedications(medicationsRecords);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskAssessment = async () => {
    try {
      const response = await apiServerClient.fetch('/health/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditions: conditions.map(c => c.condition_name),
          medications: medications.map(m => ({ name: m.medication_name, strength: m.strength })),
          vitals: {
            bloodPressure: `${healthProfile?.blood_pressure_systolic}/${healthProfile?.blood_pressure_diastolic}`,
            heartRate: healthProfile?.resting_heart_rate,
            bmi: healthProfile?.bmi
          },
          age: healthProfile?.age || 30,
          lifestyle: {
            exercise: healthProfile?.exercise_level,
            smoking: healthProfile?.smoking_status
          }
        })
      });

      if (!response.ok) throw new Error('Risk assessment failed');

      const data = await response.json();
      setDashboardMetrics(data);
    } catch (error) {
      console.error('Risk assessment error:', error);
    }
  };

  const getRiskLevel = (score) => {
    if (score >= 70) return { level: 'high', className: 'risk-indicator-high' };
    if (score >= 40) return { level: 'moderate', className: 'risk-indicator-moderate' };
    return { level: 'low', className: 'risk-indicator-low' };
  };

  const mockVitalsData = [
    { date: 'Mon', bp: 120, hr: 72 },
    { date: 'Tue', bp: 118, hr: 70 },
    { date: 'Wed', bp: 122, hr: 74 },
    { date: 'Thu', bp: 119, hr: 71 },
    { date: 'Fri', bp: 121, hr: 73 },
    { date: 'Sat', bp: 117, hr: 69 },
    { date: 'Sun', bp: 120, hr: 72 },
  ];

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Health Dashboard - PayPill</title>
        <meta name="description" content="View your personalized health metrics, risk scores, and AI-powered health insights" />
      </Helmet>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-balance mb-2">
              Welcome back, {currentUser?.first_name || 'User'}
            </h1>
            <p className="text-muted-foreground">Here's your health overview</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription>Relative Risk Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-primary">
                      {dashboardMetrics?.relative_risk_score || 0}
                    </div>
                    <span className={dashboardMetrics ? getRiskLevel(dashboardMetrics.relative_risk_score).className : 'risk-indicator-low'}>
                      {dashboardMetrics ? getRiskLevel(dashboardMetrics.relative_risk_score).level : 'low'}
                    </span>
                  </div>
                  <Activity className="h-8 w-8 text-primary/20" />
                </div>
                <Progress value={dashboardMetrics?.relative_risk_score || 0} className="mt-4" />
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription>Chronic Disease Risk</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-secondary">
                      {dashboardMetrics?.chronic_disease_risk || 0}%
                    </div>
                    <span className="text-sm text-muted-foreground">Risk level</span>
                  </div>
                  <Heart className="h-8 w-8 text-secondary/20" />
                </div>
                <Progress value={dashboardMetrics?.chronic_disease_risk || 0} className="mt-4" />
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription>Medication Adherence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-success">
                      {dashboardMetrics?.medication_adherence_score || 0}%
                    </div>
                    <span className="text-sm text-muted-foreground">Adherence rate</span>
                  </div>
                  <Pill className="h-8 w-8 text-success/20" />
                </div>
                <Progress value={dashboardMetrics?.medication_adherence_score || 0} className="mt-4" />
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription>Active Conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">{conditions.length}</div>
                    <span className="text-sm text-muted-foreground">Conditions tracked</span>
                  </div>
                  <AlertCircle className="h-8 w-8 text-muted-foreground/20" />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  {medications.length} active medications
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Vital signs trend
                </CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockVitalsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="bp" stroke="hsl(var(--primary))" strokeWidth={2} name="Blood Pressure" />
                    <Line type="monotone" dataKey="hr" stroke="hsl(var(--secondary))" strokeWidth={2} name="Heart Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Preventive care gaps
                </CardTitle>
                <CardDescription>Recommended actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardMetrics?.preventive_care_gaps?.length > 0 ? (
                    dashboardMetrics.preventive_care_gaps.map((gap, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{gap}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No preventive care gaps identified. Great job!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Current medications</CardTitle>
                <CardDescription>{medications.length} active prescriptions</CardDescription>
              </CardHeader>
              <CardContent>
                {medications.length > 0 ? (
                  <div className="space-y-3">
                    {medications.slice(0, 5).map((med) => (
                      <div key={med.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{med.medication_name}</p>
                          <p className="text-sm text-muted-foreground">{med.dosage} - {med.frequency}</p>
                        </div>
                        <Badge variant="outline" className="medication-badge">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No medications recorded
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Pre-existing conditions</CardTitle>
                <CardDescription>{conditions.length} conditions tracked</CardDescription>
              </CardHeader>
              <CardContent>
                {conditions.length > 0 ? (
                  <div className="space-y-3">
                    {conditions.slice(0, 5).map((condition) => (
                      <div key={condition.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{condition.condition_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {condition.controlled_status ? 'Controlled' : 'Under treatment'}
                          </p>
                        </div>
                        <span className={condition.severity === 'severe' ? 'risk-indicator-high' : condition.severity === 'moderate' ? 'risk-indicator-moderate' : 'risk-indicator-low'}>
                          {condition.severity || 'moderate'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No conditions recorded
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default HealthDashboard;