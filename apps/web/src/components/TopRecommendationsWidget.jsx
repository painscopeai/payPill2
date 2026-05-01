import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TopRecommendationsWidget({ recommendations = [] }) {
  const navigate = useNavigate();
  const topRecs = recommendations.slice(0, 3);

  const getPriorityColor = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return 'bg-destructive text-destructive-foreground';
    if (p === 'medium') return 'bg-orange-500 text-white';
    if (p === 'low') return 'bg-emerald-500 text-white';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Top Recommendations
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/patient/ai-recommendations')}>
          View All <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {topRecs.length > 0 ? (
          topRecs.map((rec, i) => (
            <div key={i} className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg border">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm line-clamp-1">{rec.title}</h4>
                <Badge className={`text-[10px] px-1.5 py-0 h-5 ${getPriorityColor(rec.priority)}`}>
                  {rec.priority || 'Medium'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-muted-foreground mb-4">No recommendations available yet.</p>
            <Button size="sm" onClick={() => navigate('/patient/ai-recommendations')}>Generate New</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}