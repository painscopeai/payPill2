import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Loader2, Search, ShieldCheck } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

export default function EmployerContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [insuranceOptions, setInsuranceOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [savingMemberId, setSavingMemberId] = useState('');

  const selectedContract = useMemo(
    () => contracts.find((item) => item.id === selectedContractId) || null,
    [contracts, selectedContractId],
  );

  const filteredContracts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) => {
      const hay = [
        c.name,
        c.insurance?.label,
        c.status,
        c.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [contracts, query]);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiServerClient.fetch('/employer/contracts');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load contracts');
      const items = body.items || [];
      setContracts(items);
      setInsuranceOptions(body.insuranceOptions || []);
      setSelectedContractId((prev) => {
        if (!prev && items.length > 0) return items[0].id;
        if (prev && !items.some((row) => row.id === prev)) return items[0]?.id || null;
        return prev;
      });
    } catch (e) {
      toast.error(e.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  const toggleMemberStatus = async (member) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    setSavingMemberId(member.id);
    try {
      const res = await apiServerClient.fetch(`/employer/employees/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not update member status');
      toast.success(`${member.name} is now ${nextStatus}.`);
      await loadContracts();
    } catch (e) {
      toast.error(e.message || 'Could not update member status');
    } finally {
      setSavingMemberId('');
    }
  };

  const updateMemberInsurance = async (member, nextInsurance) => {
    if (!nextInsurance || nextInsurance === member.insurance_option_slug) return;
    const label =
      insuranceOptions.find((opt) => opt.id === nextInsurance)?.label || 'the selected insurance';
    const ok = window.confirm(
      `Move ${member.name} to ${label}?\n\nThis will save immediately and route future billing to the new insurance.`,
    );
    if (!ok) return;
    setSavingMemberId(member.id);
    try {
      const res = await apiServerClient.fetch(`/employer/employees/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insurance_option_slug: nextInsurance }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not move employee to selected insurance');
      toast.success(`${member.name} moved to new insurance.`);
      await loadContracts();
    } catch (e) {
      toast.error(e.message || 'Could not move employee');
    } finally {
      setSavingMemberId('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Contracts - PayPill</title></Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Employer Contracts</h1>
          <p className="text-muted-foreground mt-1">
            Contracts are auto-generated when you assign employees to insurance. Coverage is 100% with no co-pay.
          </p>
        </div>

        {loading ? (
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="py-14 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading contracts...
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <Card className="rounded-2xl border-border/60 shadow-sm h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Contracts
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search contracts..."
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredContracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contracts yet. Assign employees to insurance to auto-generate.</p>
                ) : (
                  filteredContracts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedContractId(c.id)}
                      className={`w-full text-left border rounded-xl p-3 transition-colors ${
                        selectedContractId === c.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{c.name}</p>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {c.insurance?.label || 'Insurance'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.active_member_count}/{c.member_count} active members
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  {selectedContract?.name || 'Select a contract'}
                </CardTitle>
                {selectedContract && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{selectedContract.insurance?.label}</span>
                    <span>·</span>
                    <span>{selectedContract.coverage?.label}</span>
                    <span>·</span>
                    <span>Co-pay: $0</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedContract ? (
                  <p className="text-muted-foreground">Select a contract from the list to view covered employees.</p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Manage covered members in this contract by setting them active or inactive.
                    </p>
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-muted-foreground uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3 font-medium">Employee</th>
                            <th className="px-4 py-3 font-medium">Department</th>
                            <th className="px-4 py-3 font-medium">Insurance</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(selectedContract.members || []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                No covered employees found in this contract.
                              </td>
                            </tr>
                          ) : (
                            selectedContract.members.map((member) => (
                              <tr key={member.id}>
                                <td className="px-4 py-3">
                                  <div className="font-medium">{member.name}</div>
                                  <div className="text-xs text-muted-foreground">{member.email}</div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{member.department || '—'}</td>
                                <td className="px-4 py-3">
                                  <Select
                                    value={member.insurance_option_slug ?? undefined}
                                    onValueChange={(value) => void updateMemberInsurance(member, value)}
                                    disabled={savingMemberId === member.id}
                                  >
                                    <SelectTrigger className="w-[220px]">
                                      <SelectValue placeholder="Select insurance" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {insuranceOptions.map((opt) => (
                                        <SelectItem key={opt.id} value={opt.id}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                    {member.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    size="sm"
                                    variant={member.status === 'active' ? 'outline' : 'default'}
                                    disabled={savingMemberId === member.id}
                                    onClick={() => toggleMemberStatus(member)}
                                  >
                                    {savingMemberId === member.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : member.status === 'active' ? (
                                      'Set inactive'
                                    ) : (
                                      'Set active'
                                    )}
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}