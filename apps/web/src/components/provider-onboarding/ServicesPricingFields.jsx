import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

/** New empty row for services & pricing repeaters. */
export function createEmptyServiceRow(sortOrder = 0) {
  return {
    clientKey: `${Date.now()}-${sortOrder}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    category: 'service',
    unit: 'per_visit',
    price: '',
    currency: 'USD',
    notes: '',
  };
}

/**
 * Repeater UI for provider service/drug pricing (public intake + admin preview).
 */
export function ServicesPricingFields({ rows, readOnly, onUpdateRow, onAddRow, onRemoveRow }) {
  return (
    <div className="space-y-4">
      {rows.map((row, idx) => (
        <div
          key={row.clientKey}
          className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label>Service or drug name</Label>
              <Input
                value={row.name}
                disabled={readOnly}
                onChange={(e) => onUpdateRow(idx, { name: e.target.value })}
                placeholder="e.g. Office visit, Lab panel, Medication name"
              />
            </div>
            <div className="w-full space-y-2 sm:w-40">
              <Label>Category</Label>
              <Select
                value={row.category}
                disabled={readOnly}
                onValueChange={(v) => onUpdateRow(idx, { category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="drug">Drug</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-2 sm:w-44">
              <Label>Unit</Label>
              <Select value={row.unit} disabled={readOnly} onValueChange={(v) => onUpdateRow(idx, { unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_visit">Per visit</SelectItem>
                  <SelectItem value="per_dose">Per dose</SelectItem>
                  <SelectItem value="flat">Flat fee</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[120px] flex-1 space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                disabled={readOnly}
                value={row.price}
                onChange={(e) => onUpdateRow(idx, { price: e.target.value })}
              />
            </div>
            <div className="w-28 space-y-2">
              <Label>Currency</Label>
              <Input
                disabled={readOnly}
                value={row.currency}
                onChange={(e) => onUpdateRow(idx, { currency: e.target.value.toUpperCase().slice(0, 8) })}
              />
            </div>
            <div className="min-w-[200px] flex-[2] space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                disabled={readOnly}
                rows={2}
                value={row.notes}
                onChange={(e) => onUpdateRow(idx, { notes: e.target.value })}
                placeholder="Optional details"
              />
            </div>
          </div>
          {!readOnly && rows.length > 1 ? (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveRow(idx)}>
                <Trash2 className="mr-1 h-4 w-4" /> Remove row
              </Button>
            </div>
          ) : null}
        </div>
      ))}

      {!readOnly ? (
        <Button type="button" variant="outline" onClick={onAddRow}>
          <Plus className="mr-2 h-4 w-4" /> Add row
        </Button>
      ) : null}
    </div>
  );
}
