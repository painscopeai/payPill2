import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useRecommendations } from '@/contexts/RecommendationContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Activity, CheckCircle2, XCircle } from 'lucide-react';
import AskAIButton from '@/components/AskAIButton';

export default function AIRecommendationsPage() {
  const { recommendations, fetchRecommendations, acceptRecommendation, declineRecommendation } =
    useRecommendations();

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const getPriorityColor = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return 'bg-destructive text-destructive-foreground';
    if (p === 'medium') return 'bg-accent text-accent-foreground';
    if (p === 'low') return 'bg-secondary text-secondary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-8">
      <Helmet><title>Health Action Plan - PayPill</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health Action Plan</h1>
          <p className="text-muted-foreground mt-2">Your personalized AI-generated health recommendations.</p>
        </div>
        <AskAIButton />
      </div>

      {recommendations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">No recommendations yet</h3>
            <p className="text-muted-foreground max-w-md mt-2 mb-6">
              Saved recommendations appear here after you generate them. If you already created some, they load in the
              background when you open this page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="flex flex-col h-full interactive-card">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {rec.recommendation_type || 'General'}
                  </Badge>
                  <Badge className={getPriorityColor(rec.priority)}>
                    {rec.priority || 'Medium'} Priority
                  </Badge>
                </div>
                <CardTitle className="text-xl leading-snug line-clamp-2">{rec.title || rec.recommendation_title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{rec.description || rec.recommendation_description}</p>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 p-2 rounded-md w-fit">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Confidence: <span className="text-foreground">{Math.round(rec.confidence_level || 85)}%</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 mt-auto flex gap-2">
                {rec.status === 'Accepted' ? (
                  <Button variant="secondary" className="w-full bg-secondary/20 text-secondary hover:bg-secondary/30" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Accepted
                  </Button>
                ) : rec.status === 'Declined' ? (
                  <Button variant="outline" className="w-full text-destructive border-destructive/20" disabled>
                    <XCircle className="h-4 w-4 mr-2" /> Declined
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10" onClick={() => declineRecommendation(rec.id, 'Not applicable')}>
                      Decline
                    </Button>
                    <Button className="flex-1" onClick={() => acceptRecommendation(rec.id)}>
                      Accept
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}