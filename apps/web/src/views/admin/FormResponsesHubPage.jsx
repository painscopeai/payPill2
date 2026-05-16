import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Clipboard, BarChart2 } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { publicFormUrl } from '@/lib/publicFormUrl';

async function formsAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export default function FormResponsesHubPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiServerClient.fetch('/forms?limit=100&include_response_stats=1', {
        headers: await formsAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load forms');
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load forms');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((f) => {
      const name = (f.name || '').toLowerCase();
      const cat = (f.category || '').toLowerCase();
      const ft = (f.form_type || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || ft.includes(q);
    });
  }, [items, search]);

  const copyLink = (formId) => {
    const url = publicFormUrl(formId);
    void navigator.clipboard.writeText(url);
    toast.success('Public form link copied');
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Form responses</h1>
          <p className="text-muted-foreground">Track submissions across all forms and open detailed analytics.</p>
        </div>
      </div>

      <Card className="w-full border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All forms</CardTitle>
          <div className="relative max-w-md pt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, or type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Form</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Responses</TableHead>
                    <TableHead>Last submission</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No forms match your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="max-w-[220px] font-medium">
                          <span className="truncate">{f.name || 'Untitled'}</span>
                          {f.category ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{f.category}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{f.form_type || '—'}</TableCell>
                        <TableCell>
                          {f.status === 'published' ? (
                            <Badge variant="secondary">Published</Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{Number(f.response_count) || 0}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.last_submitted_at
                            ? format(new Date(f.last_submitted_at), 'MMM d, yyyy HH:mm')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <TableRowActionsMenu
                              items={[
                                {
                                  label: 'Copy link',
                                  icon: Clipboard,
                                  onClick: () => copyLink(f.id),
                                  hidden: f.status !== 'published',
                                },
                                {
                                  label: 'Responses',
                                  icon: BarChart2,
                                  onClick: () => navigate(`/admin/forms/${f.id}/responses`),
                                  separatorBefore: f.status === 'published',
                                },
                              ]}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

