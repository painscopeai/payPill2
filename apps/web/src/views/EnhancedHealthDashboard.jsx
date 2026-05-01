import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import HealthRiskOverviewCard from '@/components/HealthRiskOverviewCard.jsx';
import VitalSignsChart from '@/components/VitalSignsChart.jsx';
import MedicationTrackingTable from '@/components/MedicationTrackingTable.jsx';
import CareNavigationPanel from '@/components/CareNavigationPanel.jsx';
import HealthAnalyticsDashboard from '@/components/HealthAnalyticsDashboard.jsx';
import CommunicationHub from '@/components/CommunicationHub.jsx';
import RecordsAndDocumentsPanel from '@/components/RecordsAndDocumentsPanel.jsx';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function EnhancedHealthDashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Health Dashboard - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Health Command Center</h1>
            <p className="text-muted-foreground mt-1">Your comprehensive health overview and action plan.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Export Report
          </Button>
        </div>

        <div className="space-y-8">
          {/* Top Section: KPIs */}
          <section>
            <HealthRiskOverviewCard />
          </section>

          {/* Middle Section: Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Main Content Area (Left/Center) */}
            <div className="xl:col-span-9 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[450px]">
                <VitalSignsChart />
                <MedicationTrackingTable />
              </div>
              
              {/* Bottom Tabbed Area */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
                <HealthAnalyticsDashboard />
                <CommunicationHub />
              </div>
            </div>

            {/* Sidebar (Right) */}
            <div className="xl:col-span-3 space-y-8">
              <div className="h-[450px]">
                <CareNavigationPanel />
              </div>
              <div className="h-[500px]">
                <RecordsAndDocumentsPanel />
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}