
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, History, FileText, ArrowRightLeft, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import { isAdminKbPdfFile } from '@/lib/isAdminKbPdfUpload';

export function DocumentVersioning({ document, onUpdate }) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const versions = Array.isArray(document.version_history_json) 
    ? document.version_history_json 
    : [{ version: document.version || 1, date: document.created, size: 'Unknown' }];

  // Sort descending by version
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  const handleUploadNewVersion = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAdminKbPdfFile(file)) {
      toast.error('Only PDF files are allowed');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiServerClient.fetch(`/knowledge-base/${document.id}/versions`, {
        method: 'POST',
        body: formData // Fetch handles multipart/form-data implicitly when passing FormData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      toast.success('New version uploaded and indexed successfully');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to upload new version');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border">
        <div>
          <h3 className="font-medium">Current Version: v{document.version || 1}</h3>
          <p className="text-sm text-muted-foreground">Keep your documents up to date for accurate AI responses.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleUploadNewVersion}
            accept=".pdf,application/pdf"
          />
          <Button 
            className="gap-2" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
            {isUploading ? 'Uploading...' : 'Upload New Version'}
          </Button>
        </div>
      </div>

      <div className="pl-2">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <History className="w-4 h-4" /> Version History
        </h4>
        
        <div className="version-timeline">
          {sortedVersions.map((v, i) => (
            <div key={v.version} className="relative pl-6">
              <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-background ${i === 0 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
              
              <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Version {v.version}</span>
                    {i === 0 && <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(v.date), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {v.size || 'Unknown size'}</span>
                  <span>•</span>
                  <span>{v.chunk_count || document.chunk_count || 0} chunks</span>
                </div>

                {i !== 0 && (
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Compare with Current
                    </Button>
                    <Button variant="secondary" size="sm" className="h-8 text-xs ml-auto">
                      Restore this version
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
