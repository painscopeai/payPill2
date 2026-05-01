
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkProviderUploadPage() {
  const handleDownload = () => {
    toast.success('Template downloaded');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-display">Bulk Provider Upload</h1>
          <p className="text-muted-foreground">Import multiple providers via Excel/CSV.</p>
        </div>
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" /> Download Template
        </Button>
      </div>

      <Card className="border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center h-64">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Drag & Drop file here</h3>
          <p className="text-sm text-muted-foreground mb-4">Support for .xlsx and .csv up to 10MB</p>
          <Button variant="secondary">Browse Files</Button>
        </CardContent>
      </Card>
    </div>
  );
}
