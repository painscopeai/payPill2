import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sparkles, Loader2 } from 'lucide-react';
import { useRecommendations } from '@/contexts/RecommendationContext';

export default function AskAIButton() {
  const { generateRecommendations, recommendations, isGenerating } = useRecommendations();
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    try {
      await generateRecommendations();
      setOpen(false);
    } catch {
      /* toast in context */
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <Button
          size="lg"
          className="w-full sm:w-auto text-lg h-14 px-8 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-5 w-5 mr-2" /> Ask AI for Recommendation
        </Button>
        <p className="text-xs text-muted-foreground">
          {recommendations.length} recommendations in your plan
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Generate recommendations
            </DialogTitle>
            <DialogDescription>
              We send your latest saved onboarding answers and health records (same source as Basic profile → View profile
              &amp; records) to the AI workflow—without account or identity fields. Make sure your profile is up to date,
              then generate.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                </>
              ) : (
                'Generate now'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
