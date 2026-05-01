import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles, CheckCircle2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import IntegratedAiChat from '@/components/integrated-ai-chat.jsx';

export default function RecommendationsPage() {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    if (!currentUser?.id) return;
    try {
      const data = await pb.collection('recommendations').getList(1, 50, {
        filter: `user_id = "${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setRecommendations(data.items);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [currentUser]);

  const updateStatus = async (id, status) => {
    try {
      await pb.collection('recommendations').update(id, { status }, { $autoCancel: false });
      toast.success(`Recommendation marked as ${status}`);
      fetchRecommendations();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>AI Health Insights - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powered by PayPill AI</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight mb-4">Personalized Health Insights</h1>
          <p className="text-lg text-muted-foreground">
            Chat with our AI assistant to get personalized recommendations based on your health profile, medications, and goals.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-[600px] rounded-2xl overflow-hidden border shadow-lg bg-card">
            <IntegratedAiChat />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-2xl font-bold font-display mb-4">Saved Recommendations</h2>
            
            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
              {loading ? (
                [1, 2].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl"></div>)
              ) : recommendations.length > 0 ? (
                recommendations.map(rec => (
                  <Card key={rec.id} className="shadow-sm border-border/50 rounded-2xl">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-warning" />
                          <span className="capitalize">{rec.recommendation_type.replace('_', ' ')}</span>
                        </CardTitle>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                          {rec.priority} priority
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground mb-4 leading-relaxed">{rec.content}</p>
                      {rec.status !== 'completed' && rec.status !== 'archived' && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 flex-1 rounded-xl"
                            onClick={() => updateStatus(rec.id, 'completed')}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Complete
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-2 text-muted-foreground rounded-xl"
                            onClick={() => updateStatus(rec.id, 'archived')}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center p-8 border rounded-2xl border-dashed text-muted-foreground bg-muted/10">
                  <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Ask the AI for recommendations to see them saved here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}