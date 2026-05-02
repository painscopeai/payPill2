import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, Plus, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

/** UI tab value → DB record_type */
const TAB_TO_TYPE = {
  conditions: 'condition',
  labs: 'lab_result',
  allergies: 'allergy',
  surgeries: 'surgery',
};

const TYPE_LABELS = {
  condition: 'Condition',
  lab_result: 'Lab result',
  allergy: 'Allergy',
  surgery: 'Surgery',
};

function formatDisplayDate(value) {
  if (!value) return '—';
  try {
    const d = new Date(`${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function matchesSearch(record, q) {
  if (!q.trim()) return true;
  const needle = q.toLowerCase();
  const hay = [record.title, record.status, record.provider_or_facility, record.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

function labResultBadgeClass(status) {
  if (!status) return 'bg-muted text-muted-foreground border-border';
  const s = status.toLowerCase();
  if (/\bnormal\b|\bnegative\b|\bgood\b/.test(s)) {
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  }
  if (/\breview|abnormal|elevated|positive|high|low\b/.test(s)) {
    return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
  }
  return 'bg-muted text-foreground border-border';
}

/** ISO or date string → YYYY-MM-DD for date inputs */
function normalizeDateForInput(value) {
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {
    /* ignore */
  }
  return '';
}

function getFieldHints(recordType) {
  switch (recordType) {
    case 'condition':
      return {
        title: 'Condition name',
        date: 'Date diagnosed',
        status: 'Status (e.g. Active, Resolved)',
        provider: 'Managing doctor',
      };
    case 'lab_result':
      return {
        title: 'Test name',
        date: 'Test date',
        status: 'Result summary (e.g. Normal, Review needed)',
        provider: 'Laboratory / facility',
      };
    case 'allergy':
      return {
        title: 'Allergen',
        date: 'Onset date (if known)',
        status: 'Severity (e.g. Mild, Severe)',
        provider: 'Prescriber or clinic (optional)',
      };
    case 'surgery':
      return {
        title: 'Procedure',
        date: 'Procedure date',
        status: 'Status (e.g. Completed, Recovering)',
        provider: 'Surgeon / hospital',
      };
    default:
      return {
        title: 'Title',
        date: 'Date',
        status: 'Status',
        provider: 'Provider / facility',
      };
  }
}

export default function PatientHealthRecordsPage() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('conditions');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailEditing, setDetailEditing] = useState(false);

  const [form, setForm] = useState({
    record_type: 'condition',
    title: '',
    record_date: '',
    status: '',
    provider_or_facility: '',
    notes: '',
  });

  const [editForm, setEditForm] = useState({
    record_type: 'condition',
    title: '',
    record_date: '',
    status: '',
    provider_or_facility: '',
    notes: '',
  });

  const fetchRecords = useCallback(async () => {
    if (!currentUser?.id) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_health_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('[PatientHealthRecordsPage]', err);
      toast.error(err.message || 'Could not load health records.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (addOpen) {
      setForm((prev) => ({
        ...prev,
        record_type: TAB_TO_TYPE[activeTab] || 'condition',
        title: '',
        record_date: '',
        status: '',
        provider_or_facility: '',
        notes: '',
      }));
    }
  }, [addOpen, activeTab]);

  const conditionRows = useMemo(
    () =>
      records
        .filter((r) => r.record_type === 'condition')
        .filter((r) => matchesSearch(r, searchTerm)),
    [records, searchTerm],
  );
  const labRows = useMemo(
    () =>
      records.filter((r) => r.record_type === 'lab_result').filter((r) => matchesSearch(r, searchTerm)),
    [records, searchTerm],
  );
  const allergyRows = useMemo(
    () =>
      records.filter((r) => r.record_type === 'allergy').filter((r) => matchesSearch(r, searchTerm)),
    [records, searchTerm],
  );
  const surgeryRows = useMemo(
    () =>
      records.filter((r) => r.record_type === 'surgery').filter((r) => matchesSearch(r, searchTerm)),
    [records, searchTerm],
  );

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const openDetail = (record) => {
    setDetailEditing(false);
    setDetailRecord(record);
  };

  const closeDetail = () => {
    setDetailRecord(null);
    setDetailEditing(false);
  };

  const startEditingDetail = () => {
    if (!detailRecord) return;
    setEditForm({
      record_type: detailRecord.record_type,
      title: detailRecord.title ?? '',
      record_date: normalizeDateForInput(detailRecord.record_date),
      status: detailRecord.status ?? '',
      provider_or_facility: detailRecord.provider_or_facility ?? '',
      notes: detailRecord.notes ?? '',
    });
    setDetailEditing(true);
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!currentUser?.id || !detailRecord?.id) return;
    if (!editForm.title?.trim()) {
      toast.error('Please enter a title or name.');
      return;
    }
    if (!editForm.record_date) {
      toast.error('Please select a date.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('patient_health_records')
        .update({
          record_type: editForm.record_type,
          title: editForm.title.trim(),
          record_date: editForm.record_date,
          status: editForm.status?.trim() || null,
          provider_or_facility: editForm.provider_or_facility?.trim() || null,
          notes: editForm.notes?.trim() || null,
        })
        .eq('id', detailRecord.id)
        .eq('user_id', currentUser.id)
        .select('*')
        .single();
      if (error) throw error;
      toast.success('Record updated.');
      setDetailEditing(false);
      if (data) setDetailRecord(data);
      await fetchRecords();
    } catch (err) {
      console.error('[PatientHealthRecordsPage] update', err);
      toast.error(err.message || 'Could not update record.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) {
      toast.error('You must be signed in.');
      return;
    }
    if (!form.title?.trim()) {
      toast.error('Please enter a title or name.');
      return;
    }
    if (!form.record_date) {
      toast.error('Please select a date.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('patient_health_records').insert({
        user_id: currentUser.id,
        record_type: form.record_type,
        title: form.title.trim(),
        record_date: form.record_date,
        status: form.status?.trim() || null,
        provider_or_facility: form.provider_or_facility?.trim() || null,
        notes: form.notes?.trim() || null,
      });
      if (error) throw error;
      toast.success('Record saved.');
      setAddOpen(false);
      await fetchRecords();
    } catch (err) {
      console.error('[PatientHealthRecordsPage] insert', err);
      toast.error(err.message || 'Could not save record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!record?.id || !currentUser?.id) return;
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('patient_health_records')
        .delete()
        .eq('id', record.id)
        .eq('user_id', currentUser.id);
      if (error) throw error;
      toast.success('Record removed.');
      closeDetail();
      await fetchRecords();
    } catch (err) {
      console.error('[PatientHealthRecordsPage] delete', err);
      toast.error(err.message || 'Could not delete record.');
    }
  };

  const downloadAllCsv = () => {
    if (!records.length) {
      toast.message('No records to export yet.');
      return;
    }
    const headers = ['record_type', 'title', 'record_date', 'status', 'provider_or_facility', 'notes'];
    const escape = (v) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(','),
      ...records.map((row) => headers.map((h) => escape(row[h])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `paypill-health-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Download started.');
  };

  const shareSummary = async () => {
    const text = `PayPill — ${records.length} health record${records.length === 1 ? '' : 's'} on file.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'PayPill Health Records', text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Summary copied to clipboard.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error('Sharing is not available on this device.');
      }
    }
  };

  const fieldHints = useMemo(() => getFieldHints(form.record_type), [form.record_type]);
  const editFieldHints = useMemo(() => getFieldHints(editForm.record_type), [editForm.record_type]);

  return (
    <>
      <Helmet>
        <title>Health Records - PayPill</title>
      </Helmet>

      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Health Records</h1>
            <p className="text-muted-foreground">
              Manage your medical history, lab results, and immunizations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="gap-2" onClick={() => void shareSummary()}>
              <Share2 className="h-4 w-4" /> Share Records
            </Button>
            <Button type="button" className="gap-2" onClick={downloadAllCsv}>
              <Download className="h-4 w-4" /> Download All
            </Button>
          </div>
        </div>

        <Card className="shadow-sm border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-muted/20">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search records"
              />
            </div>
            <Button type="button" className="gap-2 w-full sm:w-auto shrink-0" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-4 border-b overflow-x-auto">
              <TabsList className="bg-transparent h-auto p-0 flex justify-start gap-6">
                {[
                  ['conditions', 'Conditions'],
                  ['labs', 'Lab Results'],
                  ['allergies', 'Allergies'],
                  ['surgeries', 'Surgeries'],
                ].map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {loading ? (
              <LoadingSpinner className="min-h-[200px]" />
            ) : (
              <>
                <TabsContent value="conditions" className="p-0 m-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b">
                        <tr>
                          <th className="px-6 py-4 font-medium">Condition</th>
                          <th className="px-6 py-4 font-medium">Date diagnosed</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                          <th className="px-6 py-4 font-medium">Managing doctor</th>
                          <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {conditionRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                              No conditions yet. Add a record to get started.
                            </td>
                          </tr>
                        ) : (
                          conditionRows.map((c) => (
                            <tr key={c.id} className="hover:bg-muted/5 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{c.title}</td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {formatDisplayDate(c.record_date)}
                              </td>
                              <td className="px-6 py-4">
                                {c.status ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                  >
                                    {c.status}
                                  </Badge>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {c.provider_or_facility || '—'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="sm" onClick={() => openDetail(c)}>
                                  Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="labs" className="p-0 m-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b">
                        <tr>
                          <th className="px-6 py-4 font-medium">Test name</th>
                          <th className="px-6 py-4 font-medium">Date</th>
                          <th className="px-6 py-4 font-medium">Result</th>
                          <th className="px-6 py-4 font-medium">Laboratory</th>
                          <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {labRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                              No lab results yet.
                            </td>
                          </tr>
                        ) : (
                          labRows.map((l) => (
                            <tr key={l.id} className="hover:bg-muted/5 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{l.title}</td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {formatDisplayDate(l.record_date)}
                              </td>
                              <td className="px-6 py-4">
                                {l.status ? (
                                  <Badge variant="outline" className={labResultBadgeClass(l.status)}>
                                    {l.status}
                                  </Badge>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {l.provider_or_facility || '—'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="sm" onClick={() => openDetail(l)}>
                                  Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="allergies" className="p-0 m-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b">
                        <tr>
                          <th className="px-6 py-4 font-medium">Allergen</th>
                          <th className="px-6 py-4 font-medium">Onset</th>
                          <th className="px-6 py-4 font-medium">Severity</th>
                          <th className="px-6 py-4 font-medium">Notes</th>
                          <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {allergyRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                              No allergies recorded yet.
                            </td>
                          </tr>
                        ) : (
                          allergyRows.map((a) => (
                            <tr key={a.id} className="hover:bg-muted/5 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{a.title}</td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {formatDisplayDate(a.record_date)}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{a.status || '—'}</td>
                              <td
                                className="px-6 py-4 text-muted-foreground max-w-[200px] truncate"
                                title={a.notes || ''}
                              >
                                {a.notes || '—'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="sm" onClick={() => openDetail(a)}>
                                  Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="surgeries" className="p-0 m-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b">
                        <tr>
                          <th className="px-6 py-4 font-medium">Procedure</th>
                          <th className="px-6 py-4 font-medium">Date</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                          <th className="px-6 py-4 font-medium">Surgeon / facility</th>
                          <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {surgeryRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                              No surgeries recorded yet.
                            </td>
                          </tr>
                        ) : (
                          surgeryRows.map((s) => (
                            <tr key={s.id} className="hover:bg-muted/5 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{s.title}</td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {formatDisplayDate(s.record_date)}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{s.status || '—'}</td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {s.provider_or_facility || '—'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="sm" onClick={() => openDetail(s)}>
                                  Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleAddRecord}>
            <DialogHeader>
              <DialogTitle>Add new health record</DialogTitle>
              <DialogDescription>
                Information you save here is stored in your account. It does not replace official medical
                records from your providers.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="record_type">Record type</Label>
                <Select
                  value={form.record_type}
                  onValueChange={(v) => handleFormChange('record_type', v)}
                >
                  <SelectTrigger id="record_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">{fieldHints.title}</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="record_date">{fieldHints.date}</Label>
                <Input
                  id="record_date"
                  type="date"
                  value={form.record_date}
                  onChange={(e) => handleFormChange('record_date', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">{fieldHints.status}</Label>
                <Input
                  id="status"
                  value={form.status}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="provider_or_facility">{fieldHints.provider}</Label>
                <Input
                  id="provider_or_facility"
                  value={form.provider_or_facility}
                  onChange={(e) => handleFormChange('provider_or_facility', e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Additional notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Optional details"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(detailRecord)}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailEditing ? 'Edit health record' : detailRecord?.title}
            </DialogTitle>
            <DialogDescription>
              {detailRecord
                ? TYPE_LABELS[detailRecord.record_type] || detailRecord.record_type
                : ''}
            </DialogDescription>
          </DialogHeader>

          {detailRecord && detailEditing ? (
            <form onSubmit={handleUpdateRecord} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_record_type">Record type</Label>
                <Select
                  value={editForm.record_type}
                  onValueChange={(v) => handleEditFormChange('record_type', v)}
                >
                  <SelectTrigger id="edit_record_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_title">{editFieldHints.title}</Label>
                <Input
                  id="edit_title"
                  value={editForm.title}
                  onChange={(e) => handleEditFormChange('title', e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_record_date">{editFieldHints.date}</Label>
                <Input
                  id="edit_record_date"
                  type="date"
                  value={editForm.record_date}
                  onChange={(e) => handleEditFormChange('record_date', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_status">{editFieldHints.status}</Label>
                <Input
                  id="edit_status"
                  value={editForm.status}
                  onChange={(e) => handleEditFormChange('status', e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_provider_or_facility">{editFieldHints.provider}</Label>
                <Input
                  id="edit_provider_or_facility"
                  value={editForm.provider_or_facility}
                  onChange={(e) => handleEditFormChange('provider_or_facility', e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_notes">Additional notes</Label>
                <Textarea
                  id="edit_notes"
                  value={editForm.notes}
                  onChange={(e) => handleEditFormChange('notes', e.target.value)}
                  placeholder="Optional details"
                  rows={3}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetailEditing(false)}
                  disabled={saving}
                >
                  Cancel edit
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          ) : detailRecord ? (
            <>
              <div className="grid gap-3 text-sm py-2">
                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-right">
                    {formatDisplayDate(detailRecord.record_date)}
                  </span>
                </div>
                {detailRecord.status ? (
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">Status / result</span>
                    <span className="font-medium text-right">{detailRecord.status}</span>
                  </div>
                ) : null}
                {detailRecord.provider_or_facility ? (
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">Provider / facility</span>
                    <span className="font-medium text-right">{detailRecord.provider_or_facility}</span>
                  </div>
                ) : null}
                {detailRecord.notes ? (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground">Notes</span>
                    <p className="whitespace-pre-wrap">{detailRecord.notes}</p>
                  </div>
                ) : null}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => detailRecord && handleDelete(detailRecord)}
                >
                  Delete
                </Button>
                <Button type="button" variant="secondary" onClick={startEditingDetail}>
                  Edit
                </Button>
                <Button type="button" variant="outline" onClick={closeDetail}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
