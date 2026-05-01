
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';

export function DocumentIndexing({ document, onUpdate }) {
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleReindex = async () => {
    if (!confirm('Are you sure you want to re-index this document? This will reconstruct all chunks.')) return;
    
    setIsIndexing(true);
    setProgress(10);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 90));
      }, 500);

      const response = await apiServerClient.fetch(`/knowledge-base/${document.id}/reindex`, {
        method: 'POST'
      });
      const result = await response.json();
      
      clearInterval(progressInterval);
      setProgress(100);
      toast.success(result.message || 'Document re-indexed successfully');
      
      if (onUpdate) {
        // Wait a moment so user sees 100%
        setTimeout(() => {
          onUpdate();
          setIsIndexing(false);
          setProgress(0);
        }, 1000);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to re-index document');
      setIsIndexing(false);
      setProgress(0);
    }
  };

  const getStatusDisplay = () => {
    if (isIndexing) return { icon: RefreshCw, color: 'text-primary', text: 'Indexing in progress', bg: 'bg-primary/10' };
    if (!document.indexed) return { icon: Clock, color: 'text-warning', text: 'Pending Indexing', bg: 'bg-warning/10' };
    if (document.chunk_count === 0) return { icon: AlertCircle, color: 'text-destructive', text: 'Indexing Failed or Empty', bg: 'bg-destructive/10' };
    return { icon: CheckCircle2, color: 'text-success', text: 'Successfully Indexed', bg: 'bg-success/10' };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-display">AI Indexing Status</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleReindex} 
          disabled={isIndexing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isIndexing ? 'animate-spin' : ''}`} />
          {isIndexing ? 'Indexing...' : 'Manual Re-index'}
        </Button>
      </div>

      <div className={`p-4 rounded-xl border border-border flex items-start gap-4 ${status.bg}`}>
        <div className={`p-2 rounded-full bg-background shadow-sm ${status.color}`}>
          <StatusIcon className={`w-6 h-6 ${isIndexing ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground">{status.text}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {document.indexed 
              ? `Last indexed on ${document.last_indexed_date ? format(new Date(document.last_indexed_date), 'MMM d, yyyy HH:mm') : 'Unknown'}.`
              : 'Document text needs to be processed into chunks for AI retrieval.'}
          </p>
          
          {isIndexing && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Processing content...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col justify-center">
          <span className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            <Database className="w-4 h-4" /> Total Chunks
          </span>
          <span className="text-2xl font-bold font-mono">{document.chunk_count || 0}</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col justify-center">
          <span className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            <Database className="w-4 h-4" /> Est. Tokens
          </span>
          <span className="text-2xl font-bold font-mono">
            {((document.chunk_count || 0) * 250).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
