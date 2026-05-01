import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Share2, Archive, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function RecommendationDetailModal({ open, onOpenChange, recommendation }) {
  if (!recommendation) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const getPriorityColor = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return 'bg-destructive text-destructive-foreground';
    if (p === 'medium') return 'bg-orange-500 text-white';
    if (p === 'low') return 'bg-emerald-500 text-white';
    return 'bg-secondary text-secondary-foreground';
  };

  const confidenceScore = recommendation.confidence_level || recommendation.confidenceScore || 85;
  const scoreValue = confidenceScore <= 1 ? confidenceScore * 100 : confidenceScore;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex justify-between items-start">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {recommendation.recommendation_type || recommendation.category || 'General'}
            </Badge>
            <Badge className={getPriorityColor(recommendation.priority || recommendation.estimated_impact)}>
              {recommendation.priority || recommendation.estimated_impact || 'Medium'} Priority
            </Badge>
          </div>
          <DialogTitle className="text-2xl leading-tight">{recommendation.title}</DialogTitle>
          <DialogDescription className="text-base text-foreground">
            {recommendation.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">AI Confidence Score</span>
              <span className="font-bold">{Math.round(scoreValue)}%</span>
            </div>
            <Progress value={scoreValue} className="h-2" />
          </div>

          {(recommendation.reasoning || recommendation.clinical_basis) && (
            <div>
              <h4 className="font-semibold mb-2">Clinical Reasoning</h4>
              <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border">
                {recommendation.reasoning || recommendation.clinical_basis}
              </p>
            </div>
          )}

          {((recommendation.action_steps && recommendation.action_steps.length > 0) || (recommendation.suggestedActions && recommendation.suggestedActions.length > 0)) && (
            <div>
              <h4 className="font-semibold mb-3">Suggested Actions</h4>
              <ul className="space-y-3">
                {(recommendation.action_steps || recommendation.suggestedActions).map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-sm items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {((recommendation.resources && recommendation.resources.length > 0) || (recommendation.sources && recommendation.sources.length > 0)) && (
            <div>
              <h4 className="font-semibold mb-2">Research & Sources</h4>
              <div className="flex flex-col gap-2">
                {(recommendation.resources || recommendation.sources).map((res, idx) => {
                  const isString = typeof res === 'string';
                  const url = isString ? res : res.url;
                  const title = isString ? res : (res.title || res.url);
                  return (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                      <ExternalLink className="h-3 w-3" /> {title}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t flex flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShare} size="sm">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
            <Button variant="outline" size="sm">
              <Archive className="h-4 w-4 mr-2" /> Archive
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={() => onOpenChange(false)}>Mark as Read</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}