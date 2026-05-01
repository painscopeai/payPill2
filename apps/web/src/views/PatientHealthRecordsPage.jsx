import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Download, Plus, FileText, Activity, Pill, Syringe, Share2 } from 'lucide-react';

export default function PatientHealthRecordsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const conditions = [
    { id: 1, name: 'Type 2 Diabetes', date: '2022-04-15', status: 'Active', severity: 'Moderate', doctor: 'Dr. Smith' },
    { id: 2, name: 'Hypertension', date: '2021-11-02', status: 'Active', severity: 'Mild', doctor: 'Dr. Jenkins' }
  ];

  const labs = [
    { id: 1, test: 'Comprehensive Metabolic Panel', date: '2024-01-10', result: 'Normal', lab: 'Quest Diagnostics' },
    { id: 2, test: 'Lipid Panel', date: '2024-01-10', result: 'Review Needed', lab: 'Quest Diagnostics' }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Health Records - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Health Records</h1>
            <p className="text-muted-foreground">Manage your medical history, lab results, and immunizations.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2"><Share2 className="h-4 w-4" /> Share Records</Button>
            <Button className="gap-2"><Download className="h-4 w-4" /> Download All</Button>
          </div>
        </div>

        <Card className="shadow-sm border-border/50 mb-8">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search records..." className="pl-9 bg-background" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4"/> Add Record</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Health Record</DialogTitle>
                </DialogHeader>
                <div className="py-4 text-center text-muted-foreground">
                  Select record type to add (Condition, Allergy, Surgery, etc.)
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="conditions" className="w-full">
            <div className="px-4 pt-4 border-b overflow-x-auto">
              <TabsList className="bg-transparent h-auto p-0 flex justify-start gap-6">
                <TabsTrigger value="conditions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2">Conditions</TabsTrigger>
                <TabsTrigger value="labs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2">Lab Results</TabsTrigger>
                <TabsTrigger value="allergies" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2">Allergies</TabsTrigger>
                <TabsTrigger value="surgeries" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2">Surgeries</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="conditions" className="p-0 m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b">
                    <tr>
                      <th className="px-6 py-4 font-medium">Condition</th>
                      <th className="px-6 py-4 font-medium">Date Diagnosed</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Managing Doctor</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {conditions.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{c.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{c.date}</td>
                        <td className="px-6 py-4"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{c.status}</Badge></td>
                        <td className="px-6 py-4 text-muted-foreground">{c.doctor}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm">Details</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="labs" className="p-0 m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b">
                    <tr>
                      <th className="px-6 py-4 font-medium">Test Name</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Result</th>
                      <th className="px-6 py-4 font-medium">Laboratory</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {labs.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{l.test}</td>
                        <td className="px-6 py-4 text-muted-foreground">{l.date}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={l.result === 'Normal' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}>
                            {l.result}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{l.lab}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="text-primary">View PDF</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}