import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ConditionField({ conditionName, data, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="p-5 border border-border rounded-xl bg-muted/30 space-y-4 custom-entry-reveal">
      <h4 className="font-medium text-lg text-foreground border-b pb-2">{conditionName}</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date Diagnosed</Label>
          <Input 
            type="date" 
            value={data.date_diagnosed || ''} 
            onChange={(e) => handleChange('date_diagnosed', e.target.value)}
            className="form-input-animated"
          />
        </div>
        <div className="space-y-2">
          <Label>Severity</Label>
          <Select value={data.severity || ''} onValueChange={(val) => handleChange('severity', val)}>
            <SelectTrigger className="form-input-animated">
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mild">Mild</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="severe">Severe</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Current Treatment</Label>
          <Input 
            placeholder="e.g., Medication, Therapy" 
            value={data.current_treatment || ''} 
            onChange={(e) => handleChange('current_treatment', e.target.value)}
            className="form-input-animated"
          />
        </div>
        <div className="space-y-2">
          <Label>Controlled Status</Label>
          <Select value={data.controlled_status || ''} onValueChange={(val) => handleChange('controlled_status', val)}>
            <SelectTrigger className="form-input-animated">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="controlled">Controlled</SelectItem>
              <SelectItem value="uncontrolled">Uncontrolled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Managing Doctor</Label>
        <Input 
          placeholder="Dr. Name" 
          value={data.managing_doctor || ''} 
          onChange={(e) => handleChange('managing_doctor', e.target.value)}
          className="form-input-animated"
        />
      </div>

      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <Textarea 
          placeholder="Any other relevant details..." 
          value={data.additional_notes || ''} 
          onChange={(e) => handleChange('additional_notes', e.target.value)}
          className="form-input-animated resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}