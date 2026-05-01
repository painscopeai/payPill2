import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import MetricCard from '@/components/MetricCard.jsx';
import { Pill, TrendingDown, DollarSign } from 'lucide-react';

export default function GenericDrugSavingsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Generic Savings - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Generic Drug Savings</h1>
          <p className="text-muted-foreground mt-1">Monitor formulary compliance and generic substitution rates.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <MetricCard title="Generic Dispensing Rate" value="84.2%" trend={1.2} icon={Pill} />
          <MetricCard title="YTD Savings" value="$12.4M" trend={15.4} icon={DollarSign} />
          <MetricCard title="Missed Opportunities" value="$1.2M" trend={-5.0} trendLabel="vs last quarter" icon={TrendingDown} />
        </div>
        
        <div className="p-12 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10">
          <p className="text-muted-foreground">Detailed therapeutic class breakdown coming soon.</p>
        </div>
      </main>
    </div>
  );
}