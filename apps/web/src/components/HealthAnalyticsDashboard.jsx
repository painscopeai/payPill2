import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity, Pill, FlaskConical, ShieldCheck, AlertCircle } from 'lucide-react';
import pb from '@/lib/supabaseMappedCollections';
import { useAuth } from '@/contexts/AuthContext';

export default function HealthAnalyticsDashboard() {
  const { currentUser } = useAuth();
  const [conditions, setConditions] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [condRes, labRes] = await Promise.all([
          pb.collection('pre_existing_conditions').getList(1, 50, { filter: `userId="${currentUser.id}"`, $autoCancel: false }),
          pb.collection('lab_results').getList(1, 50, { filter: `userId="${currentUser.id}"`, sort: '-date_tested', $autoCancel: false })
        ]);
        setConditions(condRes.items);
        setLabs(labRes.items);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchData();
  }, [currentUser]);

  return (
    <Card className="shadow-lg border-0">
      <Tabs defaultValue="conditions" className="w-full">
        <div className="px-6 pt-6 pb-2 border-b">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-transparent">
            <TabsTrigger value="conditions" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2">
              <Activity className="h-4 w-4 mr-2" /> Conditions
            </TabsTrigger>
            <TabsTrigger value="medications" className="data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary py-2">
              <Pill className="h-4 w-4 mr-2" /> Effectiveness
            </TabsTrigger>
            <TabsTrigger value="labs" className="data-[state=active]:bg-info/10 data-[state=active]:text-info py-2">
              <FlaskConical className="h-4 w-4 mr-2" /> Lab Results
            </TabsTrigger>
            <TabsTrigger value="preventive" className="data-[state=active]:bg-success/10 data-[state=active]:text-success py-2">
              <ShieldCheck className="h-4 w-4 mr-2" /> Preventive
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="p-6 min-h-[300px]">
          <TabsContent value="conditions" className="mt-0 space-y-4">
            <h3 className="text-lg font-semibold mb-4">Condition Management Status</h3>
            {conditions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {conditions.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border bg-card flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{c.condition_name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">Diagnosed: {c.date_diagnosed ? new Date(c.date_diagnosed).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={c.controlled_status === 'controlled' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}>
                        {c.controlled_status || 'Monitoring'}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">{c.severity} severity</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No conditions recorded.</p>
            )}
          </TabsContent>

          <TabsContent value="medications" className="mt-0">
            <h3 className="text-lg font-semibold mb-4">Medication Effectiveness</h3>
            <div className="p-8 text-center border rounded-xl border-dashed">
              <Pill className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">Log your daily symptoms to generate effectiveness insights.</p>
            </div>
          </TabsContent>

          <TabsContent value="labs" className="mt-0 space-y-4">
            <h3 className="text-lg font-semibold mb-4">Recent Lab Results</h3>
            {labs.length > 0 ? (
              <div className="space-y-3">
                {labs.map(lab => (
                  <div key={lab.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{lab.test_name}</h4>
                        {lab.status === 'for-review' && <AlertCircle className="h-4 w-4 text-warning" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{new Date(lab.date_tested).toLocaleDateString()} • {lab.provider_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{lab.result_value || 'Pending'}</p>
                      <p className="text-xs text-muted-foreground">Range: {lab.normal_range}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No lab results available.</p>
            )}
          </TabsContent>

          <TabsContent value="preventive" className="mt-0">
            <h3 className="text-lg font-semibold mb-4">Preventive Care Checklist</h3>
            <div className="space-y-3">
              {['Annual Physical Exam', 'Flu Vaccination', 'Lipid Panel Screening'].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-success' : 'bg-warning'}`}></div>
                    <span className="font-medium">{item}</span>
                  </div>
                  <Badge variant="outline">{i === 0 ? 'Up to date' : 'Due soon'}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}