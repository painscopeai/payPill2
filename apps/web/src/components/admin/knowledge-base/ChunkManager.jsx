
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, SplitSquareHorizontal, Merge, Trash2, Check, X, Expand } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';

export function ChunkManager({ document, onUpdate }) {
  const [editingChunk, setEditingChunk] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [selectedChunks, setSelectedChunks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const chunks = Array.isArray(document.chunks_json) ? document.chunks_json : [];

  const handleAction = async (action, chunk_ids, new_content = null) => {
    setIsProcessing(true);
    try {
      const response = await apiServerClient.fetch(`/knowledge-base/${document.id}/chunks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, chunk_ids, new_content })
      });
      
      if (!response.ok) throw new Error('Action failed');
      
      toast.success(`Successfully applied ${action} action`);
      setEditingChunk(null);
      setSelectedChunks([]);
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || `Failed to ${action} chunk(s)`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startEdit = (index, content) => {
    setEditingChunk(index);
    setEditContent(content);
  };

  const toggleSelect = (index) => {
    if (selectedChunks.includes(index)) {
      setSelectedChunks(selectedChunks.filter(i => i !== index));
    } else {
      setSelectedChunks([...selectedChunks, index]);
    }
  };

  if (!chunks.length) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-border rounded-xl bg-card">
        No chunks available. Try re-indexing the document.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border">
        <span className="text-sm font-medium">
          {selectedChunks.length} chunks selected
        </span>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={selectedChunks.length < 2 || isProcessing}
            onClick={() => handleAction('merge', selectedChunks.sort())}
            className="gap-1.5"
          >
            <Merge className="w-4 h-4" /> Merge
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            disabled={selectedChunks.length === 0 || isProcessing}
            onClick={() => {
              if (confirm('Delete selected chunks?')) {
                handleAction('delete', selectedChunks);
              }
            }}
            className="gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {chunks.map((chunk, index) => (
          <div key={index} className={`chunk-editor ${selectedChunks.includes(index) ? 'border-primary ring-1 ring-primary/20' : ''}`}>
            {editingChunk === index ? (
              <div className="p-3 space-y-3">
                <div className="flex justify-between items-center text-xs text-muted-foreground font-mono mb-2">
                  <span>Editing Chunk #{index + 1}</span>
                  <span>{editContent.length} chars</span>
                </div>
                <Textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[150px] font-mono text-sm leading-relaxed"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingChunk(null)} disabled={isProcessing}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleAction('edit', [index], editContent)} disabled={isProcessing}>
                    <Check className="w-4 h-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start">
                <div className="p-3 pt-4 cursor-pointer" onClick={() => toggleSelect(index)}>
                  <input 
                    type="checkbox" 
                    checked={selectedChunks.includes(index)} 
                    readOnly
                    className="w-4 h-4 text-primary rounded cursor-pointer" 
                  />
                </div>
                <div className="flex-1 p-3 pl-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Chunk #{index + 1}
                    </span>
                    <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(index, chunk)} title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction('split', [index])} title="Split in half">
                        <SplitSquareHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed line-clamp-3">{chunk}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
