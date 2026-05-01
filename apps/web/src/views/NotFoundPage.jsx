import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <Helmet>
        <title>Page Not Found - PayPill</title>
      </Helmet>
      
      <div className="bg-primary/10 p-4 rounded-2xl mb-6">
        <Activity className="h-10 w-10 text-primary" />
      </div>
      
      <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-4 tracking-tight">
        404
      </h1>
      <h2 className="text-2xl md:text-3xl font-semibold mb-3">
        Page Not Found
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md text-lg">
        The page you are looking for doesn't exist, has been moved, or you don't have permission to access it.
      </p>
      
      <Button 
        onClick={() => navigate('/')} 
        size="lg" 
        className="rounded-xl px-8 h-12 text-base"
      >
        Return Home
      </Button>
    </div>
  );
}