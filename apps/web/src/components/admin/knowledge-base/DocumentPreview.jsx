
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, Info } from 'lucide-react';
import { format } from 'date-fns';

export function DocumentPreview({ document }) {
  const chunks = Array.isArray(document.chunks_json) ? document.chunks_json : [];
  const previewText = chunks.slice(0, 3).join('\n\n').substring(0, 1500);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-muted/20 p-5 rounded-xl border border-border">
        <div className="space-y-1 flex-1">
          <h2 className="text-2xl font-bold font-display">{document.title}</h2>
          <p className="text-muted-foreground text-sm">{document.description || 'No description provided.'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!document.file_url}>
            <Download className="w-4 h-4" /> Download Original
          </Button>
          <Button variant="outline" size="icon" title="Open external">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">File Type</p>
          <p className="font-medium uppercase">{document.content_type || 'Unknown'}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Category</p>
          <p className="font-medium capitalize">{document.category || 'General'}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Uploaded By</p>
          <p className="font-medium truncate">{document.uploaded_by || 'Admin'}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Upload Date</p>
          <p className="font-medium">{document.created ? format(new Date(document.created), 'MMM d, yyyy') : 'Unknown'}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Content Preview
        </h3>
        {chunks.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-5 shadow-inner">
            <div className="font-mono text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed overflow-hidden relative max-h-[500px]">
              {previewText}
              {previewText.length === 1500 && '...'}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent pointer-events-none"></div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                Showing preview of first extracted chunks
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 border border-border border-dashed rounded-xl p-10 text-center flex flex-col items-center">
            <Info className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="font-medium">No extracted text available</p>
            <p className="text-sm text-muted-foreground mt-1">This document has not been indexed or text extraction failed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
