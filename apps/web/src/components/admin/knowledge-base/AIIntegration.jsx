
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, FileText, ChevronRight } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';

export function AIIntegration() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSimulate = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      // Simulate an AI query fetching from search endpoint
      const response = await apiServerClient.fetch(`/knowledge-base/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-accent/10 text-accent rounded-full mb-2">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-display">Test AI Context Retrieval</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Simulate how the Integrated AI fetches knowledge base documents to construct answers. Enter a typical patient or provider query below.
        </p>
      </div>

      <form onSubmit={handleSimulate} className="relative">
        <Input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., What are the guidelines for handling a missed dosage of Lisinopril?"
          className="pl-4 pr-12 h-14 text-base bg-card border-border shadow-sm rounded-xl focus-visible:ring-accent"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={isLoading || !query.trim()} 
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-card rounded-xl border border-border"></div>
          <div className="h-24 bg-card rounded-xl border border-border"></div>
        </div>
      )}

      {results !== null && !isLoading && (
        <div className="space-y-6">
          <div className="bg-muted/30 p-5 rounded-xl border border-border">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-accent" /> Simulated AI Processing
            </h3>
            <p className="text-sm text-foreground leading-relaxed">
              Based on the query "{query}", the AI system would construct a prompt including the following context chunks retrieved from your Knowledge Base:
            </p>
          </div>

          {results.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Retrieved Context Citations</h4>
              {results.slice(0, 3).map((res, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {res.title}
                    </h5>
                    <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">Score: {Math.round(res.relevance_score)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3 ml-2 mt-2">
                    "...{res.matching_snippet}..."
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-card border border-border rounded-xl text-muted-foreground">
              No relevant documents found. The AI would fallback to its base knowledge or inform the user it cannot find specific guidelines.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
