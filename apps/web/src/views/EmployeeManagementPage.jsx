import React, { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, Filter, MoreHorizontal, Mail, Download, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import pb from '@/lib/supabaseMappedCollections';
import { toast } from 'sonner';

export default function EmployeeManagementPage() {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', department: '', hire_date: '' });

  const fetchEmployees = async () => {
    if (!currentUser?.id) {
      setEmployees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const records = await pb.collection('employer_employees').getFullList({
        filter: `employer_id="${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setEmployees(records);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentUser]);

  const handleAddEmployee = async () => {
    try {
      if (!currentUser?.id) {
        toast.error('Please sign in as an employer.');
        return;
      }
      if (!formData.first_name || !formData.last_name || !formData.email) {
        toast.error('First name, last name and email are required.');
        return;
      }
      const created = await pb.collection('employer_employees').create({
        employer_id: currentUser.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        department: formData.department?.trim() || null,
        hire_date: formData.hire_date || null,
        status: 'pending',
        health_score: null
      }, { $autoCancel: false });
      setEmployees((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setFormData({ first_name: '', last_name: '', email: '', department: '', hire_date: '' });
      toast.success('Employee added successfully. Invitation sent.');
    } catch (e) {
      toast.error('Error adding employee');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Active</Badge>;
      case 'pending': return <Badge variant="outline" className="text-orange-500 border-orange-500/30">Pending</Badge>;
      case 'inactive': return <Badge variant="secondary" className="text-muted-foreground">Inactive</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHealthScoreColor = (score) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-emerald-600 font-semibold';
    if (score >= 60) return 'text-orange-500 font-semibold';
    return 'text-destructive font-semibold';
  };

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return employees.filter((e) =>
      `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase().includes(term) ||
      (e.email || '').toLowerCase().includes(term) ||
      (e.department || '').toLowerCase().includes(term),
    );
  }, [employees, searchTerm]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Employees - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
            <p className="text-muted-foreground">Manage your team's health plan enrollment and status.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" className="gap-2 hidden md:flex"><Download className="h-4 w-4" /> Export</Button>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full md:w-auto"><UserPlus className="h-4 w-4" /> Add Employee</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-xl">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} placeholder="Jane" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} placeholder="Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="e.g. Engineering" />
                  </div>
                  <div className="space-y-2">
                    <Label>Hire Date</Label>
                    <Input type="date" value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddEmployee}>Send Invitation</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-sm border-border/50">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, or department..." 
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4"/> Filter</Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Hire Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Health Score</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                      Loading employees...
                    </td>
                  </tr>
                ) : null}
                {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{emp.first_name} {emp.last_name}</div>
                      <div className="text-muted-foreground text-xs">{emp.email}</div>
                    </td>
                    <td className="px-6 py-4 text-foreground">{emp.department || '-'}</td>
                    <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">{emp.hire_date || '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(emp.status)}</td>
                    <td className="px-6 py-4">
                      <span className={getHealthScoreColor(emp.health_score)}>
                        {emp.health_score ? `${emp.health_score}/100` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Edit Details</DropdownMenuItem>
                          <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Message</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Deactivate</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )) : !loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                      {employees.length === 0
                        ? 'No employees added yet. Use Add Employee to create your roster.'
                        : 'No employees found matching your search.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}