
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Globe, Lock, Users, Plus, X, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';

export function DocumentPermissions({ document, onUpdate }) {
  const [visibility, setVisibility] = useState(document.visibility || 'private');
  const [isSaving, setIsSaving] = useState(false);

  const sharedWith = Array.isArray(document.shared_with_json) ? document.shared_with_json : [];

  const handleSaveVisibility = async (newVisibility) => {
    setVisibility(newVisibility);
    setIsSaving(true);
    try {
      await apiServerClient.fetch(`/knowledge-base/${document.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility })
      });
      toast.success('Visibility updated');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to update visibility');
      setVisibility(document.visibility); // Revert
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Global Visibility
        </h3>
        <p className="text-sm text-muted-foreground">
          Control whether this document is available to the AI context globally or restricted.
        </p>
        
        <Select value={visibility} onValueChange={handleSaveVisibility} disabled={isSaving}>
          <SelectTrigger className="w-full md:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span>Private (Only admins)</span>
              </div>
            </SelectItem>
            <SelectItem value="shared">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Shared (Specific roles/users)</span>
              </div>
            </SelectItem>
            <SelectItem value="public">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-success" />
                <span>Public (All users AI context)</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visibility === 'shared' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label>Add User or Role</Label>
              <Input placeholder="Email or Role Name..." />
            </div>
            <div className="space-y-1.5 w-32">
              <Label>Access</Label>
              <Select defaultValue="view">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="gap-1.5"><Plus className="w-4 h-4"/> Add</Button>
          </div>

          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {sharedWith.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No specific users or roles added yet.
              </div>
            ) : (
              sharedWith.map((share, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center font-semibold text-xs">
                      {share.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{share.name || share.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{share.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="permission-badge">{share.access}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="bg-muted/30 p-4 rounded-lg flex items-start gap-3 border border-border">
        <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground mb-1">Access Control Note</p>
          <p className="text-muted-foreground">
            Documents marked as public will have their chunks available to the Integrated AI for ALL users querying the system. Ensure no sensitive PHI/PII is included in public knowledge base documents.
          </p>
        </div>
      </div>
    </div>
  );
}
