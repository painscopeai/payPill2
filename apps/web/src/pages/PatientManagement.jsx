import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User, Activity, Pill, FileText, Plus, Download } from 'lucide-react';

export default function PatientManagement() {
  // Mock data for MVP since we don't have a specific patient ID in route yet
  const mockVitals = [
    { date: 'Oct 1', systolic: 120, diastolic: 80 },
    { date: 'Oct 8', systolic: 122, diastolic: 82 },
    { date: 'Oct 15', systolic: 118, diastolic: 78 },
    { date: 'Oct 22', systolic: 125, diastolic: 85 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Patient Record - PayPill Provider</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Patient Header */}
        <div className="bg-card border rounded-2xl p-6 mb-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              JD
            </div>
            <div>
              <h1 className="text-2xl font-bold">John Doe</h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                <span>DOB: 05/14/1980 (43y)</span>
                <span>Male</span>
                <span>MRN: #987654321</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" /> Generate Report</Button>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Note</Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vitals">Vitals & Labs</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-lg">Active Conditions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border">
                    <span className="font-medium">Type 2 Diabetes</span>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Monitoring</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border">
                    <span className="font-medium">Hypertension</span>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">Controlled</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-lg">Allergies</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <span className="font-medium text-destructive">Penicillin</span>
                    <span className="text-sm text-muted-foreground">Severe (Anaphylaxis)</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vitals">
            <Card>
              <CardHeader>
                <CardTitle>Blood Pressure Trends</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockVitals} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} className="text-xs" />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="systolic" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="diastolic" stroke="hsl(var(--secondary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Current Prescriptions</CardTitle>
                <Button size="sm" className="gap-2"><Pill className="h-4 w-4" /> Prescribe</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">Metformin</h4>
                      <p className="text-sm text-muted-foreground">500mg • Twice daily</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="p-4 border rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">Lisinopril</h4>
                      <p className="text-sm text-muted-foreground">10mg • Once daily</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Select an encounter to view clinical notes.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}