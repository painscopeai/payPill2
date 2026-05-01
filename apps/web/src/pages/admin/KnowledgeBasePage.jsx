
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UploadCloud, FileText, Search, BarChart3, Bot, FileCheck, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner';

// Import subcomponents
import { DocumentSearch } from '@/components/admin/knowledge-base/DocumentSearch';
import { DocumentAnalytics } from '@/components/admin/knowledge-base/DocumentAnalytics';
import { AIIntegration } from '@/components/admin/knowledge-base/AIIntegration';
import { DocumentPreview } from '@/components/admin/knowledge-base/DocumentPreview';
import { DocumentIndexing } from '@/components/admin/knowledge-base/DocumentIndexing';
import { ChunkManager } from '@/components/admin/knowledge-base/ChunkManager';
import { DocumentVersioning } from '@/components/admin/knowledge-base/DocumentVersioning';
import { DocumentPermissions } from '@/components/admin/knowledge-base/DocumentPermissions';

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [documentDetails, setDocumentDetails] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await apiServerClient.fetch('/knowledge-base?limit=50');
      const data = await response.json();
      setDocuments(data.items || []);
    } catch (err) {
      toast.error('Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchDocuments();
    }
  }, [activeTab]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    let successCount = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('category', 'general');

      try {
        const response = await apiServerClient.fetch('/knowledge-base/upload', {
          method: 'POST',
          body: formData
        });
        if (response.ok) successCount++;
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} document(s)`);
      if (activeTab === 'list') fetchDocuments();
      else setActiveTab('list');
    }
    
    // Reset file input
    e.target.value = '';
  };

  const handleOpenDocument = async (docId) => {
    setSelectedDocId(docId);
    setIsSheetOpen(true);
    try {
      const response = await apiServerClient.fetch(`/knowledge-base/${docId}`);
      const doc = await response.json();
      setDocumentDetails(doc);
    } catch (err) {
      toast.error('Failed to load document details');
      setIsSheetOpen(false);
    }
  };

  const handleDeleteDocument = async (docId, title) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await apiServerClient.fetch(`/knowledge-base/${docId}`, { method: 'DELETE' });
      toast.success('Document deleted');
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  // Callback to refresh doc details when subcomponents make updates
  const refreshDocumentDetails = async () => {
    if (!selectedDocId) return;
    try {
      const response = await apiServerClient.fetch(`/knowledge-base/${selectedDocId}`);
      const doc = await response.json();
      setDocumentDetails(doc);
    } catch (err) {
      console.error('Failed to refresh details');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">AI Knowledge Base</h1>
          <p className="text-muted-foreground">Manage documents and context data for the Integrated AI.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 border border-border mb-6">
          <TabsTrigger value="list" className="gap-2"><FileText className="w-4 h-4"/> Documents</TabsTrigger>
          <TabsTrigger value="search" className="gap-2"><Search className="w-4 h-4"/> Global Search</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4"/> Analytics</TabsTrigger>
          <TabsTrigger value="ai" className="gap-2"><Bot className="w-4 h-4"/> AI Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="m-0 space-y-6 animate-in fade-in duration-300">
          {/* Upload Zone */}
          <div className="file-upload-zone relative overflow-hidden">
            <input 
              type="file" 
              multiple 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            />
            {isUploading ? (
              <div className="flex flex-col items-center text-primary">
                <LoadingSpinner size="lg" />
                <p className="mt-4 font-medium">Uploading and Indexing...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-background rounded-full shadow-sm flex items-center justify-center mb-4 text-primary border border-border">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">Upload Documents</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Drag and drop or click to browse. Supported formats: PDF, Word, Excel, CSV, Text. Max 50MB per file.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="bg-background px-2 py-1 rounded-md border border-border">Auto-indexing enabled</span>
                </div>
              </>
            )}
          </div>

          {/* Document List */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-0 border-b border-border/50">
              <CardTitle className="text-lg">Indexed Documents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 flex justify-center"><LoadingSpinner size="md" /></div>
              ) : documents.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No documents uploaded yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {doc.indexed ? (
                            <FileCheck className="w-5 h-5 text-success" />
                          ) : (
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <button 
                            className="font-semibold text-foreground hover:text-primary transition-colors text-left"
                            onClick={() => handleOpenDocument(doc.id)}
                          >
                            {doc.title}
                          </button>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="uppercase">{doc.content_type}</span>
                            <span>•</span>
                            <span>{format(new Date(doc.created), 'MMM d, yyyy')}</span>
                            <span>•</span>
                            <span>{doc.chunk_count || 0} chunks</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDocument(doc.id)}>
                          <Edit className="w-4 h-4 mr-2" /> Manage
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDocument(doc.id, doc.title)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="m-0">
          <DocumentSearch onSelectDocument={handleOpenDocument} />
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <DocumentAnalytics />
        </TabsContent>

        <TabsContent value="ai" className="m-0">
          <AIIntegration />
        </TabsContent>
      </Tabs>

      {/* Document Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-3xl overflow-y-auto p-0 border-l-0 sm:border-l sm:border-border">
          {documentDetails ? (
            <div className="flex flex-col h-full bg-background">
              <SheetHeader className="p-6 border-b border-border bg-card shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl font-bold font-display">{documentDetails.title}</SheetTitle>
                    <p className="text-sm text-muted-foreground mt-1">ID: {documentDetails.id}</p>
                  </div>
                </div>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="w-full bg-card border border-border mb-6">
                    <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
                    <TabsTrigger value="chunks" className="flex-1">Chunks</TabsTrigger>
                    <TabsTrigger value="versions" className="flex-1">Versions</TabsTrigger>
                    <TabsTrigger value="indexing" className="flex-1">Indexing</TabsTrigger>
                    <TabsTrigger value="permissions" className="flex-1">Access</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="preview" className="m-0">
                    <DocumentPreview document={documentDetails} />
                  </TabsContent>
                  
                  <TabsContent value="chunks" className="m-0">
                    <ChunkManager document={documentDetails} onUpdate={refreshDocumentDetails} />
                  </TabsContent>
                  
                  <TabsContent value="versions" className="m-0">
                    <DocumentVersioning document={documentDetails} onUpdate={refreshDocumentDetails} />
                  </TabsContent>
                  
                  <TabsContent value="indexing" className="m-0">
                    <DocumentIndexing document={documentDetails} onUpdate={refreshDocumentDetails} />
                  </TabsContent>

                  <TabsContent value="permissions" className="m-0">
                    <DocumentPermissions document={documentDetails} onUpdate={refreshDocumentDetails} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-background">
              <LoadingSpinner size="lg" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
