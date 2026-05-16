import React, { useCallback, useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { toast } from 'sonner';
import { Plus, Loader2, Pencil, Ban } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';

/** Same rules as server `normalizeSlug` / slug column: lowercase letters, digits, hyphen, underscore. */
function insuranceSlugFromLabel(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return s || 'insurance';
}

export default function AppointmentOptionsPage() {
  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ---- Visit types ----
  const [vtLoading, setVtLoading] = useState(true);
  const [visitTypes, setVisitTypes] = useState([]);
  const [vtDialog, setVtDialog] = useState(false);
  const [vtSaving, setVtSaving] = useState(false);
  const [vtEditing, setVtEditing] = useState(null);
  const [vtForm, setVtForm] = useState({ slug: '', label: '', sort_order: 0, active: true });

  const loadVisitTypes = useCallback(async () => {
    setVtLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/visit-types?include_inactive=1', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load visit types');
      }
      const data = await res.json();
      setVisitTypes(data.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setVtLoading(false);
    }
  }, []);

  // ---- Insurance ----
  const [insLoading, setInsLoading] = useState(true);
  const [insurance, setInsurance] = useState([]);
  const [insDialog, setInsDialog] = useState(false);
  const [insSaving, setInsSaving] = useState(false);
  const [insEditing, setInsEditing] = useState(null);
  const [insForm, setInsForm] = useState({
    label: '',
    sort_order: 0,
    active: true,
    copay_estimate: '',
  });

  const loadInsurance = useCallback(async () => {
    setInsLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/insurance-options?include_inactive=1', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load insurance options');
      }
      const data = await res.json();
      setInsurance(data.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setInsLoading(false);
    }
  }, []);

  const [cmLoading, setCmLoading] = useState(true);
  const [copayMatrix, setCopayMatrix] = useState([]);
  const [cmDialog, setCmDialog] = useState(false);
  const [cmSaving, setCmSaving] = useState(false);
  const [cmEditing, setCmEditing] = useState(null);
  const [cmForm, setCmForm] = useState({
    visit_type_id: '',
    insurance_option_id: '',
    copay_estimate: '',
    list_price: '',
    active: true,
  });

  const loadCopayMatrix = useCallback(async () => {
    setCmLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/copay-matrix?include_inactive=1', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load copay matrix');
      }
      const data = await res.json();
      setCopayMatrix(data.items || []);
    } catch (e) {
      toast.error(e.message);
      setCopayMatrix([]);
    } finally {
      setCmLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVisitTypes();
    void loadInsurance();
    void loadCopayMatrix();
  }, [loadVisitTypes, loadInsurance, loadCopayMatrix]);

  const saveVisitType = async () => {
    setVtSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      if (vtEditing) {
        const res = await apiServerClient.fetch(`/admin/visit-types/${vtEditing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            label: vtForm.label,
            sort_order: Number(vtForm.sort_order) || 0,
            active: vtForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Update failed');
        }
        toast.success('Visit type updated');
      } else {
        const res = await apiServerClient.fetch('/admin/visit-types', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            slug: vtForm.slug,
            label: vtForm.label,
            sort_order: Number(vtForm.sort_order) || 0,
            active: vtForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        toast.success('Visit type created');
      }
      setVtDialog(false);
      await loadVisitTypes();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setVtSaving(false);
    }
  };

  const deactivateVisitType = async (row) => {
    if (!window.confirm(`Deactivate "${row.label}"?`)) return;
    try {
      const res = await apiServerClient.fetch(`/admin/visit-types/${row.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Deactivate failed');
      }
      toast.success('Visit type deactivated');
      await loadVisitTypes();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const saveInsurance = async () => {
    setInsSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const copay =
        insForm.copay_estimate === '' || insForm.copay_estimate === null
          ? null
          : Number(insForm.copay_estimate);
      if (insEditing) {
        const res = await apiServerClient.fetch(`/admin/insurance-options/${insEditing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            label: insForm.label,
            sort_order: Number(insForm.sort_order) || 0,
            active: insForm.active,
            copay_estimate: copay,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Update failed');
        }
        toast.success('Insurance option updated');
      } else {
        const labelTrim = insForm.label.trim();
        if (!labelTrim) {
          toast.error('Enter a label');
          return;
        }
        const slug = insuranceSlugFromLabel(labelTrim);
        const res = await apiServerClient.fetch('/admin/insurance-options', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            slug,
            label: labelTrim,
            sort_order: Number(insForm.sort_order) || 0,
            active: insForm.active,
            copay_estimate: copay,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        toast.success('Insurance option created');
      }
      setInsDialog(false);
      await loadInsurance();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setInsSaving(false);
    }
  };

  const labelForVisitId = (id) => visitTypes.find((v) => v.id === id)?.label || id;
  const labelForInsuranceId = (id) => insurance.find((o) => o.id === id)?.label || id;

  const saveCopayMatrix = async () => {
    setCmSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const copay = Number(cmForm.copay_estimate);
      if (Number.isNaN(copay)) {
        toast.error('Copay must be a number');
        return;
      }
      const listRaw = cmForm.list_price === '' || cmForm.list_price == null ? null : Number(cmForm.list_price);
      const listPrice = listRaw !== null && !Number.isNaN(listRaw) ? listRaw : null;

      if (cmEditing) {
        const res = await apiServerClient.fetch(`/admin/copay-matrix/${cmEditing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            copay_estimate: copay,
            list_price: listPrice,
            active: cmForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Update failed');
        }
        toast.success('Copay row updated');
      } else {
        if (!cmForm.visit_type_id || !cmForm.insurance_option_id) {
          toast.error('Select visit type and insurance');
          return;
        }
        const res = await apiServerClient.fetch('/admin/copay-matrix', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            visit_type_id: cmForm.visit_type_id,
            insurance_option_id: cmForm.insurance_option_id,
            copay_estimate: copay,
            list_price: listPrice,
            active: cmForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        toast.success('Copay row created');
      }
      setCmDialog(false);
      await loadCopayMatrix();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCmSaving(false);
    }
  };

  const deactivateCopayRow = async (row) => {
    if (!window.confirm('Deactivate this copay rule?')) return;
    try {
      const res = await apiServerClient.fetch(`/admin/copay-matrix/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }
      toast.success('Copay rule deactivated');
      await loadCopayMatrix();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deactivateInsurance = async (row) => {
    if (!window.confirm(`Deactivate "${row.label}"?`)) return;
    try {
      const res = await apiServerClient.fetch(`/admin/insurance-options/${row.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Deactivate failed');
      }
      toast.success('Insurance option deactivated');
      await loadInsurance();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const vtColumns = [
    { key: 'slug', label: 'Slug' },
    { key: 'label', label: 'Label' },
    { key: 'sort_order', label: 'Order' },
    { key: 'active', label: 'Active', render: (r) => (r.active ? 'Yes' : 'No') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <TableRowActionsMenu
          items={[
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => {
                setVtEditing(row);
                setVtForm({
                  slug: row.slug,
                  label: row.label,
                  sort_order: row.sort_order ?? 0,
                  active: row.active !== false,
                });
                setVtDialog(true);
              },
            },
            row.active
              ? {
                  label: 'Deactivate',
                  icon: Ban,
                  onClick: () => void deactivateVisitType(row),
                  className: 'text-warning',
                  separatorBefore: true,
                }
              : null,
          ].filter(Boolean)}
        />
      ),
    },
  ];

  const insColumns = [
    { key: 'slug', label: 'Slug' },
    { key: 'label', label: 'Label' },
    {
      key: 'copay_estimate',
      label: 'Est. copay ($)',
      render: (r) => (r.copay_estimate != null ? Number(r.copay_estimate).toFixed(2) : '—'),
    },
    { key: 'sort_order', label: 'Order' },
    { key: 'active', label: 'Active', render: (r) => (r.active ? 'Yes' : 'No') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <TableRowActionsMenu
          items={[
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => {
                setInsEditing(row);
                setInsForm({
                  label: row.label,
                  sort_order: row.sort_order ?? 0,
                  active: row.active !== false,
                  copay_estimate:
                    row.copay_estimate != null ? String(row.copay_estimate) : '',
                });
                setInsDialog(true);
              },
            },
            row.active
              ? {
                  label: 'Deactivate',
                  icon: Ban,
                  onClick: () => void deactivateInsurance(row),
                  className: 'text-warning',
                  separatorBefore: true,
                }
              : null,
          ].filter(Boolean)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Appointment options</h1>
        <p className="text-muted-foreground">
          Visit types and insurance plans shown to patients when booking. Providers listed on the booking form are
          active and verified — manage them under Provider Management.
        </p>
      </div>

      <Tabs defaultValue="visit-types" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="visit-types">Visit types</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="copay-matrix">Copay matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="visit-types" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setVtEditing(null);
                setVtForm({ slug: '', label: '', sort_order: 0, active: true });
                setVtDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add visit type
            </Button>
          </div>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Visit types</CardTitle>
              <CardDescription>Displayed in the patient “Schedule appointment” form.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={vtColumns} data={visitTypes} isLoading={vtLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setInsEditing(null);
                setInsForm({
                  label: '',
                  sort_order: 0,
                  active: true,
                  copay_estimate: '',
                });
                setInsDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add insurance
            </Button>
          </div>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Insurance options</CardTitle>
              <CardDescription>Copay estimate is shown as guidance on the booking form.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={insColumns} data={insurance} isLoading={insLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copay-matrix" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setCmEditing(null);
                setCmForm({
                  visit_type_id: visitTypes[0]?.id || '',
                  insurance_option_id: insurance[0]?.id || '',
                  copay_estimate: '',
                  list_price: '',
                  active: true,
                });
                setCmDialog(true);
              }}
              className="gap-2"
              disabled={visitTypes.length === 0 || insurance.length === 0}
            >
              <Plus className="w-4 h-4" />
              Add copay rule
            </Button>
          </div>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Insurance × visit type</CardTitle>
              <CardDescription>
                Estimated copay per combination. Missing pairs fall back to the insurance default copay on booking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    key: 'visit_type_id',
                    label: 'Visit type',
                    render: (r) => labelForVisitId(r.visit_type_id),
                  },
                  {
                    key: 'insurance_option_id',
                    label: 'Insurance',
                    render: (r) => labelForInsuranceId(r.insurance_option_id),
                  },
                  {
                    key: 'copay_estimate',
                    label: 'Est. copay ($)',
                    render: (r) => Number(r.copay_estimate).toFixed(2),
                  },
                  {
                    key: 'list_price',
                    label: 'List price ($)',
                    render: (r) => (r.list_price != null ? Number(r.list_price).toFixed(2) : '—'),
                  },
                  {
                    key: 'active',
                    label: 'Active',
                    render: (r) => (r.active ? 'Yes' : 'No'),
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row) => (
                      <TableRowActionsMenu
                        items={[
                          {
                            label: 'Edit',
                            icon: Pencil,
                            onClick: () => {
                              setCmEditing(row);
                              setCmForm({
                                visit_type_id: row.visit_type_id,
                                insurance_option_id: row.insurance_option_id,
                                copay_estimate: String(row.copay_estimate ?? ''),
                                list_price:
                                  row.list_price != null && row.list_price !== ''
                                    ? String(row.list_price)
                                    : '',
                                active: row.active !== false,
                              });
                              setCmDialog(true);
                            },
                          },
                          row.active
                            ? {
                                label: 'Deactivate',
                                icon: Ban,
                                onClick: () => void deactivateCopayRow(row),
                                className: 'text-warning',
                                separatorBefore: true,
                              }
                            : null,
                        ].filter(Boolean)}
                      />
                    ),
                  },
                ]}
                data={copayMatrix}
                isLoading={cmLoading || vtLoading || insLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={cmDialog} onOpenChange={setCmDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{cmEditing ? 'Edit copay rule' : 'New copay rule'}</DialogTitle>
            <DialogDescription>
              {cmEditing
                ? 'Visit type and insurance cannot be changed; deactivate and create a new rule if needed.'
                : 'Pick one visit type and one insurance plan for this estimate.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!cmEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Visit type</Label>
                  <Select
                    value={cmForm.visit_type_id || undefined}
                    onValueChange={(v) => setCmForm({ ...cmForm, visit_type_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {visitTypes.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Insurance</Label>
                  <Select
                    value={cmForm.insurance_option_id || undefined}
                    onValueChange={(v) => setCmForm({ ...cmForm, insurance_option_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {insurance.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}
            <div className="space-y-2">
              <Label>Estimated copay (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cmForm.copay_estimate}
                onChange={(e) => setCmForm({ ...cmForm, copay_estimate: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>List price (USD, optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cmForm.list_price}
                onChange={(e) => setCmForm({ ...cmForm, list_price: e.target.value })}
                placeholder="Cash / retail reference"
                className="bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cm-active"
                checked={cmForm.active}
                onChange={(e) => setCmForm({ ...cmForm, active: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="cm-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveCopayMatrix()} disabled={cmSaving}>
              {cmSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {cmEditing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vtDialog} onOpenChange={setVtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{vtEditing ? 'Edit visit type' : 'New visit type'}</DialogTitle>
            <DialogDescription>
              {vtEditing ? 'Slug cannot be changed.' : 'Slug is permanent (lowercase, letters, numbers, hyphen).'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={vtForm.slug}
                onChange={(e) => setVtForm({ ...vtForm, slug: e.target.value })}
                disabled={!!vtEditing}
                placeholder="e.g. follow-up"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={vtForm.label}
                onChange={(e) => setVtForm({ ...vtForm, label: e.target.value })}
                placeholder="Display name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={vtForm.sort_order}
                onChange={(e) => setVtForm({ ...vtForm, sort_order: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vt-active"
                checked={vtForm.active}
                onChange={(e) => setVtForm({ ...vtForm, active: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="vt-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVtDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveVisitType()} disabled={vtSaving}>
              {vtSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {vtEditing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={insDialog} onOpenChange={setInsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{insEditing ? 'Edit insurance option' : 'New insurance option'}</DialogTitle>
            <DialogDescription>
              {insEditing
                ? 'The URL slug is fixed after creation.'
                : 'The slug is generated automatically from the label (you do not need to enter it).'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={insForm.label}
                onChange={(e) => setInsForm({ ...insForm, label: e.target.value })}
                placeholder="Display name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated copay (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={insForm.copay_estimate}
                onChange={(e) => setInsForm({ ...insForm, copay_estimate: e.target.value })}
                placeholder="e.g. 25"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={insForm.sort_order}
                onChange={(e) => setInsForm({ ...insForm, sort_order: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ins-active"
                checked={insForm.active}
                onChange={(e) => setInsForm({ ...insForm, active: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="ins-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveInsurance()} disabled={insSaving}>
              {insSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {insEditing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
