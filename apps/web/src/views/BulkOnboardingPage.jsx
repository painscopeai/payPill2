import React, { useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, XCircle, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkOnboardingPage() {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Review, 3: Results
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, validating, success, error
  const [progress, setProgress] = useState(0);

  const mockPreviewData = [
    { name: 'Maya Chen', email: 'maya.c@company.com', dept: 'Engineering', status: 'valid' },
    { name: 'Raj Patel', email: 'raj.p@company', dept: 'Sales', status: 'invalid_email' },
    { name: 'Lucia Torres', email: 'lucia.t@company.com', dept: 'Marketing', status: 'valid' },
  ];

  const processCsvFile = (csvFile) => {
    if (!csvFile) return;
    if (csvFile.type === 'text/csv' || csvFile.name.toLowerCase().endsWith('.csv')) {
      setFile(csvFile);
      simulateValidation();
      return;
    }
    toast.error('Please upload a valid CSV file.');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processCsvFile(e.dataTransfer.files[0]);
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    processCsvFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const header = [
      'first_name',
      'last_name',
      'email',
      'department',
      'hire_date',
      'status',
      'health_score',
    ];
    const sampleRows = [
      ['Maya', 'Chen', 'maya.c@company.com', 'Engineering', '2023-01-15', 'active', '85'],
      ['Marcus', 'Johnson', 'mjohnson@company.com', 'Sales', '2022-11-01', 'active', '72'],
    ];
    const csv = [header, ...sampleRows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-roster-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const simulateValidation = () => {
    setStatus('validating');
    setTimeout(() => {
      setStatus('success');
      setStep(2);
      toast.success('File validated successfully. Found 142 records.');
    }, 1500);
  };

  const handleImport = () => {
    setStep(3);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        toast.success('Import completed!');
      }
    }, 300);
  };

  const resetFlow = () => {
    setStep(1);
    setFile(null);
    setStatus('idle');
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Bulk Onboarding - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Bulk Onboarding</h1>
          <p className="text-muted-foreground mt-1">Upload and manage employee enrollment batches.</p>
        </div>

        <div className="flex items-center gap-4 mb-8 text-sm font-medium text-muted-foreground">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : ''}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</span>
            Upload
          </div>
          <div className="h-px w-8 bg-border"></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : ''}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
            Review
          </div>
          <div className="h-px w-8 bg-border"></div>
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : ''}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</span>
            Import
          </div>
        </div>

        {step === 1 && (
          <Card className="border-border/60 rounded-2xl shadow-sm mb-8">
            <CardHeader>
              <CardTitle>Upload Roster</CardTitle>
              <CardDescription>Download our template to ensure your data is formatted correctly.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="h-4 w-4" /> Download Template
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />

              <div 
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/10'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {status === 'idle' && (
                  <>
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <UploadCloud className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Drag & drop your CSV here</h3>
                    <p className="text-sm text-muted-foreground mb-6">or click to browse from your computer</p>
                    <Button className="rounded-xl" type="button" onClick={handleSelectFile}>
                      Select File
                    </Button>
                  </>
                )}
                {status === 'validating' && (
                  <div className="py-8">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="font-medium">Validating records...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border/60 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle>Review Data</CardTitle>
              <CardDescription>We found 142 total records. Please review the warnings before importing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-xl border">
                  <p className="text-sm text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold">142</p>
                </div>
                <div className="bg-success/10 p-4 rounded-xl border border-success/20">
                  <p className="text-sm text-success">Valid Records</p>
                  <p className="text-2xl font-bold text-success">141</p>
                </div>
                <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20">
                  <p className="text-sm text-destructive">Issues Found</p>
                  <p className="text-2xl font-bold text-destructive">1</p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPreviewData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.dept}</TableCell>
                        <TableCell>
                          {row.status === 'valid' ? (
                            <Badge variant="secondary" className="bg-success/10 text-success border-none"><CheckCircle2 className="h-3 w-3 mr-1"/> Valid</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-destructive/10 text-destructive border-none"><AlertCircle className="h-3 w-3 mr-1"/> Invalid Email</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={resetFlow}>Cancel</Button>
                <div className="space-x-3">
                  <Button variant="outline" className="rounded-xl">Fix Issues</Button>
                  <Button className="rounded-xl gap-2" onClick={handleImport}>Proceed with Import <ArrowRight className="h-4 w-4"/></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-border/60 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
              <CardDescription>Processing your batch upload...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>{progress < 100 ? 'Importing records...' : 'Import complete'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {progress === 100 && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex items-center gap-4 bg-success/5 p-4 rounded-xl border border-success/20">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                    <div>
                      <h4 className="font-semibold text-success">Successfully Imported</h4>
                      <p className="text-sm text-muted-foreground">141 employees have been added and invited.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-destructive/5 p-4 rounded-xl border border-destructive/20">
                    <XCircle className="h-8 w-8 text-destructive" />
                    <div>
                      <h4 className="font-semibold text-destructive">Failed Records</h4>
                      <p className="text-sm text-muted-foreground">1 record could not be processed due to formatting errors.</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" className="rounded-xl">Download Report</Button>
                    <Button className="rounded-xl gap-2" onClick={resetFlow}><RefreshCcw className="h-4 w-4"/> Start New Import</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}