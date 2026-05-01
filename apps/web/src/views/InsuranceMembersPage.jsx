import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function InsuranceMembersPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Members - PayPill</title></Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Member Directory</h1>
          <p className="text-muted-foreground mt-1">View and manage enrolled members and their coverage status.</p>
        </div>
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Member Management
            </CardTitle>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">This page is currently under construction. Check back soon for updates.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}