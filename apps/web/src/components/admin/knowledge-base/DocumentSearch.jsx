
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileText, ArrowRight } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export function DocumentSearch({ onSelectDocument }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 2) {
        performSearch();
      } else if (query.trim().length === 0) {
        setResults([]);
        setHasSearched(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await apiServerClient.fetch(`/knowledge-base/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          className="pl-12 h-14 text-lg bg-card border-border shadow-sm rounded-xl focus-visible:ring-primary"
          placeholder="Search knowledge base contents, titles, and descriptions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {hasSearched && !isSearching && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No matching documents found for "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Found {results.length} relevant results</p>
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div 
                key={`${result.document_id}-${idx}`} 
                className="document-card group cursor-pointer hover:border-primary/50"
                onClick={() => onSelectDocument(result.document_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold font-display group-hover:text-primary transition-colors">
                        {result.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 mb-3 text-xs text-muted-foreground">
                        <span className="uppercase">{result.content_type}</span>
                        <span>•</span>
                        <span>Score: {Math.round(result.relevance_score)}</span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
                        ...{result.matching_snippet}...
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
