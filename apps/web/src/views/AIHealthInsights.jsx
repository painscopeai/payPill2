import React from 'react';
import { Helmet } from 'react-helmet';
import IntegratedAiChat from '@/components/integrated-ai-chat.jsx';
import Header from '@/components/Header.jsx';
import { Sparkles, Shield, Brain } from 'lucide-react';

const AIHealthInsights = () => {
  return (
    <>
      <Helmet>
        <title>AI Health Insights - PayPill</title>
        <meta name="description" content="Get personalized health insights and recommendations from PayPill's AI assistant" />
      </Helmet>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-12">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-balance mb-3">
              AI health insights
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Ask PayPill about your health data, medication interactions, provider recommendations, 
              and get personalized wellness advice based on your complete health profile.
            </p>
            
            <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-success" />
                HIPAA compliant
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Brain className="h-4 w-4 text-primary" />
                Evidence-based recommendations
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-xl overflow-hidden border">
            <IntegratedAiChat />
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Note:</strong> AI insights are for informational purposes only. Always consult your healthcare provider for medical decisions.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIHealthInsights;