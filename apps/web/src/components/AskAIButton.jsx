import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { useRecommendations } from '@/contexts/RecommendationContext';

export default function AskAIButton() {
  const { generateRecommendations, recommendations, isLoading } = useRecommendations();
  const [open, setOpen] = useState(false);
  const [focusArea, setFocusArea] = useState('general');

  const handleGenerate = async () => {
    try {
      await generateRecommendations(focusArea);
      setOpen(false);
    } catch (error) {
      // Error handled in context
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
              <Sparkles className="h-5 w-5 text-primary" /> Generate Recommendations
            </DialogTitle>
            <DialogDescription>
              Our AI will analyze your health profile to provide personalized, evidence-based recommendations.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Focus Area</label>
              <Select value={focusArea} onValueChange={setFocusArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select focus area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Analyze Current Health Status</SelectItem>
                  <SelectItem value="medications">Review Medication Interactions</SelectItem>
                  <SelectItem value="lifestyle">Lifestyle Optimization</SelectItem>
                  <SelectItem value="preventive">Preventive Care Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : 'Generate Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}